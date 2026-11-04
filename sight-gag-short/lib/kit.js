// sight-gag-short · kit.js — the set: one sunny street (or a park) built from code. Every builder returns an
// Object3D in metres; the street runs along +x, building fronts sit on the plane z = 0 facing +z (the camera side),
// the sidewalk is z ∈ [0, walk] at y = 0, the road is beyond the curb at y = −curb. Real geometry where the reference
// shows depth (window recesses, sills, cornices, awning valances, slatted bins), painted canvas textures everywhere
// (paint.js). Builders never read time; anything that moves is posed by the film each frame.
import * as THREE from "three";
import * as P from "./paint.js";
import { rng, clamp } from "./core.js";

// ---------------------------------------------------------------- materials (cached)
const MATS = new Map();
/** mat(colour, { rough, metal, map, bump, bumpScale, clear, emissive, side, flat }) → MeshStandard/Physical (cached) */
export function mat(color = "#ffffff", o = {}) {
  const k = color + JSON.stringify(o, (key, v) => (v && v.isTexture ? v.uuid : v));
  if (MATS.has(k)) return MATS.get(k);
  const Ctor = o.clear || o.sheen ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  const m = new Ctor({ color, roughness: o.rough ?? 0.72, metalness: o.metal ?? 0, map: o.map || null, bumpMap: o.bump || null, bumpScale: o.bumpScale ?? 1, side: o.side ?? THREE.FrontSide, flatShading: !!o.flat, envMapIntensity: o.env ?? 0.5 });
  if (o.clear) { m.clearcoat = o.clear; m.clearcoatRoughness = o.clearRough ?? 0.35; }
  if (o.sheen) { m.sheen = o.sheen; m.sheenColor = new THREE.Color(o.sheenColor || "#ffffff"); m.sheenRoughness = 0.5; }
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.emissiveI ?? 1; }
  if (o.transparent) { m.transparent = true; m.opacity = o.opacity ?? 1; m.depthWrite = o.depthWrite ?? true; }
  MATS.set(k, m); return m;
}
export const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, toneMapped: false, fog: false, ...o });

// ---------------------------------------------------------------- geometry helpers
/** merge non-indexed or indexed geometries (position, normal, uv) into one */
export function merge(geos) {
  const list = geos.filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  for (const g of list) {
    const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3);
    if (!g.attributes.normal) g.computeVertexNormals(); nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return out;
}
/** a box geometry placed at (x, y, z) = its centre, size (w, h, d), optional rotation y */
export function box(w, h, d, x = 0, y = 0, z = 0, ry = 0) { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; }
/** world-scale the uvs of a geometry so a texture tiles every `tile` metres */
export function uvScale(g, sx, sy = sx) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / sx, uv.getY(i) / sy); return g; }
/** box with uvs in metres on every face (so brick tiles stay square on sides and fronts) */
export function boxUV(w, h, d, tile = 1) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, nrm = g.attributes.normal, pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i)), x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (nx > 0.5) uv.setXY(i, (z + d / 2) / tile, (y + h / 2) / tile); else if (ny > 0.5) uv.setXY(i, (x + w / 2) / tile, (z + d / 2) / tile); else uv.setXY(i, (x + w / 2) / tile, (y + h / 2) / tile);
  }
  return g;
}
export function mesh(geo, material, { cast = true, receive = true, name } = {}) { const m = new THREE.Mesh(geo, material); m.castShadow = cast; m.receiveShadow = receive; if (name) m.name = name; return m; }
/** a lathe from [r, y] pairs */
export const lathe = (pts, seg = 24) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg);
/** a smooth rounded-box ("superellipsoid") geometry: size (w,h,d), roundness 0 (box) … 1 (ellipsoid) */
export function rbox(w, h, d, round = 0.5, seg = 24) {
  const g = new THREE.SphereGeometry(1, seg, Math.max(8, seg >> 1)), p = g.attributes.position, e = 0.12 + round * 0.88;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    p.setXYZ(i, Math.sign(x) * Math.abs(x) ** e * w / 2, Math.sign(y) * Math.abs(y) ** e * h / 2, Math.sign(z) * Math.abs(z) ** e * d / 2);
  }
  g.computeVertexNormals(); return g;
}

// ---------------------------------------------------------------- the street
export const STREET = { walk: 3.4, curb: 0.16, road: 9 };
/** ground height at (x, z) for a street built with street(): sidewalk 0, road −curb */
export const groundAt = (x, z) => (z > STREET.walk ? -STREET.curb : 0);

/**
 * street({ from, to, walk, road, sidewalk, curbCol, crosswalk: [x…], lines, far }) — sidewalk slabs, a granite curb,
 * the road with a painted edge line, optional zebra crossings at the given x, and an optional far sidewalk.
 */
