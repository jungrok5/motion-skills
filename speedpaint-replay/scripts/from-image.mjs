// speedpaint-replay · from-image.mjs — REFERENCE MODE: read a picture the way a digital painter would make it, so the
// replay can draw toward it in a painter's order. Not pixels: construction → inked lines → flats inside the lines →
// shadow shapes → light shapes → airbrush blending → drawn-in detail → line colour.
//   node <skill>/scripts/from-image.mjs picture.png --out ref.js [--plan plan.json] [--debug out/ref]
//        [--materials 8] [--lines 450] [--contours 200] [--details 1200] [--fit cover|contain]
// What it measures (all in art units, 1000 × 1000):
//   lines      thin dark line work (morphological black top-hat) → skeleton → strokes joined through junctions, each
//              with its measured width along its length (thick lashes, hairlines that taper) and its own colour
//   contours   outlines where two materials meet without a drawn line (dark hair against the sky): inked too
//   materials  a few regions that are one thing each (skin, hair, cloth, background …): the plan's rough lassos, with
//              the exact edge found by colour; each gets ONE base colour: its flat
//   tones      inside each material, the few colours it is shaded with: darker ones are shadow shapes, lighter ones
//              are light shapes (smooth outlines with holes)
//   air        what flat tones cannot say (soft gradients): rows of soft airbrush dabs per material, coarse then fine
//   details    where the picture still differs: short strokes drawn along the picture's own directions
//   rough      the construction from plan.json (head circle, centre line, eye line …) + the big silhouettes
// plan.json is how the agent, who can SEE the picture, tells the tool what is what (references/REFERENCE.md):
//   { "construct": [["ellipse", cx, cy, rx, ry, rotDeg], ["line", x, y, x, y, …]],
//     "materials": [{ "name": "skin", "poly": [[x, y, x, y, …], …], "base": "#f4d0b4", "tones": 4 }, { "name": "background", "rest": true }],
//     "focus": [["eyes", x, y, w, h], ["face", …], …] }
// --debug writes grid.png (coordinates to read), lines.png, materials.png, tones.png, sim.png (the predicted finish).
// Needs only Node and ffmpeg. Deterministic: same picture + options + plan → same ref.js.
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, basename, join as pjoin } from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const img = args.find((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--'));
if (!img || !existsSync(img)) { console.error('usage: from-image.mjs <image> --out ref.js [--plan plan.json] [--debug dir] [--materials 8] [--lines 450] [--contours 200] [--details 1200]'); process.exit(1); }
const N = 1000, P = N * N, KM = +opt('materials', 8), MAXL = +opt('lines', 450), MAXD = +opt('details', 1200), fit = opt('fit', 'cover');
const out = resolve(opt('out', 'ref.js')), dbg = opt('debug') ? resolve(opt('debug')) : null;
const plan = opt('plan') && existsSync(opt('plan')) ? JSON.parse(readFileSync(opt('plan'), 'utf8')) : {};
if (dbg) mkdirSync(dbg, { recursive: true });
// the order of work: the plan's focus boxes, first match wins (eyes → face → hair → body …); the rest comes last
const focus = (plan.focus || []).map(f => ({ name: f[0], x: f[1], y: f[2], w: f[3], h: f[4] }));
const groupOf = (x, y) => { const g = focus.findIndex(f => x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h); return g < 0 ? focus.length : g; };
const t0 = Date.now(), log = m => console.log(`  ${m}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
console.log(`${basename(img)} → ${out}${opt('plan') ? ' with ' + basename(opt('plan')) : ''}`);

// ───────── basics ─────────
const vf = fit === 'contain' ? `scale=${N}:${N}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${N}:${N}:(ow-iw)/2:(oh-ih)/2:color=white`
  : `scale=${N}:${N}:force_original_aspect_ratio=increase:flags=lanczos,crop=${N}:${N}`;
const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', img, '-vf', vf, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 27 });
const T = [new Float32Array(P), new Float32Array(P), new Float32Array(P)];
for (let i = 0; i < P; i++) { T[0][i] = raw[i * 3] / 255; T[1][i] = raw[i * 3 + 1] / 255; T[2][i] = raw[i * 3 + 2] / 255; }
const lum = a => { const y = new Float32Array(P); for (let i = 0; i < P; i++) y[i] = .2126 * a[0][i] + .7152 * a[1][i] + .0722 * a[2][i]; return y; };
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function boxBlur(src, r) {
  if (r < 1) return Float32Array.from(src);
  const tmp = new Float32Array(P), dst = new Float32Array(P), w = 2 * r + 1;
  for (let y = 0; y < N; y++) { let acc = 0; const o = y * N; for (let x = -r; x <= r; x++) acc += src[o + Math.min(N - 1, Math.max(0, x))]; for (let x = 0; x < N; x++) { tmp[o + x] = acc / w; acc += src[o + Math.min(N - 1, x + r + 1)] - src[o + Math.max(0, x - r)]; } }
  for (let x = 0; x < N; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(N - 1, Math.max(0, y)) * N + x]; for (let y = 0; y < N; y++) { dst[y * N + x] = acc / w; acc += tmp[Math.min(N - 1, y + r + 1) * N + x] - tmp[Math.max(0, y - r) * N + x]; } }
  return dst;
}
const gauss = (a, s) => { let r = a; const rr = Math.max(1, Math.round(s * .9)); for (let k = 0; k < 3; k++) r = boxBlur(r, rr); return r; };
function minmax(src, r, max) {   // separable square min / max filter
  const tmp = new Float32Array(P), dst = new Float32Array(P), f = max ? Math.max : Math.min;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = src[y * N + x]; for (let d = 1; d <= r; d++) { if (x - d >= 0) v = f(v, src[y * N + x - d]); if (x + d < N) v = f(v, src[y * N + x + d]); } tmp[y * N + x] = v; }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = tmp[y * N + x]; for (let d = 1; d <= r; d++) { if (y - d >= 0) v = f(v, tmp[(y - d) * N + x]); if (y + d < N) v = f(v, tmp[(y + d) * N + x]); } dst[y * N + x] = v; }
  return dst;
}
const linc = c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
function lab(r, g, b) {
  const R_ = linc(r), G_ = linc(g), B_ = linc(b), f = t => t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const x = f((R_ * .4124 + G_ * .3576 + B_ * .1805) / .95047), y = f(R_ * .2126 + G_ * .7152 + B_ * .0722), z = f((R_ * .0193 + G_ * .1192 + B_ * .9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');
const unhex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const r1 = v => Math.round(v * 10) / 10;
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// connected components (4-connected) of pixels where same(k, from) holds; returns id per pixel (-1 = not in any) + sizes
function components(inSet, same) {
  const id = new Int32Array(P).fill(-1), size = [], stack = [];
  for (let i = 0; i < P; i++) {
    if (id[i] !== -1 || !inSet(i)) continue;
    const c = size.length; let n = 0; id[i] = c; stack.push(i);
    while (stack.length) {
      const j = stack.pop(); n++; const x = j % N, y = (j / N) | 0;
      if (x + 1 < N && id[j + 1] === -1 && inSet(j + 1) && (!same || same(j + 1, j))) { id[j + 1] = c; stack.push(j + 1); }
      if (x > 0 && id[j - 1] === -1 && inSet(j - 1) && (!same || same(j - 1, j))) { id[j - 1] = c; stack.push(j - 1); }
      if (y + 1 < N && id[j + N] === -1 && inSet(j + N) && (!same || same(j + N, j))) { id[j + N] = c; stack.push(j + N); }
      if (y > 0 && id[j - N] === -1 && inSet(j - N) && (!same || same(j - N, j))) { id[j - N] = c; stack.push(j - N); }
    }
    size.push(n);
  }
  return { id, size };
}
// spread labels into unlabelled (-1) pixels from their nearest labelled neighbours (multi-source BFS)
function spread(label) {
  let q = []; for (let i = 0; i < P; i++) if (label[i] >= 0) q.push(i);
  while (q.length) {
    const nq = [];
    for (const j of q) { const x = j % N, y = (j / N) | 0, l = label[j];
      if (x + 1 < N && label[j + 1] < 0) { label[j + 1] = l; nq.push(j + 1); } if (x > 0 && label[j - 1] < 0) { label[j - 1] = l; nq.push(j - 1); }
      if (y + 1 < N && label[j + N] < 0) { label[j + N] = l; nq.push(j + N); } if (y > 0 && label[j - N] < 0) { label[j - N] = l; nq.push(j - N); } }
    q = nq;
  }
  return label;
}
function dp(pts, eps, keepIdx) {   // Douglas–Peucker on an open polyline; returns kept indices when keepIdx
  const n = pts.length, keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1; const st = [[0, n - 1]];
  while (st.length) {
    const [a, b] = st.pop(); if (b - a < 2) continue; let mx = 0, mi = -1; const x1 = pts[a][0], y1 = pts[a][1], x2 = pts[b][0], y2 = pts[b][1], L = Math.hypot(x2 - x1, y2 - y1) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((x2 - x1) * (y1 - pts[i][1]) - (x1 - pts[i][0]) * (y2 - y1)) / L; if (d > mx) { mx = d; mi = i; } }
    if (mx > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  const idx = []; for (let i = 0; i < n; i++) if (keep[i]) idx.push(i);
  return keepIdx ? idx : idx.map(i => pts[i]);
}
function kmeans(feat, dim, w, k, seed, iters = 14) {   // weighted k-means++ on rows of `feat`
  const n = feat.length / dim, rd = rng(seed), C = [], d2 = (i, c) => { let s = 0; for (let d = 0; d < dim; d++) s += (feat[i * dim + d] - c[d]) ** 2; return s; };
  const row = i => Array.from(feat.subarray(i * dim, i * dim + dim));
  let tw = 0; for (let i = 0; i < n; i++) tw += w ? w[i] : 1;
  let r = rd() * tw, f = 0; for (; f < n - 1; f++) { r -= w ? w[f] : 1; if (r <= 0) break; } C.push(row(f));
  const best = new Float64Array(n).fill(Infinity);
  while (C.length < k) { let sum = 0; for (let i = 0; i < n; i++) { best[i] = Math.min(best[i], d2(i, C[C.length - 1])); sum += best[i] * (w ? w[i] : 1); } let q = rd() * sum, j = 0; for (; j < n - 1; j++) { q -= best[j] * (w ? w[j] : 1); if (q <= 0) break; } C.push(row(j)); }
  const asg = new Int32Array(n);
  for (let it = 0; it < iters; it++) {
    const acc = C.map(() => new Float64Array(dim + 1));
    for (let i = 0; i < n; i++) { let b = 0, bd = Infinity; for (let c = 0; c < C.length; c++) { const d = d2(i, C[c]); if (d < bd) { bd = d; b = c; } } asg[i] = b; const ww = w ? w[i] : 1, a = acc[b]; for (let d = 0; d < dim; d++) a[d] += feat[i * dim + d] * ww; a[dim] += ww; }
    for (let c = 0; c < C.length; c++) if (acc[c][dim] > 0) for (let d = 0; d < dim; d++) C[c][d] = acc[c][d] / acc[c][dim];
  }
  return { C, asg };
}
function savePng(name, buf, extra = '') {
  if (!dbg) return;
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${N}x${N}`, '-i', '-', ...(extra ? ['-vf', extra] : []), '-frames:v', '1', pjoin(dbg, name)], { input: buf, maxBuffer: 1 << 27 });
}
const toBuf = A => { const b = Buffer.alloc(P * 3); for (let i = 0; i < P; i++) { b[i * 3] = Math.round(Math.min(1, Math.max(0, A[0][i])) * 255); b[i * 3 + 1] = Math.round(Math.min(1, Math.max(0, A[1][i])) * 255); b[i * 3 + 2] = Math.round(Math.min(1, Math.max(0, A[2][i])) * 255); } return b; };
const label = (txt, x, y, size = 20) => `drawtext=text='${txt}':x=${Math.round(x)}:y=${Math.round(y)}:fontsize=${size}:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=3`;

