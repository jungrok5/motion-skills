// street-run-montage · film.js — the montage: one ride in story time, cut into shots that each look at it from a
// different camera, cut on the beat. Builds the scene (sky, light, town, rider, buddy), the camera rigs, the post
// (background motion blur behind a sharp subject, diffusion glow, flare, speed lines, grain), the effects (grind
// sparks, landing dust, falling leaves), the live player with sound, the checks and the render contract.
//
//   const F = new Run({ title, bpm: 120, light: 'afternoon', season: 'autumn' });
//   F.route([{ len: 80 }, { len: 40, turn: -30 }, …]);
//   F.cast(CAST);                                    // { rider: spec, buddy: spec }
//   F.ride({ speed, lane, moves });                  // story time (s); see rider.js
//   F.buddy({ lead, side, y, moves });               // see critter.js
//   F.town(K => { K.zone('lane', 0, 90); … });       // see town.js (K.sAt(tau) places things under an action)
//   F.shots([{ beats: 4, cam: 'low-side', … }, …]);  // film time, cut on the beat; see CAMS below
//   F.score(SCORE); F.start();
import * as THREE from 'three';
import { clamp, lerp, keys, smooth, bump, n1, hash, span, rng, Table, DEG, TAU, canvas, mix } from './core.js';
import { LIGHTS, SEASONS, lights, skyDome, clouds, RES, cel, flat } from './look.js';
import { Route, Town } from './town.js';
import { Rider } from './rider.js';
import { Buddy } from './critter.js';
import { renderScore } from './score.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ───────────── camera rigs: where the camera is and what it looks at, from the subject at story time τ ─────────────
// every rig reads { P (rider hips), B (board), Hd (head), F (travel), Rt (right), U, bP (buddy), G (ground under the rider) }
// and the shot's params (side ±1, d distance, h height, lead along travel, fov, look 'rider'|'buddy'|'board'|'head'|'both').
export const CAMS = {
  side:      { d: 3.4, h: .95, fov: 38, look: 'rider', track: true, blur: 1 },     // alongside, matching speed
  'low-side':{ d: 2.0, h: .16, fov: 64, look: 'rider', track: true, blur: 1.2, ly: .1 },
  front:     { d: 3.6, h: .75, fov: 42, look: 'rider', track: true, blur: .8, ahead: true },   // leading, looking back at them
  'low-front':{ d: 2.3, h: .14, fov: 68, look: 'rider', track: true, blur: 1, ahead: true, ly: .25 },
  rear:      { d: 3.4, h: 1.25, fov: 46, look: 'rider', track: true, blur: .8, behind: true },
  feet:      { d: .95, h: .12, fov: 48, look: 'board', track: true, blur: 1.6, ly: .12 },
  face:      { d: 1.15, h: 1.35, fov: 34, look: 'head', track: true, blur: 1.4, front: true },
  buddy:     { d: 1.25, h: .2, fov: 52, look: 'buddy', track: true, blur: 1.3 },
  worm:      { d: 0, h: .06, fov: 74, look: 'rider', fixed: true, blur: 0 },       // on the ground, looking up as they fly over
  pass:      { d: 3.2, h: .9, fov: 44, look: 'rider', fixed: true, blur: 0 },      // fixed beside the path, panning
  wide:      { d: 1.8, h: 2.2, fov: 22, lead: 20, look: 'rider', fixed: true, blur: 0 },   // down the street, long lens, establishing
  overhead:  { d: 1.2, h: 7.5, fov: 40, look: 'rider', track: true, blur: .5 },
  orbit:     { d: 2.8, h: 1.0, fov: 44, look: 'rider', track: true, blur: .6 },
  hero:      { d: 3.2, h: .55, fov: 34, look: 'rider', fixed: true, blur: 0 },     // the end pose: low, front, still
};

export class Run {
  constructor(o = {}) {
    this.o = o; this.title = o.title || 'run'; this.FPS = o.fps || 30; this.bpm = o.bpm || 120; this.beat = 60 / this.bpm;
    this.L = { ...(LIGHTS[o.light || 'afternoon'] || LIGHTS.afternoon), ...(o.lightOpts || {}) }; this.seasonName = o.season || 'autumn'; this.season = SEASONS[this.seasonName];
    const q = this.q = new URLSearchParams(location.search);
    this.render = q.has('render'); this.scale = +(q.get('scale') || (this.render ? 1 : (o.liveScale || .6))); this.off = new Set((q.get('off') || '').split(',').filter(Boolean));
    this.W = Math.round(1920 * this.scale); this.H = Math.round(1080 * this.scale);
    this.rules = []; this._shots = []; this._town = null; this._ride = null; this._buddy = null; this.scoreSpec = null;
  }
  route(segs, o) { this.routeSegs = segs; this.routeOpts = o; return this; }
  cast(c) { this.castSpec = c; return this; }
  ride(p) { this._ride = p; return this; }
  buddy(p) { this._buddy = p; return this; }
  town(fn) { this._town = fn; return this; }
  shots(list) { this._shots = list; return this; }
  score(s) { this.scoreSpec = s; return this; }
  /** a film rule: fn(t, info) → true when fine */
  check(name, fn) { this.rules.push({ name, fn }); return this; }

