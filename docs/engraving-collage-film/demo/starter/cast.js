// 「시계탑 심부름」 cast — designed for this topic (BRIEF.md): Oto, a clockmaker's apprentice, 11, quick and light.
// Teal wool jacket, a mustard scarf that trails behind him (it lags the body: follow-through), brown knee trousers,
// a grey-blue flat cap, a big brass key. Colour is ONLY on him: the world is engraved ink on paper.
// Painters draw facing right; the rig mirrors for facing −1 and keeps the light on the upper left.
import { character, cel, ell, poly, line, eye, capsule } from 'ec/rig.js';

const C = {
  skin: '#f2d2b4', skinShade: '#d9a98c', hair: '#5a3b2a', hairShade: '#432a1e', top: '#3f8c86', topShade: '#2c6a6c',
  scarf: '#e3a63a', scarfShade: '#c07f26', leg: '#6b4c39', legShade: '#523829', shoe: '#3b2b22', cap: '#6f7f93', capShade: '#56637a',
  sleeve: '#3f8c86', line: '#2a1f1d',
};

export const oto = character({
  name: 'Oto', height: 1.38, heads: 5.2, px: 640, mass: 'light', colors: C, sleeves: 'long', legs: 'trousers',
  head(ctx, v) {
    const u = v.u, cy = -0.58 * u, t = v.turn;
    cel(ctx, poly([[-0.12 * u, -0.3 * u], [0.13 * u, -0.3 * u], [0.14 * u, 0.04 * u], [-0.13 * u, 0.04 * u]]), C.skin, C.skinShade);   // the neck, up into the head
    if (v.back) {   // back of the head: hair mass, both ears, the cap
      cel(ctx, ell(-0.44 * u, cy + 0.08 * u, 0.09 * u, 0.13 * u), C.skin, C.skinShade); cel(ctx, ell(0.44 * u, cy + 0.08 * u, 0.09 * u, 0.13 * u), C.skin, C.skinShade);
      cel(ctx, hairBack(u, cy, v.sway), C.hair, C.hairShade); cap(ctx, u, cy, 0, true); return;
    }
    const fx = t * 0.1 * u;                                                     // the face turns toward +x
    // ear on the back side (3/4, side); both in front view
    const ears = t === 0 ? [-0.43, 0.43] : t < 1 ? [-0.3] : [-0.06];
    for (const ex of ears) cel(ctx, ell(ex * u, cy + 0.08 * u, 0.09 * u, 0.13 * u), C.skin, C.skinShade);
    // skull + face
    const face = t === 1 ? poly([[-0.42 * u, cy - 0.1 * u], [-0.3 * u, cy - 0.42 * u], [0.12 * u, cy - 0.5 * u], [0.38 * u, cy - 0.28 * u], [0.42 * u, cy - 0.02 * u], [0.5 * u, cy + 0.1 * u], [0.42 * u, cy + 0.18 * u], [0.38 * u, cy + 0.32 * u], [0.22 * u, cy + 0.46 * u], [0.02 * u, cy + 0.44 * u], [-0.3 * u, cy + 0.3 * u]])
      : faceOval(u, cy, fx, t);
    cel(ctx, face, C.skin, C.skinShade, { k: 6 });
    // eyes: the far eye narrower and nearer the face edge in 3/4; one eye in profile
    const eyes = t === 0 ? [[-0.17, 1], [0.17, 1]] : t < 1 ? [[0.0, 1], [0.27, 0.72]] : [[0.28, 0.62]];
    for (const [ex, w] of eyes) eye(ctx, ex * u + (t === 0 ? 0 : fx * 0.3), cy + 0.06 * u, 0.2 * u, { blink: v.blink, w, look: v.look + (t > 0 ? 0.6 : 0), iris: '#3d2a1e' });
    // nose and mouth
    if (t === 0) line(ctx, [[0.0, cy + 0.17 * u], [0.025 * u, cy + 0.21 * u]], 1.8);
    else if (t < 1) line(ctx, [[0.33 * u, cy + 0.12 * u], [0.37 * u, cy + 0.2 * u], [0.32 * u, cy + 0.22 * u]], 1.8);
    const mx = t === 0 ? 0 : t < 1 ? 0.2 * u : 0.33 * u, my = cy + 0.31 * u, open = v.expr === 'surprise' ? 1 : v.mouth;
    if (open > 0.2) { ctx.fillStyle = '#7a3a34'; ctx.fill(ell(mx, my, 0.06 * u * (t === 1 ? 0.6 : 1), 0.06 * u * open)); }
    else line(ctx, v.expr === 'smile' ? [[mx - 0.08 * u, my - 0.01 * u], [mx, my + 0.03 * u], [mx + 0.07 * u, my - 0.02 * u]] : [[mx - 0.06 * u, my], [mx + 0.05 * u, my]], 1.8);
    ctx.fillStyle = 'rgba(226,128,110,.28)'; for (const ex of (t === 0 ? [-0.24, 0.24] : t < 1 ? [-0.08] : [0.2])) ctx.fill(ell(ex * u + fx * 0.3, cy + 0.22 * u, 0.08 * u, 0.045 * u));
    // hair: a messy brown fringe under the cap, a tuft that lags (sway)
    cel(ctx, hairFront(u, cy, fx, t, v.sway), C.hair, C.hairShade);
    cap(ctx, u, cy, t, false);
  },
  torso(ctx, v) {
    const u = v.u, T = v.torsoLen, t = v.turn, b = v.back;
    const sw = (t === 1 ? 0.24 : t > 0 ? 0.36 : 0.42) * u, hw = (t === 1 ? 0.26 : t > 0 ? 0.33 : 0.36) * u, cx = t === 1 ? 0.05 * u : t > 0 ? 0.04 * u : 0;
    // jacket: shoulders → a hem that covers the top of the trousers
    const j = poly([[cx - sw, -T + 0.12 * u], [cx - sw * 0.5, -T - 0.02 * u], [cx + sw * 0.5, -T - 0.02 * u], [cx + sw + (t === 1 ? 0.05 * u : 0), -T + 0.14 * u], [cx + hw + 0.04 * u, 0.2 * u], [cx - hw, 0.22 * u]]);
    cel(ctx, j, C.top, C.topShade, { k: 7 });
    if (!b) {   // the front opening, buttons and a pocket sit on the face side
      const fx = cx + (t === 1 ? sw * 0.85 : t > 0 ? sw * 0.35 : 0);
      line(ctx, [[fx, -T + 0.1 * u], [fx + (t === 1 ? 0.04 * u : 0), 0.2 * u]], 2);
      for (let k = 0; k < 3; k++) { ctx.fillStyle = '#c9a24c'; ctx.fill(ell(fx - 0.06 * u, -T + (0.4 + k * 0.38) * u, 0.035 * u, 0.035 * u)); }
      if (t < 1) cel(ctx, poly([[fx - 0.3 * u, -0.25 * u], [fx - 0.1 * u, -0.25 * u], [fx - 0.1 * u, -0.05 * u], [fx - 0.3 * u, -0.05 * u]]), C.top, C.topShade, { k: 3 });
    } else line(ctx, [[cx, -T + 0.15 * u], [cx, 0.18 * u]], 1.6);   // the back seam
    // the scarf: a loop at the neck, the tail trailing behind (−x) and swinging late (v.sway)
    cel(ctx, ell(cx + (t === 1 ? 0.04 * u : 0), -T + 0.04 * u, sw * 0.82, 0.13 * u), C.scarf, C.scarfShade);
    const a = (v.sway || 0) * Math.PI / 180, tx = t === 0 ? 0.12 * u : -sw * 0.7, len = (t === 0 ? 0.7 : 0.75) * u;
    const tip = t === 0 ? [tx + Math.sin(a) * len * 0.4, -T + 0.1 * u + len] : [tx - Math.cos(a * 2 + 0.9) * len * 0.75, -T + 0.12 * u + Math.sin(a * 2 + 0.9) * len * 0.85];
    const tail = poly([[tx - 0.08 * u, -T + 0.08 * u], [tx + 0.08 * u, -T + 0.1 * u], [tip[0] + 0.07 * u, tip[1]], [tip[0] - 0.06 * u, tip[1] + 0.02 * u]]);
    if (!(t > 0 && !b)) cel(ctx, tail, C.scarf, C.scarfShade); else { ctx.save(); cel(ctx, tail, C.scarf, C.scarfShade); ctx.restore(); }
    for (let k = 0; k < 3; k++) line(ctx, [[tip[0] - 0.05 * u + k * 0.05 * u, tip[1]], [tip[0] - 0.06 * u + k * 0.05 * u, tip[1] + 0.06 * u]], 1.6);
  },
});

