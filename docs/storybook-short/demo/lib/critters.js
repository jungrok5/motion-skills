// storybook-short · critters.js — small animals drawn every frame: birds, a dog, a cat, ducks, butterflies.
// Same media, cheaper: shapes filled with a crayon tile that sticks to the body, ink edges, gouache-like flat eyes.
// Four-legged walkers follow the joint rule (CONTRIBUTING 관절 4): a lifted front leg folds its lower part BACK,
// a lifted hind leg folds its lower part FORWARD; a planted paw stays where it was put (gait is distance-based).
import * as P from './paint.js';
const INK = 'rgba(36,26,32,.75)';
const tiles = new Map();
function tile(color, seed = 3) {
  const k = String(color) + seed; if (tiles.has(k)) return tiles.get(k);
  const c = P.canvas(80, 80), g = c.getContext('2d');
  P.crayon(g, [[-4, -4], [84, -4], [84, 84], [-4, 84]], { color, angle: -1, gap: 2.6, alpha: .85, underAlpha: .75, tooth: .3, seed, roughness: 0 });
  tiles.set(k, c); return c;
}
const fillTex = (ctx, color, seed) => { const p = ctx.createPattern(tile(color, seed), 'repeat'); p.setTransform(new DOMMatrix().scale(.5)); ctx.fillStyle = p; };

