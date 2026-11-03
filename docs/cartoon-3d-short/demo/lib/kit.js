// cartoon-3d-short · kit.js — the 3D world kit: painted two-tone materials and builders for ground, houses, trees,
// props, towers, walls, rooms and water. Every builder returns a THREE.Group (static pieces merged per material), so a
// set can move, hide or animate anything it built. Units are metres, y up; a character is ~2.1 m tall.
// Houses, vegetation, the batch and the geometry helpers are ported from mromidev/claude-animated-shorts
// templates/bridge/build.ts (MIT, (c) 2026 Mr omi); the bridge's Kenney CC0 models are replaced by procedural props
// here, so the kit needs no downloads.
import * as THREE from "three";
import { twoTone } from "./shade.js";
import { ctex, rep, rng, grassHD, cobbleHD, stoneHD, planksHD, beamHD, roofHD, facadeHD, brick, cloudHD, waterNear } from "./paint.js";

export const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------- materials (shared, cached by key) ----------------
const mats = new Map();
/** cached two-tone Lambert material; `make` returns MeshLambertMaterial params (color, map, side …) */
export const lam = (key, make) => {
  let m = mats.get(key);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial(make())); mats.set(key, m); }
  return m;
};
/** flat colour material (two-tone lit): col("#c0353a") */
export const col = (hex, opts = {}) => lam("c" + hex + (opts.side ? "d" : ""), () => ({ color: hex, ...opts }));
/** painted material from a canvas drawing: paintMat("sign", 512, 256, (g, r) => {...}, { repeat: [2, 1] }) */
export const paintMat = (key, w, h, draw, o = {}) => lam("p" + key, () => {
  const t = ctex(key, w, h, draw);
  if (o.repeat) rep(t, o.repeat[0], o.repeat[1]);
  return { map: t, side: o.side, alphaTest: o.alphaTest };
});
/** self-lit material (windows at night, lamps, screens): bypasses the two-tone light and blooms when > 1 */
export const glow = (hex, k = 2.2) => { const key = "g" + hex + k; let m = mats.get(key); if (!m) { m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k) }); mats.set(key, m); } return m; };
/** unlit painted face (signs and pictures must read in any light: a side sun turned them grey-blue) */
export const unlit = (key, w, h, draw) => { let m = mats.get("u" + key); if (!m) { m = new THREE.MeshBasicMaterial({ map: ctex(key, w, h, draw), color: 0xe8e8e8, alphaTest: 0.5 }); mats.set("u" + key, m); } return m; };

export const MAT = {
  grass: () => lam("grassHD", () => ({ map: grassHD() })),
  cobble: () => lam("cobbleHD", () => ({ map: cobbleHD() })),
  stone: () => lam("stoneHD", () => ({ map: stoneHD("stoneHD") })),
  wall: () => lam("wallHD", () => ({ map: stoneHD("wallHD", ["#c9bcaa", "#bfb19f", "#d1c5b4", "#b8aa97"], "#958776") })),
  cope: () => lam("copeHD", () => ({ map: stoneHD("copeHD", ["#e6dccd", "#ddd3c3", "#ece4d6", "#d6cbba"], "#aea293") })),
  marble: () => lam("marbleHD", () => ({ map: stoneHD("tstoneHD", ["#f1ece2", "#ebe4d8", "#f5f1e8", "#e4dccd"], "#c9bfae") })),
  planks: () => lam("planksHD", () => ({ map: planksHD() })),
  wood: () => lam("beamHD", () => ({ map: beamHD() })),
  brick: () => lam("brick", () => ({ map: rep(brick(), 1, 1) })),
  dirt: () => lam("dirt", () => ({ map: ctex("dirt", 512, 512, (g, r) => {
    g.fillStyle = "#c9a46e"; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? "rgba(150,110,60,0.25)" : "rgba(235,205,150,0.25)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 14, 2 + r() * 6, r() * 3, 0, 7); g.fill(); }
  }) })),
  sand: () => col("#e2c992"),
  iron: () => col("#3d414c"),
  gold: () => col("#e8b630"),
};

