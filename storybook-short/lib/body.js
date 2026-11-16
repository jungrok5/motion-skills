// storybook-short · body.js — full-body picture-book characters: a big head (head.js), a bell-shaped coat, thin legs,
// small shoes, sleeves with mittens. Cut-out style: the coat and the head are painted once into sprites; legs and
// sleeves are drawn every frame as segments filled with a crayon texture that sticks to each segment (it moves with the
// limb, it never swims through it). Legs are two-bone IK chains to feet the film places, so a planted foot is exactly
// where the gait put it — feet never slide.
//
// Actor-local units: origin on the ground under the pelvis, y up is negative, lengths in head radii `a`.
// Facing: yaw > 0 faces screen right. Near limbs (the side the viewer sees) are drawn in front; the near hip and shoulder
// sit on the back side of the body (CONTRIBUTING: 가까운 어깨 · 엉덩이는 얼굴이 향한 쪽의 반대편).
import * as P from './paint.js';
import { build, merge } from './head.js';
import { makeMotion } from './motion.js';

export const BODY = {
  a: 60, mass: 'medium',
  coat: { color: '#d8582c', pattern: { type: 'solid' }, length: 2.75, width: 1.7, shoulder: .9, placket: true, buttons: '#3a2a20',
    collar: null, pockets: true, shade: null },
  legs: { color: '#5b3f8f', w: .2, thigh: 1.25, shin: 1.3 },
  shoes: { color: '#2a2228', size: 1 },
  arms: { color: null, upper: .85, fore: .8, w: .4, mitten: '#7d3fa0' },
  scarf: null,     // { colors: [a, b], tail: 1 (towards the back), w: .32 }
  held: null,      // { draw(ctx, hand, actor) } drawn at the near hand, in front
  extras: [],      // [{ layer: 'behind' | 'front', ops: (A) => [{ bb, draw(ctx, seed) }] }] painted with the coat
};
export const JOINTS = { knee: [0, 2.6], elbow: [0, 2.4], hipSwing: [-1.2, .9], neckTilt: .35 }; // radians: bend ranges, hip swing (− back, + forward)

let patCache = new Map();
/** a small tile of crayon in one colour, used to fill limbs */
function crayonTile(color, seed) {
  const k = String(color) + '|' + seed; if (patCache.has(k)) return patCache.get(k);
  const c = P.canvas(96, 96), g = c.getContext('2d');
  P.crayon(g, [[-4, -4], [100, -4], [100, 100], [-4, 100]], { color, angle: -1.1, gap: 2.6, width: 2.2, alpha: .85, underAlpha: .7, tooth: .35, seed, roughness: 0, cross: .3 });
  c._color = Array.isArray(color) ? color : P.rgb(color); patCache.set(k, c); return c;
}

