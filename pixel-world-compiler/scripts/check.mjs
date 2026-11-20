// pixel-world-compiler · check.mjs — holds a world to the laws it claims, and reports numbers, not just ok.
//   node <skill>/scripts/check.mjs index.html [--frames 8] [--json out/check.json]
// FAIL (exit 1):
//   palette   a drawn pixel that is not an entry of the world's locked palette (tour frames + the cast sheet)
//   ramps     two adjacent rungs of one ramp that are the same colour (a rung nothing can reach)
//   determinism  seek(t) twice gives different pixels
//   feet      a planted foot that moves more than 1 px while planted
//   idle      an idle that never changes over its run (a dead stand)
//   big move  no gather (< 1 px against the action) before it, or no settle (overshoot or brace, < 0.3 px) after it
//   joints    a knee or elbow bent the wrong way, a quadruped carpus/hock on the wrong side, a reach the leg cannot make (> 1.5 px)
//   facing    walking more than 10° off the way the body faces
//   loop      a looping plan that does not end where it began (> 1 px)
// REPORT: sun, palette size, ramps, floors (where the medium overruled a measurement), scale table, per-actor gait.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find((a) => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs <index.html> [--frames 8] [--json file]'); process.exit(1); }

const browser = await chromium.launch();
const errors = [];
async function open(q) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pathToFileURL(page$).href + '?render=1' + (q ? '&' + q : ''), { waitUntil: 'load' });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
    if (errors.length) throw new Error('world failed: ' + errors[0]);
    if (Date.now() - t0 > 120000) throw new Error('never ready'); await new Promise((r) => setTimeout(r, 50));
  }
  return page;
}
const fails = [], warns = [];
const fail = (k, msg) => fails.push(`${k}: ${msg}`), warn = (k, msg) => warns.push(`${k}: ${msg}`);

const page = await open();
const R = await page.evaluate(() => window.FW_CHECK());
const DUR = await page.evaluate(() => window.DURATION);

