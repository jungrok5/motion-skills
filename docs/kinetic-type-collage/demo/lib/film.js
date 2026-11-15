// kinetic-type-collage · film.js — the engine. A film is a list of very short shots on a beat grid; every cut is hard.
// A shot is a small set: type (planes cut from a distance field), props (lit three.js objects), pictures (painted or loaded
// planes) and bars, in three layers — `under` (flat, behind), the 3D world, `over` (flat, in front) — plus one camera move.
// Every animated value is either a constant or a function of (p, lt, b): shot progress 0–1, seconds and beats since the cut.
//   const F = new Film({ bpm, size, paper, ink, colors });  F.prop(name, (K) => object);
//   F.shot(name, { beats, bg, cam, ground, frame, … }, (S) => { S.type(…); S.obj(…); S.img(…); S.rect(…); S.under.type(…); S.over.type(…); });
//   F.check(name, fn);  await F.start();
// Contract set by start(): window.seek(t) / renderAt(t), DURATION, FPS, SIZE, shotAt(t), runChecks(), cues(), showProp(), film, READY.
import * as THREE from 'three';
import { Typesetter } from './type.js';
import { makeKit, studioEnv, rng } from './kit.js';

const KEY = 1.9, FILL = 0.7, ENV = 0.3, AZ = -30, EL = 42;   // default light: key (directional, casts the shadow), fill (sky / ground), env (studio reflections)
const D = Math.PI / 180, clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
// ---- easing. The style moves in two ways: a slam (arrives in a few frames, then creeps) and a steady drift.
export const E = {
  lin: (x) => x, in: (x) => x * x * x, out: (x) => 1 - (1 - x) ** 3, io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  in5: (x) => x ** 5, out5: (x) => 1 - (1 - x) ** 5, io5: (x) => (x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2),
  back: (x) => 1 + 2.4 * (x - 1) ** 3 + 1.4 * (x - 1) ** 2,
  slam: (x) => 0.78 * (1 - (1 - Math.min(1, x / 0.3)) ** 5) + 0.22 * x,         // most of the way in the first third, then it keeps creeping to the cut
  hold: (x) => (x < 1 ? 0 : 1),
};
const ez = (e) => (typeof e === 'function' ? e : E[e] || E.out);
const lerp = (a, b, k) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * k) : a + (b - a) * k);
// a → b over shot progress p0..p1 (tw) or over beats b0..b1 (tb)
export const tw = (a, b, ease = 'slam', p0 = 0, p1 = 1) => (p) => lerp(a, b, ez(ease)(clamp01((p - p0) / (p1 - p0))));
export const tb = (a, b, ease = 'slam', b0 = 0, b1 = 1) => (p, lt, bt) => lerp(a, b, ez(ease)(clamp01((bt - b0) / (b1 - b0))));
// keyframes over progress: seq([0, v0], [0.3, v1, 'out5'], [1, v2]) — the ease belongs to the segment that ends at that key
const keys = (ks, pick) => (p, lt, bt) => { const x = pick(p, lt, bt); if (x <= ks[0][0]) return ks[0][1]; for (let i = 1; i < ks.length; i++) if (x <= ks[i][0]) return lerp(ks[i - 1][1], ks[i][1], ez(ks[i][2] || 'out')((x - ks[i - 1][0]) / (ks[i][0] - ks[i - 1][0] || 1))); return ks[ks.length - 1][1]; };
export const seq = (...ks) => keys(ks, (p) => p);
export const seqb = (...ks) => keys(ks, (p, lt, bt) => bt);
export const on = (beat, before, after) => (p, lt, bt) => (bt >= beat ? after : before);     // a value that switches on a beat
export const stepped = (fn, n) => (p, lt, bt) => fn(Math.floor(p * n) / n, lt, bt);              // hold a move on n poses
export const val = (v, p, lt, b) => (typeof v === 'function' ? v(p, lt, b) : v);
export { rng };

