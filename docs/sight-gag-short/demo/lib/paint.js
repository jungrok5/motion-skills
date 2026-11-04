// sight-gag-short · paint.js — hand-painted canvas textures. The reference look is a sunny painted-3D street: bricks
// that are each a slightly different red, dry-brush streaks over them, patches where white plaster has flaked over the
// brick, a white-painted brick wall where the courses still show through, warm off-white sidewalks with joints and
// cracks. Every texture is drawn with a seeded rng (deterministic) and cached by its options. Colour maps are sRGB,
// bump maps are linear greyscale from the same drawing so the relief lines up.
import * as THREE from "three";
import { rng, fbm, clamp } from "./core.js";

const CACHE = new Map();
export const FONT = { sign: "Barlow Condensed", title: "Barlow Condensed" };

export function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
export function tex(c, { srgb = true, rep = [1, 1], aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = aniso;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true;
  return t;
}
const key = (name, o) => name + JSON.stringify(o);
function cached(name, o, draw) { const k = key(name, o); if (!CACHE.has(k)) CACHE.set(k, draw()); return CACHE.get(k); }

/** "#rrggbb" → [r,g,b] 0..255 and back, with a per-channel jitter */
export const rgbOf = (hex) => {
  let h = String(hex).replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) { const c = new THREE.Color(hex); const o = {}; c.getRGB(o, THREE.SRGBColorSpace); return [o.r * 255, o.g * 255, o.b * 255]; }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
export const css = (rgb, a = 1) => `rgba(${rgb.map((v) => Math.round(clamp(v, 0, 255))).join(",")},${a})`;
export const shade = (rgb, k) => rgb.map((v) => v * k);
export const mixRGB = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

/** a soft painted dab: an elongated ellipse with a feathered edge */
export function dab(g, x, y, w, h, ang, col, a) {
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(1, h / w);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, w);
  gr.addColorStop(0, css(col, a)); gr.addColorStop(0.6, css(col, a * 0.7)); gr.addColorStop(1, css(col, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, w, 0, Math.PI * 2); g.fill(); g.restore();
}
/** a dry-brush streak: many thin parallel hairs with gaps */
export function streak(g, r, x, y, len, wid, ang, col, a) {
  g.save(); g.translate(x, y); g.rotate(ang);
  const n = Math.max(3, Math.round(wid / 1.6));
  for (let i = 0; i < n; i++) {
    const yy = (i / (n - 1) - 0.5) * wid, l0 = r() * len * 0.25, l1 = len * (0.7 + r() * 0.3);
    g.strokeStyle = css(col, a * (0.35 + r() * 0.65)); g.lineWidth = 0.8 + r() * 1.6;
    g.beginPath(); g.moveTo(l0, yy); g.lineTo(l1, yy + (r() - 0.5) * 1.5); g.stroke();
  }
  g.restore();
}
/** an irregular blob path (for plaster patches, stains, puddles) */
export function blob(g, r, x, y, rad, k = 0.35, n = 14) {
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2, rr = rad * (1 - k / 2 + k * r());
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.8;
    if (i === 0) g.moveTo(px, py); else g.quadraticCurveTo(x + Math.cos(a - 0.2) * rr * 1.1, y + Math.sin(a - 0.2) * rr * 0.9, px, py);
  }
  g.closePath();
}

/**
 * brick({ base, mortar, rows, cols, var, patches, grime, painted, seed, size })
 *   one tile = `rows` courses × `cols` bricks (running bond). painted: a colour to paint the wall with (white-painted
 *   brick: courses show through, chips reveal the brick). patches: flaked white plaster blobs over bare brick.
 * → { map, bump }
 */
