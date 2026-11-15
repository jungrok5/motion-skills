// luminous-score · midi2score.mjs — a Standard MIDI File → the JSON that Piece.addMidi() reads.
//   node <skill>/scripts/midi2score.mjs in.mid [--out score.json] [--grid 16]
// Prints each track (name, notes, range, the instrument it probably is) so you can map tracks to voices:
//   P.addMidi(json, { track: 1, voice: 'solo' })  — and P's tempo / meter from json.tempo / json.meter.
// Beats are quarter notes; starts and lengths snap to 1/grid of a whole note (16 → sixteenths, 12 → eighth triplets).
import { readFileSync, writeFileSync } from 'node:fs';
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const file = args.find((a) => /\.midi?$/i.test(a));
if (!file) { console.error('usage: midi2score.mjs in.mid [--out score.json] [--grid 16]'); process.exit(1); }
const b = readFileSync(file); let p = 0;
const u32 = () => { const v = b.readUInt32BE(p); p += 4; return v; }, u16 = () => { const v = b.readUInt16BE(p); p += 2; return v; };
const vlq = () => { let v = 0, c; do { c = b[p++]; v = (v << 7) | (c & 0x7f); } while (c & 0x80); return v; };
if (b.toString('latin1', 0, 4) !== 'MThd') throw new Error('not a MIDI file');
p = 8; const format = u16(), ntr = u16(), ppq = u16(); p = 8 + b.readUInt32BE(4);
const grid = 4 / +opt('grid', 16), snap = (beat) => Math.round(beat / grid) * grid;
const tempo = [], meters = [], tracks = [];
for (let k = 0; k < ntr; k++) {
  if (b.toString('latin1', p, p + 4) !== 'MTrk') break; p += 4; const len = u32(), end = p + len;
  let tick = 0, run = 0, name = '', prog = null, chan = null; const on = new Map(), notes = [];
  while (p < end) {
    tick += vlq(); let st = b[p];
    if (st < 0x80) st = run; else { p++; if (st < 0xf0) run = st; }
    const type = st & 0xf0;
    if (st === 0xff) { const mt = b[p++], l = vlq(), d = b.subarray(p, p + l); p += l;
      if (mt === 0x03 && !name) name = d.toString('latin1').trim();
      if (mt === 0x51) tempo.push([tick / ppq, +(60e6 / ((d[0] << 16) | (d[1] << 8) | d[2])).toFixed(3)]);
      if (mt === 0x58) meters.push([tick / ppq, `${d[0]}/${2 ** d[1]}`]); }
    else if (st === 0xf0 || st === 0xf7) p += vlq();
    else if (type === 0x90 || type === 0x80) { const n = b[p++], v = b[p++], key = (st & 15) * 128 + n; chan = st & 15;
      if (type === 0x90 && v > 0) on.set(key, [tick, v]);
      else if (on.has(key)) { const [t0, vel] = on.get(key); on.delete(key); const s = snap(t0 / ppq), e = Math.max(s + grid, snap(tick / ppq)); notes.push([+s.toFixed(4), +(e - s).toFixed(4), n, vel]); } }
    else if (type === 0xc0) { prog = b[p++]; } else if (type === 0xd0) p += 1; else p += 2;
  }
  p = end;
  if (notes.length) { notes.sort((a, c) => a[0] - c[0] || a[2] - c[2]); tracks.push({ name: name || `track ${k}`, channel: chan, program: prog, notes }); }
}
const GM = (pr, ch) => ch === 9 ? 'drums' : pr === null ? '?' : pr < 8 ? 'piano' : pr < 16 ? 'celesta / bells' : pr < 24 ? 'organ' : pr < 32 ? 'guitar → pluck' : pr < 40 ? 'bass' : pr === 40 ? 'violin' : pr === 41 ? 'viola' : pr === 42 ? 'cello' : pr === 43 ? 'contrabass' : pr === 46 ? 'harp → pluck' : pr < 56 ? 'strings' : pr < 64 ? 'brass → horn' : pr < 72 ? 'reed' : pr < 80 ? 'flute' : 'other';
const json = { source: file, ppq, format, tempo: tempo.length ? tempo : [[0, 120]], meter: meters.length ? meters[0][1] : '4/4', meters, tracks };
const out = opt('out', file.replace(/\.midi?$/i, '.score.json')); writeFileSync(out, JSON.stringify(json));
console.log(`${out}\n  tempo ${JSON.stringify(json.tempo.slice(0, 4))}${json.tempo.length > 4 ? ' …' : ''} · meter ${json.meter}`);
const nm = (m) => 'C C# D D# E F F# G G# A A# B'.split(' ')[m % 12] + (Math.floor(m / 12) - 1);
tracks.forEach((t, i) => { const ms = t.notes.map((n) => n[2]); console.log(`  track ${i}: ${t.name} · ${t.notes.length} notes · ${nm(Math.min(...ms))}–${nm(Math.max(...ms))} · ${GM(t.program, t.channel)} · beats ${t.notes[0][0]}–${(t.notes.at(-1)[0] + t.notes.at(-1)[1]).toFixed(2)}`); });
