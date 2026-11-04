// sight-gag-short · gadget.js — the hero's one absurd tool. The reference's is a giant inflated leather glove on a
// rubber-hose arm that stretches out of a backpack machine; here it is a rig: a palm, four three-jointed fingers and a
// two-jointed thumb (fat, rounded, slightly glossy), a flared cuff with a big cross-stitched seam, and a hose rebuilt
// every frame as a cubic Bézier from the hero's socket into the cuff, sagging with slack and lagging behind fast
// moves. Hand shapes are data (SHAPES: point, wag, flickReady, flick, thumbsUp, flat, cup, fist, grab, pinch, ok …).
// Any other tip (a claw, a magnet, a plunger, a beak) can ride the same hose: gadget(film, { tip: (G) => Object3D }).
import * as THREE from "three";
import { mat, lathe, rbox, mesh, merge, box } from "./kit.js";
import * as PT from "./paint.js";
import { clamp, lerp, norm, cross, sub, add, mul, len, dot, K, wob, DEG } from "./core.js";
import { limbGeo } from "./figure.js";

const FINGERS = [
  // name, x at the knuckle (right hand, palm +z, thumb +x), phalanx lengths, radius
  ["index", 0.205, [0.23, 0.17, 0.14], 0.088],
  ["middle", 0.07, [0.26, 0.19, 0.15], 0.09],
  ["ring", -0.07, [0.24, 0.175, 0.14], 0.086],
  ["pinky", -0.2, [0.18, 0.14, 0.115], 0.078],
];
const up = (g) => g.rotateZ(Math.PI); // limbGeo hangs −y; fingers grow +y

/**
 * SHAPES — hand shapes as finger curls (radians-ish units: 1 ≈ 57°): f: [[mcp, pip, dip] × index, middle, ring,
 * pinky], s: spread per finger (radians), th: [out, across, curl1, curl2]. Mix any two with mixShape(a, b, k).
 */
