// agent-launch-film · film.js — the engine. A film is a list of scenes on one soft, bright 3D stage: each scene places
// UI pieces (built with kit.js) at world positions, a camera looks at them, depth of field blurs what is off the focal
// plane, glows breathe behind, and scenes hand over by moving (recede / push / whip), never by a hard cut.
// Every frame is a pure function of t: window.seek(t) sets every style from t alone.
//
//   import { Film, K, E, tw } from 'alf/film.js';
//   const F = new Film({ W: 1920, H: 1080, brand: { accent: '#E8622A' }, mascot: MASCOT, score: { bpm: 100 } });
//   F.scene('hello', { dur: 4, cam: [[0, { z: -1150 }], [4, { z: -1000 }]] }, (S) => {
//     S.add(K.headline('Meet *Tally*'), { at: [0, -300, 0], in: 0.2, read: true });
//   });
//   F.start();
import { K, setFilm } from './kit.js';
export { K };

export const E = {
  lin: (p) => p,
  out: (p) => 1 - (1 - p) ** 3,
  in: (p) => p * p * p,
  inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2),
  soft: (p) => p * p * (3 - 2 * p),
  expo: (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p)),
  back: (p) => { const c = 1.5; return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2; },
  spring: (p) => (p >= 1 ? 1 : 1 - Math.exp(-7 * p) * Math.cos(9 * p)),   // ~9 % overshoot, settles by p = 1
};
export const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, p) => a + (b - a) * p;
export const tw = (t, [t0, t1], a = 0, b = 1, e = E.inOut) => a + (b - a) * e(cl((t - t0) / (t1 - t0 || 1e-6)));
export const rng = (seed = 1) => { let s = seed >>> 0 || 1; return () => { s = (s + 0x6d2b79f5) >>> 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };

// keyframes: [[t, { x, y, z, rx, ry, rz, s, o, ease }], …] → a value at t. Later keys inherit what they leave out.
const POSE0 = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, o: 1 };
export function normKeys(list, base = {}) {
  if (!list || !list.length) return null;
  let prev = { ...base };
  return list.map(([t, k]) => { prev = { ...prev, ...k }; return [t, prev]; });
}
export function atKeys(list, t, ease = E.inOut) {
  if (!list) return {};
  if (t <= list[0][0]) return list[0][1];
  for (let i = 1; i < list.length; i++) {
    const [t1, b] = list[i];
    if (t <= t1) {
      const [t0, a] = list[i - 1], e = E[b.ease] || ease, p = e(cl((t - t0) / (t1 - t0 || 1e-6))), o = {};
      for (const k in b) o[k] = typeof b[k] === 'number' && typeof a[k] === 'number' ? lerp(a[k], b[k], p) : b[k];
      return o;
    }
  }
  return list[list.length - 1][1];
}

const Q = new URLSearchParams(location.search);
const CSS_URL = new URL('./film.css', import.meta.url).href;
const CAM0 = { x: 0, y: 0, z: -1000, rz: 0 };

// enter / exit offsets: what is added to the pose at p = 0 (enter) or p = 1 (exit)
const ENTER = {
  rise: { y: 46, s: 0.965, o: 0, blur: 14 },
  pop: { s: 0.55, o: 0, blur: 6 },
  fly: { z: 900, o: 0, blur: 22 },
  drop: { y: -90, o: 0, blur: 10, rx: -14 },
  left: { x: -260, o: 0, blur: 16, ry: 18 },
  right: { x: 260, o: 0, blur: 16, ry: -18 },
  fade: { o: 0, blur: 12 },
  none: {},
};
const EXIT = {
  recede: { z: 650, o: 0, blur: 18, y: -30 },
  fall: { y: 140, o: 0, blur: 14, rx: 12 },
  rise: { y: -120, o: 0, blur: 14 },
  past: { z: -900, o: 0, blur: 20 },
  fade: { o: 0, blur: 10 },
  left: { x: -320, o: 0, blur: 18, ry: 16 },
  right: { x: 320, o: 0, blur: 18, ry: -16 },
  none: {},
};

