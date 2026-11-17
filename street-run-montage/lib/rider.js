// street-run-montage · rider.js — the rider and the board, from a spec, and the ride as a function of story time.
//
//   const rider = new Rider(SPEC.rider, route, { dur })      // build the body + board (three.js groups, cel + ink)
//   rider.plan({ speed: [{t, v}], lane: [{t, v}], moves: [...] })   // tables: speed → distance, lane, bob, hair lag
//   rider.pose(tau)                                             // set every joint for story time tau; returns numbers
//
// The body is a rig of rigid parts (capsules, ellipsoids) under bones; the legs are two-bone IK with fixed bone
// lengths and the knee pole on the body's front, so feet stay on the deck (or on the ground point they planted on).
// Moves: push · ride · ollie · kickflip · shuvit · grind · manual · carve · tuck · look · wave · point · fist ·
// armsOut · cheer · dismount (then the rider stands; idle breathes). Every big move gathers (a crouch that moves
// against the action, ≥ .12 s) and settles (absorb, overshoot, recover). LIM holds the joint limits; pose() reports
// anything outside them, any foot target out of reach, and the contacts (for the slip check).
import * as THREE from 'three';
import { clamp, lerp, keys, ease, smooth, bump, n1, hash, span, Table, DEG, TAU, mix, shade, canvas } from './core.js';
import { cel, inked, flat, shadeTint } from './look.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Q = new THREE.Quaternion(), M = new THREE.Matrix4();
export const G = 9.81;

/** joint limits (degrees) — the check fails a pose outside these */
export const LIM = { knee: [0, 150], elbow: [0, 150], neckYaw: 80, neckPitch: 45, spineTwist: 50, spineBend: 60, hipFlex: [-30, 125] };

const DEFAULT = {
  name: 'rider', height: 1.6, build: 1, mass: 50, stance: 'regular',
  skin: '#f6cdb0', blush: '#f29a8a', hair: '#3a2c26', hairStyle: 'long', hairLen: .42, eyes: '#4a6fc8', brows: null,
  cap: { color: '#26303c', logo: '', logoColor: '#ffffff', brim: 1 }, beanie: null,
  top: { color: '#3f72c8', hood: '#f1f1ee', cuff: null, print: '', oversize: 1.15 },
  bottom: { color: '#24262c', kind: 'shorts' }, socks: '#f4f4f2',
  shoes: { color: '#f4f2ee', accent: '#e8532e', sole: '#e9e4da' },
  board: { deck: '#d9b07c', grip: '#2b2b2e', wheels: '#f26a2c', truck: '#c9ced3', graphic: ['#e8532e', '#f2b440', '#2f6fd0'] },
  ink: '#2b2438', inkW: 2.2,
};
const merge2 = (a, b) => { const o = { ...a }; for (const k in b) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' ? { ...a[k], ...b[k] } : b[k]; return o; };

// ───────────── the face: painted on the head sphere's texture (anime eyes, brows, mouth; blink and mouth variants) ─────────────
function faceTex(spec, blink = 0, mouth = 0, look = 0) {
  const c = canvas(1024, 512), g = c.getContext('2d');
  g.fillStyle = spec.skin; g.fillRect(0, 0, 1024, 512);
  const cx = 256, ey = 268, ex = 78, ink = shade(spec.hair, -.35);
  // blush
  for (const sx of [-1, 1]) { const gr = g.createRadialGradient(cx + sx * 104, ey + 58, 4, cx + sx * 104, ey + 58, 42); gr.addColorStop(0, spec.blush + 'aa'); gr.addColorStop(1, spec.blush + '00'); g.fillStyle = gr; g.fillRect(cx + sx * 104 - 50, ey + 10, 100, 100); }
  for (const sx of [-1, 1]) {
    const x = cx + sx * ex, w = 30, h = 40 * (1 - blink * .92);
    if (blink < .85) {
      g.save(); g.beginPath(); g.ellipse(x, ey, w, h, 0, 0, TAU); g.clip();
      g.fillStyle = '#fbfbff'; g.fillRect(x - w, ey - 44, w * 2, 88);
      const ix = x + look * 8, gr = g.createLinearGradient(0, ey - 34, 0, ey + 34); gr.addColorStop(0, shade(spec.eyes, -.45)); gr.addColorStop(.6, spec.eyes); gr.addColorStop(1, shade(spec.eyes, .35));
      g.fillStyle = gr; g.beginPath(); g.ellipse(ix, ey + 2, 22, 32, 0, 0, TAU); g.fill();
      g.fillStyle = shade(spec.eyes, -.7); g.beginPath(); g.ellipse(ix, ey + 4, 10, 15, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ix - 8, ey - 12, 7, 9, -.4, 0, TAU); g.fill(); g.beginPath(); g.arc(ix + 8, ey + 14, 3.5, 0, TAU); g.fill();
      g.restore();
    }
    // upper lash line (thick, tilted), lower lash hint
    g.strokeStyle = ink; g.lineCap = 'round'; g.lineWidth = 9;
    g.beginPath(); const top = ey - h; g.moveTo(x - sx * 34, top + 10); g.quadraticCurveTo(x, top - 6, x + sx * 36, top + 6); g.stroke();
    if (blink < .85) { g.lineWidth = 3; g.beginPath(); g.moveTo(x - 18, ey + h - 2); g.lineTo(x + 14, ey + h - 1); g.stroke(); }
    // brow
    g.lineWidth = 6; g.strokeStyle = spec.brows || shade(spec.hair, -.2); g.beginPath(); g.moveTo(x - sx * 26, ey - 66); g.quadraticCurveTo(x, ey - 76, x + sx * 30, ey - 70); g.stroke();
  }
  // nose and mouth
  g.strokeStyle = shade(spec.skin, -.25); g.lineWidth = 3; g.beginPath(); g.moveTo(cx + 2, ey + 52); g.lineTo(cx - 2, ey + 60); g.stroke();
  g.strokeStyle = shade(spec.skin, -.45); g.fillStyle = '#8a3a3a';
  if (mouth > .3) { g.beginPath(); g.ellipse(cx, ey + 96, 16 * mouth + 6, 14 * mouth, 0, 0, Math.PI); g.fill(); g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 20, ey + 96); g.lineTo(cx + 20, ey + 96); g.stroke(); }
  else { g.lineWidth = 3.5; g.beginPath(); g.moveTo(cx - 12, ey + 94); g.quadraticCurveTo(cx, ey + 98 + mouth * 10, cx + 12, ey + 94); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function logoTex(text, bg, fg) {
  const c = canvas(512, 256), g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
  if (text) { g.fillStyle = fg; g.font = '900 86px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 120, 150); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function graphicTex(cols, deck) {
  const c = canvas(256, 1024), g = c.getContext('2d'); g.fillStyle = deck; g.fillRect(0, 0, 256, 1024);
  cols.forEach((cc, i) => { g.fillStyle = cc; g.beginPath(); g.arc(128, 300 + i * 200, 110 - i * 18, 0, TAU); g.fill(); g.fillRect(0, 700 + i * 60, 256, 26); });
  g.fillStyle = '#ffffff'; g.fillRect(30, 120, 196, 14);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ───────────── geometry helpers ─────────────
/** a capsule along -Y from the bone origin, length l, radii r0 (top) → r1 (bottom) */
function limb(l, r0, r1 = r0, seg = 10) {
  const g = new THREE.CylinderGeometry(r1, r0, l, seg, 1, true); g.translate(0, -l / 2, 0);
  const a = new THREE.SphereGeometry(r0, seg, 6, 0, TAU, 0, Math.PI / 2), b = new THREE.SphereGeometry(r1, seg, 6, 0, TAU, Math.PI / 2, Math.PI / 2); b.translate(0, -l, 0);
  return mergeGeos([g, a, b]);
}
function mergeGeos(list) {
  const parts = list.map(g => g.index ? g.toNonIndexed() : g); let n = 0; for (const g of parts) n += g.attributes.position.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
  for (const g of parts) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) U.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('uv', new THREE.BufferAttribute(U, 2)); return out;
}
const ell = (rx, ry, rz, seg = 16) => new THREE.SphereGeometry(1, seg, Math.max(8, seg * .6 | 0)).scale(rx, ry, rz);

// ───────────── the board ─────────────
export function buildBoard(b, ink, inkW) {
  const g = new THREE.Group(); g.name = 'board';
  const L = .80, W = .21, T = .016, kick = .13, kickA = 16 * DEG;
  const geo = new THREE.BoxGeometry(L, T, W, 24, 1, 4), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ax = Math.abs(x), edge = L / 2 - kick;
    if (ax > edge) { const d = ax - edge; y += Math.sin(kickA) * d * (d / kick) * 1.6; x = Math.sign(x) * (edge + d * Math.cos(kickA)); }
    const rz = W / 2 * (ax > L / 2 - .1 ? Math.sqrt(Math.max(0, 1 - ((ax - (L / 2 - .1)) / .1) ** 2)) * .55 + .45 : 1); z = z * rz / (W / 2);
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals(); geo.rotateY(Math.PI / 2);   // length along Z (nose at -Z)
  const mats = [cel(b.deck), cel(b.deck), cel(b.grip), cel('#ffffff', { map: graphicTex(b.graphic, b.deck), key: 'gfx' + b.graphic.join() }), cel(b.deck), cel(b.deck)];
  const deck = new THREE.Mesh(geo, mats); deck.castShadow = true; deck.position.y = .085; inked(deck, ink, inkW * .8); g.add(deck);
  const wheels = [];
  for (const z of [-.27, .27]) {
    const tr = new THREE.Group(); tr.position.set(0, .085 - T / 2, z); g.add(tr);
    const base = new THREE.Mesh(new THREE.BoxGeometry(.06, .02, .07), cel(b.truck)); base.position.y = -.012; tr.add(base);
    const hanger = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .19, 8).rotateZ(Math.PI / 2), cel(b.truck)); hanger.position.y = -.045; tr.add(hanger); inked(hanger, ink, inkW * .7);
    for (const x of [-.085, .085]) {
      const wg = new THREE.Group(); wg.position.set(x, -.045, 0); tr.add(wg);
      const wm = new THREE.Mesh(new THREE.CylinderGeometry(.027, .027, .032, 14).rotateZ(Math.PI / 2), cel(b.wheels)); wm.castShadow = true; wg.add(wm); inked(wm, ink, inkW * .8);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .034, 8).rotateZ(Math.PI / 2), cel('#f4f0e6')); wg.add(hub);
      wheels.push(wg);
    }
  }
  g.userData = { wheels, wheelR: .027, deckTop: .085 + T / 2, axleY: .085 - T / 2 - .045, L, W, kick: L / 2 - kick };
  return g;
}

