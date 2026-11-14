// ink-water-emergence · body.js — creature bodies as small 3D skeletons that pose from a few numbers and report their joint
// angles, so the same body can be drawn from any camera angle and checked for impossible bends.
//
//   quadruped(spec) → body          a four-legged animal (lion, guardian dog, tiger, deer, horse, ox …): spine, neck, head
//                                    with jaw, a tail chain, four legs solved by IK so planted paws never slide.
//   swimmer(spec)   → body          a body that swims (whale, koi, shark, seal, eel …): a spine chain bending in a travelling
//                                    wave, fins, flukes / tail fin.
//   body.pose(state) → pose         state = { x, z, heading, s (distance walked), speed, crouch, rear, look, nod, roar, … }
//                                    pose = { parts: [primitives in world space], angles: {joint: deg}, contacts, facing, … }
//   checkPose(body, pose) → [problems]   joints outside LIM, stance paws off the ground, facing ≠ travel direction.
//
// Local frame: x = forward (the way the head points), y = up, z = the animal's left. Units ≈ metres, ground at y = 0.
// Sagittal angles are measured in the side view with the animal facing +x, counter-clockwise positive (a bone pointing
// forward = 0°, straight down = −90°). A joint angle is the turn from the parent bone's direction to the child's.
import { clamp, lerp, smooth, keys, v3, ik, hash, TAU } from './core.js';

const D = Math.PI / 180;
const ang2 = (x, y) => Math.atan2(y, x);
const wrap = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const sag = (a, b) => ang2(b[0] - a[0], b[1] - a[1]); // sagittal direction a→b in the local side view

// joint ranges in degrees (min, max). Front legs fold their lower part BACK, hind legs fold theirs FORWARD; a knee (stifle)
// never straightens past ~-5°, an elbow never bends backward. Neck ±, head nod, tail per segment.
export const LIM_QUAD = {
  shoulder: [-165, -30],   // humerus vs spine (down = -90)
  elbow: [-8, 150],        // forearm vs humerus: flexes CCW (forearm swings forward-up), never hyperextends
  carpus: [-140, 38],      // metacarpus vs forearm: flexes CW (paw folds back); stands slightly dorsiflexed (+10…+30)
  hip: [-155, -15],        // femur vs spine
  stifle: [-150, -4],      // tibia vs femur: flexes CW (shin folds back), never straight
  hock: [-4, 155],         // metatarsus vs tibia: flexes CCW (lower leg folds forward)
  neck: [-25, 110],        // neck vs spine
  head: [-115, 45],        // head (forehead→nose line) vs neck
  headYaw: [-80, 80],      // turn of the head
  jaw: [0, 55],
  tail: [-70, 70],         // per tail segment
};

