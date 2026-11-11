// kinetic-type-collage · score.mjs — a synthesised beat on the film's own grid (no samples, no network): a drum machine
// (kick, snare, closed / open hat) and a bass line from 16-step patterns, a stab and crash on accent shots, risers, and
// drop-outs where a shot asks for silence — so every cut lands on a hit.
//   node <skill>/scripts/score.mjs film.html --out out/film.wav
// Tune it from the page: new Film({ bpm, score: { root: 43.65, k: 'x..x..x.....x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.',
//   oh: '..............x.', bass: '0..0..0...3..5..', swing: 0.1, stab: [0, 3, 7, 10], gain: { k: 1, s: 1, h: 1, bass: 1, stab: 1 } } })
// and per shot: mix: 'full' | 'drums' (no bass) | 'half' (kick + bass) | 'hats' | 'break' (silence, tails ring) | 'out' (ring out),
//   accent: true (crash + sub + stab on the cut), sfx: 'riser' | 'hit' | 'whoosh'.
// A real track instead: skip this, set bpm to the track's tempo, cut on its beats, and pass it to render.mjs --audio.
// Options: --cues cues.json (the JSON window.cues() returns; skips the browser)  --seed 5
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = args.find((a) => a.endsWith('.html')), out = resolve(opt('out', 'out/film.wav'));
let C;
if (opt('cues')) C = JSON.parse(readFileSync(opt('cues'), 'utf8'));
else {
  if (!page$ || !existsSync(page$)) { console.error('usage: score.mjs film.html [--out out/film.wav] | --cues cues.json'); process.exit(1); }
  const require = createRequire(import.meta.url); let chromium;
  try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
  const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage(); await p.goto(pathToFileURL(resolve(page$)).href + '?render=1&scale=.1');
  await p.waitForFunction(() => window.READY === true, null, { timeout: 300000 });
  C = await p.evaluate(() => window.cues()); await b.close();
}
const S = { root: 43.65, k: 'x..x..x.....x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', oh: '..............x.', bass: '0..0..0...3..5..', swing: 0.08, stab: [0, 3, 7, 10], reverb: 0.22, ...(C.score || {}) };
const G = { k: 1, s: 1, h: 1, bass: 1, stab: 1, fx: 1, ...(S.gain || {}) };
const SR = 48000, N = Math.ceil(C.duration * SR) + SR, L = new Float32Array(N), R = new Float32Array(N), WL = new Float32Array(N), WR = new Float32Array(N);
let seed = +opt('seed', 5); const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const TAU = Math.PI * 2;
const put = (i, v, pan = 0, wet = 0) => { if (i < 0 || i >= N) return; const l = v * (1 - pan * 0.6), r = v * (1 + pan * 0.6); L[i] += l; R[i] += r; if (wet) { WL[i] += l * wet; WR[i] += r * wet; } };