export class Film {
  constructor(o = {}) {
    this.W = +(o.W || 1920); this.H = +(o.H || 1080); this.fps = o.fps || 30;
    this.title = o.title || document.title || 'film';
    this.brand = { accent: '#E8622A', ground: '#EDECE9', ink: '#1C1C1F', glow: null, cool: '#B9C6F2', ...(o.brand || {}) };
    this.brand.glow = this.brand.glow || this.brand.accent;
    this.mascot = o.mascot || null;
    this.score = o.score || {};
    this.focal = o.focal || 1000;
    this.dof = o.dof ?? 14;                 // px of blur at twice the focus distance
    this.scenes = []; this.userChecks = []; this.cueList = []; this.els = [];
    this.U = (this.H / 1080);               // all kit sizes are designed for a 1080-tall frame
    setFilm(this);
  }
  scene(name, opts, build) {
    if (typeof opts === 'function') { build = opts; opts = {}; }
    this.scenes.push({ name, dur: 4, xf: 0.6, out: 'recede', cut: false, glow: null, ...opts, build, els: [] });
    return this;
  }
  check(name, fn) { this.userChecks.push({ name, fn }); return this; }
  cue(t, kind, g = 1, extra = {}) { this.cueList.push({ t: +t.toFixed(4), kind, g, ...extra }); }

