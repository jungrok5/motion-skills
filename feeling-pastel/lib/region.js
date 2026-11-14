// region.js — where marks may go. Regions live in the virtual 1920×1080 space (or whatever the piece declares).
// Each region has: bbox [x0,y0,x1,y1], inside(x,y) → boolean (used when placing marks), and
// raster(scale) → { x0, y0, w, h, data: Float32Array } coverage at output resolution (used to clip marks).
import { pointInPoly, bboxOf, clamp, catmull } from './core.js';

let nextId = 1;
function make(bbox, inside, rasterFn) {
  return { id: nextId++, bbox, inside, rasterAt: rasterFn || ((s) => genericRaster(bbox, inside, s)) };
}
function genericRaster(bbox, inside, s) {
  const x0 = Math.floor(bbox[0] * s), y0 = Math.floor(bbox[1] * s), x1 = Math.ceil(bbox[2] * s), y1 = Math.ceil(bbox[3] * s);
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0), data = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) data[j * w + i] = inside((x0 + i + 0.5) / s, (y0 + j + 0.5) / s) ? 1 : 0;
  return { x0, y0, w, h, data };
}
// scanline polygon fill (even-odd), 4 sub-rows per pixel for soft edges
function polyRaster(poly, bbox, s) {
  const x0 = Math.floor(bbox[0] * s) - 1, y0 = Math.floor(bbox[1] * s) - 1, x1 = Math.ceil(bbox[2] * s) + 1, y1 = Math.ceil(bbox[3] * s) + 1;
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0), data = new Float32Array(w * h);
  const P = poly.map(([x, y]) => [x * s - x0, y * s - y0]);
  const SUB = 4, xs = [];
  for (let j = 0; j < h; j++) {
    for (let k = 0; k < SUB; k++) {
      const y = j + (k + 0.5) / SUB;
      xs.length = 0;
      for (let a = 0, b = P.length - 1; a < P.length; b = a++) {
        const ya = P[a][1], yb = P[b][1];
        if ((ya > y) !== (yb > y)) xs.push(P[a][0] + ((y - ya) * (P[b][0] - P[a][0])) / (yb - ya));
      }
      xs.sort((p, q) => p - q);
      for (let m = 0; m + 1 < xs.length; m += 2) {
        const xa = clamp(xs[m], 0, w), xb = clamp(xs[m + 1], 0, w);
        const ia = Math.floor(xa), ib = Math.floor(xb);
        if (ia === ib) { if (ia < w) data[j * w + ia] += (xb - xa) / SUB; continue; }
        data[j * w + ia] += (ia + 1 - xa) / SUB;
        for (let i = ia + 1; i < ib; i++) data[j * w + i] += 1 / SUB;
        if (ib < w) data[j * w + ib] += (xb - ib) / SUB;
      }
    }
  }
  for (let i = 0; i < data.length; i++) if (data[i] > 1) data[i] = 1;
  return { x0, y0, w, h, data };
}

