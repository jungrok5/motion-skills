// 「얼음 항해」 world — designed for this topic (BRIEF.md): pack ice, a three-master frozen in, icebergs, a far range,
// an open lead of black water, and the same floe at night under an aurora. The kit gives the ship, clouds and the ice
// sheet; the icebergs, the mountains, the lead and the aurora sky are drawn here with Plate calls — new subjects in the
// same engraving language (light from the upper left, lit faces in sparse vertical lines, shade in dense crossing lines).
import { Plate } from 'ec/engrave.js';
import { ship, cloud, ground, sky } from 'ec/kit.js';
import { rng } from 'ec/core.js';

const done = (P, ppm, o = {}) => { const r = P.done({ margin: o.margin ?? 4, ...o }); r.m = [r.w / ppm, r.h / ppm]; r.base = r.pad; return r; };

/** an iceberg: a jagged block split into lit and shaded facets, a snow cap, a dark waterline */
function iceberg(o = {}) {
  const ppm = o.ppm ?? 40, wm = o.w ?? 14, hm = o.h ?? 9, W = wm * ppm, H = hm * ppm, r = rng(o.seed ?? 3);
  const P = new Plate(W, H, { seed: o.seed ?? 3, gap: 3.6 }), n = 9, top = [];
  for (let i = 0; i <= n; i++) { const x = W * i / n, edge = Math.min(i, n - i) / (n / 2); top.push([x, H * (0.95 - 0.85 * Math.pow(edge, 0.7) * r.range(0.75, 1.05))]); }
  const sil = P.poly([[0, H], ...top, [W, H]]); P.fill(sil, { tone: 0.08, angle: 90 });
  // facets: from each crest point a fold line down; faces to the right of a peak are in shade
  for (let i = 1; i < n; i++) {
    const [x, y] = top[i], [x2, y2] = top[i + 1], peak = y < top[i - 1][1] && y <= y2;
    const face = P.poly([[x, y], [x2, y2], [x2 - W * 0.02, H], [x + W * r.range(0.0, 0.05), H]]);
    if (peak || r() < 0.45) P.fill(face, { tone: { from: 0.42, to: 0.75, x0: 0, y0: y, x1: 0, y1: H }, angle: 82 + r.range(-6, 6), gap: 3.2 });
    P.line(x, y, x + W * r.range(-0.03, 0.05), H * r.range(0.7, 1), 1.6);
  }
  // snow on the crests
  for (let i = 0; i < n; i++) { const [x, y] = top[i], [x2, y2] = top[i + 1]; P.white(P.poly([[x, y], [x2, y2], [x2, y2 + H * 0.05], [x, y + H * 0.07]])); }
  P.fill(P.rect(0, H * 0.9, W, H * 0.1), { tone: { from: 0.55, to: 0.9, x0: 0, y0: H * 0.9, x1: 0, y1: H }, angle: 0, wave: 0.4 });
  P.stroke(sil, 2.4);
  return done(P, ppm);
}
/** a far range: peaks with snow slopes left white and shade sides hatched diagonally */
function mountains(o = {}) {
  const ppm = o.ppm ?? 10, wm = o.w ?? 260, hm = o.h ?? 40, W = wm * ppm, H = hm * ppm, r = rng(o.seed ?? 7);
  const P = new Plate(W, H, { seed: o.seed ?? 7, gap: 2.6 }), peaks = [];
  let x = -W * 0.05; while (x < W * 1.05) { peaks.push([x, H * r.range(0.1, 0.6)]); x += W * r.range(0.07, 0.14); }
  const ridge = [[0, H], ...peaks.flatMap(([px, py], i) => { const nx = peaks[i + 1]?.[0] ?? W; return [[px, py], [(px + nx) / 2, H * r.range(0.55, 0.8)]]; }), [W, H]];
  P.fill(P.poly(ridge), { tone: 0.06, angle: 0 });
  peaks.forEach(([px, py], i) => {
    const nx = peaks[i + 1]?.[0] ?? W, mid = (px + nx) / 2;
    P.fill(P.poly([[px, py], [mid, H * 0.7], [mid + (nx - px) * 0.1, H], [px + (nx - px) * 0.15, H]]), { tone: { from: 0.4, to: 0.65, x0: 0, y0: py, x1: 0, y1: H }, angle: 60, gap: 2.4 });
    P.line(px, py, px + (nx - px) * 0.14, H, 1.3);
  });
  P.stroke(P.poly(ridge, false), 1.6);
  return done(P, ppm, { margin: 2 });
}
/** an open lead: a strip of black water in the ice, laid flat */
function lead(o = {}) {
  const ppm = o.ppm ?? 30, wm = o.w ?? 30, dm = o.d ?? 2.2, W = wm * ppm, H = dm * ppm, r = rng(o.seed ?? 5);
  const P = new Plate(W, H, { seed: o.seed ?? 5, gap: 3, wave: 0.7 });
  const sh = P.path(p => { p.moveTo(0, H * 0.2); for (let x = 0; x <= W; x += W / 30) p.lineTo(x, H * (0.12 + 0.12 * r())); p.lineTo(W, H * 0.8); for (let x = W; x >= 0; x -= W / 30) p.lineTo(x, H * (0.78 + 0.12 * r())); p.closePath(); });
  P.fill(sh, { tone: 0.82, angle: 0 }); P.stroke(sh, 2.4);
  for (let i = 0; i < 14; i++) { const x = r() * W, y = H * r.range(0.3, 0.7); P.white(P.ellipse(x, y, W * 0.012, H * 0.02)); }
  return done(P, ppm, { margin: 0, light: false });
}
/** the night sky with the aurora: a dark line-screen sky, white curtains with vertical streaks, star points */
function auroraSky(o = {}) {
  const ppm = o.ppm ?? 7, wm = o.w ?? 300, hm = o.h ?? 130, W = wm * ppm, H = hm * ppm, r = rng(o.seed ?? 9);
  const P = new Plate(W, H, { seed: o.seed ?? 9, gap: 2.6, angle: 1.5, wave: 0.3 });
  P.fill(P.rect(0, 0, W, H), { tone: { x0: 0, y0: 0, x1: 0, y1: H, stops: [[0, 0.86], [0.7, 0.66], [1, 0.4]] } });
  for (let k = 0; k < 3; k++) {
    const y0 = H * (0.2 + k * 0.13), amp = H * 0.06, ph = r() * 6;
    const curtain = P.path(p => { p.moveTo(0, y0); for (let x = 0; x <= W; x += W / 60) p.lineTo(x, y0 + Math.sin(x / W * 9 + ph) * amp); for (let x = W; x >= 0; x -= W / 60) p.lineTo(x, y0 + Math.sin(x / W * 9 + ph) * amp + H * (0.1 + 0.05 * Math.sin(x / W * 5 + k))); p.closePath(); });
    P.fill(curtain, { tone: { x0: 0, y0: y0 - amp, x1: 0, y1: y0 + amp + H * 0.15, from: 0.04, to: 0.45 }, angle: 90, wave: 0.25, gap: 2.4 });
  }
  for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * H * 0.75, s = r.range(1.2, 3.2); P.white(P.ellipse(x, y, s, s)); }
  return done(P, ppm, { margin: 0, light: false, blur: 2 });
}

