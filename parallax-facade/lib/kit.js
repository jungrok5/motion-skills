// parallax-facade · kit.js — the town kit. Every builder takes a Batch (B, from F.batch() or F.part) and draws in
// world units (1 unit ≈ 1 m). Local frames: B.at(x, z, ry) returns a batch whose parts are moved to (x, z) and turned
// ry degrees (ry 90 = the local front +z faces +x). Buildings are authored with their front face on z = 0 facing +z,
// centred on x = 0, reaching back to z = −d. Colours are CSS strings. Nothing here draws a specific real place: towns,
// towers and props are parameters; the film designs them per topic.
import { THREE, Batch, prep, polyGeo, rng, lerp } from "./facade.js";

const D2R = Math.PI / 180;
const GEO = {};
const cboxGeo = () => GEO.cbox ??= prep(new THREE.BoxGeometry(1, 1, 1));

// ---------- Batch extensions: local frames, centred boxes, free-oriented sticks ----------
Batch.prototype.at = function (x = 0, z = 0, ry = 0, y = 0) {
  const parent = this, M = new THREE.Matrix4().makeRotationY(ry * D2R).setPosition(x, y, z);
  const p = Object.create(this);
  p.add = (g, c, o = {}) => parent.add(g, c, { ...o, matrix: o.matrix ? M.clone().multiply(o.matrix) : M });
  return p;
};
/** a box centred on (x, y, z), turned rx / ry / rz degrees */
Batch.prototype.cbox = function (x, y, z, w, h, d, color, o = {}) { return this.add(cboxGeo(), color, { ...o, x, y, z, sx: w, sy: h, sz: d }); };
/** a thin stick from point a to point b ([x, y, z]), t thick */
Batch.prototype.stick = function (a, b, t, color, o = {}) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), dir = Bv.clone().sub(A), len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize());
  const m = new THREE.Matrix4().compose(A.add(Bv).multiplyScalar(0.5), q, new THREE.Vector3(len, t, t));
  return this.add(cboxGeo(), color, { ...o, matrix: o.matrix ? o.matrix.clone().multiply(m) : m });
};
/** a convex solid from its corner points (faces auto-wound outward) */
Batch.prototype.solid = function (faces, color, o = {}) { return this.add(convex(faces), color, o); };

/** polyGeo, but every face is wound to point away from the solid's centroid (convex solids only) */
export function convex(faces) {
  const c = new THREE.Vector3(); let n = 0;
  for (const f of faces) for (const p of f) { c.x += p[0]; c.y += p[1]; c.z += p[2]; n++; }
  c.divideScalar(n);
  const fixed = faces.map((f) => {
    const a = new THREE.Vector3(...f[0]), b = new THREE.Vector3(...f[1]), d = new THREE.Vector3(...f[2]);
    const nrm = b.clone().sub(a).cross(d.clone().sub(a));
    const fc = f.reduce((s, p) => s.add(new THREE.Vector3(...p)), new THREE.Vector3()).divideScalar(f.length);
    return nrm.dot(fc.sub(c)) < 0 ? [...f].reverse() : f;
  });
  return polyGeo(fixed);
}