if (dbg) {   // the picture with a coordinate grid, for reading positions off it
  const G = T.map(c => Float32Array.from(c));
  for (let v = 100; v < N; v += 100) for (let i = 0; i < N; i++) for (const j of [v * N + i, i * N + v]) for (let ch = 0; ch < 3; ch++) G[ch][j] = G[ch][j] * .45 + (v % 500 === 0 ? .55 : .3);
  const labs = []; for (let v = 100; v < N; v += 100) labs.push(label(v, v + 3, 3, 18), label(v, 3, v + 3, 18));
  savePng('grid.png', toBuf(G), labs.join(','));
}

// ───────── 1. line art: thin dark structures ─────────
const Y = gauss(lum(T), .6);
const bh = (r => { const c = minmax(minmax(Y, r, true), r, false), o = new Float32Array(P); for (let i = 0; i < P; i++) o[i] = c[i] - Y[i]; return o; });
const bh4 = bh(4), bh9 = bh(9);
let M = new Uint8Array(P);
const LW = +opt('line-weak', .024), LS = +opt('line-strong', .06);
{ // hysteresis: weak line pixels count when their component holds a strong one; plus thick very dark marks (lashes, pupils)
  const weak = i => bh4[i] > LW || (bh9[i] > .2 && Y[i] < .38), cc = components(weak), strong = new Uint8Array(cc.size.length);
  for (let i = 0; i < P; i++) if (cc.id[i] >= 0 && (bh4[i] > LS || (bh9[i] > .3 && Y[i] < .3))) strong[cc.id[i]] = 1;
  for (let i = 0; i < P; i++) if (cc.id[i] >= 0 && strong[cc.id[i]] && cc.size[cc.id[i]] >= 18) M[i] = 1;
}
// how wide a line really is: the mask is a generous net around a soft line, so measure the width at half the line's
// own darkness (full width at half maximum), as the distance to the nearest pixel that is under half the local peak
const pk4 = minmax(bh4, 3, true), pk9 = minmax(bh9, 4, true);
const DT = (() => { const core = i => M[i] && (bh4[i] > pk4[i] * .5 || (bh9[i] > .2 && bh9[i] > pk9[i] * .6));
  const D = new Float32Array(P), a = 1, b = Math.SQRT2; for (let i = 0; i < P; i++) D[i] = core(i) ? 1e9 : 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (!D[i]) continue; let v = D[i]; if (x > 0) v = Math.min(v, D[i - 1] + a); if (y > 0) { v = Math.min(v, D[i - N] + a); if (x > 0) v = Math.min(v, D[i - N - 1] + b); if (x + 1 < N) v = Math.min(v, D[i - N + 1] + b); } D[i] = v; }
  for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) { const i = y * N + x; if (!D[i]) continue; let v = D[i]; if (x + 1 < N) v = Math.min(v, D[i + 1] + a); if (y + 1 < N) { v = Math.min(v, D[i + N] + a); if (x + 1 < N) v = Math.min(v, D[i + N + 1] + b); if (x > 0) v = Math.min(v, D[i + N - 1] + b); } D[i] = v; }
  return D; })();
