// street-run-montage · score.js — every sound is code: an upbeat groove locked to the film's beat grid (the cuts land
// on it), arranged by section (intro → groove → lift → drop → outro; a slow-motion shot thins the band to keys and air),
// and the ride's own sounds, placed from the film's events: wheels rolling (pitch and level follow the speed, silent in
// the air), seams clacking, the tail popping, the landing slap, the grind scrape, push scuffs, steps, the buddy's call.
// Plain JS into Float32Arrays — the live page and the WAV (scripts/score.mjs) are the same numbers.
//
//   export const SCORE = info => arrange(info, { key: 62, mode: 'major', theme: THEME, sections: [...], sfx: [...] });
//   info (from the film) = { dur, bpm, beat, shots: [{ t0, t1, cam, rate, music }], events: [{ t, type, … }], speed: [[t, v, contact]] }
//
// Low level (what arrange() returns, and what you can write by hand):
//   { notes: [{ t, n (midi), d, v, ins, pan }], hits: [{ t, ins, v }], sfx: [{ t, type, v, d, pan }], beds: { air: [{t, v}] … }, roll: [[t, v, contact]], reverb }
//   ins: epiano · bass · pluck · guitar · pad · strings · bell · lead · glock
//   hits: kick · snare · clap · hat · open · shaker · crash · tom
//   sfx: pop · land · flick · grind · push · step · clack · whoosh · meow · bark · yip · cheer · crossing · train · chirp
//   beds: air · birds · city · river · wind
const TAU = Math.PI * 2;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
function rnd(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s / 4294967296) * 2 - 1; }; }
function keyval(list, t) { if (!list || !list.length) return 0; if (t <= list[0].t) return list[0].v; for (let i = 1; i < list.length; i++) if (t < list[i].t) { const a = list[i - 1], b = list[i], k = (t - a.t) / (b.t - a.t); return a.v + (b.v - a.v) * (k * k * (3 - 2 * k)); } return list[list.length - 1].v; }
function hash(x) { let h = Math.imul(Math.floor(x * 1000) ^ 0x5bd1e995, 2654435761); h ^= h >>> 15; return (h >>> 0) / 4294967296; }

const MODES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11] };
const deg = (mode, d) => { const s = MODES[mode] || MODES.major, o = Math.floor(d / 7); return s[((d % 7) + 7) % 7] + 12 * o; };

/** a default theme: degrees and beats over 8 bars (null = rest); chords: one root degree per bar (7ths stacked) */
export const THEME = {
  tune: [[4, .5], [5, .5], [7, 1], [4, .5], [2, 1], [null, .5], [4, .5], [5, .5], [4, .5], [2, .5], [0, 1], [null, 1],
         [4, .5], [5, .5], [7, 1], [9, .5], [8, 1], [7, .5], [5, .5], [4, .5], [5, 1], [null, 1],
         [7, .5], [9, .5], [11, 1.5], [9, .5], [7, .5], [5, .5], [4, 1], [2, .5], [4, .5], [5, 1], [null, 1],
         [4, .5], [5, .5], [4, .5], [2, .5], [1, 1], [2, 1], [null, 2]],
  chords: [3, 2, 5, 4, 3, 2, 1, 4],
};
/** sections: intro (pads + hats), groove (full), lift (build), drop (full + lead up an octave), break (slow-mo: keys + air), outro */
const SECTIONS = {
  intro:  { kick: 0, snare: 0, hat: .6, bass: 0, keys: .8, lead: 0, pad: .9, pluck: .5 },
  groove: { kick: 1, snare: 1, hat: 1, bass: 1, keys: 1, lead: 1, pad: .5, pluck: .7 },
  lift:   { kick: .8, snare: .9, hat: 1, bass: .8, keys: 1, lead: .8, pad: .8, pluck: 1, roll: 1 },
  drop:   { kick: 1, snare: 1, hat: 1, bass: 1.1, keys: 1, lead: 1, pad: .6, pluck: 1, up: 12, crash: 1 },
  break:  { kick: 0, snare: 0, hat: 0, bass: .4, keys: .9, lead: .5, pad: 1, pluck: 0 },
  outro:  { kick: .5, snare: .4, hat: .4, bass: .6, keys: 1, lead: .5, pad: 1, pluck: .4 },
};