export function street(o = {}) {
  o = { from: -30, to: 90, walk: STREET.walk, road: STREET.road, curb: STREET.curb, sidewalk: "#ece5d8", curbCol: "#c9c2b6", asphalt: "#6f747c", crosswalk: [], lines: true, far: true, ...o };
  STREET.walk = o.walk; STREET.road = o.road; STREET.curb = o.curb;
  const g = new THREE.Group(), L = o.to - o.from, cx = (o.from + o.to) / 2;
  const con = P.concrete({ base: o.sidewalk }), asp = P.asphalt({ base: o.asphalt });
  const walkG = uvScale(new THREE.PlaneGeometry(L, o.walk).rotateX(-Math.PI / 2), 3.0); walkG.translate(cx, 0, o.walk / 2);
  g.add(mesh(walkG, mat(o.sidewalk === "#ece5d8" ? "#ffffff" : "#ffffff", { map: con.map, bump: con.bump, bumpScale: 0.6, rough: 0.9 }), { cast: false }));
  // under the facade line: a darker strip where wall meets walk (painted grime/occlusion)
  const occ = new THREE.PlaneGeometry(L, 0.55).rotateX(-Math.PI / 2); occ.translate(cx, 0.003, 0.27);
  g.add(mesh(occ, new THREE.MeshBasicMaterial({ map: gradTex(), transparent: true, opacity: 0.22, color: "#4a3a3a", depthWrite: false }), { cast: false, receive: false }));
  const curb = boxUV(L, o.curb + 0.02, 0.24, 1); curb.translate(cx, -o.curb / 2 - 0.01 + 0.01, o.walk + 0.12);
  g.add(mesh(curb, mat(o.curbCol, { rough: 0.85, map: con.map }), { cast: false }));
  const roadG = uvScale(new THREE.PlaneGeometry(L, o.road).rotateX(-Math.PI / 2), 6); roadG.translate(cx, -o.curb, o.walk + 0.24 + o.road / 2);
  g.add(mesh(roadG, mat("#ffffff", { map: asp.map, rough: 0.95 }), { cast: false }));
  const paint = mat("#f3efe4", { rough: 0.8 });
  if (o.lines) { const l = new THREE.PlaneGeometry(L, 0.12).rotateX(-Math.PI / 2); l.translate(cx, -o.curb + 0.004, o.walk + 0.24 + 0.45); g.add(mesh(l, paint, { cast: false })); }
  for (const x of o.crosswalk) {
    for (let i = 0; i < 7; i++) { const s = new THREE.PlaneGeometry(0.55, o.road * 0.92).rotateX(-Math.PI / 2); s.translate(x - 2.4 + i * 0.8, -o.curb + 0.005, o.walk + 0.24 + o.road / 2); g.add(mesh(s, paint, { cast: false })); }
  }
  if (o.far) {
    const fw = uvScale(new THREE.PlaneGeometry(L, 4).rotateX(-Math.PI / 2), 3); fw.translate(cx, 0, o.walk + 0.24 + o.road + 2.2);
    g.add(mesh(fw, mat("#ffffff", { map: con.map, rough: 0.9 }), { cast: false }));
  }
  return g;
}
let _grad; function gradTex() { if (_grad) return _grad; const c = P.canvas(4, 64), x = c.getContext("2d"), gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(255,255,255,1)"); x.fillStyle = gr; x.fillRect(0, 0, 4, 64); _grad = P.tex(c); return _grad; }

// ---------------------------------------------------------------- buildings
/**
 * building({ x, w, floors, ground, upper, depth, wall, brick, mortar, paint, trim, windows, cornice, shop, awning,
 *            sign, blade, door, patches, seed, sides, roofline })
 *   x: left edge. wall: "brick" | "painted" (white-painted brick) | "plaster". shop: { glass, door: "left|right|centre",
 *   frame } turns the ground floor into a storefront; awning: { a, b, depth, drop } striped; sign: { text, fg, bg }
 *   fascia band; blade: { text, fg, bg, at } vertical sign; windows: { cols, w, h, arch } per upper floor.
 * → Group (origin at the facade's bottom-left, front plane z = 0)
 */
export function building(o = {}) {
  o = { x: 0, w: 8, floors: 3, ground: 3.8, upper: 3.1, depth: 8, wall: "brick", brick: "#b4473c", mortar: "#d2ab9c", paint: "#f2eee7", plaster: "#efe7da", trim: "#efe9df", windows: {}, cornice: true, shop: null, awning: null, sign: null, blade: null, door: null, patches: 2, seed: 1, sides: true, frameCol: null, sill: true, ...o };
  const W = { cols: Math.max(1, Math.round(o.w / 2.6)), w: 1.05, h: 1.75, arch: false, ...o.windows };
  const g = new THREE.Group(); g.position.x = o.x; g.userData.kind = "building";
  const H = o.ground + (o.floors - 1) * o.upper + (o.cornice ? 0.9 : 0.4);
  const tile = 1.4;
  const wallTex = o.wall === "plaster" ? P.plaster({ base: o.plaster, seed: o.seed }) : P.brick({ base: o.brick, mortar: o.mortar, painted: o.wall === "painted" ? o.paint : null, patches: 0, chips: 0, seed: o.seed % 4 });
  const wallMat = mat("#ffffff", { map: wallTex.map, bump: wallTex.bump || null, bumpScale: 1.2, rough: 0.88 });
  const trimMat = mat(o.trim, { rough: 0.7 });
  const frameMat = mat(o.frameCol || o.trim, { rough: 0.55 });
  const glassMat = mat("#ffffff", { map: P.glass({ seed: o.seed }).map, rough: 0.15, metal: 0.0, env: 1.2 });
  // the facade slab with real window openings
  const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(o.w, 0), new THREE.Vector2(o.w, H), new THREE.Vector2(0, H)]);
  const holes = [];
  const shopH = o.shop ? o.ground - 0.95 : 0;
  if (o.shop) { const sx = 0.45, sw = o.w - 0.9; holes.push([sx, 0.0, sw, shopH]); }
  else if (o.door) { const dw = 1.3, dx = o.door === "left" ? 0.8 : o.door === "right" ? o.w - 2.1 : o.w / 2 - 0.65; holes.push([dx, 0, dw, 2.5, "door"]); const gx = [0.8, o.w - 2.3]; for (const x of gx) if (Math.abs(x - dx) > 1.6) holes.push([x, 1.1, 1.3, 1.7]); }
  const gap = o.w / W.cols;
  for (let f = 1; f < o.floors; f++) for (let c = 0; c < W.cols; c++) { const y = o.ground + (f - 1) * o.upper + 0.75, x = gap * (c + 0.5) - W.w / 2; holes.push([x, y, W.w, W.h, W.arch ? "arch" : ""]); }
  for (const [x, y, w, h, kind] of holes) {
    const p = new THREE.Path();
    if (kind === "arch") { p.moveTo(x, y); p.lineTo(x + w, y); p.lineTo(x + w, y + h - w / 2); p.absarc(x + w / 2, y + h - w / 2, w / 2, 0, Math.PI, false); p.lineTo(x, y); }
    else { p.moveTo(x, y); p.lineTo(x, y + h); p.lineTo(x + w, y + h); p.lineTo(x + w, y); p.lineTo(x, y); }
    shape.holes.push(p);
  }
  const D = 0.34;
  const slab = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: false, curveSegments: 10 }); slab.translate(0, 0, -D); uvScale(slab, tile);
  g.add(mesh(slab, wallMat));
  // body behind the facade (its sides show at street corners), roof cap
  if (o.sides) { const body = boxUV(o.w - 0.02, H - 0.02, o.depth, tile); body.translate(o.w / 2, H / 2, -D - o.depth / 2 + 0.01); g.add(mesh(body, wallMat)); }
  const cap = box(o.w + 0.04, 0.12, o.depth + D, o.w / 2, H + 0.06, -(o.depth + D) / 2); g.add(mesh(cap, mat("#8a7f78", { rough: 0.9 })));
  // windows: recess back (glass), frame, sash bar, sill, lintel
  const parts = [], glassG = [], frames = [];
  for (const [x, y, w, h, kind] of holes) {
    const isShop = o.shop && y === 0 && w > 3, isDoor = kind === "door";
    const back = new THREE.PlaneGeometry(w, h); back.translate(x + w / 2, y + h / 2, -D + 0.08);
    // glass uv 0..1 over the pane
    glassG.push(back);
    const fw = isShop ? 0.12 : 0.08, fd = 0.1, z = -D + 0.12;
    if (kind !== "arch") {
      frames.push(box(w, fw, fd, x + w / 2, y + fw / 2, z), box(w, fw, fd, x + w / 2, y + h - fw / 2, z), box(fw, h, fd, x + fw / 2, y + h / 2, z), box(fw, h, fd, x + w - fw / 2, y + h / 2, z));
    } else {
      frames.push(box(w, fw, fd, x + w / 2, y + fw / 2, z), box(fw, h - w / 2, fd, x + fw / 2, y + (h - w / 2) / 2, z), box(fw, h - w / 2, fd, x + w - fw / 2, y + (h - w / 2) / 2, z));
      const tor = new THREE.TorusGeometry(w / 2 - fw / 2, fw / 2, 6, 16, Math.PI); tor.translate(x + w / 2, y + h - w / 2, z); frames.push(tor);
    }
    if (!isShop && !isDoor) {
      frames.push(box(w - 0.1, 0.06, 0.06, x + w / 2, y + h * 0.55, z + 0.01)); // sash rail
      frames.push(box(0.05, h * 0.45, 0.05, x + w / 2, y + h * 0.78, z + 0.01));
      if (o.sill) parts.push(box(w + 0.3, 0.1, 0.22, x + w / 2, y - 0.05, 0.08)); // sill proud of the wall
      parts.push(box(w + 0.24, 0.2, 0.08, x + w / 2, y + h + 0.12, 0.03)); // lintel
    }
    if (isShop) { const mull = 3; for (let i = 1; i < mull; i++) frames.push(box(0.08, h, fd, x + (w * i) / mull, y + h / 2, z)); frames.push(box(w, 0.08, fd, x + w / 2, y + h * 0.8, z)); }
  }
  // per-pane uv: map each back plane fully (PlaneGeometry already has 0..1 uvs)
  g.add(mesh(merge(glassG), glassMat, { cast: false }));
  if (frames.length) g.add(mesh(merge(frames), frameMat));
  if (parts.length) g.add(mesh(merge(parts), trimMat));
  // shop: kickplate under the glass, fascia band, door panel
  if (o.shop) {
    const s = { frame: o.trim, door: "right", fascia: o.sign?.bg || o.trim, ...o.shop };
    const fas = box(o.w - 0.2, 0.78, 0.12, o.w / 2, o.ground - 0.5, 0.06); g.add(mesh(fas, mat(s.fascia, { rough: 0.6 })));
    if (o.sign) { const lab = P.label({ text: o.sign.text, w: 1024, h: 128, fg: o.sign.fg || "#fff", bg: o.sign.bg || "#2b5aa0", seed: o.seed }); const pl = new THREE.PlaneGeometry(o.w - 0.6, 0.6); pl.translate(o.w / 2, o.ground - 0.5, 0.125); g.add(mesh(pl, mat("#ffffff", { map: lab.map, rough: 0.6 }), { cast: false })); }
    const kick = box(o.w - 0.9, 0.42, 0.14, o.w / 2, 0.21, -D + 0.16); g.add(mesh(kick, mat(s.frame, { rough: 0.6 })));
    // a few shapes inside the shop (shelves, goods) so the window isn't empty
    const r = rng(o.seed * 7), inside = [];
    for (let i = 0; i < 6; i++) inside.push(box(0.5 + r() * 0.8, 0.3 + r() * 0.9, 0.4, 0.9 + r() * (o.w - 1.8), 0.45 + r() * 1.2, -D - 0.6 - r() * 0.8));
    g.add(mesh(merge(inside), mat(s.goods || "#6b5a4e", { rough: 0.8 }), { cast: false }));
    const back = new THREE.PlaneGeometry(o.w, shopH); back.translate(o.w / 2, shopH / 2, -D - 1.8); g.add(mesh(back, mat("#3c3631", { rough: 1 }), { cast: false }));
  }
  // cornice: projecting bands + dentils
  if (o.cornice) {
    const cz = [box(o.w + 0.36, 0.22, 0.42, o.w / 2, H - 0.11, 0.03), box(o.w + 0.2, 0.14, 0.28, o.w / 2, H - 0.32, 0.0), box(o.w + 0.1, 0.1, 0.18, o.w / 2, H - 0.62, -0.05)];
    for (let x = 0.1; x < o.w; x += 0.32) cz.push(box(0.14, 0.16, 0.16, x, H - 0.47, -0.02));
    g.add(mesh(merge(cz), trimMat));
    // floor bands between storeys
    const bands = []; for (let f = 1; f < o.floors; f++) bands.push(box(o.w + 0.06, 0.12, 0.08, o.w / 2, o.ground + (f - 1) * o.upper + 0.12, 0.02));
    if (bands.length && o.wall !== "plaster") g.add(mesh(merge(bands), trimMat));
  }
  // decals that never repeat: bare-brick chips on painted walls, flaked plaster on bare brick
  if (o.wall !== "plaster" && o.patches > 0) {
    const r = rng(o.seed * 31 + 7), list = [];
    for (let i = 0; i < o.patches; i++) {
      for (let tries = 0; tries < 12; tries++) {
        const sz = 0.7 + r() * 1.3, x = 0.4 + r() * (o.w - 0.8), y = 0.6 + r() * (H - 1.6);
        if (holes.some(([hx, hy, hw, hh]) => x > hx - sz * 0.4 && x < hx + hw + sz * 0.4 && y > hy - sz * 0.4 && y < hy + hh + sz * 0.4)) continue;
        if (o.shop && y < o.ground + 0.2) continue;
        const map = o.wall === "painted" ? P.chip({ base: o.brick, mortar: o.mortar, seed: o.seed * 10 + i }).map : P.flake({ seed: o.seed * 10 + i }).map;
        const d = mesh(new THREE.PlaneGeometry(sz, sz * (0.6 + r() * 0.3)), new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), { cast: false });
        d.position.set(x, y, 0.004); d.rotation.z = (r() - 0.5) * 0.4; d.renderOrder = 1; g.add(d); break;
      }
    }
  }
  if (o.awning) g.add(awning({ x: o.w / 2, y: o.ground - 0.95, w: o.w - 0.4, ...o.awning }));
  if (o.blade) { const b = blade({ ...o.blade }); b.position.set(o.blade.at ?? 0.5, o.blade.y ?? o.ground + 0.4, 0); g.add(b); }
  g.userData.height = H; g.userData.w = o.w;
  return g;
}