// ---------------- geometry pieces ----------------
const f32 = (a) => {
  const out = new Float32Array(a.count * a.itemSize);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
  return new THREE.Float32BufferAttribute(out, a.itemSize);
};
/** concatenate non-indexed geometries with position / normal / uv */
export const merge = (list) => {
  const g = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"]) {
    const n = list.reduce((s, x) => s + x.attributes[name].array.length, 0), arr = new Float32Array(n);
    let o = 0; for (const x of list) { arr.set(x.attributes[name].array, o); o += x.attributes[name].array.length; }
    g.setAttribute(name, new THREE.BufferAttribute(arr, name === "uv" ? 2 : 3));
  }
  return g;
};
/** quad a,b,c,d counter-clockwise seen from its front; uv (u0,v0) at a, (u1,v1) at c */
export const quad = (a, b, c, d, u1 = 1, v1 = 1, u0 = 0, v0 = 0) => {
  const g = new THREE.BufferGeometry();
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize();
  g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c, a, c, d].flatMap((v) => [v.x, v.y, v.z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 2, 3, 4, 5].flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1], 2));
  return g;
};
export const tri = (a, b, c) => {
  const g = new THREE.BufferGeometry();
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
  g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c].flatMap((v) => [v.x, v.y, v.z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 2].flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  return g;
};
/** axis box from min to max, texture tiled every `tile` metres (0 = one image per face) */
export const boxGeo = (min, max, tile = 0, bottom = false) => {
  const [x0, y0, z0] = [min.x, min.y, min.z], [x1, y1, z1] = [max.x, max.y, max.z];
  const t = (a) => (tile ? a / tile : 1);
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const faces = [
    quad(V(x0, y0, z1), V(x1, y0, z1), V(x1, y1, z1), V(x0, y1, z1), t(w), t(h)),
    quad(V(x1, y0, z0), V(x0, y0, z0), V(x0, y1, z0), V(x1, y1, z0), t(w), t(h)),
    quad(V(x0, y0, z0), V(x0, y0, z1), V(x0, y1, z1), V(x0, y1, z0), t(d), t(h)),
    quad(V(x1, y0, z1), V(x1, y0, z0), V(x1, y1, z0), V(x1, y1, z1), t(d), t(h)),
    quad(V(x0, y1, z1), V(x1, y1, z1), V(x1, y1, z0), V(x0, y1, z0), t(w), t(d)),
  ];
  if (bottom) faces.push(quad(V(x0, y0, z0), V(x1, y0, z0), V(x1, y0, z1), V(x0, y0, z1), t(w), t(d)));
  return merge(faces);
};
/** flat ground quad facing up from (x0, z0) to (x1, z1), texture every `tile` m */
export const quadUp = (x0, x1, z0, z1, tile = 4, y = 0) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), (x1 - x0) / tile, (z1 - z0) / tile);

/** collects pieces by material and merges them into one mesh per material */
export class Batch {
  constructor() { this.g = new Map(); }
  add(geo, mat, m) {
    const src = geo.index ? geo.toNonIndexed() : geo;
    const x = new THREE.BufferGeometry();
    x.setAttribute("position", f32(src.attributes.position));
    if (src.attributes.normal) x.setAttribute("normal", f32(src.attributes.normal)); else x.computeVertexNormals();
    x.setAttribute("uv", src.attributes.uv ? f32(src.attributes.uv) : new THREE.Float32BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
    if (m) x.applyMatrix4(m);
    const l = this.g.get(mat);
    if (l) l.push(x); else this.g.set(mat, [x]);
    return this;
  }
  /** box helper: centre (x, y, z) and size (w, h, d) in the batch's frame (optionally under matrix m) */
  box(mat, x, y, z, w, h, d, m, tile = 0) {
    const g = boxGeo(V(x - w / 2, y - h / 2, z - d / 2), V(x + w / 2, y + h / 2, z + d / 2), tile, true);
    return this.add(g, mat, m);
  }
  build(parent = new THREE.Group(), cast = true) {
    for (const [mat, list] of this.g) {
      const mesh = new THREE.Mesh(merge(list), mat);
      mesh.castShadow = cast; mesh.receiveShadow = true;
      parent.add(mesh);
    }
    this.g.clear();
    return parent;
  }
}
/** a group at (x, y, z) turned by yaw, built from a batch filled by fill(batch) */
const group = (x, y, z, yaw, fill, cast = true) => {
  const b = new Batch(); fill(b);
  const g = b.build(new THREE.Group(), cast);
  g.position.set(x, y, z); g.rotation.y = yaw;
  return g;
};
const M4 = (x = 0, y = 0, z = 0, ry = 0, s = 1) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ry), V(s, s, s));

