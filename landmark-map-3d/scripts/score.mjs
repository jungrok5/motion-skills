// landmark-map-3d · score.mjs — a cosy city score made from the film's own cues, written as a WAV (no samples, no network):
// a lo-fi groove (FM electric piano chords, round bass, soft kick / rim / swung hats, a little vinyl crackle) that turns
// darker and slower-feeling as the film's night value rises (minor voicings, a warm pad), a bubbly pop on every pin,
// a bell on the landmark's pin, a filtered whoosh on fast camera moves, a glockenspiel shimmer on 'sparkle' cues, rain
// noise that follows the weather track. Deterministic: the same film gives the same file.
//   node <skill>/scripts/score.mjs film.html [--bpm 84] [--key 60] [--out out/score.wav] [--seed 5] [--drums 1]
//   node <skill>/scripts/render.mjs film.html --audio out/score.wav
// Swap in your own music the same way (--audio any.mp3).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { serve, CHROME_ARGS } from './serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
const { srv, url } = await serve(page$, '?render=1&scale=.1&msaa=0&shadow=256');
const browser = await chromium.launch({ args: CHROME_ARGS });
let C;
try {
  const page = await browser.newPage({ viewport: { width: 200, height: 360 } });
  await page.goto(url, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) { if (Date.now() - t0 > 300000) throw new Error('never ready'); await new Promise(r => setTimeout(r, 150)); }
  C = await page.evaluate(() => window.FILM.cues());
} finally { await browser.close(); srv.close(); }

const SR = 48000, DUR = C.duration + .6, N = Math.round(SR * DUR), L = new Float32Array(N), R = new Float32Array(N), RV = new Float32Array(N);
const bpm = +opt('bpm', 84), beat = 60 / bpm, key = +opt('key', 60), drumsOn = +opt('drums', 1);
let seed = +opt('seed', 5) >>> 0; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hz = m => 440 * 2 ** ((m - 69) / 12);
const val = (arr, t) => { const x = Math.max(0, Math.min(arr.length - 1.001, t / C.step)), i = Math.floor(x); return arr[i] + (arr[i + 1] - arr[i]) * (x - i); };
const night = t => val(C.night, t), rainAt = t => val(C.rain, t);
const add = (i, l, r, rv = 0) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; RV[i] += (l + r) * .5 * rv; } };
const env = (t, a, d) => t < a ? t / a : Math.exp(-(t - a) / d);
const endT = (C.events.find(e => e.kind === 'end') || { t: C.duration }).t;
const titleT = (C.events.find(e => e.kind === 'title') || { t: 0 }).t;

// chords: day I–vi–IV–V(sus), night vi–IV–ii–iii, crossfaded by the night value of each bar
const DAY = [[0, 4, 7, 11, 14], [-3, 0, 4, 7, 11], [-7, -3, 0, 4, 9], [-5, 0, 2, 5, 9]];
const NIGHT = [[-3, 0, 4, 7, 11], [-7, -3, 0, 4, 7], [-10, -7, -3, 0, 5], [-8, -5, -1, 2, 7]];
const bar = beat * 4, nBars = Math.ceil(DUR / bar);

