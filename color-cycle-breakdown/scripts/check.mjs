// color-cycle-breakdown · check.mjs — the gates. Run from the project's parent:
//   node <skill>/scripts/check.mjs my-film            (ends "all checks passed", or exits 1 with what failed)
// Options: --no-brief (skip the brief rows while you are still designing) · --verbose
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flag, pagePath, launch, open, grab, measureInPage } from './_lib.mjs';

const file = pagePath('usage: check.mjs <film folder | index.html> [--no-brief]');
const dir = dirname(file), skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rows = []; let failed = 0;
const row = (name, ok, msg) => { rows.push([name, ok, msg]); if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name.padEnd(13)} ${msg}`); };
const f2 = v => (+v).toFixed(2), f3 = v => (+v).toFixed(3);

// ── static: the film's source ──
const src = existsSync(join(dir, 'film.js')) ? readFileSync(join(dir, 'film.js'), 'utf8') : '';
row('source', !!src, src ? 'film.js found' : 'no film.js next to index.html');
const banned = [/Math\.random/, /Date\.now|new Date/, /performance\.now/, /setTimeout|setInterval/].filter(r => r.test(src));
const fetches = [/fetch\(/, /XMLHttpRequest/, /new Image\(/, /<img/, /import\s*\(\s*['"]https?:/, /from\s+['"]https?:/, /\.(png|jpe?g|gif|webp|mp4|webm|glb|gltf|wav|mp3)['"]/i].filter(r => r.test(src));
row('code only', !fetches.length, fetches.length ? `film.js loads media or fetches: ${fetches.join(' ')}` : 'no images, video, audio, models or fetches in film.js');
row('pure source', !banned.length, banned.length ? `film.js uses ${banned.join(' ')} (everything must be a function of t and the seed)` : 'no Math.random, Date, timers');

const browser = await launch();
const { page, errors, requests } = await open(browser, file, {});
const info = await page.evaluate(() => window.filmInfo());
const fx = (fn, ...a) => page.evaluate(([fn, a]) => window.__film[fn](...a), [fn, a]);

// ── contract ──
const contract = await page.evaluate(() => ['seek', 'DURATION', 'FPS', 'SIZE', 'ART', 'filmInfo', '__film'].filter(k => window[k] === undefined));
row('contract', !contract.length, contract.length ? `missing ${contract.join(', ')}` : `seek · DURATION ${info.duration} s · FPS ${info.fps} · SIZE ${info.size.join('×')} · ART ${info.art.join('×')}`);
row('fonts', await fx('fontsOk'), 'bundled Inter, Noto Sans KR, JetBrains Mono loaded');
const outside = requests.filter(u => !u.startsWith('file:') && !u.startsWith('data:'));
const media = requests.filter(u => /\.(png|jpe?g|gif|webp|mp4|webm|glb|gltf|wav|mp3|ogg)(\?|$)/i.test(u));
row('no network', !outside.length && !media.length, outside.length ? `requests leave the page: ${outside.slice(0, 3).join(' ')}` : media.length ? `loads media: ${media.slice(0, 3).join(' ')}` : `${requests.length} local requests (html, js, fonts)`);

// ── the pixel grid ──
const [SW, SH] = info.size, [AW, AH] = info.art, kx = SW / AW, ky = SH / AH;
row('pixel grid', Number.isInteger(kx) && kx === ky, `${SW}×${SH} over ${AW}×${AH} = ${f2(kx)}× ${Number.isInteger(kx) && kx === ky ? '(whole pixels in the held picture)' : '— must be one whole number both ways'}`);

// ── pure: the same t gives the same frame ──
{ const t = +(info.explode.e0 * .6).toFixed(3), a = await grab(page, t); await grab(page, info.duration * .7); const b = await grab(page, t);
  const tp = +(info.shots.find(s => s.kind === 'panel')?.t0 + 2 || t).toFixed(3), c = await grab(page, tp); await grab(page, 1); const d = await grab(page, tp);
  row('pure', a === b && c === d, a === b && c === d ? `t=${t} and t=${tp} render identically after seeking away` : 'a frame differs on the second render — something depends on order or state'); }

// ── palette and indices ──
const cols = await fx('cols');
row('palette', cols.length <= 256 && info.cycles.length >= 1, `${cols.length} colours (≤ 256), ${info.ramps.length} ramps, ${info.cycles.length} cycles${info.cycles.length ? '' : ' — a colour-cycling film needs at least one'}`);
const tA = 1.0, tB = 1.0 + 1 / 2.9;                      // two moments of the held picture
const idx = {}; for (const L of info.layers) idx[L.name] = [await fx('layerIdx', L.name, tA), await fx('layerIdx', L.name, tB)];
const bad = info.layers.filter(L => idx[L.name][0].some(i => i >= cols.length));
row('indices', !bad.length, bad.length ? `${bad.map(l => l.name).join(', ')} hold indices past the palette` : `every pixel of ${info.layers.length} layers is a palette index`);
const inCycle = i => info.cycles.find(c => i >= c.start && i < c.start + c.len);
const N = AW * AH, stat = info.layers.filter(L => !L.dynamic);
const moved = stat.filter(L => idx[L.name][0].some((v, i) => v !== idx[L.name][1][i]));
row('pixels stay', !moved.length, moved.length ? `static layers changed indices over time: ${moved.map(l => l.name).join(', ')}` : `${stat.length} static layers keep every index (only colours move)`);
// each cycle: its slots are used, and turning it changes the picture
const use = info.cycles.map(c => { let n = 0; const slots = new Set(); for (const L of info.layers) for (const v of idx[L.name][0]) if (v >= c.start && v < c.start + c.len) { n++; slots.add(v - c.start); } return { c, n, slots: slots.size }; });
const idle = use.filter(u => u.n < 12 || u.slots < Math.min(u.c.len, 3));
row('cycles used', !idle.length, idle.length ? idle.map(u => `"${u.c.name}" ${u.n} px over ${u.slots}/${u.c.len} slots`).join('; ') + ' — a cycle nobody paints with' : use.map(u => `${u.c.name} ${u.n} px · ${u.slots}/${u.c.len} slots · ${u.c.rate}/s`).join(' · '));
{ const A = await fx('compositeRGBA', tA), B = await fx('compositeRGBA', tB); let changed = 0, stray = 0;
  for (let p = 0; p < N; p++) {
    const d = A[p * 4] !== B[p * 4] || A[p * 4 + 1] !== B[p * 4 + 1] || A[p * 4 + 2] !== B[p * 4 + 2]; if (!d) continue; changed++;
    const ok = info.layers.some(L => L.dynamic && (idx[L.name][0][p] || idx[L.name][1][p])) || info.layers.some(L => inCycle(idx[L.name][0][p]));
    if (!ok) stray++;
  }
  row('colour moves', changed > N * .004 && stray === 0, `${changed} of ${N} pixels change colour in ${f2(tB - tA)} s (${f2(changed / N * 100)} %); ${stray} change outside cycles and drawn layers${changed > N * .004 ? '' : ' — too little moves'}`); }

// ── flow: the bands travel along the arrows ──
for (const fl of info.flows) {
  const c = info.cycles.find(x => x.name === fl.cycle), field = await fx('flowField', fl.name), Li = idx[fl.layer][0];
  let fwd = 0, back = 0;
  for (const [x, y, vx, vy] of field) {
    const a = Li[y * AW + x]; if (!inCycle(a)) continue;
    for (const st of [2, 3, 4]) {
      const qx = Math.round(x + vx * st), qy = Math.round(y + vy * st); if (qx < 0 || qy < 0 || qx >= AW || qy >= AH) continue;
      const b = Li[qy * AW + qx]; if (!(b >= c.start && b < c.start + c.len)) continue;
      const d = ((b - a) % c.len + c.len) % c.len; if (d === 0) continue; if (d <= c.len / 2) fwd++; else back++;
    }
  }
  const r = fwd / Math.max(1, fwd + back), dirOk = c.rate * c.dir > 0;
  row('flow', field.length >= 8 && r >= .6 && dirOk, `"${fl.name}": ${field.length} vectors, ${f2(r * 100)} % of steps along an arrow climb the cycle${dirOk ? '' : ' — but the cycle turns backward (rate × dir must be > 0)'}${field.length < 8 ? ' — too few pixels to show a field' : ''}`);
}

// ── rigs: fixed bones, planted roots, limits, follow-through, never still ──
const LIMIT = 34, fps = info.fps, ts = Array.from({ length: Math.floor(info.duration * 15) }, (_, i) => i / 15);
for (const r of info.rigs) {
  const poses = await page.evaluate(([n, ts]) => ts.map(t => window.__film.rigPose(n, t)), [r.name, ts]);
  const angs = await page.evaluate(([n, ts]) => ts.map(t => window.__film.rigAngles(n, t)), [r.name, ts]);
  let lenErr = 0, rootErr = 0, maxBend = 0, maxTip = 0;
  poses.forEach((pose, k) => pose.forEach((pts, j) => {
    const fr = r.fronds[j], seg = fr.len / fr.segs;
    rootErr = Math.max(rootErr, Math.hypot(pts[0][0] - r.x, pts[0][1] - r.y));
    for (let q = 1; q < pts.length; q++) lenErr = Math.max(lenErr, Math.abs(Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]) - seg));
    if (k) { const a = poses[k - 1][j][pts.length - 1], b = pts[pts.length - 1]; maxTip = Math.max(maxTip, Math.hypot(a[0] - b[0], a[1] - b[1]) * 15 / fps); }
  }));
  angs.forEach(fr => fr.forEach(js => js.forEach(({ bend }) => { maxBend = Math.max(maxBend, Math.abs(bend)); })));
  // follow-through: the tip's bend lags the base's (best correlation delay > 0); idle: the tip keeps moving
  let lag = 0, best = -1e9; const base = angs.map(a => a[0][0].bend), tip = angs.map(a => a[0][a[0].length - 1].bend);
  for (let d = 0; d <= 9; d++) { let s = 0; for (let k = d; k < base.length; k++) s += (base[k - d] - avg(base)) * (tip[k] - avg(tip)); if (s > best) { best = s; lag = d; } }
  let still = 1e9; for (let k = 0; k + 30 < tip.length; k += 5) { const w = tip.slice(k, k + 30); still = Math.min(still, Math.max(...w) - Math.min(...w)); }
  const ok = lenErr < 1e-6 && rootErr < 1e-6 && maxBend <= LIMIT + 1e-9 && lag >= 1 && still >= 1 && maxTip <= 2.5;
  row('rig', ok, `"${r.name}" ${r.fronds.length} fronds: bones ±${f3(lenErr)} px, root ±${f3(rootErr)} px, bend ≤ ${f2(maxBend)}° (limit ${LIMIT}), tip lags base by ${f2(lag / 15)} s, tip swings ≥ ${f2(still)}° in any 2 s, tip ≤ ${f2(maxTip)} px/frame`);
}
function avg(a) { return a.reduce((s, v) => s + v, 0) / a.length; }

// ── camera: no velocity step, holds that still drift ──
{ const cams = await page.evaluate(([n, fps]) => Array.from({ length: n }, (_, i) => window.__film.camAt(i / fps)), [Math.floor(info.duration * fps), fps]);
  let acc = 0; for (let i = 2; i < cams.length; i++) for (const k of ['p', 'phi', 'k']) acc = Math.max(acc, Math.abs(cams[i][k] - 2 * cams[i - 1][k] + cams[i - 2][k]));
  const ex = cams.slice(Math.ceil(info.explode.e1 * fps), Math.floor((info.explode.e1 + 1) * fps)).map(c => c.phi), drift = (Math.max(...ex) - Math.min(...ex)) * 180 / Math.PI;
  row('camera', acc < .01 && drift > .1, `largest frame-to-frame change of speed ${f3(acc)} (< .01), exploded hold still drifts ${f2(drift)}°`); }

// ── text minimums (px at 1920 wide) ──
const MIN = { kicker: 18, title: 44, label: 24, caption: 22, slot: 16, layer: 24 };
// ── framing: every plane inside the frame, above the layer names ──
{ const t = +(info.explode.e1 + .5).toFixed(3); await grab(page, t);
  const qs = await fx('planeQuads', t), CW = SW, CH = SH; let worst = 0;
  for (const q of qs) for (const [x, y] of q.pts) worst = Math.max(worst, -x, x - CW, -y, y - (CH - 175));
  row('framing', worst <= 0, `${qs.length} planes at t=${t}: ${worst <= 0 ? 'all inside the frame and above the names' : `a corner is ${f2(worst)} px out`}`);
  const tx = await fx('texts'); checkTexts('layer names', tx, t); }

// ── text: sizes, inside the frame and their columns, no overlaps ──
function checkTexts(name, tx, t) {
  const small = tx.filter(b => b.size < MIN[b.role]), outF = tx.filter(b => b.x < 0 || b.y < 0 || b.x + b.w > SW || b.y + b.h > SH), wide = tx.filter(b => b.max && b.w > b.max + .5);
  const over = []; for (let i = 0; i < tx.length; i++) for (let j = i + 1; j < tx.length; j++) { const a = tx[i], b = tx[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) over.push(`"${a.str}" × "${b.str}"`); }
  const ok = tx.length && !small.length && !outF.length && !wide.length && !over.length;
  row('legible', ok, `${name} at t=${t}: ${tx.length} texts` + (small.length ? `; too small: ${small.map(b => `"${b.str}" ${b.size}px`).join(', ')}` : '') + (outF.length ? `; outside the frame: ${outF.map(b => `"${b.str}"`).join(', ')}` : '') + (wide.length ? `; wider than its column: ${wide.map(b => `"${b.str}" ${Math.round(b.w)}/${Math.round(b.max)} px`).join(', ')}` : '') + (over.length ? `; overlapping: ${over.join(', ')}` : '') + (ok ? ' — sizes ≥ minimums, all inside, none overlap' : ''));
}
const panels = info.shots.filter(s => s.kind === 'panel');
row('panels', panels.length >= 1 && panels.length <= 4, `${panels.length} panels (${panels.map(s => s.panel.kind).join(', ')}) — 1 to 4`);
for (const s of panels) { const t = +(s.t0 + 2.4).toFixed(3); await grab(page, t); checkTexts(`panel ${s.panel.n}`, await fx('texts'), t); }

// ── the picture: not flat, not black ──
{ await grab(page, info.explode.e0 * .5); const m = await page.evaluate(measureInPage);
  row('picture', m.p95 - m.p05 > .12 && m.black < .2 && m.flat < .5, `held picture: luminance spread ${f2(m.p95 - m.p05)}, black ${f2(m.black * 100)} %, flat tiles ${f2(m.flat * 100)} %`); }

// ── designed for its topic: no title, layer name or panel line borrowed from the bundled films ──
{ const own = [join(skill, 'starter'), ...readdirSync(join(skill, 'examples')).map(d => join(skill, 'examples', d))].filter(p => existsSync(join(p, 'film.js')));
  const isOwn = own.some(p => resolve(p) === resolve(dir));
  if (isOwn) row('designed', true, `${relative(skill, dir)} is one of the skill's own films`);
  else {
    const words = [info.title, ...info.layers.map(l => l.label), ...panels.flatMap(s => [s.panel.title, s.panel.caption])].filter(Boolean);
    const lifted = []; for (const p of own) { const t = readFileSync(join(p, 'film.js'), 'utf8'); for (const w of words) if (t.includes(`'${w}'`)) lifted.push(`"${w}" (${relative(skill, p)})`); }
    for (const w of words) if (/^Replace:/.test(w)) lifted.push(`"${w}" (the skeleton's placeholder)`);
    row('designed', !lifted.length, lifted.length ? `borrowed from a bundled film: ${lifted.join(', ')} — design the picture and the words for this topic` : `${words.length} titles, layer names and panel lines are this film's own`);
  }
}

// ── brief ──
if (!flag('no-brief')) {
  const bp = join(dir, 'BRIEF.md'), b = existsSync(bp) ? readFileSync(bp, 'utf8') : '';
  const sec = b.split(/^## Stills review/m)[1] || '', done = (sec.match(/^- \[x\]/gmi) || []).length, open_ = (sec.match(/^- \[ \]/gm) || []).length;
  const blanks = (b.match(/TODO|＿|_{3,}/g) || []).length;
  row('brief', !!b && done >= 8 && !open_ && !blanks, !b ? 'no BRIEF.md' : `stills review ${done} answered, ${open_} open, ${blanks} blanks${done >= 8 && !open_ && !blanks ? '' : ' — fill the brief and answer the review from rendered frames'}`);
}
if (errors.length) row('console', false, errors.slice(0, 3).join(' | '));
await browser.close();
console.log(failed ? `\n${failed} check${failed > 1 ? 's' : ''} failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