function thin(m) {   // Zhang–Suen
  const a = Uint8Array.from(m); let changed = true, live = []; for (let i = 0; i < P; i++) if (a[i]) live.push(i);
  while (changed) {
    changed = false;
    for (const step of [0, 1]) {
      const del = [];
      for (const i of live) {
        if (!a[i]) continue; const x = i % N, y = (i / N) | 0; if (x < 1 || y < 1 || x > N - 2 || y > N - 2) { del.push(i); continue; }
        const p = [a[i - N], a[i - N + 1], a[i + 1], a[i + N + 1], a[i + N], a[i + N - 1], a[i - 1], a[i - N - 1]];
        const b = p[0] + p[1] + p[2] + p[3] + p[4] + p[5] + p[6] + p[7]; if (b < 2 || b > 6) continue;
        let t = 0; for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) t++; if (t !== 1) continue;
        if (step === 0 ? (p[0] * p[2] * p[4] || p[2] * p[4] * p[6]) : (p[0] * p[2] * p[6] || p[0] * p[4] * p[6])) continue;
        del.push(i);
      }
      for (const i of del) a[i] = 0; if (del.length) changed = true;
    }
    live = live.filter(i => a[i]);
  }
  return a;
}
function trace(sk) {   // skeleton → pixel chains that end at endpoints or junctions
  const deg = new Uint8Array(P), seen = new Uint8Array(P), lines = [], D8 = [-N - 1, -N, -N + 1, -1, 1, N - 1, N, N + 1];
  const ok = (i, j) => j >= 0 && j < P && Math.abs((i % N) - (j % N)) <= 1;
  for (let i = 0; i < P; i++) if (sk[i]) for (const d of D8) { const j = i + d; if (ok(i, j) && sk[j]) deg[i]++; }
  const walk = s => { const line = [s]; seen[s] = 1; let cur = s; for (;;) { let next = -1; for (const d of D8) { const j = cur + d; if (ok(cur, j) && sk[j] && !seen[j]) { next = j; break; } } if (next < 0) break; seen[next] = 1; line.push(next); cur = next; if (deg[next] > 2) break; } return line; };
  for (const pass of [1, 2, 3]) for (let i = 0; i < P; i++) {
    if (!sk[i] || (seen[i] && pass !== 2)) continue;
    if (pass === 1 && deg[i] !== 1) continue; if (pass === 2 && deg[i] <= 2) continue;
    if (pass === 2) { seen[i] = 1; for (const d of D8) { const j = i + d; if (ok(i, j) && sk[j] && !seen[j]) { const l = walk(j); l.unshift(i); lines.push(l); } } continue; }
    lines.push(walk(i));
  }
  return lines.map(l => l.map(i => [i % N, (i / N) | 0, i]));
}
// join chains whose ends meet and run straight on (the best partner by direction, mutually): long confident strokes
function joinChains(ls, gap = 10, minDot = .72) {
  const dir = (l, end) => { const n = l.length, a = end ? l[n - 1] : l[0], b = end ? l[Math.max(0, n - 6)] : l[Math.min(n - 1, 5)], dx = a[0] - b[0], dy = a[1] - b[1], L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; };
  for (let pass = 0; pass < 8; pass++) {
    const ends = []; ls.forEach((l, i) => { if (l.length < 2) return; ends.push({ i, end: 0, p: l[0], d: dir(l, 0) }, { i, end: 1, p: l[l.length - 1], d: dir(l, 1) }); });
    const grid = new Map(), key = (x, y) => ((x >> 4) << 12) | (y >> 4); ends.forEach((e, k) => { const g = key(e.p[0], e.p[1]); (grid.get(g) || grid.set(g, []).get(g)).push(k); });
    const best = new Int32Array(ends.length).fill(-1), score = new Float32Array(ends.length).fill(-2);
    ends.forEach((e, k) => { for (let gx = -1; gx <= 1; gx++) for (let gy = -1; gy <= 1; gy++) for (const m of grid.get(key(e.p[0] + gx * 16, e.p[1] + gy * 16)) || []) {
      const f = ends[m]; if (f.i === e.i) continue; const vx = f.p[0] - e.p[0], vy = f.p[1] - e.p[1], dist = Math.hypot(vx, vy); if (dist > gap) continue;
      let dot = -(e.d[0] * f.d[0] + e.d[1] * f.d[1]);
      // across a gap (a faint stretch the mask missed) both ends must also point at each other
      if (dist > 3.5) { const a = (e.d[0] * vx + e.d[1] * vy) / dist, b = -(f.d[0] * vx + f.d[1] * vy) / dist; if (a < .9 || b < .9 || dot < .85) continue; }
      dot -= dist * .02; if (dot > score[k]) { score[k] = dot; best[k] = m; } } });
    const dead = new Uint8Array(ls.length), used = new Uint8Array(ls.length); let merged = 0;
    ends.forEach((e, k) => {
      const m = best[k]; if (m < 0 || best[m] !== k || score[k] < minDot || k > m) return; const f = ends[m];
      if (used[e.i] || used[f.i]) return; used[e.i] = used[f.i] = 1;
      const A = e.end ? ls[e.i] : ls[e.i].slice().reverse(), B = f.end ? ls[f.i].slice().reverse() : ls[f.i];
      ls[e.i] = A.concat(B); dead[f.i] = 1; merged++;
    });
    ls = ls.filter((_, i) => !dead[i]); if (!merged) break;
  }
  return ls;
}
const extent = pts => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return Math.hypot(x1 - x0, y1 - y0); };
const sm = (arr, fixedEnds = true, passes = 2) => { let a = arr; for (let p = 0; p < passes; p++) { const b = a.slice(); for (let i = 1; i < a.length - 1; i++) b[i] = (a[i - 1] + 2 * a[i] + a[i + 1]) / 4; if (!fixedEnds && a.length > 1) { b[0] = (3 * a[0] + a[1]) / 4; b[a.length - 1] = (3 * a[a.length - 1] + a[a.length - 2]) / 4; } a = b; } return a; };
let strokes = joinChains(trace(thin(M))).filter(l => l.length >= 7).map(l => {
  const n = l.length; let r = 0, g = 0, b = 0, dk = 0; for (const [, , i] of l) dk += Math.max(bh4[i], bh9[i]);
  // the line's colour: its darker half (the skeleton wanders off the darkest pixel here and there)
  { const srt = l.map(p => p[2]).sort((a, b) => Y[a] - Y[b]).slice(0, Math.max(1, n >> 1)); for (const i of srt) { r += T[0][i]; g += T[1][i]; b += T[2][i]; } r *= n / srt.length; g *= n / srt.length; b *= n / srt.length; }
  const xs = sm(l.map(p => p[0] + .5), true, 10), ys = sm(l.map(p => p[1] + .5), true, 10), ws = sm(l.map(p => { let d = DT[p[2]]; if (!d) for (const q of [1, -1, N, -N]) d = Math.max(d, DT[p[2] + q] || 0); return Math.min(14, Math.max(1, 2 * d - .5)); }), false, 14);   // a pen's width changes slowly along a stroke
  const pts = xs.map((x, i) => [x, ys[i]]), idx = dp(pts, .45, true);
  let wm = 0; for (const w of ws) wm += w; wm /= n;
  return { p: idx.map(i => pts[i]), w: idx.map(i => ws[i]), len: n, wm, dark: dk / n, col: [r / n, g / n, b / n] };
});
strokes = strokes.filter(s => (s.len >= 14 || s.wm > 3.2) && extent(s.p) >= 3);   // specks are not strokes (thick short marks are: lashes, pupils)
// which strokes are inked: the long, dark, wide ones, and what lies in an early focus box (a nose is a short faint line that matters)
// … and not what lies outside every lasso: nobody inks a blurred background
const subject = (() => { const polys = (plan.materials || []).flatMap(m => m.poly || []); if (!polys.length) return null; const m = new Uint8Array(P);
  for (const poly of polys) { const n = poly.length / 2; for (let y = 0; y < N; y++) { const yc = y + .5, xs = []; for (let k = 0; k < n; k++) { const x1 = poly[k * 2], y1 = poly[k * 2 + 1], x2 = poly[((k + 1) % n) * 2], y2 = poly[((k + 1) % n) * 2 + 1]; if ((y1 <= yc && y2 > yc) || (y2 <= yc && y1 > yc)) xs.push(x1 + (yc - y1) / (y2 - y1) * (x2 - x1)); } xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.round(xs[k]) - 12); x <= Math.min(N - 1, Math.round(xs[k + 1]) + 12); x++) m[y * N + x] = 1; } }
  return m; })();
const rank = s => { const m = s.p[s.p.length >> 1], g = groupOf(m[0], m[1]), inSubject = !subject || subject[Math.min(N - 1, Math.max(0, Math.round(m[1]))) * N + Math.min(N - 1, Math.max(0, Math.round(m[0])))];
  return s.len * s.wm * s.dark * (1 + 3 * (focus.length - g) / Math.max(1, focus.length)) * (inSubject ? 1 : .12); };
