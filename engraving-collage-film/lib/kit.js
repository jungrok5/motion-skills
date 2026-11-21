// engraving-collage-film · kit.js — engraved subjects, each drawn on its own Plate and cut out: Victorian façades,
// a clock tower, a far skyline, trees, line-screen clouds, a sea strip, a sailing ship, a gas lamp, passers-by,
// a balloon and ground sheets. They are examples of the level of detail, not a menu: a piece draws the subjects its
// topic needs in its own world.js with the same Plate calls (engrave.js) and the same tone habits:
//   light from the upper left · walls 0.15–0.35 in horizontal lines · glass and openings 0.75–0.9 in vertical lines ·
//   cornices and sills paper white with a 0.7 shadow band under them · outlines 2–3 px at tone 1 · far things lighter
//   and finer (smaller gap), near things darker and coarser.
// Every subject returns the Plate's result plus { m: [width, height] in metres, base: px from the bottom to the ground }.
import { Plate } from './engrave.js';
import { rng, clamp, hash01 } from './core.js';

const PPM = 70;   // default px per metre of a card; pass ppm to draw a near card finer
// the finished card: its size in metres follows from the subject's own px-per-metre (the plate's height over its height in m)
const res = (P, o, wm, hm, extra = {}) => { const r = P.done({ margin: o.margin ?? 5, ...extra }), ppm = P.h / hm; r.m = [r.w / ppm, r.h / ppm]; r.ppm = ppm; r.base = r.pad; return r; };

/** a window: recess, glass, frame, sill, hood. kind 'rect' | 'arch' | 'round' */
export function windowAt(P, x, y, w, h, o = {}) {
  const kind = o.kind || 'rect', sh = (s) => (kind === 'rect' ? P.rect(x, y, w, h) : P.arch(x, y, w, h));
  P.white(kind === 'rect' ? P.rect(x - w * 0.12, y - w * 0.1, w * 1.24, h + w * 0.18) : P.arch(x - w * 0.12, y - w * 0.12, w * 1.24, h + w * 0.2));
  P.fill(sh(), { tone: { from: o.dark ?? 0.9, to: (o.dark ?? 0.9) - 0.3, x0: x, y0: y, x1: x + w * 0.3, y1: y + h }, angle: 90, gap: o.gap });
  if (o.lit) P.fill(P.rect(x + w * 0.18, y + h * 0.3, w * 0.64, h * 0.5), { tone: 0.12, angle: 90 });
  P.stroke(sh(), o.lw ?? 2);
  P.line(x + w / 2, y + (kind === 'rect' ? 0 : w / 2), x + w / 2, y + h, Math.max(1.4, w * 0.05));
  P.line(x, y + h * 0.55, x + w, y + h * 0.55, Math.max(1.4, w * 0.05));
  // sill: white ledge, a shadow under it
  P.fill(P.rect(x - w * 0.2, y + h + w * 0.08, w * 1.4, w * 0.16), { tone: 0.72, angle: 0 });
  P.white(P.rect(x - w * 0.2, y + h, w * 1.4, w * 0.1)); P.stroke(P.rect(x - w * 0.2, y + h, w * 1.4, w * 0.1), 1.4);
  if (o.hood === 'pediment') { const p = P.poly([[x - w * 0.25, y - w * 0.14], [x + w / 2, y - w * 0.62], [x + w * 1.25, y - w * 0.14]]); P.white(p); P.fill(P.poly([[x - w * 0.12, y - w * 0.17], [x + w / 2, y - w * 0.5], [x + w * 1.12, y - w * 0.17]]), { tone: 0.42, angle: 0 }); P.stroke(p, 1.8); }
  else if (o.hood === 'cap') { P.fill(P.rect(x - w * 0.22, y - w * 0.3, w * 1.44, w * 0.16), { tone: 0.75, angle: 0 }); P.white(P.rect(x - w * 0.25, y - w * 0.4, w * 1.5, w * 0.12)); P.stroke(P.rect(x - w * 0.25, y - w * 0.4, w * 1.5, w * 0.12), 1.6); }
}

/** a cornice: white band, dentils, the shadow under it */
export function cornice(P, x, y, w, h, o = {}) {
  P.fill(P.rect(x + h * 0.2, y + h, w - h * 0.4, h * 0.7), { tone: 0.78, angle: 0 });
  P.white(P.rect(x, y, w, h)); P.stroke(P.rect(x, y, w, h), 2);
  P.line(x, y + h * 0.35, x + w, y + h * 0.35, 1.3);
  if (o.dentils !== false) { const n = Math.floor(w / (h * 0.55)); for (let i = 0; i < n; i++) P.fill(P.rect(x + (i + 0.25) * w / n, y + h * 0.55, w / n * 0.45, h * 0.4), { tone: 0.85 }); }
}

/**
 * facade(o) — a Victorian town-house or block front. o = { w: metres, floors: 4, bays: 5, ppm, seed, wall: 0.22,
 *   window: 'rect' | 'arch' | 'mix', roof: 'mansard' | 'flat' | 'gable', shop: true (awnings and big panes on the ground
 *   floor), lit: [bay indices with a lit window], chimneys: 2, side: 0…0.35 (a darker side wall on the right, as a share of w) }
 */