// ---------------- ground ----------------
/** ground plane: kind grass | cobble | dirt | sand | planks | stone | marble | a material; size = half-extent (m) */
export const ground = ({ kind = "grass", size = 300, x = 0, z = 0, y = 0, w, d, tile } = {}) => {
  const m = typeof kind === "string" ? MAT[kind]() : kind, hw = w ? w / 2 : size, hd = d ? d / 2 : size;
  const t = tile ?? (kind === "grass" ? 12 : kind === "cobble" ? 6 : kind === "planks" ? 4 : 5);
  const mesh = new THREE.Mesh(quadUp(x - hw, x + hw, z - hd, z + hd, t, y), m);
  mesh.receiveShadow = true;
  return mesh;
};
/** a path / road strip from (x0, z0) to (x1, z1), `w` wide, slightly above the ground */
export const path = ({ from, to, w = 4, kind = "cobble", y = 0.012 }) => {
  const [x0, z0] = from, [x1, z1] = to, L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0);
  const g = new THREE.Mesh(quadUp(-w / 2, w / 2, 0, L, kind === "cobble" ? 4 : 5, y), typeof kind === "string" ? MAT[kind]() : kind);
  g.position.set(x0, 0, z0); g.rotation.y = a; g.receiveShadow = true;
  return g;
};
/** a soft hill: a squashed hemisphere of grass (far hills, a knoll to stand on) */
export const hill = ({ x = 0, z = 0, r = 30, h = 8, kind = "grass" }) => {
  const g = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const m = new THREE.Mesh(g, typeof kind === "string" ? MAT[kind]() : kind);
  m.scale.set(r, h, r); m.position.set(x, -0.05, z); m.castShadow = true; m.receiveShadow = true;
  return m;
};
/** a ring of far mountains (cones with a snow cap) around the origin at distance `dist` */
export const mountains = ({ dist = 420, n = 14, h = 90, seed = 3, rock = "#8d93b8", snow = "#f3f1ee" } = {}) => {
  const r = rng(seed);
  return group(0, 0, 0, 0, (b) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.3, d = dist * (0.9 + 0.25 * r()), hh = h * (0.6 + 0.7 * r()), rad = hh * (0.9 + 0.5 * r());
      const m = M4(Math.cos(a) * d, 0, Math.sin(a) * d, r() * 6);
      b.add(new THREE.ConeGeometry(rad, hh, 7, 1), col(rock), m.clone().multiply(M4(0, hh / 2)));
      b.add(new THREE.ConeGeometry(rad * 0.32, hh * 0.32, 7, 1), col(snow), m.clone().multiply(M4(0, hh * 0.84 + 0.2)));
    }
  }, false);
};

// ---------------- houses ----------------
export const STYLES = [
  { wall: "#ecdab2", shutter: "#3f6fb5", roof: "#d27a62" },              // cream
  { wall: "#d8a95f", shutter: "#2f6a43", roof: "#b8644f" },              // ochre
  { wall: "#c47a5c", shutter: "#2f5f6a", roof: "#8f97a8" },              // muted brick-red plaster
  { wall: "#efdcb8", shutter: "#2f5f6a", roof: "#c9775a", timber: true }, // cream timber frame
  { wall: "#ddbd78", shutter: "#5a3b2a", roof: "#d27a62" },              // straw ochre
  { wall: "#cc9a6c", shutter: "#3f6fb5", roof: "#8e7aa0" },              // terracotta sand
  { wall: "#e2c49a", shutter: "#8c3b4a", roof: "#c9775a" },              // warm sandstone
  { wall: "#e3d2b8", shutter: "#2f6a43", roof: "#8f97a8", brick: true },
];
const roofMat = (c) => lam("roof" + c, () => ({ map: roofHD(c, c === "#8f97a8"), side: THREE.DoubleSide }));
const trimM = () => lam("trimStone", () => ({ color: "#efe3c8" }));
const plinthM = () => MAT.cope();

/** gabled house: front facade (local +z) w wide, d deep, walls h high, ridge along local x. style 0-7 (STYLES).
 *  Heights the reference likes: 7 / 8.4 / 9.8 m. glowWin: lit windows (night). */
