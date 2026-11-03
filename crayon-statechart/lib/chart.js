// crayon-statechart · chart.js — the statechart: states (torn-ticket boxes), initial/final dots, orthogonal transitions with
// rounded corners, guard + action labels, compound/parallel containers, regions, dashed dividers, chapter headings, notes.
// Geometry (layout) is computed once from the element's options and a measuring context; drawing takes a reveal k (0..1).
import { C, ink, hatch, shape, text, measure, ticketPts, roundRectPts, ellipsePts, clamp, easeOut, smooth, back, hash } from './sketch.js';

export const T = {
  label: { size: 22 }, tag: { size: 12.5, italic: true, color: C.red },
  edge: { size: 16, italic: true, color: C.ink, lh: 1.2 }, guard: { size: 16, italic: true, color: C.red, lh: 1.2 },
  kicker: { size: 15, color: C.navy }, title: { size: 68, bold: true, color: C.navy, lh: 1.05 },
  sub: { size: 20, italic: true, color: C.ink }, subtag: { size: 14, italic: true, color: C.red },
  region: { size: 22, bold: true, color: C.navy }, group: { size: 19, italic: true, color: C.ink },
  note: { size: 13, color: C.navy, lh: 1.25 },
};
const DOT = 6.5, R_CORNER = 14;

// ── layout ──
export function layout(el, g) {
  if (el.kind === 'state') {
    const lw = measure(g, el.label, T.label).w, tw = el.tag ? measure(g, el.tag, T.tag).w : 0;
    el.w = el.w || Math.max(el.minW ?? 150, lw + 40, (tw + 9 + 12) * 2); el.h = el.h || (el.tag ? 64 : 50);
    el.box = [el.x - el.w / 2, el.y, el.x + el.w / 2, el.y + el.h];
  } else if (el.kind === 'init' || el.kind === 'final') {
    const r = el.kind === 'init' ? 11 : 13; el.r = r; el.box = [el.x - r, el.y - r, el.x + r, el.y + r];
  } else if (el.kind === 'group' || el.kind === 'region') {
    el.box = [el.x, el.y, el.x + el.w, el.y + el.h];
  } else if (el.kind === 'divider') {
    el.box = el.x1 != null ? [Math.min(el.x, el.x1), el.y - 2, Math.max(el.x, el.x1), el.y + 2] : [el.x - 2, el.y, el.x + 2, el.y + el.h];
  } else if (el.kind === 'chapter') {
    const rows = [['kicker', 0], ['title', 22], ['sub', 22 + 78], ['tag', 22 + 78 + 30]].filter(([k]) => el[k]);
    el.rows = rows; let w = 0, h = 0;
    for (const [k, dy] of rows) { const m = measure(g, el[k], T[k === 'tag' ? 'subtag' : k]); w = Math.max(w, m.w); h = Math.max(h, dy + m.h); }
    el.box = [el.x, el.y, el.x + w, el.y + h];
  } else if (el.kind === 'note') {
    const m = measure(g, el.text, { ...T.note, ...el.style }), a = el.align || 'left', x0 = a === 'center' ? el.x - m.w / 2 : a === 'right' ? el.x - m.w : el.x;
    el.box = [x0, el.y, x0 + m.w, el.y + m.h];
  }
  return el;
}

function port(el, side, f = 0) {
  const [x0, y0, x1, y1] = el.box, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  if (el.kind === 'init' || el.kind === 'final') { const r = el.r; return { t: [el.x, el.y - r], b: [el.x, el.y + r], l: [el.x - r, el.y], r: [el.x + r, el.y] }[side]; }
  const hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
  return { t: [cx + f * hw, y0], b: [cx + f * hw, el.kind === 'state' ? y1 - 2 : y1], l: [x0, cy + f * hh], r: [x1, cy + f * hh] }[side];
}
const NORM = { t: [0, -1], b: [0, 1], l: [-1, 0], r: [1, 0] };

