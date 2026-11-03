// ink-summoning · score.js — a trailer-style score synthesised from a small spec in plain JS (no Web Audio, no files), so
// the same score plays on the live page and is written to a WAV by scripts/score.mjs for the MP4. (Base voices adapted
// from painted-anime-short; the drums, ink and creature sounds are this skill's.)
//
// spec = {
//   pad:     [{ t, d, notes: [midi…], v }]        warm chord bed (soft attack, long release)
//   strings: [{ t, d, notes, v }]                 brighter swell for the lift / the climax
//   bell:    [{ t, n: midi, v }]                  music-box / celesta melody
//   bass:    [{ t, d, n, v }]
//   air:     [{ t, v }]                           wind / room tone level keys (0 … 1)
//   flute:   [{ t, d, n, v, bend }]               breathy shakuhachi-like tone (bend: semitones scooped into the note)
//   sfx:     [{ t, type, v, d, pan }]             taiko · shime · ka · boom · gong · riser · brush · splash · roar · dragon ·
//                                                 whoosh · rumble · thump · flutter · chime · chirp · rustle · flicker
//   drums:   { from, to, bpm, pattern: 'x..x..x.', v, type } a repeating taiko pattern (x = hit, o = soft hit, k = rim)
//   reverb:  { mix: .28, room: .84 }
// }
// renderScore(spec, sampleRate, duration) → [Float32Array L, Float32Array R], peak-normalised to −1 dBFS.

const TAU = Math.PI * 2;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function rnd(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; }; }
function table(partials) { const N = 4096, t = new Float32Array(N + 1); for (let i = 0; i <= N; i++) { let v = 0; for (let k = 0; k < partials.length; k++) v += partials[k] * Math.sin(TAU * (k + 1) * i / N); t[i] = v; } let m = 0; for (const v of t) m = Math.max(m, Math.abs(v)); for (let i = 0; i <= N; i++) t[i] /= m; return t; }
const PAD = table([1, .45, .22, .12, .06, .03]);
const STR = table(Array.from({ length: 14 }, (_, k) => 1 / (k + 1) * (k % 2 ? .8 : 1)));
const lookup = (tb, ph) => { const x = ph * 4096, i = x | 0, f = x - i; return tb[i] + (tb[i + 1] - tb[i]) * f; };
const env = (t, d, a, r) => t < 0 ? 0 : t < a ? t / a : t < d ? 1 : t < d + r ? 1 - (t - d) / r : 0;
function keyval(list, t) { if (!list || !list.length) return 0; if (t <= list[0].t) return list[0].v; for (let i = 1; i < list.length; i++) if (t < list[i].t) { const a = list[i - 1], b = list[i], k = (t - a.t) / (b.t - a.t); return a.v + (b.v - a.v) * (k * k * (3 - 2 * k)); } return list[list.length - 1].v; }

