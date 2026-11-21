// bounce-symphony · stage.js — the machine on a studio floor: pads on thin poles, droppers, cups, balls in flight,
// pads that glow and rock when struck, a camera that frames the music, depth of field and bloom; the contract.
//
//   const piece = new Piece({ title, bpm, meter, intro, outro, look, ballR, instruments, lanes, shots, mix });
//   await piece.mount();   // → window.DURATION, FPS, READY, seek(t), audioSpec(), runChecks(), piece
//
// Everything on screen is a pure function of t (ball positions are parabolas from the solver, glow and rocking are
// closed-form decays from each pad's strike time), so any frame can be rendered alone, in any order, by any worker.
import * as THREE from 'three';
import { EffectComposer } from './jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from './jsm/postprocessing/BokehPass.js';
import { OutputPass } from './jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from './jsm/environments/RoomEnvironment.js';
import { solveMachine, simulate, clearance, ballAt, midiName, KINDS } from './machine.js';
import { planCauses, dominoAngle } from './mechanisms.js';
import { renderAudio } from './synth.js';

// ---------------------------------------------------------------- looks (the room): examples of the style, not menus
export const LOOKS = {
  // the reference look: a dark grey studio, one soft overhead key making a pool of light, poles casting long shadows
  studio: {
    bg: '#141518', floor: '#3a3b3f', floorRough: 0.62, fog: [3, 8], exposure: 1.0, env: 0.35,
    key: { color: '#fff4e6', lux: 2.4, height: 1.6, angle: 40, penumbra: 0.95, offset: [-0.25, 0.2] },
    fill: { sky: '#9fb2c8', ground: '#2a2724', intensity: 0.3 },
    bloom: { strength: 0.55, radius: 0.5, threshold: 0.82 },
    dof: { aperture: 0.009, maxblur: 0.012 },
    pole: '#8c8f96', glowDecay: 0.45, glowPeak: 2.6,
    palette: ['#ff4d4d', '#ff8a3d', '#ffc23d', '#e6e84a', '#8fe05a', '#3dd68c', '#3dd6d0', '#3da9ff', '#5a6bff', '#9a5aff', '#e05ae0', '#ff5aa0'],
  },
};
const INST_LOOK = { // default body of each instrument kind
  marimba: { color: '#8a4a2a', rough: 0.55, metal: 0 }, xylophone: { color: '#b0703f', rough: 0.45, metal: 0 },
  vibraphone: { color: '#b9bec6', rough: 0.3, metal: 0.9 }, glockenspiel: { color: '#d8dce2', rough: 0.22, metal: 1 },
  steelpan: { color: '#c9ccd2', rough: 0.25, metal: 1 }, bowl: { color: '#b88a3a', rough: 0.3, metal: 1 },
  gong: { color: '#c19a3c', rough: 0.32, metal: 1 }, cymbal: { color: '#d1aa4a', rough: 0.28, metal: 1 },
  drum: { color: '#e8e2d6', rough: 0.7, metal: 0, shell: '#7a2d26' }, woodblock: { color: '#a8653a', rough: 0.6, metal: 0 },
  kalimba: { color: '#cfd3d8', rough: 0.25, metal: 1 },
};
const RANGES = { marimba: [36, 96], xylophone: [65, 108], vibraphone: [53, 89], glockenspiel: [79, 108], steelpan: [60, 89], bowl: [48, 84], gong: [36, 72], cymbal: [60, 96], drum: [28, 60], woodblock: [60, 96], kalimba: [60, 88] };

const qs = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const lerp = (a, b, u) => a + (b - a) * u, ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const V = (p) => new THREE.Vector3(p.x, p.y, p.z), A = (a) => new THREE.Vector3(a[0], a[1], a[2]);