/** orthogonal route between two elements → { pts (with rounded corners), raw (corner points), segs } */
export function route(e, A, B) {
  if (A === B) { // self-loop on the right side
    const [, y0, x1, y1] = A.box, h = y1 - y0, P0 = [x1, y0 + h * .3], P1 = [x1, y0 + h * .74], ox = x1 + (e.out || 26);
    e.raw = [P0, [ox, P0[1]], [ox, P1[1]], P1]; e.dot = false;
  } else {
    const below = B.box[1] >= A.box[3] - 4, above = B.box[3] <= A.box[1] + 4;
    let ex = e.exit, en = e.enter;
    if (!ex || !en) {
      if (below) { ex = ex || 'b'; en = en || 't'; }
      else if (above) { ex = ex || 'r'; en = en || 'r'; }
      else if ((B.box[0] + B.box[2]) > (A.box[0] + A.box[2])) { ex = ex || 'r'; en = en || 'l'; }
      else { ex = ex || 'l'; en = en || 'r'; }
    }
    const P0 = port(A, ex, e.ex || 0), P1 = port(B, en, e.en || 0), d0 = NORM[ex], d1 = NORM[en];
    if (B.kind === 'state' && en === 't' && !e.noDot) B._dot = true; // the entry dot sits at the top centre
    e.dot = B._dot && en === 't' && Math.abs(e.en || 0) < .05;
    if (e.via) e.raw = [P0, ...e.via, P1];
    else {
      const v0 = !d0[0], v1 = !d1[0];
      if (v0 && v1) {
        if (d0[1] === -d1[1] || d0[1] === 1 && d1[1] === -1) {
          if (Math.abs(P0[0] - P1[0]) < 2) e.raw = [P0, [P0[0], P1[1]]];
          else { const my = e.midY ?? (P0[1] + P1[1]) / 2; e.raw = [P0, [P0[0], my], [P1[0], my], P1]; }
        } else { const oy = d0[1] > 0 ? Math.max(A.box[3], B.box[3]) + (e.out || 30) : Math.min(A.box[1], B.box[1]) - (e.out || 30); e.raw = [P0, [P0[0], oy], [P1[0], oy], P1]; }
      } else if (!v0 && !v1) {
        if (d0[0] === d1[0]) { const ox = d0[0] > 0 ? Math.max(A.box[2], B.box[2]) + (e.out || 34) : Math.min(A.box[0], B.box[0]) - (e.out || 34); e.raw = [P0, [ox, P0[1]], [ox, P1[1]], P1]; }
        else if (Math.abs(P0[1] - P1[1]) < 2) e.raw = [P0, [P1[0], P0[1]]];
        else { const mx = e.midX ?? (P0[0] + P1[0]) / 2; e.raw = [P0, [mx, P0[1]], [mx, P1[1]], P1]; }
      } else if (v0) e.raw = [P0, [P0[0], P1[1]], P1];
      else e.raw = [P0, [P1[0], P0[1]], P1];
    }
    // stop at the entry dot (above it) or the box edge
    const last = e.raw[e.raw.length - 1];
    if (e.dot) e.raw[e.raw.length - 1] = [last[0], last[1] - DOT * 2];
    else if (B.kind === 'init' || B.kind === 'final') { /* ports already on the circle */ }
  }
  e.raw = e.raw.filter((p, i, a) => !i || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > .5);
  e.segs = [];
  for (let i = 1; i < e.raw.length; i++) e.segs.push([e.raw[i - 1], e.raw[i]]);
  e.pts = rounded(e.raw, e.r || R_CORNER);
  return e;
}
function rounded(raw, R) {
  if (raw.length < 3) return raw;
  const out = [raw[0]];
  for (let i = 1; i < raw.length - 1; i++) {
    const [ax, ay] = raw[i - 1], [bx, by] = raw[i], [cx, cy] = raw[i + 1];
    const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by), r = Math.min(R, l1 / 2, l2 / 2);
    const p = [bx - (bx - ax) / l1 * r, by - (by - ay) / l1 * r], q = [bx + (cx - bx) / l2 * r, by + (cy - by) / l2 * r];
    for (let j = 0; j <= 6; j++) { const u = j / 6, m = 1 - u; out.push([m * m * p[0] + 2 * m * u * bx + u * u * q[0], m * m * p[1] + 2 * m * u * by + u * u * q[1]]); }
  }
  out.push(raw[raw.length - 1]); return out;
}