const skyRing = (S, r, plateFn, seed) => S.ring([0, 1, 2, 3].map(i => plateFn({ seed: seed + i, w: 300 })), { r, y: -8, span: 170 });
function floe(S, night) {
  S.floor(ground({ w: 80, d: 70, kind: 'ice', ppm: 18, seed: 41, tone: night ? 0.2 : 0.06 }), { at: [0, 0, -20] });
  skyRing(S, 185, night ? auroraSky : (o) => sky({ ...o, tone: 0.2, clouds: 6 }), night ? 90 : 20);
  S.card(mountains({ seed: 7 }), { at: [10, -1, -150], layer: 'far', shadow: false, haze: night ? 0.3 : 1 });
  const bergs = [[-22, -48, 30, 16, 11, 3], [18, -40, -20, 20, 12, 4], [-6, -70, 5, 26, 16, 5], [34, -66, -30, 18, 10, 6], [-40, -30, 45, 12, 8, 8]];
  for (const [x, z, rot, w, h, seed] of bergs) S.card(iceberg({ w, h, seed }), { at: [x, -0.4, z], rot, layer: 'bergs' });
  const sh = S.card(ship({ len: 26, ppm: 44, seed: 17, sails: 'furled' }), { at: [-15, -2.6, -30], rot: 22, roll: -3, layer: 'ship', name: 'ship' });
  for (const [x, z, s] of [[-12, -4, 1], [9, -9, 2], [3, -20, 3], [-3, -2, 4]]) S.card(iceberg({ w: 3.2, h: 1.1, seed: 60 + s, ppm: 70 }), { at: [x, -0.15, z], rot: s * 17, layer: 'near' });
  return sh;
}

export const sets = {
  // 1 · the floe by day: the ship locked in, bergs standing off, the range on the horizon
  floe: {
    haze: [25, 170, 0.55],
    build(S) {
      floe(S, false);
      for (const [x, y, z, s] of [[-30, 22, -120, 11], [26, 30, -130, 12]]) S.drift(S.card(cloud({ w: 40, h: 11, seed: s }), { at: [x, y, z], layer: 'sky', shadow: false, haze: 0.3 }), [0.6, 0, 0]);
    },
  },
  // 2 · the open lead: black water across the ice, a berg rising out of the floe as she comes
  lead: {
    haze: [22, 150, 0.5],
    build(S) {
      floe(S, false);
      S.floor(lead({ w: 40, d: 1.3, seed: 5 }), { at: [0, 0.01, -3] });   // a lead a child can clear (~1.3 m)
      const b = S.card(iceberg({ w: 9, h: 6, seed: 19, ppm: 50 }), { at: [7, -0.3, -12], rot: -25, layer: 'bergs', name: 'riser' });
      S.rise(b, 6.6, 1.0);
    },
  },
  // 3 · the same floe at night under the aurora
  night: {
    haze: [25, 170, 0.18],
    build(S) { floe(S, true); },
  },
};
