// sight-gag-short · figure.js — the cast: vinyl-toy people built from code. A figure is a rig of joints (pelvis →
// spine → chest → neck → head, shoulders → elbows → hands, hips → knees → feet) dressed with lathe torsos, tapered
// limbs, mitten hands, big shoes, a head with real eyes (sclera, pupil, lids), brows, a nose, a mouth library and
// hair/hats/beards/accessories — every part a parameter, so each topic designs its own cast. Poses are plain objects
// of angles in degrees (P.stand, P.walk(phase) …) that mix; faces are named expressions. Nothing here reads time
// except blink(t) and the procedural cycles, which take t / phase as arguments.
import * as THREE from "three";
import { mat, lathe, rbox, mesh, merge, box } from "./kit.js";
import * as PT from "./paint.js";
import { clamp, lerp, rng, TAU, DEG, noise1, K } from "./core.js";

// ---------------------------------------------------------------- builds (metres)
export const BUILDS = {
  // H height, head radius, torso width/depth, hip width, limb radius, leg length, arm length, belly, neck, shoe scale, hunch
  lanky: { H: 1.98, head: 0.135, tw: 0.36, td: 0.25, hw: 0.3, limb: 0.05, leg: 1.0, arm: 0.8, belly: 0, neck: 0.13, shoe: 1.3, hunch: 6, chest: 1 },
  average: { H: 1.76, head: 0.137, tw: 0.42, td: 0.28, hw: 0.34, limb: 0.06, leg: 0.84, arm: 0.72, belly: 0.02, neck: 0.08, shoe: 1.1, hunch: 0, chest: 1 },
  stocky: { H: 1.86, head: 0.142, tw: 0.6, td: 0.42, hw: 0.44, limb: 0.085, leg: 0.8, arm: 0.74, belly: 0.1, neck: 0.05, shoe: 1.2, hunch: 2, chest: 1.05 },
  boss: { H: 1.84, head: 0.135, tw: 0.62, td: 0.44, hw: 0.32, limb: 0.07, leg: 0.84, arm: 0.76, belly: 0.03, neck: 0.075, shoe: 1.05, hunch: 4, chest: 1.16 },
  round: { H: 1.62, head: 0.148, tw: 0.56, td: 0.5, hw: 0.46, limb: 0.07, leg: 0.62, arm: 0.6, belly: 0.16, neck: 0.03, shoe: 1.05, hunch: 0, chest: 0.9 },
  teen: { H: 1.74, head: 0.137, tw: 0.38, td: 0.24, hw: 0.3, limb: 0.05, leg: 0.88, arm: 0.72, belly: 0, neck: 0.1, shoe: 1.25, hunch: 8, chest: 0.95 },
  kid: { H: 1.08, head: 0.148, tw: 0.3, td: 0.24, hw: 0.26, limb: 0.045, leg: 0.42, arm: 0.4, belly: 0.03, neck: 0.03, shoe: 1.05, hunch: 0, chest: 0.95 },
  elder: { H: 1.52, head: 0.135, tw: 0.4, td: 0.32, hw: 0.36, limb: 0.055, leg: 0.68, arm: 0.6, belly: 0.06, neck: 0.03, shoe: 0.95, hunch: 22, chest: 0.95 },
};
export const SKIN = { light: "#f2c9a8", fair: "#f6d5bd", tan: "#d9a072", brown: "#a8714c", deep: "#6e4630", olive: "#c9a27a" };

const SEG = 40;
/** a lathe through a smoothed (Catmull-Rom) profile — soft vinyl silhouettes without kinks at each point */
export function slathe(pts, seg = SEG, n = 40) {
  const c = new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y)));
  return new THREE.LatheGeometry(c.getPoints(n).map((v) => new THREE.Vector2(Math.max(0.0005, v.x), v.y)), seg);
}
/** a tapered capsule hanging down −y from the origin: r0 at the top, r1 at the bottom */
export function limbGeo(r0, r1, len, seg = 16) {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; pts.push([r1 * Math.sin(a), -len - r1 * Math.cos(a)]); }
  for (let i = 6; i >= 0; i--) { const a = (i / 6) * Math.PI / 2; pts.push([r0 * Math.sin(a), r0 * Math.cos(a)]); }
  return lathe(pts.map(([r, y]) => [Math.max(r, 0.0005), y]), seg);
}

/**
 * person(film, o) — build a figure and register it as an actor.
 *   o.build: a BUILDS name or an object (any field of a build). o.skin. o.top { kind: tee|shirt|coat|suit|hoodie|raincoat|
 *   dress|flannel|sweater|vest, color, inner, pattern, b, open, len }. o.bottom { color, kind: pants|shorts|skirt, pattern }.
 *   o.shoes { kind: boot|sneaker|dress|rain|slipper, color, sole }. o.socks { color, stripe }. o.hair { style: wild|slick|short|
 *   bun|puffs|curly|long|bald|side, color, streak }. o.hat { kind: cap|cap-back|beanie|hood|bowler|hardhat|ranger|guard|
 *   bucket, color, band }. o.beard { kind: full|mustache|walrus|goatee, color }. o.face { nose: long|bulb|button|hook|wide,
 *   eye: size, brows: colour, thick, ears, cheeks, lips }. o.extras: [goggles|glasses|shades|contraption|backpack|tie|
 *   vest-hivis|scarf|badge|apron|satchel|watch]. o.seed for blinks and hair tufts.
 */
export function person(film, o = {}) {
  const f = new Figure(o, film);
  film.actor(f); return f;
}

