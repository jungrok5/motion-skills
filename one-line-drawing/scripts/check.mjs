// one-line-drawing · check.mjs — proves a film page keeps the style's rules. Run from the project root:
//   node <skill>/scripts/check.mjs piece.html
// Fails (exit 1) on: page errors · a missing contract · a gap in the line (it must never lift) · line off the page ·
// too few loops / no zigzag fill / fewer than two contours (the vocabulary) · a traced shape the line hardly touches ·
// a pen at one constant speed or racing (> 1600 px/s) · the nib leaving the frame or a camera that lurches ·
// a figure with an impossible joint, a foot off its ground, or not drawn by the line · a blank or flat photo ·
// an unfinished reveal · a signature the bundled font lacks · a frame that changes when seeked twice.
// Warns on: thin coverage, no pause, no right-angle steps, a camera that never comes close, a short hold.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const page$ = resolve(process.argv.slice(2).find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs <piece.html>'); process.exit(1); }

const fails = [], warns = [], ok = [];
const F = m => fails.push(m), Wn = m => warns.push(m), O = m => ok.push(m);
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(pathToFileURL(page$).href + '?render=1&scale=.5', { waitUntil: 'commit' });
for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true).catch(() => false));) {
  if (errors.length || Date.now() - t0 > 120000) { console.error('page did not load:', errors.join('\n') || 'timeout'); process.exit(1); }
  await new Promise(r => setTimeout(r, 100));
}
for (const k of ['seek', 'DURATION', 'FPS', 'SIZE', 'filmInfo', 'lineCheck', 'coverage', 'camCheck', 'bodyCheck', 'revealCheck', 'refCheck', 'penAt', 'soundEvents', 'glyphCheck'])
  if (!(await page.evaluate(k => k in window, k))) F(`contract: window.${k} missing`);
const info = await page.evaluate(() => window.filmInfo());
O(`film ${info.duration} s · drawing ${info.acts.draw} s · line ${info.length} px · pace ${info.pace} px/s · ${info.shapes.length} shapes · ${info.figures.length} figures`);

// 1 · one line: no gaps, on the page
const lc = await page.evaluate(() => window.lineCheck());
if (lc.maxGap > 3) F(`the line jumps ${lc.maxGap} px between two samples — it must never lift`); else O(`one line: ${lc.samples} samples, biggest step ${lc.maxGap} px, no lifts`);
if (lc.offPage) F(`${lc.offPage} samples run off the page (keep 10 px inside)`);
if (lc.length < 3000) F(`the line is only ${lc.length} px — a one-line drawing fills its page`);

// 2 · the vocabulary
const c = lc.count;
if (c.curl < 6) F(`only ${c.curl} loops — the style curls at corners, wire ends and treelines (contour { curl }, hook, curls)`); else O(`loops: ${c.curl}`);
if (c.sweep + c.zig < 1) F('no zigzag fill (sweep / reflect / zig) — water, roads and reflections are zigzags in this style'); else O(`zigzag fills: ${c.sweep} sweeps, ${c.zig} zigs`);
if (c.contour < 2) F(`only ${c.contour} contour — the subjects are traced round their silhouettes`); else O(`contours: ${c.contour}`);
if (c.step < 1) Wn('no right-angle steps (steps / hook): the ruled edges and stepped wires are part of the look');
if (!lc.pauses) Wn('the pen never pauses (L.pause): a hand stops to look now and then');

// 3 · coverage: the line goes where the picture is
for (const s of (await page.evaluate(() => window.coverage())).shapes) {
  if (s.cover < .5) F(`"${s.name}": the line passes only ${Math.round(s.cover * 100)} % of its outline — trace it, or mark it { trace: false }`);
  else if (s.cover < .75) Wn(`"${s.name}": ${Math.round(s.cover * 100)} % of its outline covered`);
}
O(`coverage checked on ${info.shapes.length} shapes (line sheet shows gaps in red)`);