export const house = ({ x = 0, z = 0, y = 0, yaw = 0, w = 8, d = 7, h = 7, style = 0, glowWin = false }) => {
  const st = STYLES[style % STYLES.length];
  return group(x, y, z, yaw, (b) => {
    const k = `${style}_${w}_${h}`;
    const front = lam("hf" + k, () => ({ map: facadeHD("hf" + k, w, h, { ...st, door: true }) }));
    const side = lam(`hs${style}_${h}`, () => ({ map: facadeHD(`hs${style}_${h}`, 8, h, st) }));
    const wall = col(st.brick ? "#c8643f" : st.wall);
    const hw = w / 2, hd = d / 2, rh = d * 0.42, o = 0.35;
    b.add(quad(V(-hw, 0, hd), V(hw, 0, hd), V(hw, h, hd), V(-hw, h, hd)), front);
    b.add(quad(V(hw, 0, -hd), V(-hw, 0, -hd), V(-hw, h, -hd), V(hw, h, -hd)), side);
    b.add(quad(V(-hw, 0, -hd), V(-hw, 0, hd), V(-hw, h, hd), V(-hw, h, -hd)), side);
    b.add(quad(V(hw, 0, hd), V(hw, 0, -hd), V(hw, h, -hd), V(hw, h, hd)), side);
    b.add(tri(V(-hw, h, -hd), V(-hw, h, hd), V(-hw, h + rh, 0)), wall);
    b.add(tri(V(hw, h, hd), V(hw, h, -hd), V(hw, h + rh, 0)), wall);
    const ru = (w + 2 * o) / 4, rv = Math.hypot(hd + o, rh) / 4, rm = roofMat(st.roof);
    b.add(quad(V(-hw - o, h - 0.25, hd + o), V(hw + o, h - 0.25, hd + o), V(hw + o, h + rh, 0), V(-hw - o, h + rh, 0), ru, rv), rm);
    b.add(quad(V(hw + o, h - 0.25, -hd - o), V(-hw - o, h - 0.25, -hd - o), V(-hw - o, h + rh, 0), V(hw + o, h + rh, 0), ru, rv), rm);
    const cx = hw * 0.45 * (style % 2 ? 1 : -1);
    b.add(boxGeo(V(cx - 0.4, h + rh * 0.3, -hd * 0.35 - 0.4), V(cx + 0.4, h + rh + 1.1, -hd * 0.35 + 0.4), 2), MAT.brick());
    houseDetail(b, w, d, h, rh, cx);
    if (glowWin) { // lit window panes just in front of the painted ones (facadeHD layout: floor(w / 2.2) per floor)
      const n = Math.max(1, Math.floor(w / 2.2)), floors = Math.max(1, Math.floor(h / 2.8)), gm = glow("#ffcf6a", 1.6);
      for (let fl = 0; fl < floors; fl++) for (let i = 0; i < n; i++) {
        if (fl === 0 && i === Math.floor(n / 2)) continue;
        const px = -hw + ((i + 0.5) / n) * w, yb = fl * 2.8 + 0.9;
        b.add(quad(V(px - 0.42, yb, hd + 0.02), V(px + 0.42, yb, hd + 0.02), V(px + 0.42, yb + 1.25, hd + 0.02), V(px - 0.42, yb + 1.25, hd + 0.02)), gm);
      }
    }
  });
};
const houseDetail = (b, w, d, h, rh, chx) => {
  const hw = w / 2, hd = d / 2, tm = trimM(), floors = Math.max(1, Math.floor(h / 2.8));
  const ub = (mat, x0, x1, y0, y1, z0, z1) => b.box(mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
  b.add(boxGeo(V(-hw - 0.07, -0.05, -hd - 0.07), V(hw + 0.07, 0.45, hd + 0.07), 2), plinthM());   // plinth
  ub(tm, -hw - 0.12, hw + 0.12, h - 0.52, h - 0.25, hd, hd + 0.17);                                 // cornice front
  ub(tm, -hw - 0.12, hw + 0.12, h - 0.52, h - 0.25, -hd - 0.17, -hd);                               // cornice back
  for (const s of [-1, 1]) ub(tm, s < 0 ? -hw - 0.17 : hw, s < 0 ? -hw : hw + 0.17, h - 0.52, h - 0.25, -hd - 0.12, hd + 0.12);
  // front windows: sills + hoods on facadeHD's layout; door step + hood at the middle bay of the ground floor
  const n = Math.max(1, Math.floor(w / 2.2));
  for (let fl = 0; fl < floors; fl++) for (let i = 0; i < n; i++) {
    const px = -hw + ((i + 0.5) / n) * w, yb = fl * 2.8 + 0.9;
    if (fl === 0 && i === Math.floor(n / 2)) {
      ub(plinthM(), px - 0.82, px + 0.82, 0, 0.2, hd, hd + 0.5);
      ub(tm, px - 0.78, px + 0.78, 2.3, 2.44, hd, hd + 0.34);
      continue;
    }
    ub(tm, px - 0.6, px + 0.6, yb - 0.2, yb - 0.08, hd, hd + 0.14);
    ub(tm, px - 0.55, px + 0.55, yb + 1.33, yb + 1.43, hd, hd + 0.08);
  }
  const cz = -hd * 0.35, top = h + rh + 1.1;
  ub(col("#9a8778"), chx - 0.52, chx + 0.52, top, top + 0.16, cz - 0.52, cz + 0.52);
  b.add(new THREE.CylinderGeometry(0.13, 0.16, 0.42, 10).translate(0, 0.21, 0), col("#b8684a"), M4(chx, top + 0.16, cz));
};
/** a row of houses along local x from (x, z), facing +z turned by yaw; varied widths, heights and styles */
export const street = ({ x = 0, z = 0, yaw = 0, n = 6, seed = 1, gap = 0.4, glowWin = false }) => {
  const r = rng(seed), g = new THREE.Group();
  let u = 0;
  for (let i = 0; i < n; i++) {
    const w = 6 + Math.round(r() * 4), h = [7, 8.4, 9.8][Math.floor(r() * 3)], d = 6 + r() * 2;
    g.add(house({ x: u + w / 2, z: 0, w, d, h, style: Math.floor(r() * 8), glowWin }));
    u += w + gap;
  }
  g.children.forEach((c) => (c.position.x -= u / 2));
  g.position.set(x, 0, z); g.rotation.y = yaw;
  return g;
};

// ---------------- vegetation ----------------
const LEAF = ["#5aa83c", "#4c9a37", "#69b545", "#55a243", "#3f8f3c"];
const leafTex = (i) => ctex("leafHD" + i, 256, 128, (g, r) => {
  const base = new THREE.Color(LEAF[i]), top = base.clone().offsetHSL(0.012, 0.03, 0.08), bot = base.clone().offsetHSL(-0.015, 0.0, -0.08);
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "#" + top.getHexString()); gr.addColorStop(0.42, "#" + base.getHexString()); gr.addColorStop(1, "#" + bot.getHexString());
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  for (let k = 0; k < 46; k++) {
    const x = r() * 256, y = 10 + r() * 108, rad = 5 + r() * 9, light = y < 64 ? r() < 0.7 : r() < 0.25;
    for (const ox of [-256, 0, 256]) {
      g.strokeStyle = light ? "rgba(225,255,170,0.22)" : "rgba(20,70,30,0.2)"; g.lineWidth = 2.5; g.lineCap = "round";
      g.beginPath(); g.arc(x + ox, y + rad * 0.6, rad, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    }
  }
});
const leafMat = (i) => lam("leafHD" + i, () => ({ map: leafTex(i) }));
const LOBE = [new THREE.SphereGeometry(1, 20, 14), new THREE.SphereGeometry(1, 14, 10), new THREE.SphereGeometry(1, 10, 7)];
const TRUNK = new THREE.CylinderGeometry(0.6, 1, 1, 10, 1, true).translate(0, 0.5, 0);
/** cartoon tree / bush from lobes: kind round | fat | tall | cone | bush; h = height (m); q = detail 0 near .. 2 far */
export const tree = ({ x = 0, z = 0, y = 0, h = 7, kind = "round", seed = 1, q = 0 }) => group(x, y, z, 0, (b) => {
  const r = rng(Math.abs(Math.floor(seed * 7919)) % 200000 + 7), U = (a, c) => a + (c - a) * r();
  const leaf = leafMat(kind === "cone" ? 4 : Math.floor(r() * 4)), lobe = LOBE[q];
  const put = (px, py, pz, rad, sy = 0.9) => b.add(lobe, leaf, new THREE.Matrix4().compose(V(px, py, pz), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), r() * 6.28), V(rad, rad * sy, rad)));
  const trunk = (th, tr) => b.add(TRUNK, col("#8f5d3b"), new THREE.Matrix4().compose(V(0, -0.15, 0), new THREE.Quaternion(), V(tr, th + 0.15, tr)));
  const ring = (n, dist, r0, r1, cy, dy) => {
    const a0 = r() * 6.28;
    for (let i = 0; i < n; i++) { const a = a0 + (i * 6.28) / n + U(-0.35, 0.35), dd = dist * U(0.85, 1.12); put(Math.cos(a) * dd, cy + U(-dy, dy), Math.sin(a) * dd, U(r0, r1)); }
  };
  if (kind === "round" || kind === "fat") {
    const f = kind === "fat", cy = (f ? 0.58 : 0.64) * h;
    trunk((f ? 0.4 : 0.48) * h, 0.055 * h);
    put(0, cy, 0, (f ? 0.29 : 0.26) * h);
    ring(f ? 5 : 4, (f ? 0.22 : 0.18) * h, (f ? 0.19 : 0.17) * h, (f ? 0.23 : 0.21) * h, cy - 0.05 * h, 0.04 * h);
    put(U(-0.05, 0.05) * h, cy + (f ? 0.15 : 0.17) * h, U(-0.05, 0.05) * h, (f ? 0.19 : 0.17) * h);
  } else if (kind === "tall") {
    trunk(0.34 * h, 0.045 * h);
    put(0, 0.47 * h, 0, 0.17 * h, 1.3); put(U(-0.03, 0.03) * h, 0.65 * h, U(-0.03, 0.03) * h, 0.15 * h, 1.3); put(0, 0.82 * h, 0, 0.11 * h, 1.25);
    ring(3, 0.1 * h, 0.1 * h, 0.12 * h, 0.55 * h, 0.06 * h);
  } else if (kind === "cone") {
    trunk(0.2 * h, 0.05 * h);
    put(0, 0.3 * h, 0, 0.26 * h, 0.62); put(0, 0.5 * h, 0, 0.2 * h, 0.66); put(0, 0.68 * h, 0, 0.14 * h, 0.75); put(0, 0.84 * h, 0, 0.08 * h, 1.0);
  } else { // bush
    put(0, 0.46 * h, 0, 0.5 * h);
    ring(3, 0.42 * h, 0.32 * h, 0.38 * h, 0.32 * h, 0.04 * h);
  }
});
/** scatter trees on a ring / box, skipping a keep-out test: grove({ n, x0, x1, z0, z1, avoid: (x, z) => bool }) */
export const grove = ({ n = 20, x0 = -80, x1 = 80, z0 = -80, z1 = -40, seed = 2, avoid = () => false, kinds = ["round", "fat", "tall", "cone"], hMin = 5, hMax = 10, q = 1 }) => {
  const r = rng(seed), g = new THREE.Group();
  for (let i = 0, tries = 0; i < n && tries < n * 20; tries++) {
    const x = x0 + (x1 - x0) * r(), z = z0 + (z1 - z0) * r();
    if (avoid(x, z)) continue;
    g.add(tree({ x, z, h: hMin + (hMax - hMin) * r(), kind: kinds[Math.floor(r() * kinds.length)], seed: i + seed * 100, q })); i++;
  }
  return g;
};

