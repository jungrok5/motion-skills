// luminous-score · score.js — the notation: text voices → events and notes, the tempo map, keys, MIDI-JSON import.
// Pure JS, no DOM: the page, check.mjs and audio.mjs all use it.
//
// A voice is written as text (references/NOTATION.md):
//   e5:8 f#5 g5 a5 | <d4 f4 a4>:2 r:4 !p d4~ | d4:4 (a3:16 d4 f4 a4)*2 | R |
//   pitch = letter + accidental (# b ## bb n) + octave, absolute (f#5 is F sharp whatever the key) · r = rest · R = whole-bar rest
//   :dur = 1 2 4 8 16 32 (+ dots, t = triplet) and it sticks until changed · ~ = tie to the next note
//   <…> = chord · (…)*n = repeat · | = bar check · || = double bar · !p !mf !ff … = dynamics · !cresc !dim = words
//   ^tr ^st ^ac ^fe after a note = trill, staccato, accent, fermata
export const STEPS = 'cdefgab';
export const SEMI = [0, 2, 4, 5, 7, 9, 11];
export const DYN = { ppp: 0.22, pp: 0.32, p: 0.44, mp: 0.56, mf: 0.68, f: 0.82, ff: 0.93, fff: 1 };
const ALT = { '#': 1, '##': 2, x: 2, b: -1, bb: -2, n: 0 };
const EPS = 1e-6;

export function parsePitch(s) {
  const m = /^([a-g])(##|bb|#|b|n|x)?(-?\d)$/.exec(s);
  if (!m) return null;
  const step = STEPS.indexOf(m[1]), alt = ALT[m[2]] ?? 0, oct = +m[3];
  return { step, oct, alt, d: oct * 7 + step, midi: 12 * (oct + 1) + SEMI[step] + alt, written: !!m[2] };
}
export function pitchName(p) { return STEPS[p.step] + ({ 1: '#', 2: '##', '-1': 'b', '-2': 'bb' }[p.alt] || '') + p.oct; }

export function parseDur(s) {
  const m = /^(1|2|4|8|16|32|64)(\.{0,2})(t?)$/.exec(s);
  if (!m) return null;
  let v = 4 / +m[1], b = v;
  for (let i = 0; i < m[2].length; i++) { b /= 2; v += b; }
  return { beats: m[3] ? (v * 2) / 3 : v, triplet: !!m[3] };
}

// keys: 'd minor', 'Eb major', 'f# minor' → fifths (−7 … 7)
const MAJ = { c: 0, g: 1, d: 2, a: 3, e: 4, b: 5, 'f#': 6, 'c#': 7, f: -1, bb: -2, eb: -3, ab: -4, db: -5, gb: -6, cb: -7 };
const MIN = { a: 0, e: 1, b: 2, 'f#': 3, 'c#': 4, 'g#': 5, 'd#': 6, 'a#': 7, d: -1, g: -2, c: -3, f: -4, bb: -5, eb: -6, ab: -7 };
export function parseKey(k = 'c major') {
  if (typeof k === 'number') return k;
  const m = /^\s*([a-gA-G])([#b]?)\s*(major|minor|maj|min|m)?\s*$/.exec(k);
  if (!m) throw new Error(`key "${k}": write it like "d minor" or "Eb major"`);
  const t = m[1].toLowerCase() + m[2], minor = /^m/.test(m[3] || '') && m[3] !== 'major' && m[3] !== 'maj';
  const f = (minor ? MIN : MAJ)[t];
  if (f === undefined) throw new Error(`key "${k}" has no standard signature`);
  return f;
}
// step → alteration the key signature gives it
export function keyAlts(fifths) {
  const a = [0, 0, 0, 0, 0, 0, 0];
  const sharps = [3, 0, 4, 1, 5, 2, 6], flats = [6, 2, 5, 1, 4, 0, 3];
  if (fifths > 0) for (let i = 0; i < fifths; i++) a[sharps[i]] = 1;
  if (fifths < 0) for (let i = 0; i < -fifths; i++) a[flats[i]] = -1;
  return a;
}
const SHARP = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0]];
const FLAT = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];
export function spell(midi, fifths = 0) {
  const pc = ((midi % 12) + 12) % 12, oct = Math.floor(midi / 12) - 1, [step, alt] = (fifths < 0 ? FLAT : SHARP)[pc];
  return { step, oct, alt, d: oct * 7 + step, midi, written: alt !== 0 };
}

export function parseMeter(m = '4/4') {
  const [n, d] = String(m).split('/').map(Number);
  if (!n || !d) throw new Error(`meter "${m}"`);
  const beats = (n * 4) / d, compound = d === 8 && n % 3 === 0 && n > 3;
  return { n, d, beats, group: compound ? 1.5 : d === 2 ? 2 : 1, text: [String(n), String(d)] };
}

