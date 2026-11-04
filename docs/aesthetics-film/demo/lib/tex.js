// aesthetics-film · tex.js — every surface is painted in code on a canvas (no image files): paper, wood, stone, plaster,
// roof tiles, hanji / window paper, glaze crackle, mist, leaf clusters, petals. Seeded, so the same call gives the same
// pixels on every machine; cached by key, so a texture is painted once per page.
import * as THREE from "three";

/** a seeded random generator: const r = rng(7); r() → [0, 1) */
export const rng = (seed) => { let s = Math.abs(Math.floor(seed * 9301 + 49297)) % 2147483646 || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };

// ---- value noise (deterministic, tileable when `per` is given) ----
const hash2 = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; h ^= h >>> 16; return ((h >>> 0) % 100000) / 100000; };
const fade = (t) => t * t * (3 - 2 * t);
export function vnoise(x, y, seed = 0, per = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const w = (a) => (per ? ((a % per) + per) % per : a);
  const a = hash2(w(xi), w(yi), seed), b = hash2(w(xi + 1), w(yi), seed), c = hash2(w(xi), w(yi + 1), seed), d = hash2(w(xi + 1), w(yi + 1), seed);
  const u = fade(xf), v = fade(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, seed = 0, oct = 4, per = 0) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, seed + i * 17, per ? per * f : 0); n += a; a *= 0.5; f *= 2; }
  return s / n;
}

const CACHE = new Map();
/** a cached canvas texture: ctex(key, w, h, (g, w, h) => draw, { repeat, srgb }) */
export function ctex(key, w, h, draw, o = {}) {
  if (CACHE.has(key)) return CACHE.get(key);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = o.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (o.repeat) t.repeat.set(...o.repeat);
  CACHE.set(key, t);
  return t;
}
/** per-pixel painter: fn(x, y) → [r, g, b, a?] (0–255) */
function pixels(g, w, h, fn) {
  const img = g.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = fn(x, y), i = (y * w + x) * 4;
    d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = p[3] ?? 255;
  }
  g.putImageData(img, 0, 0);
}
const hex = (c) => { const v = new THREE.Color(c); return [v.r * 255, v.g * 255, v.b * 255]; };
const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

/** wood: long grain along v, plank seams across; color = mid tone */
export const wood = (color = "#6b4a32", o = {}) => ctex(`wood:${color}:${o.planks ?? 4}:${o.seed ?? 1}`, 256, 512, (g, w, h) => {
  const base = hex(color), dark = mixc(base, [20, 12, 6], 0.45), lite = mixc(base, [255, 235, 210], 0.18), planks = o.planks ?? 4, s = o.seed ?? 1;
  pixels(g, w, h, (x, y) => {
    const pk = Math.floor((x / w) * planks), px = ((x / w) * planks) % 1;
    const grain = fbm(x / 6 + pk * 13, y / 90, s + pk, 3, 0) * 0.7 + Math.sin((x / w) * 60 + fbm(x / 20, y / 40, s, 2) * 6) * 0.15;
    let c = mixc(dark, lite, clamp(grain + (vnoise(pk, 0, s) - 0.5) * 0.3));
    if (px < 0.02 || px > 0.98) c = mixc(c, [10, 6, 3], 0.6);
    return c;
  });
}, { repeat: o.repeat });

/** stone pavers: square slabs with mortar seams and mottling */
export const stone = (color = "#9a9890", o = {}) => ctex(`stone:${color}:${o.n ?? 4}:${o.seed ?? 2}`, 512, 512, (g, w, h) => {
  const base = hex(color), n = o.n ?? 4, s = o.seed ?? 2, dark = mixc(base, [30, 30, 30], 0.35), lite = mixc(base, [245, 245, 238], 0.25);
  pixels(g, w, h, (x, y) => {
    const u = (x / w) * n, v = (y / h) * n, cx = Math.floor(u), cy = Math.floor(v), fx = u - cx, fy = v - cy;
    const tone = vnoise(cx, cy, s) - 0.5;
    let c = mixc(dark, lite, clamp(0.5 + tone * 0.5 + (fbm(x / 22, y / 22, s, 4, (w / 22) | 0) - 0.5) * 0.9));
    const e = Math.min(fx, fy, 1 - fx, 1 - fy);
    if (e < 0.012) c = mixc(c, [40, 40, 38], 0.75); else if (e < 0.03) c = mixc(c, [60, 60, 56], 0.25);
    return c;
  });
}, { repeat: o.repeat });