strokes.sort((a, b) => rank(b) - rank(a));
const dropped = strokes.length - Math.min(strokes.length, MAXL); strokes = strokes.slice(0, MAXL);
// the kept line art as a mask (what the ink layer will cover), and the picture with it painted out
const MK = new Uint8Array(P);
for (const s of strokes) for (let k = 0; k + 1 < s.p.length; k++) {
  const [x1, y1] = s.p[k], [x2, y2] = s.p[k + 1], L = Math.ceil(Math.hypot(x2 - x1, y2 - y1)) || 1;
  for (let j = 0; j <= L; j++) { const u = j / L, x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u, r = (s.w[k] + (s.w[k + 1] - s.w[k]) * u) / 2 + 1.2, R = Math.ceil(r);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { if (dx * dx + dy * dy > r * r) continue; const xx = Math.round(x + dx), yy = Math.round(y + dy); if (xx >= 0 && yy >= 0 && xx < N && yy < N) MK[yy * N + xx] = 1; } }
}
const U = T.map(c => Float32Array.from(c));   // "under the lines": the picture as paint only
{ const known = new Uint8Array(P); for (let i = 0; i < P; i++) known[i] = MK[i] ? 0 : 1; let q = [];
  for (let i = 0; i < P; i++) if (!known[i]) { const x = i % N, y = (i / N) | 0; if ((x > 0 && known[i - 1]) || (x + 1 < N && known[i + 1]) || (y > 0 && known[i - N]) || (y + 1 < N && known[i + N])) q.push(i); }
  while (q.length) { const fill = [];
    for (const i of q) { const x = i % N, y = (i / N) | 0; let r = 0, g = 0, b = 0, n = 0; for (const [dx, dy] of D4) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const j = yy * N + xx; if (known[j]) { r += U[0][j]; g += U[1][j]; b += U[2][j]; n++; } } if (n) fill.push([i, r / n, g / n, b / n]); }
    const nq = []; for (const [i, r, g, b] of fill) { U[0][i] = r; U[1][i] = g; U[2][i] = b; known[i] = 1; }
    for (const [i] of fill) { const x = i % N, y = (i / N) | 0; for (const [dx, dy] of D4) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const j = yy * N + xx; if (!known[j] && MK[j] !== 2) { MK[j] = 2; nq.push(j); } } }
    q = nq; if (!fill.length) break; }
  for (let i = 0; i < P; i++) if (MK[i] === 2) MK[i] = 1; }
const inkDark = (() => { const s = strokes.slice().sort((a, b) => lum3(a.col) - lum3(b.col)).slice(0, Math.max(3, strokes.length >> 2)); const m = k => { const v = s.map(q => q.col[k]).sort((a, b) => a - b); return v[v.length >> 1] || .15; }; return [m(0), m(1), m(2)]; })();
function lum3(c) { return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
log(`line art: ${strokes.length} strokes (${dropped} weaker ones left to the detail pass)`);
if (dbg) { const L = [new Float32Array(P).fill(1), new Float32Array(P).fill(1), new Float32Array(P).fill(1)]; for (let i = 0; i < P; i++) if (M[i]) L[0][i] = L[1][i] = L[2][i] = .1; savePng('lines.png', toBuf(L)); }

// ───────── 2. materials: what is skin, hair, cloth, background ─────────
// With a plan: each material is a rough lasso (polygons drawn by the agent, who can see the picture); the exact edge
// is then found by colour, inside a band around the lasso — select loosely, let the colours decide the boundary.
// Without one: colour clusters (no meaning, but still a few big flats).
const Us = U.map(c => gauss(c, 1.3)), LAB = new Float32Array(P * 3);
for (let i = 0; i < P; i++) { const l = lab(Us[0][i], Us[1][i], Us[2][i]); LAB[i * 3] = l[0]; LAB[i * 3 + 1] = l[1]; LAB[i * 3 + 2] = l[2]; }
function distTo(isZero) {   // chamfer distance to the nearest pixel where isZero
  const D = new Float32Array(P), a = 1, b = Math.SQRT2; for (let i = 0; i < P; i++) D[i] = isZero(i) ? 0 : 1e9;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (!D[i]) continue; let v = D[i]; if (x > 0) v = Math.min(v, D[i - 1] + a); if (y > 0) { v = Math.min(v, D[i - N] + a); if (x > 0) v = Math.min(v, D[i - N - 1] + b); if (x + 1 < N) v = Math.min(v, D[i - N + 1] + b); } D[i] = v; }
  for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) { const i = y * N + x; if (!D[i]) continue; let v = D[i]; if (x + 1 < N) v = Math.min(v, D[i + 1] + a); if (y + 1 < N) { v = Math.min(v, D[i + N] + a); if (x + 1 < N) v = Math.min(v, D[i + N + 1] + b); if (x > 0) v = Math.min(v, D[i + N - 1] + b); } D[i] = v; }
  return D;
}
function rasterPolys(polys) {   // even-odd scanline fill of polygons given as flat [x, y, …] arrays
  const m = new Uint8Array(P);
  for (const poly of polys) { const n = poly.length / 2;
    for (let y = 0; y < N; y++) { const yc = y + .5, xs = []; for (let k = 0; k < n; k++) { const x1 = poly[k * 2], y1 = poly[k * 2 + 1], x2 = poly[((k + 1) % n) * 2], y2 = poly[((k + 1) % n) * 2 + 1]; if ((y1 <= yc && y2 > yc) || (y2 <= yc && y1 > yc)) xs.push(x1 + (yc - y1) / (y2 - y1) * (x2 - x1)); }
      xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.ceil(xs[k] - .5)); x <= Math.min(N - 1, Math.floor(xs[k + 1] - .5)); x++) m[y * N + x] ^= 1; } }
  return m;
}
const palette = (px, k, seed) => { const step = Math.max(1, Math.floor(px.length / 8000)), f = []; for (let j = 0; j < px.length; j += step) f.push(LAB[px[j] * 3], LAB[px[j] * 3 + 1], LAB[px[j] * 3 + 2]); return f.length >= 3 ? kmeans(Float32Array.from(f), 3, null, Math.min(k, f.length / 3), seed).C : []; };
const dEmin = (i, pal) => { let b = 1e9; for (const c of pal) { const d = (LAB[i * 3] - c[0]) ** 2 + (LAB[i * 3 + 1] - c[1]) ** 2 + (LAB[i * 3 + 2] - c[2]) ** 2; if (d < b) b = d; } return Math.sqrt(b); };
const mat = new Int16Array(P).fill(-1), mats = [];
const lasso = (plan.materials || []).filter(m => m.poly);
if (lasso.length) {
  const BAND = +(plan.band ?? 26), BETA = 16;
  for (const pm of plan.materials) mats.push({ name: pm.name, base: pm.base || null, tones: pm.tones, rest: !!pm.rest, poly: pm.poly });
  if (!mats.some(m => m.rest)) mats.push({ name: 'background', rest: true });
  const far = new Uint8Array(P).fill(1), cover = new Uint8Array(P);
  for (const m of mats) { if (!m.poly) continue;
    m.mk = rasterPolys(m.poly); const din = distTo(i => !m.mk[i]), dout = distTo(i => m.mk[i]); m.sd = new Float32Array(P); let n = 0;
    for (let i = 0; i < P; i++) { const d = m.mk[i] ? din[i] : -dout[i]; m.sd[i] = d; if (d > -BAND * .5) far[i] = 0; if (d > 0) { n++; cover[i]++; } }
    m.band = Math.min(BAND, Math.max(6, Math.sqrt(n) * .25)); }
  // each material's colours: the plan's sample points if given, else what lies inside its lasso and no other
  const sampleAt = ([x, y]) => { const v = [[], [], []]; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const i = Math.min(N - 1, Math.max(0, Math.round(y) + dy)) * N + Math.min(N - 1, Math.max(0, Math.round(x) + dx)); for (let c = 0; c < 3; c++) v[c].push(LAB[i * 3 + c]); } return v.map(a => a.sort((p, q) => p - q)[a.length >> 1]); };
  for (const m of mats) { if (!m.poly) continue; const pm = plan.materials.find(q => q.name === m.name);
    if (pm.samples) { m.pal = pm.samples.map(sampleAt); continue; }
    const own = [], inside = []; for (let i = 0; i < P; i++) if (m.sd[i] > 0) { inside.push(i); if (m.sd[i] >= 5 && cover[i] === 1) own.push(i); }
    m.pal = palette(own.length > 200 ? own : inside, 5, 3 + mats.indexOf(m)); }
  const restPx = []; for (let i = 0; i < P; i++) if (far[i]) restPx.push(i);
  for (const m of mats) if (m.rest) m.pal = palette(restPx, 7, 99);
  for (let i = 0; i < P; i++) { let best = 1e9, bk = -1;
    for (let k = 0; k < mats.length; k++) { const m = mats[k]; let c;
      if (m.rest) c = (m.pal.length ? dEmin(i, m.pal) : 20) + BETA * .5;
      else { const sd = m.sd[i]; if (sd <= -m.band) continue; c = dEmin(i, m.pal) + BETA * (1 - Math.min(1, (sd + m.band) / (2 * m.band))); }
      if (c < best) { best = c; bk = k; } }
    mat[i] = bk; }
  for (const m of mats) { delete m.sd; delete m.mk; }
} else {
  const sub = []; for (let i = 0; i < P; i += 11) sub.push(i);
  const f = new Float32Array(sub.length * 3); sub.forEach((i, j) => { f[j * 3] = LAB[i * 3] * .5; f[j * 3 + 1] = LAB[i * 3 + 1]; f[j * 3 + 2] = LAB[i * 3 + 2]; });
  const km = kmeans(f, 3, null, KM, 7);
  for (let i = 0; i < P; i++) { let b = 0, bd = 1e9; for (let c = 0; c < km.C.length; c++) { const q = km.C[c], d = (LAB[i * 3] * .5 - q[0]) ** 2 + (LAB[i * 3 + 1] - q[1]) ** 2 + (LAB[i * 3 + 2] - q[2]) ** 2; if (d < bd) { bd = d; b = c; } } mat[i] = b; }
  for (let c = 0; c < km.C.length; c++) mats.push({ name: 'm' + c, auto: true });
}
// clean the selection: majority filter, then hand stray islands to their surroundings
for (let pass = 0; pass < 2; pass++) { const nx = Int16Array.from(mat), cnt = new Int32Array(mats.length);
  for (let y = 2; y < N - 2; y++) for (let x = 2; x < N - 2; x++) { const i = y * N + x; cnt.fill(0); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) cnt[mat[i + dy * N + dx]]++; let b = mat[i], bc = cnt[b]; for (let c = 0; c < mats.length; c++) if (cnt[c] > bc) { bc = cnt[c]; b = c; } nx[i] = b; }
  mat.set(nx); }
{ const cc = components(() => true, (a, b) => mat[a] === mat[b]), lb = new Int32Array(P); let any = 0; for (let i = 0; i < P; i++) { if (cc.size[cc.id[i]] < (lasso.length ? 140 : 400)) { lb[i] = -1; any++; } else lb[i] = mat[i]; } if (any) { spread(lb); for (let i = 0; i < P; i++) mat[i] = lb[i]; } }
for (const m of mats) { m.n = 0; m.cx = 0; m.cy = 0; m.border = 0; }
for (let i = 0; i < P; i++) { const m = mats[mat[i]], x = i % N, y = (i / N) | 0; m.n++; m.cx += x; m.cy += y; if (x === 0 || y === 0 || x === N - 1 || y === N - 1) m.border++; }
for (const m of mats) if (m.n) { m.cx /= m.n; m.cy /= m.n; }
// paint order: the plan's order (the rest last); without a plan subject-first (near the centre), most border last
const order = mats.map((m, k) => k).filter(k => mats[k].n > 0).sort((a, b) => {
  const A = mats[a], B = mats[b]; if (!A.auto) return (A.rest ? 1 : 0) - (B.rest ? 1 : 0) || a - b;
  const sc = m => Math.hypot(m.cx - N / 2, m.cy - N / 2) / N + m.border / (4 * N) * 3; return sc(A) - sc(B); });