// 4 · the pace is a hand: varied, never racing
const sp = lc.speed;
if (sp.p95 > 1600) F(`the pen races at ${sp.p95} px/s (95th percentile) — lengthen timing.draw or shorten the line`);
if (sp.p95 / Math.max(1, sp.p10) < 1.8) F(`the pen keeps one speed (p10 ${sp.p10}, p95 ${sp.p95} px/s) — a machine, not a hand`);
else O(`pace: p10 ${sp.p10} · median ${sp.median} · p95 ${sp.p95} px/s`);
if (info.acts.draw < 20 || info.acts.draw > 100) Wn(`drawing lasts ${info.acts.draw} s (the style sits around 35–60 s)`);

// 5 · the camera rides with the nib
const cc = await page.evaluate(() => window.camCheck());
if (cc.outside) F(`the nib leaves the frame on ${cc.outside} frames (${cc.at.join(', ')} s)`); else O(`camera: nib in frame throughout, zoom ${cc.zoom.join('–')}, ${cc.breathers.length} breathers`);
if (cc.maxStep > 70) F(`the camera lurches ${cc.maxStep} px in one frame`);
if (cc.zoom[1] < 1.8) Wn(`the camera never comes close (max zoom ${cc.zoom[1]}): the style rides near the nib`);

// 6 · bodies
for (const b of await page.evaluate(() => window.bodyCheck())) {
  b.problems.forEach(p => F(`${b.name}: ${p}`));
  if (b.footOff > 2) F(`${b.name}: lowest foot ${b.footOff} px off its ground`);
  if (!b.traced) F(`${b.name}: a figure must be drawn by the line (trace: true)`);
  else if (b.cover < .7) F(`${b.name}: the line covers only ${Math.round(b.cover * 100)} % of the figure`);
  if (!b.problems.length && b.footOff <= 2) O(`${b.name}: faces ${b.facing}, joints in range, feet on the ground, ${Math.round(b.cover * 100)} % traced`);
}

// 7 · the photo, the reveal, the signature
const rf = await page.evaluate(() => window.refCheck());
if (rf.sd < 8) F(`the photo under the pen is flat (luma sd ${rf.sd})`); else if (rf.mean < 120) F(`the photo is too dark (mean ${rf.mean}) — the style is a pale, faded print under black ink`); else O(`photo: mean ${rf.mean}, sd ${rf.sd}`);
const rv = await page.evaluate(() => window.revealCheck());
if (!rv.lineDone || !rv.refGone || !rv.signDone) F(`reveal unfinished: line ${rv.lineDone}, photo gone ${rv.refGone}, signed ${rv.signDone}`); else O('reveal: line done, photo gone, signed');
if (rv.hold < 1.5) Wn(`the clean drawing holds only ${rv.hold} s`);
const miss = await page.evaluate(() => window.glyphCheck());
if (miss.length) F(`signature characters not in the bundled font: ${miss.join(' ')}`);

// 8 · determinism
const A = info.actTimes;
const hash = t => page.evaluate(t => { window.seek(t); return document.querySelector('canvas').toDataURL(); }, t).then(d => createHash('md5').update(d).digest('hex'));
const ts = [A.intro[1] - .4, A.draw[0] + 3, (A.draw[0] + A.draw[1]) / 2, A.draw[1] - 2, A.fade[0] + .5, info.duration - .1];
const h1 = []; for (const t of ts) h1.push(await hash(t));
const h2 = []; for (const t of [...ts].reverse()) h2.unshift(await hash(t));
const bad = ts.filter((t, i) => h1[i] !== h2[i]);
if (bad.length) F(`not deterministic at ${bad.map(t => t.toFixed(2)).join(', ')} s`); else O(`deterministic at ${ts.length} times`);
if (errors.length) errors.forEach(e => F(`page error: ${e}`));
await browser.close();

for (const m of ok) console.log('  ok   ' + m);
for (const m of warns) console.log('  warn ' + m);
for (const m of fails) console.log('  FAIL ' + m);
console.log(fails.length ? `\n${fails.length} check(s) failed` : '\nall checks passed');
process.exit(fails.length ? 1 : 0);
