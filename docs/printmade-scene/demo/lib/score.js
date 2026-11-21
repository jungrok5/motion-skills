// printmade-scene · score.js — every sound is Web Audio code: no samples, no files.
// A printed plate is quiet: the place's own tone, what comes from outside (rain, wind, a clock, birds), footsteps on its
// floor, the few sounds of its things, and the roller — a soft rumble and a low swell each time the plate is re-printed.
// An optional slow piano figure (music: 'piano') when the brief wants the opening-theme feel. One function schedules it
// on any AudioContext: offline for the MP4, live on the page.
//   ambience  room · rain · wind · clock · hum · birds · cicadas · drip · street · water  (each may be { type, from, to })
//   events    step (from heel strikes) · roll (from the shifts) · creak · door · knock · tick · drip · chime · bell · snip ·
//             strop · chain · rustle · sweep · thud · splash · sigh · hm · page · fn (your own: ev.fn(ctx, t, dest, kit))
import { rng } from './print.js';

export function makeScore(spec = {}) {
  const S = { seed: 7, gain: 2.3, amb: ['room'], music: 'none', key: 220, ...spec };
  return {
    spec: S,
    schedule(ctx, film, t0 = 0) { return schedule(ctx, film, S, t0); },
    async play(ac, film) { schedule(ac, film, S, ac.currentTime + .05); },
    async renderWav(film) {
      const sr = 44100, len = Math.ceil((film.DURATION + .4) * sr), ctx = new OfflineAudioContext(2, len, sr);
      schedule(ctx, film, S, 0);
      const buf = await ctx.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1);
      let peak = 0, sum = 0, nan = 0; for (let i = 0; i < L.length; i++) { const a = L[i], b = R[i]; if (!Number.isFinite(a) || !Number.isFinite(b)) { nan++; continue; } peak = Math.max(peak, Math.abs(a), Math.abs(b)); sum += a * a + b * b; }
      const rms = Math.sqrt(sum / (L.length * 2)), perSec = [];
      for (let s = 0; s < Math.floor(L.length / sr); s++) { let q = 0; for (let i = s * sr; i < (s + 1) * sr; i += 4) q += L[i] * L[i]; perSec.push(+Math.sqrt(q / (sr / 4)).toFixed(5)); }
      const out = new DataView(new ArrayBuffer(44 + L.length * 4)), w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); out.setUint32(4, 36 + L.length * 4, true); w(8, 'WAVE'); w(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
      out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, L.length * 4, true);
      for (let i = 0; i < L.length; i++) { out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i] || 0)) * 32767, true); out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i] || 0)) * 32767, true); }
      let bin = ''; const u8 = new Uint8Array(out.buffer); for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
      return { wav: btoa(bin), peak, rms, nan, perSec };
    },
  };
}