log(`materials: ${order.map(k => `${mats[k].name} ${(mats[k].n / P * 100).toFixed(1)} %`).join(' · ')}`);

// contours: where two materials meet and the picture has no drawn line (black hair against the sky, a jaw against a
// scarf), a painter still draws the outline. They are inked like the rest and take the darker side's colour in the trace.
{ const nearLine = distTo(i => M[i]), B = new Uint8Array(P);
  for (let y = 3; y < N - 3; y++) for (let x = 3; x < N - 3; x++) { const i = y * N + x; if (mat[i] !== mat[i + 1] || mat[i] !== mat[i + N]) B[i] = 1; }
  for (let i = 0; i < P; i++) if (B[i]) { if (!B[i + 1] && !B[i - 1] && !B[i + N] && !B[i - N] && !B[i + N + 1] && !B[i - N - 1] && !B[i + N - 1] && !B[i - N + 1]) B[i] = 0; }
  // an outline is kept whole unless a drawn line already runs along most of it (then the line is the outline)
  const cont = joinChains(trace(thin(B)), 14, .6).filter(l => { if (l.length < 20) return false; let on = 0; for (const p of l) if (nearLine[p[2]] <= 4) on++; return on < l.length * .8; }).map(l => {
    const n = l.length, xs = sm(l.map(p => p[0] + .5), true, 12), ys = sm(l.map(p => p[1] + .5), true, 12), pts = xs.map((x, i) => [x, ys[i]]), idx = dp(pts, .5, true);
    // the darker side, sampled a few pixels off the boundary on both sides
    let r = 0, g = 0, b = 0, c = 0; for (let k = 2; k < n - 2; k += 3) { const [x, y] = l[k], dx = l[k + 2][0] - l[k - 2][0], dy = l[k + 2][1] - l[k - 2][1], L = Math.hypot(dx, dy) || 1; let best = null, bl = 9;
      for (const sg of [4, -4]) { const xx = Math.round(x - dy / L * sg), yy = Math.round(y + dx / L * sg); if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const j = yy * N + xx, ll = .2126 * Us[0][j] + .7152 * Us[1][j] + .0722 * Us[2][j]; if (ll < bl) { bl = ll; best = j; } }
      if (best !== null) { r += Us[0][best]; g += Us[1][best]; b += Us[2][best]; c++; } }
    c = c || 1; const col = [r / c * .9, g / c * .9, b / c * .9];   // after the trace an outline all but melts into its darker side
    return { p: idx.map(i => pts[i]), w: idx.map(() => 2.3), len: n, wm: 2.3, dark: .12, col, contour: true };
  }).sort((a, b) => b.len - a.len).slice(0, +opt('contours', 200));
  for (let k = cont.length - 1; k >= 0; k--) if (extent(cont[k].p) < 12) cont.splice(k, 1);   // a tiny closed loop smooths to a point
  strokes.push(...cont); log(`contours: ${cont.length} outline strokes where materials meet without a drawn line`); }