// ---------------- props ----------------
/** wooden fence from (x0, z0) to (x1, z1) */
export const fence = ({ from, to, h = 1.1, step = 1.6, color = "#a8724a" }) => {
  const [x0, z0] = from, [x1, z1] = to, L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(z1 - z0, x1 - x0), n = Math.max(1, Math.round(L / step));
  return group(x0, 0, z0, -a, (b) => {
    const m = col(color);
    for (let i = 0; i <= n; i++) b.box(m, (i * L) / n, h / 2, 0, 0.14, h, 0.14);
    for (const y of [0.4 * h, 0.82 * h]) b.box(m, L / 2, y, 0, L, 0.1, 0.06);
  });
};
/** street lamp: iron post, lantern that glows at night (lit: true) */
export const lamp = ({ x = 0, z = 0, h = 3.6, lit = false }) => group(x, 0, z, 0, (b) => {
  const m = MAT.iron();
  b.add(new THREE.CylinderGeometry(0.07, 0.11, h, 8).translate(0, h / 2, 0), m);
  b.box(m, 0, h + 0.05, 0, 0.42, 0.08, 0.42);
  b.add(new THREE.CylinderGeometry(0.16, 0.12, 0.42, 6).translate(0, h + 0.3, 0), lit ? glow("#ffd27a", 2.6) : col("#f3e3b0"));
  b.add(new THREE.ConeGeometry(0.3, 0.3, 6).translate(0, h + 0.66, 0), m);
});
export const barrel = ({ x = 0, z = 0, y = 0, s = 1, color = "#a8724a" }) => group(x, y, z, 0, (b) => {
  b.add(new THREE.CylinderGeometry(0.42 * s, 0.42 * s, 1.0 * s, 14).translate(0, 0.5 * s, 0), col(color));
  for (const yy of [0.15, 0.85]) b.add(new THREE.CylinderGeometry(0.44 * s, 0.44 * s, 0.08 * s, 14).translate(0, yy * s, 0), MAT.iron());
});
export const crate = ({ x = 0, z = 0, y = 0, s = 0.9, yaw = 0 }) => group(x, y, z, yaw, (b) => { b.box(MAT.wood(), 0, s / 2, 0, s, s, s); });
export const table = ({ x = 0, z = 0, yaw = 0, w = 2.2, d = 1.1, h = 0.95, color = "#9a6440" }) => group(x, 0, z, yaw, (b) => {
  const m = col(color);
  b.box(m, 0, h - 0.05, 0, w, 0.1, d);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(m, sx * (w / 2 - 0.12), (h - 0.1) / 2, sz * (d / 2 - 0.12), 0.12, h - 0.1, 0.12);
});
export const bench = ({ x = 0, z = 0, yaw = 0, w = 2.4 }) => group(x, 0, z, yaw, (b) => {
  const m = col("#a8724a");
  b.box(m, 0, 0.5, 0, w, 0.08, 0.5); b.box(m, 0, 0.95, -0.22, w, 0.5, 0.06);
  for (const s of [-1, 1]) b.box(MAT.iron(), s * (w / 2 - 0.15), 0.25, 0, 0.08, 0.5, 0.5);
});
export const well = ({ x = 0, z = 0 }) => group(x, 0, z, 0, (b) => {
  b.add(new THREE.CylinderGeometry(1.1, 1.1, 0.9, 16, 1, true).translate(0, 0.45, 0), MAT.stone());
  b.add(new THREE.RingGeometry(0.85, 1.1, 16).rotateX(-Math.PI / 2).translate(0, 0.9, 0), MAT.cope());
  b.add(new THREE.CircleGeometry(0.86, 16).rotateX(-Math.PI / 2).translate(0, 0.4, 0), col("#1a3a5a"));
  for (const s of [-1, 1]) b.box(MAT.wood(), s * 0.95, 1.5, 0, 0.14, 1.9, 0.14);
  b.add(new THREE.ConeGeometry(1.5, 0.9, 4).rotateY(Math.PI / 4).translate(0, 2.8, 0), roofMat("#d27a62"));
});
/** cart: box on two wheels; tilt it with group.rotation.z */
export const cart = ({ x = 0, z = 0, yaw = 0, color = "#b5653f" }) => group(x, 0, z, yaw, (b) => {
  b.box(col(color), 0, 1.0, 0, 2.6, 0.7, 1.5);
  for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 16).rotateX(Math.PI / 2).translate(0, 0.55, s * 0.82), col("#7a4f33"));
  b.box(col("#7a4f33"), 2.0, 0.85, 0, 1.6, 0.08, 0.08);
});
export const rock = ({ x = 0, z = 0, s = 1, color = "#b7b4ad", seed = 1 }) => {
  const g = new THREE.IcosahedronGeometry(s, 0), m = new THREE.Mesh(g, col(color)), r = rng(seed);
  m.position.set(x, s * 0.45, z); m.scale.set(1 + r() * 0.4, 0.7 + r() * 0.3, 1 + r() * 0.3); m.rotation.y = r() * 6; m.castShadow = m.receiveShadow = true;
  return m;
};
/** flag on a pole; cloth painted by draw(g) on 256 x 160 (default: a plain two-colour flag) */
export const flag = ({ x = 0, z = 0, h = 6, yaw = 0, colors = ["#c0353a", "#f2c230"], draw }) => group(x, 0, z, yaw, (b) => {
  b.add(new THREE.CylinderGeometry(0.05, 0.06, h, 8).translate(0, h / 2, 0), MAT.wood());
  const key = "flag" + colors.join("");
  const m = lam(key, () => ({ side: THREE.DoubleSide, map: ctex(key, 256, 160, draw ?? ((g) => { g.fillStyle = colors[0]; g.fillRect(0, 0, 256, 160); g.fillStyle = colors[1]; g.fillRect(0, 60, 256, 40); })) }));
  b.add(new THREE.PlaneGeometry(1.6, 1.0, 8, 1).translate(0.82, h - 0.55, 0), m);
});
/** hanging banner (cloth with folds) for walls and halls */
export const banner = ({ x = 0, y = 4, z = 0, yaw = 0, w = 1.1, h = 2.6, color = "#b8553a", trim = "#e8c45a" }) => {
  const g = new THREE.PlaneGeometry(w, h, 10, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) / w; p.setZ(i, 0.05 * Math.sin(u * Math.PI * 7)); if (p.getY(i) < 0 && Math.abs(u) < 0.08) p.setY(i, p.getY(i) + 0.3); }
  g.computeVertexNormals();
  const key = "banner" + color + trim;
  const m = lam(key, () => ({ side: THREE.DoubleSide, map: ctex(key, 128, 300, (c) => { c.fillStyle = color; c.fillRect(0, 0, 128, 300); c.strokeStyle = trim; c.lineWidth = 10; c.strokeRect(10, 10, 108, 280); c.fillStyle = trim; c.beginPath(); c.moveTo(64, 100); c.lineTo(90, 150); c.lineTo(64, 200); c.lineTo(38, 150); c.fill(); }) }));
  const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.rotation.y = yaw; mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
};
/** signboard on two posts with an unlit painted face (draw(g) on 700 x 520) */
export const sign = ({ x = 0, z = 0, yaw = 0, key = "sign", draw, w = 1.4, h = 1.04, y = 1.6 }) => {
  const g = group(x, 0, z, yaw, (b) => {
    b.box(MAT.wood(), 0, y, -0.04, w + 0.06, h + 0.06, 0.06);
    for (const s of [-1, 1]) b.box(MAT.wood(), s * w * 0.37, y / 2, -0.1, 0.12, y + h / 2, 0.12);
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), unlit(key, 700, 520, draw ?? ((c) => { c.fillStyle = "#f6ecd2"; c.fillRect(0, 0, 700, 520); })));
  face.position.set(0, y, 0); g.add(face);
  return g;
};

