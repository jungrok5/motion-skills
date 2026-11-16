// storybook-short · score.js — every sound is Web Audio code: no samples, no files.
// One function schedules the whole film on any AudioContext: an OfflineAudioContext renders the WAV for the MP4, a live
// AudioContext plays it on the page. Same seed → same notes, same birds, same footsteps.
//   music     a picture-book band: kalimba melody, glockenspiel answers, a soft pad, a plucked bass, a shaker —
//             a pentatonic tune in phrases (A A′ B A) over a looping progression; each shot sets how much plays
//   ambience  per shot: birds, wind, water, crowd, room, rain, gulls
//   events    footsteps (from the walks' heel strikes), quack, woof, meow, plop, pop, whoosh, bell, chime, splat, swish
import { rng } from './paint.js';

const NOTE = { C: 261.63, 'C#': 277.18, D: 293.66, 'D#': 311.13, E: 329.63, F: 349.23, 'F#': 369.99, G: 392, 'G#': 415.3, A: 440, 'A#': 466.16, B: 493.88 };
const PENTA = [0, 2, 4, 7, 9], MAJOR = [0, 2, 4, 5, 7, 9, 11];
const DEGREE = { I: 0, ii: 1, iii: 2, IV: 3, V: 4, vi: 5 };
const hz = (root, semi) => root * Math.pow(2, semi / 12);