export class Figure {
  constructor(o, film) {
    this.film = film; this.o = o;
    const B = (this.B = { ...BUILDS.average, ...(typeof o.build === "string" ? BUILDS[o.build] : o.build || {}) });
    const seed = (this.seed = o.seed ?? 1), r = rng(seed);
    this.skin = o.skin || SKIN.light;
    const top = (this.top = { kind: "tee", color: "#3a5a8a", inner: "#222222", pattern: "plain", b: "#202020", ...(o.top || {}) });
    const bot = (this.bot = { kind: "pants", color: "#2c3446", pattern: "plain", ...(o.bottom || {}) });
    const sh = (this.shoes = { kind: "sneaker", color: "#e8e4dc", sole: "#f7f5f0", ...(o.shoes || {}) });
    this.extras = new Set(o.extras || []);
    const skinM = (this.skinM = mat(this.skin, { rough: 0.55, sheen: 0.4, sheenColor: "#ffd9c4" }));
    const pat = top.pattern !== "plain" ? PT.cloth({ base: top.color, pattern: top.pattern, b: top.b }).map : null;
    const topM = mat(pat ? "#ffffff" : top.color, { rough: 0.78, map: pat });
    const botPat = bot.pattern !== "plain" ? PT.cloth({ base: bot.color, pattern: bot.pattern, b: bot.b || "#1d1d22" }).map : null;
    const botM = mat(botPat ? "#ffffff" : bot.color, { rough: 0.8, map: botPat });
    const sleeveM = top.kind === "vest" ? skinM : topM;
    this.mats = { skin: skinM, top: topM, bot: botM };

    // proportions
    const footH = 0.085 * B.shoe, L = B.leg, hipY = footH + L, headH = B.head * 2.2;
    const T = Math.max(0.3, B.H - hipY - B.neck - headH * 0.92);
    Object.assign(B, { footH, hipY, T });

    const root = (this.root = new THREE.Group()); root.name = "figure";
    const pelvis = (this.pelvis = new THREE.Group()); pelvis.position.y = hipY; root.add(pelvis);
    const spine = (this.spine = new THREE.Group()); pelvis.add(spine);
    const chest = (this.chest = new THREE.Group()); chest.position.y = T * 0.5; spine.add(chest);
    const neck = (this.neck = new THREE.Group()); neck.position.y = T * 0.5 - 0.02; chest.add(neck);
    const head = (this.head = new THREE.Group()); head.position.y = B.neck + B.head * 0.9; neck.add(head);

    // ---- torso: lathe profile (unit radius) scaled to the build's width/depth
    const w2 = B.tw / 2, sc = B.td / B.tw, hw2 = B.hw / 2, bel = B.belly;
    const prof = [[0.001, T * 0.04], [hw2 * 0.9, T * 0.045], [hw2, T * 0.07], [hw2 * 0.98 + bel * 0.6, T * 0.22], [w2 * 0.9 + bel, T * 0.42], [w2 * B.chest * 0.98, T * 0.66], [w2 * B.chest, T * 0.8], [w2 * B.chest * 0.96, T * 0.9], [w2 * 0.8, T * 0.98], [w2 * 0.45, T * 1.04], [B.limb * 1.5, T * 1.06], [0.001, T * 1.06]];
    const torso = mesh(slathe(prof, SEG), topM); torso.scale.z = sc; spine.add(torso);
    // waistband / hips in the trouser colour
    const hips = mesh(slathe([[0.001, -0.075], [hw2 * 0.6, -0.07], [hw2 * 0.9, -0.05], [hw2 * 1.0, 0.0], [hw2 * 1.01 + bel * 0.4, T * 0.12], [0.001, T * 0.12]], SEG), botM); hips.scale.z = sc * 1.02; spine.add(hips);
    if (bot.kind === "pants" && top.kind !== "coat" && top.kind !== "dress" && !top.len) { const rb = hw2 * 1.025 + bel * 0.42; const belt = new THREE.CylinderGeometry(rb, rb, 0.05, SEG, 1, true); belt.translate(0, T * 0.095, 0); const bm = mesh(belt, mat(o.belt || "#2a211b", { rough: 0.5, side: THREE.DoubleSide })); bm.scale.z = sc * 1.03; spine.add(bm); const bk = rbox(0.06, 0.045, 0.02, 0.5); bk.translate(0, T * 0.095, rb * sc * 1.03 + 0.006); spine.add(mesh(bk, mat("#c9a24a", { metal: 0.8, rough: 0.3 }))); }
    if (top.kind === "suit" || top.kind === "shirt" || top.kind === "flannel") {
      // a collar and a button placket
      const col = new THREE.TorusGeometry(B.limb * 1.6, B.limb * 0.45, 8, 20, Math.PI * 1.4); col.rotateX(Math.PI / 2); col.rotateY(Math.PI * 0.8); col.translate(0, T * 1.0, 0);
      spine.add(mesh(col, top.kind === "suit" ? mat("#f4f2ee", { rough: 0.6 }) : topM));
    }
    if (top.kind === "suit") {
      // lapels: two flat wedges on the chest, plus the shirt V
      const v = new THREE.Shape([new THREE.Vector2(-w2 * 0.32, T * 1.0), new THREE.Vector2(w2 * 0.32, T * 1.0), new THREE.Vector2(0, T * 0.55)]);
      const vg = new THREE.ShapeGeometry(v); vg.translate(0, 0, B.td / 2 * 1.02 + 0.005); spine.add(mesh(vg, mat("#f4f2ee", { rough: 0.6, side: THREE.DoubleSide }), { cast: false }));
      for (const s of [-1, 1]) { const l = new THREE.Shape([new THREE.Vector2(s * w2 * 0.3, T * 1.0), new THREE.Vector2(s * w2 * 0.06, T * 0.55), new THREE.Vector2(s * w2 * 0.5, T * 0.8)]); const lg = new THREE.ShapeGeometry(l); lg.translate(0, 0, B.td / 2 * 1.04 + 0.012); spine.add(mesh(lg, mat(PT.css(PT.shade(PT.rgbOf(top.color), 0.8)), { rough: 0.7, side: THREE.DoubleSide }), { cast: false })); }
      this.extras.add("tie");
    }
    if (this.extras.has("tie")) { const tie = new THREE.Shape([new THREE.Vector2(-0.025, 0), new THREE.Vector2(0.025, 0), new THREE.Vector2(0.04, -T * 0.4), new THREE.Vector2(0, -T * 0.46), new THREE.Vector2(-0.04, -T * 0.4)]); const tg = new THREE.ExtrudeGeometry(tie, { depth: 0.01, bevelEnabled: false }); tg.translate(0, T * 0.98, B.td / 2 * 1.03 + 0.012); spine.add(mesh(tg, mat(o.tie || "#24262c", { rough: 0.5 }))); }
    if (top.kind === "shirt" || top.kind === "flannel" || top.kind === "suit") { const btn = []; for (let i = 0; i < 4; i++) { const b2 = new THREE.SphereGeometry(0.008, 6, 4); b2.translate(0, T * (0.25 + i * 0.17), B.td / 2 * 1.0 + bel * 0.5 * (i < 2 ? 1 : 0.4)); btn.push(b2); } if (top.kind !== "suit") spine.add(mesh(merge(btn), mat("#e8e4dc"), { cast: false })); }
    // coats and dresses: a flared lathe from chest to the hem, open at the front for coats
    if (["coat", "raincoat", "dress", "apron"].includes(top.kind) || top.len) {
      const hem = top.len ?? (top.kind === "dress" ? 0.45 : top.kind === "raincoat" ? 0.55 : 0.68), flare = top.flare ?? (top.kind === "dress" ? 1.45 : 1.18);
      const cp = [[w2 * 0.88, T * 0.95], [w2 * 0.98, T * 0.75], [w2 * 0.95 + bel, T * 0.4], [hw2 * 1.15 + bel * 0.5, 0], [hw2 * flare + 0.02, -L * hem * 0.6], [hw2 * flare * 1.08 + 0.03, -L * hem]];
      const open = top.kind === "coat" ? (top.open ?? 0.55) : 0;
      const g = new THREE.LatheGeometry(new THREE.SplineCurve(cp.map(([rr, y]) => new THREE.Vector2(rr * 1.06, y))).getPoints(30), SEG, open / 2, TAU - open);
      const coatM = mat(top.coat || top.color, { rough: 0.75, side: THREE.DoubleSide });
      const coat = mesh(g, coatM); coat.scale.z = sc * 1.08; spine.add(coat); this.coat = coat;
      if (top.kind === "coat") { torso.material = mat(top.inner, { rough: 0.8 }); }
      // big patch pockets and a turned-back collar for long coats
      if (top.kind === "coat" || top.kind === "raincoat") {
        for (const s of [-1, 1]) { const pk = rbox(0.13, 0.15, 0.03, 0.4); pk.rotateY(s * 0.55); pk.translate(s * (hw2 * 1.05), -L * 0.12, B.td / 2 * 0.82); spine.add(mesh(pk, coatM)); }
        const cl = new THREE.TorusGeometry(B.limb * 2.1, B.limb * 0.8, 8, 20, Math.PI * 1.3); cl.rotateX(Math.PI / 2); cl.rotateY(Math.PI * 0.85); cl.scale(1, 1, sc); cl.translate(0, T * 0.98, 0); spine.add(mesh(cl, coatM));
      }
    }
    if (top.kind === "hoodie") { const kp = rbox(0.24, 0.11, 0.04, 0.5); kp.translate(0, T * 0.22, B.td / 2 * 0.95 + bel * 0.6); spine.add(mesh(kp, topM)); const hd = new THREE.TorusGeometry(B.limb * 2.2, B.limb * 1.1, 8, 20); hd.rotateX(Math.PI / 2 - 0.3); hd.translate(0, T * 0.98, -B.td * 0.18); spine.add(mesh(hd, topM)); }
    if (this.extras.has("vest-hivis")) {
      const vp = prof.map(([rr, y]) => [rr * 1.07 + 0.006, y]).filter(([, y]) => y > T * 0.05 && y < T * 0.98);
      const vm = mat(o.vest || "#d7f03a", { rough: 0.55 }); const vg = new THREE.LatheGeometry(vp.map(([rr, y]) => new THREE.Vector2(rr, y)), SEG, 0.35, TAU - 0.7);
      const v = mesh(vg, vm); v.scale.z = sc * 1.02; spine.add(v);
      for (const y of [0.3, 0.55]) { const st = new THREE.CylinderGeometry(w2 * 1.04 + bel * (y < 0.4 ? 0.9 : 0.4), w2 * 1.04 + bel * (y < 0.4 ? 0.9 : 0.4), 0.045, SEG, 1, true, 0.35, TAU - 0.7); st.translate(0, T * y, 0); const sm = mesh(st, mat("#e8eef2", { rough: 0.3, metal: 0.4, env: 1.4 }), { cast: false }); sm.scale.z = sc * 1.04; spine.add(sm); }
    }
    if (top.kind === "apron" || this.extras.has("apron")) { const ap = rbox(B.tw * 0.75, L * 0.6, 0.02, 0.3); ap.translate(0, -L * 0.15, B.td / 2 * 1.02 + bel); spine.add(mesh(ap, mat(o.apron || "#f2efe8", { rough: 0.8 }))); }

    // ---- arms
    this.arm = {};
    for (const s of [1, -1]) {
      const sh = new THREE.Group(); sh.rotation.order = "XZY"; sh.position.set(s * (w2 * B.chest * 0.84), T * 0.34, 0); chest.add(sh);
      const ua = B.arm * 0.5, fa = B.arm * 0.46, r0 = B.limb * 1.3, r1 = B.limb;
      const short = top.kind === "tee" || top.kind === "dress";
      const upperArmM = top.kind === "vest" ? skinM : short ? skinM : sleeveM;
      sh.add(mesh(limbGeo(r0, r1 * 0.98, ua), upperArmM));
      if (short) { const sl = limbGeo(r0 * 1.12, r1 * 1.12, ua * 0.45); sh.add(mesh(sl, topM)); sh.children[0].material = skinM; }
      if (top.kind === "coat" || top.kind === "raincoat") { const sl = limbGeo(r0 * 1.25, r1 * 1.3, ua); sh.add(mesh(sl, mat(top.coat || top.color, { rough: 0.75 }))); }
      const el = new THREE.Group(); el.position.y = -ua; sh.add(el);
      const foreM = ["tee", "vest", "dress"].includes(top.kind) ? skinM : sleeveM;
      el.add(mesh(limbGeo(r1, r1 * 0.85, fa), foreM));
      if (top.kind === "coat" || top.kind === "raincoat") { const cf = limbGeo(r1 * 1.3, r1 * 1.45, fa * 0.92); el.add(mesh(cf, mat(top.coat || top.color, { rough: 0.75 }))); }
      const wr = new THREE.Group(); wr.position.y = -fa - r1 * 0.3; el.add(wr);
      const hand = this.handMesh(B, o.hands || this.skin); wr.add(hand.g);
      if (s === 1 && this.extras.has("watch")) { const wt = new THREE.TorusGeometry(r1 * 0.95, 0.012, 6, 16).rotateX(Math.PI / 2); wt.translate(0, -fa * 0.9, 0); el.add(mesh(wt, mat("#c9a24a", { metal: 0.8, rough: 0.3 }))); }
      this.arm[s > 0 ? "L" : "R"] = { sh, el, wr, hand };
    }
    // ---- legs
    this.leg = {};
    for (const s of [1, -1]) {
      const hp = new THREE.Group(); hp.position.set(s * hw2 * 0.48, 0.0, 0); pelvis.add(hp);
      const th = L * 0.5, sn = L * 0.5 - footH * 0.2, r0 = Math.max(B.limb * 1.35, hw2 * 0.62), r1 = B.limb * 1.05;
      const legM = bot.kind === "shorts" || bot.kind === "skirt" ? skinM : botM;
      hp.add(mesh(limbGeo(r0, r1, th), legM));
      if (bot.kind === "shorts") hp.add(mesh(limbGeo(r0 * 1.15, r1 * 1.2, th * 0.6), botM));
      const kn = new THREE.Group(); kn.position.y = -th; hp.add(kn);
      kn.add(mesh(limbGeo(r1, B.limb * 0.8, sn), bot.kind === "pants" ? botM : skinM));
      const an = new THREE.Group(); an.position.y = -sn; kn.add(an);
      const foot = this.shoeMesh(B, sh, o.socks); an.add(foot);
      this.leg[s > 0 ? "L" : "R"] = { hp, kn, an, foot };
    }
    if (bot.kind === "skirt") { const sk = mesh(lathe([[hw2 * 1.02, 0.02], [hw2 * 1.3, -L * 0.25], [hw2 * 1.45, -L * 0.42]], SEG), botM); sk.material = mat(bot.color, { rough: 0.8, side: THREE.DoubleSide }); sk.scale.z = sc; spine.add(sk); }

    // ---- head
    this.buildHead(B, o, r);
    // ---- back: contraption / backpack (the hose socket and the steam vent live here)
    this.sockets = {};
    if (this.extras.has("contraption")) this.buildContraption(B, o);
    if (this.extras.has("backpack")) { const bp = rbox(B.tw * 0.7, T * 0.6, 0.18, 0.6); bp.translate(0, T * 0.55, -B.td / 2 - 0.08); spine.add(mesh(bp, mat(o.pack || "#c4553a", { rough: 0.7 }))); }
    if (this.extras.has("satchel")) { const sb = rbox(0.3, 0.24, 0.09, 0.4); sb.translate(B.hw * 0.62, -0.05, 0.02); spine.add(mesh(sb, mat(o.satchel || "#7a4a2c", { rough: 0.6 }))); const strap = new THREE.TorusGeometry(B.tw * 0.62, 0.012, 6, 24); strap.rotateY(Math.PI / 2); strap.rotateX(0.5); strap.translate(0, T * 0.45, 0); spine.add(mesh(strap, mat(o.satchel || "#7a4a2c"))); }
    if (this.extras.has("scarf")) { const sc2 = new THREE.TorusGeometry(B.limb * 2.2, B.limb * 1.1, 8, 20); sc2.rotateX(Math.PI / 2); sc2.translate(0, T * 1.0, 0); spine.add(mesh(sc2, mat(o.scarf || "#c0392b", { rough: 0.85, map: PT.cloth({ base: o.scarf || "#c0392b", pattern: "knit" }).map }))); }
    if (this.extras.has("badge")) { const bd = new THREE.CylinderGeometry(0.025, 0.025, 0.008, 12).rotateX(Math.PI / 2); bd.translate(w2 * 0.45, T * 0.72, B.td / 2 * 1.06 + 0.01); spine.add(mesh(bd, mat("#e3c35a", { metal: 0.8, rough: 0.25 }))); }

    // ---- contact shadow (a soft disc on the ground under the figure)
    const cs = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: PT.spot().map, color: "#1e2638", transparent: true, opacity: 0.38, depthWrite: false }));
    cs.renderOrder = 2; this.contact = cs; this.contactBase = B.tw * 1.6; film.world.add(cs);
    root.traverse((c) => { if (c.isMesh) { c.castShadow = c.userData.noCast ? false : true; c.receiveShadow = true; } });
    this.blinkR = rng(seed * 13 + 5);
    this.blinks = []; let bt = 0.6 + this.blinkR() * 2; while (bt < 400) { this.blinks.push(bt); bt += 2.2 + this.blinkR() * 3.2; }
    this._pose = {}; this.reset();
  }

  handMesh(B, color) {
    // a mitten hand with four soft fingers and a thumb; curl 0 (open) … 1 (fist)
    const g = new THREE.Group(), k = B.limb / 0.06, m = typeof color === "string" ? mat(color, { rough: 0.55, sheen: 0.3, sheenColor: "#ffd9c4" }) : color;
    const palm = mesh(rbox(0.085 * k, 0.09 * k, 0.04 * k, 0.75), m); palm.position.y = -0.04 * k; g.add(palm);
    const fingers = new THREE.Group(); fingers.position.y = -0.08 * k; g.add(fingers);
    for (let i = 0; i < 4; i++) { const fg = mesh(limbGeo(0.011 * k, 0.01 * k, 0.045 * k, 8), m); fg.position.x = (i - 1.5) * 0.02 * k; fg.position.y = 0.005; fingers.add(fg); }
    const thumb = new THREE.Group(); thumb.position.set(0.04 * k, -0.035 * k, 0.012 * k); g.add(thumb);
    thumb.add(mesh(limbGeo(0.013 * k, 0.011 * k, 0.035 * k, 8), m)); thumb.rotation.z = 0.7;
    return { g, fingers, thumb, k };
  }

  shoeMesh(B, sh, socks) {
    const g = new THREE.Group(), s = B.shoe, k = B.limb / 0.06;
    const len = 0.27 * s * Math.max(0.85, k * 0.9), w = 0.115 * s, h = 0.1 * s;
    const upper = mat(sh.color, { rough: sh.kind === "dress" ? 0.25 : sh.kind === "rain" ? 0.2 : 0.6, clear: sh.kind === "dress" || sh.kind === "rain" ? 0.6 : 0, map: sh.kind === "boot" ? PT.leather({ base: sh.color }).map : null });
    const soleM = mat(sh.sole || "#2a2622", { rough: 0.7 });
    // foot shape: a rounded toe box forward (+z) from the ankle, heel just behind
    const body = mesh(rbox(w, h, len, 0.72), upper); body.position.set(0, -B.footH + h * 0.55, len * 0.3); g.add(body);
    const sole = mesh(rbox(w * 1.08, 0.035 * s, len * 1.04, 0.6), soleM); sole.position.set(0, -B.footH + 0.018 * s, len * 0.3); g.add(sole);
    if (sh.kind === "boot") { const col = mesh(lathe([[w * 0.42, 0], [w * 0.46, 0.06 * s], [w * 0.5, 0.11 * s], [w * 0.001, 0.11 * s]], 16), upper); col.position.y = -B.footH + h * 0.5; col.scale.z = 1.2; g.add(col); const lc = []; for (let i = 0; i < 3; i++) { const l = box(w * 0.5, 0.008, 0.01, 0, 0, 0); l.translate(0, -B.footH + h * (0.85 + i * 0.12) + 0.02, len * 0.08 + w * 0.5 - i * 0.01); lc.push(l); } g.add(mesh(merge(lc), mat("#3a2a1c"), { cast: false })); }
    if (sh.kind === "rain") { const col = mesh(lathe([[w * 0.44, 0], [w * 0.46, 0.2 * s], [w * 0.5, 0.26 * s], [0.001, 0.26 * s]], 16), upper); col.position.y = -B.footH + h * 0.4; g.add(col); }
    if (sh.kind === "sneaker") { const st = mesh(rbox(w * 1.02, 0.02 * s, len * 0.5, 0.5), mat(sh.stripe || "#d8483a", { rough: 0.5 })); st.position.set(0, -B.footH + h * 0.6, len * 0.25); g.add(st); }
    if (socks) { const so = mat(socks.color || "#f0ede6", { rough: 0.8, map: socks.stripe ? PT.cloth({ base: socks.stripe[0], pattern: "stripe", b: socks.stripe[1], scale: 0.5 }).map : null }); const sk = mesh(limbGeo(B.limb * 0.9, B.limb * 0.88, 0.08 * s, 12), so); sk.position.y = 0.05 * s; g.add(sk); }
    return g;
  }

  buildHead(B, o, r) {
    const hd = this.head, R = B.head, F = { nose: "button", eye: 1, brows: (o.hair && o.hair.color) || "#2a211b", thick: 1, ears: true, shape: "egg", lips: "#5a2a26", ...(o.face || {}) };
    this.F = F;
    const prof = {
      egg: [[0.001, -1.0], [0.55, -0.92], [0.85, -0.6], [0.98, -0.1], [0.98, 0.3], [0.85, 0.7], [0.55, 0.95], [0.001, 1.05]],
      round: [[0.001, -0.95], [0.6, -0.82], [0.92, -0.45], [1.0, 0], [0.95, 0.45], [0.65, 0.85], [0.001, 1.0]],
      long: [[0.001, -1.15], [0.5, -1.08], [0.78, -0.75], [0.9, -0.2], [0.92, 0.35], [0.8, 0.78], [0.5, 1.0], [0.001, 1.08]],
      jaw: [[0.001, -1.05], [0.75, -1.0], [0.98, -0.6], [1.0, -0.1], [0.95, 0.35], [0.8, 0.75], [0.5, 0.97], [0.001, 1.02]],
      pear: [[0.001, -0.95], [0.75, -0.85], [1.05, -0.45], [1.0, 0], [0.85, 0.45], [0.6, 0.85], [0.001, 0.98]],
    }[F.shape] || null;
    const skull = mesh(lathe(prof.map(([x, y]) => [x * R, y * R * 1.08]), 40), this.skinM); skull.scale.z = F.depth || 1.02; hd.add(skull);
    this.faceZ = R * 0.98 * (F.depth || 1.02);
    // z of the face surface at height y (from the lathe profile), so eyes, nose and mouth sit on it whatever the shape
    const surf = (this.surf = (y) => { const yy = y / (R * 1.08); for (let i = 1; i < prof.length; i++) if (yy <= prof[i][1]) { const [x0, y0] = prof[i - 1], [x1, y1] = prof[i]; return R * (x0 + ((x1 - x0) * (yy - y0)) / (y1 - y0)) * (F.depth || 1.02); } return 0.001; });
    if (F.ears) for (const s of [-1, 1]) { const e = mesh(rbox(R * 0.18, R * 0.36, R * 0.24, 0.9), this.skinM); e.position.set(s * R * 0.95, -R * 0.05, -R * 0.05); hd.add(e); }
    // nose
    const noseG = { button: () => new THREE.SphereGeometry(R * 0.16, 16, 12), bulb: () => new THREE.SphereGeometry(R * 0.26, 16, 12).scale(1, 0.85, 0.9), long: () => limbGeo(R * 0.1, R * 0.14, R * 0.42, 12).rotateX(-1.25), hook: () => limbGeo(R * 0.1, R * 0.16, R * 0.4, 12).rotateX(-1.05), wide: () => new THREE.SphereGeometry(R * 0.2, 16, 12).scale(1.4, 0.8, 0.8) }[F.nose]();
    const nose = mesh(noseG, this.skinM); nose.position.set(0, -R * 0.12, surf(-R * 0.12) * 0.97); hd.add(nose);
    if (F.cheeks) for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.CircleGeometry(R * 0.16, 16), new THREE.MeshBasicMaterial({ color: F.cheeks, transparent: true, opacity: 0.35, depthWrite: false })); ch.position.set(s * R * 0.5, -R * 0.25, this.faceZ * 0.86); ch.rotation.y = s * 0.55; hd.add(ch); }
    // eyes: sclera + pupil in a group that rotates to look; lids are skin shells that close over them
    this.eyes = [];
    const er = R * 0.24 * F.eye, ex = R * 0.37, ey = R * 0.1;
    const white = mat("#fbfaf6", { rough: 0.2, env: 0.9 }), dark = mat(F.iris || "#1a1716", { rough: 0.2, env: 1.0 }), glint = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    for (const s of [-1, 1]) {
      const socket = new THREE.Group(); socket.position.set(s * ex, ey, Math.sqrt(Math.max(0, surf(ey) ** 2 - ex * ex)) - er * 0.6); hd.add(socket);
      const ball = new THREE.Group(); socket.add(ball);
      const sc = mesh(new THREE.SphereGeometry(er, 20, 16), white); sc.scale.set(1, 1.18, 0.9); ball.add(sc);
      const pu = mesh(new THREE.SphereGeometry(er * 0.56, 16, 12), dark); pu.position.z = er * 0.6; pu.scale.set(1, 1.15, 0.55); ball.add(pu);
      const gl = new THREE.Mesh(new THREE.CircleGeometry(er * 0.13, 10), glint); gl.position.set(er * 0.18, er * 0.22, er * 0.9); ball.add(gl);
      const lid = mesh(new THREE.SphereGeometry(er * 1.12, 20, 10, 0, TAU, 0, Math.PI / 2), this.skinM); lid.scale.set(1, 1.2, 0.95); socket.add(lid);
      const low = mesh(new THREE.SphereGeometry(er * 1.1, 20, 8, 0, TAU, 0, Math.PI / 2), this.skinM); low.scale.set(1, 1.18, 0.93); low.rotation.x = Math.PI; socket.add(low);
      for (const m2 of [sc, pu, lid, low]) m2.castShadow = false;
      this.eyes.push({ socket, ball, pu, lid, low, s, er });
    }
    // brows
    this.brows = [];
    const bm = mat(F.brows, { rough: 0.8 });
    for (const s of [-1, 1]) { const g = new THREE.Group(); g.position.set(s * ex, ey + er * 1.55, Math.sqrt(Math.max(0, surf(ey + er * 1.55) ** 2 - ex * ex)) + R * 0.02); hd.add(g); const b = mesh(limbGeo(R * 0.045 * F.thick, R * 0.04 * F.thick, R * 0.28, 8).rotateZ(Math.PI / 2).translate(-R * 0.14, 0, 0), bm); b.castShadow = false; g.add(b); this.brows.push({ g, s }); }
    // mouth library (one visible at a time)
    this.mouths = {}; const mm = mat(F.mouth || "#4a1f1f", { rough: 0.5 }), tm = mat("#fbfaf6", { rough: 0.3 });
    const my = -R * 0.47, mz = surf(-R * 0.47) * 0.97, mw = R * 0.3;
    const arcTube = (curv, w = mw, th = R * 0.035) => { const pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12 * 2 - 1; pts.push(new THREE.Vector3(u * w, -curv * (1 - u * u) * R * 0.5, 0)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, th, 6, false); };
    const add = (name, ...ms) => { const g = new THREE.Group(); g.position.set(0, my, mz); for (const m2 of ms) { m2.castShadow = false; g.add(m2); } hd.add(g); g.visible = false; this.mouths[name] = g; };
    add("flat", mesh(arcTube(0.02, mw * 0.8), mm));
    add("smile", mesh(arcTube(0.28), mm));
    add("frown", mesh(arcTube(-0.24, mw * 0.8), mm));
    add("smirk", mesh(arcTube(0.2, mw * 0.7).rotateZ(0.18).translate(R * 0.06, 0, 0), mm));
    const o2 = mesh(new THREE.SphereGeometry(R * 0.11, 14, 10).scale(1, 1.25, 0.4), mm); add("o", o2);
    const oo = mesh(new THREE.SphereGeometry(R * 0.17, 14, 10).scale(1.1, 1.3, 0.4), mm); add("O", oo);
    { const sh = new THREE.Shape(); sh.moveTo(-mw, 0.02 * R); sh.quadraticCurveTo(0, -R * 0.06, mw, 0.02 * R); sh.quadraticCurveTo(0, -R * 0.42, -mw, 0.02 * R); const gg = new THREE.ShapeGeometry(sh); const t2 = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-mw * 0.8, 0), new THREE.Vector2(mw * 0.8, 0), new THREE.Vector2(mw * 0.6, -R * 0.1), new THREE.Vector2(-mw * 0.6, -R * 0.1)])); t2.translate(0, 0, 0.002); add("grin", mesh(gg, mm), mesh(t2, tm)); }
    { const gg = rbox(mw * 1.6, R * 0.16, R * 0.05, 0.6); const t2 = rbox(mw * 1.5, R * 0.1, R * 0.05, 0.4); t2.translate(0, 0, 0.004); const l = box(mw * 1.5, R * 0.012, R * 0.05, 0, 0, 0.008); add("grit", mesh(gg, mm), mesh(t2, tm), mesh(l, mm)); }
    { const sh = new THREE.Shape(); sh.moveTo(-mw * 0.7, 0); sh.quadraticCurveTo(0, R * 0.08, mw * 0.7, 0); sh.quadraticCurveTo(0, -R * 0.26, -mw * 0.7, 0); add("ah", mesh(new THREE.ShapeGeometry(sh), mm)); }
    { const w = mesh(arcTube(-0.14, mw * 0.45), mm); w.position.x = -mw * 0.42; const w2 = mesh(arcTube(0.14, mw * 0.45), mm); w2.position.x = mw * 0.42; add("wobbly", w, w2); }
    // hair, hats, beards, face extras
    this.buildHair(B, o, r);
  }

  buildHair(B, o, r) {
    const hd = this.head, R = B.head, H = { style: "short", color: "#2a211b", streak: null, ...(o.hair || {}) }, hm = mat(H.color, { rough: 0.65 }), sm = H.streak ? mat(H.streak, { rough: 0.6 }) : hm;
    const shell = (theta = 0.5, tilt = 0.25, s = 1.07) => { const g = new THREE.SphereGeometry(R * (s + 0.06), 28, 14, 0, TAU, 0, Math.PI * theta); g.scale(1, 1.1, 1.08); g.rotateX(-tilt); g.translate(0, R * 0.02, -R * 0.02); return g; };
    const parts = [], streaks = [];
    switch (H.style) {
      case "wild": {
        // spiky tufts fanned up and back, alternate tufts in the streak colour
        parts.push(shell(0.42, 0.35, 1.05));
        for (let i = 0; i < 11; i++) {
          const a = (i / 10 - 0.5) * 2.6, len = R * (0.55 + r() * 0.5), g = new THREE.ConeGeometry(R * (0.14 + r() * 0.06), len, 6);
          g.scale(1, 1, 0.45); g.translate(0, len / 2, 0); g.rotateZ(-a * 0.75 + (r() - 0.5) * 0.3); g.rotateX(-0.5 - r() * 0.7);
          g.translate(Math.sin(a) * R * 0.5, R * 0.75, -R * 0.15 - r() * R * 0.3); (i % 3 === 1 ? streaks : parts).push(g);
        }
        break;
      }
      case "slick": parts.push(shell(0.5, 0.32, 1.06)); { const g = new THREE.SphereGeometry(R * 0.55, 18, 12); g.scale(1.5, 0.55, 1.1); g.translate(R * 0.12, R * 0.92, R * 0.28); parts.push(g); } break;
      case "short": parts.push(shell(0.45, 0.3, 1.05)); break;
      case "side": parts.push(shell(0.5, 0.25, 1.06)); { const g = new THREE.SphereGeometry(R * 0.5, 14, 10); g.scale(1.4, 0.55, 1.2); g.translate(-R * 0.2, R * 0.9, R * 0.25); parts.push(g); } break;
      case "bun": parts.push(shell(0.5, 0.15, 1.06)); { const g = new THREE.SphereGeometry(R * 0.42, 16, 12); g.translate(0, R * 1.15, -R * 0.35); parts.push(g); } break;
      case "puffs": parts.push(shell(0.5, 0.2, 1.05)); for (const s of [-1, 1]) { const g = new THREE.IcosahedronGeometry(R * 0.5, 2); g.translate(s * R * 0.78, R * 0.85, -R * 0.15); parts.push(g); } break;
      case "curly": parts.push(shell(0.5, 0.2, 1.03)); for (let i = 0; i < 30; i++) { const a = r() * TAU, e = r() * 1.2; const g = new THREE.IcosahedronGeometry(R * (0.2 + r() * 0.1), 1); g.translate(Math.cos(a) * Math.cos(e) * R * 0.98, Math.sin(e) * R * 1.0 + R * 0.12, Math.sin(a) * Math.cos(e) * R * 0.98 - R * 0.1); if (Math.sin(a) * Math.cos(e) < 0.55 || e > 0.6) parts.push(g); } break;
      case "long": parts.push(shell(0.55, 0.15, 1.07)); { const g = lathe([[R * 0.95, 0], [R * 1.0, -R * 0.8], [R * 0.9, -R * 1.6], [R * 0.5, -R * 1.7]], 20); g.scale(1, 1, 0.8); g.translate(0, R * 0.2, -R * 0.25); parts.push(g); } break;
      case "bald": break;
    }
    if (parts.length) { const m2 = mesh(merge(parts), hm); hd.add(m2); }
    if (streaks.length) hd.add(mesh(merge(streaks), sm));
    // hats
    if (o.hat) {
      const h = { color: "#c0392b", band: null, ...o.hat }, m2 = mat(h.color, { rough: 0.6 }), dome = (s = 1.1, th = 0.5) => { const g = new THREE.SphereGeometry(R * s, 28, 14, 0, TAU, 0, Math.PI * th); g.scale(1, 0.95, 1.05); return g; };
      const g = new THREE.Group(); hd.add(g);
      if (h.kind === "cap" || h.kind === "cap-back" || h.kind === "guard") {
        g.add(mesh(dome(1.1, 0.48), m2)); const br = rbox(R * 1.3, R * 0.06, R * 0.9, 0.5); br.translate(0, R * 0.12, R * 0.95); const bm = mesh(br, h.brim ? mat(h.brim, { rough: 0.4, clear: 0.5 }) : m2); g.add(bm);
        g.rotation.x = -0.15; g.position.y = R * 0.32; if (h.kind === "cap-back") g.rotation.y = Math.PI;
        if (h.kind === "guard") { const crown = lathe([[R * 1.08, 0], [R * 1.18, R * 0.45], [R * 1.25, R * 0.55], [0.001, R * 0.58]], 28); g.add(mesh(crown, m2)); const badge = rbox(R * 0.3, R * 0.3, R * 0.06, 0.6); badge.translate(0, R * 0.32, R * 1.18); g.add(mesh(badge, mat(h.band || "#e3c35a", { metal: 0.7, rough: 0.3 }))); }
      } else if (h.kind === "beanie") { g.add(mesh(dome(1.16, 0.5), mat(h.color, { rough: 0.9, map: PT.cloth({ base: h.color, pattern: "knit" }).map }))); const fold = new THREE.TorusGeometry(R * 1.12, R * 0.13, 8, 28).rotateX(Math.PI / 2); fold.translate(0, R * 0.08, 0); g.add(mesh(fold, m2)); if (h.pom) { const pm = new THREE.IcosahedronGeometry(R * 0.25, 1); pm.translate(0, R * 1.12, 0); g.add(mesh(pm, mat(h.pom, { rough: 0.9 }))); } g.position.y = R * 0.42; g.rotation.x = -0.18; }
      else if (h.kind === "hood") { const hg = new THREE.SphereGeometry(R * 1.28, 28, 18, Math.PI * 0.32, Math.PI * 1.36); hg.scale(1, 1.08, 1.05); g.add(mesh(hg, mat(h.color, { rough: 0.8, side: THREE.DoubleSide }))); g.position.set(0, R * 0.05, -R * 0.08); }
      else if (h.kind === "chef") { const band = new THREE.CylinderGeometry(R * 1.02, R * 1.05, R * 0.55, 28, 1, true); band.translate(0, R * 0.25, 0); g.add(mesh(band, mat(h.color || "#f7f5f0", { rough: 0.8, side: THREE.DoubleSide }))); const top = []; for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU, b2 = new THREE.SphereGeometry(R * 0.55, 16, 12); b2.translate(Math.cos(a) * R * 0.55, R * 0.95, Math.sin(a) * R * 0.5); top.push(b2); } const c2 = new THREE.SphereGeometry(R * 0.7, 18, 12); c2.translate(0, R * 1.15, 0); top.push(c2); g.add(mesh(merge(top), mat(h.color || "#f7f5f0", { rough: 0.85 }))); g.position.y = R * 0.45; }
      else if (h.kind === "bowler") { g.add(mesh(dome(1.05, 0.5), m2)); const br = new THREE.TorusGeometry(R * 1.15, R * 0.08, 6, 28).rotateX(Math.PI / 2); g.add(mesh(br, m2)); g.position.y = R * 0.35; }
      else if (h.kind === "hardhat") { g.add(mesh(dome(1.15, 0.5), m2)); const br = rbox(R * 2.5, R * 0.06, R * 2.6, 0.95); g.add(mesh(br, m2)); g.position.y = R * 0.25; }
      else if (h.kind === "ranger" || h.kind === "bucket") { const cr = lathe(h.kind === "ranger" ? [[R * 1.05, 0], [R * 0.95, R * 0.55], [R * 0.4, R * 0.8], [0.001, R * 0.72]] : [[R * 1.12, 0], [R * 1.0, R * 0.6], [0.001, R * 0.62]], 24); g.add(mesh(cr, m2)); const br = lathe([[R * 1.05, 0], [R * (h.kind === "ranger" ? 2.1 : 1.6), -R * 0.12], [R * (h.kind === "ranger" ? 2.1 : 1.6), -R * 0.16], [R * 1.05, -R * 0.06]], 32); g.add(mesh(br, mat(h.color, { rough: 0.6, side: THREE.DoubleSide }))); if (h.band) { const bd = new THREE.CylinderGeometry(R * 1.05, R * 1.06, R * 0.14, 24, 1, true); bd.translate(0, R * 0.08, 0); g.add(mesh(bd, mat(h.band, { rough: 0.6 }))); } g.position.y = R * 0.55; }
    }
    // beards
    if (o.beard) {
      const b = { color: H.color, ...o.beard }, bm = mat(b.color, { rough: 0.8 });
      if (b.kind === "full") { const g = lathe([[0.001, -R * 1.25], [R * 0.55, -R * 1.18], [R * 0.9, -R * 0.8], [R * 1.0, -R * 0.3], [R * 0.98, 0]], 24, ); const gm = mesh(g, bm); gm.scale.z = 1.05; gm.position.z = R * 0.08; this.head.add(gm); this.mouthCover = true; }
      if (b.kind === "mustache" || b.kind === "walrus" || b.kind === "full") { const w = b.kind === "walrus" ? 1.5 : 1; for (const s of [-1, 1]) { const g = limbGeo(R * 0.09 * w, R * 0.05 * w, R * 0.32 * w, 10); g.rotateZ(s * (Math.PI / 2 + 0.45)); g.translate(s * R * 0.04, -R * 0.3, this.faceZ * 0.98); this.head.add(mesh(g, bm)); } }
      if (b.kind === "goatee") { const g = new THREE.ConeGeometry(R * 0.18, R * 0.35, 10).rotateX(Math.PI); g.translate(0, -R * 1.05, this.faceZ * 0.7); this.head.add(mesh(g, bm)); }
    }
    // face extras
    if (this.extras.has("goggles") || this.extras.has("goggles-eyes")) {
      const onEyes = this.extras.has("goggles-eyes"), g = new THREE.Group(), brass = mat(o.goggles || "#b08a3e", { metal: 0.8, rough: 0.3 }), lens = mat("#6fb7d8", { rough: 0.05, metal: 0.3, env: 1.5 });
      for (const s of [-1, 1]) { const ring = new THREE.CylinderGeometry(R * 0.3, R * 0.3, R * 0.22, 18, 1, true).rotateX(Math.PI / 2); ring.translate(s * R * 0.38, 0, 0); g.add(mesh(ring, brass)); const l = new THREE.CircleGeometry(R * 0.27, 18); l.translate(s * R * 0.38, 0, R * 0.08); g.add(mesh(l, lens)); }
      const strap = new THREE.TorusGeometry(R * 1.03, R * 0.06, 6, 32).rotateX(Math.PI / 2); strap.translate(0, 0, -this.faceZ * 0.9); g.add(mesh(strap, mat("#2b2420", { rough: 0.7 })));
      g.position.set(0, onEyes ? R * 0.12 : R * 0.68, this.faceZ * 0.92); if (!onEyes) g.rotation.x = -0.45; hd.add(g);
    }
    if (this.extras.has("glasses") || this.extras.has("shades")) {
      const shades = this.extras.has("shades"), g = new THREE.Group(), fm = mat(o.frames || "#1c1c1f", { rough: 0.3 });
      for (const s of [-1, 1]) { const ring = new THREE.TorusGeometry(R * 0.26, R * 0.035, 6, 20); ring.translate(s * R * 0.38, 0, 0); g.add(mesh(ring, fm)); if (shades) { const l = new THREE.CircleGeometry(R * 0.26, 18); l.translate(s * R * 0.38, 0, 0.002); g.add(mesh(l, mat("#16181d", { rough: 0.05, env: 1.5 }))); } }
      const bridge = box(R * 0.2, R * 0.04, R * 0.04, 0, 0.0, 0); g.add(mesh(bridge, fm)); g.position.set(0, R * 0.12, this.faceZ + R * 0.02); hd.add(g); this.glasses = g;
    }
  }

  buildContraption(B, o) {
    // the hero's backpack machine: a brass tank, two gauges, pipes, a steam vent and the hose socket
    const g = new THREE.Group(), T = B.T, brass = mat(o.brass || "#b8924a", { metal: 0.75, rough: 0.32, env: 1.2 }), iron = mat("#3a3a3e", { metal: 0.6, rough: 0.4 }), dial = mat("#f4efe2", { rough: 0.4 });
    const tank = lathe([[0.001, -0.22], [0.1, -0.21], [0.15, -0.16], [0.16, 0], [0.16, 0.18], [0.12, 0.25], [0.001, 0.27]], 24); g.add(mesh(tank, brass));
    for (const [x, y] of [[-0.1, 0.05], [0.1, 0.12]]) { const gg = new THREE.CylinderGeometry(0.055, 0.055, 0.03, 18).rotateX(Math.PI / 2); gg.translate(x, y, 0.15); g.add(mesh(gg, brass)); const d = new THREE.CircleGeometry(0.045, 18); d.translate(x, y, 0.167); g.add(mesh(d, dial)); const nd = box(0.004, 0.035, 0.003, x, y + 0.012, 0.169); g.add(mesh(nd, mat("#b22"))); }
    const p1 = new THREE.TorusGeometry(0.12, 0.022, 8, 16, Math.PI); p1.rotateY(Math.PI / 2); p1.translate(-0.17, 0.0, 0); g.add(mesh(p1, iron));
    const vent = new THREE.CylinderGeometry(0.03, 0.04, 0.16, 12); vent.translate(0.08, 0.32, -0.02); g.add(mesh(vent, iron));
    const sock = new THREE.CylinderGeometry(0.07, 0.06, 0.1, 16).rotateZ(Math.PI / 2); sock.translate(-0.2, -0.08, 0.02); g.add(mesh(sock, brass));
    for (let i = 0; i < 5; i++) { const b2 = new THREE.SphereGeometry(0.012, 6, 4); const a = (i / 5) * TAU; b2.translate(Math.cos(a) * 0.16, 0.18, Math.sin(a) * 0.16); g.add(mesh(b2, iron)); }
    const strap = []; for (const s of [-1, 1]) { const st = new THREE.TorusGeometry(0.17, 0.018, 6, 16, Math.PI); st.rotateY(Math.PI / 2); st.translate(s * B.tw * 0.28, 0.1, 0.18); strap.push(st); }
    g.add(mesh(merge(strap), mat("#4a3426", { rough: 0.7 })));
    if (this.extras.has("beacon")) {
      // an amber rotating beacon on top of the tank (blinks with face({ t }))
      const base = new THREE.CylinderGeometry(0.06, 0.07, 0.04, 16); base.translate(-0.06, 0.29, 0); g.add(mesh(base, iron));
      this.beacon = mesh(new THREE.SphereGeometry(0.07, 18, 10, 0, TAU, 0, Math.PI / 2), mat("#ffb020", { rough: 0.2, emissive: "#ff9a10", emissiveI: 1.2, transparent: true, opacity: 0.92 }));
      this.beacon.material = this.beacon.material.clone(); this.beacon.position.set(-0.06, 0.31, 0); g.add(this.beacon);
    }
    g.position.set(0, T * 0.62, -B.td / 2 - 0.15); this.spine.add(g); this.pack = g;
    this.sockets.vent = [0.08, 0.42, -0.02]; this.sockets.hose = [-0.26, -0.08, 0.02];
  }

  // ---------------------------------------------------------------- per frame
  reset() { this.root.visible = false; this.contact.visible = false; }
  /** place([x, y?, z], yaw°) — y defaults to the ground under (x, z); yaw 0 faces the camera (+z), 90 faces +x */
  place(p, yaw = 0, o = {}) {
    const y = p[1] ?? this.film.ground(p[0], p[2]);
    this.root.visible = true; this.root.position.set(p[0], y, p[2]); this.root.rotation.set(0, yaw * DEG, 0);
    this.root.scale.set(1, 1, 1); this.lift = o.lift || 0; this.groundY = this.film.ground(p[0], p[2]); this.yaw = yaw;
    this.updateContact(); return this;
  }
  /** a world direction of the figure's body: "fwd" (where it faces), "right", "left", "up" */
  axis(name = "fwd") { const y = this.root.rotation.y, f = [Math.sin(y), 0, Math.cos(y)], r = [-Math.cos(y), 0, Math.sin(y)]; return name === "fwd" ? f : name === "right" ? r : name === "left" ? [-r[0], 0, -r[2]] : [0, 1, 0]; }
  /** squash & stretch around the feet: k > 1 stretches tall/thin, k < 1 squashes, volume kept */
  squash(k) { const s = 1 / Math.sqrt(k); this.root.scale.set(s, k, s); return this; }
  updateContact() {
    const p = this.root.position, hgt = Math.max(0, p.y + (this._minY || 0) - this.groundY);
    this.contact.visible = this.root.visible; this.contact.position.set(p.x, this.groundY + 0.012, p.z);
    const k = clamp(1 - hgt / 2.5); this.contact.scale.setScalar(this.contactBase * (0.6 + 0.4 * k)); this.contact.material.opacity = 0.38 * k * k;
  }

  /** pose(p) — p from P.* (angles in degrees); missing keys stay at rest */
  pose(p = {}) {
    const d = DEG, A = (v, i, def = 0) => (v ? v[i] ?? def : def);
    this.pelvis.position.y = this.B.hipY + (p.bob || 0) - (p.crouch || 0);
    this.pelvis.position.z = p.shift || 0; this.pelvis.rotation.set(0, (p.hipYaw || 0) * d, (p.sway || 0) * d);
    this.spine.rotation.set((this.B.hunch * 0.4 + (p.lean || 0)) * d, (p.twist || 0) * d, (p.side || 0) * d);
    this.chest.rotation.set((this.B.hunch * 0.3 + (p.chest || 0)) * d, (p.chestYaw || 0) * d, 0);
    this.neck.rotation.set((-this.B.hunch * 0.5 + A(p.head, 0)) * d * 0.4, A(p.head, 1) * d * 0.4, A(p.head, 2) * d * 0.4);
    this.head.rotation.set(A(p.head, 0) * d * 0.6, A(p.head, 1) * d * 0.6, A(p.head, 2) * d * 0.6);
    for (const [k, s] of [["L", 1], ["R", -1]]) {
      const a = p["arm" + k] || [0, 8, 0, 8], ar = this.arm[k];
      // [forward, out, twist, elbow]
      ar.sh.rotation.set(-a[0] * d, -s * (a[2] || 0) * d, s * a[1] * d);
      ar.el.rotation.set(-(a[3] || 0) * d, 0, 0);
      const wrist = p["wrist" + k] || [0, 0, 0]; ar.wr.rotation.set(wrist[0] * d, s * wrist[1] * d, s * wrist[2] * d);
      const curl = p["hand" + k] ?? 0.25; ar.hand.fingers.rotation.x = -curl * 1.6; ar.hand.thumb.rotation.x = -curl * 0.8;
      const l = p["leg" + k] || [0, 0, 0], lg = this.leg[k];
      // [forward, out, knee]
      lg.hp.rotation.set(-l[0] * d, 0, s * (l[1] || 0) * d);
      lg.kn.rotation.set((l[2] || 0) * d, 0, 0);
      lg.an.rotation.set((p["foot" + k] || 0) * d - (-l[0] + (l[2] || 0)) * d * 0.0, 0, 0);
    }
    this._pose = p;
    return this;
  }

  /** face(name, { look: [x,y,z] | null, t, blink: true }) — expression + gaze; blinks automatically when t is given */
  face(name = "neutral", o = {}) {
    const E = { ...EXPR.neutral, ...(EXPR[name] || {}), ...(o.over || {}) };
    for (const m of Object.values(this.mouths)) m.visible = false;
    const mo = this.mouths[E.mouth] || this.mouths.flat; mo.visible = !this.mouthCover || ["O", "o", "ah", "grin", "grit"].includes(E.mouth);
    if (this.mouthCover && mo.visible) mo.position.z = this.B.head * 1.2;
    if (this.beacon && o.t != null) this.beacon.material.emissiveIntensity = 0.4 + 2.6 * Math.max(0, Math.sin(o.t * 7.5)) ** 3;
    let lid = E.lid;
    if (o.t != null && o.blink !== false) { for (const b of this.blinks) { const a = o.t - b; if (a > -0.06 && a < 0.1) { lid = Math.max(lid, 1 - Math.abs(a - 0.02) / 0.08); break; } if (b > o.t + 1) break; } }
    for (const e of this.eyes) {
      e.lid.rotation.x = lerp(-1.25, 1.55, clamp(lid + (E.lidS ? E.lidS * e.s : 0)));
      e.low.rotation.x = Math.PI + lerp(1.45, 0.8, clamp(E.low));
      e.pu.scale.set(E.pupil, E.pupil * 1.15, 0.55);
      e.socket.scale.setScalar(E.wide);
    }
    for (const b of this.brows) { const k = b.s; b.g.position.y = this.eyes[0].socket.position.y + this.eyes[0].er * (1.55 + E.browUp + (E.browS ? E.browS * k : 0)); b.g.rotation.z = -k * (E.browAng) * DEG; }
    // gaze: rotate eyeballs toward a world point (clamped), or a local direction [yaw, pitch]
    let yaw = (E.gaze?.[0] || 0) * DEG, pitch = (E.gaze?.[1] || 0) * DEG;
    if (o.look) {
      this.root.updateMatrixWorld(true);
      const p = new THREE.Vector3(...o.look); this.head.worldToLocal(p);
      yaw = Math.atan2(p.x, Math.max(0.05, p.z)); pitch = Math.atan2(p.y - this.eyes[0].socket.position.y, Math.hypot(p.x, p.z));
    }
    if (o.gaze) { yaw = o.gaze[0] * DEG; pitch = o.gaze[1] * DEG; }
    yaw = clamp(yaw, -0.6, 0.6); pitch = clamp(pitch, -0.45, 0.45);
    for (const e of this.eyes) e.ball.rotation.set(-pitch, yaw, 0);
    return this;
  }

  /** world position of a named point: head, top, nose, chest, collar, back, hips, handL, handR, footL, footR, hose, vent */
  socket(name) {
    this.root.updateMatrixWorld(true);
    const v = new THREE.Vector3(), B = this.B;
    const at = (obj, x = 0, y = 0, z = 0) => obj.localToWorld(v.set(x, y, z)).toArray();
    switch (name) {
      case "head": return at(this.head);
      case "top": return at(this.head, 0, B.head * 1.25, 0);
      case "nose": return at(this.head, 0, -B.head * 0.1, B.head * 1.2);
      case "chest": return at(this.spine, 0, B.T * 0.7, B.td * 0.55);
      case "collar": return at(this.spine, 0, B.T * 1.0, -B.td * 0.45);
      case "belt": return at(this.spine, 0, 0.02, -B.td * 0.55);
      case "back": return at(this.spine, 0, B.T * 0.6, -B.td * 0.6);
      case "hips": return at(this.pelvis);
      case "handL": return at(this.arm.L.wr, 0, -0.05, 0);
      case "handR": return at(this.arm.R.wr, 0, -0.05, 0);
      case "footL": return at(this.leg.L.an, 0, -B.footH, 0.08);
      case "footR": return at(this.leg.R.an, 0, -B.footH, 0.08);
      case "hose": return this.pack ? at(this.pack, ...this.sockets.hose) : at(this.spine, B.tw * 0.5, B.T * 0.5, -B.td * 0.4);
      case "vent": return this.pack ? at(this.pack, ...this.sockets.vent) : at(this.head, 0, B.head * 1.3, 0);
      default: return at(this.root);
    }
  }
  /** hold(obj, side, pos, rot°) — parent an Object3D to a wrist (it follows the hand from then on) */
  hold(obj, side = "R", pos = [0, -0.1, 0.03], rot = [0, 0, 0]) { this.arm[side].wr.add(obj); obj.position.set(...pos); obj.rotation.set(rot[0] * DEG, rot[1] * DEG, rot[2] * DEG); obj.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return obj; }
  /** the object a hand holds things with (parent props to it with hold()) */
  handObj(side = "R") { return this.arm[side].wr; }
  /** pin(socket, worldPoint) — move the whole figure so that socket lands on worldPoint (held by the collar, sat on a palm …) */
  pin(name, p) {
    const s = this.socket(name); this.root.position.x += p[0] - s[0]; this.root.position.y += p[1] - s[1]; this.root.position.z += p[2] - s[2];
    this.updateContact(); return this;
  }
  /** lowest foot height above the figure's origin (for keeping feet on the ground) */
  footY() { const a = this.socket("footL")[1], b = this.socket("footR")[1]; return Math.min(a, b); }
  /** drop the figure so its lowest foot touches the ground (call after pose for sits, kneels, leaps) */
  plant() { const d = this.footY() - this.groundY; this.root.position.y -= d; this.updateContact(); return this; }
}