// ---------------------------------------------------------------------------------------------------------------------
export function quadruped(spec = {}) {
  const S = {
    name: 'beast', scale: 1,
    len: 1.2,          // hip → withers
    hipH: .82, withersH: .9,
    chest: .36, belly: .27, hips: .29, width: .19,   // body radii, half distance between left and right legs
    neck: .34, neckR: .17, neckPitch: 42,            // degrees above the spine
    head: .27, muzzle: .16, jawLen: .17, ears: .06,
    arm: [.37, .365, .14], legH: [.39, .35, .2],       // front: humerus, forearm, metacarpus · hind: femur, tibia, metatarsus
    paw: .11, legR: .105,
    tail: { n: 7, len: .9, up: 35, curl: 60, r: .045 },
    stride: 1.0, duty: .62, lift: .12,
    mane: 1, ...spec,
  };
  S.tail = { n: 7, len: .9, up: 35, curl: 60, r: .045, ...(spec.tail || {}) };
  const sc = S.scale;
  const L = (k) => k * sc;
  const body = { kind: 'quadruped', spec: S, LIM: { ...LIM_QUAD, ...(spec.LIM || {}) } };

  // legs: [name, front?, side (+1 left/-1 right), phase offset] — a walk (lateral sequence)
  const LEGS = [['HL', false, 1, 0], ['FL', true, 1, .25], ['HR', false, -1, .5], ['FR', true, -1, .75]];

  body.pose = (st = {}) => {
    const s0 = { x: 0, z: 0, heading: 0, s: 0, speed: 0, crouch: 0, rear: 0, look: 0, nod: 0, roar: 0, jaw: null, tailSwish: 0, t: 0, breathe: 0, ...st };
    const crouch = s0.crouch, rear = s0.rear;
    // spine: hip (pelvis) and withers in the local side view; rearing pitches the spine up about the hips
    const hip = [0, L(S.hipH) * (1 - .12 * crouch) + Math.sin(s0.s / L(S.stride) * TAU * 2) * L(.012) * smooth(0, .2, s0.speed), 0];
    const spineA = (rear * 32 - crouch * 4 + (S.withersH - S.hipH) / S.len * 57) * D;
    const withers = [hip[0] + Math.cos(spineA) * L(S.len), hip[1] + Math.sin(spineA) * L(S.len) - crouch * L(.06), 0];
    const spineDir = sag(hip, withers);
    // neck and head
    const neckA = spineDir + (S.neckPitch + s0.nod * -30 + s0.roar * 14 + rear * 10) * D;
    const neckTop = [withers[0] + Math.cos(neckA) * L(S.neck), withers[1] + Math.sin(neckA) * L(S.neck), 0];
    const headPitch = (-62 + s0.nod * -25 + s0.roar * 22) * D;   // head line relative to neck
    const headA = neckA + headPitch;
    const yaw = clamp(s0.look, -1, 1) * 70 * D;
    const jaw = (s0.jaw != null ? s0.jaw : s0.roar) * 48 * D;
    const angles = {
      neck: (neckA - spineDir) / D, head: headPitch / D, headYaw: yaw / D, jaw: jaw / D,
    };
    const parts = [], contacts = [];
    const P = (p) => p; // local points; transformed to world at the end
    const ord = { head: 0, neck: .12, chest: .25, front: .3, body: .5, hind: .75, tail: 1 };

    // torso: chest, belly, hips as spheres/capsules along the spine
    const mid = v3.lerp(hip, withers, .5);
    const down = [Math.sin(spineDir), -Math.cos(spineDir), 0];
    parts.push({ type: 'cap', a: v3.mad(hip, down, L(.02)), b: v3.mad(withers, down, L(.08)), ra: L(S.hips), rb: L(S.chest), tone: 'body', order: ord.body, id: 'torso' });
    parts.push({ type: 'ball', p: v3.mad(mid, down, L(.06)), r: L(S.belly), tone: 'body', order: ord.body, id: 'belly' });
    parts.push({ type: 'ball', p: v3.mad(withers, down, L(.1)), r: L(S.chest * 1.05), tone: 'chest', order: ord.chest, id: 'chest' });
    parts.push({ type: 'ball', p: v3.mad(hip, down, L(.02)), r: L(S.hips * 1.08), tone: 'body', order: ord.hind, id: 'rump' });
    parts.push({ type: 'cap', a: v3.mad(withers, down, L(.05)), b: neckTop, ra: L(S.neckR), rb: L(S.neckR * .85), tone: 'body', order: ord.neck, id: 'neck' });

    // head frame (local to the animal): origin at the neck top; forward = head line with yaw; up = perpendicular
    const hf = [Math.cos(headA), Math.sin(headA), 0];
    const hu = [-Math.sin(headA), Math.cos(headA), 0];
    const rotY = (v) => v3.ry(v, yaw);
    const H = (f, u, l) => v3.add(neckTop, rotY(v3.add(v3.add(v3.mul(hf, L(f)), v3.mul(hu, L(u))), [0, 0, L(l)])));
    const HD = (f, u, l) => rotY(v3.add(v3.add(v3.mul(hf, f), v3.mul(hu, u)), [0, 0, l]));
    const hr = S.head;
    const head = { origin: neckTop, hf: rotY(hf), hu: rotY(hu), hl: rotY([0, 0, 1]), at: H, dir: HD, r: hr, jaw, roar: s0.roar, yaw };
    parts.push({ type: 'head', head, order: ord.head, id: 'head' });

    // tail: a chain from the croup, rising then curling (shishi tails curl up like flames)
    const tailPts = [v3.mad(hip, [-Math.cos(spineDir), -Math.sin(spineDir), 0], L(S.hips * .8))];
    let ta = spineDir + Math.PI + (-S.tail.up) * D; // pointing back and up (CCW from backward = down; so negative = up)
    const segL = L(S.tail.len) / S.tail.n;
    angles.tail = [];
    for (let i = 0; i < S.tail.n; i++) {
      const sw = Math.sin(s0.t * 2.1 + i * .7) * s0.tailSwish * 14;
      const da = i === 0 ? 0 : (-S.tail.curl / S.tail.n + sw) * D;
      ta += da; angles.tail.push(da / D);
      const p = tailPts[i];
      tailPts.push([p[0] + Math.cos(ta) * segL, p[1] + Math.sin(ta) * segL, 0]);
    }
    parts.push({ type: 'tail', pts: tailPts, r: L(S.tail.r), order: ord.tail, id: 'tail' });

    // legs
    const stride = L(S.stride), duty = S.duty;
    for (const [name, front, side, off] of LEGS) {
      const root = front ? v3.mad(withers, down, L(.12)) : v3.mad(hip, down, L(.06));
      const lens = (front ? S.arm : S.legH).map(L);
      // paw plants are laid out from FIXED spots in the animal's frame (not from the posed spine), so crouching, rearing
      // or roaring never drags a planted paw
      const rootX = front ? L(S.len * Math.cos((S.withersH - S.hipH) / S.len)) : 0;
      const zz = side * L(S.width);
      // gait: phase from distance walked, so a standing animal keeps its paws planted and paws never slide
      const u = s0.s / stride - off; const n = Math.floor(u), ph = u - n;
      const moving = smooth(.02, .25, Math.abs(s0.speed));
      const reach = front ? L(.06) : L(-.02);
      const plantAt = (k) => stride * (k + off + duty / 2) + rootX + reach; // in "walked distance" coordinates
      let fx, fy = 0, swingK = 0, stance = true;
      if (ph < duty) fx = plantAt(n) - s0.s;
      else {
        stance = false; const k = (ph - duty) / (1 - duty), e = k * k * (3 - 2 * k);
        fx = lerp(plantAt(n), plantAt(n + 1), e) - s0.s; fy = Math.sin(Math.PI * k) * L(S.lift) * moving; swingK = Math.sin(Math.PI * k) * moving;
      }
      // standing still is simply the gait frozen: stance paws stay where they were planted, swing paws are set down
      if (rear > 0 && front) { fy = lerp(fy, L(.25), rear); fx = lerp(fx, rootX + L(.18), rear); swingK = Math.max(swingK, rear); stance = stance && rear < .05; }
      const foot = [fx, fy, 0];
      // metapodial direction: front pastern slightly forward of vertical, folding back in swing; hind near vertical,
      // folding forward in swing
      const line = sag(root, foot) / D;
      const mdir = front ? (line + 18 - 75 * swingK) * D : (line - 2 + 45 * swingK) * D;
      const wrist = [foot[0] - Math.cos(mdir) * lens[2], foot[1] - Math.sin(mdir) * lens[2], 0];
      const pole = front ? [-1, -.15, 0] : [1, -.1, 0]; // elbow points back, stifle points forward
      const { mid: knee, end } = ik([root[0], root[1], 0], wrist, lens[0], lens[1], pole);
      // joint angles (sagittal)
      const a0 = sag(root, knee), a1 = sag(knee, end), a2 = sag(end, foot);
      const j0 = wrap(a0 - spineDir) / D, j1 = wrap(a1 - a0) / D, j2 = wrap(a2 - a1) / D;
      if (front) Object.assign(angles, { [name + '.shoulder']: j0, [name + '.elbow']: j1, [name + '.carpus']: j2 });
      else Object.assign(angles, { [name + '.hip']: j0, [name + '.stifle']: j1, [name + '.hock']: j2 });
      const reachGap = v3.dist(end, wrist);
      if (reachGap > L(.01)) angles[name + '.reach'] = reachGap; // target out of reach: reported by checkPose
      const Z = (p) => [p[0], p[1], zz];
      const toe = [foot[0] + L(S.paw) * .9, foot[1], 0];
      parts.push({ type: 'leg', name, front, side, pts: [Z(root), Z(knee), Z(end), Z(foot), Z(toe)], r: L(S.legR), thigh: L(front ? S.chest * .55 : S.hips * .75), order: front ? ord.front : ord.hind, id: name });
      if (stance && rear < .05) contacts.push({ leg: name, p: Z(foot), s: plantAt(n) });
    }

    // to world: rotate about y by heading, translate
    const hd = s0.heading, c = Math.cos(hd), sn = Math.sin(hd);
    const W = (p) => [s0.x + p[0] * c + p[2] * sn, p[1], s0.z - p[0] * sn + p[2] * c];
    const WD = (d) => [d[0] * c + d[2] * sn, d[1], -d[0] * sn + d[2] * c];
    for (const p of parts) {
      if (p.a) { p.a = W(p.a); p.b = W(p.b); }
      if (p.p) p.p = W(p.p);
      if (p.pts) p.pts = p.pts.map(W);
      if (p.head) { const h = p.head, at = h.at, dir = h.dir; h.at = (f, u, l) => W(at(f, u, l)); h.dir = (f, u, l) => WD(dir(f, u, l)); h.hf = WD(h.hf); h.hu = WD(h.hu); h.hl = WD(h.hl); h.origin = W(h.origin); }
    }
    for (const k of contacts) k.p = W(k.p);
    return { body, parts, angles, contacts, forward: WD([1, 0, 0]), heading: hd, speed: s0.speed, root: W(hip), withers: W(withers), headPos: head.at(.2, 0, 0), height: L(S.withersH + S.neck), length: L(S.len + .7) };
  };
  return body;
}