export class Actor {
  constructor(spec, opt = {}) {
    this.spec = spec; this.name = spec.name || 'actor';
    this.B = merge(BODY, spec.body || {}); this.a = this.B.a;
    this.headDesign = merge(merge({ neck: { w: .3, len: .42 } }, spec.head || {}), { head: { x: 0, y: 0, a: this.a }, body: { none: true }, canvas: { W: 4000, H: 4000 } });
    this.res = opt.res || 1.5;                 // sprite pixels per world px
    this.views = new Map();
    this.motionCache = new Map();
  }
  geom() {
    const a = this.a, L = this.B.legs, hipY = -(L.thigh + L.shin) * .965 * a - .1 * a;
    const shY = hipY - 1.6 * a, neckY = shY - .02 * a;
    return { a, hipY, shY, neckY, hemY: shY + this.B.coat.length * a, ankle: .1 * a };
  }
  /** sprites for one facing (built once per yaw value used) */
  view(yaw) {
    const key = yaw.toFixed(3); if (this.views.has(key)) return this.views.get(key);
    const a = this.a, G = this.geom(), r = this.res, sy = Math.sin(yaw);
    const fig = build(this.headDesign, { yaw });
    const sprite = (layers, pad = 12) => {
      const ops = fig.ops.filter(o => layers.includes(o.layer)); if (!ops.length) return null;
      const bb = P.union(...ops.map(o => o.bb)); bb[0] -= pad; bb[1] -= pad; bb[2] += pad; bb[3] += pad;
      const c = P.canvas((bb[2] - bb[0]) * r, (bb[3] - bb[1]) * r), g = c.getContext('2d');
      for (const o of ops) { const [x0, y0, x1, y1] = o.bb, s = P.canvas((x1 - x0) * r, (y1 - y0) * r), sg = s.getContext('2d'); sg.setTransform(r, 0, 0, r, -x0 * r, -y0 * r); o.draw(sg); g.drawImage(s, (x0 - bb[0]) * r, (y0 - bb[1]) * r); }
      return { c, bb };
    };
    // the coat: a bell from the shoulders, front edge (placket) turned towards the face
    const C = this.B.coat, sw = C.shoulder * a, hw = C.width * a, top = G.shY, hem = G.hemY, cb = Math.cos(yaw);
    const fx = sy * hw * .45;                    // where the front edge sits
    const side = (s) => { const k = s * sy > 0 ? 1 - Math.abs(sy) * .12 : 1 + Math.abs(sy) * .05; return [
      ...P.bezier([s * .3 * a + fx * .3, top - .08 * a], [s * sw * .7 * k, top - .1 * a], [s * sw * k, top + .02 * a], [s * sw * 1.05 * k, top + .35 * a], 10),
      ...P.bezier([s * sw * 1.05 * k, top + .35 * a], [s * hw * .9 * k, top + (hem - top) * .45], [s * hw * k, hem - .5 * a], [s * hw * 1.02 * k, hem], 14).slice(1)]; };
    const L = side(-1), R = side(1), hemPts = []; for (let i = 1; i < 12; i++) { const u = i / 12, x = P.lerp(R[R.length - 1][0], L[L.length - 1][0], u); hemPts.push([x, hem + Math.sin(u * Math.PI) * .12 * a]); }
    const coatPoly = [...L, ...hemPts.reverse(), ...[...R].reverse()];
    const coatSprite = (() => {
      const bb = P.bounds(coatPoly, 24), c = P.canvas((bb[2] - bb[0]) * r, (bb[3] - bb[1]) * r), g = c.getContext('2d'), seed = (this.spec.seed || 5) * 131 + Math.round(yaw * 100);
      g.setTransform(r, 0, 0, r, -bb[0] * r, -bb[1] * r);
      for (const x of this.B.extras.filter(x => x.layer === 'behind')) for (const o of x.ops(this.anchors(yaw))) o.draw(g, seed + 7);
      const poly = P.spline(coatPoly, 6, true);
      P.gouache(g, poly, { color: C.color, seed: seed + 1, mottle: .35, edge: .2, roughness: 1.2 });
      P.crayon(g, poly, { color: C.color, angle: -1.05, gap: 2.8, width: 2.4, alpha: .8, under: false, tooth: .45, seed, cross: .35 });
      const pat = C.pattern || {};
      g.save(); P.path(g, P.rough(poly, 1.5, seed + 2)); g.clip();
      if (pat.type === 'stripes') { let y = top + (pat.offset ?? .5) * a, i = 0; while (y < hem + a) { const band = [[-hw * 1.3, y], [hw * 1.3, y + .05 * a], [hw * 1.3, y + pat.width * a], [-hw * 1.3, y + pat.width * a - .04 * a]]; P.crayon(g, band, { color: pat.colors[i % pat.colors.length], angle: -.9, gap: 2.6, alpha: .9, underAlpha: .6, seed: seed + 9 + i, tooth: .35 }); y += (pat.width + (pat.gap ?? pat.width)) * a; i++; } }
      else if (pat.type === 'checks') { const st = (pat.gap || .35) * a; for (let x = -hw * 1.3; x < hw * 1.3; x += st * 2) P.crayon(g, [[x, top - a], [x + st * .35, top - a], [x + st * .35, hem + a], [x, hem + a]], { color: pat.colors[0], gap: 3, alpha: .6, under: false, seed: seed + x, angle: 1.2 }); for (let y = top; y < hem + a; y += st * 2) P.crayon(g, [[-hw * 1.4, y], [hw * 1.4, y], [hw * 1.4, y + st * .35], [-hw * 1.4, y + st * .35]], { color: pat.colors[1] || pat.colors[0], gap: 3, alpha: .55, under: false, seed: seed + y, angle: -.3 }); }
      else if (pat.type === 'dots') { const rr = P.rng(seed), pts = [], st = (pat.gap || .4) * a; for (let y = top; y < hem; y += st) for (let x = -hw * 1.2 + ((y / st) % 2 ? st / 2 : 0); x < hw * 1.2; x += st) pts.push([x + (rr() - .5) * 4, y + (rr() - .5) * 4]); P.dabs(g, pts, { colors: pat.colors, r: (pat.width || .07) * a, seed: seed + 3 }); }
      else if (pat.type === 'quilt') { for (let y = top + .5 * a; y < hem; y += .55 * a) P.ink(g, [[-hw * 1.2, y], [hw * 1.2, y + .03 * a]], { width: 1.3, color: P.shade(C.color, -.35), seed: seed + y, alpha: .6 }); }
      // the side going away from the viewer is in shadow
      const shadeX = -Math.sign(sy || 1) * hw;
      P.crayon(g, [[shadeX * 1.3, top - a], [shadeX * .35, top - a], [shadeX * .45, hem + a], [shadeX * 1.3, hem + a]], { color: C.shade || P.shade(C.color, -.28), angle: 1.2, gap: 4.2, width: 2, alpha: .4, under: false, seed: seed + 5, tooth: .5 });
      g.restore();
      if (C.placket) { P.ink(g, [[fx, top + .1 * a], [fx + sy * .05 * a, (top + hem) / 2], [fx + sy * .12 * a, hem + .08 * a]], { width: 1.6, color: P.shade(C.color, -.5), seed: seed + 6, alpha: .7 }); for (let i = 0; i < 4; i++) { const y = top + .45 * a + i * .55 * a; P.dabs(g, [[fx + sy * (.03 + i * .02) * a + .12 * a * Math.sign(sy || 1), y]], { color: C.buttons, r: .07 * a, seed: seed + 20 + i }); } }
      if (C.pockets) for (const s of [-1, 1]) { const px = s * hw * .55 + fx * .4, py = hem - .9 * a; if (s * sy < -.3) continue; P.ink(g, [[px - .3 * a, py], [px, py + .05 * a], [px + .3 * a, py]], { width: 1.4, color: P.shade(C.color, -.45), seed: seed + 30 + s, alpha: .7 }); }
      if (C.collar) { const cl = [[-.42 * a + fx * .2, top - .14 * a], [.42 * a + fx * .2, top - .14 * a], [.55 * a + fx * .2, top + .32 * a], [fx * .25, top + .12 * a], [-.55 * a + fx * .2, top + .32 * a]]; P.gouache(g, P.spline(cl, 4, true), { color: C.collar, seed: seed + 40, mottle: .4, edge: .4 }); }
      P.ink(g, poly.filter((_, i) => i % 1 === 0), { width: 1.5, color: '#2a1f24', seed: seed + 8, alpha: .55, taper: [.02, .02] });
      for (const x of this.B.extras.filter(x => x.layer !== 'behind')) for (const o of x.ops(this.anchors(yaw))) o.draw(g, seed + 11);
      return { c, bb };
    })();
    const shoe = (() => {
      const S = this.B.shoes, w = .3 * a * S.size, h = .16 * a * S.size, bb = [-w * 1.2, -h * 1.6, w * 1.4, h * 1.2], c = P.canvas((bb[2] - bb[0]) * r, (bb[3] - bb[1]) * r), g = c.getContext('2d');
      g.setTransform(r, 0, 0, r, -bb[0] * r, -bb[1] * r);
      const pts = []; for (let i = 0; i < 20; i++) { const t = i / 20 * Math.PI * 2; pts.push([Math.cos(t) * w * (Math.cos(t) > 0 ? 1.15 : .85), Math.min(Math.sin(t) * h, h * .55) - h * .2]); }
      P.gouache(g, pts, { color: S.color, seed: (this.spec.seed || 5) + 91, mottle: .4, edge: .5 });
      P.ink(g, [...pts, pts[0]], { width: 1.2, color: '#1b1418', seed: 3, alpha: .6, taper: [0, 0] });
      return { c, bb };
    })();
    const v = { yaw, fig, hairBack: sprite(['hairBack']), base: sprite(['neck', 'head', 'face', 'x:head']), top: sprite(['hairFront', 'ears', 'earringL', 'earringR', 'x:hair']), coat: coatSprite, shoe, coatPoly };
    this.views.set(key, v); return v;
  }
  /** the ground y that puts this actor's head centre at headY (for close-ups framed on the head) */
  groundFor(headY) { const G = this.geom(); return headY - (G.neckY - (this.headDesign.head.chin ?? .98) * this.a - (this.headDesign.neck.len ?? .42) * this.a); }
  anchors(yaw) { const G = this.geom(), a = this.a, sy = Math.sin(yaw); return { a, yaw, G, front: sy * this.B.coat.width * a * .45, chest: [sy * .3 * a, G.shY + .6 * a], neck: [0, G.neckY], hem: G.hemY }; }
  motion(id, M) { if (!this.motionCache.has(id)) this.motionCache.set(id, makeMotion(M, this.headDesign)); return this.motionCache.get(id); }
}

