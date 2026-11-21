// engraving-collage-film · check.mjs — proves a film page (and its cast sheet) before any render. Run from the project root:
//   node <skill>/scripts/check.mjs piece.html            (cast.html next to it is checked too)
// Fails on: page errors · film shape (length, shots) · a set that is not built (too few cards, one layer) · a blank,
// over-inked or paper-less comp · colour in the world (the engraving is ink on paper; only the cast is painted) · a shot
// whose cast shows no colour · a breakdown panel without its outlines · non-determinism · a camera that lurches · body
// rules (joint ranges, planted feet sliding, facing against the move, a dead idle) · cast-sheet motion (drift,
// anticipation that is too short or goes the wrong way) · a silent or clipped score. It reports numbers, not just verdicts.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { synth } from './sound.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const CHROME_ARGS = ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader'];

const page$ = resolve(process.argv.slice(2).find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs <piece.html>'); process.exit(1); }
const fails = [], warns = [], note = (ok, msg, warn = false) => { console.log(`${ok ? '  ok ' : warn ? 'warn ' : 'FAIL '} ${msg}`); if (!ok) (warn ? warns : fails).push(msg); };

const browser = await chromium.launch({ args: CHROME_ARGS });
async function open(file, q = '') {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } }), errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/GPU stall|GL Driver|WebGL|GroupMarker/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await page.goto(pathToFileURL(file).href + '?render=1' + q, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true).catch(() => false));) {
    if (errs.length) break; if (Date.now() - t0 > 240000) { errs.push('never ready'); break; } await new Promise(r => setTimeout(r, 100));
  }
  return { page, errs };
}

// ── the cast sheet ──
const cast$ = join(dirname(page$), 'cast.html');
if (existsSync(cast$)) {
  console.log('cast sheet');
  const { page, errs } = await open(cast$);
  note(!errs.length, `cast.html loads${errs.length ? ': ' + errs[0] : ''}`);
  if (!errs.length) {
    const r = await page.evaluate(() => window.castReport);
    note(!r.audit.length, `joint ranges on the sheet${r.audit.length ? ': ' + r.audit.slice(0, 3).join(' · ') : ''}`);
    for (const m of r.motion) {
      note(m.walk.drift400 <= 2 && m.run.drift400 <= 2, `${m.name}: planted feet hold — walk drift ${m.walk.drift400} px, run ${m.run.drift400} px (at 400 px tall; ≤ 2)`);
      note(m.idleMinDeg >= 0.3, `${m.name}: idle breathes — at least ${m.idleMinDeg}° of change in every second`);
      for (const [a, v] of Object.entries(m.antic)) note(v.frames >= 3 && v.opposite, `${m.name}: ${a} winds up the opposite way first — ${v.frames} frames${v.opposite ? '' : ', same direction'}`);
    }
  }
  await page.close();
} else note(false, 'no cast.html next to the page (the cast sheet is reviewed before shots)', true);

// ── the film ──
console.log('film');
const { page, errs } = await open(page$, '&scale=0.5&view=making');
note(!errs.length, `page loads clean${errs.length ? ': ' + errs.slice(0, 2).join(' · ') : ''}`);
if (errs.length) { await browser.close(); console.log(`\n${fails.length} check(s) failed`); process.exit(1); }
const info = await page.evaluate(() => window.filmInfo());
note(info.duration >= 8 && info.duration <= 90, `length ${info.duration.toFixed(1)} s (8–90)`);
for (const s of info.shots) note(s.dur >= 1.5 && s.dur <= 14, `shot ${s.i + 1} (${s.set}) ${s.dur} s (1.5–14)`);
for (const [k, st] of Object.entries(info.sets)) note(st.cards >= 10 && st.layers.length >= 2, `set "${k}" is built: ${st.cards} cards on ${st.layers.length} layers (≥ 10 cards, ≥ 2 layers: ${st.layers.join(', ')})`);
note(info.shots.some(s => s.cast.length), 'a character performs in at least one shot');

// pixel statistics of the comp (top) and breakdown (bottom) panels at a time
const stats = (t, hideCast = false) => page.evaluate(([t, hideCast]) => {
  window.setHidden({ cast: hideCast }); window.seek(t); window.setHidden({});
  const c = document.querySelector('canvas'), x = c.getContext('2d'), w = c.width, h = c.height / 2;
  const panel = (y0) => {
    const d = x.getImageData(0, y0, w, h).data; let paper = 0, ink = 0, color = 0, outline = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) {
      const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0, lum = (r + g + b) / 3;
      n++; if (lum > 225 && sat < 0.08) paper++; if (lum < 80) ink++; if (sat > 0.16 && mx > 60) color++;
      if (sat > 0.35 && mx > 120) outline++;
    }
    return { paper: paper / n, ink: ink / n, color: color / n, outline: outline / n };
  };
  let hsh = 0; const all = x.getImageData(0, 0, w, c.height).data; for (let i = 0; i < all.length; i += 7) hsh = (Math.imul(hsh, 31) + all[i]) | 0;
  return { comp: panel(0), rig: panel(h), hash: hsh };
}, [t, hideCast]);