  // ───────────── build ─────────────
  _timeline() {
    let t = 0, tau = 0; const out = [];
    for (const [i, s] of this._shots.entries()) {
      const dur = s.dur ?? (s.beats || 4) * this.beat, rate = s.rate ?? 1, tau0 = s.tau ?? Math.max(0, tau - (s.back || 0));
      out.push({ ...CAMS[s.cam || 'side'], ...s, i, t0: t, t1: t + dur, dur, rate, tau0, tau1: tau0 + dur * rate, name: s.name || `${i + 1} ${s.cam || 'side'}` });
      t += dur; tau = tau0 + dur * rate;
    }
    this.dur = t; this.storyDur = Math.max(...out.map(s => s.tau1)); return out;
  }
  build() {
    const W = this.W, H = this.H;
    this.cuts = this._timeline();
    this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H; document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.gl = document.createElement('canvas'); this.gl.width = W; this.gl.height = H;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.gl, antialias: true, preserveDrawingBuffer: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1); this.renderer.setSize(W, H, false); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.NoToneMapping;
    RES.set(W, H);
    this.scene = new THREE.Scene(); this.scene.fog = new THREE.Fog(new THREE.Color(this.L.haze), 60, this.L.hazeFar);
    this.camera = new THREE.PerspectiveCamera(40, W / H, .05, 2000);
    this.sky = skyDome(this.L); this.scene.add(this.sky);
    this.light = lights(this.scene, this.L); this.sky.material.uniforms.uSun.value.copy(this.light.dir);
    // route, cast, plans
    this.R = new Route(this.routeSegs || [{ len: 300 }], this.routeOpts);
    const dur = this.storyDur + 1;
    this.rider = new Rider(this.castSpec?.rider || {}, this.R, { dur }); this.rider.plan(this._ride || {});
    this.scene.add(this.rider.group);
    if (this.castSpec?.buddy) { this.bud = new Buddy(this.castSpec.buddy, this.R, this.rider, { dur }); this.bud.plan(this._buddy || {}); this.scene.add(this.bud.group); }
    // the town, laid out around the action; grinds that asked for a rail / ledge get one
    this.K = new Town(this.scene, this.R, { season: this.seasonName, tauToS: t => this.rider.sAt(t), ...(this.o.town || {}) });
    for (const m of this.rider.moves) if (m.do === 'grind' && m.rail !== false) {
      const spec = { tau: [m.on, m.off], x: m.x ?? 0, h: m.h, name: m.name, color: m.color };
      if (m.rail === 'ledge') this.K.ledge({ ...spec, h: m.h + .02 }); else this.K.rail({ ...spec, h: m.h - .03 });
    }
    if (this._town) this._town(this.K, this);
    this.K.wires(); this.K.build();
    const mid = this.R.at(this.R.len / 2); this.clouds = clouds(this.scene, this.L, mid, 16, this.o.seed || 3);
    // the ground far below everything (verges beyond the sweeps)
    const gnd = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), cel(this.o.ground || mix(this.season.grass, '#9a9488', .5))); gnd.position.set(mid.x, -.05 + Math.min(0, ...this.R.Y), mid.z); gnd.receiveShadow = true; this.scene.add(gnd);
    this._fx();
    // characters on their own layer for the mask pass
    this.rider.group.traverse(o => o.layers.enable(1)); this.bud?.group.traverse(o => o.layers.enable(1));
    this.depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false }); this.white = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mask = canvas(W, H); this.mctx = this.mask.getContext('2d'); this.tmp = canvas(W, H); this.tctx = this.tmp.getContext('2d'); this.small = canvas(W / 4, H / 4); this.sctx = this.small.getContext('2d');
    this.grain = [0, 1, 2, 3].map(i => { const c = canvas(256, 256), g = c.getContext('2d'), d = g.createImageData(256, 256), r = rng(90 + i); for (let k = 0; k < d.data.length; k += 4) { const v = 128 + (r() - .5) * 90; d.data[k] = d.data[k + 1] = d.data[k + 2] = v; d.data[k + 3] = 255; } g.putImageData(d, 0, 0); return c; });
    this.problems = [];
  }
  _fx() {
    // grind sparks: line segments, rebuilt each frame from hashes (pure function of t)
    const N = 90; this.sparkGeo = new THREE.BufferGeometry(); this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    this.sparks = new THREE.LineSegments(this.sparkGeo, new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.sparks.frustumCulled = false; this.scene.add(this.sparks);
    // dust puffs at pushes and landings
    this.dust = []; const dm = new THREE.MeshBasicMaterial({ color: 0xf2efe8, transparent: true, opacity: .6, depthWrite: false });
    for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), dm.clone()); m.visible = false; this.scene.add(m); this.dust.push(m); }
    // falling leaves / petals around the camera
    const fallC = this.season.fall; this.leaves = null;
    if (fallC && !this.off.has('leaves')) {
      const n = 160, g = new THREE.PlaneGeometry(.07, .05), m = new THREE.MeshBasicMaterial({ color: new THREE.Color(fallC), side: THREE.DoubleSide });
      this.leaves = new THREE.InstancedMesh(g, m, n); this.leaves.frustumCulled = false; this.scene.add(this.leaves);
      this.leafSeed = Array.from({ length: n }, (_, i) => [hash(i, 1), hash(i, 2), hash(i, 3), hash(i, 4)]);
    }
  }
  _events() {   // pops, landings, grinds, pushes, calls — in story time
    const E = [], r = this.rider;
    for (const m of r.moves) {
      if (m.air) { E.push({ tau: m.at, type: 'pop' }, { tau: m.land, type: 'land' }); if (['kickflip', 'heelflip', 'shuvit'].includes(m.do)) E.push({ tau: m.at + .1, type: 'flick' }); }
      if (m.do === 'grind') E.push({ tau: m.at, type: 'pop' }, { tau: m.on, type: 'grind', d: m.off - m.on }, { tau: m.off, type: 'pop', v: .7 }, { tau: m.land, type: 'land' });
      if (m.do === 'dismount') E.push({ tau: m.at + .3, type: 'step' }, { tau: m.at + .8, type: 'step' });
      if (m.do === 'cheer') E.push({ tau: m.at + .2, type: 'cheer' });
    }
    for (const p of r.pushes) E.push({ tau: p.plant, type: 'push' });
    for (const m of this.bud?.moves || []) { if (m.do === 'call') E.push({ tau: m.at, type: 'call', kind: this.bud.K.kind || this.castSpec.buddy.kind }); if (m.do === 'leap') E.push({ tau: m.land, type: 'paw' }); }
    return E.sort((a, b) => a.tau - b.tau);
  }
  /** what the score needs: shots, beat grid, events mapped to film time (an event shown twice sounds twice), speed */
  info() {
    const ev = this._events(), events = [];
    for (const c of this.cuts) for (const e of ev) if (e.tau >= c.tau0 && e.tau < c.tau1) events.push({ ...e, t: c.t0 + (e.tau - c.tau0) / c.rate, shot: c.i, slow: c.rate < .9 });
    const speed = []; for (let t = 0; t <= this.dur; t += .1) { const c = this.cutAt(t), tau = c.tau0 + (t - c.t0) * c.rate; speed.push([+t.toFixed(2), this.rider.V.at(tau) * c.rate, this.rider._boardY(tau).contact]); }
    return { dur: this.dur, bpm: this.bpm, beat: this.beat, season: this.seasonName, shots: this.cuts.map(c => ({ t0: c.t0, t1: c.t1, cam: c.cam, name: c.name, rate: c.rate, sfx: c.sfx, music: c.music })), events, speed };
  }
  cutAt(t) { const c = this.cuts; for (let i = c.length - 1; i >= 0; i--) if (t >= c[i].t0 - 1e-9) return c[i]; return c[0]; }

  // ───────────── a frame ─────────────
  frame(t) {
    t = clamp(t, 0, this.dur - 1e-6);
    const c = this.cutAt(t), lt = t - c.t0, tau = c.tau0 + lt * c.rate, k = lt / c.dur;
    const rp = this.rider.pose(tau), bp = this.bud ? this.bud.pose(tau) : null;
    this.last = { t, c, tau, rp, bp };
    const cam = this._camera(c, tau, k, rp, bp);
    // shadows follow what the camera sees
    const tgt = cam.target.clone(), Ls = this.light; const sr = c.shadow || (c.cam === 'wide' ? 60 : 26);
    const sc = Ls.sun.shadow.camera; if (sc.right !== sr) { sc.left = -sr; sc.right = sr; sc.top = sr; sc.bottom = -sr; sc.updateProjectionMatrix(); }
    Ls.sun.target.position.copy(tgt); Ls.sun.position.copy(tgt).addScaledVector(Ls.dir, 120); Ls.sun.target.updateMatrixWorld();
    this._updateFx(t, tau, c, rp);
    // render (and the subject mask when the background streaks)
    const blur = this.off.has('blur') ? 0 : (c.blur ?? 1) * clamp(this.rider.V.at(tau) / 5, 0, 1.4) * c.rate;
    const r = this.renderer, ctx = this.ctx, W = this.W, H = this.H;
    r.setClearColor(0x000000, 1); this.camera.layers.enableAll(); r.render(this.scene, this.camera);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
    if (blur > .05) {
      const vec = this._streak(c, tau, cam, blur);
      this.tctx.globalCompositeOperation = 'copy'; this.tctx.drawImage(this.gl, 0, 0);   // sharp copy
      // motion-blurred background
      const n = 9; ctx.globalCompositeOperation = 'copy'; ctx.drawImage(this.gl, 0, 0); ctx.globalCompositeOperation = 'source-over';
      for (let i = 1; i < n; i++) {
        const q = i / (n - 1) - .5; ctx.globalAlpha = 1 / (i + 1);
        if (vec.zoom) { const s = 1 + q * vec.zoom, cx = vec.cx, cy = vec.cy; ctx.drawImage(this.gl, cx - cx * s, cy - cy * s, W * s, H * s); }
        else ctx.drawImage(this.gl, q * vec.dx, q * vec.dy);
      }
      ctx.globalAlpha = 1;
      // the subject mask: world as depth only, characters white
      const so = this.scene.overrideMaterial, bg = this.scene.background, fog = this.scene.fog; const sky = this.sky.visible, cl = this.clouds.visible, sp = this.sparks.visible, lv = this.leaves?.visible;
      this.sky.visible = false; this.clouds.visible = false; this.sparks.visible = false; if (this.leaves) this.leaves.visible = false; for (const d of this.dust) d.userData.v = d.visible, d.visible = false;
      r.shadowMap.autoUpdate = false; r.setClearColor(0x000000, 0); r.clear();
      this.scene.overrideMaterial = this.depthOnly; this.camera.layers.set(0); r.render(this.scene, this.camera);
      r.autoClear = false; this.scene.overrideMaterial = this.white; this.camera.layers.set(1); r.render(this.scene, this.camera);
      r.autoClear = true; this.scene.overrideMaterial = so; this.camera.layers.enableAll(); r.shadowMap.autoUpdate = true;
      this.sky.visible = sky; this.clouds.visible = cl; this.sparks.visible = sp; if (this.leaves) this.leaves.visible = lv; for (const d of this.dust) d.visible = d.userData.v;
      this.mctx.globalCompositeOperation = 'copy'; this.mctx.filter = `blur(${Math.max(1, W / 960)}px)`; this.mctx.drawImage(this.gl, 0, 0); this.mctx.filter = 'none';
      this.mctx.globalCompositeOperation = 'source-in'; this.mctx.drawImage(this.tmp, 0, 0);
      ctx.drawImage(this.mask, 0, 0);
    } else { ctx.globalCompositeOperation = 'copy'; ctx.drawImage(this.gl, 0, 0); ctx.globalCompositeOperation = 'source-over'; }
    this._post(t, c, k, cam);
    return this.last;
  }
  /** screen-space streak of the background: the motion of a point beside the path between τ and τ − dt */
  _streak(c, tau, cam, blur) {
    const dt = 1 / this.FPS, s = this.rider.sAt(tau), s2 = this.rider.sAt(tau - dt * c.rate * 1.5), W = this.W, H = this.H;
    const P = this.R.at(s + 6, (c.side || 1) * -6, 1.2), proj = v => { const p = v.clone().project(this.camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z]; };
    // the point is fixed in the world; the camera moved: re-project with the previous camera (approx: shift by the subject's travel)
    const d = this.R.at(s).sub(this.R.at(s2)); const a = proj(P), b = proj(P.clone().add(d));
    let dx = (b[0] - a[0]) * 6 * blur, dy = (b[1] - a[1]) * 6 * blur;
    const len = Math.hypot(dx, dy), maxL = W * .06 * blur; if (len > maxL) { dx *= maxL / len; dy *= maxL / len; }
    if (cam.ahead || cam.behind || c.cam === 'rear' || c.cam === 'front' || c.cam === 'low-front') { const vp = this.R.at(s + 40, 0, 1).project(this.camera); return { zoom: .045 * blur, cx: (vp.x + 1) / 2 * W, cy: (1 - vp.y) / 2 * H }; }
    if (!c.track) return { dx: 0, dy: 0 };
    return { dx, dy };
  }
  _camera(c, tau, k, rp, bp) {
    const R = this.R, s = rp.s, F = R.tan(s), Rt = R.right(s), U = V(0, 1, 0), side = c.side ?? 1;
    const G = R.at(s, rp.lane, 0), P = rp.hips.clone(), Hd = rp.head.clone(), B = this.rider.board.position.clone().add(V(0, .1, 0));
    const bP = bp ? bp.pos.clone() : P.clone();
    const look = c.look === 'buddy' ? bP : c.look === 'board' ? B : c.look === 'head' ? Hd : c.look === 'both' ? P.clone().lerp(bP, .5) : P.clone().add(V(0, -.1, 0));
    const push = 1 - (c.push || 0) * smooth(k), d = (c.d ?? 3) * push, h = c.h ?? 1, lead = (c.lead || 0) + (c.drift || 0) * (k - .5);
    const shake = (c.shake ?? .5) * .012 * (c.track ? clamp(this.rider.V.at(tau) / 4) : .3);
    const hand = V(n1(tau * 1.3, 71) * shake * 1.6, n1(tau * 1.7, 72) * shake, n1(tau * 1.1, 73) * shake);
    let pos, target = look.clone().add(V(0, c.ly || 0, 0));
    const anchor = c.look === 'buddy' ? bP : P, gY = c.look === 'buddy' ? bp.pos.y - this.bud.K.height * .97 : G.y;
    if (c.fixed) {
      // fixed rigs: placed once from the subject at the shot's anchor time (c.at, default the middle of the shot)
      const ta = c.atTau ?? lerp(c.tau0, c.tau1, c.anchor ?? .5), sa = this.rider.sAt(ta), la = this.rider.laneAt(ta), Fa = R.tan(sa), Ra = R.right(sa);
      if (c.cam === 'worm') pos = R.at(sa + (c.lead || 0), la + side * (c.x ?? .35), (c.h ?? .06));
      else if (c.cam === 'hero') pos = R.at(sa + (c.lead ?? 0), la + side * d, c.h ?? .55);
      else pos = R.at(sa + (c.lead ?? 1.5), la + side * d, c.h ?? 1);
      pos.add(hand.multiplyScalar(.3));
      if (c.cam === 'worm' && c.look !== 'buddy') target = P.clone().add(V(0, .2, 0));
      if (c.lookAt) target = R.at(sa + c.lookAt[0], la + c.lookAt[1], c.lookAt[2]);
    } else if (c.cam === 'orbit') {
      const a = lerp(c.a0 ?? -60, c.a1 ?? 60, smooth(k)) * DEG; pos = anchor.clone().addScaledVector(Rt, Math.cos(a) * d * side).addScaledVector(F, Math.sin(a) * d).setY(gY + h);
    } else if (c.cam === 'overhead') {
      pos = anchor.clone().addScaledVector(F, -d).setY(gY + h); target = anchor.clone();
    } else {
      const ahead = c.ahead ? 1 : c.behind ? -1 : 0, front = c.front;
      if (front) { const bf = rp.bodyF.clone().setY(0).normalize(); pos = Hd.clone().addScaledVector(bf, d).addScaledVector(F, lead + .25).setY(gY + h); }
      else pos = anchor.clone().addScaledVector(F, ahead * d + lead).addScaledVector(Rt, ahead ? side * (c.x ?? .6) : side * d).setY(gY + h);
      pos.add(hand);
    }
    if (c.offset) pos.add(V(...c.offset));
    // never inside a wall: pull the camera in along the line to what it looks at until nothing solid is between
    let cut = 0; if (!c.through) { const cl = this.K.clearLine(pos, target); if (cl.cut > 0) { pos = cl.pos; cut = cl.cut; } }
    const gy = this.R.y(this.rider.sAt(tau)); if (pos.y < gy + .04) pos.y = gy + .04;
    this.camera.fov = c.fov ?? 40; this.camera.updateProjectionMatrix();
    this.camera.position.copy(pos); this.camera.up.set(0, 1, 0); this.camera.lookAt(target);
    if (c.roll) this.camera.rotateZ(c.roll * DEG * (c.rollK ? lerp(1, 0, k) : 1));
    this.camera.updateMatrixWorld(); RES.set(this.W, this.H);
    this.sky.position.copy(this.camera.position); this.sky.updateMatrixWorld();
    return { pos, target, ahead: c.ahead, behind: c.behind, cut };
  }
  _updateFx(t, tau, c, rp) {
    // sparks: while the board is on the rail, from the trucks
    const P = this.sparkGeo.attributes.position, arr = P.array; arr.fill(0);
    if (rp.board.contact === 'rail') {
      const wl = this.rider.bd.wheels, base = [V(), V()]; wl[0].getWorldPosition(base[0]); wl[2].getWorldPosition(base[1]);
      const back = this.R.tan(rp.s).negate();
      for (let i = 0; i < arr.length / 6; i++) {
        const f = Math.floor(tau * 30), r = (j) => hash(i, f, j), o = base[i % 2].clone().add(V(0, -.03, 0));
        const dir = back.clone().multiplyScalar(.6 + r(1) * 1.2).add(V((r(2) - .5) * .8, r(3) * .6 - .1, (r(4) - .5) * .8)), age = r(5);
        const a = o.clone().addScaledVector(dir, age * .35), b = a.clone().addScaledVector(dir, .05 + r(6) * .06);
        arr.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
      }
    }
    P.needsUpdate = true;
    // dust: at the last push plant / landing within .5 s
    const ev = this._evCache || (this._evCache = this._events()); let di = 0;
    for (const e of ev) {
      if (!['land', 'push', 'paw', 'step'].includes(e.type)) continue; const age = tau - e.tau; if (age < 0 || age > .55) continue;
      const s = e.type === 'paw' ? this.bud.sAt(e.tau) : this.rider.sAt(e.tau), lane = e.type === 'paw' ? this.bud.sideAt(e.tau) : this.rider.laneAt(e.tau);
      for (let j = 0; j < 3 && di < this.dust.length; j++, di++) {
        const m = this.dust[di], q = age / .55; m.visible = true; const p = this.R.at(s - j * .15, lane + (j - 1) * .2, .05 + q * .12);
        p.addScaledVector(this.R.tan(s), -q * .3 * (j + 1)); m.position.copy(p); m.scale.setScalar((.05 + q * .18) * (e.type === 'land' ? 1.3 : .8)); m.material.opacity = .55 * (1 - q);
      }
    }
    for (; di < this.dust.length; di++) this.dust[di].visible = false;
    // leaves drift in a box around the camera (wrapped), fixed in the world, falling and tumbling
    if (this.leaves) {
      const cp = this.camera.position, box = 14, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < this.leafSeed.length; i++) {
        const [a, b, cc, d] = this.leafSeed[i], wrap = (v, c0) => c0 + (((v - c0) % box + box * 1.5) % box) - box / 2;
        const x = wrap(a * 1000 + Math.sin(tau * .7 + i) * .4 + tau * .3, cp.x), z = wrap(b * 1000 + tau * .2, cp.z), y = cp.y - 2 + ((cc * 7 - tau * (.35 + d * .3)) % 6 + 6) % 6;
        e.set(tau * (1 + a * 3), tau * (1 + b * 2), 0); q.setFromEuler(e); m4.compose(V(x, y, z), q, V(1, 1, 1)); this.leaves.setMatrixAt(i, m4);
      }
      this.leaves.instanceMatrix.needsUpdate = true;
    }
  }
  _post(t, c, k, cam) {
    const ctx = this.ctx, W = this.W, H = this.H, off = this.off;
    // diffusion glow (the soft painted bloom)
    if (!off.has('glow')) { this.sctx.globalCompositeOperation = 'copy'; this.sctx.filter = 'blur(3px)'; this.sctx.drawImage(this.canvas, 0, 0, W / 4, H / 4); this.sctx.filter = 'none'; ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .2; ctx.drawImage(this.small, 0, 0, W, H); ctx.globalAlpha = 1; }
    // flare when the sun is in frame and not hidden
    const sp = this.camera.position.clone().addScaledVector(this.light.dir, 500).project(this.camera);
    if (!off.has('flare') && sp.z < 1 && Math.abs(sp.x) < 1.3 && Math.abs(sp.y) < 1.3) {
      const x = (sp.x + 1) / 2 * W, y = (1 - sp.y) / 2 * H;
      let vis = 1; if (x > 0 && x < W && y > 0 && y < H) { const d = this.ctx.getImageData(x | 0, y | 0, 1, 1).data; vis = clamp((d[0] + d[1] + d[2] - 600) / 150); } else vis = .5;
      if (vis > 0) {
        ctx.globalCompositeOperation = 'screen';
        const g = ctx.createRadialGradient(x, y, 0, x, y, H * .55); g.addColorStop(0, `rgba(255,248,225,${.55 * vis})`); g.addColorStop(.15, `rgba(255,236,200,${.22 * vis})`); g.addColorStop(1, 'rgba(255,230,190,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const cx = W / 2, cy = H / 2;
        for (const [f, r, col] of [[.6, .05, '160,210,255'], [1.25, .09, '255,190,140'], [1.6, .03, '200,255,220'], [2, .14, '170,190,255']]) { const gx = x + (cx - x) * f, gy = y + (cy - y) * f, gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, H * r); gr.addColorStop(0, `rgba(${col},${.18 * vis})`); gr.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = gr; ctx.fillRect(gx - H * r, gy - H * r, H * r * 2, H * r * 2); }
        ctx.globalAlpha = .25 * vis; ctx.fillStyle = '#fff6e0'; ctx.fillRect(0, y - H * .002, W, H * .004); ctx.globalAlpha = 1;
      }
    }
    // speed lines (anime): thin streaks radiating from the vanishing point, re-drawn every other frame
    if ((c.lines || 0) > 0 && !off.has('lines')) {
      const f = Math.floor(t * this.FPS / 2), vp = this.R.at(this.rider.sAt(this.last.tau) + 40, 0, 1).project(this.camera), cx = (vp.x + 1) / 2 * W, cy = (1 - vp.y) / 2 * H;
      ctx.globalCompositeOperation = 'screen'; ctx.strokeStyle = 'rgba(255,255,255,.55)';
      for (let i = 0; i < 60 * c.lines; i++) { const a = hash(i, f, 1) * TAU, r0 = H * (.35 + hash(i, f, 2) * .4), r1 = r0 + H * (.1 + hash(i, f, 3) * .35); ctx.lineWidth = .6 + hash(i, f, 4) * 1.8 * this.scale; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke(); }
    }
    // transitions in: a white flash or a whip
    const lt = t - c.t0;
    if (c.in === 'flash' && lt < .25) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,255,255,${(1 - lt / .25) * .9})`; ctx.fillRect(0, 0, W, H); }
    if (c.in === 'dip' && lt < .3) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(255,255,255,${1 - lt / .3})`; ctx.fillRect(0, 0, W, H); }
    if (c.out === 'flash' && c.t1 - t < .12) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,255,255,${(1 - (c.t1 - t) / .12) * .8})`; ctx.fillRect(0, 0, W, H); }
    if (c.fade && c.t1 - t < c.fade) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(255,255,255,${1 - (c.t1 - t) / c.fade})`; ctx.fillRect(0, 0, W, H); }
    // vignette + grain
    ctx.globalCompositeOperation = 'source-over';
    if (!off.has('vignette')) { const g = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.05); g.addColorStop(0, 'rgba(20,30,60,0)'); g.addColorStop(1, 'rgba(20,30,60,.28)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (!off.has('grain')) { ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .07; const gc = this.grain[Math.floor(t * this.FPS) % 4]; for (let x = 0; x < W; x += 256) for (let y = 0; y < H; y += 256) ctx.drawImage(gc, x, y); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  }

  // ───────────── checks ─────────────
  /** names of broken rules at film time t (frame must be drawn) */
  checksAt(t) {
    const L = this.frame(t), out = [], { rp, bp, c } = L, cam = this.camera, W = this.W, H = this.H;
    for (const b of rp.bad) out.push('rider: ' + b);
    if (bp) for (const b of bp.bad) out.push('buddy: ' + b);
    // the camera is not inside anything, and above the ground
    const p = cam.position; if (p.y < this.R.y(rp.s) + .03) out.push('camera: below the ground');
    for (const s of this.K.solids) if (p.x > s.min.x && p.x < s.max.x && p.y > s.min.y && p.y < s.max.y && p.z > s.min.z && p.z < s.max.z && Math.hypot(p.x - (s.min.x + s.max.x) / 2, p.z - (s.min.z + s.max.z) / 2) < Math.min(s.w, s.d) / 2) { out.push('camera: inside a solid'); break; }
    // the subject the shot is about is in frame
    const subj = c.look === 'buddy' && bp ? bp.head : c.look === 'board' ? this.rider.board.position.clone() : rp.head;
    const q = subj.clone().project(cam); if (!(q.z < 1 && Math.abs(q.x) < 1.02 && Math.abs(q.y) < 1.08)) out.push(`frame: ${c.look === 'buddy' ? 'buddy' : c.look === 'board' ? 'board' : 'rider'} out of frame`);
    for (const r of this.rules) { try { if (!r.fn(t, L)) out.push(r.name); } catch (e) { out.push(r.name + ' (' + e.message + ')'); } }
    return out;
  }
  /** film-level numbers: cut rhythm, beat alignment, camera variety, motion (slip, idle, gathers) */
  report() {
    const r = this.rider, b = this.bud, cuts = this.cuts, beat = this.beat, out = { problems: [], numbers: {} };
    const offBeat = cuts.slice(1).map(c => { const x = c.t0 / beat; return Math.abs(x - Math.round(x)) * beat; }), maxOff = Math.max(0, ...offBeat);
    out.numbers.cuts = cuts.length; out.numbers.avgShot = +(this.dur / cuts.length).toFixed(2); out.numbers.offBeat = +maxOff.toFixed(3);
    if (maxOff > .5 / this.FPS + 1e-6) out.problems.push(`cuts: ${(maxOff * 1000).toFixed(0)} ms off the beat`);
    for (const c of cuts) if (c.dur < .6 || c.dur > 6) out.problems.push(`shot ${c.name}: ${c.dur.toFixed(2)} s (keep 0.6–6 s)`);
    for (let i = 1; i < cuts.length; i++) if (cuts[i].cam === cuts[i - 1].cam && !cuts[i].same) out.problems.push(`shots ${i} and ${i + 1}: same camera twice in a row (${cuts[i].cam})`);
    const kinds = new Set(cuts.map(c => c.cam)); out.numbers.cameras = kinds.size; if (cuts.length >= 8 && kinds.size < 5) out.problems.push(`cameras: only ${kinds.size} kinds of shot (use ≥ 5)`);
    // motion: planted feet / paws must not slide; big moves gather; the idle breathes; pushes come with speed
    const dt = 1 / 120; let slipR = 0, slipB = 0, worstR = '', worstB = '';
    const prev = {};
    for (let tau = 0; tau < this.storyDur; tau += dt) {
      const rp = r.pose(tau);
      for (const sd of ['L', 'R']) { const k = 'r' + sd, f = rp.feet[sd].pos, con = rp.contact[sd]; if (con === 'ground' && prev[k] && prev[k].con === 'ground') { const d = f.distanceTo(prev[k].p) * 1000; if (d > slipR) { slipR = d; worstR = `${sd} @${tau.toFixed(2)}`; } } prev[k] = { p: f.clone(), con }; }
      if (b) { const bp = b.pose(tau); for (const nm of ['FL', 'FR', 'HL', 'HR']) { const k = 'b' + nm, f = bp.paws[nm], con = bp.contact[nm]; if (con === 'ground' && prev[k] && prev[k].con === 'ground' && prev[k].gait === bp.gait) { const d = f.distanceTo(prev[k].p) * 1000; if (d > slipB) { slipB = d; worstB = `${nm} @${tau.toFixed(2)}`; } } prev[k] = { p: f.clone(), con, gait: bp.gait }; } }
    }
    out.numbers.slipRider = +slipR.toFixed(2); out.numbers.slipBuddy = +slipB.toFixed(2);
    if (slipR > 5) out.problems.push(`rider: planted foot slides ${slipR.toFixed(1)} mm in a step (${worstR})`);
    if (slipB > 5) out.problems.push(`buddy: planted paw slides ${slipB.toFixed(1)} mm in a step (${worstB})`);
    // gathers: every pop has a crouch at least .12 s before it
    const gathers = [];
    for (const m of r.moves) { const pop = m.air || m.do === 'grind' ? m.at : null; if (pop === null) continue; const c0 = r._crouch(pop - .3), c1 = r._crouch(pop - .05), c2 = r._crouch(pop + .12); gathers.push(+(c1 - c0).toFixed(2)); if (!(c1 - c0 > .2 && c2 < c1)) out.problems.push(`rider: ${m.do} at ${m.at}s has no gather (crouch ${c0.toFixed(2)} → ${c1.toFixed(2)} → ${c2.toFixed(2)})`); }
    for (const m of b?.moves || []) if (m.do === 'leap') { if (!(m.at > .35)) out.problems.push(`buddy: leap at ${m.at}s too early to gather`); }
    out.numbers.gathers = gathers;
    // idle: while stopped, something must breathe (chest / hips move)
    if (r.dismount) { const a = r.pose(r.dismount.at + 1.4).hips.y, bb = r.pose(r.dismount.at + 2.2).hips.y; out.numbers.idleBreath = +((Math.abs(a - bb)) * 1000).toFixed(1); if (Math.abs(a - bb) < .001) out.problems.push('rider: dead still at rest'); }
    // speed rises only with a push or a downhill
    for (let tau = .5; tau < this.storyDur - .5; tau += .25) { const dv = r.V.at(tau + .5) - r.V.at(tau); if (dv > .35) { const pushed = r.pushes.some(p => p.plant < tau + .6 && p.back > tau - .2), down = this.R.grade(r.sAt(tau)) < -.02; if (!pushed && !down) { out.problems.push(`rider: speeds up at ${tau.toFixed(2)}s without a push or a slope`); break; } } }
    return out;
  }

  // ───────────── start: the contract + the live player ─────────────
  start() {
    this.build();
    const info = this.info();
    this.score = typeof this.scoreSpec === 'function' ? this.scoreSpec(info) : this.scoreSpec;
    this.shotsInfo = info.shots;
    window.DURATION = +this.dur.toFixed(3); window.FPS = this.FPS; window.SIZE = { W: 1920, H: 1080 }; window.film = this;
    window.seek = t => { this.frame(t); };
    window.runChecks = t => this.checksAt(t);
    window.shotAt = t => { const c = this.cutAt(t); return { i: c.i, name: c.name, cam: c.cam, lt: t - c.t0, tau: c.tau0 + (t - c.t0) * c.rate }; };
    window.report = () => this.report();
    window.info = () => info;
    const st = document.createElement('style');
    st.textContent = `html,body{margin:0;height:100%;background:#0e1420;overflow:hidden}canvas{display:block;width:100vw;height:100vh;object-fit:contain}
      .srm-ui{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;gap:10px;padding:8px 12px;font:12px/1.2 system-ui,sans-serif;color:#eef3fb;background:linear-gradient(transparent,rgba(0,0,0,.55));opacity:0;transition:opacity .3s}
      body:hover .srm-ui,.srm-ui.on{opacity:1}.srm-ui button{all:unset;cursor:pointer;padding:4px 8px;border:1px solid rgba(255,255,255,.35);border-radius:4px}
      .srm-bar{flex:1;height:14px;cursor:pointer;position:relative}.srm-bar i{position:absolute;left:0;top:6px;height:2px;background:#ffd27a}.srm-bar:before{content:"";position:absolute;left:0;right:0;top:6px;height:2px;background:rgba(255,255,255,.25)}
      .srm-bar b{position:absolute;top:3px;width:1px;height:8px;background:rgba(255,255,255,.5)}`;
    document.head.appendChild(st);
    // compile + warm (the first frame builds shadow maps and programs)
    this.frame(0);
    if (this.q.has('t')) this.frame(+this.q.get('t'));
    else if (!this.render) this.live();
    window.__ready = true;
  }
  live() {
    let t0 = performance.now(), base = 0, paused = false, ac = null, src = null, buffer = null, loading = false;
    const ui = document.createElement('div'); ui.className = 'srm-ui';
    ui.innerHTML = `<button data-k="play">❚❚</button>${this.score ? '<button data-k="snd">♪ sound</button>' : ''}<div class="srm-bar"><i></i>${this.cuts.slice(1).map(c => `<b style="left:${c.t0 / this.dur * 100}%"></b>`).join('')}</div><span class="tm"></span>`;
    document.body.appendChild(ui);
    const bar = ui.querySelector('.srm-bar'), fill = bar.querySelector('i'), tm = ui.querySelector('.tm'), pb = ui.querySelector('[data-k=play]'), sb = ui.querySelector('[data-k=snd]');
    const now = () => paused ? base : (ac && src ? (ac.currentTime - this._acStart) : base + (performance.now() - t0) / 1000) % this.dur;
    const stopAudio = () => { if (src) { try { src.stop(); } catch { } src = null; } };
    const playAudio = at => { if (!buffer || paused) return; stopAudio(); src = ac.createBufferSource(); src.buffer = buffer; src.loop = true; src.connect(ac.destination); src.start(0, at % this.dur); this._acStart = ac.currentTime - at % this.dur; };
    const go = t => { base = (t % this.dur + this.dur) % this.dur; t0 = performance.now(); if (src) playAudio(base); };
    const toggle = () => { if (paused) { paused = false; go(base); if (buffer) playAudio(base); } else { base = now(); paused = true; stopAudio(); } pb.textContent = paused ? '▶' : '❚❚'; };
    pb.onclick = e => { e.stopPropagation(); toggle(); };
    if (sb) sb.onclick = async e => {
      e.stopPropagation();
      if (src) { base = now(); stopAudio(); t0 = performance.now(); sb.textContent = '♪ sound'; return; }
      if (loading) return; loading = true; sb.textContent = '♪ …';
      ac = ac || new AudioContext();
      if (!buffer) { await new Promise(r => setTimeout(r, 30)); const sr = ac.sampleRate, [L, R] = renderScore(this.score, sr, this.dur); buffer = ac.createBuffer(2, L.length, sr); buffer.copyToChannel(L, 0); buffer.copyToChannel(R, 1); }
      loading = false; sb.textContent = '♪ on'; const at = now(); paused = false; pb.textContent = '❚❚'; playAudio(at);
    };
    const scrub = e => { const r = bar.getBoundingClientRect(); go(clamp((e.clientX - r.left) / r.width) * this.dur); if (paused) this.frame(base); };
    bar.onpointerdown = e => { e.stopPropagation(); bar.setPointerCapture(e.pointerId); scrub(e); bar.onpointermove = scrub; };
    bar.onpointerup = () => { bar.onpointermove = null; };
    this.canvas.onclick = toggle;
    addEventListener('keydown', e => {
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { const t = now() + (e.code === 'ArrowRight' ? 1 : -1); paused ? (base = (t + this.dur) % this.dur, this.frame(base)) : go(t); }
    });
    let lastF = -1;
    const loop = () => {
      const t = now(), fi = Math.floor(t * this.FPS);
      if (!paused && fi !== lastF) { this.frame(fi / this.FPS); lastF = fi; }
      const c = this.cutAt(t); fill.style.width = (t / this.dur * 100) + '%'; tm.textContent = `${t.toFixed(1)} / ${this.dur.toFixed(1)} s · ${c.name}`;
      requestAnimationFrame(loop);
    };
    loop();
  }
}
export { Route, Town, Rider, Buddy, CAMS as CAMERAS };
