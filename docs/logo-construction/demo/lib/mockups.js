// logo-construction · mockups.js — the closing shots: the finished mark applied to things, drawn in code (no photos).
// Each kind is a still 1080×1920 scene built once per film and pushed in slowly. The brief picks the kinds, the
// colours and any line of text; the mark itself always comes from the Mark (mark.sprite), never from an image file.
//   { kind: 'fabric', base: '#2142a6', ink: '#f3efe6' }            chest of a fleece jacket, mark printed by the zip
//   { kind: 'bottle', base: '#7d8a4e', ink: '#1b1d17', sky: '#c9d3d8' }  a metal bottle outdoors, mark wrapped round it
//   { kind: 'card',   base: '#1f1f22', ink: '#f2ede4', paper: '#f4f1ea', text: 'Name · Studio' }  business cards on stone
//   { kind: 'sign',   base: '#173b34', ink: '#e9dcc0', wall: '#d9cfc0' }    a round blade sign on a plaster wall
//   { kind: 'tote',   base: '#e8e0cf', ink: '#1d1d1d', back: '#c7b9a3' }    a canvas tote bag, screen-printed
// Add a kind in your project by adding a function to MOCKUPS (same signature) before Film.start().
import { canvas, rng, noise1, shade, rgba, grain, clamp, lerp } from './core.js';

export const W = 1080, H = 1920;

export const MOCKUPS = { fabric, bottle, card, sign, tote };

export function drawMockup(mk, mark, o, seed) {
  const f = MOCKUPS[mk.kind];
  const c = canvas(W, H), g = c.getContext('2d');
  if (!f) { g.fillStyle = '#f0f'; g.fillRect(0, 0, W, H); return c; }
  f(g, mark, { ink: o.ink, paper: o.paper, ...mk }, rng(seed));
  return c;
}

// ---- shared ----------------------------------------------------------------------------------------------------
function layer() { return canvas(W, H); }
function blurred(src, px) { const c = canvas(src.width, src.height), g = c.getContext('2d'); g.filter = `blur(${px}px)`; g.drawImage(src, 0, 0); return c; }
// photographic depth of field: blur toward the top and bottom of the frame, sharp band around focusY
function dof(g, focusY, band, px) {
  const src = canvas(W, H); src.getContext('2d').drawImage(g.canvas, 0, 0);
  const b = blurred(src, px), m = canvas(W, H), mg = m.getContext('2d');
  mg.drawImage(b, 0, 0); mg.globalCompositeOperation = 'destination-in';
  const gr = mg.createLinearGradient(0, 0, 0, H);
  const a = clamp((focusY - band) / H), z = clamp((focusY + band) / H);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(Math.max(0, a - .12), 'rgba(0,0,0,.85)'); gr.addColorStop(a, 'rgba(0,0,0,0)');
  gr.addColorStop(z, 'rgba(0,0,0,0)'); gr.addColorStop(Math.min(1, z + .12), 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
  mg.fillStyle = gr; mg.fillRect(0, 0, W, H);
  g.drawImage(m, 0, 0);
}
function vignette(g, k = .35) {
  const r = g.createRadialGradient(W / 2, H * .48, H * .2, W / 2, H * .5, H * .75);
  r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, `rgba(0,0,0,${k})`); g.fillStyle = r; g.fillRect(0, 0, W, H);
}
// soft light/dark folds: blurred bands, multiplied and screened over the surface
function folds(g, r, n, dark = .35, light = .16, blur = 55, clip = null) {
  const L = layer(), lg = L.getContext('2d');
  for (let i = 0; i < n; i++) {
    const x = r.range(-200, W + 200), y = r.range(-100, H + 100), a = r.range(-.9, -.3) + (r() < .3 ? Math.PI / 2 : 0), len = r.range(500, 1300), w = r.range(40, 160);
    lg.save(); lg.translate(x, y); lg.rotate(a);
    lg.fillStyle = i % 3 === 0 ? `rgba(255,255,255,${light})` : `rgba(0,0,0,${dark})`;
    lg.beginPath(); lg.ellipse(0, 0, len / 2, w / 2, 0, 0, Math.PI * 2); lg.fill(); lg.restore();
  }
  const B = blurred(L, blur);
  g.save(); if (clip) { g.beginPath(); clip(g); g.clip(); }
  g.globalCompositeOperation = 'soft-light'; g.drawImage(B, 0, 0); g.drawImage(B, 0, 0);
  g.restore();
  return B;
}
// a printed / embroidered mark: colour, optional texture knock-out, slight softness
function printMark(g, mark, cx, cy, size, color, o = {}) {
  const sp = mark.sprite(size, color, 8), x = cx - sp.width / 2, y = cy - sp.height / 2;
  const m = canvas(sp.width, sp.height), mg = m.getContext('2d');
  if (o.soft) mg.filter = `blur(${o.soft}px)`;
  mg.drawImage(sp, 0, 0); mg.filter = 'none';
  if (o.wear) { // ink worn by the surface: tiny holes
    const r = rng(o.seed || 9); mg.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < sp.width * sp.height * o.wear / 40; i++) { mg.globalAlpha = r.range(.15, .6); mg.fillRect(r() * sp.width, r() * sp.height, r.range(.7, 2.2), r.range(.7, 2.2)); }
    mg.globalAlpha = 1; mg.globalCompositeOperation = 'source-over';
  }
  g.save();
  if (o.shadow) { g.shadowColor = o.shadow; g.shadowBlur = o.shadowBlur ?? 3; g.shadowOffsetX = o.dx ?? 0; g.shadowOffsetY = o.dy ?? 2; }
  g.globalAlpha = o.alpha ?? 1; g.drawImage(m, x, y);
  g.restore();
  return { x, y, w: sp.width, h: sp.height, sprite: m };
}