class Layer {
  constructor(film, shot, name) { this.film = film; this.shot = shot; this.name = name; }
  add(kind, o) { const el = { kind, layer: this.name, o, shot: this.shot }; this.shot.els.push(el); return el; }
  // words. text may contain \n. size = em height in units (or w / h = fit the ink box). See references/ENGINE.md → type
  type(text, o = {}) { return this.add('type', { ...o, text: String(text) }); }
  // a picture: a painter (g, w, h, K) => …, an image URL, or a texture, on a w × h plane
  img(src, o = {}) { return this.add('img', { ...o, src }); }
  rect(o = {}) { return this.add('rect', o); }
  // a prop: a name registered with F.prop, a (K) => Object3D function, or an Object3D. World layer only.
  obj(what, o = {}) { if (this.name !== 'world') throw new Error(`shot "${this.shot.name}": props live in the 3D world, not in S.${this.name}`); return this.add('obj', { ...o, what }); }
}

export class Film {
  constructor(o = {}) {
    this.o = { size: [1350, 1080], fps: 30, bpm: 120, paper: '#e8e8e6', ink: '#0b0b0b', colors: { red: '#d81e3a' }, tints: {}, fonts: {}, score: {}, ...o };
    const q = (this.q = new URLSearchParams(location.search));
    this.RENDER = q.get('render') === '1'; this.scale = +(q.get('scale') || 1);
    [this.W, this.H] = this.o.size; this.A = this.W / this.H; this.FPS = this.o.fps; this.BEAT = 60 / this.o.bpm;
    this.palette = { paper: this.o.paper, ink: this.o.ink, ...this.o.colors };   // what type, bars and grounds may use
    this.tints = { ...this.o.tints };                                               // extra named colours for props and pictures only
    this.offPalette = new Set(); this._col = new Map();
    this.ts = new Typesetter(this.o.fonts); this.K = makeKit(this);
    this.shots = []; this.props = new Map(); this.rules = []; this.off = new Set((q.get('off') || '').split(',').filter(Boolean));
  }
  col(name) {
    if (name && name.isColor) return name;
    if (!this._col.has(name)) this._col.set(name, new THREE.Color(this.palette[name] || this.tints[name] || name));
    return this._col.get(name);
  }
  // a colour for type, a bar or a ground: must be paper, ink or an accent (runChecks reports the others)
  ecol(name) { if (typeof name === 'string' && !(name in this.palette)) this.offPalette.add(name); return this.col(name); }
  prop(name, build) { this.props.set(name, build); return this; }
  shot(name, o, build) { if (typeof o === 'function') { build = o; o = {}; } this.shots.push({ name, o: { beats: 1, ...o }, build, els: [] }); return this; }
  check(name, fn) { this.rules.push([name, fn]); return this; }
  makeProp(name) { const b = this.props.get(name); if (!b) throw new Error(`no prop "${name}" (props: ${[...this.props.keys()].join(', ') || 'none'})`); const ob = b(this.K); ob.name = name; return ob; }
  measure(text, font = 'sans', o = {}) { const r = this.ts.record(text, font, { align: 'left', ...o }); return { w: r.ink.w, h: r.ink.h, adv: r.adv }; }

