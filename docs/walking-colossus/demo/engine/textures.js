// Procedural texture helpers (no external assets).
import * as THREE from 'three';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Periodic (tileable) value noise on a lattice of `period` cells across the unit square.
function makeLattice(period, rnd) {
  const g = new Float32Array(period * period);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  return g;
}
function sampleLattice(g, period, x, y) {
  // x,y in [0,1)
  const fx = x * period, fy = y * period;
  const ix = Math.floor(fx), iy = Math.floor(fy);
  let tx = fx - ix, ty = fy - iy;
  tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
  const x0 = ((ix % period) + period) % period, x1 = (x0 + 1) % period;
  const y0 = ((iy % period) + period) % period, y1 = (y0 + 1) % period;
  const a = g[y0 * period + x0], b = g[y0 * period + x1];
  const c = g[y1 * period + x0], d = g[y1 * period + x1];
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}
// Tileable fbm generator: returns function (x,y)->[0,1]
export function tileFbm(basePeriod, octaves, seed, gain = 0.5) {
  const rnd = mulberry32(seed);
  const lat = [];
  let p = basePeriod;
  for (let o = 0; o < octaves; o++) { lat.push([makeLattice(p, rnd), p]); p *= 2; }
  let norm = 0, a = 1;
  for (let o = 0; o < octaves; o++) { norm += a; a *= gain; }
  return (x, y) => {
    let s = 0, amp = 1;
    for (let o = 0; o < octaves; o++) { s += amp * sampleLattice(lat[o][0], lat[o][1], x, y); amp *= gain; }
    return s / norm;
  };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Shared RGBA detail texture used by the weathering shader (triplanar, tileable):
//  R: fine grain / pores      G: chips & scratches mask
//  B: soft low-frequency cloud  A: independent mid-frequency noise
let _detail = null;
export function detailTexture(size = 1024) {
  if (_detail) return _detail;
  const data = new Uint8Array(size * size * 4);
  const fR = tileFbm(40, 4, 11, 0.55);
  const fG = tileFbm(10, 5, 23, 0.55);
  const fB = tileFbm(4, 5, 37, 0.5);
  const fA = tileFbm(16, 4, 51, 0.55);
  const fP = tileFbm(128, 1, 77);
  // scratches drawn on a 2D canvas (wrapped), read back into G
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c2 = cv.getContext('2d');
  c2.fillStyle = '#000'; c2.fillRect(0, 0, size, size);
  const rnd = mulberry32(99);
  c2.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const x = rnd() * size, y = rnd() * size;
    const ang = rnd() < 0.6 ? (rnd() - 0.5) * 0.5 + (rnd() < 0.5 ? 0 : Math.PI / 2) : rnd() * Math.PI;
    const len = 20 + rnd() * rnd() * 260;
    const a = 0.25 + rnd() * 0.6;
    c2.strokeStyle = `rgba(255,255,255,${a})`;
    c2.lineWidth = 0.6 + rnd() * rnd() * 2.6;
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      c2.beginPath();
      c2.moveTo(x + ox * size, y + oy * size);
      c2.lineTo(x + ox * size + Math.cos(ang) * len, y + oy * size + Math.sin(ang) * len);
      c2.stroke();
    }
  }
  const scr = c2.getImageData(0, 0, size, size).data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size, i = (y * size + x) * 4;
      let r = (fR(u, v) - 0.5) * 2.1 + 0.5;
      const pore = fP(u, v);
      if (pore > 0.93) r -= (pore - 0.93) * 9.0;               // dark pores
      let g = (fG(u, v) - 0.5) * 2.4 + 0.5;
      g = Math.max(g, scr[i] / 255 * 0.95);
      const b = (fB(u, v) - 0.5) * 2.2 + 0.5;
      const a = (fA(u, v) - 0.5) * 2.2 + 0.5;
      data[i] = clamp01(r) * 255; data[i + 1] = clamp01(g) * 255;
      data[i + 2] = clamp01(b) * 255; data[i + 3] = clamp01(a) * 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  _detail = tex;
  return tex;
}

// Convenience: build a CanvasTexture by drawing with a 2D context.
export function canvasTexture(w, h, draw, { srgb = true, repeat = false, aniso = 8 } = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = aniso;
  return tex;
}
