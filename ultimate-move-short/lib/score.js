// ultimate-move-short · score.js — a battle-anime score synthesised from a small spec in plain JS (no Web Audio graph, no
// files), so the live page and scripts/score.mjs (→ WAV for the MP4) play the same thing. Percussion-first: a 170–180
// BPM kit of tight kicks, snares, toms, hats and metal hits under the attack, every step, dash, slash and landing hit on
// its frame, then the drop to near-silence, the low resonance and glass of the domain, the riser into the final cut,
// a layered impact, and a held ringing silence at the end. (Reverb and table voices adapted from ink-summoning.)
//
// spec = {
//   drums:  [{ from, to, bpm, div: 4, pattern: 'k.h.s.h.k.k.s.hm', v, swing }]   k kick · s snare · h hat · o open hat ·
//           t tom · m metal · x taiko · c clap-crack · '.' rest  (one char per 1/div beat)
//   bass:   [{ t, d, n (midi), v, pulse (Hz, 0 = held) }]     sub bass, optionally pulsing
//   drone:  [{ t, d, n, v }]                                   the low resonance (beating partials, slow swell)
//   pad:    [{ t, d, notes, v }]                               dark chord bed
//   sfx:    [{ t, type, v, d, pan, dir }]   slash · shing · whoosh · dash · step · land · impact · ultimate · glass ·
//           crack · ink · cloth · riser · reverse · boom · rumble · ring · heart · tick · metal · thud
//   gain:   [{ t, v }]                       master level keys (use it for the drop to silence)
//   reverb: { mix: .22, room: .8 }
// }
// renderScore(spec, sampleRate, duration) → [Float32Array L, Float32Array R], peak-normalised to −1 dBFS.

const TAU = Math.PI * 2;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function rnd(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; }; }
function table(partials) { const N = 4096, t = new Float32Array(N + 1); for (let i = 0; i <= N; i++) { let v = 0; for (let k = 0; k < partials.length; k++) v += partials[k] * Math.sin(TAU * (k + 1) * i / N); t[i] = v; } let m = 0; for (const v of t) m = Math.max(m, Math.abs(v)); for (let i = 0; i <= N; i++) t[i] /= m; return t; }
const PAD = table([1, .5, .3, .18, .1, .06, .03]);
const lookup = (tb, ph) => { const x = ph * 4096, i = x | 0, f = x - i; return tb[i] + (tb[i + 1] - tb[i]) * f; };
const env = (t, d, a, r) => t < 0 ? 0 : t < a ? t / a : t < d ? 1 : t < d + r ? 1 - (t - d) / r : 0;
function keyval(list, t, def = 1) { if (!list || !list.length) return def; if (t <= list[0].t) return list[0].v; for (let i = 1; i < list.length; i++) if (t < list[i].t) { const a = list[i - 1], b = list[i], k = (t - a.t) / (b.t - a.t); return a.v + (b.v - a.v) * k; } return list[list.length - 1].v; }

