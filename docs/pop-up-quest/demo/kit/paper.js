// pop-up-quest — cardstock primitives. Every set piece is built from these: flat-coloured, low-poly, matte paper.
// All functions add to a parent THREE.Group `g` and return the mesh (or group) they made. Units: the book's page is
// W = 5.9 wide (spine → outer edge) and D = 6.88 deep; one puppet is ~1.0–1.2 tall. y = 0 is the page surface.
import * as T from 'three';

export const C = {           // the house palette — sets may use any colour, these keep a book coherent
  cream: '#f1e4c3', paper: '#e9d9b4', card: '#dcc8a0', ink: '#2c2a26', wood: '#7a5638', bark: '#5d4330',
  honey: '#d9a85b', ochre: '#e3a83a', red: '#c4473a', rust: '#a8553a', teal: '#3f7a72', pine: '#3e6b4f',
  leaf: '#6f9a5a', moss: '#8fae6a', grass: '#a6c27e', water: '#77b3b1', deep: '#4d8f93', sky: '#9cc7c9',
  stone: '#c9b796', slate: '#6c7a86', snow: '#f4efe2', sun: '#f2b33d', night: '#2f4058', rose: '#d98a7a',
};

const mats = new Map();
let fibre = null;
function fibreTexture() {          // one shared paper-fibre map so every surface reads as card, not plastic
  if (fibre) return fibre;
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256);
  let s = 91; const rnd = () => ((s = Math.imul(1103515245, s) + 12345 >>> 0) / 4294967296);
  for (let i = 0; i < 2600; i++) { const v = 228 + rnd() * 27 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 5, 1); }
  fibre = new T.CanvasTexture(c); fibre.wrapS = fibre.wrapT = T.RepeatWrapping; fibre.colorSpace = T.SRGBColorSpace;
  return fibre;
}
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new T.MeshLambertMaterial({ color, map: fibreTexture(), flatShading: true, ...opts }));
  return mats.get(key);
}
function put(g, geo, color, x = 0, y = 0, z = 0) {
  const m = new T.Mesh(geo, typeof color === 'string' ? mat(color) : color);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m;
}
export function group(parent, x = 0, y = 0, z = 0) { const g = new T.Group(); g.position.set(x, y, z); parent?.add(g); return g; }

// ── solids ─────────────────────────────────────────────────────────────────────────────────────────────
export const box = (g, x, y, z, w, h, d, c) => put(g, new T.BoxGeometry(w, h, d), c, x, y, z);
export const cyl = (g, x, y, z, rt, rb, h, c, seg = 8) => put(g, new T.CylinderGeometry(rt, rb, h, seg), c, x, y, z);
export const cone = (g, x, y, z, r, h, c, seg = 7) => put(g, new T.ConeGeometry(r, h, seg), c, x, y, z);
export const ball = (g, x, y, z, r, c, detail = 0) => put(g, new T.IcosahedronGeometry(r, detail), c, x, y, z);
export function beam(g, a, b, r, c, seg = 6) {               // a round stick between two points
  const A = new T.Vector3(...a), B = new T.Vector3(...b), len = A.distanceTo(B);
  const m = put(g, new T.CylinderGeometry(r, r, len, seg), c);
  m.position.copy(A).add(B).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}
// a die-cut card: a 2D outline (x right, y up) extruded `depth` along z, face toward +z (the reader)
export function slab(g, pts, depth, c, x = 0, y = 0, z = 0, rotY = 0) {
  const s = new T.Shape(pts.map(p => new T.Vector2(p[0], p[1])));
  const geo = new T.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  const m = put(g, geo, c, x, y, z); m.rotation.y = rotY; return m;
}
export function roof(g, x, y, z, w, h, d, c, eave = '#00000000') {    // gable prism, ridge along x
  const m = slab(g, [[-w / 2, 0], [w / 2, 0], [0, h]], d, c, x, y, z); return m;
}
export function hipRoof(g, x, y, z, r, h, c, seg = 4) {   // pyramid / cone roof for towers
  const m = cone(g, x, y + h / 2, z, r, h, c, seg); if (seg === 4) m.rotation.y = Math.PI / 4; return m;
}

