// The soundtrack: every footfall, lift-off and groan placed from the closed-form gait and the shot cameras,
// synthesised in code (no recordings needed), plus a slow orchestral-ish pad and the place's own sounds.
// Optional: licensed recordings layered on the same events (colossus.js SOUND.samples, files under audio/).
// Run from the project folder:
//   node <skill>/scripts/audio.mjs [--out out/audio.wav] [--nomusic] [--nosfx] [--stems] [--table]
// --table prints, per shot, how loud the footfalls land and where the music ducks (to check the mix against the cut).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './_browser.mjs';
import { loadProject } from './_project.mjs';

const a = parseArgs();
const dir = path.resolve(a._[0] || '.');
const P = await loadProject(dir);
const { GAIT, DURATION, TIMELINE, SOUND: S0 } = P.config;
const G = P.gait, SH = P.shots;
const S = {
  music: { level: 0.22, root: 38.89, chords: [[0, 7, 12, 15], [-4, 3, 8, 15], [-7, 0, 5, 12], [-2, 5, 10, 14]], bars: 6, swell: [], ...(S0.music || {}) },
  step: { pitch: 34, metal: 0.6, ground: 'mud', ...(S0.step || {}) },   // ground: mud | water | gravel | snow | sand
  wind: S0.wind ?? 0.5, rain: S0.rain ?? 0.15, hydraulic: S0.hydraulic ?? 0.7, groan: S0.groan ?? 0.6,
  life: S0.life || [],          // [{ kind: 'birds'|'gulls'|'dog'|'chatter'|'bell'|'horn', shot?, at?, every?, gain, x?, z?, y? }]
  persp: S0.persp || {},        // per shot: { g (gain), lp (Hz ceiling), groan }
  samples: S0.samples || [],    // [{ file: 'audio/x.mp3', on: 'touchdown'|'liftoff'|'bed'|number, gain, lp, rate, near }]
  seed: S0.seed ?? 4242,
};
const SR = 48000, N = Math.ceil(DURATION * SR);
const mk = () => [new Float32Array(N), new Float32Array(N)];
const SFX = mk(), MUS = mk();
let rs = S.seed >>> 0;
const rnd = () => { rs |= 0; rs = (rs + 0x6d2b79f5) | 0; let t = Math.imul(rs ^ (rs >>> 15), 1 | rs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const smooth = (e0, e1, x) => { const k = clamp((x - e0) / (e1 - e0)); return k * k * (3 - 2 * k); };

// ------------------------------------------------------------------ DSP: a voice is rendered into a mono buffer, then placed
const TAU = Math.PI * 2;
function voice(dur, fn) { const n = Math.ceil(dur * SR), b = new Float32Array(n); fn(b, n); return b; }
function onePole(b, hz, hp = false) { const k = 1 - Math.exp(-TAU * hz / SR); let y = 0; for (let i = 0; i < b.length; i++) { y += (b[i] - y) * k; b[i] = hp ? b[i] - y : y; } return b; }
function bandpass(b, hz, q = 1) { // RBJ biquad
  const w = TAU * hz / SR, al = Math.sin(w) / (2 * q), c = Math.cos(w), a0 = 1 + al;
  const b0 = al / a0, b2 = -al / a0, a1 = -2 * c / a0, a2 = (1 - al) / a0; let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < b.length; i++) { const x = b[i], y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; b[i] = y; } return b;
}
function lowpassRes(b, hzFn, q = 4) { // resonant biquad lowpass, cutoff may move
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < b.length; i++) {
    const w = TAU * Math.max(20, Math.min(hzFn(i / SR), SR * 0.45)) / SR, al = Math.sin(w) / (2 * q), c = Math.cos(w), a0 = 1 + al;
    const b0 = (1 - c) / 2 / a0, b1 = (1 - c) / a0, a1 = -2 * c / a0, a2 = (1 - al) / a0;
    const x = b[i], y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; b[i] = y;
  } return b;
}
const noise = (n) => { const b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = rnd() * 2 - 1; return b; };
function brown(n) { const b = new Float32Array(n); let y = 0; for (let i = 0; i < n; i++) { y = (y + (rnd() * 2 - 1) * 0.02) * 0.998; b[i] = y * 3.5; } return b; }
// place mono buffer b at time t (s): gain, pan (-1..1), lp (Hz, distance air), delay
function place(bus, b, t, { gain = 1, pan = 0, lp = 0, width = 0.25 } = {}) {
  if (lp && lp < 16000) { b = Float32Array.from(b); onePole(b, lp); onePole(b, lp * 1.3); }
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4) * 1.414, gr = gain * Math.sin((pan + 1) * Math.PI / 4) * 1.414;
  const s0 = Math.round(t * SR), dly = Math.round(width * 0.0007 * SR);   // a few samples of inter-channel delay = width
  for (let i = 0; i < b.length; i++) {
    const d = s0 + i; if (d < 0) continue; if (d >= N) break;
    bus[0][d] += b[i] * gl; if (d + dly < N) bus[1][d + dly] += b[i] * gr;
  }
}
const env = (i, n, att, dec) => (i < att ? i / att : 1) * Math.exp(-(i - att) / dec);