// ---------------- big structures ----------------
/** tower: shape round | square, stone material, roof cone | flat | crenel; lean (deg, toward +x) */
export const tower = ({ x = 0, z = 0, r = 3, h = 20, shape = "round", roof = "cone", roofCol = "#8f97a8", mat = "wall", lean = 0, arcades = 0 }) => {
  const g = group(0, 0, 0, 0, (b) => {
    const m = typeof mat === "string" ? MAT[mat]() : mat, seg = shape === "round" ? 20 : 4, rot = shape === "round" ? 0 : Math.PI / 4;
    const body = new THREE.CylinderGeometry(r, r * 1.03, h, seg, 1, true).rotateY(rot).translate(0, h / 2, 0);
    // uv: tile the stone every ~2.5 m around and up
    const uv = body.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (2 * Math.PI * r) / 2.5, uv.getY(i) * h / 2.5);
    b.add(body, m);
    if (arcades) for (let k = 1; k <= arcades; k++) { // gallery rings: a ledge + columns per storey (a Pisa-like campanile)
      const y = (k * h) / (arcades + 1);
      b.add(new THREE.CylinderGeometry(r * 1.12, r * 1.12, 0.35, seg).rotateY(rot).translate(0, y, 0), MAT.cope());
      for (let c = 0; c < 16; c++) { const a = (c / 16) * Math.PI * 2; b.add(new THREE.CylinderGeometry(0.12, 0.12, h / (arcades + 1) - 0.4, 6).translate(Math.cos(a) * r * 1.08, y + (h / (arcades + 1)) / 2, Math.sin(a) * r * 1.08), MAT.cope()); }
    }
    if (roof === "cone") b.add(new THREE.ConeGeometry(r * 1.25, r * 1.8, seg).rotateY(rot).translate(0, h + r * 0.9, 0), roofMat(roofCol));
    else if (roof === "crenel") for (let c = 0; c < 12; c++) { const a = (c / 12) * Math.PI * 2; b.box(m, Math.cos(a) * r, h + 0.5, Math.sin(a) * r, 0.9, 1.0, 0.9); }
    else b.add(new THREE.CylinderGeometry(r * 1.06, r * 1.06, 0.4, seg).rotateY(rot).translate(0, h, 0), MAT.cope());
  });
  const pivot = new THREE.Group(); pivot.add(g); pivot.position.set(x, 0, z); pivot.rotation.z = -lean * Math.PI / 180;
  return pivot;
};
/** castle / town wall from (x0, z0) to (x1, z1) with crenellations on top */
export const wall = ({ from, to, h = 7, t = 1.6, crenel = true, mat = "wall" }) => {
  const [x0, z0] = from, [x1, z1] = to, L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(z1 - z0, x1 - x0);
  return group(x0, 0, z0, -a, (b) => {
    const m = MAT[mat]();
    b.add(boxGeo(V(0, 0, -t / 2), V(L, h, t / 2), 2.5), m);
    if (crenel) for (let u = 0.4; u < L - 0.4; u += 1.6) b.box(m, u + 0.4, h + 0.45, 0, 0.8, 0.9, t);
  });
};
/** a room (interior set): floor, back + side walls (front open to the camera at +z), optional window in the back wall.
 *  Back wall at z = -d/2. Its walls cast no shadow (a stage set: the 'interior' key light reaches inside). */