// ---------------------------------------------------------------- expressions
// lid 0 open … 1 closed; low = lower lid up; pupil scale; wide = eye scale; browUp in eye radii; browAng (+ = angry V)
export const EXPR = {
  neutral: { lid: 0.18, low: 0.05, pupil: 1, wide: 1, browUp: 0, browAng: 0, mouth: "flat" },
  deadpan: { lid: 0.45, low: 0.12, pupil: 0.95, wide: 1, browUp: -0.1, browAng: 2, mouth: "flat" },
  smug: { lid: 0.42, low: 0.15, pupil: 0.9, wide: 1, browUp: 0.15, browAng: -4, browS: 0.25, mouth: "smirk" },
  happy: { lid: 0.12, low: 0.3, pupil: 1.05, wide: 1, browUp: 0.3, browAng: -6, mouth: "smile" },
  joy: { lid: 0.0, low: 0.35, pupil: 1.1, wide: 1.06, browUp: 0.5, browAng: -10, mouth: "grin" },
  shock: { lid: 0.0, low: 0.0, pupil: 0.55, wide: 1.2, browUp: 0.75, browAng: -12, mouth: "O" },
  scared: { lid: 0.0, low: 0.05, pupil: 0.5, wide: 1.15, browUp: 0.6, browAng: -18, mouth: "grit" },
  annoyed: { lid: 0.42, low: 0.18, pupil: 0.9, wide: 1, browUp: -0.15, browAng: 14, mouth: "frown" },
  angry: { lid: 0.3, low: 0.25, pupil: 0.85, wide: 1, browUp: -0.25, browAng: 24, mouth: "grit" },
  sheepish: { lid: 0.3, low: 0.2, pupil: 1, wide: 1, browUp: 0.35, browAng: -16, mouth: "wobbly" },
  dazed: { lid: 0.5, low: 0.1, pupil: 0.7, wide: 1, browUp: 0.2, browAng: -8, mouth: "o" },
  sleepy: { lid: 0.7, low: 0.15, pupil: 1, wide: 1, browUp: -0.05, browAng: -2, mouth: "flat" },
  squint: { lid: 0.55, low: 0.35, pupil: 0.9, wide: 1, browUp: -0.2, browAng: 10, mouth: "flat" },
  sly: { lid: 0.48, low: 0.2, pupil: 0.9, wide: 1, browUp: 0.1, browAng: 8, browS: 0.3, mouth: "smirk" },
  sad: { lid: 0.35, low: 0.05, pupil: 1.05, wide: 1, browUp: 0.3, browAng: -20, mouth: "frown" },
  wonder: { lid: 0.0, low: 0.1, pupil: 1.25, wide: 1.12, browUp: 0.6, browAng: -8, mouth: "o" },
  yell: { lid: 0.1, low: 0.2, pupil: 0.8, wide: 1.05, browUp: 0.1, browAng: 18, mouth: "ah" },
};

