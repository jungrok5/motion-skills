// principle-pass · paint.js — the look: a creature built of thick gouache daubs on a paper ground.
// Every daub is seeded once and rides its part (u along, v across), so nothing flickers between frames.
import { add, sub, mul, len, angOf, ANG } from './rig.js';

export function rng(seed) { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
export const hex = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
export const rgb = (a, k = 1) => `rgba(${a[0] | 0},${a[1] | 0},${a[2] | 0},${k})`;
export const mixC = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
export const shadeC = (a, k) => a.map(v => Math.max(0, Math.min(255, v * k)));

// A part: polyline pts with widths w. Returns point/tangent/width at u ∈ [0, 1].
export function sampler(pts, w) {
  const segL = [], cum = [0];
  for (let i = 1; i < pts.length; i++) { segL.push(len(sub(pts[i], pts[i - 1]))); cum.push(cum[i - 1] + segL[i - 1]); }
  const total = cum[cum.length - 1] || 1e-6;
  return u => {
    const d = Math.max(0, Math.min(1, u)) * total; let i = 1; while (i < pts.length - 1 && cum[i] < d) i++;
    const k = segL[i - 1] ? (d - cum[i - 1]) / segL[i - 1] : 0, a = pts[i - 1], b = pts[i];
    return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], ang: angOf(sub(b, a)), w: w[i - 1] + (w[i] - w[i - 1]) * k, total };
  };
}

// Seed a daub field for a part of roughly `area` px²: [{ u, v, l, w, r, c, k }]
export function seedDaubs(seed, area, size, region) {
  const R = rng(seed), n = Math.max(6, Math.round(area / (size * size * .42))), out = [];
  for (let i = 0; i < n; i++) {
    const u = (i + R()) / n, v = (R() * 2 - 1) * .92, pick = R();
    out.push({ u, v, l: size * (1 + R() * .8), w: size * (.46 + R() * .3), r: (R() - .5) * .38, c: region(u, v, pick, R), k: .88 + R() * .12 });
  }
  return out.sort((a, b) => a.k - b.k);
}

// Draw a part: underpaint (round strokes) + its daubs. toW maps local → panel world, X/Y map world → screen.
export function drawPart(g, cam, S, pts, w, daubs, base, { dim = 1, alpha = 1, under = true, band = null } = {}) {
  if (pts.length < 2) return;
  const f = S.f, W = pts.map(S.toW), sm = sampler(pts, w), z = cam.zoom;
  if (under) {
    g.strokeStyle = rgb(shadeC(base, .82 * dim), alpha); g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 1; i < W.length; i++) {
      g.lineWidth = Math.max(1, (w[i - 1] + w[i]) / 2 * .86 * z);
      g.beginPath(); g.moveTo(cam.X(W[i - 1][0]), cam.Y(W[i - 1][1])); g.lineTo(cam.X(W[i][0]), cam.Y(W[i][1])); g.stroke();
    }
    if (band) { // a second underpaint for a region across the part (a pale belly from v = -1 up to band.to)
      const c = (-1 + band.to) / 2, hw = (1 + band.to) / 2, B = Array.from({ length: 13 }, (_, i) => { const q = sm(i / 12), n = [-Math.sin(q.ang), Math.cos(q.ang)]; return { p: S.toW(add(q.p, mul(n, c * q.w * .46))), w: q.w * hw * .8 }; });
      g.strokeStyle = rgb(shadeC(band.color, .97 * dim), alpha);
      for (let i = 1 + (band.skip || 0); i < B.length - (band.skip || 0); i++) { g.lineWidth = Math.max(1, (B[i - 1].w + B[i].w) / 2 * z); g.beginPath(); g.moveTo(cam.X(B[i - 1].p[0]), cam.Y(B[i - 1].p[1])); g.lineTo(cam.X(B[i].p[0]), cam.Y(B[i].p[1])); g.stroke(); }
    }
  }
  for (const d of daubs) {
    const s = sm(d.u), n = [-Math.sin(s.ang), Math.cos(s.ang)], lp = add(s.p, mul(n, d.v * s.w * .46));
    const wp = S.toW(lp), a = f > 0 ? s.ang + d.r : Math.PI - s.ang - d.r;
    g.fillStyle = rgb(shadeC(d.c, dim), alpha * d.k);
    g.beginPath(); g.ellipse(cam.X(wp[0]), cam.Y(wp[1]), d.l * .5 * z, d.w * .5 * z, -a, 0, Math.PI * 2); g.fill();
  }
}

