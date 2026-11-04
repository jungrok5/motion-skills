// aesthetics-film · score.js — the score, synthesised (no samples): a plucked long zither (Karplus–Strong with slides,
// the guqin / gayageum / koto family), a bamboo flute, a low drone, bronze bells and a gong, frame drum and woodblock,
// and noise beds (wind, rain, water). Moods are written per chapter; melodies are generated from a seeded scale so
// the same spec always gives the same samples. Runs in the browser (live player) and in Node (scripts/score.mjs).
//
// spec = {
//   tonic: "D" | 146.8,  scale: "gong" | "zhi" | "yu" | "pyeongjo" | "in" | "dorian" | … (SCALES), bpm: 56, seed: 3,
//   sections: [{ at: 0, mood: "mist", gain: 1 }, …],   moods: mist · walk · flute · still · flow · night · close · silence
//   hits: [{ at: 12.4, kind: "bell" | "gong" | "pluck" | "chime" | "drum" | "wood" | "swell" | "water" | "rain" | "wind", dur, deg, gain }],
//   reverb: 0.35, gain: 1, end: <s> (fade out by)
// }
export const SCALES = {
  gong: [0, 2, 4, 7, 9], shang: [0, 2, 5, 7, 10], jue: [0, 3, 5, 8, 10], zhi: [0, 2, 5, 7, 9], yu: [0, 3, 5, 7, 10],
  pyeongjo: [0, 2, 5, 7, 9], gyemyeonjo: [0, 3, 5, 7, 10],
  in: [0, 1, 5, 7, 8], yo: [0, 2, 5, 7, 9], ryukyu: [0, 4, 5, 7, 11],
  major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], hijaz: [0, 1, 4, 5, 7, 8, 10],
};
const NOTE = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
const rngF = (seed) => { let s = Math.abs(Math.floor(seed * 9301 + 49297)) % 2147483646 || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };

export function renderScore(spec, SR = 48000, dur = 60) {
  const N = Math.ceil(dur * SR), L = new Float32Array(N), R = new Float32Array(N), wetL = new Float32Array(N), wetR = new Float32Array(N);
  const r = rngF(spec.seed ?? 3);
  const tonicHz = typeof spec.tonic === "number" ? spec.tonic : 130.81 * Math.pow(2, (NOTE[spec.tonic ?? "D"] ?? 2) / 12);
  const scale = SCALES[spec.scale ?? "gong"] ?? SCALES.gong, beat = 60 / (spec.bpm ?? 56);
  /** frequency of a scale degree (0 = tonic; negative and > scale length wrap octaves) */
  const deg = (d, oct = 0) => { const n = scale.length, o = Math.floor(d / n), i = ((d % n) + n) % n; return tonicHz * Math.pow(2, oct + o + scale[i] / 12); };
  const put = (buf, i, v) => { if (i >= 0 && i < N) buf[i] += v; };
  const add = (i, v, pan = 0, wet = 0.35) => { if (i < 0 || i >= N) return; const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4); L[i] += v * gl; R[i] += v * gr; wetL[i] += v * gl * wet; wetR[i] += v * gr * wet; };

  // ---------------- instruments ----------------
  /** plucked zither: Karplus–Strong with fractional delay (so a note can slide), soft noise excitation */
  function pluck(t, f, amp = 0.3, o = {}) {
    const i0 = Math.round(t * SR), len = Math.round((o.dur ?? 4.5) * SR), maxD = Math.ceil(SR / Math.min(f, f * (o.slideTo ?? 1)) * 1.1) + 4;
    const buf = new Float32Array(maxD * 2 + len + 4), rr = rngF(f * 7 + t * 13);
    const d0 = SR / f, exLen = Math.round(d0);
    let lp = 0; for (let i = 0; i < exLen; i++) { const n = rr() * 2 - 1; lp += ((o.bright ?? 0.45)) * (n - lp); buf[i] = lp * Math.sin(Math.PI * i / exLen); }
    const damp = o.damp ?? 0.996, pan = o.pan ?? 0, slideAt = (o.slideAt ?? 0.35) * SR, slideDur = (o.slideDur ?? 0.25) * SR;
    for (let n = exLen; n < len + exLen; n++) {
      let d = d0; if (o.slideTo) { const k = Math.min(1, Math.max(0, (n - exLen - slideAt) / slideDur)); d = d0 / (1 + (o.slideTo - 1) * k * k * (3 - 2 * k)); }
      const p = n - d, i = Math.floor(p), fr = p - i, a = buf[i] ?? 0, b = buf[i + 1] ?? 0, c = buf[i - 1] ?? 0;
      buf[n] += damp * (0.5 * ((a * (1 - fr) + b * fr) + (c * (1 - fr) + a * fr)));
      const env = Math.min(1, (len + exLen - n) / (0.3 * SR));
      add(i0 + n - exLen, buf[n] * amp * env, pan, o.wet ?? 0.4);
    }
  }
  /** bamboo flute: sine + a little second harmonic + breath, scoop into the note, vibrato after it settles */
  function flute(t, f, d, amp = 0.12, o = {}) {
    const i0 = Math.round(t * SR), n = Math.round(d * SR), rr = rngF(f + t), pan = o.pan ?? 0.15;
    let ph = 0, bp1 = 0, bp2 = 0;
    for (let i = 0; i < n; i++) {
      const s = i / SR, att = Math.min(1, s / 0.18), rel = Math.min(1, (d - s) / 0.35), env = att * att * Math.max(0, rel);
      const scoop = Math.pow(2, (-0.3 * Math.exp(-s / 0.08)) / 12), vib = 1 + 0.005 * Math.sin(2 * Math.PI * 5.2 * s) * Math.min(1, Math.max(0, (s - 0.35) / 0.4));
      ph += (2 * Math.PI * f * scoop * vib) / SR;
      const noise = rr() * 2 - 1; bp1 += 0.12 * (noise - bp1); bp2 += 0.12 * (bp1 - bp2);
      const v = (Math.sin(ph) + 0.18 * Math.sin(2 * ph) + 0.05 * Math.sin(3 * ph)) * (0.9 + 0.1 * Math.sin(2 * Math.PI * 0.7 * s)) + (bp1 - bp2) * 3.5 * (0.35 + 0.65 * (1 - att));
      add(i0 + i, v * env * amp, pan, o.wet ?? 0.5);
    }
  }
  /** a low drone: three detuned voices, lowpassed, slow breathing */
  function drone(t0, t1, f, amp = 0.06) {
    const i0 = Math.max(0, Math.round(t0 * SR)), i1 = Math.min(N, Math.round(t1 * SR)), fade = 2.5;
    let p1 = 0, p2 = 0, p3 = 0, l1 = 0, l2 = 0;
    for (let i = i0; i < i1; i++) {
      const s = i / SR, env = Math.min(1, (s - t0) / fade, (t1 - s) / fade) * (0.8 + 0.2 * Math.sin(2 * Math.PI * 0.08 * s));
      p1 += f / SR; p2 += (f * 1.003) / SR; p3 += (f * 1.5 * 0.998) / SR;
      const tri = (p) => 4 * Math.abs((p % 1) - 0.5) - 1;
      const v = tri(p1) + tri(p2) * 0.8 + tri(p3) * 0.35;
      l1 += 0.02 * (v - l1); l2 += 0.02 * (l1 - l2);
      add(i, l2 * amp * Math.max(0, env), 0, 0.25);
    }
  }
  /** bronze bell: inharmonic partials with their own decays */
  function bell(t, f, amp = 0.12, o = {}) {
    const parts = o.gong ? [[1, 1, 6], [1.48, 0.5, 4], [2.1, 0.35, 3], [2.9, 0.2, 2]] : [[1, 1, 5], [2.0, 0.55, 3.5], [2.76, 0.4, 2.2], [5.4, 0.22, 1.2], [8.93, 0.12, 0.7]];
    const i0 = Math.round(t * SR), len = Math.round((o.dur ?? 6) * SR), pan = o.pan ?? -0.2;
    for (let i = 0; i < len; i++) {
      const s = i / SR, glide = o.gong ? 1 - 0.015 * Math.min(1, s / 2) : 1; let v = 0;
      for (const [m, a, dc] of parts) v += a * Math.exp(-s / dc) * Math.sin(2 * Math.PI * f * m * glide * s + m) * (1 + 0.15 * Math.sin(2 * Math.PI * 0.9 * s * m));
      add(i0 + i, v * amp * Math.min(1, s / 0.004), pan, 0.55);
    }
  }
  function drum(t, amp = 0.35) {
    const i0 = Math.round(t * SR), rr = rngF(t * 3); let ph = 0;
    for (let i = 0; i < SR * 0.9; i++) { const s = i / SR, f = 55 + 70 * Math.exp(-s / 0.05); ph += 2 * Math.PI * f / SR; add(i0 + i, (Math.sin(ph) * Math.exp(-s / 0.28) + (rr() * 2 - 1) * Math.exp(-s / 0.012) * 0.3) * amp, 0, 0.3); }
  }
  function wood(t, amp = 0.2) {
    const i0 = Math.round(t * SR); for (let i = 0; i < SR * 0.15; i++) { const s = i / SR; add(i0 + i, (Math.sin(2 * Math.PI * 820 * s) + 0.5 * Math.sin(2 * Math.PI * 1230 * s)) * Math.exp(-s / 0.025) * amp, 0.3, 0.4); }
  }
  /** filtered noise bed: kind "wind" (moving band), "rain" (bright hiss + drops), "swell" (rising air) */
  function noise(t0, t1, kind = "wind", amp = 0.05) {
    const i0 = Math.max(0, Math.round(t0 * SR)), i1 = Math.min(N, Math.round(t1 * SR)), rr = rngF(t0 * 11 + 5), fade = kind === "swell" ? (t1 - t0) : 2;
    let low = 0, band = 0, lp = 0;
    for (let i = i0; i < i1; i++) {
      const s = i / SR, w = rr() * 2 - 1;
      let env = Math.min(1, (s - t0) / fade, (t1 - s) / (kind === "swell" ? 0.4 : fade));
      let v;
      if (kind === "rain") { lp += 0.6 * (w - lp); v = (w - lp) * 0.5; if (rr() < 0.0006) { const f = 1800 + rr() * 2500; for (let k = 0; k < 600; k++) put(L, i + k, Math.sin(2 * Math.PI * f * k / SR) * Math.exp(-k / 120) * amp * 2); } }
      else { const fc = kind === "swell" ? 0.01 + 0.05 * ((s - t0) / (t1 - t0)) : 0.008 + 0.012 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.07 * s + 1)); low += fc * (band - low * 0.1 + w * 0.5 - low); band += fc * (w - band); v = low * 1.6; }
      const pn = Math.sin(2 * Math.PI * 0.05 * s) * 0.5;
      add(i, v * amp * Math.max(0, env), pn, 0.2);
    }
  }
  function water(t, n = 6) { for (let k = 0; k < n; k++) { const tt = t + k * (0.3 + r() * 0.7), f = 900 + r() * 1400, i0 = Math.round(tt * SR); for (let i = 0; i < SR * 0.12; i++) { const s = i / SR; add(i0 + i, Math.sin(2 * Math.PI * f * (1 + 2 * s) * s) * Math.exp(-s / 0.03) * 0.05, r() - 0.5, 0.6); } } }

  // ---------------- melody ----------------
  /** a phrase of n notes walking the scale (mostly steps), ending on a stable degree */
  function phrase(n, start = 2) {
    const out = []; let d = start;
    for (let i = 0; i < n; i++) { out.push(d); const st = r(); d += st < 0.4 ? 1 : st < 0.8 ? -1 : st < 0.9 ? 2 : -2; d = Math.max(-2, Math.min(9, d)); }
    out[n - 1] = r() < 0.6 ? 0 : scale.length > 5 ? 4 : 3;
    return out;
  }
  const RHY = [1, 1, 2, 0.5, 0.5, 1.5, 3];

  // ---------------- moods ----------------
  const secs = (spec.sections ?? [{ at: 0, mood: "mist" }]).map((s, i, a) => ({ ...s, to: a[i + 1]?.at ?? (spec.end ?? dur) }));
  for (const S of secs) {
    const g = S.gain ?? 1, t0 = S.at, t1 = S.to, m = S.mood;
    if (m === "silence") continue;
    if (m !== "close") drone(t0, t1 + 1.5, deg(0, -2), 0.05 * g * (m === "still" || m === "night" ? 0.8 : 1));
    if (m === "mist") { noise(t0, t1 + 1, "wind", 0.05 * g); for (let t = t0 + 0.8 + r() * 1.5; t < t1 - 1.5; t += beat * (3 + Math.floor(r() * 3))) pluck(t, deg(Math.floor(r() * 7) - 1), 0.22 * g, { slideTo: r() < 0.3 ? Math.pow(2, 2 / 12) : null, pan: r() - 0.5 }); }
    if (m === "walk" || m === "flow") {
      let t = t0 + 0.5;
      while (t < t1 - 2) {
        const ph = phrase(4 + Math.floor(r() * 4), Math.floor(r() * 5));
        for (const d of ph) { if (t > t1 - 1.5) break; const len = RHY[Math.floor(r() * RHY.length)] * beat; pluck(t, deg(d), 0.26 * g, { slideTo: r() < 0.18 ? Math.pow(2, (r() < 0.5 ? 2 : -1) / 12) : null, pan: -0.25 + r() * 0.2, dur: 3 + len }); if (m === "flow" && r() < 0.5) pluck(t + beat * 0.5, deg(d + 2), 0.12 * g, { pan: 0.3 }); t += len; }
        t += beat * (2 + Math.floor(r() * 2));
      }
      if (m === "flow") { let tf = t0 + beat * 4; while (tf < t1 - 3) { const ph = phrase(3 + Math.floor(r() * 2), 4); for (const d of ph) { const len = (2 + Math.floor(r() * 3)) * beat; if (tf + len > t1 - 0.5) break; flute(tf, deg(d, 1), len * 0.95, 0.07 * g); tf += len; } tf += beat * 3; } }
    }
    if (m === "flute") { let t = t0 + 0.8; while (t < t1 - 2.5) { const ph = phrase(3 + Math.floor(r() * 3), 3); for (const d of ph) { const len = (1.5 + Math.floor(r() * 3)) * beat; if (t + len > t1 - 0.5) break; flute(t, deg(d, 1), len * 0.95, 0.1 * g); t += len; } t += beat * (2 + r() * 2); } for (let t = t0 + 1; t < t1 - 1; t += beat * 8) pluck(t, deg(0, -1), 0.18 * g, { dur: 6 }); }
    if (m === "still") { for (let t = t0 + 1; t < t1 - 1; t += beat * (6 + Math.floor(r() * 4))) bell(t, deg(Math.floor(r() * 3) * 2, 1), 0.06 * g, { pan: r() - 0.5 }); noise(t0, t1, "wind", 0.025 * g); }
    if (m === "night") { noise(t0, t1, "wind", 0.03 * g); for (let t = t0 + 2; t < t1 - 2; t += beat * (5 + Math.floor(r() * 4))) pluck(t, deg(Math.floor(r() * 5) - 3), 0.2 * g, { damp: 0.997, pan: r() - 0.5, bright: 0.3 }); }
    if (m === "close") { // a cadence: a slow upward run, the tonic with its fifth, a bell
      const run = [0, 1, 2, 3, 4, 5].map((d) => d - 2); run.forEach((d, i) => pluck(t0 + i * beat * 0.5, deg(d), 0.2 * g, { pan: -0.3 + i * 0.1 }));
      const tc = t0 + run.length * beat * 0.5 + beat; pluck(tc, deg(0), 0.3 * g, { dur: 7 }); pluck(tc + 0.03, deg(0, -1), 0.24 * g, { dur: 7 }); pluck(tc + 0.06, deg(scale.indexOf(7) >= 0 ? scale.indexOf(7) : 3), 0.18 * g, { dur: 7 });
      bell(tc + 0.02, deg(0, 1), 0.08 * g, { dur: 8 }); drone(t0, Math.min(t1, tc + 7), deg(0, -2), 0.05 * g);
    }
  }
  for (const h of spec.hits ?? []) {
    const g = h.gain ?? 1;
    if (h.kind === "bell") bell(h.at, deg(h.deg ?? 0, 1), 0.1 * g);
    else if (h.kind === "gong") bell(h.at, deg(0, -1), 0.16 * g, { gong: true, dur: 8 });
    else if (h.kind === "chime") [0, 2, 4].forEach((d, i) => bell(h.at + i * 0.09, deg(d, 2), 0.035 * g, { dur: 3, pan: -0.4 + i * 0.4 }));
    else if (h.kind === "pluck") pluck(h.at, deg(h.deg ?? 0), 0.3 * g, { slideTo: h.slide ? Math.pow(2, h.slide / 12) : null, dur: 5 });
    else if (h.kind === "drum") drum(h.at, 0.35 * g);
    else if (h.kind === "wood") wood(h.at, 0.2 * g);
    else if (h.kind === "swell") noise(h.at, h.at + (h.dur ?? 2), "swell", 0.08 * g);
    else if (h.kind === "rain") noise(h.at, h.at + (h.dur ?? 8), "rain", 0.04 * g);
    else if (h.kind === "wind") noise(h.at, h.at + (h.dur ?? 6), "wind", 0.06 * g);
    else if (h.kind === "water") water(h.at, h.n ?? 6);
  }

  // ---------------- reverb (Freeverb: 8 combs + 4 allpasses per side) ----------------
  const room = 0.84 + 0.1 * Math.min(1, spec.reverb ?? 0.5), dampR = 0.35, wetGain = 0.9 * (spec.reverb ?? 0.5);
  const CMB = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], AP = [556, 441, 341, 225], sc = SR / 44100;
  const verb = (inp, out, spread) => {
    const cs = CMB.map((d) => ({ b: new Float32Array(Math.round((d + spread) * sc)), i: 0, f: 0 })), as = AP.map((d) => ({ b: new Float32Array(Math.round((d + spread) * sc)), i: 0 }));
    for (let n = 0; n < N; n++) {
      const x = inp[n] * 0.015; let y = 0;
      for (const c of cs) { const o = c.b[c.i]; c.f = o * (1 - dampR) + c.f * dampR; c.b[c.i] = x + c.f * room; c.i = (c.i + 1) % c.b.length; y += o; }
      for (const a of as) { const o = a.b[a.i]; a.b[a.i] = y + o * 0.5; a.i = (a.i + 1) % a.b.length; y = o - y; }
      out[n] += y * wetGain;
    }
  };
  verb(wetL, L, 0); verb(wetR, R, 23);

  // ---------------- master: fade out, soft clip, normalise ----------------
  const end = spec.end ?? dur, fo = 2.5;
  let peak = 0;
  for (let n = 0; n < N; n++) { const s = n / SR, f = s > end - fo ? Math.max(0, (end - s) / fo) : 1, fi = Math.min(1, s / 0.3); L[n] = Math.tanh(L[n] * f * fi * 1.2) ; R[n] = Math.tanh(R[n] * f * fi * 1.2); peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n])); }
  const k = peak > 0 ? (0.85 / peak) * (spec.gain ?? 1) : 1;
  for (let n = 0; n < N; n++) { L[n] *= k; R[n] *= k; }
  return [L, R];
}
