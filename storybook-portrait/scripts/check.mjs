// storybook-portrait · check.mjs — proves a portrait before you render it. Prints ok / FAIL lines with numbers.
//   node <skill>/scripts/check.mjs piece.html [--scale .5]
// 1. page: loads with no page errors, console errors or failed requests; BRIEF.md beside it with its sections filled
// 2. determinism: the same t gives the same pixels, also after seeking elsewhere (no state carried between frames)
// 3. drawing: every sampled moment draws; the drawing grows (more paint later than earlier); the finished picture is there
// 4. style: the sheet shows round the figure (25–78 % bare paper), there is ink line, a small palette (≤ 7 hue families),
//    no flat digital fills (gouache / crayon always vary), the coloured hair streaks or texture are present
// 5. body: facing rules over turns both ways, twist, tilt, pupils in the eyes, planted bottom edge (figure.js / portrait.js rig())
// 6. motion: idle alive (frames differ across the live loop; no frozen second), blinks enough and irregular, breath,
//    each head beat — eyes lead, anticipation, overshoot, hair follows late (portrait.js motionReport())
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs <piece.html> [--scale .5]'); process.exit(1); }
const scale = opt('scale', '.5');
let bad = 0;
const ok = m => console.log('ok   ' + m), fail = m => { bad++; console.log('FAIL ' + m); };

// ── the brief ──
const briefF = join(dirname(page$), 'BRIEF.md');
if (!existsSync(briefF)) fail('no BRIEF.md next to the page (references/BRIEF.md): write the brief before the code');
else {
  const b = readFileSync(briefF, 'utf8'), need = ['Topic', 'Who', 'Design', 'Motion', 'Review'];
  const miss = need.filter(h => !new RegExp('^##\\s+' + h, 'mi').test(b));
  const todo = (b.match(/TODO|__FILL__/g) || []).length;
  if (miss.length) fail('BRIEF.md is missing sections: ' + miss.join(', ')); else if (todo) fail(`BRIEF.md still has ${todo} TODO / __FILL__`); else ok('BRIEF.md has Topic · Who · Design · Motion · Review');
}

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 700, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push('page error: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console error: ' + m.text().slice(0, 300)); });
page.on('requestfailed', r => errors.push('failed to load: ' + r.url()));
await page.goto(pathToFileURL(page$).href + `?render=1&scale=${scale}`, { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
  if (errors.length || Date.now() - t0 > 180000) { console.error(errors.join('\n') || 'never ready'); process.exit(1); }
  await new Promise(r => setTimeout(r, 100));
}
if (errors.length) fail('loading: ' + errors.join(' | ')); else ok('loads with no errors');
const { DUR, drawT } = await page.evaluate(() => ({ DUR: window.DURATION, drawT: window.__sp.drawT }));
console.log(`     drawing 0–${drawT} s, alive ${drawT}–${DUR} s`);

// pixel stats of the moment t, computed in the page
const stats = t => page.evaluate(t => {
  window.seek(t);
  const c = document.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
  const paper = window.__sp.portrait.paper.getContext('2d').getImageData(0, 0, W, H).data;
  let bare = 0, inkN = 0, n = 0, fig = 0, h = 0; const hue = new Array(12).fill(0); let sum = 0;
  for (let i = 0; i < d.length; i += 4 * 7) {
    n++; const r = d[i], g = d[i + 1], b = d[i + 2], dd = Math.abs(r - paper[i]) + Math.abs(g - paper[i + 1]) + Math.abs(b - paper[i + 2]);
    sum = (sum * 31 + r * 3 + g * 5 + b * 7) >>> 0;
    if (dd < 14) { bare++; continue; }
    fig++; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), L = (mx + mn) / 2;
    if (L < 80) inkN++;
    const s = mx === mn ? 0 : (mx - mn) / (255 - Math.abs(mx + mn - 255) || 1);
    if (s > .28 && L > 40 && L < 235) { let hh = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4; hh = (hh * 60 + 360) % 360; hue[Math.floor(hh / 30)]++; h++; }
  }
  // flat digital fills: 8×8 blocks inside the figure whose pixels are all (nearly) the same
  let blocks = 0, flat = 0;
  for (let y = 0; y + 8 < H; y += 24) for (let x = 0; x + 8 < W; x += 24) {
    let mn = 1e9, mx = -1e9, onPaper = 0;
    for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++) { const i = ((y + yy) * W + x + xx) * 4, L = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; mn = Math.min(mn, L); mx = Math.max(mx, L); if (Math.abs(d[i] - paper[i]) + Math.abs(d[i + 1] - paper[i + 1]) < 10) onPaper++; }
    if (onPaper > 8) continue; blocks++; if (mx - mn < 1.5) flat++;
  }
  return { bare: bare / n, ink: inkN / Math.max(1, fig), fig: fig / n, hue: hue.map(x => x / Math.max(1, h)), sum, flat: flat / Math.max(1, blocks), blocks };
}, t);

// ── determinism ──
{
  const ts = [drawT * .5, drawT + 1.3, DUR - .05];
  const first = []; for (const t of ts) first.push((await stats(t)).sum);
  await stats(drawT * .2); await stats(DUR * .8);
  const again = []; for (const t of [...ts].reverse()) again.unshift((await stats(t)).sum);
  const same = first.every((s, i) => s === again[i]);
  if (same) ok(`deterministic: t = ${ts.map(t => t.toFixed(2)).join(', ')} give the same pixels in any order`); else fail('not deterministic: the same t drew different pixels (Math.random? state kept between frames?)');
}