// ───────── 3. tones: the few colours each material is shaded with ─────────
const Ut = U.map(c => gauss(c, 1.6)), tone = new Int16Array(P).fill(-1), S = [new Float32Array(P), new Float32Array(P), new Float32Array(P)];
for (const k of order) {
  const m = mats[k], px = []; for (let i = 0; i < P; i++) if (mat[i] === k) px.push(i);
  const step = Math.max(1, Math.floor(px.length / 30000)), sub = []; for (let j = 0; j < px.length; j += step) sub.push(px[j]);
  const f = new Float32Array(sub.length * 3); sub.forEach((i, j) => { const l = lab(Ut[0][i], Ut[1][i], Ut[2][i]); f[j * 3] = l[0]; f[j * 3 + 1] = l[1]; f[j * 3 + 2] = l[2]; });
  // as few tones as describe it: stop adding when the mean error is small or the gain is
  let res = null, kMax = m.tones || (m.n > P * .12 ? 6 : 5);
  for (let kt = 1; kt <= kMax; kt++) {
    const r = kmeans(f, 3, null, Math.min(kt, sub.length), 11 + kt); let e = 0; for (let j = 0; j < sub.length; j++) { const c = r.C[r.asg[j]]; e += Math.hypot(f[j * 3] - c[0], f[j * 3 + 1] - c[1], f[j * 3 + 2] - c[2]); } e /= sub.length;
    res = r; res.e = e; if (!m.tones && e < 4.2) break;
  }
  const C = res.C, asg = new Int16Array(px.length);
  px.forEach((i, j) => { const l = lab(Ut[0][i], Ut[1][i], Ut[2][i]); let b = 0, bd = Infinity; for (let c = 0; c < C.length; c++) { const d = (l[0] - C[c][0]) ** 2 + (l[1] - C[c][1]) ** 2 + (l[2] - C[c][2]) ** 2; if (d < bd) { bd = d; b = c; } } asg[j] = b; });
  const cnt = new Float64Array(C.length), col = C.map(() => [0, 0, 0]);
  px.forEach((i, j) => { const c = asg[j]; cnt[c]++; col[c][0] += U[0][i]; col[c][1] += U[1][i]; col[c][2] += U[2][i]; });
  col.forEach((c, j) => { if (cnt[j]) { c[0] /= cnt[j]; c[1] /= cnt[j]; c[2] /= cnt[j]; } });
  // the base is the flat: the plan's colour if given (nearest tone), else the tone that covers most
  let base = 0; if (m.base) { const b = unhex(m.base); let bd = Infinity; col.forEach((c, j) => { const d = Math.hypot(c[0] - b[0], c[1] - b[1], c[2] - b[2]); if (cnt[j] && d < bd) { bd = d; base = j; } }); } else for (let j = 1; j < C.length; j++) if (cnt[j] > cnt[base]) base = j;
  m.baseCol = col[base]; m.toneCols = col; m.baseTone = base; m.toneCnt = cnt;
  px.forEach((i, j) => { tone[i] = asg[j]; });
}
// smooth the tone shapes (a painter's shapes are not speckle): majority filter inside the material, then drop specks
for (let pass = 0; pass < 2; pass++) {
  const nx = Int16Array.from(tone), cnt = new Int32Array(8);
  for (let y = 2; y < N - 2; y++) for (let x = 2; x < N - 2; x++) { const i = y * N + x, k = mat[i]; cnt.fill(0); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const j = i + dy * N + dx; if (mat[j] === k) cnt[tone[j]]++; } let b = tone[i], bc = cnt[b]; for (let c = 0; c < 8; c++) if (cnt[c] > bc) { bc = cnt[c]; b = c; } nx[i] = b; }
  tone.set(nx);
}
{ const cc = components(() => true, (a, b) => mat[a] === mat[b] && tone[a] === tone[b]);
  const fix = new Int32Array(P).fill(-1); let any = 0; for (let i = 0; i < P; i++) if (cc.size[cc.id[i]] < 60 && tone[i] !== mats[mat[i]].baseTone) { fix[i] = 1; any++; }
  if (any) { const lab2 = new Int32Array(P); for (let i = 0; i < P; i++) lab2[i] = fix[i] === 1 ? -1 : mat[i] * 16 + tone[i]; spread(lab2); for (let i = 0; i < P; i++) if (fix[i] === 1) tone[i] = (lab2[i] >> 4) === mat[i] ? lab2[i] & 15 : mats[mat[i]].baseTone; } }

// outlines of a mask as closed loops running along pixel edges (holes included), smoothed and simplified
function loops(inMask) {
  const V = N + 1, out = new Uint8Array(V * V), DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];   // bit d = an edge leaves this vertex in direction d
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!inMask(y * N + x)) continue;
    if (y === 0 || !inMask((y - 1) * N + x)) out[y * V + x + 1] |= 4;          // top side, going left
    if (x === N - 1 || !inMask(y * N + x + 1)) out[(y + 1) * V + x + 1] |= 8;  // right side, going up
    if (y === N - 1 || !inMask((y + 1) * N + x)) out[(y + 1) * V + x] |= 1;    // bottom side, going right
    if (x === 0 || !inMask(y * N + x - 1)) out[y * V + x] |= 2;                // left side, going down
  }
  const res = [];
  for (let v0 = 0; v0 < V * V; v0++) while (out[v0]) {
    let d = out[v0] & 1 ? 0 : out[v0] & 2 ? 1 : out[v0] & 4 ? 2 : 3, v = v0; const pts = [];
    do { out[v] &= ~(1 << d); pts.push([v % V, (v / V) | 0]); v += DX[d] + DY[d] * V;
      const pref = [(d + 3) % 4, d, (d + 1) % 4]; let nd = -1; for (const q of pref) if (out[v] & (1 << q)) { nd = q; break; } if (nd < 0) break; d = nd; } while (v !== v0 || (out[v0] & (1 << d)));
    if (pts.length < 8) continue;
    let A = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; A += p[0] * q[1] - q[0] * p[1]; } if (Math.abs(A) / 2 < 12) continue;
    // smooth the pixel stairs (closed moving average), then simplify each half
    const n = pts.length, sx = new Float32Array(n), sy = new Float32Array(n);
    for (let i = 0; i < n; i++) { let ax = 0, ay = 0; for (let k = -3; k <= 3; k++) { const p = pts[(i + k + n) % n], w = 4 - Math.abs(k); ax += p[0] * w; ay += p[1] * w; } sx[i] = ax / 16; sy[i] = ay / 16; }
    const sp = Array.from({ length: n }, (_, i) => [sx[i], sy[i]]); let far = 0, fd = -1; for (let i = 0; i < n; i++) { const dd = (sp[i][0] - sp[0][0]) ** 2 + (sp[i][1] - sp[0][1]) ** 2; if (dd > fd) { fd = dd; far = i; } }
    const a = dp(sp.slice(0, far + 1), .6), b = dp(sp.slice(far).concat([sp[0]]), .6), loop = a.concat(b.slice(1, -1));
    if (loop.length >= 3) res.push({ p: loop.flat().map(r1), area: A / 2 });
  }
  return res;
}
const materials = [], Uw = U.map(c => gauss(c, 3));
for (const k of order) {
  const m = mats[k], bb = [N, N, 0, 0]; for (let i = 0; i < P; i++) if (mat[i] === k) { const x = i % N, y = (i / N) | 0; if (x < bb[0]) bb[0] = x; if (y < bb[1]) bb[1] = y; if (x > bb[2]) bb[2] = x; if (y > bb[3]) bb[3] = y; }
  const L = loops(i => mat[i] === k), Lb = lum3(m.baseCol), tones = [];
  m.toneCols.forEach((c, j) => { if (j === m.baseTone || !m.toneCnt[j]) return; let n = 0; for (let i = 0; i < P; i++) if (mat[i] === k && tone[i] === j) n++; if (n < 40) return;
    // hard or soft brush? how wide the picture's own transition is along each shape's edge (colour step ÷ gradient).
    // One tone can hold both: a crisp cast shadow and a soft blush of the same colour. They are split by shape.
    const cc = components(i => mat[i] === k && tone[i] === j), ws = cc.size.map(() => []);
    for (let y = 5; y < N - 5; y += 2) for (let x = 5; x < N - 5; x += 2) { const i = y * N + x; if (cc.id[i] < 0) continue;
      for (const q of [i + 1, i - 1, i + N, i - N]) { if (mat[q] !== k || tone[q] === j) continue; const c2 = m.toneCols[tone[q]]; const d = Math.hypot(c[0] - c2[0], c[1] - c2[1], c[2] - c2[2]); if (d < .02) continue;
        let gm = 0; for (let ch = 0; ch < 3; ch++) { const gx = (Uw[ch][i + 4] - Uw[ch][i - 4]) / 8, gy = (Uw[ch][i + 4 * N] - Uw[ch][i - 4 * N]) / 8; gm += gx * gx + gy * gy; } ws[cc.id[i]].push(d / Math.max(1e-4, Math.sqrt(gm))); } }
    const soft = ws.map(a => { if (a.length < 6) return 0; a.sort((p, q) => p - q); const w = a[a.length >> 1]; return w >= 13 ? w : 0; });
    for (const cls of [0, 1]) { const inC = i => cc.id[i] >= 0 && (soft[cc.id[i]] > 0) === !!cls; let nn = 0, wsum = 0; for (let i = 0; i < P; i++) if (inC(i)) { nn++; wsum += soft[cc.id[i]]; } if (nn < 40) continue;
      const tl = loops(inC); if (!tl.length) continue; const blur = cls ? Math.round(Math.min(12, Math.max(1.5, (wsum / nn - 9) * .6)) * 2) / 2 : 0;
      const mk = new Uint8Array(P); for (let i = 0; i < P; i++) if (inC(i)) mk[i] = 1;
      tones.push({ j, mk, c: hex(...c), rgb: c, st: lum3(c) < Lb - .012 ? 's' : 'h', l: lum3(c), n: nn, blur, loops: tl.map(q => q.p) }); } });
  tones.sort((a, b) => (a.st === b.st ? (a.st === 's' ? b.l - a.l : a.l - b.l) || a.blur - b.blur : a.st === 's' ? -1 : 1));
  materials.push({ k, name: m.name, base: hex(...m.baseCol), n: m.n, box: bb, loops: L.map(q => q.p), tones, outer: L.filter(q => Math.abs(q.area) > P * .04).sort((a, b) => Math.abs(b.area) - Math.abs(a.area)).map(q => q.p) });
  // the canvas as it will stand after the tone stages: base, then each tone in paint order (soft ones with a soft edge)
  for (let i = 0; i < P; i++) if (mat[i] === k) { S[0][i] = m.baseCol[0]; S[1][i] = m.baseCol[1]; S[2][i] = m.baseCol[2]; }
  for (const t of tones) { let al = Float32Array.from(t.mk); if (t.blur) al = gauss(al, t.blur); delete t.mk;
    for (let i = 0; i < P; i++) if (mat[i] === k && al[i] > .003) { S[0][i] += (t.rgb[0] - S[0][i]) * al[i]; S[1][i] += (t.rgb[1] - S[1][i]) * al[i]; S[2][i] += (t.rgb[2] - S[2][i]) * al[i]; } }
}
log(`tones: ${materials.map(m => `${m.name} ${1 + m.tones.length}${m.tones.some(t => t.blur) ? ' (soft ' + m.tones.filter(t => t.blur).map(t => t.blur).join(',') + ')' : ''}`).join(' · ')}`);
if (dbg) { const A = [new Float32Array(P), new Float32Array(P), new Float32Array(P)]; for (let i = 0; i < P; i++) { const c = mats[mat[i]].baseCol; A[0][i] = c[0]; A[1][i] = c[1]; A[2][i] = c[2]; if (M[i]) { A[0][i] *= .4; A[1][i] *= .4; A[2][i] *= .4; } }
  savePng('materials.png', toBuf(A), order.map(k => label(mats[k].name, mats[k].cx - 20, mats[k].cy - 10, 22)).join(',')); savePng('tones.png', toBuf(S)); }