/** where an edge's guard + action text sit → { lines, x, y, align, box } */
export function labelOf(e, g, self) {
  const lines = [];
  if (e.guard) lines.push(...String(e.guard).split('\n').map((s, i, a) => ({ s: (i ? '' : '[') + s + (i === a.length - 1 ? ']' : ''), o: T.guard })));
  if (e.text) lines.push(...String(e.text).split('\n').map(s => ({ s, o: T.edge })));
  if (!lines.length) return null;
  const lh = T.edge.size * T.edge.lh, w = Math.max(...lines.map(l => measure(g, l.s, l.o).w)), h = lines.length * lh;
  let x, y, align = e.lalign || 'left';
  if (e.lx != null) { x = e.lx; y = e.ly; }
  else if (self) { x = e.raw[1][0] + 12; y = (e.raw[1][1] + e.raw[2][1]) / 2 - h / 2; }
  else {
    const segs = e.segs.map(([a, b]) => ({ a, b, v: Math.abs(a[0] - b[0]) < 1, L: Math.hypot(b[0] - a[0], b[1] - a[1]) }));
    const zig = segs.length === 3 && segs[0].v && !segs[1].v && segs[2].v;
    const left = e.side === 'l';
    if (zig && e.guard && !e.text) { const p = guardPart(segs[1], lines, w, lh); return { parts: [p], box: p.box, lh }; }
    else if (zig && e.guard) {
      // guard over the horizontal run, the action text beside the last vertical run
      const s = segs[1], v = segs[2], gx = (s.a[0] + s.b[0]) / 2;
      const gl = lines.filter(l => l.o === T.guard), tl = lines.filter(l => l.o !== T.guard);
      const gw = Math.max(...gl.map(l => measure(g, l.s, l.o).w)), tw = Math.max(...tl.map(l => measure(g, l.s, l.o).w));
      const parts = [
        guardPart(s, gl, gw, lh),
        { lines: tl, x: left ? v.a[0] - 12 : v.a[0] + 12, y: (v.a[1] + v.b[1]) / 2 - tl.length * lh / 2, align: left ? 'right' : 'left' },
      ];
      const p = parts[1]; p.box = p.align === 'right' ? [p.x - tw, p.y, p.x, p.y + tl.length * lh] : [p.x, p.y, p.x + tw, p.y + tl.length * lh];
      return { parts, box: union(parts[0].box, parts[1].box), lh };
    } else {
      const s = segs.reduce((m, s) => s.L > m.L ? s : m, segs[0]);
      if (s.v) { x = left ? s.a[0] - 12 : s.a[0] + 12; align = left ? 'right' : 'left'; y = (s.a[1] + s.b[1]) / 2 - h / 2; }
      else { x = (s.a[0] + s.b[0]) / 2; y = s.a[1] - h - 6; align = 'center'; }
    }
  }
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const part = { lines, x, y, align, box: [x0, y, x0 + w, y + h] };
  return { parts: [part], box: part.box, lh };
}
// a guard sits just above the horizontal run of a split, on the far side of the vertical it leaves from (as in a hand-drawn
// chart: "[by hand]" to the left of a branch going left, "[by machine]" to the right of one going right)
function guardPart(s, lines, w, lh) {
  const dir = Math.sign(s.b[0] - s.a[0]) || 1, y = s.a[1] - lines.length * lh - 5, x = s.a[0] + dir * 10;
  const box = dir > 0 ? [x, y, x + w, y + lines.length * lh] : [x - w, y, x, y + lines.length * lh];
  return { lines, x, y, align: dir > 0 ? 'left' : 'right', box };
}
const union = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];

// ── drawing ──
const sprites = new Map();
function sprite(key, w, h, sc, paint) {
  let c = sprites.get(key); if (c) return c;
  c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(Math.ceil(w * sc), Math.ceil(h * sc)) : Object.assign(document.createElement('canvas'), { width: Math.ceil(w * sc), height: Math.ceil(h * sc) });
  const g = c.getContext('2d'); g.scale(sc, sc); paint(g); sprites.set(key, c); return c;
}

