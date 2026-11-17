// agent-launch-film · score.mjs — the sound, synthesised from the film itself (no samples, no network, no API):
// a soft launch-film bed (pad chords, a plucked arpeggio, round bass, a light kick / shaker / clap groove) at the film's
// tempo, plus a UI sound on every cue the pieces registered — key ticks while typing, the button click, bubble pops, the
// counter's ticks, the chime of a saved chip, the LED blip of the mascot, a swish on every hand-over, the whoosh of a swarm.
//   node <skill>/scripts/score.mjs film.html --out out/film.wav
// Tune it from the page: new Film({ score: { bpm: 100, root: 50 (MIDI), chords: [[0,4,7,11], [9,12,16,19], …] (semitones
//   over root, one chord per 2 bars), gain: { pad, arp, bass, drums, sfx }, arp: '0.1.2.3.' } }) and per scene
//   mix: 'full' | 'soft' (no drums) | 'bare' (pad only) | 'out' (ring out from here), accent: true (a lift on its first beat).
// A real track instead: skip this and pass the user's file to render.mjs --audio (keep the UI sounds by mixing them in
// with --sfx-only: writes only the cue sounds, for laying over a track).
// Options: --cues cues.json (the JSON window.cues() returns; skips the browser)  --sfx-only  --seed 5
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = args.find((a) => a.endsWith('.html')), out = resolve(opt('out', 'out/film.wav')), SFX_ONLY = args.includes('--sfx-only');
let C;
if (opt('cues')) C = JSON.parse(readFileSync(opt('cues'), 'utf8'));
else {
  if (!page$ || !existsSync(page$)) { console.error('usage: score.mjs film.html [--out out/film.wav] | --cues cues.json'); process.exit(1); }
  const require = createRequire(import.meta.url); let chromium;
  try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await b.newPage(); await p.goto(pathToFileURL(resolve(page$)).href + '?render=1');
  await p.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  C = await p.evaluate(() => window.cues()); await b.close();
}
const S = { bpm: 100, root: 50, chords: [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]], arp: '0123210312302130', reverb: 0.3, ...(C.score || {}) };
const G = { pad: 1, arp: 1, bass: 1, drums: 1, sfx: 1, ...(S.gain || {}) };
const SR = 48000, N = Math.ceil(C.duration * SR) + SR * 2, L = new Float32Array(N), R = new Float32Array(N), WL = new Float32Array(N), WR = new Float32Array(N);
let seed = +opt('seed', 5); const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const TAU = Math.PI * 2, mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const put = (i, v, pan = 0, wet = 0) => { if (i < 0 || i >= N) return; const l = v * (1 - pan * 0.7), r = v * (1 + pan * 0.7); L[i] += l; R[i] += r; if (wet) { WL[i] += l * wet; WR[i] += r * wet; } };
const env = (t, a, d) => Math.min(1, t / a) * Math.exp(-t * d);

// ── instruments
function tone(t0, f, dur, { g = 0.1, a = 0.005, d = 6, harm = [1], pan = 0, wet = 0.2, glide = 0 } = {}) {
  const i0 = Math.floor(t0 * SR), n = Math.floor(dur * SR); let ph = 0;
  for (let k = 0; k < n; k++) { const t = k / SR; ph += (TAU * f * (1 + glide * t)) / SR; let v = 0; for (let j = 0; j < harm.length; j++) v += Math.sin(ph * (j + 1)) * harm[j]; put(i0 + k, v * env(t, a, d) * g * Math.min(1, (dur - t) / 0.01), pan, wet); }
}
function noise(t0, dur, { g = 0.1, lo = 800, hi = 6000, d = 0, shape = null, pan = 0, wet = 0.2, q = 1.4 } = {}) {
  const i0 = Math.floor(t0 * SR), n = Math.floor(dur * SR); let b0 = 0, b2 = 0, a1 = 0, a2 = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let k = 0; k < n; k++) {
    const p = k / n;
    if (k % 32 === 0) { const fc = lo * (hi / lo) ** p, w = (TAU * Math.min(fc, SR * 0.45)) / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al; b0 = al / a0; b2 = -al / a0; a1 = (-2 * Math.cos(w)) / a0; a2 = (1 - al) / a0; }
    const x = rnd() * 2 - 1, y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y;
    put(i0 + k, y * g * (shape ? shape(p) : Math.exp(-(k / SR) * d)), typeof pan === 'function' ? pan(p) : pan, wet);
  }
}
function pad(t0, notes, dur, g) { for (const [j, m] of notes.entries()) for (const det of [-0.004, 0.004]) { const f = mtof(m) * (1 + det), i0 = Math.floor(t0 * SR), n = Math.floor((dur + 1.2) * SR); let ph = j * 1.3; for (let k = 0; k < n; k++) { const t = k / SR; ph += (TAU * f) / SR; const e = Math.min(1, t / 0.9) * Math.min(1, Math.max(0, (dur + 1.2 - t) / 1.2)); put(i0 + k, (Math.sin(ph) + 0.18 * Math.sin(2 * ph) + 0.06 * Math.sin(3 * ph)) * e * 0.022 * g * G.pad, det > 0 ? 0.45 : -0.45, 0.5); } } }
function kick(t0, g = 1) { let ph = 0; const n = Math.floor(0.35 * SR), i0 = Math.floor(t0 * SR); for (let k = 0; k < n; k++) { const t = k / SR; ph += (TAU * (48 + 90 * Math.exp(-t * 32))) / SR; put(i0 + k, Math.sin(ph) * Math.exp(-t * 9) * 0.55 * g * G.drums); } }
function clap(t0, g = 1) { for (const o of [0, 0.011, 0.023]) noise(t0 + o, 0.16, { g: 0.13 * g * G.drums, lo: 1100, hi: 1300, q: 0.9, d: 30, wet: 0.45, pan: 0.05 }); }
function shaker(t0, g = 1) { noise(t0, 0.05, { g: 0.05 * g * G.drums, lo: 7000, hi: 9000, q: 0.8, d: 70, pan: 0.3, wet: 0.1 }); }