// tempo: 112 or [[beat, bpm], …] (steps) — beats are quarter notes from the start of the music
export class TempoMap {
  constructor(t = 100) {
    const segs = (typeof t === 'number' ? [[0, t]] : t).map(([b, bpm]) => ({ b, bpm })).sort((a, b) => a.b - b.b);
    if (segs[0].b > 0) segs.unshift({ b: 0, bpm: segs[0].bpm });
    let s = 0;
    for (let i = 0; i < segs.length; i++) { segs[i].s = s; if (segs[i + 1]) s += ((segs[i + 1].b - segs[i].b) * 60) / segs[i].bpm; }
    this.segs = segs;
  }
  sec(b) { let g = this.segs[0]; for (const x of this.segs) if (x.b <= b + EPS) g = x; return g.s + ((b - g.b) * 60) / g.bpm; }
  beat(s) { let g = this.segs[0]; for (const x of this.segs) if (x.s <= s + EPS) g = x; return g.b + ((s - g.s) * g.bpm) / 60; }
  bpmAt(b) { let g = this.segs[0]; for (const x of this.segs) if (x.b <= b + EPS) g = x; return g.bpm; }
}

function expand(text) {
  let s = text.replace(/%[^\n]*/g, ' ');
  for (let k = 0; k < 50 && /\(([^()]*)\)\s*\*\s*(\d+)/.test(s); k++) s = s.replace(/\(([^()]*)\)\s*\*\s*(\d+)/g, (_, b, n) => (' ' + b + ' ').repeat(+n));
  s = s.replace(/<([^>]*)>/g, (_, b) => ' <' + b.trim().split(/\s+/).join(',') + '>'); // a chord is one token: <f4,a4,d5>:2
  return s.trim().split(/\s+/).filter(Boolean);
}

export class Score {
  constructor({ meter = '4/4', key = 'c major', tempo = 100, pickup = 0 } = {}) {
    this.meter = parseMeter(meter); this.fifths = parseKey(key); this.tempo = new TempoMap(tempo); this.pickup = pickup;
    this.voices = new Map(); this.errors = []; this.warnings = [];
  }
  v(id) { if (!this.voices.has(id)) this.voices.set(id, { id, events: [], cursor: 0, dur: 1, bars: [] }); return this.voices.get(id); }
  barOf(beat) { return beat < this.pickup - EPS ? 0 : Math.floor((beat - this.pickup) / this.meter.beats + EPS) + (this.pickup > 0 ? 1 : 1); }
  barStart(bar) { return this.pickup > 0 ? (bar === 0 ? 0 : this.pickup + (bar - 1) * this.meter.beats) : (bar - 1) * this.meter.beats; }