export function renderScore(spec, sr = 44100, dur = 30) {
  const N = Math.ceil(dur * sr), L = new Float32Array(N), R = new Float32Array(N), DL = new Float32Array(N), DR = new Float32Array(N);
  // add to the wet bus (reverb) or the dry bus
  const add = (i, v, pan, dry = false) => { if (i >= 0 && i < N) { const l = v * Math.cos((pan + 1) * Math.PI / 4), r = v * Math.sin((pan + 1) * Math.PI / 4); if (dry) { DL[i] += l; DR[i] += r; } else { L[i] += l; R[i] += r; } } };
  const svf = () => { let lo = 0, bd = 0; return (x, fc, q, mode = 'bp') => { const f = 2 * Math.sin(Math.PI * Math.min(fc, sr / 6) / sr); lo += f * bd; const hi = x - lo - q * bd; bd += f * hi; return mode === 'lp' ? lo : mode === 'hp' ? hi : bd; }; };

  // ---- tonal beds ----
  for (const ev of spec.pad || []) ev.notes.forEach((n, j) => {
    const f = mtof(n), pan = ((j / Math.max(1, ev.notes.length - 1)) - .5) * .7, i0 = Math.floor(ev.t * sr), len = Math.ceil((ev.d + 2) * sr);
    let p1 = j * .13, p2 = j * .37, lp = 0; const c = 1 - Math.exp(-TAU * 900 / sr);
    for (let i = 0; i < len; i++) { const t = i / sr; p1 += f * 1.003 / sr; p2 += f * .997 / sr; p1 -= p1 | 0; p2 -= p2 | 0; lp += c * ((lookup(PAD, p1) + lookup(PAD, p2)) * .5 - lp); add(i0 + i, lp * env(t, ev.d, 1.4, 2) * (ev.v ?? .5) * .26 / Math.sqrt(ev.notes.length), pan); }
  });
  for (const ev of spec.drone || []) {
    const f = mtof(ev.n), i0 = Math.floor(ev.t * sr), len = Math.ceil((ev.d + 1.5) * sr); let a = 0, b = 0, c = 0;
    for (let i = 0; i < len; i++) { const t = i / sr; a += f / sr; b += f * 1.007 / sr; c += f * 2.003 / sr; const e = env(t, ev.d, ev.a ?? 1.2, 1.5) * (.8 + .2 * Math.sin(TAU * .7 * t)); const v = (Math.sin(TAU * a) + Math.sin(TAU * b) * .8 + Math.sin(TAU * c) * .25 + Math.sin(TAU * a * 3.01) * .08) * e * (ev.v ?? .5) * .3; add(i0 + i, v, Math.sin(TAU * .1 * t) * .3); }
  }
  for (const ev of spec.bass || []) {
    const f = mtof(ev.n), i0 = Math.floor(ev.t * sr), len = Math.ceil((ev.d + .3) * sr); let ph = 0;
    for (let i = 0; i < len; i++) { const t = i / sr; ph += f / sr; const pu = ev.pulse ? Math.pow(Math.max(0, Math.sin(Math.PI * ((t * ev.pulse) % 1))), 3) : 1; add(i0 + i, Math.tanh(Math.sin(TAU * ph) * 1.6 + Math.sin(TAU * ph * 2) * .3) * env(t, ev.d, .02, .25) * pu * (ev.v ?? .5) * .45, 0, true); }
  }

  // ---- drums → hits ----
  const sfx = [...(spec.sfx || [])];
  const MAP = { k: 'kick', s: 'snare', h: 'hat', o: 'ohat', t: 'tom', m: 'metal', x: 'taiko', c: 'clapcrack' };
  for (const dm of [].concat(spec.drums || [])) {
    const step = 60 / dm.bpm / (dm.div || 4), pat = dm.pattern || 'k...s...'; let k = 0;
    for (let t = dm.from; t < dm.to - 1e-6; t += step, k++) { const ch = pat[k % pat.length], sw = (k % 2) * (dm.swing || 0) * step; if (MAP[ch]) sfx.push({ t: t + sw, type: MAP[ch], v: (dm.v ?? .7) * (ch === 'h' ? .5 : 1) * (k % (dm.div || 4) === 0 ? 1 : .85), pan: ch === 'h' ? .25 : ch === 't' ? -.2 + (k % 3) * .2 : 0 }); }
  }

  for (const s of sfx) {
    const i0 = Math.floor(s.t * sr), v = s.v ?? .6, d = s.d || 1, r2 = rnd(Math.floor(s.t * 1000) + 7 + (s.type.length * 131)), pan = s.pan ?? 0;
    const T = s.type;
    if (T === 'kick') { let ph = 0; for (let i = 0; i < .45 * sr; i++) { const t = i / sr, f = 48 + 120 * Math.exp(-t * 38); ph += f / sr; add(i0 + i, Math.tanh(Math.sin(TAU * ph) * Math.exp(-t / .16) * 2.2 + (i < 60 ? r2() * .6 : 0)) * v * .8, 0, true); } }
    else if (T === 'snare') { const f = svf(); let ph = 0; for (let i = 0; i < .3 * sr; i++) { const t = i / sr; ph += (190 + 60 * Math.exp(-t * 30)) / sr; add(i0 + i, (Math.sin(TAU * ph) * Math.exp(-t / .05) * .6 + f(r2(), 3200, .6) * Math.exp(-t / .07) * 1.3) * v * .55, pan, true); add(i0 + i, f(r2(), 2500, .6) * Math.exp(-t / .08) * v * .2, pan); } }
    else if (T === 'hat' || T === 'ohat') { const f = svf(), dd = T === 'ohat' ? .18 : .035; for (let i = 0; i < (dd * 5) * sr; i++) { const t = i / sr; add(i0 + i, f(r2(), 8500, .3, 'hp') * Math.exp(-t / dd) * v * .32, pan, true); } }
    else if (T === 'tom') { let ph = 0; const f0 = 110 + (Math.abs(pan) * 200); for (let i = 0; i < .5 * sr; i++) { const t = i / sr; ph += (f0 * (1 + .6 * Math.exp(-t * 20))) / sr; add(i0 + i, Math.sin(TAU * ph) * Math.exp(-t / .18) * v * .55, pan); } }
    else if (T === 'metal' || T === 'clapcrack') {   // an anvil-like clang: inharmonic partials, fast decay
      const base = T === 'metal' ? 520 : 1400; for (const [m, a, dd] of [[1, 1, .25], [1.48, .6, .2], [2.33, .5, .14], [3.11, .35, .1], [4.7, .25, .07]]) for (let i = 0; i < .8 * sr; i++) { const t = i / sr; add(i0 + i, Math.sin(TAU * base * m * t) * a * Math.exp(-t / dd) * v * .16, pan); }
      const f = svf(); for (let i = 0; i < .05 * sr; i++) add(i0 + i, f(r2(), 5000, .5) * (1 - i / (.05 * sr)) * v * .5, pan, true);
    }
    else if (T === 'taiko' || T === 'boom' || T === 'thud') {
      const big = T === 'boom', f0 = big ? 75 : T === 'thud' ? 110 : 150, f1 = big ? 30 : 55, dec = big ? 1.5 : .45, f = svf(); let ph = 0;
      for (let i = 0; i < (big ? 3 : 1.2) * sr; i++) { const t = i / sr, fr = f1 + (f0 - f1) * Math.exp(-t * 16); ph += fr / sr; add(i0 + i, Math.tanh((Math.sin(TAU * ph) * Math.exp(-t / dec) * 1.4 + f(r2(), big ? 250 : 800, .7) * Math.exp(-t / .025)) * 1.4) * v * .9, pan, true); }
    }
    else if (T === 'slash' || T === 'shing') {     // a blade through air: bright noise sweep + a steel ring
      const f = svf(), g = svf(), L2 = (T === 'shing' ? .9 : .45);
      for (let i = 0; i < L2 * sr; i++) { const t = i / sr, k = t / .14; const sw = t < .14 ? f(r2(), 1500 + 7000 * k, .5) * Math.sin(Math.PI * k) : 0; const ring = (Math.sin(TAU * 3720 * t) * .5 + Math.sin(TAU * 5310 * t) * .3 + Math.sin(TAU * 2480 * t) * .4) * Math.exp(-t / (T === 'shing' ? .35 : .09)) * Math.min(1, t / .004);
        add(i0 + i, (sw * 1.1 + ring * .35 + g(r2(), 9000, .4, 'hp') * Math.exp(-t / .02) * .4) * v * .8, pan + (k - .5) * (s.dir || 1) * .8); }
    }
    else if (T === 'whoosh' || T === 'dash') {     // air torn past the lens; dash is shorter and brighter
      const f = svf(), dd = T === 'dash' ? (s.d || .25) : d;
      for (let i = 0; i < dd * sr; i++) { const t = i / sr, k = t / dd, fc = (T === 'dash' ? 900 : 300) + (T === 'dash' ? 5000 : 2000) * Math.sin(Math.PI * k) ** 2; add(i0 + i, f(r2(), fc, .55) * Math.sin(Math.PI * k) ** 1.4 * v * 1.1, pan + (k - .5) * 1.4 * (s.dir || 1)); }
    }
    else if (T === 'step') { const f = svf(); for (let i = 0; i < .2 * sr; i++) { const t = i / sr; add(i0 + i, (f(r2(), 600, .9) * 1.2 + Math.sin(TAU * 70 * t) * .5) * Math.exp(-t / .04) * v * .6, pan, true); } }
    else if (T === 'land' || T === 'ink') {        // a heavy landing / wet ink slap: thump + splash scatter
      const f = svf(); let ph = 0; for (let i = 0; i < 1.2 * sr; i++) { const t = i / sr; ph += (45 + 60 * Math.exp(-t * 20)) / sr; add(i0 + i, (T === 'land' ? Math.sin(TAU * ph) * Math.exp(-t / .3) * .9 : 0) + f(r2(), 700 + 1200 * Math.exp(-t * 7), .9) * Math.exp(-t / .14) * .9 + (r2() > .9985 ? r2() * Math.exp(-t / .4) * .6 : 0), pan); }
    }
    else if (T === 'impact' || T === 'ultimate') { // layered: sub drop, crack, noise wall, debris; ultimate is longer and wider
      const U = T === 'ultimate', f = svf(), g = svf(); let ph = 0; const len = (U ? 5 : 2.2) * sr;
      for (let i = 0; i < len; i++) { const t = i / sr; ph += (28 + (U ? 90 : 70) * Math.exp(-t * (U ? 6 : 10))) / sr;
        const sub = Math.sin(TAU * ph) * Math.exp(-t / (U ? 1.8 : .7)), crk = f(r2(), 3000, .4) * Math.exp(-t / .03), wall = g(r2(), 400 + 1600 * Math.exp(-t * 3), .7) * Math.exp(-t / (U ? 1.2 : .45)), deb = r2() > (U ? .996 : .998) ? r2() * Math.exp(-t / (U ? 2 : .8)) : 0;
        add(i0 + i, Math.tanh((sub * 1.6 + crk * 1.4) * 1.3) * v * .85, 0, true); add(i0 + i, (wall * .9 + deb * .7) * v, Math.sin(t * 7) * (U ? .6 : .3)); }
    }
    else if (T === 'glass') {                      // shatter: a burst then dozens of small bright tinkles
      const f = svf(); for (let i = 0; i < .25 * sr; i++) { const t = i / sr; add(i0 + i, f(r2(), 6000, .5) * Math.exp(-t / .06) * v * .9, pan); }
      for (let k = 0; k < (s.n || 40); k++) { const st = Math.pow((r2() + 1) / 2, 2) * d, fq = 2500 + (r2() + 1) * 3500, j0 = i0 + Math.floor(st * sr), pn = r2() * .9; for (let i = 0; i < .12 * sr; i++) { const t = i / sr; add(j0 + i, Math.sin(TAU * fq * t) * Math.exp(-t / .025) * v * .14, pn); } }
    }
    else if (T === 'crack') { for (let k = 0; k < (s.n || 6); k++) { const st = k * (.02 + (r2() + 1) * .03), j0 = i0 + Math.floor(st * sr); const f = svf(); for (let i = 0; i < .04 * sr; i++) { const t = i / sr; add(j0 + i, f(r2(), 2000 + k * 300, .3) * Math.exp(-t / .006) * v, pan + r2() * .3); } } }
    else if (T === 'cloth') { const f = svf(); for (let i = 0; i < d * sr; i++) { const t = i / sr, am = Math.max(0, Math.sin(TAU * 11 * t)) ** 2 * Math.sin(Math.PI * t / d); add(i0 + i, f(r2(), 1300, .8) * am * v * .7, pan); } }
    else if (T === 'riser') { const f = svf(); let ph = 0; for (let i = 0; i < d * sr; i++) { const t = i / sr, k = t / d; ph += (60 + 400 * k * k) / sr; add(i0 + i, (f(r2(), 300 + 6000 * k * k, .45) * .8 + Math.sin(TAU * ph) * .3) * Math.pow(k, 2.4) * v * .8, Math.sin(TAU * t * .9) * .4); } }
    else if (T === 'reverse') { const f = svf(); for (let i = 0; i < d * sr; i++) { const t = i / sr, k = t / d; add(i0 + i, f(r2(), 800 + 3000 * k, .6) * Math.pow(k, 3) * v, 0); } }
    else if (T === 'rumble') { let lp = 0; for (let i = 0; i < d * sr; i++) { const t = i / sr, k = t / d, e = Math.min(1, t / .3) * Math.pow(1 - k, .7); lp += .01 * (r2() - lp); add(i0 + i, (Math.sin(TAU * 41 * t) * .5 + Math.sin(TAU * 62 * t) * .2 + lp * 5) * e * (.7 + .3 * Math.sin(TAU * 9 * t)) * v * .7, 0, true); } }
    else if (T === 'ring') { for (let i = 0; i < d * sr; i++) { const t = i / sr; add(i0 + i, (Math.sin(TAU * (s.f || 3150) * t) + Math.sin(TAU * (s.f || 3150) * 1.004 * t) * .6) * env(t, d - .6, .3, .6) * v * .06, 0); } }
    else if (T === 'heart') { for (const off of [0, .22]) { let ph = 0; for (let i = 0; i < .3 * sr; i++) { const t = i / sr; ph += (55 + 30 * Math.exp(-t * 25)) / sr; add(i0 + Math.floor(off * sr) + i, Math.sin(TAU * ph) * Math.exp(-t / .09) * v * (off ? .6 : 1), 0, true); } } }
    else if (T === 'tick') { for (let i = 0; i < .02 * sr; i++) add(i0 + i, r2() * Math.exp(-i / sr / .003) * v * .5, pan, true); }
  }

  // ---- reverb on the wet bus, then master gain keys ----
  const rv = spec.reverb || { mix: .22, room: .8 };
  const verb = (x, off) => {
    const out = new Float32Array(N), combs = [1557, 1617, 1491, 1422, 1277, 1356].map(d => ({ b: new Float32Array(d + off), i: 0, lp: 0 }));
    for (let n = 0; n < N; n++) { let s = 0; for (const c of combs) { const y = c.b[c.i]; c.lp = y * .6 + c.lp * .4; c.b[c.i] = x[n] * .5 + c.lp * rv.room; c.i = (c.i + 1) % c.b.length; s += y; } out[n] = s / 6; }
    for (const d of [556 + off, 341 + off, 225 + off]) { const b = new Float32Array(d); let i = 0; for (let n = 0; n < N; n++) { const y = b[i], v = out[n] + y * .5; b[i] = v; out[n] = y - v * .5; i = (i + 1) % d; } }
    return out;
  };
  const vl = verb(L, 0), vr = verb(R, 23);
  let peak = 0;
  for (let n = 0; n < N; n++) {
    const gk = keyval(spec.gain, n / sr, 1);
    L[n] = Math.tanh((L[n] + DL[n] + vl[n] * rv.mix * 2.4) * 1.05) * gk; R[n] = Math.tanh((R[n] + DR[n] + vr[n] * rv.mix * 2.4) * 1.05) * gk;
    peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n]));
  }
  const g = peak > 0 ? .89 / peak : 1, fadeIn = Math.floor(.01 * sr);
  for (let n = 0; n < N; n++) { const f = Math.min(1, n / fadeIn); L[n] *= g * f; R[n] *= g * f; }
  return [L, R];
}