// ---------------------------------------------------------------------------------------------------------------------
export const LIM_SWIM = { bend: [-26, 26], fin: [-80, 80], flukes: [-50, 50] };

export function swimmer(spec = {}) {
  const S = {
    name: 'whale', scale: 1, len: 6, n: 16,
    profile: [.16, .42, .62, .76, .84, .86, .83, .76, .67, .57, .47, .38, .3, .23, .17, .13, .1], // radius / (len·0.12) along the body, head → tail
    flatten: .85,         // vertical squash of the body (1 = round)
    wave: 'vertical',     // whales beat up and down; fish side to side ('lateral')
    amp: 5, freq: .4, waveLen: 1.1,    // bend per joint at the tail (deg), beats per second, body lengths per wave
    fins: { at: .3, len: .32, w: .09, sweep: 30 },   // pectoral fins: position along the body, length, width (× len)
    flukes: { span: .42, chord: .1 },
    grooves: true, knobs: true, eye: .2, ...spec,
  };
  const body = { kind: 'swimmer', spec: S, LIM: { ...LIM_SWIM, ...(spec.LIM || {}) } };
  body.pose = (st = {}) => {
    const s0 = { x: 0, y: 1, z: 0, heading: 0, pitch: 0, t: 0, beat: 1, roll: 0, finFlap: 0, bank: 0, ...st };
    const L = S.len * S.scale, n = S.n, seg = L / n, R = L * .12;
    // spine in local frame (x forward): start at the head and walk back, each joint bending with the travelling wave
    const pts = [[L * .5, 0, 0]], angles = { bend: [] };
    let a = 0; // direction of travel is +x; the spine points back from the head (angle π)
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const b = i === 0 ? 0 : S.amp * s0.beat * (.25 + .75 * u) * Math.sin(TAU * (s0.t * S.freq - u / S.waveLen)) * D;
      const bendDeg = i === 0 ? 0 : b / D; angles.bend.push(bendDeg);
      a += b;
      const p = pts[i];
      const dir = [-Math.cos(a), Math.sin(a)];
      pts.push(S.wave === 'vertical' ? [p[0] + dir[0] * seg, p[1] + dir[1] * seg, 0] : [p[0] + dir[0] * seg, 0, p[2] - dir[1] * seg]);
    }
    const rad = pts.map((_, i) => { const u = i / n * (S.profile.length - 1), k = Math.floor(u), f = u - k; return R * lerp(S.profile[k], S.profile[Math.min(S.profile.length - 1, k + 1)], f); });
    const flap = Math.sin(TAU * s0.t * S.freq * .5) * 12 + s0.finFlap * 50;
    angles.fin = flap;
    const tailBend = angles.bend[n - 1] * 2.2; angles.flukes = tailBend;
    const parts = [{ type: 'spine', pts, rad, flatten: S.flatten, order: .5, id: 'body', wave: S.wave }];
    const fi = Math.round(S.fins.at * n);
    for (const side of [1, -1]) parts.push({ type: 'fin', side, root: pts[fi], len: L * S.fins.len, w: L * S.fins.w, sweep: S.fins.sweep, flap: flap * side, order: side > 0 ? .4 : .6, id: 'fin' + side, r: rad[fi] });
    parts.push({ type: 'flukes', root: pts[n], prev: pts[n - 1], span: L * S.flukes.span, chord: L * S.flukes.chord, bend: tailBend, order: .9, id: 'flukes', wave: S.wave });
    parts.push({ type: 'swimhead', pts, rad, eye: S.eye, grooves: S.grooves, knobs: S.knobs, order: 0, id: 'head', flatten: S.flatten });
    // to world: pitch about z, heading about y, roll about x
    const cp = Math.cos(s0.pitch), sp = Math.sin(s0.pitch), ch = Math.cos(s0.heading), shh = Math.sin(s0.heading), cr = Math.cos(s0.roll), sr = Math.sin(s0.roll);
    const Wd = (p) => { let [x, y, z] = p; [y, z] = [y * cr - z * sr, y * sr + z * cr]; [x, y] = [x * cp - y * sp, x * sp + y * cp]; return [x * ch + z * shh, y, -x * shh + z * ch]; };
    const W = (p) => v3.add(Wd(p), [s0.x, s0.y, s0.z]);
    for (const p of parts) { if (p.pts) p.pts = p.pts.map(W); if (p.root) p.root = W(p.root); if (p.prev) p.prev = W(p.prev); p.Wd = Wd; }
    return { body, parts, angles, contacts: [], forward: Wd([1, 0, 0]), up: Wd([0, 1, 0]), heading: s0.heading, root: W([0, 0, 0]), headPos: W(pts[0]), height: R * 1.4, length: L };
  };
  return body;
}

