// cartoon-3d-short · cast.js — flat characters as lit cards in the 3D world, and 2D effect cards.
// Each frame every character asks for a drawing (a key + a draw call); the pool keeps one canvas per distinct drawing,
// so a crowd in step shares canvases. Characters are yaw-only billboards shaded by cardShade() (scene tint, bright
// floor, side gradient toward the sun, painted crescent in the drawing); each gets a tight multiply contact shadow,
// and in golden light a real cast shadow. Cards, effects and blobs live on NOINK so the world ink never outlines them.
// Ported from mromidev/claude-animated-shorts templates/bridge/cast.ts (MIT, (c) 2026 Mr omi) and generalised: the
// bridge's story-specific staging is replaced by plain per-frame placements (see film.js `cast(t)`).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxContact, fxShadow, FX } from "./toon.js";
import { cardShade, blobMaterial, CARD_K } from "./shade.js";
import { NOINK } from "./post.js";

// ---------------- canvas pool ----------------
const makeEntry = (w, h) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  constructor() { this.live = new Map(); this.free = []; this.reqs = []; }
  req(key, w, h, k, draw) { const r = { key: `${w}x${h}|${key}`, w, h, k, draw }; this.reqs.push(r); return r; }
  flush() {
    const want = new Map();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d");
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- meshes ----------------
export const SU = 0.00216; // metres per design unit: the 1000-unit design card is 2.16 m (an adult is ~2.1 m)
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
const BODY = new THREE.PlaneGeometry(600 * SU, 1000 * SU).translate(0, (975 - 500) * SU, 0); // soles at y = 0
const CARD = new THREE.PlaneGeometry(1, 1);
const FLAT = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

class Actor {
  constructor(parent) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(BODY, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.receiveShadow = true; this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    this.blob = new THREE.Mesh(FLAT, blobMaterial(blank)); this.blob.layers.set(NOINK); this.blob.renderOrder = 0.5;
    parent.add(this.mesh, this.blob); this.hide();
  }
  hide() { this.mesh.visible = this.blob.visible = false; }
}
class Fx {
  constructor(parent) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide, fog: false });
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.mesh = new THREE.Mesh(CARD, this.mat); this.mesh.layers.set(NOINK); this.mesh.visible = false;
    parent.add(this.mesh);
  }
}