/**
 * arrange(info, o): o.key (midi root, 62), o.mode, o.theme, o.sections ([{ at (s), kind }] — default: from the shots:
 * the first shots intro, slow-motion shots break, the shot before a big trick lift, the trick drop, the last shot outro),
 * o.sfx (extra effects), o.beds ({ birds: .4, city: .3 } or keyed lists), o.gain.
 */
export function arrange(info, o = {}) {
  const beat = info.beat || 60 / (info.bpm || 120), bar = beat * 4, dur = info.dur, key = o.key ?? 62, mode = o.mode || 'major', theme = o.theme || THEME;
  const out = { notes: [], hits: [], sfx: [], beds: {}, roll: info.speed || [], reverb: o.reverb || { mix: .18 } };
  // sections: given, or read off the shots
  let secs = o.sections;
  if (!secs) {
    secs = []; const sh = info.shots, big = new Set(info.events.filter(e => e.type === 'pop').map(e => e.shot));
    sh.forEach((s, i) => {
      const kind = s.music || (i === 0 || s.t0 < bar * 2 - .01 ? 'intro' : s.rate < .9 ? 'break' : i === sh.length - 1 ? 'outro' : big.has(i) && i > 2 ? 'drop' : big.has(i + 1) ? 'lift' : 'groove');
      if (!secs.length || secs[secs.length - 1].kind !== kind) secs.push({ at: s.t0, kind });
    });
  }
  const secAt = t => { let k = secs[0]; for (const s of secs) if (t >= s.at - 1e-6) k = s; return SECTIONS[k.kind] || SECTIONS.groove; };
  const g = o.gain ?? 1;
  // per bar: chords (e-piano, syncopated), bass, pad, pluck arpeggio, drums
  for (let b = 0, tb = 0; tb < dur - .05; b++, tb += bar) {
    const S = secAt(tb + .01), r = theme.chords[b % theme.chords.length], chord = [0, 2, 4, 6].map(i => key + deg(mode, r + i)), bassN = key - 24 + deg(mode, r);
    if (S.keys) [0, 1.5, 2.5, 3.5].forEach((x, j) => chord.forEach((n, q) => out.notes.push({ t: tb + x * beat + q * .008, n: n - 12 + (q === 3 ? 0 : 0), d: beat * (j ? .45 : 1.1), v: .32 * S.keys * g * (j ? .75 : 1), ins: 'epiano', pan: -.2 + q * .12 })));
    if (S.pad) out.notes.push(...chord.slice(0, 3).map((n, q) => ({ t: tb, n: n - 12, d: bar * 1.02, v: .3 * S.pad * g, ins: 'pad', pan: -.5 + q * .5 })));
    if (S.bass) [[0, .9], [1.5, .4], [2, .8], [3, .45], [3.5, .4]].forEach(([x, d], j) => out.notes.push({ t: tb + x * beat, n: bassN + (j === 3 ? 12 : j === 4 ? 7 : 0), d: beat * d, v: .55 * S.bass * g, ins: 'bass', pan: 0 }));
    if (S.pluck) for (let i = 0; i < 8; i++) out.notes.push({ t: tb + i * beat / 2, n: chord[[0, 2, 1, 3, 2, 1, 3, 2][i]] + 12, d: beat * .3, v: .18 * S.pluck * g, ins: 'pluck', pan: i % 2 ? .45 : .25 });
    for (let i = 0; i < 8; i++) {
      const t = tb + i * beat / 2;
      if (S.kick && (i === 0 || i === 4 || (i === 5 && b % 2))) out.hits.push({ t, ins: 'kick', v: .7 * S.kick * g });
      if (S.snare && (i === 2 || i === 6)) { out.hits.push({ t, ins: 'snare', v: .45 * S.snare * g }); out.hits.push({ t, ins: 'clap', v: .25 * S.snare * g }); }
      if (S.hat) out.hits.push({ t: t + (i % 2 ? beat * .04 : 0), ins: i % 4 === 3 ? 'open' : 'hat', v: (i % 2 ? .22 : .3) * S.hat * g });
      if (S.roll && b % 2 === 1 && i >= 4) for (let k = 0; k < 2; k++) out.hits.push({ t: t + k * beat / 4, ins: 'snare', v: .14 + .05 * i * S.roll });
    }
    if (S.crash && secs.some(s => Math.abs(s.at - tb) < beat / 2)) out.hits.push({ t: tb, ins: 'crash', v: .4 * g });
  }
  // the tune (lead), from the first groove onwards, repeating
  const total = theme.tune.reduce((a, [, b]) => a + b, 0), firstLead = (secs.find(s => (SECTIONS[s.kind] || {}).lead) || { at: bar * 2 }).at;
  for (let ts = Math.ceil(firstLead / bar - 1e-6) * bar; ts < dur - beat; ts += total * beat) {
    let tt = ts;
    for (const [d, b] of theme.tune) { if (tt >= dur - .05) break; const S = secAt(tt); if (d !== null && S.lead) out.notes.push({ t: tt, n: key + 12 + deg(mode, d) + (S.up || 0), d: b * beat * .85, v: .4 * S.lead * g, ins: S.up ? 'bell' : 'lead', pan: .1 }); tt += b * beat; }
  }
  // the ride's sounds from the film's events
  for (const e of info.events) {
    const v = e.slow ? .8 : 1;
    if (e.type === 'pop') out.sfx.push({ t: e.t, type: 'pop', v: .8 * (e.v || 1) * v });
    if (e.type === 'land') out.sfx.push({ t: e.t, type: 'land', v: .9 * v });
    if (e.type === 'flick') out.sfx.push({ t: e.t, type: 'flick', v: .6 * v });
    if (e.type === 'grind') out.sfx.push({ t: e.t, type: 'grind', v: .7, d: e.d / (e.slow ? .5 : 1) });
    if (e.type === 'push') out.sfx.push({ t: e.t, type: 'push', v: .5 });
    if (e.type === 'step') out.sfx.push({ t: e.t, type: 'step', v: .45 });
    if (e.type === 'paw') out.sfx.push({ t: e.t, type: 'step', v: .25 });
    if (e.type === 'cheer') out.sfx.push({ t: e.t, type: 'cheer', v: .5 });
    if (e.type === 'call') out.sfx.push({ t: e.t, type: e.kind === 'cat' ? 'meow' : e.kind === 'fox' ? 'yip' : 'bark', v: .6 });
  }
  // a soft whoosh into every cut that moves the camera far
  for (const s of info.shots.slice(1)) if (o.whoosh !== false) out.sfx.push({ t: s.t0 - .18, type: 'whoosh', v: .22, d: .36 });
  for (const s of info.shots) for (const x of s.sfx || []) out.sfx.push({ ...x, t: s.t0 + (x.at || 0) });
  for (const x of o.sfx || []) out.sfx.push(x);
  // beds
  const beds = { air: .25, birds: .3, city: .15, ...(o.beds || {}) };
  for (const [k, v] of Object.entries(beds)) out.beds[k] = Array.isArray(v) ? v : [{ t: 0, v }];
  return out;
}

