// dragon-realm · 85_audio — the sound engine: a film's whole soundtrack is synthesised by code, once, off-line.
// Nothing is loaded: every note and every sound effect is arithmetic.  A film registers its score with
//   DR.score(function (K, B, o) { … }, { beats: B, bar: BAR, beat: BEAT, duration: B.END, master: {…} });
// `K` is a fresh synth kit (DR.synthKit), `B` the beat sheet, `o` the options object (it must be plain data: it is
// posted to a Web Worker).  The score function and the kit must be SELF-CONTAINED — they are shipped to the worker
// as text (fn.toString()), so they may not touch DR, THREE, the page or any variable outside themselves.
//
// DR.audio (exists only when a score is registered and ?off=audio is not set):
//   started · async start(t) (call from a click/key: makes the AudioContext, renders, plays so that film second t
//   is heard now) · playing() · time() (film seconds from the audio clock, wrapped at the duration) · pause() ·
//   resume(t) · async render(extra?) → { L, R, sampleRate, ms, worker, info } · wav(L, R, sampleRate) → Uint8Array.
//   Outside ?render=1 the score is rendered in the background at load, so the first click starts sound at once.
//
// Determinism: the kit uses its own sin/cos/exp/log (plain IEEE arithmetic) and seeded noise streams, so the same
// score gives bit-identical samples in Node, in a worker and on the main thread, in any JavaScript engine.
//
// The kit (all times in film seconds, pitches as MIDI numbers or names 'Eb4', levels 0..1):
//   K.group(name, {fade, fadeIn, fadeOut, gain}) · K.automate(group, [[t, gain]…]) · K.duck(group, t, dB, att, hold, rel)
//   · K.gap(group, t0, t1) — declare these BEFORE writing notes of that group.  K.bus(name, {gain, pan, rev, dly, group}).
//   Instruments: K.flute(bus, t, notes, o) · K.bowed(bus, t, notes, o)  (mono leads; notes = [{t, d, n, v, vib, g…}])
//   · K.pluck(bus, t, o) · K.drum(bus, t, kind, vel, o) · K.janggu(bus, t, stroke, vel) · K.gong / K.bell / K.metal
//   · K.choir · K.strings · K.drone · K.sub · K.glass.   Sound effects: K.bed · K.wind · K.rain · K.thunder · K.sweep
//   · K.whoosh · K.spray · K.breath · K.surge · K.bubbles · K.splash · K.roar · K.shimmer · K.chimes.
//   Building blocks: K.rng K.note K.mtof K.curve K.lfo K.white K.colour K.bq K.filt K.svf K.formants K.modal K.buf K.out
//   K.sin K.cos K.exp K.log K.pow K.tanh K.pattern.   K.master(opts) → { L, R, info } (reverb, delay, EQ, loudness, limiter).
//   ?solo=bus,group / ?mute=… (or o.solo / o.mute) render stems.
DR.synthKit = function (cfg) {
  'use strict';
  cfg = cfg || {};
  const SR = cfg.sampleRate || 44100, DUR = +cfg.duration || 60, N = Math.round(DUR * SR);
  const PI = 3.141592653589793, TAU = 6.283185307179586, LN2 = 0.6931471805599453, LN10 = 2.302585092994046, LN12 = LN2 / 12;
  const abs = Math.abs, min = Math.min, max = Math.max, floor = Math.floor, round = Math.round, sqrt = Math.sqrt, ceil = Math.ceil;
  const K = { SR, DUR, N, cfg, BEAT: cfg.beat || 0.5, BAR: cfg.bar || 2 };

  // ══ arithmetic that is the same in every engine (Math.sin & co. differ in the last bit between builds) ══
  const sinK = (r) => { const z = r * r; return r * (1 + z * (-1 / 6 + z * (1 / 120 + z * (-1 / 5040 + z * (1 / 362880 + z * (-1 / 39916800 + z / 6227020800)))))); };
  const cosK = (r) => { const z = r * r; return 1 + z * (-0.5 + z * (1 / 24 + z * (-1 / 720 + z * (1 / 40320 + z * (-1 / 3628800 + z * (1 / 479001600 - z / 87178291200)))))); };
  const sin = (x) => { const k = round(x * 0.6366197723675814), r = x - k * 1.5707963267341256 - k * 6.077100506506192e-11, q = k & 3; return q === 0 ? sinK(r) : q === 1 ? cosK(r) : q === 2 ? -sinK(r) : -cosK(r); };
  const cos = (x) => { const k = round(x * 0.6366197723675814), r = x - k * 1.5707963267341256 - k * 6.077100506506192e-11, q = k & 3; return q === 0 ? cosK(r) : q === 1 ? -sinK(r) : q === 2 ? -cosK(r) : sinK(r); };
  const P2 = new Float64Array(2201); P2[1100] = 1; for (let i = 1; i <= 1100; i++) { P2[1100 + i] = P2[1099 + i] * 2; P2[1100 - i] = P2[1101 - i] * 0.5; }
  const exp = (x) => { if (x > 709) return Infinity; if (x < -745) return 0; const k = round(x * 1.4426950408889634), r = x - k * 0.6931471803691238 - k * 1.9082149292705877e-10;
    return (1 + r * (1 + r * (1 / 2 + r * (1 / 6 + r * (1 / 24 + r * (1 / 120 + r * (1 / 720 + r * (1 / 5040 + r * (1 / 40320 + r * (1 / 362880 + r * (1 / 3628800 + r * (1 / 39916800 + r * (1 / 479001600 + r / 6227020800))))))))))))) * P2[1100 + k]; };
  const log = (x) => { if (!(x > 0)) return x === 0 ? -Infinity : NaN; let e = 0; while (x >= 1.4142135623730951) { x *= 0.5; e++; } while (x < 0.7071067811865476) { x *= 2; e--; }
    const s = (x - 1) / (x + 1), z = s * s; return e * LN2 + 2 * s * (1 + z * (1 / 3 + z * (1 / 5 + z * (1 / 7 + z * (1 / 9 + z * (1 / 11 + z * (1 / 13 + z * (1 / 15 + z * (1 / 17 + z * (1 / 19 + z / 21)))))))))); };
  const pow = (x, y) => (x <= 0 ? 0 : exp(y * log(x)));
  const tanh = (x) => { if (x > 19) return 1; if (x < -19) return -1; if (abs(x) < 1e-4) return x; const e = exp(2 * x); return (e - 1) / (e + 1); };
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x), sat = (x) => (x < 0 ? 0 : x > 1 ? 1 : x), sstep = (x) => { x = sat(x); return x * x * (3 - 2 * x); };
  const db = (d) => exp(d * LN10 / 20), todb = (x) => 20 * log(x) / LN10, mtof = (m) => 440 * exp((m - 69) * LN12), ftom = (f) => 69 + log(f / 440) / LN12;
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const note = (s) => { if (typeof s === 'number') return s; const m = /^([A-Ga-g])([#b]*)(-?\d+)$/.exec(s); if (!m) throw new Error('bad note name ' + s); let v = SEMI[m[1].toUpperCase()] + 12 * (+m[3] + 1); for (const c of m[2]) v += c === '#' ? 1 : -1; return v; };
  const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const seedOf = (...a) => hashStr(a.join('|')) || 1;
  const rng = (seed) => { let a = (typeof seed === 'string' ? hashStr(seed) : seed) >>> 0; const r = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    r.range = (lo, hi) => lo + (hi - lo) * r(); r.int = (lo, hi) => floor(r.range(lo, hi + 1)); r.pick = (arr) => arr[floor(r() * arr.length)]; return r; };
  // breakpoints [[x, v]…] read at x (straight lines; the ends hold)
  const at = (pts, x) => { const m = pts.length; if (x <= pts[0][0]) return pts[0][1]; if (x >= pts[m - 1][0]) return pts[m - 1][1]; let k = 0; while (pts[k + 1][0] < x) k++; const a = pts[k], b = pts[k + 1]; return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]); };
  Object.assign(K, { sin, cos, exp, log, pow, tanh, clamp, sat, sstep, db, todb, mtof, ftom, note, rng, seedOf, at, PI, TAU });
  K.pattern = (str, t0, step, fn) => { for (let i = 0; i < str.length; i++) if (str[i] !== '.' && str[i] !== ' ') fn(str[i], t0 + i * step, i); };

  // ══ buffers, curves, noise ══
  let pool = [];
  const buf = (slot, n, clear) => { let b = pool[slot]; if (!b || b.length < n) b = pool[slot] = new Float32Array(max(n + 256, 32768)); else if (clear) b.fill(0, 0, n); return b; };
  // fill out[0..n) from breakpoints [[seconds, value]…]
  const curve = (o, n, pts, smooth) => { const m = pts.length; let i = 0; const i0 = min(n, max(0, round(pts[0][0] * SR))); for (; i < i0; i++) o[i] = pts[0][1];
    for (let k = 0; k < m - 1 && i < n; k++) { const a = pts[k], b = pts[k + 1], ia = a[0] * SR, ib = min(n, round(b[0] * SR)), inv = 1 / max(1e-9, (b[0] - a[0]) * SR), dv = b[1] - a[1];
      for (; i < ib; i++) { let u = (i - ia) * inv; if (u < 0) u = 0; if (smooth) u = u * u * (3 - 2 * u); o[i] = a[1] + dv * u; } }
    const last = pts[m - 1][1]; for (; i < n; i++) o[i] = last; return o; };
  // a smooth random wander between lo and hi, about `hz` new targets a second
  const lfo = (o, n, hz, seed, lo, hi) => { const r = rng(seed); let a = r(), b = r(), c = r(), d = r(), u = r(); const inc = hz / SR, sc = hi - lo;
    for (let i = 0; i < n; i++) { const u2 = u * u, v = 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (3 * b - a - 3 * c + d) * u2 * u); o[i] = lo + sc * (v < 0 ? 0 : v > 1 ? 1 : v); u += inc; if (u >= 1) { u -= 1; a = b; b = c; c = d; d = r(); } } return o; };
  const white = (o, n, seed, amp) => { let s = (seed | 0) || 0x1234567; const k = (amp === undefined ? 1 : amp) * 4.656612873077393e-10; for (let i = 0; i < n; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; o[i] = s * k; } return o; };
  // white → pink / brown in place; warm > 0 primes the filter on the last `warm` samples so the buffer loops
  const colour = (o, n, kind, warm) => { if (kind === 'white' || !kind) return o; let b0 = 0, b1 = 0, b2 = 0;
    for (let pass = warm ? 0 : 1; pass < 2; pass++) for (let i = pass ? 0 : max(0, n - warm); i < n; i++) { const w = o[i]; let v;
      if (kind === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; v = (b0 + b1 + b2 + w * 0.1848) * 0.22; } else { b0 = (b0 + 0.02 * w) / 1.02; v = b0 * 3.5; }
      if (pass) o[i] = v; }
    return o; };
  const envASR = (o, n, att, dur, rel) => { const nA = max(1, round(att * SR)), nS = max(nA, round(dur * SR)), nR = max(1, n - nS); for (let i = 0; i < n; i++) o[i] = i < nA ? 0.5 - 0.5 * cos((PI * i) / nA) : i < nS ? 1 : 0.5 + 0.5 * cos((PI * min(nR, i - nS)) / nR); return o; };

  // ══ filters ══
  // RBJ biquads: 'lp' 'hp' 'bp' (0 dB peak) 'peak' 'ls' 'hs' → [b0, b1, b2, a1, a2]
  const bq = (type, f, q, g) => { const w = (TAU * clamp(f, 8, SR * 0.47)) / SR, cs = cos(w), sn = sin(w), al = sn / (2 * (q || 0.7071)), A = exp(((g || 0) * LN10) / 40); let b0, b1, b2, a0, a1, a2;
    if (type === 'lp') { b1 = 1 - cs; b0 = b2 = b1 / 2; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else if (type === 'hp') { b1 = -(1 + cs); b0 = b2 = (1 + cs) / 2; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else if (type === 'peak') { b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }
    else { const s2 = 2 * sqrt(A) * al, lo = type === 'ls' ? 1 : -1;
      b0 = A * (A + 1 - lo * (A - 1) * cs + s2); b1 = lo * 2 * A * (A - 1 - lo * (A + 1) * cs); b2 = A * (A + 1 - lo * (A - 1) * cs - s2);
      a0 = A + 1 + lo * (A - 1) * cs + s2; a1 = -lo * 2 * (A - 1 + lo * (A + 1) * cs); a2 = A + 1 + lo * (A - 1) * cs - s2; }
    return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0]; };
  const filt = (x, n, c, y, st) => { y = y || x; const b0 = c[0], b1 = c[1], b2 = c[2], a1 = c[3], a2 = c[4]; let z1 = st ? st[0] : 0, z2 = st ? st[1] : 0;
    for (let i = 0; i < n; i++) { const v = x[i], o = b0 * v + z1; z1 = b1 * v - a1 * o + z2 + 1e-24; z2 = b2 * v - a2 * o; y[i] = o; } if (st) { st[0] = z1; st[1] = z2; } return y; };
  const filtC = (x, n, c) => { const w = min(n, SR), st = [0, 0]; filt(x.subarray(n - w, n), w, c, buf(15, w), st); return filt(x, n, c, x, st); };   // loops cleanly
  // state-variable filter (TPT); fc a number or a per-sample buffer (Hz); mode 'lp' | 'bp' (0 dB peak) | 'hp'
  const svf = (x, n, mode, fc, q, y) => { y = y || x; const k = 1 / (q || 0.7071), isA = typeof fc !== 'number', md = mode === 'lp' ? 0 : mode === 'bp' ? 1 : 2; let ic1 = 0, ic2 = 0, a1 = 0, a2 = 0, a3 = 0;
    for (let i = 0; i < n; i++) { if ((i & 15) === 0 && (isA || i === 0)) { const w = (PI * clamp(isA ? fc[i] : fc, 10, SR * 0.45)) / SR, g = sin(w) / cos(w); a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2; }
      const v0 = x[i], v3 = v0 - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1 + 1e-24; ic2 = 2 * v2 - ic2; y[i] = md === 0 ? v2 : md === 1 ? k * v1 : v0 - k * v1 - v2; } return y; };
  const lp1 = (x, n, fc, y) => { y = y || x; const a = 1 - exp((-TAU * fc) / SR); let s = 0; for (let i = 0; i < n; i++) { s += (x[i] - s) * a; y[i] = s; } return y; };
  // a bank of parallel band-passes [[Hz, Q, gain]…]: y = dry·x + Σ gain·BP(x)   (x and y must differ)
  const formants = (x, y, n, F, dry) => { const t = buf(14, n); for (let i = 0; i < n; i++) y[i] = x[i] * (dry || 0); for (const f of F) { if (f[0] > SR * 0.45) continue; filt(x, n, bq('bp', f[0], f[1]), t); const g = f[2]; for (let i = 0; i < n; i++) y[i] += t[i] * g; } return y; };
  Object.assign(K, { buf, curve, lfo, white, colour, envASR, bq, filt, filtC, svf, lp1, formants });

  // ══ the mixer: buses (gain, pan, sends) write into one dry pair and two send pairs; groups carry automation ══
  const CR = 64, NC = ceil(N / CR) + 2;
  let dryL = null, dryR = null, revL = null, revR = null, dlyL = null, dlyR = null;
  const groups = {}, buses = {}, order = [];
  const setOf = (v) => { const s = v ? new Set(typeof v === 'string' ? v.split(',').filter(Boolean) : v) : null; return s && s.size ? s : null; };
  const solo = setOf(cfg.solo), mute = setOf(cfg.mute);
  const group = (K.group = (name, o) => { let g = groups[name]; if (!g) g = groups[name] = { name, gain: 1, fade: true, fadeIn: cfg.fadeIn === undefined ? 0.03 : cfg.fadeIn, fadeOut: cfg.fadeOut === undefined ? 2 : cfg.fadeOut, auto: null, pend: [], used: false }; if (o) Object.assign(g, o); return g; });
  const applyAuto = (A, pts) => { for (let c = 0; c < NC; c++) A[c] *= at(pts, (c * CR) / SR); };
  const autoOf = (g) => { if (g.auto) return g.auto; const A = (g.auto = new Float32Array(NC).fill(1));
    if (g.fade) for (let c = 0; c < NC; c++) { const t = (c * CR) / SR; A[c] = sstep(t / max(1e-4, g.fadeIn)) * sstep((DUR - t) / max(1e-4, g.fadeOut)); }
    for (const p of g.pend) applyAuto(A, p); g.pend = []; return A; };
  K.automate = (name, pts) => { const g = group(name); if (g.used) throw new Error('K.automate("' + name + '"): declare automation before the group has notes'); if (g.auto) applyAuto(g.auto, pts); else g.pend.push(pts); };
  K.duck = (name, t, dB, att = 0.03, hold = 0.3, rel = 0.3) => K.automate(name, [[t - att, 1], [t, db(dB)], [t + hold, db(dB)], [t + hold + rel, 1]]);
  K.gap = (name, t0, t1, depth = 0) => K.automate(name, [[t0 - 0.025, 1], [t0, depth], [t1 - 0.014, depth], [t1 - 0.002, 1]]);
  const isOff = (b) => !!((solo && !(solo.has(b.name) || solo.has(b.group))) || (mute && (mute.has(b.name) || mute.has(b.group))));
  const busOf = (K.bus = (name, o) => { if (typeof name !== 'string') return name; let b = buses[name]; if (!b) { b = buses[name] = { name, gain: 1, pan: 0, rev: 0, dly: 0, group: 'main' }; order.push(name); } if (o) Object.assign(b, o); b.off = isOff(b); return b; });
  // add n samples (mono L, or a stereo pair) at film second t
  const mixOut = (K.out = (bus, t, L, R, n, gain, pan) => { const b = busOf(bus); if (b.off) return; const g = group(b.group), A = autoOf(g); g.used = true;
    if (!dryL) { dryL = new Float32Array(N); dryR = new Float32Array(N); }
    const rv = b.rev, dl = b.dly; if (rv && !revL) { revL = new Float32Array(N); revR = new Float32Array(N); } if (dl && !dlyL) { dlyL = new Float32Array(N); dlyR = new Float32Array(N); }
    const i0 = round(t * SR), j1 = min(n, N - i0); let j = i0 < 0 ? -i0 : 0; if (j1 <= j) return;
    const p = clamp(pan === undefined || pan === null ? b.pan : pan, -1, 1), G = b.gain * (gain === undefined ? 1 : gain) * g.gain; let gl, gr;
    if (R) { gl = G * min(1, 1 - p); gr = G * min(1, 1 + p); } else { const a = ((p + 1) * PI) / 4; gl = G * cos(a); gr = G * sin(a); R = L; }
    while (j < j1) { const i = i0 + j, c = i >> 6, o = i & 63, a0 = A[c], a1 = A[c + 1], da = (a1 - a0) / 64, end = min(j1, j + 64 - o); let a = a0 + da * o;
      if (a0 === 0 && a1 === 0) { j = end; continue; }
      for (; j < end; j++) { const k = i0 + j, l = L[j] * gl * a, r = R[j] * gr * a; dryL[k] += l; dryR[k] += r; if (rv) { revL[k] += l * rv; revR[k] += r * rv; } if (dl) { dlyL[k] += l * dl; dlyR[k] += r * dl; } a += da; } } });
  const shots = new Map();   // one-shots (drum strokes, gongs) are rendered once and mixed many times
  const shot = (key, n, render) => { let s = shots.get(key); if (!s) { s = { b: new Float32Array(n), n }; render(s.b, n); shots.set(key, s); } return s; };
  const fadeEnd = (o, n, sec) => { const m = min(n, round(sec * SR)); for (let i = 0; i < m; i++) o[n - 1 - i] *= i / m; };

  // ══ modal bank: struck metal and skins.  parts = [[Hz, amp, tau s, rise s, struck share]…].  A partial with a rise
  //    comes up after the blow (the bloom of a gong); bend = how sharp everything starts (falls back with bendTau). ══
  const modal = (K.modal = (o, n, parts, opt) => { const bend = (opt && opt.bend) || 0, bTau = (opt && opt.bendTau) || 0.6, BL = 128;
    for (const p of parts) { const f = p[0]; if (f > SR * 0.46 || f * (1 + abs(bend)) > SR * 0.48) continue; let amp = p[1]; const dk = exp(-1 / (p[2] * SR)), rise = p[3] || 0, rk = rise > 0 ? exp(-1 / (rise * SR)) : 0; let rr = rise > 0 ? 1 - (p[4] === undefined ? 0 : p[4]) : 0, x = 0, y = 1;
      for (let i = 0; i < n; i += BL) { const w = (TAU * f * (1 + bend * exp(-i / SR / bTau))) / SR, c = cos(w), s = sin(w), e = min(n, i + BL);
        for (let j = i; j < e; j++) { o[j] += x * amp * (1 - rr); const x2 = x * c + y * s; y = y * c - x * s; x = x2; amp *= dk; rr *= rk; }
        const nr = 1.5 - 0.5 * (x * x + y * y); x *= nr; y *= nr; if (amp < 2e-6) break; } }
    return o; });

  // ══ drums: tuned skin modes with a pitch drop, a stick/hand noise burst, a body thump, a little saturation ══
  const DRUM = (K.DRUM = {
    buk: { f: 66, tau: 0.42, drop: 5, dropTau: 0.03, modes: [[1, 1, 1], [1.53, 0.5, 0.6], [2.14, 0.3, 0.45], [2.8, 0.16, 0.35], [3.5, 0.08, 0.3]], noise: [0.5, 850, 1.1, 0.014], body: [0.5, 170, 0.06], drive: 1.6, dur: 1.7 },       // 북: barrel drum
    kung: { f: 98, tau: 0.26, drop: 3, dropTau: 0.025, modes: [[1, 1, 1], [1.59, 0.35, 0.5], [2.3, 0.15, 0.4]], noise: [0.22, 520, 1, 0.012], body: [0.3, 220, 0.04], drive: 1.2, dur: 1.1 },                                          // 장구 궁편: the low skin
    deok: { f: 415, tau: 0.06, drop: 1.5, dropTau: 0.01, modes: [[1, 0.5, 1], [1.47, 0.36, 0.8], [2.09, 0.28, 0.6], [2.74, 0.5, 0.3], [6.9, 0.3, 0.2]], noise: [1.0, 2700, 1.3, 0.007], click: [0.7, 0.0016], drive: 1.3, dur: 0.4 },   // 장구 채편: bamboo stick on the thin skin
    taiko: { f: 58, tau: 0.6, drop: 7, dropTau: 0.05, modes: [[1, 1, 1], [1.5, 0.5, 0.6], [2.0, 0.3, 0.5], [2.6, 0.2, 0.4], [3.3, 0.12, 0.3]], noise: [0.6, 1200, 0.9, 0.012], body: [0.7, 140, 0.09], drive: 2.2, dur: 2.2 },
    tom: { f: 120, tau: 0.3, drop: 4, dropTau: 0.04, modes: [[1, 1, 1], [1.5, 0.3, 0.5], [2.2, 0.15, 0.4]], noise: [0.3, 1800, 1, 0.01], drive: 1.2, dur: 1.2 },
    frame: { f: 150, tau: 0.22, drop: 2, dropTau: 0.03, modes: [[1, 1, 1], [1.59, 0.5, 0.7], [2.14, 0.35, 0.6], [2.65, 0.2, 0.5], [3.16, 0.1, 0.4]], noise: [0.5, 2400, 0.8, 0.02], drive: 1.1, dur: 1 },
    rim: { f: 820, tau: 0.03, drop: 0, dropTau: 0.01, modes: [[1, 0.6, 1], [2.3, 0.5, 0.7], [3.9, 0.3, 0.5]], noise: [0.8, 3500, 1.5, 0.004], click: [0.8, 0.001], drive: 1.2, dur: 0.2 },
  });
  K.drum = (bus, t, kind, vel, o) => { const b = busOf(bus); if (b.off) return; vel = clamp(vel === undefined ? 0.7 : vel, 0.02, 1.2); const P = typeof kind === 'string' ? DRUM[kind] : kind, vq = round(vel * 24) / 24, vr = (round(t * 8) % 3 + 3) % 3;
    const key = 'drum|' + (typeof kind === 'string' ? kind : JSON.stringify(kind)) + '|' + vq + '|' + vr + '|' + ((o && o.tune) || 0), n = ceil(P.dur * SR);
    const s = shot(key, n, (y) => { const r = rng(seedOf(key)), x = buf(8, n), lv = log(vq), tune = exp(((o && o.tune) || 0) * LN12);
      for (const m of P.modes) { const f = P.f * tune * m[0] * (1 + (r() - 0.5) * 0.012), a = m[1] * exp(lv * (0.9 + (0.5 * log(m[0])) / LN2)), dk = exp(-1 / (P.tau * m[2] * (0.8 + 0.4 * vq) * SR)); let ph = 0, e = a, inc = f / SR;
        for (let i = 0; i < n; i++) { if ((i & 7) === 0) inc = (f * exp(P.drop * vq * exp(-i / SR / P.dropTau) * LN12)) / SR; ph += inc; if (ph >= 1) ph -= 1; y[i] += sin(TAU * ph) * e; e *= dk; if (e < 1e-6) break; } }
      if (P.noise) { const q = P.noise, m = min(n, ceil(q[3] * 12 * SR)), dk = exp(-1 / (q[3] * SR)); white(x, m, seedOf(key, 'n')); filt(x, m, bq('bp', q[1] * (0.8 + 0.4 * vq), q[2])); let e = q[0] * exp(lv * 1.4) * 2.5; for (let i = 0; i < m; i++) { y[i] += x[i] * e * min(1, i / 8); e *= dk; } }
      if (P.body) { const q = P.body, m = min(n, ceil(q[2] * 8 * SR)), dk = exp(-1 / (q[2] * SR)); white(x, m, seedOf(key, 'b')); filt(x, m, bq('lp', q[1], 0.9)); let e = q[0] * vq * 3; for (let i = 0; i < m; i++) { y[i] += x[i] * e * min(1, i / 30); e *= dk; } }
      if (P.click) { const q = P.click, m = min(n, ceil(q[1] * 10 * SR)), dk = exp(-1 / (q[1] * SR)); white(x, m + 1, seedOf(key, 'c')); let e = q[0] * exp(lv * 1.6); for (let i = 0; i < m; i++) { y[i] += (x[i + 1] - x[i]) * e; e *= dk; } }
      const dr = P.drive || 1, nd = 1 / tanh(dr); for (let i = 0; i < n; i++) y[i] = tanh(y[i] * dr) * nd; fadeEnd(y, n, 0.03); });
    mixOut(b, t, s.b, null, n, (o && o.gain) || 1, o && o.pan); };
  // 장구 strokes: 'deong' 덩 (both skins) · 'kung' 쿵 (low) · 'deok' 덕 (stick) · 'gideok' 기덕 (grace + stick) · 'deoreo' 더러러 (stick roll)
  K.janggu = (bus, t, stroke, vel) => { const b = busOf(bus), lo = b.pan - 0.18, hi = b.pan + 0.22; vel = vel === undefined ? 0.7 : vel;
    if (stroke === 'deong') { K.drum(b, t, 'kung', vel, { pan: lo }); K.drum(b, t, 'deok', vel * 0.85, { pan: hi }); }
    else if (stroke === 'kung') K.drum(b, t, 'kung', vel, { pan: lo });
    else if (stroke === 'deok') K.drum(b, t, 'deok', vel, { pan: hi });
    else if (stroke === 'gideok') { K.drum(b, t - 0.058, 'deok', vel * 0.45, { pan: hi }); K.drum(b, t, 'deok', vel, { pan: hi }); }
    else if (stroke === 'deoreo') for (let i = 0; i < 4; i++) K.drum(b, t + i * 0.052, 'deok', vel * (1 - i * 0.2), { pan: hi }); };

  // ══ struck metal: gongs, small gongs, bells, chimes — presets for the modal bank ══
  const METAL = (K.METAL = {
    // 징: large gong, soft mallet. Low pair beats slowly (맥놀이); the middle partials bloom after the blow; pitch settles downward
    jing: { f: 155.56, ratios: [1, 1.48, 2.0, 2.37, 2.93, 3.5, 3.96, 4.6, 5.1, 5.9, 6.7, 7.6, 8.7, 9.9, 11.3, 12.9, 14.6], slope: 0.8, tau: 2.7, tauPow: 0.8, beat: [0.45, 2.1], fund: 1.7, bloomFrom: 2, bloom: [0.2, 0.9], bloomGain: 2.4, strike: 0.22, bend: 0.014, bendTau: 0.9, velBright: 0.55, mallet: [0.45, 230, 0.03], sub: 0.18, dur: 12 },
    // 꽹과리: small bright hand gong, hard mallet
    kkwaenggwari: { f: 560, ratios: [1, 1.52, 2.07, 2.61, 3.3, 3.87, 4.56, 5.4, 6.3, 7.1, 8.2, 9.6, 11.2, 13.1], slope: 0.25, tau: 0.42, tauPow: 0.45, beat: [3, 14], bloomFrom: 99, bloom: [0, 0], strike: 1, bend: -0.008, bendTau: 0.12, velBright: 0.3, mallet: [0.5, 3600, 0.004], dur: 1.8 },
    // 풍경: the small bell at a temple eave
    chime: { f: 2100, ratios: [1, 2.71, 5.18, 8.4], slope: 1.1, tau: 0.9, tauPow: 0.6, beat: [1.5, 6], bloomFrom: 99, bloom: [0, 0], strike: 1, bend: 0, bendTau: 1, velBright: 0.4, mallet: [0.25, 6000, 0.002], dur: 3.2 },
    glass: { f: 1568, ratios: [1, 2.83, 5.42], slope: 2.0, tau: 1.6, tauPow: 0.5, beat: [0.6, 1.8], bloomFrom: 0, bloom: [0.012, 0.02], strike: 0.2, bend: 0, bendTau: 1, velBright: 0.3, dur: 5 },
    temple: { f: 110, ratios: [0.5, 1, 1.19, 1.5, 2, 2.52, 3.01, 4.1, 5.3, 6.7, 8.2], slope: 0.7, tau: 5, tauPow: 0.7, beat: [0.3, 1.2], bloomFrom: 99, bloom: [0, 0], strike: 1, bend: 0, bendTau: 1, velBright: 0.5, mallet: [0.6, 300, 0.02], dur: 16 },
    cymbal: { f: 410, ratios: [1, 1.34, 1.71, 2.17, 2.66, 3.13, 3.72, 4.2, 4.93, 5.6, 6.4, 7.3, 8.1, 9.3, 10.6, 12.2, 13.9, 15.8, 18, 20.5], slope: 0.05, tau: 1.4, tauPow: 0.5, beat: [5, 40], bloomFrom: 0, bloom: [0.01, 0.12], strike: 0.5, bend: 0, bendTau: 1, velBright: 0.5, dur: 5 },
  });
  // o: { preset, n | f, vel, len (cut the ring short), att (a slow swell instead of a blow), choke (seconds: damp by hand), pan, gain, seed }
  K.metal = (bus, t, o) => { const b = busOf(bus); if (b.off) return; const name = o.preset || 'jing', P = Object.assign({}, METAL[name], o), vel = clamp(P.vel === undefined ? 0.7 : P.vel, 0.02, 1.2), f0 = P.n !== undefined ? mtof(note(P.n)) : P.f, dur = min(P.dur, P.len || 99), n = ceil(dur * SR);
    const key = 'metal|' + name + '|' + f0.toFixed(2) + '|' + vel.toFixed(3) + '|' + dur + '|' + (P.att || 0) + '|' + (P.choke || 0) + '|' + (P.seed || 0);
    const s = shot(key, n, (y) => { const r = rng(seedOf('metal', name, P.seed || 0)), parts = [], lv = log(vel);
      P.ratios.forEach((ra, k) => { const lr = log(ra) / LN2, bl = k >= P.bloomFrom, a = exp(-P.slope * log(ra)) * exp(lv * (1 + P.velBright * lr)) * (0.6 + 0.8 * r()) * (bl ? P.bloomGain || 1 : 1) * (k === 0 ? P.fund || 1 : 1), tau = (P.tau / exp(P.tauPow * log(ra))) * (0.85 + 0.3 * r());
        const rise = bl ? P.bloom[0] + (P.bloom[1] - P.bloom[0]) * sat(lr / 3.6) * (0.7 + 0.6 * r()) : 0, bt = P.beat[0] + (P.beat[1] - P.beat[0]) * r(), f = f0 * ra, st = bl ? P.strike * (0.5 + 0.5 * vel) : 1;
        parts.push([f, a * 0.58, tau, rise, st], [f + bt, a * 0.42, tau * (0.88 + 0.24 * r()), rise * 1.25, st]); });
      if (P.sub) parts.push([f0 * 0.5, P.sub * vel, P.tau * 0.6, 0.05, 0.3]);
      modal(y, n, parts, { bend: P.bend * (0.35 + 0.65 * vel), bendTau: P.bendTau });
      if (P.mallet && !P.att) { const q = P.mallet, m = min(n, ceil(q[2] * 8 * SR)), x = buf(8, m), dk = exp(-1 / (q[2] * SR)); white(x, m, seedOf(key, 'm')); filt(x, m, bq('lp', q[1], 0.8)); let e = q[0] * vel * 2; for (let i = 0; i < m; i++) { y[i] += x[i] * e * min(1, i / 40); e *= dk; } }
      if (P.att) { const m = min(n, round(P.att * SR)); for (let i = 0; i < m; i++) { const u = i / m; y[i] *= u * u; } }
      if (P.choke) { const i0 = min(n, round(P.choke * SR)), dk = exp(-1 / (0.025 * SR)); let e = 1; for (let i = i0; i < n; i++) { y[i] *= e; e *= dk; } }
      const sc = 0.4; for (let i = 0; i < n; i++) y[i] *= sc; fadeEnd(y, n, min(0.5, dur * 0.2)); });
    mixOut(b, t, s.b, null, n, P.gain === undefined ? 1 : P.gain, P.pan); };
  K.gong = (bus, t, o) => K.metal(bus, t, Object.assign({ preset: 'jing' }, o));
  K.bell = (bus, t, o) => K.metal(bus, t, Object.assign({ preset: 'chime' }, o));
  // a flurry of small bells: { dur, count, notes:[midi…], vel, seed, spread, preset }
  K.chimes = (bus, t, o) => { const b = busOf(bus); if (b.off) return; const P = Object.assign({ dur: 2, count: 12, notes: [96, 99, 101, 103, 106], vel: 0.5, seed: 0, spread: 0.25, preset: 'chime', shape: 1.4 }, o), r = rng(seedOf('chimes', b.name, round(t * 1000), P.seed));
    for (let i = 0; i < P.count; i++) { const u = pow(r(), P.shape); K.metal(b, t + u * P.dur, { preset: P.preset, n: r.pick(P.notes), vel: P.vel * (0.45 + 0.55 * r()) * (1 - 0.5 * u), pan: clamp(b.pan + (r() * 2 - 1) * P.spread, -1, 1), seed: i % 5 }); } };

  // ══ plucked string: Karplus–Strong with a cubic fractional delay (so the pitch can bend), a loop low-pass for the
  //    damping of the string, a pick-position comb on the excitation and a resonant body ══
  const PLUCK = (K.PLUCK = {
    gayageum: { damp: 0.5, t60: 2.6, pick: 0.14, soft: 0.55, body: [[185, 2.5, 5], [410, 2.2, 4], [880, 2, 2.5]], thump: 0.5, hp: 70 },   // silk on paulownia: soft, quick to dull
    geomungo: { damp: 0.62, t60: 2.0, pick: 0.1, soft: 0.3, body: [[120, 2.5, 6], [300, 2, 4]], thump: 0.9, hp: 45 },
    guzheng: { damp: 0.2, t60: 5, pick: 0.1, soft: 0.15, body: [[220, 3, 3], [520, 3, 2]], thump: 0.15, hp: 80 },
    koto: { damp: 0.3, t60: 3.5, pick: 0.08, soft: 0.2, body: [[250, 3, 4], [600, 2.5, 3]], thump: 0.3, hp: 80 },
    harp: { damp: 0.25, t60: 6, pick: 0.38, soft: 0.6, body: [[160, 2, 2]], thump: 0.1, hp: 50 },
    guitar: { damp: 0.3, t60: 4, pick: 0.2, soft: 0.35, body: [[110, 3, 5], [220, 3, 3], [420, 2, 2]], thump: 0.25, hp: 70 },
  });
  // o: { preset, n | f, vel, bend: [[sec, semitones]…], vib: [cents, Hz, start s, grow s], stop (s: damp the string), dur, pan, gain }
  K.pluck = (bus, t, o) => { const b = busOf(bus); if (b.off) return; const P = Object.assign({}, PLUCK[o.preset || 'gayageum'], o), m = P.n !== undefined ? note(P.n) : ftom(P.f), f0 = mtof(m), vel = clamp(P.vel === undefined ? 0.7 : P.vel, 0.02, 1.2);
    const t60 = P.t60 * exp(-(m - 50) * 0.022), dur = min(P.dur || t60 * 1.1 + 0.25, 10), n = ceil(dur * SR), y = buf(0, n), seed = seedOf('pluck', b.name, round(t * 1000), m);
    const a = clamp(P.damp + (1 - vel) * 0.12, 0, 0.93), g = exp((-3 * LN10) / (f0 * t60)), lpd = a / (1 - a), L0 = SR / f0, M = 1 << ceil(log(L0 * 1.6 + 16) / LN2), mask = M - 1, dl = buf(1, M, true);
    const ne = ceil(L0) + 1, pd = max(1, round(L0 * P.pick)), ex = buf(2, ne + pd + 2, true), w = buf(3, ne), kc = 1 - exp((-TAU * min(9000, f0 * (2.5 + (1 - P.soft) * 16 * (0.35 + 0.65 * vel)))) / SR);
    white(w, ne, seed); let s1 = 0, s2 = 0, e2 = 0; for (let i = 0; i < ne; i++) { s1 += (w[i] - s1) * kc; s2 += (s1 - s2) * kc; const v = s2 * min(1, i / 6, (ne - i) / 6); ex[i] += v; ex[i + pd] -= v; e2 += v * v; }
    const sc = (0.5 * exp(1.15 * log(vel))) / sqrt(e2 / ne + 1e-12), nx = ne + pd + 1; for (let i = 0; i < nx; i++) ex[i] *= sc;
    const bend = P.bend, vib = P.vib, moving = !!(bend || vib), iStop = P.stop ? round(P.stop * SR) : n + 1; let Lr = L0 - 1 - lpd, dL = 0, wp = 0, s = 0, fb = 0;
    for (let i = 0; i < n; i++) {
      if (moving && (i & 15) === 0) { const tt = (i + 16) / SR; let st = bend ? at(bend, tt) : 0; if (vib && tt > vib[2]) st += (vib[0] / 100) * sstep((tt - vib[2]) / (vib[3] || 0.3)) * sin(TAU * vib[1] * (tt - vib[2])); dL = (L0 * exp(-st * LN12) - 1 - lpd - Lr) / 16; }
      const x = (i < nx ? ex[i] : 0) + fb; dl[wp] = x; y[i] = x; Lr += dL;
      const id = Lr | 0, d = Lr - id + 1, r0 = dl[(wp - id + 1) & mask], r1 = dl[(wp - id) & mask], r2 = dl[(wp - id - 1) & mask], r3 = dl[(wp - id - 2) & mask];
      const v = (-(d - 1) * (d - 2) * (d - 3) * r0) / 6 + (d * (d - 2) * (d - 3) * r1) / 2 - (d * (d - 1) * (d - 3) * r2) / 2 + (d * (d - 1) * (d - 2) * r3) / 6;
      s = v + (s - v) * a; fb = s * (i > iStop ? g * 0.992 : g); wp = (wp + 1) & mask; }
    if (P.thump) { const mT = min(n, round(0.05 * SR)), x = buf(3, mT), dk = exp(-1 / (0.009 * SR)); white(x, mT, seed + 5); lp1(x, mT, 280); let e = P.thump * vel * 2.2; for (let i = 0; i < mT; i++) { y[i] += x[i] * e * min(1, i / 20); e *= dk; } }
    if (P.body) for (const q of P.body) filt(y, n, bq('peak', q[0], q[1], q[2])); filt(y, n, bq('hp', P.hp || 60, 0.7)); fadeEnd(y, n, 0.04);
    mixOut(b, t, y, null, n, P.gain === undefined ? 1 : P.gain, P.pan); };

  // ══ a monophonic lead (flute, fiddle): one continuous pitch curve and one loudness curve for a whole phrase ══
  // notes: [{ t, d, n, v, tongue, glide, from, vib (cents), vibAt, vibHz, bend: [[u, st]…], sw: [[u, k]…], g: [st, sec] }]
  //   t is seconds from the phrase start.  Touching notes are slurred (the pitch glides, the tone does not stop) unless
  //   `tongue`.  `from` = where a tongued note starts (semitones off pitch); g = a grace note before it (꺾는 음 from above);
  //   bend = a pitch shape over the note (u 0..1); vibrato starts late (vibAt) and widens to `vib` cents (농현).
  const leadCurves = (notes, P, seed) => { const r = rng(seed), list = [];
    for (const q of notes) { const m = note(q.n); if (q.g) { const gd = min(q.g[1], q.d * 0.5); list.push(Object.assign({}, q, { n: m + q.g[0], d: gd, vib: 0, bend: null, sw: null, g: null })); list.push(Object.assign({}, q, { n: m, t: q.t + gd, d: q.d - gd, tongue: false, glide: q.gGlide || 0.035, g: null })); } else list.push(Object.assign({}, q, { n: m })); }
    list.sort((a, b) => a.t - b.t); let end = 0, top = 0;
    for (let i = 0; i < list.length; i++) { const q = list[i], nx = list[i + 1]; if (nx && nx.tongue && nx.t <= q.t + q.d + 0.01) q.d = max(0.03, nx.t - q.t - 0.04); end = max(end, q.t + q.d); top = max(top, q.n + (q.g ? q.g[0] : 0)); }
    const n = ceil((end + P.rel * 3 + 0.03) * SR), pit = buf(0, n), amp = buf(1, n), aux = buf(2, n), j1 = r() * TAU, j2 = r() * TAU, j3 = r() * TAU;
    const kAtt = 1 - exp(-3 / (P.att * SR)), kLeg = 1 - exp(-3 / (0.03 * SR)), kRel = 1 - exp(-3 / (P.rel * SR)), kch = exp(-1 / (0.035 * SR));
    let k = -1, cur = null, ps = list[0].n, tg = ps, kg = 1, a = 0, ka = kAtt, vd = 0, vph = r(), vhz = P.vibHz, chf = 0, legato = false;
    for (let i = 0; i < n; i += 32) { const t = i / SR;
      while (k + 1 < list.length && list[k + 1].t <= t) { k++; const q = list[k]; legato = !!cur && !q.tongue && q.t <= cur.t + cur.d + 0.012 && a > 0.01; cur = q;
        if (legato) kg = 1 - exp(-3 / (max(0.004, q.glide === undefined ? P.glide : q.glide) * SR));
        else { ps = q.n + (q.from === undefined ? P.from : q.from); kg = 1 - exp(-3 / (max(0.004, q.glide === undefined ? P.scoop : q.glide) * SR)); chf = max(chf, q.v === undefined ? 0.7 : q.v); vd = 0; } }
      let tgA = 0, tgV = vd;
      if (cur && t < cur.t + cur.d) { const q = cur, tau = t - q.t, u = tau / q.d, v = q.v === undefined ? 0.7 : q.v; tg = q.n + (q.bend ? at(q.bend, u) : 0);
        tgA = v * (q.sw ? at(q.sw, u) : 1 - P.swell + P.swell * sin(PI * sqrt(u))); if (legato && tau < 0.03) tgA *= 1 - P.legDip; ka = !legato && tau < P.att * 1.5 ? kAtt : kLeg;
        const vAt = q.vibAt === undefined ? min(P.vibAt, q.d * 0.45) : q.vibAt; tgV = (q.vib === undefined ? (q.d > 0.45 ? P.vib : P.vib * 0.2) : q.vib) * sstep((tau - vAt) / max(0.2, (q.d - vAt) * P.vibGrow)); vhz = q.vibHz || P.vibHz;
      } else ka = kRel;
      const jt = P.jit * (0.6 * sin(TAU * 0.31 * t + j1) + 0.4 * sin(TAU * 0.83 * t + j2)), vr = (vhz * (1 + 0.07 * sin(TAU * 0.23 * t + j3))) / SR, e = min(n, i + 32);
      for (let j = i; j < e; j++) { ps += (tg - ps) * kg; vd += (tgV - vd) * 0.003; vph += vr; if (vph >= 1) vph -= 1; pit[j] = ps + vd * 0.01 * sin(TAU * vph) + jt; a += (tgA - a) * ka; amp[j] = a; chf *= kch; aux[j] = chf; } }
    return { n, pit, amp, aux, top }; };

  // blown tube: harmonics (soft ↔ loud spectra cross-faded by loudness) + breath noise + a tonguing chiff + the buzz of
  // a vibrating membrane (대금의 청 / dizi mo): a pulse-like stack of upper harmonics through two fixed resonances,
  // let in only when the tone is loud, more so in the high register, and made uneven by a slow random rasp.
  const FLUTE = (K.FLUTE = {
    daegeum: { att: 0.07, rel: 0.14, glide: 0.07, scoop: 0.1, from: -0.6, legDip: 0.18, swell: 0.22, vib: 48, vibHz: 4.5, vibAt: 0.5, vibGrow: 0.75, jit: 0.05, soft: 2.0, loud: 1.25, harm: 26, breath: 0.15, chiff: 0.5, buzz: 0.55, buzzAt: 0.42, buzzF: [[2900, 2.2, 1], [4700, 2.6, 0.7]], flutter: 0.05, lp: 9500 },
    sogeum: { att: 0.04, rel: 0.1, glide: 0.05, scoop: 0.06, from: -0.4, legDip: 0.2, swell: 0.15, vib: 30, vibHz: 5.2, vibAt: 0.3, vibGrow: 0.7, jit: 0.04, soft: 2.8, loud: 1.6, harm: 14, breath: 0.12, chiff: 0.5, buzz: 0, buzzAt: 1, buzzF: [], flutter: 0.04, lp: 11000 },
    flute: { att: 0.05, rel: 0.1, glide: 0.04, scoop: 0.05, from: -0.2, legDip: 0.15, swell: 0.15, vib: 22, vibHz: 5.4, vibAt: 0.25, vibGrow: 0.5, jit: 0.03, soft: 2.8, loud: 1.7, harm: 16, breath: 0.09, chiff: 0.35, buzz: 0, buzzAt: 1, buzzF: [], flutter: 0.03, lp: 10000 },
    shakuhachi: { att: 0.09, rel: 0.2, glide: 0.1, scoop: 0.16, from: -1.2, legDip: 0.1, swell: 0.3, vib: 40, vibHz: 4.2, vibAt: 0.5, vibGrow: 0.8, jit: 0.08, soft: 2.2, loud: 1.4, harm: 18, breath: 0.32, chiff: 0.9, buzz: 0, buzzAt: 1, buzzF: [], flutter: 0.08, lp: 9000 },
    dizi: { att: 0.04, rel: 0.1, glide: 0.05, scoop: 0.06, from: -0.4, legDip: 0.2, swell: 0.15, vib: 28, vibHz: 5.5, vibAt: 0.3, vibGrow: 0.6, jit: 0.04, soft: 2.3, loud: 1.2, harm: 24, breath: 0.1, chiff: 0.45, buzz: 0.5, buzzAt: 0.2, buzzF: [[3400, 2.5, 1], [5600, 3, 0.6]], flutter: 0.04, lp: 11000 },
  });
  K.flute = (bus, t, notes, o) => { const b = busOf(bus); if (b.off || !notes.length) return; const P = Object.assign({}, FLUTE[(o && o.preset) || 'daegeum'], o), seed = seedOf('flute', b.name, round(t * 1000)), c = leadCurves(notes, P, seed), n = c.n, pit = c.pit, amp = c.amp, aux = c.aux;
    const y = buf(3, n), nz = buf(4, n), bz = buf(5, n), KH = max(2, min(P.harm, floor((0.45 * SR) / mtof(c.top + 1.5)))), A = new Float64Array(KH + 1), D = new Float64Array(KH + 1), W = new Float64Array(KH + 1);
    for (let k = 1; k <= KH; k++) { A[k] = exp(-P.soft * log(k)); D[k] = exp(-P.loud * log(k)) - A[k]; W[k] = k < 3 ? 0 : exp(-0.25 * log(k)); }
    white(nz, n, seed ^ 0x5bd1e995); filt(nz, n, bq('bp', P.breathF || 2300, 0.55)); filt(nz, n, bq('hp', 600, 0.7));
    let ph = rng(seed + 1)(), rs = 0, fl = 0, s = seed | 1; const bzOn = P.buzz > 0, bzSc = (P.buzz * 0.5) / sqrt(KH), br0 = P.breath, chK = P.chiff, flK = P.flutter * 60, bAt = P.buzzAt;
    for (let i = 0; i < n; i++) { const a = amp[i], ch = aux[i]; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; const w = s * 4.656612873077393e-10; rs += (w - rs) * 0.012; fl += (w - fl) * 0.0015;
      const p = pit[i], f = 440 * exp((p - 69) * LN12); ph += f / SR; if (ph >= 1) ph -= 1; if (a < 2e-5) { y[i] = 0; bz[i] = 0; continue; }
      const th = TAU * ph, s1 = sin(th), c2 = 2 * cos(th), br = a * a; let sk0 = 0, sk1 = s1, tone = s1 * (1 + D[1] * br), bzz = 0;
      for (let k = 2; k <= KH; k++) { const sk = c2 * sk1 - sk0; sk0 = sk1; sk1 = sk; tone += sk * (A[k] + D[k] * br); bzz += sk * W[k]; }
      y[i] = tone * a * (1 + flK * fl) + nz[i] * (br0 * (0.25 + 0.75 * a) * (0.75 + 0.25 * s1) + chK * ch * ch * 0.6) * (0.4 + 0.6 * min(1, a * 4));
      if (bzOn) { const u = (a - bAt) / 0.4, g = u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u), reg = 0.45 + 0.55 * sat((p - 72) / 12); bz[i] = bzz * a * g * reg * bzSc * (1 + 8 * rs); } }
    if (bzOn) { const z = buf(6, n); formants(bz, z, n, P.buzzF, 0); for (let i = 0; i < n; i++) y[i] += z[i]; }
    filt(y, n, bq('lp', P.lp, 0.7)); const sc = 0.42 * (P.gain === undefined ? 1 : P.gain); mixOut(b, t, y, null, n, sc, P.pan); };

  // bowed string: band-limited sawtooth, bow noise, a low-pass that opens with bow pressure, then the fixed resonances
  // of the instrument's body (the nasal box of a 해금, the rough low board of an 아쟁)
  const BOW = (K.BOW = {
    haegeum: { att: 0.09, rel: 0.12, glide: 0.11, scoop: 0.13, from: -0.8, legDip: 0.08, swell: 0.25, vib: 50, vibHz: 5.2, vibAt: 0.3, vibGrow: 0.7, jit: 0.07, noise: 0.07, rough: 0.08, form: [[480, 4, 0.5], [1050, 5, 1.0], [1900, 6, 0.7], [2800, 7, 0.5], [4100, 6, 0.2]], dry: 0.12, hp: 260, lp: 7500, bright: 0.75 },
    ajaeng: { att: 0.14, rel: 0.2, glide: 0.12, scoop: 0.16, from: -0.5, legDip: 0.05, swell: 0.3, vib: 35, vibHz: 4.4, vibAt: 0.4, vibGrow: 0.8, jit: 0.1, noise: 0.16, rough: 0.3, form: [[190, 3, 1], [420, 4, 0.8], [900, 4, 0.5], [1700, 5, 0.3], [2900, 5, 0.12]], dry: 0.3, hp: 45, lp: 4500, bright: 0.6 },
    erhu: { att: 0.08, rel: 0.12, glide: 0.09, scoop: 0.1, from: -0.5, legDip: 0.08, swell: 0.25, vib: 35, vibHz: 5.6, vibAt: 0.25, vibGrow: 0.6, jit: 0.05, noise: 0.05, rough: 0.05, form: [[420, 4, 0.7], [900, 5, 1.0], [1500, 6, 0.6], [2500, 7, 0.4], [3600, 6, 0.15]], dry: 0.18, hp: 220, lp: 7000, bright: 0.7 },
    cello: { att: 0.1, rel: 0.18, glide: 0.06, scoop: 0.06, from: -0.2, legDip: 0.06, swell: 0.2, vib: 22, vibHz: 5.4, vibAt: 0.25, vibGrow: 0.5, jit: 0.04, noise: 0.05, rough: 0.05, form: [[180, 3, 1], [300, 4, 0.8], [600, 4, 0.5], [1500, 5, 0.25], [2500, 5, 0.12]], dry: 0.45, hp: 55, lp: 5500, bright: 0.65 },
    violin: { att: 0.07, rel: 0.12, glide: 0.05, scoop: 0.05, from: -0.2, legDip: 0.06, swell: 0.2, vib: 25, vibHz: 5.8, vibAt: 0.2, vibGrow: 0.5, jit: 0.03, noise: 0.04, rough: 0.04, form: [[290, 4, 0.8], [520, 4, 0.8], [1100, 5, 0.5], [2600, 6, 0.5], [3800, 6, 0.2]], dry: 0.4, hp: 180, lp: 9000, bright: 0.75 },
  });
  K.bowed = (bus, t, notes, o) => { const b = busOf(bus); if (b.off || !notes.length) return; const P = Object.assign({}, BOW[(o && o.preset) || 'haegeum'], o), seed = seedOf('bow', b.name, round(t * 1000)), c = leadCurves(notes, P, seed), n = c.n, pit = c.pit, amp = c.amp, aux = c.aux;
    const x = buf(3, n), y = buf(4, n); let ph = rng(seed + 1)(), s = seed | 1, rs = 0, y1 = 0; const nzK = P.noise, rK = P.rough * 12, brK = P.bright;
    for (let i = 0; i < n; i++) { const a = amp[i]; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; const w = s * 4.656612873077393e-10; rs += (w - rs) * 0.01;
      const dt = (440 * exp((pit[i] - 69) * LN12)) / SR; ph += dt; if (ph >= 1) ph -= 1; let v = 2 * ph - 1; if (ph < dt) { const u = ph / dt; v -= u + u - u * u - 1; } else if (ph > 1 - dt) { const u = (ph - 1) / dt; v -= u * u + u + u + 1; }
      v = (v * (1 + rK * rs) + w * nzK * (1 + 4 * aux[i])) * a; y1 += (v - y1) * min(0.98, 0.05 + brK * a * (1.7 - 0.7 * a)); x[i] = y1; }
    formants(x, y, n, P.form, P.dry); filt(y, n, bq('hp', P.hp, 0.7)); filt(y, n, bq('lp', P.lp, 0.7));
    mixOut(b, t, y, null, n, 0.7 * (P.gain === undefined ? 1 : P.gain), P.pan); };

  // ══ ensembles: stacks of slightly detuned sawtooths, voices alternating left and right ══
  const ens = (L, R, n, notes, P, seed) => { L.fill(0, 0, n); R.fill(0, 0, n); const r = rng(seed), nv = P.voices, wide = P.width === undefined ? 0.7 : P.width, sc = 1 / sqrt(notes.length * nv); let vi = 0;
    for (const m of notes) { const f0 = mtof(note(m)); for (let v = 0; v < nv; v++, vi++) { const det = (nv > 1 ? (v / (nv - 1)) * 2 - 1 : 0) * P.detune + (r() - 0.5) * P.detune * 0.6, f = f0 * exp((det * LN12) / 100); if (f > SR * 0.4) continue;
        let ph = r(); const vp = r() * TAU, vr = (TAU * P.vibHz * (0.85 + 0.3 * r())) / SR, vdp = ((P.vib * LN12) / 100) * (0.6 + 0.8 * r()), side = vi & 1, gl = (side ? 1 - wide : 1) * sc, gr = (side ? 1 : 1 - wide) * sc; let dt = f / SR;
        for (let i = 0; i < n; i++) { if ((i & 31) === 0) dt = (f * (1 + vdp * sin(vp + vr * i))) / SR; ph += dt; if (ph >= 1) ph -= 1; let s = 2 * ph - 1; if (ph < dt) { const u = ph / dt; s -= u + u - u * u - 1; } else if (ph > 1 - dt) { const u = (ph - 1) / dt; s -= u * u + u + u + 1; } L[i] += s * gl; R[i] += s * gr; } } } };
  const VOWEL = (K.VOWEL = { ah: [[730, 7, 1], [1090, 9, 0.5], [2440, 12, 0.22], [3400, 12, 0.12], [4500, 10, 0.05]], oh: [[500, 7, 1], [850, 8, 0.5], [2500, 12, 0.12], [3350, 12, 0.07]], oo: [[330, 6, 1], [800, 8, 0.25], [2300, 12, 0.08], [3200, 12, 0.04]], ee: [[290, 6, 1], [2200, 12, 0.3], [3000, 12, 0.2], [3700, 12, 0.08]], mm: [[250, 5, 1], [1100, 8, 0.06]] });
  // o: { notes:[…], dur, vel, att, rel, vowel, voices, detune (cents), vib, vibHz, breath, env: [[u, k]…] }
  K.choir = (bus, t, o) => { const b = busOf(bus); if (b.off) return; const P = Object.assign({ dur: 3, vel: 0.6, att: 0.8, rel: 1.2, vowel: 'ah', voices: 4, detune: 14, vib: 18, vibHz: 5.3, breath: 0.04, width: 0.8 }, o), n = ceil((P.dur + P.rel) * SR), seed = seedOf('choir', b.name, round(t * 1000));
    const L = buf(0, n), R = buf(1, n), e = buf(2, n), x = buf(3, n), y = buf(4, n); ens(L, R, n, P.notes, P, seed); envASR(e, n, P.att, P.dur, P.rel); const F = typeof P.vowel === 'string' ? VOWEL[P.vowel] : P.vowel;
    for (let ch = 0; ch < 2; ch++) { const z = ch ? R : L; white(x, n, seed + 9 + ch); for (let i = 0; i < n; i++) { const u = i / n; x[i] = (z[i] + x[i] * P.breath) * e[i] * (P.env ? at(P.env, u) : 1); } lp1(x, n, 2200 + 5000 * P.vel); formants(x, y, n, F, 0.03); filt(y, n, bq('hp', 160, 0.7)); z.set(y.subarray(0, n)); }
    mixOut(b, t, L, R, n, P.vel * 2.2 * (P.gain === undefined ? 1 : P.gain), P.pan); };
  // strings / low brass pad, also short bowed stabs.  o: { notes, dur, vel, att, rel, voices, detune, vib, cut: Hz | [[sec, Hz]…], q, trem: [Hz, depth], env }
  K.strings = (bus, t, o) => { const b = busOf(bus); if (b.off) return; const P = Object.assign({ dur: 3, vel: 0.6, att: 0.4, rel: 0.6, voices: 3, detune: 9, vib: 7, vibHz: 5, cut: 1800, q: 0.8, width: 0.7 }, o), n = ceil((P.dur + P.rel) * SR), seed = seedOf('strings', b.name, round(t * 1000));
    const L = buf(0, n), R = buf(1, n), e = buf(2, n), fc = buf(3, n); ens(L, R, n, P.notes, P, seed); envASR(e, n, P.att, P.dur, P.rel); const isA = typeof P.cut !== 'number'; if (isA) curve(fc, n, P.cut, true);
    if (P.trem) for (let i = 0; i < n; i++) e[i] *= 1 - P.trem[1] * (0.5 + 0.5 * sin((TAU * P.trem[0] * i) / SR));
    if (P.env) for (let i = 0; i < n; i++) e[i] *= at(P.env, i / n);
    for (let ch = 0; ch < 2; ch++) { const z = ch ? R : L; for (let i = 0; i < n; i++) z[i] *= e[i]; svf(z, n, 'lp', isA ? fc : P.cut, P.q); filt(z, n, bq('peak', 260, 1.2, 2.5)); filt(z, n, bq('hp', P.hp || 35, 0.7)); }
    mixOut(b, t, L, R, n, P.vel * 0.9 * (P.gain === undefined ? 1 : P.gain), P.pan); };
  // a breathing low drone: a few harmonics whose levels wander, left and right tuned a hair apart
  K.drone = (bus, t, o) => { const b = busOf(bus); if (b.off) return; const P = Object.assign({ n: 39, dur: 10, vel: 0.5, att: 3, rel: 4, harm: 7, slope: 1.3, spread: 0.0007 }, o), n = ceil((P.dur + P.rel) * SR), f0 = mtof(note(P.n)), L = buf(0, n, true), R = buf(1, n, true), e = buf(2, n), r = rng(seedOf('drone', b.name, round(t * 1000))); envASR(e, n, P.att, P.dur, P.rel);
    for (let h = 1; h <= P.harm; h++) { const a = exp(-P.slope * log(h)) * (h === 2 ? 0.7 : 1), lf = 0.05 + 0.12 * r(), lp = r() * TAU, dp = 0.35 + 0.3 * r();
      for (let ch = 0; ch < 2; ch++) { const z = ch ? R : L, f = f0 * h * (1 + (ch ? P.spread : -P.spread)), w = (TAU * f) / SR, c = cos(w), s = sin(w); let x = sin(lp * (ch + 1)), y = cos(lp * (ch + 1)), g = a;
        for (let i = 0; i < n; i++) { if ((i & 127) === 0) { g = a * (1 - dp * (0.5 + 0.5 * sin((TAU * lf * i) / SR + lp + ch))); const nr = 1.5 - 0.5 * (x * x + y * y); x *= nr; y *= nr; } z[i] += x * g; const x2 = x * c + y * s; y = y * c - x * s; x = x2; } } }
    for (let i = 0; i < n; i++) { L[i] *= e[i]; R[i] *= e[i]; } mixOut(b, t, L, R, n, P.vel * 0.5, P.pan); };
  K.sub = (bus, t, o) => { const b = busOf(bus); if (b.off) return; const P = Object.assign({ f: 55, to: null, glide: 0.25, dur: 1, vel: 0.8, att: 0.01, rel: 0.3 }, o), n = ceil((P.dur + P.rel) * SR), y = buf(0, n), e = buf(1, n), f1 = P.to === null ? P.f : P.to; envASR(e, n, P.att, P.dur, P.rel); let ph = 0;
    for (let i = 0; i < n; i++) { ph += (f1 + (P.f - f1) * exp(-i / SR / P.glide)) / SR; if (ph >= 1) ph -= 1; y[i] = sin(TAU * ph) * e[i]; } mixOut(b, t, y, null, n, P.vel, P.pan); };
  // bowed glass: a pure ringing tone (thin-shell mode ratios), a slow pair beat; `to` = [[u, midi]…] lets it glide
  K.glass = (bus, t, o) => { const b = busOf(bus); if (b.off) return; const P = Object.assign({ n: 84, to: null, dur: 3, vel: 0.5, att: 0.6, rel: 1.5, ratios: [1, 2.83, 5.42], amps: [1, 0.2, 0.05], beat: 0.9, vib: 6, vibHz: 4.8 }, o), n = ceil((P.dur + P.rel) * SR), y = buf(0, n), e = buf(1, n), m0 = note(P.n); envASR(e, n, P.att, P.dur, P.rel);
    const ph = [0, 0, 0, 0, 0, 0], np = P.ratios.length; let pb = 0;
    for (let i = 0; i < n; i++) { const tt = i / SR, m = (P.to ? at(P.to, i / n) : m0) + (P.vib / 100) * sin(TAU * P.vibHz * tt), f = 440 * exp((m - 69) * LN12); let v = 0;
      for (let k = 0; k < np; k++) { const fk = f * P.ratios[k]; if (fk > SR * 0.45) break; ph[k] += fk / SR; if (ph[k] >= 1) ph[k] -= 1; v += sin(TAU * ph[k]) * P.amps[k]; }
      pb += (f + P.beat) / SR; if (pb >= 1) pb -= 1; y[i] = (v + sin(TAU * pb) * 0.6) * e[i]; }
    mixOut(b, t, y, null, n, P.vel * 0.35, P.pan); };

  // ══ sound effects ══
  // a bed that covers the whole film and loops without a seam: { colour, filters: [[type, Hz, Q, dB]…], level: [[t, k]…], gain, flutter, width, seed }
  K.bed = (bus, o) => { const b = busOf(bus); if (b.off) return; const P = Object.assign({ colour: 'pink', filters: [['lp', 1800, 0.7]], gain: 0.1, flutter: 0.2, width: 0.8, seed: 0 }, o), L = buf(0, N), R = buf(1, N), seed = seedOf('bed', b.name, P.seed), r = rng(seed), W = min(N, SR * 2);
    for (let ch = 0; ch < 2; ch++) { const z = ch ? R : L; white(z, N, seed + 1 + ch * 7919); colour(z, N, P.colour, W); for (const f of P.filters) filtC(z, N, bq(f[0], f[1], f[2], f[3])); }
    const w = P.width, p1 = r() * TAU, p2 = r() * TAU, p3 = r() * TAU, fl = P.flutter, lev = P.level, cycles = max(1, round(DUR / 9)); let g = 1;
    for (let i = 0; i < N; i++) { if ((i & 63) === 0) { const u = i / N; g = (1 + fl * (0.5 * sin(TAU * cycles * u + p1) + 0.3 * sin(TAU * (cycles * 2 + 1) * u + p2) + 0.2 * sin(TAU * (cycles * 5 + 2) * u + p3))) * (lev ? at(lev, i / SR) : 1); }
      const l = L[i], rr = R[i]; L[i] = (l * (1 + w) * 0.5 + rr * (1 - w) * 0.5) * g; R[i] = (rr * (1 + w) * 0.5 + l * (1 - w) * 0.5) * g; }
    mixOut(b, 0, L, R, N, P.gain); };
  // wind keyed by a level curve [[film second, 0..1]…]: gusting band of noise, a low rumble, whistling resonances in the gusts
  K.wind = (bus, t, o) => { const b = busOf(bus); if (b.off) return; const P = Object.assign({ dur: 10, level: [[0, 0.5]], f: [260, 900], q: 1.4, gustHz: 0.3, whistle: 0.25, rumble: 0.5, gain: 1, seed: 0 }, o), n = ceil(P.dur * SR), seed = seedOf('wind', b.name, P.seed);
    const L = buf(0, n), R = buf(1, n), lev = buf(2, n), gu = buf(3, n), fc = buf(4, n), x = buf(5, n); curve(lev, n, P.level.map((p) => [p[0] - t, p[1]]), true); lfo(gu, n, P.gustHz, seed + 1, 0, 1);
    for (let i = 0; i < n; i++) { const g = gu[i], l = lev[i]; fc[i] = P.f[0] + (P.f[1] - P.f[0]) * (0.2 + 0.8 * g) * (0.4 + 0.6 * l); gu[i] = l * (0.3 + 0.7 * g * sqrt(g)); }
    for (let ch = 0; ch < 2; ch++) { const z = ch ? R : L; white(x, n, seed + 11 + ch * 31); colour(x, n, 'pink'); svf(x, n, 'bp', fc, P.q, z); for (let i = 0; i < n; i++) z[i] *= gu[i] * 2.2;
      if (P.rumble) { white(x, n, seed + 51 + ch); colour(x, n, 'brown'); filt(x, n, bq('lp', 130, 0.7)); for (let i = 0; i < n; i++) { const l = lev[i]; z[i] += x[i] * l * sqrt(l) * P.rumble; } } }
    if (P.whistle) { lfo(fc, n, P.gustHz * 1.7, seed + 3, 950, 2050); white(x, n, seed + 77); svf(x, n, 'bp', fc, 22); for (let i = 0; i < n; i++) { const g = gu[i], w = x[i] * g * g * P.whistle * 6; L[i] += w * 0.8; R[i] += w * 0.6; } }
    mixOut(b, t, L, R, n, P.gain); };
  // rain keyed by a level curve: a hiss, the patter of single drops, and the low roar of a downpour
  K.rain = (bus, t, o) => { const b = busOf(bus); if (b.off) return; const P = Object.assign({ dur: 10, level: [[0, 0.5]], gain: 1, drops: 900, seed: 0 }, o), n = ceil(P.dur * SR), seed = seedOf('rain', b.name, P.seed);
    const L = buf(0, n), R = buf(1, n), lev = buf(2, n), x = buf(3, n), y = buf(4, n); curve(lev, n, P.level.map((p) => [p[0] - t, p[1]]), true);
    for (let ch = 0; ch < 2; ch++) { const z = ch ? R : L; white(x, n, seed + 1 + ch * 53); filt(x, n, bq('hp', 1700, 0.7)); filt(x, n, bq('peak', 6000, 0.8, 5)); filt(x, n, bq('lp', 11500, 0.7)); for (let i = 0; i < n; i++) z[i] = x[i] * lev[i] * 0.45;
      let s = (seed + 99 + ch * 131) | 1; const rate = P.drops / SR; for (let i = 0; i < n; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; if ((s >>> 0) / 4294967296 < lev[i] * rate) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; const u = s * 4.656612873077393e-10; x[i] = u * abs(u) * 5; } else x[i] = 0; }
      filt(x, n, bq('bp', 3200, 2.2), y); for (let i = 0; i < n; i++) z[i] += y[i]; filt(x, n, bq('bp', 1300, 1.8), y); for (let i = 0; i < n; i++) z[i] += y[i] * 0.8;
      white(x, n, seed + 7 + ch * 17); colour(x, n, 'pink'); filt(x, n, bq('bp', 600, 0.7)); for (let i = 0; i < n; i++) { const l = lev[i]; z[i] += x[i] * l * l * 0.9; } }
    mixOut(b, t, L, R, n, P.gain); };
  // thunder: { dist 0 (overhead: a sharp crack first) … 1 (far: only the roll), dur, vel, width, seed }
  K.thunder = (bus, t, o) => { const b = busOf(bus); if (b.off) return; const P = Object.assign({ dist: 0.2, dur: 5, vel: 1, width: 0.85, seed: 0 }, o), n = ceil(P.dur * SR), seed = seedOf('thunder', b.name, round(t * 1000), P.seed), r = rng(seed), near = 1 - P.dist;
    const L = buf(0, n), R = buf(1, n), env = buf(2, n, true), x = buf(3, n), fc = buf(4, n), nb = 5 + floor(r() * 4);
    for (let k = 0; k < nb; k++) { const tb = k === 0 ? 0.02 * P.dist : 0.08 + pow(r(), 1.3) * P.dur * 0.55, ab = k === 0 ? 1 : (0.35 + 0.65 * r()) * exp(-tb / (P.dur * 0.3)), rise = (0.012 + 0.2 * r() * (k ? 1 : 0)) * (0.4 + P.dist), dec = (0.5 + 0.9 * r()) * (0.6 + 0.6 * P.dist), kr = exp(-1 / (rise * SR)), kd = exp(-1 / (dec * SR)); let a = 1, d = 1;
      for (let i = round(tb * SR); i < n; i++) { env[i] += ab * (1 - a) * d; a *= kr; d *= kd; if (d < 1e-4) break; } }
    const f0 = 250 + 900 * near * near; for (let i = 0; i < n; i++) fc[i] = 85 + f0 * exp(-i / SR / 1.1);
    for (let ch = 0; ch < 2; ch++) { const z = ch ? R : L; white(x, n, seed + 3 + ch * 71); colour(x, n, 'brown'); svf(x, n, 'lp', fc, 0.7, z); for (let i = 0; i < n; i++) z[i] *= env[i] * 2.4; }
    const w = P.width; for (let i = 0; i < n; i++) { const l = L[i], rr = R[i]; L[i] = l * (1 + w) * 0.5 + rr * (1 - w) * 0.5; R[i] = rr * (1 + w) * 0.5 + l * (1 - w) * 0.5; }
    let ph = 0; const kb = exp(-1 / (1.3 * SR)); let eb = 0.7 * (0.3 + 0.7 * near); for (let i = 0; i < n; i++) { ph += (31 + 20 * exp(-i / SR / 0.4)) / SR; if (ph >= 1) ph -= 1; const v = sin(TAU * ph) * eb * min(1, i / 300); L[i] += v; R[i] += v; eb *= kb; }
    if (near > 0.3) { const nc = 3 + floor(r() * 4), hp = bq('hp', 1400, 0.7), m = min(n, round(0.7 * SR)), y = buf(5, m);   // the crack: a few sharp bursts, then tearing
      for (let k = 0; k < nc; k++) { const tc = k === 0 ? 0 : 0.015 + r() * 0.2, a = (k === 0 ? 1 : 0.35 + 0.5 * r()) * near * near * 1.6, tau = 0.006 + 0.02 * r(), len = min(n - round(tc * SR), ceil(tau * 9 * SR)), pn = (r() * 2 - 1) * w, i0 = round(tc * SR), dk = exp(-1 / (tau * SR)); if (len <= 0) continue;
        white(x, len, seed + 100 + k); filt(x, len, hp); let e = a; const gl = cos(((pn + 1) * PI) / 4) * 1.414, gr = sin(((pn + 1) * PI) / 4) * 1.414; for (let i = 0; i < len; i++) { const v = x[i] * e; L[i0 + i] += v * gl; R[i0 + i] += v * gr; e *= dk; } }
      white(x, m, seed + 200); filt(x, m, bq('bp', 2400, 0.7)); lfo(y, m, 70, seed + 201, 0, 1); const kt = exp(-1 / (0.16 * SR)); let e = 0.8 * near * near; for (let i = 0; i < m; i++) { const g = y[i], v = x[i] * e * g * g * g * 2; L[i] += v; R[i] += v * (0.6 + 0.4 * g); e *= kt; } }
    mixOut(b, t, L, R, n, P.vel); };
  // a band of noise that moves: breakpoint curves over u = 0..1 for frequency, level and pan.  The parent of whoosh, spray, breath.
  // o: { dur, colour, mode, f: Hz | [[u, Hz]…], q, env: [[u, k]…], shape, pan: p | [[u, p]…], width, grain, grainHz, f2, q2, g2, gain, seed }
  K.sweep = (bus, t, o) => { const b = busOf(bus); if (b.off) return; const P = Object.assign({ dur: 1, colour: 'white', mode: 'bp', f: 1000, q: 1.5, env: [[0, 0], [0.5, 1], [1, 0]], shape: 1, pan: 0, width: 0.5, grain: 0, grainHz: 30, gain: 1, seed: 0 }, o), n = ceil(P.dur * SR), seed = seedOf('sweep', b.name, round(t * 1000), P.seed);
    const L = buf(0, n), R = buf(1, n), fc = buf(2, n), ev = buf(3, n), x = buf(4, n), pn = buf(5, n), f2 = buf(6, n), y = buf(7, n), sc = (pts) => pts.map((p) => [p[0] * P.dur, p[1]]);
    curve(ev, n, sc(P.env), true); if (P.shape !== 1) for (let i = 0; i < n; i++) ev[i] = pow(ev[i], P.shape);
    if (P.grain) { lfo(x, n, P.grainHz, seed + 7, 0, 1); for (let i = 0; i < n; i++) ev[i] *= 1 - P.grain + P.grain * x[i] * x[i] * 2; }
    const isF = typeof P.f !== 'number', is2 = P.f2 !== undefined && typeof P.f2 !== 'number'; if (isF) curve(fc, n, sc(P.f), true); if (is2) curve(f2, n, sc(P.f2), true);
    for (let ch = 0; ch < 2; ch++) { const z = ch ? R : L; white(x, n, seed + 1 + ch * 977); colour(x, n, P.colour); svf(x, n, P.mode, isF ? fc : P.f, P.q, z); if (P.f2 !== undefined) { svf(x, n, 'bp', is2 ? f2 : P.f2, P.q2 || 2, y); const g2 = P.g2 === undefined ? 0.5 : P.g2; for (let i = 0; i < n; i++) z[i] += y[i] * g2; } }
    const w = P.width, isP = typeof P.pan !== 'number'; if (isP) curve(pn, n, sc(P.pan), true); let gl = 1, gr = 1; if (!isP) { const a = ((clamp(P.pan, -1, 1) + 1) * PI) / 4; gl = cos(a) * 1.414; gr = sin(a) * 1.414; }
    for (let i = 0; i < n; i++) { if (isP && (i & 15) === 0) { const a = ((clamp(pn[i], -1, 1) + 1) * PI) / 4; gl = cos(a) * 1.414; gr = sin(a) * 1.414; } const l = L[i], rr = R[i], e = ev[i]; L[i] = (l * (1 + w) * 0.5 + rr * (1 - w) * 0.5) * e * gl; R[i] = (rr * (1 + w) * 0.5 + l * (1 - w) * 0.5) * e * gr; }
    mixOut(b, t, L, R, n, P.gain, 0); };
  // something fast passes: the band rises to the pass and falls after it (a touch of Doppler); pan runs from → to
  K.whoosh = (bus, t, o) => { const P = Object.assign({ dur: 1.4, from: -1, to: 1, f: 900, vel: 0.8, peak: 0.5 }, o), pk = P.peak;
    K.sweep(bus, t, { dur: P.dur, colour: 'pink', mode: 'bp', f: [[0, P.f * 0.45], [pk, P.f * 1.9], [pk + 0.12, P.f * 1.15], [1, P.f * 0.4]], q: 1.1, env: [[0, 0], [pk, 1], [1, 0]], shape: 2.2, pan: [[0, P.from], [pk - 0.15, P.from * 0.7], [pk + 0.15, P.to * 0.7], [1, P.to]], width: 0.3, f2: [[0, P.f * 2.5], [pk, P.f * 6], [1, P.f * 1.8]], q2: 1.4, g2: 0.35, gain: P.vel * 3, seed: P.seed || 0 });
    K.sweep(bus, t, { dur: P.dur, colour: 'brown', mode: 'lp', f: [[0, 90], [pk, 260], [1, 70]], q: 0.8, env: [[0, 0], [pk, 1], [1, 0]], shape: 2.6, pan: [[0, P.from * 0.5], [1, P.to * 0.5]], width: 0.2, gain: P.vel * 2, seed: (P.seed || 0) + 1 }); };
  K.spray = (bus, t, o) => { const P = Object.assign({ dur: 2.5, vel: 0.6, from: -0.3, to: 0.4, f: 4200 }, o); K.sweep(bus, t, { dur: P.dur, colour: 'white', mode: 'hp', f: [[0, P.f * 0.7], [0.3, P.f], [1, P.f * 1.3]], q: 0.8, env: [[0, 0], [0.12, 1], [0.5, 0.75], [1, 0]], shape: 1.3, grain: 0.45, grainHz: 38, pan: [[0, P.from], [1, P.to]], width: 0.9, f2: [[0, 1400], [0.3, 2200], [1, 1100]], q2: 0.9, g2: 0.5, gain: P.vel * 1.2, seed: P.seed || 0 }); };
  K.breath = (bus, t, o) => { const P = Object.assign({ dur: 2.4, vel: 0.5, f: 190, pan: 0 }, o); K.sweep(bus, t, { dur: P.dur, colour: 'pink', mode: 'bp', f: [[0, P.f * 0.8], [0.45, P.f * 1.35], [1, P.f * 0.7]], q: 1.2, env: [[0, 0], [0.42, 1], [0.55, 0.85], [1, 0]], shape: 1.6, pan: P.pan, width: 0.6, f2: [[0, 520], [0.45, 820], [1, 430]], q2: 2.5, g2: 0.4, gain: P.vel * 5, seed: P.seed || 0 }); };
  // bubbles and drips: short sine chirps that rise as they ring.  { dur, count, f: [lo, hi], vel, rise, shape, spread, seed }
  K.bubbles = (bus, t, o) => { const b = busOf(bus); if (b.off) return; const P = Object.assign({ dur: 1, count: 20, f: [300, 1800], vel: 0.5, rise: 0.45, shape: 1, spread: 0.6, seed: 0 }, o), n = ceil((P.dur + 0.3) * SR), L = buf(0, n, true), R = buf(1, n, true), r = rng(seedOf('bubbles', b.name, round(t * 1000), P.seed));
    for (let c = 0; c < P.count; c++) { const i0 = round(pow(r(), P.shape) * P.dur * SR), f0 = P.f[0] * exp(r() * log(P.f[1] / P.f[0])), tau = 5 / f0 + 0.003, len = min(n - i0, ceil(tau * 7 * SR)), a = P.vel * (0.3 + 0.7 * r() * r()), pn = ((r() * 2 - 1) * P.spread + 1) * PI / 4, gl = cos(pn) * 1.414, gr = sin(pn) * 1.414, dk = exp(-1 / (tau * SR)), kr = exp(-1 / (tau * 1.5 * SR)); let ph = 0, e = a, q = 1;
      for (let j = 0; j < len; j++) { ph += (f0 * (1 + P.rise * (1 - q))) / SR; if (ph >= 1) ph -= 1; const v = sin(TAU * ph) * e * min(1, j / 24); L[i0 + j] += v * gl; R[i0 + j] += v * gr; e *= dk; q *= kr; } }
    mixOut(b, t, L, R, n, 1); };
  K.drip = (bus, t, o) => K.bubbles(bus, t, Object.assign({ dur: 0.01, count: 1, f: [900, 1500], vel: 0.4, spread: 0 }, o));
  // a body breaks the water: thump, a band of noise sweeping down, spray falling back, bubbles.  { size 0..1.5, dur, pan, seed }
  K.splash = (bus, t, o) => { const P = Object.assign({ size: 1, dur: 2.6, pan: 0, seed: 0 }, o), z = P.size;
    K.sweep(bus, t, { dur: 0.3 + 0.5 * z, colour: 'brown', mode: 'lp', f: [[0, 320], [1, 80]], q: 0.8, env: [[0, 0], [0.04, 1], [1, 0]], shape: 1.5, gain: 2.2 * z, width: 0.25, pan: P.pan, seed: P.seed });
    K.sweep(bus, t, { dur: P.dur * 0.6, colour: 'white', mode: 'bp', f: [[0, 5200], [0.25, 2400], [1, 500]], q: 0.9, env: [[0, 0], [0.012, 1], [0.2, 0.55], [1, 0]], shape: 1.6, gain: 1.5 * z, width: 0.8, pan: P.pan, seed: P.seed + 1 });
    K.sweep(bus, t + 0.05, { dur: P.dur, colour: 'white', mode: 'hp', f: [[0, 3000], [1, 5200]], q: 0.7, env: [[0, 0], [0.08, 0.7], [0.3, 1], [1, 0]], shape: 1.3, grain: 0.6, grainHz: 45, gain: 0.55 * z, width: 1, pan: P.pan, seed: P.seed + 2 });
    K.bubbles(bus, t + 0.08, { dur: P.dur * 0.7, count: round(26 * z), f: [240, 1500], vel: 0.22 * z, seed: P.seed, shape: 1.5 });
    K.sub(bus, t, { f: 72, to: 36, glide: 0.12, dur: 0.35 * z, vel: 0.9 * min(1, z), att: 0.004, rel: 0.25 }); };
  // something long moves under water: a slow low swell with a few deep bubbles
  K.surge = (bus, t, o) => { const P = Object.assign({ dur: 4, vel: 0.6, pan: 0, seed: 0 }, o);
    K.sweep(bus, t, { dur: P.dur, colour: 'brown', mode: 'bp', f: [[0, 70], [0.45, 210], [1, 85]], q: 1.1, env: [[0, 0], [0.4, 1], [1, 0]], shape: 1.5, pan: [[0, P.pan - 0.3], [1, P.pan + 0.3]], width: 0.5, f2: [[0, 300], [0.5, 620], [1, 260]], q2: 1.6, g2: 0.3, gain: P.vel * 7, seed: P.seed });
    K.bubbles(bus, t + P.dur * 0.25, { dur: P.dur * 0.6, count: 9, f: [140, 520], vel: P.vel * 0.25, seed: P.seed, spread: 0.4 }); K.sub(bus, t + P.dur * 0.1, { f: 41, to: 52, glide: P.dur * 0.4, dur: P.dur * 0.5, vel: P.vel * 0.35, att: P.dur * 0.3, rel: P.dur * 0.35 }); };
  // a creature's voice: sawtooth + its lower octave with jitter and an irregular flutter (the growl), breath noise
  // pulsed with it, a mouth that opens and closes (moving formants), then a ring of bright harmonics that outlasts it.
  // o: { dur, f (Hz), contour: [[u, st]…], open: [[u, 0..1]…], rough, vel, tail (level), tailDur, harmonics: [n…], pan, seed }
  K.roar = (bus, t, o) => { const b = busOf(bus); if (b.off) return; const P = Object.assign({ dur: 2.2, f: 58.27, contour: [[0, -4], [0.1, 0], [0.4, 2], [0.75, 0], [1, -7]], open: [[0, 0.15], [0.12, 1], [0.6, 0.85], [1, 0.1]], rough: 0.6, vel: 1, tail: 0.5, tailDur: 2.5, harmonics: [8, 12, 16, 24], seed: 0 }, o);
    const nd = ceil(P.dur * SR), n = ceil((P.dur + P.tailDur) * SR), seed = seedOf('roar', b.name, round(t * 1000), P.seed), r = rng(seed), y = buf(0, n, true), x = buf(1, n), e = buf(2, n), jt = buf(3, n), am = buf(4, n), fc = buf(5, n), z = buf(6, n), nz = buf(7, n);
    lfo(jt, nd, 38, seed + 1, -1, 1); lfo(am, nd, 31, seed + 2, 0, 1); white(nz, nd, seed + 3); colour(nz, nd, 'pink'); curve(e, nd, [[0, 0], [0.07, 0.8], [P.dur * 0.3, 1], [P.dur * 0.7, 0.8], [P.dur, 0]], true);
    let p1 = 0, p2 = r(), p3 = r(); for (let i = 0; i < nd; i++) { const u = i / nd, f = P.f * exp((at(P.contour, u) + jt[i] * P.rough * 1.4) * LN12), d1 = f / SR, d2 = (f * 0.5007) / SR, d3 = (f * 1.498) / SR; p1 += d1; if (p1 >= 1) p1 -= 1; p2 += d2; if (p2 >= 1) p2 -= 1; p3 += d3; if (p3 >= 1) p3 -= 1;
      let s = 2 * p1 - 1; if (p1 < d1) { const q = p1 / d1; s -= q + q - q * q - 1; } else if (p1 > 1 - d1) { const q = (p1 - 1) / d1; s -= q * q + q + q + 1; }
      let s2 = 2 * p2 - 1; if (p2 < d2) { const q = p2 / d2; s2 -= q + q - q * q - 1; } else if (p2 > 1 - d2) { const q = (p2 - 1) / d2; s2 -= q * q + q + q + 1; }
      const g = am[i], fl = 1 - P.rough * 0.75 * g * g; x[i] = ((s + 0.75 * s2 + 0.3 * (2 * p3 - 1)) * fl + nz[i] * (0.9 + 0.9 * (1 - p1)) * (0.5 + P.rough)) * e[i]; }
    const F = [[260, 340, 5, 1], [720, 520, 5, 0.8], [2000, 450, 6, 0.4], [3100, 300, 7, 0.22]];
    for (const q of F) { for (let i = 0; i < nd; i++) fc[i] = q[0] + q[1] * at(P.open, i / nd); svf(x, nd, 'bp', fc, q[2], z); for (let i = 0; i < nd; i++) y[i] += z[i] * q[3]; }
    lp1(x, nd, 150, z); for (let i = 0; i < nd; i++) y[i] = tanh((y[i] + z[i] * 0.5) * 2.6) * 0.8;
    let ps = 0; for (let i = 0; i < nd; i++) { ps += (P.f * exp(at(P.contour, i / nd) * LN12)) / SR; if (ps >= 1) ps -= 1; y[i] += sin(TAU * ps) * e[i] * 0.5; }
    if (P.tail) { const i0 = round(P.dur * 0.28 * SR), parts = []; for (const h of P.harmonics) { const f = P.f * h; parts.push([f, (0.6 * P.tail) / sqrt(h / 8), P.tailDur * 0.3 * (0.8 + 0.4 * r()), P.dur * 0.3, 0], [f * 1.0016 + 0.7, (0.4 * P.tail) / sqrt(h / 8), P.tailDur * 0.28, P.dur * 0.36, 0]); }
      modal(y.subarray(i0, n), n - i0, parts, null); white(x, n - i0, seed + 9); filt(x, n - i0, bq('hp', 5000, 0.7)); const kr = exp(-1 / (P.dur * 0.25 * SR)), kd = exp(-1 / (P.tailDur * 0.22 * SR)); let a = 1, d = 0.05; for (let i = i0; i < n; i++) { y[i] += x[i - i0] * (1 - a) * d; a *= kr; d *= kd; } }
    fadeEnd(y, n, 0.3); mixOut(b, t, y, null, n, P.vel, P.pan); };
  // a cloud of tiny pure pings.  { dur, notes, density (per second), range: [[u, octave shift]…], env: [[u, k]…], ring, vel, seed }
  K.shimmer = (bus, t, o) => { const b = busOf(bus); if (b.off) return; const P = Object.assign({ dur: 4, notes: [87, 90, 94, 96, 99], density: 14, range: [[0, 0], [1, 0]], env: [[0, 0], [0.3, 1], [1, 0]], ring: 0.35, vel: 0.4, seed: 0, spread: 0.9 }, o), n = ceil((P.dur + P.ring * 6) * SR), L = buf(0, n, true), R = buf(1, n, true), r = rng(seedOf('shimmer', b.name, round(t * 1000), P.seed)), cnt = round(P.dur * P.density);
    for (let c = 0; c < cnt; c++) { const u = (c + r()) / cnt, i0 = round(u * P.dur * SR), m = r.pick(P.notes) + 12 * round(at(P.range, u) + (r() - 0.5) * 1.2), f = mtof(m); if (f > SR * 0.42) continue;
      const tau = P.ring * (0.5 + r()) * min(1, 2000 / f + 0.3), len = min(n - i0, ceil(tau * 6 * SR)), a = P.vel * at(P.env, u) * (0.3 + 0.7 * r()), pn = ((r() * 2 - 1) * P.spread + 1) * PI / 4, gl = cos(pn), gr = sin(pn), w = (TAU * f) / SR, cw = cos(w), sw = sin(w), dk = exp(-1 / (tau * SR)); let x = 0, y = 1, e = a;
      for (let j = 0; j < len; j++) { const v = x * e * min(1, j / 40); L[i0 + j] += v * gl; R[i0 + j] += v * gr; const x2 = x * cw + y * sw; y = y * cw - x * sw; x = x2; e *= dk; } }
    mixOut(b, t, L, R, n, 1); };

  // ══ returns ══
  const REV = (K.REVERB = {
    valley: { rt: 4.2, pre: 0.045, damp: 5200, lowcut: 170, size: 1.25, echoes: [[0.19, 0.2, -0.6], [0.31, 0.15, 0.7], [0.47, 0.1, -0.3], [0.66, 0.06, 0.4]] },   // a wide mountain valley: long, with slaps off the far walls
    hall: { rt: 2.6, pre: 0.025, damp: 6500, lowcut: 120, size: 1.0, echoes: [] },
    room: { rt: 0.9, pre: 0.008, damp: 8000, lowcut: 100, size: 0.55, echoes: [] },
    cave: { rt: 6.5, pre: 0.06, damp: 3200, lowcut: 90, size: 1.5, echoes: [[0.24, 0.25, 0.5], [0.41, 0.2, -0.5]] },
  });
  // feedback delay network: 8 lines, Householder mixing, a low-pass in every loop (highs die first), pre-delay,
  // two all-pass diffusers a side on the way in, discrete early echoes
  const fdn = (iL, iR, oL, oR, nIn, nOut, P) => { const NL = 8, len = [1447, 1789, 2111, 2503, 2903, 3323, 3847, 4409].map((v) => round(v * P.size) | 1), line = len.map((l) => new Float32Array(l)), idx = new Int32Array(NL), lp = new Float64Array(NL), v = new Float64Array(NL), g = len.map((l) => exp((-3 * LN10 * l) / (SR * P.rt)));
    const d = exp((-TAU * P.damp) / SR), d1 = 1 - d, hc = 1 - exp((-TAU * P.lowcut) / SR), ech = (P.echoes || []).map((e) => [round(e[0] * SR), e[1] * cos(((e[2] + 1) * PI) / 4) * 1.414, e[1] * sin(((e[2] + 1) * PI) / 4) * 1.414]);
    const pre = max(1, round(P.pre * SR)), RN = 1 << ceil(log(max(pre, ...ech.map((e) => e[0]), 1) + 4) / LN2), rm = RN - 1, rL = new Float32Array(RN), rR = new Float32Array(RN);
    const apL = [new Float32Array(149), new Float32Array(421)], apR = [new Float32Array(173), new Float32Array(389)], ai = [0, 0, 0, 0], ag = 0.62; let hl = 0, hr = 0, wp = 0;
    for (let i = 0; i < nOut; i++) { let xl = i < nIn ? iL[i] : 0, xr = i < nIn ? iR[i] : 0; hl += (xl - hl) * hc; hr += (xr - hr) * hc; xl -= hl; xr -= hr; rL[wp] = xl; rR[wp] = xr;
      let al = rL[(wp - pre) & rm], ar = rR[(wp - pre) & rm], el = 0, er = 0; for (let k = 0; k < ech.length; k++) { const e = ech[k], m = (rL[(wp - e[0]) & rm] + rR[(wp - e[0]) & rm]) * 0.5; el += m * e[1]; er += m * e[2]; } al += el; ar += er; wp = (wp + 1) & rm;
      for (let k = 0; k < 2; k++) { const bL = apL[k], zl = bL[ai[k]], yl = zl - ag * al; bL[ai[k]] = al + ag * yl; al = yl; if (++ai[k] === bL.length) ai[k] = 0; const bR = apR[k], zr = bR[ai[k + 2]], yr = zr - ag * ar; bR[ai[k + 2]] = ar + ag * yr; ar = yr; if (++ai[k + 2] === bR.length) ai[k + 2] = 0; }
      let sum = 0; for (let k = 0; k < NL; k++) { const o = line[k][idx[k]]; v[k] = o; const s = (lp[k] = o * d1 + lp[k] * d + 1e-24); sum += s; } sum *= 0.25;
      for (let k = 0; k < NL; k++) { line[k][idx[k]] = (lp[k] - sum) * g[k] + (k & 1 ? ar : al) * 0.5; if (++idx[k] === len[k]) idx[k] = 0; }
      oL[i] = (v[0] - v[2] + v[4] - v[6]) * 0.42 + el; oR[i] = (v[1] - v[3] + v[5] - v[7]) * 0.42 + er; } };
  // stereo echo: { time s, ratio (right/left), fb, damp Hz, cross 0..1 (1 = ping-pong) }
  const echo = (iL, iR, oL, oR, nIn, nOut, P) => { const tl = max(1, round(P.time * SR)), tr = max(1, round(P.time * (P.ratio || 1) * SR)), bl = new Float32Array(tl), br = new Float32Array(tr), a = 1 - exp((-TAU * (P.damp || 3500)) / SR), x = P.cross === undefined ? 0.7 : P.cross; let il = 0, ir = 0, sl = 0, sr = 0;
    for (let i = 0; i < nOut; i++) { const ol = bl[il], or = br[ir]; sl += (ol - sl) * a; sr += (or - sr) * a; const fl = (sl * (1 - x) + sr * x) * P.fb, fr = (sr * (1 - x) + sl * x) * P.fb; bl[il] = (i < nIn ? iL[i] : 0) + fl; br[ir] = (i < nIn ? iR[i] : 0) + fr; if (++il === tl) il = 0; if (++ir === tr) ir = 0; oL[i] = ol; oR[i] = or; } };

  // ══ loudness (ITU-R BS.1770 K-weighting, 400 ms blocks every 100 ms, gated) ══
  K.meter = (L, R, n) => { n = n || L.length; const hop = round(0.1 * SR), H = ceil(n / hop), e100 = new Float64Array(H);
    const kq = (f0, Q) => { const k = sin((PI * f0) / SR) / cos((PI * f0) / SR); return [k, k / Q, k * k]; }, s = kq(1681.974450955533, 0.7071752369554196), h = kq(38.13547087602444, 0.5003270373238773), Vh = exp((3.999843853973347 * LN10) / 20), Vb = exp(0.4996667741545416 * log(Vh));
    const sa = 1 + s[1] + s[2], c1 = [(Vh + Vb * s[1] + s[2]) / sa, (2 * (s[2] - Vh)) / sa, (Vh - Vb * s[1] + s[2]) / sa, (2 * (s[2] - 1)) / sa, (1 - s[1] + s[2]) / sa], ha = 1 + h[1] + h[2], c2 = [1, -2, 1, (2 * (h[2] - 1)) / ha, (1 - h[1] + h[2]) / ha];
    for (const x of [L, R]) { let a1 = 0, a2 = 0, b1 = 0, b2 = 0; for (let i = 0; i < n; i++) { const v = x[i], o = c1[0] * v + a1; a1 = c1[1] * v - c1[3] * o + a2; a2 = c1[2] * v - c1[4] * o; const p = c2[0] * o + b1; b1 = c2[1] * o - c2[3] * p + b2; b2 = c2[2] * o - c2[4] * p; e100[(i / hop) | 0] += p * p; } }
    const lk = (ms) => (ms > 0 ? -0.691 + (10 * log(ms)) / LN10 : -120), nb = max(0, H - 3), E = new Float64Array(nb); for (let j = 0; j < nb; j++) E[j] = (e100[j] + e100[j + 1] + e100[j + 2] + e100[j + 3]) / (4 * hop);
    let sum = 0, cnt = 0; for (let j = 0; j < nb; j++) if (lk(E[j]) > -70) { sum += E[j]; cnt++; } const gate = cnt ? lk(sum / cnt) - 10 : -70; sum = 0; cnt = 0; for (let j = 0; j < nb; j++) if (lk(E[j]) > gate && lk(E[j]) > -70) { sum += E[j]; cnt++; }
    return { integrated: cnt ? lk(sum / cnt) : -120, momentary: (j) => lk(E[j]), blocks: nb, range: (t0, t1) => { const j0 = max(0, floor(t0 * 10)), j1 = min(H, ceil(t1 * 10)); let q = 0; for (let j = j0; j < j1; j++) q += e100[j]; return lk(q / max(1, (j1 - j0) * hop)); } }; };

  // ══ master: returns → DC block → tilt → loudness → soft clip → look-ahead limiter (4× inter-sample estimate) ══
  // opts: { lufs (target integrated, null = leave), gain (fixed linear gain instead), ceiling dB, reverb: name | {…} | null,
  //         revLevel, delay: {time, ratio, fb, damp, cross, level} | null, hp, tilt dB, clip (knee 0..1), limit }
  K.master = (mo) => { const M = Object.assign({ lufs: -15, gain: null, ceiling: -1.5, reverb: 'valley', revLevel: 1, delay: null, hp: 24, tilt: 0, clip: 0.7, limit: true, trim: 0.4 }, cfg.master || {}, mo || {});
    pool = []; shots.clear(); if (!dryL) { dryL = new Float32Array(N); dryR = new Float32Array(N); } const L = dryL, R = dryR;
    const ret = (sl, sr, fn, P, tailS, lvl) => { const tail = min(N, round(tailS * SR)), wl = new Float32Array(N + tail), wr = new Float32Array(N + tail); fn(sl, sr, wl, wr, N, N + tail, P); for (let i = 0; i < N; i++) { L[i] += (wl[i] + (i < tail ? wl[N + i] : 0)) * lvl; R[i] += (wr[i] + (i < tail ? wr[N + i] : 0)) * lvl; } };   // the tail past the end is folded onto the start: the loop has no seam
    if (revL && M.reverb) { const P = typeof M.reverb === 'string' ? REV[M.reverb] : Object.assign({}, REV.hall, M.reverb); ret(revL, revR, fdn, P, min(P.rt * 1.3, 8), M.revLevel); } revL = revR = null;
    if (dlyL && M.delay) { const P = Object.assign({ time: K.BEAT * 0.75, ratio: 1.5, fb: 0.35, damp: 3200, cross: 0.7, level: 1 }, M.delay); ret(dlyL, dlyR, echo, P, min(8, P.time * 12), P.level); } dlyL = dlyR = null;
    for (const x of [L, R]) { filtC(x, N, bq('hp', M.hp, 0.7071)); if (M.tilt) { filtC(x, N, bq('ls', 220, 0.6, -M.tilt * 0.5)); filtC(x, N, bq('hs', 3800, 0.6, M.tilt * 0.5)); } }
    const m0 = K.meter(L, R, N), info = { lufsIn: m0.integrated, buses: order.slice(), groups: Object.keys(groups) };
    let gain = M.gain !== null && M.gain !== undefined ? M.gain : M.lufs === null || m0.integrated < -90 ? 1 : db(M.lufs - m0.integrated + M.trim); info.gain = gain;
    const kn = M.clip, k1 = 1 - kn; let pkIn = 0; for (const x of [L, R]) for (let i = 0; i < N; i++) { let v = x[i] * gain; const a = v < 0 ? -v : v; if (a > pkIn) pkIn = a; if (M.limit && a > kn) { const t = kn + k1 * tanh((a - kn) / k1) * 1.0; v = v < 0 ? -t : t; } x[i] = v; } info.peakIn = pkIn;
    if (M.limit) { const ceilL = db(M.ceiling), T = 8, ph = [1, 2, 3].map((p) => { const c = new Float64Array(2 * T); for (let j = 0; j < 2 * T; j++) { const xx = j - (T - 1) - p / 4, w = 0.5 + 0.5 * cos((PI * xx) / T); c[j] = (abs(xx) < 1e-9 ? 1 : sin(PI * xx) / (PI * xx)) * w; } return c; });
      const pk = new Float32Array(N), gm = new Float32Array(N), W = round(0.005 * SR), thr = ceilL * 0.55; let lim = 0;
      for (let i = 0; i < N; i++) { const al = abs(L[i]), ar = abs(R[i]); let p = al > ar ? al : ar; if (p > thr && i >= T && i < N - T - 1) for (let q = 0; q < 3; q++) { const c = ph[q]; let sl = 0, sr = 0; for (let j = 0; j < 2 * T; j++) { sl += L[i - (T - 1) + j] * c[j]; sr += R[i - (T - 1) + j] * c[j]; } if (sl < 0) sl = -sl; if (sr < 0) sr = -sr; if (sl > p) p = sl; if (sr > p) p = sr; } pk[i] = p > ceilL ? ceilL / p : 1; }
      gm.fill(1); for (let i = 0; i < N; i++) { const g = pk[i]; if (g < 1) { lim++; for (let k = max(0, i - W); k <= min(N - 1, i + 1); k++) if (gm[k] > g) gm[k] = g; } }   // the gain is down W samples before a peak …
      const kr = 1 - exp(-1 / (0.09 * SR)); let rel = 1; for (let i = 0; i < N; i++) { rel += (1 - rel) * kr; if (gm[i] < rel) rel = gm[i]; gm[i] = rel; }                                          // … recovers slowly after it …
      let acc = 0; for (let i = 0; i < N; i++) { acc += gm[i]; if (i >= W) acc -= gm[i - W]; pk[i] = i >= W - 1 ? acc / W : 1; }                                                              // … and has no corners
      for (let i = 0; i < N; i++) { const g = pk[i] < gm[i] ? pk[i] : gm[i]; L[i] *= g; R[i] *= g; } info.limited = lim / N; }
    info.lufs = K.meter(L, R, N).integrated; dryL = dryR = null; return { L, R, info }; };
  return K;
};

