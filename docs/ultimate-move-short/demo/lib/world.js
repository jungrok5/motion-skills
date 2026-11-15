// ultimate-move-short · world.js — the empty white world: a pale sky, a paper-white ground that runs to a soft horizon,
// faint ruins / pillars / trees dissolving in the haze, marks on the ground that give it scale and speed, and the cracks
// and ink rings that stay on it. Everything is seeded and placed in world metres, so cameras orbit it consistently.
//
//   const E = env({ seed: 4, far: 'pillars' | 'city' | 'trees' | 'stones' | 'none', sky: '#d9dbdd', ground: '#efeeea' })
//   drawEnv(ctx, v, E, { dark: 0…1 (the world going black), whiteout: 0…1, groundMarks: true })
//   groundCrack(seed, from:[x,z], angle, len, o) → a crack (branches) to draw with drawCrack(ctx, v, crack, grow)
import { clamp, lerp, hash, noise2, sn, mix, rgba, v3, TAU } from './core.js';
import { brush } from './ink.js';

export const ENV = { seed: 4, far: 'pillars', sky: '#d6d8da', skyTop: '#c9ccce', horizon: '#ecebe8', ground: '#f2f1ed', groundFar: '#dedcd8', haze: .7, marks: 1, farDist: 140 };

const sprites = new Map();
// a hazy distant shape, pre-blurred once: kind pillars (broken columns), city (blocks), trees, stones
function farSprite(kind, seed) {
  const key = kind + seed; if (sprites.has(key)) return sprites.get(key);
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
  x.filter = 'blur(5px)'; x.fillStyle = '#000';
  const h = k => hash(seed, k);
  if (kind === 'pillars') { const w = 26 + h(1) * 30, top = 40 + h(2) * 120; x.beginPath(); x.moveTo(128 - w / 2, 256); x.lineTo(128 - w / 2 + h(3) * 6, top + h(4) * 20); x.lineTo(128 - w * .1, top); x.lineTo(128 + w * .2, top + 14 + h(5) * 30); x.lineTo(128 + w / 2, top + 8); x.lineTo(128 + w / 2 - h(6) * 4, 256); x.fill(); if (h(7) > .5) x.fillRect(128 - w * .8, top - 6, w * 1.6, 10); }
  else if (kind === 'city') { for (let i = 0; i < 4; i++) { const w = 20 + h(i + 10) * 40, hh = 40 + h(i + 20) * 150, ox = 40 + h(i + 30) * 170; x.fillRect(ox - w / 2, 256 - hh, w, hh); } }
  else if (kind === 'trees') { for (let i = 0; i < 3; i++) { const ox = 70 + h(i + 40) * 110, hh = 90 + h(i + 50) * 130; x.beginPath(); x.moveTo(ox - 5, 256); x.lineTo(ox, 256 - hh); x.lineTo(ox + 5, 256); x.fill(); for (let k = 0; k < 6; k++) { x.beginPath(); x.ellipse(ox + (h(i * 9 + k) - .5) * 40, 256 - hh * (.5 + k * .08), 26 - k * 3, 12, 0, 0, TAU); x.fill(); } } }
  else { x.beginPath(); x.ellipse(128, 236, 70 + h(1) * 40, 30 + h(2) * 40, 0, Math.PI, TAU); x.fill(); }
  sprites.set(key, c); return c;
}

export function env(o = {}) {
  const E = { ...ENV, ...o }, R = k => hash(E.seed * 17, k);
  E.fars = [];
  if (E.far !== 'none') for (let i = 0; i < 46; i++) {
    const a = R(i) * TAU, d = E.farDist * (.55 + R(i + 100) * .9), h = (E.far === 'trees' ? 4 : 6) + R(i + 200) * (E.far === 'trees' ? 12 : 22);
    E.fars.push({ p: [Math.cos(a) * d, 0, Math.sin(a) * d], h, w: h * (.8 + R(i + 300) * .8), seed: E.seed * 100 + i, tone: .25 + R(i + 400) * .35 });
  }
  E.cracks = [];          // permanent cracks (add with E.cracks.push(groundCrack(...)) + t0)
  return E;
}

