// engraving-collage-film · film.js — the film: shots on a timeline, keyed cameras through the collage, cel characters
// performing their acts on billboard cards, and the frame layout — the MAKING-OF (the comp in 2.39:1 on top, the same
// moment's 3-D breakdown underneath, the source's format) or the FILM (the comp alone). Every frame is seek(t): the page
// plays live and renders to MP4 frame by frame.
//
//   new Film({ sets, cast, shots: [ { set: 'street', dur: 5.5, cam: [{ pos, look, fov }, …], ease: 'dolly', focus: 7,
//              acts: { oto: [ { at: [-3, 0, 2], face: 1, view: 'side' }, { t: 0.6, walk: [2, 1.5] }, { t: 4, turn: 'front' }, { t: 4.6, do: 'wave' } ] },
//              rig: { pos, look } (the breakdown camera; auto if absent) } ], score: { bpm, key } }).start()
import * as THREE from 'three';
import { Stage, CamHelper, checker, U } from './world.js';
import { PAPER } from './engrave.js';
import { keyed, ease, clamp, lerp, v3, DEG, noise1 } from './core.js';
import { drawCharacter, gaitPose, strideOf, idlePose, blinkAt, actionDelta, actionDur, addPose, blend, audit, auditPose, soles, ACTIONS } from './rig.js';

const Q = new URLSearchParams(location.search);
THREE.ColorManagement.enabled = false;   // what the plates paint is what the frame shows (no sRGB round trip)
const PAPER_HEX = (PAPER[0] << 16) | (PAPER[1] << 8) | PAPER[2];

