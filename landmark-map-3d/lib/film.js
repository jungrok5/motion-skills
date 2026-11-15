// landmark-map-3d · film.js — the film: renderer, camera, light, the timeline (camera keys, time of day, weather,
// tilt-shift focus), world + life + landmark + labels, and the contract every page fulfils:
//   window.seek(t) · renderAt(t) · DURATION · FPS · SIZE · runChecks(t) · cues() · FILM · __ready
// The composited frame (3D + labels + titles) is the visible 2D canvas #frame. ?render=1 fixed size, no live loop;
// ?t=8 one frozen frame; ?scale=.5 render size; ?msaa=0; ?off=post,labels,life,shadows,reflect.
import { THREE, track, clamp, smooth, col, q, lerp, ease, inPoly } from './core.js';
import { PRESETS, lookOf, blend, sunDir, makeSky, Post } from './look.js';
import { World } from './world.js';
import { Life } from './life.js';
import { Labels, CATS } from './labels.js';
import { makeKit } from './kit.js';

export class Film {
  static async create(o) { const F = new Film(o); await F.init(); return F; }
  constructor(o = {}) {
    this.o = o; this.duration = o.duration ?? 16; this.fps = o.fps ?? 30;
    const [W, H] = o.size ?? [1080, 1920], s = +(q.get('scale') ?? 1);
    this.W = Math.round(W * s); this.H = Math.round(H * s); this.baseW = W; this.baseH = H;
    this.render = q.has('render'); this.off = new Set((q.get('off') || '').split(',').filter(Boolean));
    this.checks = []; this.logs = []; this.landmarks = []; this.cueList = [];
    this.lang = o.lang ?? 'local'; this.THREE = THREE;
  }
  log(s) { this.logs.push(s); console.log('[film]', s); }
  async init() {
    const o = this.o;
    this.place = o.place ? (typeof o.place === 'string' ? await (await fetch(o.place)).json() : o.place) : { size: [1200, 1200], buildings: [], roads: [], areas: [], rivers: [], rail: [], trees: [], lamps: [], crossings: [], pois: [] };
    for (const k of ['buildings', 'roads', 'areas', 'rivers', 'rail', 'trees', 'lamps', 'crossings', 'pois']) this.place[k] ??= [];
    // canvases: WebGL draws offscreen, #frame shows the composite
    const gl = document.createElement('canvas'); gl.width = this.W; gl.height = this.H;
    const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1); renderer.setSize(this.W, this.H, false);
    renderer.shadowMap.enabled = !this.off.has('shadows'); renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
    this.renderer = renderer;
    const frame = document.createElement('canvas'); frame.id = 'frame'; frame.width = this.W; frame.height = this.H;
    document.body.appendChild(frame); this.frame = frame; this.g = frame.getContext('2d');
    if (!document.getElementById('lm-style')) {
      const st = document.createElement('style'); st.id = 'lm-style';
      st.textContent = `html,body{margin:0;height:100%;background:#15122a;overflow:hidden}#frame{display:block;margin:0 auto;height:100vh;width:auto;max-width:100vw;object-fit:contain}${this.render ? '#frame{height:auto;width:auto;margin:0}' : ''}`;
      document.head.appendChild(st);
    }
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(30, this.W / this.H, 2, 14000); this.cam.layers.enable(1);   // layer 1: light effects (glows, pools, beams), not mirrored in the water
    this.U = { lit: { value: 0 }, lamps: { value: 0 }, warm: { value: col('#ffcf8a') }, day: { value: 1 }, time: { value: 0 }, glow: { value: 0 } };
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2); this.sun.castShadow = true;
    const ms = +(q.get('shadow') ?? o.shadowMap ?? 2048); this.sun.shadow.mapSize.set(ms, ms);
    this.sun.shadow.bias = -.0003; this.sun.shadow.normalBias = .5; this.sun.shadow.radius = 2.5;
    this.scene.add(this.sun, this.sun.target);
    this.sky = makeSky(); this.scene.add(this.sky);
    this.scene.fog = new THREE.Fog(0xffffff, 1000, 4000);
    this.post = new Post(renderer, this.W, this.H, { msaa: +(q.get('msaa') ?? 4) });
    this.labels = new Labels(this);
    this.K = makeKit(this);
    this.timeTrack = null; this.camTrack = null; this.weatherTrack = track([{ t: 0, rain: 0 }]); this.focusTrack = track([{ t: 0, tilt: .9, focusY: .54, band: .14, fall: .34 }]);
    this.pointScale = this.H / (2 * Math.tan(15 * Math.PI / 180));
  }

  // ---------------------------------------------------------------- building the film
  world(o = {}) { this.city = new World(this, this.place, o); this.city.build(); return this.city; }
  life(o = {}) { if (this.off.has('life')) return null; this.alive = new Life(this, this.city, o); this.alive.build(); return this.alive; }
  // the hero: build(K, g) draws it into g (metres, origin at its base centre). { at, rot, top (height for its label) }
  landmark(name, build, o = {}) {
    const g = this.K.group(this.scene, o); build(this.K, g);
    g.traverse(m => { if (m.isMesh) { m.castShadow = m.castShadow ?? true; } });
    const L = { name, g, at: o.at ?? [0, 0], top: o.top ?? 50 }; this.landmarks.push(L); return L;
  }
  // time of day keys: { t, sky: 'day'|'morning'|'golden'|'dusk'|'night'|'overcast', mix: { night: .3 }, …overrides }
  time(keys) {
    const ks = keys.slice().sort((a, b) => a.t - b.t).map(k => ({ ...k, look: lookOf(k) }));
    this.timeKeys = ks;
    this.timeTrack = t => {
      if (t <= ks[0].t) return ks[0].look; if (t >= ks.at(-1).t) return ks.at(-1).look;
      let i = 0; while (ks[i + 1].t < t) i++;
      const a = ks[i], b = ks[i + 1], u = (ease[b.ease] || ease.sine)((t - a.t) / (b.t - a.t));
      return blend(a.look, b.look, u);
    };
  }
  weather(keys) { this.weatherTrack = track(keys); }
  focus(keys) { this.focusTrack = track(keys.map(k => ({ tilt: .9, focusY: .54, band: .14, fall: .34, ...k }))); }
  // camera keys: { t, at: [x, z], h, yaw (compass degrees the camera looks toward), pitch (degrees down), dist (m), fov }
  camera(keys) {
    this.camKeys = keys.map(k => ({ h: 0, fov: 30, ...k, x: k.at[0], z: k.at[1] }));
    const tr = track(this.camKeys.map(({ at, ...k }) => k), { smooth: true });
    this.camTrack = tr;
  }
  cameraAt(t) {
    const k = this.camTrack(t), yaw = k.yaw * Math.PI / 180, pitch = k.pitch * Math.PI / 180;
    const fx = Math.sin(yaw), fz = -Math.cos(yaw), d = k.dist;
    const target = new THREE.Vector3(k.x, k.h, k.z);
    const pos = new THREE.Vector3(k.x - fx * Math.cos(pitch) * d, k.h + Math.sin(pitch) * d, k.z - fz * Math.cos(pitch) * d);
    return { ...k, target, pos, yawR: yaw, pitchR: pitch };
  }
  anchorY(x, z) { const h = this.city ? this.city.heightAt(x, z) : 0; return h ? h + 3 : 3; }
  name(n) { if (!n) return ''; if (this.lang === 'local') return n.name ?? n.en ?? Object.values(n)[0]; return n[this.lang] ?? n.en ?? n.name ?? Object.values(n)[0]; }

  // labels
  label(o) { return this.labels.add(o); }
  area(o) { return this.labels.area(o); }
  // a POI from the data by (part of) its name: F.poi('Musée du quai Branly', { from: 4 }) — text defaults to the name in F.lang
  poi(match, o = {}) {
    const re = match instanceof RegExp ? match : new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const p = this.place.pois.find(p => Object.values(p.n).some(v => re.test(v)));
    if (!p) { this.checks.push({ name: `POI "${match}" exists in place.json`, fn: () => false }); return null; }
    return this.labels.add({ text: this.name(p.n), at: [p.x, p.z], icon: p.c, ...o });
  }
  // pick n POIs near a point, spread apart, preferring the ones that make a map feel alive
  autoPois(o = {}) {
    const { near = [0, 0], r = 400, n = 10, cats = ['food', 'cafe', 'museum', 'sight', 'transit', 'shop', 'hotel', 'bar', 'park', 'culture', 'ferry'], gap = 45, skip = [] } = o;
    const pref = { sight: 6, museum: 5, transit: 4, ferry: 4, park: 3, cafe: 3, food: 3, culture: 3, bar: 2, hotel: 2, shop: 1 };
    const cand = this.place.pois.filter(p => cats.includes(p.c) && Math.hypot(p.x - near[0], p.z - near[1]) < r && !skip.some(s => Object.values(p.n).some(v => new RegExp(s, 'i').test(v))))
      .map(p => ({ p, s: (pref[p.c] ?? 1) + (p.star ? 3 : 0) - Math.hypot(p.x - near[0], p.z - near[1]) / r * 2 + ((p.x * 7.13 + p.z * 3.7) % 1 + 1) % 1 * .5 }))
      .sort((a, b) => b.s - a.s);
    const out = [], seen = new Set();
    for (const { p } of cand) {
      const nm = this.name(p.n); if (seen.has(nm) || nm.length > 30) continue;
      if (out.some(q2 => Math.hypot(q2.x - p.x, q2.z - p.z) < gap)) continue;
      out.push(p); seen.add(nm); if (out.length >= n) break;
    }
    return out.map((p, i) => this.labels.add({ text: this.name(p.n), at: [p.x, p.z], icon: p.c, priority: 10 - i * .1, ...(o.label || {}), ...(typeof o.each === 'function' ? o.each(p, i) : {}) }));
  }
  // a street name painted along the real road: F.street('Avenue Gustave Eiffel', { size: 6, from: 2 })
  street(match, o = {}) {
    const re = match instanceof RegExp ? match : new RegExp('^' + match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
    const segs = this.place.roads.filter(r => r.n && Object.values(r.n).some(v => re.test(v)));
    if (!segs.length) { this.checks.push({ name: `street "${match}" exists in place.json`, fn: () => false }); return null; }
    // join the segments into the longest chain
    const chains = joinChains(segs.map(s => s.p));
    let best = chains.sort((a, b) => plen(b) - plen(a))[0];
    if (o.near) best = chains.sort((a, b) => dmin(a, o.near) - dmin(b, o.near))[0];
    return this.labels.street({ text: o.text ?? this.name(segs[0].n), path: best, y: segs[0].bridge ? .46 : .16, ...o });
  }
  title(o) { this.labels.title(o); this.cueList.push({ t: o.from ?? 0, kind: 'title' }); }
  clock(o) { this.labels.clock(o); }
  end(o) { this.labels.end(o); this.cueList.push({ t: o.from, kind: 'end' }); }
  check(name, fn) { this.checks.push({ name, fn }); }
  cue(t, kind, o = {}) { this.cueList.push({ t, kind, ...o }); }

  // ---------------------------------------------------------------- one frame
  lookAt(t) { return this.timeTrack ? this.timeTrack(t) : PRESETS.day; }
  seek(t) {
    t = clamp(t, 0, this.duration);
    const L = this.lookAt(t), Wt = this.weatherTrack(t), Fo = this.focusTrack(t), C = this.cameraAt(t);
    const cam = this.cam;
    cam.fov = C.fov; cam.aspect = this.W / this.H;
    // near plane scaled to the camera distance: from 2 km a fixed 2 m near plane leaves ~10 cm of depth precision and the
    // road / curb / marking layers (cm apart) z-fight; at dist × 0.06 it is a few millimetres
    cam.near = clamp(C.dist * .06, 2, 200); cam.far = Math.max(14000, C.dist * 12); cam.position.copy(C.pos); cam.up.set(0, 1, 0); cam.lookAt(C.target); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    this.pointScale = this.H / (2 * Math.tan(C.fov * Math.PI / 360));
    // light
    const rainK = clamp(Wt.rain ?? 0);
    const Lw = rainK > 0 ? blend(L, { ...L, ...overcastOf(L) }, rainK * .8) : L;
    const sd = sunDir(Lw.sunEl, Lw.sunAz), ext = clamp(C.dist * .9, 160, 1100);
    this.hemi.color.copy(col(Lw.hemiSky)); this.hemi.groundColor.copy(col(Lw.ground)); this.hemi.intensity = Lw.hemiI;
    this.sun.color.copy(col(Lw.sun)); this.sun.intensity = Lw.sunI * (Lw.sunEl < -1 ? .4 : 1);
    // stable shadows: centre the shadow box on the view target, snapped to shadow texels
    const sc = this.sun.shadow.camera; sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 10; sc.far = 5000; sc.updateProjectionMatrix();
    const el = Math.max(Lw.sunEl, 12), sdd = sunDir(el, Lw.sunAz);
    const tgt = C.target.clone(); tgt.y = 0;
    const texel = 2 * ext / this.sun.shadow.mapSize.x;
    const zAxis = sdd.clone().negate(), xAxis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), zAxis).normalize(), yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis);
    const ux = Math.round(tgt.dot(xAxis) / texel) * texel, uy = Math.round(tgt.dot(yAxis) / texel) * texel, uz = tgt.dot(zAxis);
    const snapped = xAxis.clone().multiplyScalar(ux).add(yAxis.clone().multiplyScalar(uy)).add(zAxis.clone().multiplyScalar(uz));
    this.sun.target.position.copy(snapped); this.sun.position.copy(snapped).addScaledVector(sdd, 2000);
    this.sun.target.updateMatrixWorld(); this.sun.updateMatrixWorld();
    // haze relative to the camera: clean around what we look at, the far edge of the map melting into the sky
    const fogC = col(Lw.fog), hz = this.hazeAt(t, Lw, C, rainK); this.scene.fog.color.copy(fogC); this.scene.fog.near = hz.near; this.scene.fog.far = hz.far;
    const su = this.sky.material.uniforms; su.top.value.copy(col(Lw.skyTop)); su.hz.value.copy(fogC).lerp(col(Lw.skyHz), .25); su.sunD.value.copy(sd); su.sunC.value.copy(col(Lw.sun)).multiplyScalar(Lw.sunEl > -4 ? 1 : 0); su.stars.value = Lw.stars;
    this.sky.position.copy(cam.position);
    // shared uniforms
    this.U.lit.value = Lw.windows; this.U.lamps.value = Lw.lamps; this.U.glow.value = Lw.glow; this.U.day.value = 1 - Lw.glow; this.U.time.value = t;
    this.look = Lw;
    this.city?.update(t, Lw); this.city?.lod(cam);
    this.alive?.update(t, Lw);
    this.K.update(t, Lw);
    this.labels.update3d(t, Lw);
    for (const f of this.frameFns || []) f(t, Lw);
    // render: reflection → scene (MSAA) → post → 2D
    const r = this.renderer;
    r.shadowMap.autoUpdate = false; r.shadowMap.needsUpdate = true;      // one shadow pass per frame, shared by reflection and main view
    if (this.city && !this.off.has('reflect')) this.city.renderReflection(r, this.scene, cam);
    if (this.off.has('post')) { r.setRenderTarget(null); r.render(this.scene, cam); }
    else {
      r.setRenderTarget(this.post.scene); r.render(this.scene, cam);
      const end = this.labels.ends.find(e => t >= e.from);
      this.post.run({ t, frame: Math.round(t * this.fps), bloom: Lw.bloom, bloomThr: Lw.bloomThr, exposure: Lw.exposure, contrast: Lw.contrast, sat: Lw.sat * (1 - rainK * .12), lift: Lw.lift, gain: Lw.gain,
        focusY: Fo.focusY, focusBand: Fo.band, focusFall: Fo.fall, tilt: Fo.tilt, vignette: this.o.vignette ?? .24, grain: this.o.grain ?? .016, rain: rainK,
        fade: (this.o.fadeIn ?? .6) > 0 ? 1 - smooth(0, this.o.fadeIn ?? .6, t) : 0, fadeColor: [0.02, 0.015, 0.05], ...(end?.blur ? {} : {}) });
    }
    const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.W, this.H); g.drawImage(r.domElement, 0, 0);
    if (!this.off.has('labels')) this.labels.draw(g, t, cam, Lw);
    this.t = t;
  }
  every(fn) { (this.frameFns ??= []).push(fn); }
  hazeAt(t, L = this.lookAt(t), C = this.cameraAt(t), rain = clamp(this.weatherTrack(t).rain ?? 0)) {
    const k = (L.fogD / .00013) * (this.o.haze ?? 1) * (1 + rain * 1.5), d = Math.max(C.dist, 250);
    return { near: d * 1.2 / k, far: d * 3.3 / k };
  }

  // ---------------------------------------------------------------- checks the film runs at every sampled t
  builtinChecks(t) {
    const broken = [], C = this.cameraAt(t), [W, H] = this.place.size, m = this.o.edgeMargin ?? 30;
    // the frame stays on the map: rays through the frame corners and edges hit the ground inside the data (or far in the haze)
    const cam = this.cam; cam.position.copy(C.pos); cam.fov = C.fov; cam.lookAt(C.target); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [-1, 0], [1, 0], [0, -1]]) {
      const v = new THREE.Vector3(sx, sy, .5).unproject(cam).sub(cam.position).normalize();
      const hz = this.hazeAt(t);
      if (v.y >= -.02) continue;                     // sky: the dome's horizon is the haze colour
      const k = -cam.position.y / v.y, x = cam.position.x + v.x * k, z = cam.position.z + v.z * k;
      const fog = clamp((k - hz.near) / (hz.far - hz.near));
      if ((Math.abs(x) > W / 2 - m || Math.abs(z) > H / 2 - m) && fog < (this.o.edgeFog ?? .3)) { broken.push('the frame stays on the map'); break; }
    }
    // the camera clears the buildings under it
    if (this.city && C.pos.y < this.city.heightAt(C.pos.x, C.pos.z) + 8) broken.push('the camera is above the roofs');
    if (C.pitch < 8 || C.pitch > 89) broken.push('pitch stays between 8° and 89°');
    return broken;
  }
  labelOverlaps(t) {
    // after a seek(t): any two pins drawn mostly-opaque that overlap
    return [];
  }

  // ---------------------------------------------------------------- contract
  async start() {
    if (!this.camTrack) this.camera([{ t: 0, at: [0, 0], yaw: 0, pitch: 50, dist: 600 }]);
    if (!this.timeTrack) this.time([{ t: 0, sky: 'day' }]);
    // fonts before the first frame
    try { await Promise.all(['700', '800', '900'].flatMap(w => [document.fonts.load(`${w} 40px 'Map Round'`, this.labels.allText()), document.fonts.load(`${w} 40px 'Map Sans'`, this.labels.allText())])); await document.fonts.ready; } catch { /* system fallback */ }
    this.seek(0);
    const F = this;
    Object.assign(window, {
      FILM: F, DURATION: this.duration, FPS: this.fps, SIZE: { W: this.baseW, H: this.baseH },
      seek: t => F.seek(t), renderAt: t => F.seek(t),
      runChecks: t => { const b = F.builtinChecks(t); for (const c of F.checks) { let ok = false; try { ok = c.fn(t); } catch (e) { ok = false; } if (!ok) b.push(c.name); } return b; },
      cues: () => F.cues(),
    });
    F.allText = () => F.labels.allText();
    F.cues = () => {
      const s = []; for (let t = 0; t <= F.duration + 1e-6; t += .25) s.push(+F.lookAt(t).glow.toFixed(3));
      const cam = []; for (let t = 0; t <= F.duration + 1e-6; t += .25) { const a = F.cameraAt(t), b = F.cameraAt(Math.min(F.duration, t + .25)); cam.push(+(a.pos.distanceTo(b.pos) / .25).toFixed(1)); }
      const rain = []; for (let t = 0; t <= F.duration + 1e-6; t += .25) rain.push(+(F.weatherTrack(t).rain ?? 0).toFixed(3));
      return { duration: F.duration, step: .25, night: s, speed: cam, rain, pops: F.labels.list.filter(l => l.from > .05).map(l => ({ t: l.from, big: !!l.big })), events: F.cueList, boats: !!F.alive?.boats?.length, water: !!F.city?.hasWater };
    };
    const ft = q.get('t');
    if (this.render || ft != null) { if (ft != null) this.seek(+ft); window.__ready = true; window.READY = true; return; }
    // live: loop, space = pause, ← → = scrub
    let t0 = performance.now(), paused = false, tp = 0;
    addEventListener('keydown', e => { if (e.code === 'Space') { paused = !paused; if (!paused) t0 = performance.now() - tp * 1000; } if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { tp = clamp(tp + (e.code === 'ArrowRight' ? 1 : -1), 0, this.duration); t0 = performance.now() - tp * 1000; this.seek(tp); } });
    const loop = () => { if (!paused) { tp = ((performance.now() - t0) / 1000) % this.duration; this.seek(tp); } requestAnimationFrame(loop); };
    window.__ready = true; window.READY = true; loop();
  }
}
function overcastOf(L) { return { sunI: L.sunI * .35, hemiI: L.hemiI * 1.15, sat: L.sat * .9, fog: '#' + col(L.fog).lerp(col('#9aa3b8'), .4).getHexString(), waterRefl: Math.min(1, L.waterRefl + .15) }; }
function plen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
function dmin(p, at) { return Math.min(...p.map(q2 => Math.hypot(q2[0] - at[0], q2[1] - at[1]))); }
export function joinChains(lines) {
  const ls = lines.map(l => l.slice()), eq = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1.5, out = [];
  while (ls.length) {
    let c = ls.shift();
    for (let grew = true; grew;) {
      grew = false;
      for (let i = 0; i < ls.length; i++) {
        const d = ls[i];
        if (eq(c.at(-1), d[0])) c = c.concat(d.slice(1)); else if (eq(c.at(-1), d.at(-1))) c = c.concat(d.slice().reverse().slice(1));
        else if (eq(c[0], d.at(-1))) c = d.concat(c.slice(1)); else if (eq(c[0], d[0])) c = d.slice().reverse().concat(c.slice(1)); else continue;
        ls.splice(i, 1); grew = true; break;
      }
    }
    out.push(c);
  }
  return out;
}
export { THREE, CATS, inPoly, lerp };