// ───────────── the body ─────────────
export function buildBody(S) {
  const H = S.height, k = H / 1.6, ink = S.ink, iw = S.inkW, ov = S.top.oversize || 1.15;
  const skinM = cel(S.skin, { shade: S.skinShade || '#e6b2ac' }), hairM = cel(S.hair, S.hairShade ? { shade: S.hairShade } : {});
  const D = {
    legU: .365 * k, legL: .35 * k, ankle: .07 * k, hipW: .09 * k * S.build, pelvisY: .8 * k,
    spine: .22 * k, chest: .16 * k, neck: .065 * k, headR: .138 * k, shW: .17 * k * S.build, armU: .26 * k, armL: .24 * k, hand: .075 * k,
  };
  const bones = {}, root = new THREE.Group(); root.name = S.name;
  const bone = (name, parent, x, y, z) => { const b = new THREE.Group(); b.name = name; b.position.set(x, y, z); parent.add(b); bones[name] = b; return b; };
  const part = (b, geo, color, o = {}) => { const m = new THREE.Mesh(geo, color === S.skin ? skinM : typeof color === 'string' ? cel(color) : color); m.castShadow = true; m.receiveShadow = true; if (o.ink !== false) inked(m, ink, o.inkW || iw); if (o.pos) m.position.set(...o.pos); if (o.rot) m.rotation.set(...o.rot); b.add(m); return m; };
  const pelvis = bone('pelvis', root, 0, 0, 0), spine = bone('spine', pelvis, 0, .04 * k, 0), chest = bone('chest', spine, 0, D.spine, 0);
  const neck = bone('neck', chest, 0, D.chest, 0), head = bone('head', neck, 0, D.neck, 0);
  // hoodie (oversized): belly on the spine, chest + shoulders on the chest, hood behind the neck
  const top = S.top;
  part(pelvis, ell(.15 * k * S.build, .1 * k, .11 * k), S.bottom.color, { pos: [0, -.02 * k, 0] });
  part(spine, ell(.17 * k * ov * S.build, .16 * k, .125 * k * ov), top.color, { pos: [0, .09 * k, 0] });
  part(chest, ell(.185 * k * ov * S.build, .14 * k, .13 * k * ov), top.color, { pos: [0, .03 * k, 0] });
  part(spine, new THREE.CylinderGeometry(.165 * k * ov * S.build, .16 * k * ov * S.build, .05 * k, 16).scale(1, 1, .76), top.cuff || shade(top.color, -.08), { pos: [0, -.02 * k, 0] });
  part(chest, ell(.15 * k, .085 * k, .1 * k), top.hood, { pos: [0, .15 * k, -.07 * k], rot: [.4, 0, 0] });
  part(chest, ell(.16 * k * S.build, .07 * k, .09 * k), top.color, { pos: [0, .17 * k, -.09 * k], rot: [.6, 0, 0] });
  for (const sx of [-1, 1]) part(chest, new THREE.CylinderGeometry(.006, .006, .16 * k, 5), top.hood, { pos: [sx * .04 * k, .06 * k, .118 * k * ov], ink: false });
  if (top.print) { const pm = new THREE.Mesh(new THREE.PlaneGeometry(.16 * k, .05 * k), flat('#ffffff', { map: logoTex(top.print, top.color, shade(top.color, .35)), transparent: false })); pm.material.map.repeat.set(.5, 1); pm.position.set(0, .0, .132 * k * ov); chest.add(pm); }
  // neck + head (face texture), cap or beanie, hair
  part(neck, limb(D.neck + .02, .045 * k, .045 * k, 8), S.skin, { pos: [0, D.neck, 0], ink: false });
  const faces = {}; const face = blink => mouth => { const key = blink + ':' + mouth; return faces[key] || (faces[key] = faceTex(S, blink, mouth)); };
  const headMat = shadeTint(new THREE.MeshToonMaterial({ map: face(0)(0), gradientMap: cel('#fff').gradientMap }), S.skinShade || '#e6b2ac');
  const headM = part(head, new THREE.SphereGeometry(D.headR, 28, 18).scale(1, 1.06, 1), headMat, { pos: [0, D.headR * .95, 0] });
  const hy = D.headR * .95, hr = D.headR;
  // ears
  for (const sx of [-1, 1]) part(head, ell(.022 * k, .034 * k, .016 * k, 8), S.skin, { pos: [sx * hr * .97, hy - .005, -.01], ink: true, inkW: iw * .7 });
  // hair: a shell over the back and top, bangs, side locks and long locks (bones, so they can trail)
  part(head, new THREE.SphereGeometry(hr * 1.07, 24, 14, Math.PI * .8, Math.PI * 1.4, 0, Math.PI * .72).scale(1, 1.06, 1.04), hairM, { pos: [0, hy, -.004] });
  part(head, new THREE.SphereGeometry(hr * 1.08, 24, 10, 0, TAU, 0, Math.PI * .3).scale(1, 1.06, 1.04), hairM, { pos: [0, hy, 0] });
  for (let i = -3; i <= 3; i++) { const a = i * .17; part(head, new THREE.ConeGeometry(.032 * k, .11 * k, 5).scale(1, 1, .35).rotateX(Math.PI).rotateZ(-i * .08), hairM, { pos: [Math.sin(a) * hr * .98, hy + hr * .55, Math.cos(a) * hr * .93], rot: [.35, 0, 0], inkW: iw * .7 }); }
  for (const sx of [-1, 1]) part(head, new THREE.ConeGeometry(.03 * k, .2 * k, 5).scale(1, 1, .4).rotateX(Math.PI), hairM, { pos: [sx * hr * .92, hy - .02 * k, .045 * k], rot: [.05, 0, sx * .05], inkW: iw * .7 });
  const locks = [];
  const nL = S.hairStyle === 'short' ? 0 : S.hairStyle === 'bob' ? 7 : 9, Ll = S.hairStyle === 'bob' ? .16 * k : S.hairLen * k;
  for (let i = 0; i < nL; i++) {
    const a = Math.PI + (i - (nL - 1) / 2) * (S.hairStyle === 'bob' ? .36 : .27), segs = 3, sl = Ll / segs;
    let parent = bone('lock' + i, head, Math.sin(a) * hr * .85, hy + .01 * k, Math.cos(a) * hr * .82 - .01);
    const chain = [parent];
    for (let j = 0; j < segs; j++) {
      const w = (.05 - j * .012) * k;
      part(parent, limb(sl, w * .5, w * .38, 6).scale(1, 1, .45), hairM, { inkW: iw * .7 });
      if (j < segs - 1) { parent = bone(`lock${i}_${j + 1}`, parent, 0, -sl, 0); chain.push(parent); }
    }
    locks.push({ chain, a, side: Math.sin(a) });
  }
  if (S.cap) {
    const capM = cel(S.cap.color);
    part(head, new THREE.SphereGeometry(hr * 1.13, 24, 12, 0, TAU, 0, Math.PI * .5).scale(1, .82, 1.05), capM, { pos: [0, hy + .015 * k, -.004] });
    const brim = new THREE.CylinderGeometry(hr * .95, hr * .95, .012, 20, 1, false, -Math.PI * .45, Math.PI * .9).scale(1, 1, 1.15 * (S.cap.brim ?? 1));
    part(head, brim, capM, { pos: [0, hy + .03 * k, .07 * k], rot: [-.12, 0, 0] });
    if (S.cap.logo) { const lm = new THREE.Mesh(new THREE.PlaneGeometry(.085 * k, .042 * k), flat('#ffffff', { map: logoTex(S.cap.logo, S.cap.color, S.cap.logoColor) })); lm.material.map.repeat.set(.5, 1); lm.position.set(0, hy + .075 * k, hr * 1.02); lm.rotation.x = -.42; head.add(lm); }
  } else if (S.beanie) { part(head, new THREE.SphereGeometry(hr * 1.14, 22, 12, 0, TAU, 0, Math.PI * .42).scale(1, 1.12, 1.06), S.beanie, { pos: [0, hy + .035 * k, -.006] }); part(head, new THREE.TorusGeometry(hr * 1.06, .022 * k, 6, 24).rotateX(Math.PI / 2).scale(1, 1, 1.02), shade(S.beanie, -.12), { pos: [0, hy + .055 * k, -.006], inkW: iw * .7 }); }
  // arms: shoulders on the chest, thick sleeves, hands
  for (const [sd, sx] of [['L', 1], ['R', -1]]) {
    const sh = bone('shoulder' + sd, chest, sx * D.shW, .1 * k, 0);
    const ua = bone('upperArm' + sd, sh, 0, 0, 0); part(ua, limb(D.armU, .064 * k * ov, .058 * k * ov), top.color);
    const fa = bone('foreArm' + sd, ua, 0, -D.armU, 0); part(fa, limb(D.armL - .02, .058 * k * ov, .054 * k * ov), top.color);
    part(fa, new THREE.CylinderGeometry(.05 * k, .052 * k, .04 * k, 10), top.cuff || shade(top.color, -.08), { pos: [0, -D.armL + .03, 0] });
    const hd = bone('hand' + sd, fa, 0, -D.armL, 0); part(hd, ell(.032 * k, .05 * k, .026 * k, 10), S.skin, { pos: [0, -.035 * k, 0], inkW: iw * .7 });
    part(hd, ell(.012 * k, .026 * k, .012 * k, 6), S.skin, { pos: [0, -.03 * k, .025 * k], rot: [.5, 0, 0], ink: false });
  }
  // legs: shorts cuffs on the thighs, skin, socks, shoes
  for (const [sd, sx] of [['L', 1], ['R', -1]]) {
    const hip = bone('hip' + sd, pelvis, sx * D.hipW, -.04 * k, 0);
    const th = bone('thigh' + sd, hip, 0, 0, 0); part(th, limb(D.legU, .074 * k, .054 * k), S.skin);
    if (S.bottom.kind !== 'pants') part(th, new THREE.CylinderGeometry(.095 * k * S.build, .088 * k * S.build, .16 * k, 12).translate(0, -.06 * k, 0), S.bottom.color);
    else part(th, limb(D.legU, .075 * k, .058 * k), S.bottom.color);
    const sn = bone('shin' + sd, th, 0, -D.legU, 0); part(sn, limb(D.legL, .053 * k, .036 * k), S.bottom.kind === 'pants' ? S.bottom.color : S.skin);
    part(sn, new THREE.CylinderGeometry(.037 * k, .035 * k, .09 * k, 10).translate(0, -D.legL + .05 * k, 0), S.socks, { inkW: iw * .7 });
    const ft = bone('foot' + sd, sn, 0, -D.legL, 0);
    const shoe = S.shoes;
    part(ft, ell(.047 * k, .042 * k, .115 * k, 14), shoe.color, { pos: [0, -D.ankle * .55, .045 * k] });
    part(ft, new THREE.BoxGeometry(.1 * k, .025 * k, .26 * k), shoe.sole, { pos: [0, -D.ankle + .012 * k, .045 * k] });
    part(ft, ell(.048 * k, .016 * k, .08 * k, 10), shoe.accent, { pos: [sx * .012, -D.ankle * .5, .03 * k], ink: false });
  }
  return { root, bones, D, headMat, face, locks, headM };
}