// ── the bed
const beat = 60 / S.bpm, bar = beat * 4, mixAt = (t) => { let m = 'full'; for (const s of C.scenes) if (t >= s.t - 1e-3) m = s.mix; return m; };
const endAt = C.duration, ringOut = C.scenes.find((s) => s.mix === 'out')?.t ?? endAt - Math.min(2.4, endAt * 0.15);
if (!SFX_ONLY) {
  for (let b = 0; b * bar < endAt; b++) {
    const t = b * bar, ch = S.chords[Math.floor(b / 2) % S.chords.length], m = mixAt(t + 0.01), fade = t >= ringOut ? 0 : 1;
    if (b % 2 === 0) pad(t, ch.map((x) => S.root + 12 + x), Math.min(bar * 2, endAt - t + 0.3), t >= ringOut ? 0.8 : 1);
    for (let i = 0; i < 16; i++) {
      const tt = t + (i * beat) / 4; if (tt >= endAt) break;
      const mm = mixAt(tt + 0.001), drums = mm === 'full' && tt < ringOut, arpOn = mm !== 'bare' && tt < ringOut + bar;
      const c = S.arp[i % S.arp.length];
      if (arpOn && c !== '.' && c !== undefined) { const deg = +c, note = S.root + 24 + ch[deg % ch.length] + 12 * Math.floor(deg / ch.length); tone(tt, mtof(note), 0.4, { g: 0.045 * G.arp * (i % 4 === 0 ? 1 : 0.7), d: 9, harm: [1, 0.35, 0.12], pan: i % 2 ? 0.35 : -0.35, wet: 0.45 }); }
      if (drums && (i === 0 || i === 8 || i === 10)) kick(tt, i === 10 ? 0.6 : 1);
      if (drums && (i === 4 || i === 12)) clap(tt, 0.8);
      if (drums && i % 2 === 0) shaker(tt, i % 4 === 0 ? 1 : 0.6);
      if (fade && mm !== 'bare' && (i === 0 || i === 6 || i === 8)) tone(tt, mtof(S.root - 12 + ch[0]), beat * 1.4, { g: 0.11 * G.bass, a: 0.01, d: 2.5, harm: [1, 0.3, 0.08], wet: 0.05 });
    }
  }
  for (const s of C.scenes) if (s.accent) { tone(s.t, mtof(S.root + 36), 1.2, { g: 0.05, d: 2.5, harm: [1, 0.5, 0.2], wet: 0.7 }); kick(s.t, 1.1); }
  // the last chord rings out
  const lastCh = S.chords[Math.floor(Math.floor(ringOut / bar) / 2) % S.chords.length];
  pad(ringOut, lastCh.map((x) => S.root + 12 + x), endAt - ringOut, 1.1);
  tone(ringOut, mtof(S.root + 24 + lastCh[0]), 2.5, { g: 0.06, d: 1.4, harm: [1, 0.4, 0.15, 0.05], wet: 0.7 });
}