export const SHAPES = {
  open: { f: [[0.05, 0.05, 0.03], [0.04, 0.04, 0.02], [0.05, 0.05, 0.03], [0.08, 0.06, 0.04]], s: [0.12, 0.03, -0.06, -0.16], th: [1.0, 0.2, 0.1, 0.1] },
  relaxed: { f: [[0.25, 0.35, 0.2], [0.3, 0.4, 0.25], [0.35, 0.45, 0.25], [0.42, 0.5, 0.3]], s: [0.08, 0.02, -0.04, -0.1], th: [0.75, 0.35, 0.25, 0.2] },
  flat: { f: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], s: [0.02, 0.0, -0.02, -0.04], th: [0.35, 0.1, 0.05, 0.05] },
  stop: { f: [[-0.05, 0, 0], [-0.05, 0, 0], [-0.05, 0, 0], [-0.05, 0, 0]], s: [0.04, 0.0, -0.03, -0.07], th: [0.55, 0.0, 0.05, 0.05] },
  cup: { f: [[0.35, 0.3, 0.2], [0.35, 0.3, 0.2], [0.35, 0.3, 0.2], [0.4, 0.3, 0.2]], s: [0.03, 0.0, -0.02, -0.05], th: [0.5, 0.4, 0.3, 0.2] },
  fist: { f: [[1.45, 1.6, 1.2], [1.5, 1.6, 1.2], [1.5, 1.6, 1.2], [1.5, 1.6, 1.2]], s: [0.02, 0, -0.02, -0.04], th: [0.35, 1.15, 0.5, 0.4] },
  point: { f: [[0.0, 0.02, 0.0], [1.5, 1.6, 1.2], [1.55, 1.6, 1.2], [1.55, 1.6, 1.2]], s: [0.02, 0, -0.02, -0.04], th: [0.4, 1.0, 0.5, 0.3] },
  pointUp: { f: [[0.0, 0.0, 0.0], [1.5, 1.6, 1.2], [1.55, 1.6, 1.2], [1.55, 1.6, 1.2]], s: [0.0, 0, -0.02, -0.04], th: [0.4, 1.0, 0.5, 0.3] },
  beckon: { f: [[0.4, 1.0, 0.8], [1.5, 1.6, 1.2], [1.55, 1.6, 1.2], [1.55, 1.6, 1.2]], s: [0.02, 0, -0.02, -0.04], th: [0.4, 1.0, 0.5, 0.3] },
  flickReady: { f: [[0.15, 0.1, 0.05], [1.2, 1.35, 1.0], [0.25, 0.2, 0.1], [0.35, 0.25, 0.15]], s: [0.14, 0.0, -0.1, -0.2], th: [0.2, 0.95, 0.35, 0.25] },
  flick: { f: [[0.1, 0.08, 0.05], [-0.15, -0.05, 0.0], [0.2, 0.15, 0.1], [0.3, 0.2, 0.12]], s: [0.16, 0.0, -0.12, -0.22], th: [0.55, 0.8, 0.25, 0.15] },
  pinch: { f: [[0.55, 0.6, 0.35], [0.85, 0.95, 0.7], [1.0, 1.1, 0.8], [1.1, 1.2, 0.8]], s: [0.0, 0, -0.02, -0.05], th: [0.25, 0.85, 0.35, 0.25] },
  grab: { f: [[0.65, 0.8, 0.6], [0.7, 0.85, 0.6], [0.7, 0.85, 0.6], [0.75, 0.85, 0.6]], s: [0.1, 0.02, -0.05, -0.12], th: [0.5, 0.7, 0.4, 0.35] },
  claw: { f: [[0.3, 0.9, 0.8], [0.3, 0.9, 0.8], [0.3, 0.9, 0.8], [0.35, 0.9, 0.8]], s: [0.16, 0.04, -0.06, -0.18], th: [0.9, 0.4, 0.5, 0.5] },
  thumbsUp: { f: [[1.45, 1.6, 1.2], [1.5, 1.6, 1.2], [1.5, 1.6, 1.2], [1.5, 1.6, 1.2]], s: [0.02, 0, -0.02, -0.04], th: [-0.1, -0.15, -0.05, 0.0] },
  ok: { f: [[0.75, 0.75, 0.5], [0.12, 0.12, 0.08], [0.1, 0.1, 0.06], [0.08, 0.08, 0.05]], s: [0.04, 0.06, -0.08, -0.22], th: [0.5, 0.8, 0.5, 0.3] },
  peace: { f: [[0.0, 0.0, 0.0], [0.0, 0.0, 0.0], [1.55, 1.6, 1.2], [1.55, 1.6, 1.2]], s: [0.18, -0.12, -0.02, -0.04], th: [0.35, 1.0, 0.5, 0.3] },
  // a basketball spin: index straight up, the other fingers loosely open and spread, thumb out — balances a ball on the
  // fingertip and can't be misread as a rude gesture (a lone raised finger can: avoid pointUp facing the camera)
  spin: { f: [[0.0, 0.0, 0.0], [0.32, 0.42, 0.25], [0.42, 0.5, 0.3], [0.5, 0.55, 0.3]], s: [0.02, -0.14, -0.3, -0.5], th: [1.05, 0.15, 0.1, 0.1] },
  gun: { f: [[0.0, 0.0, 0.0], [1.5, 1.6, 1.2], [1.55, 1.6, 1.2], [1.55, 1.6, 1.2]], s: [0.05, 0, -0.02, -0.04], th: [-0.05, -0.1, 0.0, 0.0] },
  horns: { f: [[0.0, 0.0, 0.0], [1.5, 1.6, 1.2], [1.55, 1.6, 1.2], [0.0, 0.0, 0.0]], s: [0.14, 0, -0.02, -0.2], th: [0.35, 1.0, 0.5, 0.3] },
  hold: { f: [[0.9, 0.9, 0.6], [0.95, 0.9, 0.6], [0.95, 0.9, 0.6], [1.0, 0.9, 0.6]], s: [0.03, 0.0, -0.03, -0.06], th: [0.3, 0.9, 0.4, 0.3] },
  shoo: { f: [[0.2, 0.15, 0.1], [0.2, 0.15, 0.1], [0.2, 0.15, 0.1], [0.25, 0.2, 0.1]], s: [0.02, 0.0, -0.02, -0.04], th: [0.4, 0.15, 0.05, 0.05] },
};
export function mixShape(a, b, k) {
  const A = typeof a === "string" ? SHAPES[a] : a, B = typeof b === "string" ? SHAPES[b] : b;
  return { f: A.f.map((r, i) => r.map((v, j) => lerp(v, B.f[i][j], k))), s: A.s.map((v, i) => lerp(v, B.s[i], k)), th: A.th.map((v, i) => lerp(v, B.th[i], k)) };
}
/** KS(t, [[t0, "point"], [t1, "fist", "snap"], …]) — keyframed hand shapes */
export function KS(t, track) {
  if (t <= track[0][0]) return track[0][1];
  for (let i = 1; i < track.length; i++) { const [t1, s1, e] = track[i]; if (t <= t1) { const [t0, s0] = track[i - 1]; return mixShape(s0, s1, K(t, [[t0, 0], [t1, 1, e || "io"]])); } }
  return track[track.length - 1][1];
}