// ───────────── IK + bone orientation helpers (world space → local quaternions) ─────────────
const _a = V(), _b = V(), _c = V(), _d = V();
function setWorldBasis(bone, yDir, zHint) {
  const y = _a.copy(yDir).normalize(), z = _b.copy(zHint).addScaledVector(y, -zHint.dot(y)); if (z.lengthSq() < 1e-8) z.set(0, 0, 1).addScaledVector(y, -y.z); z.normalize();
  const x = _c.crossVectors(y, z).normalize();
  M.makeBasis(x, y, z); const qw = new THREE.Quaternion().setFromRotationMatrix(M);
  const qp = new THREE.Quaternion(); bone.parent.getWorldQuaternion(qp);
  bone.quaternion.copy(qp.invert().multiply(qw)); bone.updateMatrixWorld(true);
}
/** two-bone IK: hip world H, target T, pole P (unit, the knee side) → knee world K and whether it reached */
export function ik2(H, T, L1, L2, P) {
  const d = _d.subVectors(T, H), dist = d.length(), max = (L1 + L2) * .9995, reach = dist <= max + 1e-4, r = Math.min(Math.max(dist, Math.abs(L1 - L2) + 1e-3), max);
  const dir = d.clone().normalize(), a = (L1 * L1 - L2 * L2 + r * r) / (2 * r), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const pole = P.clone().addScaledVector(dir, -P.dot(dir)).normalize();
  return { K: H.clone().addScaledVector(dir, a).addScaledVector(pole, h), reach, over: Math.max(0, dist - max), T2: H.clone().addScaledVector(dir, r) };
}
const angle = (a, b) => Math.acos(clamp(a.dot(b) / (a.length() * b.length() || 1), -1, 1)) / DEG;