/** two-bone IK in 2D. `bend` +1 / −1 picks which side the middle joint goes. Returns the middle joint and the clamped end. */
export function ik(root, target, l1, l2, bend) {
  const dx = target[0] - root[0], dy = target[1] - root[1], d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3);
  const base = Math.atan2(dy, dx), a1 = Math.acos(P.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const ang = base - bend * a1, mid = [root[0] + Math.cos(ang) * l1, root[1] + Math.sin(ang) * l1];
  const end = [root[0] + Math.cos(base) * d, root[1] + Math.sin(base) * d];
  return { mid, end, reach: Math.hypot(dx, dy) / (l1 + l2) };
}

/**
 * gait(d, o) — where the feet and pelvis are after walking a distance d (px) along x in direction dir (+1 right).
 * Distance-based, so easing the walk in and out never makes a foot slide: a planted foot stays at its plant until it lifts.
 * o: { x0, dir, stride (px, two steps), stance (0..1), lift (px), bob (px), hip (px, half the gap between hips) }
 */
export function gait(d, o) {
  const S = o.stride, sig = o.stance ?? .62, feet = [];
  for (let i = 0; i < 2; i++) {                // 0 = near foot, 1 = far foot (half a stride apart)
    const q = d / S + i / 2, k = Math.floor(q), u = q - k;
    const plant = j => o.x0 + o.dir * (j - i / 2 + sig / 2) * S;
    let x, lift = 0, ang = 0, planted = u < sig;
    if (planted) { x = plant(k); ang = u > sig * .7 ? -(u - sig * .7) / (sig * .3) * .25 : 0; }
    else { const w = (u - sig) / (1 - sig), e = P.smooth(w); x = P.lerp(plant(k), plant(k + 1), e); lift = Math.sin(Math.PI * w) * o.lift; ang = P.lerp(-.35, .3, w); }
    feet.push({ x, y: -lift, ang: ang * o.dir, planted, u, k });
  }
  const bob = (.5 - .5 * Math.cos(4 * Math.PI * d / S)) * o.bob;  // lowest at each heel strike
  return { feet, pelvisX: o.x0 + o.dir * d, bob, phase: d / S };
}

