// pencil-dream-short · draw.js — the Painter: renders parts (knock-outs, graphite lines, coloured-in fills) through a camera,
// with draw-on progress per stroke and the boil (lines shiver a little, `boil` times a second).
//
//   const pt = new Painter(ctx, { paper, spot, lead })
//   pt.view({ x, y, w, r }, W, H, z0)      camera: centre (world), view width (world units), roll (rad); z0 = page zoom
//   pt.boil = frameIndex                    which boil drawing
//   pt.parts(parts, prog)                   prog(opIndex, op) → 0…1 (draw-on); default everything drawn
//
// Line widths are in px at the page zoom and grow a little when the camera is close (× (z/z0)^.28), so a pencil line
// reads like the same pencil from the close-up to the wide shot. Marker and crayon colour multiply onto the paper.
import { TAU, clamp, lerp, n1, hash, rgb, mix, rgba, graphiteTile, makeCanvas, crayonTile } from './pencil.js';

export class Painter {
  constructor(ctx, o = {}) {
    this.ctx = ctx; this.paper = o.paper || '#f1ece1'; this.spot = o.spot || '#e86a2c'; this.lead = o.lead || '#3a3a3e';
    this.boil = 0; this.boilAmp = o.boilAmp ?? .55; this.weight = o.weight ?? 1.3; this.v = { x: 0, y: 0, z: 1, r: 0, W: 1920, H: 1080, z0: 1 };
    this.leadPat = ctx.createPattern(graphiteTile(this.lead, 2), 'repeat');
    this.spotEdge = mix(this.spot, '#000000', .28);
  }
  view(cam, W = 1920, H = 1080, z0 = 1) {
    const z = W / cam.w; this.v = { x: cam.x, y: cam.y, z, r: cam.r || 0, W, H, z0, c: Math.cos(cam.r || 0), s: Math.sin(cam.r || 0) };
    this.wz = Math.pow(z / z0, .28);
  }
  S(p) { if (this.xf) p = this.xf(p); const v = this.v, X = (p[0] - v.x) * v.z, Y = (p[1] - v.y) * v.z; return [v.W / 2 + X * v.c - Y * v.s, v.H / 2 + X * v.s + Y * v.c]; }
  /** world → stage for many points */
  SS(pts) { return pts.map(p => this.S(p)); }
  /** the world position under a stage point */
  W(sp) { const v = this.v, X = sp[0] - v.W / 2, Y = sp[1] - v.H / 2; return [v.x + (X * v.c + Y * v.s) / v.z, v.y + (-X * v.s + Y * v.c) / v.z]; }
  colour(c) { return c === 'spot' ? this.spot : c === 'lead' || !c ? this.lead : c === 'paper' ? this.paper : c; }