export class Piece {
  constructor(o) {
    this.o = o; this.title = o.title || 'Untitled';
    this.look = { ...LOOKS.studio, ...(typeof o.look === 'string' ? LOOKS[o.look] : o.look || {}) };
    for (const k of ['key', 'fill', 'bloom', 'dof']) this.look[k] = { ...LOOKS.studio[k], ...(o.look?.[k] || {}) };
    this.m = solveMachine({ bpm: o.bpm, meter: o.meter, intro: o.intro ?? 3, ballR: o.ballR, lanes: o.lanes, instruments: o.instruments });
    if (o.causes !== false) planCauses(this.m, { starter: o.starter }); // nothing starts by itself
    this.outro = o.outro ?? 3;
    this.duration = +(this.m.end + this.outro).toFixed(3);
    this.fps = o.fps ?? 30;
    this.shots = (o.shots || [{ at: 0, kind: 'orbit' }]).map((s) => ({ blend: 1.2, ...s }));
    this.laneById = Object.fromEntries(o.lanes.map((l) => [l.id, l]));
    // the machine's footprint (for default framing, the key light and panning)
    const P = [...this.m.pads.map((p) => p.center), ...this.m.cups.map((c) => c.rim), ...this.m.droppers.map((d) => d.p)];
    const bb = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, y1: 0 };
    for (const p of P) { bb.x0 = Math.min(bb.x0, p.x); bb.x1 = Math.max(bb.x1, p.x); bb.z0 = Math.min(bb.z0, p.z); bb.z1 = Math.max(bb.z1, p.z); bb.y1 = Math.max(bb.y1, p.y); }
    this.bb = bb; this.center = new THREE.Vector3((bb.x0 + bb.x1) / 2, bb.y1 * 0.45, (bb.z0 + bb.z1) / 2);
    this.span = Math.max(bb.x1 - bb.x0, bb.z1 - bb.z0, bb.y1, 0.5);
    this.reach = Math.max(1, ...P.map((p) => Math.hypot(p.x - this.center.x, p.z - this.center.z))); // radius of the footprint
  }

  // ---- the three.js world
  build(W, H) {
    const L = this.look, m = this.m;
    const canvas = document.querySelector('#frame');
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }));
    r.setPixelRatio(1); r.setSize(W, H, false);
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = L.exposure; r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color(L.bg); scene.fog = new THREE.Fog(L.bg, L.fog[0] * this.reach, L.fog[1] * this.reach); // fog, key height and pool scale with the machine's reach
    const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = L.env;
    const cam = (this.camera = new THREE.PerspectiveCamera(32, W / H, 0.02, 80));
    // floor and light
    // the floor fades to the background past the machine, so a low camera sees no horizon line (a seamless studio)
    const fc = document.createElement('canvas'); fc.width = fc.height = 512; const fx = fc.getContext('2d'), gr = fx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.17, '#fff'); gr.addColorStop(0.3, '#4a4a4a'); gr.addColorStop(0.42, '#000'); gr.addColorStop(1, '#000'); fx.fillStyle = gr; fx.fillRect(0, 0, 512, 512);
    const ftex = new THREE.CanvasTexture(fc); ftex.colorSpace = THREE.SRGBColorSpace;
    const fs = 7 * this.reach, floor = new THREE.Mesh(new THREE.PlaneGeometry(fs * 2, fs * 2), new THREE.MeshStandardMaterial({ color: L.floor, map: ftex, roughness: L.floorRough, metalness: 0 }));
    floor.material.envMapIntensity = 0.12; // no bright grazing reflection of the room past the light
    floor.rotation.x = -Math.PI / 2; floor.position.set(this.center.x, 0, this.center.z); floor.receiveShadow = true; scene.add(floor);
    const c = this.center, kh = L.key.height * this.reach + this.bb.y1;
    const key = new THREE.SpotLight(L.key.color, L.key.lux * kh * kh, 0, (L.key.angle * Math.PI) / 180, L.key.penumbra, 2); // lux on the floor below
    key.position.set(c.x + L.key.offset[0] * this.reach, kh, c.z + L.key.offset[1] * this.reach);
    key.target.position.set(c.x, 0, c.z); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.01; key.shadow.radius = 4;
    key.shadow.camera.near = 1; key.shadow.camera.far = key.position.y * 2.5;
    scene.add(key, key.target, new THREE.HemisphereLight(L.fill.sky, L.fill.ground, L.fill.intensity));
    // materials
    const poleMat = new THREE.MeshStandardMaterial({ color: L.pole, roughness: 0.35, metalness: 0.85 });
    const footMat = new THREE.MeshStandardMaterial({ color: '#2b2c30', roughness: 0.6, metalness: 0.4 });
    // poles and feet: instanced (static)
    const poles = [], feet = [];
    const addPole = (x, z, y1, rad = 0.0045) => { poles.push([x, z, y1, rad]); feet.push([x, z]); };
    // pads
    this.padMeshes = m.pads.map((pd) => {
      const inst = { ...(INST_LOOK[pd.kind] || {}), ...(this.o.instruments?.[pd.inst] || {}) };
      const glow = new THREE.Color(inst.glow && inst.glow !== 'pitch' ? inst.glow : L.palette[pd.midi % 12]);
      const body = inst.body === 'pitch' ? glow.clone().multiplyScalar(0.55) : new THREE.Color(inst.color);
      const mat = new THREE.MeshStandardMaterial({ color: body, roughness: inst.rough ?? 0.4, metalness: inst.metal ?? 0, emissive: glow, emissiveIntensity: 0 });
      const g = new THREE.Group(), mesh = new THREE.Group(); g.add(mesh);
      if (pd.shape === 'bar') {
        const b = new THREE.Mesh(new THREE.BoxGeometry(pd.L, pd.th, pd.w), mat); b.position.y = -pd.th / 2; mesh.add(b);
      } else if (pd.kind === 'drum') {
        const shell = new THREE.Mesh(new THREE.CylinderGeometry(pd.R, pd.R, pd.th, 40), new THREE.MeshStandardMaterial({ color: inst.shell || '#7a2d26', roughness: 0.4, metalness: 0.1 }));
        shell.position.y = -pd.th / 2 - 0.001; mesh.add(shell);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(pd.R * 0.98, pd.R * 0.98, 0.002, 40), mat); head.position.y = -0.001; mesh.add(head);
      } else if (pd.kind === 'bowl') { // a singing bowl turned over: a bell with a flat crown
        const pts = []; const Rr = pd.R; for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push(new THREE.Vector2(Rr * (0.35 + 0.65 * Math.sin(u * Math.PI / 2)), -pd.th * u ** 1.6)); }
        pts.unshift(new THREE.Vector2(0, 0)); const b = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), mat); b.material.side = THREE.DoubleSide; mesh.add(b);
      } else if (pd.kind === 'cymbal') {
        const pts = [new THREE.Vector2(0, 0.006), new THREE.Vector2(pd.R * 0.18, 0.004), new THREE.Vector2(pd.R * 0.22, 0), new THREE.Vector2(pd.R, -0.006), new THREE.Vector2(pd.R, -0.006 - pd.th), new THREE.Vector2(pd.R * 0.2, -pd.th), new THREE.Vector2(0, -pd.th + 0.004)];
        mesh.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 56), mat));
      } else {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(pd.R, pd.R * 1.02, pd.th, 48), mat); b.position.y = -pd.th / 2; mesh.add(b);
        if (pd.kind === 'gong') { const boss = new THREE.Mesh(new THREE.SphereGeometry(pd.R * 0.28, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat); boss.scale.y = 0.25; mesh.add(boss); }
      }
      mesh.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const basis = new THREE.Matrix4().makeBasis(V(pd.long), V(pd.n), V(pd.across));
      g.quaternion.setFromRotationMatrix(basis); g.position.copy(V(pd.center));
      scene.add(g);
      const under = new THREE.Vector3().copy(V(pd.center)).addScaledVector(V(pd.n), -pd.th);
      addPole(under.x, under.z, under.y);
      return { g, mesh, mat, pd, glow };
    });
    // droppers: a post, an arm, a ring round the waiting ball and a trap door under it that swings open at release
    const dMat = new THREE.MeshStandardMaterial({ color: '#c9ccd2', roughness: 0.3, metalness: 0.9 });
    const R = m.ballR;
    this.flaps = []; this.traps = [];
    m.droppers.forEach((d) => {
      if (d.kind === 'catapult') { // a mousetrap catapult on the floor: base board, spring arm with a spoon, trigger plate
        const dirH = new THREE.Vector3(d.launch.x, 0, d.launch.z).normalize(), yaw = -Math.atan2(dirH.z, dirH.x);
        const hingeP = V(d.p).addScaledVector(dirH, -0.1); hingeP.y = 0.035;
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.014, 0.075), new THREE.MeshStandardMaterial({ color: '#7a5636', roughness: 0.7 }));
        base.position.copy(hingeP).addScaledVector(dirH, -0.02); base.position.y = 0.007; base.rotation.y = yaw; base.castShadow = base.receiveShadow = true; scene.add(base);
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.008, 0.07), dMat); plate.position.copy(V(d.p)).addScaledVector(dirH, -0.31); plate.position.y = 0.004; plate.rotation.y = yaw; scene.add(plate);
        const link = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.006), dMat); link.position.copy(V(d.p)).addScaledVector(dirH, -0.24); link.position.y = 0.01; link.rotation.y = yaw; scene.add(link); // the trigger's link to the latch
        const arm = new THREE.Group(); arm.position.copy(hingeP); arm.rotation.order = 'YZX'; arm.rotation.y = yaw; scene.add(arm);
        const la = Math.hypot(0.1, d.p.y - 0.035 - R - 0.004);
        const rod = new THREE.Mesh(new THREE.BoxGeometry(la, 0.007, 0.012), dMat); rod.position.x = la / 2; arm.add(rod);
        const spoon = new THREE.Mesh(new THREE.SphereGeometry(R + 0.006, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), dMat); spoon.material = dMat.clone(); spoon.material.side = THREE.DoubleSide; spoon.position.set(la, R * 0.6, 0); arm.add(spoon);
        [rod, spoon].forEach((o) => (o.castShadow = true));
        this.traps.push({ arm, t: d.t, phi0: Math.atan2(d.p.y - 0.035 - R - 0.004, 0.1) });
        return;
      }
      const post = new THREE.Vector3(d.p.x + d.side.x * d.off, 0, d.p.z + d.side.z * d.off);
      addPole(post.x, post.z, d.p.y + 0.06, 0.006);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(d.off, 0.006, 0.01), dMat);
      arm.position.set((post.x + d.p.x) / 2, d.p.y + 0.055, (post.z + d.p.z) / 2); arm.rotation.y = -Math.atan2(d.side.z, d.side.x); scene.add(arm);
      const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.05), dMat); hang.position.set(d.p.x, d.p.y + 0.03, d.p.z); scene.add(hang);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.004, 0.0025, 8, 32), dMat); ring.rotation.x = Math.PI / 2; ring.position.set(d.p.x, d.p.y + 0.004, d.p.z); scene.add(ring);
      const hinge = new THREE.Group(); hinge.position.set(d.p.x + d.side.x * (R + 0.004), d.p.y - R - 0.002, d.p.z + d.side.z * (R + 0.004));
      hinge.rotation.y = -Math.atan2(d.side.z, d.side.x) + Math.PI;
      const flap = new THREE.Mesh(new THREE.BoxGeometry(2 * R + 0.012, 0.003, 2 * R + 0.006), dMat); flap.position.x = R + 0.006; hinge.add(flap);
      [arm, ring, flap, hang].forEach((o) => (o.castShadow = true)); scene.add(hinge);
      this.flaps.push({ hinge, t: d.t });
    });
    // cups
    const cupMat = new THREE.MeshStandardMaterial({ color: '#9fa4ab', roughness: 0.35, metalness: 0.9, side: THREE.DoubleSide });
    const mech = m.mech || { lines: [], helices: [], rods: [], levers: [], causes: [] };
    this.tippers = [];
    for (const cp of m.cups) {
      const pts = [new THREE.Vector2(0, -cp.depth), new THREE.Vector2(cp.r * 0.8, -cp.depth), new THREE.Vector2(cp.r, -cp.depth * 0.6), new THREE.Vector2(cp.r + 0.002, 0), new THREE.Vector2(cp.r + 0.006, 0.002)];
      const cup = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), cupMat); cup.castShadow = true; cup.receiveShadow = true;
      const hx = mech.helices.find((h) => h.cup === cp.id);
      if (hx) { // a tipping cup on a hinge, turned towards its helix
        const g = new THREE.Group(); g.position.set(cp.rim.x, cp.rim.y - cp.depth, cp.rim.z); cup.position.y = cp.depth; g.add(cup);
        const to = new THREE.Vector3(hx.pole.x - cp.rim.x, 0, hx.pole.z - cp.rim.z).normalize(); g.rotation.order = 'YZX'; g.rotation.y = -Math.atan2(to.z, to.x);
        scene.add(g); this.tippers.push({ g, t: cp.t });
      } else { cup.position.copy(V(cp.rim)); scene.add(cup); }
      addPole(cp.rim.x, cp.rim.z, cp.rim.y - cp.depth);
    }
    this.buildMechanisms(mech, addPole, dMat);
    // instanced poles + feet
    const pg = new THREE.CylinderGeometry(1, 1, 1, 8), pi = new THREE.InstancedMesh(pg, poleMat, poles.length);
    const fg = new THREE.CylinderGeometry(0.02, 0.024, 0.006, 20), fi = new THREE.InstancedMesh(fg, footMat, feet.length);
    const M = new THREE.Matrix4();
    poles.forEach(([x, z, y1, rad], i) => { M.compose(new THREE.Vector3(x, y1 / 2, z), new THREE.Quaternion(), new THREE.Vector3(rad, y1, rad)); pi.setMatrixAt(i, M); });
    feet.forEach(([x, z], i) => { M.makeTranslation(x, 0.003, z); fi.setMatrixAt(i, M); });
    pi.castShadow = true; fi.receiveShadow = true; scene.add(pi, fi);
    // balls
    const sg = new THREE.SphereGeometry(R, 28, 18);
    this.ballMeshes = m.balls.map((b) => {
      const col = new THREE.Color(this.laneById[b.lane].color || '#d23a3a');
      const s = new THREE.Mesh(sg, new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 }));
      s.castShadow = true; scene.add(s); return s;
    });
    // post: render → depth of field → bloom → output
    const comp = (this.composer = new EffectComposer(r)); comp.setSize(W, H);
    comp.addPass(new RenderPass(scene, cam));
    this.bokeh = new BokehPass(scene, cam, { focus: 2, aperture: L.dof.aperture, maxblur: L.dof.maxblur }); comp.addPass(this.bokeh);
    comp.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), L.bloom.strength, L.bloom.radius, L.bloom.threshold));
    comp.addPass(new OutputPass());
    this.W = W; this.H = H;
  }

  // ---- rails, helices, domino lines, push rods, levers and strings, the starter
  buildMechanisms(mech, addPole, dMat) {
    const scene = this.scene, m = this.m, R = m.ballR, railMat = new THREE.MeshStandardMaterial({ color: '#c3c7ce', roughness: 0.28, metalness: 0.95 });
    const tube = (pts, r, mat) => { const c = new THREE.CatmullRomCurve3(pts.map((p) => V(p))); const me = new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(8, pts.length * 3), r, 6, false), mat); me.castShadow = true; scene.add(me); return me; };
    const seg = (a, b, r, mat) => { const A_ = V(a), B_ = V(b), d = B_.clone().sub(A_), me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), mat); me.position.copy(A_).add(B_).multiplyScalar(0.5); me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); me.castShadow = true; scene.add(me); return me; };
    // rails inside phrases: a funnel, two rods the ball rolls on, posts
    for (const rl of m.rails || []) {
      const side = new THREE.Vector3(-rl.u.z, 0, rl.u.x).normalize().multiplyScalar(0.009), below = new THREE.Vector3(0, -R * 0.75, 0);
      for (const sg of [1, -1]) seg(V(rl.top).add(below).addScaledVector(side, sg), V(rl.end).add(below).addScaledVector(side, sg), 0.0028, railMat);
      const fpts = [new THREE.Vector2(0.008, -0.07), new THREE.Vector2(0.01, -0.04), new THREE.Vector2(0.036, 0), new THREE.Vector2(0.039, 0.003)];
      const fun = new THREE.Mesh(new THREE.LatheGeometry(fpts, 32), new THREE.MeshStandardMaterial({ color: '#b98a4a', roughness: 0.3, metalness: 0.9, side: THREE.DoubleSide }));
      fun.position.copy(V(rl.q)); fun.castShadow = true; scene.add(fun);
      addPole(rl.q.x, rl.q.z, rl.q.y - 0.07, 0.005);
      const e2 = V(rl.end).addScaledVector(V(rl.u), -0.04); addPole(e2.x, e2.z, e2.y - R - 0.004, 0.005);
    }
    // helix towers: a pole and a spiral rail from the tipping cup down to the floor
    for (const hx of mech.helices) {
      const cup = m.cups[hx.cup], yTop = cup.rim.y - 0.075, pts = [], N = Math.ceil(hx.turns * 24) + 2;
      for (let i = 0; i <= N; i++) { const u = i / N, a = hx.a0 + hx.sgn * 2 * Math.PI * hx.turns * u; pts.push({ x: hx.pole.x + Math.cos(a) * hx.rh, y: yTop - hx.H * u - 0.004, z: hx.pole.z + Math.sin(a) * hx.rh }); }
      tube(pts, 0.0035, railMat);
      tube(pts.map((p) => ({ x: hx.pole.x + (p.x - hx.pole.x) * 1.42, y: p.y + 0.012, z: hx.pole.z + (p.z - hx.pole.z) * 1.42 })), 0.0025, railMat); // the outer guard rail
      addPole(hx.pole.x, hx.pole.z, yTop + 0.03, 0.007);
    }
    // domino lines: one instanced mesh each, every domino a box that pivots on its front edge
    const palette = this.look.dominoes || ['#e8463c', '#f2a03a', '#f5d33f', '#5cc46a', '#3aa6e0', '#6b6fe0', '#c95ad8', '#f2f0ea'];
    this.lines = mech.lines.map((L, li) => {
      const geo = new THREE.BoxGeometry(L.h * 0.16, L.h, L.h * 0.5); geo.translate(-L.h * 0.08, L.h / 2, 0); // origin on the front-bottom edge
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 }), L.n);
      const col = new THREE.Color();
      L.pts.forEach((p, k) => { col.set(palette[(li * 3 + k) % palette.length]); mesh.setColorAt(k, col); });
      mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
      return { L, mesh, base: L.pts.map((p) => ({ pos: new THREE.Vector3(p.x + p.hx * L.h * 0.08, 0, p.z + p.hz * L.h * 0.08), yaw: -Math.atan2(p.hz, p.hx) })), last: -1 };
    });
    // push rods hang from the struck pad's end (they rock with it); levers flip and pull a string up the dropper's post
    for (const rd of mech.rods) {
      const pm = this.padMeshes[rd.pad], pd = pm.pd, ext = (pd.shape === 'bar' ? pd.L / 2 : pd.R) + 0.006, len = Math.max(0.05, pd.center.y - pd.th - 0.012);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, len, 6), railMat); rod.position.set(ext, -pd.th - len / 2, 0); rod.castShadow = true; pm.mesh.add(rod);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), railMat); knob.position.set(ext, -pd.th - len, 0); pm.mesh.add(knob);
    }
    const strMat = new THREE.MeshStandardMaterial({ color: '#e9e4d8', roughness: 0.8 });
    this.levers = mech.levers.map((lv) => {
      const aim = lv.post || lv.cord;
      const g = new THREE.Group(); g.position.set(lv.x, 0.012, lv.z); const to = new THREE.Vector3(aim.x - lv.x, 0, aim.z - lv.z).normalize(); g.rotation.order = 'YZX'; g.rotation.y = -Math.atan2(to.z, to.x);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.006, 0.02), dMat); bar.position.x = 0.02; g.add(bar); scene.add(g);
      if (lv.cord) seg({ x: lv.x, y: 0.004, z: lv.z }, { x: lv.cord.x, y: 0.006, z: lv.cord.z }, 0.0015, strMat); // a cord along the floor to the catapult's latch
      else if (lv.strung) { // up to a pulley, across to the post, down to the trap door
        const a = { x: lv.x, y: 0.02, z: lv.z }, b = { x: lv.x, y: lv.yTop, z: lv.z }, c = { x: lv.post.x, y: lv.yTop, z: lv.post.z }, d = { x: lv.post.x, y: lv.top.y + 0.05, z: lv.post.z };
        seg(a, b, 0.0012, strMat); seg(b, c, 0.0012, strMat); seg(c, d, 0.0012, strMat);
        for (const q of [b, c]) { const pul = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.004, 8, 20), dMat); pul.position.set(q.x, q.y + 0.01, q.z); scene.add(pul); }
        addPole(lv.x + 0.02, lv.z, lv.yTop + 0.02, 0.004); // the pulley's stand
      } else seg({ x: lv.x + to.x * 0.045, y: 0.02, z: lv.z + to.z * 0.045 }, { x: lv.post.x, y: lv.top.y + 0.05, z: lv.post.z }, 0.0012, strMat);
      return { g, t: lv.t };
    });
    // the starter: a gantry, a pendulum held at 50° by a pin, a plate it swings into
    const st = mech.starter; this.starter = null;
    if (st) {
      const c = new THREE.Vector3(st.at.x, 0, st.at.z), top = st.l + 0.06;
      for (const sg of [-1, 1]) seg({ x: c.x + 0.07 * sg, y: 0, z: c.z - 0.06 }, { x: c.x + 0.07 * sg, y: top, z: c.z - 0.06 }, 0.005, dMat);
      seg({ x: c.x - 0.075, y: top, z: c.z - 0.06 }, { x: c.x + 0.075, y: top, z: c.z - 0.06 }, 0.005, dMat);
      const piv = new THREE.Group(); piv.position.set(c.x, top, c.z - 0.06); piv.rotation.order = 'YXZ'; scene.add(piv);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, st.l), railMat); rod.position.y = -st.l / 2; piv.add(rod);
      const bob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 28, 18), new THREE.MeshPhysicalMaterial({ color: '#b8862e', metalness: 1, roughness: 0.25, clearcoat: 0.5 })); bob.position.y = -st.l; bob.castShadow = true; piv.add(bob);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.03, 32), new THREE.MeshStandardMaterial({ color: '#7a5636', roughness: 0.7 })); plate.position.set(c.x, 0.015, c.z); plate.castShadow = true; scene.add(plate);
      this.starter = { piv, st };
    }
  }

  // ---- the active ball of a lane at t (in flight, else the next one waiting, else the last one caught)
  activeBall(lane, t) {
    const bs = this.m.balls.filter((b) => b.lane === lane); if (!bs.length) return null;
    const now = bs.filter((b) => t >= b.release && t <= b.last); if (now.length) return now[now.length - 1]; // the newest one in flight: it plays next
    const prev = [...bs].reverse().find((b) => b.last < t), next = bs.find((b) => b.release > t);
    if (prev && next) return t - prev.last < next.release - t ? prev : next; // the nearer one in time
    return prev || next;
  }
  ballPos(b, t) { return V(ballAt(b, t, this.m.cups).p); }
  // a Gaussian-weighted average of fn(t + τ) over ±3σ (σ in seconds), skipping moments where fn has nothing to say:
  // the camera's subject is smoothed this way, so bounces, ball hand-overs and wave steps never shake the frame
  // The samples sit on a fixed time grid (not around t) and only their weights move with t, so the result is smooth in t
  // even where fn jumps (a ball hand-over); values are cached per key.
  smooth(key, fn, t, sigma) {
    const h = Math.max(1 / 120, sigma / 6), k0 = Math.floor((t - 3 * sigma) / h), k1 = Math.ceil((t + 3 * sigma) / h);
    this._sc ??= new Map(); let c = this._sc.get(key); if (!c) this._sc.set(key, (c = new Map()));
    const out = new THREE.Vector3(); let w = 0;
    for (let k = k0; k <= k1; k++) {
      let p = c.get(k); if (p === undefined) { p = fn(k * h) || null; c.set(k, p); }
      if (p) { const u = (t - k * h) / sigma, g = Math.exp(-0.5 * u * u); out.addScaledVector(p, g); w += g; }
    }
    return w ? out.multiplyScalar(1 / w) : null;
  }
  ballsAt(lanes, t) { // the newest ball in flight of each lane, else the one nearest in time (in its cup, or waiting) —
    // always defined, so the smoothing window never renormalises onto a far ball and jumps
    const out = new THREE.Vector3(); let n = 0;
    for (const l of lanes) { const b = this.activeBall(l, t); if (b) { out.add(this.ballPos(b, t)); n++; } }
    return n ? out.multiplyScalar(1 / n) : null;
  }
  laneFocus(lanes, t, lag = 0.45) {
    return this.smooth(`lanes:${lanes.join(',')}:${lag}`, (tt) => this.ballsAt(lanes, tt), t, lag) || (() => { const b = this.activeBall(lanes[0], t); return b ? this.ballPos(b, t) : this.center.clone(); })();
  }

  // ---- what a cause chain is doing at t: the domino wave's front, or the relay ball on its helix
  // the one chain a shot rides: the chain of `sel` (a lane, or 'starter') busiest during the shot
  chainFor(s, sel) {
    s._chain ??= new Map(); if (s._chain.has(sel)) return s._chain.get(sel);
    const mech = this.m.mech, i = this.shots.indexOf(s), end = i + 1 < this.shots.length ? this.shots[i + 1].at : this.duration;
    let best = null, bestO = -1;
    for (const c of mech ? mech.causes.filter((c) => (sel === 'starter' ? c.kind === 'starter' : c.lane === sel)) : []) {
      const L = mech.lines[c.line], hx = mech.helices.find((h) => h.line === c.line), t0 = hx ? hx.tTop - 0.2 : L.t0, o = Math.min(end, L.tEnd) - Math.max(s.at, t0);
      if (o > bestO) { bestO = o; best = c; }
    }
    s._chain.set(sel, best); return best;
  }
  // where that chain's action is at t: the relay ball's height on its helix's axis, then the domino wave's front (held at
  // its ends before and after, so the subject never jumps)
  chainAt(c, t) {
    const mech = this.m.mech, L = mech.lines[c.line], hx = mech.helices.find((h) => h.line === c.line);
    const wave = (tt) => { const k = Math.max(0, Math.min(L.n - 1, (tt - L.t0) / L.tau)), i = Math.floor(k), q = L.pts[i], r = L.pts[Math.min(L.n - 1, i + 1)], f = k - i; return new THREE.Vector3(q.x + (r.x - q.x) * f, L.h * 0.6, q.z + (r.z - q.z) * f); };
    if (hx && t < L.t0) { const b = this.m.balls[hx.ball], y = this.ballPos(b, Math.max(hx.tTop - 0.2, t)).y; return new THREE.Vector3(hx.pole.x, y, hx.pole.z); }
    return wave(t);
  }
  causeAt(sel, t, s) { // is the chain doing something at t? (for checks)
    const c = s ? this.chainFor(s, sel) : null; if (!c) return null;
    const mech = this.m.mech, L = mech.lines[c.line], hx = mech.helices.find((h) => h.line === c.line);
    return t >= (hx ? hx.tTop - 0.2 : L.t0 - 0.15) && t <= L.tEnd + 0.15 ? this.chainAt(c, t) : null;
  }

  // ---- the camera: a shot is a function of t → { pos, target, fov, focus }
  shotAt(s, t) {
    const c = s.center ? A(s.center) : this.center, u = (t - s.at);
    const sph = (tg, dist, azDeg, elDeg) => { const az = (azDeg * Math.PI) / 180, el = (elDeg * Math.PI) / 180; return tg.clone().add(new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).multiplyScalar(dist)); };
    let pos, target, fov = s.fov ?? 32, focus = null;
    if (s.kind === 'orbit') { target = c.clone(); if (s.lift) target.y += s.lift * u; pos = sph(target, s.dist ?? this.span * 1.6, (s.angle ?? 35) + (s.speed ?? 4) * u, s.elev ?? 24); }
    else if (s.kind === 'follow' && s.cause) { // the chain of causes that will set off this lane's next ball (or the starter's)
      const c = this.chainFor(s, s.cause);
      target = c ? this.smooth(`chain:${c.line}:${s.lag ?? 0.4}`, (tt) => this.chainAt(c, tt), t, s.lag ?? 0.4) : this.laneFocus([this.o.lanes[0].id], t);
      pos = sph(target, s.dist ?? 0.6, (s.angle ?? 30) + (s.speed ?? 3) * u, s.elev ?? 22);
      focus = c ? this.smooth(`chain:${c.line}:f`, (tt) => this.chainAt(c, tt), t, 0.15) : target;
    } else if (s.kind === 'follow') {
      const lanes = s.lanes || [s.lane]; target = this.laneFocus(lanes, t, s.lag ?? 0.45);
      if (s.offset) target.add(A(s.offset));
      pos = sph(target, s.dist ?? 0.9, (s.angle ?? 30) + (s.speed ?? 3) * u, s.elev ?? 14);
      focus = this.smooth(`lanes:${lanes.join(',')}:f`, (tt) => this.ballsAt(lanes, tt), t, 0.12) || target;
    } else if (s.kind === 'fixed') { pos = A(s.pos); target = A(s.target); }
    else if (s.kind === 'move') { const k = ease(u / (s.dur ?? 6)); pos = A(s.from.pos).lerp(A(s.to.pos), k); target = A(s.from.target).lerp(A(s.to.target), k); fov = lerp(s.from.fov ?? fov, s.to.fov ?? fov, k); }
    else throw new Error(`unknown shot kind "${s.kind}" (orbit, follow, fixed, move)`);
    if (pos.y < 0.03) pos.y = 0.03;
    return { pos, target, fov, focus: focus || (s.focusOn ? A(s.focusOn) : target) };
  }
  cameraAt(t) {
    const S = this.shots; let i = 0; while (i + 1 < S.length && S[i + 1].at <= t) i++;
    const cur = this.shotAt(S[i], t);
    if (i > 0 && t < S[i].at + S[i].blend) {
      const prev = this.shotAt(S[i - 1], t), k = ease((t - S[i].at) / S[i].blend);
      // a glide between far-apart subjects would sweep over empty floor: cut instead (blend only between neighbours).
      // Decided once, at the shot's start, so it can't flicker between gliding and cutting frame by frame
      // (also cut when the camera would rush in or out by metres in one blend — a swoop that fast reads as a lurch)
      if (S[i]._cut === undefined) { const a0 = this.shotAt(S[i - 1], S[i].at), b0 = this.shotAt(S[i], S[i].at); S[i]._cut = a0.target.distanceTo(b0.target) > (S[i].maxGlide ?? 1.4) || Math.abs(a0.pos.distanceTo(a0.target) - b0.pos.distanceTo(b0.target)) / S[i].blend > 1.6; }
      if (S[i]._cut) return cur;
      // glide: the subject moves in a line, the camera swings round it (its offset turns and stretches), never through it
      const a = prev.pos.clone().sub(prev.target), b = cur.pos.clone().sub(cur.target), la = a.length(), lb = b.length();
      const q = new THREE.Quaternion().setFromUnitVectors(a.normalize(), b.normalize()), qk = new THREE.Quaternion().slerp(q, k);
      const target = prev.target.clone().lerp(cur.target, k);
      return { pos: target.clone().add(a.applyQuaternion(qk).multiplyScalar(lerp(la, lb, k))), target, fov: lerp(prev.fov, cur.fov, k), focus: prev.focus.lerp(cur.focus, k) };
    }
    return cur;
  }

  // ---- everything at time t
  seek(t) {
    const L = this.look, m = this.m;
    for (const pm of this.padMeshes) {
      const pd = pm.pd, dt = t - pd.t, K = KINDS[pd.kind];
      if (dt < 0) { pm.mat.emissiveIntensity = 0; pm.mesh.rotation.set(0, 0, 0); pm.mesh.position.set(0, 0, 0); continue; }
      const hit = Math.min(1.6, pd.vn / 2.2);
      pm.mat.emissiveIntensity = L.glowPeak * hit * Math.min(1, dt / 0.012) * Math.exp(-dt / L.glowDecay);
      const rock = (K.wobble ?? 0.04) * hit * Math.exp(-dt / 0.35) * Math.sin(2 * Math.PI * 4.2 * dt);
      pm.mesh.rotation.set(rock, 0, 0); // about the pad's long axis: rocks along the ball's line of travel
      pm.mesh.position.y = -0.005 * hit * Math.exp(-dt / 0.06) * Math.sin(Math.PI * Math.min(1, dt / 0.06));
    }
    for (const f of this.flaps) { const u = (t - f.t) / 0.14; f.hinge.rotation.z = u <= 0 ? 0 : -1.75 * (u >= 1 ? 1 - 0.08 * Math.exp(-(t - f.t - 0.14) / 0.1) * Math.cos(30 * (t - f.t - 0.14)) : Math.sin((u * Math.PI) / 2)); }
    for (const tr of this.traps) { const u = (t - tr.t) / 0.05; tr.arm.rotation.z = tr.phi0 + (u <= 0 ? 0 : u >= 1 ? 1.9 - 0.12 * Math.exp(-(t - tr.t - 0.05) / 0.15) * Math.cos(25 * (t - tr.t - 0.05)) : 1.9 * Math.sin((u * Math.PI) / 2)); }
    for (const tp of this.tippers) { const u = (t - tp.t - 0.06) / 0.12; tp.g.rotation.z = -1.0 * (u <= 0 ? 0 : u >= 1 ? 1 : Math.sin((u * Math.PI) / 2)); }
    for (const lv of this.levers) { const u = (t - lv.t) / 0.05; lv.g.rotation.z = u <= 0 ? 0 : 0.5 * Math.min(1, u); }
    const Mx = new THREE.Matrix4(), Q = new THREE.Quaternion(), Qy = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), S1 = new THREE.Vector3(1, 1, 1), ax = new THREE.Vector3(0, 0, 1);
    for (const ln of this.lines) {
      const L = ln.L, kNow = Math.floor((t - L.t0) / L.tau);
      if (kNow === ln.last && kNow > L.n + 3) continue;
      for (let k = 0; k < L.n; k++) {
        const th = dominoAngle(L, k, t), b = ln.base[k];
        Qy.setFromAxisAngle(up, b.yaw); Q.setFromAxisAngle(ax, -th); Qy.multiply(Q); // tip forward about the front edge
        Mx.compose(b.pos, Qy, S1); ln.mesh.setMatrixAt(k, Mx);
      }
      ln.mesh.instanceMatrix.needsUpdate = true; ln.last = kNow;
    }
    if (this.starter) { const { piv, st } = this.starter, th0 = (st.theta0 * Math.PI) / 180, u = (t - st.tRelease) / st.quarter; piv.rotation.x = u <= 0 ? -th0 : u < 1 ? -th0 * Math.cos((u * Math.PI) / 2) : 0.05 * Math.exp(-(t - st.tPlate) / 0.2) * Math.sin(18 * (t - st.tPlate)); }
    m.balls.forEach((b, i) => this.ballMeshes[i].position.copy(this.ballPos(b, t)));
    const c = this.cameraAt(t), cam = this.camera;
    cam.position.copy(c.pos); cam.lookAt(c.target); cam.fov = c.fov; cam.updateProjectionMatrix();
    // depth of field: focus on what the shot is about
    const fd = c.pos.distanceTo(c.focus), u = this.bokeh.uniforms;
    u.focus.value = fd; u.aperture.value = L.dof.aperture / Math.max(0.6, fd); u.maxblur.value = L.dof.maxblur;
    this.composer.render();
    this.t = t;
  }

  // ---- sound
  audioSpec() {
    const m = this.m, halfW = Math.max(0.5, (this.bb.x1 - this.bb.x0) / 2), mix = this.o.mix || {};
    const hits = m.hits.map((h) => ({ t: h.t, kind: h.kind, midi: h.midi, vel: Math.min(1, 0.35 + h.vn / 4), pan: Math.max(-0.8, Math.min(0.8, ((h.x - this.center.x) / halfW) * 0.7)), gain: mix.lanes?.[h.lane] ?? 1 }));
    if (mix.sfx !== false && m.mech) for (const sd of m.mech.sounds) hits.push({ t: sd.t, kind: sd.kind, midi: 84, vel: sd.vel, pan: 0, gain: mix.mechanism ?? 1 });
    if (mix.sfx !== false) {
      for (const d of m.droppers) hits.push({ t: d.t, kind: 'latch', midi: 60, vel: 0.6, pan: 0 });
      for (const cp of m.cups) hits.push({ t: cp.t + 0.03, kind: 'catch', midi: 60, vel: 0.6, pan: 0 });
    }
    return { duration: this.duration, hits, gains: mix.gains || {}, reverb: mix.reverb || { mix: 0.22, size: 0.84, damp: 0.4 }, peak: 0.85 };
  }

  // ---- the proof (check.mjs calls this)
  runChecks() {
    const m = this.m, errors = [...m.errors], warnings = [...m.warnings];
    const sim = simulate(m); errors.push(...sim.errors);
    const build = clearance(m); errors.push(...build.errors);
    const mech = m.mech;
    if (mech) { // every start has a cause that arrives on time
      for (const d of m.droppers) { const c = mech.causes.find((x) => x.start === d.id); if (!c) errors.push(`the ${d.kind === 'catapult' ? 'catapult' : 'dropper'} of ball ${d.ball} (${d.lane}) has no cause`); else if (Math.abs(c.arrives - c.t) > 0.002) errors.push(`the cause of ball ${d.ball} arrives at ${c.arrives.toFixed(3)} s, the ball leaves at ${c.t.toFixed(3)} s`); }
      for (const L of mech.lines) if (L.r < 0.25 || L.r > 0.85) errors.push(`domino line ${L.id}: spacing ${L.r.toFixed(2)} h is outside 0.25–0.85 h`);
    }
    for (const pd of m.pads) { const [lo, hi] = RANGES[pd.kind] || [0, 127]; if (pd.midi < lo || pd.midi > hi) { warnings.push(`${pd.lane}: ${midiName(pd.midi)} is outside the usual ${pd.kind} range ${midiName(lo)}–${midiName(hi)}`); break; } }
    for (const l of this.o.lanes) { // every written note is played by some ball
      const want = (m.notesPerLane[l.id] ?? 0), got = m.pads.filter((p) => p.lane === l.id).length;
      if (got < want) errors.push(`lane ${l.id}: ${want - got} of its ${want} notes have no pad (see the solver errors above)`);
      if (!want) errors.push(`lane ${l.id} has no notes`);
    }
    this.shots.forEach((s, i) => { if (i && s.at <= this.shots[i - 1].at) errors.push(`shot ${i} at ${s.at} s is not after shot ${i - 1}`); if (s.lane && !this.laneById[s.lane]) errors.push(`shot ${i} follows unknown lane ${s.lane}`); });
    // the camera sees what plays: every struck pad in the next 0.15 s, in follow shots the followed lane's balls
    const cam = this.camera, shotInfo = [], clip = new Set();
    this.shots.forEach((s, i) => {
      const end = i + 1 < this.shots.length ? this.shots[i + 1].at : this.duration; let seen = 0, n = 0, minPx = Infinity;
      for (let k = 0; k < 20; k++) {
        const t0 = k % 2 ? s.at : s.at + Math.min(s.blend, (end - s.at) * 0.3), t = t0 + (((k >> 1) + 0.5) / 10) * (end - t0); // odd samples include the blend (lens clipping), even ones after it
        const c = this.cameraAt(t); cam.position.copy(c.pos); cam.lookAt(c.target); cam.fov = c.fov; cam.aspect = this.W / this.H; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
        for (const pd of m.pads) { // the lens must not sit inside or brush a pad or its pole
          const rr = pd.shape === 'bar' ? Math.hypot(pd.L, pd.w) / 2 : pd.R, d = c.pos.distanceTo(V(pd.center));
          const hd = Math.hypot(c.pos.x - pd.center.x, c.pos.z - pd.center.z);
          if (d < rr + 0.04 || (hd < 0.03 && c.pos.y < pd.center.y)) { clip.add(`shot ${i} (${s.kind} @ ${s.at} s): the camera passes through pad ${pd.id} or its pole at ${t.toFixed(2)} s — move it`); break; }
        }
        if (k % 2) continue; // during a glide the old subject is still the subject
        if (s.cause) { n++; if (this.causeAt(s.cause, t, s)) seen++; continue; }
        const ballsNow = (s.kind === 'follow' ? (s.lanes || [s.lane]) : this.o.lanes.map((l) => l.id)).map((l) => this.activeBall(l, t)).filter((b) => b && t >= b.release && t <= b.last);
        for (const b of ballsNow) {
          const p = this.ballPos(b, t), q = p.clone().project(cam); n++;
          if (q.z < 1 && Math.abs(q.x) < 0.95 && Math.abs(q.y) < 0.95) seen++;
          const d = p.distanceTo(c.pos), px = (b.r / (d * Math.tan((c.fov * Math.PI) / 360))) * this.H; minPx = Math.min(minPx, px);
        }
      }
      shotInfo.push({ at: s.at, kind: s.kind, seen: n ? seen / n : 1, ballPx: Number.isFinite(minPx) ? +minPx.toFixed(1) : null });
      if (s.cause && n && seen / n < 0.5) errors.push(`shot ${i} (follow the causes of ${s.cause} @ ${s.at} s): nothing in that chain is moving for ${(100 - (seen / n) * 100).toFixed(0)}% of the shot — move or shorten it`);
      else if (!s.cause && n && seen / n < (s.kind === 'follow' ? 0.85 : 0.6)) errors.push(`shot ${i} (${s.kind} @ ${s.at} s): the balls in play are on screen only ${((seen / n) * 100).toFixed(0)}% of the time`);
      if (s.kind === 'follow' && minPx < 1.6) warnings.push(`shot ${i} (follow @ ${s.at} s): the ball is only ${minPx.toFixed(1)} px across at this size — move closer`);
    });
    errors.push(...[...clip].slice(0, 6));
    // a steady camera: the look direction and position must not wobble from frame to frame — measured against a local
    // quadratic fit over ±0.23 s (Savitzky–Golay, so a smooth swoop or an easing glide is not counted), cuts excluded
    const fps = this.fps, N = Math.floor(this.duration * fps), C = [];
    for (let f = 0; f < N; f++) { const c = this.cameraAt(f / fps); C.push({ p: c.pos, d: c.target.clone().sub(c.pos).normalize() }); }
    const W = 7, steady = this.shots.map(() => ({ ang: 0, mm: 0 }));
    for (let f = W; f < N - W; f++) {
      const t = f / fps; let si = 0; while (si + 1 < this.shots.length && this.shots[si + 1].at <= t) si++;
      const near = (x) => Math.abs(t - x) < 0.3; if (near(this.shots[si].at) || (this.shots[si + 1] && near(this.shots[si + 1].at))) continue;
      const pa = new THREE.Vector3(), da = new THREE.Vector3(); for (let j = -W; j <= W; j++) { const c = (501 - 15 * j * j) / 3315; pa.addScaledVector(C[f + j].p, c); da.addScaledVector(C[f + j].d, c); }
      da.normalize();
      steady[si].ang = Math.max(steady[si].ang, (C[f].d.angleTo(da) * 180) / Math.PI); steady[si].mm = Math.max(steady[si].mm, C[f].p.distanceTo(pa) * 1000);
    }
    steady.forEach((st, i) => { shotInfo[i].wobble = +st.ang.toFixed(2); shotInfo[i].jitterMm = Math.round(st.mm); if (st.ang > 0.35 || st.mm > 20) errors.push(`shot ${i} (${this.shots[i].kind} @ ${this.shots[i].at} s): the camera shakes (${st.ang.toFixed(2)}° / ${st.mm.toFixed(0)} mm off its own smooth path) — raise lag, or follow something steadier`); });
    const hitsPerLane = Object.fromEntries(this.o.lanes.map((l) => [l.id, m.pads.filter((p) => p.lane === l.id).length])), ballsPerLane = Object.fromEntries(this.o.lanes.map((l) => [l.id, m.balls.filter((b) => b.lane === l.id).length]));
    return { errors, warnings, info: { duration: this.duration, music: +(m.end - m.intro).toFixed(2), pads: m.pads.length, balls: m.balls.length, lanes: this.o.lanes.length, hitsPerLane, ballsPerLane, sim: sim.report, maxTilt: Math.max(...m.pads.map((p) => p.tilt)).toFixed(1), height: this.bb.y1.toFixed(2), footprint: [(this.bb.x1 - this.bb.x0).toFixed(2), (this.bb.z1 - this.bb.z0).toFixed(2)], shots: shotInfo, mech: mech ? { lines: mech.lines.length, dominoes: mech.lines.reduce((a, L) => a + L.n, 0), helices: mech.helices.length, rods: mech.rods.length, catapults: m.droppers.filter((d) => d.kind === 'catapult').length, droppers: m.droppers.filter((d) => d.kind !== 'catapult').length, rails: (m.rails || []).length, starter: !!mech.starter, causes: mech.causes.reduce((o, c) => ((o[c.kind] = (o[c.kind] || 0) + 1), o), {}) } : null } };
  }

  // ---- mount: the contract + the live player
  async mount() {
    const render = qs.has('render'), scale = +(qs.get('scale') || 1);
    const W = render ? Math.round(1920 * scale) : Math.min(1920, Math.round(innerWidth * Math.min(2, devicePixelRatio || 1)));
    const H = render ? Math.round(1080 * scale) : Math.round((W * 9) / 16);
    document.title = document.title || this.title;
    this.build(W, H);
    Object.assign(window, { DURATION: this.duration, FPS: this.fps, piece: this, seek: (t) => this.seek(t), audioSpec: () => this.audioSpec(), runChecks: () => this.runChecks() });
    this.seek(qs.has('t') ? +qs.get('t') : render ? 0 : Math.min(this.duration, (this.m.intro || 0) + 6));
    window.READY = true;
    if (!render) this.player();
  }
  player() {
    const ui = document.createElement('div'); ui.className = 'bs-ui';
    ui.innerHTML = `<button type="button" class="bs-play" aria-label="Play with sound">▶</button><input class="bs-scrub" type="range" min="0" max="${this.duration}" step="0.01" value="${this.t}" aria-label="Time"><span class="bs-time"></span>`;
    document.body.appendChild(ui);
    const btn = ui.querySelector('.bs-play'), scrub = ui.querySelector('.bs-scrub'), time = ui.querySelector('.bs-time');
    const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    const show = (t) => { scrub.value = t; time.textContent = `${fmt(t)} / ${fmt(this.duration)}`; };
    show(this.t);
    let ctx = null, buf = null, src = null, t0 = 0, from = 0, raf = 0;
    const stop = () => { if (src) { src.onended = null; src.stop(); src = null; } cancelAnimationFrame(raf); btn.textContent = '▶'; };
    const tick = () => { const t = from + ctx.currentTime - t0; if (t >= this.duration) { stop(); return; } this.seek(t); show(t); raf = requestAnimationFrame(tick); };
    btn.onclick = async () => {
      if (src) { from = Math.min(this.duration, from + ctx.currentTime - t0); stop(); return; }
      ctx ||= new AudioContext();
      if (!buf) { btn.textContent = '…'; await new Promise((r) => setTimeout(r, 20)); const a = renderAudio(this.audioSpec(), { sampleRate: ctx.sampleRate }); buf = ctx.createBuffer(2, a.L.length, a.sampleRate); buf.copyToChannel(a.L, 0); buf.copyToChannel(a.R, 1); }
      if (from >= this.duration - 0.1) from = 0;
      src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); t0 = ctx.currentTime; src.start(0, from); src.onended = stop;
      btn.textContent = '❚❚'; tick();
    };
    scrub.oninput = () => { const playing = !!src; if (playing) stop(); from = +scrub.value; this.seek(from); show(from); };
  }
}

export const PAGE_CSS = `html,body{margin:0;height:100%;background:#111;overflow:hidden}#frame{display:block;width:100vw;height:56.25vw;max-height:100vh;max-width:177.78vh;margin:auto;position:absolute;inset:0}
.bs-ui{position:fixed;left:12px;right:12px;bottom:10px;display:flex;gap:10px;align-items:center;font:13px/1 system-ui,sans-serif;color:#ddd;opacity:.85}
.bs-play{width:38px;height:38px;border-radius:50%;border:1px solid #666;background:#000a;color:#fff;font-size:15px;cursor:pointer}.bs-scrub{flex:1;accent-color:#e0b25a}.bs-time{min-width:84px;text-align:right;font-variant-numeric:tabular-nums}`;