// ── a character's performance in one shot: acts → state at shot-local time s (pure) ──
const GAIT_PERIOD = { walk: 1.0, run: 0.62 };   // seconds per full cycle (two steps) for mass 1
class Track {
  constructor(ch, acts, film, shot) {
    this.ch = ch; this.shot = shot; this.film = film;
    const a0 = acts[0] || {};
    this.start = { pos: [...(a0.at || [0, 0, 0])], face: a0.face ?? 1, view: a0.view || 'side', expr: a0.expr || 'neutral', hold: a0.hold || null };
    this.mpp = ch.height / rigHeight(ch);            // metres per rig px
    this.stride = { walk: strideOf(ch, 'walk') * this.mpp, run: strideOf(ch, 'run') * this.mpp };
    // build segments with absolute times and endpoints
    let pos = [...this.start.pos], face = this.start.face, view = this.start.view;
    this.segs = []; this.events = [];
    for (const a of acts.slice(1)) {
      const t = a.t ?? 0;
      if (a.walk || a.run) {
        const gait = a.walk ? 'walk' : 'run', to = a.walk || a.run, p1 = [to[0], to.length > 2 ? to[1] : pos[1], to.length > 2 ? to[2] : to[1]];
        const dist = Math.hypot(p1[0] - pos[0], p1[2] - pos[2]), speed = this.stride[gait] / (GAIT_PERIOD[gait] * ch.mass);
        const dur = a.dur ?? dist / speed * 1.18;
        const f = a.face ?? film.screenFacing(shot, pos, p1, t + dur / 2) ?? face;
        const seg = { kind: gait, t0: t, t1: t + dur, p0: [...pos], p1, face: f, view: a.view || (view === 'front' || view === 'back' ? 'side' : view), dist };
        // 2.5-D: the legs stride across the card, so the cycle advances by the travel ACROSS the screen (the depth part of a
        // move only changes the size); precomputed as a table so the state stays a pure function of time
        const N = Math.max(8, Math.ceil(dur * 96)); seg.lat = [0]; let acc = 0, prevP = seg.p0;
        for (let i = 1; i <= N; i++) {
          const u = i / N, P = v3.lerp(seg.p0, seg.p1, ease.dolly(u)), r = film.camRight(shot, t + u * dur, P);
          acc += Math.abs(v3.dot(v3.sub(P, prevP), r)); seg.lat.push(acc); prevP = P;
        }
        seg.latFrac = dist > 1e-6 ? acc / dist : 1;
        this.segs.push(seg);
        pos = p1; face = f; view = a.view || (view === 'front' || view === 'back' ? 'side' : view);
      } else if (a.turn) {
        const dur = actionDur('turnStep', ch.mass);
        this.segs.push({ kind: 'turn', t0: t, t1: t + dur, from: view, to: a.turn, face0: face, face1: a.face ?? face, at: [...pos] });
        view = a.turn; face = a.face ?? face;
      } else if (a.do) {
        const dur = actionDur(a.do, ch.mass);
        this.segs.push({ kind: 'do', name: a.do, t0: t, t1: t + dur, at: [...pos], to: a.to ? [a.to[0], pos[1], a.to[1]] : null, face, view });
        if (a.to) pos = [a.to[0], pos[1], a.to[1]];
      }
      if (a.expr) this.events.push({ t, expr: a.expr });
      if (a.look != null) this.events.push({ t, look: a.look });
      if (a.hold !== undefined) this.events.push({ t, hold: a.hold });
      if (a.face != null && !a.walk && !a.run && !a.turn) { this.events.push({ t, face: a.face }); face = a.face; }
    }
    this.segs.sort((a, b) => a.t0 - b.t0);
  }
  /** root position at s (for velocity / follow-through) */
  posAt(s) {
    let pos = this.start.pos;
    for (const g of this.segs) {
      if (s < g.t0) break;
      if (g.kind === 'walk' || g.kind === 'run') { const u = clamp((s - g.t0) / (g.t1 - g.t0)); pos = v3.lerp(g.p0, g.p1, ease.dolly(u)); }
      else if (g.kind === 'do' && g.to) { const A = ACTIONS[g.name], u = clamp(((s - g.t0) / this.ch.mass - 0.42) / 0.44); pos = v3.lerp(g.at, g.to, ease.sine(u)); }
      else pos = g.at || pos;
    }
    return pos;
  }
  state(s) {
    const ch = this.ch, st = { view: this.start.view, face: this.start.face, expr: this.start.expr, look: 0, hold: this.start.hold, air: 0, gait: null, phase: 0 };
    for (const e of this.events) if (e.t <= s) Object.assign(st, e.expr ? { expr: e.expr } : e.look != null ? { look: e.look } : e.hold !== undefined ? { hold: e.hold } : { face: e.face });
    let angles = idlePose(ch, s + this.shot.start, { view: st.view }), active = null;
    for (const g of this.segs) {
      if (s >= g.t1) { if (g.kind === 'walk' || g.kind === 'run') { st.face = g.face; st.view = g.view; } if (g.kind === 'turn') { st.view = g.to; st.face = g.face1; } }
      else if (s >= g.t0) active = g;
    }
    angles = idlePose(ch, s + this.shot.start, { view: st.view });
    if (active) {
      const g = active, ls = s - g.t0;
      if (g.kind === 'walk' || g.kind === 'run') {
        st.face = g.face; st.view = g.view;
        const u = clamp(ls / (g.t1 - g.t0)), fi = u * (g.lat.length - 1), i0 = Math.floor(fi), d = lerp(g.lat[i0], g.lat[Math.min(g.lat.length - 1, i0 + 1)], fi - i0), ph = 0.25 + d / this.stride[g.kind];
        const gp = gaitPose(ch, g.kind, ph), k = Math.min(1, ls / 0.16, (g.t1 - g.t0 - ls) / 0.22);
        st.air = gp.air * k; st.gait = k >= 1 ? g.kind : null; st.phase = ph;
        angles = blend(idlePose(ch, s + this.shot.start, { view: st.view }), gp, clamp(k));
      } else if (g.kind === 'turn') {
        const mid = (g.t1 - g.t0) * 0.5; st.view = ls < mid ? g.from : g.to; st.face = ls < mid ? g.face0 : g.face1;
        angles = addPose(idlePose(ch, s + this.shot.start, { view: st.view }), st.view === 'front' || st.view === 'back' ? scaleD(actionDelta('turnStep', ls, ch.mass), 0.4) : actionDelta('turnStep', ls, ch.mass));
      } else if (g.kind === 'do') {
        st.face = g.face; st.view = g.view; const d = actionDelta(g.name, ls, ch.mass);
        angles = addPose(idlePose(ch, s + this.shot.start, { view: st.view }), d); st.air = (d.rise || 0) * ch.px; st.action = g.name;
      }
    }
    // follow-through: loose parts lag the root's speed of a moment ago, plus a breath of breeze
    const v = (a, b) => Math.hypot(...v3.sub(this.posAt(b), this.posAt(a)).filter((_, i) => i !== 1)) / (b - a);
    const lagSpeed = 0.6 * v(s - 0.2, s - 0.08) + 0.4 * v(s - 0.32, s - 0.2);
    st.sway = 4 + 12 * Math.min(2.5, lagSpeed) + 3 * noise1((s + this.shot.start) * 0.9, ch.id % 97) + (st.air > 0 ? 6 : 0);
    st.pos = this.posAt(s); st.angles = angles; st.blink = blinkAt(ch, s + this.shot.start);
    st.breath = angles.breath ?? 0;
    return st;
  }
}
const scaleD = (d, k) => { const o = {}; for (const i in d) o[i] = d[i] * k; return o; };
export function rigHeight(ch) { const L = ch.L; return 1.12 * ch.u + L.torso + L.thigh + L.shin + L.footH; }

