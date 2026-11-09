// luminous-score · engrave.js — lays a Score out as one endless system of staves and draws it into paper tiles.
// World units: x = time (beat · U + PAD), z = down the page (top line of the first staff at z = 0), S = one staff space.
// Output: staffs, heads (for the 3D heads and their light), a display list drawn per tile (staff lines, stems, beams,
// flags, rests, accidentals, ties, ledger lines, clefs, key / time signatures, bar lines, dynamics, names, bar numbers).
import { keyAlts } from './score.js';

const EPS = 1e-6;
export const CLEFS = {
  treble: { top: 38, key: 0, glyph: '\u{1D11E}' },
  treble8: { top: 31, key: -7, glyph: '\u{1D11E}', eight: true },
  alto: { top: 32, key: -7, glyph: '\u{1D121}' },
  tenor: { top: 30, key: -9, glyph: '\u{1D121}' },
  bass: { top: 26, key: -14, glyph: '\u{1D122}' },
};
const SHARP_D = [38, 35, 39, 36, 33, 37, 34], FLAT_D = [34, 37, 33, 36, 32, 35, 31]; // treble key-signature positions
const VALUES = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.375, 0.25, 0.1875, 0.125, 0.0625];
const BASE = (v) => { for (const [b, d] of [[4, 0], [2, 0], [1, 0], [0.5, 0], [0.25, 0], [0.125, 0], [0.0625, 0]]) { if (Math.abs(v - b) < EPS) return [b, 0]; if (Math.abs(v - b * 1.5) < EPS) return [b, 1]; if (Math.abs(v - b * 1.75) < EPS) return [b, 2]; } return [v, 0]; };
const FLAGS = (base) => (base <= 0.0625 + EPS ? 4 : base <= 0.125 + EPS ? 3 : base <= 0.25 + EPS ? 2 : base <= 0.5 + EPS ? 1 : 0);
export const FONT = { music: 'LSMusic', serif: 'LSSerif, LSKR, serif', italic: 'LSSerifItalic, LSSerif, LSKR, serif' };