  async start() {
    // DOM: #frame > glows, world, grain, hud
    if (!document.querySelector(`link[href="${CSS_URL}"]`)) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = CSS_URL; document.head.appendChild(l); await new Promise((r) => { l.onload = r; l.onerror = r; }); }
    const b = this.brand, root = document.documentElement.style;
    root.setProperty('--accent', b.accent); root.setProperty('--ground', b.ground); root.setProperty('--ink', b.ink);
    root.setProperty('--accent-rgb', hexRgb(b.accent).join(','));
    if (b.accent2) root.setProperty('--accent2', b.accent2);
    const fr = this.frame = document.querySelector('#frame') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'frame' }));
    fr.classList.add('alf-frame'); fr.style.width = this.W + 'px'; fr.style.height = this.H + 'px';
    fr.style.setProperty('--u', this.U);
    fr.innerHTML = '<div class="alf-glows"></div><div class="alf-world"></div><div class="alf-grain"></div><div class="alf-hud"></div>';
    this.glowL = fr.querySelector('.alf-glows'); this.world = fr.querySelector('.alf-world'); this.hud = fr.querySelector('.alf-hud');
    fr.querySelector('.alf-grain').style.backgroundImage = `url(${grain()})`;
    await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));
    await document.fonts.ready;
    // scenes: timing, then build (fonts are in, so pieces can measure themselves)
    let t = 0;
    this.scenes.forEach((s, i) => {
      const next = this.scenes[i + 1];
      if (s.cut || !next || next.cut) s.xf = next && !next.cut && !s.cut ? s.xf : 0;
      s.xf = Math.min(s.xf, s.dur / 2);
      s.i = i; s.t0 = t; s.prev = this.scenes[i - 1] || null;
      s.camK = normKeys(s.cam || [[0, {}]], CAM0);
      t += s.dur - s.xf;
    });
    const last = this.scenes[this.scenes.length - 1];
    this.duration = last ? last.t0 + last.dur : 1;
    for (const s of this.scenes) {
      const S = this._sceneApi(s);
      s.build(S);
      if (s.i > 0) this.cue(s.t0, s.prev.out === 'whip' ? 'whip' : 'swish', 0.7);
    }
    for (const el of this.els) el.comp.layout?.(el);
    this.cueList.sort((a, b) => a.t - b.t);
    this._expose();
    if (Q.has('render')) { document.body.classList.add('alf-render'); }
    else this._live();
    const t0 = Q.has('t') ? +Q.get('t') : 0;
    this.seek(t0);
    window.READY = true;
  }

  _sceneApi(s) {
    const F = this, R = rng(hash(s.name));
    const S = {
      F, K, scene: s, dur: s.dur, rng: R, E, tw,
      add(comp, o = {}) {
        if (Array.isArray(comp)) return comp.map((c) => S.add(c, o));
        const node = document.createElement('div'); node.className = 'alf-el' + (o.cls ? ' ' + o.cls : '');
        node.appendChild(comp.node); (o.hud ? F.hud : F.world).appendChild(node);
        const at = o.at || [0, 0, 0];
        const el = {
          id: F.els.length, comp, node, scene: s, hud: !!o.hud, sharp: !!(o.sharp || o.hud), read: o.read ?? !!comp.read, bleed: !!o.bleed,
          in: o.in ?? 0, out: o.out ?? s.dur + 1, readFrom: o.readFrom,
          enter: typeof o.enter === 'object' ? o.enter : ENTER[o.enter ?? comp.enter ?? 'rise'], enterDur: o.enterDur ?? 0.7, enterEase: E[o.enterEase] || E.spring,
          exit: typeof o.exit === 'object' ? o.exit : EXIT[o.exit ?? (s.out === 'recede' ? 'recede' : 'none')], exitDur: o.exitDur ?? 0.55,
          pos: { ...POSE0, x: at[0], y: at[1], z: at[2] || 0, rx: o.rx || 0, ry: o.ry || 0, rz: o.rz || 0, s: o.s ?? 1, o: o.o ?? 1 },
          keys: null, pose: o.pose || (comp.pose ? (lt) => comp.pose(lt - el.in) : null), float: o.float ?? 1, phase: R() * 6.283, name: o.name || comp.kind,
        };
        el.keys = normKeys(o.keys, {});
        if (o.out === undefined && s.out === 'recede' && s.xf) el.out = s.dur - s.xf + (o.stagger ?? Math.min(0.18, F.els.filter((e) => e.scene === s).length * 0.03)) - 0.05;
        for (const [rt, kind, g, extra] of comp.cues || []) F.cue(s.t0 + el.in + rt, kind, g, extra);
        if (el.enter !== ENTER.none && !o.quiet && comp.enterCue !== 'none') F.cue(s.t0 + el.in, comp.enterCue || (o.enter === 'fly' ? 'whoosh' : 'pop'), comp.enterGain ?? 0.5);
        comp.el = el; F.els.push(el); s.els.push(el);
        return el;
      },
      cue(t, kind, g, extra) { F.cue(s.t0 + t, kind, g, extra); },
      // a row of pieces where one at a time steps forward (focus: [[t, index], …]); the rest sit back, tilt in and blur
      row(items, o = {}) {
        const gap = o.gap ?? 360, n = items.length, at = o.at || [0, 0, 0], fk = (o.focus || [[0, (n - 1) / 2]]).map(([t, i]) => [t, { f: i }]);
        const FK = normKeys(fk, {});
        return items.map((c, i) => S.add(c, {
          ...o, at: [at[0] + (i - (n - 1) / 2) * gap, at[1], at[2]], in: (o.in ?? 0) + i * (o.stagger ?? 0.08),
          pose: (lt) => { const f = atKeys(FK, lt).f, d = i - f, ad = Math.min(1.4, Math.abs(d)); return { z: ad * (o.depth ?? 220) - (ad < 0.5 ? (o.lift ?? 80) * (1 - ad * 2) : 0), ry: -Math.sign(d) * Math.min(1, ad) * (o.tilt ?? 22), x: -d * (o.squeeze ?? 40) * Math.min(1, ad) - (f - (n - 1) / 2) * gap * (o.follow ?? 0.35) }; },
        }));
      },
      // a pile of cards: the front one is read, then lifts off toward the camera and the next comes forward (every: s each)
      stack(items, o = {}) {
        const n = items.length, t0 = o.in ?? 0, at = o.at || [0, 0, 0];
        const ev = Array.isArray(o.every) ? o.every : Array(n).fill(o.every ?? 1.8), T = [t0]; for (let i = 0; i < n; i++) T.push(T[i] + (ev[i] ?? ev[ev.length - 1]));
        const gone = (lt, i) => { let g = 0; for (let j = 0; j < i; j++) g += E.inOut(cl((lt - T[j + 1]) / 0.55)); return g; };
        return items.map((c, i) => S.add(c, {
          ...o, at, in: t0 + i * 0.06, enter: o.enter || 'rise', read: o.read, readFrom: i ? T[i] + 0.55 : undefined,
          out: i < n - 1 ? T[i + 1] : o.out, exit: { y: -170, z: -260, o: 0, blur: 16, rx: -16 }, exitDur: 0.55,
          pose: (lt) => { const d = Math.max(0, i - gone(lt, i)); return { z: d * 110, y: -d * 44, s: 1 - d * 0.04, o: 1 - Math.min(0.6, d * 0.28), blur: d * 5 }; },
        }));
      },
      // pieces on an arc that turns past the camera (spin: [t0, t1, degrees])
      carousel(items, o = {}) {
        const n = items.length, R0 = o.radius ?? 1400, step = o.step ?? 17, at = o.at || [0, 0, 0], sp = o.spin || [0, s.dur, step * (n - 1)];
        return items.map((c, i) => S.add(c, {
          ...o, at, in: (o.in ?? 0) + i * (o.stagger ?? 0.05), float: 0.4,
          pose: (lt) => { const a = ((i - (n - 1) / 2) * step - tw(lt, [sp[0], sp[1]], sp[2] / 2, -sp[2] / 2, E[o.ease] || E.inOut)) * (Math.PI / 180); return { x: Math.sin(a) * R0, z: (1 - Math.cos(a)) * R0, ry: (a * 180) / Math.PI * (o.face ?? 0.9) }; },
        }));
      },
      // many small pieces that pour from deep behind the frame past the camera (a transition or a "thousands of them" beat)
      swarm(make, o = {}) {
        const n = o.n ?? 36, [t0, t1] = o.t || [0, 1.6], spread = o.spread ?? 1.0, out = [];
        for (let i = 0; i < n; i++) {
          const r = rng(hash(s.name) + i * 977), a = r() * Math.PI * 2, rad = (0.25 + r() * 0.9) * spread, dly = r() * (t1 - t0) * 0.55, life = (t1 - t0) - dly;
          const x0 = Math.cos(a) * rad * F.W * 0.55, y0 = Math.sin(a) * rad * F.H * 0.6, spin = (r() - 0.5) * 50;
          out.push(S.add(make(i, r), {
            at: [0, 0, 0], in: t0 + dly, out: t0 + dly + life + 1, enter: 'none', exit: 'none', float: 0, quiet: true,
            pose: (lt) => { const p = cl((lt - t0 - dly) / life), e = E.in(p); return { x: x0 * (0.35 + e * 1.2), y: y0 * (0.35 + e * 1.2), z: lerp(o.from ?? 4200, -820, e), rz: spin * p, ry: (r() - 0.5) * 0, o: cl(p * 5) * cl((1 - p) * 8) }; },
          }));
        }
        F.cue(s.t0 + t0, 'swarm', 1, { dur: t1 - t0 });
        return out;
      },
    };
    return S;
  }

  // the camera of scene s at its local time lt, with the hand-over moves
  camAt(s, lt) {
    const c = { ...CAM0, ...atKeys(s.camK, lt, E[s.camEase] || E.inOut) };
    const W = this.W;
    if (s.xf && lt > s.dur - s.xf) {
      const p = (lt - (s.dur - s.xf)) / s.xf;
      if (s.out === 'push') c.z += 1500 * E.inOut(p);
      if (s.out === 'whip') c.x += W * 1.5 * E.inOut(p);
      if (s.out === 'rise') c.y -= this.H * 1.1 * E.inOut(p);
    }
    const pv = s.prev;
    if (pv && pv.xf && lt < pv.xf) {
      const p = lt / pv.xf;
      if (pv.out === 'whip') c.x -= W * 1.5 * (1 - E.inOut(p));
      if (pv.out === 'push') c.z -= 900 * (1 - E.out(p));
      if (pv.out === 'rise') c.y += this.H * 1.1 * (1 - E.inOut(p));
    }
    c.focus = c.focus ?? -c.z;
    return c;
  }
  sceneWeight(s, t) {
    const lt = t - s.t0; if (lt < 0 || lt > s.dur) return 0;
    let w = 1;
    if (s.prev && s.prev.xf) w = Math.min(w, cl(lt / s.prev.xf));
    if (s.xf && s.i < this.scenes.length - 1) w = Math.min(w, cl((s.dur - lt) / s.xf));
    return w;
  }
  // the pose of one element at film time t (null = not drawn)
  poseOf(el, t) {
    const s = el.scene, lt = t - s.t0;
    if (lt < el.in - 1e-6 || lt > s.dur + 1e-6 || lt > el.out + el.exitDur + 1e-6) return null;
    const p = { ...el.pos, blur: 0 };
    if (el.keys) Object.assign(p, atKeys(el.keys, lt));
    if (el.pose) { const q = el.pose(lt); for (const k in q) p[k] = k === 's' || k === 'o' ? p[k] * q[k] : p[k] + q[k]; }
    if (el.float) { const f = el.float, w = lt * 1.15 + el.phase; p.y += Math.sin(w) * 5 * f; p.rz += Math.sin(w * 0.7) * 0.25 * f; p.ry += Math.sin(w * 0.55 + 1) * 0.8 * f; }
    const pe = cl((lt - el.in) / el.enterDur), ee = el.enterEase(pe), eo = 1 - E.out(pe);
    for (const k in el.enter) { const v = el.enter[k]; if (k === 's') p.s *= lerp(v, 1, ee); else if (k === 'o') p.o *= lerp(v, 1, E.out(pe)); else if (k === 'blur') p.blur += v * eo; else p[k] += v * (1 - ee); }
    const px = cl((lt - el.out) / el.exitDur), xe = E.in(px);
    if (px > 0) for (const k in el.exit) { const v = el.exit[k]; if (k === 's') p.s *= lerp(1, v, xe); else if (k === 'o') p.o *= lerp(1, v, E.inOut(px)); else if (k === 'blur') p.blur += v * xe; else p[k] += v * xe; }
    return p;
  }
  // world → screen for scene s
  project(s, lt, p, cam, hud) {
    if (hud) return { sx: this.W / 2 + p.x, sy: this.H / 2 + p.y, k: 1, d: this.focal, dof: 0 };
    const d = p.z - cam.z; if (d < 40) return null;
    const k = this.focal / d, cr = Math.cos((-cam.rz * Math.PI) / 180), sr = Math.sin((-cam.rz * Math.PI) / 180);
    const dx = p.x - cam.x, dy = p.y - cam.y;
    return { sx: this.W / 2 + (dx * cr - dy * sr) * k, sy: this.H / 2 + (dx * sr + dy * cr) * k, k, d, dof: (this.dof * (s.dof ?? 1) * Math.abs(d - cam.focus)) / cam.focus };
  }

  renderAt(t) {
    t = cl(t, 0, this.duration - 1e-6);
    this.t = t;
    const dt = 1 / 30;
    const cams = new Map();
    const camOf = (s, tt) => { const lt = tt - s.t0; const key = s.i + ':' + tt; if (!cams.has(key)) cams.set(key, this.camAt(s, lt)); return cams.get(key); };
    for (const el of this.els) {
      const s = el.scene, lt = t - s.t0, p = this.poseOf(el, t);
      const st = el.node.style;
      if (!p || p.o <= 0.002) { if (el.shown !== false) { st.display = 'none'; el.shown = false; } continue; }
      const cam = camOf(s, t), q = this.project(s, lt, p, cam, el.hud);
      if (!q) { if (el.shown !== false) { st.display = 'none'; el.shown = false; } continue; }
      // motion blur from screen speed (pose a frame ago)
      let mb = 0;
      if (!el.sharp) { const p0 = this.poseOf(el, t - dt); if (p0) { const q0 = this.project(s, lt - dt, p0, camOf(s, t - dt), el.hud); if (q0) mb = Math.min(26, Math.hypot(q.sx - q0.sx, q.sy - q0.sy) * 0.09 + Math.abs(q.k - q0.k) * 160); } }
      const near = cl((q.d - 140) / 520);
      const blur = el.sharp ? p.blur * 0.4 : Math.min(34, p.blur + Math.min(q.dof, 26) + mb);
      const sc = q.k * p.s, o = p.o * near;
      if (el.shown !== true) { st.display = ''; el.shown = true; }
      st.transform = `translate(${q.sx.toFixed(2)}px,${q.sy.toFixed(2)}px) translate(-50%,-50%) scale(${sc.toFixed(4)}) perspective(1800px) rotateX(${p.rx.toFixed(2)}deg) rotateY(${p.ry.toFixed(2)}deg) rotateZ(${(p.rz - (el.hud ? 0 : cam.rz)).toFixed(2)}deg)`;
      st.opacity = o.toFixed(3);
      st.filter = blur > 0.35 ? `blur(${(blur / Math.max(0.05, sc)).toFixed(2)}px)` : 'none';
      st.zIndex = el.hud ? 100000 + el.id : String(Math.round(90000 - q.d * 10));
      el.screen = { sx: q.sx, sy: q.sy, k: sc, blur, o };
      el.comp.update?.(lt - el.in, lt, el, t);
    }
    this._glows(t);
    if (this.hudInfo) { const s = this.sceneAt(t); this.hudInfo.textContent = `${s.name}  ${s.lt.toFixed(2)} / ${this.scenes[s.i].dur}s   t ${t.toFixed(2)}`; }
  }
  _glows(t) {
    const list = [];
    for (const s of this.scenes) {
      const w = this.sceneWeight(s, t); if (w <= 0) continue;
      const lt = t - s.t0, g = typeof s.glow === 'function' ? s.glow(lt) : s.glow || [{ x: 0.5, y: 0.56, r: 0.36, c: this.brand.glow, a: 0.5 }];
      const cam = this.camAt(s, lt);
      for (const [i, q] of g.entries()) list.push({ ...q, a: (q.a ?? 0.5) * w, px: -(cam.x - CAM0.x) * 0.12, py: -(cam.y - CAM0.y) * 0.12, i, t });
    }
    while (this.glowL.children.length < list.length) this.glowL.appendChild(document.createElement('i'));
    [...this.glowL.children].forEach((n, j) => {
      const q = list[j]; if (!q) { n.style.display = 'none'; return; }
      const br = 1 + 0.05 * Math.sin(t * 0.7 + q.i * 2.1), r = q.r * this.W * br, [cr, cg, cb] = hexRgb(q.c);
      const x = q.x * this.W + q.px + Math.sin(t * 0.31 + q.i) * 18, y = q.y * this.H + q.py + Math.cos(t * 0.27 + q.i) * 14;
      n.style.display = ''; n.style.width = n.style.height = (2 * r).toFixed(1) + 'px';
      n.style.transform = `translate(${(x - r).toFixed(1)}px,${(y - r).toFixed(1)}px) scale(${q.sx ?? 1.35},${q.sy ?? 0.85})`;
      n.style.background = `radial-gradient(closest-side, rgba(${cr},${cg},${cb},${q.a.toFixed(3)}), rgba(${cr},${cg},${cb},${(q.a * 0.45).toFixed(3)}) 45%, rgba(${cr},${cg},${cb},0))`;
    });
  }
  seek(t) { this.renderAt(t); }
  sceneAt(t) {
    let s = this.scenes[0];
    for (const x of this.scenes) if (t >= x.t0 + (x.i ? x.prev.xf / 2 : 0)) s = x;
    return { i: s.i, name: s.name, lt: t - s.t0, p: (t - s.t0) / s.dur };
  }

  // film-level rules (no pixels; check.mjs adds the pixel ones): reading time, typing pace, legibility, in frame, overlap
  runChecks() {
    const out = [], fail = (m) => out.push({ level: 'fail', msg: m }), warn = (m) => out.push({ level: 'warn', msg: m }), info = [];
    if (!this.scenes.length) fail('no scenes');
    const fr = this.frame.getBoundingClientRect(), fs = fr.width / this.W, U = this.U;
    for (const s of this.scenes) {
      if (!s.els.length) fail(`scene "${s.name}" places nothing`);
      if (s.dur < 1.2) warn(`scene "${s.name}" lasts ${s.dur}s — under 1.2 s nothing reads; merge it`);
      if (s.cut) warn(`scene "${s.name}" opens on a hard cut — this style hands over by moving; keep cuts for the end card at most`);
    }
    const m = this.mascot;
    if (m) {
      const has = (s) => s && s.els.some((e) => e.comp.kind === 'mascot');
      if (!has(this.scenes[0])) warn('the mascot is not in the first scene — the film opens on it');
      if (!has(this.scenes[this.scenes.length - 1])) warn('the mascot is not in the last scene — the film ends on it');
    }
    // per readable piece: time on screen, typing pace, size, inside the frame, not covered by another readable piece
    const reads = this.els.filter((e) => e.read && e.comp.text);
    for (const e of reads) {
      const s = e.scene, end = Math.min(e.out, s.dur - (s.xf ? s.xf * 0.5 : 0));
      const entries = e.comp.reads ? e.comp.reads.map((r) => ({ text: r.text, from: e.in + r.from, to: Math.min(end, e.in + r.to) }))
        : [{ text: e.comp.text, from: e.readFrom ?? e.in + Math.max(e.enterDur * 0.6, e.comp.typedEnd ?? 0), to: end }];
      const label = `"${e.comp.text.slice(0, 40)}${e.comp.text.length > 40 ? '…' : ''}" (${s.name})`;
      let have = 0;
      for (const r of entries) {
        const words = wordCount(r.text), need = 0.7 + 0.24 * words; have = r.to - r.from;
        if (have < need) fail(`"${r.text.slice(0, 40)}" (${s.name}) is readable for ${have.toFixed(2)} s — ${words} words need ${need.toFixed(2)} s`);
      }
      if (e.comp.cps && e.comp.cps > (e.comp.kind === 'chat' ? 70 : 32)) fail(`${label} types at ${e.comp.cps.toFixed(0)} chars/s — too fast to follow`);
      const sharpFrom = entries[0].from - e.in, sharpTo = Math.max(sharpFrom, Math.min(...entries.map((r) => r.to)) - e.in);
      // measure at the middle of its readable span
      const tm = s.t0 + e.in + (sharpFrom + sharpTo) / 2;
      this.renderAt(tm);
      if (e.shown === false) { fail(`${label} is not on screen at ${tm.toFixed(2)} s`); continue; }
      const r = e.node.getBoundingClientRect(), x0 = (r.left - fr.left) / fs, y0 = (r.top - fr.top) / fs, x1 = x0 + r.width / fs, y1 = y0 + r.height / fs, M = 12 * U;
      if (!e.bleed && (x0 < M || y0 < M || x1 > this.W - M || y1 > this.H - M)) fail(`${label} runs off the frame at ${tm.toFixed(2)} s (box ${x0.toFixed(0)},${y0.toFixed(0)} → ${x1.toFixed(0)},${y1.toFixed(0)})`);
      const px = minTextPx(e.node) * e.screen.k;
      if (px < 17 * U) fail(`${label} is ${px.toFixed(1)} px on screen — readable text is ≥ 17 px (at 1080 tall)`);
      if (e.screen.blur > 2.5) fail(`${label} is blurred ${e.screen.blur.toFixed(1)} px when it should be read — put it on the focal plane`);
      e._box = [x0, y0, x1, y1, tm];
      info.push(`${label}: ${have.toFixed(1)} s on, ${px.toFixed(0)} px`);
    }
    for (const a of reads) for (const b of reads) {
      if (a.id >= b.id || !a._box || !b._box || a.scene !== b.scene) continue;
      for (const tm of [a._box[4], b._box[4]]) {
        this.renderAt(tm);
        if (a.shown === false || b.shown === false || a.screen.o < 0.6 || b.screen.o < 0.6 || a.screen.blur > 2.5 || b.screen.blur > 2.5) continue;
        const ra = a.node.getBoundingClientRect(), rb = b.node.getBoundingClientRect();
        const ix = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)), iy = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
        const sm = Math.min(ra.width * ra.height, rb.width * rb.height);
        if (sm > 0 && (ix * iy) / sm > 0.06) { fail(`"${a.comp.text.slice(0, 24)}" and "${b.comp.text.slice(0, 24)}" overlap ${(100 * ix * iy / sm).toFixed(0)} % at ${tm.toFixed(2)} s`); break; }
      }
    }
    // headlines: accent stays punctuation
    for (const e of this.els) if (e.comp.kind === 'headline' && (e.comp.accents || 0) > 2) warn(`headline "${e.comp.text.slice(0, 30)}" has ${e.comp.accents} accent spans — one (two at most) carries the line`);
    for (const c of this.userChecks) { try { const r = c.fn(this); if (r && r !== true) fail(`${c.name}: ${r}`); } catch (err) { fail(`${c.name}: ${err.message}`); } }
    this.renderAt(this.t || 0);
    return { ok: !out.some((x) => x.level === 'fail'), out, info };
  }

  // the mascot sheet: every screen the film shows, big and as the chat avatar, square-on and turned both ways
  mascotSheet() {
    if (!this.mascot) return 0;
    const says = [...new Set(this.els.filter((e) => e.comp.kind === 'mascot').flatMap((e) => (e.comp.says || []).map((s) => s[1])))];
    if (!says.length) says.push(this.mascot.name || 'HELLO');
    this.renderAt(0.01);
    this.world.style.display = 'none';
    const box = document.createElement('div'); box.className = 'alf-sheet';
    Object.assign(box.style, { position: 'absolute', inset: '0', display: 'grid', gridTemplateColumns: `repeat(${Math.min(4, says.length + 2)}, 1fr)`, alignItems: 'center', justifyItems: 'center', padding: 40 * this.U + 'px', gap: 20 * this.U + 'px' });
    this.hud.appendChild(box);
    const cell = (comp, label, ry = 0) => { const c = document.createElement('div'); c.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px'; comp.node.style.transform = `perspective(1400px) rotateY(${ry}deg)`; c.appendChild(comp.node); c.insertAdjacentHTML('beforeend', `<div class="alf-meta" style="color:#555">${label}</div>`); box.appendChild(c); comp.update?.(1.2); };
    const sz = says.length > 4 ? 200 : 250;
    for (const s of says) cell(K.mascot({ say: [[0, s]], size: sz, sparks: false }), `screen · ${s}`);
    cell(K.mascot({ say: [[0, says[0]]], size: sz, sparks: false }), 'turned left 24°', -24);
    cell(K.mascot({ say: [[0, says[0]]], size: sz, sparks: false }), 'turned right 24°', 24);
    for (const px of [68, 150]) { const av = document.createElement('div'); av.className = 'alf-ava agent'; av.style.width = av.style.height = px * this.U + 'px'; av.innerHTML = K.avatarSvg(); cell({ node: av }, `chat avatar (${px} px)`); }
    return says.length;
  }

  cues() {
    return { duration: this.duration, fps: this.fps, score: this.score, cues: this.cueList, scenes: this.scenes.map((s) => ({ name: s.name, t: s.t0, dur: s.dur, out: s.out, mix: s.mix || 'full', accent: !!s.accent })) };
  }

  _expose() {
    const F = this;
    Object.assign(window, {
      film: F, DURATION: F.duration, FPS: F.fps, SIZE: { W: F.W, H: F.H },
      seek: (t) => F.renderAt(t), renderAt: (t) => F.renderAt(t), sceneAt: (t) => F.sceneAt(t),
      runChecks: () => F.runChecks(), cues: () => F.cues(),
    });
  }
  _live() {
    const F = this, fr = F.frame, wrap = document.createElement('div');
    wrap.className = 'alf-live'; fr.parentNode.insertBefore(wrap, fr); wrap.appendChild(fr);
    const fit = () => { const k = Math.min(innerWidth / F.W, innerHeight / F.H); fr.style.transform = `scale(${k})`; wrap.style.width = F.W * k + 'px'; wrap.style.height = F.H * k + 'px'; };
    addEventListener('resize', fit); fit();
    if (Q.has('hud')) { F.hudInfo = document.createElement('div'); F.hudInfo.className = 'alf-hudinfo'; document.body.appendChild(F.hudInfo); }
    const only = Q.get('scene'), sc = only ? F.scenes.find((s) => s.name === only) : null;
    let range = sc ? [sc.t0, sc.t0 + sc.dur] : [0, F.duration], loopScene = !!sc;
    const speed = +(Q.get('speed') || 1);
    let base = performance.now(), off = range[0], paused = Q.has('t');
    if (paused) off = +Q.get('t');
    let audio = null;
    if (Q.get('audio')) { audio = new Audio(Q.get('audio')); addEventListener('pointerdown', () => { audio.currentTime = F.t; audio.play(); base = performance.now(); off = F.t; }, { once: true }); }
    const now = () => (paused ? off : off + ((performance.now() - base) / 1000) * speed);
    addEventListener('keydown', (e) => {
      const cur = now();
      if (e.code === 'Space') { paused = !paused; off = cur; base = performance.now(); if (audio) paused ? audio.pause() : ((audio.currentTime = cur), audio.play()); e.preventDefault(); }
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { const i = cl(F.sceneAt(cur).i + (e.code === 'ArrowRight' ? 1 : -1), 0, F.scenes.length - 1); off = F.scenes[i].t0; base = performance.now(); if (loopScene) range = [F.scenes[i].t0, F.scenes[i].t0 + F.scenes[i].dur]; if (audio) audio.currentTime = off; }
      if (e.code === 'KeyL') { loopScene = !loopScene; const s = F.scenes[F.sceneAt(cur).i]; range = loopScene ? [s.t0, s.t0 + s.dur] : [0, F.duration]; }
    });
    const tick = () => {
      let t = now();
      if (t >= range[1]) { off = range[0]; base = performance.now(); t = off; if (audio && !loopScene) audio.currentTime = 0; }
      F.renderAt(t); requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

export function hexRgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function wordCount(s) { return String(s).replace(/[*=]/g, '').trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length; }
function minTextPx(node) {
  let m = Infinity;
  for (const n of node.querySelectorAll('[data-read]')) { const v = parseFloat(getComputedStyle(n).fontSize); if (v < m) m = v; }
  if (m === Infinity) m = parseFloat(getComputedStyle(node.firstElementChild || node).fontSize);
  return m;
}
let GRAIN = null;
function grain() {
  if (GRAIN) return GRAIN;
  const c = document.createElement('canvas'); c.width = c.height = 192; const g = c.getContext('2d'), d = g.createImageData(192, 192), r = rng(7);
  for (let i = 0; i < d.data.length; i += 4) { const v = 110 + r() * 145; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0); return (GRAIN = c.toDataURL());
}