function rhodes(t0, m, vel, len, pan = 0) {          // FM electric piano: 1:1 modulator with a decaying index, slow tremolo
  const f = hz(m), i0 = Math.round(t0 * SR), n = Math.round((len + 1.2) * SR);
  for (let k = 0; k < n; k++) {
    const t = k / SR, e = env(t, .004, .55 + 1.1 * (1 - Math.min(1, m / 90))) * (t > len ? Math.exp(-(t - len) / .18) : 1);
    if (e < 1e-4 && t > .1) break;
    const idx = 1.6 * Math.exp(-t / .25) + .25, s = Math.sin(2 * Math.PI * f * t + idx * Math.sin(2 * Math.PI * f * t)) * (1 + .12 * Math.sin(2 * Math.PI * 4.2 * t));
    const v = s * e * vel * .09; add(i0 + k, v * (1 - pan) , v * (1 + pan), .35);
  }
}
function bass(t0, m, len) {
  const f = hz(m), i0 = Math.round(t0 * SR), n = Math.round((len + .2) * SR);
  for (let k = 0; k < n; k++) { const t = k / SR, e = env(t, .008, .5) * (t > len ? Math.exp(-(t - len) / .06) : 1); const s = Math.tanh(1.6 * (Math.sin(2 * Math.PI * f * t) + .25 * Math.sin(4 * Math.PI * f * t))); add(i0 + k, s * e * .16, s * e * .16); }
}
function kick(t0, g = 1) { const i0 = Math.round(t0 * SR); let ph = 0; for (let k = 0; k < SR * .35; k++) { const t = k / SR, f = 48 + 90 * Math.exp(-t / .035); ph += 2 * Math.PI * f / SR; const v = Math.sin(ph) * Math.exp(-t / .16) * .32 * g; add(i0 + k, v, v); } }
function noiseHit(t0, len, hp, gain, pan = 0, rv = 0) {   // one-pole filtered noise burst (rim, hat)
  const i0 = Math.round(t0 * SR); let lp = 0, prev = 0;
  for (let k = 0; k < SR * len * 3; k++) { const t = k / SR, w = rnd() * 2 - 1; lp += (w - lp) * hp; const h = w - lp; const v = (h * .7 + (h - prev) * .3) * Math.exp(-t / len) * gain; prev = h; add(i0 + k, v * (1 - pan), v * (1 + pan), rv); }
}
function pop(t0, big) {                               // a bubbly map pop: an upward chirp + a pentatonic pluck (+ a bell on the landmark)
  const i0 = Math.round(t0 * SR), base = hz(key + 24 + [0, 2, 4, 7, 9][Math.floor(rnd() * 5)]);
  let ph = 0;
  for (let k = 0; k < SR * .09; k++) { const t = k / SR, f = 520 + 900 * (t / .09); ph += 2 * Math.PI * f / SR; const v = Math.sin(ph) * Math.sin(Math.PI * t / .09) * .07; add(i0 + k, v, v, .2); }
  for (let k = 0; k < SR * .5; k++) { const t = k / SR, v = Math.sin(2 * Math.PI * base * t) * Math.exp(-t / .12) * .06; add(i0 + k + 600, v * .8, v * 1.1, .4); }
  if (big) for (const [m, g] of [[key + 19, .08], [key + 26, .05], [key + 31, .035]]) { const f = hz(m); for (let k = 0; k < SR * 2.2; k++) { const t = k / SR, v = (Math.sin(2 * Math.PI * f * t) + .3 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t / .3)) * Math.exp(-t / .8) * g; add(i0 + k, v, v, .6); } }
}
function whoosh(tc, len, g) {
  const i0 = Math.round((tc - len / 2) * SR), n = Math.round(len * SR); let lp = 0, bp = 0;
  for (let k = 0; k < n; k++) { const u = k / n, w = rnd() * 2 - 1, c = .02 + .25 * Math.sin(Math.PI * u) ** 2; lp += (w - lp) * c; bp += (lp - bp) * .5; const v = (lp - bp * .6) * Math.sin(Math.PI * u) ** 2 * g; add(i0 + k, v * (1 - .6 * (u - .5)), v * (1 + .6 * (u - .5)), .3); }
}
function glock(t0, m, g) { const f = hz(m), i0 = Math.round(t0 * SR); for (let k = 0; k < SR * 1.2; k++) { const t = k / SR, v = (Math.sin(2 * Math.PI * f * t) + .4 * Math.sin(2 * Math.PI * f * 3.9 * t) * Math.exp(-t / .08)) * Math.exp(-t / .35) * g; add(i0 + k, v * (.7 + rnd() * .6), v * (.7 + rnd() * .6), .7); } }