// ── scenery ────────────────────────────────────────────────────────────────────────────────────────────
export function pine(g, x, z, h = 1.4, c = C.pine) {
  const t = group(g, x, 0, z);
  cyl(t, 0, h * .09, 0, h * .045, h * .06, h * .18, C.bark, 5);
  for (let i = 0; i < 3; i++) cone(t, 0, h * (.33 + i * .2), 0, h * (.36 - i * .08), h * (.42 - i * .06), i % 2 ? shade(c, 1.08) : c, 6);
  return t;
}
export function tree(g, x, z, h = 1.3, c = C.leaf) {          // round crown of paper blobs
  const t = group(g, x, 0, z);
  cyl(t, 0, h * .22, 0, h * .05, h * .07, h * .44, C.bark, 5);
  ball(t, 0, h * .66, 0, h * .3, c); ball(t, -h * .17, h * .55, h * .05, h * .19, shade(c, .9)); ball(t, h * .16, h * .58, -h * .03, h * .2, shade(c, 1.1));
  return t;
}
export function bush(g, x, z, r = .25, c = C.moss) { const t = group(g, x, 0, z); ball(t, 0, r * .92, 0, r, c); ball(t, r * .8, r * .66, .02, r * .7, shade(c, .9)); return t; }
export function rock(g, x, z, r = .25, c = C.stone) { const m = ball(g, x, r * .62, z, r, c); m.scale.y = .65; m.rotation.y = x * 3.1; return m; }
export function grass(g, x, z, h = .28, c = C.leaf) {          // three crossed blades of card
  const t = group(g, x, 0, z);
  for (let i = 0; i < 3; i++) slab(t, [[-.05, 0], [.05, 0], [(i - 1) * .06, h * (1 - Math.abs(i - 1) * .25)]], .01, i === 1 ? c : shade(c, .85), (i - 1) * .05, 0, 0, i * .7);
  return t;
}
export function flower(g, x, z, c = C.cream) {
  const t = group(g, x, 0, z); beam(t, [0, 0, 0], [0, .22, 0], .012, C.leaf, 4);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; ball(t, Math.cos(a) * .045, .23 + Math.sin(a) * .045, 0, .035, c); }
  ball(t, 0, .23, .02, .03, C.ochre); return t;
}
// a folded strip of hills at the back of a page: peaks [[x, height], …] from x0 to x1, standing at z
export function ridge(g, x0, x1, z, peaks, c = C.moss, depth = .06) {
  const pts = [[x0, 0], ...peaks, [x1, 0]];
  return slab(g, pts, depth, c, 0, 0, z);
}
export function mountains(g, x0, x1, z, peaks, c = C.slate, snow = C.snow) {
  const t = group(g); ridge(t, x0, x1, z, peaks, c, .08);
  for (const [px, ph] of peaks) if (ph > 1.2 && px - .3 > Math.min(x0, x1) && px + .3 < Math.max(x0, x1)) slab(t, [[px - .28, ph - .42], [px + .28, ph - .42], [px, ph]], .09, snow, 0, 0, z + .01);
  return t;
}
export function sun(g, x, y, z, r = .55, c = C.sun) {          // a disc of card on a stick, with ray tabs
  const t = group(g, x, 0, z);
  beam(t, [0, 0, 0], [0, y, -.02], .02, C.wood, 4);
  cyl(t, 0, y, 0, r, r, .05, c, 20).rotation.x = Math.PI / 2;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, b = box(t, Math.cos(a) * r * 1.32, y + Math.sin(a) * r * 1.32, 0, .035, r * .32, .02, c); b.rotation.z = a - Math.PI / 2; }
  return t;
}
export function moon(g, x, y, z, r = .5, c = '#f3dc9a') {
  const t = group(g, x, 0, z); beam(t, [0, 0, 0], [0, y - r * .6, -.02], .02, C.wood, 4);
  const pts = []; for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + i / 20 * Math.PI; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  for (let i = 20; i >= 0; i--) { const a = -Math.PI / 2 + i / 20 * Math.PI; pts.push([Math.cos(a) * r * .55 - r * .1, Math.sin(a) * r * .92]); }
  slab(t, pts, .05, c, 0, y, 0).rotation.z = .5; return t;
}
export function star(g, x, y, z, r = .09, c = '#f6e3a3') {
  const pts = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  return slab(g, pts, .02, c, x, y, z);
}
export function cloud(g, x, y, z, w = 1.1, c = C.cream) {
  const t = group(g, x, 0, z); beam(t, [0, 0, 0], [0, y, -.02], .016, C.wood, 4);
  const pts = [[-w / 2, 0], [w / 2, 0], [w * .42, w * .14], [w * .2, w * .17], [w * .1, w * .33], [-w * .12, w * .3], [-w * .26, w * .18], [-w * .44, w * .14]];
  slab(t, pts, .06, c, 0, y, 0); return t;
}
export function flag(g, x, y, z, h = .5, c = C.red) {
  const t = group(g, x, y, z); beam(t, [0, 0, 0], [0, h, 0], .014, C.ink, 4);
  slab(t, [[0, h], [h * .55, h * .86], [0, h * .7]], .012, c); return t;
}
export function bunting(g, a, b, sag, colors = [C.red, C.honey, C.teal], n = 9) {
  const t = group(g); const P = i => { const u = i / n; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - Math.sin(Math.PI * u) * sag, a[2] + (b[2] - a[2]) * u]; };
  for (let i = 0; i < n; i++) { const p = P(i), q = P(i + 1); beam(t, p, q, .01, C.ink, 4); const m = P(i + .5); slab(t, [[-.09, 0], [.09, 0], [0, -.2]], .01, colors[i % colors.length], m[0], m[1], m[2]); }
  return t;
}
export function lantern(g, x, y, z, glow = 0) {
  const t = group(g, x, y, z); beam(t, [0, 0, 0], [0, .16, 0], .008, C.ink, 4);
  box(t, 0, -.04, 0, .13, .17, .13, glow ? '#ffd27a' : C.honey).material = mat(glow ? '#ffd27a' : C.honey, glow ? { emissive: '#ffb547', emissiveIntensity: glow } : {});
  box(t, 0, .07, 0, .17, .04, .17, C.ink); return t;
}
export function fence(g, x0, x1, z, h = .32, c = C.wood) {
  const t = group(g); const n = Math.max(2, Math.round(Math.abs(x1 - x0) / .28));
  for (let i = 0; i <= n; i++) box(t, x0 + (x1 - x0) * i / n, h / 2, z, .045, h, .045, c);
  for (const yy of [h * .4, h * .8]) box(t, (x0 + x1) / 2, yy, z, Math.abs(x1 - x0), .035, .025, shade(c, 1.15));
  return t;
}
export function water(g, x, z, w, d, c = C.water) {             // a ripple of card lying on the print
  const t = group(g, x, .005, z);
  for (let i = 0; i < 3; i++) { const m = box(t, (i - 1) * w * .3, 0, (i % 2 - .5) * d * .4, w * .28, .01, .03, shade(c, 1.15)); m.castShadow = false; }
  return t;
}
export function boat(g, x, z, s = 1, sail = C.cream, hull = C.red) {
  const t = group(g, x, 0, z); t.scale.setScalar(s);
  slab(t, [[-.42, .16], [.42, .16], [.3, 0], [-.3, 0]], .26, hull);
  beam(t, [0, .16, 0], [0, .95, 0], .015, C.wood, 4);
  slab(t, [[.02, .26], [.36, .26], [.02, .9]], .02, sail); slab(t, [[-.02, .3], [-.26, .3], [-.02, .78]], .02, shade(sail, .92));
  return t;
}
export function bird(g, x, y, z, s = .16, c = C.cream) {   // a folded V of card, for gulls and skies
  const t = group(g, x, y, z);
  const l = slab(t, [[0, 0], [-s, s * .35], [-s * .5, 0]], .01, c), r = slab(t, [[0, 0], [s, s * .35], [s * .5, 0]], .01, shade(c, .9));
  t.userData.wings = [l, r]; return t;
}
export function house(g, x, z, o = {}) {        // {w,h,d, wall, roof, door, trim, chimney, windows}
  const { w = 1, h = .8, d = .8, wall = C.cream, roofC = C.red, door = C.wood, trim = C.wood, chimney = true, windows = 2 } = o;
  const t = group(g, x, 0, z);
  box(t, 0, h / 2, 0, w, h, d, wall);
  box(t, 0, .05, 0, w * 1.06, .1, d * 1.06, shade(wall, .82));
  roof(t, 0, h, 0, w * 1.18, h * .62, d * 1.12, roofC);
  box(t, 0, h * .24, d / 2 + .01, w * .2, h * .48, .02, door);
  for (let i = 0; i < windows; i++) { const wx = (i % 2 ? 1 : -1) * w * .3; box(t, wx, h * .58, d / 2 + .01, w * .17, h * .2, .02, '#f3d68e'); box(t, wx, h * .58, d / 2 + .02, w * .2, .02, .01, trim); }
  if (chimney) box(t, w * .28, h * 1.28, -d * .12, w * .12, h * .35, w * .12, shade(wall, .8));
  return t;
}
// a wooden signpost with a printed board; dir = 1 points right, -1 left
export function sign(g, x, z, text, dir = 1, c = C.honey) {
  const t = group(g, x, 0, z);
  box(t, 0, .34, 0, .06, .68, .06, C.wood);
  const w = Math.max(.5, text.length * .062 + .16);
  const pts = [[-w / 2, 0], [w / 2 - .1, 0], [w / 2, .09], [w / 2 - .1, .18], [-w / 2, .18]].map(p => [p[0] * dir, p[1]]);
  slab(t, pts, .04, c, dir * (w / 2 - .06), .44, .03);
  const lab = label(text, { w: w * .86, h: .13, color: '#3a2c1d' }); lab.position.set(dir * (w / 2 - .09), .53, .055); t.add(lab);
  return t;
}
// printed words on card: returns a plane facing +z
export function label(text, { w = 1, h = .2, color = '#2c2a26', font = '700 64px BookSerif, Georgia, serif', bg = null } = {}) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.max(32, Math.round(512 * h / w)); const x = c.getContext('2d');
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); }
  x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle';
  let size = 64; x.font = font.replace('64px', size + 'px');
  while ((x.measureText(text).width > c.width * .92 || size > c.height * .8) && size > 8) { size -= 2; x.font = font.replace('64px', size + 'px'); }
  x.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
  const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshLambertMaterial({ map: tex, transparent: !bg, alphaTest: bg ? 0 : .1 }));
  m.userData.text = text; return m;
}

// colour helper: multiply a hex colour's lightness
export function shade(hex, k) {
  const c = new T.Color(hex); const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l * k)));
  return '#' + c.getHexString();
}
