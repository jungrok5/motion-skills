// one-line-drawing · ref.js — the faded grey "photograph" under the pen, painted in code from the scene's shapes:
// a foggy sky, wet or open ground, every shape in a tone set by its depth (far = pale and soft, near = dark and
// crisp), reflections on wet ground and water, a horizon haze, vignette and grain. Or the user's own photo, greyed.
import { canvas, noise2, rng, mixHex, hexRgb, boxBlur } from './core.js';
import { W, H } from './scene.js';

const DARK = '#1f1f20';

export function paintRef(S) {
  const c = canvas(W, H), g = c.getContext('2d'), st = S.set, hz = st.horizon;
  // sky: a little darker at the top, brightest in the fog at the horizon
  const sky = g.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, mixHex(st.sky, DARK, .1)); sky.addColorStop(.75, st.sky); sky.addColorStop(1, mixHex(st.fog, '#ffffff', .25));
  g.fillStyle = sky; g.fillRect(0, 0, W, hz + 2);
  ground(g, S);
  // shapes far → near, each through a layer cropped to its bounds
  const shapes = [...S.shapes.values()].sort((a, b) => b.depth - a.depth);
  const lay = canvas(W, H), lg = lay.getContext('2d');
  for (const s of shapes) {
    const tone = s.tone || mixHex(DARK, st.fog, .1 + .8 * s.depth ** 1.05);
    const b = maskBounds(S.mask(s.name)), pad = 24;
    if (!b) continue;
    const x0 = Math.max(0, b.x0 - pad), y0 = Math.max(0, b.y0 - pad), x1 = Math.min(W, b.x1 + pad), y1 = Math.min(H, b.y1 + pad);
    lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, W, H);
    lg.fillStyle = tone; lg.strokeStyle = tone; s.draw(lg);
    if (s.reflect && (st.ground === 'wet' || st.ground === 'water')) reflection(g, lay, S, s, { x0, y0, x1, y1 });
    boxBlur(lay, .5 + s.depth * 5, x0, y0, x1 - x0, y1 - y0);
    g.drawImage(lay, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    // fog sits between depths: a thin veil over everything behind the nearer shapes
    if (s.depth > .45) { g.fillStyle = `rgba(${hexRgb(st.fog).join(',')},${(.05 * s.depth).toFixed(3)})`; g.fillRect(0, 0, W, H); }
  }
  // the horizon haze and a light veil over the whole picture
  const hzG = g.createLinearGradient(0, hz - 260, 0, hz + 220);
  hzG.addColorStop(0, `rgba(${hexRgb(st.fog).join(',')},0)`); hzG.addColorStop(.55, `rgba(${hexRgb(st.fog).join(',')},.38)`); hzG.addColorStop(1, `rgba(${hexRgb(st.fog).join(',')},0)`);
  g.fillStyle = hzG; g.fillRect(0, hz - 260, W, 480);
  // vignette
  const v = g.createRadialGradient(W / 2, H * .48, H * .3, W / 2, H * .5, H * .78);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.16)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  grain(c, 9, S.seed * 7 + 1);
  return c;
}