// --- the groove
const start = Math.max(0, titleT - .2);
for (let b = 0; b < nBars; b++) {
  const t0 = start + b * bar; if (t0 > DUR - .3) break;
  const nv = night(t0 + bar / 2), ch = (nv > .5 ? NIGHT : DAY)[b % 4], ending = t0 >= endT - .05;
  const len = ending ? DUR - t0 : bar * .5 - .02;
  // chord stabs on 1 and the "and" of 2, a little strum; voicing drops at night
  for (const [hit, vel] of ending ? [[0, 1]] : [[0, 1], [1.5, .7], [2.5, .55]]) {
    ch.slice(0, 4 + (nv > .5 ? 1 : 0)).forEach((iv, j) => rhodes(t0 + hit * beat + j * .012, key + iv - (nv > .5 ? 12 : 0) + 12, vel * (j ? .8 : 1), ending ? len : (hit ? beat * .9 : beat * 1.4), (j - 2) * .15));
  }
  bass(t0, key - 24 + ch[0], ending ? Math.min(3, len) : beat * 1.3);
  if (!ending) bass(t0 + beat * 2.5, key - 24 + ch[0] + (b % 2 ? 7 : 0), beat * .9);
  // drums from the second bar, out on the end card
  if (drumsOn && b >= 1 && !ending) {
    const g = 1 - .35 * nv;
    kick(t0, g); kick(t0 + beat * 2, g * .9); if (b % 2) kick(t0 + beat * 2.75, g * .6);
    noiseHit(t0 + beat, .045, .35, .1 * g, .1, .15); noiseHit(t0 + beat * 3, .045, .35, .1 * g, .1, .15);
    for (let e = 0; e < 8; e++) noiseHit(t0 + e * beat / 2 + (e % 2 ? beat * .08 : 0), .018, .85, (e % 2 ? .028 : .04) * g, -.25);
  }
  // night pad
  if (nv > .2) { const f0 = ch.slice(0, 3).map(iv => hz(key + iv)); const i0 = Math.round(t0 * SR); for (let k = 0; k < bar * SR; k++) { const t = k / SR, u = k / (bar * SR), e = Math.sin(Math.PI * u) * (nv - .2) * .025; let v = 0; for (const f of f0) v += Math.sin(2 * Math.PI * f * t) + .3 * Math.sin(2 * Math.PI * f * 1.003 * t); add(i0 + k, v * e, v * e, .5); } }
}
// --- events
for (const p of C.pops) pop(p.t, p.big);
for (let i = 1; i < C.speed.length - 1; i++) { const s = C.speed[i]; if (s > 120 && s >= C.speed[i - 1] && s >= C.speed[i + 1]) whoosh(i * C.step, 2.2, Math.min(.18, s / 1500)); }
for (const e of C.events.filter(e => e.kind === 'sparkle')) { const len = e.len ?? 3; for (let k = 0; k < len * 9; k++) glock(e.t + k / 9 + rnd() * .03, key + 36 + [0, 4, 7, 11, 14, 16][Math.floor(rnd() * 6)], .028); }
// --- rain, crackle
let lp = 0;
for (let k = 0; k < N; k++) { const t = k / SR, rn = rainAt(t), w = rnd() * 2 - 1; lp += (w - lp) * .18; const v = lp * rn * .08 + (rnd() < .0004 ? (rnd() - .5) * .12 : 0) + w * .002; add(k, v, v * .95); }
// --- reverb (Schroeder: 4 combs + 2 all-passes on the send)
const comb = (x, d, fb) => { const y = new Float32Array(N), b = new Float32Array(d); let i = 0, lpv = 0; for (let k = 0; k < N; k++) { const o = b[i]; lpv = o * .7 + lpv * .3; b[i] = x[k] + lpv * fb; y[k] = o; i = (i + 1) % d; } return y; };
const ap = (x, d, g) => { const y = new Float32Array(N), b = new Float32Array(d); let i = 0; for (let k = 0; k < N; k++) { const o = b[i], v = x[k] + o * g; b[i] = v; y[k] = o - v * g; i = (i + 1) % d; } return y; };
const wet = [comb(RV, 1557, .82), comb(RV, 1617, .81), comb(RV, 1491, .83), comb(RV, 1422, .8)];
let mix = new Float32Array(N); for (const w of wet) for (let k = 0; k < N; k++) mix[k] += w[k] * .25;
mix = ap(ap(mix, 225, .5), 556, .5);
for (let k = 0; k < N; k++) { L[k] += mix[k] * .5; R[k] += mix[Math.max(0, k - 360)] * .5; }
// --- master: soft clip, normalise, fades
let pk = 0; for (let k = 0; k < N; k++) { L[k] = Math.tanh(L[k] * 1.2); R[k] = Math.tanh(R[k] * 1.2); pk = Math.max(pk, Math.abs(L[k]), Math.abs(R[k])); }
const gain = .89 / (pk || 1), buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let k = 0; k < N; k++) {
  const t = k / SR, f = Math.min(1, t / .4, (DUR - t) / .8);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[k] * gain * f)) * 32767), 44 + k * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[k] * gain * f)) * 32767), 46 + k * 4);
}
const out = resolve(opt('out', join(dirname(page$), 'out', 'score.wav'))); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, buf);
console.log(`${out}  ${DUR.toFixed(1)} s · ${C.pops.length} pops · ${C.events.length} events · night ${Math.max(...C.night).toFixed(2)} max`);