// ---------------------------------------------------------------- poses (degrees)
// armX: [forward, out, twist, elbow]  legX: [forward, out, knee]  head: [nod, turn, tilt]  hand: curl 0..1
export const P = {
  stand: { armL: [5, 10, 20, 14], armR: [5, 10, 20, 14], legL: [0, 2, 0], legR: [0, 2, 0], handL: 0.35, handR: 0.35 },
  hips: { armL: [-15, 50, 90, 80], armR: [-15, 50, 90, 80], handL: 0.6, handR: 0.6, legL: [0, 5, 0], legR: [0, 5, 0], chest: -3 },
  crossed: { armL: [32, 20, 90, 118], armR: [38, 22, 90, 112], legL: [0, 4, 0], legR: [0, 4, 0], chest: -2 },
  shrug: { armL: [15, 22, -70, 85], armR: [15, 22, -70, 85], handL: 0, handR: 0, head: [0, 0, 10], bob: 0.02 },
  point: { armR: [85, 8, 0, 4], handR: 0.85, armL: [4, 7, 0, 12], head: [0, 0, 0] },
  wave: { armR: [10, 150, 0, 30], handR: 0, armL: [4, 7, 0, 10] },
  reach: { armL: [80, 10, 0, 10], armR: [80, 10, 0, 10], handL: 0.1, handR: 0.1, lean: 12 },
  carry: { armL: [45, 12, 40, 70], armR: [45, 12, 40, 70], handL: 0.5, handR: 0.5 },
  holdBag: { armR: [12, 12, 30, 85], handR: 0.9, armL: [2, 8, 0, 10] },
  dangle: { armL: [10, 30, 0, 20], armR: [10, 30, 0, 20], legL: [8, 8, 15], legR: [-4, 8, 25], footL: 35, footR: 40, head: [-10, 0, 0], handL: 0.2, handR: 0.2 },
  flail: { armL: [20, 130, 0, 40], armR: [20, 130, 0, 40], legL: [30, 15, 40], legR: [-10, 15, 60], handL: 0, handR: 0 },
  cower: { armL: [70, 25, 60, 120], armR: [70, 25, 60, 120], lean: 18, crouch: 0.12, legL: [20, 6, 40], legR: [20, 6, 40], head: [15, 0, 0] },
  sit: { legL: [85, 6, 90], legR: [85, 6, 90], footL: 0, footR: 0, armL: [25, 8, 0, 40], armR: [25, 8, 0, 40], lean: -4 },
  sitBox: { legL: [80, 10, 85], legR: [70, 10, 70], armL: [35, 12, 0, 50], armR: [30, 12, 0, 60], lean: 6 },
  tumble: { armL: [90, 40, 0, 120], armR: [90, 40, 0, 120], legL: [100, 10, 130], legR: [95, 10, 130], lean: 45, head: [30, 0, 0] },
  salute: { armR: [70, 40, 70, 150], handR: 0, armL: [4, 7, 0, 10] },
  tipCap: { armR: [60, 30, 60, 135], handR: 0.6, armL: [4, 7, 0, 10], head: [8, 0, 0] },
  phone: { armR: [25, 22, 40, 150], handR: 0.7, armL: [4, 7, 0, 10], head: [0, 0, 8] },
  scooter: { armL: [40, 8, 0, 25], armR: [40, 8, 0, 25], handL: 0.9, handR: 0.9, legL: [10, 3, 15], legR: [-18, 3, 8], lean: 8 },
  sneak: { armL: [30, 15, 0, 100], armR: [30, 15, 0, 100], handL: 0.3, handR: 0.3, lean: 15, crouch: 0.08, legL: [25, 4, 35], legR: [-10, 4, 25] },
  lookUp: { head: [-35, 0, 0], chest: -6, armL: [4, 7, 0, 10], armR: [4, 7, 0, 10] },
  hold: { armL: [45, 12, 30, 62], armR: [4, 7, 0, 10], handL: 0.85 },
  hold2: { armL: [40, 14, 40, 75], armR: [40, 14, 40, 75], handL: 0.85, handR: 0.85 },
  lick: { armR: [40, 18, 60, 128], handR: 0.9, armL: [4, 7, 0, 10], head: [-5, 0, 0] },
  toss: { armR: [-20, 25, 0, 20], handR: 0.1, armL: [8, 8, 0, 15], twist: -12 },
  heroStand: { armL: [6, 6, 0, 30], armR: [6, 6, 0, 30], handL: 0.8, handR: 0.8, chest: -4, legL: [0, 4, 0], legR: [0, 4, 0] },
};
/** mix two poses (k 0 → a, 1 → b), recursively over arrays */
export function mixPose(a, b, k) {
  const out = {}, keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const va = a[key] ?? (Array.isArray(b[key]) ? b[key].map(() => 0) : REST[key] ?? 0), vb = b[key] ?? (Array.isArray(va) ? va.map(() => 0) : REST[key] ?? 0);
    const A = Array.isArray(va) ? va : null, Bv = Array.isArray(vb) ? vb : null;
    if (A || Bv) { const aa = A || REST[key] || Bv.map(() => 0), bb = Bv || REST[key] || aa.map(() => 0); out[key] = aa.map((v, i) => v + ((bb[i] ?? 0) - v) * k); }
    else out[key] = va + (vb - va) * k;
  }
  return out;
}
const REST = { armL: [4, 7, 0, 10], armR: [4, 7, 0, 10], legL: [0, 2, 0], legR: [0, 2, 0], head: [0, 0, 0], handL: 0.25, handR: 0.25, wristL: [0, 0, 0], wristR: [0, 0, 0] };
/** layer b over a: keys of b replace a */
export const over = (a, b) => ({ ...a, ...b });
/** K over poses: [[t, pose], [t, pose, ease]…] */
export function KP(t, track) {
  if (t <= track[0][0]) return track[0][1];
  for (let i = 1; i < track.length; i++) { const [t1, p1, e] = track[i]; if (t <= t1) { const [t0, p0] = track[i - 1]; return mixPose(p0, p1, K(t, [[t0, 0], [t1, 1, e]])); } }
  return track[track.length - 1][1];
}