export function brick(o = {}) {
  o = { base: "#b4473c", mortar: "#cfa99a", rows: 16, cols: 4, var: 0.14, patches: 0, grime: 0.35, painted: null, seed: 3, size: 1024, ...o };
  return cached("brick", o, () => {
    const S = o.size, c = canvas(S, S), g = c.getContext("2d"), b = canvas(S, S), gb = b.getContext("2d"), r = rng(o.seed);
    const base = rgbOf(o.base), mortar = rgbOf(o.mortar), paint = o.painted ? rgbOf(o.painted) : null;
    g.fillStyle = css(mortar); g.fillRect(0, 0, S, S);
    gb.fillStyle = "#555"; gb.fillRect(0, 0, S, S);
    const bh = S / o.rows, bw = S / o.cols, m = Math.max(2, bh * 0.14);
    for (let row = 0; row < o.rows; row++) {
      const off = (row % 2) * bw * 0.5;
      for (let col = -1; col <= o.cols; col++) {
        const x = col * bw + off, y = row * bh;
        const k = 1 + (r() - 0.5) * 2 * o.var, hue = (r() - 0.5) * 18;
        let cc = [base[0] * k + hue, base[1] * k, base[2] * k - hue * 0.4];
        if (r() < 0.07) cc = shade(cc, 0.78); if (r() < 0.05) cc = mixRGB(cc, [220, 150, 120], 0.3);
        g.fillStyle = css(cc); g.beginPath(); g.roundRect(x + m / 2, y + m / 2, bw - m, bh - m, m * 0.6); g.fill();
        // painted shading inside each brick: lit top edge, darker bottom, a few dabs
        g.fillStyle = css(shade(cc, 1.12), 0.5); g.fillRect(x + m, y + m / 2, bw - 2 * m, bh * 0.16);
        g.fillStyle = css(shade(cc, 0.82), 0.45); g.fillRect(x + m, y + bh * 0.72, bw - 2 * m, bh * 0.22);
        for (let d = 0; d < 3; d++) dab(g, x + r() * bw, y + bh * (0.3 + r() * 0.4), bw * (0.12 + r() * 0.2), bh * 0.18, (r() - 0.5) * 0.2, shade(cc, 0.9 + r() * 0.25), 0.35);
        gb.fillStyle = `rgb(${200 + r() * 40},${200 + r() * 40},${200 + r() * 40})`; gb.beginPath(); gb.roundRect(x + m / 2, y + m / 2, bw - m, bh - m, m * 0.6); gb.fill();
      }
    }
    // dry-brush streaks across the courses
    for (let i = 0; i < 70; i++) streak(g, r, r() * S, r() * S, S * (0.05 + r() * 0.12), 6 + r() * 10, (r() - 0.5) * 0.1, r() < 0.5 ? shade(base, 1.25) : shade(base, 0.75), 0.18);
    if (paint) {
      // white-painted brick: an opaque coat, paint pooled darker in the mortar joints, faint relief per brick,
      // a few big chips where the bare brick shows through
      g.fillStyle = css(paint); g.fillRect(0, 0, S, S);
      for (let row = 0; row < o.rows; row++) {
        const off = (row % 2) * bw * 0.5, y = row * bh;
        g.fillStyle = css(shade(paint, 0.86), 0.8); g.fillRect(0, y, S, m * 0.9);
        for (let col = -1; col <= o.cols; col++) {
          const x = col * bw + off; g.fillStyle = css(shade(paint, 0.88), 0.7); g.fillRect(x, y, m * 0.9, bh);
          g.fillStyle = css(shade(paint, 0.97 + r() * 0.05), 0.6); g.fillRect(x + m, y + m, bw - 2 * m, bh * 0.25);
          g.fillStyle = css(shade(paint, 0.93), 0.35); g.fillRect(x + m, y + bh * 0.7, bw - 2 * m, bh * 0.25);
        }
      }
      for (let i = 0; i < 60; i++) streak(g, r, r() * S, r() * S, S * (0.08 + r() * 0.25), 10 + r() * 20, (r() - 0.5) * 0.06, shade(paint, 0.94 + r() * 0.08), 0.3);
      for (let i = 0; i < (o.chips ?? 3); i++) {
        const x = r() * S, y = r() * S, rad = S * (0.03 + r() * 0.06);
        g.save(); blob(g, r, x, y, rad, 0.7, 20); g.clip();
        for (let row = 0; row < o.rows; row++) { const off = (row % 2) * bw * 0.5; for (let col = -1; col <= o.cols; col++) { g.fillStyle = css(shade(base, 0.9 + r() * 0.2)); g.fillRect(col * bw + off + m / 2, row * bh + m / 2, bw - m, bh - m); } }
        g.restore(); blob(g, r, x, y, rad, 0.7, 20); g.strokeStyle = css(shade(paint, 0.75), 0.6); g.lineWidth = 2; g.stroke();
      }
    }
    for (let p = 0; p < o.patches; p++) {
      // flaked plaster over bare brick: off-white blob with a ragged darker rim
      const x = r() * S, y = r() * S, rad = S * (0.08 + r() * 0.12), pc = mixRGB([238, 226, 214], base, 0.08 + r() * 0.1);
      blob(g, r, x, y, rad, 0.55, 18); g.fillStyle = css(shade(pc, 0.8), 0.6); g.fill();
      blob(g, r, x + 2, y + 1, rad * 0.9, 0.5, 18); g.fillStyle = css(pc, 0.96); g.fill();
      for (let d = 0; d < 6; d++) dab(g, x + (r() - 0.5) * rad, y + (r() - 0.5) * rad * 0.6, rad * 0.4, rad * 0.12, (r() - 0.5) * 0.3, shade(pc, 0.94), 0.4);
      blob(gb, r, x, y, rad * 0.92, 0.5, 18); gb.fillStyle = "#c8c8c8"; gb.fill();
    }
    if (o.grime > 0) {
      // grime is darker at the bottom of the tile (the texture is mapped so v=0 is at the wall base)
      const gr = g.createLinearGradient(0, S, 0, S * 0.7); gr.addColorStop(0, css([40, 30, 30], o.grime * 0.5)); gr.addColorStop(1, css([40, 30, 30], 0));
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
    }
    return { map: tex(c), bump: tex(b, { srgb: false }) };
  });
}

