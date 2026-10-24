/* anime-kit — shared helpers for the anime example scenes (load after lib.js; scenes define W, H, V, and call
   kitInit() in their init). Cel clouds, the cel fill trick, lens flare, and the compositing (撮影) pass. */
const { clamp, lerp, ss, eio, win, rng, fbm, canvas, text, hex, mix, rgb } = Pilot;
const PI2 = Math.PI * 2;
const hx = a => '#' + a.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const haze = (c, k, to = '#b9d6ec') => hx(mix(hex(c), hex(to), clamp(k)));
const glow = (ctx, x, y, r, c0, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${c0},${a})`); g.addColorStop(.25, `rgba(${c0},${a * .35})`); g.addColorStop(1, `rgba(${c0},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
let grain, gb, gx;
function kitInit() { grain = Pilot.speckle(W / 2 + 32, H / 2 + 32, 60, 11); gb = canvas(W / 4, H / 4); gx = gb.getContext('2d'); }
function cloudTex(seed, w, h, pal, o = {}) {
  const c = canvas(w, h), x = c.getContext('2d'), r = rng(seed);
  const base = h * (o.base || .9), top = h * (o.top || .08), cx = w / 2, L = o.light || [-1, -1];
  const prof = o.prof || (u => (.39 - .1 * u + .04 * Math.sin(u * 7)) * (1 - .6 * ss(.72, 1, u)));
  const Y = u => base - u * (base - top), puffs = [];
  for (let i = 0; i < (o.ni || 70); i++) { const u = r() * .95; puffs.push([cx + (r() * 2 - 1) * prof(u) * w * .62, Y(u), ((o.ri || .07) + r() * .05) * h * (1 - .35 * u)]); }
  for (let i = 0; i < (o.ne || 230); i++) { const s = r(), u = r(), rad = ((o.re || .028) + r() * .04) * h * (1 - .3 * u);
    if (s < .36) puffs.push([cx - prof(u) * w + rad * (.4 + r() * .6), Y(u), rad]);
    else if (s < .72) puffs.push([cx + prof(u) * w - rad * (.4 + r() * .6), Y(u), rad]);
    else { const k = r() * 2 - 1, u2 = .72 + .28 * Math.sqrt(1 - k * k); puffs.push([cx + k * prof(.72) * w * .98, Y(u2) + rad * .7, rad]); } }
  puffs.sort((a, b) => a[1] - b[1]);                        // top first: lower (nearer) lumps overlap the ones above
  const mid = hx(mix(hex(pal.base), hex(pal.shadow), .5));
  for (const [px, py, rad] of puffs) {                       // small-scale lumps: base + a soft-toned crescent
    x.save(); x.beginPath(); x.arc(px, py, rad, 0, PI2); x.clip(); x.fillStyle = mid; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    x.beginPath(); x.arc(px + L[0] * rad * .16, py + L[1] * rad * .2, rad * .9, 0, PI2); x.fillStyle = pal.base; x.fill(); x.restore(); }
  const U = canvas(w, h), ux = U.getContext('2d'), union = (dx, dy, col, k = 1) => { ux.fillStyle = col; for (const [px, py, rad] of puffs) { ux.beginPath(); ux.arc(px + dx, py + dy, rad * k, 0, PI2); ux.fill(); } };
  // large-scale terminator: the whole mass shifted toward the light; what it leaves uncovered is the shadow side
  union(0, 0, pal.shadow); ux.globalCompositeOperation = 'destination-out'; union(L[0] * h * .055, L[1] * h * .07, '#000');
  x.globalCompositeOperation = 'source-atop'; x.globalAlpha = .9; x.drawImage(U, 0, 0); x.globalAlpha = 1;
  // a thin lit rim on the sun side
  ux.globalCompositeOperation = 'source-over'; ux.clearRect(0, 0, w, h); union(0, 0, pal.light); ux.globalCompositeOperation = 'destination-out'; union(-L[0] * h * .012, -L[1] * h * .014, '#000');
  x.drawImage(U, 0, 0);
  const g = x.createLinearGradient(0, base - (base - top) * .3, 0, base + h * .05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, pal.under); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'destination-out';
  const g2 = x.createLinearGradient(0, base - h * .03, 0, base + h * .06); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)');
  x.fillStyle = g2; x.fillRect(0, 0, w, h);
  const c2 = canvas(w, h), x2 = c2.getContext('2d'); x2.filter = 'blur(.8px)'; x2.drawImage(c, 0, 0); return c2;
}
const DAY = { shadow: '#9fb0d8', base: '#f1f5fc', light: '#ffffff', under: 'rgba(128,146,196,.85)' };
const DUSK = { shadow: '#82639f', base: '#f2a19a', light: '#ffe0a8', under: 'rgba(88,66,130,.95)' };
function flare(ctx, sx, sy, a, warm) {
  if (sy < -H * .6 || a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const c = warm ? '255,200,140' : '255,246,226';
  glow(ctx, sx, sy, W * .45, c, .55 * a); glow(ctx, sx, sy, W * .08, '255,255,255', .7 * a);
  ctx.save(); ctx.translate(sx, sy); ctx.scale(1, .018); glow(ctx, 0, 0, W * .8, warm ? '255,170,110' : '180,220,255', .5 * a); ctx.restore();
  const vx = W / 2 - sx, vy = H / 2 - sy;
  for (const [k, r, col, al] of [[.45, 26, '120,200,255', .16], [.7, 60, '160,255,200', .07], [1.0, 16, '255,220,160', .22], [1.35, 110, '200,160,255', .06], [1.7, 40, '255,170,120', .12]]) {
    const x = sx + vx * k, y = sy + vy * k; ctx.fillStyle = `rgba(${col},${al * a})`; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3 + .3; ctx.lineTo(x + Math.cos(an) * r * (V ? .8 : 1), y + Math.sin(an) * r * (V ? .8 : 1)); } ctx.fill(); }
  ctx.restore();
}
function post(ctx, t, glowAmt) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  gx.clearRect(0, 0, gb.width, gb.height); gx.filter = 'blur(6px)'; gx.drawImage(ctx.canvas, 0, 0, gb.width, gb.height); gx.filter = 'none';
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = glowAmt; ctx.drawImage(gb, 0, 0, W, H);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const lk = ctx.createRadialGradient(0, 0, 0, 0, 0, W * .9); lk.addColorStop(0, 'rgba(255,238,205,.16)'); lk.addColorStop(1, 'rgba(255,238,205,0)');
  ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = lk; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .45, W / 2, H / 2, Math.hypot(W, H) * .62); vg.addColorStop(0, 'rgba(14,16,48,0)'); vg.addColorStop(1, 'rgba(14,16,48,.32)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  const f = Math.floor(t * 30); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .1; ctx.drawImage(grain, -(f * 37 % 64), -(f * 53 % 64), W + 64, H + 64);
  ctx.restore();
}
