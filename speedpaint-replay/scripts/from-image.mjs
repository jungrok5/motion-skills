// speedpaint-replay · from-image.mjs — REFERENCE MODE: turn an image the user owns (their own illustration, or one they
// have the rights to) into the six stages of a replay, so the replay draws toward that picture.
//   node <skill>/scripts/from-image.mjs my-drawing.png --out ref.js [--colors 18] [--lines 1600] [--dabs 7000] [--fit cover|contain] [--res 720]
// Writes ref.js (export const REF = { … }) that lib/reference.js turns into Sketch items:
//   rough      long contours of the big forms (heavy blur → edges → traced), blue pencil
//   line       dark line work (difference of Gaussians → thinned → traced into strokes, width from darkness, tinted ink)
//   flats      the picture posterised (k-means in Lab) → connected regions → outlines, filled with their mean colour
//   shadow     where the picture is darker than its flats, in two levels → multiply regions with the measured ratio
//   highlight  where it is lighter → screen regions with the measured screen colour
//   finish     detail dabs (small oriented ellipses in the picture's colours) where the stages above still miss
// Needs only Node and ffmpeg (ffmpeg decodes the image). Deterministic: same image + options → same ref.js.
// Only for images the user may use: their own work, or with permission. Never someone else's art or a known character.
import { execFileSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const img = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') !== true);
if (!img || !existsSync(img)) { console.error('usage: from-image.mjs <image> --out ref.js [--colors 18] [--lines 1600] [--dabs 7000] [--fit cover|contain]'); process.exit(1); }
const N = +opt('res', 720), SC = 1000 / N, K = +opt('colors', 18), MAXL = +opt('lines', 1600), MAXD = +opt('dabs', 7000), fit = opt('fit', 'cover');
const out = resolve(opt('out', 'ref.js'));

// ---------- decode ----------
const vf = fit === 'contain' ? `scale=${N}:${N}:force_original_aspect_ratio=decrease,pad=${N}:${N}:(ow-iw)/2:(oh-ih)/2:color=white`
  : `scale=${N}:${N}:force_original_aspect_ratio=increase,crop=${N}:${N}`;
const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', img, '-vf', vf, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 26 });
const P = N * N, R = new Float32Array(P), G = new Float32Array(P), B = new Float32Array(P);
for (let i = 0; i < P; i++) { R[i] = raw[i * 3] / 255; G[i] = raw[i * 3 + 1] / 255; B[i] = raw[i * 3 + 2] / 255; }
const Y = a => { const y = new Float32Array(P); for (let i = 0; i < P; i++) y[i] = .2126 * a[0][i] + .7152 * a[1][i] + .0722 * a[2][i]; return y; };

// ---------- helpers ----------
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function boxBlur(src, r) {
  if (r < 1) return src.slice();
  const tmp = new Float32Array(P), dst = new Float32Array(P), w = 2 * r + 1;
  for (let y = 0; y < N; y++) { let acc = 0; for (let x = -r; x <= r; x++) acc += src[y * N + Math.min(N - 1, Math.max(0, x))]; for (let x = 0; x < N; x++) { tmp[y * N + x] = acc / w; acc += src[y * N + Math.min(N - 1, x + r + 1)] - src[y * N + Math.max(0, x - r)]; } }
  for (let x = 0; x < N; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(N - 1, Math.max(0, y)) * N + x]; for (let y = 0; y < N; y++) { dst[y * N + x] = acc / w; acc += tmp[Math.min(N - 1, y + r + 1) * N + x] - tmp[Math.max(0, y - r) * N + x]; } }
  return dst;
}
const gauss = (a, s) => { let r = a; const rr = Math.max(1, Math.round(s * .9)); for (let k = 0; k < 3; k++) r = boxBlur(r, rr); return r; };   // ≈ Gaussian
const lin = c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
function lab(r, g, b) {
  const R_ = lin(r), G_ = lin(g), B_ = lin(b);
  const f = t => t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const x = f((R_ * .4124 + G_ * .3576 + B_ * .1805) / .95047), y = f(R_ * .2126 + G_ * .7152 + B_ * .0722), z = f((R_ * .0193 + G_ * .1192 + B_ * .9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');

// connected components of a boolean/label grid (4-connectivity); returns comp id per pixel and the list
function components(test) {
  const id = new Int32Array(P).fill(-1), comps = [], stack = [];
  for (let i = 0; i < P; i++) {
    if (id[i] !== -1 || !test(i)) continue;
    const c = { idx: comps.length, px: [] }; comps.push(c); id[i] = c.idx; stack.push(i);
    while (stack.length) {
      const j = stack.pop(); c.px.push(j); const x = j % N, y = (j / N) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const k = ny * N + nx; if (id[k] === -1 && test(k, i)) { id[k] = c.idx; stack.push(k); } }
    }
  }
  return { id, comps };
}
// outer boundary of a component (Moore-neighbour tracing on pixel centres), simplified
function outline(c, id) {
  const inC = (x, y) => x >= 0 && y >= 0 && x < N && y < N && id[y * N + x] === c.idx;
  let start = c.px[0]; for (const p of c.px) if (p < start) start = p;   // top-most, then left-most
  const sx = start % N, sy = (start / N) | 0, dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const pts = [[sx, sy]]; let x = sx, y = sy, d = 7, guard = 0;
  do {
    let found = false;
    for (let k = 0; k < 8; k++) { const nd = (d + 6 + k) % 8, nx = x + dirs[nd][0], ny = y + dirs[nd][1]; if (inC(nx, ny)) { x = nx; y = ny; d = nd; found = true; break; } }
    if (!found) break;
    pts.push([x, y]);
  } while ((x !== sx || y !== sy) && ++guard < 40000);
  return dpClosed(pts, .9);
}
// a closed loop: split at the point farthest from the start, simplify both halves (DP needs distinct endpoints)
function dpClosed(pts, eps) {
  if (pts.length < 5) return pts;
  let m = 0, md = -1; for (let i = 0; i < pts.length; i++) { const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (d > md) { md = d; m = i; } }
  const a = dp(pts.slice(0, m + 1), eps), b = dp(pts.slice(m), eps);
  return a.concat(b.slice(1, -1));
}
function dp(pts, eps) {   // Douglas–Peucker
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let mx = 0, mi = -1; const [x1, y1] = pts[a], [x2, y2] = pts[b], L = Math.hypot(x2 - x1, y2 - y1) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((x2 - x1) * (y1 - pts[i][1]) - (x1 - pts[i][0]) * (y2 - y1)) / L; if (d > mx) { mx = d; mi = i; } }
    if (mx > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const toArt = pts => pts.map(([x, y]) => [+(x * SC + SC / 2).toFixed(1), +(y * SC + SC / 2).toFixed(1)]);
// regions are traced through pixel centres, so neighbours leave a half-pixel seam of paper between them: grow every
// region outline outward by `g` art units (overlaps are fine — smaller regions are painted on top)
function grow(pts, g) {
  if (pts.length < 3) return pts;
  let A = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; A += p[0] * q[1] - q[0] * p[1]; }
  const sg = A > 0 ? 1 : -1, n = pts.length;
  return pts.map((p, i) => { const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [+(p[0] + sg * dy / L * g).toFixed(1), +(p[1] - sg * dx / L * g).toFixed(1)]; });
}
const flat2 = pts => pts.flat();

// thin a binary mask (Zhang–Suen) and trace it into polylines split at junctions
function thin(m) {
  const a = Uint8Array.from(m); let changed = true;
  const nb = (i) => { const x = i % N, y = (i / N) | 0; if (x < 1 || y < 1 || x > N - 2 || y > N - 2) return null; return [a[i - N], a[i - N + 1], a[i + 1], a[i + N + 1], a[i + N], a[i + N - 1], a[i - 1], a[i - N - 1]]; };
  while (changed) {
    changed = false;
    for (const step of [0, 1]) {
      const del = [];
      for (let i = 0; i < P; i++) {
        if (!a[i]) continue; const p = nb(i); if (!p) continue;
        const b = p.reduce((s, v) => s + v, 0); if (b < 2 || b > 6) continue;
        let t = 0; for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) t++; if (t !== 1) continue;
        if (step === 0 ? (p[0] * p[2] * p[4] || p[2] * p[4] * p[6]) : (p[0] * p[2] * p[6] || p[0] * p[4] * p[6])) continue;
        del.push(i);
      }
      for (const i of del) a[i] = 0; if (del.length) changed = true;
    }
  }
  return a;
}
function trace(sk, minLen) {
  const deg = new Uint8Array(P), seen = new Uint8Array(P), lines = [], D8 = [-N - 1, -N, -N + 1, -1, 1, N - 1, N, N + 1];
  const ok = (i, j) => { const xi = i % N, xj = j % N; return Math.abs(xi - xj) <= 1 && j >= 0 && j < P; };
  for (let i = 0; i < P; i++) if (sk[i]) for (const d of D8) { const j = i + d; if (ok(i, j) && sk[j]) deg[i]++; }
  const walk = s => {
    const line = [s]; seen[s] = 1; let cur = s;
    for (;;) {
      let next = -1; for (const d of D8) { const j = cur + d; if (ok(cur, j) && sk[j] && !seen[j]) { next = j; break; } }
      if (next < 0) break; seen[next] = 1; line.push(next); cur = next; if (deg[next] > 2) break;
    }
    return line;
  };
  for (const pass of [1, 2, 3]) for (let i = 0; i < P; i++) {
    if (!sk[i] || seen[i]) continue;
    if (pass === 1 && deg[i] !== 1) continue; if (pass === 2 && deg[i] <= 2) continue;
    if (pass === 2) { seen[i] = 0; for (const d of D8) { const j = i + d; if (ok(i, j) && sk[j] && !seen[j]) { const l = walk(j); l.unshift(i); if (l.length >= minLen) lines.push(l); } } seen[i] = 1; continue; }
    const l = walk(i); if (l.length >= minLen) lines.push(l);
  }
  return lines.map(l => l.map(i => [i % N, (i / N) | 0]));
}

// join traced fragments whose ends meet (within `gap` px) and run on in the same direction: fewer, longer strokes
function join(ls, gap) {
  const dir = (l, end) => { const a = end ? l[l.length - 1] : l[0], b = end ? l[Math.max(0, l.length - 4)] : l[Math.min(l.length - 1, 3)]; const dx = a[0] - b[0], dy = a[1] - b[1], L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; };
  let merged = true, pass = 0;
  while (merged && pass++ < 6) {
    merged = false;
    const alive = ls.map(() => true);
    for (let i = 0; i < ls.length; i++) {
      if (!alive[i]) continue;
      for (let j = 0; j < ls.length; j++) {
        if (i === j || !alive[j]) continue;
        const a = ls[i], b = ls[j], ae = a[a.length - 1];
        for (const flip of [false, true]) {
          const bb = flip ? b.slice().reverse() : b, bs = bb[0];
          if (Math.hypot(ae[0] - bs[0], ae[1] - bs[1]) > gap) continue;
          const da = dir(a, true), db = dir(bb, false);
          if (da[0] * -db[0] + da[1] * -db[1] < .55) continue;      // must continue roughly straight on
          ls[i] = a.concat(bb); alive[j] = false; merged = true; break;
        }
        if (!alive[j]) break;
      }
    }
    ls = ls.filter((_, k) => alive[k]);
  }
  return ls;
}
const t0 = Date.now(), log = m => console.log(`  ${m}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
console.log(`${basename(img)} → ${out}`);
const Yo = Y([R, G, B]);

// ---------- flats: k-means in Lab on a softened picture ----------
const Rs = gauss(R, 1.6), Gs = gauss(G, 1.6), Bs = gauss(B, 1.6);
const L3 = new Float32Array(P * 3); for (let i = 0; i < P; i++) { const l = lab(Rs[i], Gs[i], Bs[i]); L3[i * 3] = l[0]; L3[i * 3 + 1] = l[1]; L3[i * 3 + 2] = l[2]; }
const rnd = rng(7), cent = [], samp = []; for (let i = 0; i < P; i += 7) samp.push(i);
cent.push(samp[Math.floor(rnd() * samp.length)]);
const d2 = (i, c) => (L3[i * 3] - c[0]) ** 2 + (L3[i * 3 + 1] - c[1]) ** 2 + (L3[i * 3 + 2] - c[2]) ** 2;
let C = [[L3[cent[0] * 3], L3[cent[0] * 3 + 1], L3[cent[0] * 3 + 2]]];
while (C.length < K) {   // k-means++
  const ds = samp.map(i => Math.min(...C.map(c => d2(i, c)))), sum = ds.reduce((a, b) => a + b, 0); let r = rnd() * sum, k = 0;
  while (r > ds[k] && k < ds.length - 1) r -= ds[k++];
  const i = samp[k]; C.push([L3[i * 3], L3[i * 3 + 1], L3[i * 3 + 2]]);
}
for (let it = 0; it < 12; it++) {
  const acc = C.map(() => [0, 0, 0, 0]);
  for (const i of samp) { let b = 0, bd = Infinity; C.forEach((c, k) => { const d = d2(i, c); if (d < bd) { bd = d; b = k; } }); const a = acc[b]; a[0] += L3[i * 3]; a[1] += L3[i * 3 + 1]; a[2] += L3[i * 3 + 2]; a[3]++; }
  C = C.map((c, k) => acc[k][3] ? [acc[k][0] / acc[k][3], acc[k][1] / acc[k][3], acc[k][2] / acc[k][3]] : c);
}
let lab_ = new Int16Array(P); for (let i = 0; i < P; i++) { let b = 0, bd = Infinity; C.forEach((c, k) => { const d = d2(i, c); if (d < bd) { bd = d; b = k; } }); lab_[i] = b; }
for (let pass = 0; pass < 2; pass++) {   // majority filter: no speckle
  const nx = new Int16Array(lab_);
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const cnt = new Map(); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = lab_[(y + dy) * N + x + dx]; cnt.set(v, (cnt.get(v) || 0) + 1); } let bv = lab_[y * N + x], bc = 0; for (const [v, c] of cnt) if (c > bc) { bc = c; bv = v; } nx[y * N + x] = bv; }
  lab_ = nx;
}
// merge small regions into their most common neighbour
const MINA = Math.round(P * .00012) + 8;
for (let pass = 0; pass < 3; pass++) {
  const { id, comps } = components((k, i) => i === undefined ? true : lab_[k] === lab_[i]);
  let merged = 0;
  for (const c of comps) {
    if (c.px.length >= MINA) continue; const cnt = new Map();
    for (const j of c.px) { const x = j % N, y = (j / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const k = ny * N + nx; if (id[k] !== c.idx) cnt.set(lab_[k], (cnt.get(lab_[k]) || 0) + 1); } }
    let bv = -1, bc = 0; for (const [v, n] of cnt) if (n > bc) { bc = n; bv = v; } if (bv >= 0) { for (const j of c.px) lab_[j] = bv; merged++; }
  }
  if (!merged) break;
}
const reg = components((k, i) => i === undefined ? true : lab_[k] === lab_[i]);
const F = [new Float32Array(P), new Float32Array(P), new Float32Array(P)], flats = [];
for (const c of reg.comps) {
  let r = 0, g = 0, b = 0; for (const j of c.px) { r += R[j]; g += G[j]; b += B[j]; } r /= c.px.length; g /= c.px.length; b /= c.px.length;
  for (const j of c.px) { F[0][j] = r; F[1][j] = g; F[2][j] = b; }
  if (c.px.length < 4) continue;
  let border = false, cx = 0, cy = 0; for (const j of c.px) { const x = j % N, y = (j / N) | 0; cx += x; cy += y; if (x === 0 || y === 0 || x === N - 1 || y === N - 1) border = true; }
  const pts = outline(c, reg.id); if (pts.length < 3) continue;
  flats.push({ p: flat2(grow(toArt(pts), 1.8)), c: hex(r, g, b), a: c.px.length, bg: border && c.px.length > P * .06, cx: cx / c.px.length, cy: cy / c.px.length });
}
flats.sort((a, b) => b.a - a.a); flats.forEach((f, i) => f.z = i);
// time order: the subject first (nearest the centre, biggest), the big border-touching background last
flats.forEach(f => f.o = (f.bg ? 1e6 : 0) + Math.hypot(f.cx - N / 2, f.cy - N / 2) * 40 - Math.sqrt(f.a));
log(`flats: ${K} colours → ${flats.length} regions`);

// ---------- shadow / highlight: what the flats miss in value ----------
const Ob = [gauss(R, .8), gauss(G, .8), gauss(B, .8)], Yb = Y(Ob), Yf = Y(F), dv = new Float32Array(P);
for (let i = 0; i < P; i++) dv[i] = Yb[i] - Yf[i];
const shadow = [], light = [], S1 = new Float32Array(P).fill(1), L1 = new Float32Array(P);
function layer(mask, kind, prev) {
  const cc = components((k, i) => mask[k] && (i === undefined || true));
  let n = 0;
  for (const c of cc.comps) {
    if (c.px.length < 14) continue;
    let r = 0, g = 0, b = 0;
    for (const j of c.px) for (let ch = 0; ch < 3; ch++) {
      const o = Ob[ch][j], f = F[ch][j] * (kind === 'shadow' ? prev[j] : 1);
      const v = kind === 'shadow' ? Math.min(1, o / Math.max(.02, f)) : Math.max(0, 1 - (1 - o) / Math.max(.02, 1 - (F[ch][j] + (1 - F[ch][j]) * prev[j])));
      if (ch === 0) r += v; else if (ch === 1) g += v; else b += v;
    }
    r /= c.px.length; g /= c.px.length; b /= c.px.length;
    const pts = outline(c, cc.id); if (pts.length < 3) continue;
    (kind === 'shadow' ? shadow : light).push({ p: flat2(grow(toArt(pts), .9)), c: hex(r, g, b), a: c.px.length });
    for (const j of c.px) { if (kind === 'shadow') prev[j] *= (r + g + b) / 3; else prev[j] = 1 - (1 - prev[j]) * (1 - (r + g + b) / 3); }
    n++;
  }
  return n;
}
const dS = gauss(dv, 1.2);
layer(Uint8Array.from(dS, v => v < -.035), 'shadow', S1);
layer(Uint8Array.from(dS, v => v < -.12), 'shadow', S1);
layer(Uint8Array.from(dS, v => v > .035), 'light', L1);
layer(Uint8Array.from(dS, v => v > .12), 'light', L1);
log(`shadow ${shadow.length} · highlight ${light.length} regions`);

// ---------- line art: dark lines (difference of Gaussians), thinned and traced ----------
const g1 = gauss(Yo, .7), g2 = gauss(Yo, 2.2), E = new Float32Array(P);
for (let i = 0; i < P; i++) E[i] = g1[i] - g2[i];
const lm = Uint8Array.from(E, v => v < -.022 ? 1 : 0);
const lines0 = join(trace(thin(lm), 3), 3.2).filter(l => l.length >= 5).map(l => {
  let dark = 0, r = 0, g = 0, b = 0; for (const [x, y] of l) { const i = y * N + x; dark += -E[i]; r += R[i]; g += G[i]; b += B[i]; }
  const n = l.length; dark /= n; r /= n; g /= n; b /= n;
  return { pts: dp(l, .7), len: n, dark, col: hex(r * .55, g * .5, b * .55) };
}).filter(l => l.pts.length >= 2);
const darkMax = Math.max(...lines0.map(l => l.dark), .05);
const lines = lines0.filter(l => l.dark > darkMax * .22).sort((a, b) => b.len * b.dark - a.len * a.dark).slice(0, MAXL);
// drawing order: greedy nearest-next from the top centre, each stroke drawn from its nearer end
const order = [], used = new Uint8Array(lines.length); let at = [N / 2, 0];
for (let k = 0; k < lines.length; k++) {
  let bi = -1, bd = Infinity, rev = false;
  for (let i = 0; i < lines.length; i++) { if (used[i]) continue; const p = lines[i].pts, a = p[0], z = p[p.length - 1], da = (a[0] - at[0]) ** 2 + (a[1] - at[1]) ** 2 - lines[i].len * 2, dz = (z[0] - at[0]) ** 2 + (z[1] - at[1]) ** 2 - lines[i].len * 2; if (da < bd) { bd = da; bi = i; rev = false; } if (dz < bd) { bd = dz; bi = i; rev = true; } }
  used[bi] = 1; const l = lines[bi]; if (rev) l.pts.reverse(); order.push(l); at = l.pts[l.pts.length - 1];
}
const maxDark = Math.max(...order.map(l => l.dark), .05);
const line = order.map(l => ({ p: flat2(toArt(l.pts)), w: +(1.1 + 2.6 * Math.min(1, l.dark / maxDark)).toFixed(2), c: l.col, a: +(.55 + .45 * Math.min(1, l.dark / maxDark)).toFixed(2) }));
log(`line art: ${line.length} strokes`);

// ---------- rough: long contours of the big forms ----------
const h1 = gauss(Yo, 3.5), h2 = gauss(Yo, 8), Hm = new Uint8Array(P);
for (let i = 0; i < P; i++) Hm[i] = Math.abs(h1[i] - h2[i]) > .035 ? 1 : 0;
const rough = trace(thin(Hm), 18).sort((a, b) => b.length - a.length).slice(0, 46).map(l => flat2(toArt(dp(l, 2.2))));
log(`rough: ${rough.length} contours`);

// ---------- finish: detail dabs where the stages still miss ----------
const A = [new Float32Array(P), new Float32Array(P), new Float32Array(P)];
for (let i = 0; i < P; i++) for (let ch = 0; ch < 3; ch++) { const f = F[ch][i] * S1[i]; A[ch][i] = f + (1 - f) * L1[i]; }
const gx = new Float32Array(P), gy = new Float32Array(P), Ys = gauss(Yo, 1.2);
for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const i = y * N + x; gx[i] = Ys[i + 1] - Ys[i - 1]; gy[i] = Ys[i + N] - Ys[i - N]; }
const dab = [], rd = rng(11), Oc = [gauss(R, 1), gauss(G, 1), gauss(B, 1)];
for (const [step, rad, thr] of [[5, 3.4, .045], [3, 1.9, .06], [2, 1.2, .09]]) {
  for (let y = 0; y < N; y += step) for (let x = 0; x < N; x += step) {
    const xx = Math.min(N - 1, Math.round(x + (rd() - .5) * step)), yy = Math.min(N - 1, Math.round(y + (rd() - .5) * step)), i = yy * N + xx;
    const err = (Math.abs(Oc[0][i] - A[0][i]) + Math.abs(Oc[1][i] - A[1][i]) + Math.abs(Oc[2][i] - A[2][i])) / 3;
    if (err < thr) continue;
    const ang = Math.atan2(gy[i], gx[i]) + Math.PI / 2;
    dab.push([+(xx * SC + SC / 2).toFixed(1), +(yy * SC + SC / 2).toFixed(1), +(rad * SC).toFixed(1), +(rad * SC * .5).toFixed(1), +ang.toFixed(2), hex(Oc[0][i], Oc[1][i], Oc[2][i])]);
    for (let ch = 0; ch < 3; ch++) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const j = Math.min(P - 1, Math.max(0, i + dy * N + dx)); A[ch][j] += (Oc[ch][j] - A[ch][j]) * .6; }
    if (dab.length >= MAXD) break;
  }
  if (dab.length >= MAXD) break;
}
log(`finish: ${dab.length} detail dabs`);

writeFileSync(out, `// made by speedpaint-replay/scripts/from-image.mjs from ${basename(img)} (${N}×${N} analysis, ${K} colours)
// Reference mode: only for an image the user owns or may use. Load with lib/reference.js → addReference(s, REF).
export const REF = ${JSON.stringify({ source: basename(img), rough, line, flats: flats.map(({ p, c, z, o }) => ({ p, c, z, o: Math.round(o) })), shadow, light, dab })};
`);
log(`wrote ${out}`);