function schedule(ctx, film, S, t0) {
  const r = rng(S.seed * 7919 + 1), D = film.DURATION;
  const out = ctx.createGain(); out.gain.value = S.gain;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 8; comp.ratio.value = 8; comp.attack.value = .004; comp.release.value = .25;
  const lim = ctx.createGain(); lim.gain.value = .8; out.connect(comp); comp.connect(lim); lim.connect(ctx.destination);
  const verb = ctx.createConvolver(), ir = ctx.createBuffer(2, ctx.sampleRate * 1.6, ctx.sampleRate), ri = rng(S.seed + 3);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0; for (let i = 0; i < d.length; i++) { lp = lp * .55 + (ri() * 2 - 1) * .45; d[i] = lp * Math.pow(1 - i / d.length, 3.2) * .7; } }
  verb.buffer = ir; const verbIn = ctx.createGain(); verbIn.gain.value = .3; verbIn.connect(verb); verb.connect(out);
  const bus = (g, rv) => { const n = ctx.createGain(); n.gain.value = g; n.connect(out); const s = ctx.createGain(); s.gain.value = rv; n.connect(s); s.connect(verbIn); return n; };
  const amb = bus(.55, .12), fol = bus(.85, .35), mus = bus(.42, .7);
  out.gain.setValueAtTime(0, t0); out.gain.linearRampToValueAtTime(S.gain, t0 + (film.fadeIn ?? .5) + .2); out.gain.setValueAtTime(S.gain, t0 + D - (film.fadeOut ?? .9)); out.gain.linearRampToValueAtTime(0, t0 + D + .2);
  const noiseBuf = (() => { const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0), q = rng(S.seed + 11); let p = 0; for (let i = 0; i < d.length; i++) { const w = q() * 2 - 1; p = .97 * p + .03 * w; d[i] = w * .6 + p * 2.5; } return b; })();
  const noise = (t, dur, dest, { f = 1000, q = 1, type = 'bandpass', g = .3, a = .005 } = {}) => {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const e = ctx.createGain();
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + a); e.gain.exponentialRampToValueAtTime(.0005, t + dur);
    s.connect(fl); fl.connect(e); e.connect(dest); s.start(t, (t * 7.3) % 1.5); s.stop(t + dur + .05); return { s, fl, e };
  };
  const tone = (t, f, dur, dest, { type = 'sine', g = .2, a = .004, f2 = null } = {}) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * .8);
    const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + a); e.gain.exponentialRampToValueAtTime(.0004, t + dur);
    o.connect(e); e.connect(dest); o.start(t); o.stop(t + dur + .05); return o;
  };
  const bed = (ta, tb, dest, opt, level) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ctx.createBiquadFilter(); f.type = opt.type || 'bandpass'; f.frequency.value = opt.f; f.Q.value = opt.q || .7; const e = ctx.createGain(); e.gain.setValueAtTime(0, ta); e.gain.linearRampToValueAtTime(level, ta + .8); e.gain.setValueAtTime(level, tb - .6); e.gain.linearRampToValueAtTime(0, tb); s.connect(f); f.connect(e); e.connect(dest); s.start(ta); s.stop(tb + .1);
    if (opt.lfo) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = opt.lfo; lg.gain.value = level * .5; l.connect(lg); lg.connect(e.gain); l.start(ta); l.stop(tb); } return f; };

  for (const a of (film.sound?.amb || S.amb)) {      // 'rain', or { type: 'rain', from: 0, to: 4.6 } for one stretch only
    const ty = a.type ?? a, ta = t0 + Math.max(0, a.from ?? 0), tb = t0 + Math.min(D, a.to ?? D); if (tb - ta < 1.2) continue;
    if (ty === 'room') bed(ta, tb, amb, { f: 200, type: 'lowpass', q: .3 }, .05);
    else if (ty === 'hum') { const o = ctx.createOscillator(), e = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = 50; f.type = 'lowpass'; f.frequency.value = 170; e.gain.setValueAtTime(0, ta); e.gain.linearRampToValueAtTime(.02, ta + 1); e.gain.setValueAtTime(.02, tb - 1); e.gain.linearRampToValueAtTime(0, tb); o.connect(f); f.connect(e); e.connect(amb); o.start(ta); o.stop(tb); }
    else if (ty === 'rain') { bed(ta, tb, amb, { f: 3200, type: 'highpass', q: .3 }, .07); bed(ta, tb, amb, { f: 700, q: .5, lfo: .2 }, .03); }
    else if (ty === 'wind') { const f = bed(ta, tb, amb, { f: 420, q: .6, lfo: .13 }, .06); f.frequency.setValueAtTime(380, ta); f.frequency.linearRampToValueAtTime(700, ta + D / 2); f.frequency.linearRampToValueAtTime(420, tb); }
    else if (ty === 'clock') for (let t = ta + .3; t < tb; t += 1) { tone(t, 2300, .025, amb, { type: 'square', g: .005 }); tone(t + .5, 1900, .025, amb, { type: 'square', g: .004 }); }
    else if (ty === 'birds') for (let t = ta + .5 + r(); t < tb - .4; t += 1.2 + r() * 2.6) { const n = 2 + Math.floor(r() * 4), base = 2800 + r() * 1600; for (let i = 0; i < n; i++) tone(t + i * (.07 + r() * .05), base * (1 + (r() - .5) * .2), .07, amb, { g: .012, f2: base * (1.12 + r() * .3) }); }
    else if (ty === 'cicadas') bed(ta, tb, amb, { f: 4800, q: 6, lfo: 7 }, .03);
    else if (ty === 'drip') for (let t = ta + .7 + r(); t < tb - .3; t += .9 + r() * 1.6) tone(t, 1300 + r() * 500, .09, amb, { g: .02, f2: 700 });
    else if (ty === 'street') { bed(ta, tb, amb, { f: 500, type: 'lowpass', q: .4, lfo: .07 }, .05); for (let t = ta + 2 + r() * 3; t < tb - 1; t += 4 + r() * 5) noise(t, 1.6, amb, { f: 700, q: .5, g: .025, a: .7 }); }
    else if (ty === 'water') bed(ta, tb, amb, { f: 900, q: .8, lfo: .4 }, .035);
  }
  const ta = t0, tb = t0 + D;
  if (S.music === 'piano') {            // a slow minor figure, felt rather than heard
    const q = rng(S.seed + 5), deg = [0, 3, 7, 10, 7, 3, 2, 5], base = S.key;
    for (let t = t0 + 1.2, i = 0; t < tb - 1.5; t += 1.15 + (q() < .25 ? .6 : 0), i++) { const f = base * Math.pow(2, deg[i % deg.length] / 12); tone(t, f, 2.4, mus, { g: .05, a: .01 }); tone(t, f * 2.003, 1.2, mus, { g: .012, a: .01 }); if (i % 4 === 0) tone(t, base / 2, 3, mus, { g: .04, a: .02 }); }
  }
  for (const ev of film.events()) {
    const t = t0 + ev.t, g = ev.gain ?? .7, pan = ev.x != null ? Math.max(-.7, Math.min(.7, (ev.x / film.W - .5) * 1.3)) : (ev.pan || 0);
    const fp = (() => { if (!ctx.createStereoPanner) return fol; const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(fol); return p; })();
    switch (ev.type) {
      case 'step': { const surf = ev.surface || 'wood', f = { wood: 700, tile: 2200, stone: 1700, carpet: 500, grass: 3000, earth: 900, gravel: 2600 }[surf] || 800; noise(t, surf === 'carpet' || surf === 'grass' ? .07 : .045, fp, { f: f * (.85 + r() * .3), q: surf === 'wood' ? 3 : 1.3, g: .12 * g }); if (surf === 'gravel' || surf === 'grass') noise(t + .02, .08, fp, { f: f * 1.3, q: .8, g: .05 * g }); else tone(t, surf === 'wood' ? 120 + r() * 30 : 220 + r() * 40, .06, fp, { g: .05 * g, f2: 80 }); break; }
      case 'roll': { const d = ev.dur || .9, n = noise(t, d + .3, fol, { f: 260, q: .7, g: .16 * g, a: d * .35 }); n.fl.frequency.linearRampToValueAtTime(520, t + d); noise(t + .05, d, fol, { f: 2600, q: .6, g: .025 * g, a: d * .4 });
        const root = (S.key || 220) * (ev.to === 'B' ? 1 : 1.189); for (const [m, gg] of [[.5, .07], [1, .05], [1.498, .03], [2, .015]]) tone(t + d * .4, root * m, 2.6, mus, { g: gg * g, a: .5 }); break; }
      case 'creak': { const o = ctx.createOscillator(), e = ctx.createGain(), f = ctx.createBiquadFilter(), du = ev.dur || .5, f0 = ev.f || 140; o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 1.6, t + du * .6); o.frequency.linearRampToValueAtTime(f0 * 1.2, t + du); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 6; e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.04 * g, t + .05); e.gain.linearRampToValueAtTime(0, t + du); o.connect(f); f.connect(e); e.connect(fp); o.start(t); o.stop(t + du + .05); break; }
      case 'door': tone(t, 110, .3, fp, { g: .14 * g, f2: 70 }); noise(t, .18, fp, { f: 600, type: 'lowpass', g: .14 * g }); break;
      case 'knock': for (let i = 0; i < (ev.n || 2); i++) { tone(t + i * .14, 180, .09, fp, { g: .12 * g, f2: 120 }); noise(t + i * .14, .05, fp, { f: 900, q: 2, g: .1 * g }); } break;
      case 'tick': noise(t, .02, fp, { f: 3500, q: 5, g: .08 * g }); break;
      case 'drip': tone(t, ev.f || 1500, .1, fp, { g: .05 * g, f2: 800 }); break;
      case 'chime': for (const [m, gg] of [[1, .05], [2.76, .02], [5.4, .008]]) tone(t, (ev.f || 880) * m, 1.8, fp, { g: gg * g }); break;
      case 'bell': for (const [m, gg] of [[1, .06], [2.4, .03], [4.1, .012]]) tone(t, (ev.f || 520) * m, 2.6, fp, { g: gg * g }); break;
      case 'snip': noise(t, .03, fp, { f: 5200, q: 6, g: .1 * g }); tone(t + .005, 3400, .03, fp, { type: 'triangle', g: .03 * g, f2: 2600 }); break;
      case 'strop': { const n = noise(t, ev.dur || .28, fp, { f: 1800, q: 2, g: .07 * g, a: .04 }); n.fl.frequency.linearRampToValueAtTime(2600, t + (ev.dur || .28)); break; }
      case 'chain': for (let i = 0; i < 3; i++) noise(t + i * .045 + r() * .02, .04, fp, { f: 4200 + r() * 1500, q: 8, g: .05 * g }); break;
      case 'rustle': for (let i = 0; i < 5; i++) noise(t + i * .05 + r() * .03, .06, fp, { f: 3500 + r() * 1500, q: 1, g: .04 * g }); break;
      case 'sweep': { const n = noise(t, ev.dur || .4, fp, { f: 2400, q: .8, g: .06 * g, a: .08 }); n.fl.frequency.linearRampToValueAtTime(1600, t + (ev.dur || .4)); break; }
      case 'thud': tone(t, 80, .16, fp, { g: .16 * g, f2: 50 }); noise(t, .06, fp, { f: 600, q: 1.5, g: .08 * g }); break;
      case 'splash': noise(t, .5, fp, { f: 1400, q: .5, g: .12 * g, a: .01 }); for (let i = 0; i < 6; i++) tone(t + .05 + r() * .3, 900 + r() * 900, .08, fp, { g: .02 * g, f2: 500 }); break;
      case 'sigh': { const n = noise(t, ev.dur || .8, fp, { f: 900, q: 1.2, g: .05 * g, a: .15 }); n.fl.frequency.linearRampToValueAtTime(500, t + (ev.dur || .8)); break; }
      case 'hm': { const o = ctx.createOscillator(); o.type = 'triangle'; const f0 = ev.f || 300; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * (ev.up ? 1.25 : .82), t + .3); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.5; const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.05 * g, t + .05); e.gain.linearRampToValueAtTime(0, t + .34); o.connect(f); f.connect(e); e.connect(fp); o.start(t); o.stop(t + .4); break; }
      case 'page': noise(t, .12, fp, { f: 3000, q: .7, g: .05 * g, a: .03 }); break;
      default: if (typeof ev.fn === 'function') ev.fn(ctx, t, fp, { tone, noise });
    }
  }
}