export function facade(o = {}) {
  const ppm = o.ppm ?? PPM, r = rng(o.seed ?? 3), fl = o.floors ?? 4, bays = o.bays ?? 5, wm = o.w ?? bays * 2.4;
  const fh = 3.3 * ppm, gh = (o.shop === false ? 3.6 : 4.2) * ppm, roofH = o.roof === 'flat' ? 0.9 * ppm : o.roof === 'gable' ? wm * 0.32 * ppm : 3.2 * ppm;
  const sideW = (o.side ?? 0) * wm * ppm, W = wm * ppm + sideW, bodyH = gh + fl * fh, H = bodyH + roofH + 1.6 * ppm;
  const P = new Plate(W, H, { seed: o.seed ?? 3, gap: o.gap ?? Math.max(3.2, ppm / 15) });
  const top = H - bodyH, fw = wm * ppm, wall = o.wall ?? 0.22, g = P.gap;
  // roof first (it sits behind the cornice)
  if (o.roof === 'gable') {
    const p = P.poly([[0, top], [fw / 2, top - roofH], [fw, top]]); P.fill(p, { tone: { from: 0.35, to: 0.6, x0: 0, y0: top - roofH, x1: fw, y1: top }, angle: 65 }); P.stroke(p, 2.4);
    windowAt(P, fw / 2 - 0.45 * ppm, top - roofH * 0.55, 0.9 * ppm, 1.2 * ppm, { kind: 'round' });
  } else if (o.roof !== 'flat') {
    const p = P.poly([[fw * 0.02, top], [fw * 0.07, top - roofH], [fw * 0.93, top - roofH], [fw * 0.98, top]]);
    P.fill(p, { tone: { from: 0.42, to: 0.68, x0: 0, y0: 0, x1: fw, y1: 0 }, angle: 62, gap: g * 0.9 }); P.stroke(p, 2.4);
    for (let i = 1; i < 6; i++) P.line(fw * 0.03 + i * 2, top - roofH * i / 6, fw * 0.97 - i * 2, top - roofH * i / 6, 1.2, { tone: 0.8 });
    const nd = Math.max(1, Math.round(bays / 2));
    for (let i = 0; i < nd; i++) {
      const cx = fw * (i + 0.5) / nd, dw = 0.9 * ppm, dy = top - roofH * 0.82;
      const d = P.poly([[cx - dw * 0.75, dy + roofH * 0.62], [cx - dw * 0.75, dy + dw * 0.3], [cx, dy - dw * 0.35], [cx + dw * 0.75, dy + dw * 0.3], [cx + dw * 0.75, dy + roofH * 0.62]]);
      P.fill(d, { tone: 0.2, angle: 0 }); P.stroke(d, 2); windowAt(P, cx - dw * 0.38, dy + dw * 0.35, dw * 0.76, roofH * 0.38, { kind: 'arch', lw: 1.6 });
    }
  }
  for (let i = 0; i < (o.chimneys ?? 2); i++) {
    const cx = fw * (0.15 + 0.7 * (i + r() * 0.3) / Math.max(1, (o.chimneys ?? 2) - 0.5)), cw = 0.7 * ppm, ch = roofH + 1.3 * ppm;
    P.fill(P.rect(cx, top - ch, cw, ch * 0.9), { tone: { from: 0.3, to: 0.6, x0: cx, y0: 0, x1: cx + cw, y1: 0 }, angle: 0 }); P.stroke(P.rect(cx, top - ch, cw, ch * 0.9), 2);
    P.white(P.rect(cx - cw * 0.12, top - ch - 0.18 * ppm, cw * 1.24, 0.22 * ppm)); P.stroke(P.rect(cx - cw * 0.12, top - ch - 0.18 * ppm, cw * 1.24, 0.22 * ppm), 1.8);
    for (let k = 0; k < 2; k++) { const px = cx + cw * (0.25 + k * 0.4); P.fill(P.rect(px, top - ch - 0.45 * ppm, cw * 0.18, 0.3 * ppm), { tone: 0.55 }); P.stroke(P.rect(px, top - ch - 0.45 * ppm, cw * 0.18, 0.3 * ppm), 1.4); }
  }
  // the wall
  P.fill(P.rect(0, top, fw, bodyH), { tone: { from: wall, to: wall + 0.12, x0: 0, y0: top, x1: fw, y1: H }, angle: 0 });
  if (sideW) { const s = P.poly([[fw, top], [W, top + sideW * 0.25], [W, H - sideW * 0.1], [fw, H]]); P.fill(s, { tone: 0.62, angle: 0, gap: g * 0.9 }); P.stroke(s, 2.2); for (let k = 0; k < fl; k++) P.fill(P.rect(fw + sideW * 0.3, top + gh * 0.2 + fh * k + fh * 0.3, sideW * 0.35, fh * 0.45), { tone: 0.9, angle: 90 }); }
  // floors: cornice bands and windows
  const bw = fw / bays;
  for (let f = 0; f < fl; f++) {
    const y0 = top + f * fh, kind = o.window === 'arch' ? 'arch' : o.window === 'mix' ? (f === 0 ? 'arch' : f === fl - 1 ? 'round' : 'rect') : 'rect';
    cornice(P, -0.15 * ppm, y0 - (f === 0 ? 0.55 : 0.28) * ppm, fw + 0.3 * ppm, (f === 0 ? 0.55 : 0.26) * ppm, { dentils: f === 0 });
    for (let b = 0; b < bays; b++) {
      const ww = bw * 0.44, wh = fh * 0.56, x = b * bw + (bw - ww) / 2, y = y0 + fh * 0.22;
      windowAt(P, x, y, ww, wh, { kind, hood: f === 1 ? 'pediment' : f === 2 ? 'cap' : null, lit: (o.lit || []).includes(b + f * bays), dark: 0.88 - r() * 0.08 });
    }
    // pilasters at the ends
    for (const px of [0, fw - 0.35 * ppm]) { P.fill(P.rect(px, y0, 0.35 * ppm, fh), { tone: { from: 0.08, to: 0.45, x0: px, y0: 0, x1: px + 0.35 * ppm, y1: 0 }, angle: 90 }); P.stroke(P.rect(px, y0, 0.35 * ppm, fh), 1.6); }
  }
  // the ground floor: a shop front or rusticated stone
  const gy = top + fl * fh;
  cornice(P, -0.1 * ppm, gy - 0.3 * ppm, fw + 0.2 * ppm, 0.32 * ppm, { dentils: false });
  if (o.shop !== false) {
    const n = Math.max(2, Math.round(bays / 2));
    for (let i = 0; i < n; i++) {
      const x = fw * i / n + 0.25 * ppm, w = fw / n - 0.5 * ppm, y = gy + 0.9 * ppm, h = gh - 1.1 * ppm;
      P.fill(P.rect(x, y, w, h), { tone: { from: 0.78, to: 0.42, x0: x, y0: y, x1: x + w, y1: y + h }, angle: 90 });
      P.white(P.poly([[x + w * 0.1, y + h], [x + w * 0.35, y], [x + w * 0.45, y], [x + w * 0.2, y + h]]));
      for (let k = 1; k < 3; k++) P.line(x + w * k / 3, y, x + w * k / 3, y + h, 1.8);
      P.stroke(P.rect(x, y, w, h), 2.4);
      if (i === Math.floor(n / 2)) { const dx = x + w * 0.36, dw = w * 0.28; P.fill(P.rect(dx, y + h * 0.1, dw, h * 0.9), { tone: 0.95 }); P.white(P.rect(dx + dw * 0.15, y + h * 0.2, dw * 0.7, h * 0.3)); P.stroke(P.rect(dx, y + h * 0.1, dw, h * 0.9), 2); }
      // awning: alternate white and grey stripes, scalloped hem
      const ay = gy + 0.12 * ppm, ah = 1.05 * ppm, aw = P.path(p => { p.moveTo(x - 0.15 * ppm, ay); p.lineTo(x + w + 0.15 * ppm, ay); p.lineTo(x + w + 0.35 * ppm, ay + ah); const k = 8; for (let j = k; j >= 0; j--) { const px = x - 0.35 * ppm + (w + 0.7 * ppm) * j / k; p.quadraticCurveTo(px + (w + 0.7 * ppm) / k / 2, ay + ah + 0.22 * ppm, px, ay + ah); } p.closePath(); });
      P.white(aw);
      const sw = (w + 0.7 * ppm) / 8;
      for (let j = 0; j < 8; j += 2) P.fill(P.poly([[x - 0.15 * ppm + j * sw * 0.95, ay], [x - 0.15 * ppm + (j + 1) * sw * 0.95, ay], [x - 0.35 * ppm + (j + 1) * sw, ay + ah], [x - 0.35 * ppm + j * sw, ay + ah]]), { tone: 0.55, angle: 80, wave: 0.15 });
      P.stroke(aw, 2);
      P.fill(P.rect(x, ay + ah + 0.2 * ppm, w, 0.25 * ppm), { tone: 0.5, angle: 0 });
    }
  } else {
    for (let k = 0; k < 6; k++) P.line(0, gy + gh * k / 6, fw, gy + gh * k / 6, 1.6, { tone: 0.9 });
    for (let b = 0; b < bays; b++) windowAt(P, b * bw + bw * 0.3, gy + gh * 0.25, bw * 0.4, gh * 0.55, { kind: 'arch' });
  }
  P.stroke(P.rect(0, top, fw, bodyH), 2.8);
  return res(P, o, wm, H / ppm);
}