// sky, haze, far shapes, ground with marks. o.dark: 0…1 blend toward a black void (domain), o.tint: sky override
export function drawEnv(ctx, v, E, o = {}) {
  const W = v.W, H = v.H, dark = clamp(o.dark || 0), hz = v.horizon();
  const sky = mix(E.sky, '#060607', dark), skyTop = mix(E.skyTop, '#020203', dark), hcol = mix(E.horizon, '#121214', dark);
  // sky gradient (vertical in screen space, tilted with the horizon)
  const hy = hz ? (hz[0] + hz[1]) / 2 : (v.f[1] < 0 ? -H * 2 : H * 3);
  const g = ctx.createLinearGradient(0, Math.min(hy - H * 1.2, -H * .2), 0, hy);
  g.addColorStop(0, skyTop); g.addColorStop(.75, sky); g.addColorStop(1, hcol);
  ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 3);
  if (!hz) { if (v.f[1] < 0) groundFill(ctx, v, E, null, dark, o); return; }
  // far shapes: hazy silhouettes standing on the horizon
  if (E.fars.length && dark < 1 && !o.noFar) {
    ctx.save(); ctx.globalAlpha = (1 - dark) * (o.farA ?? 1);
    for (const f of E.fars) {
      const p = v3.add(f.p, [v.pos[0], 0, v.pos[2]]);      // they keep their distance from the camera (very far)
      const b = v.p(p); if (!b || b[2] < 1) continue;
      const k = v.k(b[2]), hh = f.h * k, ww = f.w * k; if (hh < 2) continue;
      ctx.globalAlpha = (1 - dark) * f.tone * (E.far === 'trees' ? .22 : .32) * (o.farA ?? 1);
      ctx.drawImage(farSprite(E.far, f.seed), b[0] - ww / 2, b[1] - hh * .98, ww, hh);
    }
    ctx.restore();
  }
  groundFill(ctx, v, E, hz, dark, o);
}