function paintState(g, el, active, ox, oy) {
  const s = hash(el.id), w = el.w, h = el.h, x = ox, y = oy;
  const pts = ticketPts(x, y, w, h, 4.5, 9), sh = ticketPts(x + 5, y + 5, w, h, 4.5, 9);
  hatch(g, sh, { color: C.ink, gap: 2.4, a: .75, w: 1.2, seed: s + 1, angle: -.8 });
  hatch(g, pts, active ? { color: C.pinkHatch, base: C.pink, baseA: .95, gap: 3.2, a: .55, seed: s } : { color: C.creamHatch, base: C.cream, baseA: .95, gap: 3.4, a: .5, seed: s });
  ink(g, pts, { closed: true, w: 2.3, seed: s + 2 });
  if (active) ink(g, ticketPts(x - 5, y - 5, w + 10, h + 10, 4.5, 9), { closed: true, w: 1.7, color: C.red, seed: s + 9, amp: 1.4 });
  let ly = y + (h - T.label.size * 1.05) / 2 - 1;
  if (el.tag) {
    text(g, el.tag, x + 9, y + 4, T.tag);
    ink(g, [[x + 6, y + 22], [x + w - 6, y + 22]], { w: 1, color: C.red, seed: s + 4, amp: .6, alpha: .8 });
    ly = y + 29;
  }
  text(g, el.label, x + w / 2, ly, { ...T.label, align: 'center' });
}

export function drawState(ctx, el, k, st, sc) {
  if (k <= 0) return;
  const active = st.active.has(el.id), pad = 14;
  const key = `${el.id}|${active ? 1 : 0}|${sc}`;
  const spr = sprite(key, el.w + pad * 2, el.h + pad * 2, sc, g => paintState(g, el, active, pad, pad));
  const [x0, y0] = el.box, u = easeOut(k);
  ctx.save();
  if (k < 1) {
    const cx = el.x, cy = y0 + el.h / 2, s = .9 + .1 * back(k);
    ctx.globalAlpha *= clamp(k * 2.2); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
    ctx.beginPath(); ctx.rect(x0 - pad, y0 - pad, (el.w + pad * 2) * clamp(u * 1.25), el.h + pad * 2); ctx.clip();
  }
  if (active && st.pop != null && st.pop < 1) { // the red frame pops when the state becomes active
    const cx = el.x, cy = y0 + el.h / 2, s = 1 + .05 * Math.sin(Math.PI * clamp(st.pop));
    ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
  }
  ctx.drawImage(spr, x0 - pad, y0 - pad, el.w + pad * 2, el.h + pad * 2);
  ctx.restore();
}

export function drawDot(ctx, el, k, st) {
  if (k <= 0 || !el._dot) return;
  const x = el.x, y = el.box[1];
  const fill = st.active.has(el.id) ? C.red : st.visited.has(el.id) ? C.yellow : C.ink;
  ctx.save(); ctx.globalAlpha *= clamp(k * 2);
  const r = DOT * (k < 1 ? back(k) : 1), s = hash(el.id + 'dot');
  shape(ctx, ellipsePts(x, y, r, r, 18), { fill, base: fill, baseA: fill === C.ink ? .5 : .9, gap: 2.2, a: .7, w: 1.8, seed: s });
  ctx.restore();
}

export function drawInit(ctx, el, k) {
  if (k <= 0) return;
  const s = hash(el.id), u = back(k), { x, y } = el;
  ctx.save(); ctx.globalAlpha *= clamp(k * 2);
  if (el.kind === 'init') {
    ink(ctx, ellipsePts(x, y, 11 * u, 11 * u, 24), { closed: true, w: 2.2, seed: s });
    shape(ctx, ellipsePts(x, y, 6.5 * u, 6.5 * u, 18), { fill: C.red, base: C.red, baseA: .9, gap: 2, a: .8, w: 1.6, seed: s + 1 });
  } else {
    ink(ctx, ellipsePts(x, y, 13 * u, 13 * u, 26), { closed: true, w: 2.2, seed: s });
    shape(ctx, ellipsePts(x, y, 7.5 * u, 7.5 * u, 20), { fill: C.ink, base: C.ink, baseA: .8, gap: 2, a: .8, w: 1.6, seed: s + 1 });
  }
  ctx.restore();
}