// ── glyph metrics (measured once the fonts are loaded) ─────────────────────────────────────────────
let MCTX = null; const MET = new Map();
function metric(ch, font) {
  const k = font + ch; if (MET.has(k)) return MET.get(k);
  MCTX = MCTX || (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(8, 8) : document.createElement('canvas')).getContext('2d');
  MCTX.font = `100px ${font}`; const m = MCTX.measureText(ch);
  const r = { asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent, left: m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight };
  r.h = r.asc + r.desc || 1; r.w = r.left + r.right || 1; MET.set(k, r); return r;
}
// draw a glyph so its ink box has height h (world) with its top-left at (x, top)
function glyph(ctx, ch, x, top, h, font = FONT.music) {
  const m = metric(ch, font), P = (h * ctx.k * 100) / m.h;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = `${P}px ${font}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(ch, (x - ctx.x0) * ctx.k + (m.left * P) / 100 + ctx.ox, (top - ctx.z0) * ctx.k + (m.asc * P) / 100 + ctx.oz);
  ctx.restore(); return (m.w * h) / m.h;
}
export function glyphWidth(ch, h, font = FONT.music) { const m = metric(ch, font); return (m.w * h) / m.h; }
function text(ctx, str, x, z, size, font, align = 'left', base = 'alphabetic', weight = 400) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = `${weight} ${size * ctx.k}px ${font}`; ctx.textAlign = align; ctx.textBaseline = base;
  ctx.fillText(str, (x - ctx.x0) * ctx.k + ctx.ox, (z - ctx.z0) * ctx.k + ctx.oz); ctx.restore();
}

export function engrave(score, { staves, voices, S = 0.11, U = 1.15, gap = 7, names = true, barNumbers = 4, title }) {
  const L = { S, U, staffs: [], heads: [], items: [], bars: [], marks: [] };
  const PAD = 2.0 * S, X = (b) => b * U + PAD; L.X = X; L.PAD = PAD; // PAD: room after a bar line for an accidental
  const hw = 0.62 * S;
  const fifths = score.fifths, kalts = keyAlts(fifths), M = score.meter;
  // staffs
  let z = 0;
  for (const st of staves) {
    const c = CLEFS[st.clef || 'treble']; if (!c) throw new Error(`staff ${st.id}: unknown clef ${st.clef}`);
    L.staffs.push({ ...st, c, top: z, mid: z + 2 * S, bot: z + 4 * S, topD: c.top });
    z += 4 * S + (st.gap ?? gap) * S;
  }
  const last = L.staffs[L.staffs.length - 1];
  L.zTop = 0; L.zBot = last.bot;
  const zOf = (st, d) => st.top + ((st.topD - d) * S) / 2;
  const item = (x0, x1, f) => L.items.push({ x0, x1, f });

  // lead-in: names | bracket | clef | key | time
  const nAcc = Math.abs(fifths);
  const clefW = 3.0 * S, keyW = nAcc * 1.05 * S, timeW = 2.4 * S;
  const xSys = -(0.6 * S + clefW + 0.4 * S + keyW + 0.6 * S + timeW + 0.6 * S);
  L.xSys = xSys;
  const xClef = xSys + 0.6 * S, xKey = xClef + clefW + 0.4 * S, xTime = xKey + keyW + 0.5 * S;
  for (const st of L.staffs) {
    item(xSys - 12 * S, xSys + 12 * S, (ctx) => {
      const c = st.c;
      if (st.clef === 'bass') glyph(ctx, c.glyph, xClef, st.top - 0.05 * S, 3.35 * S);
      else if (st.clef === 'alto' || st.clef === 'tenor') glyph(ctx, c.glyph, xClef, zOf(st, st.clef === 'alto' ? 28 : 26) - 2.05 * S, 4.1 * S);
      else { glyph(ctx, c.glyph, xClef - 0.1 * S, st.top - 1.55 * S, 7.1 * S); if (c.eight) text(ctx, '8', xClef + 0.9 * S, st.bot + 2.6 * S, 1.3 * S, FONT.italic, 'center'); }
      for (let i = 0; i < nAcc; i++) {
        const d = (fifths > 0 ? SHARP_D : FLAT_D)[i] + c.key, zz = zOf(st, d), x = xKey + i * 1.05 * S;
        if (fifths > 0) glyph(ctx, '♯', x, zz - 1.35 * S, 2.7 * S); else glyph(ctx, '♭', x, zz - 1.75 * S, 2.3 * S);
      }
      for (const [j, s] of M.text.entries()) {
        const cz = st.top + (j ? 3 : 1) * S;
        text(ctx, s, xTime + timeW / 2, cz, 2.9 * S, FONT.serif, 'center', 'middle', 700);
      }
      if (names && st.name) text(ctx, st.name, xSys - 1.2 * S, st.mid, 1.45 * S, FONT.italic, 'right', 'middle', 500);
    });
  }
  // system start line + bracket
  item(xSys - 2 * S, xSys + S, (ctx) => {
    ctx.fillRect(xSys - 0.07 * S, L.zTop, 0.14 * S, L.zBot - L.zTop);
    ctx.fillRect(xSys - 0.9 * S, L.zTop - 0.6 * S, 0.45 * S, L.zBot - L.zTop + 1.2 * S);
    for (const sgn of [-1, 1]) {
      const zz = sgn < 0 ? L.zTop - 0.6 * S : L.zBot + 0.6 * S;
      ctx.beginPath(); ctx.moveTo(xSys - 0.9 * S, zz); ctx.quadraticCurveTo(xSys - 0.2 * S, zz, xSys + 0.6 * S, zz + sgn * 1.0 * S);
      ctx.quadraticCurveTo(xSys - 0.2 * S, zz + sgn * 0.25 * S, xSys - 0.45 * S, zz + sgn * 0.25 * S); ctx.lineTo(xSys - 0.9 * S, zz); ctx.fill();
    }
  });

  // bar lines + numbers
  const end = score.endBeat;
  L.xEnd = X(end) + 2 * S;
  for (let bar = 1; ; bar++) {
    const b = score.barStart(bar); if (b > end + EPS) break;
    if (b < EPS) continue;
    const x = b * U, fin = Math.abs(b - end) < EPS;
    L.bars.push({ bar, b, x });
    item(x - S, x + 4 * S, (ctx) => {
      if (fin) { ctx.fillRect(x - 0.5 * S, L.zTop, 0.14 * S, L.zBot - L.zTop); ctx.fillRect(x - 0.1 * S, L.zTop, 0.5 * S, L.zBot - L.zTop); }
      else ctx.fillRect(x - 0.07 * S, L.zTop, 0.14 * S, L.zBot - L.zTop);
      if (barNumbers && !fin && (bar - 1) % barNumbers === 0) text(ctx, String(bar), x, L.zTop - 1.3 * S, 1.2 * S, FONT.italic, 'left');
    });
    if (fin) L.xEnd = x + 0.4 * S;
  }
  if (!L.bars.length || Math.abs(L.bars[L.bars.length - 1].b - end) > EPS) {
    const x = Math.max(...[...score.voices.values()].map((v) => v.cursor), end) * U;
    item(x - S, x + S, (ctx) => { ctx.fillRect(x - 0.5 * S, L.zTop, 0.14 * S, L.zBot - L.zTop); ctx.fillRect(x - 0.1 * S, L.zTop, 0.5 * S, L.zBot - L.zTop); });
    L.xEnd = x + 0.4 * S;
  }
  // double bars written in voices
  for (const v of score.voices.values()) for (const br of v.bars) if (br.kind === '||') {
    const x = br.beat * U;
    item(x - S, x + S, (ctx) => { ctx.fillRect(x - 0.35 * S, L.zTop, 0.12 * S, L.zBot - L.zTop); ctx.fillRect(x - 0.05 * S, L.zTop, 0.12 * S, L.zBot - L.zTop); });
  }

  // ── voices ─────────────────────────────────────────────────────────────
  const accState = new Map(); // staffId|bar → Map(d → alt)
  for (const v of score.voices.values()) {
    const vc = voices[v.id]; if (!vc) throw new Error(`voice "${v.id}" has notes but is not declared in voices`);
    const st = L.staffs.find((s) => s.id === (vc.staff ?? v.id)); if (!st) throw new Error(`voice ${v.id}: no staff "${vc.staff ?? v.id}"`);
    const shared = Object.values(voices).filter((o) => (o.staff ?? o.id) === st.id).length > 1;
    const midD = st.topD - 4;
    // 1 · fragments
    const frags = [];
    for (const e of v.events) {
      if (e.full) { frags.push({ beat: e.beat, dur: e.dur, val: e.dur, base: 4, dots: 0, rest: true, full: true, pitches: [], ev: e }); continue; }
      if (e.triplet) { const [base, dots] = BASE(e.dur * 1.5); frags.push({ beat: e.beat, dur: e.dur, val: e.dur * 1.5, base, dots, triplet: true, rest: e.rest, pitches: e.pitches, ev: e, tieNext: e.tie, first: true }); continue; }
      let p = e.beat, r = e.dur, first = true;
      while (r > EPS) {
        const nextBar = score.barStart(score.barOf(p) + 1);
        let c = VALUES.find((c) => c <= r + EPS && p + c <= nextBar + EPS && (Math.abs(((p - score.pickup) % 1 + 1) % 1) < EPS || c <= 1 + EPS || p + c <= Math.ceil(p - EPS) + EPS));
        if (!c) c = Math.min(r, nextBar - p);
        const [base, dots] = BASE(c);
        frags.push({ beat: p, dur: c, val: c, base, dots, rest: e.rest, pitches: e.pitches, ev: e, first, tieNext: !e.rest && (r - c > EPS || e.tie) });
        p += c; r -= c; first = false;
      }
    }
    // 2 · stems and beam groups
    const beamable = (f) => !f.rest && FLAGS(f.base) > 0;
    const groupKey = (f) => { const bar = score.barOf(f.beat), rel = f.beat - score.barStart(bar); return bar + ':' + Math.floor(rel / (f.triplet ? (M.group === 1 ? 1 : M.group) : M.group) + EPS); };
    const groups = []; let cur = null;
    for (const f of frags) {
      if (beamable(f) && cur && groupKey(f) === cur.key && Math.abs(cur.end - f.beat) < EPS && !!f.triplet === !!cur.trip) { cur.fs.push(f); cur.end = f.beat + f.dur; }
      else { cur = beamable(f) ? { key: groupKey(f), fs: [f], end: f.beat + f.dur, trip: f.triplet } : null; if (cur) groups.push(cur); }
    }
    for (const f of frags) if (!f.rest) {
      const far = f.pitches.reduce((a, p) => (Math.abs(p.d - midD) > Math.abs(a - midD) ? p.d : a), f.pitches[0].d);
      f.up = vc.stem ? vc.stem === 'up' : far < midD;
      f.x = X(f.beat);
      f.zs = f.pitches.map((p) => zOf(st, p.d));
    }
    for (const g of groups) if (g.fs.length > 1) {
      const up = vc.stem ? vc.stem === 'up' : g.fs.reduce((a, f) => a + f.pitches.reduce((s, p) => s + p.d - midD, 0) / f.pitches.length, 0) / g.fs.length < 0;
      for (const f of g.fs) { f.up = up; f.beam = g; }
      g.up = up;
    }
    // 3 · draw items per fragment
    const stemX = (f) => f.x + (f.up ? hw - 0.06 * S : -hw + 0.06 * S);
    for (const g of groups) if (g.fs.length > 1) {
      const fs = g.fs, up = g.up, nb = Math.max(...fs.map((f) => FLAGS(f.base)));
      const tip = (f) => (up ? Math.min(...f.zs) : Math.max(...f.zs));
      const x0 = stemX(fs[0]), x1 = stemX(fs[fs.length - 1]);
      let slope = x1 > x0 ? ((tip(fs[fs.length - 1]) - tip(fs[0])) / (x1 - x0)) * 0.5 : 0;
      slope = Math.max(-0.22, Math.min(0.22, slope));
      const len = 3.3 * S + Math.max(0, nb - 1) * 0.6 * S;
      let c = tip(fs[0]) + (up ? -len : len);
      for (const f of fs) { const want = tip(f) + (up ? -len : len), at = c + slope * (stemX(f) - x0); if (up ? at > want : at < want) c += want - at; }
      g.line = (x) => c + slope * (x - x0); g.x0 = x0; g.x1 = x1; g.nb = nb;
      item(x0 - S, x1 + S, (ctx) => {
        const T = 0.48 * S, step = 0.78 * S * (up ? 1 : -1);
        const bar = (xa, xb, k) => { const za = g.line(xa) + k * step, zb = g.line(xb) + k * step; ctx.beginPath(); ctx.moveTo(xa, za - T / 2); ctx.lineTo(xb, zb - T / 2); ctx.lineTo(xb, zb + T / 2); ctx.lineTo(xa, za + T / 2); ctx.fill(); };
        bar(x0 - 0.06 * S, x1 + 0.06 * S, 0);
        for (let k = 1; k < nb; k++) for (let i = 0; i < fs.length; i++) {
          if (FLAGS(fs[i].base) <= k) continue;
          const nx = fs[i + 1] && FLAGS(fs[i + 1].base) > k;
          if (nx) bar(stemX(fs[i]) - 0.06 * S, stemX(fs[i + 1]) + 0.06 * S, k);
          else if (!(fs[i - 1] && FLAGS(fs[i - 1].base) > k)) { const xa = stemX(fs[i]), xb = i < fs.length - 1 ? xa + 1.2 * S : xa - 1.2 * S; bar(Math.min(xa, xb), Math.max(xa, xb), k); }
        }
        if (g.trip) { const xm = (x0 + x1) / 2; text(ctx, '3', xm, g.line(xm) + (up ? -1.0 * S : 1.9 * S), 1.3 * S, FONT.italic, 'center', 'alphabetic', 600); }
      });
    }
    let prevBar = -1;
    for (let fi = 0; fi < frags.length; fi++) {
      const f = frags[fi], bar = score.barOf(f.beat);
      if (bar !== prevBar) prevBar = bar;
      if (f.rest) {
        const x = f.full ? (score.barStart(bar) * U + Math.min(score.barStart(bar + 1), end) * U) / 2 : X(f.beat);
        const shift = shared ? (vc.stem === 'down' ? 2.5 * S : -3 * S) : 0;
        item(x - 2 * S, x + 2 * S, (ctx) => rest(ctx, f.full ? 4 : f.base, x, st, shift, f.dots));
        continue;
      }
      // accidentals
      const key = st.id + '|' + bar; if (!accState.has(key)) accState.set(key, new Map());
      const acc = accState.get(key);
      const accs = [];
      for (const p of f.pitches) {
        const had = acc.has(p.d) ? acc.get(p.d) : kalts[((p.d % 7) + 7) % 7];
        if (had !== p.alt && f.first) accs.push(p);
        acc.set(p.d, p.alt);
      }
      // seconds in chords: flip a head to the other side of the stem
      const offs = f.pitches.map(() => 0);
      if (f.pitches.length > 1) {
        const ord = f.pitches.map((p, i) => i).sort((a, b) => (f.up ? f.pitches[a].d - f.pitches[b].d : f.pitches[b].d - f.pitches[a].d));
        for (let k = 1; k < ord.length; k++) { const a = f.pitches[ord[k - 1]], b = f.pitches[ord[k]]; if (Math.abs(a.d - b.d) === 1 && !offs[ord[k - 1]]) offs[ord[k]] = f.up ? 2 * hw - 0.1 * S : -2 * hw + 0.1 * S; }
      }
      const open = f.base >= 2 - EPS;
      f.pitches.forEach((p, i) => {
        L.heads.push({ x: f.x + offs[i], z: zOf(st, p.d), open, whole: f.base >= 4 - EPS, voice: v.id, staff: st.id, b0: f.beat, b1: f.beat + f.dur, cont: !f.first || !!f.ev.cont, midi: p.midi, d: p.d });
      });
      const sx = stemX(f), zHi = Math.min(...f.zs), zLo = Math.max(...f.zs);
      const nf = FLAGS(f.base);
      item(f.x - 4 * S, f.x + 3 * S, (ctx) => {
        // ledger lines
        for (const p of f.pitches) {
          const zz = zOf(st, p.d);
          for (let lz = st.top - S; lz >= zz - EPS; lz -= S) ctx.fillRect(f.x - hw - 0.45 * S, lz - 0.08 * S, 2 * hw + 0.9 * S, 0.16 * S);
          for (let lz = st.bot + S; lz <= zz + EPS; lz += S) ctx.fillRect(f.x - hw - 0.45 * S, lz - 0.08 * S, 2 * hw + 0.9 * S, 0.16 * S);
        }
        // heads (under the 3D heads: they give the shadow and the open-head ring)
        f.pitches.forEach((p, i) => head(ctx, f.x + offs[i], zOf(st, p.d), open, f.base >= 4 - EPS, S));
        // accidentals, stacked leftwards when several
        accs.forEach((p, j) => {
          const zz = zOf(st, p.d), x = f.x - hw - (1.25 + j * 1.0) * S - (offs.some((o) => o < 0) ? 1.1 * S : 0);
          if (p.alt === 1) glyph(ctx, '♯', x - 0.5 * S, zz - 1.35 * S, 2.7 * S);
          else if (p.alt === -1) glyph(ctx, '♭', x - 0.45 * S, zz - 1.75 * S, 2.3 * S);
          else if (p.alt === 0) glyph(ctx, '♮', x - 0.35 * S, zz - 1.4 * S, 2.8 * S);
          else if (p.alt === 2) glyph(ctx, '\u{1D12A}', x - 0.5 * S, zz - 0.5 * S, 1.0 * S);
          else if (p.alt === -2) glyph(ctx, '\u{1D12B}', x - 1.2 * S, zz - 1.75 * S, 2.3 * S);
        });
        // dots
        if (f.dots) for (const p of f.pitches) {
          const zz = zOf(st, p.d) - (((st.topD - p.d) % 2 === 0) ? 0.5 * S : 0);
          for (let k = 0; k < f.dots; k++) { ctx.beginPath(); ctx.arc(f.x + hw + (0.55 + k * 0.6) * S, zz, 0.2 * S, 0, 7); ctx.fill(); }
        }
        // stem, flag
        if (f.base < 4 - EPS) {
          let zEnd;
          if (f.beam) zEnd = f.beam.line(sx); else zEnd = f.up ? zHi - (3.4 + Math.max(0, nf - 2) * 0.7) * S : zLo + (3.4 + Math.max(0, nf - 2) * 0.7) * S;
          if (!f.beam && (f.up ? zEnd > st.mid : zEnd < st.mid)) zEnd = st.mid;
          const zStart = f.up ? zLo - 0.2 * S : zHi + 0.2 * S;
          ctx.fillRect(sx - 0.055 * S, Math.min(zStart, zEnd), 0.11 * S, Math.abs(zEnd - zStart));
          if (!f.beam && nf) for (let k = 0; k < nf; k++) flag(ctx, sx, zEnd + (f.up ? 1 : -1) * k * 0.85 * S, f.up, S);
        }
        // ornaments, staccato, accent, fermata
        const outZ = f.up ? zLo + 1.2 * S : zHi - 1.2 * S;
        for (const o of f.ev.orn || []) {
          if (!f.first) continue;
          if (o === 'st') { ctx.beginPath(); ctx.arc(f.x, outZ, 0.2 * S, 0, 7); ctx.fill(); }
          if (o === 'ac') { ctx.save(); ctx.lineWidth = 0.16 * S; ctx.strokeStyle = ctx.fillStyle; ctx.beginPath(); ctx.moveTo(f.x - 0.7 * S, outZ - 0.4 * S); ctx.lineTo(f.x + 0.7 * S, outZ); ctx.lineTo(f.x - 0.7 * S, outZ + 0.4 * S); ctx.stroke(); ctx.restore(); }
          if (o === 'tr') text(ctx, 'tr', f.x, Math.min(st.top, zHi) - 1.9 * S, 1.7 * S, FONT.italic, 'center', 'alphabetic', 700);
          if (o === 'fe') glyph(ctx, '\u{1D110}', f.x - 1.1 * S, Math.min(st.top, zHi) - 3.4 * S, 1.3 * S);
        }
      });
      // ties to the next fragment that has the same pitch
      if (f.tieNext) {
        const nx = frags.slice(fi + 1).find((g) => !g.rest && Math.abs(g.beat - (f.beat + f.dur)) < EPS);
        if (nx) for (const p of f.pitches) if (nx.pitches.some((q) => q.midi === p.midi)) {
          const zz = zOf(st, p.d), xa = f.x + 0.4 * S, xb = X(nx.beat) - 0.4 * S, dn = f.up ? 1 : -1;
          item(xa - S, xb + S, (ctx) => { tie(ctx, xa, xb, zz + dn * 0.55 * S, dn, S); });
        }
      }
      // dynamics and words
      const below = st.bot + 3.0 * S;
      if (f.first && f.ev.dyn) item(f.x - 2 * S, f.x + 4 * S, (ctx) => text(ctx, f.ev.dyn, f.x - 0.4 * S, below, 2.0 * S, FONT.italic, 'left', 'alphabetic', 700));
      if (f.first && f.ev.words) item(f.x - 2 * S, f.x + 12 * S, (ctx) => text(ctx, f.ev.words, f.x + (f.ev.dyn ? 2.6 * S : 0), below, 1.5 * S, FONT.italic, 'left', 'alphabetic', 500));
    }
  }
  L.heads.sort((a, b) => a.b0 - b.b0 || a.z - b.z);
  // title block (the 3D lettering is placed by the stage at L.title)
  if (title) {
    const tz = -(title.gap ?? 4.5) * S;
    L.title = { x: xSys, z: tz, size: (title.size ?? 6) * S };
    const subZ = tz + 0.2 * S;
    item(xSys, xSys + 60 * S, (ctx) => {
      if (title.sub) text(ctx, title.sub, xSys + (title.subX ?? 0) * S, subZ + 2.4 * S, 1.7 * S, FONT.italic, 'left', 'alphabetic', 500);
    });
    if (title.by) item(X(title.byBeat ?? 8) - 40 * S, X(title.byBeat ?? 8) + S, (ctx) => text(ctx, title.by, X(title.byBeat ?? 8), tz + 2.6 * S, 1.6 * S, FONT.serif, 'right', 'alphabetic', 600));
    L.zTop = tz - L.title.size - 2 * S;
  } else L.zTop = -4 * S;
  L.zBot += 6 * S;
  L.xStart = xSys - 30 * S;
  return L;
}

function head(ctx, x, z, open, whole, S) {
  ctx.save(); ctx.translate(x, z);
  if (whole) { ctx.beginPath(); ctx.ellipse(0, 0, 0.78 * S, 0.5 * S, 0, 0, 7); ctx.ellipse(0, 0, 0.32 * S, 0.42 * S, -0.9, 0, 7, true); ctx.fill('evenodd'); ctx.restore(); return; }
  ctx.rotate(-0.35);
  ctx.beginPath(); ctx.ellipse(0, 0, 0.66 * S, 0.45 * S, 0, 0, 7);
  if (open) { ctx.ellipse(0, 0, 0.52 * S, 0.2 * S, 0, 0, 7, true); ctx.fill('evenodd'); } else ctx.fill();
  ctx.restore();
}
function flag(ctx, sx, z, up, S) {
  const d = up ? 1 : -1;
  ctx.beginPath(); ctx.moveTo(sx, z);
  ctx.bezierCurveTo(sx + 0.15 * S, z + d * 1.1 * S, sx + 1.4 * S, z + d * 1.4 * S, sx + 1.0 * S, z + d * 3.0 * S);
  ctx.bezierCurveTo(sx + 1.1 * S, z + d * 1.9 * S, sx + 0.4 * S, z + d * 1.5 * S, sx, z + d * 1.3 * S);
  ctx.closePath(); ctx.fill();
}
function tie(ctx, xa, xb, z, dn, S) {
  const xm = (xa + xb) / 2, h = Math.min(1.3 * S, 0.15 * (xb - xa) + 0.4 * S);
  ctx.beginPath(); ctx.moveTo(xa, z);
  ctx.quadraticCurveTo(xm, z + dn * h * 1.25, xb, z);
  ctx.quadraticCurveTo(xm, z + dn * h * 0.85, xa, z); ctx.fill();
}
function rest(ctx, base, x, st, shift, dots) {
  const S = (st.bot - st.top) / 4, m = st.mid + shift;
  if (base >= 4 - EPS) ctx.fillRect(x - 0.65 * S, st.top + S + shift, 1.3 * S, 0.55 * S);
  else if (base >= 2 - EPS) ctx.fillRect(x - 0.65 * S, m - 0.55 * S, 1.3 * S, 0.55 * S);
  else if (base >= 1 - EPS) glyph(ctx, '\u{1D13D}', x - 0.55 * S, m - 1.5 * S, 3.0 * S);
  else if (base >= 0.5 - EPS) glyph(ctx, '\u{1D13E}', x - 0.55 * S, m - 1.0 * S, 2.0 * S);
  else if (base >= 0.25 - EPS) glyph(ctx, '\u{1D13F}', x - 0.65 * S, m - 1.0 * S, 3.0 * S);
  else glyph(ctx, '\u{1D140}', x - 0.75 * S, m - 2.0 * S, 4.0 * S);
  if (dots) { ctx.beginPath(); ctx.arc(x + 1.0 * S, m - 0.5 * S, 0.2 * S, 0, 7); ctx.fill(); }
}

// draw one tile [x0, x1] × [L.zTop, L.zBot] at k px per world unit into a 2D context
export function drawTile(ctx, L, x0, x1, k, look) {
  const S = L.S, W = Math.round((x1 - x0) * k), H = Math.round((L.zBot - L.zTop) * k);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = look.paper; ctx.fillRect(0, 0, W, H);
  const items = L.items.filter((it) => it.x1 >= x0 && it.x0 <= x1);
  const pass = (c, color) => {
    c.save(); Object.assign(c, { k, x0, z0: L.zTop, ox: 0, oz: 0 });
    c.setTransform(k, 0, 0, k, -x0 * k, -L.zTop * k);
    c.fillStyle = color; c.strokeStyle = color;
    const xa = Math.max(x0 - 1, L.xSys), xb = Math.min(x1 + 1, L.xEnd);
    if (xb > xa) for (const st of L.staffs) for (let i = 0; i < 5; i++) c.fillRect(xa, st.top + i * S - 0.05 * S, xb - xa, 0.1 * S);
    for (const it of items) it.f(c);
    c.restore();
  };
  // ink once into a mask, then composite: soft highlight, blurred shadow, ink (two blurs a tile, not one per mark)
  const mk = () => { const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H }); return [c, c.getContext('2d')]; };
  const [maskC, mask] = mk();
  pass.call(null, mask, '#000');
  const tint = (color) => { const [c, x] = mk(); x.drawImage(maskC, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, W, H); return c; };
  const r = look.relief ?? 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (r > 0) {
    ctx.save(); ctx.globalAlpha = 0.32 * r; ctx.filter = 'blur(0.6px)'; ctx.drawImage(tint('#fff'), -0.05 * S * k, -0.07 * S * k); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.5 * r; ctx.filter = `blur(${Math.max(1, 0.14 * S * k).toFixed(1)}px)`; ctx.drawImage(tint('#000'), 0.09 * S * k, 0.16 * S * k); ctx.restore();
  }
  ctx.drawImage(tint(look.ink), 0, 0);
  return { W, H };
}