function groundFill(ctx, v, E, hz, dark, o) {
  const W = v.W, H = v.H;
  ctx.save();
  if (hz) { ctx.beginPath(); ctx.moveTo(-W, hz[0] + (hz[0] - hz[1]) * 1); ctx.lineTo(0, hz[0]); ctx.lineTo(W, hz[1]); ctx.lineTo(W * 2, hz[1] + (hz[1] - hz[0])); ctx.lineTo(W * 2, H * 3); ctx.lineTo(-W, H * 3); ctx.closePath(); ctx.clip(); }
  const hy = hz ? Math.min(hz[0], hz[1]) : -H;
  const g = ctx.createLinearGradient(0, hy, 0, H);
  g.addColorStop(0, mix(E.groundFar, '#0b0b0c', dark)); g.addColorStop(.12, mix(E.ground, '#0d0d0e', dark)); g.addColorStop(1, mix('#f7f6f2', '#101012', dark));
  ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 4);
  // ground marks: faint grey dashes lying on the plane in a world grid around the camera (stable as it moves)
  if (E.marks && o.groundMarks !== false && dark < .95) {
    const cx = Math.floor(v.pos[0] / 2), cz = Math.floor(v.pos[2] / 2), R = 18;
    ctx.fillStyle = mix('#9c9b97', '#2a2a2c', dark);
    for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
      const gx = cx + i, gz = cz + j, h = k => hash(gx * 7919 + E.seed, gz * 104729 + k);
      if (h(0) > .8) continue;
      const x = gx * 2 + h(1) * 2, z = gz * 2 + h(2) * 2, len = .06 + h(3) ** 3 * 1.1, a = (h(4) - .5) * .6;
      const A = v.p([x, 0, z]), B = v.p([x + Math.cos(a) * len, 0, z + Math.sin(a) * len]); if (!A || !B || A[2] < .3) continue;
      const th = Math.max(.4, .03 * v.k(A[2]) * (.3 + h(5)));
      ctx.globalAlpha = (.05 + h(6) * .12) * E.marks * clamp(30 / A[2], 0, 1);
      ctx.beginPath(); ctx.moveTo(A[0], A[1] - th / 2); ctx.lineTo(B[0], B[1] - th * .3); ctx.lineTo(B[0], B[1] + th * .3); ctx.lineTo(A[0], A[1] + th / 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // a soft white haze lying on the horizon
  if (hz && dark < 1) {
    const hg = ctx.createLinearGradient(0, hy - H * .05, 0, hy + H * .12);
    hg.addColorStop(0, rgba('#f4f3f0', 0)); hg.addColorStop(.35, rgba('#f4f3f0', E.haze * (1 - dark))); hg.addColorStop(1, rgba('#f4f3f0', 0));
    ctx.restore(); ctx.save(); ctx.fillStyle = hg; ctx.fillRect(-W, hy - H * .06, W * 3, H * .2);
  }
  ctx.restore();
}

// ---------- cracks in the ground ----------
// a crack: a jagged polyline on the ground with side branches. Returns { segs: [{pts:[[x,0,z]…], w, u0}] } where u0 is
// when that piece starts growing (0…1 of the crack's own growth)
export function groundCrack(seed, from, angle, len, o = {}) {
  const segs = [], R = k => hash(seed * 13, k);
  const walk = (p, a, L, w, u0, depth, id) => {
    const pts = [[p[0], 0.002, p[1]]], n = Math.max(3, Math.round(L / .35));
    let x = p[0], z = p[1], ang = a;
    for (let i = 1; i <= n; i++) {
      ang += (R(id * 50 + i) - .5) * .7; const step = L / n;
      x += Math.cos(ang) * step; z += Math.sin(ang) * step; pts.push([x, 0.002, z]);
      if (depth < 2 && R(id * 50 + i + 500) < (o.branch ?? .22)) walk([x, z], ang + (R(id * 50 + i + 900) > .5 ? 1 : -1) * (.5 + R(id + i) * .8), L * (.25 + R(id * 7 + i) * .35), w * .55, u0 + (1 - u0) * i / n * .8, depth + 1, id * 3 + i);
    }
    segs.push({ pts, w, u0 });
  };
  walk(from, angle, len, o.w ?? .08, 0, 0, 1);
  return { segs, seed };
}
export function drawCrack(ctx, v, cr, grow = 1, o = {}) {
  for (const s of cr.segs) {
    const g = clamp((grow - s.u0) / (1 - s.u0 + 1e-6)); if (g <= 0) continue;
    const n = Math.max(2, Math.ceil(s.pts.length * g)), pts = s.pts.slice(0, n), P = [], Wd = [];
    for (let i = 0; i < pts.length; i++) { const q = v.p(pts[i]); if (!q) continue; P.push([q[0], q[1]]); Wd.push(Math.max(.5, s.w * .7 * v.k(q[2]) * (1 - i / s.pts.length * .75))); }
    if (P.length > 1) brush(ctx, P, Wd, { seed: cr.seed + s.u0 * 100, dry: .2, splatter: .15, hairs: false, taper: .5, alpha: o.alpha ?? 1, col: o.col });
  }
}
// an ink ring lying on the ground (a landing): radius grows; drawn as a broken brush circle seen in perspective
export function groundRing(ctx, v, c, r, w, o = {}) {
  const n = 48, pts = [], ws = [], a0 = o.a0 ?? 0, span = o.span ?? TAU;
  for (let i = 0; i <= n; i++) { const a = a0 + span * i / n, p = v.p([c[0] + Math.cos(a) * r, .003, c[2] + Math.sin(a) * r]); if (!p) continue; pts.push([p[0], p[1]]); ws.push(w * v.k(p[2]) * (.5 + .5 * noise2(i * .3, o.seed || 1))); }
  if (pts.length > 2) brush(ctx, pts, ws, { seed: o.seed || 5, dry: o.dry ?? .5, splatter: .6, alpha: o.alpha ?? 1, taper: .2 });
}
