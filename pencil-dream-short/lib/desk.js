// pencil-dream-short · desk.js — the reveal: the drawing was a spread in a sketchbook lying on a desk. Unlike the drawing,
// this part is "real": smooth shading, cast shadows, wood, lamp light, a shallow depth of field — the contrast is the point.
//   F.desk({ wood: '#5b3b27', cover: '#3b2a24', light: [-1800, -1600], pencils: [{ x, y, ang, len, col, lead }], eraser: { x, y, ang, col }, props: (ctx, pt, t) => {} })
import { clamp, lerp, rng, hash, mix, rgba } from './pencil.js';

/** paint the desk once (world rect around the book) — wood planks with grain, pre-blurred for depth of field */
export function deskTexture(film, o) {
  const pg = film.page, X = pg.w * 1.35, Y = pg.h * 1.35, k = .3, c = film.mk(X * 2 * k, Y * 2 * k), x = c.getContext('2d'), r = rng(o.seed ?? 21);
  const base = o.wood || '#5b3b27', plank = (o.plank ?? 520) * k;
  for (let py = 0, i = 0; py < c.height; py += plank, i++) {
    x.fillStyle = mix(base, i % 2 ? '#2e1c12' : '#7a5236', .12 + r() * .12); x.fillRect(0, py, c.width, plank);
    for (let j = 0; j < 70; j++) {
      const yy = py + r() * plank, amp = 2 + r() * 6, ph = r() * 6, fq = .002 + r() * .004;
      x.strokeStyle = rgba(r() > .5 ? '#2a1910' : '#8a6243', .12 + r() * .18); x.lineWidth = .6 + r() * 1.6; x.beginPath();
      for (let xx = 0; xx <= c.width; xx += 12) x.lineTo(xx, yy + Math.sin(xx * fq + ph) * amp + Math.sin(xx * fq * 3.1 + ph) * amp * .3);
      x.stroke();
    }
    if (r() > .4) { const kx = r() * c.width, ky = py + plank * (.3 + r() * .4); for (let q = 0; q < 6; q++) { x.strokeStyle = rgba('#2a1910', .25); x.lineWidth = 1; x.beginPath(); x.ellipse(kx, ky, 8 + q * 7, 3 + q * 2.5, 0, 0, Math.PI * 2); x.stroke(); } }
    x.fillStyle = 'rgba(15,8,4,.55)'; x.fillRect(0, py - 1, c.width, 2.2);
  }
  const b = film.mk(c.width, c.height), y = b.getContext('2d'); y.filter = 'blur(2.2px)'; y.drawImage(c, 0, 0);
  return { c: b, X, Y };
}
const toCam = (ctx, pt) => { const v = pt.v; ctx.translate(v.W / 2, v.H / 2); ctx.rotate(v.r); ctx.scale(v.z, v.z); ctx.translate(-v.x, -v.y); };