for (const s of info.shots) {
  const t = +(s.start + s.dur * 0.5).toFixed(3), a = await stats(t), w = await stats(t, true);
  const c = a.comp;
  note(c.ink >= 0.03 && c.ink <= 0.55, `shot ${s.i + 1}: comp is engraved — ink ${(c.ink * 100).toFixed(1)} % (3–55)`);
  note(c.paper >= 0.12, `shot ${s.i + 1}: paper breathes — ${(c.paper * 100).toFixed(1)} % paper white (≥ 12)`, c.paper >= 0.06);
  note(w.comp.color <= 0.004, `shot ${s.i + 1}: the world is ink on paper — ${(w.comp.color * 100).toFixed(2)} % coloured pixels with the cast hidden (≤ 0.4)`);
  if (s.cast.length) note(c.color >= 0.002, `shot ${s.i + 1}: the cast carries the colour — ${(c.color * 100).toFixed(2)} % coloured pixels (≥ 0.2)`, true);
  note(a.rig.outline >= 0.0008, `shot ${s.i + 1}: breakdown draws its layer outlines and camera — ${(a.rig.outline * 1000).toFixed(1)} ‰`);
}
// determinism: the same moment twice, with other moments between, and from a second page
{
  const t = +(info.shots[0].start + info.shots[0].dur * 0.4).toFixed(3), h1 = (await stats(t)).hash;
  await stats(info.duration * 0.8); const h2 = (await stats(t)).hash;
  const p2 = await open(page$, '&scale=0.5&view=making'), h3 = await p2.page.evaluate((t) => { window.seek(t); const c = document.querySelector('canvas'), all = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < all.length; i += 7) h = (Math.imul(h, 31) + all[i]) | 0; return h; }, t);
  await p2.page.close();
  note(h1 === h2 && h1 === h3, `deterministic: t=${t} renders identically after seeking away and on a fresh page`);
}
// cameras
for (const c of await page.evaluate(() => window.cameraAudit())) note(c.maxStep <= 0.3 && c.maxTurn <= 1.4, `shot ${c.shot + 1}: camera glides — ${c.maxStep} m and ${c.maxTurn}° per frame at most (≤ 0.3 m, ≤ 1.4°)`);
// bodies
const body = await page.evaluate(() => window.bodyAudit());
note(!body.audit.length, `joint ranges through the film${body.audit.length ? ': ' + body.audit.slice(0, 3).join(' · ') : ''}`);
for (const d of body.drift) {
  note(d.px <= 2, `shot ${d.shot + 1}: ${d.name}'s planted feet hold — ${d.px} px drift (at 400 px tall; ≤ 2)`);
  if (d.across < 1) note(d.across >= 0.6, `shot ${d.shot + 1}: ${d.name} walks across the camera — ${Math.round(d.across * 100)} % of the travel is sideways on screen (≥ 60; a billboard walking at the lens moonwalks)`);
}
for (const f of body.facing) note(f.wrong === 0, `shot ${f.shot + 1}: ${f.name} faces the way they move${f.wrong ? ` — ${f.wrong} frames backwards` : ''}`);
for (const i of body.idle) if (i.frames > 12) note(i.maxStepDeg > 0.02, `shot ${i.shot + 1}: ${i.name}'s idle is alive — up to ${i.maxStepDeg}° a frame over ${i.frames} frames`);
// sound
const ev = await page.evaluate(() => window.soundEvents()), score = await page.evaluate(() => window.scoreInfo());
note(ev.filter(e => e.kind === 'cut').length === info.shots.length, `sound events: ${ev.length} (${[...new Set(ev.map(e => e.kind))].join(', ')})`);
const wav = synth(ev, info.duration, score); let peak = 0, rms = 0; for (let i = 44; i < wav.length; i += 4) { const v = Math.abs(wav.readInt16LE(i)) / 32767; peak = Math.max(peak, v); rms += v * v; }
rms = Math.sqrt(rms / ((wav.length - 44) / 4));
note(peak < 0.99 && rms > 0.01, `score renders: peak ${peak.toFixed(2)}, rms ${rms.toFixed(3)}`);

await browser.close();
console.log(fails.length ? `\n${fails.length} check(s) failed${warns.length ? `, ${warns.length} warning(s)` : ''}` : `\nall checks passed${warns.length ? ` (${warns.length} warning(s))` : ''}`);
process.exit(fails.length ? 1 : 0);
