// bounce-symphony · check.mjs — proves a piece before it is rendered. Run from the project root:
//   node <skill>/scripts/check.mjs piece.html            → "check OK" or "check FAILED" (exit 1)
// It checks: the score (bar checks, unreadable tokens, ranges); the machine (every lane solved, no pad tilted past its
// limit, every run caught); the physics (an independent forward simulation drops every ball from its dropper and
// proves each note is struck on time — within 2 ms — on its own pad, and that no ball touches any other pad, pole,
// post, cup or the floor on the way); the camera (the balls in play are on screen, big enough in follow shots); frames
// (not black, not blown out, a struck pad glows); determinism (the same t twice gives the same pixels); the sound
// (no NaN, not silent, the first strike sounds on its note's time).
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { openPiece, grab } from './browser.mjs';

const file = resolve(process.argv.slice(2).find((a) => a.endsWith('.html')) || '');
if (!existsSync(file)) { console.error('usage: check.mjs <piece.html>'); process.exit(1); }
const errors = [], warnings = [];
const { browser, page, log } = await openPiece(file, { query: 'render=1&scale=.5', quiet: true });
const r = await page.evaluate(() => window.runChecks());
errors.push(...r.errors); warnings.push(...r.warnings);

// frames: spread over the music, plus the instant after a few strikes
const { intro, end, D, strikes } = await page.evaluate(() => ({ intro: window.piece.m.intro, end: window.piece.m.end, D: window.DURATION, strikes: window.piece.m.hits.filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 6)) === 0).map((h) => h.t) }));
const times = [0.5, ...Array.from({ length: 6 }, (_, i) => intro + ((i + 0.5) * (end - intro)) / 6), D - 0.3].map((t) => +t.toFixed(2));
const stats = [];
const measure = (t) => page.evaluate((t) => {
  window.seek(t); const src = document.querySelector('#frame'), w = 240, h = Math.round((240 * src.height) / src.width);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(src, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data; let lum = 0, glow = 0, white = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lum += l; if (mx > 0.6 && mx - mn > 0.25) glow++; if (mn > 0.97) white++;
  }
  const n = d.length / 4; return { t, lum: lum / n, glow: glow / n, white: white / n };
}, t);
for (const t of times) {
  const s = await measure(t); stats.push(s);
  const tag = `frame ${t.toFixed(2)} s`;
  if (s.lum < 0.03) errors.push(`${tag}: nearly black (mean ${s.lum.toFixed(3)})`);
  if (s.lum > 0.55) warnings.push(`${tag}: very bright (mean ${s.lum.toFixed(2)}) — the glow will not read`);
  if (s.white > 0.03) warnings.push(`${tag}: ${(s.white * 100).toFixed(1)}% blown to white`);
}
// a struck pad lights up: compare just before and just after strikes (where the camera can see them)
let lit = 0, tried = 0;
for (const ts of strikes) {
  const a = await measure(+(ts - 0.03).toFixed(3)), b = await measure(+(ts + 0.06).toFixed(3)); tried++;
  if (b.glow > a.glow * 1.02 + 0.00002) lit++;
}
if (tried && lit === 0) errors.push(`no strike visibly lights its pad (tried ${tried}) — glowPeak too low, or the camera never sees a strike`);
// determinism
const h = async (t) => createHash('md5').update(await grab(page, t)).digest('hex');
const ta = +(intro + (end - intro) * 0.37).toFixed(2), a1 = await h(ta); await h(intro + (end - intro) * 0.81); const a2 = await h(ta);
if (a1 !== a2) errors.push(`not deterministic: frame ${ta} s differs after seeking elsewhere (state carried between frames?)`);
const spec = await page.evaluate(() => window.audioSpec());
await browser.close();
for (const e of log.errors) errors.push(`console: ${e.slice(0, 200)}`);
for (const u of log.failed) errors.push(`failed to load ${u}`);

