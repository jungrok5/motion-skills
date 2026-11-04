// 「The Runaway Umbrella」 · umbrella.js — the hero's umbrella, a prop designed for this topic (not part of the skill's kit).
// umbrella(ctx, x, y, o): (x, y) = the grip of the handle; o: { ang (0 = shaft straight up), open (0 folded … 1 open),
// inv (0…1 blown inside-out), s (scale, 1 → ~430 px across open, the shaft 235 px), col, flutter (a time) }. Returns the canopy tip { x, y }.
import * as S from 'scs/sketch.js';

export function umbrella(ctx, x, y, o = {}) {
  const s = o.s ?? 1, ang = o.ang ?? 0, op = S.clamp(o.open ?? 1), inv = S.clamp(o.inv ?? 0), col = o.col || '#c58a7d', w = 2.4 / Math.pow(s, .4);
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  const shaft = 235, top = -shaft, span = 40 + op * 175, drop = 26 + op * 70 - inv * (60 + op * 120), ribs = 6;
  // the hooked handle at the grip, the shaft up to the tip
  S.line(ctx, [[0, -40], [0, 4], [-4, 26], [-22, 34], [-36, 22]], { w: w * 2.2, col: '#5a3d2c' });
  S.line(ctx, [[0, -30], [0, top - 26]], { w: w * 1.4 });
  // canopy: an arc from rim to rim through the crown; scallops between ribs; flutter on the rim
  const fl = o.flutter != null ? o.flutter : 0, rimY = top + drop, crownY = top - 8 - inv * 40;
  const rim = []; for (let i = 0; i <= ribs; i++) { const u = i / ribs, xx = (u - .5) * 2 * span; rim.push([xx, rimY - Math.sin(u * Math.PI) * drop * .15 + S.n1(fl * 6 + i, 3) * 6 * op]); }
  const crown = []; for (let i = 0; i <= 16; i++) { const u = i / 16, xx = (u - .5) * 2 * span; crown.push([xx, rimY + (crownY - rimY) * Math.sin(u * Math.PI) ** (.6 + inv)]); }
  const scal = []; for (let i = ribs; i > 0; i--) { const a = rim[i], b = rim[i - 1]; scal.push(a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 14 * op * (1 - inv * 1.6)]); } scal.push(rim[0]);
  const canopy = [...crown, ...scal];
  S.shape(ctx, canopy, { fill: col, shade: S.tone(col, -.22), light: [-span * .25, -20], w, tex: .6, sharp: true });
  S.strokes(ctx, rim.slice(1, -1).map((p, i) => [[0, crownY], [p[0] * .5, (crownY + p[1]) / 2 - 6], p]), { w: w * .9 });
  S.line(ctx, [[0, crownY], [0, crownY - 22]], { w: w * 1.3 });            // the ferrule
  ctx.restore();
  const c = Math.cos(ang), sn = Math.sin(ang);
  return { x: x - (top - 22) * s * sn, y: y + (top - 22) * s * c, cx: x - (rimY - 40) * s * sn, cy: y + (rimY - 40) * s * c, span: span * s };
}
