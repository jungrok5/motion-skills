// torn-page-journey · score.js — every sound is code: one theme, re-scored for each chapter's feeling (its mode, tempo and
// band change; the tune stays), crossfaded across the torn pages, plus the ride's own sounds (the paper tearing, the chain,
// the freewheel ticking while it coasts, the bell) and each place's bed (birds, rain, a crowd, waves, crickets).
// Plain JS into Float32Arrays — no Web Audio graph, no files — so the live page and the WAV (scripts/score.mjs) are the same.
//
//   export const SCORE = info => arrange(info, { theme: THEME, moods: { joy: { root: 62 } }, sfx: [{ t: 12.4, type: 'owl' }] });
//   info (from the Journey) = { dur, tear, chapters: [{ start, dur, mood, name, gestures, sound }], coast: [[t0, t1] …], tears: [t0 …] }
//
// Low level (what arrange() returns, and what you can also write by hand):
//   { notes: [{ t, n (midi), d, v, ins, pan }], hits: [{ t, ins, v, n }], sfx: [{ t, type, v, d, pan }], beds: { rain: [{ t, v }] …}, reverb }
//   ins: bell · musicbox · celesta · pluck · harp · pizz · uke · keys · reed · brass · flute · strings · pad · bass · tuba · cello
//   hits: kick · snare · brush · shaker · timp · tick · clap
//   sfx: tear · tick · ding (bike bell) · whoosh · pop · splash · thunder · hoot · chirp · brr · scratch · drip
//   beds: air · wind · rain · birds · crowd · waves · crickets · chain · fire
const TAU = Math.PI * 2;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
function rnd(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s / 4294967296) * 2 - 1; }; }
function keyval(list, t) { if (!list || !list.length) return 0; if (t <= list[0].t) return list[0].v; for (let i = 1; i < list.length; i++) if (t < list[i].t) { const a = list[i - 1], b = list[i], k = (t - a.t) / (b.t - a.t); return a.v + (b.v - a.v) * (k * k * (3 - 2 * k)); } return list[list.length - 1].v; }

// ── moods: how the same tune sounds in each feeling ──
export const MOODS = {
  joy:       { bpm: 126, mode: 'major', root: 60, lead: 'bell', comp: 'uke', bass: 'bass', beat: 'skip', bed: { birds: .5, air: .2 }, swing: .08 },
  curiosity: { bpm: 100, mode: 'dorian', root: 62, lead: 'pizz', comp: 'stab', bass: 'pizz', beat: 'tick', bed: { air: .25, birds: .2 } },
  bustle:    { bpm: 132, mode: 'mixolydian', root: 65, lead: 'reed', comp: 'oompah', bass: 'tuba', beat: 'brush', bed: { crowd: .55, air: .2 } },
  triumph:   { bpm: 104, mode: 'major', root: 62, lead: 'brass', comp: 'strings', bass: 'timp', beat: 'march', bed: { wind: .4 } },
  sorrow:    { bpm: 64, mode: 'minor', root: 57, lead: 'keys', comp: 'pad', bass: 'cello', beat: null, bed: { rain: .8, wind: .3 }, sparse: .5 },
  fear:      { bpm: 76, mode: 'phrygian', root: 55, lead: 'cello', comp: 'pad', bass: 'timp', beat: 'pulse', bed: { wind: .6, rain: .4 } },
  relief:    { bpm: 84, mode: 'lydian', root: 64, lead: 'flute', comp: 'harp', bass: 'bass', beat: null, bed: { birds: .45, air: .2 } },
  awe:       { bpm: 70, mode: 'lydian', root: 62, lead: 'strings', comp: 'swell', bass: 'cello', beat: null, bed: { waves: .6, air: .2 } },
  wonder:    { bpm: 90, mode: 'major', root: 67, lead: 'musicbox', comp: 'celesta', bass: 'bass', beat: null, bed: { crickets: .45, air: .15 } },
  calm:      { bpm: 80, mode: 'major', root: 60, lead: 'keys', comp: 'harp', bass: 'bass', beat: null, bed: { air: .3 } },
  lonely:    { bpm: 72, mode: 'aeolian', root: 59, lead: 'reed', comp: 'keysLow', bass: 'cello', beat: null, bed: { wind: .35, waves: .25 }, sparse: .4 },
  pride:     { bpm: 116, mode: 'major', root: 64, lead: 'brass', comp: 'uke', bass: 'tuba', beat: 'march', bed: { crowd: .2 } },
};
const MODES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], aeolian: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11], phrygian: [0, 1, 3, 5, 7, 8, 10] };
const deg = (mode, d) => { const s = MODES[mode] || MODES.major, o = Math.floor(d / 7); return s[((d % 7) + 7) % 7] + 12 * o; };