/** chip({ base, mortar, seed }) — a decal: a ragged patch of bare brick (for painted walls), transparent around it */
export function chip(o = {}) {
  o = { base: "#b4473c", mortar: "#cfa99a", seed: 3, rows: 8, ...o };
  return cached("chip", o, () => {
    const S = 256, c = canvas(S, S), g = c.getContext("2d"), r = rng(o.seed), base = rgbOf(o.base), mortar = rgbOf(o.mortar), bh = S / o.rows, bw = bh * 2.6, m = bh * 0.14;
    g.save(); for (let i = 0; i < 4; i++) { blob(g, r, S / 2 + (r() - 0.5) * S * 0.25, S / 2 + (r() - 0.5) * S * 0.2, S * (0.18 + r() * 0.12), 0.7, 22); g.fillStyle = "#000"; g.fill(); }
    g.globalCompositeOperation = "source-in"; g.fillStyle = css(mortar); g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = "source-atop";
    for (let row = 0; row < o.rows; row++) { const off = (row % 2) * bw * 0.5; for (let x = -bw + off; x < S; x += bw) { const k = 0.85 + r() * 0.3; g.fillStyle = css(shade(base, k)); g.fillRect(x + m / 2, row * bh + m / 2, bw - m, bh - m); g.fillStyle = css(shade(base, k * 1.12), 0.5); g.fillRect(x + m, row * bh + m / 2, bw - 2 * m, bh * 0.2); } }
    g.restore();
    // a thin broken paint edge around the patch
    g.globalCompositeOperation = "destination-over"; g.filter = "blur(1.5px)";
    for (let i = 0; i < 4; i++) { blob(g, r, S / 2 + (r() - 0.5) * S * 0.25, S / 2 + (r() - 0.5) * S * 0.2, S * (0.2 + r() * 0.12), 0.7, 22); g.fillStyle = "rgba(150,140,130,0.35)"; g.fill(); }
    g.filter = "none"; g.globalCompositeOperation = "source-over";
    const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return { map: t };
  });
}
/** flake({ color, seed }) — a decal: a ragged patch of off-white plaster left on a bare brick wall */
export function flake(o = {}) {
  o = { color: "#ece3d6", seed: 5, ...o };
  return cached("flake", o, () => {
    const S = 256, c = canvas(S, S), g = c.getContext("2d"), r = rng(o.seed), pc = rgbOf(o.color);
    g.filter = "blur(1px)";
    for (let i = 0; i < 5; i++) { blob(g, r, S / 2 + (r() - 0.5) * S * 0.3, S / 2 + (r() - 0.5) * S * 0.25, S * (0.14 + r() * 0.14), 0.75, 22); g.fillStyle = css(shade(pc, 0.78), 0.7); g.fill(); }
    g.filter = "none";
    for (let i = 0; i < 5; i++) { blob(g, r, S / 2 + (r() - 0.5) * S * 0.28, S / 2 + (r() - 0.5) * S * 0.23, S * (0.13 + r() * 0.13), 0.7, 22); g.fillStyle = css(pc); g.fill(); }
    g.globalCompositeOperation = "source-atop";
    for (let i = 0; i < 20; i++) streak(g, r, r() * S, r() * S, S * 0.3, 10, (r() - 0.5) * 0.2, shade(pc, 0.92 + r() * 0.1), 0.35);
    g.globalCompositeOperation = "source-over";
    const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return { map: t };
  });
}