export const R = {
  // polygon [[x,y],…]; smooth: round the corners with a spline (good for hills, clouds, puddles)
  poly(pts, { smooth = false } = {}) {
    const poly = smooth ? catmull([...pts, pts[0]], 6) : pts;
    const bbox = bboxOf(poly);
    return make(bbox, (x, y) => x >= bbox[0] && x <= bbox[2] && y >= bbox[1] && y <= bbox[3] && pointInPoly(x, y, poly), (s) => polyRaster(poly, bbox, s));
  },
  rect(x, y, w, h) { return R.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]); },
  circle(cx, cy, r) { return make([cx - r, cy - r, cx + r, cy + r], (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r); },
  ellipse(cx, cy, rx, ry) { return make([cx - rx, cy - ry, cx + rx, cy + ry], (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1); },
  // union of circles [[cx,cy,r],…] — cloud masses, tree crowns, bushes
  lobes(list) {
    const bbox = [Math.min(...list.map((l) => l[0] - l[2])), Math.min(...list.map((l) => l[1] - l[2])), Math.max(...list.map((l) => l[0] + l[2])), Math.max(...list.map((l) => l[1] + l[2]))];
    return make(bbox, (x, y) => list.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r));
  },
  // everything below the curve y = f(x) (down to yMax) between x0 and x1 — ground, sea, hills
  below(f, x0, x1, yMax) {
    let top = Infinity; for (let x = x0; x <= x1; x += 4) top = Math.min(top, f(x));
    return make([x0, top, x1, yMax], (x, y) => x >= x0 && x <= x1 && y >= f(x) && y <= yMax);
  },
  above(f, x0, x1, yMin = 0) {
    let bot = -Infinity; for (let x = x0; x <= x1; x += 4) bot = Math.max(bot, f(x));
    return make([x0, yMin, x1, bot], (x, y) => x >= x0 && x <= x1 && y <= f(x) && y >= yMin);
  },
  between(fTop, fBot, x0, x1) {
    let top = Infinity, bot = -Infinity; for (let x = x0; x <= x1; x += 4) { top = Math.min(top, fTop(x)); bot = Math.max(bot, fBot(x)); }
    return make([x0, top, x1, bot], (x, y) => x >= x0 && x <= x1 && y >= fTop(x) && y <= fBot(x));
  },
  // any test, inside a bbox
  fn(bbox, inside) { return make(bbox, inside); },
  union(...rs) {
    const bbox = [Math.min(...rs.map((r) => r.bbox[0])), Math.min(...rs.map((r) => r.bbox[1])), Math.max(...rs.map((r) => r.bbox[2])), Math.max(...rs.map((r) => r.bbox[3]))];
    return make(bbox, (x, y) => rs.some((r) => r.inside(x, y)), (s) => combine(bbox, rs, [], s));
  },
  minus(a, ...cut) {
    return make(a.bbox, (x, y) => a.inside(x, y) && !cut.some((r) => r.inside(x, y)), (s) => combine(a.bbox, [a], cut, s));
  },
};
function combine(bbox, plus, minus, s) {
  const x0 = Math.floor(bbox[0] * s) - 1, y0 = Math.floor(bbox[1] * s) - 1, x1 = Math.ceil(bbox[2] * s) + 1, y1 = Math.ceil(bbox[3] * s) + 1;
  const w = x1 - x0, h = y1 - y0, data = new Float32Array(w * h);
  const blit = (m, op) => {
    for (let j = 0; j < m.h; j++) {
      const y = m.y0 + j - y0; if (y < 0 || y >= h) continue;
      for (let i = 0; i < m.w; i++) {
        const x = m.x0 + i - x0; if (x < 0 || x >= w) continue;
        const k = y * w + x, v = m.data[j * m.w + i];
        data[k] = op === 1 ? Math.max(data[k], v) : data[k] * (1 - v);
      }
    }
  };
  for (const r of plus) blit(r.rasterAt(s), 1);
  for (const r of minus) blit(r.rasterAt(s), -1);
  return { x0, y0, w, h, data };
}
// box-blur a raster in place (separable, 2 passes ≈ gaussian) — soft region edges
export function feather(m, rad) {
  if (rad < 0.5) return m;
  const r = Math.max(1, Math.round(rad)), { w, h } = m;
  const pad = r * 2, W = w + pad * 2, H = h + pad * 2, src = new Float32Array(W * H);
  for (let j = 0; j < h; j++) src.set(m.data.subarray(j * w, j * w + w), (j + pad) * W + pad);
  const tmp = new Float32Array(W * H);
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < H; j++) { let acc = 0; const row = j * W; for (let i = -r; i <= r; i++) acc += src[row + clampI(i, W)]; for (let i = 0; i < W; i++) { tmp[row + i] = acc / (2 * r + 1); acc += src[row + clampI(i + r + 1, W)] - src[row + clampI(i - r, W)]; } }
    for (let i = 0; i < W; i++) { let acc = 0; for (let j = -r; j <= r; j++) acc += tmp[clampI(j, H) * W + i]; for (let j = 0; j < H; j++) { src[j * W + i] = acc / (2 * r + 1); acc += tmp[clampI(j + r + 1, H) * W + i] - tmp[clampI(j - r, H) * W + i]; } }
  }
  return { x0: m.x0 - pad, y0: m.y0 - pad, w: W, h: H, data: src };
}
const clampI = (i, n) => (i < 0 ? 0 : i >= n ? n - 1 : i);