/** a flock of small V birds crossing; deterministic per seed */
export function birds(ctx, t, { n = 5, seed = 1, x0 = -100, x1 = 2100, y = 200, speed = 90, span = 14, color = '#2a2228' } = {}) {
  const r = P.rng(seed); ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    const ph = r(), sp = speed * (.8 + r() * .4), L = x1 - x0, x = x0 + ((t * sp + ph * L) % L), yy = y + (r() - .5) * 120 + Math.sin(t * .7 + i) * 10, s = span * (.7 + r() * .6), f = Math.sin(t * (9 + r() * 3) + i * 2);
    ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - s, yy - f * s * .45); ctx.quadraticCurveTo(x - s * .4, yy - s * .2, x, yy); ctx.quadraticCurveTo(x + s * .4, yy - s * .2, x + s, yy - f * s * .45); ctx.stroke();
  }
  ctx.restore();
}
/** a dog trotting (or standing, speed 0). x is its chest; dir ±1; d = distance walked (px) */
export function dog(ctx, x, y, s, d, { dir = 1, color = '#c98a4a', ear = '#7a4a2a', t = 0, sit = false } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const S = 1.15 * s, legLen = .55 * s;
  const legs = [[.35, 0, 'front'], [-.55, .5, 'hind'], [.35, .5, 'front'], [-.55, 0, 'hind']]; // x offset, phase, kind (far pair first)
  const bob = Math.abs(Math.sin(d / S * Math.PI * 2)) * .03 * s;
  const leg = ([ox, ph, kind], far) => {
    const u = ((d / S + ph) % 1 + 1) % 1, swing = u > .6, w = swing ? (u - .6) / .4 : 0;
    const hip = [ox * s, -legLen - bob];
    const footX = swing ? P.lerp(-.25, .25, P.smooth(w)) * s : P.lerp(.25, -.25, u / .6) * s, lift = swing ? Math.sin(w * Math.PI) * .14 * s : 0;
    const foot = [ox * s + footX * .6, -lift];
    // the lower leg folds back for a front leg, forward for a hind leg (as a dog's wrist and hock do)
    const k = kind === 'front' ? -1 : 1, mid = [(hip[0] + foot[0]) / 2 + k * lift * .9 * (kind === 'front' ? 1 : 1), (hip[1] + foot[1]) / 2];
    ctx.strokeStyle = P.css(far ? P.shade(color, -.25) : color); ctx.lineWidth = .13 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(mid[0], mid[1]); ctx.lineTo(foot[0], foot[1]); ctx.stroke();
  };
  if (!sit) { leg(legs[0], true); leg(legs[1], true); }
  // body, tail, head
  const body = P.ellipse(0, -legLen - .2 * s - bob, .62 * s, .28 * s, 26);
  fillTex(ctx, color, 7); P.path(ctx, body); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
  const wag = Math.sin(t * 9) * .25;
  ctx.strokeStyle = P.css(color); ctx.lineWidth = .1 * s; ctx.beginPath(); ctx.moveTo(-.55 * s, -legLen - .3 * s); ctx.quadraticCurveTo(-.8 * s, -legLen - .6 * s - wag * s * .3, -.85 * s + wag * .2 * s, -legLen - .75 * s); ctx.stroke();
  const hx = .62 * s, hy = -legLen - .55 * s - bob;
  fillTex(ctx, color, 7); ctx.beginPath(); ctx.ellipse(hx, hy, .27 * s, .24 * s, 0, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(hx + .25 * s, hy + .07 * s, .15 * s, .1 * s, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#231b20'; ctx.beginPath(); ctx.arc(hx + .39 * s, hy + .04 * s, .045 * s, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(hx + .08 * s, hy - .05 * s, .035 * s, 0, 7); ctx.fill();
  fillTex(ctx, ear, 9); ctx.beginPath(); ctx.ellipse(hx - .12 * s, hy - .02 * s + Math.sin(t * 6) * .02 * s, .09 * s, .2 * s, .4, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.stroke();
  if (!sit) { leg(legs[2], false); leg(legs[3], false); }
  else { ctx.strokeStyle = P.css(color); ctx.lineWidth = .13 * s; for (const ox of [.3, .42]) { ctx.beginPath(); ctx.moveTo(ox * s, -legLen); ctx.lineTo(ox * s, 0); ctx.stroke(); } }
  ctx.restore();
}
/** a cat sitting, tail curling and flicking, ears twitching */
export function cat(ctx, x, y, s, t, { color = '#e59a4c', stripes = '#b8652a', dir = 1, look = 0 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const tail = Math.sin(t * 1.3) * .3 + Math.sin(t * 4.1) * .06;
  ctx.strokeStyle = P.css(color); ctx.lineCap = 'round'; ctx.lineWidth = .14 * s;
  ctx.beginPath(); ctx.moveTo(-.3 * s, -.1 * s); ctx.quadraticCurveTo(-.85 * s, -.05 * s, -.75 * s + tail * .2 * s, -.6 * s - tail * .3 * s); ctx.stroke();
  const body = P.spline([[-.4 * s, 0], [-.42 * s, -.5 * s], [-.15 * s, -.8 * s], [.2 * s, -.75 * s], [.38 * s, -.3 * s], [.35 * s, 0]], 4, true);
  fillTex(ctx, color, 11); P.path(ctx, body); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.strokeStyle = P.css(stripes, .8); ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-.38 * s, -.25 * s - i * .14 * s); ctx.lineTo(-.18 * s, -.3 * s - i * .14 * s); ctx.stroke(); }
  const hx = .05 * s + look * .05 * s, hy = -.95 * s;
  fillTex(ctx, color, 11); ctx.beginPath(); ctx.ellipse(hx, hy, .3 * s, .26 * s, 0, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.stroke();
  const tw = Math.max(0, Math.sin(t * 2.3 + 1) - .85) * 2;
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + sd * .26 * s, hy - .08 * s); ctx.lineTo(hx + sd * (.22 + tw * .05) * s, hy - .42 * s); ctx.lineTo(hx + sd * .05 * s, hy - .2 * s); ctx.closePath(); fillTex(ctx, color, 11); ctx.fill(); ctx.stroke(); }
  const blink = (t % 3.7) < .15;
  ctx.fillStyle = '#231b20'; for (const sd of [-1, 1]) { if (blink) { ctx.fillRect(hx + sd * .11 * s + look * .05 * s - 4, hy - .02 * s, 8, 1.5); } else { ctx.beginPath(); ctx.ellipse(hx + sd * .11 * s + look * .05 * s, hy - .02 * s, .035 * s, .05 * s, 0, 0, 7); ctx.fill(); } }
  ctx.fillStyle = '#e57a8a'; ctx.beginPath(); ctx.arc(hx + look * .06 * s, hy + .07 * s, .03 * s, 0, 7); ctx.fill();
  ctx.restore();
}
/** a duck floating, bobbing; paddling forward if speed */
export function duck(ctx, x, y, s, t, { color = '#fbf6ec', bill = '#f0a030', dir = 1, head = '#3f8a5a' } = {}) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 2.1 + x * .01) * .04 * s); ctx.scale(dir, 1);
  const body = P.spline([[-.5 * s, -.15 * s], [-.2 * s, -.42 * s], [.3 * s, -.35 * s], [.45 * s, -.1 * s], [0, 0]], 4, true);
  fillTex(ctx, color, 13); P.path(ctx, body); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
  fillTex(ctx, head, 15); ctx.beginPath(); ctx.ellipse(.3 * s, -.55 * s, .18 * s, .17 * s, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = P.css(bill); ctx.beginPath(); ctx.ellipse(.5 * s, -.52 * s, .12 * s, .05 * s, .1, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#231b20'; ctx.beginPath(); ctx.arc(.34 * s, -.6 * s, .03 * s, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(250,250,245,.8)'; ctx.lineWidth = 1.5; const rp = (t * .8) % 1; ctx.beginPath(); ctx.ellipse(0, 0, (.5 + rp * .5) * s, .06 * s, 0, 0, Math.PI); ctx.globalAlpha = 1 - rp; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.restore();
}
/** a butterfly on a wandering path */
export function butterfly(ctx, t, { x = 500, y = 500, r = 120, color = '#f2c94c', seed = 1 } = {}) {
  const q = P.rng(seed)(), px = x + Math.sin(t * .7 + q * 6) * r + Math.sin(t * 1.9) * r * .2, py = y + Math.sin(t * 1.1 + q * 3) * r * .4, f = Math.abs(Math.sin(t * 14 + q * 9));
  ctx.save(); ctx.translate(px, py); ctx.fillStyle = P.css(color); ctx.strokeStyle = INK; ctx.lineWidth = 1;
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * 6 * f, -4, 7 * f + 1, 9, sd * .4, 0, 7); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = '#2a2228'; ctx.fillRect(-1, -8, 2, 12); ctx.restore();
}
/** bunting: triangles on a sagging string between two points, fluttering */
export function bunting(ctx, a, b, t, { colors = ['#e0503a', '#f2c94c', '#3f74ad', '#5fae6a'], n = 12, sag = 40, size = 26 } = {}) {
  ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath();
  const pt = u => [P.lerp(a[0], b[0], u), P.lerp(a[1], b[1], u) + Math.sin(u * Math.PI) * sag + Math.sin(t * 1.3) * 3 * Math.sin(u * Math.PI)];
  for (let i = 0; i <= 30; i++) { const [x, y] = pt(i / 30); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  for (let i = 0; i < n; i++) { const u = (i + .5) / n, [x, y] = pt(u), fl = Math.sin(t * 4 + i * 1.7) * .25; ctx.save(); ctx.translate(x, y); ctx.rotate(fl); fillTex(ctx, colors[i % colors.length], 17 + i % 4); ctx.beginPath(); ctx.moveTo(-size / 2, 0); ctx.lineTo(size / 2, 0); ctx.lineTo(0, size * 1.1); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  ctx.restore();
}
/** falling things: leaves, petals or snow, deterministic per seed, in a box */
export function falling(ctx, t, { bb = [0, 0, 1920, 1080], n = 30, colors = ['#e88a3a', '#d9b23a', '#c75a3a'], kind = 'leaf', seed = 1, speed = 60, size = 8 } = {}) {
  const r = P.rng(seed), [x0, y0, x1, y1] = bb, H = y1 - y0;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const sp = speed * (.6 + r() * .8), ph = r(), y = y0 + ((t * sp + ph * H) % H), x = x0 + r() * (x1 - x0) + Math.sin(t * (.8 + r()) + i) * 30, rot = t * (1 + r() * 2) + i, s = size * (.6 + r() * .8);
    ctx.fillStyle = kind === 'snow' ? 'rgba(255,255,252,.9)' : P.css(colors[i % colors.length], .9);
    ctx.translate(x, y); ctx.rotate(rot);
    if (kind === 'snow') { ctx.beginPath(); ctx.arc(0, 0, s * .4, 0, 7); ctx.fill(); }
    else { ctx.beginPath(); ctx.ellipse(0, 0, s, s * .45 * Math.abs(Math.cos(rot * 1.3)) + 1, 0, 0, 7); ctx.fill(); }
    ctx.setTransform(ctx.getTransform().rotate(-rot * 180 / Math.PI).translate(-x, -y));
  }
  ctx.restore();
}