// ---------- roofs (local frame of a building: x ∈ [−w/2, w/2], z ∈ [−d, 0], walls up to y = h) ----------
function gableRoof(B, w, d, h, rh, o, color, wall, alongZ = false) {
  // the wall-coloured gable (a prism) + two roof slabs with overhang o
  const zc = -d / 2, t = 0.22;
  if (!alongZ) {
    B.solid([[[-w / 2, h, 0], [w / 2, h, 0], [w / 2, h + rh, zc], [-w / 2, h + rh, zc]], [[-w / 2, h, -d], [w / 2, h, -d], [w / 2, h + rh, zc], [-w / 2, h + rh, zc]],
      [[-w / 2, h, 0], [-w / 2, h, -d], [-w / 2, h + rh, zc]], [[w / 2, h, 0], [w / 2, h, -d], [w / 2, h + rh, zc]], [[-w / 2, h, 0], [w / 2, h, 0], [w / 2, h, -d], [-w / 2, h, -d]]], wall);
    const a = Math.atan2(rh, d / 2), s = Math.hypot(d / 2, rh) + o;
    for (const sg of [1, -1]) {
      const cz = zc + sg * (Math.cos(a) * s / 2 - 0.0), cy = h + rh - Math.sin(a) * s / 2 + t / 2;
      B.cbox(0, cy + 0.02, zc + sg * Math.cos(a) * (s / 2), w + 2 * o, t, s, color, { rx: sg * a / D2R });
      void cz;
    }
    B.cbox(0, h + rh + t * 0.6, zc, w + 2 * o, t * 1.3, t * 1.4, color); // ridge cap
  } else {
    B.solid([[[-w / 2, h, 0], [-w / 2, h, -d], [0, h + rh, -d], [0, h + rh, 0]], [[w / 2, h, 0], [w / 2, h, -d], [0, h + rh, -d], [0, h + rh, 0]],
      [[-w / 2, h, 0], [w / 2, h, 0], [0, h + rh, 0]], [[-w / 2, h, -d], [w / 2, h, -d], [0, h + rh, -d]], [[-w / 2, h, 0], [w / 2, h, 0], [w / 2, h, -d], [-w / 2, h, -d]]], wall);
    const a = Math.atan2(rh, w / 2), s = Math.hypot(w / 2, rh) + o;
    for (const sg of [1, -1]) B.cbox(sg * Math.cos(a) * (s / 2), h + rh - Math.sin(a) * s / 2 + t / 2 + 0.02, zc, s, t, d + 2 * o, color, { rz: -sg * a / D2R });
    B.cbox(0, h + rh + t * 0.6, zc, t * 1.4, t * 1.3, d + 2 * o, color);
  }
}
function hipRoof(B, w, d, h, rh, o, color, curl = 0, under = color) {
  // one surface: an eave ring (subdivided, corners lifted by curl — the upturned eaves of tiled roofs) fanned to the
  // ridge; every triangle faces up. A slab under it gives the eave its thickness.
  const zc = -d / 2, W = w / 2 + o, Dd = d / 2 + o, r = Math.max(0, (w - d) / 2), n = 6, lift = curl * Math.min(W, Dd) * 0.12;
  const eave = (x, z) => [x, h + lift * Math.max(Math.abs(x) / W, Math.abs(z - zc) / Dd) ** 3, z];
  const tris = [];
  const fan = (a, b, ridgeA, ridgeB) => {
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      const e0 = eave(lerp(a[0], b[0], u0), lerp(a[1], b[1], u0)), e1 = eave(lerp(a[0], b[0], u1), lerp(a[1], b[1], u1));
      const r0 = [lerp(ridgeA[0], ridgeB[0], u0), h + rh, ridgeA[1]], r1 = [lerp(ridgeA[0], ridgeB[0], u1), h + rh, ridgeA[1]];
      tris.push([e0, e1, r1]); if (ridgeA[0] !== ridgeB[0]) tris.push([e0, r1, r0]);
    }
  };
  fan([-W, zc + Dd], [W, zc + Dd], [-r, zc], [r, zc]);
  fan([W, zc - Dd], [-W, zc - Dd], [r, zc], [-r, zc]);
  fan([-W, zc - Dd], [-W, zc + Dd], [-r, zc], [-r, zc]);
  fan([W, zc + Dd], [W, zc - Dd], [r, zc], [r, zc]);
  const pos = [];
  for (const [p0, p1, p2] of tris) {
    const nrm = new THREE.Vector3(...p1).sub(new THREE.Vector3(...p0)).cross(new THREE.Vector3(...p2).sub(new THREE.Vector3(...p0)));
    if (nrm.y < 0) pos.push(...p0, ...p2, ...p1); else pos.push(...p0, ...p1, ...p2);
  }
  // underside (flat at the eave line) closes the shell so the ink hull has a back
  pos.push(-W, h, zc + Dd, W, h, zc - Dd, W, h, zc + Dd, -W, h, zc + Dd, -W, h, zc - Dd, W, h, zc - Dd);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  B.add(g, color);
  B.cbox(0, h + rh + 0.1, zc, 2 * r + 0.5, 0.28, 0.42, color); // ridge
  B.box(0, h - 0.24, zc, 2 * W - 0.4, 0.26, 2 * Dd - 0.4, under);
}

// ---------- building ----------
/** A building in its local frame (place it with B.at(x, zFront, ry)).
 *  { w, h, d, wall, trim, base: { h, color }, roof: { kind: "flat" | "gable" | "gableZ" | "hip" | "stepped" | "none",
 *    color, h, over, curl, rail, parapet }, win: { rows, cols, w, h, y0, floor, color, frame, sill, faces: ["front"],
 *    lit (glow) }, door: { x, w, h, color }, shop: { h, glass, frame }, awning: { color, w, x, y, depth, stripes },
 *  roof.under: the colour of the eave band under a hip roof (rafters) · balcony: { row, color }, lod: 0..1 (1 = far: windows on, small details off) } */