/** a default theme (degrees, beats); null = rest. 8 bars of 4/4 with chord roots per bar */
export const THEME = {
  tune: [[0, 1], [2, 1], [4, 1.5], [3, .5], [2, 2], [null, 1], [1, 1], [2, 1], [4, 1], [5, 1], [4, 2], [null, 1], [4, .5], [5, .5], [7, 1.5], [6, .5], [5, 1], [4, 1], [3, 2], [2, 1], [1, 1], [2, 1], [4, 1], [3, 1], [1, 1], [0, 3], [null, 1]],
  chords: [0, 3, 4, 0, 5, 3, 4, 0],
};

/** build a spec from the journey's chapters */
export function arrange(info, o = {}) {
  const theme = o.theme || THEME, out = { notes: [], hits: [], sfx: [], beds: {}, reverb: o.reverb || { mix: .26 } }, T = info.tear || 1.4;
  const bedKeys = {};
  const pushBed = (k, t, v) => (bedKeys[k] = bedKeys[k] || []).push({ t, v });
  info.chapters.forEach((c, ci) => {
    const m = { ...MOODS.calm, ...(MOODS[c.mood] || {}), ...((o.moods || {})[c.mood] || {}), ...(c.sound?.music || {}) };
    const beat = 60 / m.bpm, bar = beat * 4, t0 = c.start, t1 = c.start + c.dur + (ci === info.chapters.length - 1 ? 0 : T / 2), tin = c.start - (ci ? T / 2 : 0);
    const env = t => clamp((t - tin) / (ci ? T : .01)) * clamp((t1 - t) / T);
    const gain = (m.gain ?? 1) * (o.gain ?? 1);
    // the tune: once through the theme from the chapter's start, then again from the top while there is room
    const total = theme.tune.reduce((a, [, b]) => a + b, 0);
    for (let rep = 0, ts = t0 + beat * (m.pickup || 0); ts < t1 - beat; rep++, ts += total * beat) {
      let tt = ts;
      for (const [d, b] of theme.tune) {
        if (tt >= t1 - .05) break;
        if (d !== null && !(m.sparse && hash(tt * 7) < m.sparse * .5)) { const sw = (m.swing || 0) * ((tt - ts) / beat % 1 > .4 ? beat : 0); out.notes.push({ t: tt + sw, n: m.root + 12 + deg(m.mode, d), d: b * beat * .92, v: .55 * env(tt) * gain, ins: m.lead, pan: .1 }); }
        tt += b * beat;
      }
    }
    // the accompaniment, a bar at a time on the theme's chord roots
    for (let k = 0, tb = t0; tb < t1 - .1; k++, tb += bar) {
      const r = theme.chords[k % theme.chords.length], chord = [0, 2, 4].map(i => m.root + deg(m.mode, r + i)), e = env(tb) * gain, bassN = m.root - 12 + deg(m.mode, r);
      const comp = m.comp;
      if (comp === 'uke') [0, 1, 1.5, 2.5, 3].forEach((b, j) => chord.forEach((n, q) => out.notes.push({ t: tb + b * beat + q * .012, n, d: beat * .5, v: .3 * e * (j ? .8 : 1), ins: 'uke', pan: -.3 })));
      else if (comp === 'stab') [0, 1.5, 3].forEach(b => chord.forEach(n => out.notes.push({ t: tb + b * beat, n, d: beat * .25, v: .22 * e, ins: 'pizz', pan: -.3 })));
      else if (comp === 'oompah') [0, 1, 2, 3].forEach(b => b % 2 ? chord.forEach(n => out.notes.push({ t: tb + b * beat, n: n + 12, d: beat * .4, v: .26 * e, ins: 'reed', pan: -.35 })) : out.notes.push({ t: tb + b * beat, n: b ? bassN + 7 : bassN, d: beat * .6, v: .45 * e, ins: 'tuba', pan: 0 }));
      else if (comp === 'harp' || comp === 'celesta') chord.concat(chord.map(n => n + 12)).forEach((n, q) => out.notes.push({ t: tb + q * beat * 4 / 6, n, d: beat * 2, v: .25 * e, ins: comp === 'harp' ? 'harp' : 'celesta', pan: -.4 + q * .15 }));
      else if (comp === 'keysLow') [0, 2].forEach(b => chord.forEach(n => out.notes.push({ t: tb + b * beat, n: n - 12, d: beat * 1.8, v: .22 * e, ins: 'keys', pan: -.2 })));
      else out.notes.push(...chord.map((n, q) => ({ t: tb, n: n - (comp === 'pad' ? 12 : 0), d: bar * 1.02, v: (comp === 'swell' ? .5 : .32) * e, ins: comp === 'strings' || comp === 'swell' ? 'strings' : 'pad', pan: -.4 + q * .4 })));
      if (m.bass && m.comp !== 'oompah') {
        if (m.bass === 'timp') [0, 2.5, 3].forEach((b, j) => out.hits.push({ t: tb + b * beat, ins: 'timp', v: (j ? .35 : .6) * e, n: bassN }));
        else [0, 2].forEach(b => out.notes.push({ t: tb + b * beat, n: bassN + (b ? 7 : 0), d: beat * 1.6, v: .42 * e, ins: m.bass === 'pizz' ? 'pizz' : m.bass === 'tuba' ? 'tuba' : m.bass === 'cello' ? 'cello' : 'bass', pan: 0 }));
      }
      const B = m.beat;
      if (B === 'skip') for (let i = 0; i < 8; i++) { out.hits.push({ t: tb + i * beat / 2 + (i % 2 ? m.swing * beat || 0 : 0), ins: 'shaker', v: (i % 2 ? .2 : .32) * e }); if (i % 4 === 0) out.hits.push({ t: tb + i * beat / 2, ins: 'kick', v: .35 * e }); }
      if (B === 'tick') for (let i = 0; i < 4; i++) out.hits.push({ t: tb + i * beat, ins: 'tick', v: .3 * e });
      if (B === 'brush') for (let i = 0; i < 4; i++) out.hits.push({ t: tb + i * beat, ins: i % 2 ? 'snare' : 'brush', v: (i % 2 ? .3 : .25) * e });
      if (B === 'march') for (let i = 0; i < 8; i++) { if (i % 2 === 0) out.hits.push({ t: tb + i * beat / 2, ins: i % 4 ? 'snare' : 'kick', v: .4 * e }); else out.hits.push({ t: tb + i * beat / 2, ins: 'snare', v: .14 * e }); }
      if (B === 'pulse') for (let i = 0; i < 4; i++) out.hits.push({ t: tb + i * beat, ins: 'kick', v: .3 * e });
    }
    // the bed of this place
    const bed = { ...(m.bed || {}), ...(c.sound?.bed || {}) };
    for (const k of Object.keys(MOODS_BEDS)) { const v = bed[k] || 0; pushBed(k, c.start - (ci ? T / 2 : 0), ci ? undefined : v); pushBed(k, c.start + (ci ? T / 2 : 0), v); pushBed(k, c.start + c.dur - T / 2, v); }
    for (const s of c.sound?.sfx || []) out.sfx.push({ ...s, t: c.start + s.at });
    for (const g of c.gestures || []) { const ty = GESTURE_SFX[g.kind]; if (ty) out.sfx.push({ t: c.start + g.at + ty[1], type: ty[0], v: ty[2] }); }
  });
  // close the loop: the beds come back to the first chapter's levels
  for (const k of Object.keys(MOODS_BEDS)) { const l = bedKeys[k].filter(p => p.v !== undefined); bedKeys[k] = l; const v0 = l[0]?.v || 0; l.push({ t: info.dur - T, v: l[l.length - 1].v }, { t: info.dur, v: v0 }); }
  out.beds = bedKeys;
  // the ride: the page tears, the chain turns while pedalling, the freewheel ticks while coasting
  for (const t of info.tears) out.sfx.push({ t, type: 'tear', v: .7, d: T * .8 });
  const chain = []; let lastC = null;
  for (let t = 0; t <= info.dur; t += .1) { const c = info.coast.some(([a, b]) => t >= a && t <= b) ? 0 : 1; if (c !== lastC) { chain.push({ t, v: c * .25 }); lastC = c; } }
  chain.push({ t: info.dur, v: chain[0].v }); out.beds.chain = chain;
  for (const [a, b] of info.coast) for (let t = a; t < b; t += 1 / 16) out.sfx.push({ t, type: 'tick', v: .18 });
  for (const s of o.sfx || []) out.sfx.push(s);
  return out;
}
const MOODS_BEDS = { air: 1, wind: 1, rain: 1, birds: 1, crowd: 1, waves: 1, crickets: 1, fire: 1 };
const GESTURE_SFX = { bell: ['ding', .3, .6], wave: ['whoosh', .4, .3], flap: ['whoosh', .45, .45], catch: ['pop', .4, .5], shiver: ['brr', .3, .4], feetup: ['whoosh', .35, .35] };
function hash(x) { let h = Math.imul(Math.floor(x * 1000) ^ 0x5bd1e995, 2654435761); h ^= h >>> 15; return (h >>> 0) / 4294967296; }