/** tower(o) — a clock tower: rusticated base, a tall shaft with slit windows, the clock stage, an open belfry, a spire.
 *  o = { w: 4.5, h: 34, ppm, seed, time: [h, m] on the clock face, spire: true } */
export function tower(o = {}) {
  const ppm = o.ppm ?? PPM, wm = o.w ?? 4.5, hm = o.h ?? 34, W = (wm + 1.2) * ppm, H = hm * ppm;
  const P = new Plate(W, H, { seed: o.seed ?? 21, gap: o.gap ?? 4 }), cx = W / 2, w = wm * ppm, x0 = cx - w / 2;
  const spireH = (o.spire === false ? 0.08 : 0.3) * H, belY = spireH, belH = 0.12 * H, clY = belY + belH, clH = 0.15 * H, shY = clY + clH, baseY = H - 0.14 * H;
  // spire
  if (o.spire !== false) {
    const s = P.poly([[x0 + w * 0.08, belY], [cx, 0.02 * H], [x0 + w * 0.92, belY]]);
    P.fill(s, { tone: { from: 0.25, to: 0.75, x0: x0, y0: 0, x1: x0 + w, y1: 0 }, angle: 70, gap: 3.6 }); P.stroke(s, 2.4);
    P.line(cx, 0.02 * H, cx, 0, 2.4); P.fill(P.ellipse(cx, 0.02 * H, 7, 7), { tone: 1 });
    for (let i = 1; i < 7; i++) { const y = belY - (belY - 0.02 * H) * i / 7, hw = (w * 0.42) * (1 - i / 7); P.line(cx - hw, y, cx + hw, y, 1.3, { tone: 0.9 }); }
  }
  // belfry: open arches
  P.fill(P.rect(x0, belY, w, belH), { tone: { from: 0.2, to: 0.42, x0, y0: 0, x1: x0 + w, y1: 0 }, angle: 0 });
  for (let i = 0; i < 2; i++) { const ax = x0 + w * (0.14 + i * 0.44), aw = w * 0.3; P.fill(P.arch(ax, belY + belH * 0.15, aw, belH * 0.72), { tone: 0.95 }); P.stroke(P.arch(ax, belY + belH * 0.15, aw, belH * 0.72), 2); P.fill(P.ellipse(ax + aw / 2, belY + belH * 0.42, aw * 0.28, aw * 0.32), { tone: 0.55, angle: 90 }); }
  cornice(P, x0 - 0.3 * ppm, belY + belH - 0.3 * ppm, w + 0.6 * ppm, 0.36 * ppm, {});
  // clock stage
  P.fill(P.rect(x0, clY, w, clH), { tone: { from: 0.16, to: 0.38, x0, y0: 0, x1: x0 + w, y1: 0 }, angle: 0 });
  const cr = Math.min(w, clH) * 0.38, cy = clY + clH * 0.5;
  P.fill(P.ellipse(cx, cy, cr * 1.15, cr * 1.15), { tone: 0.7, angle: 45 }); P.white(P.ellipse(cx, cy, cr, cr)); P.stroke(P.ellipse(cx, cy, cr, cr), 2.4); P.stroke(P.ellipse(cx, cy, cr * 1.15, cr * 1.15), 2);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; P.line(cx + Math.cos(a) * cr * 0.78, cy + Math.sin(a) * cr * 0.78, cx + Math.cos(a) * cr * 0.92, cy + Math.sin(a) * cr * 0.92, k % 3 ? 2 : 3.4); }
  const [hh, mm] = o.time || [10, 10], ah = ((hh % 12) + mm / 60) / 12 * Math.PI * 2 - Math.PI / 2, am = mm / 60 * Math.PI * 2 - Math.PI / 2;
  P.line(cx, cy, cx + Math.cos(ah) * cr * 0.5, cy + Math.sin(ah) * cr * 0.5, 4); P.line(cx, cy, cx + Math.cos(am) * cr * 0.75, cy + Math.sin(am) * cr * 0.75, 2.6);
  cornice(P, x0 - 0.25 * ppm, clY + clH - 0.3 * ppm, w + 0.5 * ppm, 0.32 * ppm, { dentils: false });
  // shaft
  P.fill(P.rect(x0 + w * 0.04, shY, w * 0.92, baseY - shY), { tone: { from: 0.15, to: 0.42, x0, y0: 0, x1: x0 + w, y1: 0 }, angle: 0 });
  for (let i = 0; i < 4; i++) { const y = shY + (baseY - shY) * (0.12 + i * 0.22); windowAt(P, cx - w * 0.08, y, w * 0.16, (baseY - shY) * 0.12, { kind: 'arch', lw: 1.6 }); }
  for (const px of [x0 + w * 0.04, x0 + w * 0.84]) P.fill(P.rect(px, shY, w * 0.12, baseY - shY), { tone: { from: 0.1, to: 0.5, x0: px, y0: 0, x1: px + w * 0.12, y1: 0 }, angle: 90 });
  P.stroke(P.rect(x0 + w * 0.04, shY, w * 0.92, baseY - shY), 2.4);
  // base
  P.fill(P.rect(x0 - 0.2 * ppm, baseY, w + 0.4 * ppm, H - baseY), { tone: { from: 0.25, to: 0.5, x0, y0: 0, x1: x0 + w, y1: 0 }, angle: 0 });
  for (let k = 0; k < 7; k++) P.line(x0 - 0.2 * ppm, baseY + (H - baseY) * k / 7, x0 + w + 0.2 * ppm, baseY + (H - baseY) * k / 7, 1.5);
  P.fill(P.arch(cx - w * 0.17, baseY + (H - baseY) * 0.3, w * 0.34, (H - baseY) * 0.7), { tone: 0.93 }); P.stroke(P.arch(cx - w * 0.17, baseY + (H - baseY) * 0.3, w * 0.34, (H - baseY) * 0.7), 2.6);
  cornice(P, x0 - 0.35 * ppm, baseY - 0.35 * ppm, w + 0.7 * ppm, 0.4 * ppm, { dentils: true });
  P.stroke(P.rect(x0 - 0.2 * ppm, baseY, w + 0.4 * ppm, H - baseY), 2.6);
  return res(P, o, wm, hm);
}

