// map-dive · score.mjs — a light score made from the film's own cues, written as a WAV (no samples, no network):
// a warm pad that changes chord every 4 beats, music-box plucks, a filtered-noise whoosh across every dive or rise, a soft
// two-note chime when a pin label pops, a low bell under each title. When the shown stage turns to night the pad darkens
// (minor, lower, slower plucks). Deterministic: the same film gives the same file.
//   node <skill>/scripts/score.mjs film.html [--bpm 92] [--key 62] [--out out/score.wav] [--seed 3]
//   node <skill>/scripts/render.mjs film.html --audio out/score.wav     (or mux an existing MP4 with ffmpeg)
// Swap in your own music the same way (--audio any.mp3); keep the whooshes on the cue times if you do.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: score.mjs film.html [--bpm 92] [--key 62] [--out out/score.wav]'); process.exit(1); }
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
await page.goto(pathToFileURL(page$).href + '?render=1&scale=.1&msaa=0', { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) { if (Date.now() - t0 > 240000) throw new Error('never ready'); await new Promise(r => setTimeout(r, 100)); }
const C = await page.evaluate(() => window.FILM.cues());
await browser.close();

const SR = 48000, DUR = C.duration + .4, N = Math.round(SR * DUR), L = new Float32Array(N), R = new Float32Array(N);
const bpm = +opt('bpm', 92), beat = 60 / bpm, key = +opt('key', 62);
let seed = +opt('seed', 3) >>> 0; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hz = m => 440 * 2 ** ((m - 69) / 12);
const nightAt = t => { const x = Math.max(0, Math.min(C.night.length - 1.001, t / C.nightStep)), i = Math.floor(x); return C.night[i] + (C.night[i + 1] - C.night[i]) * (x - i); };   // linear, or the pad steps
const add = (i, l, r) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };

// pad: I – vi – IV – V by day, i – VI – iv – v by night (crossfaded by the night value)
const DAY = [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 7]], NIGHT = [[0, 3, 7, 10], [-4, 0, 3, 7], [-7, -4, 0, 3], [-5, -2, 2, 7]];
const bar = beat * 4, phases = new Float64Array(32);
for (let i = 0; i < N; i++) {
  const t = i / SR, b = Math.floor(t / bar) % 4, n = nightAt(t);
  const env = Math.min(1, t / 1.5) * Math.min(1, (DUR - t) / 1.2);
  let l = 0, r = 0;
  for (let v = 0; v < 4; v++) {
    for (const [set, w] of [[DAY, 1 - n], [NIGHT, n]]) {
      if (w < .001) continue;
      const f = hz(key - 12 + set[b][v] - n * 2);
      const k = v * 2 + (set === NIGHT ? 8 : 0); phases[k] += 2 * Math.PI * f / SR; phases[k + 1] += 2 * Math.PI * f * 1.003 / SR;
      const s = (Math.sin(phases[k]) + .35 * Math.sin(2 * phases[k]) + Math.sin(phases[k + 1])) * w;
      l += s * (v % 2 ? .7 : 1); r += s * (v % 2 ? 1 : .7);
    }
  }
  const sw = .8 + .2 * Math.sin(t * .7);
  L[i] += l * .018 * env * sw; R[i] += r * .018 * env * sw;
}
// plucks: an arpeggio of the bar's chord, 8ths by day, quarters by night
const pluck = (t0, f, amp, pan) => {
  const n = Math.round(SR * 1.6), i0 = Math.round(t0 * SR);
  for (let j = 0; j < n; j++) { const t = j / SR, e = Math.exp(-t * 4.2) * Math.min(1, t * 400), s = (Math.sin(2 * Math.PI * f * t) + .3 * Math.sin(2 * Math.PI * f * 3.01 * t) * Math.exp(-t * 9)) * e * amp; add(i0 + j, s * (1 - pan), s * pan); }
};
for (let t = beat * 2; t < C.duration - .8; t += beat / 2) {
  const n = nightAt(t), step = Math.round(t / (beat / 2)); if (n > .5 && step % 2) continue;
  const b = Math.floor(t / bar) % 4, ch = (n > .5 ? NIGHT : DAY)[b], m = key + 12 + ch[[0, 2, 1, 3, 2, 1, 3, 2][step % 8]] - (n > .5 ? 12 : 0);
  pluck(t, hz(m), .07 * (step % 4 === 0 ? 1.2 : .8), .3 + .4 * rnd());
}
// whoosh across dives and rises (noise through a sweeping one-pole low-pass), chimes on pins, a bell under titles
for (const c of C.cues) {
  if (c.kind === 'dive' || c.kind === 'rise' || c.kind === 'dissolve') {
    const a = c.t - (c.kind === 'dissolve' ? .3 : .7), d = (c.end - c.t) + (c.kind === 'dissolve' ? .9 : 1.4), n = Math.round(d * SR), i0 = Math.round(a * SR);
    const yl = [0, 0, 0], yr = [0, 0, 0];   // three one-pole low-passes in a row: an air-like rush, not hiss
    for (let j = 0; j < n; j++) {
      const x = j / n, e = Math.sin(Math.PI * Math.min(1, x * 1.15)) ** 2, cut = c.kind === 'rise' ? .008 + .07 * (1 - x) : .008 + .07 * x, amp = c.kind === 'dissolve' ? .25 : .8;
      let a = rnd() * 2 - 1, b = rnd() * 2 - 1;
      for (let k = 0; k < 3; k++) { yl[k] += cut * (a - yl[k]); a = yl[k]; yr[k] += cut * (b - yr[k]); b = yr[k]; }
      add(i0 + j, a * e * amp, b * e * amp);
    }
  }
  if (c.kind === 'pin') { pluck(c.t + .02, hz(key + 24 + 7), .09, .65); pluck(c.t + .14, hz(key + 24 + 12), .08, .35); }
  if (c.kind === 'title') { const n = Math.round(3 * SR), i0 = Math.round(c.t * SR), f = hz(key - 12); for (let j = 0; j < n; j++) { const t = j / SR, s = (Math.sin(2 * Math.PI * f * t) + .4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 3)) * Math.exp(-t * 1.3) * Math.min(1, t * 200) * .07; add(i0 + j, s, s); } }
}
// normalise to −3 dBFS, write 16-bit stereo WAV
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = peak > 0 ? .708 / peak : 1, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4); }
const out = resolve(opt('out', 'out/score.wav')); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, buf);
console.log(`${out}  ${C.duration} s, ${C.cues.length} cues (${C.cues.map(c => c.kind[0]).join('')})`);