// ───────── 4. airbrush: soft gradients the tones cannot say ─────────
const dabInto = (x, y, r, c, a, k) => { const R = Math.ceil(r), x0 = Math.max(0, Math.floor(x - R)), x1 = Math.min(N - 1, Math.ceil(x + R)), y0 = Math.max(0, Math.floor(y - R)), y1 = Math.min(N - 1, Math.ceil(y + R));
  for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) { const i = yy * N + xx; if (mat[i] !== k) continue; const d = Math.hypot(xx + .5 - x, yy + .5 - y) / r; if (d >= 1) continue; const al = a * (1 - d); S[0][i] += (c[0] - S[0][i]) * al; S[1][i] += (c[1] - S[1][i]) * al; S[2][i] += (c[2] - S[2][i]) * al; } };
for (const m of materials) {
  const k = m.k, mk = new Float32Array(P); for (let i = 0; i < P; i++) mk[i] = mat[i] === k ? 1 : 0;
  m.air = []; const w = m.box[2] - m.box[0] + 1, h = m.box[3] - m.box[1] + 1;
  for (const [pass, R] of [[0, Math.min(64, Math.max(20, Math.sqrt(m.n) / 5))], [1, Math.min(26, Math.max(9, Math.sqrt(m.n) / 12))]]) {
    const sig = R / 2.4, bm = gauss(mk, sig), tb = [0, 1, 2].map(c => { const a = new Float32Array(P); for (let i = 0; i < P; i++) a[i] = U[c][i] * mk[i]; return gauss(a, sig); });
    const sp = R * .72; let row = 0;
    for (let y = m.box[1] + sp * .3; y <= m.box[3]; y += sp, row++) {
      const xs = []; for (let x = m.box[0] + sp * (row % 2 ? .65 : .15); x <= m.box[2]; x += sp) xs.push(x); if (row % 2) xs.reverse();
      for (const x of xs) { const i = Math.round(y) * N + Math.round(x); if (i < 0 || i >= P || bm[i] < .35) continue;
        const c = [tb[0][i] / bm[i], tb[1][i] / bm[i], tb[2][i] / bm[i]], err = (Math.abs(c[0] - S[0][i]) + Math.abs(c[1] - S[1][i]) + Math.abs(c[2] - S[2][i])) / 3;
        if (err < (pass ? .03 : .02)) continue;
        const a = pass ? .6 : .45; m.air.push(r1(x), r1(y), r1(R), hex(...c), a); dabInto(x, y, R, c, a, k); }
    }
  }
}
log(`airbrush: ${materials.reduce((a, m) => a + m.air.length / 5, 0)} soft dabs`);

// ───────── 5. details: strokes drawn where the picture still differs ─────────
// The target is now the picture itself (lines and all), wherever the ink strokes will not cover it: detail strokes
// thicken a lash the pen left thin, draw the fine hairs that were too faint to ink, sharpen an iris.
const INK = new Uint8Array(P);
for (const s of strokes) for (let k = 0; k + 1 < s.p.length; k++) { const [x1, y1] = s.p[k], [x2, y2] = s.p[k + 1], L = Math.ceil(Math.hypot(x2 - x1, y2 - y1)) || 1;
  for (let j = 0; j <= L; j++) { const u = j / L, x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u, r = (s.w[k] + (s.w[k + 1] - s.w[k]) * u) / 2, R = Math.ceil(r); for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { if (dx * dx + dy * dy > r * r + .3) continue; const xx = Math.round(x + dx - .5), yy = Math.round(y + dy - .5); if (xx >= 0 && yy >= 0 && xx < N && yy < N) INK[yy * N + xx] = 1; } } }