/** awning({ x, y, w, depth, drop, a, b, n, scallop }) — striped sloped canvas with a scalloped valance and side cheeks */
export function awning(o = {}) {
  o = { x: 0, y: 2.8, w: 6, depth: 1.5, drop: 0.85, a: "#2f5e9e", b: "#f4f0e7", n: Math.round((o.w || 6) / 1.1), scallop: true, ...o };
  const g = new THREE.Group(); g.position.set(o.x, o.y, 0);
  const st = P.stripes({ a: o.a, b: o.b, n: o.n });
  const m = mat("#ffffff", { map: st.map, rough: 0.8, side: THREE.DoubleSide });
  const slope = Math.hypot(o.depth, o.drop);
  const top = new THREE.PlaneGeometry(o.w, slope, 1, 1); top.rotateX(-Math.PI / 2 + Math.atan2(o.drop, o.depth)); top.translate(0, -o.drop / 2 + 0.95, o.depth / 2);
  g.add(mesh(top, m));
  const val = new THREE.Shape(); const vh = 0.32, n = Math.max(4, Math.round(o.w / 0.55));
  val.moveTo(-o.w / 2, 0); val.lineTo(o.w / 2, 0); val.lineTo(o.w / 2, -vh);
  for (let i = n; i > 0; i--) { const x1 = -o.w / 2 + (o.w * (i - 1)) / n, xm = (x1 + -o.w / 2 + (o.w * i) / n) / 2; val.quadraticCurveTo(xm, o.scallop ? -vh - 0.16 : -vh, x1, -vh); }
  val.lineTo(-o.w / 2, 0);
  const vg = new THREE.ShapeGeometry(val, 4); const uv = vg.attributes.uv, p = vg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + o.w / 2) / o.w, 0.5 + p.getY(i));
  vg.translate(0, 0.95 - o.drop, o.depth + 0.002); g.add(mesh(vg, m));
  for (const s of [-1, 1]) { const ch = new THREE.Shape([new THREE.Vector2(0, 0.95), new THREE.Vector2(o.depth, 0.95 - o.drop), new THREE.Vector2(o.depth, 0.95 - o.drop - vh), new THREE.Vector2(0, 0.95 - 0.1)]); const cg = new THREE.ShapeGeometry(ch); cg.rotateY(-Math.PI / 2); cg.translate((s * o.w) / 2, 0, 0); g.add(mesh(cg, mat(o.a, { rough: 0.8, side: THREE.DoubleSide }))); }
  const rod = new THREE.CylinderGeometry(0.025, 0.025, o.w, 8).rotateZ(Math.PI / 2); rod.translate(0, 0.95 - o.drop, o.depth); g.add(mesh(rod, mat("#2a2a2a", { metal: 0.5, rough: 0.4 })));
  return g;
}