  parts(parts, prog = null, o = {}) {
    let i = 0; const alpha = o.alpha ?? 1;
    for (const p of parts) {
      const n = p.ops.length, i0 = i; let done = 0, any = 0;
      if (prog) for (let j = 0; j < n; j++) { const k = prog(i0 + j, p.ops[j]); done += k; if (k > 0) any = 1; } else { done = n; any = 1; }
      if (!any) { i += n; continue; }
      if (p.knock && !o.noKnock) { const ka = clamp((n ? done / n : 1) * 1.6) * alpha; if (ka > 0) this.knock(p.knock, ka); }
      for (let j = 0; j < n; j++) { const k = prog ? prog(i0 + j, p.ops[j]) : 1; if (k > 0) this.op(p.ops[j], k, alpha); }
      i += n;
    }
    return i;
  }
  knock(poly, a = 1) {
    const ctx = this.ctx, s = this.SS(poly); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = this.paper; ctx.beginPath();
    s.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  op(op, k = 1, alpha = 1) { if (op.type === 'line') this.line(op, k, alpha); else if (op.type === 'fill') this.fill(op, k, alpha); }

  /** a pencil (or marker) line, drawn on to fraction k */
  line(op, k = 1, alpha = 1) {
    const ctx = this.ctx, v = this.v;
    let s = this.SS(op.pts); if (s.length < 2) return;
    // boil: a low-frequency shiver along the line, new every boil frame
    const b = this.boil, amp = this.boilAmp * (op.col === 'spot' ? .6 : 1), sx = (hash(op.seed, b, 1) - .5) * amp * .8, sy = (hash(op.seed, b, 2) - .5) * amp * .8;
    let L = 0; const cum = [0];
    for (let i = 1; i < s.length; i++) { L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); cum.push(L); }
    if (L < .3) return;
    const cut = L * clamp(k);
    if (k < 1) { const out = [s[0]]; for (let i = 1; i < s.length; i++) { if (cum[i] <= cut) out.push(s[i]); else { const f = (cut - cum[i - 1]) / (cum[i] - cum[i - 1] || 1); out.push([lerp(s[i - 1][0], s[i][0], f), lerp(s[i - 1][1], s[i][1], f)]); break; } } s = out; }
    const wpx = op.world ? op.w * v.z : op.w * this.wz * this.weight, tl = Math.min(L * .35, 26) * op.taper + .01;
    const passes = op.passes || 1;
    for (let pass = 0; pass < passes; pass++) {
      const pw = pass ? wpx * .5 : wpx, pa = (pass ? .42 : 1) * op.a * alpha, off = pass ? (hash(op.seed, pass, 7) - .5) * Math.max(1.2, wpx * .9) : 0;
      const Lp = [], Rp = []; let acc = 0;
      for (let i = 0; i < s.length; i++) {
        const a = s[Math.max(0, i - 1)], c = s[Math.min(s.length - 1, i + 1)]; let dx = c[0] - a[0], dy = c[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
        if (i) acc += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
        const head = k < 1 ? 1 : clamp((L - acc) / tl) ** .55, tail = clamp(acc / tl) ** .55;
        const pr = (.78 + .22 * n1(acc / 38 + op.seed, op.seed)) * Math.max(.18, Math.min(head, tail));
        const w = Math.max(.35, pw * pr) / 2, j = n1(acc / 55 + b * 3.7, op.seed + pass * 13) * amp + off;
        const px = s[i][0] + sx - dy * j, py = s[i][1] + sy + dx * j;
        Lp.push([px - dy * w, py + dx * w]); Rp.push([px + dy * w, py - dx * w]);
      }
      ctx.save(); ctx.globalAlpha = clamp(pa);
      if (op.col === 'spot' || (op.col && op.col !== 'lead' && op.col !== 'paper')) { ctx.globalCompositeOperation = op.col === 'spot' ? 'multiply' : 'source-over'; ctx.fillStyle = this.colour(op.col); }
      else if (op.col === 'paper') ctx.fillStyle = this.paper;
      else ctx.fillStyle = this.leadPat;
      ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]); for (let i = 1; i < Lp.length; i++) ctx.lineTo(Lp[i][0], Lp[i][1]);
      for (let i = Rp.length - 1; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  /** zig-zag path that colours a polygon in (world), cached on the op */
  zig(op) {
    if (op._zz && op._zzp === op.pts) return op._zz;
    const a = op.angle, c = Math.cos(-a), s = Math.sin(-a), rot = op.pts.map(([x, y]) => [x * c - y * s, x * s + y * c]);
    let y0 = Infinity, y1 = -Infinity; for (const p of rot) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const g = op.gap, zz = []; let flip = 0;
    for (let y = y0 + g * .3; y < y1; y += g) {
      const xs = []; for (let i = 0; i < rot.length; i++) { const p = rot[i], q = rot[(i + 1) % rot.length]; if ((p[1] <= y) !== (q[1] <= y)) xs.push(p[0] + (y - p[1]) / (q[1] - p[1]) * (q[0] - p[0])); }
      if (xs.length < 2) continue; xs.sort((m, n) => m - n);
      const ra = op.clip === false ? g * (.2 + hash(op.seed, Math.round(y), 5) * 1.6) : g * .6, rb = op.clip === false ? g * (.2 + hash(op.seed, Math.round(y), 6) * 1.6) : g * .6;
      const xa = xs[0] - ra, xb = xs[xs.length - 1] + rb, j = (hash(op.seed, Math.round(y)) - .5) * g * .5;
      const row = flip ? [[xb, y + j], [xa, y - j]] : [[xa, y + j], [xb, y - j]]; flip ^= 1; zz.push(...row);
    }
    op._zz = zz.map(([x, y]) => [x * c + y * s, -x * s + y * c]); op._zzp = op.pts;
    return op._zz;
  }
  /** colour a shape in to fraction k: the zig-zag is stroked inside the shape (clipped), so it reads as marker streaks */
  fill(op, k = 1, alpha = 1) {
    const ctx = this.ctx, v = this.v, zz = this.zig(op); if (zz.length < 2) return;
    const off = op.off, sh = p => this.S([p[0] + off[0], p[1] + off[1]]), poly = op.pts.map(sh);
    ctx.save(); if (op.clip !== false) { ctx.beginPath(); poly.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.clip(); }
    const col = this.colour(op.col), multiply = op.col === 'spot' || (op.col && op.col.startsWith && op.col.startsWith('#') && op.mult);
    ctx.globalCompositeOperation = multiply ? 'multiply' : 'source-over'; ctx.strokeStyle = col; ctx.lineJoin = ctx.lineCap = 'round';
    // how much of the zig-zag is drawn
    let L = 0; const seg = []; for (let i = 1; i < zz.length; i++) { const d = Math.hypot(zz[i][0] - zz[i - 1][0], zz[i][1] - zz[i - 1][1]); seg.push(d); L += d; }
    const cut = L * clamp(k), lw = op.gap * v.z * 1.9;
    for (const [wk, ak] of op.col === 'spot' ? (op.clip === false ? [[1.1, .7], [.5, .45]] : [[1, .55], [.55, .5]]) : [[1.05, 1]]) {
      ctx.lineWidth = lw * wk; ctx.globalAlpha = clamp(op.a * ak * alpha); ctx.beginPath();
      let acc = 0, p = sh(zz[0]); ctx.moveTo(p[0], p[1]);
      for (let i = 1; i < zz.length; i++) {
        const q = zz[i]; if (acc + seg[i - 1] <= cut) { p = sh(q); ctx.lineTo(p[0], p[1]); acc += seg[i - 1]; }
        else { const f = (cut - acc) / (seg[i - 1] || 1), a = zz[i - 1]; p = sh([lerp(a[0], q[0], f), lerp(a[1], q[1], f)]); ctx.lineTo(p[0], p[1]); break; }
      }
      ctx.stroke();
    }
    ctx.restore();
    // a marker pools at its edge
    if (op.edge && op.col === 'spot' && k > .9) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .35 * clamp((k - .9) * 10) * alpha; ctx.strokeStyle = this.spotEdge; ctx.lineWidth = Math.max(.8, 1.3 * this.wz); ctx.lineJoin = 'round';
      ctx.beginPath(); poly.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.stroke(); ctx.restore();
    }
  }
  /** the head of a zig-zag at fraction k (world) — where the pencil is while colouring */
  fillHead(op, k) {
    const zz = this.zig(op); let L = 0; const seg = []; for (let i = 1; i < zz.length; i++) { const d = Math.hypot(zz[i][0] - zz[i - 1][0], zz[i][1] - zz[i - 1][1]); seg.push(d); L += d; }
    const cut = L * clamp(k); let acc = 0;
    for (let i = 1; i < zz.length; i++) { if (acc + seg[i - 1] >= cut) { const f = (cut - acc) / (seg[i - 1] || 1); return [lerp(zz[i - 1][0], zz[i][0], f) + op.off[0], lerp(zz[i - 1][1], zz[i][1], f) + op.off[1]]; } acc += seg[i - 1]; }
    return zz[zz.length - 1];
  }
}

/** world length used to time an op's draw-on: lines by their length, fills by a share of their zig-zag */
export function opWeight(op, painter) {
  if (op.type === 'line') { let L = 0; for (let i = 1; i < op.pts.length; i++) L += Math.hypot(op.pts[i][0] - op.pts[i - 1][0], op.pts[i][1] - op.pts[i - 1][1]); return L / (op.speed || 1); }
  const zz = painter.zig(op); let L = 0; for (let i = 1; i < zz.length; i++) L += Math.hypot(zz[i][0] - zz[i - 1][0], zz[i][1] - zz[i - 1][1]); return L * .22 / (op.speed || 1);
}
/** where an op's pencil is at fraction k (world) */
export function opHead(op, k, painter) {
  if (op.type === 'fill') return painter.fillHead(op, k);
  const p = op.pts; let L = 0; const c = [0]; for (let i = 1; i < p.length; i++) { L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); c.push(L); }
  const cut = L * clamp(k); for (let i = 1; i < p.length; i++) if (c[i] >= cut) { const f = (cut - c[i - 1]) / (c[i] - c[i - 1] || 1); return [lerp(p[i - 1][0], p[i][0], f), lerp(p[i - 1][1], p[i][1], f)]; }
  return p[p.length - 1];
}