export function renderScore(spec, sr = 44100, dur = 30) {
  if (typeof spec === 'function') throw new Error('resolve the score with the film info first');
  const N = Math.ceil(dur * sr), L = new Float32Array(N), R = new Float32Array(N), send = new Float32Array(N);
  const put = (i, v, pan = 0, rv = .3) => { if (i < 0 || i >= N) return; const a = (pan + 1) * Math.PI / 4; L[i] += v * Math.cos(a); R[i] += v * Math.sin(a); send[i] += v * rv; };
  for (const e of spec.notes || []) {
    const f = mtof(e.n), i0 = Math.floor(e.t * sr), d = e.d || .5, v = e.v ?? .5, pan = e.pan || 0, ins = e.ins || 'epiano', r = rnd(Math.floor(e.t * 997 + e.n));
    if (v <= .001) continue;
    if (ins === 'epiano') {   // FM tine: a bright attack that mellows
      const len = Math.ceil((d + .5) * sr), g = .16 * v;
      for (let k = 0; k < len; k++) { const t = k / sr, en = Math.exp(-t / 1.1) * (t > d ? Math.exp(-(t - d) / .12) : 1), m = Math.sin(TAU * f * t) * 1.6 * Math.exp(-t / .25); put(i0 + k, (Math.sin(TAU * f * t + m) + .2 * Math.sin(TAU * 2 * f * t)) * en * g * Math.min(1, k / 40), pan, .3); }
    } else if (ins === 'bass') {   // saw through a closing low-pass, a little drive
      const len = Math.ceil((d + .08) * sr), g = .5 * v; let ph = 0, lp = 0, lp2 = 0;
      for (let k = 0; k < len; k++) { const t = k / sr; ph += f / sr; ph -= ph | 0; const x = 2 * ph - 1, c = .02 + .1 * Math.exp(-t / .08); lp += c * (x - lp); lp2 += c * (lp - lp2); const en = Math.min(1, t / .004) * (t > d ? Math.exp(-(t - d) / .03) : 1); put(i0 + k, Math.tanh(lp2 * 2.2) * en * g, 0, .05); }
    } else if (ins === 'pluck' || ins === 'guitar') {   // Karplus–Strong
      const P = Math.max(2, Math.round(sr / f)), buf = new Float32Array(P), len = Math.ceil((ins === 'guitar' ? .9 : .45) * sr); for (let k = 0; k < P; k++) buf[k] = r() * .8;
      let idx = 0, lp = 0; const damp = ins === 'guitar' ? .996 : .985, gg = .45 * v;
      for (let k = 0; k < len; k++) { const a = buf[idx], b = buf[(idx + 1) % P], y = (a + b) * .5 * damp; buf[idx] = y; idx = (idx + 1) % P; lp += .5 * (a - lp); put(i0 + k, lp * gg * Math.min(1, k / 20), pan, .35); }
    } else if (ins === 'bell' || ins === 'glock') {
      const len = Math.ceil(1.6 * sr), g = .16 * v, ratio = ins === 'bell' ? 3.5 : 5.02;
      for (let k = 0; k < len; k++) { const t = k / sr, en = Math.exp(-t / .6), m = Math.sin(TAU * f * ratio * t) * 1.8 * Math.exp(-t / .2); put(i0 + k, Math.sin(TAU * f * t + m) * en * g * Math.min(1, k / 20), pan, .45); }
    } else if (ins === 'lead') {   // soft square with vibrato, filtered
      const len = Math.ceil((d + .15) * sr), g = .1 * v; let ph = 0, lp = 0;
      for (let k = 0; k < len; k++) { const t = k / sr, vib = 1 + .005 * Math.sin(TAU * 5.5 * t) * Math.min(1, t / .25); ph += f * vib / sr; ph -= ph | 0; const x = (ph < .5 ? 1 : -1) * .7 + Math.sin(TAU * ph) * .4; lp += .14 * (x - lp); const en = Math.min(1, t / .015) * (t < d ? 1 - .25 * Math.min(1, t / d) : Math.exp(-(t - d) / .06)); put(i0 + k, lp * en * g, pan, .35); }
    } else {   // pad / strings
      const len = Math.ceil((d + .8) * sr), g = (ins === 'strings' ? .06 : .045) * v, att = ins === 'strings' ? .25 : .5;
      for (let k = 0; k < len; k++) { const t = k / sr; let s = 0; for (let h = 1; h <= 4; h++) s += (Math.sin(TAU * f * h * t * 1.004) + Math.sin(TAU * f * h * t * .996)) / (h * h * .8 + .2); const en = Math.min(1, t / att) * (t < d ? 1 : Math.exp(-(t - d) / .4)); put(i0 + k, s * en * g, pan, .55); }
    }
  }
  for (const e of spec.hits || []) {
    const i0 = Math.floor(e.t * sr), v = e.v ?? .4, r = rnd(Math.floor(e.t * 1000) + 7), ins = e.ins; let hp = 0, prev = 0, lp = 0;
    if (ins === 'kick') { for (let k = 0; k < sr * .4; k++) { const t = k / sr; put(i0 + k, Math.tanh(Math.sin(TAU * (48 * t + 90 * (1 - Math.exp(-t * 28)) / 28)) * 1.4) * Math.exp(-t / .16) * v * .7, 0, .03); } }
    else if (ins === 'tom') { for (let k = 0; k < sr * .4; k++) { const t = k / sr; put(i0 + k, Math.sin(TAU * (110 * t + 60 * (1 - Math.exp(-t * 20)) / 20)) * Math.exp(-t / .15) * v * .5, -.2, .2); } }
    else if (ins === 'crash') { for (let k = 0; k < sr * 1.8; k++) { const t = k / sr, x = r(); hp = .9 * (hp + x - prev); prev = x; put(i0 + k, hp * Math.exp(-t / .7) * v * .3, .3, .4); } }
    else {
      const len = Math.ceil((ins === 'open' ? .25 : ins === 'hat' ? .05 : ins === 'shaker' ? .08 : ins === 'clap' ? .15 : .2) * sr);
      for (let k = 0; k < len; k++) {
        const t = k / sr, x = r(); hp = (ins === 'snare' || ins === 'clap' ? .6 : .92) * (hp + x - prev); prev = x;
        let en = Math.exp(-t / (ins === 'open' ? .08 : ins === 'hat' ? .012 : ins === 'clap' ? .03 : .05));
        if (ins === 'clap') en *= (t < .03 ? (Math.floor(t / .01) % 2 ? .4 : 1) : 1);
        const body = ins === 'snare' ? Math.sin(TAU * 190 * t) * Math.exp(-t / .03) * .6 : 0;
        put(i0 + k, (hp + body) * en * v * (ins === 'snare' ? .5 : ins === 'clap' ? .45 : .25), ins === 'hat' || ins === 'open' ? .3 : ins === 'clap' ? -.1 : 0, ins === 'clap' ? .4 : .15);
      }
    }
  }
  for (const e of spec.sfx || []) sfx(e, sr, N, put);
  // the wheels: a rolling rumble whose level and brightness follow the speed; silent in the air; seams clack
  const roll = spec.roll || [];
  if (roll.length) {
    const nz = rnd(777); let lp = 0, lp2 = 0, ph = 0;
    const at = t => { const i = clamp(Math.floor(t / .1), 0, roll.length - 1), j = Math.min(roll.length - 1, i + 1), k = clamp(t / .1 - i); return [roll[i][1] + (roll[j][1] - roll[i][1]) * k, roll[i][2]]; };
    let lastAir = 1;
    for (let i = 0; i < N; i++) {
      const t = i / sr, [v, con] = at(t), on = con === 'ground' ? 1 : 0; lastAir += ((on ? 1 : 0) - lastAir) * .002;
      const sp = clamp(v / 6), x = nz(); lp += (.015 + .05 * sp) * (x - lp); lp2 += .3 * (lp - lp2); ph += (30 + 40 * sp) / sr;
      const s = lp2 * (1 + .3 * Math.sin(TAU * ph)) * sp * lastAir * .55; L[i] += s; R[i] += s; send[i] += s * .05;
    }
    let dist = 0; for (let t = 0; t < dur; t += .01) { const [v, con] = at(t); dist += v * .01; if (dist > 1.6) { dist = 0; if (con === 'ground' && v > 1) sfx({ t, type: 'clack', v: .12 + .1 * clamp(v / 6) }, sr, N, put); } }
  }
  // beds
  const B = spec.beds || {}, nz = rnd(4242); let wl = 0, cl = 0, rl = 0, wd = 0;
  const has = k => B[k] && B[k].some(p => p.v > 0);
  if (Object.keys(B).some(has)) for (let i = 0; i < N; i++) {
    const t = i / sr, x = nz(); let s = 0;
    if (has('air')) { wl += .0015 * (x - wl); s += wl * 3 * keyval(B.air, t); }
    if (has('wind')) { wd += (.004 + .003 * Math.sin(t * .7)) * (x - wd); s += wd * 5 * keyval(B.wind, t); }
    if (has('city')) { cl += .01 * (x - cl); s += cl * 1.4 * keyval(B.city, t) * (.7 + .3 * Math.sin(t * .4 + Math.sin(t * 1.3))); }
    if (has('river')) { rl += .05 * (x - rl); s += (x - rl) * .03 * keyval(B.river, t) * (.7 + .3 * Math.sin(t * 2.1)); }
    if (has('birds')) { const k = keyval(B.birds, t); if (k) { const ph = (t * 1.1) % 1, id = Math.floor(t * 1.1); if (hash(id) > .5 && ph < .2) { const q = ph / .2, f = 2800 + 1400 * hash(id + .5) + 900 * Math.sin(q * Math.PI * (2 + Math.floor(hash(id + .7) * 3))); s += Math.sin(TAU * f * t) * Math.sin(Math.PI * q) * .04 * k; } } }
    L[i] += s; R[i] += s * (.9 + .1 * Math.sin(t));
  }
  // reverb: four combs + two allpasses on the send
  const mix = spec.reverb?.mix ?? .2;
  if (mix > 0) {
    const out = new Float32Array(N), combs = [1557, 1617, 1491, 1422].map(n => Math.round(n * sr / 44100));
    for (const D of combs) { const b = new Float32Array(D); let j = 0, lp = 0; for (let i = 0; i < N; i++) { const y = b[j]; lp = y * .7 + lp * .3; b[j] = send[i] + lp * .8; j = (j + 1) % D; out[i] += y * .25; } }
    for (const D of [225, 556].map(n => Math.round(n * sr / 44100))) { const b = new Float32Array(D); let j = 0; for (let i = 0; i < N; i++) { const y = b[j], x = out[i]; b[j] = x + y * .5; out[i] = y - x * .5; j = (j + 1) % D; } }
    for (let i = 0; i < N; i++) { L[i] += out[i] * mix; R[i] += out[Math.max(0, i - 37)] * mix; }
  }
  // soft-clip, normalise to -1 dBFS, short fades
  let peak = 0; for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * .9); R[i] = Math.tanh(R[i] * .9); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
  const k = peak > 0 ? .89 / peak : 1, fade = Math.floor(sr * .02);
  for (let i = 0; i < N; i++) { const f = Math.min(1, i / fade, (N - 1 - i) / (fade * 10)); L[i] *= k * f; R[i] *= k * f; }
  return [L, R];
}