/** blade({ text, fg, bg, h, w, frame }) — a vertical projecting sign, letters one per line on both faces */
export function blade(o = {}) {
  o = { text: "SHOP", fg: "#ffffff", bg: "#2b5aa0", h: 3.4, w: 0.62, frame: "#e9e5dc", ...o };
  const g = new THREE.Group(), lab = P.label({ text: o.text, w: 128, h: Math.round(128 * (o.h / o.w)), fg: o.fg, bg: o.bg, vertical: true, pad: 0.06, worn: 0.15 });
  const face = mat("#ffffff", { map: lab.map, rough: 0.6 });
  const b = boxUV(0.12, o.h, o.w, 1); g.add(mesh(b, mat(o.bg, { rough: 0.6 })));
  for (const s of [-1, 1]) { const pl = new THREE.PlaneGeometry(o.w * 0.94, o.h * 0.97); pl.rotateY((s * Math.PI) / 2); pl.translate(s * 0.065, 0, 0); g.add(mesh(pl, face, { cast: false })); }
  g.add(mesh(box(0.06, 0.06, 0.4, 0, o.h / 2 - 0.3, -o.w / 2 - 0.2), mat("#2a2a2a", { metal: 0.5 })), mesh(box(0.06, 0.06, 0.4, 0, -o.h / 2 + 0.3, -o.w / 2 - 0.2), mat("#2a2a2a", { metal: 0.5 })));
  g.children.forEach((c) => (c.position.z += o.w / 2 + 0.4));
  return g;
}

/** sign({ text, w, h, fg, bg, border, wall: true|false, post, icon }) — a flat sign: on a wall (z≈0) or on a post */
export function sign(o = {}) {
  o = { text: "", w: 0.6, h: 0.6, fg: "#c8202c", bg: "#ffffff", border: 0, post: 0, icon: null, ...o };
  const g = new THREE.Group(); const px = 256, py = Math.round(256 * (o.h / o.w));
  let map;
  if (o.icon) map = iconTex(o.icon, px, py, o); else map = P.label({ text: o.text, w: px, h: py, fg: o.fg, bg: o.bg, border: o.border, worn: 0.1 }).map;
  const plate = box(o.w, o.h, 0.03, 0, 0, 0.015); g.add(mesh(plate, mat(o.bg, { rough: 0.5 })));
  const face = new THREE.PlaneGeometry(o.w, o.h); face.translate(0, 0, 0.032); g.add(mesh(face, mat("#ffffff", { map, rough: 0.5 }), { cast: false }));
  if (o.post) { const p = new THREE.CylinderGeometry(0.035, 0.035, o.post, 10); p.translate(0, -o.post / 2 - o.h / 2 + 0.05, -0.04); g.add(mesh(p, mat("#8d949b", { metal: 0.6, rough: 0.35 }))); g.position.y = o.post + o.h / 2; }
  return g;
}
function iconTex(icon, w, h, o) {
  const c = P.canvas(w, h), x = c.getContext("2d"); x.fillStyle = o.bg; x.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.4;
  if (icon === "no-smoking") {
    x.fillStyle = "#222"; x.fillRect(cx - R * 0.7, cy - R * 0.1, R * 1.2, R * 0.22); x.fillStyle = "#d24"; x.fillRect(cx + R * 0.5, cy - R * 0.1, R * 0.2, R * 0.22);
    x.strokeStyle = "#555"; x.lineWidth = R * 0.08; x.beginPath(); x.moveTo(cx + R * 0.55, cy - R * 0.2); x.bezierCurveTo(cx + R * 0.4, cy - R * 0.5, cx + R * 0.75, cy - R * 0.6, cx + R * 0.6, cy - R * 0.85); x.stroke();
    x.strokeStyle = "#d42030"; x.lineWidth = R * 0.18; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke(); x.beginPath(); x.moveTo(cx - R * 0.7, cy - R * 0.7); x.lineTo(cx + R * 0.7, cy + R * 0.7); x.stroke();
  } else if (icon === "school") {
    x.fillStyle = "#f4d21f"; x.beginPath(); x.moveTo(cx, cy - R * 1.2); x.lineTo(cx + R * 1.2, cy); x.lineTo(cx, cy + R * 1.2); x.lineTo(cx - R * 1.2, cy); x.closePath(); x.fill();
    x.strokeStyle = "#1d1d1d"; x.lineWidth = R * 0.07; x.stroke();
    x.fillStyle = "#1d1d1d"; const fig = (fx, s) => { x.beginPath(); x.arc(fx, cy - R * 0.42 * s, R * 0.13 * s, 0, 7); x.fill(); x.fillRect(fx - R * 0.1 * s, cy - R * 0.28 * s, R * 0.2 * s, R * 0.45 * s); x.save(); x.translate(fx, cy + R * 0.15 * s); x.rotate(0.35); x.fillRect(-R * 0.05 * s, 0, R * 0.1 * s, R * 0.42 * s); x.restore(); x.save(); x.translate(fx, cy + R * 0.15 * s); x.rotate(-0.35); x.fillRect(-R * 0.05 * s, 0, R * 0.1 * s, R * 0.42 * s); x.restore(); };
    fig(cx - R * 0.25, 1); fig(cx + R * 0.3, 0.8);
  } else if (icon === "arrow") {
    x.fillStyle = o.fg; x.beginPath(); x.moveTo(cx - R, cy - R * 0.25); x.lineTo(cx + R * 0.2, cy - R * 0.25); x.lineTo(cx + R * 0.2, cy - R * 0.6); x.lineTo(cx + R, cy); x.lineTo(cx + R * 0.2, cy + R * 0.6); x.lineTo(cx + R * 0.2, cy + R * 0.25); x.lineTo(cx - R, cy + R * 0.25); x.fill();
  } else if (icon === "hand") {
    x.fillStyle = "#e9842a"; x.beginPath(); x.ellipse(cx, cy + R * 0.25, R * 0.45, R * 0.5, 0, 0, 7); x.fill();
    for (let i = 0; i < 4; i++) { x.beginPath(); x.roundRect(cx - R * 0.45 + i * R * 0.24, cy - R * 0.75, R * 0.2, R * 0.9, R * 0.1); x.fill(); }
    x.save(); x.translate(cx + R * 0.4, cy + R * 0.1); x.rotate(-0.7); x.beginPath(); x.roundRect(0, -R * 0.1, R * 0.5, R * 0.2, R * 0.1); x.fill(); x.restore();
  }
  return P.tex(c);
}

/** plate({ w, h, color }) — a plain wall plate / poster / electrical box */
export function plate(o = {}) { o = { w: 0.5, h: 0.7, d: 0.06, color: "#d8d2c8", ...o }; const g = new THREE.Group(); g.add(mesh(box(o.w, o.h, o.d, 0, 0, o.d / 2), mat(o.color, { rough: 0.6 }))); return g; }

