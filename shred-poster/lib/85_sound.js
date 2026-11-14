// shred-poster · 85_sound — the sound design, synthesised from the film's own timings, so it follows any poster, any
// cut and any beat sheet: the rip of every strip, the camera's whoosh, ribbons swishing down and patting onto the pile,
// the shredder's motor under load with the cutting grain, strips sliding home and a click on every landing (the last
// one heavier). Mastered to an integrated loudness (default −14 LUFS, the social platforms' target) with a soft
// ceiling at −1 dBFS. The tail wraps around to the start, so the sound loops with the picture.
//
//   SP.sound(cues, { duration, rate, lufs, character }) → { L, R, rate, lufs, peak }
//   cues: [{ t, kind: 'rip'|'whoosh'|'swish'|'pat'|'motor'|'grain'|'slide'|'click'|'thump', … }]
{
  // RBJ cookbook biquad; .set() retunes it without resetting its state (for sweeps)
  const biquadVar = (rate) => {
    let B0 = 1, B1 = 0, B2 = 0, A1 = 0, A2 = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    const f = (x) => { const y = B0 * x + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
    f.set = (type, fc, q) => {
      const w = (SP.TAU * Math.min(fc, rate * 0.45)) / rate, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
      let b0, b1, b2; const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
      if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
      else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
      else { b0 = a; b1 = 0; b2 = -a; }   // band-pass, 0 dB peak
      B0 = b0 / a0; B1 = b1 / a0; B2 = b2 / a0; A1 = a1 / a0; A2 = a2 / a0; return f;
    };
    return f;
  };
  const biquad = (type, fc, q, rate) => biquadVar(rate).set(type, fc, q);
  SP.biquad = biquad;

  // integrated loudness, ITU-R BS.1770 (K-weighting at 48 kHz, 400 ms blocks, absolute and relative gates)
  SP.lufs = (L, R, rate) => {
    const kw = (x) => { const o = new Float32Array(x.length); let a1 = 0, a2 = 0, b1 = 0, b2 = 0, c1 = 0, c2 = 0, d1 = 0, d2 = 0;
      for (let i = 0; i < x.length; i++) { const v = x[i]; const y = 1.53512485958697 * v - 2.69169618940638 * a1 + 1.19839281085285 * a2 + 1.69065929318241 * b1 - 0.73248077421585 * b2; a2 = a1; a1 = v; b2 = b1; b1 = y;
        const z = y - 2 * c1 + c2 + 1.99004745483398 * d1 - 0.99007225036621 * d2; c2 = c1; c1 = y; d2 = d1; d1 = z; o[i] = z; } return o; };
    const l = kw(L), r = kw(R), blk = Math.round(0.4 * rate), hop = Math.round(0.1 * rate), ms = [];
    for (let s = 0; s + blk <= l.length; s += hop) { let a = 0; for (let i = s; i < s + blk; i++) a += l[i] * l[i] + r[i] * r[i]; ms.push(a / blk); }
    const lu = (m) => -0.691 + 10 * Math.log10(m + 1e-12);
    let g = ms.filter((m) => lu(m) > -70); if (!g.length) return -70;
    const rel = lu(g.reduce((a, b) => a + b, 0) / g.length) - 10; g = g.filter((m) => lu(m) > rel);
    return lu(g.reduce((a, b) => a + b, 0) / g.length);
  };

  SP.sound = (cues, o = {}) => {
    const rate = o.rate || 48000, DUR = o.duration, N = Math.round(DUR * rate), M = N * 2;   // render twice the length, fold the tail
    const L = new Float32Array(M), R = new Float32Array(M), rng = SP.rng(o.seed || 77);
    const ch = { bright: 1, body: 1, ...(o.character || {}) };   // a topic can make the paper crisper (bright) or heavier (body)
    const put = (i, v, pan = 0) => { if (i < 0 || i >= M) return; L[i] += v * Math.sqrt(0.5 * (1 - pan)); R[i] += v * Math.sqrt(0.5 * (1 + pan)); };
    const S = (t) => Math.round(t * rate);
    const env = (u, a, d) => (u < a ? u / a : Math.exp(-(u - a) / d));
    // ── the voices ──
    const V = {
      // a tear: crackle (sparse impulses with fast decays) through a paper band, plus a breath of hiss
      rip(c) { const n = S(c.dur || 0.16), bp = biquad('bp', 2600 * ch.bright, 0.7, rate), hp = biquad('hp', 900, 0.7, rate), g = c.gain ?? 0.5; let imp = 0;
        for (let i = 0; i < n; i++) { const u = i / n; if (rng() < 0.05 * (1 - u)) imp += rng.uni(0.3, 1) * (rng() < 0.5 ? -1 : 1); imp *= 0.86; const e = env(u, 0.06, 0.35); put(S(c.t) + i, g * e * (hp(imp) * 0.9 + bp(rng() * 2 - 1) * 0.5), c.pan || 0); } },
      // air past the lens: band-passed noise sweeping in frequency
      whoosh(c) { const n = S(c.dur || 0.35), g = c.gain ?? 0.35, f = biquadVar(rate);
        for (let i = 0; i < n; i++) { const u = i / n; if (i % 32 === 0) f.set('bp', SP.lerp(c.f0 || 300, c.f1 || 2400, u * u), 1.1);
          put(S(c.t) + i, g * Math.sin(Math.PI * u) ** 2 * f(rng() * 2 - 1) * 2.2, c.pan || 0); } },
      // a ribbon falling: a soft swish that ends at touchdown
      swish(c) { const n = S(c.dur || 0.3), bp = biquad('bp', 1300 * ch.bright, 0.9, rate), g = c.gain ?? 0.18;
        for (let i = 0; i < n; i++) { const u = i / n; put(S(c.t - (c.dur || 0.3)) + i, g * u ** 1.5 * (0.6 + 0.4 * Math.sin(u * 40 + c.t)) * bp(rng() * 2 - 1) * 1.8, c.pan || 0); } },
      // paper landing on paper: a low, short pat
      pat(c) { const n = S(0.07), lp = biquad('lp', 700 * ch.body, 0.8, rate), g = c.gain ?? 0.45;
        for (let i = 0; i < n; i++) { const u = i / n; put(S(c.t) + i, g * Math.exp(-u * 9) * (lp(rng() * 2 - 1) * 1.6 + 0.4 * Math.sin(SP.TAU * 110 * i / rate) * Math.exp(-u * 14)), c.pan || 0); } },
      // the motor: harmonics on a fundamental that sags under load, a gear whine, a noise bed
      motor(c) { const t0 = S(c.t), n = S(c.dur), g = c.gain ?? 0.16, lp = biquad('lp', 500, 0.7, rate); let ph = 0, ph2 = 0;
        for (let i = 0; i < n; i++) { const tt = c.t + i / rate, load = c.load ? c.load(tt) : 0, f0 = 49 * (1 - 0.09 * load) * (c.spin ? c.spin(tt) : 1); ph += f0 / rate; ph2 += (f0 * 19.3) / rate;
          let v = 0; for (let h = 1; h <= 7; h++) v += Math.sin(SP.TAU * ph * h + h) / h ** 1.1; v = v * 0.5 + 0.08 * Math.sin(SP.TAU * ph2) + lp(rng() * 2 - 1) * 0.5;
          const e = SP.sat((i / rate) / 0.08) * SP.sat((n - i) / rate / 0.12) * (c.spin ? c.spin(tt) : 1); put(t0 + i, g * e * (1 + 0.6 * load) * v, 0); } },
      // the cutting grain: dense crackle while paper is in the nip, its rate following the feed
      grain(c) { const t0 = S(c.t), n = S(c.dur), hp = biquad('hp', 1400 * ch.bright, 0.7, rate), bp = biquad('bp', 3200 * ch.bright, 1, rate), g = c.gain ?? 0.32; let imp = 0;
        for (let i = 0; i < n; i++) { const tt = c.t + i / rate, load = c.load ? c.load(tt) : 1; if (rng() < 0.09 * load) imp += rng.uni(0.2, 1) * rng.sign(); imp *= 0.8; put(t0 + i, g * load * (hp(imp) + 0.25 * bp(rng() * 2 - 1)), rng.uni(-0.3, 0.3)); } },
      // a strip coasting home: a faint high hiss, fading in as it nears its landing
      slide(c) { const n = S(c.dur), bp = biquad('bp', 3400 * ch.bright, 0.8, rate), g = c.gain ?? 0.05;
        for (let i = 0; i < n; i++) { const u = i / n; put(S(c.t) + i, g * u ** 2 * bp(rng() * 2 - 1) * 2, c.pan || 0); } },
      // a strip snapping into line: a tick, a paper slap under it; `big` adds weight (the last landing)
      click(c) { const n = S(c.big ? 0.22 : 0.06), hp = biquad('hp', 2500 * ch.bright, 0.7, rate), lp = biquad('lp', 900 * ch.body, 0.7, rate), g = c.gain ?? 0.5, f = c.f || rng.uni(2100, 2900);
        for (let i = 0; i < n; i++) { const s = i / rate, nz = rng() * 2 - 1; let v = hp(nz) * Math.exp(-s / 0.0018) * 1.4 + Math.sin(SP.TAU * f * s) * Math.exp(-s / 0.012) * 0.35 + lp(nz) * Math.exp(-s / 0.02) * 0.9;
          if (c.big) v += Math.sin(SP.TAU * 72 * s) * Math.exp(-s / 0.07) * 1.1 * ch.body + lp(nz) * Math.exp(-s / 0.05) * 0.5;
          put(S(c.t) + i, g * v, c.pan || 0); } },
      // low weight (a hit under a cut)
      thump(c) { const n = S(0.3), g = c.gain ?? 0.5; for (let i = 0; i < n; i++) { const s = i / rate; put(S(c.t) + i, g * Math.sin(SP.TAU * (60 + 40 * Math.exp(-s / 0.03)) * s) * Math.exp(-s / 0.09) * ch.body, 0); } },
    };
    for (const c of cues) { const v = V[c.kind]; if (v) v(c); }
    // room tone (a quiet, slightly coloured bed so silence is not digital)
    { const lp = biquad('lp', 1800, 0.5, rate), lp2 = biquad('lp', 1800, 0.5, rate); for (let i = 0; i < M; i++) { L[i] += lp(rng() * 2 - 1) * 0.0025; R[i] += lp2(rng() * 2 - 1) * 0.0025; } }
    // fold the second pass onto the first: the loop is seamless
    const oL = new Float32Array(N), oR = new Float32Array(N);
    for (let i = 0; i < M; i++) { oL[i % N] += L[i]; oR[i % N] += R[i]; }
    // master: gain to the loudness target, then a soft ceiling at −1 dBFS
    const target = o.lufs ?? -14, now = SP.lufs(oL, oR, rate), gain = Math.pow(10, (target - now) / 20), ceil = Math.pow(10, -1 / 20), knee = 0.72;
    const soft = (x) => { const a = Math.abs(x); return a < knee ? x : Math.sign(x) * (knee + (ceil - knee) * Math.tanh((a - knee) / (ceil - knee))); };
    let peak = 0; for (let i = 0; i < N; i++) { oL[i] = soft(oL[i] * gain); oR[i] = soft(oR[i] * gain); peak = Math.max(peak, Math.abs(oL[i]), Math.abs(oR[i])); }
    return { L: oL, R: oR, rate, lufs: SP.lufs(oL, oR, rate), peak: 20 * Math.log10(peak + 1e-12) };
  };

  // 16-bit stereo WAV, base64 (for the render script to mux)
  SP.wavB64 = (snd) => {
    const n = snd.L.length, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf), w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, snd.rate, true); v.setUint32(28, snd.rate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, SP.clamp(Math.round(snd.L[i] * 32767), -32768, 32767), true); v.setInt16(46 + i * 4, SP.clamp(Math.round(snd.R[i] * 32767), -32768, 32767), true); }
    const u8 = new Uint8Array(buf); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s);
  };
}