export function building(B, o) {
  const w = o.w ?? 8, h = o.h ?? 8, d = o.d ?? 8, wall = o.wall ?? "#f4f1f6", trim = o.trim ?? wall, lod = o.lod ?? 0;
  B.box(0, 0, -d / 2, w, h, d, wall);
  if (o.base) B.box(0, 0, -d / 2, w + 0.12, o.base.h ?? 0.6, d + 0.12, o.base.color ?? trim);
  const R = o.roof ?? { kind: "flat" };
  const rc = R.color ?? trim;
  if (R.kind === "flat" || !R.kind) {
    if (R.parapet !== false) B.box(0, h, -d / 2, w + 0.16, R.parapet ?? 0.35, d + 0.16, rc);
    if (R.rail && lod < 0.5) { const n = Math.max(2, Math.round(w / 1.2)); for (let i = 0; i <= n; i++) B.box(-w / 2 + (i * w) / n, h, -0.15, 0.06, 1.0, 0.06, R.rail, { ink: false }); B.box(0, h + 0.95, -0.15, w, 0.07, 0.07, R.rail); }
    if (R.box) B.box(R.box.x ?? 0, h, -d * 0.55, R.box.w ?? w * 0.3, R.box.h ?? 1.2, R.box.d ?? d * 0.3, R.box.color ?? wall);
  } else if (R.kind === "gable" || R.kind === "gableZ") gableRoof(B, w, d, h, R.h ?? Math.min(w, d) * 0.32, R.over ?? 0.35, rc, wall, R.kind === "gableZ");
  else if (R.kind === "hip") hipRoof(B, w, d, h, R.h ?? Math.min(w, d) * 0.3, R.over ?? 0.6, rc, R.curl ?? 0, R.under ?? rc);
  else if (R.kind === "stepped") {
    // a stepped gable wall front and back (white with dark caps), a dark pitched roof between them
    const n = R.steps ?? 2, sh = R.stepH ?? 0.9, cap = R.cap ?? rc;
    gableRoof(B, w * 0.98, d, h, (n * sh) * 0.85, 0.05, rc, wall);
    for (const zf of [0, -d + 0.4]) for (let i = 0; i <= n; i++) {
      const ww = w * (1 - i / (n + 1.2)), y = h + i * sh;
      B.box(0, y - (i ? sh : 0), zf - 0.2, ww, i ? sh : 0.01, 0.4, wall);
      B.box(0, y, zf - 0.2, ww + 0.25, 0.22, 0.6, cap);
    }
  }
  // windows
  const W = o.win;
  if (W) {
    const faces = W.faces ?? ["front"], floor = W.floor ?? (h - (W.y0 ?? 1.2)) / Math.max(1, W.rows ?? 2);
    const frame = W.frame ?? trim, glass = W.color ?? "#5a74d6";
    for (const f of faces) {
      const fw = f === "front" || f === "back" ? w : d;
      const F = f === "front" ? B.at(0, 0, 0) : f === "back" ? B.at(0, -d, 180) : f === "right" ? B.at(w / 2, -d / 2, 90) : B.at(-w / 2, -d / 2, -90);
      const cols = W.cols ?? Math.max(1, Math.round(fw / 3)), rows = W.rows ?? 2;
      const ww = W.w ?? Math.min(1.6, (fw / cols) * 0.55), wh = W.h ?? floor * 0.5;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (W.skip && W.skip(r, c, f)) continue;
        const u = -fw / 2 + ((c + 0.5) * fw) / cols, v = (W.y0 ?? 1.2) + r * floor + (floor - wh) * 0.45;
        if (lod < 0.6 && frame !== wall) F.box(u, v - 0.08, 0, ww + 0.18, wh + 0.16, 0.12, frame);
        F.box(u, v, 0, ww, wh, 0.18, glass, { glow: W.lit });
        if (W.mullion && lod < 0.4) F.box(u, v, 0.02, 0.06, wh, 0.2, frame);
        if (W.sill && lod < 0.4) F.box(u, v - 0.14, 0.05, ww + 0.3, 0.1, 0.3, W.sill);
      }
    }
  }
  if (o.shop && lod < 0.6) { const s = o.shop; B.box(s.x ?? 0, 0.15, 0, s.w ?? w * 0.8, s.h ?? 2.6, 0.16, s.glass ?? "#4d68cc"); B.box(s.x ?? 0, (s.h ?? 2.6) + 0.15, 0, (s.w ?? w * 0.8) + 0.2, 0.18, 0.2, s.frame ?? trim); }
  if (o.door && lod < 0.6) { const dr = o.door; B.box(dr.x ?? 0, 0, 0, dr.w ?? 1.1, dr.h ?? 2.2, 0.14, dr.color ?? "#6a4a3a"); }
  if (o.awning && lod < 0.6) {
    const a = o.awning, aw = a.w ?? w * 0.7, ad = a.depth ?? 1.2, ay = a.y ?? 3.0;
    B.cbox(a.x ?? 0, ay, ad / 2 * 0.9, aw, 0.12, ad, a.color ?? "#f0a0b8", { rx: 18 });
    B.box(a.x ?? 0, ay - 0.45, ad * 0.9, aw, 0.4, 0.06, a.color ?? "#f0a0b8");
  }
  if (o.balcony && lod < 0.5) { const b = o.balcony, y = (W?.y0 ?? 1.2) + (b.row ?? 1) * ((h - (W?.y0 ?? 1.2)) / Math.max(1, W?.rows ?? 2)); B.box(0, y - 0.1, 0.5, w * 0.8, 0.12, 1.0, b.color ?? trim); B.box(0, y, 0.98, w * 0.8, 0.8, 0.06, b.rail ?? b.color ?? trim); }
  return B;
}