// ───────────── the rider: body + board + the ride ─────────────
export class Rider {
  constructor(spec, route, o = {}) {
    this.S = merge2(DEFAULT, spec || {}); this.R = route; this.dur = o.dur || 60;
    const body = buildBody(this.S); Object.assign(this, body);
    this.board = buildBoard(this.S.board, this.S.ink, this.S.inkW); this.bd = this.board.userData;
    this.group = new THREE.Group(); this.group.add(this.root, this.board); this.group.name = 'rider';
    this.sigma = this.S.stance === 'goofy' ? -1 : 1;
    this.legLen = this.D.legU + this.D.legL;
    this.plan({ speed: [{ t: 0, v: 0 }], moves: [] });
  }
  /** the ride: speed keys (m/s, story time), lane keys (m, + = right), moves; builds the distance / bob / lag tables */
  plan({ speed = [{ t: 0, v: 4 }], lane = [{ t: 0, v: 0 }], moves = [], s0 = 0 } = {}) {
    const hz = 120, D = this.dur + 2;
    this.speedKeys = speed; this.laneKeys = lane; this.s0 = s0;
    this.moves = moves.map(m => ({ ...m })).sort((a, b) => a.at - b.at);
    this.V = new Table(D, hz, t => Math.max(0, keys(speed, t)));
    this.Sx = this.V.integral(s0);
    // pushes: contact windows from distance (plant ahead, lift once the board has run 0.62 m past the planted foot)
    this.pushes = [];
    for (const m of this.moves) if (m.do === 'push') {
      const n = m.n || 2, per = m.every || .9;
      for (let i = 0; i < n; i++) {
        const t0 = m.at + i * per, plant = t0 + .16 * per * 1.1, sp = this.Sx.at(plant), lift = Math.min(this.Sx.inverse(sp + .62), plant + per * .62);
        this.pushes.push({ t0, plant, lift, back: Math.min(t0 + per, lift + .3 * per), sp, last: i === n - 1, end: m.at + n * per });
      }
      m.end = m.at + n * per;
    }
    // air moves: pop time, airtime from height; grinds: on / off
    for (const m of this.moves) {
      if (['ollie', 'kickflip', 'shuvit', 'heelflip', 'hop'].includes(m.do)) { const h = m.h ?? (m.do === 'hop' ? .2 : .38); m.h = h; m.air = 2 * Math.sqrt(2 * h / G) * 1.05; m.land = m.at + m.air; }
      if (m.do === 'grind') { const h = m.h ?? .42, peak = h + .14; m.h = h; m.up = Math.sqrt(2 * peak / G) + Math.sqrt(2 * .14 / G); m.on = m.at + m.up; m.offAir = Math.sqrt(2 * .12 / G) + Math.sqrt(2 * (h + .12) / G); m.land = m.off + m.offAir; }
      if (m.do === 'dismount') this.dismount = m;
    }
    // bob table (pelvis height) → spring-lagged copy for the hair and the hood
    this.Bob = new Table(D, hz, t => this._hipH(t) + this._boardY(t).y);
    this.BobLag = this.Bob.follow(2.2, .35);
    this.Vlag = this.V.follow(.8, 1);
    return this;
  }
  /** story time → distance along the route */
  sAt(t) { return this.Sx.at(t); }
  tAtS(s) { return this.Sx.inverse(s); }
  laneAt(t) {
    let x = keys(this.laneKeys, t);
    for (const m of this.moves) if (m.do === 'grind') { const w = smooth(span(t, m.at - 1.1, m.at - .15)) * (1 - smooth(span(t, m.land + .1, m.land + 1.2))); x = lerp(x, m.x ?? x, w); }
    return x;
  }
  _active(t, kinds) { for (const m of this.moves) if (kinds.includes(m.do) && t >= (m.at - (m.pre ?? .35)) && t <= (m.land ?? m.at + (m.dur ?? 1)) + (m.post ?? .55)) return m; return null; }
  /** the board's height and attitude at t: y (wheel bottom above the ground line), pitch, roll, yaw, flip */
  _boardY(t) {
    const o = { y: 0, pitch: 0, roll: 0, yaw: 0, contact: 'ground', airK: 0 };
    for (const m of this.moves) {
      if (m.do === 'grind') {
        if (t >= m.at && t < m.on) { const q = (t - m.at) / m.up, tt = t - m.at, v0 = Math.sqrt(2 * G * (m.h + .14)); o.y = Math.max(m.h * clamp(q * 3), v0 * tt - G * tt * tt / 2); o.pitch = 18 * DEG * bump(q, 0, .45); o.contact = 'air'; o.airK = 1; }
        else if (t >= m.on && t < m.off) { o.y = m.h - this.bd.wheelR * 0 - .02; o.contact = 'rail'; o.airK = .3; }
        else if (t >= m.off && t < m.land) { const tt = t - m.off, v0 = Math.sqrt(2 * G * .12); o.y = Math.max(0, m.h - .02 + v0 * tt - G * tt * tt / 2); o.pitch = 12 * DEG * bump(tt / m.offAir, 0, .4); o.contact = 'air'; o.airK = 1; }
      }
      if (m.air && t >= m.at && t < m.land) {
        const tt = t - m.at, q = tt / m.air, v0 = G * m.air / 2; o.y = Math.max(0, v0 * tt - G * tt * tt / 2); o.contact = 'air'; o.airK = 1;
        o.pitch = 24 * DEG * bump(q, 0, .38) * (m.do === 'hop' ? .4 : 1);
        if (m.do === 'kickflip') o.roll = TAU * smooth(span(q, .12, .82)) * (this.sigma);
        if (m.do === 'heelflip') o.roll = -TAU * smooth(span(q, .12, .82)) * (this.sigma);
        if (m.do === 'shuvit') o.yaw = Math.PI * smooth(span(q, .1, .85));
      }
      if (m.do === 'shuvit' && t >= m.land) o.yaw += Math.PI;   // the board stays turned (nose ↔ tail)
      if (m.do === 'manual') { const k = smooth(span(t, m.at, m.at + .25)) * (1 - smooth(span(t, m.at + m.dur - .2, m.at + m.dur))); o.pitch = -10 * DEG * k; }
      if (m.do === 'carve') { const k = bump(t, m.at, m.at + (m.dur || 1.5)); o.roll += (m.dir || 1) * 9 * DEG * k; }
    }
    return o;
  }
  /** crouch 0 (tall) … 1 (deep), from the moves: gathers before, absorbs after */
  _crouch(t) {
    let c = .16 + .03 * n1(t * .7, 3);
    for (const p of this.pushes) if (t > p.t0 && t < p.back) c = Math.max(c, .32 * bump(t, p.t0, p.back) + .16);
    for (const m of this.moves) {
      const pop = m.do === 'grind' ? m.at : m.air ? m.at : null;
      if (pop !== null) {
        const land = m.land, gather = keys([{ t: pop - .3, v: 0 }, { t: pop - .04, v: 1, e: 'in' }, { t: pop + .09, v: -.25, e: 'out' }, { t: pop + .25, v: .35 }, { t: land - .1, v: .3 }, { t: land + .06, v: .95, e: 'out' }, { t: land + .3, v: .25, e: 'sine' }, { t: land + .55, v: 0, e: 'sine' }], t);
        if (t > pop - .3 && t < land + .55) c = clamp(lerp(c, .62, gather), .02, 1) + (gather < 0 ? gather * .4 : 0);
        if (m.do === 'grind' && t >= m.on && t < m.off) c = .3 + .04 * Math.sin(t * 9);
        if (m.do === 'grind') { const g2 = keys([{ t: m.off - .22, v: 0 }, { t: m.off - .02, v: 1, e: 'in' }, { t: m.off + .08, v: 0 }], t); if (t > m.off - .22 && t < m.off + .08) c = lerp(c, .55, g2); }
      }
      if (m.do === 'tuck') c = Math.max(c, .62 * bump(t, m.at - .2, m.at + (m.dur || 2) + .3) ** .4);
      if (m.do === 'manual') c = Math.max(c, .28 * bump(t, m.at - .15, m.at + m.dur + .15) ** .5);
    }
    if (this.dismount && t > this.dismount.at) c = lerp(c, .02, smooth(span(t, this.dismount.at, this.dismount.at + .9)));
    return clamp(c, 0, 1);
  }
  _hipH(t) { const c = this._crouch(t); return this.bd.deckTop + this.D.ankle + this.legLen * lerp(.93, .52, c); }
  _pushK(t) {   // 1 = push stance (facing travel), 0 = riding stance (side-on)
    let k = 0; for (const m of this.moves) if (m.do === 'push') k = Math.max(k, smooth(span(t, m.at - .25, m.at)) * (1 - smooth(span(t, m.end - .05, m.end + .35))));
    return k;
  }