/**
 * drawActor(ctx, actor, pose, t) — pose:
 *   x, y        world position of the ground point under the pelvis (y = ground line)
 *   yaw         facing (sprites are built per value; use a few fixed values: 0, ±.35, ±.5)
 *   pelvis      [dx, dy] offset of the pelvis from rest (bob, crouch, sit), local px
 *   feet        [{x, y, ang}] world feet (ankle on the ground line + lift); default: standing under the hips
 *   arms        { near: { a: shoulder angle (0 = down, + towards the facing), e: elbow bend }, far: {…} }
 *   lean        whole upper body lean (radians, + towards the facing)
 *   head        a motion.js pose (gaze, blink, tilt, yaw, rise, hairLag, mouth …) — default the actor's rest
 *   sit         true: front-facing seated (pelvis on the seat at y; feet given or hanging)
 * Returns the joint positions (world) for checks.
 */
export function drawActor(ctx, actor, pose, t = 0) {
  const v = actor.view(pose.yaw ?? 0), a = actor.a, G = actor.geom(), B = actor.B, yaw = pose.yaw ?? 0, sy = Math.sin(yaw), dir = Math.sign(sy) || 1;
  const hp = pose.head || {}, br = hp.breath || 0;
  const [px, py] = pose.pelvis || [0, 0], lean = pose.lean || 0;
  const X = pose.x, Y = pose.y;
  const hip = [X + px, Y + G.hipY + py];
  // hips: the near hip sits towards the back of the body
  const hipGap = .3 * a * (1 - Math.abs(sy) * .55), nearOff = -dir * Math.abs(sy) * .12 * a;
  const hips = [[hip[0] - (yaw ? dir * hipGap * .6 : hipGap) + nearOff, hip[1]], [hip[0] + (yaw ? dir * hipGap * .6 : hipGap) + nearOff * .3, hip[1]]];
  const feet = pose.feet || [{ x: hips[0][0], y: 0, ang: 0 }, { x: hips[1][0], y: 0, ang: 0 }];
  const L = B.legs, joints = { hips, knees: [], ankles: [], shoulders: [], elbows: [], hands: [] };
  // upper body transform: lean about the hip, breath from the hem
  const up = new DOMMatrix().translate(hip[0], hip[1]).rotate(lean * 180 / Math.PI).translate(-hip[0], -hip[1]);
  const coatK = 1 + br * .006;
  const legTile = crayonTile(L.color, 17), armColor = B.arms.color || B.coat.color;
  const armTile = crayonTile(armColor, 23), armTileFar = crayonTile(P.shade(armColor, -.18), 29);
  const seg = (p0, p1, w, tile) => { const dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.hypot(dx, dy); ctx.save(); ctx.translate(p0[0], p0[1]); ctx.rotate(Math.atan2(dy, dx)); const pat = ctx.createPattern(tile, 'repeat'); pat.setTransform(new DOMMatrix().scale(Math.max(.5, a / 120))); ctx.beginPath(); ctx.roundRect(-w * .1, -w / 2, len + w * .2, w, w / 2); ctx.fillStyle = tile._base || (tile._base = P.css(tile._color)); ctx.fill(); ctx.fillStyle = pat; ctx.fill(); ctx.strokeStyle = 'rgba(36,26,32,.45)'; ctx.lineWidth = 1.1; ctx.stroke(); ctx.restore(); };
  const leg = i => {
    const f = feet[i], ank = [f.x, Y + (f.y || 0) - G.ankle];
    // knees fold forward (towards the facing); seated front-on they come towards the viewer, drawn as straight down
    const s = pose.sit ? (i ? 1 : -1) * .3 : dir;
    const k = ik(hips[i], ank, L.thigh * a, L.shin * a, s);
    joints.knees[i] = k.mid; joints.ankles[i] = k.end;
    const far = i === 1 && yaw;
    const tile = far ? crayonTile(P.shade(L.color, -.2), 19) : legTile;
    seg(hips[i], k.mid, L.w * a, tile); seg(k.mid, k.end, L.w * a * .92, tile);
    // shoe: toe towards the facing (front-on: towards the viewer, drawn level)
    ctx.save(); ctx.translate(k.end[0], k.end[1] + G.ankle - .056 * a * B.shoes.size); ctx.rotate(f.ang || 0); ctx.scale(pose.sit || !yaw ? .85 : dir, 1);
    ctx.drawImage(v.shoe.c, v.shoe.bb[0], v.shoe.bb[1], v.shoe.bb[2] - v.shoe.bb[0], v.shoe.bb[3] - v.shoe.bb[1]); ctx.restore();
  };
  const arms = pose.arms || {};
  const arm = (which) => {
    const near = which === 'near', A = arms[which] || {}, side = near ? -1 : 1;
    const shx = yaw ? (near ? -dir * B.coat.shoulder * .7 * a : dir * B.coat.shoulder * .55 * a) : side * B.coat.shoulder * .92 * a;
    const sh = up.transformPoint(new DOMPoint(hip[0] + shx, hip[1] - 1.6 * a + .28 * a - br * .8));
    const out = yaw ? 0 : side * .12;
    const ang = (A.a ?? 0) * dir + out, e = A.e ?? .25;
    const el = [sh.x + Math.sin(ang) * B.arms.upper * a, sh.y + Math.cos(ang) * B.arms.upper * a];
    const ang2 = ang + e * (yaw ? dir : -side);
    const hand = [el[0] + Math.sin(ang2) * B.arms.fore * a, el[1] + Math.cos(ang2) * B.arms.fore * a];
    joints.shoulders.push([sh.x, sh.y]); joints.elbows.push(el); joints.hands.push(hand);
    const tile = near || !yaw ? armTile : armTileFar;
    seg([sh.x, sh.y], el, B.arms.w * a, tile); seg(el, hand, B.arms.w * a * .9, tile);
    P.css && (ctx.fillStyle = P.css(B.arms.mitten)); ctx.beginPath(); ctx.ellipse(hand[0], hand[1], .15 * a, .17 * a, ang2, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(36,26,32,.5)'; ctx.lineWidth = 1; ctx.stroke();
    return hand;
  };
  const headAt = () => { // neck base on the coat, then the head's own motion
    const nb = up.transformPoint(new DOMPoint(hip[0] + sy * .05 * a, hip[1] - 1.6 * a - .02 * a - br * 1.2));
    const fb = v.fig.geo.neckBase; // head-local neck base
    return new DOMMatrix().translate(nb.x - fb[0], nb.y - fb[1] - (hp.rise || 0)).translate(fb[0], fb[1]).rotate((hp.tilt || 0) * 180 / Math.PI).translate(-fb[0], -fb[1]);
  };
  const drawSprite = (s, M) => { if (!s) return; ctx.save(); ctx.setTransform(ctx.getTransform().multiply(M)); ctx.drawImage(s.c, s.bb[0], s.bb[1], s.bb[2] - s.bb[0], s.bb[3] - s.bb[1]); ctx.restore(); };
  const HM = headAt(), crown = v.fig.geo.pivot.crown;
  const hairM = HM.translate(crown[0], crown[1]).rotate((hp.hairLag || 0) * 180 / Math.PI).translate(-crown[0], -crown[1]).translate(((hp.yaw || 0) * .3 + (hp.hairYaw || 0) * .25) * a, 0);
  const faceM = HM.translate((hp.yaw || 0) * a * .55, 0);
  // back to front
  drawSprite(v.hairBack, hairM);
  if (yaw) arm('far');
  if (pose.sit) { leg(0); leg(1); } else { leg(1); leg(0); }
  // seated, the coat bunches on the lap: squash it from the shoulders so the hem lands just past the knees
  const shoulderY = hip[1] - 1.6 * a, sitK = pose.sit ? (1.6 + .55) / B.coat.length : 1;
  const coatM = up.translate(hip[0], shoulderY).scale(pose.sit ? 1.08 : 1, sitK).translate(-hip[0], -shoulderY)
    .translate(hip[0], shoulderY + B.coat.length * a).scale(1, coatK).translate(-hip[0], -(shoulderY + B.coat.length * a)).translate(hip[0], hip[1] - G.hipY);
  drawSprite(v.coat, coatM);
  if (B.scarf) { // a knitted scarf round the neck, its tail blown back
    const S = B.scarf, nb = up.transformPoint(new DOMPoint(hip[0], hip[1] - 1.6 * a)), w = (S.w || .32) * a, tail = (S.tail ?? 1) * -dir, flap = Math.sin(t * 5.3) * .12 * a + Math.sin(t * 8.1) * .05 * a;
    ctx.save(); ctx.lineCap = 'round';
    const band = [[nb.x - .45 * a, nb.y - .05 * a], [nb.x, nb.y + .1 * a], [nb.x + .45 * a, nb.y - .05 * a]];
    const wind = S.wind ?? .35, tl = [[nb.x + tail * .15 * a, nb.y + .05 * a], [nb.x + tail * (.45 + wind * .6) * a, nb.y + (.45 - wind * .3) * a + flap], [nb.x + tail * (.55 + wind * 1.1) * a, nb.y + (1.05 - wind * .9) * a - flap]];
    const sp = ctx.createPattern(crayonTile(S.colors[0], 31), 'repeat'); sp.setTransform(new DOMMatrix().scale(.5));
    for (const [pts, ww] of [[tl, w * .8], [band, w]]) { ctx.strokeStyle = sp; ctx.lineWidth = ww; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]); ctx.stroke(); }
    ctx.strokeStyle = P.css(S.colors[1] || S.colors[0], .9); ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) { const u = i / 6, x = P.lerp(tl[0][0], tl[2][0], u), y = P.lerp(tl[0][1], tl[2][1], u) + Math.sin(u * Math.PI) * (.15 * a + flap) * .5; ctx.beginPath(); ctx.moveTo(x, y - w * .3); ctx.lineTo(x + 2, y + w * .3); ctx.stroke(); }
    ctx.restore();
  }
  drawSprite(v.base, HM);
  ctx.save(); ctx.setTransform(ctx.getTransform().multiply(faceM)); v.fig.live.face(ctx, { ...hp, gaze: hp.gaze || v.fig.D.face.gaze }); ctx.restore();
  drawSprite(v.top, hairM);
  ctx.save(); ctx.setTransform(ctx.getTransform().multiply(hairM)); v.fig.live.strays(ctx, hp, t); ctx.restore();
  const hand = arm('near'); if (!yaw) arm('far');
  if (B.held) B.held.draw(ctx, hand, actor, pose, t);
  joints.head = HM.transformPoint(new DOMPoint(0, 0)); joints.feet = feet; joints.hip = hip;
  return joints;
}