/** gravel / earth / grass ground — `kind`: "gravel" | "earth" | "grass" | "moss" */
export const ground = (kind = "gravel", color, o = {}) => ctex(`ground:${kind}:${color}`, 512, 512, (g, w, h) => {
  const base = hex(color ?? { gravel: "#a9a59a", earth: "#8a7a62", grass: "#5f6e42", moss: "#4f5f3a" }[kind]);
  const lite = mixc(base, [255, 255, 245], 0.3), dark = mixc(base, [10, 15, 5], 0.45);
  pixels(g, w, h, (x, y) => {
    const n1 = fbm(x / 40, y / 40, 5, 4, 512 / 40), n2 = vnoise(x / 2.2, y / 2.2, 9, 512 / 2.2 | 0);
    if (kind === "gravel") return mixc(dark, lite, clamp(0.35 + n2 * 0.55 + (n1 - 0.5) * 0.5));
    if (kind === "grass" || kind === "moss") return mixc(dark, lite, clamp(0.2 + n1 * 0.6 + (vnoise(x / 1.5, y / 6, 3) - 0.5) * 0.35));
    return mixc(dark, lite, clamp(0.3 + n1 * 0.6 + (n2 - 0.5) * 0.15));
  });
}, { repeat: o.repeat });

/** raked gravel (karesansui): parallel grooves along u */
export const raked = (color = "#d8d4c8") => ctex(`raked:${color}`, 512, 512, (g, w, h) => {
  const base = hex(color), dark = mixc(base, [60, 60, 55], 0.4);
  pixels(g, w, h, (x, y) => { const r = 0.5 + 0.5 * Math.sin((y / h) * Math.PI * 2 * 24); return mixc(dark, base, clamp(0.45 + r * 0.45 + (vnoise(x / 2, y / 2, 4) - 0.5) * 0.3)); });
});

/** lime plaster: off-white with soft stains and a darker damp band at the bottom (v = 0 is the bottom) */
export const plaster = (color = "#e9e5da", o = {}) => ctex(`plaster:${color}:${o.damp ?? 0.18}`, 512, 512, (g, w, h) => {
  const base = hex(color), stain = mixc(base, [120, 115, 100], 0.35), damp = o.damp ?? 0.18;
  pixels(g, w, h, (x, y) => {
    const v = 1 - y / h, n = fbm(x / 70, y / 50, 11, 5, 0);
    let c = mixc(base, stain, clamp((n - 0.55) * 1.4));
    if (v < damp) c = mixc(c, stain, clamp((damp - v) / damp) * 0.55 * (0.6 + n * 0.6));
    return c;
  });
});

/** roof tiles: rows of half-round tiles; u across the slope, v down the slope */
export const tiles = (color = "#3f4245", o = {}) => ctex(`tiles:${color}`, 256, 256, (g, w, h) => {
  const base = hex(color), lite = mixc(base, [230, 230, 225], 0.22), dark = mixc(base, [0, 0, 0], 0.55);
  pixels(g, w, h, (x, y) => {
    const u = (x / w) * 8, fu = u - Math.floor(u), round = Math.sin(fu * Math.PI);
    const v = (y / h) * 6, fv = v - Math.floor(v);
    let c = mixc(dark, lite, clamp(round * 0.8 + (vnoise(Math.floor(u), Math.floor(v), 3) - 0.5) * 0.3));
    if (fv > 0.9) c = mixc(c, dark, 0.6);
    return c;
  });
});

/** hanji / window paper: warm white with fibres; `glow` brightens it (used as an emissive map) */
export const paper = (color = "#efe8d6", o = {}) => ctex(`paper:${color}`, 512, 512, (g, w, h) => {
  const base = hex(color), r = rng(31);
  pixels(g, w, h, (x, y) => mixc(base, mixc(base, [150, 140, 120], 1), clamp((fbm(x / 30, y / 30, 21, 4, 512 / 30) - 0.5) * 0.25)));
  g.globalAlpha = 0.18; g.strokeStyle = "#b8ad94"; g.lineWidth = 0.7;
  for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h, a = r() * Math.PI * 2, l = 6 + r() * 26; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
});