function kick(t0, g = 1) { let ph = 0; const n = Math.floor(0.42 * SR), i0 = Math.floor(t0 * SR); for (let k = 0; k < n; k++) { const t = k / SR; ph += (TAU * (44 + 130 * Math.exp(-t * 30))) / SR; put(i0 + k, (Math.sin(ph) * Math.exp(-t * 7.5) + (rnd() - 0.5) * Math.exp(-t * 400) * 0.5) * 0.95 * g * G.k); } }
function snare(t0, g = 1) { let ph = 0, lp = 0; const n = Math.floor(0.26 * SR), i0 = Math.floor(t0 * SR); for (let k = 0; k < n; k++) { const t = k / SR, x = rnd() * 2 - 1; lp += (x - lp) * 0.35; ph += (TAU * (178 + 60 * Math.exp(-t * 40))) / SR; put(i0 + k, ((x - lp) * Math.exp(-t * 19) * 0.55 + Math.sin(ph) * Math.exp(-t * 26) * 0.5) * 0.7 * g * G.s, 0.05, 0.5); } }
function hat(t0, open, g = 1) { let p1 = 0, p2 = 0; const n = Math.floor((open ? 0.3 : 0.06) * SR), i0 = Math.floor(t0 * SR), dec = open ? 13 : 85; for (let k = 0; k < n; k++) { const t = k / SR, x = rnd() * 2 - 1, hp = x - p1 * 0.5 - p2 * 0.5; p2 = p1; p1 = x; put(i0 + k, hp * Math.exp(-t * dec) * 0.2 * g * G.h, 0.25, 0.15); } }
function bass(t0, semi, dur, g = 1) { const f = S.root * 2 ** (semi / 12), n = Math.floor(dur * SR), i0 = Math.floor(t0 * SR); let ph = 0; for (let k = 0; k < n; k++) { const t = k / SR; ph += (TAU * f) / SR; const env = Math.min(1, t / 0.004) * Math.exp(-t * 3.2) * Math.min(1, (dur - t) / 0.012), br = Math.exp(-t * 9); let v = Math.sin(ph) + 0.5 * br * Math.sin(2 * ph) + 0.33 * br * Math.sin(3 * ph) + 0.2 * br * Math.sin(4 * ph); put(i0 + k, Math.tanh(v * 1.4) * env * 0.5 * g * G.bass); } }
function stab(t0, g = 1) { const n = Math.floor(0.7 * SR), i0 = Math.floor(t0 * SR); for (const [j, semi] of S.stab.entries()) for (const det of [-0.006, 0.006]) { const f = S.root * 8 * 2 ** (semi / 12) * (1 + det); let ph = j * 1.7; for (let k = 0; k < n; k++) { const t = k / SR; ph += (TAU * f) / SR; const br = Math.exp(-t * 7); let v = 0; for (let h = 1; h <= 7; h++) v += (Math.sin(h * ph) / h) * (h === 1 ? 1 : br); put(i0 + k, v * Math.exp(-t * 6.5) * Math.min(1, t / 0.003) * 0.075 * g * G.stab, det > 0 ? 0.5 : -0.5, 0.7); } } }
function crash(t0, g = 1) { let p1 = 0; const n = Math.floor(1.3 * SR), i0 = Math.floor(t0 * SR); for (let k = 0; k < n; k++) { const t = k / SR, x = rnd() * 2 - 1, hp = x - p1; p1 = x; put(i0 + k, hp * Math.exp(-t * 3.4) * 0.16 * g * G.fx, -0.2, 0.5); } }
function boom(t0, g = 1) { let ph = 0; const n = Math.floor(1.2 * SR), i0 = Math.floor(t0 * SR); for (let k = 0; k < n; k++) { const t = k / SR; ph += (TAU * (34 + 40 * Math.exp(-t * 9))) / SR; put(i0 + k, Math.sin(ph) * Math.exp(-t * 3) * 0.75 * g * G.fx); } }
function noiseSweep(t0, dur, lo, hi, gain, shape) { const i0 = Math.floor(t0 * SR), n = Math.floor(dur * SR); let b0 = 0, b2 = 0, a1 = 0, a2 = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let k = 0; k < n; k++) { const p = k / n; if (k % 64 === 0) { const fc = lo * (hi / lo) ** p, w = (TAU * fc) / SR, al = Math.sin(w) / 2.4, a0 = 1 + al; b0 = al / a0; b2 = -al / a0; a1 = (-2 * Math.cos(w)) / a0; a2 = (1 - al) / a0; } const x = rnd() * 2 - 1, y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; put(i0 + k, y * shape(p) * gain * G.fx, (p - 0.5) * 0.8, 0.3); } }
function rim(t0, g = 1) { const n = Math.floor(0.05 * SR), i0 = Math.floor(t0 * SR); let ph = 0; for (let k = 0; k < n; k++) { const t = k / SR; ph += (TAU * 1750) / SR; put(i0 + k, (Math.sin(ph) + (rnd() - 0.5)) * Math.exp(-t * 120) * 0.3 * g * G.s, -0.3, 0.4); } }

