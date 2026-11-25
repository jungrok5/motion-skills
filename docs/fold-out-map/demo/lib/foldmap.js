// fold-out-map · foldmap.js — the engine: a folded paper travel map on a desk that unfolds, a red route that draws itself
// from stop to stop while a low camera follows it, pop-up landmark standees that rise as the route reaches them, tent
// label cards that tilt up to be read, and a light cycle (day → golden hour → night with lit windows and light pools).
// Every frame is a pure function of t: seek(t) folds the sheet, poses the pop-ups, draws the route to its length, lights
// the room, places the camera and renders (tilt-shift depth of field from the paper plane, vignette, grain).
//
//   const F = await Film.create({ duration: 40, W: 1080, H: 1920 });
//   const S = F.sheet({ cols: 4, panel: [1, 1.7] });  S.front(m => …map…);  S.backs((p, c, r) => …cover, guide…);
//   F.desk({ wood: '#6b3f26', props: ['pencil', 'cup'] });
//   F.unfold({ at: 1.6 });                                  // half fold opens, then the accordion fans out
//   F.trip({ stops, start: 8, hold: 2.6, travel: 1.9 });    // route + pop-ups + labels + the touring camera keys
//   F.light([[0, 'day'], [26, 'day'], [29, 'golden'], [33, 'night']]);
//   F.track([{ t: 0, at: […], dist: 3, yaw: 0, elev: 62 }, …]);   // your own keys around the tour's
//   F.start();
//
// Contract (set by start()): window.seek(t), DURATION, FPS, SIZE, runChecks(t), FILM, __ready.
// Query: ?render=1 fixed W×H canvas, no live loop · ?scale=.5 · ?t=12 frozen frame · ?msaa=0 · ?tex=.5 texture size ·
//        ?off=dof,shadow,grain,hud,route,pop (switch a part off; pop = standees always up)
import * as THREE from 'three';
export { THREE };