/** plaster({ base, seed }) — smooth painted wall with big soft strokes and faint stains */
export function plaster(o = {}) {
  o = { base: "#efe7da", seed: 5, size: 512, strokes: 60, stain: 0.08, ...o };
  return cached("plaster", o, () => {
    const S = o.size, c = canvas(S, S), g = c.getContext("2d"), r = rng(o.seed), base = rgbOf(o.base);
    g.fillStyle = css(base); g.fillRect(0, 0, S, S);
    for (let i = 0; i < o.strokes; i++) dab(g, r() * S, r() * S, S * (0.06 + r() * 0.16), S * (0.015 + r() * 0.03), (r() - 0.5) * 0.25, shade(base, 0.93 + r() * 0.12), 0.35);
    for (let i = 0; i < 30; i++) streak(g, r, r() * S, r() * S, S * (0.1 + r() * 0.2), 8 + r() * 12, (r() - 0.5) * 0.06, shade(base, 0.95 + r() * 0.08), 0.22);
    for (let i = 0; i < 6; i++) { blob(g, r, r() * S, r() * S, S * (0.04 + r() * 0.08), 0.6); g.fillStyle = css(shade(base, 0.88), o.stain); g.fill(); }
    return { map: tex(c) };
  });
}

/** concrete({ base, slab, seed }) — sidewalk slabs: joints every `slab` px, speckle, a few cracks and stains */
export function concrete(o = {}) {
  o = { base: "#e9e2d6", joint: "#bdb3a4", slabs: 2, seed: 7, size: 1024, cracks: 3, ...o };
  return cached("concrete", o, () => {
    const S = o.size, c = canvas(S, S), g = c.getContext("2d"), b = canvas(S, S), gb = b.getContext("2d"), r = rng(o.seed), base = rgbOf(o.base);
    g.fillStyle = css(base); g.fillRect(0, 0, S, S); gb.fillStyle = "#bbb"; gb.fillRect(0, 0, S, S);
    for (let i = 0; i < 120; i++) dab(g, r() * S, r() * S, S * (0.03 + r() * 0.1), S * (0.02 + r() * 0.05), r() * 3, shade(base, 0.94 + r() * 0.1), 0.3);
    for (let i = 0; i < 2500; i++) { g.fillStyle = css(shade(base, r() < 0.5 ? 0.82 : 1.06), 0.5); g.fillRect(r() * S, r() * S, 1 + r() * 1.5, 1 + r() * 1.5); }
    const step = S / o.slabs, jc = rgbOf(o.joint);
    g.strokeStyle = css(jc, 0.9); g.lineWidth = 3; gb.strokeStyle = "#666"; gb.lineWidth = 4;
    for (let k = 0; k <= o.slabs; k++) { for (const gg of [g, gb]) { gg.beginPath(); gg.moveTo(k * step, 0); gg.lineTo(k * step, S); gg.moveTo(0, k * step); gg.lineTo(S, k * step); gg.stroke(); } }
    g.strokeStyle = css(shade(base, 0.92), 0.8); g.lineWidth = 1.5;
    for (let k = 0; k <= o.slabs; k++) { g.beginPath(); g.moveTo(k * step + 3, 0); g.lineTo(k * step + 3, S); g.moveTo(0, k * step + 3); g.lineTo(S, k * step + 3); g.stroke(); }
    for (let i = 0; i < o.cracks; i++) {
      let x = r() * S, y = r() * S, a = r() * Math.PI * 2; g.strokeStyle = css(shade(base, 0.7), 0.7); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 14; s++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); } g.stroke();
    }
    for (let i = 0; i < 5; i++) { blob(g, r, r() * S, r() * S, S * (0.02 + r() * 0.05), 0.6); g.fillStyle = css(shade(base, 0.86), 0.18); g.fill(); }
    return { map: tex(c), bump: tex(b, { srgb: false }) };
  });
}