export const room = (o = {}) => { const g = roomGroup(o); g.traverse((c) => { if (c.isMesh) c.userData.noCast = true; }); return g; };
const roomGroup = ({ w = 12, d = 10, h = 5, floor = "planks", wallCol = "#e9d6b4", trim = "#9a6440", window: win = true }) => group(0, 0, 0, 0, (b) => {
  b.add(quadUp(-w / 2, w / 2, -d / 2, d / 2, 3), MAT[floor]());
  const wm = col(wallCol), hw = w / 2, hd = d / 2;
  if (win) { // back wall around a window hole (3 m wide, 2.2 m high, sill at 1.2 m), sky-blue pane
    const wx = 1.5, y0 = 1.2, y1 = 3.4;
    b.add(quad(V(-hw, 0, -hd), V(hw, 0, -hd), V(hw, y0, -hd), V(-hw, y0, -hd), w / 3, y0 / 3), wm);
    b.add(quad(V(-hw, y1, -hd), V(hw, y1, -hd), V(hw, h, -hd), V(-hw, h, -hd), w / 3, (h - y1) / 3), wm);
    b.add(quad(V(-hw, y0, -hd), V(-wx, y0, -hd), V(-wx, y1, -hd), V(-hw, y1, -hd)), wm);
    b.add(quad(V(wx, y0, -hd), V(hw, y0, -hd), V(hw, y1, -hd), V(wx, y1, -hd)), wm);
    b.add(quad(V(-wx, y0, -hd - 0.3), V(wx, y0, -hd - 0.3), V(wx, y1, -hd - 0.3), V(-wx, y1, -hd - 0.3)), glow("#bfe0ff", 1.15));
    b.box(col(trim), 0, y0 - 0.06, -hd + 0.06, 2 * wx + 0.3, 0.12, 0.3); b.box(col(trim), 0, 2.3, -hd - 0.15, 0.1, y1 - y0, 0.1); b.box(col(trim), 0, y1, -hd, 2 * wx + 0.3, 0.12, 0.12);
  } else b.add(quad(V(-hw, 0, -hd), V(hw, 0, -hd), V(hw, h, -hd), V(-hw, h, -hd), w / 3, h / 3), wm);
  b.add(quad(V(-hw, 0, hd), V(-hw, 0, -hd), V(-hw, h, -hd), V(-hw, h, hd), d / 3, h / 3), wm);
  b.add(quad(V(hw, 0, -hd), V(hw, 0, hd), V(hw, h, hd), V(hw, h, -hd), d / 3, h / 3), wm);
  b.box(col(trim), 0, 0.12, -hd + 0.04, w, 0.24, 0.08);                        // skirting
  for (const s of [-1, 1]) b.box(col(trim), s * (hw - 0.04), 0.12, 0, 0.08, 0.24, d);
});

// ---------------- water and sky things ----------------
/** a water plane (river / sea / pond) with painted ripple marks; world.js colours it per light. Returns the mesh. */
export const water = ({ x0 = -300, x1 = 300, z0 = -300, z1 = 300, y = -0.4, shape = "rect", r = 10, x = 0, z = 0 }) => {
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, map: rep(waterNear(), 1, 1) });
  m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping;
  twoTone(m, 0.5);
  const g = shape === "disc" ? new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2) : quadUp(x0, x1, z0, z1, 24);
  if (shape === "disc") { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r / 12, uv.getY(i) * r / 12); }
  const mesh = new THREE.Mesh(g, m); mesh.position.set(shape === "disc" ? x : 0, y, shape === "disc" ? z : 0); mesh.receiveShadow = true;
  mesh.userData.water = true;
  return mesh;
};
export { cloudHD };