/** skyline(o) — a far strip of roofs, spires, domes and chimneys in fine light lines (a backdrop card).
 *  o = { w: 120 m, h: 22 m, ppm: 24, seed, tone: 0.2 (how dark the far town is), domes: 1, spires: 3 } */
export function skyline(o = {}) {
  const ppm = o.ppm ?? 24, wm = o.w ?? 120, hm = o.h ?? 22, W = wm * ppm, H = hm * ppm, r = rng(o.seed ?? 5);
  const P = new Plate(W, H, { seed: o.seed ?? 5, gap: o.gap ?? 2.6 }), base = H, t0 = o.tone ?? 0.2;
  const specials = []; for (let i = 0; i < (o.spires ?? 3); i++) specials.push(['spire', r()]); for (let i = 0; i < (o.domes ?? 1); i++) specials.push(['dome', r()]);
  let x = 0;
  while (x < W) {
    const bw = r.range(3, 9) * ppm, bh = r.range(0.25, 0.6) * H, y = base - bh, t = t0 + r.range(-0.06, 0.1);
    P.fill(P.rect(x, y, bw, bh), { tone: { from: t, to: t + 0.12, x0: x, y0: 0, x1: x + bw, y1: 0 }, angle: 0 });
    if (r() < 0.5) { const p = P.poly([[x - 2, y], [x + bw * 0.5, y - bh * r.range(0.08, 0.2)], [x + bw + 2, y]]); P.fill(p, { tone: t + 0.2, angle: 60 }); P.stroke(p, 1.3); }
    for (let wy = y + 0.12 * bh; wy < base - 1.5 * ppm; wy += 1.4 * ppm) for (let wx = x + 0.8 * ppm; wx < x + bw - 0.8 * ppm; wx += 1.3 * ppm) P.fill(P.rect(wx, wy, 0.45 * ppm, 0.65 * ppm), { tone: t + 0.45, angle: 90 });
    if (r() < 0.4) { const cx = x + bw * r.range(0.2, 0.8); P.fill(P.rect(cx, y - 1.6 * ppm, 0.5 * ppm, 1.6 * ppm), { tone: t + 0.25 }); P.stroke(P.rect(cx, y - 1.6 * ppm, 0.5 * ppm, 1.6 * ppm), 1.2); }
    P.stroke(P.rect(x, y, bw, bh), 1.3);
    x += bw - r.range(0, 0.8) * ppm;
  }
  for (const [kind, u] of specials) {
    const cx = (0.08 + u * 0.84) * W;
    if (kind === 'spire') { const sw = 2.4 * ppm, sh = H * r.range(0.75, 0.95); P.fill(P.rect(cx - sw / 2, base - sh * 0.55, sw, sh * 0.55), { tone: t0 + 0.08 }); P.stroke(P.rect(cx - sw / 2, base - sh * 0.55, sw, sh * 0.55), 1.3); const p = P.poly([[cx - sw / 2, base - sh * 0.55], [cx, base - sh], [cx + sw / 2, base - sh * 0.55]]); P.fill(p, { tone: { from: t0, to: t0 + 0.4, x0: cx - sw / 2, y0: 0, x1: cx + sw / 2, y1: 0 }, angle: 75 }); P.stroke(p, 1.3); }
    else { const dr = 5 * ppm, dy = base - H * 0.55; P.fill(P.rect(cx - dr * 1.2, dy, dr * 2.4, base - dy), { tone: t0 + 0.05 }); P.stroke(P.rect(cx - dr * 1.2, dy, dr * 2.4, base - dy), 1.3); const d = P.path(p => { p.moveTo(cx - dr, dy); p.arc(cx, dy, dr, Math.PI, 0); p.closePath(); }); P.fill(d, { tone: { from: t0 - 0.05, to: t0 + 0.4, x0: cx - dr, y0: 0, x1: cx + dr, y1: 0 }, angle: 90, gap: 2.4 }); P.stroke(d, 1.4); P.line(cx, dy - dr, cx, dy - dr - 1.4 * ppm, 1.4); }
  }
  return res(P, o, wm, hm, { margin: o.margin ?? 3 });
}