export class Film {
  constructor(o) {
    this.o = o; this.FPS = o.fps ?? 24;
    this.view = Q.get('view') || o.view || 'making';           // 'making' (comp over breakdown) | 'film' (comp only)
    this.CW = o.size?.[0] ?? 1920; this.CH = o.size?.[1] ?? 804;   // the comp panel: 2.39:1
    this.W = this.CW; this.H = this.view === 'making' ? this.CH * 2 : this.CH;
    let t = 0;
    this.shots = o.shots.map((s, i) => { const sh = { ...s, i, start: t, dur: s.dur ?? 4 }; t += sh.dur; return sh; });
    this.DURATION = +t.toFixed(3);
  }

  async start() {
    this.scale = +(Q.get('scale') || 1);
    this.stages = {};
    const used = new Set(this.shots.map(s => s.set));
    for (const id of used) {
      const def = this.o.sets[id]; if (!def) throw new Error(`shot uses set "${id}" but sets has no such key`);
      const S = new Stage({ seed: def.seed ?? 1, haze: def.haze, name: id });
      await def.build(S);
      S.camHelper = new CamHelper(S.scene);
      this.stages[id] = S;
    }
    // characters: one billboard card per (set, character) that a shot uses, with its own canvas painted every frame
    this.chars = {};
    for (const sh of this.shots) for (const name of Object.keys(sh.acts || {})) {
      const ch = this.o.cast[name]; if (!ch) throw new Error(`shot ${sh.i} acts for "${name}" but cast has no such character`);
      const key = sh.set + '/' + name; if (this.chars[key]) continue;
      this.chars[key] = this._charCard(this.stages[sh.set], ch);
    }
    this.tracks = this.shots.map(sh => Object.fromEntries(Object.entries(sh.acts || {}).map(([n, acts]) => [n, new Track(this.o.cast[n], acts, this, sh)])));
    // renderer + the output canvas
    this.gl = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.gl.outputColorSpace = THREE.LinearSRGBColorSpace; this.gl.setPixelRatio(1);
    this.gl.setSize(Math.round(this.W * this.scale), Math.round(this.H * this.scale), false);
    this.cam = new THREE.PerspectiveCamera(40, this.CW / this.CH, 0.05, 2000);
    this.rigCam = new THREE.PerspectiveCamera(46, this.CW / this.CH, 0.05, 4000); this.rigCam.layers.enable(1);
    this.bgPaper = new THREE.Color(PAPER_HEX); this.bgCheck = checker(Math.round(this.CW * this.scale), Math.round(this.CH * this.scale), Math.max(6, Math.round(16 * this.scale)));
    this.canvas = document.createElement('canvas'); this.canvas.width = Math.round(this.W * this.scale); this.canvas.height = Math.round(this.H * this.scale);
    this.ctx = this.canvas.getContext('2d');
    document.body.style.cssText = 'margin:0;background:#141414;overflow:hidden'; document.body.appendChild(this.canvas);
    this.hidden = {};
    this._contract();
    if (Q.has('render')) this.seek(Q.has('t') ? +Q.get('t') : 0);
    else this._live(Q.has('t') ? +Q.get('t') : 0, Q.has('t'));
    window.__ready = true;
    return this;
  }