// ---- fabric: chest of a fleece jacket -------------------------------------------------------------------------
function fabric(g, mark, o, r) {
  const base = o.base || '#2142a6';
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  // fleece fibres: many tiny curls lighter and darker than the base
  for (let i = 0; i < 70000; i++) {
    const x = r() * W, y = r() * H, l = r.range(2, 6), a = r() * Math.PI * 2;
    g.strokeStyle = r() < .5 ? rgba(shade(base, .35), .22) : rgba(shade(base, -.45), .25); g.lineWidth = r.range(.8, 1.8);
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l, y + Math.sin(a) * l, x + Math.cos(a + 1.4) * l, y + Math.sin(a + 1.4) * l); g.stroke();
  }
  grain(g.canvas, 16, 7);
  // the collar opening, top left: dark, with the neck band falling across it
  g.save(); g.fillStyle = '#111317';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(560, 0); g.bezierCurveTo(520, 120, 380, 230, 0, 260); g.closePath(); g.fill();
  const band = g.createLinearGradient(0, 180, 0, 420); band.addColorStop(0, shade(base, -.25)); band.addColorStop(1, shade(base, -.05));
  g.fillStyle = band; g.beginPath(); g.moveTo(0, 230); g.bezierCurveTo(330, 210, 520, 110, 600, -10); g.lineTo(700, -10); g.bezierCurveTo(630, 170, 400, 340, 0, 390); g.closePath(); g.fill();
  g.restore();
  // zipper down the left: tape, teeth, pull
  const zx = y => 300 + Math.sin(y / 700) * 30;
  g.save();
  g.strokeStyle = shade(base, -.55); g.lineWidth = 34; g.beginPath(); for (let y = 280; y <= H; y += 20) (y === 280 ? g.moveTo(zx(y), y) : g.lineTo(zx(y), y)); g.stroke();
  for (let y = 300; y < H; y += 13) { const x = zx(y), lf = (y / 13) % 2 < 1; g.fillStyle = lf ? '#3b3d42' : '#2e3034'; g.fillRect(x + (lf ? -11 : 0), y, 11, 9); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + (lf ? -11 : 0), y, 11, 2); }
  const py = 400, px = zx(py);
  const pg = g.createLinearGradient(px - 20, 0, px + 20, 0); pg.addColorStop(0, '#53565c'); pg.addColorStop(.5, '#a9adb3'); pg.addColorStop(1, '#45484e');
  g.fillStyle = pg; g.beginPath(); g.roundRect(px - 18, py - 30, 36, 60, 8); g.fill();
  g.beginPath(); g.roundRect(px - 13, py + 26, 26, 110, 10); g.fill(); g.fillStyle = '#1b1c1f'; g.beginPath(); g.roundRect(px - 6, py + 60, 12, 56, 6); g.fill();
  g.restore();
  // seam across the chest
  g.strokeStyle = rgba(shade(base, -.5), .6); g.lineWidth = 3; g.setLineDash([10, 8]);
  g.beginPath(); g.moveTo(340, 1580); g.bezierCurveTo(600, 1540, 820, 1600, W + 20, 1560); g.stroke(); g.setLineDash([]);
  // the mark, printed on the chest; then the folds over everything so the print follows the cloth
  const size = o.size || 360;
  printMark(g, mark, o.at?.[0] ?? 690, o.at?.[1] ?? 980, size, o.ink, { soft: .9, wear: .5, shadow: 'rgba(0,0,0,.25)', dy: 2, seed: 4 });
  folds(g, r, 16, .55, .3, 70);
  dof(g, 980, 420, 9);
  vignette(g, .4);
}