// ------------------------------------------------------------------ the voices
const STEP = S.step;
function thump(near) {   // weight: a falling sine body + sub, short and tight
  const f0 = STEP.pitch * (0.9 + 0.2 * rnd());
  return voice(1.6, (b, n) => { let ph = 0, ph2 = 0; for (let i = 0; i < n; i++) { const t = i / SR, f = f0 * (1 + 1.8 * Math.exp(-t * 18)); ph += TAU * f / SR; ph2 += TAU * f0 * 0.5 / SR;
    b[i] = (Math.sin(ph) * Math.exp(-t * 3.2) + 0.6 * Math.sin(ph2) * Math.exp(-t * 2.2)) * Math.min(1, i / 40); } });
}
function crunch(near) {  // the ground giving way (noise burst shaped by the ground type)
  const g = STEP.ground;
  const hz = { mud: 500, water: 1400, gravel: 2600, snow: 900, sand: 1100 }[g] || 700;
  const b = noise(Math.ceil(SR * 0.9));
  for (let i = 0; i < b.length; i++) b[i] *= env(i, b.length, 60, SR * (g === 'water' ? 0.22 : 0.12));
  bandpass(b, hz, 0.7); return b;
}
function clank(near) {   // steel ringing: inharmonic partials
  const base = 140 + 60 * rnd(), parts = [1, 2.76, 5.40, 8.93, 13.3, 18.6];
  return voice(2.2, (b, n) => { for (const [k, r] of parts.entries()) { const f = base * r * (1 + 0.01 * rnd()), dec = 0.9 / (1 + k * 0.5), am = 1 / (1 + k * 0.7), ph = rnd() * TAU;
    for (let i = 0; i < n; i++) b[i] += Math.sin(ph + TAU * f * i / SR) * am * Math.exp(-i / SR / dec); } for (let i = 0; i < 30; i++) b[i] *= i / 30; });
}
function debris(near, wet) {  // clods / spray raining back down
  return voice(2.4, (b, n) => {
    const ng = Math.round(40 + 60 * near);
    for (let gI = 0; gI < ng; gI++) {
      const t0 = 0.08 + Math.pow(rnd(), 1.8) * 1.9, len = Math.round(SR * (0.004 + 0.012 * rnd())), s = Math.round(t0 * SR), am = (0.3 + 0.7 * rnd()) * Math.exp(-t0 * 1.3);
      let y = 0; const k = 0.2 + 0.6 * rnd();
      for (let i = 0; i < len && s + i < n; i++) { y += ((rnd() * 2 - 1) - y) * k; b[s + i] += y * am * (1 - i / len); }
    }
    if (wet > 0) { const w = noise(n); for (let i = 0; i < n; i++) w[i] *= env(i, n, 200, SR * 0.5) * wet * 0.5; bandpass(w, 2400, 0.6); for (let i = 0; i < n; i++) b[i] += w[i]; }
  });
}
function hiss(dur) {     // pneumatic / hydraulic vent
  const b = noise(Math.ceil(dur * SR));
  const n = b.length; for (let i = 0; i < n; i++) b[i] *= Math.min(1, i / (SR * 0.06)) * Math.min(1, (n - i) / (SR * 0.5)) * (0.7 + 0.3 * Math.sin(i / SR * 23));
  bandpass(b, 3200 + 1500 * rnd(), 0.8); return b;
}
function servo(dur) {    // the leg's drive: a gliding motor whine with harmonics
  const f0 = 70 + 30 * rnd();
  return voice(dur, (b, n) => { let ph = 0; for (let i = 0; i < n; i++) { const u = i / n, f = f0 * (1 + 0.6 * Math.sin(Math.PI * u)); ph += TAU * f / SR;
    const e = Math.min(1, i / (SR * 0.25)) * Math.min(1, (n - i) / (SR * 0.35));
    b[i] = (Math.sin(ph) + 0.5 * Math.sin(2 * ph + 0.3) + 0.25 * Math.sin(3 * ph) + 0.12 * Math.sin(5 * ph)) * e * 0.5; } });
}
function groan(dur) {    // the structure under load: resonant filtered noise, the resonance wandering low
  const b = brown(Math.ceil(dur * SR)), f0 = 70 + 70 * rnd(), w = 0.3 + 0.4 * rnd();
  lowpassRes(b, (t) => f0 * (1 + 0.6 * Math.sin(t * w * TAU) + 0.3 * Math.sin(t * 2.3)), 9);
  const n = b.length; for (let i = 0; i < n; i++) b[i] *= Math.sin(Math.PI * i / n);
  return b;
}
function chirp(f0, f1, dur, fm = 0) { return voice(dur, (b, n) => { let ph = 0; for (let i = 0; i < n; i++) { const u = i / n, f = f0 + (f1 - f0) * u; ph += TAU * f / SR; b[i] = Math.sin(ph + fm * Math.sin(ph * 2.01)) * Math.sin(Math.PI * u); } }); }
const LIFE = {
  birds: () => { const b = new Float32Array(Math.ceil(SR * 1.6)); for (let k = 0; k < 6; k++) { const c = chirp(3200 + 1600 * rnd(), 2400 + 2400 * rnd(), 0.05 + 0.08 * rnd(), 0.6); b.set(c.map((v, i) => v + (b[i + Math.round(k * 0.22 * SR)] || 0)), Math.round(k * 0.22 * SR)); } return b; },
  gulls: () => { const b = new Float32Array(Math.ceil(SR * 1.8)); for (let k = 0; k < 3; k++) { const c = chirp(1700 + 300 * rnd(), 900 + 200 * rnd(), 0.32 + 0.1 * rnd(), 2.2); const o = Math.round(k * 0.45 * SR); for (let i = 0; i < c.length && o + i < b.length; i++) b[o + i] += c[i]; } return bandpass(b, 1400, 0.9); },
  dog: () => { const b = new Float32Array(Math.ceil(SR * 1.4)); for (let k = 0; k < 3; k++) { const c = noise(Math.ceil(SR * 0.12)); for (let i = 0; i < c.length; i++) c[i] *= Math.sin(Math.PI * i / c.length); bandpass(c, 700, 3); const o = Math.round(k * 0.33 * SR); for (let i = 0; i < c.length; i++) b[o + i] += c[i] * 3; } return b; },
  chatter: () => { const b = brown(Math.ceil(SR * 3)); lowpassRes(b, (t) => 380 + 260 * Math.sin(t * 7.3) * Math.sin(t * 2.1), 6); return b; },
  bell: () => voice(4, (b, n) => { for (const [r, am] of [[1, 1], [2.0, 0.5], [2.4, 0.35], [3.0, 0.2], [4.2, 0.15]]) for (let i = 0; i < n; i++) b[i] += Math.sin(TAU * 520 * r * i / SR) * am * Math.exp(-i / SR / (1.6 / r)); }),
  horn: () => voice(2.6, (b, n) => { for (let i = 0; i < n; i++) { const e = Math.min(1, i / (SR * 0.2)) * Math.min(1, (n - i) / (SR * 0.4)); let s = 0; for (let h = 1; h < 9; h++) s += Math.sin(TAU * 92 * h * i / SR) / h; b[i] = s * e * 0.5; } }),
};

