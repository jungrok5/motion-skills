// ballpoint-doodle-short · score.js — a bouncy little cartoon band and its foley, synthesised in plain JS (no Web Audio, no
// files), so the same score plays on the live page and is written to a WAV by scripts/score.mjs. Started from
// sketch-cartoon-short's synth (same repo) and extended for this style: marimba, glockenspiel, a whistled lead, a light kit,
// slide whistle, eggshell crack, crow caw, wind gust, sprout, squeak.
//
// spec = {
//   pluck:  [{ t, n: midi, v }]                  pizzicato / ukulele (Karplus-Strong)
//   mallet: [{ t, n, v }]                        marimba (wooden bar: fundamental + 4th partial, fast decay)
//   glock:  [{ t, n, v }]                        glockenspiel (bright, long ring)
//   keys:   [{ t, n, v, d }]                     felt piano · bass: [{ t, n, v }] upright bass pluck
//   whistle:[{ t, d, n, v }]                     a whistled tune (sine + breath, vibrato) — the hero's tune
//   reed:   [{ t, d, n, v }]                     a clarinet-ish lead · pad: [{ t, d, notes, v }] accordion bed
//   drum:   [{ t, k: 'kick' | 'snare' | 'tick' | 'clap', v }]   a light kit (brushed, not a drum machine)
//   brush:  [{ t, v, k: 'tap' | 'swish' }] · air: [{ t, v }] (wind bed level keys)
//   sfx:    [{ t, type, v, d, pan }]             pencil · paper · flip · whoosh · pop · boing · step · thump · fwump · chime ·
//                                                splash · slideup · slidedown · crack · caw · gust · sprout · squeak · drip · tick
//   reverb: { mix: .18, room: .78 }
// }
// renderScore(spec, sampleRate, duration) → [Float32Array L, Float32Array R], peak-normalised to −1 dBFS.

const TAU = Math.PI * 2;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function rnd(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; }; }
function keyval(list, t) { if (!list || !list.length) return 0; if (t <= list[0].t) return list[0].v; for (let i = 1; i < list.length; i++) if (t < list[i].t) { const a = list[i - 1], b = list[i], k = (t - a.t) / (b.t - a.t); return a.v + (b.v - a.v) * (k * k * (3 - 2 * k)); } return list[list.length - 1].v; }