/** asphalt({ base, seed }) — blue-grey road with speckle, patch repairs and a worn centre */
export function asphalt(o = {}) {
  o = { base: "#6d7279", seed: 11, size: 1024, ...o };
  return cached("asphalt", o, () => {
    const S = o.size, c = canvas(S, S), g = c.getContext("2d"), r = rng(o.seed), base = rgbOf(o.base);
    g.fillStyle = css(base); g.fillRect(0, 0, S, S);
    for (let i = 0; i < 90; i++) dab(g, r() * S, r() * S, S * (0.04 + r() * 0.12), S * (0.03 + r() * 0.06), r() * 3, shade(base, 0.9 + r() * 0.18), 0.3);
    for (let i = 0; i < 9000; i++) { g.fillStyle = css(shade(base, r() < 0.5 ? 0.7 : 1.3), 0.5); g.fillRect(r() * S, r() * S, 1.2, 1.2); }
    for (let i = 0; i < 4; i++) { const x = r() * S, y = r() * S, w = 60 + r() * 160, h = 40 + r() * 100; g.fillStyle = css(shade(base, 0.82), 0.5); g.fillRect(x, y, w, h); g.strokeStyle = css(shade(base, 0.7), 0.5); g.strokeRect(x, y, w, h); }
    return { map: tex(c) };
  });
}

/** stripes({ a, b, n, seed }) — awning canvas: n stripe pairs across, painted edges, a lit fold every stripe */
export function stripes(o = {}) {
  o = { a: "#2f5e9e", b: "#f3efe6", n: 6, seed: 2, size: 512, ...o };
  return cached("stripes", o, () => {
    const S = o.size, c = canvas(S, S), g = c.getContext("2d"), r = rng(o.seed), A = rgbOf(o.a), B = rgbOf(o.b), w = S / (o.n * 2);
    for (let i = 0; i < o.n * 2; i++) {
      const col = i % 2 ? B : A; g.fillStyle = css(col); g.fillRect(i * w, 0, w + 1, S);
      for (let d = 0; d < 10; d++) streak(g, r, i * w + r() * w, r() * S, S * 0.2, 6, Math.PI / 2, shade(col, 0.92 + r() * 0.14), 0.25);
    }
    const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, "rgba(255,255,255,0.12)"); gr.addColorStop(1, "rgba(0,0,0,0.12)");
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    return { map: tex(c) };
  });
}