/** tree(o) — an engraved tree: a trunk of short bark strokes, foliage clumps shaded from the upper left.
 *  o = { h: 9 m, w: 7 m, ppm, seed, dark: 0 (add up to 0.2 for a darker tree), kind: 'round' | 'poplar' | 'pine' } */
export function tree(o = {}) {
  const ppm = o.ppm ?? PPM, hm = o.h ?? 9, wm = o.w ?? hm * 0.75, W = wm * ppm, H = hm * ppm, r = rng(o.seed ?? 9), dk = o.dark ?? 0;
  const P = new Plate(W, H, { seed: o.seed ?? 9, gap: o.gap ?? 3.8 }), cx = W / 2;
  const tw = W * 0.07, trunk = P.poly([[cx - tw, H], [cx - tw * 0.55, H * 0.45], [cx + tw * 0.4, H * 0.45], [cx + tw * 1.1, H]]);
  P.fill(trunk, { tone: { from: 0.3 + dk, to: 0.8, x0: cx - tw, y0: 0, x1: cx + tw, y1: 0 }, angle: 88, wave: 0.2 }); P.stroke(trunk, 2);
  const clumps = [];
  if (o.kind === 'pine') for (let i = 0; i < 7; i++) { const y = H * (0.12 + i * 0.11), hw = W * (0.12 + i * 0.055); clumps.push([cx, y, hw, H * 0.075]); }
  else if (o.kind === 'poplar') for (let i = 0; i < 9; i++) clumps.push([cx + r.range(-1, 1) * W * 0.12, H * (0.08 + i * 0.075), W * r.range(0.16, 0.24), H * 0.07]);
  else for (let i = 0; i < 11; i++) { const a = r() * Math.PI * 2, d = r() * 0.3; clumps.push([cx + Math.cos(a) * W * d, H * 0.33 + Math.sin(a) * H * d * 0.6, W * r.range(0.16, 0.26), H * r.range(0.1, 0.15)]); }
  clumps.sort((a, b) => a[1] - b[1]);
  clumps.forEach(([x, y, rx, ry], i) => {
    const b = P.blob(x, y, rx, ry, 9, (o.seed ?? 9) * 31 + i, 0.45);
    P.solid(b, { tone: { cx: x - rx * 0.4, cy: y - ry * 0.5, r: Math.max(rx, ry) * 1.6, from: 0.12 + dk, to: 0.8 + dk }, angle: 30 + r.range(-15, 15), wave: 0.35 }, 1.6);
  });
  return res(P, o, wm, hm);
}

/** cloud(o) — an engraved cloud: soft lumps in a horizontal line screen, darker underneath, no outline.
 *  o = { w: 30 m, h: 9 m, ppm: 20, seed, tone: 0.32 } */
export function cloud(o = {}) {
  const ppm = o.ppm ?? 20, wm = o.w ?? 30, hm = o.h ?? 9, W = wm * ppm, H = hm * ppm, r = rng(o.seed ?? 11), t = o.tone ?? 0.32;
  const P = new Plate(W, H, { seed: o.seed ?? 11, gap: o.gap ?? 3, angle: o.angle ?? 2, wave: 0.45 });
  const n = 7 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const x = W * (0.16 + 0.68 * i / (n - 1)) + r.range(-0.04, 0.04) * W, y = H * r.range(0.52, 0.64), rx = W * r.range(0.08, 0.14), ry = H * r.range(0.16, 0.27);
    P.fill(P.blob(x, y, rx, ry, 8, (o.seed ?? 11) * 17 + i, 0.5), { tone: { x0: 0, y0: y - ry, x1: 0, y1: y + ry, from: t * 0.25, to: t } });
  }
  for (let i = 0; i < 4; i++) { const x = W * r.range(0.3, 0.7), y = H * r.range(0.4, 0.5); P.fill(P.blob(x, y, W * 0.07, H * 0.14, 7, i + 99, 0.4), { tone: t * 0.12 }); }
  return res(P, o, wm, hm, { margin: 0, light: false });
}

/** sky(o) — the backdrop: a wide sheet of engraved sky, horizontal line screen darkening a little toward the top, broken
 *  by soft cloud masses with paper-white crowns (the source's skies). Hang it far behind everything, haze 0.
 *  o = { w: 320 m, h: 90 m, ppm: 7, seed, tone: 0.26, clouds: 7 } */
export function sky(o = {}) {
  const ppm = o.ppm ?? 7, wm = o.w ?? 320, hm = o.h ?? 90, W = wm * ppm, H = hm * ppm, r = rng(o.seed ?? 19), t = o.tone ?? 0.26;
  const P = new Plate(W, H, { seed: o.seed ?? 19, gap: o.gap ?? 2.6, angle: 1.5, wave: 0.5 });
  P.fill(P.rect(0, 0, W, H), { tone: { x0: 0, y0: 0, x1: 0, y1: H, stops: [[0, t * 0.75], [0.55, t * 0.3], [1, 0.02]] } });
  for (let i = 0; i < (o.clouds ?? 7); i++) {
    const x = W * (i + r.range(0.1, 0.9)) / (o.clouds ?? 7), y = H * r.range(0.22, 0.62), rx = W * r.range(0.06, 0.11), ry = H * r.range(0.1, 0.18);
    P.fill(P.blob(x, y + ry * 0.35, rx * 1.1, ry * 0.9, 9, i * 7 + 3, 0.5), { tone: t * 1.25 });
    P.fill(P.blob(x, y, rx, ry, 9, i * 7 + 1, 0.55), { tone: { x0: 0, y0: y - ry, x1: 0, y1: y + ry, from: 0.0, to: t * 0.9 } });
  }
  return res(P, o, wm, hm, { margin: 0, light: false, blur: 2 });
}

