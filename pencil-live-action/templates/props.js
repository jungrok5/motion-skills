// 「The Apple」 — props for this topic: the drawn umbrella (her way down) and the drawn apple (what turns real).
// Drawn in mm, y down. The real apple is a Poly Haven scan (food_apple_01, CC0), fetched by scripts/fetch-assets.mjs.
import { P } from 'pla/film.js';
const { part, line, hand, curve, arc, hatch } = P;
const W = (pts, o = {}) => line(hand(pts, o.amp ?? .35, o.seed ?? 1, o.over ?? .8), { w: o.w ?? 2, passes: o.passes ?? 2, a: o.a ?? .92, seed: o.seed });

/** the umbrella, origin = where her hand grips the handle; open = 0 (furled) … 1 (open) — same stroke count at every value */
export function umbrella(open = 1) {
  const R = 30 * (.25 + .75 * open), top = -46, rim = top + 14 * (.4 + .6 * open), n = 4, canopy = [];
  for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI; canopy.push([Math.cos(a) * R, top + 14 * (1 - open * .2) + Math.sin(a) * 16 * (.5 + .5 * open)]); }
  const scallop = []; for (let i = 0; i < n; i++) { const x0 = -R + i * 2 * R / n, x1 = x0 + 2 * R / n; scallop.push(...curve([[x0, rim], [(x0 + x1) / 2, rim - 4 * open], [x1, rim]], 4).slice(i ? 1 : 0)); }
  const shape = [...canopy, ...scallop.slice().reverse()];
  return [
    part([W(curve(canopy, 4), { seed: 1, w: 2.1 }), W(scallop, { seed: 2, w: 1.6 })], shape),
    part([W([[0, top - 3], [0, 4]], { seed: 3, w: 1.5 }), W(arc(-4, 4, 4, 4, 0, Math.PI, 8), { seed: 4, w: 1.5, over: 0 }), ...[-1, 1].map((s, i) => W(curve([[0, top + 1], [s * R * .45, top + 4], [s * R * .55, rim]], 4), { seed: 5 + i, w: 1, a: .6, passes: 1 }))]),
  ];
}
/** the apple, origin = the bottom centre where it sits on the ground (the scan's own size: ~98 mm wide, 85 mm tall) */
export function apple() {
  const body = curve([[0, -76], [24, -86], [46, -66], [48, -34], [34, -6], [12, 0], [0, -4], [-12, 0], [-34, -6], [-48, -34], [-46, -66], [-24, -86], [0, -76]], 5, true);
  return [
    part([W(body, { seed: 11, w: 2.4, over: 1.5 })], body),
    part(hatch(curve([[22, -70], [42, -50], [40, -22], [24, -8], [30, -40]], 4, true), { gap: 3.4, angle: .9, a: .4, w: 1 })),
    part([W(curve([[0, -76], [2, -86], [6, -96]], 4), { seed: 12, w: 2 }), W(curve([[3, -88], [16, -98], [26, -92], [12, -86], [3, -88]], 4), { seed: 13, w: 1.6 })]),
  ];
}