// ── run a score: the same three lines in the worker, on the main thread and in Node ──
DR.synthRun = function (kit, score, o) { const K = kit(o); score(K, o.beats || {}, o); return K.master(); };

{
  let reg = null, job = null;
  const st = { ctx: null, src: null, out: null, buffer: null, t0: 0, wall0: 0, run: false, held: false, at: 0 };
  const wall = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  const mod = (x, n) => ((x % n) + n) % n;
  const durOf = () => (reg && reg.opts.duration) || DR.DURATION || 60;
  const settings = (extra) => { const o = Object.assign({ sampleRate: 44100 }, reg.opts, extra || {}); o.duration = o.duration || DR.DURATION || 60; for (const k of ['solo', 'mute']) if (!o[k] && DR.P.get(k)) o[k] = DR.P.get(k); return o; };
  const local = (o) => { const t0 = Date.now(), m = DR.synthRun(DR.synthKit, reg.fn, o); return { L: m.L, R: m.R, sampleRate: o.sampleRate, ms: Date.now() - t0, worker: false, info: m.info }; };
  const run = (o) => new Promise((res, rej) => {
    const here = () => setTimeout(() => { try { res(local(o)); } catch (e) { rej(e); } }, 0);
    if (o.worker === false || typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return here();
    let w, url;
    try {
      const src = 'const kit=' + DR.synthKit.toString() + ';const run=' + DR.synthRun.toString() + ';const score=' + reg.fn.toString() + ';onmessage=function(e){try{const t0=Date.now(),m=run(kit,score,e.data);postMessage({L:m.L,R:m.R,ms:Date.now()-t0,info:m.info},[m.L.buffer,m.R.buffer]);}catch(err){postMessage({error:String((err&&err.stack)||err)});}};';
      url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' })); w = new Worker(url);
    } catch (e) { return here(); }
    const done = () => { w.terminate(); URL.revokeObjectURL(url); };
    w.onmessage = (e) => { done(); if (e.data.error) rej(new Error('score: ' + e.data.error)); else res({ L: e.data.L, R: e.data.R, sampleRate: o.sampleRate, ms: e.data.ms, worker: true, info: e.data.info }); };
    w.onerror = () => { done(); here(); };   // e.g. a page policy that forbids blob workers
    w.postMessage(o);
  });
  const play = (t) => { const c = st.ctx; if (!c || !st.buffer) return; if (st.src) { try { st.src.stop(); } catch (e) { /* not started */ } st.src.disconnect(); }
    const s = (st.src = c.createBufferSource()), d = st.buffer.duration, off = mod(t, d), when = c.currentTime + 0.04; s.buffer = st.buffer; s.loop = true; s.connect(st.out); s.start(when, off); st.t0 = when - off; st.run = true; };
  // the audio clock, read smoothly: the time of the sample now leaving the speaker
  const clock = () => { const c = st.ctx; if (c.getOutputTimestamp) { const s = c.getOutputTimestamp(); if (s && s.performanceTime > 0 && s.contextTime > 0) return s.contextTime + (performance.now() - s.performanceTime) / 1000; } return c.currentTime - (c.outputLatency || 0); };
  const api = {
    started: false,
    get options() { return reg ? reg.opts : null; },
    render: (extra) => { if (extra) return run(settings(extra)); return job || (job = run(settings())); },
    async start(t = 0) { if (api.started) return; api.started = true; st.wall0 = wall() - t;
      try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; const c = (st.ctx = new AC()); st.out = c.createGain(); st.out.gain.value = DR.num('vol', 1); st.out.connect(c.destination); const live = c.resume();
        const r = await api.render(); await live; const bfr = (st.buffer = c.createBuffer(2, r.L.length, r.sampleRate)); bfr.copyToChannel(r.L, 0); bfr.copyToChannel(r.R, 1); play(wall() - st.wall0);
      } catch (e) { console.warn('[audio] no sound:', e && e.message ? e.message : e); } },
    playing: () => !!(st.run && st.ctx && st.ctx.state === 'running'),
    time: () => (api.playing() ? mod(clock() - st.t0, st.buffer.duration) : st.held ? st.at : mod(wall() - st.wall0, durOf())),   // silent or still composing: the wall clock
    pause() { st.at = api.time(); st.held = true; if (st.ctx && st.run) { st.run = false; st.ctx.suspend(); } },
    resume(t = 0) { st.held = false; st.wall0 = wall() - t; if (st.ctx && st.buffer) { play(t); st.ctx.resume(); } },
    wav(L, R, sampleRate = 44100) { const n = L.length, u = new Uint8Array(44 + n * 4), v = new DataView(u.buffer), w = (o, s) => { for (let i = 0; i < s.length; i++) u[o + i] = s.charCodeAt(i); };
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
      for (let i = 0, o = 44; i < n; i++, o += 4) { const l = Math.round(L[i] * 32767), r = Math.round(R[i] * 32767); v.setInt16(o, l < -32768 ? -32768 : l > 32767 ? 32767 : l, true); v.setInt16(o + 2, r < -32768 ? -32768 : r > 32767 ? 32767 : r, true); } return u; },
  };
  // DR.score(fn, opts): register the film's score.  fn(K, B, o) is self-contained; opts is plain data { beats, bar, beat, duration, master }.
  DR.score = (fn, opts) => { reg = { fn, opts: opts || {} }; job = null; if (!DR.on('audio')) return; DR.audio = api;
    if (!DR.RENDER && typeof window !== 'undefined' && !DR.audio.pre) { DR.audio.pre = true; DR.bootFns.push(() => { api.render().catch((e) => console.warn('[audio]', e && e.message)); }); } };
}