// ---------------------------------------------------------------------------------------------------------------------
// checkPose: every joint inside its range, planted paws on the ground, the head leading the way it travels.
export function checkPose(body, pose, prev = null, tol = {}) {
  const out = [], LIM = body.LIM;
  const lim = (name, v) => { const key = name.includes('.') ? name.split('.')[1] : name; const r = LIM[key]; if (r && (v < r[0] - .5 || v > r[1] + .5)) out.push(`${name} ${v.toFixed(0)}° outside [${r[0]}, ${r[1]}]`); };
  for (const [k, v] of Object.entries(pose.angles)) {
    if (k.endsWith('.reach')) { out.push(`${k.split('.')[0]} paw out of reach by ${(v * 100).toFixed(1)} cm`); continue; }
    if (Array.isArray(v)) v.forEach((x, i) => lim(k, x)); else lim(k, v);
  }
  for (const c of pose.contacts) if (Math.abs(c.p[1]) > (tol.ground ?? .01)) out.push(`${c.leg} planted paw ${c.p[1].toFixed(3)} m off the ground`);
  if (prev) for (const c of pose.contacts) {
    const q = prev.contacts.find(d => d.leg === c.leg && Math.abs(d.s - c.s) < 1e-6);
    if (q && v3.dist(q.p, c.p) > (tol.slide ?? .004)) out.push(`${c.leg} planted paw slides ${(v3.dist(q.p, c.p) * 100).toFixed(1)} cm`);
  }
  if (prev) {
    const mv = v3.sub(pose.root, prev.root); mv[1] = 0;
    if (v3.len(mv) > .003 && v3.dot(mv, pose.forward) < 0 && !tol.backward) out.push('moving backward (tail first) — say so in the brief and pass { backward: true }');
  }
  return out;
}