export function renderScore(spec, sr = 44100, dur = 30) {
  const N = Math.ceil(dur * sr), L = new Float32Array(N), R = new Float32Array(N);
  const add = (i, v, pan) => { if (i >= 0 && i < N) { L[i] += v * Math.cos((pan + 1) * Math.PI / 4); R[i] += v * Math.sin((pan + 1) * Math.PI / 4); } };
  // sustained voices: two detuned table oscillators through a one-pole low-pass
  const voice = (ev, tb, o) => {
    ev.notes.forEach((n, j) => {
      const f = mtof(n), pan = ((j / Math.max(1, ev.notes.length - 1)) - .5) * (o.spread || .6), i0 = Math.floor(ev.t * sr), len = Math.ceil((ev.d + o.r) * sr);
      let p1 = (j * .17) % 1, p2 = (j * .41) % 1, lp = 0; const c = 1 - Math.exp(-TAU * (o.cut || 1800) / sr);
      for (let i = 0; i < len; i++) {
        const t = i / sr, vib = 1 + (o.vib || 0) * Math.sin(TAU * 5.1 * t + j);
        p1 += f * vib * Math.pow(2, 5 / 1200) / sr; p2 += f * vib * Math.pow(2, -5 / 1200) / sr; p1 -= p1 | 0; p2 -= p2 | 0;
        lp += c * ((lookup(tb, p1) + lookup(tb, p2)) * .5 - lp);
        add(i0 + i, lp * env(t, ev.d, o.a, o.r) * (ev.v ?? .5) * o.gain / Math.sqrt(ev.notes.length), pan);
      }
    });
  };
  for (const ev of spec.pad || []) voice(ev, PAD, { a: 1.6, r: 2.4, gain: .32, cut: 1400 });
  for (const ev of spec.strings || []) voice(ev, STR, { a: 1.2, r: 1.8, gain: .22, cut: 3200, vib: .003, spread: 1 });
  for (const ev of spec.bass || []) voice({ ...ev, notes: [ev.n] }, PAD, { a: .08, r: 1.2, gain: .38, cut: 500, spread: 0 });
  // bell: inharmonic partials with their own decays
  const BP = [[1, 1, 2.6], [2, .45, 1.5], [3.01, .22, .9], [4.18, .12, .55], [5.43, .06, .35]];
  for (const ev of spec.bell || []) {
    const f = mtof(ev.n), i0 = Math.floor(ev.t * sr), len = Math.ceil(3 * sr), pan = ((ev.n % 12) / 12 - .5) * .7;
    for (let i = 0; i < len; i++) { const t = i / sr; let v = 0; for (const [m, a, d] of BP) v += a * Math.sin(TAU * f * m * t) * Math.exp(-t / d); add(i0 + i, v * Math.min(1, t / .004) * (ev.v ?? .5) * .16, pan); }
  }
  // noise-based layers
  const nz = rnd(12345);
  if (spec.air) { let a = 0, b = 0; for (let i = 0; i < N; i++) { const t = i / sr, w = nz(); a += .02 * (w - a); b += .004 * (w - b); const lv = keyval(spec.air, t) * (.75 + .25 * Math.sin(TAU * .07 * t) * Math.sin(TAU * .13 * t + 1)); add(i, (a - b) * lv * .5, Math.sin(TAU * .03 * t) * .5); } }
  const svf = () => { let lo = 0, bd = 0; return (x, fc, q) => { const f = 2 * Math.sin(Math.PI * Math.min(fc, sr / 6) / sr); lo += f * bd; const hi = x - lo - q * bd; bd += f * hi; return bd; }; };
  // flute: a breathy sine with slow vibrato, a scoop into each note, breath noise riding on it
  { const f = svf(); for (const ev of spec.flute || []) { let ph = 0; const i0 = Math.floor(ev.t * sr), len = Math.ceil((ev.d + .5) * sr), r3 = rnd(Math.floor(ev.t * 997) + 3);
    for (let i = 0; i < len; i++) { const t = i / sr, bend = (ev.bend ?? -1) * Math.exp(-t * 7), vib = .006 * Math.sin(TAU * 5.2 * t) * Math.min(1, t / .5), fr = mtof(ev.n + bend) * (1 + vib); ph += fr / sr;
      const e = env(t, ev.d, .09, .45) * (.85 + .15 * Math.sin(TAU * 1.3 * t)), breath = f(r3(), fr * 2, .3) * .35;
      add(i0 + i, (Math.sin(TAU * ph) + .18 * Math.sin(TAU * 2 * ph) + breath) * e * (ev.v ?? .5) * .26, -.25); } } }
  // drums: repeating patterns expand into taiko / shime / ka hits
  const sfx = [...(spec.sfx || [])];
  for (const dm of [].concat(spec.drums || [])) { const step = 60 / dm.bpm / (dm.div || 2), pat = dm.pattern || 'x...'; let k = 0; for (let t = dm.from; t < dm.to - 1e-6; t += step, k++) { const c = pat[k % pat.length]; if (c === 'x') sfx.push({ t, type: dm.type || 'taiko', v: dm.v ?? .7, pan: dm.pan ?? 0 }); else if (c === 'o') sfx.push({ t, type: dm.type || 'taiko', v: (dm.v ?? .7) * .45, pan: dm.pan ?? 0 }); else if (c === 'k') sfx.push({ t, type: 'ka', v: (dm.v ?? .7) * .5, pan: .3 }); else if (c === 's') sfx.push({ t, type: 'shime', v: (dm.v ?? .7) * .5, pan: -.2 }); } }
  for (const s of sfx) {
    const i0 = Math.floor(s.t * sr), v = s.v ?? .5, d = s.d || 1, r2 = rnd(Math.floor(s.t * 1000) + 7), pan = s.pan ?? 0;
    if (s.type === 'chirp') {             // a little songbird phrase: 3–5 quick upward sweeps
      const n = 3 + Math.floor((r2() + 1) * 1.2);
      for (let k = 0; k < n; k++) { const st = k * .085 + (r2() + 1) * .01, f0 = 3200 + r2() * 400, f1 = f0 + 1400 + r2() * 600, ln = .05 + (r2() + 1) * .02; let ph = 0;
        for (let i = 0; i < ln * sr; i++) { const t = i / sr, k2 = t / ln, f = f0 + (f1 - f0) * Math.sin(k2 * Math.PI * .5); ph += f / sr; add(i0 + Math.floor(st * sr) + i, Math.sin(TAU * ph) * Math.sin(Math.PI * k2) * v * .22, pan); } }
    } else if (s.type === 'flutter') {    // wing beats
      const f = svf(); for (let i = 0; i < d * sr; i++) { const t = i / sr, am = Math.max(0, Math.sin(TAU * 17 * t)) ** 3 * Math.sin(Math.PI * t / d); add(i0 + i, f(r2(), 900, .8) * am * v * .9, pan); }
    } else if (s.type === 'whoosh') {
      const f = svf(); for (let i = 0; i < d * sr; i++) { const t = i / sr, k = t / d, fc = 250 + 1600 * Math.sin(Math.PI * k) ** 2; add(i0 + i, f(r2(), fc, .6) * Math.sin(Math.PI * k) ** 1.5 * v * .9, pan + (k - .5) * .8); }
    } else if (s.type === 'rumble') {     // a shudder: low tone with tremolo + low noise
      let lp = 0; for (let i = 0; i < d * sr; i++) { const t = i / sr, k = t / d, e = Math.min(1, t / .25) * (1 - k) ** .7, tr = .6 + .4 * Math.sin(TAU * 11 * t); lp += .01 * (r2() - lp); add(i0 + i, (Math.sin(TAU * 46 * t) * .5 + Math.sin(TAU * 69 * t) * .2 + lp * 6) * e * tr * v * .7, 0); }
    } else if (s.type === 'flicker') {    // electric: clicks + a 100 Hz hum that steadies
      for (let i = 0; i < d * sr; i++) { const t = i / sr, k = t / d; const click = r2() > .9993 ? r2() * .9 : 0; add(i0 + i, (click + (Math.sin(TAU * 100 * t) * .25 + Math.sin(TAU * 200 * t) * .1) * k * (.6 + .4 * Math.sin(TAU * 7 * t))) * v * (1 - Math.max(0, k - .85) / .15), pan); }
    } else if (s.type === 'chime') {      // a bright little cluster (the lamp catching)
      for (const [n, dt] of [[84, 0], [88, .06], [91, .12], [96, .2]]) { const f = mtof(n), j0 = i0 + Math.floor(dt * sr); for (let i = 0; i < 2.5 * sr; i++) { const t = i / sr; add(j0 + i, (Math.sin(TAU * f * t) + .3 * Math.sin(TAU * f * 2.01 * t)) * Math.exp(-t / .8) * Math.min(1, t / .003) * v * .12, (n - 90) / 12); } }
    } else if (s.type === 'thump') {
      for (let i = 0; i < .6 * sr; i++) { const t = i / sr; add(i0 + i, Math.sin(TAU * (90 * Math.exp(-t * 8) + 40) * t) * Math.exp(-t / .15) * v, 0); }
    } else if (s.type === 'taiko' || s.type === 'boom') {   // big drum: a pitch-dropping body + skin slap; boom = sub hit
      const big = s.type === 'boom', f0 = big ? 70 : 140, f1 = big ? 32 : 58, dec = big ? 1.4 : .55, f = svf();
      let ph = 0; for (let i = 0; i < (big ? 3 : 1.4) * sr; i++) { const t = i / sr, fr = f1 + (f0 - f1) * Math.exp(-t * 18); ph += fr / sr; const body = Math.sin(TAU * ph) * Math.exp(-t / dec), slap = f(r2(), big ? 300 : 900, .7) * Math.exp(-t / .03) * (big ? .6 : 1.3); add(i0 + i, Math.tanh((body * 1.3 + slap) * 1.4) * v * .95, pan); }
    } else if (s.type === 'shime' || s.type === 'ka') {    // high tight drum / rim click
      const f = svf(), hi = s.type === 'ka'; for (let i = 0; i < .35 * sr; i++) { const t = i / sr; const tone = Math.sin(TAU * (hi ? 1900 : 420) * t) * Math.exp(-t / (hi ? .012 : .07)); add(i0 + i, (tone * .8 + f(r2(), hi ? 3500 : 1600, .5) * Math.exp(-t / (hi ? .008 : .025))) * v * .55, pan); }
    } else if (s.type === 'gong') {
      for (const [m, a, dd] of [[1, 1, 4], [1.47, .5, 3], [2.09, .4, 2.2], [2.56, .3, 1.6], [3.2, .2, 1.1]]) { const fq = (s.f || 98) * m; for (let i = 0; i < 5 * sr; i++) { const t = i / sr; add(i0 + i, Math.sin(TAU * fq * t + Math.sin(TAU * 3 * t) * .3) * a * Math.exp(-t / dd) * Math.min(1, t / .01) * v * .18, pan + (m - 2) * .1); } }
    } else if (s.type === 'riser') {                       // noise swelling upward into a hit
      const f = svf(); for (let i = 0; i < d * sr; i++) { const t = i / sr, k = t / d; add(i0 + i, f(r2(), 300 + 5000 * k * k, .5) * Math.pow(k, 2.2) * v * .7, Math.sin(TAU * t * .8) * .4); }
    } else if (s.type === 'brush') {                       // a big brush swung through the air: bristle hiss + body whoosh
      const f = svf(), g = svf(); for (let i = 0; i < d * sr; i++) { const t = i / sr, k = t / d, e = Math.sin(Math.PI * Math.min(1, k * 1.15)) ** 1.6; add(i0 + i, (f(r2(), 200 + 1400 * Math.sin(Math.PI * k), .55) * .9 + g(r2(), 4500 + 2500 * k, .4) * .35) * e * v, pan + (k - .5) * 1.2 * (s.dir || 1)); }
    } else if (s.type === 'splash') {                      // wet ink hitting the floor: a soft slap + scattering drops
      const f = svf(); for (let i = 0; i < .9 * sr; i++) { const t = i / sr; add(i0 + i, f(r2(), 700 + 900 * Math.exp(-t * 6), .9) * Math.exp(-t / .12) * v * .9 + (r2() > .9992 ? r2() * v * .5 * Math.exp(-t / .4) : 0), pan); }
    } else if (s.type === 'roar' || s.type === 'dragon') { // growl: a jittery buzzy source through two formants, swelling
      const dr = s.type === 'dragon', fa = svf(), fb = svf(), fc = svf(); let ph = 0, lp = 0;
      for (let i = 0; i < d * sr; i++) {
        const t = i / sr, k = t / d, env = Math.min(1, t / (dr ? .35 : .12)) * Math.pow(1 - k, dr ? .6 : .9);
        const f0 = (dr ? 48 : 85) * (1 + .35 * Math.sin(Math.PI * k)) * (1 + .06 * r2()) + (dr ? 0 : 20 * Math.sin(TAU * 7 * t));
        ph += f0 / sr; ph -= Math.floor(ph); const saw = ph * 2 - 1; lp += .3 * (r2() - lp);
        const src = saw * .7 + lp * 1.4;
        const o = fa(src, dr ? 260 : 420, .35) * 1.2 + fb(src, dr ? 700 : 1100, .45) * .7 + fc(r2(), dr ? 1400 : 2400, .6) * .25 * env;
        add(i0 + i, Math.tanh(o * 1.8) * env * v * .8, pan);
      }
    } else if (s.type === 'rustle') {     // leaves
      const f = svf(); for (let i = 0; i < d * sr; i++) { const t = i / sr, k = t / d, am = Math.sin(Math.PI * k) * (.5 + .5 * Math.abs(Math.sin(TAU * 3.3 * t + Math.sin(TAU * 1.1 * t)))); add(i0 + i, f(r2(), 3800, .9) * am * v * .5, pan + Math.sin(TAU * .5 * t) * .3); }
    }
  }
  // reverb: 4 combs + 2 all-passes per channel (Schroeder / Freeverb-lite), different delays left and right
  const rv = spec.reverb || { mix: .28, room: .84 };
  const verb = (x, off) => {
    const out = new Float32Array(N), combs = [1557, 1617, 1491, 1422].map(d => ({ b: new Float32Array(d + off), i: 0, lp: 0 }));
    for (let n = 0; n < N; n++) { let s = 0; for (const c of combs) { const y = c.b[c.i]; c.lp = y * .7 + c.lp * .3; c.b[c.i] = x[n] * .5 + c.lp * rv.room; c.i = (c.i + 1) % c.b.length; s += y; } out[n] = s * .25; }
    for (const d of [556 + off, 341 + off]) { const b = new Float32Array(d); let i = 0; for (let n = 0; n < N; n++) { const y = b[i], v = out[n] + y * .5; b[i] = v; out[n] = y - v * .5; i = (i + 1) % d; } }
    return out;
  };
  const vl = verb(L, 0), vr = verb(R, 23);
  let peak = 0;
  for (let n = 0; n < N; n++) { L[n] = Math.tanh((L[n] + vl[n] * rv.mix * 2.2) * 1.1); R[n] = Math.tanh((R[n] + vr[n] * rv.mix * 2.2) * 1.1); peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n])); }
  const g = peak > 0 ? .89 / peak : 1;
  const fadeIn = Math.floor(.05 * sr);
  for (let n = 0; n < N; n++) { const f = Math.min(1, n / fadeIn); L[n] *= g * f; R[n] *= g * f; }
  return [L, R];
}