// ---- bottle: a powder-coated metal bottle outdoors ------------------------------------------------------------
function bottle(g, mark, o, r) {
  const base = o.base || '#7d8a4e', sky = o.sky || '#c6d0d6';
  // background: sky, two ranges of hills, a forest band — then blurred as if far out of focus
  const B = layer(), bg = B.getContext('2d');
  const sg = bg.createLinearGradient(0, 0, 0, H); sg.addColorStop(0, sky); sg.addColorStop(.45, shade(sky, -.12)); sg.addColorStop(1, shade(o.ground || '#3e4a34', -.2));
  bg.fillStyle = sg; bg.fillRect(0, 0, W, H);
  const ridge = (y0, amp, col, sd) => { const n = noise1(sd); bg.fillStyle = col; bg.beginPath(); bg.moveTo(0, H); for (let x = 0; x <= W; x += 8) bg.lineTo(x, y0 - amp * (n(x / 160) * .7 + n(x / 50) * .3)); bg.lineTo(W, H); bg.fill(); };
  ridge(560, 160, shade(sky, -.28), 3); ridge(720, 110, shade(sky, -.42), 8); ridge(900, 60, o.ground || '#3e4a34', 13);
  for (let i = 0; i < 26; i++) { bg.fillStyle = `rgba(255,255,255,${r.range(.05, .2)})`; bg.beginPath(); bg.arc(r() * W, r.range(200, 900), r.range(20, 70), 0, 7); bg.fill(); }
  g.drawImage(blurred(B, 22), 0, 0);
  // a pack strap on the right, out of focus
  g.save(); g.filter = 'blur(6px)'; g.fillStyle = shade(o.strap || '#5b5a3a', -.1); g.beginPath(); g.moveTo(860, -20); g.lineTo(1010, -20); g.lineTo(1100, H); g.lineTo(930, H); g.fill(); g.restore();
  // the bottle: a cylinder with a shoulder, neck and cap
  const cx = 520, R = 255, top = 560, neck = 120;
  const body = new Path2D(); body.moveTo(cx - R, H + 40); body.lineTo(cx - R, top + 120); body.bezierCurveTo(cx - R, top + 40, cx - neck - 20, top + 20, cx - neck, top - 20);
  body.lineTo(cx + neck, top - 20); body.bezierCurveTo(cx + neck + 20, top + 20, cx + R, top + 40, cx + R, top + 120); body.lineTo(cx + R, H + 40); body.closePath();
  g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 50; g.shadowOffsetX = 18; g.fillStyle = base; g.fill(body); g.restore();
  g.save(); g.clip(body);
  const cyl = (alpha = 1) => { const lg = g.createLinearGradient(cx - R, 0, cx + R, 0);
    lg.addColorStop(0, `rgba(0,0,0,${.55 * alpha})`); lg.addColorStop(.12, `rgba(0,0,0,${.18 * alpha})`); lg.addColorStop(.3, `rgba(255,255,255,${.22 * alpha})`); lg.addColorStop(.36, `rgba(255,255,255,${.05 * alpha})`);
    lg.addColorStop(.7, `rgba(0,0,0,${.22 * alpha})`); lg.addColorStop(.92, `rgba(0,0,0,${.5 * alpha})`); lg.addColorStop(1, `rgba(255,255,255,${.12 * alpha})`); return lg; };
  // powder-coat texture
  const T = layer(); T.getContext('2d').fillStyle = '#808080'; T.getContext('2d').fillRect(0, 0, W, H); grain(T, 40, 21);
  g.globalAlpha = .18; g.globalCompositeOperation = 'overlay'; g.drawImage(T, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  // the mark wrapped round the cylinder: vertical strips placed by x = R·sin(u/R)
  const size = o.size || 330, sp = mark.sprite(size, o.ink, 4), my = o.at?.[1] ?? 1240;
  const sw = sp.width, n = 90;
  for (let i = 0; i < n; i++) {
    const u0 = (i / n - .5) * sw, u1 = ((i + 1) / n - .5) * sw;
    const x0 = cx - 20 + R * Math.sin(u0 / R), x1 = cx - 20 + R * Math.sin(u1 / R);
    g.drawImage(sp, i / n * sw, 0, sw / n + .6, sp.height, x0, my - sp.height / 2, Math.max(.5, x1 - x0 + .4), sp.height);
  }
  g.fillStyle = cyl(1); g.fillRect(cx - R, 0, 2 * R, H);
  // shoulder shading
  const sh = g.createLinearGradient(0, top - 20, 0, top + 160); sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(.6, 'rgba(255,255,255,.08)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sh; g.fillRect(cx - R, top - 20, 2 * R, 180);
  // condensation droplets
  for (let i = 0; i < 70; i++) {
    const x = cx + r.range(-R * .9, R * .9), y = r.range(top + 140, H - 40), rr = r.range(3, 10);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x + 1, y + 2, rr * .8, rr, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.ellipse(x, y, rr * .75, rr * .95, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(x - rr * .3, y - rr * .4, rr * .22, 0, 7); g.fill();
  }
  g.restore();
  // cap with a carry loop
  const capC = o.cap || '#2a2b2d';
  g.save(); g.strokeStyle = shade(capC, .1); g.lineWidth = 34; g.beginPath(); g.ellipse(cx, top - 260, 86, 120, 0, Math.PI * .92, Math.PI * 2.08); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 6; g.beginPath(); g.ellipse(cx - 6, top - 266, 80, 112, 0, Math.PI * 1.1, Math.PI * 1.5); g.stroke();
  const cg = g.createLinearGradient(cx - neck - 10, 0, cx + neck + 10, 0); cg.addColorStop(0, shade(capC, -.5)); cg.addColorStop(.3, shade(capC, .35)); cg.addColorStop(.75, capC); cg.addColorStop(1, shade(capC, -.6));
  g.fillStyle = cg; g.beginPath(); g.roundRect(cx - neck - 10, top - 230, 2 * neck + 20, 220, 22); g.fill();
  for (let y = top - 210; y < top - 30; y += 18) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(cx - neck - 10, y, 2 * neck + 20, 4); }
  g.restore();
  dof(g, 1150, 650, 6);
  vignette(g, .3);
}

// ---- card: business cards on stone, window light ---------------------------------------------------------------
function card(g, mark, o, r) {
  const stone = o.surface || '#cfcac2';
  g.fillStyle = stone; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},${r.range(.02, .06)})`; g.beginPath(); g.ellipse(r() * W, r() * H, r.range(60, 300), r.range(40, 200), r() * 3, 0, 7); g.fill(); }
  g.filter = 'blur(30px)'; g.drawImage(g.canvas, 0, 0); g.filter = 'none';
  grain(g.canvas, 22, 31);
  const paper = o.paper || '#f4f1ea', back = o.base || '#1f1f22';
  const cardAt = (cx, cy, rot, fn) => {
    const w = 820, h = 470; g.save(); g.translate(cx, cy); g.rotate(rot);
    g.shadowColor = 'rgba(0,0,0,.28)'; g.shadowBlur = 40; g.shadowOffsetY = 26; g.shadowOffsetX = 10;
    g.fillStyle = '#000'; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 10); g.fill();
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 4; g.shadowOffsetY = 3; g.shadowOffsetX = 1; g.fill();
    g.shadowColor = 'transparent'; fn(w, h); g.restore();
  };
  // the back card: brand colour, big mark knocked out in paper
  cardAt(560, 700, -.16, (w, h) => {
    g.fillStyle = back; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 10); g.fill();
    printMark(g, mark, 0, 0, h * .56, o.ink, { shadow: 'rgba(0,0,0,.35)', dy: -1.5, shadowBlur: 1.5 });
  });
  // the front card: paper, small mark, name line
  cardAt(500, 1230, .07, (w, h) => {
    const pg = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); pg.addColorStop(0, shade(paper, .3)); pg.addColorStop(1, shade(paper, -.04));
    g.fillStyle = pg; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 10); g.fill();
    printMark(g, mark, -w * .25, -h * .02, h * .38, o.cardInk || back, { shadow: 'rgba(255,255,255,.8)', dy: 1.5, shadowBlur: 0 });
    const txt = o.text || ''; const [t1, t2] = txt.split('·').map(s => s.trim());
    const ko = /[ㄱ-힝]/.test(txt), fam = ko ? 'LCKo' : 'LCSans';
    g.fillStyle = o.cardInk || back; g.textBaseline = 'alphabetic';
    if (t1) { g.font = `700 40px ${fam}`; if ('letterSpacing' in g) g.letterSpacing = '1px'; g.fillText(t1, w * .02, -h * .02); }
    if (t2) { g.font = `500 24px ${fam}`; if ('letterSpacing' in g) g.letterSpacing = '4px'; g.globalAlpha = .7; g.fillText(t2.toUpperCase(), w * .02, h * .1); g.globalAlpha = 1; }
    g.fillStyle = rgba(o.cardInk || back, .5); g.fillRect(w * .02, h * .18, 120, 3);
  });
  // window light falling across: two soft bright panes with a mullion shadow
  const L = layer(), lg = L.getContext('2d');
  lg.fillStyle = 'rgba(255,248,232,.55)'; lg.save(); lg.translate(W * .1, -200); lg.rotate(.42);
  lg.fillRect(0, 0, 520, 2600); lg.fillRect(600, 0, 520, 2600); lg.restore();
  g.save(); g.globalCompositeOperation = 'soft-light'; g.drawImage(blurred(L, 40), 0, 0); g.drawImage(blurred(L, 40), 0, 0); g.restore();
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(80,70,60,.18)'; g.fillRect(0, 0, W, H); g.restore();
  dof(g, 1000, 640, 5);
  vignette(g, .32);
}

// ---- sign: a round blade sign on a plaster wall ----------------------------------------------------------------
function sign(g, mark, o, r) {
  const wall = o.wall || '#d9cfc0', base = o.base || '#173b34';
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${r() < .55 ? '60,45,30' : '255,255,255'},${r.range(.02, .07)})`; g.beginPath(); g.ellipse(r() * W, r() * H, r.range(40, 260), r.range(30, 160), r() * 3, 0, 7); g.fill(); }
  g.filter = 'blur(18px)'; g.drawImage(g.canvas, 0, 0); g.filter = 'none';
  grain(g.canvas, 30, 41);
  // a warm lamp from the upper left
  const lamp = g.createRadialGradient(240, 260, 20, 240, 260, 1100); lamp.addColorStop(0, 'rgba(255,214,150,.55)'); lamp.addColorStop(1, 'rgba(255,214,150,0)');
  g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = lamp; g.fillRect(0, 0, W, H); g.fillRect(0, 0, W, H); g.restore();
  const cx = o.at?.[0] ?? 600, cy = o.at?.[1] ?? 960, R = 330;
  // bracket from the wall on the left
  g.save(); g.shadowColor = 'rgba(40,25,10,.45)'; g.shadowBlur = 26; g.shadowOffsetX = 34; g.shadowOffsetY = 40;
  g.strokeStyle = '#1d1d1f'; g.lineWidth = 22; g.lineCap = 'round';
  g.beginPath(); g.moveTo(60, cy - R - 70); g.lineTo(cx + 40, cy - R - 70); g.stroke();
  g.lineWidth = 12; g.beginPath(); g.moveTo(80, cy - R + 60); g.quadraticCurveTo(200, cy - R - 60, 420, cy - R - 66); g.stroke();
  g.beginPath(); g.arc(150, cy - R - 10, 40, Math.PI * .2, Math.PI * 1.6); g.stroke();
  g.fillStyle = '#1d1d1f'; g.fillRect(30, cy - R - 120, 44, 230);
  // chains
  g.lineWidth = 6; for (const dx of [-R * .55, R * .55]) { g.beginPath(); g.moveTo(cx + dx, cy - R - 70); g.lineTo(cx + dx, cy - R * .82); g.stroke(); }
  // the plate with a bevelled rim
  g.fillStyle = shade(base, -.3); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  g.restore();
  const rim = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R); rim.addColorStop(0, shade(o.rim || '#b8935a', .35)); rim.addColorStop(.5, o.rim || '#b8935a'); rim.addColorStop(1, shade(o.rim || '#b8935a', -.45));
  g.fillStyle = rim; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  const face = g.createRadialGradient(cx - R * .3, cy - R * .35, 10, cx, cy, R); face.addColorStop(0, shade(base, .18)); face.addColorStop(1, shade(base, -.25));
  g.fillStyle = face; g.beginPath(); g.arc(cx, cy, R - 22, 0, 7); g.fill();
  g.strokeStyle = rgba(o.ink, .55); g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R - 46, 0, 7); g.stroke();
  printMark(g, mark, cx, cy - (o.text ? 24 : 0), R * (o.text ? .9 : 1.05), o.ink, { shadow: 'rgba(0,0,0,.45)', dx: 2, dy: 4, shadowBlur: 4 });
  if (o.text) { g.fillStyle = o.ink; g.textAlign = 'center'; g.font = `700 36px ${/[ㄱ-힝]/.test(o.text) ? 'LCKo' : 'LCSans'}`; if ('letterSpacing' in g) g.letterSpacing = '6px'; g.fillText(o.text.toUpperCase(), cx, cy + R * .68); g.textAlign = 'start'; }
  // a sheen across the plate
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip();
  const sh = g.createLinearGradient(cx - R, cy - R, cx + R * .2, cy + R * .2); sh.addColorStop(0, 'rgba(255,255,255,.16)'); sh.addColorStop(.5, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  g.restore();
  dof(g, cy, 520, 5);
  vignette(g, .38);
}