function sfx(e, sr, N, put) {
  const i0 = Math.floor(e.t * sr), v = e.v ?? .5, r = rnd(Math.floor(e.t * 1000) + 99), pan = e.pan || 0; let lp = 0, hp = 0, prev = 0;
  const ty = e.type;
  if (ty === 'pop') {   // the tail cracking on the ground: a hard click, a woody knock and a short scrape
    for (let k = 0; k < sr * .18; k++) { const t = k / sr, x = r(); hp = .5 * (hp + x - prev); prev = x; put(i0 + k, (Math.sin(TAU * (520 - 1500 * t) * t) * Math.exp(-t / .03) * .9 + hp * Math.exp(-t / .012) * .8 + Math.sin(TAU * 160 * t) * Math.exp(-t / .05) * .4) * v * .6, pan, .2); }
  } else if (ty === 'land') {   // four wheels and a deck slapping down: a thud, a rattle, a rumble
    for (let k = 0; k < sr * .4; k++) { const t = k / sr, x = r(); lp += .08 * (x - lp); hp = .6 * (hp + x - prev); prev = x; put(i0 + k, (Math.sin(TAU * (70 + 40 * Math.exp(-t * 30)) * t) * Math.exp(-t / .09) * 1.1 + hp * Math.exp(-t / .02) * .7 + lp * 3 * Math.exp(-t / .2)) * v * .6, pan, .2); }
  } else if (ty === 'flick') { for (let k = 0; k < sr * .25; k++) { const t = k / sr, x = r(); lp += (.05 + .3 * (t / .25)) * (x - lp); put(i0 + k, lp * Math.sin(Math.PI * t / .25) * v * .9, pan, .2); } }
  else if (ty === 'grind') {   // metal on metal: a bright scrape with a rough, resonant edge, for d seconds
    const d = e.d || 1; let p1 = 0;
    for (let k = 0; k < sr * (d + .1); k++) { const t = k / sr, x = r(); hp = .85 * (hp + x - prev); prev = x; p1 += (1900 + 300 * Math.sin(t * 23) + 200 * x) / sr; const en = Math.min(1, t / .03) * (t > d ? Math.exp(-(t - d) / .03) : 1) * (.8 + .2 * Math.sin(t * 37)); put(i0 + k, (hp * .35 + Math.sin(TAU * p1) * .12 + Math.sin(TAU * p1 * 2.7) * .05) * en * v, pan, .3); }
  } else if (ty === 'push') { for (let k = 0; k < sr * .22; k++) { const t = k / sr, x = r(); lp += .2 * (x - lp); put(i0 + k, lp * Math.sin(Math.PI * t / .22) * v * .5 + (k < sr * .02 ? x * .2 * v : 0), pan, .1); } }
  else if (ty === 'step') { for (let k = 0; k < sr * .1; k++) { const t = k / sr, x = r(); lp += .15 * (x - lp); put(i0 + k, (lp * 2 + Math.sin(TAU * 90 * t) * .5) * Math.exp(-t / .025) * v * .6, pan, .1); } }
  else if (ty === 'clack') { for (let k = 0; k < sr * .05; k++) { const t = k / sr; put(i0 + k, (Math.sin(TAU * 140 * t) + Math.sin(TAU * 410 * t) * .5) * Math.exp(-t / .012) * v, pan, .05); put(i0 + k + Math.floor(sr * .055), (Math.sin(TAU * 140 * t) + Math.sin(TAU * 410 * t) * .5) * Math.exp(-t / .012) * v * .8, pan, .05); } }
  else if (ty === 'whoosh') { const d = e.d || .4, len = Math.ceil(d * sr); for (let k = 0; k < len; k++) { const t = k / sr, q = t / d, x = r(); lp += (.02 + .25 * Math.sin(Math.PI * q)) * (x - lp); put(i0 + k, lp * Math.sin(Math.PI * q) * v * .9, -.5 + q, .3); } }
  else if (ty === 'meow') { for (let k = 0; k < sr * .55; k++) { const t = k / sr, q = t / .55, f = 520 + 380 * Math.sin(Math.PI * Math.min(1, q * 1.3)) - 200 * q, fm = Math.sin(TAU * f * 2 * t) * .8; put(i0 + k, (Math.sin(TAU * f * t + fm) * .6 + Math.sin(TAU * f * 3 * t) * .15) * Math.sin(Math.PI * q) ** .6 * v * .45, pan || .2, .3); } }
  else if (ty === 'bark' || ty === 'yip') { const n = ty === 'yip' ? 2 : 2; for (let j = 0; j < n; j++) for (let k = 0; k < sr * .16; k++) { const t = k / sr, x = r(), f = (ty === 'yip' ? 700 : 300) * (1 + .5 * Math.exp(-t * 20)); lp += .3 * (x - lp); put(i0 + Math.floor(j * .22 * sr) + k, (Math.sin(TAU * f * t) * .6 + Math.sin(TAU * f * 2.1 * t) * .3 + lp * .5) * Math.exp(-t / .06) * v * .55, pan || .2, .3); } }
  else if (ty === 'cheer') { for (let k = 0; k < sr * .6; k++) { const t = k / sr, f = 300 + 120 * Math.sin(Math.PI * t / .6); put(i0 + k, (Math.sin(TAU * f * t) * .3 + Math.sin(TAU * f * 2 * t) * .2 + Math.sin(TAU * f * 3 * t) * .1) * Math.sin(Math.PI * t / .6) * v * .4, 0, .4); } }
  else if (ty === 'crossing') { const d = e.d || 2; for (let k = 0; k < sr * d; k++) { const t = k / sr, on = (t % .5) < .25 ? 1 : 0; put(i0 + k, (Math.sin(TAU * 1040 * t) + Math.sin(TAU * 1310 * t) * .6) * on * Math.exp(-(t % .25) / .12) * v * .2, pan || -.4, .4); } }
  else if (ty === 'train') { const d = e.d || 4; for (let k = 0; k < sr * d; k++) { const t = k / sr, x = r(), q = t / d; lp += .01 * (x - lp); const cl = (t * 6 % 1) < .05 ? Math.sin(TAU * 200 * t) * .4 : 0; put(i0 + k, (lp * 5 + cl) * Math.sin(Math.PI * q) * v * .6, -.8 + 1.6 * q, .3); } }
  else if (ty === 'chirp') { for (let n = 0; n < 3; n++) for (let k = 0; k < sr * .07; k++) { const t = k / sr; put(i0 + Math.floor(n * .1 * sr) + k, Math.sin(TAU * (3000 + 9000 * t) * t) * Math.sin(Math.PI * t / .07) * v * .2, pan || .4, .3); } }
}