// ---------- towers: a stack of tiers ----------
/** tiers: [{ shape: "box" | "cyl" | "cone" | "ball" | "hip", w, d, h, color, seg, eave: { over, h, color, curl },
 *  win: { rows, cols, color, lit }, clock: { r, color, hands }, band: { color, h } }], spire: { h, r, color }.
 *  Returns the top y. Pagodas, clock towers, lighthouses, minarets, TV towers, gate towers — all tiers. */
export function tower(B, o) {
  let y = o.y ?? 0;
  for (const t of o.tiers) {
    const w = t.w ?? 3, d = t.d ?? w, h = t.h ?? 3, c = t.color ?? "#eee";
    if (t.shape === "cyl") B.cyl(0, y, 0, w / 2, (t.top ?? w) / 2, h, c, { seg: t.seg ?? 16 });
    else if (t.shape === "cone") B.cyl(0, y, 0, w / 2, 0.02, h, c, { seg: t.seg ?? 12 });
    else if (t.shape === "ball") B.ball(0, y + w / 2, 0, w / 2, c);
    else if (t.shape === "hip") hipRoof(B.at(0, d / 2), w, d, y, h, t.over ?? 0.4, c, t.curl ?? 0);
    else B.box(0, y, 0, w, h, d, c);
    if (t.band) B.box(0, y + h - (t.band.h ?? 0.3), 0, w + 0.1, t.band.h ?? 0.3, d + 0.1, t.band.color);
    if (t.win) {
      const rows = t.win.rows ?? 1, cols = t.win.cols ?? 1, wh = t.win.h ?? (h / rows) * 0.45, ww = t.win.w ?? Math.min(0.8, (w / cols) * 0.5);
      for (const ry of t.win.faces ?? [0]) { const F = B.at(0, 0, ry); for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) F.box(-w / 2 + ((k + 0.5) * w) / cols, y + ((r + 0.5) * h) / rows - wh / 2, (t.shape === "cyl" ? w / 2 : d / 2), ww, wh, 0.14, t.win.color ?? "#ffd56a", { glow: t.win.lit }); }
    }
    if (t.clock) { const r = t.clock.r ?? w * 0.32; B.cyl(0, y + h * 0.55, d / 2 + 0.02, r, r, 0.12, t.clock.color ?? "#fdfbf2", { rx: 90, seg: 24 }); B.cbox(0, y + h * 0.55 + r * 0.3, d / 2 + 0.1, 0.12, r * 0.6, 0.06, "#333"); B.cbox(r * 0.22, y + h * 0.55, d / 2 + 0.1, r * 0.45, 0.1, 0.06, "#333"); }
    y += h;
    if (t.eave) { const e = t.eave, ew = w + 2 * (e.over ?? 1) - 0.6, ed = d + 2 * (e.over ?? 1) - 0.6; hipRoof(B.at(0, ed / 2), ew, ed, y - 0.1, e.h ?? 0.8, 0.3, e.color ?? "#333", e.curl ?? 0); y += e.gap ?? 0.15; }
  }
  if (o.spire) { B.cyl(0, y, 0, o.spire.r ?? 0.25, 0.03, o.spire.h ?? 2, o.spire.color ?? "#e2b23a", { seg: 8 }); y += o.spire.h ?? 2; }
  return y;
}

// ---------- trees ----------
/** kind "round" (balls), "palm" (bent trunk + fronds), "cone" (stacked cones), "column" (a cypress), "willow" (round +
 *  hanging strands). { h, r, color, dark, trunk, lean, seed } */