function faceOval(u, cy, fx, t) {
  const p = new Path2D(), rx = 0.43 * u, ry = 0.5 * u;
  p.moveTo(-rx + fx * 0.2, cy - 0.05 * u);
  p.bezierCurveTo(-rx + fx * 0.2, cy - ry * 1.1, rx + fx, cy - ry * 1.1, rx + fx * 0.8, cy - 0.05 * u);
  p.bezierCurveTo(rx + fx * 1.2, cy + 0.25 * u, 0.18 * u + fx * 1.6, cy + ry * 0.95, fx * 1.2, cy + ry * 0.92);
  p.bezierCurveTo(-0.2 * u + fx, cy + ry * 0.9, -rx + fx * 0.2, cy + 0.25 * u, -rx + fx * 0.2, cy - 0.05 * u);
  return p;
}
function hairFront(u, cy, fx, t, sway) {
  const p = new Path2D(), s = (sway || 0) * 0.004 * u;
  if (t === 1) { p.moveTo(-0.46 * u, cy + 0.12 * u); p.lineTo(-0.5 * u, cy - 0.25 * u); p.lineTo(-0.3 * u, cy - 0.5 * u); p.lineTo(0.2 * u, cy - 0.5 * u); p.lineTo(0.38 * u, cy - 0.26 * u); p.lineTo(0.26 * u, cy - 0.18 * u); p.lineTo(0.18 * u, cy - 0.06 * u); p.lineTo(0.08 * u, cy - 0.16 * u); p.lineTo(-0.1 * u, cy - 0.08 * u); p.lineTo(-0.16 * u, cy + 0.04 * u); p.lineTo(-0.3 * u - s, cy + 0.2 * u); p.closePath(); return p; }
  const l = -0.47 * u + fx * 0.2, r = 0.46 * u + fx * 0.9;
  p.moveTo(l, cy + 0.05 * u); p.lineTo(l + 0.02 * u, cy - 0.3 * u); p.lineTo(l + 0.2 * u, cy - 0.5 * u); p.lineTo(r - 0.18 * u, cy - 0.5 * u); p.lineTo(r, cy - 0.28 * u); p.lineTo(r - 0.02 * u, cy - 0.02 * u);
  const n = 5; for (let i = 0; i <= n; i++) { const x = r - (r - l) * i / n; p.lineTo(x - 0.04 * u + s, cy - 0.2 * u + (i % 2 ? 0.08 : -0.02) * u); }
  p.closePath(); return p;
}
function hairBack(u, cy, sway) { const p = new Path2D(), s = (sway || 0) * 0.004 * u; p.moveTo(-0.46 * u, cy + 0.2 * u); p.bezierCurveTo(-0.6 * u, cy - 0.6 * u, 0.6 * u, cy - 0.6 * u, 0.46 * u, cy + 0.2 * u); p.lineTo(0.3 * u + s, cy + 0.42 * u); p.lineTo(0.1 * u, cy + 0.34 * u); p.lineTo(-0.1 * u + s, cy + 0.44 * u); p.lineTo(-0.3 * u, cy + 0.34 * u); p.closePath(); return p; }
function cap(ctx, u, cy, t, back) {
  // a flat cap: crown over the skull, the brim toward the face (+x); in front / back views the brim is an ellipse
  const crown = new Path2D(); crown.ellipse(t === 1 ? -0.04 * u : t * 0.06 * u, cy - 0.36 * u, 0.5 * u, 0.22 * u, t === 1 ? -0.08 : 0, Math.PI, Math.PI * 2.02); crown.closePath();
  cel(ctx, crown, C.cap, C.capShade);
  if (back) { cel(ctx, poly([[-0.5 * u, cy - 0.34 * u], [0.5 * u, cy - 0.34 * u], [0.46 * u, cy - 0.27 * u], [-0.46 * u, cy - 0.27 * u]]), C.cap, C.capShade); return; }
  const brim = t === 0 ? ell(0, cy - 0.33 * u, 0.42 * u, 0.07 * u) : poly([[0.0 * u, cy - 0.38 * u], [0.62 * u * (t === 1 ? 1 : 0.8) + 0.08 * u, cy - 0.33 * u], [0.55 * u * (t === 1 ? 1 : 0.8), cy - 0.25 * u], [0.0, cy - 0.29 * u]]);
  cel(ctx, brim, C.capShade, '#47526a', { k: 2 });
  ctx.fillStyle = '#47526a'; ctx.fill(ell(t * 0.06 * u, cy - 0.57 * u, 0.04 * u, 0.025 * u));
}

/** the brass key Oto carries (held in the near hand: pose.hold = { on: 'foreN', draw: brassKey }) */
export function brassKey(ctx, v) {
  const u = v.u, y = v.L.fore + v.L.hand * 0.2;
  ctx.save(); ctx.translate(0.05 * u, y); ctx.rotate(-0.5);
  cel(ctx, poly([[-0.03 * u, 0], [0.03 * u, 0], [0.03 * u, 0.62 * u], [-0.03 * u, 0.62 * u]]), '#d9a640', '#a87a28', { k: 2 });
  cel(ctx, ell(0, -0.1 * u, 0.12 * u, 0.12 * u), '#d9a640', '#a87a28', { k: 3 }); ctx.fillStyle = '#2a1f1d'; ctx.fill(ell(0, -0.1 * u, 0.05 * u, 0.05 * u));
  cel(ctx, poly([[0.03 * u, 0.48 * u], [0.16 * u, 0.48 * u], [0.16 * u, 0.56 * u], [0.03 * u, 0.56 * u]]), '#d9a640', '#a87a28', { k: 2 });
  ctx.restore();
}

export const cast = { oto };