// ── UI sounds on the cues
let typed = 0;
for (const c of C.cues) {
  const g = (c.g ?? 1) * G.sfx, t = c.t;
  switch (c.kind) {
    case 'type': { const f = 2600 + rnd() * 1400; noise(t, 0.018, { g: 0.11 * g, lo: 3000, hi: 5000, d: 260, pan: -0.1 + rnd() * 0.2, wet: 0.05 }); tone(t, f, 0.02, { g: 0.03 * g, d: 200, wet: 0 }); typed++; break; }
    case 'click': noise(t, 0.012, { g: 0.32 * g, lo: 2500, hi: 2500, q: 2, d: 300, wet: 0.1 }); tone(t, 1400, 0.03, { g: 0.12 * g, d: 120 }); noise(t + 0.06, 0.01, { g: 0.18 * g, lo: 1800, hi: 1800, q: 2, d: 300, wet: 0.1 }); break;
    case 'pop': tone(t, 520, 0.11, { g: 0.13 * g, a: 0.003, d: 28, glide: 4, harm: [1, 0.2], wet: 0.25 }); break;
    case 'send': noise(t, 0.16, { g: 0.12 * g, lo: 900, hi: 5000, shape: (p) => Math.sin(Math.PI * p), wet: 0.2 }); tone(t + 0.06, 760, 0.12, { g: 0.13 * g, d: 26, glide: 3, harm: [1, 0.2], wet: 0.3 }); break;
    case 'blip': tone(t, 1180, 0.05, { g: 0.06 * g, d: 50, harm: [1, 0, 0.33, 0, 0.2], wet: 0.2 }); tone(t + 0.055, 1580, 0.05, { g: 0.05 * g, d: 50, harm: [1, 0, 0.33], wet: 0.2 }); break;
    case 'chime': tone(t, 1318.5, 0.9, { g: 0.07 * g, d: 5, harm: [1, 0.25], wet: 0.6, pan: -0.2 }); tone(t + 0.07, 1975.5, 0.9, { g: 0.06 * g, d: 5, harm: [1, 0.2], wet: 0.6, pan: 0.2 }); break;
    case 'tick': tone(t, 2400, 0.012, { g: 0.06 * g, d: 300, wet: 0.05 }); break;
    case 'swish': noise(t - 0.12, 0.55, { g: 0.13 * g, lo: 500, hi: 3500, q: 0.9, shape: (p) => Math.sin(Math.PI * p) ** 1.5, pan: (p) => p - 0.5, wet: 0.35 }); break;
    case 'whip': noise(t - 0.1, 0.42, { g: 0.24 * g, lo: 300, hi: 6000, q: 1.1, shape: (p) => Math.sin(Math.PI * p) ** 2, pan: (p) => (p - 0.5) * 1.6, wet: 0.3 }); break;
    case 'whoosh': noise(t, 0.6, { g: 0.12 * g, lo: 3000, hi: 400, q: 1, shape: (p) => Math.sin(Math.PI * p), wet: 0.35 }); break;
    case 'swarm': { const d = c.dur || 1.6; noise(t, d, { g: 0.2 * g, lo: 250, hi: 4500, q: 0.8, shape: (p) => p ** 1.5 * (1 - p ** 6), pan: (p) => Math.sin(p * 9) * 0.6, wet: 0.4 }); for (let x = 0; x < d * 10; x++) tone(t + x * 0.1 + rnd() * 0.05, 900 + rnd() * 900, 0.05, { g: 0.025 * g * (x / (d * 10)), d: 60, pan: rnd() - 0.5, wet: 0.4 }); break; }
    case 'swipe': noise(t, 0.3, { g: 0.06 * g, lo: 2000, hi: 4000, q: 1, shape: (p) => Math.sin(Math.PI * p), wet: 0.1 }); break;
    case 'rise': tone(t, 300, 0.35, { g: 0.05 * g, a: 0.02, d: 6, glide: 2.2, harm: [1, 0.3], wet: 0.3 }); break;
    case 'nod': tone(t, 180, 0.12, { g: 0.06 * g, d: 30, wet: 0.1 }); break;
    default: break;
  }
}

// ── reverb on the send (Schroeder: 4 combs + 2 allpasses per side), soft limit, write
function verb(x, off) {
  const combs = [1557, 1617, 1491, 1422].map((d) => Math.round(((d + off) * SR) / 44100)), aps = [225, 556].map((d) => Math.round((d * SR) / 44100)), y = new Float32Array(x.length);
  for (const d of combs) { const buf = new Float32Array(d); let j = 0, lp = 0; for (let i = 0; i < x.length; i++) { const o = buf[j]; lp = o * 0.7 + lp * 0.3; buf[j] = x[i] + lp * 0.84; y[i] += o / 4; j = (j + 1) % d; } }
  for (const d of aps) { const buf = new Float32Array(d); let j = 0; for (let i = 0; i < x.length; i++) { const b = buf[j], v = y[i] + b * 0.5; buf[j] = v; y[i] = b - v * 0.5; j = (j + 1) % d; } }
  return y;
}
const vl = verb(WL, 0), vr = verb(WR, 23);
const len = Math.ceil(C.duration * SR); let pk = 1e-9;
for (let i = 0; i < len; i++) { L[i] = Math.tanh((L[i] + vl[i] * S.reverb * 2) * 1.2); R[i] = Math.tanh((R[i] + vr[i] * S.reverb * 2) * 1.2); pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); }
const g = 0.89 / pk, buf = Buffer.alloc(44 + len * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + len * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(len * 4, 40);
for (let i = 0; i < len; i++) { const fade = Math.min(1, (len - i) / (SR * 0.3)); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g * fade)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g * fade)) * 32767), 46 + i * 4); }
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, buf);
const kinds = {}; for (const c of C.cues) kinds[c.kind] = (kinds[c.kind] || 0) + 1;
console.log(`${out}  ${C.duration.toFixed(2)} s · ${S.bpm} bpm · ${C.cues.length} cues (${Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join(', ')})${SFX_ONLY ? ' · sfx only' : ''}`);