/**
 * gadget(film, o) → Glove actor
 *   o.size (1 ≈ a 1.25 m hand), o.style: leather | cartoon | rubber | oven | boxing, o.color, o.hose { color, r, ribs },
 *   o.side "R" | "L", o.stitch (true), o.from: () => [x,y,z] the hose socket each frame (e.g. () => hero.socket("hose")),
 *   o.fromDir: () => [x,y,z] the direction the hose leaves the socket, o.tip: (G) => Object3D to replace the glove.
 */
export function gadget(film, o = {}) { const g = new Glove(film, o); film.actor(g); return g; }

export class Glove {
  constructor(film, o) {
    this.film = film;
    o = this.o = { size: 1.25, style: "leather", color: "#d4a65e", side: "R", stitch: true, thread: "#3b2a1c", hose: {}, ...o };
    const sx = o.side === "L" ? -1 : 1;
    const root = (this.root = new THREE.Group()); // wrist frame: fingers +y, palm normal +z
    const g = (this.g = new THREE.Group()); root.add(g); g.scale.setScalar(o.size);
    const style = o.style;
    const lea = style === "leather" ? PT.leather({ base: o.color }) : null;
    const M = (this.M = mat(lea ? "#ffffff" : o.color, { rough: style === "rubber" || style === "cartoon" ? 0.32 : style === "boxing" ? 0.25 : 0.48, clear: style === "oven" ? 0 : 0.35, clearRough: 0.3, map: lea ? lea.map : style === "oven" ? PT.cloth({ base: o.color, pattern: "knit" }).map : null, bump: lea ? lea.bump : null, bumpScale: 0.5, env: 0.9 }));
    this.dark = mat(PT.css(PT.shade(PT.rgbOf(o.color), 0.78)), { rough: 0.55 });
    if (o.tip) { const t = o.tip(this); g.add(t); this.custom = t; }
    else {
      // palm: an inflated rounded block, a bit thicker at the heel
      const palm = mesh(rbox(0.66, 0.66, 0.34, 0.82, 32), M); palm.position.set(0, 0.32, 0); g.add(palm);
      const heel = mesh(rbox(0.5, 0.3, 0.3, 0.9, 24), M); heel.position.set(0.04 * sx, 0.12, 0.02); g.add(heel);
      // knuckle ridge
      const ridge = mesh(rbox(0.6, 0.16, 0.3, 0.9, 24), M); ridge.position.set(0, 0.6, -0.01); g.add(ridge);
      this.fingers = FINGERS.map(([name, x, L, r]) => {
        const base = new THREE.Group(); base.position.set(x * sx, 0.62, 0); g.add(base);
        const segs = []; let parent = base;
        L.forEach((l, i) => {
          const j = new THREE.Group(); if (i) j.position.y = L[i - 1]; parent.add(j);
          const rr = r * (1 - i * 0.07); j.add(mesh(up(limbGeo(rr, rr * 0.94, l, 18)), M));
          segs.push(j); parent = j;
        });
        return { name, base, segs, L, r };
      });
      // thumb: two segments from the palm's side, resting out and a little forward
      const tb = new THREE.Group(); tb.position.set(0.3 * sx, 0.2, 0.06); g.add(tb);
      const t1 = new THREE.Group(); tb.add(t1); t1.add(mesh(up(limbGeo(0.1, 0.094, 0.21, 18)), M));
      const t2 = new THREE.Group(); t2.position.y = 0.21; t1.add(t2); t2.add(mesh(up(limbGeo(0.094, 0.088, 0.17, 18)), M));
      this.thumb = { tb, t1, t2 };
      // the cuff: a flared ring the hose plugs into, with the big stitched seam around the wrist
      const cuff = mesh(lathe([[0.001, -0.24], [0.12, -0.24], [0.2, -0.2], [0.28, -0.08], [0.31, 0.02], [0.3, 0.08], [0.26, 0.12], [0.001, 0.12]], 32), M); cuff.scale.z = 0.68; g.add(cuff);
      if (o.stitch) {
        const seam = new THREE.TorusGeometry(1, 0.012, 6, 48).rotateX(Math.PI / 2); seam.scale(0.312, 1, 0.312 * 0.68); seam.translate(0, 0.0, 0);
        const st = [seam];
        for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, x = Math.cos(a) * 0.315, z = Math.sin(a) * 0.315 * 0.68; for (const s of [-1, 1]) { const c = new THREE.CylinderGeometry(0.011, 0.011, 0.13, 5); c.rotateZ(s * 0.5); c.rotateY(-a + Math.PI / 2); c.translate(x, 0, z); st.push(c); } }
        g.add(mesh(merge(st), mat(o.thread, { rough: 0.8 }), { cast: false }));
      }
      if (style === "cartoon") {
        // three raised lines on the back of the hand
        const ln = []; for (let i = -1; i <= 1; i++) { const c = new THREE.CapsuleGeometry(0.018, 0.22, 4, 8); c.translate(i * 0.13, 0.36, -0.175); ln.push(c); }
        g.add(mesh(merge(ln), this.dark, { cast: false }));
      }
      if (style === "boxing") { this.shape = "fist"; }
    }
    // the hose: a tube rebuilt each frame
    const H = (this.H = { color: o.hose.color || o.color, r: (o.hose.r ?? 0.085) * o.size, ribs: o.hose.ribs ?? 0 });
    if (o.hose.stripes) {
      // a striped hose (a barber pole / crossing pole): the stripe map repeats along the hose's length each frame
      const c = PT.canvas(64, 16), x = c.getContext("2d"); x.fillStyle = o.hose.stripes[1]; x.fillRect(0, 0, 64, 16); x.fillStyle = o.hose.stripes[0]; x.beginPath(); x.moveTo(0, 0); x.lineTo(32, 0); x.lineTo(48, 16); x.lineTo(16, 16); x.closePath(); x.fill(); x.beginPath(); x.moveTo(-32, 0); x.lineTo(0, 0); x.lineTo(16, 16); x.lineTo(-16, 16); x.fill(); x.beginPath(); x.moveTo(64, 0); x.lineTo(96, 0); x.lineTo(112, 16); x.lineTo(80, 16); x.fill();
      this.stripeTex = PT.tex(c); this.stripeLen = o.hose.stripeLen || 0.5;
    }
    this.hoseM = new THREE.MeshPhysicalMaterial({ color: this.stripeTex ? "#ffffff" : H.color, map: this.stripeTex || null, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.3, envMapIntensity: 0.7 });
    this.hose = new THREE.Mesh(new THREE.BufferGeometry(), this.hoseM); this.hose.castShadow = true; this.hose.receiveShadow = true; film.world.add(this.hose);
    this.collar = mesh(new THREE.CylinderGeometry(H.r * 1.45, H.r * 1.3, H.r * 1.8, 16), this.dark); film.world.add(this.collar);
    root.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    this.setShape("relaxed");
  }
  reset() { this.root.visible = false; this.hose.visible = false; this.collar.visible = false; }

  setShape(s) {
    const S = typeof s === "string" ? SHAPES[s] : s; if (!this.fingers) return; const sx = this.o.side === "L" ? -1 : 1;
    this.fingers.forEach((f, i) => { f.base.rotation.set(S.f[i][0], 0, -S.s[i] * sx); f.segs[1].rotation.x = S.f[i][1]; f.segs[2].rotation.x = S.f[i][2]; });
    const [out, across, c1, c2] = S.th, T = this.thumb;
    T.tb.rotation.set(0.35 + across * 0.9, -across * 0.6 * sx, -(0.95 * out + 0.15) * sx);
    T.t1.rotation.set(c1 * 0.7, 0, 0); T.t2.rotation.set(c2 * 0.9, 0, 0);
  }

  /**
   * set({ at, aim, palm, rot, shape, squash, wag, from, fromDir, slack, lag, size, show })
   *   at: wrist position. aim: the direction the fingers point. palm: the direction the palm faces (made perpendicular).
   *   rot: [x,y,z]° instead of aim/palm. shape: name | SHAPES-like | mixShape(). squash: k along the aim (impacts).
   *   wag: extra index-finger side swing (radians). slack: hose sag (0 … 1). lag: [x,y,z] whip offset for the hose's
   *   last third (pass the wrist velocity × −0.1 for a trailing arc).
   */
  set(o) {
    this.root.visible = true;
    const at = o.at;
    let X, Y, Z;
    if (o.rot) { const e = new THREE.Euler(o.rot[0] * DEG, o.rot[1] * DEG, o.rot[2] * DEG); this.root.rotation.copy(e); }
    else {
      Y = norm(o.aim || [0, 1, 0]); let pz = o.palm || [0, 0, 1]; pz = sub(pz, mul(Y, dot(pz, Y))); if (len(pz) < 1e-3) pz = Math.abs(Y[1]) < 0.9 ? [0, 1, 0] : [0, 0, 1]; Z = norm(pz); X = cross(Y, Z);
      const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...X), new THREE.Vector3(...Y), new THREE.Vector3(...Z)); this.root.quaternion.setFromRotationMatrix(m);
    }
    this.root.position.set(...at);
    const k = o.squash ?? 1, sz = o.size ?? 1; this.g.scale.set(this.o.size * sz / Math.sqrt(k), this.o.size * sz * k, this.o.size * sz / Math.sqrt(k));
    if (this.fingers) {
      this.setShape(o.shape || "relaxed");
      if (o.wag) this.fingers[0].base.rotation.z += o.wag;
      if (o.curl) this.fingers.forEach((f, i) => { f.base.rotation.x += o.curl[i] || 0; });
    }
    this.root.updateMatrixWorld(true);
    if (o.from !== false && (o.from || this.o.from)) this.updateHose(o);
    return this;
  }
  /** align(point, target, o) — after set(): slide the whole glove so its named point lands on target (the glove follows
   *  something it holds: a collar, a string), then rebuild the hose. */
  align(name, target, o = {}) {
    const p = this.point(name), d = sub(target, p); this.root.position.x += d[0]; this.root.position.y += d[1]; this.root.position.z += d[2];
    this.root.updateMatrixWorld(true); if (o.from !== false && this.o.from) this.updateHose(o); return this;
  }
  /** wagAt(t, t0, at, toward) — a "tsk-tsk" finger wag target: index up IN PROFILE (palm facing `toward`, the person
   *  being told off), the whole hand rocking at the wrist. Never raise a lone finger palm-on or back-on to the camera:
   *  from the front it reads as the middle finger. */
  static wag(t, t0, at, toward = [1, 0, 0], o = {}) {
    const a = Math.max(0, t - t0), w = Math.sin(a * (o.hz ?? 17)) * (o.amp ?? 0.38) * Math.min(1, a * 6);
    const side = norm(cross([0, 1, 0], toward));
    return { at: add(at, mul(side, w * 0.12)), aim: norm(add([0, 1, 0], mul(side, w))), palm: norm(add(toward, [0, 0, 0.25])) };
  }
  /** scold(t, t0, at, toward) — the safe telling-off: index pointing straight at the person (horizontal, palm down),
   *  shaking up and down. Use this rather than a raised lone finger. */
  static scold(t, t0, at, toward = [1, 0, 0], o = {}) {
    const a = Math.max(0, t - t0), w = Math.sin(a * (o.hz ?? 15)) * (o.amp ?? 0.32) * Math.min(1, a * 6), d = norm(toward);
    return { at: add(at, [0, w * 0.1, 0]), aim: norm(add(d, [0, w, 0])), palm: [0, -1, 0] };
  }
  /** world position of a point on the glove: wrist, palm (front of the palm), back, grip (inside a fist), tip, middleTip, thumbTip, cuff, top (on a flat palm, for riders) */
  point(name = "palm", off = [0, 0, 0]) {
    this.root.updateMatrixWorld(true);
    const s = 1, v = new THREE.Vector3();
    const local = {
      wrist: [0, 0, 0], cuff: [0, -0.24, 0], palm: [0, 0.34, 0.2], back: [0, 0.34, -0.2], grip: [0, 0.45, 0.32], top: [0, 0.4, 0.2],
      center: [0, 0.4, 0],
    }[name];
    if (local) { v.set(...add(local, off)); return this.g.localToWorld(v).toArray(); }
    const fi = { tip: 0, middleTip: 1, ringTip: 2, pinkyTip: 3 }[name];
    if (fi != null && this.fingers) { const f = this.fingers[fi]; return f.segs[2].localToWorld(v.set(off[0], f.L[2] + f.r * 0.8 + off[1], off[2])).toArray(); }
    if (name === "thumbTip" && this.thumb) return this.thumb.t2.localToWorld(v.set(0, 0.2, 0)).toArray();
    return this.root.position.toArray();
  }
  /** the glove's own axes in world space: { x, y (fingers), z (palm) } */
  axes() { const e = this.root.matrixWorld.elements; return { x: norm([e[0], e[1], e[2]]), y: norm([e[4], e[5], e[6]]), z: norm([e[8], e[9], e[10]]) }; }

  updateHose(o = {}) {
    const from = typeof o.from === "function" ? o.from() : o.from || this.o.from(), ax = this.axes();
    const end = this.point("cuff"), d = len(sub(end, from));
    const dirA = norm(typeof o.fromDir === "function" ? o.fromDir() : o.fromDir || (this.o.fromDir ? this.o.fromDir() : [1, 0.6, 0]));
    const k1 = Math.min(d * 0.42, 2.6), k2 = Math.min(d * 0.38, 2.2), slack = o.slack ?? 0.25;
    const p0 = from, p1 = add(from, mul(dirA, k1)), p3 = end;
    let p2 = sub(end, mul(ax.y, k2));
    const sag = slack * Math.min(1.6, d * 0.25);
    p1[1] -= sag * 0.6; p2[1] -= sag;
    if (o.lag) p2 = add(p2, o.lag);
    const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(...p0), new THREE.Vector3(...p1), new THREE.Vector3(...p2), new THREE.Vector3(...p3));
    const L = curve.getLength(), segs = Math.max(24, Math.min(140, Math.round(L * 14)));
    const g = new THREE.TubeGeometry(curve, segs, this.H.r * (o.hoseScale ?? 1), 12, false);
    this.hose.geometry.dispose(); this.hose.geometry = g; this.hose.visible = true;
    this.collar.visible = true; this.collar.position.set(...p0); this.collar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dirA));
    this.hoseLen = L; if (this.stripeTex) this.stripeTex.repeat.set(L / this.stripeLen, 1);
  }
}

/**
 * reach(t, track) — the glove's wrist path as keys with automatic whip: returns { at, vel } so a shot can pass
 * lag: mul(vel, −0.08) to the hose (the arc trails a fast move). track = [[t, [x,y,z], ease] …]
 */
export function reach(t, track, dt = 1 / 60) {
  const a = K(t, track), b = K(t - dt, track);
  return { at: a, vel: mul(sub(a, b), 1 / dt) };
}