/**
 * walk(phase, o) — a walk cycle; phase in cycles (1 = two steps). o.strut (0 … 1) adds the reference's cocky,
 * bouncy stride with a chest-out lean; o.stride scales the leg swing; o.arms scales the arm swing.
 */
export function walk(ph, o = {}) {
  o = { stride: 1, arms: 1, strut: 0, bounce: 1, ...o };
  const a = ph * TAU, s = Math.sin(a), c = Math.cos(a), sw = 26 * o.stride;
  const knee = (x) => Math.max(0, Math.sin(x)) * 45 * o.stride + 6;
  return {
    legL: [s * sw, 2, knee(a + 2.6)], legR: [-s * sw, 2, knee(a + 2.6 + Math.PI)],
    footL: Math.max(0, -c) * 10 - Math.max(0, s) * 8, footR: Math.max(0, c) * 10 - Math.max(0, -s) * 8,
    armL: [-s * 22 * o.arms + 3, 8, 0, 18 + Math.max(0, -s) * 18], armR: [s * 22 * o.arms + 3, 8, 0, 18 + Math.max(0, s) * 18],
    bob: (Math.abs(Math.cos(a)) * 0.035 - 0.015) * o.bounce * (1 + o.strut), sway: s * 2.5 * (1 + o.strut * 1.5), twist: s * 5 * (1 + o.strut),
    lean: 3 - o.strut * 6, chest: -o.strut * 4, head: [o.strut * -4, 0, -s * 3 * o.strut],
  };
}
/** run(phase) — arms pumping, knees high */
export function run(ph, o = {}) {
  const a = ph * TAU, s = Math.sin(a), k = o.k ?? 1;
  return { legL: [s * 48 * k, 2, Math.max(0, Math.sin(a + 2.4)) * 95 * k + 15], legR: [-s * 48 * k, 2, Math.max(0, Math.sin(a + 2.4 + Math.PI)) * 95 * k + 15], armL: [-s * 50 * k, 12, 0, 85], armR: [s * 50 * k, 12, 0, 85], handL: 0.8, handR: 0.8, bob: Math.abs(Math.cos(a)) * 0.08 * k, lean: 14 * k, twist: s * 8 };
}
/** a figure walking from x0 to x1 between t0 and t1: returns { x, phase } with feet that don't slide (phase from distance) */
export function stroll(t, t0, t1, x0, x1, strideLen = 1.3, e = "lin") {
  const k = K(t, [[t0, 0], [t1, 1, e]]), x = lerp(x0, x1, k);
  return { x, phase: Math.abs(x - x0) / (strideLen * 2), moving: t > t0 && t < t1 };
}

/** steps(t0, t1, x0, x1, strideLen, o) — footstep sfx cues for a stroll(): one "step" each time a foot plants */
export function steps(t0, t1, x0, x1, strideLen = 1.3, o = {}) {
  const out = [], d = Math.abs(x1 - x0), n = Math.floor(d / strideLen);
  for (let k = 1; k <= n; k++) { const u = (k * strideLen) / d; out.push(["step", +(t0 + (t1 - t0) * u).toFixed(3), { gain: o.gain ?? 0.7, pitch: (o.pitch ?? 1) * (k % 2 ? 1 : 0.92), pan: o.pan ?? 0 }]); }
  return out;
}
