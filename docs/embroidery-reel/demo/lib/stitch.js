// embroidery-reel · stitch.js — a design (shapes in design units) → embroidery.
// Every shape becomes real stitches (segments in the order a machine would sew them), and the stitches are painted into
// three maps: colour (thread with its dark gaps and a sheen line), normal + order (RGB = the raised thread, A = when
// that stitch is sewn, 0..1), and the transfer guide (the pencil lines on the cloth before a stitch goes in).
// Nothing here knows about three.js; reel.js turns the maps into textures and the order into the reveal.

export const FONT = {
  title: '"EmbTitle", "EmbTitleKR"',
  sans: '"EmbSans", "EmbSansKR"',
  bold: '"EmbBold", "EmbSansKR"',
  mono: '"EmbMono", "EmbSansKR"',
  serif: '"EmbSerif", "EmbSansKR"',
  italic: '"EmbItalic", "EmbSansKR"',
};

// ── small helpers ──────────────────────────────────────────────────────────────────────────────────────────────────
export function rng(seed = 1) {
  let a = seed >>> 0 || 1;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function rgb(hex) {
  const h = String(hex).replace('#', ''), f = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
}
export const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const shade = (c, k) => c.map(v => k >= 0 ? v + (255 - v) * k : v * (1 + k));
export const lum = c => { const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
export const contrast = (a, b) => { const la = lum(rgb(a)), lb = lum(rgb(b)); return (Math.max(la, lb) + .05) / (Math.min(la, lb) + .05); };

// ── shapes → rings (design units) ─────────────────────────────────────────────────────────────────────────────────
function rot(pts, deg, cx, cy) {
  if (!deg) return pts; const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
}
function roundRect(x, y, w, h, r) {
  r = Math.min(r || 0, w / 2, h / 2); if (r <= 0) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const p = [], arc = (cx, cy, a0) => { for (let i = 0; i <= 8; i++) { const a = a0 + i / 8 * Math.PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
  return p;
}
function ellipse(cx, cy, rx, ry, n = 72) { return Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; }); }

// SVG path data (M L H V C S Q T Z, absolute and relative; no arcs — use circle / ellipse shapes) → [{ pts, closed }]
export function parsePath(d) {
  const tok = String(d).match(/[MLHVCSQTZmlhvcsqtz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
  const out = []; let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cur = null, lcx = 0, lcy = 0, lq = null;
  const num = () => +tok[i++], start = () => { cur = { pts: [[x, y]], closed: false }; out.push(cur); };
  const bez = (pts, n = 14) => { for (let k = 1; k <= n; k++) { const t = k / n; if (pts.length === 3) { const [a, b, c] = pts, u = 1 - t; cur.pts.push([u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]); } else { const [a, b, c, e] = pts, u = 1 - t; cur.pts.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * e[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * e[1]]); } } };
  while (i < tok.length) {
    if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'Z') { if (cur) { cur.closed = true; x = sx; y = sy; } cur = null; continue; }
    if (C === 'M') { x = ox + num(); y = oy + num(); sx = x; sy = y; start(); cmd = rel ? 'l' : 'L'; continue; }
    if (!cur) start();
    if (C === 'L') { x = ox + num(); y = oy + num(); cur.pts.push([x, y]); }
    else if (C === 'H') { x = ox + num(); cur.pts.push([x, y]); }
    else if (C === 'V') { y = oy + num(); cur.pts.push([x, y]); }
    else if (C === 'C' || C === 'S') {
      const p0 = [x, y]; let c1;
      if (C === 'C') c1 = [ox + num(), oy + num()]; else c1 = [2 * x - lcx, 2 * y - lcy];
      const c2 = [ox + num(), oy + num()], e = [ox + num(), oy + num()];
      bez([p0, c1, c2, e]); lcx = c2[0]; lcy = c2[1]; x = e[0]; y = e[1]; continue;
    } else if (C === 'Q' || C === 'T') {
      const p0 = [x, y], c = C === 'Q' ? [ox + num(), oy + num()] : (lq ? [2 * x - lq[0], 2 * y - lq[1]] : [x, y]), e = [ox + num(), oy + num()];
      bez([p0, c, e]); lq = c; x = e[0]; y = e[1]; continue;
    } else { i++; }
    lcx = x; lcy = y; lq = null;
  }
  return out.filter(r => r.pts.length > 1);
}

// rings of a shape in design units: [{ pts, closed }] (text and run lines have none)
export function ringsOf(s) {
  if (s.rect) { const [x, y, w, h] = s.rect; return [{ pts: rot(roundRect(x, y, w, h, s.r), s.rot, x + w / 2, y + h / 2), closed: true }]; }
  if (s.circle) { const [cx, cy, r] = s.circle; return [{ pts: ellipse(cx, cy, r, r), closed: true }]; }
  if (s.ellipse) { const [cx, cy, rx, ry] = s.ellipse; return [{ pts: rot(ellipse(cx, cy, rx, ry), s.rot, cx, cy), closed: true }]; }
  if (s.poly) { const c = s.poly.reduce((a, p) => [a[0] + p[0] / s.poly.length, a[1] + p[1] / s.poly.length], [0, 0]); return [{ pts: rot(s.poly, s.rot, c[0], c[1]), closed: true }]; }
  if (s.path) return parsePath(s.path);
  if (s.line) return [{ pts: s.line, closed: !!s.closed }];
  if (s.run) return [{ pts: s.run, closed: !!s.closed }];
  return [];
}
export function shapeKind(s) { return s.text != null ? 'text' : s.line ? 'line' : s.run ? 'run' : 'fill'; }

// ── stitches ──────────────────────────────────────────────────────────────────────────────────────────────────────
// A stitch: { ax, ay, bx, by, c (colour index), L (layer) } in texture px.
function fillStitches(mask, W, H, box, angle, sp, len, satinMax, ci, L, out, rowStart) {
  // rows advance left → right (or top → bottom for horizontal rows), the way a hand reads the design
  let a = angle * Math.PI / 180; if (-Math.sin(a) < -1e-3 || (Math.abs(Math.sin(a)) <= 1e-3 && Math.cos(a) < 0)) a += Math.PI;
  const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  let vmin = Infinity, vmax = -Infinity, smin = Infinity, smax = -Infinity;
  for (const [x, y] of [[box[0], box[1]], [box[2], box[1]], [box[0], box[3]], [box[2], box[3]]]) {
    const v = x * vx + y * vy, s = x * ux + y * uy; vmin = Math.min(vmin, v); vmax = Math.max(vmax, v); smin = Math.min(smin, s); smax = Math.max(smax, s);
  }
  let row = rowStart;
  for (let v = vmin + sp * .5; v < vmax; v += sp, row++) {
    const spans = []; let inside = false, s0 = 0;
    for (let s = smin - 1; s <= smax + 1; s += 1) {
      const x = s * ux + v * vx, y = s * uy + v * vy, xi = x | 0, yi = y | 0;
      const m = xi >= 0 && yi >= 0 && xi < W && yi < H && mask[yi * W + xi] > 110;
      if (m && !inside) { inside = true; s0 = s; } else if (!m && inside) { inside = false; spans.push([s0, s - 1]); }
    }
    if (inside) spans.push([s0, smax]);
    const pieces = [];
    for (const [p, q] of spans) {
      const span = q - p; if (span < sp * .5) continue;
      if (span <= satinMax) { pieces.push([p, q]); continue; }
      const off = ((row * 2) % 3) / 3 * len, cuts = [p];
      for (let k = Math.ceil((p + off) / len) * len - off; k < q - len * .35; k += len) if (k > p + len * .35) cuts.push(k);
      cuts.push(q); for (let k = 0; k < cuts.length - 1; k++) pieces.push([cuts[k], cuts[k + 1]]);
    }
    if (row % 2) pieces.reverse();
    for (const [p, q] of pieces) {
      const [s1, s2] = row % 2 ? [q, p] : [p, q];
      out.push({ ax: s1 * ux + v * vx, ay: s1 * uy + v * vy, bx: s2 * ux + v * vx, by: s2 * uy + v * vy, c: ci, L });
    }
  }
  return row;
}
function resample(pts, closed, step) {
  const P = closed ? [...pts, pts[0]] : pts, seg = []; let total = 0;
  for (let i = 0; i < P.length - 1; i++) { const l = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); seg.push(l); total += l; }
  const at = d => { let i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; } const k = seg[i] ? Math.min(1, d / seg[i]) : 0; return [P[i][0] + (P[i + 1][0] - P[i][0]) * k, P[i][1] + (P[i + 1][1] - P[i][1]) * k]; };
  const n = Math.max(2, Math.round(total / step)), res = [];
  for (let k = 0; k <= n; k++) { if (closed && k === n) break; res.push(at(total * k / n)); }
  return { res, total };
}
function satinStitches(pts, closed, width, sp, ci, L, out) {
  const { res } = resample(pts, closed, sp * .85), n = res.length;
  for (let k = 0; k < n; k++) {
    const p = res[k], a = res[closed ? (k - 2 + n) % n : Math.max(0, k - 2)], b = res[closed ? (k + 2) % n : Math.min(n - 1, k + 2)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const nx = -ty, ny = tx, h = width / 2, sl = sp * .55;
    out.push({ ax: p[0] - nx * h - tx * sl, ay: p[1] - ny * h - ty * sl, bx: p[0] + nx * h + tx * sl, by: p[1] + ny * h + ty * sl, c: ci, L });
  }
}
function runStitches(pts, closed, sp, len, ci, L, out) {
  const { res } = resample(pts, closed, 1), n = res.length; let k = 0;
  while (k < n - 1) { const e = Math.min(n - 1, k + Math.round(len)); out.push({ ax: res[k][0], ay: res[k][1], bx: res[e][0], by: res[e][1], c: ci, L, run: true }); k = e + Math.round(len * .55); }
}

// ── the element ───────────────────────────────────────────────────────────────────────────────────────────────────
// design = { w, h (design units), shapes: [...], seed }
// o = { px (texture px per design unit), thread (thread width in design units), len, satinMax, guide: '#hex' }
export function embroider(design, o = {}) {
  const pxu = o.px || 10, W = Math.ceil(design.w * pxu), H = Math.ceil(design.h * pxu);
  const sp = Math.max(1.6, (o.thread || .6) * pxu), len = (o.len || 3.6) * pxu, satinMax = (o.satinMax || 8) * pxu;
  const R = rng(design.seed || 7), mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const maskC = mk(), mx = maskC.getContext('2d', { willReadFrequently: true });
  const guideC = document.createElement('canvas'); guideC.width = Math.ceil(W / 2); guideC.height = Math.ceil(H / 2);
  const gx = guideC.getContext('2d'); gx.scale(.5, .5); gx.strokeStyle = o.guide || 'rgba(60,80,130,.55)'; gx.lineWidth = Math.max(2.2, sp * .45); gx.lineJoin = 'round';
  const palette = [], pal = hex => { const k = palette.indexOf(hex); if (k > -1) return k; palette.push(hex); return palette.length - 1; };
  const stitches = [], layers = [];
  let row = 0;
  const toPx = pts => pts.map(([x, y]) => [x * pxu, y * pxu]);
  design.shapes.forEach((s, L) => {
    const kind = shapeKind(s), col = s.fill || s.color || '#222222', ci = pal(col), first = stitches.length;
    if (kind === 'fill' || kind === 'text') {
      mx.setTransform(1, 0, 0, 1, 0, 0); mx.clearRect(0, 0, W, H); mx.fillStyle = '#fff';
      let box;
      if (kind === 'text') {
        const size = (s.size || 12) * pxu, font = `${s.weight || 400} ${size}px ${FONT[s.font || 'title'] || s.font}`;
        mx.font = font; mx.textAlign = s.align || 'center'; mx.textBaseline = 'alphabetic';
        const [tx, ty] = s.at || [design.w / 2, design.h / 2];
        mx.save(); mx.translate(tx * pxu, ty * pxu); if (s.rot) mx.rotate(s.rot * Math.PI / 180); mx.fillText(String(s.text), 0, 0); mx.restore();
        gx.font = font; gx.textAlign = mx.textAlign; gx.textBaseline = 'alphabetic';
        gx.save(); gx.translate(tx * pxu, ty * pxu); if (s.rot) gx.rotate(s.rot * Math.PI / 180); gx.strokeText(String(s.text), 0, 0); gx.restore();
        box = [0, 0, W, H];
      } else {
        const rings = ringsOf(s); const p = new Path2D(); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const r of rings) { const q = toPx(r.pts); q.forEach(([x, y], k) => { k ? p.lineTo(x, y) : p.moveTo(x, y); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }); p.closePath(); }
        mx.fill(p, 'evenodd'); gx.stroke(p);
        box = [Math.max(0, x0 - 2), Math.max(0, y0 - 2), Math.min(W, x1 + 2), Math.min(H, y1 + 2)];
      }
      const d = mx.getImageData(0, 0, W, H).data, mask = new Uint8Array(W * H); for (let i = 0; i < mask.length; i++) mask[i] = d[i * 4 + 3];
      const angle = s.angle ?? (kind === 'text' ? 78 : [38, -42, 62, -18, 12][L % 5]);
      row = fillStitches(mask, W, H, box, angle, sp, s.stitch === 'satin' ? 1e9 : len, s.stitch === 'satin' ? 1e9 : satinMax, ci, L, stitches, row);
    } else if (kind === 'line') {
      for (const r of ringsOf(s)) { const q = toPx(r.pts); satinStitches(q, r.closed, (s.width || 1.6) * pxu, sp, ci, L, stitches); gx.beginPath(); q.forEach(([x, y], k) => k ? gx.lineTo(x, y) : gx.moveTo(x, y)); if (r.closed) gx.closePath(); gx.stroke(); }
    } else if (kind === 'run') {
      for (const r of ringsOf(s)) { const q = toPx(r.pts); runStitches(q, r.closed, sp, (s.len || 2.4) * pxu, ci, L, stitches); gx.beginPath(); q.forEach(([x, y], k) => k ? gx.lineTo(x, y) : gx.moveTo(x, y)); if (r.closed) gx.closePath(); gx.stroke(); }
    }
    if (s.outline && kind !== 'text') {
      const oc = pal(s.outline);
      for (const r of ringsOf(s)) satinStitches(toPx(r.pts), r.closed, (s.outlineWidth || 2.2) * pxu, sp, oc, L + .5, stitches);
    }
    layers.push({ first, count: stitches.length - first, color: col, kind });
  });
  const N = stitches.length;

  // ── paint: colour, height (→ normal), order ──
  const colorC = mk(), cx = colorC.getContext('2d'), heightC = mk(), hx = heightC.getContext('2d', { willReadFrequently: true }), orderC = mk(), ox = orderC.getContext('2d', { willReadFrequently: true });
  hx.fillStyle = '#000'; hx.fillRect(0, 0, W, H); ox.fillStyle = '#000'; ox.fillRect(0, 0, W, H);
  for (const c of [cx, hx, ox]) { c.lineCap = 'round'; c.lineJoin = 'round'; }
  const jit = stitches.map(() => (R() * 2 - 1));
  const groups = new Map(); // layer → stitch indices
  stitches.forEach((s, i) => { const k = s.L; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); });
  const keys = [...groups.keys()].sort((a, b) => a - b);
  for (const k of keys) {
    const idx = groups.get(k), lift = Math.min(.25, Math.floor(k) * .03 + (k % 1 ? .08 : 0));
    const byCol = new Map(); for (const i of idx) { const s = stitches[i], q = Math.round((jit[i] + 1) * 1.5), key = s.c * 8 + q; if (!byCol.has(key)) byCol.set(key, []); byCol.get(key).push(i); }
    const pass = (ctx, list, style, width, dx = 0, dy = 0) => {
      ctx.strokeStyle = style; ctx.lineWidth = width; ctx.beginPath();
      for (const i of list) { const s = stitches[i]; ctx.moveTo(s.ax + dx, s.ay + dy); ctx.lineTo(s.bx + dx, s.by + dy); }
      ctx.stroke();
    };
    for (const [key, list] of byCol) { const base = rgb(palette[Math.floor(key / 8)]); pass(cx, list, css(shade(base, -.17)), sp * 1.22); }
    for (const [key, list] of byCol) { const base = rgb(palette[Math.floor(key / 8)]), q = key % 8; pass(cx, list, css(shade(base, (q - 1.5) * .045)), sp * .98); }
    for (const [key, list] of byCol) { const base = rgb(palette[Math.floor(key / 8)]); pass(cx, list, css(shade(base, .3), .45), sp * .4, -sp * .12, -sp * .12); }
    const g = v => `rgb(${v | 0},${v | 0},${v | 0})`;
    pass(hx, idx, g(255 * (.3 + lift)), sp * 1.3); pass(hx, idx, g(255 * (.6 + lift)), sp * .82); pass(hx, idx, g(255 * (.78 + lift)), sp * .38);
    const byOrd = new Map(); for (const i of idx) { const v = 1 + Math.round(254 * (N > 1 ? i / (N - 1) : 1)); if (!byOrd.has(v)) byOrd.set(v, []); byOrd.get(v).push(i); }
    for (const [v, list] of byOrd) pass(ox, list, g(v), sp * 1.3);
  }
  // normals from height, order in alpha; rows flipped so row 0 is the bottom (DataTexture, flipY false)
  const hd = hx.getImageData(0, 0, W, H).data, od = ox.getImageData(0, 0, W, H).data, nd = new Uint8Array(W * H * 4), k = (o.relief || 2.2);
  const h = (x, y) => hd[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let nx = (h(x - 1, y) - h(x + 1, y)) * k, ny = (h(x, y + 1) - h(x, y - 1)) * k; const nz = 1, l = Math.hypot(nx, ny, nz); nx /= l; ny /= l;
    const j = ((H - 1 - y) * W + x) * 4;
    nd[j] = (nx * .5 + .5) * 255; nd[j + 1] = (ny * .5 + .5) * 255; nd[j + 2] = (nz / l * .5 + .5) * 255; nd[j + 3] = od[(y * W + x) * 4];
  }
  // the needle's path: stitch centres in uv, smoothed, sampled at 256 steps of progress
  const front = new Float32Array(257 * 2), colAt = new Uint8Array(257);
  for (let s = 0; s <= 256; s++) {
    if (!N) { front[s * 2] = .5; front[s * 2 + 1] = .5; continue; }
    const c = Math.round(s / 256 * (N - 1)), w = Math.max(2, Math.round(N * .03)); let sx = 0, sy = 0, n = 0;
    for (let i = Math.max(0, c - w); i <= Math.min(N - 1, c + w); i++) { const t = stitches[i]; sx += (t.ax + t.bx) / 2; sy += (t.ay + t.by) / 2; n++; }
    front[s * 2] = sx / n / W; front[s * 2 + 1] = 1 - sy / n / H; colAt[s] = stitches[c].c;
  }
  return { W, H, color: colorC, normal: nd, guide: guideC, N, front, colAt, palette, layers, threadPx: sp };
}
