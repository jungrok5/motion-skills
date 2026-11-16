// scanned-realm · 85_audio — what the realm sounds like, all of it made here from noise and sine waves: no files, no
// network, no libraries.  One graph builder serves the live AudioContext and an OfflineAudioContext, so a check can
// render a scenario and measure it.  The beds (wind, rain, water, fire) are a few shared looping noise buffers
// through filters; the voices (birds, bells, steps, thunder) are oscillators and noise slices scheduled a little
// ahead with AudioParam automation — nothing is computed per sample while the realm runs.
//   LR.audio.init()                  from a user gesture; safe to call again (it resumes a suspended context)
//   LR.audio.update(dt, s)           every frame — s = { x, y, z, yaw, speed, moving, running, surface, sheltered }
//                                    (footsteps are timed here from speed; s.autoStep === false leaves them to step())
//   LR.audio.step(surface, running)  one footstep now
//   LR.audio.setVolume(v) · mute(b) · muted · ready · mix { wind, birds, insects, rain, world, steps, thunder }
//   LR.audio.reverb = false          before init(): leave out the one costly node (the open-air reverb)
//   LR.audio.renderOffline(seconds, scenario) → Promise<{ peak, rms, sampleRate, … }>
// It reads LR.wx { tod, season, rain, snowfall, snow, wind, wet } and LR.world.sounds [{ x, y, z, kind, r, gain }]
// and hears LR.emit('thunder', delaySeconds).  ?off=audio and still-render mode make every method a no-op.
{
  const A = (LR.audio = { ready: false, muted: false, volume: 0.8, reverb: true, ctx: null, errors: 0,
    mix: { wind: 1, birds: 1, insects: 1, rain: 1, world: 1, steps: 1, thunder: 1 } });
  const OFF = !!LR.RENDER || LR.off.has('audio');
  const win = typeof window !== 'undefined' ? window : {};
  const AC = win.AudioContext || win.webkitAudioContext, OAC = win.OfflineAudioContext || win.webkitOfflineAudioContext;
  const { clamp, sm, lerp } = LR, sat = (x) => (x < 0 ? 0 : x > 1 ? 1 : x), TAU = Math.PI * 2;
  const num = (v, d) => (typeof v === 'number' && v === v ? v : d);
  // smooth 1-D value noise, 0..1 — the slow hand behind gusts, drifts and lulls
  const vn = (x, s) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), a = LR.hash2(i, s), b = LR.hash2(i + 1, s); return a + (b - a) * u; };
  // bus levels (linear), set against renderOffline measurements: a bed to walk through, not a performance
  const LV = { master: 1.0, wind: 0.2, birds: 0.065, far: 0.034, insects: 0.075, rain: 0.245, world: 0.24, steps: 0.3, thunder: 0.13, reverb: 1.5 };
  const WX0 = { tod: 12, season: 0, rain: 0, snowfall: 0, snow: 0, wind: 0.25, wet: 0 };
  // sunrise and sunset (hours) for the season, on the sky's own latitude, so the chorus starts when the light does
  const sunTimes = (season) => { const rad = Math.PI / 180, lat = ((LR.sky && LR.sky.lat) || 47) * rad, dec = lerp(21, -20, season) * rad, h = (Math.acos(clamp(-Math.tan(lat) * Math.tan(dec), -1, 1)) * 12) / Math.PI; return [12 - h, 12 + h]; };

  // ── source material: a handful of seeded buffers, made on first use and shared by every context at that rate ─────
  const made = {};
  const buffer = (ctx, key) => {
    const sr = ctx.sampleRate, id = key + '@' + sr; if (made[id]) return made[id];
    const r = LR.rng('lr-audio-' + key);
    const mk = (ch, secs, rate, fill) => { const n = Math.round(secs * rate), b = ctx.createBuffer(ch, n, rate); for (let c = 0; c < ch; c++) fill(b.getChannelData(c), n, c); return b; };
    const norm = (d, rms) => { let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i]; const k = rms / Math.sqrt(s / d.length || 1); for (let i = 0; i < d.length; i++) d[i] *= k; };
    // a coloured noise has memory, so its loop point is cross-faded with what would have come next
    const coloured = (secs, next) => mk(2, secs, sr, (d, n) => { const m = Math.round(sr * 0.06), tail = new Float32Array(m); for (let i = 0; i < n + m; i++) { const v = next(r() * 2 - 1); if (i < n) d[i] = v; else tail[i - n] = v; } for (let i = 0; i < m; i++) { const u = (i / m) * Math.PI * 0.5; d[i] = d[i] * Math.sin(u) + tail[i] * Math.cos(u); } norm(d, 0.25); });
    // decaying pings at random: n of them, pitched f0 … f0·span, each lasting about t0 … t0 + t1 seconds
    const pings = (count, f0, span, t0, t1) => mk(2, 4, sr, (d, n) => { for (let j = 0; j < count; j++) { const p = Math.floor(r() * n), a = Math.pow(r(), 2.5) + 0.05, w = (TAU * f0 * Math.pow(span, r())) / sr, tau = (t0 + t1 * r() * r()) * sr, len = Math.floor(tau * 6), ph = r() * TAU; for (let i = 0; i < len; i++) d[(p + i) % n] += a * Math.exp(-i / tau) * Math.sin(w * i + ph); } norm(d, 0.12); });
    const variant = +key.replace(/\D/g, '') || 0;
    let b;
    if (key.slice(-2) === ':m') { const st = buffer(ctx, key.slice(0, -2)); b = ctx.createBuffer(1, st.length, st.sampleRate); b.getChannelData(0).set(st.getChannelData(0)); }   // one channel of it, for sources that have a place
    else if (key === 'white') b = mk(2, 2, sr, (d, n) => { for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * 0.433; });
    else if (key === 'pink') { let s = [0, 0, 0, 0, 0, 0, 0]; b = coloured(4, (w) => { s[0] = 0.99886 * s[0] + w * 0.0555179; s[1] = 0.99332 * s[1] + w * 0.0750759; s[2] = 0.969 * s[2] + w * 0.153852; s[3] = 0.8665 * s[3] + w * 0.3104856; s[4] = 0.55 * s[4] + w * 0.5329522; s[5] = -0.7616 * s[5] - w * 0.016898; const v = s[0] + s[1] + s[2] + s[3] + s[4] + s[5] + s[6] + w * 0.5362; s[6] = w * 0.115926; return v; }); }
    else if (key === 'brown') { let v = 0, dc = 0; const a = Math.exp((-TAU * 90) / sr), k = 1 - Math.exp((-TAU * 22) / sr); b = coloured(4, (w) => { v = v * a + w * (1 - a); dc += (v - dc) * k; return v - dc; }); }
    // thousands of tiny impacts: the grain in rain and in a fountain's fall; and fewer, fatter ones: rain on a roof, water off a wheel
    else if (key === 'drops') b = pings(1100, 1400, 5, 0.0006, 0.0022);
    else if (key === 'roof') b = pings(650, 380, 4.5, 0.0014, 0.005);
    // field crickets: chirps of three or four pulses, five chirps to a loop, none quite alike; each variant its own pitch and pace
    else if (key.slice(0, 7) === 'cricket') { const per = 0.38 + 0.035 * variant + r() * 0.02, car = 4350 + 250 * variant; b = mk(1, per * 5, sr, (d, n) => { for (let c = 0; c < 5; c++) { const t0 = c * per + 0.02 + r() * 0.012, amp = 0.75 + r() * 0.25, pulses = 3 + (r() < 0.35 ? 1 : 0); for (let p = 0; p < pulses; p++) { const s0 = Math.floor((t0 + p * 0.031) * sr), len = Math.floor(0.019 * sr), pa = amp * (0.55 + (0.45 * (p + 1)) / pulses); for (let i = 0; i < len && s0 + i < n; i++) { const u = i / len; d[s0 + i] += pa * Math.pow(Math.sin(Math.PI * u), 1.5) * Math.sin((TAU * (car - 150 * u) * i) / sr); } } } }); }
    // tree crickets: one long even trill
    else if (key.slice(0, 5) === 'trill') { const rate = 42 + 5 * variant, car = 3050 + 210 * variant, count = rate * 2; b = mk(1, 2, sr, (d, n) => { for (let p = 0; p < count; p++) { const s0 = Math.round((p * sr) / rate), len = Math.floor(0.013 * sr), pa = 0.7 + 0.3 * Math.sin((TAU * p * 3) / count) * Math.sin((TAU * p) / count); for (let i = 0; i < len && s0 + i < n; i++) d[s0 + i] += pa * Math.pow(Math.sin((Math.PI * i) / len), 2) * Math.sin((TAU * car * i) / sr); } }); }
    // slow random curves (peak 1, seamless) to move filters and levels with: wobble below ~7 Hz, flutter up to ~16 Hz
    else if (key === 'wobble' || key === 'flutter') b = mk(1, 8, sr, (d, n) => { const cn = 2048, c = new Float32Array(cn + 1), k0 = key === 'flutter' ? 8 : 2, k1 = key === 'flutter' ? 128 : 56; let pk = 0; for (let k = k0; k <= k1; k++) { const a = 1 / Math.sqrt(k), ph = r() * TAU, w = (TAU * k) / cn; for (let j = 0; j <= cn; j++) c[j] += a * Math.sin(w * j + ph); } for (let j = 0; j <= cn; j++) pk = Math.max(pk, Math.abs(c[j])); for (let i = 0; i < n; i++) { const x = (i / n) * cn, j = Math.floor(x), f = x - j; d[i] = (c[j] + (c[j + 1] - c[j]) * f) / pk; } });
    // the air of a village among trees: a few early returns off walls, then a short tail that darkens as it fades
    else if (key === 'ir') b = mk(2, 1.2, sr, (d, n) => { let lp = 0; for (let i = 0; i < n; i++) { const t = i / sr, k = 0.5 * Math.exp(-t * 2.4) + 0.07; lp += (r() * 2 - 1 - lp) * k; d[i] = lp * Math.exp(-t * 5) * (1 - Math.exp(-t * 70)) * Math.min(1, (n - i) / (0.05 * sr)); } for (let j = 0; j < 8; j++) d[Math.floor((0.016 + r() * 0.1) * sr)] += (r() < 0.5 ? -1 : 1) * 0.35 * (1 - j / 11); });
    else throw new Error('audio: no such buffer ' + key);
    return (made[id] = b);
  };

  // ── the graph: built the same way on a live or an offline context ────────────────────────────────────────────────
  const build = (ctx, o = {}) => {
    // offline: an OfflineAudioContext.  virtual: nothing is rendering yet and everything is scheduled ahead against E.vt
    const E = { ctx, offline: !!o.offline, virtual: !!o.virtual, vt: 0, t: 0, snap: true, mix: o.mix || A.mix };
    E.now = () => (E.virtual ? E.vt : ctx.currentTime); E.t = E.now();
    const R = LR.rng(o.seed || 'living-realm-audio'), buf = (k) => buffer(ctx, k);
    const G = (v) => { const g = ctx.createGain(); if (v !== undefined) g.gain.value = v; return g; };
    // filters are steered once per render block, not per sample: nothing here moves fast enough to need more
    const F = (type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q === undefined ? 0.707 : q; try { b.frequency.automationRate = b.detune.automationRate = 'k-rate'; } catch (e) { /* older engines: per sample, as before */ } return b; };
    const nop = () => {}, noParam = { value: 0, setValueAtTime: nop, setTargetAtTime: nop, linearRampToValueAtTime: nop };
    const PAN = (p) => { if (!ctx.createStereoPanner) { const g = ctx.createGain(); g.pan = noParam; return g; } const n = ctx.createStereoPanner(); if (p) n.pan.value = p; return n; };
    const chain = (...n) => { for (let i = 1; i < n.length; i++) n[i - 1].connect(n[i]); return n[n.length - 1]; };
    const dis = (...n) => { for (const x of n) if (x) { try { x.disconnect(); } catch (e) { /* already gone */ } } };
    // a controlled parameter: it remembers where it was sent, so a steady value costs nothing, and every move is a ramp
    const C = (p, v) => { p.value = v; return { p, v }; };
    const set = (c, v, tc) => { if (!(v === v) || Math.abs(v - c.v) <= 1e-5 + Math.abs(c.v) * 0.003) return; c.v = v; if (E.snap) c.p.setValueAtTime(v, E.t); else c.p.setTargetAtTime(v, E.t, tc || 0.12); };
    // how many of each kind of one-shot may sound at once
    const caps = { bird: 6, crack: 8, drip: 4, step: 8, frog: 4, hammer: 6, chime: 8, bell: 3, thunder: 2, creak: 3 }, busy = {};
    const room = (k, t) => { const l = busy[k] || (busy[k] = []); for (let i = l.length - 1; i >= 0; i--) if (l[i] <= t) l.splice(i, 1); return l.length < caps[k]; };
    const take = (k, end) => { (busy[k] || (busy[k] = [])).push(end); };
    // a bed that exists only while it is wanted: made on demand, faded, and three quiet seconds later taken down
    const lazy = (make) => { let v = null, idle = 0; return (on, dts, use) => { if (on) { if (!v) v = make(); idle = 0; use(v, 1); } else if (v) { use(v, 0); if ((idle += dts) > 3) { v.K.kill(); v = null; } } }; };
    // a kit: the standing nodes of one bed, started together and — when the bed falls silent — stopped and unhooked together
    const kit = () => {
      const K = { src: [], nodes: [] }, keep = (n) => (K.nodes.push(n), n);
      K.G = (v) => keep(G(v)); K.F = (a, b, c) => keep(F(a, b, c)); K.P = (p) => keep(PAN(p));
      K.loop = (key) => { const s = ctx.createBufferSource(); s.buffer = buf(key); s.loop = true; s.start(E.t, R() * s.buffer.duration * 0.98); K.src.push(s); return keep(s); };   // always at its own rate: a resampled loop costs fifteen plain ones
      K.osc = (type, f) => { const s = ctx.createOscillator(); s.type = type; s.frequency.value = f; s.start(E.t); K.src.push(s); return keep(s); };
      K.mod = (src, depth, param) => { const g = K.G(depth); src.connect(g); g.connect(param); };
      K.kill = () => { const t = E.t + 0.06, done = () => dis(...K.nodes); for (const s of K.src) { try { s.stop(t); } catch (e) { /* never started */ } } if (K.src[0]) K.src[0].onended = done; else done(); };
      return K;
    };

    // master: everything → a rumble filter → a gentle compressor → a soft ceiling that cannot be exceeded → volume → mute
    const sum = G(LV.master), hp = F('highpass', 38, 0.7), comp = ctx.createDynamicsCompressor(), pre = G(0.5), clip = ctx.createWaveShaper(), vol = G(0), gate = G(o.muted ? 0 : 1);
    comp.threshold.value = -20; comp.knee.value = 18; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.3;
    { const cv = new Float32Array(2049); for (let i = 0; i < 2049; i++) { const x = (i / 1024 - 1) * 2, a = Math.abs(x); cv[i] = Math.sign(x) * (a <= 0.6 ? a : 0.6 + 0.34 * Math.tanh((a - 0.6) / 0.34)); } clip.curve = cv; }
    chain(sum, hp, comp, pre, clip, vol, gate, ctx.destination);
    { const v = num(o.volume, 0.8); vol.gain.setValueAtTime(0, E.t); if (E.offline) vol.gain.linearRampToValueAtTime(v, 0.03); else vol.gain.setTargetAtTime(v, E.t + 0.05, 0.5); }
    E.setVolume = (v) => vol.gain.setTargetAtTime(v, ctx.currentTime, 0.08);
    E.mute = (m) => gate.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05);
    // far: what reaches the ear through open air (snow on the ground swallows its top).  near: what is at one's feet.
    const far = G(1), farLP = F('lowpass', 18000, 0.5), near = G(1), rvIn = G(1), rv = ctx.createConvolver(), rvOut = G(LV.reverb);
    chain(far, farLP, sum); near.connect(sum); if (o.reverb !== false) { rv.buffer = buf('ir'); chain(rvIn, rv, rvOut, farLP); }
    const cFar = C(far.gain, 1), cFarLP = C(farLP.frequency, 18000), trims = {};
    const bus = (name, lv, dest, send) => { const g = G(lv); g.connect(dest); if (send) chain(g, G(send), rvIn); (trims[name] = trims[name] || []).push([C(g.gain, lv), lv]); return g; };
    const windBus = bus('wind', LV.wind, far, 0), birdBus = bus('birds', LV.birds, far, 0.45), distBus = bus('birds', LV.far, far, 0.6), insBus = bus('insects', LV.insects, far, 0.05);
    const rainBus = bus('rain', LV.rain, sum, 0), dripBus = bus('rain', LV.rain, near, 0.2), stepBus = bus('steps', LV.steps, near, 0.1), thBus = bus('thunder', LV.thunder, sum, 0.5);

    // ── one-shots ──────────────────────────────────────────────────────────────────────────────────────────────────
    // a slice of noise through one filter under one envelope: o = { buf, type, f, f1, q, dur, a, att } or { …, curve }
    const nb = (out, t, n) => {
      const src = ctx.createBufferSource(), b = buf((n.buf || 'white') + ':m'), f = F(n.type || 'bandpass', n.f, n.q === undefined ? 0.8 : n.q), g = ctx.createGain(), dur = n.dur;
      src.buffer = b; if (n.f1) { f.frequency.setValueAtTime(n.f, t); f.frequency.exponentialRampToValueAtTime(n.f1, t + dur); }
      if (n.curve) g.gain.setValueCurveAtTime(n.curve, t, dur);
      else { const a = Math.max(1e-4, n.a); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + (n.att || 0.002)); g.gain.exponentialRampToValueAtTime(a * 0.002, t + dur); }
      chain(src, f, g, out); src.start(t, R() * (b.duration - dur - 0.1), dur + 0.02); src.onended = () => dis(src, f, g);
    };
    // a decaying partial: f Hz, level a, gone (−60 dB) after dec seconds
    const ping = (out, t, f, a, dec, att) => { const os = ctx.createOscillator(), g = G(0), t1 = t + (att || 0.002); os.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t1); g.gain.exponentialRampToValueAtTime(a * 0.001, t1 + dec); chain(os, g, out); os.start(t); os.stop(t1 + dec + 0.01); os.onended = () => dis(os, g); };
    // a ragged envelope — many small grains under one rise and fall — for crunches
    const grain = (n, a) => { const c = new Float32Array(n); for (let i = 1; i < n - 1; i++) { const u = i / (n - 1); c[i] = a * Math.min(1, u * 8) * Math.pow(1 - u, 1.4) * (0.12 + 0.88 * R() * R()); } return c; };
    // one oscillator sings a whole phrase: notes = [[at, dur, f0, f1, level, fMid?], …] in order, never overlapping
    const sing = (out, t0, notes, q) => {
      const os = ctx.createOscillator(), g = G(0), p = PAN(q.pan || 0), f = os.frequency, a = g.gain, att = q.att || 0.012, rel = q.rel || 0.03; let end = 0, mod = null, mg = null;
      for (const n of notes) { const t = t0 + n[0], d = n[1], at = Math.min(att, d * 0.35), rl = Math.min(rel, d * 0.5), lv = Math.max(1e-4, n[4] * q.amp);
        f.setValueAtTime(n[2], t); if (n[5]) f.exponentialRampToValueAtTime(n[5], t + d * 0.5); f.exponentialRampToValueAtTime(n[3], t + d);
        a.setValueAtTime(0, t); a.linearRampToValueAtTime(lv, t + at); a.setValueAtTime(lv, t + d - rl); a.linearRampToValueAtTime(0, t + d); end = n[0] + d; }
      if (q.fm) { mod = ctx.createOscillator(); mg = G(q.fm[1]); mod.frequency.value = q.fm[0]; chain(mod, mg); mg.connect(f); mod.start(t0); mod.stop(t0 + end + 0.05); }
      chain(os, g, p, out); os.start(t0); os.stop(t0 + end + 0.05); os.onended = () => dis(os, g, p, mod, mg);
      return end;
    };
    // a drop of water: a quick rising blip and the tick of its landing
    const drip = (out, t, v, pan) => {
      if (!room('drip', t)) return; const os = ctx.createOscillator(), g = G(0), p = PAN(pan), f = R.range(620, 1450);
      os.frequency.setValueAtTime(f, t); os.frequency.exponentialRampToValueAtTime(f * R.range(1.5, 2.1), t + 0.045);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.003); g.gain.exponentialRampToValueAtTime(v * 0.002, t + R.range(0.05, 0.09));
      chain(os, g, p, out); nb(p, t, { type: 'highpass', f: 3600, q: 0.5, dur: 0.008, a: v * 0.5, att: 0.0005 });
      os.start(t); os.stop(t + 0.1); os.onended = () => dis(os, g, p); take('drip', t + 0.1);
    };
    // wood under load: a slow sawtooth stick-slip ringing two body resonances
    const creak = (out, t, v, body) => {
      if (!room('creak', t)) return; const dur = R.range(0.22, 0.6), os = ctx.createOscillator(), f1 = F('bandpass', body * R.range(0.9, 1.15), 5), f2 = F('bandpass', body * R.range(2.6, 3.3), 7), g2 = G(0.5), g = G(0), p0 = R.range(34, 52);
      os.type = 'sawtooth'; os.frequency.setValueAtTime(p0, t); os.frequency.linearRampToValueAtTime(p0 * R.range(1.25, 1.7), t + dur * 0.6); os.frequency.linearRampToValueAtTime(p0 * R.range(0.8, 1.1), t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.05); g.gain.setValueAtTime(v, t + dur - 0.08); g.gain.linearRampToValueAtTime(0, t + dur);
      os.connect(f1); os.connect(f2); f1.connect(g); chain(f2, g2, g, out); os.start(t); os.stop(t + dur + 0.02); os.onended = () => dis(os, f1, f2, g2, g); take('creak', t + dur);
    };

    // ── wind: a low body, two wandering whooshes (one a little to each side), leaves in summer, a hollow note in winter ──
    const wind = (() => {
      const K = kit(), fA = K.F('bandpass', 480, 0.9), fB = K.F('bandpass', 560, 0.9), body = K.G(0), a = K.G(0), b = K.G(0);
      chain(K.loop('brown'), K.F('bandpass', 190, 0.4), body, windBus); chain(K.loop('pink:m'), fA, a, K.P(-0.5), windBus); chain(K.loop('pink:m'), fB, b, K.P(0.5), windBus);
      return { body: C(body.gain, 0), a: C(a.gain, 0), b: C(b.gain, 0), fA: C(fA.frequency, 480), fB: C(fB.frequency, 560) };
    })();
    const leaves = lazy(() => { const K = kit(), f = K.F('bandpass', 5200, 0.45), g = K.G(0); chain(K.loop('white'), f, g, windBus); return { K, g: C(g.gain, 0), f: C(f.frequency, 5200) }; });
    const howl = lazy(() => { const K = kit(), f = K.F('bandpass', 420, 6), g = K.G(0); chain(K.loop('pink:m'), f, g, K.P(0.25), windBus); return { K, g: C(g.gain, 0), f: C(f.frequency, 420) }; });
    const gust = (t, s) => sm(0.22, 0.78, vn(t * 0.08, s) * 0.5 + vn(t * 0.23 + 9.1, s + 3) * 0.32 + vn(t * 0.71 + 4.7, s + 7) * 0.18);
    const windTick = (t, e, dts) => {
      const w = e.wind, L = (0.06 + 0.94 * Math.pow(w, 1.25)) * (1 - 0.3 * e.sh), a = gust(t, 11), b = gust(t + 40, 23), m = (a + b) * 0.5, leafy = 1 - sm(0.3, 0.75, e.season); e.gust = m;
      set(wind.body, L * (0.45 + 0.55 * m) * 0.75, 0.4);
      set(wind.a, L * (0.25 + 0.75 * a) * 1.4, 0.35); set(wind.fA, lerp(250, 540, w) * (0.75 + 0.75 * a) * (1 - 0.2 * e.cold), 0.5);
      set(wind.b, L * (0.25 + 0.75 * b) * 1.4, 0.35); set(wind.fB, lerp(290, 620, w) * (0.75 + 0.75 * b) * (1 - 0.2 * e.cold), 0.5);
      leaves(leafy > 0.02, dts, (v, k) => { set(v.g, k * L * leafy * (0.15 + 0.85 * m * m) * (0.65 + 0.35 * vn(t * 2.3, 51)) * 0.8, 0.15); set(v.f, lerp(4200, 7000, w * (0.4 + 0.6 * m)), 0.4); });
      howl(e.cold > 0.02, dts, (v, k) => { set(v.g, k * L * e.cold * (0.12 + 0.88 * a * a) * 2.2, 0.6); set(v.f, 300 + 230 * b + 70 * vn(t * 0.5, 77), 0.8); });
    };

    // ── birds: each kind is a phrase generator; eight singers take turns, more of them the nearer it is to dawn ─────
    const P2 = (x) => Math.pow(2, x);
    const SP = {
      blackbird: { w: 3, lvl: 1, gap: [3.5, 8], make(r) { const n = [], k = 4 + r.int(4); let t = 0, f = 1900 * P2(r.range(0, 0.55));
        for (let i = 0; i < k; i++) { const d = r.range(0.13, 0.3), f1 = clamp(f * P2(r.range(-0.35, 0.35)), 1500, 3400); n.push([t, d, f, f1, r.range(0.65, 1), r() < 0.4 ? Math.sqrt(f * f1) * P2(r.range(-0.12, 0.2)) : 0]); t += d + r.range(0.03, 0.11); f = clamp(f1 * P2(r.range(-0.4, 0.45)), 1500, 3400); }
        if (r() < 0.45) { t += 0.03; for (let i = 0, m = 2 + r.int(3); i < m; i++) { const ff = r.range(4200, 6200); n.push([t, 0.05, ff, ff * r.range(0.85, 1.2), 0.28]); t += 0.075; } } return { n }; } },
      robin: { w: 3, lvl: 0.8, gap: [3, 7], winter: 1, make(r) { const n = [], k = 6 + r.int(7); let t = 0;
        for (let i = 0; i < k; i++) { const d = r.range(0.05, 0.15), f = r.range(2700, 5400); n.push([t, d, f, clamp(f * P2(r.range(-0.45, 0.45)), 2400, 6000), r.range(0.5, 1)]); t += d + (r() < 0.2 ? r.range(0.1, 0.2) : r.range(0.015, 0.06)); }
        return { n, fm: r() < 0.3 ? [r.range(28, 45), r.range(120, 300)] : null }; } },
      tit: { w: 2, lvl: 0.85, gap: [3, 8], winter: 1, make(r) { const n = [], k = 3 + r.int(4), hi = r.range(3900, 4700), lo = hi * r.range(0.72, 0.8), d = r.range(0.1, 0.13), g = r.range(0.035, 0.06); let t = 0;
        for (let i = 0; i < k; i++) { n.push([t, d, hi, hi * 0.975, 1]); t += d + g; n.push([t, d * 1.1, lo, lo * 0.97, 0.85]); t += d * 1.1 + g * 1.4; } return { n }; } },
      chiffchaff: { w: 2, lvl: 0.75, gap: [3, 7], make(r) { const n = [], k = 6 + r.int(7), ps = [r.range(4200, 4700), r.range(3500, 3900), r.range(3900, 4300)], per = r.range(0.25, 0.3);
        for (let i = 0; i < k; i++) { const p = ps[i % 5 === 4 ? 2 : (i + (r() < 0.2 ? 1 : 0)) % 2]; n.push([i * per, 0.085, p * 1.28, p * 0.9, r.range(0.8, 1)]); } return { n }; } },
      sparrow: { w: 3, lvl: 0.7, gap: [1.5, 5], winter: 1, make(r) { const n = [], k = 1 + r.int(4); let t = 0;
        for (let i = 0; i < k; i++) { const f = r.range(3000, 3700), d = r.range(0.06, 0.1); n.push([t, d, f, f * r.range(0.8, 0.95), r.range(0.6, 1), f * r.range(1.25, 1.45)]); t += d + r.range(0.12, 0.32); }
        return { n, fm: [r.range(70, 110), r.range(180, 380)] }; } },
      wren: { w: 1.5, lvl: 0.7, gap: [5, 11], make(r) { const n = []; let t = 0;
        for (let i = 0, k = 2 + r.int(3); i < k; i++) { const f = r.range(4800, 6400); n.push([t, 0.07, f, f * 0.82, 0.7]); t += 0.1; }
        const rate = r.range(13, 18), k = 9 + r.int(10), f = r.range(4600, 5600); for (let i = 0; i < k; i++) { n.push([t, 0.7 / rate, f, f * 0.8, 0.6 + 0.4 * Math.sin((Math.PI * i) / k)]); t += 1 / rate; }
        if (r() < 0.6) n.push([t + 0.02, 0.11, 3900, 5800, 0.7]); return { n }; } },
      // the two that carry from far off: a dove on a roof ridge, a cuckoo across the valley
      dove: { w: 1, lvl: 0.8, gap: [6, 14], far: 1, att: 0.05, rel: 0.09, make(r) { const n = [], f = r.range(440, 520), wood = r() < 0.5, reps = 2 + r.int(2); let t = 0;
        const pat = wood ? [[0.3, 1, 0.6], [0.46, 1.06, 1], [0.32, 1, 0.8], [0.2, 0.95, 0.6], [0.22, 0.93, 0.6]] : [[0.2, 1, 0.6], [0.52, 1.07, 1], [0.24, 0.92, 0.7]];
        for (let j = 0; j < reps; j++) { for (const p of pat) { n.push([t, p[0], f * p[1] * 0.97, f * p[1] * 0.985, p[2], f * p[1] * 1.02]); t += p[0] + 0.11; } t += wood ? 0.25 : 0.4; } return { n }; } },
      cuckoo: { w: 0.5, lvl: 0.9, gap: [14, 30], far: 1, att: 0.03, rel: 0.07, make(r) { const n = [], f = r.range(585, 640), k = 2 + r.int(4), per = r.range(1.15, 1.35);
        for (let i = 0; i < k; i++) { n.push([i * per, 0.17, f, f * 0.985, 1]); n.push([i * per + 0.33, 0.27, f * 0.83, f * 0.815, 0.9]); } return { n }; } },
    };
    const singers = []; for (let i = 0; i < 8; i++) singers.push({ r: R.fork('bird' + i), next: -1, sp: null, pan: 0, dist: 0.5 });
    const cast = (sl, e) => {
      const r = sl.r; let tot = 0; const ws = [];
      for (const k in SP) { const sp = SP[k]; let w = sp.w; if (e.cold > 0.5 && !sp.winter) w = 0; if (k === 'cuckoo' && (e.tod > 11 || e.warm < 0.8)) w = 0; if (k === 'dove' && e.chorus > 0.8) w *= 0.5; if (k === 'blackbird' && e.dusk > 0.3) w *= 3; ws.push([sp, w]); tot += w; }
      let x = r() * tot; sl.sp = SP.sparrow; for (const [sp, w] of ws) if (w > 0 && (x -= w) <= 0) { sl.sp = sp; break; }
      sl.pan = r.range(-0.9, 0.9); sl.dist = r();
    };
    const birdsTick = (e) => {
      const act = e.birds, n = act <= 0.01 ? 0 : Math.max(1, Math.round(lerp(1.5, 8, Math.pow(act, 0.7))));
      for (let i = 0; i < singers.length; i++) { const sl = singers[i], r = sl.r;
        if (sl.next < 0) sl.next = E.t + r.range(0.15, 4.5);
        if (sl.next > E.t + 0.3) continue;
        if (i >= n || (act < 0.12 && r() > act / 0.12)) { sl.next = E.t + r.range(1.5, 4.5); continue; }
        if (!sl.sp || r() < 0.18 || (e.cold > 0.5 && !sl.sp.winter)) cast(sl, e);
        const t0 = Math.max(sl.next, E.t + 0.03); if (!room('bird', t0)) { sl.next = E.t + r.range(0.6, 1.5); continue; }
        const sp = sl.sp, ph = sp.make(r), dur = sing(sp.far ? distBus : birdBus, t0, ph.n, { amp: sp.lvl * lerp(1, 0.22, Math.pow(sl.dist, 0.8)), pan: sl.pan, fm: ph.fm, att: sp.att, rel: sp.rel });
        take('bird', t0 + dur); sl.next = t0 + dur + r.range(sp.gap[0], sp.gap[1]) / (0.3 + 0.7 * act);
      }
    };

    // ── the summer night: crickets (four near, a trill farther off), and now and then an owl ────────────────────────
    let owlNext = -1;
    const crickets = lazy(() => { const K = kit(), list = [];
      for (let i = 0; i < 4; i++) { const g = K.G(0); chain(K.loop('cricket' + i), g, K.P(R.range(-0.85, 0.85)), insBus); list.push({ c: C(g.gain, 0), seed: 100 + i * 7, lv: R.range(0.45, 1) }); }
      for (let i = 0; i < 2; i++) { const g = K.G(0); chain(K.loop('trill' + i), g, K.P(i ? 0.6 : -0.6), insBus); list.push({ c: C(g.gain, 0), seed: 140 + i * 9, lv: 0.35, trill: 1 }); }
      return { K, list }; });
    const hoot = (t0) => {                                                 // "hooo … hu, hu-hu-hu-hooo"
      const f = R.range(340, 420), os = ctx.createOscillator(), g = G(0), p = PAN(R.range(-0.8, 0.8)), a = g.gain, fr = os.frequency, n1 = 0.75, t2 = t0 + n1 + R.range(1.3, 2.1), t3 = t2 + 0.42, d3 = R.range(1.1, 1.5), N = 96, cv = new Float32Array(N);
      fr.setValueAtTime(f * 1.02, t0); fr.linearRampToValueAtTime(f * 0.97, t0 + n1); fr.setValueAtTime(f, t2); fr.setValueAtTime(f * 1.02, t3); fr.linearRampToValueAtTime(f * 0.93, t3 + d3);
      a.setValueAtTime(0, t0); a.linearRampToValueAtTime(1, t0 + 0.1); a.setValueAtTime(1, t0 + n1 - 0.22); a.linearRampToValueAtTime(0, t0 + n1);
      a.setValueAtTime(0, t2); a.linearRampToValueAtTime(0.7, t2 + 0.04); a.linearRampToValueAtTime(0, t2 + 0.16);
      for (let i = 1; i < N - 1; i++) { const u = i / (N - 1); cv[i] = Math.min(1, u * 9) * Math.pow(1 - u, 0.7) * (1 - 0.85 * (1 - sm(0.3, 0.65, u)) * (0.5 + 0.5 * Math.cos(TAU * 9.5 * u * d3))); }
      a.setValueCurveAtTime(cv, t3, d3); chain(os, g, p, distBus); os.start(t0); os.stop(t3 + d3 + 0.05); os.onended = () => dis(os, g, p); take('bird', t3 + d3);
    };
    const insectsTick = (e, dts) => {
      const lv = e.night * e.warm * e.warm * (1 - sm(0.05, 0.5, e.rain));
      crickets(lv > 0.01, dts, (v, k) => { for (const c of v.list) set(c.c, k * lv * c.lv * (c.trill ? 0.5 + 0.5 * vn(E.t * 0.05, c.seed) : sm(0.22, 0.65, vn(E.t * 0.07, c.seed))), 0.5); });
      if (e.night > 0.8 && e.warm > 0.5 && e.rain < 0.2) { if (owlNext < 0) owlNext = E.t + R.range(2, 5); if (owlNext < E.t + 0.3) { const t = Math.max(owlNext, E.t + 0.05); if (room('bird', t)) hoot(t); owlNext = t + R.range(28, 75); } } else owlNext = -1;
    };

    // ── what falls: rain as hiss + patter + rumble + grain, a roof's drumming when under one, and the hush of snow ───
    const rainBed = lazy(() => { const K = kit(), dry = K.G(1), lp = K.F('lowpass', 16000, 0.5); chain(dry, lp, rainBus);
      const lay = (key, f, q) => { const g = K.G(0); chain(K.loop(key), K.F('bandpass', f, q), g, dry); return C(g.gain, 0); };
      return { K, hiss: lay('white', 5200, 0.45), mid: lay('pink', 1200, 0.45), low: lay('brown:m', 170, 0.5), pat: lay('drops', 3200, 0.5), lp: C(lp.frequency, 16000), dry: C(dry.gain, 1) }; });
    const roofBed = lazy(() => { const K = kit(), n = K.loop('roof'), g = K.G(0); chain(n, K.F('bandpass', 700, 0.7), g, rainBus); chain(n, K.F('bandpass', 2400, 0.8), K.G(0.3), g); return { K, g: C(g.gain, 0) }; });
    const hush = lazy(() => { const K = kit(), g = K.G(0); chain(K.loop('white'), K.F('bandpass', 7400, 0.6), g, rainBus); return { K, g: C(g.gain, 0) }; });
    const fallTick = (e, dts) => {
      const rain = e.rain, sh = e.sh, on = sm(0.004, 0.05, rain), sw = 0.92 + 0.16 * vn(E.t * 0.21, 61) + 0.25 * e.wind * (e.gust - 0.5);
      rainBed(rain > 0.004, dts, (v, k) => { set(v.hiss, k * Math.pow(rain, 1.3) * 0.6 * sw, 0.3); set(v.mid, k * Math.pow(rain, 0.95) * 1.1 * sw, 0.3); set(v.low, k * Math.pow(rain, 1.6) * 0.42, 0.4); set(v.pat, k * Math.pow(rain, 0.6) * on * 0.8, 0.3); set(v.lp, lerp(15000, 2400, sh), 0.25); set(v.dry, lerp(1, 0.6, sh), 0.25); });
      roofBed(rain > 0.004 && sh > 0.02, dts, (v, k) => set(v.g, k * Math.pow(rain, 0.7) * on * sh * 1.3, 0.25));
      hush(e.snowfall > 0.01, dts, (v, k) => set(v.g, k * e.snowfall * (1 - 0.4 * sh) * 0.05, 0.5));
      // single drops close by: off leaves in the open, off the eaves under a roof — and for a while after the rain has passed
      const wetness = Math.max(rain, e.wet * 0.35), lam = (0.25 + 1.6 * rain + 2.2 * sh * wetness) * sm(0.03, 0.2, wetness) * dts;
      for (let i = 0, k = Math.floor(lam + R()); i < k; i++) drip(dripBus, E.t + 0.02 + R() * dts, R.range(0.04, 0.12) * (0.6 + 0.4 * sh), R.range(-0.8, 0.8));
    };

    // thunder: close, a tearing crack then the roll; far, only the roll — later, softer, duller and longer
    E.thunder = (delay) => {
      if (!E.offline && ctx.state !== 'running') return; delay = Math.max(0, num(delay, 1));
      const t = E.now() + Math.max(0.05, delay), d = sat((delay - 0.3) / 2.6), nr = 1 - d; if (!room('thunder', t)) return;
      const len = lerp(6, 10, d) * R.range(0.9, 1.15), p = PAN(R.range(-0.45, 0.45)), src = ctx.createBufferSource(), lp = F('lowpass', 800, 0.6), g = ctx.createGain(), N = 128, cv = new Float32Array(N), att = lerp(0.04, 0.3, d) / len, bumps = [];
      p.connect(thBus);
      if (nr > 0.3) { let tt = t; for (let i = 0, k = 2 + R.int(3); i < k; i++) { nb(p, tt, { f: R.range(1300, 2800), q: 0.5, dur: R.range(0.06, 0.16), a: 2.6 * nr * nr * R.range(0.5, 1), att: 0.002 }); tt += R.range(0.03, 0.09); } nb(p, t, { buf: 'brown', type: 'lowpass', f: 120, q: 0.9, dur: 0.9, a: 3 * nr, att: 0.012 }); }
      for (let i = 0, k = 3 + R.int(4); i < k; i++) bumps.push([R.range(0.06, 0.65), R.range(0.02, 0.06), R.range(0.3, 0.9)]);
      for (let i = 1; i < N - 1; i++) { const u = i / (N - 1); let m = 1; for (const b of bumps) m += b[2] * Math.exp(-((u - b[0]) * (u - b[0])) / (2 * b[1] * b[1])); cv[i] = (1 - Math.exp(-u / att)) * Math.exp(-u * 2.7) * Math.pow(1 - u, 0.6) * m * lerp(2.6, 0.75, d); }
      src.buffer = buf('brown'); src.loop = true; lp.frequency.setValueAtTime(lerp(1000, 260, d), t); lp.frequency.exponentialRampToValueAtTime(lerp(110, 70, d), t + len * 0.8);
      g.gain.setValueCurveAtTime(cv, t, len); chain(src, lp, g, p); src.start(t, R() * 3); src.stop(t + len + 0.05); src.onended = () => dis(src, lp, g, p); take('thunder', t + len * 0.6);
    };

    // ── the world's own sources: one voice per kind, placed by where its sources are around the listener ────────────
    const anvil = R.range(1180, 1420);
    const hammer = (out, t, v) => {                                        // three inharmonic partials and the thud under them
      if (!room('hammer', t)) return; const hit = R.range(0.75, 1.1);
      ping(out, t, anvil * R.range(0.997, 1.003), 0.6 * v * hit, 0.5 * (0.6 + v)); ping(out, t, anvil * 2.19, 0.5 * v * R.range(0.6, 1.1), 0.33 * (0.6 + v)); ping(out, t, anvil * 3.37, 0.28 * v * R.range(0.5, 1.1), 0.17);
      nb(out, t, { buf: 'pink', f: 800, q: 1, dur: 0.05, a: 1.4 * v * hit, att: 0.001 }); take('hammer', t + 0.4);
    };
    const BELL = [[0.5, 0.55, 9], [1, 0.9, 6.5], [1.2, 0.6, 5], [1.5, 0.22, 3.4], [2, 0.6, 3], [2.51, 0.22, 2], [3.01, 0.18, 1.5], [4.07, 0.1, 1], [5.33, 0.05, 0.6]];
    const toll = (out, t, v) => {                                          // hum, prime, tierce, quint, nominal … each dying at its own pace
      if (!room('bell', t)) return; const f0 = 370;
      for (let i = 0; i < BELL.length; i++) { const b = BELL[i]; ping(out, t, f0 * b[0], b[1] * v, b[2], 0.004); if (i < 3) ping(out, t, f0 * b[0] + 0.6 + 0.4 * i, b[1] * v * 0.45, b[2] * 0.9, 0.004); }
      nb(out, t, { f: 1900, q: 0.8, dur: 0.035, a: 0.5 * v, att: 0.001 }); take('bell', t + 4);
    };
    const CHIME = [1, 1.125, 1.25, 1.5, 1.667, 2];
    const chime = (out, t, v) => { if (!room('chime', t)) return; const f = 1050 * CHIME[R.int(CHIME.length)] * R.range(0.998, 1.002); ping(out, t, f, v, 2.2, 0.003); ping(out, t, f * 2.76, v * 0.35, 0.9, 0.003); ping(out, t, f * 5.4, v * 0.14, 0.3, 0.002); take('chime', t + 1.2); };
    const croak = (out, t, fr) => {                                        // a slow pulse train ringing a throat
      const r = fr.r, dur = r.range(0.16, 0.42), os = ctx.createOscillator(), f1 = F('bandpass', fr.f, 7), f2 = F('bandpass', fr.f * 2.3, 6), g2 = G(0.4), g = G(0), a = r.range(0.6, 1);
      os.type = 'sawtooth'; os.frequency.setValueAtTime(fr.rate, t); os.frequency.linearRampToValueAtTime(fr.rate * 1.18, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.03); g.gain.setValueAtTime(a, t + dur - 0.06); g.gain.linearRampToValueAtTime(0, t + dur);
      os.connect(f1); os.connect(f2); f1.connect(g); chain(f2, g2, g, out); os.start(t); os.stop(t + dur + 0.02); os.onended = () => dis(os, f1, f2, g2, g); return dur;
    };
    // fire's crackle: short bright ticks, and now and then a fat pop
    const crackle = (g, rate, dts) => {
      const lam = rate * (0.35 + 1.3 * vn(E.t * 0.6, 91)) * dts;
      for (let i = 0, k = Math.floor(lam + R()); i < k; i++) { const t = E.t + 0.02 + R() * dts; if (!room('crack', t)) break; const big = Math.pow(R(), 3), dur = 0.004 + 0.012 * R() + 0.035 * big;
        nb(g.in, t, { f: lerp(5200, 900, big) * R.range(0.6, 1.5), q: R.range(1.2, 3.5), dur, a: (0.7 + 2.6 * big * big) * R.range(0.5, 1), att: 0.0006 }); take('crack', t + dur); }
    };
    // a turning thing: one swell of level and pitch per pass, scheduled on standing nodes a pass ahead
    const turn = (g, per, lo, hi, f0, f1, each) => {
      const st = g.st, v = g.voice; if (st.next === undefined || st.next < E.t) st.next = E.t + 0.08;
      while (st.next < E.t + 0.3) { const t = st.next, p = per * R.range(0.96, 1.04);
        v.wg.setValueAtTime(lo, t); v.wg.linearRampToValueAtTime(hi * R.range(0.8, 1.1), t + p * 0.38); v.wg.linearRampToValueAtTime(lo, t + p * 0.92);
        v.wf.setValueAtTime(f0, t); v.wf.exponentialRampToValueAtTime(f1, t + p * 0.4); v.wf.exponentialRampToValueAtTime(f0, t + p * 0.95);
        st.n = (st.n || 0) + 1; each(t, p, st.n); st.next = t + p; }
    };
    const VO = {
      stream: { lvl: 1.9, send: 0.03, make(g) { const K = kit(), n = K.loop('pink:m'), sp = K.G(0.18);
        chain(n, K.F('highpass', 420, 0.6), K.F('bandpass', 1500, 0.5), K.G(0.5), g.in); chain(n, K.F('bandpass', 4200, 0.7), sp, g.in);                 // the run of it, and its sparkle
        for (const [f, q, a] of [[560, 7, 1.1], [980, 9, 1], [1750, 10, 0.7]]) { const bp = K.F('bandpass', f, q), gg = K.G(a * 0.7), w = K.loop('flutter'); chain(n, bp, gg, g.in); K.mod(w, 650, bp.detune); K.mod(w, a * 0.42, gg.gain); if (f > 1500) K.mod(w, 0.1, sp.gain); }   // three throats that gulp
        return K; } },
      fountain: { lvl: 1.5, send: 0.04, make(g) { const K = kit(), d = K.loop('drops:m'), sp = K.G(0.2);
        chain(K.loop('white:m'), K.F('bandpass', 4300, 0.5), sp, g.in); K.mod(K.loop('wobble'), 0.07, sp.gain); chain(d, K.F('bandpass', 2600, 0.6), K.G(0.9), g.in); chain(d, K.F('highpass', 4200, 0.5), K.G(0.3), g.in);
        chain(K.loop('pink:m'), K.F('bandpass', 520, 0.5), K.G(0.25), g.in); return K; } },
      waterwheel: { lvl: 1.8, send: 0.04, make(g) { const K = kit(), sf = K.F('bandpass', 1000, 0.9), sg = K.G(0.05);
        chain(K.loop('pink:m'), K.F('bandpass', 620, 0.5), K.G(0.45), g.in); chain(K.loop('roof:m'), K.F('bandpass', 1500, 0.6), K.G(0.7), g.in); chain(K.loop('white:m'), sf, sg, g.in); K.wf = sf.frequency; K.wg = sg.gain; return K; },
        tick(g) { turn(g, 0.85, 0.05, 0.5, 800, 1900, (t, p, n) => { if (n % 4 === 1 || R() < 0.12) creak(g.in, t + p * R.range(0.1, 0.5), R.range(0.9, 1.4), 360); }); } },
      mill: { lvl: 1.8, send: 0.05, make(g) { const K = kit(), wf = K.F('bandpass', 340, 1.3), wg = K.G(0.1);
        chain(K.loop('brown:m'), K.F('lowpass', 150, 0.7), K.G(0.16), g.in); chain(K.loop('pink:m'), wf, wg, g.in); K.wf = wf.frequency; K.wg = wg.gain; return K; },
        tick(g, e) { turn(g, lerp(2.3, 1.25, e.wind), 0.1, 1.3, 320, 760, (t, p, n) => { for (const at of [0.93, 1.03]) nb(g.in, t + p * at, { buf: 'pink', f: R.range(430, 520), q: 5, dur: 0.07, a: R.range(1.4, 2), att: 0.002 }); if (n % 3 === 0 || R() < 0.15) creak(g.in, t + p * R.range(0.55, 0.8), R.range(0.8, 1.2), 300); }); } },
      fire: { lvl: 2.2, send: 0.03, make(g, k) { const K = kit(), ro = K.G(0.1 * (k || 1)), mid = K.G(0.09), w = K.loop('wobble');
        chain(K.loop('brown:m'), K.F('lowpass', 380, 0.8), ro, g.in); chain(K.loop('pink:m'), K.F('bandpass', 950, 0.5), mid, g.in); K.mod(w, 0.05 * (k || 1), ro.gain); K.mod(w, 0.05, mid.gain); return K; },
        tick(g, e, dts) { crackle(g, 7, dts); } },
      forge: { lvl: 2, send: 0.2, make(g) { const K = VO.fire.make(g, 1.5), be = K.G(0.1); chain(K.loop('pink:m'), K.F('bandpass', 380, 0.7), be, g.in); chain(K.osc('sine', 0.27), K.G(0.08), be.gain); return K; },   // the bellows breathe
        tick(g, e, dts) { crackle(g, 9, dts); const st = g.st; if (st.next === undefined) { st.next = E.t + R.range(0.4, 2.5); st.left = 0; } if (e.work < 0.5) { st.next = Math.max(st.next, E.t + 1); return; } if (st.next < E.t) st.next = E.t + 0.05;
          while (st.next < E.t + 0.25) { const t = st.next; if (st.left <= 0) { st.left = 3 + R.int(5); st.per = R.range(0.5, 0.64); } hammer(g.in, t, 0.4); if (R() < 0.5) hammer(g.in, t + st.per * 0.42, 0.14); st.left--; st.next = t + (st.left > 0 ? st.per * R.range(0.96, 1.05) : R.range(3.5, 11)); } } },
      bell: { lvl: 0.4, send: 0.45, tick(g) { if (bellLeft > 0 && bellNext < E.t + 0.3) { const t = Math.max(bellNext, E.t + 0.05); toll(g.in, t, 1); bellLeft--; bellNext = t + 2.3; } } },
      chimes: { lvl: 0.25, send: 0.3, tick(g, e, dts) { const drive = e.wind * (0.4 + 0.6 * e.gust); if (R() < 0.35 * sm(0.28, 0.85, drive) * dts) { let t = E.t + 0.03; for (let i = 0, k = 1 + R.int(3); i < k; i++) { chime(g.in, t, R.range(0.25, 0.6)); t += R.range(0.07, 0.4); } } } },
      frogs: { lvl: 3, send: 0.2, tick(g, e) { if (e.frogs < 0.02) return; const st = g.st; if (!st.f) st.f = [0, 1, 2, 3].map((i) => ({ r: R.fork('frog' + i), next: E.t + R.range(0.2, 3), f: R.range(650, 1500), rate: R.range(22, 34) }));
        for (const fr of st.f) { if (fr.next > E.t + 0.25) continue; let t = Math.max(fr.next, E.t + 0.02); if (fr.r() < e.frogs && room('frog', t)) { for (let i = 0, k = 1 + fr.r.int(4); i < k; i++) t += croak(g.in, t, fr) + fr.r.range(0.12, 0.3); take('frog', t); fr.next = t + fr.r.range(1.2, 5) / e.frogs; } else fr.next = t + fr.r.range(1, 3); } } },
    };
    const groups = {};
    const group = (kind) => groups[kind] || (groups[kind] = (() => { const V = VO[kind], inp = G(1), lp = F('lowpass', 16000, 0.5), g = G(0), p = PAN(0); chain(inp, lp, g, p, far); chain(p, G(V.send), rvIn);
      return { V, in: inp, lp: C(lp.frequency, 16000), g: C(g.gain, 0), pan: C(p.pan, 0), voice: null, idle: 0, st: {}, P: 0, px: 0, u: 0, fr: 0 }; })());
    const scan = (s, sounds, e, dts, trim) => {
      for (const k in groups) { const g = groups[k]; g.P = g.px = g.u = g.fr = 0; }
      const lx = num(s.x, 0), ly = s.y, lz = num(s.z, 0), yaw = num(s.yaw, 0), rx = Math.cos(yaw), rz = Math.sin(yaw);     // facing (sin yaw, −cos yaw); right (cos yaw, sin yaw)
      if (sounds) for (let i = 0; i < sounds.length; i++) { const q = sounds[i]; if (!q || !VO[q.kind]) continue;
        const r = q.r > 0 ? q.r : 30, dx = num(q.x, 0) - lx, dz = num(q.z, 0) - lz, dy = typeof q.y === 'number' && typeof ly === 'number' ? q.y - ly : 0, d = Math.hypot(dx, dy, dz); if (!(d < r)) continue;
        const u = d / r, d0 = Math.max(1.5, r * 0.08), a = num(q.gain, 1) * Math.pow(d0 / Math.max(d0, d), 0.75) * (1 - sm(0.55, 1, u)), hd = Math.hypot(dx, dz) || 1e-6, w = a * a, g = group(q.kind);
        g.P += w; g.px += w * ((dx * rx + dz * rz) / hd) * sm(0.4, 3, hd) * 0.85; g.u += w * u; g.fr += (w * (dx * rz - dz * rx)) / hd; }
      for (const k in groups) { const g = groups[k], a = Math.min(1.6, Math.sqrt(g.P));
        if (a > 0.003) { const behind = sat(-g.fr / g.P); g.idle = 0;
          set(g.g, a * (1 - 0.18 * behind) * LV.world * (g.V.lvl || 1) * trim, 0.12); set(g.pan, clamp(g.px / g.P, -1, 1), 0.1); set(g.lp, lerp(17000, 2200, Math.pow(g.u / g.P, 0.8)) * (1 - 0.3 * behind), 0.2);
          if (!g.voice && g.V.make) g.voice = g.V.make(g); if (g.V.tick) g.V.tick(g, e, dts); }
        else { set(g.g, 0, 0.1); if ((g.idle += dts) > 2.5 && g.voice) { g.voice.kill(); g.voice = null; g.st = {}; } } }
    };

    // ── footsteps: each surface its own little recipe, never twice the same, left foot then right ───────────────────
    const stepL = PAN(-0.16), stepR = PAN(0.16); stepL.connect(stepBus); stepR.connect(stepBus); let foot = 0;
    const thud = (o, t, f, dur, a, att) => nb(o, t, { buf: 'pink', f, q: 1, dur, a, att });
    const STEP = {
      grass(o, t, v) { nb(o, t, { buf: 'pink', f: R.range(2300, 3300), q: 0.6, dur: 0.21, a: v, att: 0.035 }); thud(o, t, 140, 0.1, 0.5 * v, 0.01); if (R() < 0.6) nb(o, t + R.range(0.07, 0.11), { f: R.range(3800, 5200), q: 0.7, dur: 0.1, a: 0.3 * v, att: 0.02 }); },
      dirt(o, t, v) { thud(o, t, 150, 0.09, v, 0.004); nb(o, t, { buf: 'pink', f: 520, q: 1.1, dur: 0.06, a: 0.9 * v, att: 0.003 }); nb(o, t + 0.006, { f: R.range(1600, 2400), q: 1, dur: 0.1, curve: grain(24, 0.8 * v) }); },
      stone(o, t, v, run) { nb(o, t, { f: R.range(2900, 3900), q: 1.4, dur: 0.02, a: 1.1 * v, att: 0.0008 }); nb(o, t, { buf: 'pink', f: R.range(560, 700), q: 2.2, dur: 0.055, a: 1.6 * v, att: 0.0015 }); thud(o, t, 180, 0.05, 0.5 * v, 0.003); if (!run) nb(o, t + R.range(0.09, 0.13), { f: R.range(2200, 3000), q: 1.2, dur: 0.02, a: 0.4 * v, att: 0.001 }); },
      wood(o, t, v) { nb(o, t, { buf: 'pink', f: R.range(185, 230), q: 6.5, dur: 0.16, a: 4.4 * v, att: 0.002 }); nb(o, t, { buf: 'pink', f: R.range(430, 520), q: 5, dur: 0.09, a: 2 * v, att: 0.002 }); nb(o, t, { f: 2300, q: 1, dur: 0.012, a: 0.4 * v, att: 0.0008 }); },
      gravel(o, t, v) { nb(o, t, { f: R.range(2400, 3400), q: 0.8, dur: 0.21, curve: grain(44, 1.6 * v) }); nb(o, t, { buf: 'pink', f: R.range(800, 1100), q: 0.8, dur: 0.17, curve: grain(30, 1.4 * v) }); thud(o, t, 170, 0.07, 0.3 * v, 0.005); },
      snow(o, t, v) { nb(o, t, { buf: 'pink', f: R.range(650, 800), f1: R.range(1300, 1700), q: 3, dur: 0.27, curve: grain(40, 3.6 * v) }); nb(o, t, { f: 3100, q: 0.6, dur: 0.2, curve: grain(34, 0.5 * v) }); thud(o, t, 160, 0.13, 0.4 * v, 0.02); },
      water(o, t, v) { nb(o, t, { f: R.range(900, 1200), f1: R.range(2300, 3000), q: 0.7, dur: 0.4, a: 0.7 * v, att: 0.012 }); nb(o, t, { buf: 'pink', f: 380, q: 0.7, dur: 0.22, a: 0.6 * v, att: 0.008 }); for (let i = 0, k = 1 + R.int(3); i < k; i++) drip(o, t + R.range(0.12, 0.42), 0.12 * v, R.range(-0.3, 0.3)); },
    };
    E.step = (surface, running, when) => {
      if (!E.offline && ctx.state !== 'running') return; const t = when || E.now() + 0.012; if (!room('step', t)) return;
      (STEP[surface] || STEP.grass)((foot ^= 1) ? stepL : stepR, t, R.range(0.78, 1.08) * (running ? 1.3 : 1), !!running); take('step', t + 0.3);
    };

    // ── the control pass, twenty times a second: read the weather and the listener, lean every level toward it ──────
    const e = { tod: 12, season: 0, rain: 0, snowfall: 0, snow: 0, wind: 0.25, wet: 0, sh: 0, gust: 0.5, birds: 0, chorus: 0, dusk: 0, night: 0, warm: 1, cold: 0, work: 1, frogs: 0 };
    let prevTod = null, bellLeft = 0, bellNext = 0, acc = 0, stepPh = 0.55;
    const control = (dts, s, W, sounds) => {
      const mix = E.mix || {}, tod = ((num(W.tod, 12) % 24) + 24) % 24, season = sat(num(W.season, 0)), rain = sat(num(W.rain, 0)), snowfall = sat(num(W.snowfall, 0)), snow = sat(num(W.snow, 0));
      const [rise, sett] = sunTimes(season), dayMask = sm(rise - 0.9, rise - 0.2, tod) * (1 - sm(sett + 0.1, sett + 0.7, tod));
      e.tod = tod; e.season = season; e.rain = rain; e.snowfall = snowfall; e.snow = snow; e.wind = sat(num(W.wind, 0.25)); e.wet = sat(num(W.wet, rain)); e.sh = sat(num(s.sheltered, 0));
      e.chorus = sm(rise - 0.7, rise + 1, tod) * (1 - sm(rise + 3.6, rise + 6.2, tod)); e.dusk = sm(sett - 2.2, sett - 0.9, tod) * (1 - sm(sett, sett + 0.6, tod));
      e.night = tod < 12 ? 1 - sm(rise - 1.3, rise - 0.5, tod) : sm(sett + 0.2, sett + 1.1, tod); e.warm = 1 - sm(0.25, 0.7, season); e.cold = sm(0.35, 0.85, season);
      e.birds = dayMask * (0.26 + 0.74 * e.chorus + 0.12 * e.dusk) * (1 - 0.93 * sm(0.05, 0.5, rain)) * lerp(1, 0.16, sm(0.3, 0.8, season)) * (1 - 0.6 * snowfall) * (1 - 0.3 * sm(0.6, 1, e.wind));
      e.work = sm(6.5, 7.5, tod) * (1 - sm(18.5, 19.5, tod)); e.frogs = sat(e.warm * (0.12 + 0.88 * Math.max(e.night, e.dusk * 0.7)) * (1 + 0.3 * rain));
      for (const k in trims) for (const [c, lv] of trims[k]) set(c, lv * num(mix[k], 1), 0.1);
      set(cFarLP, lerp(18000, 3200, Math.pow(snow, 0.8)) * (1 - 0.2 * snowfall), 0.6); set(cFar, 1 - 0.22 * snow, 0.6);
      // the church clock: on the hour, by day, when the hour arrives at its own pace (not when the time is being wound on)
      if (prevTod !== null) { let d = tod - prevTod; if (d < -12) d += 24; const h = Math.floor(tod); if (d > 0 && d <= 0.3 * dts && h !== Math.floor(prevTod) && h >= 6 && h <= 21 && bellLeft <= 0) { bellLeft = Math.min(3, h % 12 || 12); bellNext = E.t + 0.4; } }
      if (bellLeft > 0 && bellNext < E.t - 3) bellLeft = 0;
      prevTod = tod;
      windTick(E.t, e, dts); birdsTick(e); insectsTick(e, dts); fallTick(e, dts); scan(s, sounds, e, dts, num(mix.world, 1));
    };
    E.update = (dt, s, W, sounds) => {
      if (!E.offline && ctx.state !== 'running') return;
      E.t = E.now(); dt = clamp(num(dt, 0.016), 0, 0.25); s = s || {};
      if (s.moving && s.autoStep !== false && num(s.speed, 1) > 0.25) {
        const sp = num(s.speed, s.running ? 4.5 : 2.2); let rate = sp <= 2.2 ? 1.8 * Math.max(0.5, sp / 2.2) : lerp(1.8, 2.9, sat((sp - 2.2) / 2.3)); if (s.running) rate = Math.max(rate, 2.7);
        if ((stepPh += rate * dt) >= 1) { stepPh -= Math.floor(stepPh); const base = s.surface, snowed = e.snow > 0.55 && e.sh < 0.5 && (base === 'grass' || base === 'dirt' || base === 'gravel'); E.step(snowed ? 'snow' : base, s.running, E.t + 0.012); }
      } else stepPh = 0.55;
      acc += dt; if (!E.snap && acc < 0.05) return;
      control(E.snap ? 0.05 : Math.min(acc, 0.25), s, W || WX0, sounds); acc = 0; E.snap = false;
    };
    return E;
  };

  // ── the live instance ────────────────────────────────────────────────────────────────────────────────────────────
  let live = null;
  A.init = () => {
    if (OFF || !AC) return false;
    try {
      if (!live) {
        const ctx = new AC();
        try { live = build(ctx, { muted: A.muted, volume: A.volume, reverb: A.reverb }); } catch (err) { if (ctx.close) ctx.close(); throw err; }
        A.ctx = ctx; A.ready = true;
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!live) return; const p = document.hidden ? ctx.suspend() : ctx.resume(); if (p && p.catch) p.catch(() => {}); });
      }
      if (live.ctx.state === 'suspended' && !(typeof document !== 'undefined' && document.hidden)) { const p = live.ctx.resume(); if (p && p.catch) p.catch(() => {}); }
      return true;
    } catch (err) { live = null; A.ready = false; A.ctx = null; LR.log('audio: unavailable', err); return false; }
  };
  const guard = (fn) => { if (!live) return; try { fn(live); } catch (err) { if (++A.errors === 1) console.error('[lr] audio', err); if (A.errors > 20) { try { live.ctx.close(); } catch (e2) { /* closing is best effort */ } live = null; A.ready = false; } } };
  A.update = (dt, s) => guard((E) => E.update(dt, s, LR.wx, LR.world && LR.world.sounds));
  A.step = (surface, running) => guard((E) => E.step(surface, running));
  A.setVolume = (v) => { if (OFF) return; A.volume = clamp(num(v, 0.8), 0, 1); guard((E) => E.setVolume(A.volume)); };
  A.mute = (m) => { if (OFF) return A.muted; A.muted = m === undefined ? !A.muted : !!m; guard((E) => E.mute(A.muted)); return A.muted; };
  LR.on('thunder', (delay) => guard((E) => E.thunder(delay)));

  // ── a fixed scenario, rendered faster than real time and measured ────────────────────────────────────────────────
  // scenario: { tod, season, rain, snowfall, snow, wind, wet, moving, running, speed, surface, sheltered, x, y, z, yaw,
  //             sources: [{ x, y, z, kind, r, gain }], thunder: delay | [delay | { at, delay }], todRate (hours/s),
  //             volume, mix, seed, reverb, sampleRate, keep (true → the AudioBuffer comes back as .buffer),
  //             stepped (false → schedule everything before rendering, as engines that cannot pause a render must) }
  A.renderOffline = (seconds, sc) => {
    const none = (why) => Promise.resolve(Object.assign({ peak: 0, rms: 0, sampleRate: 0 }, why));
    if (OFF) return none({ disabled: true }); if (!OAC) return none({ unavailable: true });
    try {
      sc = sc || {}; seconds = clamp(num(seconds, 8), 0.1, 600);
      const sr = num(sc.sampleRate, 44100), ctx = new OAC(2, Math.ceil(seconds * sr), sr), stepped = typeof ctx.suspend === 'function' && sc.stepped !== false;
      const E = build(ctx, { offline: true, virtual: !stepped, seed: sc.seed, mix: sc.mix || {}, volume: num(sc.volume, 0.8), reverb: sc.reverb === undefined ? A.reverb : sc.reverb });
      const W = Object.assign({}, WX0); for (const k in W) if (typeof sc[k] === 'number') W[k] = sc[k];
      if (sc.snow === undefined) W.snow = W.season > 0.6 || W.snowfall > 0.3 ? 1 : 0; if (sc.wet === undefined) W.wet = W.rain;
      const s = { x: num(sc.x, 0), y: sc.y, z: num(sc.z, 0), yaw: num(sc.yaw, 0), moving: !!sc.moving, running: !!sc.running, speed: num(sc.speed, sc.running ? 4.5 : 2.2), surface: sc.surface || 'grass', sheltered: num(sc.sheltered, 0) };
      const th = (Array.isArray(sc.thunder) ? sc.thunder : sc.thunder === undefined ? [] : [sc.thunder]).map((x) => (typeof x === 'number' ? { at: 0, delay: x } : x)).sort((a, b) => a.at - b.at);
      const dt = stepped ? 1 / 40 : 1 / 60, tod0 = W.tod; let ti = 0, failed = null;
      const tick = (t) => { E.vt = t; if (sc.todRate) W.tod = (((tod0 + sc.todRate * t) % 24) + 24) % 24; while (ti < th.length && th[ti].at <= t) E.thunder(th[ti++].delay); E.update(dt, s, W, sc.sources || []); };
      // where the context can pause itself, the render is walked like a live run (nodes made just in time, finished ones unhooked);
      // where it cannot, the whole scenario is scheduled before the render starts
      tick(0);
      for (let i = 1; i * dt < seconds; i++) { if (!stepped) tick(i * dt); else ctx.suspend(i * dt).then(() => { try { if (!failed) tick(ctx.currentTime); } catch (err) { failed = err; } ctx.resume(); }, () => {}); }
      return ctx.startRendering().then((b) => {
        let peak = 0, sq = 0, n = 0; const chRms = [];
        for (let c = 0; c < b.numberOfChannels; c++) { const d = b.getChannelData(c); let q = 0; for (let i = 0; i < d.length; i++) { const v = d[i], a = v < 0 ? -v : v; if (a > peak) peak = a; q += v * v; } sq += q; n += d.length; chRms.push(Math.sqrt(q / d.length)); }
        const out = { peak, rms: Math.sqrt(sq / (n || 1)), sampleRate: b.sampleRate, seconds: b.duration, channels: chRms }; if (failed) out.error = String(failed.stack || failed); if (sc.keep) out.buffer = b; return out;
      });
    } catch (err) { return none({ error: String((err && err.stack) || err) }); }
  };
}