export function renderScore(spec, sr = 44100, dur = 30) {
  const N = Math.ceil(dur * sr), L = new Float32Array(N), R = new Float32Array(N);
  const add = (i, v, pan = 0) => { if (i >= 0 && i < N) { L[i] += v * Math.cos((pan + 1) * Math.PI / 4); R[i] += v * Math.sin((pan + 1) * Math.PI / 4); } };
  const nz = rnd(4242);
  // Karplus-Strong string: noise burst in a delay line with a damped average
  const ks = (t, f, v, o) => {
    const i0 = Math.floor(t * sr), P = Math.max(2, Math.round(sr / f)), buf = new Float32Array(P), len = Math.ceil((o.len || 1.6) * sr), r = rnd(Math.floor(t * 997 + f));
    for (let i = 0; i < P; i++) buf[i] = r() * (o.bright ?? .9);
    let idx = 0, lp = 0; const damp = o.damp ?? .996, c = o.lp ?? .5;
    for (let i = 0; i < len; i++) { const a = buf[idx], b = buf[(idx + 1) % P], y = (a + b) * .5 * damp; buf[idx] = y; idx = (idx + 1) % P; lp += c * (a - lp); add(i0 + i, lp * v * Math.min(1, i / 40), o.pan ?? 0); }
  };
  for (const e of spec.pluck || []) ks(e.t, mtof(e.n), (e.v ?? .5) * .5, { len: 1.4, damp: .994, lp: .55, pan: ((e.n % 12) / 12 - .5) * .6 });
  for (const e of spec.bass || []) ks(e.t, mtof(e.n), (e.v ?? .6) * .9, { len: 1.8, damp: .997, lp: .18, bright: .8, pan: 0 });
  // felt piano: partials with their own decays, soft attack, a little hammer thump
  const PP = [[1, 1, 1.6], [2, .38, .9], [3, .16, .6], [4.02, .08, .4], [5.03, .04, .3]];
  for (const e of spec.keys || []) {
    const f = mtof(e.n), i0 = Math.floor(e.t * sr), len = Math.ceil(Math.min(4, (e.d || 1.5) + 1.2) * sr), v = (e.v ?? .5) * .2, pan = ((e.n - 60) / 24) * .5;
    for (let i = 0; i < len; i++) { const t = i / sr, rel = e.d && t > e.d ? Math.exp(-(t - e.d) / .25) : 1; let s = 0; for (const [m, a, d] of PP) s += a * Math.sin(TAU * f * m * t) * Math.exp(-t / d); add(i0 + i, s * v * Math.min(1, t / .006) * rel, pan); }
  }
  // reed lead: odd harmonics through a soft low-pass, vibrato after the attack
  for (const e of spec.reed || []) {
    const f = mtof(e.n), i0 = Math.floor(e.t * sr), d = e.d || .5, len = Math.ceil((d + .25) * sr), v = (e.v ?? .5) * .16; let ph = 0, lp = 0;
    for (let i = 0; i < len; i++) { const t = i / sr, vib = 1 + .006 * Math.sin(TAU * 5.2 * t) * Math.min(1, t / .3); ph += f * vib / sr; ph -= ph | 0; const x = Math.sin(TAU * ph) + .33 * Math.sin(TAU * 3 * ph) + .14 * Math.sin(TAU * 5 * ph) + .06 * Math.sin(TAU * 7 * ph); lp += .25 * (x - lp); const env = Math.min(1, t / .05) * (t < d ? 1 : Math.exp(-(t - d) / .08)); add(i0 + i, lp * env * v, .15); }
  }
  // harmonium pad: detuned saws (band-limited by a few partials) under a slow swell
  for (const e of spec.pad || []) {
    e.notes.forEach((n, j) => {
      const f = mtof(n), i0 = Math.floor(e.t * sr), len = Math.ceil((e.d + 1) * sr), v = (e.v ?? .4) * .08 / Math.sqrt(e.notes.length), pan = (j / Math.max(1, e.notes.length - 1) - .5) * .7;
      for (let i = 0; i < len; i++) { const t = i / sr; let s = 0; for (let k = 1; k <= 6; k++) s += (Math.sin(TAU * f * k * t * 1.002) + Math.sin(TAU * f * k * t * .998)) / k; const env = Math.min(1, t / .4) * (t < e.d ? 1 : Math.exp(-(t - e.d) / .35)) * (1 + .08 * Math.sin(TAU * 4.5 * t)); add(i0 + i, s * env * v, pan); }
    });
  }
  // marimba: a struck wooden bar — fundamental + the bar's 4th partial (≈3.9×), very fast decay on the overtone
  for (const e of spec.mallet || []) {
    const f = mtof(e.n), i0 = Math.floor(e.t * sr), len = Math.ceil(1.1 * sr), v = (e.v ?? .5) * .3, pan = ((e.n - 66) / 24) * .6;
    for (let i = 0; i < len; i++) { const t = i / sr; add(i0 + i, (Math.sin(TAU * f * t) * Math.exp(-t / .32) + .35 * Math.sin(TAU * f * 3.93 * t) * Math.exp(-t / .05) + .1 * Math.sin(TAU * f * 9.2 * t) * Math.exp(-t / .015)) * v * Math.min(1, t / .002), pan); }
  }
  // glockenspiel: bright metal bar, long ring
  for (const e of spec.glock || []) {
    const f = mtof(e.n), i0 = Math.floor(e.t * sr), len = Math.ceil(2.2 * sr), v = (e.v ?? .5) * .12, pan = ((e.n - 84) / 24) * .5;
    for (let i = 0; i < len; i++) { const t = i / sr; add(i0 + i, (Math.sin(TAU * f * t) + .4 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t / .2) + .2 * Math.sin(TAU * f * 5.4 * t) * Math.exp(-t / .06)) * Math.exp(-t / .8) * v * Math.min(1, t / .001), pan); }
  }
  // whistle: a sine with breath noise and a lazy vibrato, little scoops into each note
  { const br = rnd(77);
    for (const e of spec.whistle || []) {
      const f = mtof(e.n), i0 = Math.floor(e.t * sr), d = e.d || .4, len = Math.ceil((d + .12) * sr), v = (e.v ?? .5) * .2; let ph = 0, nlp = 0;
      for (let i = 0; i < len; i++) { const t = i / sr, scoop = 1 - .03 * Math.exp(-t / .03), vib = 1 + .009 * Math.sin(TAU * 5.6 * t) * Math.min(1, t / .25); ph += f * scoop * vib / sr; ph -= ph | 0; nlp += .08 * (br() - nlp); const env = Math.min(1, t / .025) * (t < d ? 1 : Math.exp(-(t - d) / .05)); add(i0 + i, (Math.sin(TAU * ph) + nlp * .5) * env * v, -.1); }
    } }
  // a light kit
  for (const e of spec.drum || []) {
    const i0 = Math.floor(e.t * sr), v = e.v ?? .5, r = rnd(Math.floor(e.t * 1000) + 19); let hp = 0, prev = 0;
    if (e.k === 'kick') for (let i = 0; i < .3 * sr; i++) { const t = i / sr; add(i0 + i, Math.sin(TAU * (55 + 90 * Math.exp(-t * 30)) * t) * Math.exp(-t / .12) * v * .8, 0); }
    else { const len = Math.ceil((e.k === 'snare' ? .18 : e.k === 'clap' ? .14 : .05) * sr);
      for (let i = 0; i < len; i++) { const t = i / sr, x = r(); hp = .85 * (hp + x - prev); prev = x; const env = e.k === 'clap' ? (Math.exp(-t / .012) + .6 * Math.exp(-Math.max(0, t - .012) / .03) * (t > .012 ? 1 : 0)) : Math.exp(-t / (e.k === 'snare' ? .05 : .012)); const body = e.k === 'snare' ? Math.sin(TAU * 190 * t) * Math.exp(-t / .03) * .5 : 0; add(i0 + i, (hp * (e.k === 'tick' ? .35 : .5) + body) * env * v * .6, e.k === 'tick' ? .3 : -.1); } }
  }
  // brushes
  for (const e of spec.brush || []) {
    const i0 = Math.floor(e.t * sr), sw = e.k === 'swish', len = Math.ceil((sw ? .35 : .12) * sr), r = rnd(Math.floor(e.t * 1000) + 3); let hp = 0, prev = 0;
    for (let i = 0; i < len; i++) { const t = i / sr, x = r(); hp = .7 * (hp + x - prev); prev = x; const env = sw ? Math.sin(Math.PI * t / .35) ** 2 : Math.exp(-t / .03); add(i0 + i, hp * env * (e.v ?? .4) * (sw ? .12 : .3), sw ? .3 : -.2); }
  }
  // air and rain beds
  if (spec.air || spec.rain) {
    let a = 0, b = 0, c2 = 0;
    for (let i = 0; i < N; i++) { const t = i / sr, w = nz(); a += .02 * (w - a); b += .004 * (w - b); c2 += .5 * (w - c2);
      const lv = keyval(spec.air, t), rv = keyval(spec.rain, t);
      if (lv) add(i, (a - b) * lv * .5, Math.sin(TAU * .03 * t) * .5);
      if (rv) { const drop = nz() > .997 ? nz() * .6 : 0; add(i, ((w - c2) * .12 + drop) * rv * .5, nz() * .5); }
    }
  }
  // effects
  const svf = () => { let lo = 0, bd = 0; return (x, fc, q) => { const f = 2 * Math.sin(Math.PI * Math.min(fc, sr / 6) / sr); lo += f * bd; const hi = x - lo - q * bd; bd += f * hi; return bd; }; };
  for (const s of spec.sfx || []) {
    const i0 = Math.floor(s.t * sr), v = s.v ?? .5, d = s.d || .6, r2 = rnd(Math.floor(s.t * 1000) + 11), pan = s.pan ?? 0, n = Math.ceil(d * sr);
    if (s.type === 'pencil') {          // graphite on paper: bursts of bright scratchy noise, a stroke every ~.12 s
      const f = svf(); for (let i = 0; i < n; i++) { const t = i / sr, st = (t * 8.3) % 1, env = Math.sin(Math.PI * Math.min(1, st / .8)) ** .6 * (st < .8 ? 1 : 0) * (.7 + .3 * Math.sin(TAU * 37 * t)); add(i0 + i, f(r2(), 3200 + 1800 * Math.sin(TAU * 2.1 * t), .5) * env * v * .5, pan + Math.sin(TAU * 1.3 * t) * .2); }
    } else if (s.type === 'erase') {
      const f = svf(); for (let i = 0; i < n; i++) { const t = i / sr, env = Math.abs(Math.sin(TAU * 4 * t)) * Math.sin(Math.PI * t / d); add(i0 + i, f(r2(), 1300, .7) * env * v * .6, pan); }
    } else if (s.type === 'paper' || s.type === 'flip') {   // a sheet flapping / one page turn
      const f = svf(), flip = s.type === 'flip'; for (let i = 0; i < n; i++) { const t = i / sr, k = t / d, env = flip ? Math.exp(-((k - .3) ** 2) / .02) : Math.max(0, Math.sin(TAU * 11 * t + Math.sin(TAU * 3 * t))) ** 2 * Math.sin(Math.PI * k); add(i0 + i, f(r2(), flip ? 2600 : 1900, .6) * env * v * .7, pan); }
    } else if (s.type === 'whoosh') {
      const f = svf(); for (let i = 0; i < n; i++) { const t = i / sr, k = t / d, fc = 300 + 2000 * Math.sin(Math.PI * k) ** 2; add(i0 + i, f(r2(), fc, .55) * Math.sin(Math.PI * k) ** 1.5 * v * .8, pan + (k - .5) * .8); }
    } else if (s.type === 'pop') {
      for (let i = 0; i < .15 * sr; i++) { const t = i / sr; add(i0 + i, Math.sin(TAU * (900 - 2500 * t) * t) * Math.exp(-t / .03) * v * .6, pan); }
    } else if (s.type === 'boing') {     // a cartoon spring for a jump
      for (let i = 0; i < .7 * sr; i++) { const t = i / sr, f0 = 180 + 260 * t + 40 * Math.sin(TAU * 14 * t) * Math.exp(-t * 4); add(i0 + i, Math.sin(TAU * f0 * t) * Math.exp(-t / .25) * v * .45, pan); }
    } else if (s.type === 'step') {
      const f = svf(); for (let i = 0; i < .09 * sr; i++) { const t = i / sr; add(i0 + i, (f(r2(), 700, .9) * .6 + Math.sin(TAU * 110 * t) * .4) * Math.exp(-t / .02) * v * .7, pan); }
    } else if (s.type === 'thump') {
      for (let i = 0; i < .5 * sr; i++) { const t = i / sr; add(i0 + i, Math.sin(TAU * (80 * Math.exp(-t * 9) + 45) * t) * Math.exp(-t / .12) * v, 0); }
    } else if (s.type === 'thunder') {
      let lp = 0, lp2 = 0; for (let i = 0; i < n; i++) { const t = i / sr, k = t / d, env = Math.min(1, t / .05) * (1 - k) ** 1.4 * (.6 + .4 * Math.abs(Math.sin(TAU * 3 * t + Math.sin(TAU * 1.7 * t)))); lp += .02 * (r2() - lp); lp2 += .004 * (lp - lp2); add(i0 + i, (lp * 7 + lp2 * 10) * env * v, Math.sin(t) * .3); }
    } else if (s.type === 'fwump') {     // an umbrella or a coat snapping open
      const f = svf(); for (let i = 0; i < .4 * sr; i++) { const t = i / sr, env = Math.exp(-t / .07) * Math.min(1, t / .01); add(i0 + i, (f(r2(), 500, .8) * .8 + Math.sin(TAU * 70 * t) * .5) * env * v, pan); }
    } else if (s.type === 'chime') {
      for (const [m, dt] of [[84, 0], [88, .07], [91, .14], [96, .22]]) { const f = mtof(m + (s.shift || 0)), j0 = i0 + Math.floor(dt * sr); for (let i = 0; i < 2.2 * sr; i++) { const t = i / sr; add(j0 + i, (Math.sin(TAU * f * t) + .3 * Math.sin(TAU * f * 2.01 * t)) * Math.exp(-t / .7) * Math.min(1, t / .003) * v * .1, (m - 90) / 12); } }
    } else if (s.type === 'scribble') {  // many fast pencil strokes + a low growl: a scribble mass alive
      const f = svf(), g = svf(); for (let i = 0; i < n; i++) { const t = i / sr, k = t / d, env = Math.sin(Math.PI * k) ** .5, st = Math.abs(Math.sin(TAU * 13 * t + 3 * Math.sin(TAU * 2 * t))); add(i0 + i, (f(r2(), 2600, .4) * st * .6 + g(r2(), 140 + 40 * Math.sin(TAU * 3 * t), .3) * 1.4) * env * v * .6, pan); }
    } else if (s.type === 'splash') {
      const f = svf(); for (let i = 0; i < .5 * sr; i++) { const t = i / sr; add(i0 + i, f(r2(), 1800 - 2400 * t, .5) * Math.exp(-t / .1) * v * .8, pan); }
    } else if (s.type === 'slideup' || s.type === 'slidedown') {   // slide whistle
      const up = s.type === 'slideup'; let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr, k = t / d, f = up ? 500 * Math.pow(4, k) : 2000 * Math.pow(.25, k); ph += f / sr; add(i0 + i, Math.sin(TAU * ph) * Math.sin(Math.PI * k) ** .4 * v * .35, pan); }
    } else if (s.type === 'crack') {   // an eggshell / seed husk cracking: a few dry clicks
      for (let c = 0; c < 5; c++) { const j0 = i0 + Math.floor((c * .045 + r2() * .01 + .01) * sr), f = svf(); for (let i = 0; i < .04 * sr; i++) { const t = i / sr; add(j0 + i, f(r2(), 2600 + c * 300, .3) * Math.exp(-t / .006) * v * .9, pan); } }
    } else if (s.type === 'caw') {     // a crow: a nasal, rough formant burst, twice
      for (let c = 0; c < (s.n ?? 2); c++) { const j0 = i0 + Math.floor(c * .32 * sr), f = svf(), g2 = svf(); let ph = 0; for (let i = 0; i < .26 * sr; i++) { const t = i / sr, k = t / .26, f0 = 420 - 140 * k; ph += f0 / sr; const saw = 2 * (ph - Math.floor(ph)) - 1 + r2() * .35; add(j0 + i, (f(saw, 1300, .25) + g2(saw, 2500, .3) * .6) * Math.sin(Math.PI * k) ** .5 * v * .5, pan); } }
    } else if (s.type === 'gust') {
      const f = svf(); for (let i = 0; i < n; i++) { const t = i / sr, k = t / d, fc = 500 + 900 * Math.sin(Math.PI * k) + 300 * Math.sin(TAU * 1.3 * t); add(i0 + i, f(r2(), fc, .35) * Math.sin(Math.PI * k) ** 1.2 * v * .9, pan + Math.sin(TAU * .7 * t) * .4); }
    } else if (s.type === 'sprout') {   // something growing: a rising shimmer of glock notes + a soft swell
      const sc = [0, 4, 7, 12, 16, 19, 24, 28]; sc.forEach((m, j) => { const f = mtof(72 + m), j0 = i0 + Math.floor(j / sc.length * d * sr); for (let i = 0; i < 1.4 * sr; i++) { const t = i / sr; add(j0 + i, Math.sin(TAU * f * t) * Math.exp(-t / .5) * Math.min(1, t / .002) * v * .1, (j / sc.length - .5) * .8); } });
    } else if (s.type === 'squeak') {   // a rubbery squeak / a little cry
      let ph = 0; for (let i = 0; i < .18 * sr; i++) { const t = i / sr, k = t / .18, f = 1200 + 900 * Math.sin(Math.PI * k); ph += f / sr; add(i0 + i, Math.sin(TAU * ph) * Math.sin(Math.PI * k) * v * .3, pan); }
    } else if (s.type === 'drip') {
      for (let i = 0; i < .12 * sr; i++) { const t = i / sr; add(i0 + i, Math.sin(TAU * (700 + 1800 * t / .12) * t) * Math.exp(-t / .03) * v * .4, pan); }
    } else if (s.type === 'tick') {
      const f = svf(); for (let i = 0; i < .03 * sr; i++) { const t = i / sr; add(i0 + i, f(r2(), 3500, .3) * Math.exp(-t / .004) * v, pan); }
    }
  }
  // reverb: 4 combs + 2 all-passes per channel
  const rv = spec.reverb || { mix: .18, room: .78 };
  const verb = (x, off) => {
    const out = new Float32Array(N), combs = [1557, 1617, 1491, 1422].map(d => ({ b: new Float32Array(d + off), i: 0, lp: 0 }));
    for (let n = 0; n < N; n++) { let s = 0; for (const c of combs) { const y = c.b[c.i]; c.lp = y * .6 + c.lp * .4; c.b[c.i] = x[n] * .5 + c.lp * rv.room; c.i = (c.i + 1) % c.b.length; s += y; } out[n] = s * .25; }
    for (const d of [556 + off, 341 + off]) { const b = new Float32Array(d); let i = 0; for (let n = 0; n < N; n++) { const y = b[i], v = out[n] + y * .5; b[i] = v; out[n] = y - v * .5; i = (i + 1) % d; } }
    return out;
  };
  const vl = verb(L, 0), vr = verb(R, 23);
  let peak = 0;
  for (let n = 0; n < N; n++) { L[n] = Math.tanh((L[n] + vl[n] * rv.mix * 2) * 1.1); R[n] = Math.tanh((R[n] + vr[n] * rv.mix * 2) * 1.1); peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n])); }
  const g = peak > 0 ? .89 / peak : 1, fi = Math.floor(.03 * sr);
  for (let n = 0; n < N; n++) { const k = Math.min(1, n / fi); L[n] *= g * k; R[n] *= g * k; }
  return [L, R];
}