/** leather({ base, seed }) — fine pebbled grain with slightly darker creases (for gloves, boots, bags) */
export function leather(o = {}) {
  o = { base: "#c99a52", seed: 13, size: 512, ...o };
  return cached("leather", o, () => {
    const S = o.size, c = canvas(S, S), g = c.getContext("2d"), b = canvas(S, S), gb = b.getContext("2d"), r = rng(o.seed), base = rgbOf(o.base);
    g.fillStyle = css(base); g.fillRect(0, 0, S, S); gb.fillStyle = "#888"; gb.fillRect(0, 0, S, S);
    for (let i = 0; i < 80; i++) dab(g, r() * S, r() * S, S * (0.05 + r() * 0.12), S * (0.03 + r() * 0.08), r() * 3, shade(base, 0.92 + r() * 0.14), 0.35);
    for (let i = 0; i < 5000; i++) { const x = r() * S, y = r() * S, v = 110 + r() * 90; gb.fillStyle = `rgb(${v},${v},${v})`; gb.beginPath(); gb.arc(x, y, 1 + r() * 1.6, 0, 7); gb.fill(); }
    for (let i = 0; i < 18; i++) { const x = r() * S, y = r() * S; g.strokeStyle = css(shade(base, 0.8), 0.25); gb.strokeStyle = "#555"; g.lineWidth = gb.lineWidth = 1.2; for (const gg of [g, gb]) { gg.beginPath(); gg.moveTo(x, y); gg.quadraticCurveTo(x + 20, y + (r() - 0.5) * 20, x + 30 + r() * 30, y + (r() - 0.5) * 10); gg.stroke(); } }
    return { map: tex(c), bump: tex(b, { srgb: false }) };
  });
}

/** cloth({ base, pattern: plain | plaid | denim | knit | stripe, b, seed }) */
export function cloth(o = {}) {
  o = { base: "#3a4a6a", pattern: "plain", b: "#1d1d22", seed: 17, size: 256, scale: 1, ...o };
  return cached("cloth", o, () => {
    const S = o.size, c = canvas(S, S), g = c.getContext("2d"), r = rng(o.seed), base = rgbOf(o.base), B = rgbOf(o.b);
    g.fillStyle = css(base); g.fillRect(0, 0, S, S);
    if (o.pattern === "plaid") {
      const n = 4 * o.scale, w = S / n;
      for (let i = 0; i < n; i++) { g.fillStyle = css(B, 0.55); g.fillRect(i * w, 0, w * 0.42, S); g.fillRect(0, i * w, S, w * 0.42); g.fillStyle = css(shade(base, 1.25), 0.25); g.fillRect(i * w + w * 0.7, 0, w * 0.06, S); g.fillRect(0, i * w + w * 0.7, S, w * 0.06); }
    } else if (o.pattern === "stripe") {
      const n = 8 * o.scale, w = S / n; for (let i = 0; i < n; i += 2) { g.fillStyle = css(B); g.fillRect(0, i * w, S, w); }
    } else if (o.pattern === "denim") {
      for (let i = 0; i < 2500; i++) { g.strokeStyle = css(shade(base, 0.8 + r() * 0.45), 0.35); g.lineWidth = 1; const x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y + 4); g.stroke(); }
    } else if (o.pattern === "knit") {
      for (let y = 0; y < S; y += 8) for (let x = 0; x < S; x += 8) { g.fillStyle = css(shade(base, 0.85 + r() * 0.25), 0.6); g.beginPath(); g.ellipse(x + 2, y + 4, 2.4, 4, 0.5, 0, 7); g.ellipse(x + 6, y + 4, 2.4, 4, -0.5, 0, 7); g.fill(); }
    }
    for (let i = 0; i < 40; i++) dab(g, r() * S, r() * S, S * (0.08 + r() * 0.2), S * (0.03 + r() * 0.06), r() * 3, shade(base, 0.9 + r() * 0.18), 0.18);
    return { map: tex(c) };
  });
}