// sound
const local = join(dirname(file), 'lib', 'synth.js'), skillLib = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'synth.js');
const { renderAudio } = await import(pathToFileURL(existsSync(local) ? local : skillLib).href);
const sr = 22050, au = renderAudio(spec, { sampleRate: sr });
let nan = 0, peak = 0, sum = 0;
for (const ch of [au.L, au.R]) for (let i = 0; i < ch.length; i++) { const v = ch[i]; if (!Number.isFinite(v)) nan++; else { peak = Math.max(peak, Math.abs(v)); sum += v * v; } }
const rms = Math.sqrt(sum / (au.L.length * 2)), db = 20 * Math.log10(rms || 1e-9);
if (nan) errors.push(`audio: ${nan} NaN samples`);
if (db < -40) errors.push(`audio: nearly silent (${db.toFixed(1)} dB RMS)`);
const notes = spec.hits.filter((x) => !['latch', 'catch', 'tick'].includes(x.kind)), first = Math.min(...notes.map((n) => n.t)); // the machine's own clicks are not notes
let on = -1; for (let i = Math.floor((first - 0.05) * sr); i < au.L.length; i++) if (i >= 0 && Math.abs(au.L[i]) + Math.abs(au.R[i]) > peak * 0.05) { on = i / sr; break; }
if (on < 0 || on < first - 0.02 || on > first + 0.03) errors.push(`audio: the first sound is at ${on.toFixed(3)} s, the first strike is written at ${first.toFixed(3)} s`);

const i = r.info;
console.log(`${file}\n  ${i.duration} s (${i.music} s of music) · ${i.lanes} lanes · ${i.pads} pads · ${i.balls} balls · machine ${i.footprint.join(' × ')} m, ${i.height} m tall · steepest pad ${i.maxTilt}°`);
console.log(`  pads (balls) per lane: ${Object.entries(i.hitsPerLane).map(([k, v]) => `${k} ${v} (${i.ballsPerLane[k]})`).join(' · ')}`);
const bad = i.sim.filter((s) => !s.ok).length;
if (i.mech) console.log(`  machine: ${i.mech.droppers} droppers · ${i.mech.catapults} catapults · ${i.mech.rails} rails · ${i.mech.helices} helix towers · ${i.mech.rods} push rods · ${i.mech.lines} domino lines (${i.mech.dominoes} dominoes)${i.mech.starter ? ' · a starter hammer' : ''} — causes: ${Object.entries(i.mech.causes).map(([k, v]) => `${k} ${v}`).join(', ')}`);
console.log(`  physics: ${i.sim.length - bad}/${i.sim.length} balls fly their score exactly (worst timing error ${Math.max(0, ...i.sim.map((s) => s.worstMs)).toFixed(3)} ms)`);
for (const s of i.shots) console.log(`  shot @${s.at}s ${s.kind.padEnd(6)} balls on screen ${(s.seen * 100).toFixed(0)}%${s.ballPx !== null ? `  smallest ball ${s.ballPx}px` : ''}`);
console.log(`  frames: ${stats.map((s) => `${s.t}s lum ${s.lum.toFixed(2)} glow ${(s.glow * 100).toFixed(2)}%`).join(' · ')}`);
console.log(`  strikes that visibly light: ${lit}/${tried}`);
console.log(`  audio: ${db.toFixed(1)} dB RMS, peak ${peak.toFixed(2)}, first strike sounds at ${on.toFixed(3)} s (written ${first.toFixed(3)} s)`);
for (const w of warnings) console.log('  warning: ' + w);
for (const e of errors.slice(0, 40)) console.log('  ERROR: ' + e);
if (errors.length > 40) console.log(`  … and ${errors.length - 40} more`);
console.log(errors.length ? `check FAILED (${errors.length} error${errors.length > 1 ? 's' : ''})` : `check OK${warnings.length ? ` (${warnings.length} warning${warnings.length > 1 ? 's' : ''})` : ''}`);
process.exit(errors.length ? 1 : 0);