const Yu = gauss(lum(T), 1.2), E = new Float32Array(P), errAt = i => INK[i] ? 0 : Math.max(Math.abs(T[0][i] - S[0][i]), Math.abs(T[1][i] - S[1][i]), Math.abs(T[2][i] - S[2][i]));
for (let i = 0; i < P; i++) E[i] = errAt(i);
const tang = i => { const x = i % N, y = (i / N) | 0; if (x < 2 || y < 2 || x > N - 3 || y > N - 3) return [1, 0]; const gx = Yu[i + 2] - Yu[i - 2], gy = Yu[i + 2 * N] - Yu[i - 2 * N], L = Math.hypot(gx, gy); return L < 1e-4 ? [1, 0] : [-gy / L, gx / L]; };
const details = [], THR = +opt('detail-thr', .075), buckets = Array.from({ length: 40 }, () => []);
for (let i = 0; i < P; i++) if (E[i] > THR) buckets[Math.min(39, Math.floor(E[i] * 40))].push(i);
outer: for (let b = 39; b >= 0; b--) for (const i0 of buckets[b]) {
  if (E[i0] <= THR) continue; if (details.length >= MAXD) break outer;
  const c0 = [T[0][i0], T[1][i0], T[2][i0]], k0 = mat[i0], path = [[i0 % N + .5, ((i0 / N) | 0) + .5]];
  for (const dirSign of [1, -1]) { let x = i0 % N + .5, y = ((i0 / N) | 0) + .5, pd = null;
    for (let s = 0; s < 45; s++) { const i = Math.floor(y) * N + Math.floor(x); let [tx, ty] = tang(i); if (pd ? tx * pd[0] + ty * pd[1] < 0 : dirSign < 0) { tx = -tx; ty = -ty; } pd = [tx, ty]; x += tx; y += ty;
      if (x < 1 || y < 1 || x > N - 1 || y > N - 1) break; const j = Math.floor(y) * N + Math.floor(x);
      if (E[j] < THR * .55 || Math.abs(T[0][j] - c0[0]) + Math.abs(T[1][j] - c0[1]) + Math.abs(T[2][j] - c0[2]) > .22) break;
      dirSign > 0 ? path.push([x, y]) : path.unshift([x, y]); } }
  if (path.length < 6) { E[i0] = 0; continue; }
  // width: how far across the stroke the same colour is still missing
  const mid = path[path.length >> 1], mi = Math.floor(mid[1]) * N + Math.floor(mid[0]), [tx, ty] = tang(mi); let wd = 1;
  for (const sg of [1, -1]) for (let s = 1; s <= 4; s++) { const xx = Math.floor(mid[0] - ty * s * sg), yy = Math.floor(mid[1] + tx * s * sg); if (xx < 0 || yy < 0 || xx >= N || yy >= N) break; const j = yy * N + xx; if (E[j] < THR * .55 || Math.abs(T[0][j] - c0[0]) + Math.abs(T[1][j] - c0[1]) + Math.abs(T[2][j] - c0[2]) > .22) break; wd++; }
  let r = 0, g = 0, bb = 0; for (const [x, y] of path) { const j = Math.floor(y) * N + Math.floor(x); r += T[0][j]; g += T[1][j]; bb += T[2][j]; } const col = [r / path.length, g / path.length, bb / path.length];
  const wv = Math.min(8, Math.max(1.6, wd * .95)), R = Math.ceil(wv / 2 + .5);
  for (const [x, y] of path) for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { if (dx * dx + dy * dy > (wv / 2 + .5) ** 2) continue; const xx = Math.floor(x + dx), yy = Math.floor(y + dy); if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const j = yy * N + xx; S[0][j] += (col[0] - S[0][j]) * .9; S[1][j] += (col[1] - S[1][j]) * .9; S[2][j] += (col[2] - S[2][j]) * .9; E[j] = errAt(j); }
  const pp = dp(path, .5); details.push({ p: pp.flat().map(r1), w: r1(wv), c: hex(...col), x: mid[0], y: mid[1], len: path.length });
}
log(`details: ${details.length} strokes`);
if (dbg) { const A = S.map(c => Float32Array.from(c)); for (const s of strokes) for (let k = 0; k + 1 < s.p.length; k++) { const [x1, y1] = s.p[k], [x2, y2] = s.p[k + 1], L = Math.ceil(Math.hypot(x2 - x1, y2 - y1)) || 1; for (let j = 0; j <= L; j++) { const u = j / L, x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u, r = (s.w[k] + (s.w[k + 1] - s.w[k]) * u) / 2, R = Math.ceil(r); for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { if (dx * dx + dy * dy > r * r) continue; const xx = Math.round(x + dx), yy = Math.round(y + dy); if (xx >= 0 && yy >= 0 && xx < N && yy < N) { const i = yy * N + xx; A[0][i] = s.col[0]; A[1][i] = s.col[1]; A[2][i] = s.col[2]; } } } }
  savePng('sim.png', toBuf(A)); let e = 0; for (let i = 0; i < P; i++) e += Math.abs(A[0][i] - T[0][i]) + Math.abs(A[1][i] - T[1][i]) + Math.abs(A[2][i] - T[2][i]); console.log(`     predicted finish vs picture: mean abs error ${(e / P / 3 * 100).toFixed(2)} %`); }

// ───────── 6. order of work: what a painter draws first ─────────
function walkOrder(items, ends) {   // nearest-next inside each focus group, each stroke entered from its nearer end
  const groups = new Map(); for (const it of items) { const g = it.g; (groups.get(g) || groups.set(g, []).get(g)).push(it); }
  const res = []; let at = [N / 2, 0];
  for (const g of [...groups.keys()].sort((a, b) => a - b)) { const list = groups.get(g), used = new Uint8Array(list.length); if (focus[g]) at = [focus[g].x, focus[g].y];
    for (let n = 0; n < list.length; n++) { let bi = -1, bd = Infinity, rev = false; for (let i = 0; i < list.length; i++) { if (used[i]) continue; const [a, z] = ends(list[i]), da = (a[0] - at[0]) ** 2 + (a[1] - at[1]) ** 2, dz = (z[0] - at[0]) ** 2 + (z[1] - at[1]) ** 2; if (da < bd) { bd = da; bi = i; rev = false; } if (dz < bd) { bd = dz; bi = i; rev = true; } }
      used[bi] = 1; const it = list[bi]; if (rev) it.rev = true; res.push(it); const [a, z] = ends(it); at = rev ? a : z; } }
  return res;
}
for (const s of strokes) { const m = s.p[s.p.length >> 1]; s.g = groupOf(m[0], m[1]); }
const lineOut = walkOrder(strokes, s => [s.p[0], s.p[s.p.length - 1]]).map(s => { const p = s.rev ? s.p.slice().reverse() : s.p, w = s.rev ? s.w.slice().reverse() : s.w; return { p: p.flat().map(r1), w: w.map(r1), c: hex(...s.col), g: s.g }; });
for (const d of details) d.g = groupOf(d.x, d.y);
const detOut = walkOrder(details, d => [[d.p[0], d.p[1]], [d.p[d.p.length - 2], d.p[d.p.length - 1]]]).map(d => { let p = d.p; if (d.rev) { const q = []; for (let i = p.length - 2; i >= 0; i -= 2) q.push(p[i], p[i + 1]); p = q; } return { p, w: d.w, c: d.c }; });
// the rough: the plan's construction, then the big silhouettes blocked in loosely
const sil = []; for (const m of materials) for (const lp of m.outer.slice(0, 2)) { const pts = []; for (let i = 0; i < lp.length; i += 2) pts.push([lp[i], lp[i + 1]]); if (m.n > P * .5 && m === materials[materials.length - 1]) continue; let far = 0, fd = -1; pts.forEach((p, i) => { const d = (p[0] - pts[0][0]) ** 2 + (p[1] - pts[0][1]) ** 2; if (d > fd) { fd = d; far = i; } });   // a closed loop: simplify each half
  const q = dp(pts.slice(0, far + 1), 24).concat(dp(pts.slice(far).concat([pts[0]]), 24).slice(1)); if (q.length >= 5) sil.push({ p: q.flat().map(Math.round), a: m.n }); }
sil.sort((a, b) => b.a - a.a);
const nSil = plan.silhouettes ?? (plan.construct ? 0 : 6);   // with a construction the rough is the construction

const ref = { v: 2, source: basename(img), ink: plan.ink || hex(...inkDark.map(v => v * .8)), focus: focus.map(f => f.name),
  rough: { construct: plan.construct || [], sil: sil.slice(0, nSil).map(s => s.p) }, lines: lineOut,
  materials: materials.map(m => ({ name: m.name, base: m.base, area: +(m.n / P).toFixed(4), box: m.box, loops: m.loops, tones: m.tones.map(t => ({ c: t.c, st: t.st, blur: t.blur, area: +(t.n / P).toFixed(4), loops: t.loops })), air: m.air })),
  details: detOut };
writeFileSync(out, `// made by speedpaint-replay/scripts/from-image.mjs from ${basename(img)} — reference mode (v2). Load with lib/reference.js → addReference(s, REF).\nexport const REF = ${JSON.stringify(ref)};\n`);
log(`wrote ${out} (${(JSON.stringify(ref).length / 1024).toFixed(0)} KB): ${ref.rough.construct.length} construction + ${ref.rough.sil.length} silhouette lines · ${lineOut.length} ink strokes · ${materials.length} flats · ${materials.reduce((a, m) => a + m.tones.filter(t => t.st === 's').length, 0)} shadow + ${materials.reduce((a, m) => a + m.tones.filter(t => t.st === 'h').length, 0)} light shapes · ${detOut.length} detail strokes`);
