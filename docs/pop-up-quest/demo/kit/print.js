// pop-up-quest — the printed page under each pop-up: cream stock, the chapter's ground (land, water, sand, a dotted
// route), the region name and plate number in the corners, the gutter shadow. One canvas per spread; the left page
// shows its left half, the right page its right half. Page coordinates: x ∈ [-W, W] (spine at 0), z ∈ [-D/2, D/2]
// (z grows toward the reader), the same coordinates the sets use.
import * as T from 'three';

export const PRINT_W = 2048;
const rng = seed => { let s = seed >>> 0 || 1; return () => ((s = Math.imul(1664525, s) + 1013904223 >>> 0) / 4294967296); };

export function blob(cx, cz, rx, rz, seed = 1, n = 40, wob = .08) {      // an organic closed outline in page units
  const r = rng(seed), k = [r() * 6, r() * 6, r() * 6];
  return Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2;
    const w = 1 + wob * (Math.sin(3 * a + k[0]) + .6 * Math.sin(5 * a + k[1]) + .35 * Math.sin(9 * a + k[2]));
    return [cx + Math.cos(a) * rx * w, cz + Math.sin(a) * rz * w]; });
}

export function drawPrint(ch, i, book, W, D) {
  const PW = PRINT_W, PH = Math.round(PW * D / (2 * W));
  const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH; const g = cv.getContext('2d');
  const X = x => (x + W) / (2 * W) * PW, Z = z => (z + D / 2) / D * PH, S = PW / (2 * W);
  const theme = book.theme || {}, gr = ch.ground || {};
  const poly = (pts, close = true) => { g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(X(p[0]), Z(p[1])) : g.moveTo(X(p[0]), Z(p[1]))); if (close) g.closePath(); };
  const r = rng(97 + i * 13);
  // stock
  g.fillStyle = theme.paper || '#efe2c2'; g.fillRect(0, 0, PW, PH);
  for (let k = 0; k < 9000; k++) { g.fillStyle = k % 3 ? 'rgba(120,90,50,.035)' : 'rgba(255,255,240,.06)'; g.fillRect(r() * PW, r() * PH, 1 + r() * 6, 1); }
  // ground — land blob (or custom outline), then water, sand, extra fills, then the route
  const land = gr.shape || blob(0, -.1, W - .55, D / 2 - .55, 11 + i * 7, 56, .05);
  if (gr.land !== null) {
    g.save(); poly(land); g.fillStyle = gr.land || '#aac57f'; g.fill();
    g.clip(); for (let k = 0; k < 1400; k++) { g.fillStyle = k % 2 ? 'rgba(40,70,30,.08)' : 'rgba(255,250,210,.08)'; g.beginPath(); g.arc(r() * PW, r() * PH, 1 + r() * 2.2, 0, 7); g.fill(); }
    g.restore();
    poly(land); g.strokeStyle = shade(gr.land || '#aac57f', .72); g.lineWidth = 5; g.stroke();
    g.setLineDash([2, 10]); poly(land.map(p => [p[0] * 1.012, p[1] * 1.02])); g.strokeStyle = 'rgba(60,50,35,.35)'; g.lineWidth = 2.5; g.stroke(); g.setLineDash([]);
  }
  for (const f of gr.fills || []) { poly(f.pts); g.fillStyle = f.color; g.fill(); }
  for (const w of gr.water || []) {
    g.save(); poly(w); g.fillStyle = gr.waterColor || '#86bdb8'; g.fill(); g.strokeStyle = shade(gr.waterColor || '#86bdb8', .78); g.lineWidth = 4; g.stroke(); g.clip();
    g.strokeStyle = 'rgba(255,255,245,.55)'; g.lineWidth = 3; g.lineCap = 'round';
    const xs = w.map(p => p[0]), zs = w.map(p => p[1]);
    for (let k = 0; k < 26; k++) { const x = Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs)), z = Math.min(...zs) + r() * (Math.max(...zs) - Math.min(...zs)); g.beginPath(); g.moveTo(X(x), Z(z)); g.quadraticCurveTo(X(x + .14), Z(z) - 7, X(x + .28), Z(z)); g.stroke(); }
    g.restore();
  }
  for (const s of gr.sand || []) { poly(s); g.fillStyle = gr.sandColor || '#e3cf9c'; g.fill(); }
  if (gr.path) { g.setLineDash([14, 12]); g.lineCap = 'round'; poly(gr.path, false); g.strokeStyle = 'rgba(70,55,38,.62)'; g.lineWidth = 6; g.stroke(); g.setLineDash([]);
    const e = gr.path[gr.path.length - 1]; g.strokeStyle = 'rgba(160,60,45,.8)'; g.lineWidth = 6; g.beginPath(); g.moveTo(X(e[0]) - 13, Z(e[1]) - 13); g.lineTo(X(e[0]) + 13, Z(e[1]) + 13); g.moveTo(X(e[0]) + 13, Z(e[1]) - 13); g.lineTo(X(e[0]) - 13, Z(e[1]) + 13); g.stroke(); }
  // corners: region (left page, bottom-left) and plate number (right page, bottom-right)
  g.fillStyle = 'rgba(52,44,33,.72)'; g.textBaseline = 'alphabetic';
  g.font = `600 ${Math.round(S * .17)}px BookSerif, Georgia, serif`;
  spaced(g, (ch.region || '').toUpperCase(), X(-W + .45), Z(D / 2 - .28), S * .045);
  g.font = `italic 400 ${Math.round(S * .13)}px BookSerif, Georgia, serif`;
  if (ch.coords) g.fillText(ch.coords, X(-W + .45), Z(D / 2 - .1));
  g.font = `600 ${Math.round(S * .17)}px BookSerif, Georgia, serif`;
  const plate = `PLATE ${String(i + 1).padStart(2, '0')}`; spaced(g, plate, X(W - .45) - spacedWidth(g, plate, S * .045), Z(D / 2 - .28), S * .045);
  // gutter: crease and shadow
  const gx = X(0), sh = g.createLinearGradient(gx - 90, 0, gx + 90, 0);
  sh.addColorStop(0, 'rgba(60,40,20,0)'); sh.addColorStop(.42, 'rgba(60,40,20,.16)'); sh.addColorStop(.5, 'rgba(60,40,20,.32)'); sh.addColorStop(.58, 'rgba(60,40,20,.16)'); sh.addColorStop(1, 'rgba(60,40,20,0)');
  g.fillStyle = sh; g.fillRect(gx - 90, 0, 180, PH);
  // outer page edges darken a little, like handled stock
  for (const [x0, x1] of [[0, 40], [PW, PW - 40]]) { const e = g.createLinearGradient(x0, 0, x1, 0); e.addColorStop(0, 'rgba(90,60,30,.18)'); e.addColorStop(1, 'rgba(90,60,30,0)'); g.fillStyle = e; g.fillRect(Math.min(x0, x1), 0, 40, PH); }
  const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
  return { canvas: cv, texture: tex };
}
function spaced(g, text, x, y, sp) { for (const ch of text) { g.fillText(ch, x, y); x += g.measureText(ch).width + sp; } }
function spacedWidth(g, text, sp) { let w = 0; for (const ch of text) w += g.measureText(ch).width + sp; return w; }
function shade(hex, k) { const c = new T.Color(hex), h = {}; c.getHSL(h); c.setHSL(h.h, h.s, h.l * k); return '#' + c.getHexString(); }