export function drawEdge(ctx, e, k, g) {
  if (k <= 0) return;
  const s = hash(e.id), kl = clamp(k / .8);
  ink(ctx, e.pts, { w: 2.1, seed: s, k: kl, amp: .8 });
  if (kl >= 1) { // arrowhead
    const n = e.pts.length, [bx, by] = e.pts[n - 1], [ax, ay] = e.pts[n - 2], L = Math.hypot(bx - ax, by - ay) || 1, dx = (bx - ax) / L, dy = (by - ay) / L, a = 10, b = 5.5;
    ctx.save(); ctx.globalAlpha *= clamp((k - .8) / .1 + .3);
    const head = [[bx, by], [bx - dx * a - dy * b, by - dy * a + dx * b], [bx - dx * a * .72, by - dy * a * .72], [bx - dx * a + dy * b, by - dy * a - dx * b]];
    ctx.fillStyle = C.ink; ctx.beginPath(); head.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  if (e.lab) {
    const kt = clamp((k - .35) / .65);
    for (const p of e.lab.parts) p.lines.forEach((l, i) => text(ctx, l.s, p.x, p.y + i * e.lab.lh, { ...l.o, align: p.align, k: kt }));
  }
}

export function drawGroup(ctx, el, k) {
  if (k <= 0) return;
  const s = hash(el.id), [x0, y0, x1, y1] = el.box, pts = roundRectPts(x0, y0, x1 - x0, y1 - y0, el.kind === 'region' ? 8 : 12);
  ctx.save();
  if (el.kind === 'region' || el.tint) {
    const tint = { sky: [C.sky, C.skyHatch], blush: [C.blush, C.blushHatch], cream: [C.cream, C.creamHatch], mint: ['#e2f3e8', '#a9d9bb'], paper: [C.paper, '#d9cfb8'] }[el.tint || 'sky'];
    ctx.globalAlpha *= smooth((k - .3) / .7);
    hatch(ctx, pts, { color: tint[1], base: tint[0], baseA: .9, gap: 3.6, a: .38, seed: s, angle: -1.05 });
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ink(ctx, pts, { closed: true, w: el.kind === 'region' ? 1.8 : 2.4, seed: s + 1, k: clamp(k / .7), amp: 1.2 });
  const kt = clamp((k - .4) / .6);
  if (el.title) {
    const o = el.kind === 'region' ? T.region : T.group, hy = el.kind === 'region' ? 44 : 40;
    text(ctx, el.title, (x0 + x1) / 2, y0 + (hy - o.size) / 2 - 1, { ...o, align: 'center', k: kt });
    ink(ctx, [[x0 + 2, y0 + hy], [x1 - 2, y0 + hy]], { w: el.kind === 'region' ? 1.3 : 1.8, seed: s + 2, k: kt, amp: .7 });
  }
}

export function drawDivider(ctx, el, k) {
  if (k <= 0) return;
  const s = hash(el.id), horiz = el.x1 != null, L = horiz ? Math.abs(el.x1 - el.x) : el.h, dash = 11, gap = 8;
  for (let d = 0; d < L * clamp(k); d += dash + gap) {
    const a = d, b = Math.min(d + dash, L * clamp(k));
    const p = horiz ? [[el.x + a, el.y], [el.x + b, el.y]] : [[el.x, el.y + a], [el.x, el.y + b]];
    ink(ctx, p, { w: 1.8, seed: s + d, amp: .4 });
  }
}

export function drawChapter(ctx, el, k) {
  if (k <= 0) return;
  const n = el.rows.length;
  el.rows.forEach(([key, dy], i) => {
    const kk = clamp(k * n - i * .8);
    text(ctx, el[key], el.x, el.y + dy, { ...T[key === 'tag' ? 'subtag' : key], k: key === 'title' ? kk : kk * 1.4 });
  });
}

export function drawNote(ctx, el, k) {
  if (k <= 0) return;
  text(ctx, el.text, el.x, el.y, { ...T.note, ...el.style, align: el.align || 'left', k: k * 1.3 });
}
