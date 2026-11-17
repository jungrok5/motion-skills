// logo-construction · check.mjs — proves a film page keeps the style's rules. Run from the project root:
//   node <skill>/scripts/check.mjs piece.html
// Fails (exit 1) on: page errors · a missing contract · a corner that is not a guide crossing or an edge on no guide ·
// a cut circle outside the mark · an eye on the wrong side for reads({ facing }) · a foot off the ground guide · a hole that closes up at 48 px · an act with no time ·
// a guide drawn after the shape builder starts · a cursor that jumps or leaves the frame · a sketch that is a copy of
// the mark (or nothing like it) · a mockup that is flat, unknown or whose ink does not stand off its surface ·
// glyphs missing from the bundled fonts · a frame that changes when seeked twice.
// Warns on: unused guides, more than six guide directions (mirrored pairs count once), a hole lost at 32 or 24 px, low mockup contrast.
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
  if (errors.length || Date.now() - t0 > 90000) { console.error('page did not load:', errors.join('\n') || 'timeout'); process.exit(1); }
  await new Promise(r => setTimeout(r, 80));
}
for (const k of ['seek', 'DURATION', 'FPS', 'SIZE', 'filmInfo', 'markCheck', 'legibility', 'glyphCheck', 'soundEvents', 'mockupCheck', 'sketchCheck', 'cursorAt'])
  if (!(await page.evaluate(k => k in window, k))) F(`contract: window.${k} missing`);
const info = await page.evaluate(() => window.filmInfo());
const { W, H } = await page.evaluate(() => window.SIZE);
O(`film ${info.duration} s · ${info.guides.length} guides · ${info.shapes.length} shapes · ${info.mockups.length} mockups`);

// 1 · construction: every corner a crossing, every edge on a guide
const mc = await page.evaluate(() => window.markCheck());
mc.problems.forEach(F);
mc.offGrid.forEach(m => F(`off the grid — ${m}`));
if (!mc.offGrid.length && !mc.problems.length) O(`grid: every corner is a crossing of two guides and every edge lies on one`);
if (mc.unusedGuides.length) Wn(`guides that build nothing: ${mc.unusedGuides.join(', ')} (mark one { measure: true } if it only measures)`);
if (mc.angles.length > 6) Wn(`${mc.angles.length} guide directions (${mc.angles.join('°, ')}°): a grid of few directions reads as designed`); else O(`guide directions: ${mc.angles.join('°, ')}°`);
if (mc.facing) { if (mc.facing.side !== mc.facing.want) F(`reads facing ${mc.facing.want} but the eye "${mc.facing.eye}" is on the ${mc.facing.side}`); else O(`faces ${mc.facing.want}: the eye "${mc.facing.eye}" is on that side`); }
for (const c of mc.circlesInShapes) if (!c.inside) F(`cut "${c.name}" is not inside any shape — it cuts nothing`);
if (mc.feet && mc.feet.count) { if (mc.feet.floating.length) F(`feet off the ground guide "${mc.feet.ground}": ${mc.feet.floating.join(', ')}`); else O(`${mc.feet.count} feet stand on "${mc.feet.ground}"`); }
else if (mc.feet) Wn(`reads({ ground: "${mc.feet.ground}" }) but no shape is { foot: true }`);
else if (info.meta.subject) Wn(`reads(): no ground guide — a mark that stands should name it`);
if (!info.meta.subject) Wn('reads({ subject }) is not set: say what the mark depicts');

// 2 · legibility: holes survive small sizes
for (const px of [48, 32, 24]) {
  const lg = await page.evaluate(px => window.legibility(px), px);
  if (lg.holesSmall < lg.holesBig) (px >= 48 ? F : Wn)(`at ${px} px ${lg.holesBig - lg.holesSmall} of ${lg.holesBig} holes close up (make the cut bigger or the gap wider)`);
  else O(`at ${px} px all ${lg.holesBig} holes stay open (ink cover ${lg.coverSmall})`);
}