// The ground: paper above, a painted floor band below, both seeded once into an offscreen canvas per panel.
export function paintGround(w, h, groundY, look, seed = 11) {
  const c = new OffscreenCanvas(w, h), g = c.getContext('2d'), R = rng(seed);
  const sky = hex(look.paper), fl = hex(look.ground), ln = hex(look.line || '#8d8576');
  g.fillStyle = rgb(sky); g.fillRect(0, 0, w, h);
  const grad = g.createLinearGradient(0, 0, 0, groundY); grad.addColorStop(0, rgb(shadeC(sky, 1.03))); grad.addColorStop(1, rgb(shadeC(sky, .96))); g.fillStyle = grad; g.fillRect(0, 0, w, groundY);
  for (let i = 0; i < 140; i++) { // faint wall daubs
    const x = R() * w, y = R() * groundY * .95, l = 30 + R() * 90;
    g.fillStyle = rgb(shadeC(sky, .95 + R() * .08), .35); g.beginPath(); g.ellipse(x, y, l / 2, 4 + R() * 7, (R() - .5) * .25, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = rgb(fl); g.fillRect(0, groundY, w, h - groundY);
  for (let i = 0; i < 700; i++) { // floor strokes, flatter and smaller with distance
    const y = groundY + Math.pow(R(), 1.4) * (h - groundY), k = (y - groundY) / Math.max(1, h - groundY), x = R() * w, l = 20 + R() * 70 * (.4 + k);
    g.fillStyle = rgb(shadeC(mixC(fl, sky, R() * .35), .9 + R() * .16), .55); g.beginPath(); g.ellipse(x, y, l / 2, 2 + R() * 5 * (.3 + k), (R() - .5) * .12, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 40; i++) { // a few dry ink scratches in the floor
    const x = R() * w, y = groundY + 8 + R() * (h - groundY - 10);
    g.strokeStyle = rgb(ln, .28); g.lineWidth = 1; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 4; k++) g.lineTo(x + (k + 1) * (3 + R() * 4), y - R() * 9);
    g.stroke();
  }
  g.strokeStyle = rgb(shadeC(fl, .82), .5); g.lineWidth = 2; g.beginPath(); g.moveTo(0, groundY + .5); g.lineTo(w, groundY + .5); g.stroke();
  return c;
}

// A soft contact shadow.
export function shadow(g, x, y, rx, ry, k) {
  if (k <= .01) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, `rgba(60,48,40,${.32 * k})`); gr.addColorStop(1, 'rgba(60,48,40,0)');
  g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, Math.PI * 2); g.fill(); g.restore();
}

// Props: simple painted things the creature acts on. { kind: 'ball'|'box'|'leaf'|'stone'|'fish', at: t => [x, y], r, color, seed }
export function drawProp(g, cam, p, t) {
  const at = typeof p.at === 'function' ? p.at(t) : p.at, R = rng(p.seed || 5), c = hex(p.color || '#d9d2c3'), z = cam.zoom;
  const X = cam.X(at[0]), Y = cam.Y(at[1]), r = (p.r || 14) * z, rot = typeof p.rot === 'function' ? p.rot(t) : (p.rot || 0);
  g.save(); g.translate(X, Y); g.rotate(-rot);
  const blob = (n, rx, ry, cc) => { for (let i = 0; i < n; i++) { const a = R() * 6.283, d = Math.sqrt(R()); g.fillStyle = rgb(shadeC(cc, .85 + R() * .3), .9);
    g.beginPath(); g.ellipse(Math.cos(a) * d * rx * .7, Math.sin(a) * d * ry * .7, r * (.28 + R() * .2), r * (.16 + R() * .12), R() * 3, 0, 6.283); g.fill(); } };
  if (p.kind === 'box') { const [w, h] = (p.size || [80, 50]).map(v => v * z); g.fillStyle = rgb(shadeC(c, .8)); g.fillRect(-w / 2, -h, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = rgb(shadeC(c, .85 + R() * .3), .9); g.beginPath(); g.ellipse(-w / 2 + R() * w, -h + R() * h, 10 * z, 4 * z, (R() - .5) * .3, 0, 6.283); g.fill(); } }
  else if (p.kind === 'leaf') { g.fillStyle = rgb(c); g.beginPath(); g.ellipse(0, 0, r, r * .42, 0, 0, 6.283); g.fill(); blob(8, r * 1.4, r * .5, c);
    g.strokeStyle = rgb(shadeC(c, .55), .8); g.lineWidth = 1.5 * z; g.beginPath(); g.moveTo(-r, 0); g.lineTo(r * 1.25, 0); g.stroke(); }
  else if (p.kind === 'fish') { g.fillStyle = rgb(c); g.beginPath(); g.ellipse(0, 0, r, r * .4, 0, 0, 6.283); g.fill(); g.beginPath(); g.moveTo(-r * .8, 0); g.lineTo(-r * 1.5, r * .45); g.lineTo(-r * 1.5, -r * .45); g.fill(); blob(10, r * 1.6, r * .6, c);
    g.fillStyle = '#1d1a17'; g.beginPath(); g.arc(r * .55, -r * .08, 1.8 * z, 0, 6.283); g.fill(); }
  else { g.fillStyle = rgb(shadeC(c, .85)); g.beginPath(); g.arc(0, -r * (p.kind === 'stone' ? .5 : 0), r, 0, 6.283); g.fill(); blob(16, r * 1.5, r * 1.5, c); }
  g.restore();
}

// Label chips like a review cut: a white rounded pill with dark text.
export function chip(g, text, x, y, { size = 26, align = 'left', bg = 'rgba(255,255,255,.9)', fg = '#1f1d1a', pad = .5 } = {}) {
  g.font = `600 ${size}px PPInter, system-ui, sans-serif`; const w = g.measureText(text).width, h = size * 1.5, px = size * pad;
  const x0 = align === 'center' ? x - w / 2 - px : align === 'right' ? x - w - 2 * px : x;
  g.fillStyle = bg; g.beginPath(); g.roundRect(x0, y, w + 2 * px, h, size * .32); g.fill();
  g.fillStyle = fg; g.textBaseline = 'middle'; g.fillText(text, x0 + px, y + h / 2 + 1);
  return w + 2 * px;
}