// ── the drawing ──
{
  let prev = -1, grows = true, thrown = null;
  for (let t = 0; t < drawT; t += drawT / 8) { try { const s = await stats(t); if (s.fig + .002 < prev) grows = false; prev = s.fig; } catch (e) { thrown = e.message; break; } }
  if (thrown) fail('a moment of the drawing threw: ' + thrown);
  else if (!grows) fail('the drawing does not grow: less paint later than earlier'); else ok('the drawing grows stroke by stroke');
}

// ── style, on the finished picture ──
const fin = await stats(drawT + .02);
console.log(`     finished: bare paper ${(fin.bare * 100).toFixed(1)} % · flat blocks ${(fin.flat * 100).toFixed(1)} % of ${fin.blocks}`);
if (fin.bare < .25 || fin.bare > .78) fail(`the sheet should show round the figure: bare paper ${(fin.bare * 100).toFixed(1)} % (want 25–78 %)`); else ok('the sheet shows round the figure');
if (fin.ink < .002) fail(`too little ink: ${(fin.ink * 100).toFixed(2)} % of the figure is dark (the style draws ink contours round face, ears and features)`); else ok(`ink line present (${(fin.ink * 100).toFixed(1)} % of the figure dark)`);
const fam = fin.hue.filter(x => x > .03).length;
console.log('     hue families (30° bins over 3 %): ' + fin.hue.map((x, i) => x > .03 ? `${i * 30}°:${(x * 100).toFixed(0)}%` : null).filter(Boolean).join(' '));
if (fam > 7) fail(`palette too wide: ${fam} hue families (≤ 7: a storybook palette is a few strong pairs)`); else if (fam < 2) fail(`palette too narrow: ${fam} hue family`); else ok(`palette: ${fam} hue families`);
if (fin.flat > .12) fail(`flat digital fills: ${(fin.flat * 100).toFixed(1)} % of figure blocks are one flat value (want ≤ 12 %): use gouache / crayon, not fill()`); else ok('no flat digital fills');

// ── body ──
const rig = await page.evaluate(() => window.__sp.rig());
for (const r of rig) (r.ok ? ok : fail)(`body: ${r.name} = ${r.value} (${r.limit})`);

// ── motion ──
const mot = await page.evaluate(() => window.__sp.motion());
for (const r of mot) (r.ok ? ok : fail)(`motion: ${r.name} = ${r.value} (${r.limit})`);
{
  // alive in pixels: across the live loop, consecutive half-second frames always differ (no dead second)
  const r = await page.evaluate(({ drawT, DUR }) => {
    const c = document.querySelector('canvas'), g = c.getContext('2d'), grab = t => { window.seek(t); return g.getImageData(0, 0, c.width, c.height).data; };
    let prev = grab(drawT + .1), frozen = 0, maxD = 0;
    for (let t = drawT + .6; t < DUR; t += .5) {
      const cur = grab(t); let n = 0;
      for (let i = 0; i < cur.length; i += 4) if (Math.abs(cur[i] - prev[i]) + Math.abs(cur[i + 1] - prev[i + 1]) + Math.abs(cur[i + 2] - prev[i + 2]) > 6) n++;
      const d = n / (cur.length / 4); maxD = Math.max(maxD, d); if (d < .0004) frozen++; prev = cur;
    }
    return { frozen, maxD };
  }, { drawT, DUR });
  if (r.frozen) fail(`idle frozen: ${r.frozen} half-second steps with no visible change (every idle breathes)`); else ok(`idle alive: every half second of the live loop changes (max ${(r.maxD * 100).toFixed(2)} % of pixels)`);
}
{
  // planted: the figure's bottom edge (where the body leaves the sheet) does not slide sideways
  const edge = await page.evaluate(({ drawT, DUR }) => {
    const c = document.querySelector('canvas'), W = c.width, H = c.height, out = []; window.__sp.portrait.noFront = true;
    const paper = window.__sp.portrait.paper.getContext('2d').getImageData(0, H - 3, W, 1).data;
    for (let t = drawT + .05; t < DUR; t += .25) {
      // the longest run of paint along the bottom row is the body (rain, dust or a passing bee are short runs)
      window.seek(t); const d = c.getContext('2d').getImageData(0, H - 3, W, 1).data; let best = [-1, -1], run = -1;
      for (let x = 0; x <= W; x++) { const i = x * 4, on = x < W && Math.abs(d[i] - paper[i]) + Math.abs(d[i + 1] - paper[i + 1]) + Math.abs(d[i + 2] - paper[i + 2]) > 30; if (on && run < 0) run = x; if (!on && run >= 0) { if (x - run > best[1] - best[0]) best = [run, x - 1]; run = -1; } }
      out.push(best);
    }
    window.__sp.portrait.noFront = false; return { out, s: window.__sp.portrait.scale };
  }, { drawT, DUR });
  const xs = edge.out.filter(([l]) => l >= 0), dl = Math.max(...xs.map(e => e[0])) - Math.min(...xs.map(e => e[0])), dr = Math.max(...xs.map(e => e[1])) - Math.min(...xs.map(e => e[1]));
  const drift = Math.max(dl, dr) / edge.s;
  if (!xs.length) fail('no body at the bottom edge (the bust should leave the sheet)'); else if (drift > 2.5) fail(`the planted bottom edge slides: ${drift.toFixed(1)} px`); else ok(`planted: bottom edge drift ${drift.toFixed(1)} px`);
}

await browser.close();
console.log(bad ? `\n${bad} problem${bad > 1 ? 's' : ''}` : '\nall checks pass');
process.exit(bad ? 1 : 0);
