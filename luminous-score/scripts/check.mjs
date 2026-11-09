// luminous-score · check.mjs — proves a piece page before it is rendered. Run from the project root:
//   node <skill>/scripts/check.mjs piece.html            → "check OK" or "check FAILED" (exit 1)
// It checks: the page loads clean (no console errors, no 404s, fonts); the score (bar checks, unreadable tokens, ranges,
// voices without notes); the colours (bright enough, voices on different staves told apart); the shots (order, blend,
// pitch); the camera (never under the paper, what sounds is on screen, the focus voice is on screen, notes are not
// specks); frames during the music (not black, not blown out, something glows whenever something sounds); determinism
// (the same t twice gives the same pixels); the sound (no NaN, not silent, not clipped, the first note starts on time).
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
const fonts = await page.evaluate(() => [...document.fonts].map((f) => `${f.family}:${f.status}`));
for (const f of fonts) if (!f.endsWith(':loaded')) errors.push(`font ${f}`);

// frames during the music
const { intro, music, D } = await page.evaluate(() => ({ intro: window.piece.intro, music: window.piece.musicEnd, D: window.DURATION }));
const times = [intro * 0.5, ...Array.from({ length: 8 }, (_, i) => intro + ((i + 0.5) * music) / 8), D - 0.3].map((t) => +t.toFixed(2));
const stats = [];
for (const t of times) {
  const s = await page.evaluate((t) => {
    window.seek(t); const src = document.querySelector('#frame'), w = 240, h = Math.round((240 * src.height) / src.width);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(src, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data; let lum = 0, glow = 0, white = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lum += l; if (mx > 0.7 && (mx - mn > 0.22 || l > 0.85)) glow++; if (mn > 0.97) white++;
    }
    const n = d.length / 4, sounding = window.piece.active(t).filter((a) => a.sounding).length;
    return { t, lum: lum / n, glow: glow / n, white: white / n, sounding };
  }, t);
  stats.push(s);
  const tag = `frame ${t.toFixed(2)} s`;
  if (s.lum < 0.04) errors.push(`${tag}: nearly black (mean ${s.lum.toFixed(3)})`);
  if (s.lum > 0.6) warnings.push(`${tag}: very bright (mean ${s.lum.toFixed(2)}) — the glow will not read`);
  if (s.white > 0.04) warnings.push(`${tag}: ${(s.white * 100).toFixed(1)}% blown to white`);
  if (s.sounding > 0 && s.glow < 0.00015) errors.push(`${tag}: ${s.sounding} notes sound but nothing glows on screen`);
}
// determinism
const h = async (t) => createHash('md5').update(await grab(page, t)).digest('hex');
const ta = +(intro + music * 0.37).toFixed(2), a1 = await h(ta); await h(intro + music * 0.81); const a2 = await h(ta);
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
if (db < -42) errors.push(`audio: nearly silent (${db.toFixed(1)} dB RMS)`);
if (peak > 0.99) warnings.push('audio: peaks at full scale');
const first = Math.min(...spec.notes.map((n) => n.t0)); let on = -1;
for (let i = 0; i < au.L.length; i++) if (Math.abs(au.L[i]) + Math.abs(au.R[i]) > peak * 0.02) { on = i / sr; break; }
if (Math.abs(on - first) > 0.06) errors.push(`audio: the first note is written at ${first.toFixed(3)} s but sounds at ${on.toFixed(3)} s`);

console.log(`${file}\n  ${r.info.duration} s (${r.info.music} s of music + intro / outro) · ${r.info.bars} bars · ${r.info.voices} voices on ${r.info.staves} staves · ${r.info.notes} notes · ${r.info.heads} heads`);
for (const s of r.info.shots) console.log(`  shot @${s.at}s  on screen ${(s.seen * 100).toFixed(0)}%${s.focus !== null ? `  focus ${(s.focus * 100).toFixed(0)}%` : ''}  staff space ${s.staffSpacePx}px`);
console.log(`  frames: ${stats.map((s) => `${s.t}s lum ${s.lum.toFixed(2)} glow ${(s.glow * 100).toFixed(2)}%`).join(' · ')}`);
console.log(`  audio: ${db.toFixed(1)} dB RMS, peak ${peak.toFixed(2)}, first note at ${on.toFixed(3)} s`);
for (const w of warnings) console.log('  warning: ' + w);
for (const e of errors) console.log('  ERROR: ' + e);
console.log(errors.length ? `check FAILED (${errors.length} error${errors.length > 1 ? 's' : ''})` : `check OK${warnings.length ? ` (${warnings.length} warning${warnings.length > 1 ? 's' : ''})` : ''}`);
process.exit(errors.length ? 1 : 0);