export function tree(B, x, z, o = {}) {
  const r = rng(o.seed ?? Math.round(x * 13 + z * 7)), h = o.h ?? 5, col = o.color ?? "#3f9a52", dark = o.dark ?? "#2f7d45", trunk = o.trunk ?? "#7a5236";
  const kind = o.kind ?? "round";
  if (kind === "palm") {
    const n = 7, lean = o.lean ?? 4; let p = [x, 0, z];
    for (let i = 0; i < n; i++) { const q = [x + (lean * D2R * h) * ((i + 1) / n) ** 2, ((i + 1) * h) / n, z]; B.stick(p, q, 0.32 - i * 0.02, i % 2 ? trunk : "#8a6244"); p = q; }
    const fr = o.fronds ?? 9, L = o.r ?? h * 0.42;
    for (let i = 0; i < fr; i++) {
      const a = (i / fr) * Math.PI * 2 + r() * 0.3, e1 = 0.35 + r() * 0.25, e2 = -0.55 - r() * 0.3;
      const m = [p[0] + Math.cos(a) * L * 0.5 * Math.cos(e1), p[1] + L * 0.5 * Math.sin(e1), p[2] + Math.sin(a) * L * 0.5 * Math.cos(e1)];
      const e = [m[0] + Math.cos(a) * L * 0.55 * Math.cos(e2), m[1] + L * 0.55 * Math.sin(e2), m[2] + Math.sin(a) * L * 0.55 * Math.cos(e2)];
      for (const [a0, a1, k] of [[p, m, 0.9], [m, e, 0.55]]) {
        const A = new THREE.Vector3(...a0), Bv = new THREE.Vector3(...a1), dir = Bv.clone().sub(A), len = dir.length();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize());
        B.add(cboxGeo(), i % 2 ? col : dark, { matrix: new THREE.Matrix4().compose(A.add(Bv).multiplyScalar(0.5), q, new THREE.Vector3(len, 0.07, k)) });
      }
    }
    B.ball(p[0], p[1], p[2], 0.35, trunk);
    return p;
  }
  if (kind === "cone") { B.cyl(x, 0, z, 0.2, 0.2, h * 0.25, trunk, { seg: 6 }); for (let i = 0; i < 3; i++) B.cyl(x, h * (0.2 + i * 0.22), z, (o.r ?? h * 0.3) * (1 - i * 0.25), 0.02, h * 0.38, i % 2 ? dark : col, { seg: 8 }); return [x, h, z]; }
  if (kind === "column") { B.cyl(x, 0, z, 0.15, 0.15, h * 0.2, trunk, { seg: 6 }); B.ball(x, h * 0.55, z, o.r ?? h * 0.16, col, { s: [1, 2.8, 1] }); return [x, h, z]; }
  // round / willow
  const R = o.r ?? h * 0.32;
  B.cyl(x, 0, z, 0.22, 0.17, h * 0.6, trunk, { seg: 7 });
  const blobs = o.blobs ?? 4;
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2 + r(), rr = R * (0.6 + r() * 0.3);
    B.ball(x + Math.cos(a) * R * 0.45, h - R * 0.6 + r() * R * 0.5, z + Math.sin(a) * R * 0.35, rr, i % 2 ? dark : col, { s: [1, 0.85, 1] });
  }
  B.ball(x, h - R * 0.2, z, R * 0.75, col, { s: [1, 0.85, 1] });
  if (kind === "willow") for (let i = 0; i < 10; i++) { const a = r() * Math.PI * 2, rr = R * (0.7 + r() * 0.3); B.box(x + Math.cos(a) * rr, h - R * 0.6 - 1.4 - r(), z + Math.sin(a) * rr, 0.08, 1.6 + r(), 0.08, dark, { ink: false }); }
  return [x, h, z];
}