  _charCard(stage, ch) {
    const cw = Math.round(ch.px * 1.25), chh = Math.round(ch.px * 1.5), ground = chh - Math.round(ch.px * 0.06);
    const c = document.createElement('canvas'); c.width = cw; c.height = chh;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
    const mpp = ch.height / rigHeight(ch), w = cw * mpp, h = chh * mpp;
    const plate = { canvas: c, m: [w, h], w: cw, h: chh, base: chh - ground, blur: null };
    const card = stage.card(plate, { shadow: false, layer: 'cast', name: ch.name, haze: 0.6 });
    card.mat.uniforms.map.value = t; card.mat.uniforms.blurMap.value = t; card.mat.uniforms.uDof.value = 0;
    card.mat.depthWrite = false; card.mesh.renderOrder = 5;
    // a soft contact shadow on the ground
    const sc = document.createElement('canvas'); sc.width = 128; sc.height = 64; const sx = sc.getContext('2d'), g = sx.createRadialGradient(64, 32, 2, 64, 32, 62);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); sx.fillStyle = g; sx.fillRect(0, 0, 128, 64);
    const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.NoColorSpace;
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(ch.height * 0.5, ch.height * 0.16), new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false, opacity: 0.45, color: 0x332f2c }));
    sm.rotation.x = -Math.PI / 2; sm.renderOrder = -5; stage.scene.add(sm);
    return { ch, canvas: c, ctx: c.getContext('2d'), tex: t, card, shadow: sm, ground, mpp };
  }

  shotAt(t) { t = clamp(t, 0, this.DURATION - 1e-4); return this.shots.find(s => t >= s.start && t < s.start + s.dur) || this.shots[this.shots.length - 1]; }
  camAt(shot, u) {
    const k = keyed(shot.cam, u, shot.ease ? ease[shot.ease] : ease.dolly);
    return { pos: k.pos, look: k.look, fov: k.fov ?? 40, roll: k.roll ?? 0, focus: k.focus ?? shot.focus ?? v3.len(v3.sub(k.look, k.pos)) };
  }
  _placeCam(cam, pos, look, fov, roll = 0) {
    cam.position.set(...pos); cam.up.set(0, 1, 0); cam.lookAt(...look); if (roll) cam.rotateZ(roll * DEG); cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }
  /** the breakdown camera: given, or pulled back up and to the side of the shot's camera path so the whole move and set read */
  rigAt(shot, u) {
    if (shot.rig) { const k = keyed(Array.isArray(shot.rig) ? shot.rig : [shot.rig], u); return { pos: k.pos, look: k.look, fov: k.fov ?? 46 }; }
    const a = this.camAt(shot, 0), b = this.camAt(shot, 1), C = v3.lerp(a.pos, b.pos, 0.5), Lk = v3.lerp(a.look, b.look, 0.5);
    const f = v3.norm(v3.sub(Lk, C)), side = v3.norm(v3.cross(f, [0, 1, 0])), D = v3.len(v3.sub(Lk, C)) * 0.9 + v3.len(v3.sub(b.pos, a.pos)) * 0.6 + 6;
    const sway = (u - 0.5) * 0.25, sd = v3.add(v3.mul(side, Math.cos(sway)), v3.mul(f, -Math.sin(sway)));
    const pos = v3.add(v3.add(v3.add(C, v3.mul(f, -D * 0.55)), v3.mul(sd, D * 0.85)), [0, D * 0.5, 0]);
    return { pos, look: v3.lerp(C, Lk, 0.55), fov: 46 };
  }
  /** the billboard's right vector (world, horizontal) for a character at P under the shot camera at shot time s */
  camRight(shot, s, P) { const c = this.camAt(shot, clamp(s / shot.dur)), yaw = Math.atan2(c.pos[0] - P[0], c.pos[2] - P[2]); return [Math.cos(yaw), 0, -Math.sin(yaw)]; }
  /** which way (±1) a move from p0 to p1 reads on screen under the shot's camera at shot time s */
  screenFacing(shot, p0, p1, s) {
    const c = this.camAt(shot, clamp(s / shot.dur)), f = v3.norm(v3.sub(c.look, c.pos)), right = v3.norm(v3.cross(f, [0, 1, 0]));
    const d = v3.dot(v3.sub(p1, p0), right); return Math.abs(d) < 1e-3 ? null : Math.sign(d);
  }

  _poseCharacters(shot, s, stage) {
    for (const k in this.chars) this.chars[k].card.group.visible = this.chars[k].shadow.visible = false;
    const tr = this.tracks[shot.i], out = {};
    for (const [name, track] of Object.entries(tr)) {
      const cc = this.chars[shot.set + '/' + name], ch = cc.ch, st = track.state(s), x = cc.ctx;
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cc.canvas.width, cc.canvas.height);
      x.translate(cc.canvas.width / 2, 0);
      const hold = st.hold && ch.props?.[st.hold] ? { on: ch.props[st.hold].on || 'foreN', draw: ch.props[st.hold].draw } : null;
      drawCharacter(x, ch, { x: 0, ground: cc.ground, facing: st.face, view: st.view, angles: st.angles, air: 0, breath: st.breath, blink: st.blink, expr: st.expr, look: st.look, sway: st.sway, hold });
      cc.tex.needsUpdate = true;
      const g = cc.card.group, airM = st.air * cc.mpp; g.visible = !this.hidden.cast; cc.shadow.visible = !this.hidden.cast;
      g.position.set(st.pos[0], st.pos[1] + airM, st.pos[2]);
      const cp = this.cam.position; g.rotation.set(0, Math.atan2(cp.x - st.pos[0], cp.z - st.pos[2]), 0);   // billboard toward the shot camera
      cc.shadow.position.set(st.pos[0], st.pos[1] + 0.012, st.pos[2]); const ks = 1 / (1 + airM * 2.2); cc.shadow.scale.set(ks, ks, 1); cc.shadow.material.opacity = 0.45 * ks;
      out[name] = { st, cc };
    }
    return out;
  }

  seek(t) {
    t = clamp(t, 0, this.DURATION - 1e-6);
    const shot = this.shotAt(t), s = t - shot.start, u = clamp(s / shot.dur), stage = this.stages[shot.set];
    U.uTime.value = t; stage.pose(t);
    const c = this.camAt(shot, u); this._placeCam(this.cam, c.pos, c.look, c.fov, c.roll); U.uFocus.value = c.focus; U.uHaze.value.set(...stage.haze);
    this._poseCharacters(shot, s, stage);
    if (this._pathShot !== shot.i || this._pathStage !== stage) { stage.camHelper.setPath(Array.from({ length: 41 }, (_, i) => this.camAt(shot, i / 40).pos)); this._pathShot = shot.i; this._pathStage = stage; }
    const gl = this.gl, k = this.scale, cw = Math.round(this.CW * k), chh = Math.round(this.CH * k);
    gl.setScissorTest(true);
    // the comp (top panel in the making-of)
    const yComp = this.view === 'making' ? chh : 0;
    gl.setViewport(0, yComp, cw, chh); gl.setScissor(0, yComp, cw, chh);
    U.uMode.value = 0; stage.scene.background = this.bgPaper; stage.camHelper.g.visible = false;
    this.cam.layers.set(0); gl.render(stage.scene, this.cam);
    if (this.view === 'making') {
      const r = this.rigAt(shot, u); this._placeCam(this.rigCam, r.pos, r.look, r.fov);
      stage.camHelper.g.visible = true; stage.camHelper.update(this.cam, c.look, Math.max(1.2, v3.len(v3.sub(r.pos, c.pos)) * 0.06));
      gl.setViewport(0, 0, cw, chh); gl.setScissor(0, 0, cw, chh);
      U.uMode.value = 1; stage.scene.background = this.bgCheck;
      gl.render(stage.scene, this.rigCam);
    }
    gl.setScissorTest(false);
    const x = this.ctx; x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(gl.domElement, 0, 0);
    if (this.view === 'making') {
      x.fillStyle = '#1b1b1b'; x.fillRect(0, chh - Math.max(1, Math.round(2 * k)), cw, Math.max(1, Math.round(2 * k)));
      x.font = `${Math.round(15 * k)}px ui-monospace, Menlo, monospace`; x.textBaseline = 'top';
      const lab = (s0, px, py) => { x.fillStyle = 'rgba(255,255,255,.8)'; const w = x.measureText(s0).width; x.fillRect(px - 4 * k, py - 3 * k, w + 8 * k, 21 * k); x.fillStyle = '#333'; x.fillText(s0, px, py); };
      lab(`3D VIEW · ${shot.set} · ${stage.cards.length} cards`, 14 * k, chh + 12 * k);
      lab(`CAM ${shot.i + 1}/${this.shots.length}  ${(t).toFixed(2)} s`, cw - 230 * k, chh + 12 * k);
    }
    this._t = t;
  }

  // ── live player ──
  _live(t0, paused) {
    const fit = () => { const k = Math.min(innerWidth / this.canvas.width, innerHeight / this.canvas.height); this.canvas.style.cssText = `display:block;margin:0 auto;width:${this.canvas.width * k}px;height:${this.canvas.height * k}px;cursor:pointer`; };
    fit(); addEventListener('resize', fit);
    let t = t0, last = null, play = !paused;
    const bar = document.createElement('div'); bar.style.cssText = 'position:fixed;left:0;bottom:0;height:4px;background:#c9a24c;width:0';
    document.body.appendChild(bar);
    const frame = (now) => { if (play) { if (last != null) t = (t + (now - last) / 1000) % this.DURATION; last = now; } else last = null; this.seek(t); bar.style.width = `${t / this.DURATION * 100}%`; requestAnimationFrame(frame); };
    this.canvas.addEventListener('click', () => (play = !play));
    addEventListener('keydown', e => { if (e.code === 'Space') play = !play; if (e.code === 'ArrowRight') t = Math.min(this.DURATION - 0.01, t + 3); if (e.code === 'ArrowLeft') t = Math.max(0, t - 3); });
    addEventListener('click', e => { if (e.clientY > innerHeight - 24) t = e.clientX / innerWidth * this.DURATION; });
    requestAnimationFrame(frame);
  }

  // ── what the scripts read ──
  _contract() {
    const film = this;
    window.film = this; window.DURATION = this.DURATION; window.FPS = this.FPS;
    window.SIZE = { W: this.W, H: this.H, comp: [this.CW, this.CH], view: this.view };
    window.seek = t => this.seek(t);
    window.filmInfo = () => ({ duration: this.DURATION, fps: this.FPS, size: [this.W, this.H], view: this.view,
      shots: this.shots.map(s => ({ i: s.i, set: s.set, start: s.start, dur: s.dur, cast: Object.keys(s.acts || {}) })),
      sets: Object.fromEntries(Object.entries(this.stages).map(([k, S]) => [k, S.stats()])), cast: Object.keys(this.o.cast || {}) });
    window.setHidden = h => { this.hidden = { ...h }; };
    /** cameras: speed per frame, turn per frame, nearest card plane distance */
    window.cameraAudit = () => this.shots.map(sh => {
      let maxStep = 0, maxTurn = 0, n = Math.max(2, Math.round(sh.dur * this.FPS));
      for (let i = 1; i <= n; i++) {
        const a = this.camAt(sh, (i - 1) / n), b = this.camAt(sh, i / n);
        maxStep = Math.max(maxStep, v3.len(v3.sub(b.pos, a.pos)));
        const fa = v3.norm(v3.sub(a.look, a.pos)), fb = v3.norm(v3.sub(b.look, b.pos)); maxTurn = Math.max(maxTurn, Math.acos(clamp(v3.dot(fa, fb), -1, 1)) / DEG);
      }
      return { shot: sh.i, maxStep: +maxStep.toFixed(3), maxTurn: +maxTurn.toFixed(2) };
    });
    /** bodies over the whole film: joint ranges, planted feet (world drift in comp px), facing vs screen motion, idle life */
    window.bodyAudit = () => {
      audit.length = 0; const out = { audit: [], drift: [], facing: [], idle: [] };
      for (const sh of this.shots) for (const [name, tr] of Object.entries(this.tracks[sh.i])) {
        const n = Math.round(sh.dur * this.FPS); let prev = null, maxDrift = 0, faceBad = 0, lastA = null, idleMove = 0, idleFrames = 0;
        for (let i = 0; i < n; i++) {
          const s = i / this.FPS, st = tr.state(s), u = s / sh.dur, c = this.camAt(sh, u);
          this._placeCam(this.cam, c.pos, c.look, c.fov, c.roll);
          // planted-foot drift: each sole point on the ground, in world metres, must not move between frames while a gait is on
          // (reported in px at a 400 px tall figure, like the cast sheet); the billboard's turn toward the camera counts too
          const ch = tr.ch, so = soles(ch, { x: 0, ground: 0, angles: st.angles, view: st.view, facing: st.face, air: st.air }), cur = {};
          const cp = this.cam.position, yaw = Math.atan2(cp.x - st.pos[0], cp.z - st.pos[2]), rx = Math.cos(yaw), rz = -Math.sin(yaw);
          for (const f of ['footN', 'footF']) so[f].forEach((q, j) => { if (q[1] > -0.6 && st.angles[f === 'footN' ? 'stanceN' : 'stanceF']) cur[f + j] = [st.pos[0] + q[0] * tr.mpp * rx, st.pos[2] + q[0] * tr.mpp * rz]; });
          // the slide that shows: along the card (across the screen); depth travel of a billboard only scales it
          if (st.gait && prev && prev.gait) for (const k in cur) if (prev.cur[k]) maxDrift = Math.max(maxDrift, Math.abs((cur[k][0] - prev.cur[k][0]) * rx + (cur[k][1] - prev.cur[k][1]) * rz) / ch.height * 400);
          prev = { cur, gait: st.gait };
          // facing: while walking, the screen motion must go the way the character faces
          if (st.gait) { const p2 = tr.posAt(s + 0.1), d = this.screenFacing(sh, st.pos, p2, s); if (d && d !== st.face && (st.view === 'side' || st.view === 'threeq')) faceBad++; }
          if (!st.gait && !st.action) { if (lastA) { idleMove = Math.max(idleMove, Math.max(...Object.keys(st.angles).filter(k => typeof st.angles[k] === 'number').map(k => Math.abs(st.angles[k] - (lastA[k] ?? 0))))); } idleFrames++; }
          lastA = st.angles;
          auditPose(ch, { angles: st.angles, view: st.view });
        }
        out.drift.push({ shot: sh.i, name, px: +maxDrift.toFixed(2), across: Math.min(1, ...tr.segs.filter(g => g.lat).map(g => +g.latFrac.toFixed(2))) }); out.facing.push({ shot: sh.i, name, wrong: faceBad }); out.idle.push({ shot: sh.i, name, frames: idleFrames, maxStepDeg: +idleMove.toFixed(3) });
      }
      out.audit = [...new Set(audit)]; return out;
    };
    window.soundEvents = () => {
      const ev = [];
      for (const sh of this.shots) {
        ev.push({ t: sh.start, kind: 'cut' });
        for (const [name, tr] of Object.entries(this.tracks[sh.i])) {
          let lastStep = null;
          for (let i = 0; i < Math.round(sh.dur * this.FPS); i++) {
            const s = i / this.FPS, st = tr.state(s);
            if (st.gait) { const step = Math.floor(st.phase * 2); if (lastStep !== null && step !== lastStep) ev.push({ t: sh.start + s, kind: 'step', gait: st.gait, mass: tr.ch.mass }); lastStep = step; } else lastStep = null;
          }
          for (const g of tr.segs) if (g.kind === 'do' && g.name === 'jump') { ev.push({ t: sh.start + g.t0 + 0.42 * tr.ch.mass, kind: 'hop' }); ev.push({ t: sh.start + g.t0 + 0.9 * tr.ch.mass, kind: 'land' }); }
          else if (g.kind === 'do' && g.name === 'wave') ev.push({ t: sh.start + g.t0 + 0.4, kind: 'chime' });
        }
      }
      for (const S of Object.values(this.stages)) for (const r of S.riseTimes || []) ev.push({ t: r, kind: 'rise' });
      return ev.sort((a, b) => a.t - b.t);
    };
    window.scoreInfo = () => this.o.score || {};
  }
}
