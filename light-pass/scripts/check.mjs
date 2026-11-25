// light-pass · check.mjs — judge a light plan on its picture before it goes into a piece.
//   node <skill>/scripts/check.mjs <dir-with-input-and-plan> [more dirs…] [--t 1.5] [--sheet out/sheet.jpg]
// Each dir holds input.(jpg|png) (a frame of the piece) and plan.json. Prints numbers and FAILs; exits 1 on any FAIL.
// Rules checked (references/PLAN.md has the why):
//   plan   — shapes within reach of the frame, widths grow away from the source, gains ≤ 1, at most 16 beams / 8 pools
//   sun    — every beam runs away from the sun: the angle between the beam and the line sun → beam foot ≤ 25°
//            (a beam marked "free": true — a window, a lamp — is exempt)
//   blow   — pixels at full white grow by ≤ 2 % of the frame; the darkest tenth stays below its old level + 0.12
//   amount — the light changes the picture: mean change ≥ 1.5 % and ≤ 18 % (subtle but there, never a wash)
//   same t — two renders at the same t are identical (deterministic, frame by frame)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(spawnSync('npm', ['root', '-g']).stdout.toString().trim(), 'playwright'))); }
const here = dirname(fileURLToPath(import.meta.url)), LIB = join(here, '..', 'lib', 'lightpass.js');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const dirs = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--'))), T = +opt('t', 1.5), sheet = opt('sheet', null);
if (!dirs.length) { console.error('usage: check.mjs <example-dir> [...] [--t s] [--sheet out.jpg]'); process.exit(2); }

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }), page = await b.newPage();
await page.setContent('<!doctype html><canvas id=c></canvas><canvas id=k></canvas>'); await page.addScriptTag({ path: LIB });
let fails = 0; const tiles = [];
for (const d of dirs) {
  const inp = ['input.jpg', 'input.png'].map((f) => join(d, f)).find(existsSync), plan = JSON.parse(readFileSync(join(d, 'plan.json'), 'utf8'));
  const F = (m) => { fails++; console.log(`  FAIL ${m}`); };
  console.log(basename(d));
  // plan rules (numbers, at t)
  const at = (v, dd) => { const x = (v === undefined ? dd : v); return Array.isArray(x) && Array.isArray(x[0]) && typeof x[0][0] === 'number' && x[0].length === 2 ? x.reduce((a, k) => (k[0] <= T ? k[1] : a), x[0][1]) : x; };
  const sun = at(plan.sun, [0.5, 0]), beams = plan.beams || [], pools = plan.pools || [];
  if (beams.length > 16) F(`${beams.length} beams (max 16)`); if (pools.length > 8) F(`${pools.length} pools (max 8)`);
  let worst = 0;
  beams.forEach((bm, i) => { const f = at(bm.from), to = at(bm.to), w = at(bm.width, [0.01, 0.06]), g = at(bm.gain, 0.45);
    if ([...f, ...to].some((v) => v < -0.6 || v > 1.6)) F(`beam ${i}: ends far outside the frame`);
    if (!(w[1] >= w[0] && w[0] >= 0)) F(`beam ${i}: width must grow away from its source (${w})`);
    if (g > 1) F(`beam ${i}: gain ${g} > 1`);
    if (!bm.free) { const ar = 9 / 16, bd = [to[0] - f[0], (to[1] - f[1]) * ar], sd = [to[0] - sun[0], (to[1] - sun[1]) * ar];      /* angles on a 16:9 frame */
      const ang = Math.acos(Math.max(-1, Math.min(1, (bd[0] * sd[0] + bd[1] * sd[1]) / (Math.hypot(...bd) * Math.hypot(...sd) || 1)))) * 180 / Math.PI;
      worst = Math.max(worst, ang); if (ang > 25) F(`beam ${i}: runs ${ang.toFixed(0)}° off the line from the sun (max 25°, or mark it "free")`); } });
  pools.forEach((p, i) => { const g = at(p.gain, 0.25); if (g > 0.6) F(`pool ${i}: gain ${g} > 0.6 (a pool lifts what is there, it does not paint white)`); });
  // pictures
  const b64 = readFileSync(inp).toString('base64');
  const r = await page.evaluate(async ([b64, plan, T]) => { const img = new Image(); img.src = 'data:image/jpeg;base64,' + b64; await img.decode();
    const c = document.getElementById('c'); c.width = img.naturalWidth; c.height = img.naturalHeight; const lp = window.lp || (window.lp = LightPass.create(c, { preserve: true }));
    const k = document.getElementById('k'); k.width = c.width; k.height = c.height; const kx = k.getContext('2d', { willReadFrequently: true });
    const grab = (view) => { lp.view = view; lp.frame = 0; lp.draw(img, plan, T); kx.drawImage(c, 0, 0); return { data: kx.getImageData(0, 0, k.width, k.height).data, url: c.toDataURL('image/jpeg', 0.9) }; };
    const off = grab('off'), lit = grab('lit'), again = grab('lit'), mask = grab('mask'); const n = off.data.length / 4;
    let blow0 = 0, blow1 = 0, diff = 0, same = 0; const lum = (d, i) => (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; const L0 = new Float32Array(n), L1 = new Float32Array(n);
    for (let i = 0, j = 0; i < off.data.length; i += 4, j++) { const a = lum(off.data, i), bb = lum(lit.data, i); L0[j] = a; L1[j] = bb; if (a > 0.985) blow0++; if (bb > 0.985) blow1++; diff += Math.abs(bb - a);
      if (lit.data[i] !== again.data[i] || lit.data[i + 1] !== again.data[i + 1] || lit.data[i + 2] !== again.data[i + 2]) same++; }
    const idx = Array.from(L0.keys()).sort((x, y) => L0[x] - L0[y]).slice(0, Math.floor(n / 10)); let d0 = 0, d1 = 0; for (const i of idx) { d0 += L0[i]; d1 += L1[i]; }
    return { blow: (blow1 - blow0) / n, mean: diff / n, dark0: d0 / idx.length, dark1: d1 / idx.length, differ: same, off: off.url, mask: mask.url, lit: lit.url }; }, [b64, plan, T]);
  console.log(`  beams ${beams.length} · pools ${pools.length} · sun (${sun.map((v) => v.toFixed(2)).join(', ')}) · worst beam ${worst.toFixed(0)}° off the sun`);
  console.log(`  blown +${(r.blow * 100).toFixed(2)} % · change ${(r.mean * 100).toFixed(1)} % · darkest tenth ${r.dark0.toFixed(3)} → ${r.dark1.toFixed(3)} · same t: ${r.differ} pixels differ`);
  if (r.blow > 0.02) F(`light blows out ${(r.blow * 100).toFixed(1)} % of the frame (max 2 %)`);
  if (r.dark1 > r.dark0 + 0.12) F(`the shadows wash out (darkest tenth +${(r.dark1 - r.dark0).toFixed(2)}, max +0.12)`);
  if (r.mean < 0.015) F(`the light barely shows (mean change ${(r.mean * 100).toFixed(1)} %, min 1.5 %)`);
  if (r.mean > 0.18) F(`the light washes the picture (mean change ${(r.mean * 100).toFixed(1)} %, max 18 %)`);
  if (r.differ) F(`two renders at the same t differ in ${r.differ} pixels`);
  tiles.push([basename(d), r.off, r.mask, r.lit]);
}
if (sheet) { mkdirSync(dirname(sheet), { recursive: true });
  const url = await page.evaluate(async (tiles) => { const w = 480, h = 270, c = document.createElement('canvas'); c.width = w * 3 + 20; c.height = (h + 26) * tiles.length; const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    for (let r = 0; r < tiles.length; r++) { x.fillStyle = '#ddd'; x.font = '14px sans-serif'; x.fillText(tiles[r][0] + '   input · mask · lit', 6, r * (h + 26) + 18);
      for (let k = 1; k < 4; k++) { const im = new Image(); im.src = tiles[r][k]; await im.decode(); x.drawImage(im, (k - 1) * (w + 10), r * (h + 26) + 24, w, h); } }
    return c.toDataURL('image/jpeg', 0.85); }, tiles);
  writeFileSync(sheet, Buffer.from(url.split(',')[1], 'base64')); console.log('sheet', sheet); }
console.log(fails ? `check FAILED (${fails})` : 'check OK'); await b.close(); process.exit(fails ? 1 : 0);