// ------------------------------------------------------------------ space: where the camera is when a sound happens
function cam(t) {
  const c = SH.evalShot('', clamp(t, 0, DURATION - 1e-3));
  const fx = c.tgt[0] - c.pos[0], fz = c.tgt[2] - c.pos[2], fl = Math.hypot(fx, fz) || 1;
  return { name: c.name, pos: c.pos, right: [-fz / fl, fx / fl] };
}
function spatial(t, x, z, y = 0) {
  const c = cam(t), dx = x - c.pos[0], dz = z - c.pos[2], dy = y - c.pos[1], d = Math.hypot(dx, dy, dz);
  const pan = clamp((dx * c.right[0] + dz * c.right[1]) / (d + 8), -0.85, 0.85);
  const per = { g: 1, lp: 0, groan: 1, ...(S.persp[c.name] || {}) };
  const near = 1 / (1 + d / 22);
  let lp = 500 + 14000 * Math.pow(near, 1.4); if (per.lp) lp = Math.min(lp, per.lp);
  return { d, near, pan, lp, per, shot: c.name, at: t + Math.min(0.3, Math.max(0, d - 30) / 343) };
}

// ------------------------------------------------------------------ events from the gait
const T = GAIT.T, NL = G.NLEGS, fst = {}, events = [];
for (let i = 0; i < NL; i++) {
  const ph = G.LEGS[i].phase;
  for (let n = -1; n * T < DURATION + T; n++) {
    const td = (n + 1 - ph) * T, lo = (n + 1 - ph + GAIT.duty) * T;
    if (td > 0.05 && td < DURATION) { G.footState(i, td + 1e-4, fst); events.push({ kind: "down", t: td, x: fst.x, z: fst.z, i }); }
    if (lo > 0.05 && lo < DURATION) { G.footState(i, lo - 1e-4, fst); const tdn = lo + (1 - GAIT.duty) * T; events.push({ kind: "up", t: lo, x: fst.x, z: fst.z, i, dur: tdn - lo }); }
  }
}
events.sort((p, q) => p.t - q.t);
const heroHits = [], table = new Map();
const wetAt = (x, z) => { if (!P.colossus.GROUND?.puddle) return 0.3; return 0.3 + 0.5 * (P.colossus.GROUND.puddle.p ?? 0.3); };
if (!a.nosfx) {
  for (const e of events) {
    const sp = spatial(e.t, e.x, e.z, e.kind === 'up' ? 4 : 0), g = clamp(sp.near * 1.5, 0.12, 1) * sp.per.g, o = { pan: sp.pan, lp: sp.lp };
    if (e.kind === 'down') {
      const kd = clamp((sp.near - 0.18) / 0.3), kh = clamp((sp.near - 0.3) / 0.25);
      place(SFX, thump(sp.near), sp.at - 0.01, { ...o, gain: 0.9 * g, lp: Math.min(sp.lp, 1800), width: 0 });
      place(SFX, crunch(sp.near), sp.at, { ...o, gain: 0.5 * g * (0.4 + 0.6 * kd) });
      if (kd > 0) place(SFX, clank(sp.near), sp.at + 0.02, { ...o, gain: 0.16 * g * STEP.metal * kd });
      if (kd > 0) place(SFX, hiss(1.6), sp.at + 0.45 + 0.15 * rnd(), { ...o, gain: 0.07 * g * S.hydraulic * kd });
      if (kh > 0) { place(SFX, debris(sp.near, wetAt(e.x, e.z)), sp.at + 0.12, { ...o, gain: 0.35 * g * kh }); heroHits.push([sp.at, kh * sp.per.g]); }
      if (rnd() < 0.5) place(SFX, groan(2.6 + 1.5 * rnd()), sp.at + 0.2, { pan: sp.pan * 0.4, lp: Math.min(sp.lp, 1200), gain: 0.25 * S.groan * (sp.per.groan) * clamp(sp.near * 2, 0.3, 1) });
      const r = table.get(sp.shot) || { n: 0, loud: 0 }; r.n++; r.loud = Math.max(r.loud, g); table.set(sp.shot, r);
    } else {
      if (sp.near < 0.1) continue;
      const k = clamp((sp.near - 0.2) / 0.3);
      place(SFX, servo(Math.max(0.8, e.dur - 0.1)), e.t - 0.1, { ...o, gain: 0.06 * g * S.hydraulic * (0.3 + 0.7 * k) });
      if (k > 0) place(SFX, hiss(0.9), e.t, { ...o, gain: 0.05 * g * S.hydraulic * k });
      if (k > 0.3) place(SFX, crunch(sp.near), e.t + 0.03, { ...o, gain: 0.18 * g * k });   // the foot peeling out of the ground
    }
  }
  // beds: wind with gusts, rain
  { const b = brown(N); lowpassRes(b, (t) => 260 + 220 * Math.sin(t * 0.21) + 140 * Math.sin(t * 0.53 + 1), 1.2);
    for (let i = 0; i < N; i++) { const t = i / SR; b[i] *= S.wind * 0.3 * (0.6 + 0.4 * Math.sin(t * 0.37) * Math.sin(t * 0.11 + 2)); } place(SFX, b, 0, { gain: 1, width: 1 }); }
  if (S.rain > 0) { const b = noise(N); onePole(b, 1800, true); onePole(b, 7000); for (let i = 0; i < N; i++) b[i] *= S.rain * 0.06; place(SFX, b, 0, { gain: 1, width: 1 }); }
  // life: the place's own sounds
  for (const L of S.life) {
    const fn = LIFE[L.kind]; if (!fn) { console.warn('unknown life sound ' + L.kind); continue; }
    const seg = L.shot ? TIMELINE.find((s) => s.shot === L.shot) : { start: 0, end: DURATION };
    if (!seg) continue;
    const times = L.at != null ? [].concat(L.at) : (() => { const r = []; for (let t = seg.start + (L.offset ?? 0.6); t < seg.end - 0.5; t += L.every ?? 3) r.push(t + rnd() * 0.4); return r; })();
    for (const t of times) {
      const sp = L.x != null ? spatial(t, L.x + (L.follow ? G.SPEED * t : 0), L.z ?? 0, L.y ?? 0) : { pan: rnd() - 0.5, lp: 9000, near: 1 };
      place(SFX, fn(), t, { pan: sp.pan, lp: sp.lp, gain: (L.gain ?? 0.2) * clamp(sp.near * 2, 0.2, 1) });
    }
  }
  // optional recordings on the same events (files the user downloaded under their own licence; never committed)
  for (const smp of S.samples) {
    const file = path.resolve(dir, smp.file);
    if (!fs.existsSync(file)) { console.warn('sample missing (skipped): ' + smp.file); continue; }
    const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 });
    if (r.status !== 0) { console.warn('cannot decode ' + smp.file); continue; }
    let b = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4)); let pk = 0; for (const v of b) pk = Math.max(pk, Math.abs(v)); b = b.map((v) => v / (pk || 1));
    const on = smp.on;
    const evs = on === 'bed' ? [{ t: 0, x: 0, z: 0, bed: true }] : typeof on === 'number' ? [{ t: on, bed: true }] : events.filter((e) => e.kind === (on === 'liftoff' ? 'up' : 'down'));
    for (const e of evs) {
      const sp = e.bed ? { at: e.t, near: 1, pan: 0, lp: smp.lp || 0, per: { g: 1 } } : spatial(e.t, e.x, e.z);
      if (!e.bed && sp.near < (smp.near ?? 0)) continue;
      place(SFX, b, sp.at, { pan: sp.pan, lp: Math.min(sp.lp || 16000, smp.lp || 16000), gain: (smp.gain ?? 0.3) * (e.bed ? 1 : clamp(sp.near * 1.5, 0.12, 1) * sp.per.g) });
    }
  }
}