function ground(g, S) {
  const st = S.set, hz = st.horizon, n = noise2(S.seed * 3 + 11), r = rng(S.seed * 5 + 2);
  const base = { wet: st.earth, water: mixHex(st.fog, DARK, .18), field: mixHex(st.earth, '#6d6d66', .4), snow: mixHex(st.fog, '#ffffff', .4), floor: mixHex(st.earth, st.fog, .4) }[st.ground] || st.earth;
  const gr = g.createLinearGradient(0, hz, 0, H);
  gr.addColorStop(0, mixHex(st.fog, '#ffffff', .15)); gr.addColorStop(.3, mixHex(base, st.fog, .45)); gr.addColorStop(1, mixHex(base, DARK, .25));
  g.fillStyle = gr; g.fillRect(0, hz, W, H - hz);
  // texture: puddles and wet patches (wet), long glints (water), tufts (field), soft drifts (snow)
  const id = g.getImageData(0, hz, W, H - hz), d = id.data, hh = H - hz;
  for (let y = 0; y < hh; y++) {
    const k = y / hh, sy = 1 / (.08 + k); // perspective: features squash toward the horizon
    for (let x = 0; x < W; x++) {
      let v = 0;
      if (st.ground === 'wet') { const p = n(x / 90, y * sy / 30); v = p > .25 ? 26 * (p - .25) : p < -.35 ? -18 : 0; v += n(x / 7, y * sy / 3) * 7; }
      else if (st.ground === 'water') v = n(x / 160, y * sy / 3.5) * 18 + n(x / 30, y * sy / 1.2) * 6;
      else if (st.ground === 'field') v = n(x / 12, y * sy / 6) * 14 + n(x / 120, y * sy / 40) * 10;
      else if (st.ground === 'snow') v = n(x / 200, y * sy / 60) * 8;
      else v = n(x / 60, y / 60) * 5;
      v *= .35 + k * .9;
      const i = (y * W + x) * 4; d[i] += v; d[i + 1] += v; d[i + 2] += v;
    }
  }
  g.putImageData(id, 0, hz);
  if (st.ground === 'wet') for (let i = 0; i < 260; i++) { const y = hz + (H - hz) * r() ** 1.6, s = 1 + (y - hz) / (H - hz) * 5; g.fillStyle = `rgba(30,30,30,${(.05 + r() * .12).toFixed(3)})`; g.beginPath(); g.ellipse(r() * W, y, s * r.range(.6, 1.6), s * .45, 0, 0, Math.PI * 2); g.fill(); }
}

// the shape flipped about its ground line, stretched, broken into rippling rows, softened, lighter
let _rl = null;
function reflection(g, lay, S, s, b) {
  const gy = S.groundOf(s.name), sq = 1.15, n = noise2(S.seed * 17 + s.name.length);
  const water = S.set.ground === 'water', h = Math.min(H - gy, (gy - b.y0) * sq);
  if (h < 4) return;
  const rl = _rl || (_rl = canvas(W, H)), rg = rl.getContext('2d'), pad = 40, x0 = Math.max(0, b.x0 - pad), x1 = Math.min(W, b.x1 + pad);
  rg.clearRect(x0, gy, x1 - x0, h + 8);
  for (let y = 0; y < h; y += 4) {
    const srcY = gy - y / sq, off = n(y / 16, s.depth * 9) * (2 + y * .04) * (water ? 2 : 1);
    if (srcY < b.y0) break;
    rg.drawImage(lay, b.x0, srcY - 2, b.x1 - b.x0, 2.5, b.x0 + off, gy + y, b.x1 - b.x0, 4.2);
  }
  boxBlur(rl, 1.5 + s.depth * 4, x0, gy, x1 - x0, h + 8);
  g.save(); g.globalAlpha = water ? .5 : .38; g.drawImage(rl, x0, gy, x1 - x0, h + 8, x0, gy, x1 - x0, h + 8); g.restore();
}

function maskBounds({ m, w, h, res }) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x0: x0 / res, y0: y0 / res, x1: (x1 + 1) / res, y1: (y1 + 1) / res };
}
function grain(c, amp, seed) {
  const g = c.getContext('2d'), im = g.getImageData(0, 0, c.width, c.height), d = im.data, r = rng(seed);
  for (let i = 0; i < d.length; i += 4) { const v = (r() - .5) * amp; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
  g.putImageData(im, 0, 0);
}

// the user's own photo as the reference: cover-fit, grey, lifted and flattened like a faded print
export function photoRef(img) {
  const c = canvas(W, H), g = c.getContext('2d'), k = Math.max(W / img.width, H / img.height);
  g.drawImage(img, (W - img.width * k) / 2, (H - img.height * k) / 2, img.width * k, img.height * k);
  // grey, flattened, lifted (no ctx.filter: see boxBlur in core.js)
  const im = g.getImageData(0, 0, W, H), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const l = .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2], v = ((l - 128) * .62 + 128) * 1.28; d[i] = d[i + 1] = d[i + 2] = v; }
  g.putImageData(im, 0, 0); grain(c, 7, 5); return c;
}