// ---------------------------------------------------------------- determinism helpers
export function rng(seed = 1) {
  let a = seed >>> 0 || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function hash(x, z = 0, s = 0) {
  let h = Math.imul((Math.floor(x) | 0) ^ 0x27d4eb2d, 0x165667b1) ^ Math.imul((Math.floor(z) | 0) + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s | 0, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
const fade5 = t => t * t * (3 - 2 * t);
export function noise(x, z, s = 0) {
  const xi = Math.floor(x), zi = Math.floor(z), u = fade5(x - xi), v = fade5(z - zi);
  const a = hash(xi, zi, s), b = hash(xi + 1, zi, s), c = hash(xi, zi + 1, s), d = hash(xi + 1, zi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, z, oct = 4, s = 0) {
  let f = 0, amp = .5, n = 0;
  for (let i = 0; i < oct; i++) { f += amp * noise(x, z, s + i * 17); n += amp; x = x * 2.03 + 3.1; z = z * 2.03 - 1.7; amp *= .5; }
  return f / n;
}
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ramp = (a, b, down = false) => t => down ? 1 - smooth(a, b, t) : smooth(a, b, t);
export const ease = {
  inOut: t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2,
  out: t => 1 - (1 - t) ** 3, in: t => t * t * t,
  // in-out with a small overshoot past 1 near the end that settles back (paper flopping open): 0 → 1
  settle: (t, o = .03) => t <= 0 ? 0 : t >= 1 ? 1 : (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2) + o * Math.sin(Math.PI * clamp((t - .7) / .3)),
};
// s = seconds since the pop; 0 → 1 with one soft overshoot (a cardstock pop-up springing upright)
export function spring(s, k = 1) { if (s <= 0) return 0; const x = s * k; return 1 - Math.exp(-6.5 * x) * Math.cos(10 * x); }
export const wrap = (a) => ((a + 180) % 360 + 360) % 360 - 180;

// ---------------------------------------------------------------- geography
// projector({ center: [lon, lat], km: 7 }) → (lon, lat) => [x, z]: equirectangular around the centre, 1 map unit = `km`
// kilometres, x east, z south. The map's centre lands on `at` (default [0, 0], the sheet's centre).
export function projector({ center, km = 1, at = [0, 0] }) {
  const [lon0, lat0] = center, kx = 111.32 * Math.cos(lat0 * Math.PI / 180) / km, kz = 110.57 / km;
  const p = (lon, lat) => Array.isArray(lon) ? p(lon[0], lon[1]) : [at[0] + (lon - lon0) * kx, at[1] - (lat - lat0) * kz];
  p.all = pts => pts.map(q => p(q[0], q[1]));
  p.inv = ([x, z]) => [lon0 + (x - at[0]) / kx, lat0 - (z - at[1]) / kz]; p.km = km;
  return p;
}
// Catmull-Rom through the points (open or closed), resampled evenly by arc length every `step` units
export function spline(pts, step = .01, closed = false) {
  const P = pts.length; if (P < 2) return pts.slice();
  const at = i => closed ? pts[(i + P) % P] : pts[Math.max(0, Math.min(P - 1, i))];
  const dense = [], segs = closed ? P : P - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < 24; k++) {
      const t = k / 24, t2 = t * t, t3 = t2 * t;
      dense.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  dense.push(closed ? pts[0] : pts[P - 1]);
  return resample(dense, step);
}
export function resample(pts, step) {
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = L[L.length - 1], n = Math.max(2, Math.ceil(total / step)), out = []; let j = 0;
  for (let k = 0; k <= n; k++) {
    const s = total * k / n; while (j < L.length - 2 && L[j + 1] < s) j++;
    const f = (s - L[j]) / Math.max(1e-9, L[j + 1] - L[j]);
    out.push([lerp(pts[j][0], pts[j + 1][0], f), lerp(pts[j][1], pts[j + 1][1], f)]);
  }
  return out;
}
export function inside([x, z], poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
  }
  return c;
}
export function distToLine([x, z], pts, closed = false) {
  let d = Infinity; const n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % n], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / l2);
    d = Math.min(d, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return d;
}

// ---------------------------------------------------------------- camera keys (monotone cubic per channel)
function monotone(xs, ys) {
  const n = xs.length; if (n === 1) return () => ys[0];
  const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return x => {
    if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
const KEY0 = { at: [0, 0, 0], dist: 6, yaw: 0, elev: 60, fov: 34, roll: 0 };
export function cameraPath(keys) {
  const full = []; let prev = KEY0;
  for (const k of [...keys].sort((a, b) => a.t - b.t)) {
    const y = k.yaw === undefined ? prev.yaw : prev.yaw + wrap(k.yaw - prev.yaw);   // the short way round
    prev = { ...prev, ...k, yaw: y }; full.push(prev);
  }
  const ts = full.map(k => k.t), ch = f => monotone(ts, full.map(f));
  const ax = ch(k => k.at[0]), ay = ch(k => k.at[1]), az = ch(k => k.at[2]), ld = ch(k => Math.log(k.dist));
  const yaw = ch(k => k.yaw), elev = ch(k => k.elev), fov = ch(k => k.fov), roll = ch(k => k.roll);
  const f = t => ({ at: [ax(t), ay(t), az(t)], dist: Math.exp(ld(t)), yaw: yaw(t), elev: elev(t), fov: fov(t), roll: roll(t) });
  f.keys = full; return f;
}
export function placeCamera(cam, c) {
  const y = c.yaw * Math.PI / 180, e = c.elev * Math.PI / 180;
  cam.position.set(c.at[0] + c.dist * Math.sin(y) * Math.cos(e), c.at[1] + c.dist * Math.sin(e), c.at[2] + c.dist * Math.cos(y) * Math.cos(e));
  const r = (c.roll || 0) * Math.PI / 180;
  cam.up.set(Math.sin(r) * Math.cos(y), Math.cos(r), -Math.sin(r) * Math.sin(y));
  cam.lookAt(c.at[0], c.at[1], c.at[2]);
  cam.fov = c.fov; cam.near = Math.max(.01, c.dist * .05); cam.far = c.dist * 40 + 40; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
}

// ---------------------------------------------------------------- fonts and canvases
export const SERIF = '"Map Serif", "Noto Serif KR", "Noto Serif SC", "Noto Serif JP", "Noto Serif", Georgia, serif';
export const ITALIC = '"Map Italic", "Noto Serif", Georgia, serif';
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
export function tex(c, { mip = true } = {}) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (!mip) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
  return t;
}
export async function loadFonts() {
  for (let i = 0; i < 50 && ![...document.styleSheets].some(s => /fonts\.css/.test(s.href || '')) && document.querySelector('link[href*="fonts.css"]'); i++) await new Promise(r => setTimeout(r, 20));
  const faces = [...document.fonts].filter(f => /Map (Serif|Italic)/.test(f.family.replace(/["']/g, '')));
  await Promise.all(faces.map(f => f.load().catch(() => null)));
  try { await document.fonts.ready; } catch { }
}

// ---------------------------------------------------------------- light presets (what the room looks like)
// sun: the window light (direction, colour, strength) · hemi: sky/bounce fill · paper tint multiplies nothing; it is
// what the eye reads. Points: the warm lamps inside the pop-ups (× night). grade: post colour multiply.
export const LIGHTS = {
  day: { sun: 2.1, sunColor: '#fff3e2', sunDir: [-.55, 1, .42], hemi: .95, sky: '#fffaf0', ground: '#9b7a5c', points: 0, pools: 0, glow: 0, grade: '#ffffff', exposure: 1 },
  golden: { sun: 1.8, sunColor: '#ffc684', sunDir: [-.9, .68, .3], hemi: .88, sky: '#ffdcb4', ground: '#7a4f34', points: .15, pools: .1, glow: .12, grade: '#fff1df', exposure: .98 },
  dusk: { sun: .7, sunColor: '#e8a3a0', sunDir: [-1, .5, .2], hemi: .6, sky: '#9aa5d6', ground: '#4e3a3a', points: .55, pools: .5, glow: .55, grade: '#eceafa', exposure: .95 },
  night: { sun: .55, sunColor: '#8fa8e6', sunDir: [.45, 1, -.25], hemi: .48, sky: '#7d90cc', ground: '#2a1f18', points: 1, pools: 1, glow: 1, grade: '#dfe6ff', exposure: .92 },
};

// ---------------------------------------------------------------- the sheet: an accordion-folded map with one cross fold
// Units: 1 = one panel's width. The open sheet is cols × panel[0] wide and rows (2) × panel[1] tall, centred on the
// origin; map coordinates are x east, z south over that rectangle. Panel 0 of the bottom row lies on the desk and stays;
// the accordion folds every panel onto it (alternate directions), then the top row folds over onto the bottom row. The
// cover is the back of panel (0, top row); the guide you see when the cross fold opens is the back of the last panel.
const TAU_PAPER = .0035;      // paper thickness (box height)
const GAP = .0022;            // air between stacked layers
export class Sheet {
  constructor(film, { cols = 4, panel = [1, 1.7], color = '#f1e9d6', backColor, edge = '#e9e1cd', res = 1400, backRes = 620, coverRes = 1100, residual = 3, crossResidual = 1.6 } = {}) {
    this.film = film; this.cols = cols; this.rows = 2; this.pw = panel[0]; this.ph = panel[1];
    this.W = cols * this.pw; this.H = 2 * this.ph; this.color = color; this.backColor = backColor || color;
    this.res = res * film.texScale; this.backRes = backRes * film.texScale; this.coverRes = coverRes * film.texScale;
    this.residual = residual; this.crossResidual = crossResidual;
    this.group = new THREE.Group(); this.group.name = 'sheet'; film.scene.add(this.group);
    this.cells = [];
    const geo = new THREE.BoxGeometry(this.pw, TAU_PAPER, this.ph); geo.translate(this.pw / 2, -TAU_PAPER / 2, this.ph / 2);
    const edgeM = new THREE.MeshLambertMaterial({ color: edge });
    for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) {
      const front = new THREE.MeshLambertMaterial({ color: '#ffffff' }), back = new THREE.MeshLambertMaterial({ color: '#ffffff' });
      const g = new THREE.Group(); g.matrixAutoUpdate = false; this.group.add(g);
      const mesh = new THREE.Mesh(geo, [edgeM, edgeM, front, back, edgeM, edgeM]); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
      this.cells.push({ c, r, g, mesh, front, back, M: new THREE.Matrix4() });
    }
    // fold state, all functions of t (set by Film.unfold): theta[k] for crease k (between panel k-1 and k), psi for the cross fold
    this.thetaAt = Array.from({ length: cols }, () => () => 0);
    this.psiAt = () => 0;
    this.lift = 0; this.minY = 0; this.texts = [];
  }
  cell(c, r) { return this.cells[r * this.cols + c]; }
  // map (x, z) → which cell and where in it (cell-local, origin at the cell's north-west corner of the top face)
  locate(x, z) {
    const sx = x + this.W / 2, sz = z + this.H / 2;
    const c = clamp(Math.floor(sx / this.pw), 0, this.cols - 1), r = clamp(Math.floor(sz / this.ph), 0, 1);
    return { c, r, cell: this.cell(c, r), local: [sx - c * this.pw, sz - r * this.ph] };
  }
  onSheet(x, z, m = 0) { return Math.abs(x) <= this.W / 2 - m && Math.abs(z) <= this.H / 2 - m; }

  // ---- painting
  // front(m => …): paint the map side once, in map units, on one big canvas (MapPainter from mapart.js is passed in by
  // the page: S.front(M.painter(m => …)) or any fn(ctx, {x0, z0, ppu, W, H})).
  front(paint) {
    const ppu = this.res, W = Math.round(this.W * ppu), H = Math.round(this.H * ppu), big = canvas(W, H), g = big.getContext('2d');
    g.fillStyle = this.color; g.fillRect(0, 0, W, H);
    paint(g, { x0: -this.W / 2, z0: -this.H / 2, ppu, W, H, sheet: this });
    // the creases it was folded along: a faint valley shadow with a highlight on its lip
    const crease = (vertical, at) => {
      const w = .012 * ppu, p0 = at * ppu, gr = vertical ? g.createLinearGradient(p0 - w, 0, p0 + w, 0) : g.createLinearGradient(0, p0 - w, 0, p0 + w);
      gr.addColorStop(0, 'rgba(90,70,40,0)'); gr.addColorStop(.44, 'rgba(90,70,40,.12)'); gr.addColorStop(.5, 'rgba(255,255,255,.25)'); gr.addColorStop(.58, 'rgba(90,70,40,.08)'); gr.addColorStop(1, 'rgba(90,70,40,0)');
      g.fillStyle = gr; vertical ? g.fillRect(p0 - w, 0, 2 * w, H) : g.fillRect(0, p0 - w, W, 2 * w);
    };
    for (let c = 1; c < this.cols; c++) crease(true, c * this.pw);
    crease(false, this.ph);
    for (const cl of this.cells) {
      const cw = Math.round(this.pw * ppu), chh = Math.round(this.ph * ppu), cv = canvas(cw, chh);
      cv.getContext('2d').drawImage(big, Math.round(cl.c * this.pw * ppu), Math.round(cl.r * this.ph * ppu), cw, chh, 0, 0, cw, chh);
      cl.front.map = tex(cv); cl.front.needsUpdate = true;
    }
    this.frontCanvas = big; return this;
  }
  // backs((g, info) => …): called once per panel with the context set so (0,0)–(pw,ph) map units is the panel the right
  // way up as it is seen when folded (info: { c, r, cover, guide, ppu, pw, ph }). Back sides print upside-down relative
  // to each other on a real leaflet; this takes care of it.
  backs(paint) {
    for (const cl of this.cells) {
      const cover = cl.c === 0 && cl.r === 0, guide = cl.c === this.cols - 1;
      const ppu = cover || guide ? this.coverRes : this.backRes, cw = Math.round(this.pw * ppu), chh = Math.round(this.ph * ppu), cv = canvas(cw, chh), g = cv.getContext('2d');
      // the -y face shows canvas top at the panel's south edge, left at its west edge; flipped over the cross fold
      // (even panels) that is upright, flipped by the accordion (odd panels) it is turned 180°
      if (cl.c % 2 === 1) { g.translate(cw, chh); g.rotate(Math.PI); }
      g.fillStyle = this.backColor; g.fillRect(0, 0, cw, chh);
      g.save(); paint(g, { c: cl.c, r: cl.r, cover, guide, ppu, pw: this.pw, ph: this.ph, sheet: this }); g.restore();
      cl.back.map = tex(cv); cl.back.needsUpdate = true;
    }
    return this;
  }

  // ---- folding
  // fold angles at t: theta[k] (k = 1..cols-1) 0 = flat … 180 = folded; psi 0 = flat … 180 = top row over the bottom row
  update(t) {
    const n = this.cols, pw = this.pw, th = [], deg = Math.PI / 180;
    for (let k = 1; k < n; k++) th[k] = this.thetaAt[k](t) * deg;
    const psi = this.psiAt(t) * deg;
    // accordion chain: A_0 = a small counter-tilt so the open sheet zigzags around the desk instead of climbing
    const A = [], m = new THREE.Matrix4(), T = new THREE.Matrix4(), R = new THREE.Matrix4();
    const open = 1 - smooth(this.residual * 2, this.residual * 6, Math.abs(th[1] || 0) / deg);
    A[0] = new THREE.Matrix4().makeRotationZ(-(th[1] || 0) / 2 * open);
    for (let k = 1; k < n; k++) {
      const s = k % 2 ? 1 : -1, a = (s > 0 ? GAP : 2 * TAU_PAPER + GAP) / 2;
      m.copy(A[k - 1]).multiply(T.makeTranslation(pw, s * a, 0)).multiply(R.makeRotationZ(s * th[k])).multiply(T.makeTranslation(0, -s * a, 0));
      A[k] = m.clone();
    }
    // the cross fold: the top row turns about the crease line (z = ph) at the height of the folded stack's top
    const p = new THREE.Vector3(); let top = -Infinity;
    for (let k = 0; k < n; k++) for (const [x, y] of [[0, 0], [pw, 0], [0, -TAU_PAPER], [pw, -TAU_PAPER]]) { p.set(x, y, 0).applyMatrix4(A[k]); top = Math.max(top, p.y); }
    const yh = (top + GAP / 2 + TAU_PAPER / 2) * smooth(4, 40, Math.abs(psi) / deg), zc = this.ph;   // the hinge sinks to the paper as it opens: no gap at the crease
    const Hm = new THREE.Matrix4().makeTranslation(0, yh, zc).multiply(R.makeRotationX(psi)).multiply(T.makeTranslation(0, -yh, -zc));
    let minY = Infinity;
    for (const cl of this.cells) {
      cl.M.copy(A[cl.c]).multiply(T.makeTranslation(0, 0, cl.r * this.ph));
      if (cl.r === 0) cl.M.premultiply(Hm);
      for (const [x, z] of [[0, 0], [pw, 0], [0, this.ph], [pw, this.ph]]) for (const y of [0, -TAU_PAPER]) { p.set(x, y, z).applyMatrix4(cl.M); minY = Math.min(minY, p.y); }
    }
    this.minY = minY; this.lift = -minY;
    this.group.position.set(-this.W / 2, this.lift, -this.H / 2);
    for (const cl of this.cells) { cl.g.matrix.copy(cl.M); cl.g.matrixWorldNeedsUpdate = true; }
    this.group.updateMatrixWorld(true);
    this.state = { th, psi };
  }
  // world position of map point (x, z) at height y above the paper, for the current fold
  toWorld(x, z, y = 0) {
    const { cell, local } = this.locate(x, z);
    return new THREE.Vector3(local[0], y, local[1]).applyMatrix4(cell.g.matrixWorld);
  }
  // fold progress 0 (closed) … 1 (open), from the current angles
  openness() { const { th, psi } = this.state; const all = [psi, ...th.slice(1)].map(a => Math.abs(a) / Math.PI); return 1 - Math.max(...all); }
}

// ---------------------------------------------------------------- the film
export class Film {
  constructor({ duration = 40, fps = 30, W = 1080, H = 1920, seed = 1, background = '#120d0a' } = {}) {
    const q = new URLSearchParams(location.search);
    this.q = q; this.rendering = q.has('render');
    const screen = Math.max(innerWidth, innerHeight) * (devicePixelRatio || 1);
    this.scale = +(q.get('scale') || (this.rendering || q.has('t') ? 1 : clamp(screen / Math.max(W, H), .5, 1)));
    this.texScale = +(q.get('tex') || (this.rendering || q.has('t') ? 1 : (screen < 1300 ? .6 : 1)));
    this.off = new Set((q.get('off') || '').split(',').filter(Boolean));
    this.DURATION = duration; this.FPS = fps; this.W0 = W; this.H0 = H; this.seed = seed;
    this.W = Math.round(W * this.scale); this.H = Math.round(H * this.scale);
    window.FILM_TEX_SCALE = this.texScale;
    this.keys = []; this.huds = []; this.checks = []; this.texts = []; this.frames = []; this.cueList = [];
    this.pops = []; this.labels = []; this.lamps = [];
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(background);
    this.camera = new THREE.PerspectiveCamera(34, W / H, .01, 200);
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    r.setPixelRatio(1); r.setSize(this.W, this.H, false); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = !this.off.has('shadow'); r.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(r.domElement); r.domElement.style.background = background;
    this.rt = new THREE.WebGLRenderTarget(this.W, this.H, { samples: q.get('msaa') === '0' ? 0 : 4, colorSpace: THREE.SRGBColorSpace });
    // lights
    this.hemi = new THREE.HemisphereLight('#fff', '#888', 1); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff', 1); this.sun.castShadow = !this.off.has('shadow');
    this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.radius = 4; this.sun.shadow.bias = -.0002;
    this.scene.add(this.sun, this.sun.target);
    this.lightKeys = [[0, 'day']];
    this.post = new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: this.rt.texture }, res: { value: new THREE.Vector2(this.W, this.H) }, invProj: { value: new THREE.Matrix4() }, camWorld: { value: new THREE.Matrix4() },
        camPos: { value: new THREE.Vector3() }, focus: { value: 3 }, aperture: { value: 0 }, grade: { value: new THREE.Color('#fff') }, exposure: { value: 1 },
        vig: { value: .32 }, grain: { value: .035 }, frame: { value: 0 }, plane: { value: 0 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: `uniform sampler2D tex; uniform vec2 res; uniform mat4 invProj, camWorld; uniform vec3 camPos, grade;
        uniform float focus, aperture, exposure, vig, grain, frame, plane; varying vec2 vUv;
        float h12(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
        // distance along the view ray to the paper plane (y = plane): the miniature's depth, without a depth buffer
        float depthAt(vec2 uv){
          vec4 v = invProj * vec4(uv * 2. - 1., 1., 1.); v /= v.w; vec3 d = normalize((camWorld * vec4(v.xyz, 0.)).xyz);
          if (d.y > -1e-4) return 1e3; float s = (plane - camPos.y) / d.y; return s * dot(d, normalize((camWorld * vec4(0., 0., -1., 0.)).xyz));
        }
        void main(){
          vec3 c;
          if (aperture > 0.) {
            float z = depthAt(vUv), coc = clamp(aperture * abs(z - focus) / max(z, 1e-3), 0., 1.) * res.y * .012;
            c = vec3(0.); float w = 0.;
            for (int i = 0; i < 20; i++) {
              float fi = float(i), r = sqrt((fi + .5) / 20.), a = fi * 2.39996;
              vec2 o = vec2(cos(a), sin(a)) * r * coc / res; c += texture2D(tex, vUv + o).rgb; w += 1.;
            }
            c /= w;
          } else c = texture2D(tex, vUv).rgb;
          c *= grade * exposure;
          vec2 v = vUv - .5; v.x *= res.x / res.y; c *= 1. - vig * smoothstep(.15, .95, length(v) * 1.15);
          c += (h12(gl_FragCoord.xy + frame * 17.31) - .5) * grain;
          gl_FragColor = vec4(c, 1.);
          #include <colorspace_fragment>
        }`,
      depthTest: false, depthWrite: false,
    });
    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postScene = new THREE.Scene(); this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post));
    this.hud = new THREE.Scene();
  }
  static async create(o) { await loadFonts(); return new Film(o); }

  // ---- the parts
  sheet(o) { this.S = new Sheet(this, o); return this.S; }
  // the desk the map lies on: procedural wood, and a few props placed around the open sheet (they must not touch it)
  desk({ wood = '#6e4128', grain = '#3e2112', size = 14, props = [] } = {}) {
    const c = canvas(2048, 2048), g = c.getContext('2d'), R = rng(this.seed * 7 + 3);
    g.fillStyle = wood; g.fillRect(0, 0, 2048, 2048);
    // planks running along x, each with its own tone, grain lines that wander with noise, a few knots
    const planks = 7, ph = 2048 / planks;
    for (let p = 0; p < planks; p++) {
      const y0 = p * ph, tone = (R() - .5) * .16;
      g.fillStyle = tone > 0 ? `rgba(255,220,180,${tone})` : `rgba(20,8,0,${-tone})`; g.fillRect(0, y0, 2048, ph);
      for (let l = 0; l < 46; l++) {
        const y = y0 + R() * ph, amp = 3 + R() * 9, ph2 = R() * 50, a = .05 + R() * .12;
        g.strokeStyle = R() < .5 ? `rgba(30,12,4,${a})` : `rgba(255,214,170,${a * .5})`; g.lineWidth = .8 + R() * 2.2; g.beginPath();
        for (let x = 0; x <= 2048; x += 16) { const yy = y + Math.sin(x / 190 + ph2) * amp + (noise(x / 300, y / 60, p) - .5) * 14; x ? g.lineTo(x, yy) : g.moveTo(x, yy); }
        g.stroke();
      }
      g.fillStyle = 'rgba(15,6,0,.55)'; g.fillRect(0, y0, 2048, 2.5);
      for (let k = 0; k < 2; k++) { const kx = R() * 2048, ky = y0 + ph * (.25 + .5 * R()); const gr = g.createRadialGradient(kx, ky, 2, kx, ky, 26); gr.addColorStop(0, 'rgba(25,8,0,.6)'); gr.addColorStop(1, 'rgba(25,8,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(kx, ky, 46, 16, 0, 0, Math.PI * 2); g.fill(); }
    }
    const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(size / 7, size / 7);
    const m = new THREE.MeshPhongMaterial({ map: t, shininess: 22, specular: new THREE.Color('#3a2a20') });
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m); desk.rotation.x = -Math.PI / 2; desk.position.y = -.0005; desk.receiveShadow = true;
    this.scene.add(desk); this.deskMesh = desk;
    for (const p of props) this.prop(p);
    return this;
  }
  // a prop on the desk: 'pencil' | 'cup' | 'coin' | 'glasses' (simple shapes, matte) at a given place, or a fn(scene) of your own
  prop(p) {
    if (typeof p === 'function') { p(this.scene, THREE); return this; }
    const { kind, at = [0, 0], rot = 0, color } = typeof p === 'string' ? { kind: p } : p;
    const G = new THREE.Group(); G.position.set(at[0], 0, at[1]); G.rotation.y = rot * Math.PI / 180; this.scene.add(G);
    const mat = (c, o = {}) => new THREE.MeshPhongMaterial({ color: c, shininess: 30, ...o });
    const add = (geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const s = new THREE.Mesh(geo, m); s.position.set(x, y, z); s.rotation.set(rx, ry, rz); s.castShadow = s.receiveShadow = true; G.add(s); return s; };
    if (kind === 'pencil') {
      const L = 1.15, r = .024;
      add(new THREE.CylinderGeometry(r, r, L, 6), mat(color || '#d9a23a'), 0, r, 0, 0, 0, Math.PI / 2);
      add(new THREE.ConeGeometry(r, .09, 6), mat('#e9cfa2'), L / 2 + .045, r, 0, 0, 0, -Math.PI / 2);
      add(new THREE.ConeGeometry(r * .35, .026, 6), mat('#2b2b2b'), L / 2 + .078, r, 0, 0, 0, -Math.PI / 2);
      add(new THREE.CylinderGeometry(r * 1.04, r * 1.04, .06, 12), mat('#b8b8b0', { shininess: 80 }), -L / 2 - .03, r, 0, 0, 0, Math.PI / 2);
      add(new THREE.CylinderGeometry(r, r, .07, 12), mat('#e58a8a'), -L / 2 - .095, r, 0, 0, 0, Math.PI / 2);
    } else if (kind === 'cup') {
      const prof = []; for (let i = 0; i <= 12; i++) { const y = i / 12 * .42; prof.push(new THREE.Vector2(.2 + .03 * (i / 12) ** 1.5, y)); }
      add(new THREE.LatheGeometry(prof, 40), mat(color || '#f4efe6', { side: THREE.DoubleSide, shininess: 60 }));
      add(new THREE.CircleGeometry(.215, 40), mat('#3a1e10', { shininess: 90 }), 0, .36, 0, -Math.PI / 2);
      add(new THREE.TorusGeometry(.085, .022, 10, 24, Math.PI * 1.2), mat(color || '#f4efe6'), .23, .22, 0, 0, 0, -Math.PI * .6);
      add(new THREE.CylinderGeometry(.34, .32, .025, 40), mat(color || '#f4efe6', { shininess: 60 }), 0, .012, 0);
    } else if (kind === 'coin') {
      add(new THREE.CylinderGeometry(.07, .07, .01, 28), mat(color || '#c7a45a', { shininess: 90, specular: new THREE.Color('#ffe2a0') }), 0, .005, 0);
    } else if (kind === 'glasses') {
      const fr = mat(color || '#2a1d16', { shininess: 70 });
      for (const s of [-1, 1]) add(new THREE.TorusGeometry(.11, .012, 8, 32), fr, s * .14, .012, 0, -Math.PI / 2);
      add(new THREE.TorusGeometry(.04, .01, 8, 16, Math.PI), fr, 0, .012, -.02, -Math.PI / 2);
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(.012, .012, .42), fr, s * .25, .012, -.2);
    }
    (this.propList ||= []).push({ kind, at, r: kind === 'cup' ? .36 : kind === 'pencil' ? .7 : .3 });
    return this;
  }
  // the unfold: the cover opens over the cross fold, then the accordion creases open one after another (each a little
  // after the last, settling with a small overshoot). `close: t` folds it back up at the end (optional).
  unfold({ at = 1.6, half = 1.25, fan = 1.6, stagger = .32, order = 'out', close } = {}) {
    const S = this.S, n = S.cols, res = S.residual, cres = S.crossResidual;
    const shape = (a, d) => t => ease.settle(clamp((t - a) / d), .025);
    const halfP = shape(at, half);
    S.psiAt = t => lerp(180, cres, halfP(t));
    const t0 = at + half * .85;
    // order 'out': the top layer of the stack (the last crease) leaves first, as hands open an accordion
    for (let k = 1; k < n; k++) {
      const i = order === 'out' ? (n - 1 - k) : (k - 1), P = shape(t0 + i * stagger, fan);
      S.thetaAt[k] = t => lerp(180, res, P(t));
    }
    this.unfoldInfo = { at, half, fan, stagger, end: t0 + (n - 2) * stagger + fan };
    this.cueList.push({ t: at, kind: 'rustle', d: half }, ...Array.from({ length: n - 1 }, (_, i) => ({ t: t0 + i * stagger, kind: 'crease', d: fan })));
    if (close) {
      const c0 = close, cP = shape(c0, fan * 1.2);
      const oldT = S.thetaAt.slice(), oldP = S.psiAt;
      for (let k = 1; k < n; k++) { const o = oldT[k], P = shape(c0 + (k - 1) * stagger * .6, fan); S.thetaAt[k] = t => t < c0 ? o(t) : lerp(res, 180, P(t)); }
      const pP = shape(c0 + (n - 2) * stagger * .6 + fan * .8, half); S.psiAt = t => t < c0 ? oldP(t) : lerp(cres, 180, pP(t));
      this.cueList.push({ t: c0, kind: 'rustle', d: fan });
    }
    return this;
  }
  // light keys: [[t, 'day' | 'golden' | 'dusk' | 'night' | {…preset overrides}], …]; between keys it blends
  light(keys) { this.lightKeys = keys; return this; }
  lightAt(t) {
    const K = this.lightKeys.map(([kt, p]) => [kt, typeof p === 'string' ? LIGHTS[p] : { ...LIGHTS[p.base || 'day'], ...p }]);
    let i = 0; while (i < K.length - 1 && t >= K[i + 1][0]) i++;
    const [ta, A] = K[i], [tb, B] = K[Math.min(i + 1, K.length - 1)], f = tb > ta ? smooth(ta, tb, t) : 0;
    const out = {};
    for (const k of Object.keys(A)) {
      const a = A[k], b = B[k];
      out[k] = typeof a === 'number' ? lerp(a, b, f) : Array.isArray(a) ? a.map((v, j) => lerp(v, b[j], f)) : new THREE.Color(a).lerp(new THREE.Color(b), f);
    }
    return out;
  }
  night(t) { return this.lightAt(t).points; }

  // ---- the trip: route + pop-up standees + tent labels + the touring camera
  // stops: [{ name, latin, note, at: [x, z], art: Card | [layers], w (map units), face (deg, which way the card faces;
  //          default the camera yaw at its visit), yaw, elev, dist (its camera), hold, label: { side, ahead, tilt } }]
  // route: map points the red line passes (stops are added in order if you leave them out); start, hold, travel: timing
  trip({ stops, route, start = 8, hold = 2.6, travel = 2, color = '#b0302a', width = .011, head = true, lead = .55, camera = true, lift = 1.35 } = {}) {
    const S = this.S, T = { stops, visits: [] }; this.trip_ = T;
    // timing: the camera settles on stop i at A[i]; the route head arrives `lead` s before; the pop-up rises then
    let t = start;
    for (const s of stops) { T.visits.push({ arrive: t, leave: t + (s.hold ?? hold) }); t += (s.hold ?? hold) + (s.travel ?? travel); }
    T.end = T.visits.at(-1).leave;
    // the route polyline through every stop (route points may include the stops; any point within .02 of a stop counts)
    const pts = (route || stops.map(s => s.at)).slice();
    for (const s of stops) if (!pts.some(p => Math.hypot(p[0] - s.at[0], p[1] - s.at[1]) < .02)) throw new Error(`trip: route misses stop "${s.name}"`);
    const line = spline(pts, .004), L = [0];
    for (let i = 1; i < line.length; i++) L.push(L[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
    const sOf = p => { let best = 0, bd = Infinity; for (let i = 0; i < line.length; i++) { const d = Math.hypot(line[i][0] - p[0], line[i][1] - p[1]); if (d < bd) { bd = d; best = i; } } return L[best]; };
    // stops in route order: the arc length of each must increase
    let prevS = -1; T.sAt = stops.map(s => { const v = sOf(s.at); if (v < prevS - 1e-6) throw new Error(`trip: stop "${s.name}" comes before the previous stop along the route`); prevS = v; return v; });
    const S0 = T.sAt[0];
    T.progress = tt => {   // arc length drawn at t (a lead-in before the first stop draws while the camera comes down)
      if (tt < T.visits[0].arrive - lead) return S0 * smooth(start - 2.5, T.visits[0].arrive - lead, tt);
      for (let i = 0; i < stops.length - 1; i++) {
        const a = T.visits[i].leave - .15, b = T.visits[i + 1].arrive - lead;
        if (tt < a) return T.sAt[i];
        if (tt < b) return lerp(T.sAt[i], T.sAt[i + 1], ease.inOut(clamp((tt - a) / (b - a))));
      }
      return T.sAt.at(-1) + (L.at(-1) - T.sAt.at(-1)) * smooth(T.end, T.end + 1.5, tt);
    };
    T.line = line; T.L = L;
    this.route_ = this.buildRoute(line, L, { color, width, head });
    // pop-ups and labels
    stops.forEach((s, i) => {
      const v = T.visits[i], face = s.face ?? s.yaw ?? 0;
      s.yaw = s.yaw ?? face;
      const popAt = v.arrive - lead + .1;
      this.popup(s, { at: popAt, face, index: i });
      const B = this.label(s, { at: v.arrive - .05, face, index: i });
      s._aim = [lerp(s.at[0], B.x, .45), lerp(s.at[1], B.z, .45)];
      this.cueList.push({ t: popAt, kind: 'pop' }, { t: v.arrive - .05, kind: 'label' });
    });
    // the touring camera: settle on each stop, drift a little while it is held, lift between stops to see the line run
    if (camera) {
      stops.forEach((s, i) => {
        // aim a little behind the stop (away from the camera) so a tall 9:16 frame keeps the pop-up low and the desk out
        const yr = s.yaw * Math.PI / 180, back = s.aimBack ?? .14;
        const v = T.visits[i], a = s.at, aim = [s._aim[0] - Math.sin(yr) * back + (s.aimX || 0), s.aimY ?? .14, s._aim[1] - Math.cos(yr) * back + (s.aimZ || 0)];
        const d = s.dist ?? 2.3, e = s.elev ?? 24, y = s.yaw;
        this.keys.push({ t: v.arrive, at: aim, dist: d, yaw: y - 4, elev: e, fov: s.fov ?? 34 });
        this.keys.push({ t: v.leave, at: aim, dist: d * .93, yaw: y + 4, elev: e + 1.5, fov: s.fov ?? 34 });
        if (i < stops.length - 1) {
          const n = stops[i + 1], mid = line[Math.round(L.findIndex(q => q >= (T.sAt[i] + T.sAt[i + 1]) / 2))] || [(a[0] + n.at[0]) / 2, (a[1] + n.at[1]) / 2];
          const tm = (v.leave + T.visits[i + 1].arrive) / 2, dd = Math.max(d, n.dist ?? 2.3) * lift + Math.hypot(n.at[0] - a[0], n.at[1] - a[1]) * .35;
          this.keys.push({ t: tm, at: [mid[0], .06, mid[1]], dist: dd, yaw: (y + wrap((n.yaw ?? y) - y) / 2), elev: Math.max(e, n.elev ?? 24) + 12, fov: 34 });
        }
      });
    }
    return T;
  }
  buildRoute(line, L, { color, width, head }) {
    const S = this.S, per = new Map();
    // one ribbon per cell (cells fold separately); segments go to the cell holding their midpoint
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i], b = line[i + 1], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], { c, r } = S.locate(m[0], m[1]), key = r * S.cols + c;
      if (!per.has(key)) per.set(key, []); per.get(key).push(i);
    }
    const uProg = { value: 0 }, mat = new THREE.MeshLambertMaterial({ color, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uProg = uProg;
      sh.vertexShader = 'attribute float aS; varying float vS;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvS = aS;');
      sh.fragmentShader = 'uniform float uProg; varying float vS;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\nif (vS > uProg) discard;');
    };
    const meshes = [];
    for (const [key, idx] of per) {
      const cl = S.cells[key], pos = [], sA = [], ix = []; let n = 0;
      const ox = -S.W / 2 + cl.c * S.pw, oz = -S.H / 2 + cl.r * S.ph;
      for (const i of idx) {
        const a = line[i], b = line[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * width / 2, nz = dx / l * width / 2;
        const ext = .0015 / l;   // overlap neighbours a hair so there are no seams
        const ax = a[0] - dx * ext, az = a[1] - dz * ext, bx = b[0] + dx * ext, bz = b[1] + dz * ext;
        pos.push(ax - nx - ox, .0007, az - nz - oz, ax + nx - ox, .0007, az + nz - oz, bx - nx - ox, .0007, bz - nz - oz, bx + nx - ox, .0007, bz + nz - oz);
        sA.push(L[i], L[i], L[i + 1], L[i + 1]); ix.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); n += 4;   // wound to face up
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(sA, 1));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, j) => j % 3 === 1 ? 1 : 0), 3)); g.setIndex(ix);
      const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; cl.g.add(mesh); meshes.push(mesh);
    }
    // the head: a red dot with a paper-white ring, riding on the paper at the end of the drawn line
    let headM = null;
    if (head) {
      headM = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.CircleGeometry(width * 1.9, 28), new THREE.MeshLambertMaterial({ color: '#fbf6ea' })); ring.rotation.x = -Math.PI / 2;
      const dot = new THREE.Mesh(new THREE.CircleGeometry(width * 1.25, 28), new THREE.MeshLambertMaterial({ color })); dot.rotation.x = -Math.PI / 2; dot.position.y = .0004;
      headM.add(ring, dot); this.scene.add(headM);
    }
    return { uProg, meshes, head: headM, line, L };
  }
  // a pop-up standee: a die-cut card (or layers of them) hinged at its foot, lying flat face-up until `at`, then
  // springing upright. Art comes from cardart.js (card({ w, h, draw })) → { color, glow, back, aspect }.
  popup(s, { at, face, index }) {
    const S = this.S, layers = Array.isArray(s.art) ? s.art : [{ card: s.art }], root = new THREE.Group();
    const { cell, local } = S.locate(s.at[0], s.at[1]);
    root.position.set(local[0], 0, local[1]); root.rotation.y = face * Math.PI / 180; cell.g.add(root);
    const parts = [];
    layers.forEach((Ly, j) => {
      const card = Ly.card || Ly, w = (Ly.w ?? s.w ?? .5) * (Ly.k ?? 1), h = w / card.aspect;
      const hinge = new THREE.Group(); hinge.position.set((Ly.dx || 0) * (s.w ?? .5), .0004, (Ly.dz || 0) * (s.w ?? .5)); root.add(hinge);
      const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
      const fm = new THREE.MeshLambertMaterial({ map: card.color, emissiveMap: card.glow, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, alphaTest: .5, side: THREE.FrontSide });
      const bm = new THREE.MeshLambertMaterial({ map: card.back, alphaTest: .5, side: THREE.FrontSide });
      const f = new THREE.Mesh(geo, fm), b = new THREE.Mesh(geo, bm); b.rotation.y = Math.PI; b.position.z = -.0012;
      f.castShadow = b.castShadow = true; f.receiveShadow = b.receiveShadow = true; hinge.add(f, b);
      // the glued foot: a strip of the card's paper lying on the map behind the hinge
      const foot = new THREE.Mesh(new THREE.PlaneGeometry(w * .62, .035), new THREE.MeshLambertMaterial({ color: '#e6dfcf' }));
      foot.rotation.x = -Math.PI / 2; foot.position.set(0, .0003, -.0175); foot.receiveShadow = true; hinge.add(foot);
      parts.push({ hinge, fm, w, h, delay: j * .12, lean: Ly.lean ?? 0 });   // back layers first
    });
    // its lamp: a warm point light inside at night and a pool of light on the paper
    const lamp = new THREE.PointLight('#ffb56b', 0, (s.w ?? .5) * 2.2, 1.6); lamp.position.set(0, (s.w ?? .5) * .3, .12); root.add(lamp);
    const pool = new THREE.Mesh(new THREE.CircleGeometry((s.w ?? .5) * .95, 40), new THREE.MeshBasicMaterial({ map: poolTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, color: '#ffb066', toneMapped: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, .0012, .1); pool.renderOrder = 3; root.add(pool);
    const P = { s, at, root, parts, lamp, pool, index, cell, w: s.w ?? .5 };
    this.pops.push(P); return P;
  }
  // a tent label: a white card lying beside the pop-up, tilting up toward the camera at `at` so it can be read low
  label(s, { at, face, index }) {
    const S = this.S, o = { side: .5, ahead: .24, tilt: 62, w: .25, ...(s.label || {}) };
    const c = labelCanvas(s, index, this.texScale), w = o.w, h = w * c.height / c.width;
    const f = face * Math.PI / 180, cx = Math.cos(f), sx = Math.sin(f);
    // in front (toward the face direction) and to its right, in map units
    const side = o.side * (s.w ?? .5), x = s.at[0] + sx * o.ahead + cx * side, z = s.at[1] + cx * o.ahead - sx * side;
    const { cell, local } = S.locate(x, z), root = new THREE.Group();
    root.position.set(local[0], .0004, local[1]); root.rotation.y = f; cell.g.add(root);
    const hinge = new THREE.Group(); root.add(hinge);
    const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
    const lt = tex(c), mat = new THREE.MeshLambertMaterial({ map: lt, emissiveMap: lt, emissive: new THREE.Color('#ffd9a8'), emissiveIntensity: 0 }); const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true;
    const back = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: '#efe9dc' })); back.rotation.y = Math.PI; back.position.z = -.001; back.castShadow = true;
    hinge.add(m, back);
    // the card lies tilted back (face up) along the map when shown flat: hinge at its near edge
    const L = { s, at, root, hinge, mat, tilt: o.tilt, w, h, x, z, index, cell };
    this.labels.push(L); this.texts.push(s.name || '', s.latin || '', s.note || '', String(index + 1).padStart(2, '0'));
    return L;
  }
  track(keys) { this.keys.push(...keys); return this; }   // camera keys: { t, at: [x, y, z], dist, yaw, elev, fov }
  // a line of text over the film (sparingly: the map carries its own words). pos 'top' | 'bottom' | 'center'
  title(text, { from = 0, to = Infinity, pos = 'bottom', size = 44, color = '#f6efe2', sub, italic = false } = {}) {
    const S = size * 2, font = `${italic ? 'italic ' : ''}600 ${S}px ${italic ? ITALIC : SERIF}`, sfont = `italic 500 ${S * .5}px ${ITALIC}`;
    const m = canvas(4, 4).getContext('2d'); m.font = font; const tw = m.measureText(text).width; m.font = sfont; const sw = sub ? m.measureText(sub).width : 0;
    const W = Math.max(tw, sw) + S, H = S * 1.4 + (sub ? S * .85 : 0), c = canvas(W, H), g = c.getContext('2d');
    g.textAlign = 'center'; g.textBaseline = 'top'; g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = S * .25;
    g.fillStyle = color; g.font = font; g.fillText(text, W / 2, S * .15);
    if (sub) { g.font = sfont; g.globalAlpha = .82; g.fillText(sub, W / 2, S * 1.3); }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex(c, { mip: false }), transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    this.hud.add(mesh); this.huds.push({ mesh, from, to, pos, w: W / 2, h: H / 2 }); this.texts.push(text, sub || '');
    this.cueList.push({ t: from, kind: 'title' }); return this;
  }
  check(name, fn) { this.checks.push({ name, fn }); return this; }
  onFrame(fn) { this.frames.push(fn); return this; }

  // ---- per frame
  posePops(t) {
    // a pop-up is hidden until its moment, then grows out of the paper as it swings up (a card unfolding from the page)
    const always = this.off.has('pop'), L = this.lightAt(t);
    for (const P of this.pops) {
      P.up = always ? 1 : 0;
      for (const p of P.parts) {
        const s = t - P.at - p.delay, k = always ? 1 : spring(s, .95), grow = always ? 1 : ease.out(clamp(s / .28));
        p.hinge.visible = grow > 0; p.hinge.scale.set(1, Math.max(grow, 1e-3), 1);
        p.hinge.rotation.x = lerp(-Math.PI / 2, 0, clamp(k, 0, 1.12)) + p.lean;
        P.up = Math.max(P.up, clamp(k));
        p.fm.emissiveIntensity = L.glow * clamp(k);
      }
      P.lamp.intensity = L.points * P.up * .55 * P.w;
      P.pool.material.opacity = L.pools * P.up * .32;
    }
    for (const B of this.labels) {
      const s = t - B.at, k = always ? 1 : clamp(spring(s, 1.1), 0, 1.1);
      B.root.visible = always || s > 0; B.root.scale.setScalar(always ? 1 : lerp(.6, 1, ease.out(clamp(s / .3))));
      B.hinge.rotation.x = lerp(-Math.PI / 2, -Math.PI / 2 + B.tilt * Math.PI / 180, k);
      B.mat.emissiveIntensity = L.pools * .38;   // read by its pop-up's lamp at night
    }
  }
  seek(t) {
    t = clamp(t, 0, this.DURATION); this.t = t;
    const S = this.S; S.update(t);
    const L = this.lightAt(t);
    this.hemi.intensity = L.hemi; this.hemi.color.copy(L.sky); this.hemi.groundColor.copy(L.ground);
    this.sun.intensity = L.sun; this.sun.color.copy(L.sunColor);
    this.posePops(t);
    if (this.route_) {
      const R = this.route_, p = this.off.has('route') ? 0 : this.trip_.progress(t); R.uProg.value = p;
      if (R.head) {
        let i = R.L.findIndex(v => v >= p); if (i < 0) i = R.L.length - 1;
        const q = R.line[i], w = S.toWorld(q[0], q[1], .0012); R.head.position.copy(w); R.head.visible = p > .005 && t < this.trip_.end + .3;
      }
    }
    for (const f of this.frames) f(t, L);
    const c = this.path(t); placeCamera(this.camera, c); this.cam = c;
    // the sun's shadow box follows what the camera looks at, tight enough for crisp pop-up shadows
    const half = clamp(c.dist * .75, .7, 4.2), sd = new THREE.Vector3(...L.sunDir).normalize();
    const sc = this.sun.shadow.camera; sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = .1; sc.far = half * 10; sc.updateProjectionMatrix();
    this.sun.target.position.set(c.at[0], 0, c.at[2]); this.sun.position.set(c.at[0] + sd.x * half * 4, sd.y * half * 4, c.at[2] + sd.z * half * 4);
    this.sun.shadow.normalBias = half * .002;
    const r = this.renderer; r.setRenderTarget(this.rt); r.render(this.scene, this.camera);
    const u = this.post.uniforms;
    u.invProj.value.copy(this.camera.projectionMatrixInverse); u.camWorld.value.copy(this.camera.matrixWorld); u.camPos.value.copy(this.camera.position);
    u.focus.value = c.dist; u.aperture.value = this.off.has('dof') ? 0 : (c.dof ?? this.dofAt(c)); u.plane.value = c.at[1];
    u.grade.value.copy(L.grade); u.exposure.value = L.exposure; u.grain.value = this.off.has('grain') ? 0 : .022; u.frame.value = Math.round(t * this.FPS);
    r.setRenderTarget(null); r.render(this.postScene, this.ortho);
    r.autoClear = false;
    for (const h of this.huds) {
      const on = t >= h.from && t <= h.to && !this.off.has('hud');
      const f = on ? Math.min(smooth(h.from, h.from + .7, t), 1 - smooth(h.to - .6, h.to, t)) : 0;
      h.mesh.visible = f > .001; h.mesh.material.opacity = f;
      const sx = h.w * 2 / this.W0, sy = h.h * 2 / this.H0; h.mesh.scale.set(sx, sy, 1);
      const y = h.pos === 'top' ? 1 - sy * .5 - .06 : h.pos === 'bottom' ? -1 + sy * .5 + .07 : 0;
      h.mesh.position.set(0, y - (1 - f) * .015, 0);
    }
    r.render(this.hud, this.ortho); r.autoClear = true;
  }
  // depth of field: stronger the lower and closer the camera (a miniature seen up close), none from high above
  dofAt(c) { return clamp((1 - smooth(38, 70, c.elev)) * (2.3 / Math.max(.8, c.dist)) * .45, 0, .8); }
  cues() {
    const out = [...this.cueList];
    const night = []; for (let t = 0; t <= this.DURATION; t += .25) night.push(+this.night(t).toFixed(3));
    return { duration: this.DURATION, cues: out.sort((a, b) => a.t - b.t), night, nightStep: .25 };
  }
  allText() { const s = new Set(); for (const x of [...this.texts, ...(this.S?.texts || [])]) for (const ch of x) s.add(ch); return [...s].join(''); }

  // ---- checks: built-in rules + the page's own
  runChecks(t) {
    const bad = []; this.seek(t);
    const cam = this.camera, S = this.S;
    // the camera stays above the paper and the desk
    const under = S.onSheet(cam.position.x, cam.position.z) ? S.toWorld(cam.position.x, cam.position.z).y : 0;
    if (cam.position.y < under + .08) bad.push('camera stays above the paper');
    if (this.trip_) {
      const T = this.trip_;
      T.stops.forEach((s, i) => {
        const v = T.visits[i]; if (t < v.arrive + .25 || t > v.leave - .1) return;
        const P = this.pops[i], B = this.labels[i];
        const top = new THREE.Vector3(0, P.parts[0].h * .55, 0).applyMatrix4(P.parts[0].hinge.matrixWorld).project(cam);
        const foot = new THREE.Vector3(0, 0, 0).applyMatrix4(P.root.matrixWorld).project(cam);
        if ([top, foot].some(p => Math.abs(p.x) > .92 || Math.abs(p.y) > .92 || p.z > 1)) bad.push(`pop-up "${s.name}" is in frame while visited`);
        const lc = [[-B.w / 2, 0], [B.w / 2, 0], [-B.w / 2, B.h], [B.w / 2, B.h]].map(([x, y]) => new THREE.Vector3(x, y, 0).applyMatrix4(B.hinge.matrixWorld).project(cam));
        if (lc.some(p => Math.abs(p.x) > .97 || Math.abs(p.y) > .97 || p.z > 1)) bad.push(`label "${s.name}" is in frame while visited`);
        // readable: the card's height on screen ≥ 7% of the frame width (its name ≈ 30 px tall at 1080 wide)
        const hpx = Math.hypot((lc[2].x - lc[0].x) * this.W0 / 2, (lc[2].y - lc[0].y) * this.H0 / 2);
        if (hpx < this.W0 * .07) bad.push(`label "${s.name}" is big enough to read while visited (${Math.round(hpx)} px)`);
      });
    }
    for (const [n, ok] of this.staticChecks || []) if (!ok) bad.push(n);
    for (const c of this.checks) if (!c.fn(t)) bad.push(c.name);
    return bad;
  }
  // layout rules that do not change with t: on the sheet, footprints that do not collide, props off the paper
  layoutChecks() {
    const S = this.S, out = [], rects = [];
    const rect = (cx, cz, w, d, f, name) => { const c = Math.cos(f), s = Math.sin(f); return { name, pts: [[-w / 2, 0], [w / 2, 0], [w / 2, -d], [-w / 2, -d]].map(([x, z]) => [cx + x * c + z * s, cz - x * s + z * c]) }; };
    for (const P of this.pops) {
      const f = (P.s.face ?? 0) * Math.PI / 180;
      out.push([`pop-up "${P.s.name}" stands on the sheet`, S.onSheet(P.s.at[0], P.s.at[1], .12)]);
      // a lying pop-up covers its height behind the hinge; when up it covers its depth layers
      rects.push(rect(P.s.at[0], P.s.at[1], P.w * .9, Math.max(...P.parts.map(p => p.h)) * .6, f, `pop-up "${P.s.name}"`));
    }
    for (const B of this.labels) {
      const f = (B.s.face ?? 0) * Math.PI / 180;
      out.push([`label "${B.s.name}" lies on the sheet`, S.onSheet(B.x, B.z, .05)]);
      rects.push(rect(B.x, B.z, B.w, B.h * .55, f, `label "${B.s.name}"`));
    }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++)
      if (polysOverlap(rects[i].pts, rects[j].pts)) out.push([`${rects[i].name} and ${rects[j].name} do not overlap`, false]);
    for (const p of this.propList || []) out.push([`desk prop "${p.kind}" stays off the open sheet`, Math.abs(p.at[0]) > S.W / 2 + p.r * .6 || Math.abs(p.at[1]) > S.H / 2 + p.r * .6]);
    return out;
  }
  path(t) { return this._path(t); }
  async start() {
    try { await document.fonts.ready; } catch { }
    if (!this.S) throw new Error('no sheet: F.sheet({...}) first');
    this.keys.sort((a, b) => a.t - b.t); this._path = cameraPath(this.keys);
    this.staticChecks = this.layoutChecks();
    Object.assign(window, { seek: t => this.seek(t), DURATION: this.DURATION, FPS: this.FPS, SIZE: { W: this.W0, H: this.H0 }, runChecks: t => this.runChecks(t), FILM: this });
    const ft = this.q.get('t');
    if (this.rendering) { this.seek(+(ft || 0)); window.__ready = true; return; }
    if (ft != null) { this.fit(); this.seek(+ft); window.__ready = true; return; }
    this.live(); window.__ready = true;
  }
  fit() {
    const cv = this.renderer.domElement, st = document.body.style; st.margin = 0; st.background = '#0d0b09'; st.overflow = 'hidden';
    const fit = () => { const k = Math.min(innerWidth / this.W, innerHeight / this.H); Object.assign(cv.style, { position: 'fixed', left: (innerWidth - this.W * k) / 2 + 'px', top: (innerHeight - this.H * k) / 2 + 'px', width: this.W * k + 'px', height: this.H * k + 'px' }); };
    addEventListener('resize', fit); fit();
  }
  live() {
    const cv = this.renderer.domElement; this.fit();
    const bar = document.createElement('div'); Object.assign(bar.style, { position: 'fixed', left: 0, bottom: 0, height: '3px', background: 'rgba(255,255,255,.7)', width: 0, zIndex: 2 }); document.body.appendChild(bar);
    let t = 0, last = performance.now(), paused = false, drag = null;
    const step = now => {
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      if (!paused && !drag) { t += dt; if (t > this.DURATION) t = 0; }
      this.seek(t); bar.style.width = (t / this.DURATION * 100) + '%'; requestAnimationFrame(step);
    };
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, t, moved: false }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) drag.moved = true; t = clamp(drag.t + dx / innerWidth * this.DURATION, 0, this.DURATION); });
    cv.addEventListener('pointerup', () => { if (drag && !drag.moved) paused = !paused; drag = null; });
    addEventListener('keydown', e => { if (e.key === ' ') paused = !paused; if (e.key === 'ArrowRight') t = Math.min(this.DURATION, t + 1); if (e.key === 'ArrowLeft') t = Math.max(0, t - 1); });
    requestAnimationFrame(step);
  }
}