// ------------------------------------------------------------------ music: a slow pad on the colossus's key, swelling where the brief says
if (!a.nomusic && S.music.level > 0) {
  const M = S.music, barDur = DURATION / Math.max(1, M.bars), hz = (st) => M.root * Math.pow(2, st / 12);
  const swellAt = (t) => { let s = 0.55; for (const [t0, t1, v] of M.swell) s = Math.max(s, v * smooth(t0 - 1.5, t0 + 1.5, t) * (1 - smooth(t1 - 1.5, t1 + 1.5, t))); return s; };
  for (let bar = 0; bar < M.bars; bar++) {
    const chord = M.chords[bar % M.chords.length], t0 = bar * barDur, dur = barDur + 2.5;
    for (const [vi, st] of chord.entries()) {
      const f = hz(st + 12 * (vi > 0 ? 1 : 0)), n = Math.ceil(dur * SR), b = new Float32Array(n);
      for (const det of [-0.0035, 0, 0.0041]) { let ph = rnd() * TAU; for (let i = 0; i < n; i++) { ph += TAU * f * (1 + det) / SR; let s = 0; for (let h = 1; h <= 7; h++) s += Math.sin(ph * h) / (h * h * 0.7 + 0.3); b[i] += s; } }
      lowpassRes(b, (t) => 500 + 700 * swellAt(t0 + t) + 150 * Math.sin((t0 + t) * 0.4 + vi), 0.9);
      for (let i = 0; i < n; i++) { const t = i / SR; b[i] *= Math.min(1, t / 2.2) * Math.min(1, (dur - t) / 2.5) * swellAt(t0 + t) * 0.05; }
      place(MUS, b, t0 - 0.5, { pan: (vi - 1.5) * 0.35, gain: M.level, width: 1 });
    }
  }
  // a low drone under everything
  { const b = new Float32Array(N); let ph = 0; for (let i = 0; i < N; i++) { const t = i / SR; ph += TAU * M.root / SR; b[i] = (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * 0.05 * swellAt(t) * Math.min(1, t / 3); } place(MUS, b, 0, { gain: M.level, width: 0.5 }); }
  // duck the music under footfalls close to the camera
  for (const [t, k] of heroHits) { const s0 = Math.round(t * SR); for (let i = 0; i < SR * 1.2; i++) { const d = s0 + i; if (d >= N) break; const g = 1 - 0.5 * k * Math.exp(-i / (SR * 0.45)); MUS[0][d] *= g; MUS[1][d] *= g; } }
}

// ------------------------------------------------------------------ fades at the film's head and tail, limiter, write
const fadeIn = 0.8, fadeOut = 1.5;
for (const bus of [SFX, MUS]) for (const ch of bus) for (let i = 0; i < N; i++) { const t = i / SR; ch[i] *= Math.min(1, t / fadeIn) * Math.min(1, (DURATION - t) / fadeOut); }
const mix = mk(); let pk = 0, sq = 0;
for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) { const v = SFX[c][i] + MUS[c][i]; mix[c][i] = v; pk = Math.max(pk, Math.abs(v)); sq += v * v; }
const rms = Math.sqrt(sq / (2 * N));
const norm = 0.25 / (rms || 1);   // ~ -12 dBFS RMS, then a soft limiter
let clip = 0, outPk = 0;
for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) { let v = mix[c][i] * norm; v = Math.abs(v) < 0.6 ? v : Math.sign(v) * (0.6 + 0.38 * Math.tanh((Math.abs(v) - 0.6) / 0.38)); mix[c][i] = v; outPk = Math.max(outPk, Math.abs(v)); if (Math.abs(v) > 0.985) clip++; }
function wav(file, L, R) {
  const buf = Buffer.alloc(44 + N * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(clamp(L[i], -1, 1) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(clamp(R[i], -1, 1) * 32767), 46 + i * 4); }
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, buf);
}
const out = path.resolve(dir, a.out || 'out/audio.wav');
wav(out, mix[0], mix[1]);
if (a.stems) { wav(out.replace(/\.wav$/, '_sfx.wav'), SFX[0].map((v) => v * norm), SFX[1].map((v) => v * norm)); wav(out.replace(/\.wav$/, '_music.wav'), MUS[0].map((v) => v * norm), MUS[1].map((v) => v * norm)); }
console.log(`wrote ${path.relative(dir, out)}  ${DURATION} s 48 kHz stereo  ${events.filter((e) => e.kind === 'down').length} footfalls, ${events.filter((e) => e.kind === 'up').length} lift-offs  peak ${(20 * Math.log10(outPk)).toFixed(1)} dBFS, ${clip} samples near clipping`);
if (a.table) for (const s of TIMELINE) { const r = table.get(s.shot) || { n: 0, loud: 0 }; console.log(`  ${s.shot.padEnd(12)} ${String(r.n).padStart(2)} footfalls, loudest ${r.loud.toFixed(2)}, music ducks ${heroHits.filter(([t]) => t >= s.start && t < s.end).length}x`); }
if (clip > SR * 0.01) { console.log('FAIL: the mix clips — lower step/groan gains in colossus.js SOUND'); process.exitCode = 1; }