/** glaze: soft mottling + optional crackle network (celadon / white porcelain / ash) */
export const glaze = (color = "#9cc5b8", o = {}) => ctex(`glaze:${color}:${o.crackle ?? 0}:${o.speck ?? 0}`, 512, 512, (g, w, h) => {
  const base = hex(color), r = rng(77);
  pixels(g, w, h, (x, y) => {
    const n = fbm(x / 60, y / 60, 41, 4, 512 / 60);
    let c = mixc(base, mixc(base, [255, 255, 250], 0.5), clamp((n - 0.5) * 0.8 + 0.2));
    if ((o.speck ?? 0) && vnoise(x / 1.3, y / 1.3, 7) > 1 - o.speck * 0.08) c = mixc(c, [70, 60, 50], 0.5);
    return c;
  });
  if (o.crackle) {
    g.strokeStyle = `rgba(60,70,65,${0.25 * o.crackle})`; g.lineWidth = 0.8;
    for (let i = 0; i < 70; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); }
  }
});

/** bronze / metal patina */
export const bronze = (color = "#7a6236") => ctex(`bronze:${color}`, 256, 256, (g, w, h) => {
  const base = hex(color), pat = [70, 110, 95];
  pixels(g, w, h, (x, y) => mixc(base, pat, clamp((fbm(x / 18, y / 18, 61, 4, 256 / 18) - 0.55) * 2.2) * 0.7));
});

/** bark: vertical fibres, ink-dark */
export const bark = (color = "#3a3530") => ctex(`bark:${color}`, 128, 256, (g, w, h) => {
  const base = hex(color), lite = mixc(base, [200, 190, 170], 0.25);
  pixels(g, w, h, (x, y) => mixc(base, lite, clamp(fbm(x / 3, y / 30, 51, 3, 0) * 1.2 - 0.3)));
});

/** soft mist puff with alpha (white, tinted by material colour) */
export const mist = (seed = 1) => ctex(`mist:${seed}`, 256, 128, (g, w, h) => {
  pixels(g, w, h, (x, y) => {
    const u = x / w, v = y / h, edge = Math.sin(Math.PI * u) * Math.sin(Math.PI * v) ** 0.6;
    const n = fbm(x / 38, y / 26, seed, 5, 0);
    return [255, 255, 255, 255 * clamp((n - 0.35) * 2.2) * edge];
  });
});

/** a leaf cluster for bamboo / willow cards: ink-green blades on alpha */
export const leaves = (color = "#3e4a2f", kind = "bamboo", seed = 3) => ctex(`leaves:${kind}:${color}:${seed}`, 256, 256, (g, w, h) => {
  const r = rng(seed), c = hex(color);
  g.clearRect(0, 0, w, h);
  const n = kind === "bamboo" ? 26 : 60;
  for (let i = 0; i < n; i++) {
    const x = w * (0.2 + r() * 0.6), y = h * (0.15 + r() * 0.7), a = (kind === "bamboo" ? -0.5 + r() * 1.0 + Math.PI * 0.5 : r() * Math.PI * 2), L = kind === "bamboo" ? 50 + r() * 50 : 18 + r() * 14, W = kind === "bamboo" ? 6 + r() * 4 : 5;
    const k = 0.7 + r() * 0.5;
    g.fillStyle = `rgb(${c[0] * k | 0},${c[1] * k | 0},${c[2] * k | 0})`;
    g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(W, L * 0.4, 0, L); g.quadraticCurveTo(-W, L * 0.4, 0, 0); g.fill(); g.restore();
  }
}, { clamp: true });

/** a five-petal blossom on alpha (plum / cherry / peach) */
export const blossom = (color = "#f2c7cf") => ctex(`blossom:${color}`, 64, 64, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.fillStyle = color;
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.beginPath(); g.ellipse(32 + Math.cos(a) * 13, 32 + Math.sin(a) * 13, 11, 9, a, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = "#c98a3a"; g.beginPath(); g.arc(32, 32, 4, 0, Math.PI * 2); g.fill();
}, { clamp: true });

/** radial soft dot (glow sprites, dust, moon halo) */
export const dot = (hard = 0.0) => ctex(`dot:${hard}`, 64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(clamp(hard, 0, 0.95), "rgba(255,255,255,1)");
  for (let i = 1; i <= 8; i++) { const u = i / 8, k = clamp(hard, 0, 0.95) + (1 - clamp(hard, 0, 0.95)) * u; gr.addColorStop(Math.min(1, k), `rgba(255,255,255,${(Math.pow(1 - u, 2.2)).toFixed(3)})`); }
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
}, { clamp: true });

/** a plain canvas texture painted by the caller (paintings, calligraphy, signboards) */
export const painted = (key, w, h, draw) => ctex("painted:" + key, w, h, draw, { clamp: true });
