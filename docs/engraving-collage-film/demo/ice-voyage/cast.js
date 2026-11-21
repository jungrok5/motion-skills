// 「얼음 항해」 cast — designed for this topic (BRIEF.md): Nell, 10, the ship's cook's daughter, wiry and quick.
// A cobalt parka with the hood up and a cream fur ring round her face, a long hem over grey wool trousers, yellow
// mittens, dark sealskin boots; two red-brown braids that hang out of the hood and swing late (follow-through).
// Painters draw facing right; the rig mirrors for facing −1 and keeps the light on the upper left.
import { character, cel, ell, poly, line, eye } from 'ec/rig.js';

const C = {
  skin: '#f4d6bd', skinShade: '#ddb093', top: '#3b5ea8', topShade: '#2a4583', fur: '#efe6d2', furShade: '#cfc2a6',
  braid: '#8a3f2a', braidShade: '#6b2d1d', leg: '#7c7f86', legShade: '#5f626b', shoe: '#3a2c26', mitt: '#e9c13b', mittShade: '#c39a22',
  sleeve: '#3b5ea8', line: '#241c22',
};

export const nell = character({
  name: 'Nell', height: 1.32, heads: 4.8, px: 640, mass: 'light', sleeves: 'long', legs: 'trousers',
  colors: { ...C, hand: C.mitt, handShade: C.mittShade },
  lengths: { limbW: 0.19 * 640 / 4.8 },
  head(ctx, v) {
    const u = v.u, cy = -0.6 * u, t = v.turn, sw = (v.sway || 0);
    // braids first (behind the hood in profile / back; over the chest in front and 3/4)
    const braid = (x0, side) => {
      const a = (sw * 0.8 * (t === 0 ? 0.3 : 1)) * Math.PI / 180, len = 0.95 * u, bx = x0 - Math.sin(a) * len * (t === 0 ? 0.2 : 0.7), by = cy + 0.3 * u + Math.cos(a) * len;
      const p = poly([[x0 - 0.07 * u, cy + 0.3 * u], [x0 + 0.07 * u, cy + 0.3 * u], [bx + 0.06 * u, by], [bx - 0.06 * u, by]]);
      cel(ctx, p, C.braid, C.braidShade);
      for (let k = 1; k < 5; k++) { const yy = cy + 0.3 * u + (by - cy - 0.3 * u) * k / 5, xx = x0 + (bx - x0) * k / 5; line(ctx, [[xx - 0.06 * u, yy - 0.03 * u], [xx + 0.06 * u, yy + 0.03 * u]], 1.4); }
      cel(ctx, ell(bx, by + 0.03 * u, 0.06 * u, 0.04 * u), C.mitt, C.mittShade, { k: 2 });   // yellow ties
    };
    if (t === 1) braid(-0.3 * u, 0);
    if (v.back) { braid(-0.22 * u, -1); braid(0.22 * u, 1); }
    // the hood: a big rounded shape around the head
    const hx = t === 1 ? -0.08 * u : t * 0.02 * u;
    const hood = new Path2D(); hood.ellipse(hx, cy - 0.02 * u, 0.6 * u, 0.62 * u, 0, 0, Math.PI * 2);
    cel(ctx, hood, C.top, C.topShade, { k: 7 });
    if (v.back) { line(ctx, [[hx, cy - 0.6 * u], [hx, cy + 0.55 * u]], 1.6); return; }
    // the opening with its fur ring, turned toward +x by the view
    const fx = t === 0 ? 0 : t < 1 ? 0.13 * u : 0.3 * u, frx = t === 1 ? 0.3 * u : t > 0 ? 0.46 * u : 0.5 * u, fry = 0.54 * u;
    const ring = new Path2D(); ring.ellipse(fx, cy + 0.02 * u, frx, fry, 0, 0, Math.PI * 2);
    cel(ctx, ring, C.fur, C.furShade, { k: 4 });
    for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; line(ctx, [[fx + Math.cos(a) * frx * 0.98, cy + 0.02 * u + Math.sin(a) * fry * 0.98], [fx + Math.cos(a) * frx * 1.07, cy + 0.02 * u + Math.sin(a) * fry * 1.07]], 1.3); }
    // the face inside the ring
    const face = new Path2D(); face.ellipse(fx + (t === 1 ? 0.04 * u : t * 0.03 * u), cy + 0.06 * u, frx * 0.76, fry * 0.78, 0, 0, Math.PI * 2);
    cel(ctx, face, C.skin, C.skinShade, { k: 5 });
    // a fringe of hair under the hood's edge
    const fr = new Path2D(); fr.ellipse(fx + (t === 1 ? 0.04 * u : 0), cy - 0.24 * u, frx * 0.7, 0.16 * u, 0, Math.PI, Math.PI * 2); fr.closePath(); cel(ctx, fr, C.braid, C.braidShade, { k: 2 });
    const eyes = t === 0 ? [[-0.15, 1], [0.15, 1]] : t < 1 ? [[0.07, 1], [0.3, 0.7]] : [[0.36, 0.6]];
    for (const [ex, w] of eyes) eye(ctx, ex * u + (t === 0 ? 0 : 0), cy + 0.06 * u, 0.19 * u, { blink: v.blink, w, look: v.look + (t > 0 ? 0.6 : 0), iris: '#3b2a1c' });
    const mx = t === 0 ? 0 : t < 1 ? 0.24 * u : 0.42 * u, my = cy + 0.3 * u, open = v.expr === 'surprise' ? 1 : v.mouth;
    if (t > 0) line(ctx, [[mx + 0.1 * u, cy + 0.13 * u], [mx + 0.14 * u, cy + 0.2 * u], [mx + 0.09 * u, cy + 0.21 * u]], 1.6);
    else line(ctx, [[0, cy + 0.17 * u], [0.02 * u, cy + 0.2 * u]], 1.6);
    if (open > 0.2) { ctx.fillStyle = '#7a3438'; ctx.fill(ell(mx, my, 0.055 * u * (t === 1 ? 0.6 : 1), 0.06 * u * open)); }
    else line(ctx, v.expr === 'smile' ? [[mx - 0.07 * u, my - 0.01 * u], [mx, my + 0.03 * u], [mx + 0.07 * u, my - 0.02 * u]] : [[mx - 0.05 * u, my], [mx + 0.05 * u, my]], 1.7);
    ctx.fillStyle = 'rgba(232,120,110,.35)'; for (const ex of (t === 0 ? [-0.22, 0.22] : t < 1 ? [0.0] : [0.26])) ctx.fill(ell(ex * u, cy + 0.2 * u, 0.08 * u, 0.045 * u));
    if (t < 1) { braid(fx - frx * 0.55, -1); if (t === 0) braid(fx + frx * 0.55, 1); }
  },
  torso(ctx, v) {
    const u = v.u, T = v.torsoLen, t = v.turn, b = v.back;
    const sw = (t === 1 ? 0.27 : t > 0 ? 0.4 : 0.46) * u, hw = (t === 1 ? 0.36 : t > 0 ? 0.48 : 0.52) * u, cx = t === 1 ? 0.04 * u : 0;
    // the parka: puffy shoulders, flaring to a hem below the hip
    const p = poly([[cx - sw, -T + 0.16 * u], [cx - sw * 0.6, -T - 0.04 * u], [cx + sw * 0.6, -T - 0.04 * u], [cx + sw + (t === 1 ? 0.06 * u : 0), -T + 0.18 * u], [cx + hw + 0.04 * u, 0.62 * u], [cx - hw, 0.64 * u]]);
    cel(ctx, p, C.top, C.topShade, { k: 8 });
    cel(ctx, poly([[cx - hw - 0.02 * u, 0.5 * u], [cx + hw + 0.06 * u, 0.48 * u], [cx + hw + 0.06 * u, 0.64 * u], [cx - hw - 0.02 * u, 0.66 * u]]), C.fur, C.furShade, { k: 3 });   // fur hem
    if (!b) {
      const fx = cx + (t === 1 ? sw * 0.8 : t > 0 ? sw * 0.3 : 0);
      line(ctx, [[fx, -T + 0.12 * u], [fx + (t === 1 ? 0.08 * u : 0), 0.5 * u]], 2);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = '#2a4583'; ctx.fill(ell(fx + 0.05 * u, -T + (0.35 + k * 0.32) * u, 0.05 * u, 0.025 * u)); line(ctx, [[fx - 0.02 * u, -T + (0.35 + k * 0.32) * u], [fx + 0.1 * u, -T + (0.35 + k * 0.32) * u]], 1.4); }
      if (t < 1) cel(ctx, poly([[fx - 0.36 * u, 0.08 * u], [fx - 0.12 * u, 0.08 * u], [fx - 0.12 * u, 0.3 * u], [fx - 0.36 * u, 0.3 * u]]), C.top, C.topShade, { k: 3 });
    } else line(ctx, [[cx, -T + 0.1 * u], [cx, 0.5 * u]], 1.6);
  },
});
export const cast = { nell };
