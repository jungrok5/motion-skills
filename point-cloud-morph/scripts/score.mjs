// point-cloud-morph · score.mjs — a synthesised score cued from the film's timeline (no samples, no network):
// a low drone and air bed, a filtered-noise whoosh shaped like each morph (nebula / flow / burst / fold), a tick train
// and rising tone under a scan, a sub thump + glass chime when a form settles, data blips on callouts and copy.
//   node <skill>/scripts/score.mjs film.html --out out/film.wav
// Tune it from the page: new Cloud({ score: { root: 55, bed: 1, whoosh: 1, chime: 1, blips: 1, reverb: 0.28 } }).
// Options: --cues cues.json (skip the browser; the JSON window.cues() returns)  --seed 3
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
  const p = await b.newPage(); await p.goto(pathToFileURL(resolve(page$)).href + '?render=1&scale=.25&n=2000');
  await p.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  C = await p.evaluate(() => ({ ...window.cues(), score: window.film.o.score || {} })); await b.close();
}
const S = { root: 55, bed: 1, whoosh: 1, chime: 1, blips: 1, reverb: 0.28, ...(C.score || {}) };
const SR = 48000, N = Math.ceil(C.duration * SR) + SR, L = new Float32Array(N), R = new Float32Array(N);
let seed = +opt('seed', 3); const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const TAU = Math.PI * 2;
const put = (i, l, r) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };

// ---- bed: drone (root, fifth, octave) breathing slowly + low air
{
  const f = [S.root, S.root * 1.5, S.root * 2, S.root * 3.01], a = [0.5, 0.22, 0.16, 0.05];
  let lp = 0, lp2 = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR, env = Math.min(1, t / 2.5) * Math.min(1, Math.max(0, (C.duration + 0.6 - t) / 2.5)), br = 0.75 + 0.25 * Math.sin(TAU * 0.07 * t);
    let d = 0; for (let k = 0; k < f.length; k++) d += a[k] * Math.sin(TAU * f[k] * t + k * 1.3 + 0.4 * Math.sin(TAU * 0.11 * t * (k + 1)));
    const n = rnd() * 2 - 1; lp += (n - lp) * 0.02; lp2 += (lp - lp2) * 0.05;
    const v = (d * 0.07 * br + lp2 * 0.5) * env * S.bed;
    put(i, v * (1 + 0.1 * Math.sin(TAU * 0.05 * t)), v * (1 - 0.1 * Math.sin(TAU * 0.05 * t)));
  }
}
// ---- band-passed noise with a moving centre (whooshes)
function whoosh(t0, dur, { lo = 260, hi = 2600, gain = 0.5, q = 1.2, pan = [-0.6, 0.6] } = {}) {
  const i0 = Math.floor(t0 * SR), n = Math.floor(dur * SR); let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let k = 0; k < n; k++) {
    const p = k / n, bump = Math.sin(Math.PI * p) ** 1.4;
    if (k % 64 === 0) { const fc = lo * (hi / lo) ** Math.sin(Math.PI * Math.min(1, p * 1.1)), w = (TAU * fc) / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al; b0 = al / a0; b1 = 0; b2 = -al / a0; a1 = (-2 * Math.cos(w)) / a0; a2 = (1 - al) / a0; }
    const x = rnd() * 2 - 1, y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y;
    const v = y * bump * gain * S.whoosh, pp = pan[0] + (pan[1] - pan[0]) * p;
    put(i0 + k, v * (1 - pp) * 0.7, v * (1 + pp) * 0.7);
  }
}
function tone(t0, f, dur, gain, { decay = 4, f2 = f, pan = 0, attack = 0.004 } = {}) {
  const i0 = Math.floor(t0 * SR), n = Math.floor(dur * SR); let ph = 0;
  for (let k = 0; k < n; k++) { const t = k / SR, fr = f + (f2 - f) * (k / n); ph += (TAU * fr) / SR; const v = Math.sin(ph) * Math.exp(-decay * t) * Math.min(1, t / attack) * gain; put(i0 + k, v * (1 - pan), v * (1 + pan)); }
}
for (const c of C.cues) {
  if (c.kind === 'nebula') whoosh(c.t, c.dur, { gain: 0.55, lo: 220, hi: 2400, q: 0.9 });
  else if (c.kind === 'flow') whoosh(c.t, c.dur, { gain: 0.35, lo: 400, hi: 1800, q: 1.6, pan: [0.5, -0.5] });
  else if (c.kind === 'burst') { whoosh(c.t, c.dur, { gain: 0.75, lo: 160, hi: 3800, q: 0.7 }); tone(c.t + c.dur * 0.35, 70, 1.2, 0.35, { f2: 40, decay: 3 }); }
  else if (c.kind === 'fold') whoosh(c.t, c.dur, { gain: 0.45, lo: 3000, hi: 300, q: 1.1 });
  else if (c.kind === 'scan') {
    tone(c.t, S.root * 8, c.dur, 0.035 * S.blips, { f2: S.root * 16, decay: 0, attack: 0.4 });
    for (let t = 0; t < c.dur; t += 1 / 14) tone(c.t + t, 3400 + 800 * rnd(), 0.02, 0.05 * S.blips * (0.5 + t / c.dur), { decay: 160, pan: rnd() - 0.5 });
  } else if (c.kind === 'settle') {
    tone(c.t, 52, 1.1, 0.42, { f2: 36, decay: 4 });
    for (const [m, g] of [[12, 0.06], [18, 0.04], [24.03, 0.02]]) tone(c.t + 0.02, S.root * m, 2.4, g * S.chime, { decay: 1.6, pan: 0.2 });
  } else if (c.kind === 'callout') { tone(c.t, 2200, 0.05, 0.06 * S.blips, { decay: 60, pan: 0.3 }); tone(c.t + 0.07, 2950, 0.05, 0.05 * S.blips, { decay: 60, pan: 0.35 }); }
  else if (c.kind === 'copy') tone(c.t, 1650, 0.04, 0.04 * S.blips, { decay: 80, pan: -0.3 });
}
// ---- reverb (Schroeder: 4 combs + 2 allpasses per side)
function verb(x, sr, mix, off) {
  const combs = [1557, 1617, 1491, 1422].map((d) => Math.round(((d + off) * sr) / 44100)), aps = [225, 556].map((d) => Math.round((d * sr) / 44100)), y = new Float32Array(x.length);
  for (const d of combs) { const buf = new Float32Array(d); let j = 0, lp = 0; for (let i = 0; i < x.length; i++) { const o = buf[j]; lp = o * 0.8 + lp * 0.2; buf[j] = x[i] + lp * 0.84; y[i] += o / 4; j = (j + 1) % d; } }
  for (const d of aps) { const buf = new Float32Array(d); let j = 0; for (let i = 0; i < x.length; i++) { const b = buf[j], v = y[i] + b * 0.5; buf[j] = v; y[i] = b - v * 0.5; j = (j + 1) % d; } }
  for (let i = 0; i < x.length; i++) x[i] = x[i] * (1 - mix * 0.5) + y[i] * mix;
}
verb(L, SR, S.reverb, 0); verb(R, SR, S.reverb, 23);
// ---- normalise, write 16-bit stereo WAV
const len = Math.ceil(C.duration * SR); let pk = 1e-9; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.89 / pk, buf = Buffer.alloc(44 + len * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + len * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(len * 4, 40);
for (let i = 0; i < len; i++) { const fade = Math.min(1, (len - i) / (SR * 0.05)); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g * fade)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g * fade)) * 32767), 46 + i * 4); }
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, buf);
console.log(`${out}  ${C.duration.toFixed(2)} s · ${C.cues.length} cues · peak gain ${g.toFixed(2)}`);