  /** set the whole body + board for story time t; returns numbers for the checks */
  pose(t, opt = {}) {
    const S = this.S, D = this.D, sg = this.sigma, R = this.R, b = this.bones;
    const s = this.sAt(t), lane = this.laneAt(t), bd = this._boardY(t), dm = this.dismount, standK = dm ? smooth(span(t, dm.at + .35, dm.at + 1.1)) : 0;
    const frame = R.frame(s, lane, 0), up = V(0, 1, 0), fwd = R.tan(s), right = R.right(s);
    // board: on the ground line at (s, lane) — pitched with the slope and the trick, rolled for flips and carves
    const grade = Math.atan(R.grade(s)), boardPos = R.at(s, lane, bd.y);
    this.board.position.copy(boardPos);
    const qb = new THREE.Quaternion().setFromEuler(new THREE.Euler(grade + bd.pitch, R.yaw(s) + bd.yaw, 0, 'YXZ'));
    const qroll = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), bd.roll); qb.multiply(qroll);
    // a nose-up pitch pivots on the tail wheels (keep them on the ground while popping)
    if (bd.pitch > 0 && bd.contact !== 'rail') this.board.position.addScaledVector(V(0, 1, 0), Math.sin(bd.pitch) * .27);
    this.board.quaternion.copy(qb); this.board.updateMatrixWorld(true);
    for (const w of this.bd.wheels) w.rotation.x = -(s / this.bd.wheelR) % TAU;
    const deck = (z, x = 0) => V(x, this.bd.deckTop, z).applyMatrix4(this.board.matrixWorld);
    // ── feet targets ──
    const pk = this._pushK(t), flipK = bd.roll || (bd.yaw % Math.PI) ? 1 : 0;
    const frontZ = -.18, backZ = .21, ankle = D.ankle;
    const bodyYaw = R.yaw(s) + sg * lerp(Math.PI / 2, Math.PI, pk) * (1 - standK) + standK * (sg * Math.PI / 2 + (dm?.face || 0));
    const qBody = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, bodyYaw, 0));
    const bodyF = V(0, 0, 1).applyQuaternion(qBody), bodyL = V(1, 0, 0).applyQuaternion(qBody);
    const footQ = yaw => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
    const deckYaw = R.yaw(s) + bd.yaw;
    let FL, FR, qL, qR, contactL = 'deck', contactR = 'deck';
    // front foot (left for regular) and back foot on the deck; pushing: front turned to the nose, back foot pushes
    const fF = deck(frontZ + pk * .06, sg * -.01), fB = deck(backZ, sg * .01);
    const yawF = deckYaw + sg * lerp(Math.PI / 2 - .25, Math.PI - .15, pk), yawB = deckYaw + sg * (Math.PI / 2 + .08);
    let front = fF.clone(), back = fB.clone(), qF = footQ(yawF), qBk = footQ(yawB), backContact = 'deck';
    // push: plant on the ground beside the board (toe side), locked to the world point while in contact
    for (const p of this.pushes) {
      if (t < p.t0 || t > p.back) continue;
      const plantS = p.sp + .02, gp = R.at(plantS, lane + sg * .24, 0); gp.y = R.y(plantS);
      const deckBack = deck(p.last ? backZ : .08, 0);
      if (t < p.plant) { const q = smooth(span(t, p.t0, p.plant)); back = deckBack.clone().lerp(gp, q); back.y += Math.sin(Math.PI * q) * .1; backContact = 'air'; }
      else if (t <= p.lift) { back = gp; backContact = 'ground'; }
      else { const q = smooth(span(t, p.lift, p.back)), nxt = p.last ? deck(backZ) : deck(.05, 0); back = gp.clone().lerp(nxt, q); back.y += Math.sin(Math.PI * q) * .13; backContact = 'air'; }
      qBk = footQ(deckYaw + sg * (Math.PI - .1));
    }
    // flips: feet leave the deck while the board turns beneath (held up under the hips)
    let lift = 0; if (bd.contact === 'air') for (const m of this.moves) if (['kickflip', 'heelflip', 'shuvit'].includes(m.do) && t > m.at && t < m.land) lift = bump(t, m.at + .04, m.land - .02);
    if (lift > 0) {
      const flatDeck = (z) => R.at(s, lane, bd.y + this.bd.deckTop + .03 + lift * .07).addScaledVector(fwd, -z);
      front.lerp(flatDeck(frontZ), Math.min(1, lift * 3)).add(right.clone().multiplyScalar(sg * lift * .08)); back.lerp(flatDeck(backZ), Math.min(1, lift * 3));
      qF = footQ(R.yaw(s) + sg * (Math.PI / 2 - .25)); qBk = footQ(R.yaw(s) + sg * (Math.PI / 2 + .08)); contactL = 'air'; backContact = 'air';
    }
    // dismount: back foot steps to the ground (toe side, behind), then the front foot steps off next to it
    let frontContact = lift > 0 ? 'air' : 'deck';
    if (dm && t > dm.at) {
      const sB = this.sAt(dm.at), g1 = R.at(sB - .2, lane + sg * .32, 0), g2 = R.at(sB + .18, lane + sg * .32, 0); g1.y = R.y(sB - .2); g2.y = R.y(sB + .18);
      const q1 = smooth(span(t, dm.at, dm.at + .35)), q2 = smooth(span(t, dm.at + .45, dm.at + .85));
      back = fB.clone().lerp(g1, q1); back.y += Math.sin(Math.PI * q1) * .1; backContact = q1 >= 1 ? 'ground' : 'air';
      front = fF.clone().lerp(g2, q2); front.y += Math.sin(Math.PI * q2) * .12; frontContact = q2 >= 1 ? 'ground' : q2 > 0 ? 'air' : 'deck';
      const sy = R.yaw(sB) + sg * Math.PI / 2 + (dm.face || 0);
      qBk = new THREE.Quaternion().slerpQuaternions(qBk, footQ(sy + .25 * sg), q1); qF = new THREE.Quaternion().slerpQuaternions(qF, footQ(sy - .2 * sg), q2);
    }
    // left / right from stance
    if (sg > 0) { FL = front; qL = qF; FR = back; qR = qBk; contactL = frontContact; contactR = backContact; } else { FR = front; qR = qF; FL = back; qL = qBk; contactR = frontContact; contactL = backContact; }
    // ── pelvis: over the feet (weight on the front foot while pushing), at the crouch height ──
    const crouch = this._crouch(t) * (1 - standK);
    const mid = front.clone().lerp(back, lerp(.5, .14, pk)); if (dm && t > dm.at) mid.copy(front).lerp(back, .5);
    const baseY = Math.max(front.y, Math.min(back.y, front.y + .3)) ;
    let hipY = (pk > .5 ? front.y : Math.min(front.y, back.y) + (Math.abs(front.y - back.y) * .5)) + ankle + this.legLen * lerp(.93, .52, crouch);
    if (lift > 0) hipY = R.y(s) + bd.y + this.bd.deckTop + ankle + this.legLen * .55 + lift * .05;
    const breathe = Math.sin(t * TAU / 3.4) * .006 * (1 + standK);
    const pelvisPos = V(mid.x, hipY + breathe, mid.z).addScaledVector(bodyF, -.02 - crouch * .05);
    // keep both ankles reachable
    for (const f of [FL, FR]) { const dh = Math.hypot(f.x - pelvisPos.x, f.z - pelvisPos.z), dv = pelvisPos.y - (f.y + ankle) + .04, mx = this.legLen * .985; if (Math.hypot(dh, dv) > mx) pelvisPos.y = f.y + ankle - .04 + Math.sqrt(Math.max(0, mx * mx - dh * dh)); }
    this.root.position.copy(pelvisPos);
    // body attitude: lean toward the front (riding: toe side), into carves, back on manuals, forward in the push
    const bdR = bd.roll && !lift ? bd.roll : 0;
    const lean = lerp(.08, .3, crouch) + pk * .12 + (this._active(t, ['manual']) ? -.15 : 0);
    this.root.quaternion.copy(qBody).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(lean * .35, 0, -bdR * .6 * sg)));
    this.root.updateMatrixWorld(true);
    // spine and chest: bend forward with the crouch, twist toward travel (head leads), breathe
    const look = this._look(t, s, standK);
    const twist = sg * (1 - pk) * (1 - standK) * .32 + look.twist;
    b.spine.rotation.set(lean * .9 + crouch * .25, twist * .4, 0); b.chest.rotation.set(crouch * .2 - breathe * 2, twist * .45, 0);
    b.chest.scale.set(1 + breathe * .8, 1 + breathe * 1.2, 1 + breathe * .8);
    b.neck.rotation.set(-crouch * .3 - lean * .6 + look.pitch * .4, look.yaw * .45, 0); b.head.rotation.set(look.pitch * .6, look.yaw * .55, look.roll);
    this.root.updateMatrixWorld(true);
    // ── legs: IK to the ankle points, knees on the body's front ──
    const res = { t, s, lane, crouch, contact: { L: contactL, R: contactR }, feet: {}, bad: [], board: bd, pk, standK };
    for (const [sd, F, qf] of [['L', FL, qL], ['R', FR, qR]]) {
      const H = V(); b['hip' + sd].getWorldPosition(H);
      const T = F.clone().add(V(0, ankle, 0)), pole = bodyF.clone().multiplyScalar(1).addScaledVector(bodyL, (sd === 'L' ? 1 : -1) * .35).normalize();
      const k = ik2(H, T, D.legU, D.legL, pole);
      setWorldBasis(b['thigh' + sd], H.clone().sub(k.K), pole);
      setWorldBasis(b['shin' + sd], k.K.clone().sub(k.T2), pole);
      const qp = new THREE.Quaternion(); b['shin' + sd].getWorldQuaternion(qp); b['foot' + sd].quaternion.copy(qp.invert().multiply(qf));
      const knee = 180 - angle(H.clone().sub(k.K), k.T2.clone().sub(k.K));
      res.feet[sd] = { pos: F.clone(), knee, reach: k.reach, over: k.over };
      if (!k.reach && k.over > .02) res.bad.push(`${sd} foot out of reach by ${(k.over * 100).toFixed(1)} cm`);
      if (knee > LIM.knee[1]) res.bad.push(`${sd} knee ${knee.toFixed(0)}° > ${LIM.knee[1]}°`);
    }
    // ── arms: balance out wide in the air, loose while riding, swing while pushing, gestures on top ──
    this._arms(t, crouch, bd, pk, standK, res);
    // ── hair: trails with speed, lifts as the body drops (spring-lagged bob), flutters ──
    const v = this.Vlag.at(t), lag = (this.Bob.at(t) - this.BobLag.at(t));
    for (const L of this.locks) {
      const base = .25 + clamp(v / 7) * .95 + clamp(-lag * 6, -.4, .6);
      L.chain.forEach((bn, j) => { const fl = n1(t * (3 + j) + L.a * 5, 11) * (.08 + clamp(v / 7) * .14); bn.rotation.set(j === 0 ? base * .8 + .1 : base * .25 + fl, 0, L.side * (.12 + fl * .5)); });
    }
    // ── face: blinks on irregular beats, mouth opens on a cheer ──
    const bk = this._blink(t), mo = this._mouth(t);
    const want = this.face(bk)(mo); if (this.headMat.map !== want) { this.headMat.map = want; this.headMat.needsUpdate = true; }
    this.group.updateMatrixWorld(true);
    // joint audit
    const nyaw = (b.neck.rotation.y + b.head.rotation.y) / DEG, npitch = (b.neck.rotation.x + b.head.rotation.x) / DEG, tw = (b.spine.rotation.y + b.chest.rotation.y) / DEG;
    if (Math.abs(nyaw) > LIM.neckYaw) res.bad.push(`neck yaw ${nyaw.toFixed(0)}°`);
    if (Math.abs(npitch) > LIM.neckPitch) res.bad.push(`neck pitch ${npitch.toFixed(0)}°`);
    if (Math.abs(tw) > LIM.spineTwist) res.bad.push(`spine twist ${tw.toFixed(0)}°`);
    res.hips = pelvisPos.clone(); res.head = V(); b.head.getWorldPosition(res.head);
    res.bodyF = bodyF; res.travel = fwd;
    return res;
  }
  _look(t, s, standK) {
    let yaw = 0, pitch = 0, roll = 0, twist = 0;
    // riding side-on, the head turns to the nose (travel)
    yaw = this.sigma * 1.0 * (1 - this._pushK(t)) * (1 - standK);
    for (const m of this.moves) if (m.do === 'look') {
      const k = smooth(span(t, m.at, m.at + .3)) * (1 - smooth(span(t, m.at + (m.dur || 1) - .3, m.at + (m.dur || 1))));
      const tg = m.target || 'back', ty = tg === 'back' ? -this.sigma * 1.2 : tg === 'buddy' ? (m.side ?? 1) * .9 : tg === 'cam' ? (m.yaw ?? 0) : tg === 'up' ? 0 : (m.yaw ?? 0);
      yaw = lerp(yaw, ty, k); pitch = lerp(pitch, tg === 'up' ? -.5 : tg === 'buddy' ? .35 : 0, k); twist += (tg === 'back' ? -this.sigma * .3 : 0) * k;
    }
    for (const m of this.moves) if (m.do === 'cheer') { const k = bump(t, m.at, m.at + (m.dur || 2)); pitch -= .25 * k; }
    pitch += .04 * n1(t * .5, 9); yaw += .05 * n1(t * .4, 21);
    return { yaw, pitch, roll, twist };
  }
  _blink(t) { const per = 2.6, i = Math.floor(t / per), off = hash(i, 5) * (per - .3), q = t - i * per - off; return q > 0 && q < .14 ? (q < .05 || q > .1 ? .5 : 1) : 0; }
  _mouth(t) { let m = 0; for (const x of this.moves) if (x.do === 'cheer') m = Math.max(m, smooth(span(t, x.at + .25, x.at + .45)) * (1 - smooth(span(t, x.at + (x.dur || 2) - .4, x.at + (x.dur || 2))))); return m > .5 ? 1 : 0; }
  /** arms: angles per side (abduction out, flexion forward, elbow), with gestures layered on */
  _arms(t, crouch, bd, pk, standK, res) {
    const b = this.bones, sg = this.sigma, air = bd.contact === 'air' ? 1 : bd.contact === 'rail' ? .7 : 0;
    const airK = clamp(this.Bob.at(t) - this.BobLag.at(t) + air * .8, 0, 1);
    for (const [sd, sx] of [['L', 1], ['R', -1]]) {
      const ph = sd === 'L' ? 0 : Math.PI, front = (sd === 'L') === (sg > 0);
      let abd = 22 + 10 * n1(t * .9 + sx, 31) + crouch * 20, flex = 8 + crouch * 30 + (front ? 12 : -10), elbow = 22 + crouch * 25;
      // pushing: arms swing against the pushing leg
      if (pk > 0) { const sw = Math.sin(t * TAU / .9 + ph); flex = lerp(flex, 15 + sw * 35, pk); abd = lerp(abd, 14, pk); elbow = lerp(elbow, 35, pk); }
      // air / rail: wide balance
      const balance = Math.max(airK, this._active(t, ['manual', 'armsOut']) ? 1 : 0);
      abd = lerp(abd, (front ? 62 : 48) + 7 * n1(t * 2.3 + sx * 3, 33), balance); flex = lerp(flex, front ? 38 : -18, balance); elbow = lerp(elbow, front ? 34 : 22, balance);
      // standing: arms hang and breathe
      abd = lerp(abd, 9 + Math.sin(t * TAU / 3.4) * 1.2, standK); flex = lerp(flex, 4, standK); elbow = lerp(elbow, 12, standK);
      for (const m of this.moves) {
        const d = m.dur || 1.6, side = m.hand ? (m.hand === sd) : front;
        if (m.do === 'cheer') { const k = keys([{ t: m.at - .3, v: 0 }, { t: m.at, v: -.25, e: 'in' }, { t: m.at + .28, v: 1.12, e: 'out' }, { t: m.at + .45, v: 1, e: 'sine' }, { t: m.at + d - .35, v: 1 }, { t: m.at + d, v: 0, e: 'sine' }], t); if (t > m.at - .3 && t < m.at + d) { abd = k < 0 ? abd * (1 + k) : lerp(abd, 150 - 5 * Math.sin(t * 4 + ph), k); flex = lerp(flex, 10, Math.max(0, k)); elbow = lerp(elbow, 15, Math.max(0, k)); } }
        if (m.do === 'wave' && side) { const k = bump(t, m.at, m.at + d) ** .5; abd = lerp(abd, 120, k); elbow = lerp(elbow, 55 + 30 * Math.sin((t - m.at) * 14), k); flex = lerp(flex, 20, k); }
        if (m.do === 'point' && side) { const k = bump(t, m.at, m.at + d) ** .5; abd = lerp(abd, 30, k); flex = lerp(flex, 85, k); elbow = lerp(elbow, 5, k); }
        if (m.do === 'fist' && side) { const k = keys([{ t: m.at - .2, v: 0 }, { t: m.at, v: -.3, e: 'in' }, { t: m.at + .2, v: 1.1, e: 'out' }, { t: m.at + .35, v: 1 }, { t: m.at + d, v: 0 }], t); if (t > m.at - .2 && t < m.at + d) { abd = lerp(abd, 25, Math.abs(k)); flex = lerp(flex, k > 0 ? 70 : -20, Math.abs(k)); elbow = lerp(elbow, k > 0 ? 120 : 20, Math.abs(k)); } }
      }
      // limits
      elbow = clamp(elbow, LIM.elbow[0], LIM.elbow[1]);
      const ua = b['upperArm' + sd], fa = b['foreArm' + sd], hd = b['hand' + sd];
      const A = abd * DEG, F = flex * DEG;
      const dir = V(sx * Math.sin(A) * Math.cos(F * .5), -Math.cos(A) * Math.cos(F), Math.sin(F) * Math.cos(A * .5)).normalize();
      ua.quaternion.setFromUnitVectors(V(0, -1, 0), dir);
      fa.rotation.set(-elbow * DEG, 0, 0); hd.rotation.set(-10 * DEG, 0, sx * .1);
      res['elbow' + sd] = elbow;
    }
  }
  /** contact points for the slip check: world feet + what they stand on */
  contacts(res) { return res.contact; }
}
