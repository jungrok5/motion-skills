// engraving-collage-film · world.js — the 3-D collage stage. Every engraved plate becomes a CARD: a flat cut-out
// standing (or lying, or tilted) in real metres, with a soft paper-lift shadow behind it, fading into the paper with
// distance and going soft when it passes close in front of the lens. Cards can rise on a hinge, drift, sway or turn —
// the After-Effects 3-D-layer way of building a world. The same stage is drawn twice per frame: as the COMP (through the
// shot camera) and as the BREAKDOWN (an orbiting working view on a transparency checkerboard, each card outlined in its
// layer colour with corner handles, the shot camera drawn as a frustum with its path).
//
//   build(S) {                                        // in a piece's world.js
//     const f = facade({ w: 12, floors: 4, seed: 3 })
//     const c = S.card(f, { at: [-6, 0, -10], rot: 18, layer: 'street' })   // rot: turn about the vertical (deg)
//     S.floor(ground({ w: 40, d: 30, kind: 'cobbles' }), { at: [0, 0, -12] })
//     S.rise(c, 1.2, 0.8)                              // hinge up from flat between t = 1.2 and 2.0 s of the film
//     S.sway(sea, { amp: 0.15, k: 0.6, speed: 1.4 })   // a rolling sea strip
//   }
import * as THREE from 'three';
import { PAPER } from './engrave.js';
import { clamp, DEG, hash01, sid } from './core.js';

export const LAYER_COLORS = { far: '#9a6ad6', sky: '#2bb3a8', street: '#e8902a', buildings: '#e8902a', props: '#d64a8c', ground: '#d8c43a', cast: '#3a7bd5', sea: '#2b8fd6', near: '#e0533c' };
const layerColor = l => LAYER_COLORS[l] || ['#e8902a', '#d64a8c', '#2bb3a8', '#d8c43a', '#9a6ad6'][sid(l) % 5];

// shared uniforms: one switch flips every material between the comp and the breakdown
export const U = { uMode: { value: 0 }, uTime: { value: 0 }, uFocus: { value: 8 }, uHaze: { value: new THREE.Vector3(30, 160, 0.55) }, uPaper: { value: new THREE.Color(PAPER[0] / 255, PAPER[1] / 255, PAPER[2] / 255) }, uDof: { value: 1 } };

const VERT = /* glsl */`
uniform float uTime; uniform vec4 uSway;
varying vec2 vUv; varying float vDepth;
void main() {
  vUv = uv;
  vec3 p = position;
  if (uSway.x != 0.0) { float w = sin(p.x * uSway.y + uTime * uSway.z) + 0.5 * sin(p.x * uSway.y * 2.3 - uTime * uSway.z * 1.7 + 1.3); if (uSway.w > 0.5) p.y += uSway.x * w * uv.y; else p.z += uSway.x * w * (0.4 + uv.x); }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */`