/** sea(o) — a strip of engraved waves: wavy horizontal lines darkening toward the bottom, white crests.
 *  o = { w: 60 m, h: 6 m, ppm: 30, seed, tone: 0.45 } */
export function sea(o = {}) {
  const ppm = o.ppm ?? 30, wm = o.w ?? 60, hm = o.h ?? 6, W = wm * ppm, H = hm * ppm, r = rng(o.seed ?? 13), t = o.tone ?? 0.45;
  const P = new Plate(W, H, { seed: o.seed ?? 13, gap: o.gap ?? 3.4, wave: 0.85 });
  const top = P.path(p => { p.moveTo(0, H); for (let x = 0; x <= W; x += W / 60) p.lineTo(x, H * 0.12 + Math.sin(x / W * 31 + 1) * H * 0.05 + Math.sin(x / W * 77) * H * 0.03); p.lineTo(W, H); p.closePath(); });
  P.fill(top, { tone: { x0: 0, y0: 0, x1: 0, y1: H, from: t * 0.5, to: t + 0.3 } });
  for (let i = 0; i < 40; i++) {   // crests: little white curls with an ink line under them
    const x = r() * W, y = H * r.range(0.18, 0.85), w = W * r.range(0.02, 0.05) * (0.6 + y / H);
    const c = P.path(p => { p.moveTo(x - w, y + w * 0.08); p.quadraticCurveTo(x, y - w * 0.22, x + w, y + w * 0.08); p.quadraticCurveTo(x, y + w * 0.02, x - w, y + w * 0.08); });
    P.white(c); P.stroke(P.path(p => { p.moveTo(x - w, y + w * 0.1); p.quadraticCurveTo(x, y - w * 0.2, x + w, y + w * 0.1); }), 1.6);
  }
  return res(P, o, wm, hm, { margin: 0, light: false });
}

/** ship(o) — a three-masted sailing ship, side on: a dark planked hull, white sails shaded with the wind, rigging.
 *  o = { len: 30 m, ppm: 40, seed, sails: 'set' | 'furled' } */
export function ship(o = {}) {
  const ppm = o.ppm ?? 40, lm = o.len ?? 30, W = lm * 1.15 * ppm, H = lm * 0.95 * ppm, r = rng(o.seed ?? 17);
  const P = new Plate(W, H, { seed: o.seed ?? 17, gap: o.gap ?? 3.4 }), L = lm * ppm, x0 = (W - L) / 2, wl = H * 0.86;
  const masts = [0.27, 0.5, 0.72].map(u => x0 + L * u), mh = [0.72, 0.8, 0.66].map(k => H * k);
  // rigging first (behind the sails)
  for (let i = 0; i < 3; i++) for (let k = -1; k <= 1; k += 2) P.line(masts[i], wl - mh[i], masts[i] + k * L * 0.14, wl - H * 0.06, 1.2, { tone: 0.9 });
  P.line(x0 - L * 0.08, wl - H * 0.12, masts[0], wl - mh[0], 1.3); P.line(masts[2], wl - mh[2], x0 + L * 1.02, wl - H * 0.1, 1.3);
  for (let i = 0; i < 3; i++) P.line(masts[i], wl - H * 0.05, masts[i], wl - mh[i], 3);
  if (o.sails !== 'furled') for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) {
    const top = wl - mh[i] + mh[i] * (0.08 + k * 0.27), h = mh[i] * 0.24, w = L * (0.2 - k * 0.025) * (i === 1 ? 1.1 : 1);
    const s = P.path(p => { p.moveTo(masts[i] - w / 2, top); p.lineTo(masts[i] + w / 2, top); p.quadraticCurveTo(masts[i] + w * 0.62, top + h * 0.5, masts[i] + w / 2 + w * 0.05, top + h); p.quadraticCurveTo(masts[i], top + h * 1.12, masts[i] - w / 2 + w * 0.05, top + h); p.quadraticCurveTo(masts[i] - w * 0.42, top + h * 0.5, masts[i] - w / 2, top); p.closePath(); });
    P.fill(s, { tone: { from: 0.04, to: 0.42, x0: masts[i] - w / 2, y0: top, x1: masts[i] + w / 2, y1: top + h }, angle: 90, wave: 0.25 }); P.stroke(s, 1.8);
    P.line(masts[i] - w * 0.55, top, masts[i] + w * 0.55, top, 2.2);
  } else for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) { const y = wl - mh[i] + mh[i] * (0.1 + k * 0.27); P.line(masts[i] - L * 0.09, y, masts[i] + L * 0.09, y, 2.4); P.fill(P.ellipse(masts[i], y + 4, L * 0.085, 5), { tone: 0.3, angle: 0 }); }
  P.fill(P.poly([[masts[1], wl - mh[1] - 4], [masts[1] + L * 0.06, wl - mh[1] + 8], [masts[1], wl - mh[1] + 18]]), { tone: 0.6, angle: 0, wave: 0.4 });
  // hull
  const hull = P.path(p => { p.moveTo(x0 - L * 0.06, wl - H * 0.13); p.lineTo(x0 + L * 0.98, wl - H * 0.12); p.lineTo(x0 + L * 1.02, wl - H * 0.17); p.quadraticCurveTo(x0 + L * 0.98, wl, x0 + L * 0.85, wl + H * 0.03); p.lineTo(x0 + L * 0.12, wl + H * 0.03); p.quadraticCurveTo(x0, wl - H * 0.03, x0 - L * 0.06, wl - H * 0.13); p.closePath(); });
  P.fill(hull, { tone: { from: 0.55, to: 0.88, x0: 0, y0: wl - H * 0.13, x1: 0, y1: wl }, angle: 0, gap: 3 }); P.stroke(hull, 2.6);
  P.white(P.rect(x0 + L * 0.06, wl - H * 0.095, L * 0.86, H * 0.022)); P.stroke(P.rect(x0 + L * 0.06, wl - H * 0.095, L * 0.86, H * 0.022), 1.4);
  for (let i = 0; i < 12; i++) P.fill(P.rect(x0 + L * (0.1 + i * 0.068), wl - H * 0.09, L * 0.022, H * 0.013), { tone: 1 });
  P.line(x0 - L * 0.06, wl - H * 0.13, x0 - L * 0.2, wl - H * 0.2, 2.4);
  return res(P, o, lm, H / ppm);
}