// ── helpers for writing a score in bars instead of seconds ──
/** beat → seconds at bpm, from an offset */
export const beat = (bpm, b, t0 = 0) => t0 + b * 60 / bpm;
/** a walking bass / oom-pah: chords = [[root midi, beats]…] → bass + pluck events from t0 */
export function oompah(bpm, chords, t0 = 0, o = {}) {
  const bass = [], pluck = []; let b = 0;
  for (const [root, beats, third = 4] of chords) {
    for (let i = 0; i < beats; i++) {
      const t = beat(bpm, b + i, t0);
      if (i % 2 === 0) bass.push({ t, n: root - 12 + (i % 4 === 2 ? 7 : 0), v: o.bv ?? .6 });
      else for (const n of [root + third, root + 7]) pluck.push({ t, n: n + 12, v: o.pv ?? .35 });
    }
    b += beats;
  }
  return { bass, pluck };
}
/** a melody line: notes = [[midi | null, beats]…] → reed (or keys) events */
export function tune(bpm, notes, t0 = 0, o = {}) {
  const out = []; let b = 0;
  for (const [n, beats] of notes) { if (n != null) out.push({ t: beat(bpm, b, t0), d: beat(bpm, beats) * (o.legato ?? .9), n, v: o.v ?? .5 }); b += beats; }
  return out;
}