// ---------------------------------------------------------------- street furniture
/** lamp({ globes: 1|2, color, h, baskets }) — a cast-iron street lamp: fluted base, pole, scroll arms, frosted globes, flower baskets */
export function lamp(o = {}) {
  o = { globes: 2, color: "#26443a", h: 4.4, baskets: true, flower: "#e88aa8", ...o };
  const g = new THREE.Group(), iron = mat(o.color, { rough: 0.38, metal: 0.55, env: 0.8 });
  g.add(mesh(lathe([[0.001, 0], [0.24, 0], [0.24, 0.12], [0.17, 0.2], [0.15, 0.55], [0.1, 0.62], [0.1, 0.8], [0.07, 0.88], [0.001, 0.88]], 20), iron));
  const pole = new THREE.CylinderGeometry(0.055, 0.075, o.h - 0.8, 14); pole.translate(0, 0.8 + (o.h - 0.8) / 2, 0); g.add(mesh(pole, iron));
  g.add(mesh(lathe([[0.001, 0], [0.1, 0], [0.12, 0.08], [0.07, 0.2], [0.001, 0.25]], 14).translate(0, o.h - 0.05, 0), iron));
  const globe = mat("#ffffff", { rough: 0.25, emissive: "#fff6e0", emissiveI: 0.25, env: 1 });
  const arms = o.globes === 2 ? [-1, 1] : [0];
  for (const s of arms) {
    const ax = s * 0.62;
    if (s) { const arm = new THREE.TorusGeometry(0.31, 0.03, 8, 16, Math.PI); arm.translate(0, 0, 0); arm.rotateZ(0); arm.translate(s * 0.31, o.h - 0.05, 0); g.add(mesh(arm, iron)); }
    const cup = lathe([[0.001, 0], [0.09, 0.02], [0.12, 0.1], [0.001, 0.1]], 14); cup.translate(ax, o.h + (s ? 0.26 : 0.18), 0); g.add(mesh(cup, iron));
    const gl = new THREE.SphereGeometry(0.22, 24, 16); gl.translate(ax, o.h + (s ? 0.56 : 0.48), 0); g.add(mesh(gl, globe, { cast: true }));
    const fin = new THREE.ConeGeometry(0.04, 0.12, 8); fin.translate(ax, o.h + (s ? 0.82 : 0.74), 0); g.add(mesh(fin, iron));
  }
  if (o.baskets) for (const s of arms.length > 1 ? [-1, 1] : [1]) {
    const bx = s * 0.55, by = o.h - 1.1, r = rng(5 + s);
    const hang = new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4); hang.translate(bx, by + 0.45, 0); g.add(mesh(hang, iron));
    g.add(mesh(lathe([[0.001, 0], [0.12, 0.01], [0.24, 0.12], [0.27, 0.22], [0.001, 0.22]], 16).translate(bx, by, 0), mat("#3d3a35", { rough: 0.8 })));
    const leaves = [], flowers = [];
    for (let i = 0; i < 22; i++) { const a = r() * 6.28, rr = 0.1 + r() * 0.22; const s2 = new THREE.IcosahedronGeometry(0.07 + r() * 0.05, 1); s2.translate(bx + Math.cos(a) * rr, by + 0.2 + r() * 0.15 - rr * 0.4, Math.sin(a) * rr); leaves.push(s2); }
    for (let i = 0; i < 12; i++) { const a = r() * 6.28, rr = 0.08 + r() * 0.2; const s2 = new THREE.IcosahedronGeometry(0.05, 0); s2.translate(bx + Math.cos(a) * rr, by + 0.3 + r() * 0.1, Math.sin(a) * rr); flowers.push(s2); }
    g.add(mesh(merge(leaves), mat("#4f8a46", { rough: 0.8 })), mesh(merge(flowers), mat(o.flower, { rough: 0.7 })));
  }
  return g;
}

/** bin({ color, h, r, lid }) — a slatted municipal trash can on a ring base */
export function bin(o = {}) {
  o = { color: "#2e5a3a", h: 1.0, r: 0.36, slats: 16, ...o };
  const g = new THREE.Group(), m = mat(o.color, { rough: 0.45, metal: 0.4, env: 0.7 });
  const sl = []; for (let i = 0; i < o.slats; i++) { const a = (i / o.slats) * Math.PI * 2; sl.push(box(0.075, o.h * 0.82, 0.03, Math.cos(a) * o.r, o.h * 0.5, Math.sin(a) * o.r, -a + Math.PI / 2)); }
  g.add(mesh(merge(sl), m));
  for (const y of [o.h * 0.12, o.h * 0.5, o.h * 0.9]) { const t = new THREE.TorusGeometry(o.r + 0.01, 0.022, 6, 32).rotateX(Math.PI / 2); t.translate(0, y, 0); g.add(mesh(t, m)); }
  const rim = new THREE.TorusGeometry(o.r + 0.02, 0.04, 8, 32).rotateX(Math.PI / 2); rim.translate(0, o.h, 0); g.add(mesh(rim, m));
  g.add(mesh(lathe([[0.001, 0], [o.r * 0.85, 0], [o.r * 0.9, 0.08], [o.r * 0.7, 0.1], [0.001, 0.1]], 20), m));
  const inner = new THREE.CylinderGeometry(o.r * 0.95, o.r * 0.95, o.h * 0.75, 20, 1, true); inner.translate(0, o.h * 0.55, 0);
  g.add(mesh(inner, mat("#1e2a22", { rough: 1, side: THREE.BackSide })));
  const bag = new THREE.CircleGeometry(o.r * 0.92, 20).rotateX(-Math.PI / 2); bag.translate(0, o.h * 0.82, 0); g.add(mesh(bag, mat("#2b2b30", { rough: 0.6 })));
  g.userData.top = o.h; g.userData.r = o.r;
  return g;
}

/** hydrant({ color }) */
export function hydrant(o = {}) {
  o = { color: "#c63a2f", s: 0.85, ...o }; const g = new THREE.Group(), m = mat(o.color, { rough: 0.4, metal: 0.2, clear: 0.4 }); g.scale.setScalar(o.s);
  g.add(mesh(lathe([[0.001, 0], [0.2, 0], [0.2, 0.06], [0.14, 0.1], [0.13, 0.55], [0.17, 0.58], [0.17, 0.64], [0.12, 0.66], [0.13, 0.78], [0.06, 0.86], [0.03, 0.92], [0.001, 0.92]], 20), m));
  for (const s of [-1, 1]) { const n = new THREE.CylinderGeometry(0.06, 0.07, 0.14, 12).rotateZ(Math.PI / 2); n.translate(s * 0.18, 0.42, 0); g.add(mesh(n, m)); }
  const f = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 12).rotateX(Math.PI / 2); f.translate(0, 0.4, 0.16); g.add(mesh(f, m));
  return g;
}

/** bench({ w, color, wood }) */
export function bench(o = {}) {
  o = { w: 1.8, color: "#2a3b33", wood: "#a0703f", ...o }; const g = new THREE.Group(), iron = mat(o.color, { rough: 0.5, metal: 0.5 }), wd = mat(o.wood, { rough: 0.7, map: P.wood({ base: o.wood }).map });
  const slats = []; for (let i = 0; i < 3; i++) slats.push(box(o.w, 0.04, 0.12, 0, 0.45, -0.2 + i * 0.15)); for (let i = 0; i < 2; i++) { const b = box(o.w, 0.12, 0.035, 0, 0.62 + i * 0.16, -0.3); slats.push(b); }
  g.add(mesh(merge(slats), wd));
  for (const s of [-1, 1]) { g.add(mesh(merge([box(0.05, 0.45, 0.05, s * (o.w / 2 - 0.12), 0.22, 0.12), box(0.05, 0.9, 0.05, s * (o.w / 2 - 0.12), 0.45, -0.3), box(0.05, 0.05, 0.5, s * (o.w / 2 - 0.12), 0.43, -0.07)]), iron)); }
  return g;
}

/** ladder({ h, w, color, lean }) — two rails + rungs; origin at its feet; leans back toward −z by `lean` metres */
export function ladder(o = {}) {
  o = { h: 3.2, w: 0.5, color: "#c0392b", lean: 0.5, ...o }; const g = new THREE.Group(), m = mat(o.color, { rough: 0.5, metal: 0.3 });
  const L = Math.hypot(o.h, o.lean), parts = [];
  for (const s of [-1, 1]) parts.push(box(0.06, L, 0.06, (s * o.w) / 2, L / 2, 0));
  for (let y = 0.3; y < L - 0.1; y += 0.3) parts.push(box(o.w, 0.04, 0.05, 0, y, 0));
  const lg = mesh(merge(parts), m); lg.rotation.x = -Math.atan2(o.lean, o.h); g.add(lg);
  g.userData.top = [0, o.h, -o.lean];
  return g;
}

