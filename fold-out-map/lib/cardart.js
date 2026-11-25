// fold-out-map · cardart.js — the pop-up standees: painted die-cut cards drawn in code. A card is drawn twice from the
// same function — once in colour, once as its "lights" (lit windows, lanterns, lamps; everything else black) which
// becomes the emissive map at night — then cut out with a white die-cut border, given a gouache grain, and a grey
// cardboard back with the same silhouette.
//
//   const tower = card({ aspect: .8, draw: p => { p.ground(…); p.block(30, 40, 20, 60, { wall: '#e9d7b8', windows: {…} }); p.tree(…); } });
//   stops: [{ …, art: tower }]   or layered:  art: [{ card: back, dz: -.18, k: 1.2 }, { card: front }]
//
// Drawing space: x 0..100 left → right, y 0..H top → bottom (H = 100 / aspect), the ground line is near y = H.
// Light comes from the upper left (the room's window): lit faces left, shaded faces right — keep it that way.
import { THREE, rng, noise, clamp, lerp, tex, canvas } from './foldmap.js';

export const WARM = '#ffcf7a';
export function card({ aspect = 1, draw, seed = 1, res = 900, border = 2.2, grain = .5, k = 1 } = {}) {
  const ts = (window.FILM_TEX_SCALE ?? 1) * k, W = Math.round(res * ts), H = Math.round(W / aspect), u = W / 100;
  const run = glow => { const c = canvas(W, H), g = c.getContext('2d'); g.scale(u, u); draw(new Card(g, 100, 100 / aspect, glow, seed)); return c; };
  const art = run(false), lights = run(true);
  // die-cut: dilate the art's silhouette by `border` units in white, then the art on top
  const sil = canvas(W, H), sg = sil.getContext('2d'), b = border * u;
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; sg.drawImage(art, Math.cos(a) * b, Math.sin(a) * b); }
  sg.drawImage(art, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#fbf8f1'; sg.fillRect(0, 0, W, H);
  const out = canvas(W, H), og = out.getContext('2d');
  og.drawImage(sil, 0, 0);
  og.save(); og.globalAlpha = .18; og.filter = `blur(${u * .25}px)`; og.globalCompositeOperation = 'source-atop'; og.drawImage(art, u * .25, u * .4); og.restore();
  og.drawImage(art, 0, 0);
  // gouache grain: soft paper noise multiplied into the paint (only where there is paint)
  if (grain) {
    const R = rng(seed * 31 + 7), n = Math.round(W * H / 90);
    og.save(); og.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < n; i++) { const x = R() * W, y = R() * H, r = (.3 + R() * 1.2) * u * .18; og.fillStyle = R() < .5 ? `rgba(60,40,20,${.05 * grain + R() * .05 * grain})` : `rgba(255,250,235,${.06 * grain + R() * .06 * grain})`; og.fillRect(x, y, r, r); }
    og.restore();
  }
  // a hair of darker edge on the cut so the card reads as cardstock with a thickness
  const edge = canvas(W, H), eg = edge.getContext('2d'); eg.drawImage(sil, 0, 0); eg.globalCompositeOperation = 'source-in'; eg.fillStyle = 'rgba(150,140,120,.9)'; eg.fillRect(0, 0, W, H);
  const fin = canvas(W, H), fg = fin.getContext('2d'); fg.drawImage(edge, 0, u * .25); fg.drawImage(out, 0, 0);
  // the lights, masked to the silhouette (black elsewhere)
  const lit = canvas(W, H), lg = lit.getContext('2d'); lg.fillStyle = '#000'; lg.fillRect(0, 0, W, H); lg.drawImage(lights, 0, 0);
  // the back: grey board, mirrored by the mesh itself
  const back = canvas(W, H), bg = back.getContext('2d'); bg.drawImage(sil, 0, 0); bg.globalCompositeOperation = 'source-in'; bg.fillStyle = '#ddd6c6'; bg.fillRect(0, 0, W, H);
  const R2 = rng(seed + 99); bg.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < W * H / 400; i++) { bg.fillStyle = `rgba(90,80,60,${R2() * .08})`; bg.fillRect(R2() * W, R2() * H, 2, 2); }
  return { color: tex(fin), glow: tex(lit), back: tex(back), aspect, canvas: fin, lightsCanvas: lit };
}