/* the palette, from the ramps the world declared */
const allowed = new Set();
for (const r of R.palette.ramps) for (const h of r.rungs) allowed.add(h);
const hexOf = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
async function strays(pg, t) {
  return pg.evaluate(([t, allowed]) => {
    if (t != null) window.seek(t);
    const c = document.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, set = new Set(allowed), bad = new Map();
    let n = 0; for (let i = 0; i < d.length; i += 4) { const h = '#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join(''); if (!set.has(h)) { n++; bad.set(h, (bad.get(h) || 0) + 1); } }
    const colours = new Set(); for (let i = 0; i < d.length; i += 4) colours.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    return { n, top: [...bad.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4), colours: colours.size, sum: (() => { let h = 0; for (let i = 0; i < d.length; i++) h = (Math.imul(h, 31) + d[i]) | 0; return h; })() };
  }, [t, [...allowed]]);
}
const nF = +opt('frames', 8), frames = [];
for (let i = 0; i < nF; i++) { const t = +((DUR * (i + 0.5)) / nF).toFixed(2), s = await strays(page, t); frames.push({ t, ...s }); if (s.n) fail('palette', `t=${t}: ${s.n} pixels outside the palette (${s.top.map((x) => x.join('×')).join(', ')})`); }
/* determinism: the same t after another t gives the same bytes */
const a1 = await strays(page, DUR * 0.37), _ = await strays(page, DUR * 0.81), a2 = await strays(page, DUR * 0.37);
if (a1.sum !== a2.sum) fail('determinism', `seek(${(DUR * 0.37).toFixed(2)}) drew two different frames`);
void _;
const sheet = await open('sheet=cast'), sh = await strays(sheet, null);
if (sh.n) fail('palette', `cast sheet: ${sh.n} pixels outside the palette`);

/* ramps: adjacent rungs must differ */
for (const r of R.palette.ramps) for (let i = 1; i < r.rungs.length; i++) if (r.rungs[i] === r.rungs[i - 1]) fail('ramps', `${r.name}: rungs ${i - 1} and ${i} are both ${r.rungs[i]} — drop a rung or widen the ends`);

/* bodies and motion */
for (const a of R.actors) {
  if (a.slideMax > 1) fail('feet', `${a.id}: a planted foot moved ${a.slideMax} px (${a.slideFrames} frames)`);
  if (a.idleFrames && a.idleChanged < 2) fail('idle', `${a.id}: idle never changes over ${a.idleFrames} frames`);
  for (const b of a.big) {
    if (b.gatherPx < 1) fail('big move', `${a.id} ${b.name}: gathers ${b.gatherPx} px before an action of ${b.actionPx} px`);
    if (b.overshootPx < 0.3) fail('big move', `${a.id} ${b.name}: no settle after the action — it stops dead (${b.overshootPx} px)`);
  }
  if (a.jointErr) fail('joints', `${a.id}: ${a.jointErr} frames with a joint bent the wrong way`);
  if (a.reachMax > 1.5) fail('joints', `${a.id}: a leg asked to reach ${a.reachMax} px past its length`); else if (a.reachMax > 1.0) warn('joints', `${a.id}: legs at full stretch (${a.reachMax} px short)`);
  if (a.facingErr > 10) fail('facing', `${a.id}: walks ${a.facingErr}° off its facing`);
  if (a.loopGap > 1) fail('loop', `${a.id}: plan ends ${a.loopGap} px from where it began`);
}
await browser.close();
if (errors.length) fail('page', errors.slice(0, 3).join(' | '));

/* report */
const pad = (s, n) => String(s).padEnd(n);
console.log(`\n${R.name} — compiled in ${R.ms} ms, ground ${R.bake.join('×')} px, ${R.props} props`);
console.log(`sun  altitude ${R.sun.altDeg}°, azimuth ${R.sun.az}°, diffuse ${R.sun.diffuse}, shadow per px of height (${R.sun.shadow.join(', ')})`);
console.log(`palette  ${R.palette.count} colours (lock 64), ${R.palette.ramps.length} ramps; frames use ${frames.map((f) => f.colours).join('/')} distinct`);
for (const r of R.palette.ramps) console.log(`  ${pad(r.name, 10)} ${pad(r.kind, 8)} ${r.rungs.join(' ')}`);
if (R.floors.length) { console.log('floors (the medium overruled a measurement)'); for (const f of R.floors) console.log(`  ${f.what}: derived ${f.derived} → used ${f.used}`); }
console.log('scale  (26 px = 1.70 m)'); for (const s of R.scale) console.log(`  ${pad(s.form, 8)} ${pad(s.id || '', 10)} ${pad(s.metres ?? '', 5)} m → ${s.px} px tall`);
console.log('places'); for (const [k, v] of Object.entries(R.places)) console.log(`  ${k} at (${v.X}, ${v.Y}) m, score ${v.score}`);
console.log('actors');
console.log('  ' + ['id', 'kind', 'gait', 'v m/s', 'stride m', 'slide px', 'idle Δ', 'gather/act/over px', 'knee°', 'reach', 'facing°', 'loop'].map((h, i) => pad(h, [9, 6, 18, 6, 9, 9, 7, 20, 7, 6, 8, 5][i])).join(''));
for (const a of R.actors) console.log('  ' + [a.id, a.kind, a.gait, a.v_ms, a.stride_m, a.slideMax, a.idleChanged ?? '-', a.big.map((b) => `${b.gatherPx}/${b.actionPx}/${b.overshootPx}`).join(' ') || '-', a.minKnee, a.reachMax, a.facingErr, a.loopGap].map((h, i) => pad(h, [9, 6, 18, 6, 9, 9, 7, 20, 7, 6, 8, 5][i])).join(''));
for (const w of warns) console.log('warn  ' + w);
for (const f of fails) console.log('FAIL  ' + f);
console.log(fails.length ? `\n${fails.length} FAIL` : '\nok — every law above holds');
const j = opt('json'); if (j) { mkdirSync(dirname(resolve(j)), { recursive: true }); writeFileSync(j, JSON.stringify({ ...R, frames, fails, warns }, null, 1)); }
process.exit(fails.length ? 1 : 0);