/** car({ color, w, len }) — a boxy sedan, nose toward +x; origin on the ground at its centre */
export function car(o = {}) {
  o = { color: "#c8303a", len: 4.3, w: 1.75, ...o };
  const g = new THREE.Group(), paint = mat(o.color, { rough: 0.28, metal: 0.3, clear: 0.8, clearRough: 0.12, env: 1.1 });
  const L = o.len, s = new THREE.Shape();
  s.moveTo(-L / 2, 0.32); s.lineTo(-L / 2, 0.82); s.quadraticCurveTo(-L / 2 + 0.05, 0.92, -L / 2 + 0.25, 0.95); s.lineTo(-L * 0.28, 0.97);
  s.lineTo(-L * 0.18, 1.42); s.quadraticCurveTo(-L * 0.15, 1.47, -L * 0.1, 1.47); s.lineTo(L * 0.1, 1.47); s.quadraticCurveTo(L * 0.14, 1.46, L * 0.16, 1.42);
  s.lineTo(L * 0.27, 1.0); s.lineTo(L / 2 - 0.2, 0.93); s.quadraticCurveTo(L / 2, 0.88, L / 2, 0.72); s.lineTo(L / 2, 0.32); s.lineTo(-L / 2, 0.32);
  const body = new THREE.ExtrudeGeometry(s, { depth: o.w, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.08, bevelSegments: 4, curveSegments: 8 });
  body.translate(0, 0, -o.w / 2); g.add(mesh(body, paint));
  // windows: a dark inset band following the cabin
  const wnd = new THREE.Shape(); wnd.moveTo(-L * 0.25, 1.02); wnd.lineTo(-L * 0.165, 1.39); wnd.lineTo(L * 0.14, 1.39); wnd.lineTo(L * 0.235, 1.02); wnd.lineTo(-L * 0.25, 1.02);
  const wg = new THREE.ExtrudeGeometry(wnd, { depth: o.w + 0.18, bevelEnabled: false }); wg.translate(0, 0, -(o.w + 0.18) / 2);
  g.add(mesh(wg, mat("#1d2733", { rough: 0.08, metal: 0.2, env: 1.6 })));
  const pillar = box(0.08, 0.38, o.w + 0.2, -L * 0.02, 1.2, 0); g.add(mesh(pillar, paint));
  const tyre = mat("#1b1b1d", { rough: 0.85 }), hub = mat("#c9ccd1", { metal: 0.8, rough: 0.25 });
  for (const x of [-L * 0.31, L * 0.31]) for (const z of [-1, 1]) {
    const w = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 24).rotateX(Math.PI / 2); w.translate(x, 0.33, z * (o.w / 2 - 0.02)); g.add(mesh(w, tyre));
    const h = new THREE.CylinderGeometry(0.17, 0.17, 0.02, 16).rotateX(Math.PI / 2); h.translate(x, 0.33, z * (o.w / 2 + 0.11)); g.add(mesh(h, hub, { cast: false }));
  }
  const chrome = mat("#d7d9dc", { metal: 0.9, rough: 0.2 });
  g.add(mesh(box(0.12, 0.16, o.w + 0.05, L / 2 + 0.06, 0.42, 0), chrome), mesh(box(0.12, 0.16, o.w + 0.05, -L / 2 - 0.06, 0.42, 0), chrome));
  for (const z of [-1, 1]) { g.add(mesh(box(0.05, 0.14, 0.3, L / 2 + 0.04, 0.75, z * (o.w / 2 - 0.25)), mat("#fff8e0", { emissive: "#fff3c0", emissiveI: 0.4 }), { cast: false })); g.add(mesh(box(0.05, 0.14, 0.3, -L / 2 - 0.04, 0.75, z * (o.w / 2 - 0.25)), mat("#d83a2e", { emissive: "#a01010", emissiveI: 0.3 }), { cast: false })); }
  g.userData.len = L;
  return g;
}

/** scooter({ color }) — a kick e-scooter; deck along +x, origin at ground centre */
export function scooter(o = {}) {
  o = { color: "#2a2f36", accent: "#3fb6a8", ...o }; const g = new THREE.Group(), m = mat(o.color, { rough: 0.4, metal: 0.5 }), a = mat(o.accent, { rough: 0.4 });
  g.add(mesh(rbox(0.85, 0.06, 0.16, 0.6), m).translateY(0.14));
  const stem = new THREE.CylinderGeometry(0.025, 0.025, 1.0, 10); stem.rotateZ(-0.12); stem.translate(0.47, 0.62, 0); g.add(mesh(stem, a));
  const bar = new THREE.CylinderGeometry(0.02, 0.02, 0.48, 8).rotateX(Math.PI / 2); bar.translate(0.53, 1.1, 0); g.add(mesh(bar, m));
  for (const x of [-0.42, 0.42]) { const w = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16).rotateX(Math.PI / 2); w.translate(x, 0.1, 0); g.add(mesh(w, mat("#151515", { rough: 0.9 }))); }
  return g;
}

/** tree({ h, r, color, trunk, grate }) — a painted street tree: clustered blob canopy with lit/shade greens */
export function tree(o = {}) {
  o = { h: 4.6, r: 1.6, color: "#4d8a46", trunk: "#6b4a34", grate: true, seed: 3, ...o };
  const g = new THREE.Group(), r = rng(o.seed);
  const tr = new THREE.CylinderGeometry(0.09, 0.15, o.h * 0.6, 10); tr.translate(0, o.h * 0.3, 0); g.add(mesh(tr, mat(o.trunk, { rough: 0.9 })));
  const blobs = [[], [], []], cols = [o.color, P.css(P.shade(P.rgbOf(o.color), 1.2)), P.css(P.shade(P.rgbOf(o.color), 0.8))];
  for (let i = 0; i < 26; i++) { const a = r() * 6.28, e = (r() - 0.3) * 1.2, rr = o.r * (0.35 + r() * 0.6); const s = new THREE.IcosahedronGeometry(o.r * (0.32 + r() * 0.25), 1); s.translate(Math.cos(a) * rr * Math.cos(e), o.h * 0.72 + Math.sin(e) * o.r * 0.6, Math.sin(a) * rr * Math.cos(e) * 0.8); blobs[i % 3].push(s); }
  blobs.forEach((b, i) => g.add(mesh(merge(b), mat(cols[i], { rough: 0.85, flat: false }))));
  if (o.grate) { const gr = box(1.1, 0.02, 1.1, 0, 0.011, 0); g.add(mesh(gr, mat("#3b3b3b", { metal: 0.6, rough: 0.5 }), { cast: false })); }
  return g;
}

/** planter({ w, color, flower }) — a box planter with a painted shrub */
export function planter(o = {}) {
  o = { w: 1.2, color: "#6b4a34", flower: "#f0b13a", green: "#4f8a46", seed: 4, ...o }; const g = new THREE.Group(), r = rng(o.seed);
  g.add(mesh(boxUV(o.w, 0.5, 0.5, 1).translate(0, 0.25, 0), mat(o.color, { rough: 0.8, map: P.wood({ base: o.color }).map })));
  const l = [], f = []; for (let i = 0; i < 18; i++) { const s = new THREE.IcosahedronGeometry(0.12 + r() * 0.08, 0); s.translate((r() - 0.5) * o.w * 0.9, 0.55 + r() * 0.2, (r() - 0.5) * 0.4); l.push(s); }
  for (let i = 0; i < 10; i++) { const s = new THREE.IcosahedronGeometry(0.06, 0); s.translate((r() - 0.5) * o.w * 0.85, 0.7 + r() * 0.12, (r() - 0.5) * 0.35); f.push(s); }
  g.add(mesh(merge(l), mat(o.green, { rough: 0.8, flat: true })), mesh(merge(f), mat(o.flower, { rough: 0.7, flat: true })));
  return g;
}