// ---------------------------------------------------------------- the painter
export class Card {
  constructor(g, W, H, glow, seed) { Object.assign(this, { g, W, H, glow, seed }); this.R = rng(seed); }
  // colours: in the lights pass everything is black except what lit() asks for
  c(col) { return this.glow ? '#000' : col; }
  lit(dayCol, nightCol = WARM) { return this.glow ? nightCol : dayCol; }
  shade(col, k) {   // k > 0 lighter, < 0 darker
    const c = new THREE.Color(col); const t = k > 0 ? new THREE.Color('#fff8ec') : new THREE.Color('#1d1410');
    return '#' + c.lerp(t, Math.abs(k)).getHexString();
  }
  path(pts) { const g = this.g; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); return this; }
  poly(pts, fill, stroke, w = .35) { const g = this.g; this.path(pts); g.fillStyle = this.c(fill); g.fill(); if (stroke) { g.strokeStyle = this.c(stroke); g.lineWidth = w; g.lineJoin = 'round'; g.stroke(); } return this; }
  rect(x, y, w, h, fill) { this.g.fillStyle = this.c(fill); this.g.fillRect(x, y, w, h); return this; }
  // a linear gradient fill (top → bottom by default)
  vgrad(x, y, w, h, top, bottom) { const gr = this.g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, this.c(top)); gr.addColorStop(1, this.c(bottom)); this.g.fillStyle = gr; this.g.fillRect(x, y, w, h); return this; }
  line(pts, color, w = .4, { dash, alpha = 1 } = {}) {
    const g = this.g; g.save(); g.globalAlpha = alpha; g.strokeStyle = typeof color === 'string' && color.startsWith('lit:') ? this.lit('rgba(0,0,0,0)', color.slice(4)) : this.c(color); g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
    if (dash) g.setLineDash(dash); g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.restore(); return this;
  }
  circle(x, y, r, fill) { const g = this.g; g.fillStyle = this.c(fill); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); return this; }
  // a ground patch the scene stands on: a soft mound with a lit top edge, grass flecks, and a flat bottom (the cut line)
  ground(x0, x1, y, { color = '#8fae6a', h = 6, bump = 2.5, seed = 1, depth } = {}) {
    const yb = depth === undefined ? this.H : y + depth, pts = [[x0, yb]], n = 24;
    for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n), e = Math.sin(Math.PI * i / n); pts.push([x, y - e * bump - (noise(x * .2, seed) - .5) * 1.6 * e]); }
    pts.push([x1, yb]);
    this.poly(pts, color);
    const g = this.g, gr = g.createLinearGradient(0, y - bump - 1, 0, yb); gr.addColorStop(0, this.c(this.shade(color, .25))); gr.addColorStop(.35, this.c(color)); gr.addColorStop(1, this.c(this.shade(color, -.25)));
    g.fillStyle = gr; this.path(pts); g.fill();
    const R = rng(seed * 13);
    for (let i = 0; i < (x1 - x0) * 3; i++) { const x = lerp(x0 + 2, x1 - 2, R()), yy = y + R() * h * .8; this.line([[x, yy], [x + (R() - .5) * .8, yy - 1 - R()]], this.shade(color, R() < .5 ? .3 : -.3), .35); }
    return this;
  }
  // a box building seen slightly from the left: front face (lit), a narrow right side (shaded), windows, a roof
  block(x, y, w, h, { wall = '#ead9bd', side = 2.4, roof = 'flat', roofColor, windows, door = false, trim } = {}) {
    const top = y - h;
    this.poly([[x + w, top], [x + w + side, top - side * .45], [x + w + side, y - side * .45], [x + w, y]], this.shade(wall, -.28));
    const g = this.g, gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, this.c(this.shade(wall, .12))); gr.addColorStop(1, this.c(this.shade(wall, -.06)));
    g.fillStyle = gr; g.fillRect(x, top, w, h);
    if (trim) this.rect(x, top, w, 1.1, trim);
    if (windows) this.windows(x, top, w, h, windows);
    if (door) this.rect(x + w / 2 - 1.4, y - 4, 2.8, 4, this.shade(wall, -.5));
    if (roof === 'flat') { this.poly([[x - .4, top], [x + w + .4, top], [x + w + side + .4, top - side * .45], [x + side, top - side * .45]], roofColor || this.shade(wall, .2)); this.rect(x - .4, top - .7, w + .8, .9, this.shade(wall, -.12)); }
    else if (roof === 'gable') this.gable(x, top, w, roofColor || '#9b4b3b', side);
    else if (roof === 'hanok') this.hanok(x - w * .12, top, w * 1.24, w * .34, { color: roofColor || '#4c5257' });
    return this;
  }
  // a window grid inside a face. lit: share of windows lit at night (by hash, the same every frame)
  windows(x, top, w, h, { rows = 4, cols = 3, color = '#5d7182', frame, lit = .55, mx = .14, my = .12, seed = 0 } = {}) {
    const cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const on = rng(this.seed * 97 + seed * 31 + r * 13 + c * 7)() < lit;
      const wx = x + c * cw + cw * mx, wy = top + r * rh + rh * my, ww = cw * (1 - 2 * mx), wh = rh * (1 - 2 * my);
      this.g.fillStyle = this.glow ? (on ? WARM : '#000') : color; this.g.fillRect(wx, wy, ww, wh);
      if (!this.glow) { this.g.fillStyle = 'rgba(255,255,255,.22)'; this.g.fillRect(wx, wy, ww * .4, wh); }
      if (frame && !this.glow) { this.g.strokeStyle = frame; this.g.lineWidth = .25; this.g.strokeRect(wx, wy, ww, wh); }
    }
    return this;
  }
  gable(x, top, w, color, side = 2.4) {
    const h = w * .38;
    this.poly([[x - .8, top], [x + w / 2, top - h], [x + w + .8, top]], color);
    this.poly([[x + w / 2, top - h], [x + w / 2 + side, top - h - side * .45], [x + w + side + .8, top - side * .45], [x + w + .8, top]], this.shade(color, -.25));
    return this;
  }
  // a Korean / East-Asian tiled roof: a heavy curved silhouette with upturned eave tips, tile ridges, dark underside
  hanok(x, y, w, h, { color = '#4c5257', under = '#2c2622', ridge = 1.4 } = {}) {
    const g = this.g, tip = h * .32;
    const pts = [];
    for (let i = 0; i <= 20; i++) { const t = i / 20, xx = x + w * t, sag = Math.sin(Math.PI * t); pts.push([xx, y - tip * (1 - sag) ** 2.2 + sag * h * .06]); }
    const topL = [x + w * .2, y - h], topR = [x + w * .8, y - h];
    this.poly([...pts, [x + w * .9, y - h * .55], topR, topL, [x + w * .1, y - h * .55]], color);
    // tile ridges: vertical lines from the ridge to the eave
    if (!this.glow) for (let i = 1; i < 22; i++) { const t = i / 22, xb = x + w * t, xt = lerp(topL[0], topR[0], t); this.line([[xt, y - h + .4], [xb, y - tip * (1 - Math.sin(Math.PI * t)) ** 2.2 - .2]], this.shade(color, -.25), .3, { alpha: .7 }); }
    this.line(pts, under, 1.1);
    this.poly([[topL[0] - 1, y - h - ridge * .3], [topR[0] + 1, y - h - ridge * .3], [topR[0] + 1.6, y - h - ridge * 1.2], [topL[0] - 1.6, y - h - ridge * 1.2]], this.shade(color, .18));
    const gr = g.createLinearGradient(0, y - h, 0, y); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(0,0,0,.15)');
    if (!this.glow) { g.fillStyle = gr; this.path([...pts, topR, topL]); g.fill(); }
    return this;
  }
  // a hall under a hanok roof: columns, lattice doors (warm at night), stone base
  hall(x, y, w, h, { wall = '#c9a27a', column = '#8a3b2c', roof = '#4c5257', base = '#b9b3a6', bays = 3, lit = .9 } = {}) {
    this.rect(x - 1, y - 2, w + 2, 2, base); this.rect(x - 1, y - 2, w + 2, .5, this.shade(base, .25));
    const top = y - 2 - h; this.rect(x, top, w, h, wall);
    const bw = w / bays;
    for (let b = 0; b < bays; b++) {
      const on = rng(this.seed * 7 + b)() < lit;
      this.g.fillStyle = this.glow ? (on ? '#ffbf6a' : '#000') : '#e4cfa4'; this.g.fillRect(x + b * bw + bw * .14, top + h * .18, bw * .72, h * .78);
      if (!this.glow) for (let k = 1; k < 4; k++) { this.line([[x + b * bw + bw * .14 + bw * .72 * k / 4, top + h * .18], [x + b * bw + bw * .14 + bw * .72 * k / 4, top + h * .96]], '#8b6a4a', .25); }
    }
    for (let b = 0; b <= bays; b++) this.rect(x + b * bw - .7, top, 1.4, h, column);
    this.rect(x - .5, top, w + 1, 1.6, this.shade(column, .1));
    this.hanok(x - w * .2, top + .3, w * 1.4, h * .95 + w * .1, { color: roof });
    return this;
  }
  // trees: kinds 'round' (broadleaf), 'pine' (Korean red pine, flat foliage pads), 'cone', 'palm', 'bush', 'willow'
  tree(x, y, s = 10, kind = 'round', { color, trunk = '#6b4a35', seed = 3 } = {}) {
    const R = rng(this.seed * 17 + seed * 5 + Math.round(x * 10)), g = this.g;
    if (kind === 'pine') {
      const lean = (R() - .5) * .35, tx = x + Math.sin(lean) * s;
      this.line([[x, y], [x + s * .05, y - s * .4], [tx, y - s * .85]], '#8c4f34', s * .07);
      const c = color || '#3f6b4a';
      for (const [dx, dy, r] of [[0, -.95, .34], [-.35, -.72, .3], [.32, -.62, .28], [-.1, -.5, .22]]) {
        const cx = tx + dx * s, cy = y + dy * s;
        this.g.save(); this.g.translate(cx, cy); this.g.scale(1, .42);
        this.circle(0, 0, r * s, this.shade(c, -.15)); this.circle(-r * s * .2, -r * s * .25, r * s * .82, c); this.circle(-r * s * .35, -r * s * .45, r * s * .45, this.shade(c, .18));
        this.g.restore();
      }
      return this;
    }
    if (kind === 'palm') {
      const tx = x + s * .15; this.line([[x, y], [x + s * .07, y - s * .5], [tx, y - s]], '#8a6a4a', s * .06);
      const c = color || '#5d8a4a';
      for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * .55, l = s * (.45 + R() * .1); this.line([[tx, y - s], [tx + Math.cos(a) * l * .6, y - s + Math.sin(a) * l * .3 - s * .05], [tx + Math.cos(a) * l, y - s + Math.sin(a) * l * .2 + s * .15]], i % 2 ? c : this.shade(c, -.2), s * .07); }
      return this;
    }
    if (kind === 'cone') {
      const c = color || '#4f7a52';
      this.rect(x - s * .04, y - s * .2, s * .08, s * .2, trunk);
      this.poly([[x, y - s], [x + s * .3, y - s * .15], [x - s * .3, y - s * .15]], this.shade(c, -.1));
      this.poly([[x, y - s], [x - s * .3, y - s * .15], [x - s * .02, y - s * .2]], this.shade(c, .15));
      return this;
    }
    if (kind === 'willow') {
      const c = color || '#8db06a';
      this.line([[x, y], [x, y - s * .7]], trunk, s * .07);
      for (let i = 0; i < 14; i++) { const a = (i / 13 - .5) * 2.4, x0 = x + Math.sin(a) * s * .3; this.line([[x, y - s * .75], [x0, y - s * .85], [x0 + Math.sin(a) * s * .1, y - s * .25]], i % 2 ? c : this.shade(c, -.2), s * .05, { alpha: .9 }); }
      return this;
    }
    // round / bush: clustered blobs, lit upper-left
    const c = color || (kind === 'bush' ? '#5f8a4c' : '#6c9a55'), H = kind === 'bush' ? s * .45 : s;
    if (kind !== 'bush') this.line([[x, y], [x + s * .02, y - H * .55]], trunk, s * .08);
    const cy = y - H * (kind === 'bush' ? .45 : .68), rr = s * (kind === 'bush' ? .32 : .36);
    for (const [dx, dy, r, k] of [[.25, .1, .8, -.2], [-.3, .12, .75, -.12], [0, -.2, .9, 0], [-.18, -.3, .6, .15], [.2, -.25, .55, .08], [-.05, -.42, .45, .25]]) this.circle(x + dx * rr * 1.4, cy + dy * rr * 1.4, r * rr, this.shade(c, k));
    return this;
  }
  // a rocky outcrop: a jagged faceted mass, lit faces to the upper left
  rock(x, y, w, h, { color = '#8b8478', seed = 2, jag = .22 } = {}) {
    const R = rng(this.seed * 11 + seed), pts = [[x, y]], n = 9;
    for (let i = 0; i <= n; i++) { const t = i / n, e = Math.sin(Math.PI * t) ** .6; pts.push([x + w * t + (R() - .5) * w * .05, y - h * e * (1 - jag + jag * 2 * R())]); }
    pts.push([x + w, y]);
    this.poly(pts, this.shade(color, -.15));
    for (let i = 1; i < pts.length - 2; i += 1) {
      const a = pts[i], b = pts[i + 1], m = [(a[0] + b[0]) / 2 + w * .02, y - (y - Math.min(a[1], b[1])) * .35];
      const lit = b[1] < a[1];
      this.poly([a, b, m], this.shade(color, lit ? .15 + R() * .1 : -.1 - R() * .12));
    }
    return this;
  }
  // a band of sea: gradient water with white wave curls; foam where it meets the rocks/sand at `shore`
  waves(x, y, w, h, { color = '#5f9aa4', light = '#9ccfce', seed = 4 } = {}) {
    this.vgrad(x, y, w, h, light, color);
    const R = rng(this.seed * 3 + seed);
    for (let i = 0; i < w * h / 10; i++) { const xx = x + R() * w, yy = y + R() * h, l = 1.5 + R() * 3; this.line([[xx, yy], [xx + l * .5, yy - .5], [xx + l, yy]], 'rgba(255,255,255,.75)', .35); }
    return this;
  }
  sand(x, y, w, h, color = '#e8d4a6') { this.vgrad(x, y, w, h, this.shade(color, .12), this.shade(color, -.08)); return this; }
  // a lighthouse: a tapered white tower, a red or green lantern room whose lamp is lit at night
  lighthouse(x, y, s = 30, { band = '#c0392b', body = '#f4f1ea' } = {}) {
    const w0 = s * .2, w1 = s * .13, top = y - s;
    this.poly([[x - w0 / 2, y], [x + w0 / 2, y], [x + w1 / 2, top], [x - w1 / 2, top]], body);
    this.poly([[x + w0 / 6, y], [x + w0 / 2, y], [x + w1 / 2, top], [x + w1 / 6, top]], this.shade(body, -.15));
    for (const f of [.35, .65]) { const yy = y - s * f, ww = lerp(w0, w1, f); this.rect(x - ww / 2, yy, ww, s * .06, band); }
    this.rect(x - w1 * .7, top - s * .02, w1 * 1.4, s * .03, '#333');
    this.g.fillStyle = this.glow ? '#fff3c4' : '#d9e7ee'; this.g.fillRect(x - w1 * .4, top - s * .13, w1 * .8, s * .11);
    this.poly([[x - w1 * .55, top - s * .13], [x + w1 * .55, top - s * .13], [x, top - s * .22]], band);
    return this;
  }
  // a stone pagoda: stacked roof slabs on a plinth
  pagoda(x, y, s = 20, { color = '#b6ae9f', storeys = 3 } = {}) {
    let yy = y, w = s * .5;
    this.rect(x - w * .6, yy - s * .12, w * 1.2, s * .12, this.shade(color, -.1)); yy -= s * .12;
    for (let i = 0; i < storeys; i++) {
      const bh = s * .16 * (1 - i * .12), bw = w * .5 * (1 - i * .15);
      this.rect(x - bw / 2, yy - bh, bw, bh, color); this.rect(x + bw * .15, yy - bh, bw * .35, bh, this.shade(color, -.15)); yy -= bh;
      const rw = w * (1 - i * .16); this.poly([[x - rw / 2, yy], [x + rw / 2, yy], [x + rw * .4, yy - s * .05], [x - rw * .4, yy - s * .05]], this.shade(color, .1)); yy -= s * .05;
    }
    this.line([[x, yy], [x, yy - s * .16]], this.shade(color, -.2), s * .03);
    return this;
  }
  // a string of lanterns between two points (sagging), lit at night
  lanterns(x0, y0, x1, y1, { n = 8, colors = ['#d8473a', '#e9a23b', '#e3d24a', '#5a9bd3', '#e46aa0'], sag = 3 } = {}) {
    const P = t => [lerp(x0, x1, t), lerp(y0, y1, t) + Math.sin(Math.PI * t) * sag];
    this.line([...Array(21)].map((_, i) => P(i / 20)), '#3a2c22', .25);
    for (let i = 0; i < n; i++) { const [x, y] = P((i + .5) / n); this.g.fillStyle = this.glow ? WARM : colors[i % colors.length]; this.g.beginPath(); this.g.ellipse(x, y + 1.2, .95, 1.25, 0, 0, Math.PI * 2); this.g.fill(); }
    return this;
  }
  // a sagging cable with lights along it (bridges)
  cable(x0, y0, x1, y1, { sag = 6, color = '#d9d5cc', w = .45, lights = 0, glow = '#fff1c8' } = {}) {
    const P = t => [lerp(x0, x1, t), lerp(y0, y1, t) + 4 * sag * t * (t - 1) * -1];
    this.line([...Array(31)].map((_, i) => P(i / 30)), color, w);
    if (lights && this.glow) for (let i = 1; i < lights; i++) { const [x, y] = P(i / lights); this.g.fillStyle = glow; this.g.beginPath(); this.g.arc(x, y, .55, 0, Math.PI * 2); this.g.fill(); }
    return P;
  }
  umbrella(x, y, s = 4, color = '#e8574a') {
    this.line([[x, y], [x, y - s]], '#7a6a5a', .3);
    this.poly([[x - s * .55, y - s * .8], [x, y - s * 1.15], [x + s * .55, y - s * .8]], color);
    this.poly([[x, y - s * 1.15], [x + s * .55, y - s * .8], [x + s * .1, y - s * .85]], this.shade(color, -.2));
    return this;
  }
  // tiny printed figures (static, part of the picture — never animated as bodies)
  people(x0, x1, y, { n = 5, s = 3.2, colors = ['#3a4a5a', '#b5523b', '#e0b14a', '#4f6e4a', '#7a5a8a'], seed = 8 } = {}) {
    const R = rng(this.seed * 19 + seed);
    for (let i = 0; i < n; i++) {
      const x = lerp(x0, x1, (i + .2 + R() * .6) / n), h = s * (.85 + R() * .3), c = colors[i % colors.length];
      this.rect(x - h * .07, y - h * .45, h * .06, h * .45, '#3a332c'); this.rect(x + h * .01, y - h * .45, h * .06, h * .45, '#3a332c');
      this.poly([[x - h * .13, y - h * .42], [x + h * .13, y - h * .42], [x + h * .1, y - h * .82], [x - h * .1, y - h * .82]], c);
      this.circle(x, y - h * .92, h * .1, '#e2b79a'); this.circle(x - h * .02, y - h * .97, h * .09, '#2e2620');
    }
    return this;
  }
  // a hillside of small stacked houses in pastel colours, flat roofs, tiny windows lit at night (hill villages, favelas)
  houses(x0, x1, yBase, { rows = 5, size = 7, palette = ['#e9a3a0', '#f3d17a', '#9cc9d8', '#b9d79a', '#f0b77a', '#c7b3e0', '#f4efe4'], slope = .6, seed = 6, lit = .5 } = {}) {
    const R = rng(this.seed * 23 + seed);
    for (let r = rows - 1; r >= 0; r--) {
      let x = x0 + r * size * slope * .5;
      const xe = x1 - r * size * slope * .5, y = yBase - r * size * .78;
      while (x < xe - size * .4) {
        const w = size * (.7 + R() * .6), h = size * (.55 + R() * .5), c = palette[Math.floor(R() * palette.length)];
        this.block(x, y + R() * 1.2, w, h, { wall: c, side: size * .22, roofColor: R() < .3 ? '#7fa3b8' : this.shade(c, .25), windows: { rows: 1, cols: Math.max(1, Math.round(w / 3.4)), color: '#55697a', lit, seed: Math.round(R() * 1000), my: .3, mx: .22 } });
        x += w * (.92 + R() * .12);
      }
    }
    return this;
  }
}