  // ------------------------------------------------------------------ build
  _stage() {
    const cv = document.querySelector('#frame') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'frame' }));
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true, alpha: false }));
    r.setPixelRatio(1); r.setSize(Math.round(this.W * this.scale), Math.round(this.H * this.scale), false); r.autoClear = false;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.toneMapping = THREE.NoToneMapping;
    this.frame = cv;
    const css = document.createElement('style');
    css.textContent = this.RENDER ? 'html,body{margin:0;background:#000}#frame{display:block}' : `html,body{margin:0;height:100%;background:#101010;overflow:hidden}#frame{position:fixed;inset:0;margin:auto;max-width:100vw;max-height:100vh;width:auto;height:auto;aspect-ratio:${this.W}/${this.H};${this.A > 1 ? 'width:min(100vw,calc(100vh*' + this.A + '))' : 'height:min(100vh,calc(100vw/' + this.A + '))'}}#ktc-hud{position:fixed;left:10px;bottom:8px;font:12px/1.4 ui-monospace,monospace;color:#9a9a9a;white-space:pre;pointer-events:none}`;
    document.head.appendChild(css);
    this.scene = new THREE.Scene(); this.under = new THREE.Scene(); this.over = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(32, this.A, 0.05, 600);
    this.ocam = new THREE.OrthographicCamera(-this.A, this.A, 1, -1, -100, 100);
    this.hemi = new THREE.HemisphereLight('#ffffff', '#c9c9c4', FILL); this.scene.add(this.hemi);
    const k = (this.key = new THREE.DirectionalLight('#ffffff', KEY)); k.castShadow = true; k.shadow.mapSize.set(2048, 2048); k.shadow.bias = -0.0003; k.shadow.normalBias = 0.012; k.shadow.radius = 5; k.shadow.camera.near = 1; k.shadow.camera.far = 120;
    this.scene.add(k, k.target);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.2, depthWrite: false }));   // the floor only shows the shadow: it must not hide what dips below it this.ground.rotation.x = -Math.PI / 2; this.ground.receiveShadow = true; this.scene.add(this.ground);
    this.scene.environment = studioEnv(r); this.scene.environmentIntensity = ENV;
    // the inset frame's own ground (a colour or a top → bottom gradient)
    this.gradMat = new THREE.ShaderMaterial({ uniforms: { a: { value: new THREE.Color() }, b: { value: new THREE.Color() } }, depthTest: false, depthWrite: false, vertexShader: 'varying float v; void main(){ v = uv.y; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform vec3 a; uniform vec3 b; varying float v; void main(){ gl_FragColor = vec4(mix(b, a, v), 1.0);\n#include <colorspace_fragment>\n}' });
    this.gradScene = new THREE.Scene(); const gq = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.gradMat); gq.frustumCulled = false; this.gradScene.add(gq);
    this.stage = new THREE.Group(); this.scene.add(this.stage);                       // the prop sheet's turntable
  }
  _build(dry) {
    const loads = [];
    for (const sc of [this.scene, this.under, this.over]) for (const s of this.shots) if (s.groups) sc.remove(s.groups.world, s.groups.under, s.groups.over);
    for (const s of this.shots) {
      s.els = []; s.groups = { world: new THREE.Group(), under: new THREE.Group(), over: new THREE.Group() };
      const S = new Layer(this, s, 'world'); S.under = new Layer(this, s, 'under'); S.over = new Layer(this, s, 'over');
      S.beats = s.o.beats; S.K = this.K; S.F = this;
      s.build && s.build(S, this.K);
      for (const el of s.els) { this['_' + el.kind](el, dry, loads); if (el.node) { el.node.visible = false; s.groups[el.layer].add(el.node); } }
      this.scene.add(s.groups.world); this.under.add(s.groups.under); this.over.add(s.groups.over);
    }
    if (dry) for (const b of this.props.values()) { try { b(this.K); } catch (e) { throw new Error('a prop failed to build: ' + e.message); } }
    return loads;
  }
  _type(el, dry) {
    const o = el.o, ts = this.ts, font = o.font || 'sans';
    if (dry) { ts.css(font, 10); return; }
    const color = this.ecol(typeof o.color === 'function' ? 'ink' : o.color || 'ink'), g = (el.node = new THREE.Group());
    const ax = o.anchor ? o.anchor[0] : o.align === 'left' ? 0 : o.align === 'right' ? 1 : 0.5, ay = o.anchor ? o.anchor[1] : 0.5;
    el.mats = [];
    if (!o.chars) {
      const bp = o.pad || [0.16, 0.12];
      const rec = ts.record(o.text, font, { px: o.px, track: o.track, lh: o.lh, align: o.align || 'center', pad: o.box ? Math.max(bp[0], bp[1]) : 0, pixel: o.pixel });
      const s = o.size ?? (o.w ? o.w / rec.ink.w : o.h ? o.h / rec.ink.h : 1), mat = ts.material(rec, color, { box: o.box ? this.ecol(o.box) : null, boxPad: bp, outline: o.outline }), m = ts.mesh(rec, s, mat);
      m.position.x -= (rec.ink.x0 + ax * rec.ink.w) * s; m.position.y += (rec.ink.y0 + (1 - ay) * rec.ink.h) * s;
      g.add(m); el.mats.push(mat); el.size = s; el.box = { w: rec.ink.w * s, h: rec.ink.h * s, ax, ay };
    } else {
      const px = o.px || ts.fonts[font]?.px || 192, items = []; let pen = 0, gap = 0, y0 = 1e9, y1 = -1e9;
      for (const ch of [...o.text]) {
        const adv = ts.advance(ch, font, px, o.track || 0);
        if (!ch.trim()) { gap += adv; pen += adv; continue; }
        const rec = ts.record(ch, font, { px, align: 'left', pixel: o.pixel }); items.push({ ch, rec, adv, gap }); gap = 0; pen += adv;
        y0 = Math.min(y0, rec.ink.y0); y1 = Math.max(y1, rec.ink.y0 + rec.ink.h);
      }
      const total = pen - (o.track || 0), s = o.size ?? (o.w ? o.w / total : o.h ? o.h / (y1 - y0) : 1);
      for (const it of items) {
        const G = new THREE.Group(), mat = ts.material(it.rec, color, { outline: o.outline }), m = ts.mesh(it.rec, s, mat), cx = it.rec.ink.x0 + it.rec.ink.w / 2, cy = it.rec.ink.y0 + it.rec.ink.h / 2;
        m.position.x -= cx * s; m.position.y += cy * s; G.add(m); g.add(G); el.mats.push(mat);
        it.G = G; it.mat = mat; it.off = cx * s; it.advS = it.adv * s; it.gapS = it.gap * s; it.y = -(cy - (y0 + (1 - ay) * (y1 - y0))) * s;
      }
      el.items = items; el.total = total * s; el.size = s; el.box = { w: total * s, h: (y1 - y0) * s, ax, ay };
    }
  }
  _obj(el, dry) {
    const o = el.o; if (dry) return;
    const ob = typeof o.what === 'string' ? this.makeProp(o.what) : typeof o.what === 'function' ? o.what(this.K) : o.what;
    ob.traverse((m) => { if (m.isMesh) { m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false; } });
    el.node = new THREE.Group(); el.node.add(ob);
  }
  _img(el, dry, loads) {
    const o = el.o, K = this.K, w = o.w ?? 1; let h = o.h ?? w, tex;
    if (typeof o.src === 'function') {
      const res = o.res ?? 1024, k = res / Math.max(w, h), bw = (o.cut || 0) * k;
      tex = K.paint(w * k, h * k, (g, W, H) => {
        g.save(); if (bw) { g.translate(bw * 1.3, bw * 1.3); g.scale((W - bw * 2.6) / W, (H - bw * 2.6) / H); } o.src(g, W, H, K); g.restore();
        if (bw) {   // die-cut: the painted shape with a border all round, like a sticker or a road sign
          const copy = (c) => { const d = document.createElement('canvas'); d.width = W; d.height = H; d.getContext('2d').drawImage(c, 0, 0); return d; };
          const a = copy(g.canvas), sil = copy(a), sg = sil.getContext('2d'); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = K.css(o.cutColor || 'paper'); sg.fillRect(0, 0, W, H);
          g.clearRect(0, 0, W, H); for (let i = 0; i < 32; i++) g.drawImage(sil, Math.cos((i / 32) * 6.2832) * bw, Math.sin((i / 32) * 6.2832) * bw); g.drawImage(sil, 0, 0); g.drawImage(a, 0, 0);
        }
      });
    } else if (o.src && o.src.isTexture) tex = o.src;
    if (dry) return;
    const mat = o.lit ? new THREE.MeshStandardMaterial({ map: tex || null, roughness: 0.6, side: THREE.DoubleSide, transparent: true, alphaTest: 0.03 }) : new THREE.MeshBasicMaterial({ map: tex || null, side: THREE.DoubleSide, transparent: true, alphaTest: 0.03 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.scale.set(w, h, 1); el.node = new THREE.Group(); el.node.add(m); el.box = { w, h, ax: 0.5, ay: 0.5 };
    if (typeof o.src === 'string') loads.push(new THREE.TextureLoader().loadAsync(o.src).then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; mat.map = t; mat.needsUpdate = true; if (o.h == null) { h = (w * t.image.height) / t.image.width; m.scale.y = h; el.box.h = h; } }, () => { throw new Error(`shot "${el.shot.name}": image ${o.src} did not load`); }));
  }
  _rect(el, dry) {
    const o = el.o; if (dry) return;
    const mat = new THREE.MeshBasicMaterial({ color: this.ecol(typeof o.color === 'function' ? 'ink' : o.color || 'ink'), side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.scale.set(o.w ?? 1, o.h ?? 1, 1); el.node = new THREE.Group(); el.node.add(m); el.mat = mat; el.box = { w: o.w ?? 1, h: o.h ?? 1, ax: 0.5, ay: 0.5 };
  }

  // ------------------------------------------------------------------ one frame
  _el(el, p, lt, b) {
    const o = el.o, n = el.node; if (!n) return;
    if (o.show) { const s = val(o.show, p, lt, b); if (!(b >= s[0] && b < (s[1] ?? 1e9))) { n.visible = false; return; } }
    n.visible = true;
    const at = val(o.at, p, lt, b) || [0, 0, 0]; n.position.set(at[0], at[1], at[2] || 0);
    const rot = val(o.rot, p, lt, b) || [0, 0, 0], sp = o.spin || [0, 0, 0];
    if (o.face && el.layer === 'world') { n.quaternion.copy(this.cam.quaternion); n.rotateZ((rot[2] + sp[2] * lt) * D); } else n.rotation.set((rot[0] + sp[0] * lt) * D, (rot[1] + sp[1] * lt) * D, (rot[2] + sp[2] * lt) * D);
    const sc = val(o.scale, p, lt, b); if (sc == null) n.scale.setScalar(1); else if (Array.isArray(sc)) n.scale.set(sc[0], sc[1], sc[2] ?? 1); else n.scale.setScalar(sc);
    if (el.kind === 'type') {
      if (typeof o.color === 'function') { const c = this.ecol(o.color(p, lt, b)); for (const m of el.mats) m.uniforms.uColor.value.copy(c); }
      if (el.items) {
        const N = el.items.length, ev = o.each ? el.items.map((it, i) => o.each(i, N, p, lt, b) || {}) : null;
        let sum = 0, gaps = 0; el.items.forEach((it, i) => { sum += it.advS * (ev?.[i].sx ?? 1); gaps += it.gapS; });
        const f = o.fit === false || !ev ? 1 : (el.total - gaps) / sum, width = o.fit === false && ev ? sum + gaps : el.total; let pen = 0;
        el.items.forEach((it, i) => {
          const e = ev ? ev[i] : {}, sx = (e.sx ?? 1) * f; pen += it.gapS;
          const G = it.G, a = e.at || [0, 0, 0], r = e.rot || [0, 0, 0], s = e.scale ?? 1;
          G.visible = e.show !== false; G.position.set(pen + it.off * sx - el.box.ax * width + a[0], it.y + a[1], a[2] || 0); pen += it.advS * sx;
          G.rotation.set(r[0] * D, r[1] * D, r[2] * D);
          if (Array.isArray(s)) G.scale.set(s[0] * sx, s[1], 1); else G.scale.set(s * sx, s, 1);
          if (e.color) it.mat.uniforms.uColor.value.copy(this.ecol(e.color)); else if (typeof o.color !== 'function') it.mat.uniforms.uColor.value.copy(this.col(o.color || 'ink'));
        });
      }
    } else if (el.kind === 'rect' && typeof o.color === 'function') el.mat.color.copy(this.ecol(o.color(p, lt, b)));
  }
  shotAt(t) { const s = this.shots; let i = 0; while (i < s.length - 1 && t >= s[i].t1) i++; const sh = s[i], lt = Math.max(0, t - sh.t0); return { i, name: sh.name, lt, p: clamp01(lt / sh.dur), b: lt / this.BEAT, shot: sh }; }
  // set every transform for time t (no drawing)
  pose(t) {
    t = Math.max(0, Math.min(this.DURATION - 1e-6, t));
    const { shot: sh, lt, p, b } = this.shotAt(t), o = sh.o, c = o.cam || {}, v = (x, d) => (x === undefined ? d : val(x, p, lt, b));
    for (const s of this.shots) { const on = s === sh && !this._propView; s.groups.world.visible = on && !this.off.has('world'); s.groups.under.visible = on && !this.off.has('under'); s.groups.over.visible = on && !this.off.has('over'); }
    this.stage.visible = !!this._propView;
    const fr = (this.fr = o.frame ? v(o.frame) : null), cam = this.cam, tg = v(c.target, [0, 0, 0]);
    if (c.pos) cam.position.set(...v(c.pos));
    else { const yaw = v(c.yaw, 0) * D, pitch = Math.max(-89.5, Math.min(89.5, v(c.pitch, 0))) * D, dist = v(c.dist, 10) * (1 + (c.punch || 0) * Math.exp(-lt * 16)); cam.position.set(tg[0] + dist * Math.sin(yaw) * Math.cos(pitch), tg[1] + dist * Math.sin(pitch), tg[2] + dist * Math.cos(yaw) * Math.cos(pitch)); }
    cam.up.set(0, 1, 0); cam.lookAt(tg[0], tg[1], tg[2]); cam.rotateZ(v(c.roll, 0) * D); cam.fov = v(c.fov, 32); cam.aspect = fr ? (fr[2] / fr[3]) : this.A; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    for (const el of sh.els) this._el(el, p, lt, b);
    const L = o.light || {}, az = (L.az ?? AZ) * D, el = (L.el ?? EL) * D, span = L.span ?? 12, k = this.key;
    k.intensity = L.key ?? KEY; this.hemi.intensity = L.fill ?? FILL; this.scene.environmentIntensity = L.env ?? ENV; k.target.position.set(tg[0], tg[1], tg[2]); k.position.set(tg[0] + 40 * Math.sin(az) * Math.cos(el), tg[1] + 40 * Math.sin(el), tg[2] + 40 * Math.cos(az) * Math.cos(el));
    const sc = k.shadow.camera; if (sc.right !== span) { sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.updateProjectionMatrix(); }
    const gy = v(o.ground, null); this.ground.visible = typeof gy === 'number' && !this.off.has('ground'); if (this.ground.visible) { this.ground.position.y = gy; this.ground.material.opacity = o.shadow ?? 0.2; }
    this.bg = this.ecol(v(o.bg, 'paper')); this.cur = { sh, lt, p, b, t };
  }
  draw() {
    const r = this.renderer, w = this.frame.width, h = this.frame.height, fr = this.fr, sh = this.cur.sh;
    r.setScissorTest(false); r.setViewport(0, 0, w, h); r.setClearColor(this.bg, 1); r.clear(true, true, true);
    r.render(this.under, this.ocam);
    if (fr && !this._propView) {
      const x = Math.round(((fr[0] - fr[2] / 2 + this.A) / (2 * this.A)) * w), y = Math.round(((fr[1] - fr[3] / 2 + 1) / 2) * h), fw = Math.round((fr[2] / (2 * this.A)) * w), fh = Math.round((fr[3] / 2) * h);
      r.setViewport(x, y, fw, fh); r.setScissor(x, y, fw, fh); r.setScissorTest(true);
      const fb = sh.o.frameBg ?? 'paper', a = this.col(Array.isArray(fb) ? fb[0] : fb), b = this.col(Array.isArray(fb) ? fb[1] : fb);
      this.gradMat.uniforms.a.value.copy(a); this.gradMat.uniforms.b.value.copy(b); r.clear(false, true, true); r.render(this.gradScene, this.ocam);
    }
    r.clearDepth(); r.render(this.scene, this.cam);
    r.setScissorTest(false); r.setViewport(0, 0, w, h); r.clearDepth(); r.render(this.over, this.ocam);
  }
  renderAt(t) { this._propView = null; this.pose(t); this.draw(); }
  // where an element is on screen at time t: { x0, y0, x1, y1 } as fractions of the frame (y down), behind = a corner is behind the camera
  screenBox(el, t) {
    this._propView = null; this.pose(t); if (!el.node || !el.box) return null;
    if (!el.node.visible) return { hidden: true };
    el.node.updateWorldMatrix(true, false);
    const { w, h, ax, ay } = el.box, cam = el.layer === 'world' ? this.cam : this.ocam, fr = el.layer === 'world' ? this.fr : null; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, behind = false;
    for (const [lx, ly] of [[-ax * w, -ay * h], [(1 - ax) * w, -ay * h], [-ax * w, (1 - ay) * h], [(1 - ax) * w, (1 - ay) * h]]) {
      const P = new THREE.Vector3(lx, ly, 0).applyMatrix4(el.node.matrixWorld), V = P.clone().applyMatrix4(cam.matrixWorldInverse); if (cam.isPerspectiveCamera && V.z > -cam.near) behind = true;
      P.project(cam); let X = P.x, Y = P.y;
      if (fr) { X = (fr[0] + (X * fr[2]) / 2) / this.A; Y = fr[1] + (Y * fr[3]) / 2; }
      const fx = (X + 1) / 2, fy = (1 - Y) / 2; x0 = Math.min(x0, fx); x1 = Math.max(x1, fx); y0 = Math.min(y0, fy); y1 = Math.max(y1, fy);
    }
    return { x0, y0, x1, y1, behind };
  }
  // the prop sheet: one prop alone on paper, on a turntable
  showProp(name, yaw = 30, pitch = 16) {
    this.pose(0); this._propView = name; for (const s of this.shots) s.groups.world.visible = s.groups.under.visible = s.groups.over.visible = false;
    this.stage.clear(); const ob = this.makeProp(name); ob.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); this.stage.add(ob); this.stage.visible = true;
    const bb = new THREE.Box3().setFromObject(ob), c = bb.getCenter(new THREE.Vector3()), rad = bb.getSize(new THREE.Vector3()).length() / 2 || 1, cam = this.cam, dist = (rad / Math.sin((14 * D))) * 1.05;
    cam.fov = 28; cam.aspect = this.A; cam.position.set(c.x + dist * Math.sin(yaw * D) * Math.cos(pitch * D), c.y + dist * Math.sin(pitch * D), c.z + dist * Math.cos(yaw * D) * Math.cos(pitch * D)); cam.up.set(0, 1, 0); cam.lookAt(c); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    this.ground.visible = true; this.ground.position.y = bb.min.y - 0.001; this.ground.material.opacity = 0.2;
    const k = this.key, span = rad * 1.6, sc = k.shadow.camera; k.intensity = KEY; this.hemi.intensity = FILL; this.scene.environmentIntensity = ENV; k.target.position.copy(c); k.position.set(c.x - 15, c.y + 27, c.z + 26); sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.updateProjectionMatrix();
    this.fr = null; this.bg = this.col('paper'); this.cur = { sh: this.shots[0] }; this.draw(); this._propView = null; this.stage.clear();
  }

  // ------------------------------------------------------------------ rules the page can prove without pixels
  runChecks() {
    const fail = [], warn = [], info = [], fps = this.FPS, n = this.shots.length, mean = this.DURATION / n, units = (s) => (s.match(/[가-힣0-9]/g) || []).length + (s.match(/[A-Za-z]+/g) || []).length * 1.5;
    info.push(`${n} shots · mean ${mean.toFixed(2)} s · ${this.o.bpm} bpm · ${this.W} × ${this.H}`);
    if (mean > 1.25) fail.push(`shots average ${mean.toFixed(2)} s — this style cuts on the beat (mean ≤ 1.25 s): split the long shots`);
    let noType = 0;
    for (const s of this.shots) {
      if (s.dur < 2 / fps - 1e-6) fail.push(`${s.name}: ${(s.dur * fps).toFixed(1)} frames — a shot needs at least 2`);
      if (s.dur > 2.6 && !s.o.hold) warn.push(`${s.name}: ${s.dur.toFixed(2)} s is long for this style (add hold: true if it is the end card)`);
      if (!s.els.length) fail.push(`${s.name}: empty shot`);
      const ty = s.els.filter((e) => e.kind === 'type'); noType = ty.length ? 0 : noType + 1;
      if (noType === 3) warn.push(`${s.name}: three shots in a row without a word — the type leads this style`);
      for (const el of ty.filter((e) => e.o.read)) {
        const w = typeof el.o.show === 'function' || !el.o.show ? [0, s.o.beats] : [Math.max(0, el.o.show[0]), Math.min(s.o.beats, el.o.show[1] ?? s.o.beats)], d = (w[1] - w[0]) * this.BEAT, need = Math.max(0.3, 0.085 * units(el.o.text)), label = `${s.name}: "${el.o.text.replace(/\n/g, ' / ')}"`;
        if (d < need - 1e-3) fail.push(`${label} is on for ${d.toFixed(2)} s — it needs ${need.toFixed(2)} s to be read (fewer words, or more beats)`);
        let ok = 0, last = null;
        for (const k of [0.35, 0.6, 0.9]) { const b = this.screenBox(el, s.t0 + (w[0] + (w[1] - w[0]) * k) * this.BEAT); last = b; if (b && !b.hidden && !b.behind && b.x0 > 0.012 && b.y0 > 0.012 && b.x1 < 0.988 && b.y1 < 0.988 && (b.y1 - b.y0) * this.H >= 24 && (b.x1 - b.x0) * this.W >= 24) ok++; }
        if (ok < 2) fail.push(`${label} is marked read but is not whole inside the frame for most of its time (box ${last && !last.hidden ? [last.x0, last.y0, last.x1, last.y1].map((x) => x.toFixed(2)).join(' ') : 'hidden'})`);
      }
    }
    const acc = Object.keys(this.o.colors); if (acc.length > 3) warn.push(`${acc.length} accent colours (${acc.join(', ')}) — the style is paper, ink and at most three primaries`);
    if (this.offPalette.size) warn.push(`colours outside the palette: ${[...this.offPalette].join(', ')} — type, bars and grounds use paper, ink and the accents (props and pictures may use tints)`);
    for (const [name, fn] of this.rules) { let r; try { r = fn(this); } catch (e) { r = 'threw ' + e.message; } if (r !== true && r !== undefined) fail.push(`${name}${typeof r === 'string' ? ': ' + r : ''}`); }
    this.renderAt(0); return { fail, warn, info };
  }
  cues() { return { duration: this.DURATION, bpm: this.o.bpm, beat: this.BEAT, score: this.o.score || {}, shots: this.shots.map((s) => ({ t: s.t0, dur: s.dur, beats: s.o.beats, name: s.name, mix: s.o.mix || 'full', sfx: s.o.sfx || null, accent: !!s.o.accent })) }; }

  // ------------------------------------------------------------------ start
  async start() {
    this._stage();
    this._build(true); await this.ts.load();
    let loads = [];
    for (let pass = 0; pass < 3; pass++) { loads = this._build(false); if (!(await this.ts.load())) break; this.ts.cache.clear(); }
    if (this.ts.failed.length) throw new Error('fonts failed to load: ' + this.ts.failed.join('; '));
    await Promise.all(loads);
    let t = 0; for (const s of this.shots) { s.dur = s.o.beats * this.BEAT; s.t0 = t; t += s.dur; s.t1 = t; }
    this.DURATION = t;
    const W = window;
    W.film = this; W.DURATION = t; W.FPS = this.FPS; W.SIZE = { W: this.W, H: this.H }; W.seek = W.renderAt = (x) => this.renderAt(x);
    W.shotAt = (x) => { const s = this.shotAt(x); return { i: s.i, name: s.name, lt: s.lt, p: s.p, b: s.b }; }; W.runChecks = () => this.runChecks(); W.cues = () => this.cues(); W.showProp = (n, y, p) => this.showProp(n, y, p);
    const q = this.q; this.renderAt(+(q.get('t') || 0));
    if (!this.RENDER && !q.has('t')) this._play();
    W.READY = true; return this;
  }
  // the live page: loops; space = pause, ← → = previous / next shot, L = loop the current shot, ?shot=name, ?speed=.5, ?hud=1, ?audio=out/film.wav
  _play() {
    const q = this.q, speed = +(q.get('speed') || 1); let lock = q.get('shot'), paused = false, cur = 0, last = performance.now();
    const find = (k) => this.shots.find((s) => s.name === k) || this.shots[+k];
    const hud = q.get('hud') === '1' ? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'ktc-hud' })) : null;
    const au = q.get('audio') || this.o.audio; let audio = null;
    if (au) { audio = new Audio(au); audio.loop = true; addEventListener('pointerdown', () => { if (audio.paused) { audio.currentTime = cur; audio.play().catch(() => {}); } }, { once: false }); }
    addEventListener('keydown', (e) => {
      const i = this.shotAt(cur).i;
      if (e.key === ' ') { paused = !paused; if (audio) paused ? audio.pause() : audio.play().catch(() => {}); e.preventDefault(); } else if (e.key === 'ArrowRight') cur = this.shots[(i + 1) % this.shots.length].t0 + 1e-4; else if (e.key === 'ArrowLeft') cur = this.shots[(i - 1 + this.shots.length) % this.shots.length].t0 + 1e-4; else if (e.key === 'l' || e.key === 'L') lock = lock ? null : this.shots[i].name; else return;
      if (lock && e.key.startsWith('Arrow')) lock = this.shotAt(cur).name; if (audio && e.key.startsWith('Arrow')) audio.currentTime = cur;
    });
    if (lock && find(lock)) cur = find(lock).t0;
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000) * speed; last = now;
      if (audio && !audio.paused && !lock) cur = audio.currentTime % this.DURATION; else if (!paused) cur += dt;
      const s = lock && find(lock); if (s) { if (cur >= s.t1 || cur < s.t0) cur = s.t0 + ((cur - s.t0) % s.dur + s.dur) % s.dur; } else if (cur >= this.DURATION) cur %= this.DURATION;
      this.renderAt(cur); if (hud) { const a = this.shotAt(cur); hud.textContent = `${String(a.i + 1).padStart(2, '0')}/${this.shots.length}  ${a.name}${lock ? '  (loop)' : ''}\n${cur.toFixed(2)} s  beat ${a.b.toFixed(2)}`; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