// 3 · timeline
for (const [k, a] of Object.entries(info.acts)) if (!(a.end - a.start > .2)) F(`act "${k}" has no time`);
if (!info.fills.length) F('no shapes to fill');
if (info.shapes.some(s => s.round > 0) && !info.rounds.length) F('corners have radii but no refine drag rounds them');
const firstFill = Math.min(...info.fills.map(f => f.hover));
if (firstFill < info.acts.construct.end) F('the shape builder starts before the last guide is drawn');
O(`acts: ${Object.entries(info.acts).map(([k, a]) => `${k} ${(a.end - a.start).toFixed(1)}s`).join(' · ')}`);

// 4 · the cursor moves like a hand: no jumps, stays in frame (until the mockups)
const tEnd = info.acts.reveal.end, fps = 30;
const cur = await page.evaluate(([tEnd, fps]) => { const out = []; for (let t = 0; t < tEnd; t += 1 / fps) { const c = window.cursorAt(t); out.push([...c.p, c.down ? 1 : 0]); } return out; }, [tEnd, fps]);
// a free move may not exceed 150 px a frame; pulling a line out (button down) is a quicker swipe, up to 240
let maxJ = 0, at = 0, out = 0, over = null;
for (let i = 1; i < cur.length; i++) { const j = Math.hypot(cur[i][0] - cur[i - 1][0], cur[i][1] - cur[i - 1][1]), lim = cur[i][2] && cur[i - 1][2] ? 240 : 150; if (j > maxJ) { maxJ = j; at = i / fps; } if (j > lim && !over) over = [j, i / fps, lim]; }
const offAt = []; for (let i = 0; i < cur.length - fps; i++) { const [x, y] = cur[i]; if (x < -10 || y < -10 || x > W + 80 || y > H + 10) { out++; offAt.push((i / fps).toFixed(2)); } }
if (over) F(`cursor jumps ${over[0].toFixed(0)} px in one frame at ${over[1].toFixed(2)} s (limit ${over[2]})`); else O(`cursor: fastest step ${maxJ.toFixed(0)} px/frame at ${at.toFixed(2)} s`);
if (out) F(`cursor outside the frame for ${out} frames (${offAt.slice(0, 4).join(', ')} s)`);

// 5 · the sketch is the idea, drawn loosely
const sk = await page.evaluate(() => window.sketchCheck());
if (sk.iou > .95) F(`sketch IoU ${sk.iou}: it is a copy of the mark — raise sketch jitter / wobble`);
else if (sk.iou < .45) F(`sketch IoU ${sk.iou}: the sketch is not the same idea as the mark`);
else O(`sketch: IoU ${sk.iou} with the mark (loose, same idea)`);

// 6 · mockups
for (const mk of await page.evaluate(() => window.mockupCheck())) {
  if (!mk.known) F(`mockup kind "${mk.kind}" does not exist`);
  else if (mk.sd < 6) F(`mockup "${mk.kind}" is flat (luma sd ${mk.sd})`);
  if (mk.inkContrast < 2) F(`mockup "${mk.kind}": ink on base contrast ${mk.inkContrast} — the mark disappears`);
  else if (mk.inkContrast < 3) Wn(`mockup "${mk.kind}": ink on base contrast ${mk.inkContrast} (aim ≥ 3)`);
  else O(`mockup "${mk.kind}": ink contrast ${mk.inkContrast}, luma sd ${mk.sd}`);
}

// 7 · glyphs, frames, determinism
const miss = await page.evaluate(() => window.glyphCheck());
if (miss.length) F(`glyphs not in the bundled fonts: ${miss.join(' ')}`); else O('glyphs: all in the bundled fonts');
const hash = t => page.evaluate(t => { window.seek(t); return document.querySelector('canvas').toDataURL(); }, t).then(d => createHash('md5').update(d).digest('hex'));
const ts = [1, info.acts.construct.start + 3, info.acts.build.start + 1, info.acts.refine.start + 1.5, info.acts.reveal.end - .1].concat(info.mockups.map(m => m.from + .5));
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