uniform sampler2D map; uniform sampler2D blurMap; uniform float uMode; uniform float uFocus; uniform vec3 uHaze; uniform vec3 uPaper;
uniform float uOpacity; uniform float uHazeK; uniform float uDof; uniform vec3 uTint;
varying vec2 vUv; varying float vDepth;
void main() {
  vec4 a = texture2D(map, vUv);
  float coc = 0.0, hz = 0.0;
  if (uMode < 0.5) {
    // out of focus: close in front of the focus (strongly) and far behind it (gently)
    coc = uDof * (clamp((uFocus * 0.5 - vDepth) / (uFocus * 0.32), 0.0, 1.0) + 0.45 * clamp((vDepth - uFocus * 3.5) / (uFocus * 6.0), 0.0, 1.0));
    hz = uHazeK * smoothstep(uHaze.x, uHaze.y, vDepth) * uHaze.z;
  }
  vec4 c = coc > 0.01 ? mix(a, texture2D(blurMap, vUv), clamp(coc, 0.0, 1.0)) : a;
  c.rgb *= uTint;
  c.rgb = mix(c.rgb, uPaper, hz);
  float al = c.a * uOpacity * (1.0 - hz * 0.25);
  if (al < 0.015) discard;
  gl_FragColor = vec4(c.rgb, al);
}`;
const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; };
function cardMaterial(map, blur, o = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: !!o.depthWrite, side: THREE.DoubleSide,
    uniforms: { ...U, map: { value: map }, blurMap: { value: blur || map }, uOpacity: { value: o.opacity ?? 1 }, uHazeK: { value: o.haze ?? 1 },
      uSway: { value: new THREE.Vector4(0, 0, 0, 0) }, uTint: { value: new THREE.Vector3(1, 1, 1) } },
  });
}

/** the stage of one set: cards, floors, animations; prepared once, posed per frame by seek */
export class Stage {
  constructor(o = {}) {
    this.scene = new THREE.Scene();
    this.seed = o.seed ?? 1; this.cards = []; this.anims = []; this.haze = o.haze ?? [30, 160, 0.55]; this.name = o.name || 'set';
    this.helpers = new THREE.Group(); this.helpers.layers.set(1); this.scene.add(this.helpers);
  }
  /**
   * stand a plate in the world. o = { at: [x, y, z] (where its bottom centre stands), rot (deg about the vertical, + turns its face
   * toward +x), tilt (deg about its own horizontal: lean back), roll, h: metres tall (else the plate's own size), layer: name (the
   * breakdown colour), shadow: true, lift: 0.18 m (how far the shadow sits behind), opacity, haze: 1 (0 = never fades), anchor: 'bottom' | 'center' }
   */
  card(plate, o = {}) {
    const k = o.h ? o.h / plate.m[1] : o.w ? o.w / plate.m[0] : 1, w = plate.m[0] * k, h = plate.m[1] * k;
    const seg = o.sway ? 48 : 1, geo = new THREE.PlaneGeometry(w, h, seg, o.sway ? 4 : 1);
    if ((o.anchor || 'bottom') === 'bottom') geo.translate(0, h / 2 - (plate.base || 0) / plate.h * h, 0);
    const mat = cardMaterial(tex(plate.canvas), plate.blur ? tex(plate.blur) : null, o);
    const mesh = new THREE.Mesh(geo, mat), group = new THREE.Group();
    group.add(mesh);
    group.position.set(...(o.at || [0, 0, 0]));
    group.rotation.order = 'YXZ'; group.rotation.set((o.tilt || 0) * -DEG, (o.rot || 0) * DEG, (o.roll || 0) * DEG);
    if (o.shadow !== false && plate.shadow) {   // the paper-lift shadow: a blurred silhouette a little behind and down-right
      const sw = w * plate.shadow.width * 4 / plate.w, sh = h * plate.shadow.height * 4 / plate.h, lift = o.lift ?? Math.min(0.5, 0.04 * Math.max(w, h));
      const sg = new THREE.PlaneGeometry(sw, sh); if ((o.anchor || 'bottom') === 'bottom') sg.translate(0, h / 2 - (plate.base || 0) / plate.h * h, 0);
      const smat = cardMaterial(tex(plate.shadow), null, { opacity: o.shadowOpacity ?? 0.2, haze: o.haze });
      smat.uniforms.uTint.value.set(0.2, 0.19, 0.18);
      const s = new THREE.Mesh(sg, smat); s.position.set(lift * 0.9, -lift * 0.7, -lift); s.renderOrder = -1; group.add(s); group.userData.shadow = s;
    }
    this.scene.add(group);
    const card = { group, mesh, mat, w, h, layer: o.layer || 'props', name: o.name || `card${this.cards.length}`, base: { pos: group.position.clone(), rot: group.rotation.clone() }, o };
    if (o.sway) this.sway(card, o.sway);
    this._outline(card);
    this.cards.push(card);
    return card;
  }
  /** lay a plate flat on the ground (a floor sheet): at = its centre, rot = turn about the vertical */
  floor(plate, o = {}) {
    const c = this.card(plate, { shadow: false, anchor: 'center', layer: 'ground', ...o, tilt: 0 });
    c.group.rotation.set(-Math.PI / 2, 0, (o.rot || 0) * DEG, 'YXZ'); c.group.rotation.order = 'XYZ';
    c.mat.depthWrite = true; c.mesh.renderOrder = -10; c.base.rot = c.group.rotation.clone(); c.floor = true;
    return c;
  }
  /** hang plates in an arc facing the centre (a sky or a far panorama that holds while the camera turns):
   *  o = { r: radius m, y, center: [x, z], span: degrees covered, start: degrees of the middle (0 = toward −z), layer } */
  ring(plates, o = {}) {
    const n = plates.length, r = o.r ?? 180, span = o.span ?? 150, c = o.center || [0, 0];
    return plates.map((p, i) => { const a = ((o.start ?? 0) + (n === 1 ? 0 : -span / 2 + span * i / (n - 1))) * DEG;
      return this.card(p, { at: [c[0] + Math.sin(a) * r, o.y ?? 0, c[1] - Math.cos(a) * r], rot: -a / DEG, layer: o.layer || 'sky', shadow: false, haze: o.haze ?? 0, h: o.h }); });
  }
  /** a card that always turns to face the camera about the vertical (characters, smoke, a distant crowd) */
  billboard(card) { card.billboard = true; return card; }
  /** hinge a card up from lying flat (from: −90 = face up on the ground) to standing, between t0 and t0 + dur (film seconds) */
  rise(card, t0, dur = 0.8, from = -88) { (this.riseTimes ||= []).push(t0); this.anims.push((t) => { const u = clamp((t - t0) / dur), e = 1 - Math.pow(1 - u, 3) * (1 - 1.7 * u * (1 - u)); card.group.rotation.x = card.base.rot.x + (from * DEG) * (1 - e); }); return card; }
  /** drift a card at v = [vx, vy, vz] metres per second (clouds, a balloon, a ship) */
  drift(card, v) { this.anims.push((t) => { card.group.position.set(card.base.pos.x + v[0] * t, card.base.pos.y + v[1] * t, card.base.pos.z + v[2] * t); }); return card; }
  /** a gentle bob / rock (a boat on swell, a hanging sign): amp metres up-down, rock degrees, period seconds */
  bob(card, o = {}) { const ph = hash01(sid(card.name), 1) * 6.28; this.anims.push((t) => { const w = Math.sin(t * 6.283 / (o.period ?? 3.2) + ph); card.group.position.y = card.base.pos.y + (o.amp ?? 0.08) * w; card.group.rotation.z = card.base.rot.z + (o.rock ?? 1.5) * DEG * Math.sin(t * 6.283 / (o.period ?? 3.2) * 0.9 + ph + 1); }); return card; }
  /** a rolling wave along the card (sea strips, flags, banners): amp m, k (waves per metre), speed, axis 'z' | 'y' */
  sway(card, o = {}) { card.mat.uniforms.uSway.value.set(o.amp ?? 0.12, o.k ?? 0.5, o.speed ?? 1.2, o.axis === 'y' ? 1 : 0); return card; }
  /** any per-frame change: fn(t, card) */
  animate(card, fn) { this.anims.push((t) => fn(t, card)); return card; }

  _outline(card) {
    // breakdown: the card's rectangle in its layer colour + corner handles (children of the card: they follow it)
    const col = new THREE.Color(layerColor(card.layer)), g = card.mesh.geometry; g.computeBoundingBox();
    const b = g.boundingBox, pts = [[b.min.x, b.min.y], [b.max.x, b.min.y], [b.max.x, b.max.y], [b.min.x, b.max.y]].map(([x, y]) => new THREE.Vector3(x, y, 0.002));
    const loop = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.95, depthTest: false }));
    const dots = new THREE.Points(new THREE.BufferGeometry().setFromPoints([...pts, new THREE.Vector3((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, 0.002)]), new THREE.PointsMaterial({ color: col, size: 6, sizeAttenuation: false, depthTest: false }));
    for (const o of [loop, dots]) { o.layers.set(1); o.renderOrder = 10; card.mesh.add(o); }
    card.outline = loop; card.dots = dots;
  }
  /** apply every animation for film time t */
  pose(t) { for (const c of this.cards) { if (!c.floor) { c.group.position.copy(c.base.pos); c.group.rotation.copy(c.base.rot); } } for (const a of this.anims) a(t); }
  stats() { return { cards: this.cards.length, floors: this.cards.filter(c => c.floor).length, layers: [...new Set(this.cards.map(c => c.layer))] }; }
}

/** a camera frustum + path helper for the breakdown view */
export class CamHelper {
  constructor(scene) {
    this.g = new THREE.Group(); this.g.layers.set(1); scene.add(this.g);
    const m = (c, op = 1) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: op, depthTest: false });
    this.frus = new THREE.LineSegments(new THREE.BufferGeometry(), m('#22a35a'));
    this.aim = new THREE.Line(new THREE.BufferGeometry(), m('#5a5a5a', 0.7));
    this.path = new THREE.Line(new THREE.BufferGeometry(), m('#d64a8c', 0.9));
    this.body = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: '#22a35a', size: 9, sizeAttenuation: false, depthTest: false }));
    this.tgt = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: '#e8902a', size: 8, sizeAttenuation: false, depthTest: false }));
    for (const o of [this.frus, this.aim, this.path, this.body, this.tgt]) { o.layers.set(1); o.renderOrder = 20; this.g.add(o); }
  }
  setPath(points) { this.path.geometry.dispose(); this.path.geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p))); }
  update(cam, look, len = 1.6) {
    cam.updateMatrixWorld(); const h = Math.tan(cam.fov * DEG / 2) * len, w = h * cam.aspect, o = cam.position.clone();
    const c = [[-w, -h], [w, -h], [w, h], [-w, h]].map(([x, y]) => new THREE.Vector3(x, y, -len).applyMatrix4(cam.matrixWorld));
    const seg = []; for (let i = 0; i < 4; i++) seg.push(o, c[i], c[i], c[(i + 1) % 4]);
    this.frus.geometry.dispose(); this.frus.geometry = new THREE.BufferGeometry().setFromPoints(seg);
    this.aim.geometry.dispose(); this.aim.geometry = new THREE.BufferGeometry().setFromPoints([o, new THREE.Vector3(...look)]);
    this.body.geometry.dispose(); this.body.geometry = new THREE.BufferGeometry().setFromPoints([o]);
    this.tgt.geometry.dispose(); this.tgt.geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...look)]);
  }
}

/** the transparency checkerboard the breakdown view sits on */
export function checker(w, h, s = 16) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#e4e4e4';
  for (let j = 0; j < h / s; j++) for (let i = 0; i < w / s; i++) if ((i + j) % 2) x.fillRect(i * s, j * s, s, s);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
}
export { THREE };