// ---------- street furniture ----------
export function lamp(B, x, z, o = {}) {
  const h = o.h ?? 4.5, c = o.color ?? "#e8e6ee", arm = o.arm ?? 1.2, dir = o.dir ?? 1;
  B.cyl(x, 0, z, 0.09, 0.09, h, c, { seg: 6 });
  if (arm) { B.box(x + (dir * arm) / 2, h - 0.05, z, arm, 0.12, 0.12, c); B.box(x + dir * arm, h - 0.25, z, 0.55, 0.2, 0.3, c); }
  if (o.head) B.box(x, h, z, 0.35, 0.5, 0.35, o.head, { glow: o.lit });
  return [x, h, z];
}
/** a utility / lantern pole; returns its top for wires */
export function pole(B, x, z, o = {}) { const h = o.h ?? 6, c = o.color ?? "#3b3a4a"; B.cyl(x, 0, z, 0.12, 0.1, h, c, { seg: 6 }); if (o.cross !== false) B.box(x, h - 0.5, z, o.cross ?? 1.4, 0.12, 0.12, c); return [x, h - 0.45, z]; }
/** a sagging wire from a to b; lanterns: { every, color, size } hang on it */
export function wire(B, a, b, o = {}) {
  const n = o.n ?? 12, sag = o.sag ?? 0.6, c = o.color ?? "#2a2838", pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n; pts.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) - sag * 4 * u * (1 - u), lerp(a[2], b[2], u)]); }
  for (let i = 0; i < n; i++) B.stick(pts[i], pts[i + 1], o.t ?? 0.05, c, { ink: false });
  if (o.lanterns) {
    const L = o.lanterns, every = L.every ?? 2;
    for (let i = 1; i < n; i += every) { const p = pts[i], s = L.size ?? 0.45; lantern(B, p[0], p[1] - 0.35 - s, p[2], { color: L.color, size: s, lit: L.lit }); B.stick(p, [p[0], p[1] - 0.35, p[2]], 0.03, c, { ink: false }); }
  }
  return pts;
}
export function lantern(B, x, y, z, o = {}) { const s = o.size ?? 0.45, c = o.color ?? "#e8432f"; B.cyl(x, y, z, s * 0.5, s * 0.5, s, c, { seg: 10, glow: o.lit }); B.cyl(x, y - 0.06, z, s * 0.3, s * 0.3, 0.08, "#2a2020", { seg: 8 }); B.cyl(x, y + s, z, s * 0.3, s * 0.3, 0.08, "#2a2020", { seg: 8 }); }
export function bush(B, x, z, o = {}) {
  const w = o.w ?? 2, h = o.h ?? 0.9, r = rng(o.seed ?? Math.round(x * 31 + z * 17)), col = o.color ?? "#3e9b55";
  if (o.planter) B.box(x, 0, z, w + 0.3, o.planter.h ?? 0.6, o.d ?? 1.0, o.planter.color ?? "#f2eef6");
  const y0 = o.planter ? o.planter.h ?? 0.6 : 0, n = Math.max(2, Math.round(w / 0.7));
  for (let i = 0; i < n; i++) B.ball(x - w / 2 + ((i + 0.5) * w) / n, y0 + h * 0.45, z + (r() - 0.5) * 0.3, h * (0.55 + r() * 0.2), i % 2 ? o.dark ?? "#2f8046" : col, { s: [1, 0.8, 0.8] });
  if (o.flowers) for (let i = 0; i < n * 2; i++) B.ball(x - w / 2 + r() * w, y0 + h * (0.5 + r() * 0.4), z + (o.d ?? 1) * 0.35, 0.12, o.flowers, { ink: false });
}
export function bench(B, x, z, o = {}) { const c = o.color ?? "#9fb2e6"; B.box(x, 0.45, z, 1.8, 0.1, 0.5, c); B.box(x, 0.55, z - 0.22, 1.8, 0.5, 0.08, c); for (const s of [-0.75, 0.75]) B.box(x + s, 0, z, 0.08, 0.45, 0.4, "#777"); }
export function postbox(B, x, z, o = {}) { const c = o.color ?? "#e8483a"; B.box(x, 0, z, 0.18, 0.8, 0.18, c); B.box(x, 0.8, z, 0.6, 0.75, 0.45, c); B.box(x, 1.3, z + 0.23, 0.4, 0.06, 0.04, "#fff", { ink: false }); }

// ---------- ground, roads, water, bridges ----------
/** the ground plane (huge, so no world edge ever shows) and the road strip in front of the facade */
export function ground(F, o = {}) {
  const B = F.batch({ ink: false, cast: false, haze: false, name: "ground" });
  B.box(0, -0.2, -300, 2400, 0.2, 2400, o.color ?? F.look.ground);
  F.add(B.build());
}
/** a road along x from z0 (back) to z1 (front): curb, dashed centre line */
export function road(B, o = {}) {
  const x0 = o.x0 ?? -200, x1 = o.x1 ?? 200, z0 = o.z0 ?? 0.6, z1 = o.z1 ?? 9, c = o.color ?? B.film.look.road, w = x1 - x0, xc = (x0 + x1) / 2;
  B.box(xc, -0.05, (z0 + z1) / 2, w, 0.06, z1 - z0, c, { ink: false });
  if (o.curb !== false) B.box(xc, -0.05, z0 - 0.15, w, 0.22, 0.3, o.curb ?? "#c9c8de", { ink: false });
  if (o.walk) B.box(xc, -0.05, (o.walk.z0 + o.walk.z1) / 2, w, 0.18, o.walk.z1 - o.walk.z0, o.walk.color ?? "#dcd9ea", { ink: false });
  if (o.dash !== false) for (let x = x0; x < x1; x += 4) B.box(x, 0.02, (z0 + z1) / 2, 2, 0.02, 0.18, o.dash ?? "#f1eff7", { ink: false, haze: false });
}
/** a canal from z0 (far) to z1 (near), centred on x: water at street level between raised quays (qw wide, qh high)
 *  with stone edges and ripple glints. Stand the canal-side houses on the quays (y = qh) or behind them. */
