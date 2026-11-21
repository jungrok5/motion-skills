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
    this.flaps = m.droppers.map((d) => {
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
      return { hinge, t: d.t };
    });
    // cups
    const cupMat = new THREE.MeshStandardMaterial({ color: '#9fa4ab', roughness: 0.35, metalness: 0.9, side: THREE.DoubleSide });
    for (const cp of m.cups) {
      const pts = [new THREE.Vector2(0, -cp.depth), new THREE.Vector2(cp.r * 0.8, -cp.depth), new THREE.Vector2(cp.r, -cp.depth * 0.6), new THREE.Vector2(cp.r + 0.002, 0), new THREE.Vector2(cp.r + 0.006, 0.002)];
      const cup = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), cupMat); cup.position.copy(V(cp.rim)); cup.castShadow = true; cup.receiveShadow = true; scene.add(cup);
      addPole(cp.rim.x, cp.rim.z, cp.rim.y - cp.depth);
    }
    // instanced poles + feet
    const pg = new THREE.CylinderGeometry(1, 1, 1, 8), pi = new THREE.InstancedMesh(pg, poleMat, poles.length);
    const fg = new THREE.CylinderGeometry(0.028, 0.032, 0.006, 24), fi = new THREE.InstancedMesh(fg, footMat, feet.length);
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

  // ---- the active ball of a lane at t (in flight, else the next one waiting, else the last one caught)
  activeBall(lane, t) {
    const bs = this.m.balls.filter((b) => b.lane === lane); if (!bs.length) return null;
    const now = bs.filter((b) => t >= b.release && t <= b.last); if (now.length) return now[now.length - 1]; // the newest one in flight: it plays next
    const prev = [...bs].reverse().find((b) => b.last < t), next = bs.find((b) => b.release > t);
    if (prev && next) return t - prev.last < next.release - t ? prev : next; // the nearer one in time
    return prev || next;
  }
  ballPos(b, t) { return V(ballAt(b, t, this.m.cups).p); }
  laneFocus(lanes, t, lag = 0.35) { // smoothed centroid of the lanes' active balls around t
    const out = new THREE.Vector3(); let n = 0;
    // only balls in flight count (a ball waiting on a dropper far along the path would drag the frame away)
    for (let k = -4; k <= 4; k++) { const tt = t + (k / 4) * lag, w = 1 - Math.abs(k) / 5; for (const l of lanes) { const b = this.activeBall(l, tt); if (b && tt >= b.release && tt <= b.last + 0.3) { out.addScaledVector(this.ballPos(b, tt), w); n += w; } } }
    if (n) return out.multiplyScalar(1 / n);
    for (const l of lanes) { const b = this.activeBall(l, t); if (b) { out.add(this.ballPos(b, t)); n++; } }
    return n ? out.multiplyScalar(1 / n) : this.center.clone();
  }

  // ---- the camera: a shot is a function of t → { pos, target, fov, focus }
  shotAt(s, t) {
    const c = s.center ? A(s.center) : this.center, u = (t - s.at);
    const sph = (tg, dist, azDeg, elDeg) => { const az = (azDeg * Math.PI) / 180, el = (elDeg * Math.PI) / 180; return tg.clone().add(new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).multiplyScalar(dist)); };
    let pos, target, fov = s.fov ?? 32, focus = null;
    if (s.kind === 'orbit') { target = c.clone(); if (s.lift) target.y += s.lift * u; pos = sph(target, s.dist ?? this.span * 1.6, (s.angle ?? 35) + (s.speed ?? 4) * u, s.elev ?? 24); }
    else if (s.kind === 'follow') {
      const lanes = s.lanes || [s.lane]; target = this.laneFocus(lanes, t, s.lag ?? 0.35);
      if (s.offset) target.add(A(s.offset));
      pos = sph(target, s.dist ?? 0.9, (s.angle ?? 30) + (s.speed ?? 3) * u, s.elev ?? 14);
      focus = this.laneFocus(lanes, t, 0.08);
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
      // a glide between far-apart subjects would sweep over empty floor: cut instead (blend only between neighbours)
      if (prev.target.distanceTo(cur.target) > (S[i].maxGlide ?? 1.4)) return cur;
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
        const ballsNow = (s.kind === 'follow' ? (s.lanes || [s.lane]) : this.o.lanes.map((l) => l.id)).map((l) => this.activeBall(l, t)).filter((b) => b && t >= b.release && t <= b.last);
        for (const b of ballsNow) {
          const p = this.ballPos(b, t), q = p.clone().project(cam); n++;
          if (q.z < 1 && Math.abs(q.x) < 0.95 && Math.abs(q.y) < 0.95) seen++;
          const d = p.distanceTo(c.pos), px = (b.r / (d * Math.tan((c.fov * Math.PI) / 360))) * this.H; minPx = Math.min(minPx, px);
        }
      }
      shotInfo.push({ at: s.at, kind: s.kind, seen: n ? seen / n : 1, ballPx: Number.isFinite(minPx) ? +minPx.toFixed(1) : null });
      if (n && seen / n < (s.kind === 'follow' ? 0.85 : 0.6)) errors.push(`shot ${i} (${s.kind} @ ${s.at} s): the balls in play are on screen only ${((seen / n) * 100).toFixed(0)}% of the time`);
      if (s.kind === 'follow' && minPx < 1.6) warnings.push(`shot ${i} (follow @ ${s.at} s): the ball is only ${minPx.toFixed(1)} px across at this size — move closer`);
    });
    errors.push(...[...clip].slice(0, 6));
    const hitsPerLane = Object.fromEntries(this.o.lanes.map((l) => [l.id, m.pads.filter((p) => p.lane === l.id).length])), ballsPerLane = Object.fromEntries(this.o.lanes.map((l) => [l.id, m.balls.filter((b) => b.lane === l.id).length]));
    return { errors, warnings, info: { duration: this.duration, music: +(m.end - m.intro).toFixed(2), pads: m.pads.length, balls: m.balls.length, lanes: this.o.lanes.length, hitsPerLane, ballsPerLane, sim: sim.report, maxTilt: Math.max(...m.pads.map((p) => p.tilt)).toFixed(1), height: this.bb.y1.toFixed(2), footprint: [(this.bb.x1 - this.bb.x0).toFixed(2), (this.bb.z1 - this.bb.z0).toFixed(2)], shots: shotInfo } };
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