function polysOverlap(a, b) {   // convex polygons, separating axis
  for (const P of [a, b]) for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length], nx = q[1] - p[1], nz = p[0] - q[0];
    const pa = a.map(v => v[0] * nx + v[1] * nz), pb = b.map(v => v[0] * nx + v[1] * nz);
    if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false;
  }
  return true;
}
let _pool;
function poolTex() {
  if (_pool) return _pool;
  const c = canvas(128, 128), g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); return (_pool = new THREE.CanvasTexture(c));
}
// the label card: paper white, a red number disc, the local name, the latin name in italics, a rule and one note
export function labelCanvas(s, i, k = 1, { red = '#b0302a', ink = '#1f2a26', paper = '#fbf8f0' } = {}) {
  const W = Math.round(1000 * Math.max(.6, k)), H = Math.round(W * .36), u = W / 1000, c = canvas(W, H), g = c.getContext('2d');
  g.fillStyle = paper; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(60,50,40,.28)'; g.lineWidth = 3 * u; g.strokeRect(14 * u, 14 * u, W - 28 * u, H - 28 * u);
  g.fillStyle = red; g.beginPath(); g.arc(92 * u, 112 * u, 46 * u, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.font = `700 ${44 * u}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1).padStart(2, '0'), 92 * u, 114 * u);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = ink;
  const fit = (txt, font, size, max) => { let sz = size; g.font = font(sz); while (g.measureText(txt).width > max && sz > size * .55) { sz -= 2; g.font = font(sz); } return sz; };
  fit(s.name || '', z => `900 ${z * u}px ${SERIF}`, 76, W - 190 * u); g.fillText(s.name || '', 166 * u, 136 * u);
  g.fillStyle = 'rgba(31,42,38,.82)'; fit(s.latin || '', z => `italic 400 ${z * u}px ${ITALIC}`, 44, W - 190 * u); g.fillText(s.latin || '', 168 * u, 200 * u);
  g.fillStyle = red; g.fillRect(168 * u, 228 * u, 120 * u, 4 * u);
  g.fillStyle = 'rgba(31,42,38,.7)'; fit(s.note || '', z => `500 ${z * u}px ${SERIF}`, 34, W - 200 * u); g.fillText(s.note || '', 168 * u, 290 * u);
  return c;
}