export function canal(B, o = {}) {
  const x = o.x ?? 0, w = o.w ?? 5, z0 = o.z0 ?? -80, z1 = o.z1 ?? 0, L = z1 - z0, zc = (z0 + z1) / 2, r = rng(o.seed ?? 5);
  const qw = o.qw ?? 2.5, qh = o.qh ?? 0.7;
  B.box(x, 0, zc, w, 0.04, L, o.water ?? "#3fb0a8", { ink: false });
  for (const s of [-1, 1]) {
    B.box(x + s * (w / 2 + qw / 2), 0, zc, qw, qh, L, o.quay ?? "#dcdae6");
    B.box(x + s * (w / 2 + 0.15), qh, zc, 0.3, 0.12, L, o.edge ?? "#c4c2d2");
  }
  const n = Math.round(L / 2.2);
  for (let i = 0; i < n; i++) B.box(x + (r() - 0.5) * (w - 1), 0.05, z0 + r() * L, 0.8 + r() * 1.4, 0.02, 0.12, o.glint ?? "#7fd6cf", { ink: false });
  return { qh, qw };
}
/** an arched stone bridge across x (span along x), deck at height h */
export function bridge(B, o = {}) {
  const x = o.x ?? 0, z = o.z ?? -10, span = o.span ?? 6, w = o.w ?? 2.4, h = o.h ?? 2.4, c = o.color ?? "#d4d2de", R = o.r ?? span * 0.38, n = 18;
  for (let i = 0; i < n; i++) {
    const u0 = -span / 2 + (i * span) / n, u1 = u0 + span / n, um = (u0 + u1) / 2, open = Math.abs(um) < R ? Math.sqrt(R * R - um * um) : 0;
    const y0 = open + (o.base ?? -0.6);
    B.box(x + um, y0, z, span / n + 0.01, h - y0, w, c, { ink: false });
  }
  B.box(x, h, z, span + 0.4, 0.25, w + 0.2, o.deck ?? c);
  for (const s of [-1, 1]) B.box(x, h + 0.25, z + s * (w / 2 - 0.1), span, 0.6, 0.18, o.rail ?? c);
}
/** a small boat (its own batch: move it in F.update) */
export function boat(F, o = {}) {
  const B = F.batch({ name: "boat" }), c = o.color ?? "#7a4a32";
  B.solid([[[-1.6, 0, -0.6], [1.6, 0, -0.6], [2.2, 0.6, -0.8], [-2.2, 0.6, -0.8]], [[-1.6, 0, 0.6], [1.6, 0, 0.6], [2.2, 0.6, 0.8], [-2.2, 0.6, 0.8]],
    [[-1.6, 0, -0.6], [-1.6, 0, 0.6], [-2.2, 0.6, 0.8], [-2.2, 0.6, -0.8]], [[1.6, 0, -0.6], [1.6, 0, 0.6], [2.2, 0.6, 0.8], [2.2, 0.6, -0.8]],
    [[-1.6, 0, -0.6], [1.6, 0, -0.6], [1.6, 0, 0.6], [-1.6, 0, 0.6]], [[-2.2, 0.6, -0.8], [2.2, 0.6, -0.8], [2.2, 0.6, 0.8], [-2.2, 0.6, 0.8]]], c);
  if (o.canopy !== false) B.cyl(0, 0.6, 0, 0.75, 0.75, 1.6, o.canopy ?? "#3a3236", { rz: 90, seg: 10 });
  const g = B.build(); if (o.ry) g.rotation.y = o.ry * D2R; return F.add(g);
}