// ---------------- life ----------------
const hh = (i, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
/** eyelid 0 open .. 1 shut: blinks every 0.5-2.3 s (seeded per character), 4 frames half / shut / shut / half */
export const lidAt = (t, seed, fps = 30) => {
  let s = 0.3 + 1.6 * hh(seed, 1), k = 0;
  while (s < t - 0.2 && k < 400) { s += 0.5 + 1.8 * hh(seed, ++k); }
  const f = Math.floor((t - s) * fps + 1e-6);
  return f >= 0 && f < 4 ? [0.5, 1, 1, 0.5][f] : 0;
};
/** drawing resolution by camera distance: [canvas w, h, scale from the 600 x 1000 design] (sized for 1080 x 1920) */
const tier = (d, px) => {
  const k = d < 3.2 ? 2.4 : d < 6.5 ? 1.4 : d < 16 ? 0.7 : 0.36, s = Math.min(3, k * Math.max(0.5, px));
  const q = Math.round(s * 20) / 20;
  return [Math.round(600 * q), Math.round(1000 * q), q];
};
const q = (v, n = 120) => Math.round(v * n) / n;

// ---------------- the stage ----------------
/** Draws a list of placements each frame. A placement (all optional except who / at):
 *   { who: outfit (toon.person), at: [x, y, z], face: [dx, dz] direction the body faces / walks (default: toward camera),
 *     mode: "stand" | "walk" | "march" | "sit" | "fall" | "stroll", phase (walk cycle, default from t), expr, gesture,
 *     prop, wave, tilt, headTilt, look, scale (1 = adult 2.1 m), seed (head shape), blink (false = auto),
 *     view: "auto" | "front" | "side", shadow: true }
 *  Effects: { fx: "burst" | ... (toon.FX), at: [x, y, z], size: metres, t: 0..1 progress, arg, rot (deg), flat: bool, alpha } */
export class Stage {
  constructor(root) { this.root = root; this.pool = new Pool(); this.actors = []; this.fxs = []; this.sun = new THREE.Vector3(0, 1, 0); this.blobCol = "#9e9494"; this.realShadow = false; }
  actor(i) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  fx(i) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }
  /** call once per frame after the camera is placed */
  update(cam, places, effects, t, fps, pxScale) {
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), cpos = cam.position;
    const S = this.sun, sy = -S.y, sx = S.dot(right);
    const jobs = [];
    let ai = 0, fi = 0;
    for (const p of places) {
      if (!p || !p.who) continue;
      const a = this.actor(ai++), sc = p.scale ?? 1, [x, y, z] = p.at;
      const tx = cpos.x - x, tz = cpos.z - z, tl = Math.hypot(tx, tz) || 1;
      let [dx, dz] = p.face ?? [tx / tl, tz / tl];
      const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      const c = (tx * dx + tz * dz) / tl;                         // 1 = faces the camera, 0 = side-on
      const view = p.view === "front" ? "front" : p.view === "side" ? "side" : c < 0.57 ? "side" : "front";
      const mirror = dx * right.x + dz * right.z < 0;              // body heads screen-left
      const lightA = Math.round(Math.atan2(sy, mirror && view === "side" ? -sx : sx) / (Math.PI / 4)) * (Math.PI / 4);
      const dist = cpos.distanceTo(new THREE.Vector3(x, y + 1.1 * sc, z)) / sc;
      const [w, h, k] = tier(dist, pxScale);
      const seed = p.seed ?? 1, lid = p.blink === undefined || p.blink === false ? lidAt(t, seed * 7 + 3, fps) : p.blink === true ? 1 : p.blink;
      const mode = p.mode ?? "stand", walk = mode === "walk" || mode === "march" || mode === "stroll";
      const phase = q(((p.phase ?? (walk ? t * 1.0 : 0)) % 1 + 1) % 1, 30);
      let key, draw;
      if (view === "side") {
        const sm = walk ? "march" : mode === "stand" || mode === "sit" || mode === "fall" ? "stand" : mode;
        const fs = Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 10) / 10;
        const o = { phase, expr: p.expr ?? "neutral", mode: sm, blink: lid, stomp: mode === "march" ? 1.2 : 0.7, stride: (mode === "march" ? 1 : 0.8) * Math.max(0.3, fs), light: lightA, seed, pose: p.pose ?? 0, hand: p.hand };
        key = `S|${JSON.stringify(p.who)}|${JSON.stringify(o)}`;
        draw = (pen) => bodySide(pen, p.who, o);
      } else {
        const fm = mode === "walk" ? "stroll" : mode;
        const facing = p.facing ?? (Math.abs(dx * right.x + dz * right.z) > 0.3 ? (mirror ? -1 : 1) : 0);
        const o = { phase, expr: p.expr ?? "neutral", mode: fm, blink: lid, light: lightA, seed, facing, look: p.look ?? 0, gesture: p.gesture ?? null,
          wave: p.wave, tilt: p.tilt ?? 0, headTilt: p.headTilt ?? 0, lift: p.lift ?? 60 };
        const propKey = typeof p.prop === "function" ? "fn:" + (p.propKey ?? p.prop.toString().length) : JSON.stringify(p.prop ?? null);
        key = `F|${JSON.stringify(p.who)}|${JSON.stringify(o)}|${propKey}`;
        draw = (pen) => bodyFront(pen, p.who, { ...o, prop: p.prop ?? null });
      }
      a.r = this.pool.req(key, w, h, k, draw);
      a.mesh.visible = true; a.mesh.position.set(x, y, z); a.mesh.scale.set(mirror && view === "side" ? -sc : sc, sc, sc);
      a.mesh.rotation.set(0, Math.atan2(tx, tz), 0);
      a.mesh.castShadow = this.realShadow;
      // contact blob: tight, under the feet (skip when sitting high or flying)
      a.blob.visible = p.shadow !== false && mode !== "fall";
      if (a.blob.visible) { a.blob.position.set(x, y + 0.015, z); a.blob.scale.set(1.05 * sc, 1, 0.62 * sc); a.blob.rotation.y = Math.atan2(tx, tz); a.br = this.pool.req("blob|" + this.blobCol, 128, 128, 1, (pen) => fxContact(pen, this.blobCol)); }
      jobs.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].hide();
    for (const e of effects) {
      if (!e || !FX[e.fx]) continue;
      const F = FX[e.fx], f = this.fx(fi++), tt = q(Math.max(0, Math.min(1, e.t ?? 0.5)), 30);
      const k = Math.min(2, 512 / Math.max(F.w, F.h) * 1.4 * Math.max(0.5, pxScale));
      f.r = this.pool.req(`fx|${e.fx}|${tt}|${JSON.stringify(e.arg ?? null)}`, Math.round(F.w * k), Math.round(F.h * k), k, (pen) => F.draw(pen, tt, e.arg));
      f.mesh.material = F.soft || e.alpha !== undefined ? f.soft : f.mat;
      f.soft.opacity = e.alpha ?? 1;
      const s = e.size ?? 1;
      f.mesh.scale.set(s * F.w / Math.max(F.w, F.h), s * F.h / Math.max(F.w, F.h), 1);
      f.mesh.position.set(...e.at);
      if (e.flat) f.mesh.rotation.set(-Math.PI / 2, 0, (e.rot ?? 0) * Math.PI / 180);
      else { f.mesh.quaternion.copy(cam.quaternion); f.mesh.rotateZ((e.rot ?? 0) * Math.PI / 180); }
      f.mesh.visible = true; f.mesh.renderOrder = 2;
      jobs.push(f);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const j of jobs) {
      if (j instanceof Actor) {
        const tx = j.r.tex; j.mat.map = tx; j.dmat.map = tx;
        if (j.br?.tex) { const bt = j.br.tex; if (bt.generateMipmaps) { bt.generateMipmaps = false; bt.minFilter = THREE.LinearFilter; bt.needsUpdate = true; } j.blob.material.map = bt; }
      } else { j.mat.map = j.r.tex; j.soft.map = j.r.tex; }
    }
  }
}
export { fxShadow };