const mixAt = (t) => { let m = 'full'; for (const s of C.shots) if (t >= s.t - 1e-4) m = s.mix; else break; return m; };
const step = C.beat / 4, steps = Math.ceil(C.duration / step), pat = (p, i) => (p ? p[i % p.length] : '.');
for (let i = 0; i < steps; i++) {
  const t = i * step + (i % 2 ? S.swing * step : 0), m = mixAt(i * step + 1e-3); if (t >= C.duration) break;
  const drums = m === 'full' || m === 'drums', low = drums || m === 'half';
  if (low && pat(S.k, i) !== '.') kick(t, pat(S.k, i) === 'X' ? 1.15 : 1);
  if (drums && pat(S.s, i) !== '.') snare(t);
  if ((drums || m === 'hats') && pat(S.h, i) !== '.') hat(t, false, i % 4 === 0 ? 1 : 0.6);
  if ((drums || m === 'hats') && pat(S.oh, i) !== '.') hat(t, true);
  const bch = pat(S.bass, i);
  if ((m === 'full' || m === 'half') && bch !== '.') { let len = 1; while (len < 6 && pat(S.bass, i + len) === '.' && mixAt((i + len) * step + 1e-3) === m) len++; const semi = bch === 'a' ? 10 : bch === 'b' ? 12 : bch === '-' ? -2 : parseInt(bch, 10) || 0; bass(t, semi, Math.min(len * step * 0.96, 0.9)); }
}
for (const s of C.shots) {
  if (s.accent) { crash(s.t); boom(s.t); stab(s.t); }
  if (s.mix === 'out') { kick(s.t, 1.1); stab(s.t, 1.2); crash(s.t, 0.8); }
  if (s.sfx === 'riser') noiseSweep(s.t, s.dur, 300, 7000, 0.5, (p) => p * p);
  else if (s.sfx === 'whoosh') noiseSweep(s.t, Math.min(0.35, s.dur), 4000, 500, 0.45, (p) => Math.sin(Math.PI * p));
  else if (s.sfx === 'hit') { rim(s.t); boom(s.t, 0.6); }
}
// reverb on the send (Schroeder: 4 combs + 2 allpasses per side)
function verb(x, off) {
  const combs = [1557, 1617, 1491, 1422].map((d) => Math.round(((d + off) * SR) / 44100)), aps = [225, 556].map((d) => Math.round((d * SR) / 44100)), y = new Float32Array(x.length);
  for (const d of combs) { const buf = new Float32Array(d); let j = 0, lp = 0; for (let i = 0; i < x.length; i++) { const o = buf[j]; lp = o * 0.75 + lp * 0.25; buf[j] = x[i] + lp * 0.8; y[i] += o / 4; j = (j + 1) % d; } }
  for (const d of aps) { const buf = new Float32Array(d); let j = 0; for (let i = 0; i < x.length; i++) { const b = buf[j], v = y[i] + b * 0.5; buf[j] = v; y[i] = b - v * 0.5; j = (j + 1) % d; } }
  return y;
}
const vl = verb(WL, 0), vr = verb(WR, 23);
const len = Math.ceil(C.duration * SR); let pk = 1e-9;
for (let i = 0; i < len; i++) { L[i] = Math.tanh((L[i] + vl[i] * S.reverb * 2) * 1.15); R[i] = Math.tanh((R[i] + vr[i] * S.reverb * 2) * 1.15); pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); }
const g = 0.89 / pk, buf = Buffer.alloc(44 + len * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + len * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(len * 4, 40);
for (let i = 0; i < len; i++) { const fade = Math.min(1, (len - i) / (SR * 0.04)); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g * fade)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g * fade)) * 32767), 46 + i * 4); }
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, buf);
console.log(`${out}  ${C.duration.toFixed(2)} s · ${C.bpm} bpm · ${C.shots.length} cuts · ${C.shots.filter((s) => s.accent).length} accents`);