/** pipe({ h }) — a black standpipe with a valve wheel, against the wall */
export function pipe(o = {}) {
  o = { h: 1.1, color: "#2c3035", ...o }; const g = new THREE.Group(), m = mat(o.color, { rough: 0.4, metal: 0.6 });
  const p = new THREE.CylinderGeometry(0.07, 0.07, o.h, 12); p.translate(0, o.h / 2, 0.12); g.add(mesh(p, m));
  const el = new THREE.TorusGeometry(0.15, 0.07, 10, 12, Math.PI / 2); el.rotateY(Math.PI / 2); el.translate(0, o.h, -0.03); g.add(mesh(el, m));
  const v = new THREE.TorusGeometry(0.1, 0.018, 6, 16); v.translate(0, o.h * 0.6, 0.24); g.add(mesh(v, m));
  return g;
}

/** bollard({ color }) */
export function bollard(o = {}) { o = { color: "#2b2f33", h: 0.9, ...o }; const g = new THREE.Group(); g.add(mesh(lathe([[0.001, 0], [0.11, 0], [0.1, o.h - 0.1], [0.12, o.h - 0.06], [0.06, o.h + 0.02], [0.001, o.h + 0.04]], 16), mat(o.color, { rough: 0.4, metal: 0.5 }))); return g; }

/** skyline({ from, to, z, seed, colors }) — far blocks behind the street, lighter and bluer with distance (the fog does the rest) */
export function skyline(o = {}) {
  o = { from: -40, to: 100, z: -16, seed: 9, colors: ["#c9877e", "#d9a596", "#e7ddd0", "#b9786f", "#e2c9b8"], hmin: 9, hmax: 20, ...o };
  const g = new THREE.Group(), r = rng(o.seed);
  for (let x = o.from; x < o.to;) {
    const w = 5 + r() * 7, h = o.hmin + r() * (o.hmax - o.hmin), col = o.colors[Math.floor(r() * o.colors.length)];
    const b = building({ x, w, floors: Math.max(2, Math.round(h / 3.1)), ground: 3.1, wall: r() < 0.6 ? "brick" : "plaster", brick: col, plaster: col, mortar: "#e6cfc2", sides: false, seed: Math.floor(r() * 100), patches: 0, cornice: r() < 0.7, windows: { w: 0.9, h: 1.5 } });
    b.position.z = o.z - r() * 6; b.traverse((c) => { if (c.isMesh) { c.castShadow = false; } });
    g.add(b); x += w + 0.2;
  }
  return g;
}

// ---------------------------------------------------------------- the park (second set)
/**
 * park({ from, to, path, grass }) — lawn, a gravel path along +x at z ∈ [0, path], lamp-lit edges. Use with tree,
 * bench, pond, hedge, kiosk. groundAt is flat (0) for the park.
 */
export function park(o = {}) {
  o = { from: -30, to: 90, depth: 40, path: 3.2, grass: "#6aa84f", gravel: "#e3d6bd", ...o };
  const g = new THREE.Group(), L = o.to - o.from, cx = (o.from + o.to) / 2;
  const gr = P.grass({ base: o.grass });
  const lawn = uvScale(new THREE.PlaneGeometry(L, o.depth).rotateX(-Math.PI / 2), 4); lawn.translate(cx, -0.01, -o.depth / 2 + o.path + 12);
  g.add(mesh(lawn, mat("#ffffff", { map: gr.map, rough: 0.95 }), { cast: false }));
  const pth = uvScale(new THREE.PlaneGeometry(L, o.path).rotateX(-Math.PI / 2), 3); pth.translate(cx, 0.005, o.path / 2);
  g.add(mesh(pth, mat("#ffffff", { map: P.concrete({ base: o.gravel, slabs: 1, cracks: 0, seed: 3 }).map, rough: 0.95 }), { cast: false }));
  return g;
}
/** hedge({ w, h, d, color }) — a clipped hedge: rounded box + painted lumps */
export function hedge(o = {}) {
  o = { w: 4, h: 1.1, d: 0.9, color: "#3f7a3c", seed: 6, ...o }; const g = new THREE.Group(), r = rng(o.seed);
  g.add(mesh(rbox(o.w, o.h, o.d, 0.5).translate(0, o.h / 2, 0), mat(o.color, { rough: 0.9 })));
  const lumps = []; for (let i = 0; i < Math.round(o.w * 5); i++) { const s = new THREE.IcosahedronGeometry(0.16 + r() * 0.1, 0); s.translate((r() - 0.5) * o.w * 0.95, o.h * (0.55 + r() * 0.45), (r() - 0.5) * o.d * 0.9); lumps.push(s); }
  g.add(mesh(merge(lumps), mat(P.css(P.shade(P.rgbOf(o.color), 1.15)), { rough: 0.9, flat: true })));
  return g;
}
/** pond({ w, d }) — a stone-rimmed pond; its water surface is a mirror (film adds it with F.mirror) */
export function pond(o = {}) {
  o = { w: 6, d: 3, rim: "#cfc7b8", ...o }; const g = new THREE.Group();
  const rim = new THREE.TorusGeometry(1, 0.08, 8, 48).rotateX(Math.PI / 2); rim.scale(o.w / 2, 1, o.d / 2); rim.translate(0, 0.04, 0); g.add(mesh(rim, mat(o.rim, { rough: 0.9 })));
  g.userData.water = { w: o.w, d: o.d, shape: "ellipse" };
  return g;
}