export function makeScore(spec = {}) {
  const S = { key: 'D', tempo: 96, progression: ['I', 'vi', 'IV', 'V'], seed: 7, gain: 2.6, ...spec };
  return {
    spec: S,
    /** schedule everything on ctx, film time 0 = ctx time t0 */
    schedule(ctx, film, t0 = 0) { return schedule(ctx, film, S, t0); },
    async play(ac, film) { schedule(ac, film, S, ac.currentTime + .05); },
    /** render the film's sound offline → { wav: base64 16-bit stereo 44.1 kHz, peak, rms, nan } */
    async renderWav(film) {
      const sr = 44100, len = Math.ceil((film.DURATION + .5) * sr), ctx = new OfflineAudioContext(2, len, sr);
      schedule(ctx, film, S, 0);
      const buf = await ctx.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1);
      let peak = 0, sum = 0, nan = 0; for (let i = 0; i < L.length; i++) { const a = L[i], b = R[i]; if (!Number.isFinite(a) || !Number.isFinite(b)) { nan++; continue; } peak = Math.max(peak, Math.abs(a), Math.abs(b)); sum += a * a + b * b; }
      const rms = Math.sqrt(sum / (L.length * 2));
      // per-second loudness, so a check can see every shot has sound
      const perSec = []; for (let s = 0; s < Math.floor(L.length / sr); s++) { let q = 0; for (let i = s * sr; i < (s + 1) * sr; i += 4) q += L[i] * L[i]; perSec.push(+Math.sqrt(q / (sr / 4)).toFixed(5)); }
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
  // ── buses: music / ambience / foley → a soft room reverb → a compressor (no clipping) → out ──
  const out = ctx.createGain(); out.gain.value = S.gain;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 10; comp.attack.value = .004; comp.release.value = .2;
  const lim = ctx.createGain(); lim.gain.value = .85; out.connect(comp); comp.connect(lim); lim.connect(ctx.destination);
  const verb = ctx.createConvolver(), ir = ctx.createBuffer(2, ctx.sampleRate * 2.2, ctx.sampleRate), ri = rng(S.seed + 3);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (ri() * 2 - 1) * Math.pow(1 - i / d.length, 3.2) * .5; }
  verb.buffer = ir; const verbIn = ctx.createGain(); verbIn.gain.value = .22; verbIn.connect(verb); verb.connect(out);
  const bus = (g, rv = .3) => { const n = ctx.createGain(); n.gain.value = g; n.connect(out); const s = ctx.createGain(); s.gain.value = rv; n.connect(s); s.connect(verbIn); return n; };
  const music = bus(.55, .45), amb = bus(.5, .15), fol = bus(.8, .2);
  // fade in / out with the picture
  music.gain.setValueAtTime(0, t0); music.gain.linearRampToValueAtTime(.55, t0 + 1.2); music.gain.setValueAtTime(.55, t0 + D - 2); music.gain.linearRampToValueAtTime(0, t0 + D + .3);
  const noiseBuf = (() => { const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0), q = rng(S.seed + 11); let p = 0; for (let i = 0; i < d.length; i++) { const w = q() * 2 - 1; p = .97 * p + .03 * w; d[i] = w * .6 + p * 2.5; } return b; })();
  const noise = (t, dur, dest, { f = 1000, q = 1, type = 'bandpass', g = .3, a = .005, loop = false } = {}) => {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = loop; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const e = ctx.createGain();
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + a); e.gain.exponentialRampToValueAtTime(.0005, t + dur);
    s.connect(fl); fl.connect(e); e.connect(dest); s.start(t, (t * 7.3) % 1.5); s.stop(t + dur + .05); return { s, fl, e };
  };
  const tone = (t, f, dur, dest, { type = 'sine', g = .2, a = .004, f2 = null, pan = 0 } = {}) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * .8);
    const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + a); e.gain.exponentialRampToValueAtTime(.0004, t + dur);
    let node = e; if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; e.connect(p); node = p; }
    o.connect(e); node.connect(dest); o.start(t); o.stop(t + dur + .05); return o;
  };

  // ── music ──
  const root = NOTE[S.key] || NOTE.D, beat = 60 / S.tempo, bar = beat * 4;
  const level = t => { const sh = film.shotAt(t); return sh?.sound?.music ?? 'full'; }; // 'none' | 'soft' | 'full'
  const chordAt = b => { const deg = DEGREE[S.progression[b % S.progression.length]] ?? 0; return [0, 2, 4].map(k => MAJOR[(deg + k) % 7] + (deg + k >= 7 ? 12 : 0)); };
  // a melody of 2-bar phrases in an A A′ B A shape; notes walk the pentatonic scale, rests breathe
  const phrase = (seed) => { const q = rng(seed), notes = []; let deg = 2 + Math.floor(q() * 3); for (let s = 0; s < 8; s++) { if (q() < .28) { notes.push(null); continue; } deg = Math.max(0, Math.min(9, deg + [-2, -1, -1, 1, 1, 2, 0][Math.floor(q() * 7)])); notes.push(deg); } return notes; };
  const A = phrase(S.seed + 1), B = phrase(S.seed + 2), A2 = A.map((n, i) => i > 5 && n != null ? n + 1 : n), form = [A, A2, B, A];
  const nBars = Math.ceil(D / bar);
  for (let b = 0; b < nBars; b++) {
    const tb = b * bar; if (tb > D - .5) break;
    const lv = level(tb); if (lv === 'none') continue;
    const ch = chordAt(b), T = t0 + tb, soft = lv === 'soft';
    // pad: the chord, slow attack
    for (const s of ch) for (const det of [-6, 6]) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(root / 2, s); o.detune.value = det; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = soft ? 700 : 1100; const e = ctx.createGain(); e.gain.setValueAtTime(0, T); e.gain.linearRampToValueAtTime(soft ? .025 : .035, T + bar * .3); e.gain.linearRampToValueAtTime(0, T + bar * 1.02); o.connect(f); f.connect(e); e.connect(music); o.start(T); o.stop(T + bar * 1.05); }
    // bass: root on beats 1 and 3
    for (const k of [0, 2]) tone(T + k * beat, hz(root / 4, ch[0]), beat * 1.6, music, { type: 'triangle', g: soft ? .09 : .14, a: .008 });
    // shaker on the off-beats (full only)
    if (!soft) for (let k = 0; k < 8; k++) if (k % 2) noise(T + k * beat / 2, .06, music, { f: 7000, type: 'highpass', g: .05 + (k === 3 || k === 7 ? .03 : 0) });
    // melody: kalimba (sine + a bright upper partial), eighth-note grid, one phrase per two bars
    const ph = form[Math.floor(b / 2) % 4], half = b % 2;
    for (let s = 0; s < 4; s++) { const n = ph[half * 4 + s]; if (n == null) continue; const semi = PENTA[n % 5] + 12 * Math.floor(n / 5), f = hz(root, semi), t = T + s * beat + (s % 2 ? beat * .08 : 0); tone(t, f, beat * 2.2, music, { g: soft ? .07 : .11, pan: -.15 }); tone(t, f * 3.01, beat * .5, music, { g: soft ? .012 : .02, pan: -.15 }); }
    // glockenspiel answers at the end of each phrase
    if (half && !soft) { const n = ph[7] ?? ph[6] ?? 4; const f = hz(root * 2, PENTA[(n + 2) % 5]); tone(T + 3.5 * beat, f, 1.4, music, { g: .05, pan: .25 }); tone(T + 3.5 * beat, f * 2.76, .6, music, { g: .012, pan: .25 }); }
  }

  // ── ambience per shot ──
  for (const a of film.ambiences()) {
    const ta = t0 + a.t0, tb = t0 + a.t1, dur = a.t1 - a.t0;
    const bed = (opt, level) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ctx.createBiquadFilter(); Object.assign(f, {}); f.type = opt.type || 'bandpass'; f.frequency.value = opt.f; f.Q.value = opt.q || .7; const e = ctx.createGain(); e.gain.setValueAtTime(0, ta); e.gain.linearRampToValueAtTime(level, ta + .6); e.gain.setValueAtTime(level, tb - .5); e.gain.linearRampToValueAtTime(0, tb + .3); s.connect(f); f.connect(e); e.connect(amb); s.start(ta, (a.t0 * 3.1) % 1.5); s.stop(tb + .4); if (opt.lfo) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = opt.lfo; lg.gain.value = level * .6; l.connect(lg); lg.connect(e.gain); l.start(ta); l.stop(tb + .4); } return f; };
    for (const ty of a.types) {
      if (ty === 'wind') { const f = bed({ f: 500, q: .6, lfo: .15 }, .09); f.frequency.setValueAtTime(400, ta); f.frequency.linearRampToValueAtTime(800, ta + dur / 2); f.frequency.linearRampToValueAtTime(450, tb); }
      else if (ty === 'water') { bed({ f: 700, type: 'lowpass', q: .5, lfo: .35 }, .1); for (let t = ta + r() * .5; t < tb; t += .25 + r() * .6) tone(t, 500 + r() * 700, .08, amb, { g: .02, f2: 900 + r() * 600 }); }
      else if (ty === 'sea') { bed({ f: 500, type: 'lowpass', q: .4, lfo: .12 }, .16); }
      else if (ty === 'crowd') { bed({ f: 900, q: .5, lfo: .7 }, .05); for (let t = ta + r() * .3; t < tb; t += .12 + r() * .35) tone(t, 180 + r() * 200, .12 + r() * .15, amb, { type: 'sawtooth', g: .008, f2: 150 + r() * 250, pan: (r() - .5) * 1.4 }); }
      else if (ty === 'room') bed({ f: 300, type: 'lowpass', q: .3 }, .025);
      else if (ty === 'rain') bed({ f: 4000, type: 'highpass', q: .3 }, .07);
      else if (ty === 'birds') for (let t = ta + .3 + r() * .8; t < tb - .3; t += .7 + r() * 2.2) { const n = 2 + Math.floor(r() * 4), base = 2600 + r() * 1800, pan = (r() - .5) * 1.6; for (let i = 0; i < n; i++) tone(t + i * (.07 + r() * .05), base * (1 + (r() - .5) * .25), .07, amb, { g: .025, f2: base * (1.15 + r() * .3), pan }); }
      else if (ty === 'gulls') for (let t = ta + 1 + r(); t < tb - .5; t += 2 + r() * 3) for (let i = 0; i < 3; i++) tone(t + i * .22, 1300 - i * 120, .2, amb, { type: 'triangle', g: .02, f2: 900, pan: .4 });
      else if (ty === 'clock') for (let t = ta + .2; t < tb; t += 1) { tone(t, 2400, .03, amb, { type: 'square', g: .006 }); tone(t + .5, 2000, .03, amb, { type: 'square', g: .005 }); }
    }
  }

  // ── events ──
  for (const ev of film.events()) {
    const t = t0 + ev.t, g = ev.gain ?? .7, pan = ev.x != null ? Math.max(-.8, Math.min(.8, (ev.x / film.W - .5) * 1.4)) : 0;
    const fp = (() => { if (!ctx.createStereoPanner) return fol; const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(fol); return p; })();
    switch (ev.type) {
      case 'step': { const surf = ev.surface || 'path', f = { path: 1400, grass: 2600, wood: 900, stone: 1900, snow: 3000 }[surf] || 1400; noise(t, surf === 'grass' ? .09 : .06, fp, { f: f * (.9 + r() * .2), q: surf === 'wood' ? 4 : 1.2, g: .22 * g }); tone(t, surf === 'wood' ? 140 : 90, .07, fp, { g: .12 * g, f2: 60 }); break; }
      case 'quack': for (let i = 0; i < (ev.n || 2); i++) { const o = tone(t + i * .16, 520, .12, fp, { type: 'sawtooth', g: .05 * g, f2: 380 }); void o; noise(t + i * .16, .1, fp, { f: 1200, q: 3, g: .05 * g }); } break;
      case 'woof': for (let i = 0; i < (ev.n || 1); i++) { tone(t + i * .25, 300, .16, fp, { type: 'sawtooth', g: .07 * g, f2: 160 }); noise(t + i * .25, .12, fp, { f: 700, q: 2, g: .06 * g }); } break;
      case 'meow': { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(820, t + .18); o.frequency.linearRampToValueAtTime(560, t + .5); const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.06 * g, t + .05); e.gain.linearRampToValueAtTime(0, t + .55); o.connect(e); e.connect(fp); o.start(t); o.stop(t + .6); break; }
      case 'plop': tone(t, 700, .18, fp, { g: .16 * g, f2: 140 }); break;
      case 'pop': tone(t, 900, .06, fp, { g: .12 * g, f2: 1400 }); break;
      case 'splat': noise(t, .2, fp, { f: 400, type: 'lowpass', g: .3 * g }); tone(t, 180, .12, fp, { g: .12 * g, f2: 70 }); break;
      case 'whoosh': { const n = noise(t, .5, fp, { f: 600, q: 1.5, g: .12 * g, a: .2 }); n.fl.frequency.exponentialRampToValueAtTime(2400, t + .45); break; }
      case 'swish': { const n = noise(t, .25, fp, { f: 2000, q: 2, g: .08 * g, a: .05 }); n.fl.frequency.exponentialRampToValueAtTime(4000, t + .2); break; }
      case 'bell': for (const [m, gg] of [[1, .1], [2.4, .05], [3.9, .03]]) tone(t, 880 * m, 1.2, fp, { g: gg * g }); break;
      case 'chime': for (let i = 0; i < 4; i++) tone(t + i * .09, hz(root * 4, PENTA[(i * 2) % 5]), .9, fp, { g: .05 * g }); break;
      case 'gulp': tone(t, 300, .1, fp, { g: .1 * g, f2: 500 }); break;
      case 'hmm': { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(190, t); o.frequency.linearRampToValueAtTime(230, t + .3); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 3; const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.05 * g, t + .05); e.gain.linearRampToValueAtTime(0, t + .4); o.connect(f); f.connect(e); e.connect(fp); o.start(t); o.stop(t + .45); break; }
      default: if (typeof ev.fn === 'function') ev.fn(ctx, t, fp, { tone, noise });
    }
  }
}