/** wood({ base, planks, seed }) — painted planks with grain */
export function wood(o = {}) {
  o = { base: "#9b6a3f", planks: 6, seed: 19, size: 512, ...o };
  return cached("wood", o, () => {
    const S = o.size, c = canvas(S, S), g = c.getContext("2d"), r = rng(o.seed), base = rgbOf(o.base), w = S / o.planks;
    for (let i = 0; i < o.planks; i++) {
      const cc = shade(base, 0.88 + r() * 0.24); g.fillStyle = css(cc); g.fillRect(0, i * w, S, w);
      for (let k = 0; k < 14; k++) { g.strokeStyle = css(shade(cc, 0.8 + r() * 0.3), 0.35); g.lineWidth = 1 + r(); const y = i * w + r() * w; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(S * 0.3, y + (r() - 0.5) * 8, S * 0.6, y + (r() - 0.5) * 8, S, y); g.stroke(); }
      g.fillStyle = css(shade(cc, 0.6), 0.8); g.fillRect(0, i * w, S, 2);
    }
    return { map: tex(c) };
  });
}

/** grass({ base, seed }) — painted lawn with clumps and blade strokes */
export function grass(o = {}) {
  o = { base: "#6aa84f", seed: 23, size: 512, ...o };
  return cached("grass", o, () => {
    const S = o.size, c = canvas(S, S), g = c.getContext("2d"), r = rng(o.seed), base = rgbOf(o.base);
    g.fillStyle = css(base); g.fillRect(0, 0, S, S);
    for (let i = 0; i < 160; i++) dab(g, r() * S, r() * S, S * (0.04 + r() * 0.1), S * (0.02 + r() * 0.05), r() * 3, shade(base, 0.82 + r() * 0.3), 0.4);
    for (let i = 0; i < 3500; i++) { const x = r() * S, y = r() * S; g.strokeStyle = css(shade(base, 0.75 + r() * 0.55), 0.6); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 5); g.stroke(); }
    return { map: tex(c) };
  });
}

/**
 * label({ text, w, h, fg, bg, font, weight, vertical, border, pad, size }) — sign faces (shop names, street signs,
 * the end title). Text is fitted to the box. vertical: one letter per line (blade signs like "HARDWARE").
 */