// ---------------------------------------------------------------- hand props (held, thrown, caught)
/** paddle({ text, color, h }) — a crossing guard's lollipop STOP sign; origin at the grip, pole up +y */
export function paddle(o = {}) {
  o = { text: "STOP", color: "#d23a2c", h: 1.25, r: 0.27, ...o };
  const g = new THREE.Group(), pole = new THREE.CylinderGeometry(0.022, 0.022, o.h, 10); pole.translate(0, o.h / 2 - 0.15, 0);
  g.add(mesh(pole, mat("#e9e6df", { rough: 0.4, metal: 0.3 })));
  const oct = new THREE.CylinderGeometry(o.r, o.r, 0.03, 8).rotateX(Math.PI / 2).rotateZ(Math.PI / 8); oct.translate(0, o.h - 0.15 + o.r * 0.8, 0);
  g.add(mesh(oct, mat(o.color, { rough: 0.45, clear: 0.4 })));
  const rim = new THREE.TorusGeometry(o.r * 0.9, 0.012, 4, 8).rotateZ(Math.PI / 8); rim.translate(0, o.h - 0.15 + o.r * 0.8, 0.017);
  g.add(mesh(rim, mat("#ffffff", { rough: 0.4 }), { cast: false }));
  const lab = P.label({ text: o.text, w: 256, h: 128, fg: "#ffffff", bg: null, worn: 0, pad: 0.1 });
  for (const s of [1, -1]) { const f = new THREE.PlaneGeometry(o.r * 1.5, o.r * 0.75); if (s < 0) f.rotateY(Math.PI); f.translate(0, o.h - 0.15 + o.r * 0.8, s * 0.018); g.add(mesh(f, new THREE.MeshStandardMaterial({ map: lab.map, transparent: true, roughness: 0.5 }), { cast: false })); }
  return g;
}
/** scoop({ color, r }) — a bumpy ice-cream scoop with a drippy collar */
export function scoop(o = {}) {
  o = { color: "#f4a6c0", r: 0.075, seed: 3, ...o }; const r = rng(o.seed);
  const g = new THREE.IcosahedronGeometry(o.r, 3), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i), k = 1 + 0.07 * Math.sin(v.x * 90 + o.seed) * Math.sin(v.y * 80) * Math.sin(v.z * 70); if (v.y < -o.r * 0.35) v.y = -o.r * 0.35 - (v.y + o.r * 0.35) * 0.25; p.setXYZ(i, v.x * k, v.y * k, v.z * k); }
  g.computeVertexNormals();
  const grp = new THREE.Group(); grp.add(mesh(g, mat(o.color, { rough: 0.55, clear: 0.3 })));
  const ring = new THREE.TorusGeometry(o.r * 0.9, o.r * 0.18, 8, 20).rotateX(Math.PI / 2); ring.translate(0, -o.r * 0.32, 0); grp.add(mesh(ring, mat(o.color, { rough: 0.5, clear: 0.3 })));
  return grp;
}
/** cone({ len }) — a waffle cone, tip down, origin at its rim */
export function cone(o = {}) {
  o = { len: 0.16, r: 0.05, color: "#d9a35b", ...o };
  const c = P.canvas(128, 128), x = c.getContext("2d"); x.fillStyle = o.color; x.fillRect(0, 0, 128, 128); x.strokeStyle = "rgba(120,70,20,.55)"; x.lineWidth = 4; for (let i = -128; i < 256; i += 22) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 128); x.moveTo(i + 128, 0); x.lineTo(i, 128); x.stroke(); }
  const g = new THREE.ConeGeometry(o.r, o.len, 20, 1, true).rotateX(Math.PI); g.translate(0, -o.len / 2, 0);
  const grp = new THREE.Group(); grp.add(mesh(g, mat("#ffffff", { map: P.tex(c), rough: 0.8, side: THREE.DoubleSide })));
  const rim = new THREE.TorusGeometry(o.r, 0.008, 6, 20).rotateX(Math.PI / 2); grp.add(mesh(rim, mat(o.color, { rough: 0.8 })));
  return grp;
}
/** snack({ color, text }) — a crinkly chips bag (pillow shape with a label) */
export function snack(o = {}) {
  o = { color: "#e8462e", text: "CHIPS", w: 0.16, h: 0.22, ...o };
  const g = new THREE.Group(), lab = P.label({ text: o.text, w: 128, h: 160, fg: "#fff3c4", bg: o.color, worn: 0.05, pad: 0.2 });
  const b = rbox(o.w, o.h, 0.06, 0.55, 18); g.add(mesh(b, mat("#ffffff", { map: lab.map, rough: 0.25, metal: 0.35, env: 1.4 })));
  for (const s of [-1, 1]) { const crimp = box(o.w * 0.95, 0.02, 0.012, 0, s * o.h * 0.5, 0); g.add(mesh(crimp, mat(o.color, { rough: 0.3, metal: 0.4 }))); }
  return g;
}
/** balloon({ color, string }) — a party balloon; origin at the string's held end, balloon `string` metres above */
export function balloon(o = {}) {
  o = { color: "#e23b3b", string: 1.1, r: 0.24, ...o };
  const g = new THREE.Group(), b = new THREE.SphereGeometry(o.r, 28, 20); b.scale(1, 1.18, 1); b.translate(0, o.string + o.r * 1.15, 0);
  g.add(mesh(b, mat(o.color, { rough: 0.15, clear: 1, clearRough: 0.05, env: 1.3 })));
  const knot = new THREE.ConeGeometry(0.03, 0.05, 8); knot.translate(0, o.string - 0.005, 0); g.add(mesh(knot, mat(o.color, { rough: 0.3 })));
  const st = new THREE.CylinderGeometry(0.004, 0.004, o.string, 4); st.translate(0, o.string / 2, 0); g.add(mesh(st, mat("#f2efe8", { rough: 0.8 }), { cast: false }));
  g.userData.top = o.string;
  return g;
}
/** handbag({ color }) — origin at the top of the handle */
export function handbag(o = {}) {
  o = { color: "#8a3b2e", ...o }; const g = new THREE.Group(), m = mat(o.color, { rough: 0.45, clear: 0.3 });
  const b = rbox(0.3, 0.22, 0.12, 0.45); b.translate(0, -0.25, 0); g.add(mesh(b, m));
  const h = new THREE.TorusGeometry(0.09, 0.012, 6, 16, Math.PI); h.translate(0, -0.14, 0); g.add(mesh(h, m));
  const clasp = box(0.05, 0.03, 0.02, 0, -0.16, 0.065); g.add(mesh(clasp, mat("#d9b45a", { metal: 0.8, rough: 0.3 })));
  return g;
}

/** pie({ r, color }) — a fruit pie in a tin, golden crust with steam slits; origin at the tin's base */
export function pie(o = {}) {
  o = { r: 0.17, crust: "#e0a85a", tin: "#b9bcc2", ...o }; const g = new THREE.Group();
  g.add(mesh(lathe([[0.001, 0], [o.r * 0.8, 0], [o.r, 0.05], [o.r * 1.05, 0.055], [0.001, 0.055]], 28), mat(o.tin, { metal: 0.8, rough: 0.35 })));
  const top = lathe([[o.r * 1.04, 0.05], [o.r * 1.0, 0.08], [o.r * 0.7, 0.11], [0.001, 0.12]], 28); g.add(mesh(top, mat(o.crust, { rough: 0.6, clear: 0.2 })));
  const rim = new THREE.TorusGeometry(o.r * 0.98, 0.022, 8, 28).rotateX(Math.PI / 2); rim.translate(0, 0.07, 0); g.add(mesh(rim, mat(P.css(P.shade(P.rgbOf(o.crust), 0.9)), { rough: 0.6 })));
  const sl = []; for (let i = 0; i < 4; i++) { const b = box(0.012, 0.005, 0.07, 0, 0.118, 0, (i * Math.PI) / 4 + 0.4); b.translate(Math.cos(i * 1.57) * o.r * 0.35, 0, Math.sin(i * 1.57) * o.r * 0.35); sl.push(b); }
  g.add(mesh(merge(sl), mat("#7a2e3a", { rough: 0.6 }), { cast: false }));
  return g;
}
/** parcel({ w, h, d, label }) — a cardboard box with a tape strip (stack them for deliveries) */
export function parcel(o = {}) {
  o = { w: 0.5, h: 0.32, d: 0.4, color: "#c9995e", tape: "#e7c98e", label: "", ...o }; const g = new THREE.Group();
  g.add(mesh(rbox(o.w, o.h, o.d, 0.12, 16), mat(o.color, { rough: 0.85, map: P.plaster({ base: o.color, seed: 7, strokes: 30 }).map })));
  g.add(mesh(box(o.w * 1.01, 0.012, 0.08, 0, o.h / 2, 0), mat(o.tape, { rough: 0.4 })), mesh(box(0.08, o.h * 1.01, o.d * 1.005, 0, 0, 0), mat(o.tape, { rough: 0.4 })));
  if (o.label) { const lab = P.label({ text: o.label, w: 256, h: 96, fg: "#c0392b", bg: null, worn: 0.2 }); const f = new THREE.PlaneGeometry(o.w * 0.6, o.h * 0.35); f.translate(o.w * 0.12, -o.h * 0.15, o.d / 2 + 0.003); g.add(mesh(f, new THREE.MeshStandardMaterial({ map: lab.map, transparent: true }), { cast: false })); }
  return g;
}