/** behind the page: desk, lamp pool, the book's shadow, cover board and the page block */
export function drawDesk(ctx, pt, film, t, o, tex) {
  const pg = film.page, hw = pg.w / 2, hh = pg.h / 2, L = o.light || [-pg.w * .5, -pg.h * .8];
  ctx.save(); toCam(ctx, pt);
  ctx.drawImage(tex.c, -tex.X, -tex.Y, tex.X * 2, tex.Y * 2);
  // lamp pool
  const g = ctx.createRadialGradient(L[0] * .5, L[1] * .5, pg.w * .2, 0, 0, pg.w * 1.6); g.addColorStop(0, 'rgba(255,214,150,.18)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = g; ctx.fillRect(-tex.X, -tex.Y, tex.X * 2, tex.Y * 2);
  // book shadow (away from the lamp)
  const m = o.margin ?? 46, sx = -Math.sign(L[0]) * 40, sy = -Math.sign(L[1]) * 60;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 90 * pt.v.z * film.S; ctx.shadowOffsetX = sx * pt.v.z * film.S; ctx.shadowOffsetY = sy * pt.v.z * film.S;
  ctx.fillStyle = o.cover || '#3b2a24'; ctx.fillRect(-hw - m, -hh - m, pg.w + m * 2, pg.h + m * 2); ctx.restore();
  // cover board with a worn edge
  ctx.fillStyle = o.cover || '#3b2a24'; ctx.fillRect(-hw - m, -hh - m, pg.w + m * 2, pg.h + m * 2);
  ctx.strokeStyle = 'rgba(255,230,200,.12)'; ctx.lineWidth = 6; ctx.strokeRect(-hw - m + 4, -hh - m + 4, pg.w + m * 2 - 8, pg.h + m * 2 - 8);
  // page block: stacked edges peeking out at the outer sides and the bottom
  for (let i = 5; i >= 1; i--) {
    const e = i * 5; ctx.fillStyle = mix(film.paper, '#8c7f6a', .18 + i * .06);
    ctx.beginPath(); ctx.moveTo(-hw - e, -hh + e * .6); ctx.lineTo(-2, -hh + e * .3); ctx.lineTo(2, -hh + e * .3); ctx.lineTo(hw + e, -hh + e * .6); ctx.lineTo(hw + e, hh + e); ctx.lineTo(-hw - e, hh + e); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
/** in front: the shading that makes the page a curved sheet, the pencils and props lying on the desk, the lamp light */
export function deskFront(ctx, pt, film, t, o) {
  const pg = film.page, hw = pg.w / 2, hh = pg.h / 2, L = o.light || [-pg.w * .5, -pg.h * .8], z = pt.v.z;
  ctx.save(); toCam(ctx, pt);
  // page curl light: brighter toward the lamp, a soft fall toward the outer edges
  for (const s of [-1, 1]) { const g = ctx.createLinearGradient(s * hw, 0, 0, 0); g.addColorStop(0, 'rgba(70,55,40,.16)'); g.addColorStop(.12, 'rgba(70,55,40,0)'); g.addColorStop(1, 'rgba(70,55,40,0)'); ctx.fillStyle = g; ctx.fillRect(s < 0 ? -hw : 0, -hh, hw, pg.h); }
  const pencils = o.pencils || [];
  for (const p of pencils) pencilReal(ctx, p, L, z * film.S);
  if (o.eraser) eraser(ctx, o.eraser, L, z * film.S);
  if (o.props) o.props(ctx, pt, t);
  ctx.restore();
}
/** a real coloured pencil: hexagonal body (three lit faces), sharpened wood cone, coloured lead, cast shadow */
export function pencilReal(ctx, p, L, zs) {
  const len = p.len || 1400, w = p.w || 46, a = (p.ang || 0) * Math.PI / 180, col = p.col || '#d9792f';
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 26 * zs; ctx.shadowOffsetX = 18 * zs; ctx.shadowOffsetY = 26 * zs;
  ctx.fillStyle = col; ctx.fillRect(-len / 2, -w / 2, len * .86, w); ctx.restore();
  const faces = [[-w / 2, -w / 6, mix(col, '#ffffff', .28)], [-w / 6, w / 6, col], [w / 6, w / 2, mix(col, '#000000', .3)]];
  for (const [y0, y1, c] of faces) { ctx.fillStyle = c; ctx.fillRect(-len / 2, y0, len * .86, y1 - y0); }
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-len / 2, -w / 2 + 3, len * .86, 4);
  // sharpened cone
  const x0 = -len / 2 + len * .86, x1 = len / 2, xl = lerp(x0, x1, .72);
  ctx.fillStyle = p.wood || '#e2c08d'; ctx.beginPath(); ctx.moveTo(x0, -w / 2); for (let i = 0; i <= 6; i++) ctx.lineTo(x0 + (i % 2 ? 10 : 0), -w / 2 + i * w / 6); ctx.lineTo(xl, w * .12); ctx.lineTo(xl, -w * .12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(120,80,40,.25)'; ctx.beginPath(); ctx.moveTo(x0 + 6, 0); ctx.lineTo(xl, w * .02); ctx.lineTo(xl, w * .12); ctx.lineTo(x0 + 6, w / 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = p.lead || mix(col, '#000000', .15); ctx.beginPath(); ctx.moveTo(xl, -w * .12); ctx.lineTo(x1, 0); ctx.lineTo(xl, w * .12); ctx.closePath(); ctx.fill();
  // the cut end
  ctx.fillStyle = mix(col, '#000000', .2); ctx.fillRect(-len / 2 - 3, -w / 2, 6, w); ctx.fillStyle = p.wood || '#e2c08d'; ctx.beginPath(); ctx.arc(-len / 2, 0, w * .28, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = p.lead || mix(col, '#000000', .15); ctx.beginPath(); ctx.arc(-len / 2, 0, w * .1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
export function eraser(ctx, e, L, zs) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate((e.ang || 0) * Math.PI / 180);
  const w = e.w || 220, h = e.h || 120, col = e.col || '#e9e1d2';
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 30 * zs; ctx.shadowOffsetX = 16 * zs; ctx.shadowOffsetY = 24 * zs; ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 18); ctx.fill(); ctx.restore();
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, mix(col, '#ffffff', .4)); g.addColorStop(1, mix(col, '#000000', .18)); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 18); ctx.fill();
  if (e.sleeve) { ctx.fillStyle = e.sleeve; ctx.fillRect(-w * .1, -h / 2, w * .6, h); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(-w * .1, h * .25, w * .6, h * .25); }
  ctx.restore();
}