export function label(o = {}) {
  o = { text: "SHOP", w: 512, h: 128, fg: "#ffffff", bg: "#2b5aa0", font: FONT.sign, weight: 700, vertical: false, border: 0, borderCol: null, pad: 0.12, worn: 0.25, seed: 29, italic: false, ...o };
  return cached("label", o, () => {
    const c = canvas(o.w, o.h), g = c.getContext("2d"), r = rng(o.seed);
    if (o.bg) {
      g.fillStyle = o.bg; g.fillRect(0, 0, o.w, o.h);
      const bg = rgbOf(o.bg); for (let i = 0; i < 30; i++) streak(g, r, r() * o.w, r() * o.h, o.w * 0.3, 8, 0, shade(bg, 0.9 + r() * 0.2), 0.2);
    }
    if (o.border) { g.strokeStyle = o.borderCol || o.fg; g.lineWidth = o.border; g.strokeRect(o.border, o.border, o.w - 2 * o.border, o.h - 2 * o.border); }
    g.fillStyle = o.fg; g.textAlign = "center"; g.textBaseline = "middle";
    const pw = o.w * (1 - 2 * o.pad), ph = o.h * (1 - 2 * o.pad);
    if (o.vertical) {
      const ch = [...o.text], step = ph / ch.length; let fs = Math.min(step * 0.95, pw);
      g.font = `${o.italic ? "italic " : ""}${o.weight} ${fs}px "${o.font}", sans-serif`;
      ch.forEach((l, i) => g.fillText(l, o.w / 2, o.h * o.pad + step * (i + 0.5)));
    } else {
      const lines = String(o.text).split("\n"); let fs = ph / lines.length;
      g.font = `${o.italic ? "italic " : ""}${o.weight} ${fs}px "${o.font}", sans-serif`;
      const wmax = Math.max(...lines.map((l) => g.measureText(l).width)); if (wmax > pw) fs *= pw / wmax;
      g.font = `${o.italic ? "italic " : ""}${o.weight} ${fs}px "${o.font}", sans-serif`;
      lines.forEach((l, i) => g.fillText(l, o.w / 2, o.h / 2 + (i - (lines.length - 1) / 2) * fs * 1.02));
    }
    if (o.worn > 0) { g.globalCompositeOperation = "destination-out"; for (let i = 0; i < 160 * o.worn; i++) { g.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.3})`; g.fillRect(r() * o.w, r() * o.h, 1 + r() * 4, 1 + r() * 2); } g.globalCompositeOperation = "source-over"; }
    return { map: tex(c, { rep: [1, 1] }) };
  });
}

/** glass({ seed }) — a window pane: dark warm interior, a sky reflection gradient and one diagonal glint */
export function glass(o = {}) {
  o = { seed: 31, size: 256, sky: "#9bb7d4", inside: "#363b48", ...o };
  return cached("glass", o, () => {
    const S = o.size, c = canvas(S, S), g = c.getContext("2d"), r = rng(o.seed);
    const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, o.sky); gr.addColorStop(0.45, mixHex(o.sky, o.inside, 0.55)); gr.addColorStop(1, o.inside);
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 8; i++) dab(g, r() * S, S * (0.5 + r() * 0.5), S * 0.2, S * 0.08, 0, rgbOf(o.inside).map((v) => v * (0.7 + r() * 0.6)), 0.5);
    g.save(); g.globalAlpha = 0.25; g.fillStyle = "#fff"; g.beginPath(); g.moveTo(S * 0.15, 0); g.lineTo(S * 0.38, 0); g.lineTo(S * 0.05, S); g.lineTo(-S * 0.18, S); g.fill();
    g.globalAlpha = 0.12; g.beginPath(); g.moveTo(S * 0.5, 0); g.lineTo(S * 0.58, 0); g.lineTo(S * 0.28, S); g.lineTo(S * 0.2, S); g.fill(); g.restore();
    return { map: tex(c) };
  });
}
const mixHex = (a, b, k) => css(mixRGB(rgbOf(a), rgbOf(b), k));

/** cloud sprite: a painted cumulus with a lit top and a soft blue-grey base (alpha map in the canvas) */
export function cloud(o = {}) {
  o = { seed: 37, w: 512, h: 256, ...o };
  return cached("cloud", o, () => {
    const c = canvas(o.w, o.h), g = c.getContext("2d"), r = rng(o.seed);
    const puffs = [];
    for (let i = 0; i < 16; i++) { const u = r(); puffs.push([o.w * (0.15 + u * 0.7), o.h * (0.62 - Math.sin(u * Math.PI) * 0.3 * r() - 0.05), o.h * (0.14 + r() * 0.16) * (0.6 + Math.sin(u * Math.PI) * 0.6)]); }
    for (const [x, y, rad] of puffs) { const gr = g.createRadialGradient(x, y + rad * 0.3, rad * 0.2, x, y, rad); gr.addColorStop(0, "rgba(206,220,240,1)"); gr.addColorStop(1, "rgba(206,220,240,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); }
    for (const [x, y, rad] of puffs) { const gr = g.createRadialGradient(x - rad * 0.2, y - rad * 0.35, 0, x, y, rad * 0.95); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.6, "rgba(255,255,255,0.85)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y - rad * 0.12, rad * 0.86, 0, 7); g.fill(); }
    const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return { map: t };
  });
}

/** a soft round spot (contact shadows, puffs) as an alpha texture */
export function spot() {
  return cached("spot", {}, () => {
    const c = canvas(128, 128), g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.5, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return { map: t };
  });
}
/** a painted puff (steam, dust) — lumpy soft circle with brush texture */
export function puffTex(seed = 41) {
  return cached("puff", { seed }, () => {
    const S = 128, c = canvas(S, S), g = c.getContext("2d"), r = rng(seed);
    for (let i = 0; i < 9; i++) { const x = S / 2 + (r() - 0.5) * S * 0.35, y = S / 2 + (r() - 0.5) * S * 0.3, rad = S * (0.18 + r() * 0.14); const gr = g.createRadialGradient(x - rad * 0.3, y - rad * 0.3, 0, x, y, rad); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.7, "rgba(235,238,245,0.8)"); gr.addColorStop(1, "rgba(220,226,236,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); }
    const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return { map: t };
  });
}