// ---------- moving things (each registers its own update, all loop-periodic) ----------
/** toy cars on lanes: lanes [{ z, dir: ±1, n, laps }], x0..x1 the stretch they wrap over */
export function traffic(F, o = {}) {
  const r = rng(o.seed ?? 3), cols = o.colors ?? ["#f2c94c", "#e8505b", "#4a7fe8", "#ffffff", "#f29bb8", "#59c2a0"], x0 = o.x0 ?? -60, x1 = o.x1 ?? 60, span = x1 - x0, cars = [];
  for (const lane of o.lanes ?? [{ z: 3, dir: 1 }, { z: 6, dir: -1 }]) {
    const n = lane.n ?? 6, laps = lane.laps ?? 1;
    for (let i = 0; i < n; i++) {
      const B = F.batch({ name: "car" }), c = cols[Math.floor(r() * cols.length)], s = o.size ?? 1;
      B.cbox(0, 0.45 * s, 0, 3.2 * s, 0.55 * s, 1.5 * s, c); B.cbox(-0.15 * s, 0.95 * s, 0, 1.7 * s, 0.5 * s, 1.3 * s, o.glass ?? "#d9e2ff");
      for (const wx of [-1, 1]) for (const wz of [-1, 1]) B.cyl(wx * 1.0 * s, 0.33 * s, wz * 0.7 * s - 0.1 * s, 0.33 * s, 0.33 * s, 0.2 * s, "#2a2a33", { rx: 90, seg: 8, ink: false });
      const g = F.add(B.build()); g.rotation.y = lane.dir > 0 ? 0 : Math.PI;
      const off = (i + r() * 0.6) / n;
      cars.push({ g, lane, off, laps });
    }
  }
  F.update((t) => { for (const c of cars) { const u = (F.lap(t, c.laps) + c.off) % 1; c.g.position.set(c.lane.dir > 0 ? x0 + u * span : x1 - u * span, 0, c.lane.z); } });
  return cars;
}
/** birds: small dark wings that flap and drift across the sky, looping */
export function birds(F, o = {}) {
  const r = rng(o.seed ?? 9), n = o.n ?? 6, flock = [];
  for (let i = 0; i < n; i++) {
    const B = F.batch({ name: "bird", ink: false, cast: false, haze: false }), c = o.color ?? "#2a2a44", s = o.size ?? 1.2;
    const L = new THREE.Group(), R = new THREE.Group();
    const wing = (sg) => { const b = F.batch({ ink: false, cast: false, haze: false }); b.cbox(sg * 0.5 * s, 0, 0, s, 0.08 * s, 0.35 * s, c); return b.build(); };
    L.add(wing(-1)); R.add(wing(1)); B.cbox(0, 0, 0, 0.25 * s, 0.15 * s, 0.4 * s, c);
    const g = new THREE.Group(); g.add(B.build(), L, R); F.add(g);
    flock.push({ g, L, R, x: (o.x0 ?? -60) + r() * ((o.x1 ?? 60) - (o.x0 ?? -60)), y: (o.y ?? 30) + r() * (o.dy ?? 10), z: (o.z ?? -60) + (r() - 0.5) * (o.dz ?? 30), ph: r(), flap: 2 + Math.round(r() * 2) });
  }
  const span = (o.x1 ?? 60) - (o.x0 ?? -60);
  F.update((t) => { for (const b of flock) { const u = (F.lap(t, o.laps ?? 1) + b.ph) % 1; b.g.position.set((o.x0 ?? -60) + ((b.x - (o.x0 ?? -60) + u * span * (o.dir ?? 1) + span * 4) % span), b.y + Math.sin(u * Math.PI * 4) * 0.8, b.z); const a = Math.sin(F.lap(t, b.flap * 8) * Math.PI * 2) * 0.6; b.L.rotation.z = a; b.R.rotation.z = -a; } });
}
/** a flat cartoon cloud facing the camera (a cluster of squashed balls), far behind */
export function cloud(B, x, y, z, o = {}) {
  const r = rng(o.seed ?? Math.round(x + y * 3)), w = o.w ?? 14, n = o.n ?? 5, c = o.color ?? "#ffffff";
  for (let i = 0; i < n; i++) { const u = (i / (n - 1) - 0.5) * w * 0.8, rr = w * (0.16 + r() * 0.1) * (1 - Math.abs(u / w) * 0.8); B.ball(x + u, y + rr * 0.3 + r() * w * 0.04, z, rr, c, { s: [1.15, 0.8, 0.2], haze: false }); }
  B.ball(x, y + w * 0.06, z, w * 0.24, c, { s: [1.5, 0.75, 0.2], haze: false });
}

// ---------- filling the town behind: rows and fields ----------
/** a row of buildings along x at front z, facing +z (ry 0) or another way; make(r, i, x, w) → building options | null.
 *  gaps: [[x0, x1], ...] left empty (the alley the reveal looks through). Returns the placed footprints. */
export function row(B, o) {
  const r = rng(o.seed ?? 11), out = []; let x = o.x0;
  while (x < o.x1) {
    const w = o.width ? o.width(r) : 5 + r() * 4, xc = x + w / 2;
    if ((o.gaps ?? []).some(([a, b]) => xc + w / 2 > a && xc - w / 2 < b)) { x += 0.5; continue; }
    const opts = o.make(r, out.length, xc, w);
    if (opts) { building(B.at(xc, o.z ?? 0, o.ry ?? 0), { w: w - (o.gap ?? 0.2), ...opts }); out.push({ x: xc, w }); }
    x += w;
  }
  return out;
}
/** fill [x0, x1] × [z0, z1] (z1 nearer) with rows of buildings; avoid: [[x0, x1, z0, z1], ...]; make(r, { x, z, w, d,
 *  depth (0 near .. 1 far) }) → building options (front faces +z) | null. Far buildings get lod → fewer details. */
export function field(B, o) {
  const r = rng(o.seed ?? 21), cw = o.cell?.[0] ?? 7, cd = o.cell?.[1] ?? 9, n = { placed: 0 };
  for (let z = o.z1; z > o.z0; z -= cd + (o.street ?? 2.5)) {
    let x = o.x0 + r() * cw * 0.5;
    while (x < o.x1) {
      const w = cw * (0.65 + r() * 0.5), d = cd * (0.8 + r() * 0.2), xc = x + w / 2;
      x += w + (r() < 0.15 ? 2.5 : 0.3);
      if ((o.avoid ?? []).some(([a, b, c, e]) => xc + w / 2 > a && xc - w / 2 < b && z > c && z - d < e)) continue;
      const depth = Math.min(1, (o.z1 - z) / Math.max(1, o.z1 - o.z0));
      const opts = o.make(r, { x: xc, z, w, d, depth });
      if (!opts) continue;
      building(B.at(xc, z, opts.ry ?? 0), { w: w - 0.3, d, lod: depth > 0.35 ? 0.7 : 0.2, ...opts }); n.placed++;
    }
  }
  return n;
}
export { rng, lerp };