export function renderScore(spec, sr = 44100, dur = 30) {
  if (typeof spec === 'function') throw new Error('resolve the score with the journey info first');
  const N = Math.ceil(dur * sr), L = new Float32Array(N), R = new Float32Array(N), send = new Float32Array(N);
  const put = (i, v, pan = 0, rv = .3) => { if (i < 0 || i >= N) return; const a = (pan + 1) * Math.PI / 4; L[i] += v * Math.cos(a); R[i] += v * Math.sin(a); send[i] += v * rv; };
  // a note that wraps the loop: past the end continues at the start (the film loops; so does its sound)
  const at = i => (i % N + N) % N;
  const PP = [[1, 1, 1.6], [2, .38, .9], [3, .16, .6], [4.02, .08, .4], [5.03, .04, .3]];
  for (const e of spec.notes || []) {
    const f = mtof(e.n), i0 = Math.floor(e.t * sr), d = e.d || .5, v = e.v ?? .5, pan = e.pan || 0, ins = e.ins || 'keys', r = rnd(Math.floor(e.t * 997 + e.n));
    if (v <= .001) continue;
    if (ins === 'pluck' || ins === 'uke' || ins === 'harp' || ins === 'pizz' || ins === 'bass') {
      const P = Math.max(2, Math.round(sr / f)), buf = new Float32Array(P), len = Math.ceil((ins === 'pizz' ? .35 : ins === 'harp' ? 2.2 : ins === 'bass' ? 1.4 : .9) * sr);
      for (let k = 0; k < P; k++) buf[k] = r() * (ins === 'harp' ? .7 : .9);
      let idx = 0, lp = 0; const damp = ins === 'pizz' ? .985 : ins === 'harp' ? .9975 : .994, c = ins === 'bass' ? .2 : ins === 'harp' ? .4 : .55, g = (ins === 'bass' ? .9 : .5) * v;
      for (let k = 0; k < len; k++) { const a = buf[idx], b = buf[(idx + 1) % P], y = (a + b) * .5 * damp; buf[idx] = y; idx = (idx + 1) % P; lp += c * (a - lp); put(at(i0 + k), lp * g * Math.min(1, k / 30), pan, ins === 'harp' ? .5 : .25); }
    } else if (ins === 'bell' || ins === 'musicbox' || ins === 'celesta') {   // FM bells
      const ratio = ins === 'bell' ? 3.5 : ins === 'musicbox' ? 5.02 : 2, idx0 = ins === 'bell' ? 2.2 : 1.4, dec = ins === 'celesta' ? .9 : ins === 'musicbox' ? 1.4 : 1.1, len = Math.ceil(dec * 3 * sr), g = .22 * v;
      for (let k = 0; k < len; k++) { const t = k / sr, en = Math.exp(-t / dec), m = Math.sin(TAU * f * ratio * t) * idx0 * Math.exp(-t / (dec * .3)); put(at(i0 + k), Math.sin(TAU * f * t + m) * en * g * Math.min(1, k / 20), pan, .45); }
    } else if (ins === 'keys') {
      const len = Math.ceil(Math.min(4, d + 1.2) * sr), g = .2 * v;
      for (let k = 0; k < len; k++) { const t = k / sr, rel = t > d ? Math.exp(-(t - d) / .25) : 1; let s = 0; for (const [m, a, dd] of PP) s += a * Math.sin(TAU * f * m * t) * Math.exp(-t / dd); put(at(i0 + k), s * g * Math.min(1, t / .006) * rel, pan, .35); }
    } else if (ins === 'reed' || ins === 'flute' || ins === 'cello') {
      const len = Math.ceil((d + .3) * sr), g = (ins === 'flute' ? .2 : ins === 'cello' ? .2 : .16) * v; let ph = 0, lp = 0;
      for (let k = 0; k < len; k++) {
        const t = k / sr, vib = 1 + (ins === 'reed' ? .006 : .009) * Math.sin(TAU * 5.2 * t) * Math.min(1, t / .3); ph += f * vib / sr; ph -= ph | 0;
        let x = ins === 'flute' ? Math.sin(TAU * ph) + .08 * Math.sin(TAU * 2 * ph) + r() * .06 : ins === 'cello' ? (2 * ph - 1) * .6 + Math.sin(TAU * ph) * .5 : Math.sin(TAU * ph) + .33 * Math.sin(TAU * 3 * ph) + .14 * Math.sin(TAU * 5 * ph);
        lp += (ins === 'cello' ? .08 : .25) * (x - lp); const env = Math.min(1, t / (ins === 'cello' ? .12 : .05)) * (t < d ? 1 : Math.exp(-(t - d) / .1)); put(at(i0 + k), lp * env * g, pan, .35);
      }
    } else if (ins === 'brass' || ins === 'tuba') {
      const len = Math.ceil((d + .25) * sr), g = (ins === 'tuba' ? .28 : .14) * v; let ph = 0, lp = 0;
      for (let k = 0; k < len; k++) { const t = k / sr; ph += f / sr; ph -= ph | 0; const x = 2 * ph - 1, br = Math.min(1, t / .06) * (ins === 'tuba' ? .06 : .18) + .03; lp += br * (x - lp); const env = Math.min(1, t / .03) * (t < d ? 1 - .2 * Math.min(1, t / d) : Math.exp(-(t - d) / .08)); put(at(i0 + k), lp * env * g, pan, .3); }
    } else {   // pad / strings: detuned partial stacks under a slow swell
      const len = Math.ceil((d + 1.2) * sr), g = (ins === 'strings' ? .07 : .06) * v, att = ins === 'strings' ? .35 : .6;
      for (let k = 0; k < len; k++) { const t = k / sr; let s = 0; for (let h = 1; h <= 5; h++) s += (Math.sin(TAU * f * h * t * 1.003) + Math.sin(TAU * f * h * t * .997)) / (h * h * .7 + .3); const env = Math.min(1, t / att) * (t < d ? 1 : Math.exp(-(t - d) / .5)); put(at(i0 + k), s * env * g, pan, .6); }
    }
  }
  for (const e of spec.hits || []) {
    const i0 = Math.floor(e.t * sr), v = e.v ?? .4, r = rnd(Math.floor(e.t * 1000) + 7), ins = e.ins; let hp = 0, prev = 0;
    if (ins === 'kick') { for (let k = 0; k < sr * .35; k++) { const t = k / sr; put(at(i0 + k), Math.sin(TAU * (50 * t + 60 * (1 - Math.exp(-t * 30)) / 30)) * Math.exp(-t / .12) * v * .6, 0, .05); } }
    else if (ins === 'timp') { const f = mtof((e.n || 45) - 12); for (let k = 0; k < sr * 1.4; k++) { const t = k / sr; put(at(i0 + k), (Math.sin(TAU * f * t) + .5 * Math.sin(TAU * f * 1.5 * t) * Math.exp(-t / .2) + r() * .3 * Math.exp(-t / .02)) * Math.exp(-t / .5) * v * .45, 0, .4); } }
    else { const len = Math.ceil((ins === 'brush' ? .3 : ins === 'shaker' ? .08 : ins === 'tick' ? .03 : .18) * sr); for (let k = 0; k < len; k++) { const t = k / sr, x = r(); hp = .75 * (hp + x - prev); prev = x; const en = ins === 'brush' ? Math.sin(Math.PI * t / .3) ** 2 * .5 : Math.exp(-t / (ins === 'snare' ? .05 : .015)); put(at(i0 + k), (ins === 'tick' ? Math.sin(TAU * 2400 * t) * .5 + hp * .3 : hp) * en * v * (ins === 'snare' ? .45 : .3), ins === 'shaker' ? .35 : -.1, .2); } }
  }
  for (const e of spec.sfx || []) sfx(e, sr, N, put, at);
  // beds
  const B = spec.beds || {}, nz = rnd(4242); let rl = 0, wl = 0, wl2 = 0, cr = 0, wv = 0, ch = 0;
  const has = k => B[k] && B[k].some(p => p.v > 0);
  if (Object.keys(B).some(has)) for (let i = 0; i < N; i++) {
    const t = i / sr, x = nz(); let s = 0;
    if (has('air')) { wl += .0015 * (x - wl); s += wl * 3 * keyval(B.air, t); }
    if (has('wind')) { wl2 += (.004 + .003 * Math.sin(t * .7)) * (x - wl2); s += wl2 * 6 * keyval(B.wind, t) * (.6 + .4 * Math.sin(t * .9 + Math.sin(t * .3))); }
    if (has('rain')) { rl += .5 * (x - rl); s += (x - rl) * .09 * keyval(B.rain, t) + (nz() > .9985 ? nz() * .25 * keyval(B.rain, t) : 0); }
    if (has('waves')) { wv += .003 * (x - wv); s += wv * 7 * keyval(B.waves, t) * (.4 + .6 * Math.sin(t * TAU / 7) ** 2); }
    if (has('crowd')) { cr += .02 * (x - cr); s += cr * 1.6 * keyval(B.crowd, t) * (.6 + .4 * Math.sin(t * 3.1 + Math.sin(t * 7.3))); }
    if (has('chain')) { ch += .2 * (x - ch); s += ch * .05 * keyval(B.chain, t) * (.6 + .4 * Math.sin(t * 22)); }
    if (has('crickets')) { const k = keyval(B.crickets, t); if (k) s += Math.sin(TAU * 4400 * t) * (Math.sin(TAU * 30 * t) > .3 ? 1 : 0) * (Math.sin(TAU * .9 * t) > 0 ? 1 : 0) * .012 * k; }
    if (has('fire')) { s += (nz() > .996 ? nz() * .2 : 0) * keyval(B.fire, t); }
    if (has('birds')) { const k = keyval(B.birds, t); if (k) { const ph = (t * 1.3) % 1, id = Math.floor(t * 1.3); if (hash(id) > .45 && ph < .22) { const q = ph / .22, f = 2600 + 1400 * hash(id + .5) + 900 * Math.sin(q * Math.PI * (2 + Math.floor(hash(id + .7) * 3))); s += Math.sin(TAU * f * t) * Math.sin(Math.PI * q) * .045 * k; } } }
    L[i] += s; R[i] += s * (.9 + .1 * Math.sin(t));
  }
  // reverb: four combs + two allpasses on the send, wraps round the loop too
  const mix = spec.reverb?.mix ?? .25;
  if (mix > 0) {
    const out = new Float32Array(N), combs = [1557, 1617, 1491, 1422].map(n => Math.round(n * sr / 44100));
    for (const D of combs) { const b = new Float32Array(D); let j = 0, lp = 0; for (let pass = 0; pass < 2; pass++) for (let i = 0; i < N; i++) { const y = b[j]; lp = y * .7 + lp * .3; b[j] = send[i] + lp * .82; j = (j + 1) % D; if (pass) out[i] += y * .25; } }
    for (const D of [225, 556].map(n => Math.round(n * sr / 44100))) { const b = new Float32Array(D); let j = 0; for (let i = 0; i < N; i++) { const y = b[j], x = out[i]; b[j] = x + y * .5; out[i] = y - x * .5; j = (j + 1) % D; } }
    for (let i = 0; i < N; i++) { L[i] += out[i] * mix; R[i] += out[(i + 37) % N] * mix; }
  }
  let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const k = peak > 0 ? .89 / peak : 1; for (let i = 0; i < N; i++) { L[i] *= k; R[i] *= k; }
  return [L, R];
}