  // append a text voice from where that voice stopped
  voice(id, text, { at } = {}) {
    const v = this.v(id); if (at !== undefined) v.cursor = at;
    let dyn = null, words = null; const err = (msg) => this.errors.push(`voice ${id}, bar ${this.barOf(v.cursor)}: ${msg}`);
    let lastBarAt = v.cursor;
    for (const tok of expand(text)) {
      if (tok === '|' || tok === '||' || tok === '|.') {
        const M = this.meter.beats, rel = v.cursor - this.pickup;
        const ok = v.cursor < EPS ? true : Math.abs(rel / M - Math.round(rel / M)) < EPS;
        if (!ok) err(`bar check failed: ${+((v.cursor - lastBarAt).toFixed(3))} beats since the last bar line (a bar is ${M})`);
        if (tok !== '|') v.bars.push({ beat: v.cursor, kind: tok });
        lastBarAt = v.cursor; continue;
      }
      if (tok.startsWith('!')) { const w = tok.slice(1); if (DYN[w] !== undefined) dyn = w; else words = w.replace(/_/g, ' '); continue; }
      if (tok === 'R' || /^R\*\d+$/.test(tok)) {
        const n = tok === 'R' ? 1 : +tok.slice(2), start = v.cursor, bs = this.barStart(this.barOf(start));
        if (Math.abs(start - bs) > EPS) err('R (whole-bar rest) must start a bar');
        const dur = this.meter.beats * n; v.events.push({ beat: start, dur, rest: true, full: true, pitches: [], orn: [] }); v.cursor += dur; continue;
      }
      const m = /^(<[^>]*>|[a-gr][#bnx]{0,2}-?\d?)(?::(\d+\.{0,2}t?))?(~?)((?:\^[a-z]+)*)$/.exec(tok);
      if (!m) { err(`can't read "${tok}"`); continue; }
      let dur = v.dur, triplet = v.triplet || false;
      if (m[2]) { const d = parseDur(m[2]); if (!d) { err(`bad duration "${m[2]}"`); continue; } dur = d.beats; triplet = d.triplet; v.dur = dur; v.triplet = triplet; }
      const ev = { beat: v.cursor, dur, triplet, rest: false, pitches: [], tie: m[3] === '~', orn: m[4] ? m[4].split('^').filter(Boolean) : [], dyn, words };
      if (m[1] === 'r') ev.rest = true;
      else {
        const names = m[1].startsWith('<') ? m[1].slice(1, -1).split(',').filter(Boolean) : [m[1]];
        for (const n of names) { const p = parsePitch(n); if (!p) err(`can't read pitch "${n}" (write c4, f#5, bb3)`); else ev.pitches.push(p); }
        if (!ev.pitches.length) continue;
        ev.pitches.sort((a, b) => a.d - b.d);
      }
      dyn = null; words = null;
      v.events.push(ev); v.cursor += dur;
    }
    return this;
  }
  // programmatic: add(voice, beat, dur, 'c4' | ['c4','e4'] | midi numbers, { vel, dyn, orn, tie })
  add(id, beat, dur, pitches, o = {}) {
    const v = this.v(id), list = (Array.isArray(pitches) ? pitches : [pitches]);
    const ev = { beat, dur, rest: pitches === null || pitches === 'r', pitches: [], tie: !!o.tie, orn: o.orn || [], dyn: o.dyn || null, words: o.words || null, vel: o.vel, triplet: !!o.triplet };
    if (!ev.rest) for (const x of list) { const p = typeof x === 'number' ? spell(x, this.fifths) : parsePitch(x); if (!p) this.errors.push(`voice ${id}: can't read pitch "${x}"`); else ev.pitches.push(p); }
    ev.pitches.sort((a, b) => a.d - b.d);
    v.events.push(ev); v.cursor = Math.max(v.cursor, beat + dur);
    return this;
  }
  // MIDI JSON from scripts/midi2score.mjs: { tracks: [{ name, notes: [[beat, dur, midi, vel], …] }] }
  addMidi(json, { track = 0, voice, transpose = 0, minVel = 0 } = {}) {
    const tr = typeof track === 'number' ? json.tracks[track] : json.tracks.find((t) => t.name === track);
    if (!tr) throw new Error(`no track ${track} in the MIDI JSON (have: ${json.tracks.map((t, i) => i + ' ' + t.name).join(', ')})`);
    const groups = new Map();
    for (const [b, d, m, vel] of tr.notes) { if (vel < minVel) continue; const k = b + ':' + d; if (!groups.has(k)) groups.set(k, { b, d, m: [], vel }); groups.get(k).m.push(m + transpose); }
    for (const g of groups.values()) this.add(voice ?? tr.name, g.b, g.d, g.m, { vel: g.vel / 127 });
    return this;
  }

  finalize() {
    const notes = [];
    let end = 0;
    for (const v of this.voices.values()) {
      v.events.sort((a, b) => a.beat - b.beat);
      let vel = 0.7;
      for (const e of v.events) {
        if (e.dyn) vel = DYN[e.dyn];
        e.vel = e.vel ?? vel;
        end = Math.max(end, e.beat + e.dur);
      }
      // sounding notes: merge ties (same midi, next event starting where this one ends)
      const open = new Map();
      for (const e of v.events) {
        if (e.rest) continue;
        for (const p of e.pitches) {
          const prev = open.get(p.midi);
          if (prev && Math.abs(prev.b1 - e.beat) < EPS) { prev.b1 = e.beat + e.dur; prev.tie = e.tie; e.cont = true; if (!e.tie) open.delete(p.midi); continue; }
          const n = { voice: v.id, midi: p.midi, d: p.d, beat: e.beat, b1: e.beat + e.dur, vel: e.vel, orn: e.orn, tie: e.tie };
          notes.push(n);
          if (e.tie) open.set(p.midi, n);
        }
        for (const [m, n] of open) if (n.b1 < e.beat - EPS) open.delete(m);
      }
    }
    for (const n of notes) { n.t0 = this.tempo.sec(n.beat); n.t1 = this.tempo.sec(n.b1); }
    notes.sort((a, b) => a.t0 - b.t0 || a.midi - b.midi);
    this.notes = notes; this.endBeat = end;
    this.bars = Math.ceil((end - this.pickup) / this.meter.beats - EPS) + (this.pickup > 0 ? 1 : 0);
    for (const v of this.voices.values()) {
      const short = end - v.cursor;
      if (v.events.length && short > EPS && v.events.some((e) => !e.full)) this.warnings.push(`voice ${v.id} ends ${+short.toFixed(3)} beats before the others (fill with rests)`);
    }
    return this;
  }
}

// instrument ranges (sounding MIDI) for the range check
export const RANGES = {
  violin: [55, 103], viola: [48, 88], cello: [36, 81], bass: [28, 67], flute: [60, 98], oboe: [58, 91], clarinet: [50, 94],
  bassoon: [34, 75], horn: [34, 77], trumpet: [54, 84], trombone: [40, 72], harp: [24, 103], piano: [21, 108],
  harpsichord: [29, 89], celesta: [60, 108], organ: [24, 96], voice: [43, 84], guitar: [40, 88],
};