/** lamp(o) — a cast-iron gas lamp post. o = { h: 4.2 m, ppm, seed } */
export function lamp(o = {}) {
  const ppm = o.ppm ?? PPM, hm = o.h ?? 4.2, H = hm * ppm, W = 1.1 * ppm, P = new Plate(W, H, { seed: o.seed ?? 23, gap: 3 }), cx = W / 2;
  P.fill(P.poly([[cx - 0.06 * ppm, H * 0.2], [cx + 0.06 * ppm, H * 0.2], [cx + 0.09 * ppm, H * 0.9], [cx - 0.09 * ppm, H * 0.9]]), { tone: 0.85, angle: 90 });
  P.fill(P.poly([[cx - 0.2 * ppm, H], [cx - 0.14 * ppm, H * 0.88], [cx + 0.14 * ppm, H * 0.88], [cx + 0.2 * ppm, H]]), { tone: 0.8, angle: 90 }); P.stroke(P.poly([[cx - 0.2 * ppm, H], [cx - 0.14 * ppm, H * 0.88], [cx + 0.14 * ppm, H * 0.88], [cx + 0.2 * ppm, H]]), 1.6);
  P.line(cx - 0.3 * ppm, H * 0.24, cx + 0.3 * ppm, H * 0.24, 2.2);
  const lan = P.poly([[cx - 0.26 * ppm, H * 0.06], [cx + 0.26 * ppm, H * 0.06], [cx + 0.17 * ppm, H * 0.19], [cx - 0.17 * ppm, H * 0.19]]);
  P.fill(lan, { tone: 0.06, angle: 90 }); P.stroke(lan, 2); P.line(cx, H * 0.06, cx, H * 0.19, 1.4);
  const cap = P.poly([[cx - 0.32 * ppm, H * 0.06], [cx, 0], [cx + 0.32 * ppm, H * 0.06]]); P.fill(cap, { tone: 0.8, angle: 60 }); P.stroke(cap, 2);
  return res(P, o, W / ppm, hm, { margin: 3 });
}

/** figure(o) — an engraved passer-by of the period, standing (a still card: background people do not walk).
 *  o = { kind: 'gent' | 'lady' | 'worker', h: 1.75 m, ppm, seed, facing: 1 | -1 } */
export function figure(o = {}) {
  const ppm = o.ppm ?? PPM, hm = o.h ?? 1.75, H = (hm + 0.35) * ppm, W = 1.1 * ppm, P = new Plate(W, H, { seed: o.seed ?? 29, gap: 2.6 });
  const k = o.kind || 'gent', cx = W / 2, f = o.facing ?? 1, u = hm * ppm / 8, top = H - hm * ppm;   // u = one head
  const X = x => cx + x * f;
  // legs
  if (k !== 'lady') for (const s of [-1, 1]) { const l = P.poly([[X(s * 0.3 * u - 0.28 * u), H - 3.9 * u], [X(s * 0.3 * u + 0.3 * u), H - 3.9 * u], [X(s * 0.45 * u + 0.25 * u), H - 0.3 * u], [X(s * 0.45 * u - 0.25 * u), H - 0.3 * u]]); P.fill(l, { tone: s > 0 ? 0.6 : 0.82, angle: 88 }); P.stroke(l, 1.5); P.fill(P.ellipse(X(s * 0.45 * u + 0.25 * u), H - 0.22 * u, 0.42 * u, 0.2 * u), { tone: 1 }); }
  // body
  const coat = k === 'lady'
    ? P.poly([[X(-0.55 * u), top + 1.5 * u], [X(0.55 * u), top + 1.5 * u], [X(0.7 * u), top + 3.2 * u], [X(1.7 * u), H - 0.1 * u], [X(-1.3 * u), H - 0.1 * u], [X(-0.65 * u), top + 3.2 * u]])
    : P.poly([[X(-0.7 * u), top + 1.5 * u], [X(0.7 * u), top + 1.5 * u], [X(0.95 * u), top + (k === 'gent' ? 5.2 : 4.2) * u], [X(-0.85 * u), top + (k === 'gent' ? 5.2 : 4.2) * u]]);
  P.fill(coat, { tone: { from: k === 'lady' ? 0.25 : 0.55, to: 0.9, x0: X(-u), y0: 0, x1: X(u), y1: 0 }, angle: k === 'lady' ? 92 : 80, wave: k === 'lady' ? 0.25 : 0 }); P.stroke(coat, 1.8);
  if (k === 'lady') for (let i = 1; i < 5; i++) P.line(X(-1.3 * u + i * 0.6 * u), H - 0.15 * u, X(-0.5 * u + i * 0.2 * u), top + 3.3 * u, 1.2, { tone: 0.85 });
  // arms
  P.fill(P.poly([[X(0.5 * u), top + 1.6 * u], [X(0.9 * u), top + 1.7 * u], [X(1.0 * u), top + 4.0 * u], [X(0.6 * u), top + 3.9 * u]]), { tone: 0.85, angle: 75 });
  P.fill(P.ellipse(X(0.8 * u), top + 4.1 * u, 0.2 * u, 0.24 * u), { tone: 0.1 });
  // head and hat
  P.white(P.ellipse(X(0.05 * u), top + 0.9 * u, 0.42 * u, 0.52 * u)); P.stroke(P.ellipse(X(0.05 * u), top + 0.9 * u, 0.42 * u, 0.52 * u), 1.4);
  P.fill(P.ellipse(X(-0.12 * u), top + 1.0 * u, 0.22 * u, 0.36 * u), { tone: 0.55, angle: 80 });
  P.line(X(0.28 * u), top + 0.85 * u, X(0.34 * u), top + 0.85 * u, 1.4);
  if (k === 'gent') { P.fill(P.rect(X(-0.38 * u) - (f < 0 ? 0.76 * u : 0), top - 0.55 * u, 0.76 * u, 0.95 * u), { tone: 0.95 }); P.fill(P.ellipse(X(0.03 * u), top + 0.42 * u, 0.7 * u, 0.12 * u), { tone: 0.95 }); P.fill(P.ellipse(X(0.12 * u), top + 1.32 * u, 0.3 * u, 0.2 * u), { tone: 0.8, angle: 90 }); }
  else if (k === 'lady') { P.fill(P.ellipse(X(0.0 * u), top + 0.35 * u, 0.85 * u, 0.22 * u), { tone: 0.75, angle: 20 }); P.fill(P.blob(X(-0.15 * u), top + 0.1 * u, 0.45 * u, 0.3 * u, 6, 7), { tone: 0.5, angle: 60, wave: 0.3 }); }
  else { P.fill(P.ellipse(X(0.05 * u), top + 0.45 * u, 0.55 * u, 0.22 * u), { tone: 0.85, angle: 0 }); P.fill(P.rect(X(-0.1 * u) - (f < 0 ? 1.1 * u : 0), top + 1.5 * u, 1.1 * u, 1.9 * u), { tone: 0.15, angle: 90 }); }
  return res(P, o, W / ppm, H / ppm, { margin: 4 });
}