// ---- tote: a canvas bag, screen-printed --------------------------------------------------------------------------
function tote(g, mark, o, r) {
  const back = o.back || '#c7b9a3', base = o.base || '#e8e0cf';
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, shade(back, .12)); bg.addColorStop(1, shade(back, -.18)); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  grain(g.canvas, 10, 51);
  const x0 = 150, x1 = 930, y0 = 640, y1 = 1720;
  const bag = new Path2D(); bag.moveTo(x0, y0); bag.lineTo(x1, y0); bag.lineTo(x1 + 24, y1); bag.quadraticCurveTo(540, y1 + 30, x0 - 24, y1); bag.closePath();
  // handles
  g.save(); g.lineCap = 'round';
  for (const [a, b] of [[x0 + 150, x0 + 330], [x1 - 330, x1 - 150]]) {
    g.strokeStyle = shade(base, -.12); g.lineWidth = 46; g.beginPath(); g.moveTo(a, y0 + 30); g.bezierCurveTo(a - 30, 200, b + 30, 200, b, y0 + 30); g.stroke();
    g.strokeStyle = rgba(shade(base, -.4), .6); g.lineWidth = 2; g.setLineDash([8, 7]); g.beginPath(); g.moveTo(a - 14, y0 + 30); g.bezierCurveTo(a - 44, 214, b + 44, 214, b + 14, y0 + 30); g.stroke(); g.setLineDash([]);
  }
  g.restore();
  g.save(); g.shadowColor = 'rgba(40,30,20,.35)'; g.shadowBlur = 60; g.shadowOffsetY = 30; g.fillStyle = base; g.fill(bag); g.restore();
  g.save(); g.clip(bag);
  // weave
  for (let y = y0; y < y1 + 40; y += 4) { g.fillStyle = `rgba(0,0,0,${.025 + r() * .03})`; g.fillRect(x0 - 30, y, x1 - x0 + 60, 1.5); }
  for (let x = x0 - 30; x < x1 + 30; x += 4) { g.fillStyle = `rgba(255,255,255,${.03 + r() * .04})`; g.fillRect(x, y0, 1.5, y1 - y0 + 40); }
  printMark(g, mark, o.at?.[0] ?? 540, o.at?.[1] ?? 1120, o.size || 400, o.ink, { wear: .9, soft: .6, seed: 12 });
  if (o.text) { g.fillStyle = o.ink; g.textAlign = 'center'; g.font = `700 42px ${/[ㄱ-힝]/.test(o.text) ? 'LCKo' : 'LCSans'}`; if ('letterSpacing' in g) g.letterSpacing = '8px'; g.fillText(o.text.toUpperCase(), 540, 1430); g.textAlign = 'start'; }
  // hem and side seams, gravity folds
  g.strokeStyle = rgba(shade(base, -.35), .7); g.lineWidth = 2; g.setLineDash([9, 7]); g.beginPath(); g.moveTo(x0, y0 + 44); g.lineTo(x1, y0 + 44); g.stroke(); g.setLineDash([]);
  g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x0, y0, x1 - x0, 30);
  folds(g, r, 12, .45, .22, 50);
  const sg = g.createLinearGradient(x0, 0, x1, 0); sg.addColorStop(0, 'rgba(0,0,0,.22)'); sg.addColorStop(.25, 'rgba(0,0,0,0)'); sg.addColorStop(.8, 'rgba(0,0,0,.04)'); sg.addColorStop(1, 'rgba(0,0,0,.28)');
  g.fillStyle = sg; g.fillRect(x0 - 30, y0, x1 - x0 + 60, y1 - y0 + 40);
  g.restore();
  vignette(g, .3);
}
void lerp;