function sfx(e, sr, N, put, at) {
  const i0 = Math.floor(e.t * sr), v = e.v ?? .5, r = rnd(Math.floor(e.t * 1000) + 99), pan = e.pan || 0; let lp = 0, hp = 0, prev = 0;
  const ty = e.type;
  if (ty === 'tear') {   // paper ripping: a crackle of fibre snaps under a dry noise swell that brightens as it goes
    const d = e.d || 1.1, len = Math.ceil(d * sr);
    for (let k = 0; k < len; k++) { const t = k / sr, q = t / d, x = r(); hp = .6 * (hp + x - prev); prev = x; const crack = r() > .94 - .05 * q ? r() * 1.4 : 0, env = Math.sin(Math.PI * Math.min(1, q * 1.15)) ** .7; put(at(i0 + k), (hp * .5 + crack * .5) * env * v * .5, .4 - .8 * q, .3); }
  } else if (ty === 'tick') { for (let k = 0; k < sr * .012; k++) { const t = k / sr; put(at(i0 + k), Math.sin(TAU * 3100 * t) * Math.exp(-t / .002) * v * .5, .1, .05); } }
  else if (ty === 'ding') { for (const [dt, f] of [[0, 2100], [.18, 2100]]) for (let k = 0; k < sr * 1.2; k++) { const t = k / sr; put(at(i0 + Math.floor(dt * sr) + k), (Math.sin(TAU * f * t) + .5 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t / .1)) * Math.exp(-t / .35) * v * .25, .3, .4); } }
  else if (ty === 'whoosh') { const d = e.d || .5, len = Math.ceil(d * sr); for (let k = 0; k < len; k++) { const t = k / sr, q = t / d, x = r(); lp += (.02 + .2 * Math.sin(Math.PI * q)) * (x - lp); put(at(i0 + k), lp * Math.sin(Math.PI * q) * v * .8, -.4 + .8 * q, .3); } }
  else if (ty === 'pop') { for (let k = 0; k < sr * .1; k++) { const t = k / sr; put(at(i0 + k), Math.sin(TAU * (900 - 4000 * t) * t) * Math.exp(-t / .025) * v * .5, pan, .2); } }
  else if (ty === 'splash') { for (let k = 0; k < sr * .6; k++) { const t = k / sr, x = r(); hp = .8 * (hp + x - prev); prev = x; put(at(i0 + k), hp * Math.exp(-t / .12) * v * .5, pan, .3); } }
  else if (ty === 'thunder') { const d = e.d || 3; for (let k = 0; k < sr * d; k++) { const t = k / sr, x = r(); lp += .004 * (x - lp); put(at(i0 + k), lp * 14 * Math.exp(-t / (d * .4)) * (1 + Math.sin(t * 9) * .3) * v, pan, .5); } }
  else if (ty === 'hoot') { for (const dt of [0, .45, .62]) for (let k = 0; k < sr * .38; k++) { const t = k / sr; put(at(i0 + Math.floor(dt * sr) + k), Math.sin(TAU * (380 + 20 * Math.sin(t * 30)) * t) * Math.sin(Math.PI * t / .38) * v * .3, pan || -.4, .5); } }
  else if (ty === 'chirp') { for (let n = 0; n < 3; n++) for (let k = 0; k < sr * .07; k++) { const t = k / sr; put(at(i0 + Math.floor(n * .1 * sr) + k), Math.sin(TAU * (3000 + 9000 * t) * t) * Math.sin(Math.PI * t / .07) * v * .2, pan || .4, .3); } }
  else if (ty === 'brr') { for (let k = 0; k < sr * .6; k++) { const t = k / sr, x = r(); lp += .05 * (x - lp); put(at(i0 + k), lp * Math.sin(TAU * 18 * t) * Math.sin(Math.PI * t / .6) * v * 1.2, pan, .2); } }
  else if (ty === 'scratch') { const d = e.d || .6; for (let k = 0; k < sr * d; k++) { const t = k / sr, x = r(); hp = .5 * (hp + x - prev); prev = x; put(at(i0 + k), hp * (.5 + .5 * Math.sin(TAU * 7 * t)) * Math.sin(Math.PI * t / d) * v * .3, pan, .2); } }
  else if (ty === 'drip') { for (let k = 0; k < sr * .15; k++) { const t = k / sr; put(at(i0 + k), Math.sin(TAU * (1200 + 2400 * t) * t) * Math.exp(-t / .03) * v * .3, pan, .5); } }
}