/** balloon(o) — a hot-air balloon: gored envelope shaded round, a net, ropes and a wicker basket. o = { h: 16 m, ppm: 30, seed } */
export function balloon(o = {}) {
  const ppm = o.ppm ?? 30, hm = o.h ?? 16, H = hm * ppm, W = hm * 0.72 * ppm, P = new Plate(W, H, { seed: o.seed ?? 31, gap: 3.2 }), cx = W / 2, R = W * 0.47, cy = R + 4;
  const env = P.path(p => { p.moveTo(cx - R * 0.3, cy + R * 1.18); p.bezierCurveTo(cx - R * 1.25, cy + R * 0.55, cx - R * 1.1, cy - R * 1.02, cx, cy - R); p.bezierCurveTo(cx + R * 1.1, cy - R * 1.02, cx + R * 1.25, cy + R * 0.55, cx + R * 0.3, cy + R * 1.18); p.closePath(); });
  P.fill(env, { tone: { cx: cx - R * 0.45, cy: cy - R * 0.45, r: R * 2.1, from: 0.04, to: 0.8 }, angle: 90 });
  for (let i = -3; i <= 3; i++) { const g = P.path(p => { p.moveTo(cx, cy - R); p.bezierCurveTo(cx + i * R * 0.42, cy - R * 0.9, cx + i * R * 0.4, cy + R * 0.6, cx + i * R * 0.1, cy + R * 1.18); }); P.stroke(g, 1.4); }
  for (let k = 1; k < 4; k++) P.stroke(P.ellipse(cx, cy + R * (k * 0.28 - 0.15), R * (1.04 - k * 0.06), R * 0.12), 1.2, { tone: 0.8 });
  P.stroke(env, 2.4);
  const by = H - 1.3 * ppm, bw = 1.6 * ppm;
  for (const s of [-1, 1]) P.line(cx + s * R * 0.3, cy + R * 1.18, cx + s * bw * 0.45, by, 1.3);
  P.fill(P.rect(cx - bw / 2, by, bw, 1.25 * ppm), { tone: 0.55, angle: 90 }); for (let k = 0; k < 4; k++) P.line(cx - bw / 2, by + k * 0.3 * ppm, cx + bw / 2, by + k * 0.3 * ppm, 1.2); P.stroke(P.rect(cx - bw / 2, by, bw, 1.25 * ppm), 2);
  return res(P, o, W / ppm, hm);
}

/** ground(o) — a sheet laid flat on the ground (a floor card). o = { w: 30, d: 20 (m), ppm: 26, kind: 'cobbles' | 'paving' |
 *  'grass' | 'ice' | 'boards', seed, tone } — drawn as seen from above; perspective comes from the camera */
export function ground(o = {}) {
  const ppm = o.ppm ?? 26, wm = o.w ?? 30, dm = o.d ?? 20, W = wm * ppm, H = dm * ppm, r = rng(o.seed ?? 37), k = o.kind || 'paving', t = o.tone ?? 0.18;
  const P = new Plate(W, H, { seed: o.seed ?? 37, gap: o.gap ?? 3.2 });
  P.fill(P.rect(0, 0, W, H), { tone: k === 'cobbles' ? t * 0.5 : t, angle: 0, wave: k === 'ice' ? 0.15 : 0.05 });
  if (k === 'cobbles') for (let y = 0; y < H; y += 0.32 * ppm) for (let x = (y / (0.32 * ppm)) % 2 ? 0.2 * ppm : 0; x < W; x += 0.42 * ppm) { const e = P.ellipse(x, y, 0.18 * ppm, 0.13 * ppm); P.fill(e, { tone: { cx: x - 0.05 * ppm, cy: y - 0.04 * ppm, r: 0.25 * ppm, from: 0.0, to: 0.3 }, angle: 20 }); P.stroke(e, 1.3, { tone: 0.75 }); }
  else if (k === 'paving') { for (let y = 0; y < H; y += 1.1 * ppm) { P.line(0, y, W, y, 1.3, { tone: 0.55 }); for (let x = (y / (1.1 * ppm)) % 2 ? 0.75 * ppm : 0; x < W; x += 1.5 * ppm) P.line(x, y, x, y + 1.1 * ppm, 1.2, { tone: 0.5 }); } }
  else if (k === 'boards') for (let x = 0; x < W; x += 0.22 * ppm) { P.line(x, 0, x, H, 1.3); for (let y = r() * ppm * 3; y < H; y += r.range(2, 4) * ppm) P.line(x, y, x + 0.22 * ppm, y, 1.2); }
  else if (k === 'grass') { const pts = []; for (let i = 0; i < W * H / 260; i++) pts.push([r() * W, r() * H]); P.strokes(pts, { len: 0.18 * ppm, dir: -90, width: 1.3, jit: 0.8 }); }
  else if (k === 'ice') for (let i = 0; i < 24; i++) { let x = r() * W, y = r() * H; const p = new Path2D(); p.moveTo(x, y); for (let j = 0; j < 6; j++) { x += r.range(-1, 1) * ppm * 1.2; y += r.range(-1, 1) * ppm * 0.8; p.lineTo(x, y); } P.stroke(p, 1.3); }
  return res(P, o, wm, dm, { margin: 0, light: false });
}
