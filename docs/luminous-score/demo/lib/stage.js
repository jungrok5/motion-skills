// luminous-score · stage.js — the film: a printed score lying in a dark room, notes lighting up in their voice's colour as
// they sound, the camera gliding low along the system with the music.
//   const P = new Piece({ title, meter, key, tempo, voices, look, shots });  P.voice('solo', `e5:8 f5 …`);  P.start();
// Contract (set by start): window.seek(t), renderAt(t), DURATION, FPS, SIZE, READY, runChecks(), audioSpec(), piece.
import * as THREE from 'three';
import { EffectComposer } from './jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './jsm/postprocessing/OutputPass.js';
import { ShaderPass } from './jsm/postprocessing/ShaderPass.js';
import { Score, RANGES } from './score.js';
import { engrave, drawTile, FONT } from './engrave.js';
import { renderAudio } from './synth.js';

const D2R = Math.PI / 180, clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const Q = new URLSearchParams(location.search);
const RENDER = Q.has('render'), FROZEN = Q.has('t') ? +Q.get('t') : null, SCALE = +(Q.get('scale') || 1);
const LIB = new URL('.', import.meta.url).href;

export const LOOKS = {
  // the reference's room: cool grey paper, blue-black air, cold key light (examples of the style — design per piece)
  winter: { paper: '#b9bcc6', ink: '#16171b', room: '#07090e', fog: '#121823', fogDensity: 0.055, key: '#9db0d6', keyIntensity: 1.2, ambient: 0.55, exposure: 0.95, mist: 0.14, mistColor: '#5c6a85', motes: { kind: 'snow', count: 500, color: '#dfe7ff', size: 0.018 } },
  candle: { paper: '#cdb894', ink: '#1d150d', room: '#0b0704', fog: '#1d130a', fogDensity: 0.06, key: '#ffc58a', keyIntensity: 1.1, ambient: 0.45, exposure: 0.95, mist: 0.08, mistColor: '#6b4a2a', motes: { kind: 'dust', count: 350, color: '#ffd9a0', size: 0.012 } },
};
const DEF_LOOK = { ...LOOKS.winter, relief: 1, texel: 170, glow: 1, trail: 2.2, afterglow: 0.45, pool: 0.5, poolStrength: 0.55, flare: 1, lights: 3, lightStrength: 1, bloom: { strength: 0.85, radius: 0.55, threshold: 0.92 }, vignette: 0.5, grain: 0.025, headGloss: 0.35 };
const DEF_SHOT = { yaw: 32, pitch: 17, dist: 4, lead: 0, z: 'all', fov: 32, roll: 0, drift: 0.03, blend: 3, x: null, fit: 0.86 };

export class Piece {
  constructor(cfg = {}) {
    this.cfg = cfg;
    this.look = { ...DEF_LOOK, ...(typeof cfg.look === 'string' ? LOOKS[cfg.look] : cfg.look || {}) };
    if (cfg.look && typeof cfg.look === 'object' && cfg.look.base) Object.assign(this.look, { ...LOOKS[cfg.look.base], ...cfg.look });
    this.look.bloom = { ...DEF_LOOK.bloom, ...(this.look.bloom || {}) };
    this.score = new Score({ meter: cfg.meter, key: cfg.key, tempo: cfg.tempo, pickup: cfg.pickup });
    this.voices = {}; for (const v of cfg.voices || []) this.voices[v.id] = { ...v };
    this.intro = cfg.intro ?? 3; this.outro = cfg.outro ?? 3.5;
    this.SIZE = cfg.size || { W: 1920, H: 1080 };
    this.checks = [];
  }
  voice(id, text, o) { this.score.voice(id, text, o); return this; }
  add(...a) { this.score.add(...a); return this; }
  addMidi(json, o) { this.score.addMidi(json, o); return this; }
  check(name, fn) { this.checks.push({ name, fn }); return this; }

  async start() {
    await loadFonts();
    const sc = this.score.finalize();
    // staves: declared, or one per voice in declaration order
    const staves = this.cfg.staves || (this.cfg.voices || []).filter((v) => !v.staff).map((v) => ({ id: v.id, name: v.name, clef: v.clef, gap: v.gap }));
    this.L = engrave(sc, { staves, voices: this.voices, ...(this.cfg.layout || {}), title: this.cfg.title });
    const L = this.L, T = sc.tempo;
    this.musicEnd = T.sec(sc.endBeat);
    this.DURATION = +(this.intro + this.musicEnd + this.outro).toFixed(3);
    // head times (music seconds)
    for (const h of L.heads) { h.t0 = T.sec(h.b0); h.t1 = T.sec(h.b1); h.color = new THREE.Color(this.voices[h.voice].color || '#ffffff'); }
    const tr = this.look.trail;
    this.maxSpan = Math.max(0.1, ...L.heads.map((h) => h.t1 - h.t0)) + tr * 4.5 + 0.5;
    this.headT0 = Float64Array.from(L.heads, (h) => h.t0);
    if (this.cfg.title) L.items.push({ x0: L.title.x - 1, x1: L.title.x + 80 * L.S, f: (ctx) => titleInk(ctx, this.cfg.title.text, L.title) });
    this.buildScene();
    this.resolveShots();
    this.installContract();
    return this;
  }

  // ── time ───────────────────────────────────────────────────────────────
  beatAt(t) { // film seconds → (fractional) beat, extended smoothly before and after the music
    const m = t - this.intro, T = this.score.tempo;
    if (m < 0) return (m * T.bpmAt(0)) / 60;
    if (m > this.musicEnd) { const v = T.bpmAt(this.score.endBeat - 1e-3) / 60, tau = 0.7; return this.score.endBeat + v * tau * (1 - Math.exp(-(m - this.musicEnd) / tau)); }
    return T.beat(m);
  }
  xPlay(t) { return this.L.X(this.beatAt(t)); }
  filmTimeOfBar(bar) { return this.intro + this.score.tempo.sec(this.score.barStart(bar)); }
  intensity(h, m) {
    if (m < h.t0) return 0;
    const a = Math.min(1, (m - h.t0) / 0.035), lk = this.look;
    if (m <= h.t1) return a * (1 - 0.2 * Math.min(1, (m - h.t0) / 1.5)) * lk.glow;
    const i1 = (1 - 0.2 * Math.min(1, (h.t1 - h.t0) / 1.5)) * lk.glow, d = m - h.t1;
    return i1 * (lk.afterglow + (1 - lk.afterglow) * Math.exp(-d / 0.14)) * Math.exp(-d / lk.trail);
  }
  active(t) { // heads with light at film time t → [{h, I, flash}]
    const m = t - this.intro, H = this.L.heads, A = [];
    let lo = 0, hi = H.length; const from = m - this.maxSpan;
    while (lo < hi) { const md = (lo + hi) >> 1; if (this.headT0[md] < from) lo = md + 1; else hi = md; }
    for (let i = lo; i < H.length && H[i].t0 <= m; i++) {
      const h = H[i], I = this.intensity(h, m); if (I < 0.012) continue;
      A.push({ h, I, sounding: m <= h.t1, flash: h.cont ? 0 : Math.exp(-(m - h.t0) / 0.13) });
    }
    return A;
  }

  // ── scene ──────────────────────────────────────────────────────────────
  buildScene() {
    const lk = this.look, L = this.L, S = L.S;
    const canvas = document.querySelector('#frame') || Object.assign(document.body.appendChild(document.createElement('canvas')), { id: 'frame' });
    const W = RENDER ? Math.round(this.SIZE.W * SCALE) : innerWidth, H = RENDER ? Math.round(this.SIZE.H * SCALE) : innerHeight;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: RENDER, powerPreference: 'high-performance' }));
    r.setPixelRatio(RENDER ? 1 : Math.min(2, devicePixelRatio)); r.setSize(W, H, !RENDER);
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = lk.exposure;
    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color(lk.room);
    scene.fog = new THREE.FogExp2(lk.fog, lk.fogDensity);
    this.camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 300);
    scene.add(new THREE.HemisphereLight(lk.key, lk.room, lk.ambient));
    const key = new THREE.DirectionalLight(lk.key, lk.keyIntensity); key.position.set(-3, 4, -6); scene.add(key, key.target); this.key = key;
    this.glowLights = Array.from({ length: lk.lights }, () => { const p = new THREE.PointLight(0xffffff, 0, 3.2, 2); scene.add(p); return p; });

    // paper: a blank sheet under everything + engraved tiles made on demand
    const bump = noiseTexture(512, 7, true); bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    const base = bump.clone(); base.repeat.set(800 / 8, 800 / (L.zBot - L.zTop)); base.needsUpdate = true; // same grain as a tile
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ color: lk.paper, roughness: 0.92, bumpMap: base, bumpScale: 0.5 }));
    sheet.rotation.x = -Math.PI / 2; sheet.position.set(L.xStart + 300, -0.012, (L.zTop + L.zBot) / 2); scene.add(sheet); // just below the tiles: no z-fighting at grazing angles
    this.tileW = 8; this.tileH = L.zBot - L.zTop; this.tiles = new Map(); this.bump = bump;
    this.tileGeo = new THREE.PlaneGeometry(this.tileW, this.tileH);
    this.maxAniso = r.capabilities.getMaxAnisotropy();

    // 3D heads: closed (domes) and open (rings); lit copies drawn over them
    const hw = 0.66 * S, hd = 0.45 * S;
    const dome = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const ring = new THREE.TorusGeometry(1, 0.3, 6, 24); ring.rotateX(Math.PI / 2);
    const inkMat = new THREE.MeshStandardMaterial({ color: lk.ink, roughness: lk.headGloss, metalness: 0.1 });
    const closed = L.heads.filter((h) => !h.open), open = L.heads.filter((h) => h.open);
    const M4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.35), V = new THREE.Vector3(), Sv = new THREE.Vector3();
    this.headMatrix = (h, k = 1, lift = 0) => { V.set(h.x, lift, h.z); if (h.whole) Sv.set(0.8 * S * k, 0.2 * S * k, 0.5 * S * k); else if (h.open) Sv.set(0.6 * S * k, 0.5 * S * k, 0.36 * S * k); else Sv.set(hw * k, 0.26 * S * k, hd * k); return M4.compose(V, h.whole ? new THREE.Quaternion() : q, Sv); };
    for (const [list, geo] of [[closed, dome], [open, ring]]) {
      if (!list.length) continue;
      const m = new THREE.InstancedMesh(geo, inkMat, list.length); m.frustumCulled = false;
      list.forEach((h, i) => m.setMatrixAt(i, this.headMatrix(h)));
      scene.add(m);
    }
    const CAP = 1500, litMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const litRing = new THREE.TorusGeometry(1, 0.42, 6, 24); litRing.rotateX(Math.PI / 2); // a fatter ring: open heads read as light too
    this.litClosed = new THREE.InstancedMesh(dome, litMat, CAP); this.litOpen = new THREE.InstancedMesh(litRing, litMat, CAP);
    for (const m of [this.litClosed, this.litOpen]) { m.frustumCulled = false; m.setColorAt(CAP - 1, new THREE.Color(0)); m.count = 0; scene.add(m); }
    // pools of light on the paper (additive, faded by hand for fog)
    const poolGeo = new THREE.PlaneGeometry(1, 1); poolGeo.rotateX(-Math.PI / 2);
    this.pools = new THREE.InstancedMesh(poolGeo, new THREE.MeshBasicMaterial({ map: radialTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), CAP);
    this.pools.frustumCulled = false; this.pools.setColorAt(CAP - 1, new THREE.Color(0)); this.pools.count = 0; this.pools.renderOrder = 2; scene.add(this.pools);
    // flares on sounding heads
    const flareMat = new THREE.SpriteMaterial({ map: flareTexture(), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true });
    this.flares = Array.from({ length: 160 }, () => { const s = new THREE.Sprite(flareMat.clone()); s.visible = false; s.renderOrder = 3; scene.add(s); return s; });

    // title lettering, raised
    if (this.cfg.title) this.buildTitle();
    // mist and motes
    if (lk.mist > 0) {
      const tex = noiseTexture(256, 3, false); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(5, 5);
      this.mist = [0.1, 0.32, 0.6].map((y, i) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: lk.mistColor, alphaMap: tex.clone(), transparent: true, opacity: lk.mist * (1 - i * 0.25), depthWrite: false }));
        m.material.alphaMap.repeat.set(5 + i, 5 + i); m.material.alphaMap.needsUpdate = true;
        m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 4; scene.add(m); return m;
      });
    }
    if (lk.motes && lk.motes.kind !== 'none' && lk.motes.count) {
      const n = lk.motes.count, pos = new Float32Array(n * 3), rnd = mulberry(97);
      this.moteSeed = Array.from({ length: n }, () => [rnd(), rnd(), rnd(), rnd()]);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.motes = new THREE.Points(g, new THREE.PointsMaterial({ color: lk.motes.color, size: lk.motes.size, map: radialTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
      this.motes.frustumCulled = false; scene.add(this.motes);
    }
    // post: bloom, tone map, vignette + grain
    const comp = (this.composer = new EffectComposer(r));
    comp.setPixelRatio(r.getPixelRatio()); comp.setSize(W, H);
    comp.addPass(new RenderPass(scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), lk.bloom.strength, lk.bloom.radius, lk.bloom.threshold); comp.addPass(this.bloom);
    comp.addPass(new OutputPass());
    this.vig = new ShaderPass({ uniforms: { tDiffuse: { value: null }, amount: { value: lk.vignette }, grain: { value: lk.grain }, seed: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'uniform sampler2D tDiffuse; uniform float amount, grain, seed; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; c.rgb *= clamp(1.0 - amount * dot(d, d) * 2.4, 0.0, 1.0); float n = fract(sin(dot(vUv * 913.7 + seed, vec2(12.9898, 78.233))) * 43758.5453); c.rgb += (n - 0.5) * grain; gl_FragColor = c; }' });
    comp.addPass(this.vig);
    if (!RENDER) addEventListener('resize', () => { r.setSize(innerWidth, innerHeight); comp.setSize(innerWidth, innerHeight); this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.draw(this.t ?? 0); });
  }

  buildTitle() {
    const L = this.L, t = this.cfg.title, P = 360, font = `700 ${P}px ${FONT.serif}`;
    const c = document.createElement('canvas'), x = c.getContext('2d'); x.font = font;
    const m = x.measureText(t.text), pad = 30, asc = m.actualBoundingBoxAscent, desc = Math.max(m.actualBoundingBoxDescent, P * 0.05);
    c.width = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight + pad * 2); c.height = Math.ceil(asc + desc + pad * 2);
    x.font = font; x.fillStyle = '#fff'; x.textBaseline = 'alphabetic'; x.fillText(t.text, pad + m.actualBoundingBoxLeft, pad + asc);
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = this.maxAniso; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
    const sc = L.title.size / P, w = c.width * sc, h = c.height * sc;
    const cx = L.title.x + (c.width / 2 - pad - m.actualBoundingBoxLeft) * sc, cz = L.title.z + (c.height / 2 - pad - asc) * sc;
    const geo = new THREE.PlaneGeometry(w, h); geo.rotateX(-Math.PI / 2);
    const height = L.title.size * (t.depth ?? 0.14), N = 64, ink = new THREE.Color(this.look.ink);
    const g = new THREE.Group();
    for (let i = 0; i <= N; i++) {
      const top = i === N, col = top ? ink : ink.clone().lerp(new THREE.Color('#ffffff'), 0.06);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, map: tex, alphaTest: 0.5, roughness: top ? 0.4 : 0.7, metalness: 0.05 }));
      mesh.position.set(cx, (height * i) / N + 0.0005, cz); g.add(mesh);
    }
    this.scene.add(g); this.titleCenter = { x: cx, z: cz, w, h };
  }

  tile(i) {
    if (this.tiles.has(i)) { const t = this.tiles.get(i); t.used = this.frame; return t; }
    const L = this.L, x0 = L.xStart + i * this.tileW, k = this.look.texel * (+(Q.get('texel') || 1));
    const c = document.createElement('canvas'); c.width = Math.round(this.tileW * k); c.height = Math.round(this.tileH * k);
    drawTile(c.getContext('2d'), L, x0, x0 + this.tileW, k, this.look);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = this.maxAniso;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, bumpMap: this.bump, bumpScale: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const mesh = new THREE.Mesh(this.tileGeo, mat); mesh.rotation.x = -Math.PI / 2; mesh.position.set(x0 + this.tileW / 2, 0, (L.zTop + L.zBot) / 2);
    this.scene.add(mesh);
    const t = { mesh, tex, used: this.frame }; this.tiles.set(i, t);
    if (this.tiles.size > 14) { // forget the least recently used
      const [old] = [...this.tiles.entries()].sort((a, b) => a[1].used - b[1].used);
      this.scene.remove(old[1].mesh); old[1].tex.dispose(); old[1].mesh.material.dispose(); this.tiles.delete(old[0]);
    }
    return t;
  }
  ensureTiles() { // tiles under the camera's view of the paper
    const cam = this.camera, ray = new THREE.Vector3(), o = cam.position, L = this.L, far = 1.9 / this.look.fogDensity;
    let x0 = Infinity, x1 = -Infinity;
    for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1], [-1, 0], [1, 0], [0, 0]]) {
      ray.set(u, v, 0.5).unproject(cam).sub(o).normalize();
      let d = ray.y < -1e-4 ? -o.y / ray.y : far; d = Math.min(d, far);
      const x = o.x + ray.x * d; x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    }
    x0 = Math.max(x0 - 1, L.xStart); x1 = Math.min(x1 + 1, L.xEnd + 2);
    const keep = new Set();
    for (let i = Math.floor((x0 - L.xStart) / this.tileW); i <= Math.floor((x1 - L.xStart) / this.tileW); i++) if (i >= 0) { this.tile(i); keep.add(i); }
    for (const [i, t] of this.tiles) t.mesh.visible = keep.has(i);
  }

  // ── shots ──────────────────────────────────────────────────────────────
  resolveShots() {
    let shots = this.cfg.shots;
    if (!shots || !shots.length) shots = autoShots(this);
    let prev = { ...DEF_SHOT };
    this.shots = shots.map((s, i) => {
      const at = s.at ?? (s.bar !== undefined ? this.filmTimeOfBar(s.bar) : s.beat !== undefined ? this.intro + this.score.tempo.sec(s.beat) : 0);
      const o = { ...prev, x: null, ...s, at, i };
      if (i === 0) o.blend = 0;
      prev = o; return o;
    });
  }
  zOf(z) {
    const L = this.L, st = (id) => { const s = L.staffs.find((x) => x.id === id); if (!s) throw new Error(`shot z: no staff "${id}"`); return s; };
    if (typeof z === 'number') return z;
    if (Array.isArray(z)) return (Math.min(...z.map((id) => st(id).top)) + Math.max(...z.map((id) => st(id).bot))) / 2;
    if (z === 'all') return (L.staffs[0].top + L.staffs[L.staffs.length - 1].bot) / 2;
    if (z === 'title') return this.titleCenter ? this.titleCenter.z : L.zTop;
    return st(z).mid;
  }
  zRange(z) {
    const L = this.L, st = (id) => L.staffs.find((x) => x.id === id);
    const m = 2.5 * L.S; // room for ledger-line notes above and below
    if (Array.isArray(z)) return [Math.min(...z.map((id) => st(id).top)) - m, Math.max(...z.map((id) => st(id).bot)) + m];
    if (z === 'all') return [L.staffs[0].top - m, L.staffs[L.staffs.length - 1].bot + m];
    if (typeof z === 'string' && st(z)) return [st(z).top - m, st(z).bot + m];
    return null;
  }
  shotState(s, t) {
    const tx = s.x === 'title' ? (this.titleCenter ? this.titleCenter.x : this.L.xSys) : typeof s.x === 'number' ? s.x : this.xPlay(t) + s.lead * this.L.U;
    const tz = this.zOf(s.z), zr = s.x == null ? this.zRange(s.z) : null;
    return { tx, tz, yaw: s.yaw, pitch: s.pitch, dist: s.dist, fov: s.fov, roll: s.roll, drift: s.drift, za: zr ? zr[0] : tz, zb: zr ? zr[1] : tz, fit: zr && s.fit ? s.fit : 0, follow: s.x == null ? 1 : 0 };
  }
  // the camera for film time t: blend the shot's settings from the previous shot, then (fit) back off until the playhead's
  // stretch of the staves [za, zb] sits inside ±fit of the frame — `dist` is the closest it may come
  cameraAt(t) {
    const sh = this.shots; let i = 0; for (let k = 0; k < sh.length; k++) if (sh[k].at <= t + 1e-9) i = k;
    const cur = this.shotState(sh[i], t);
    let st = cur;
    if (i > 0 && !sh[i].cut) {
      const k = ease((t - sh[i].at) / Math.max(1e-3, sh[i].blend));
      if (k < 1) { const pv = this.shotState(sh[i - 1], t); st = {}; for (const key in cur) st[key] = lerp(pv[key], cur[key], k); }
    }
    const cam = this.camera, yaw = st.yaw * D2R, pitch = st.pitch * D2R, dr = st.drift, v = new THREE.Vector3();
    const T = new THREE.Vector3(st.tx + dr * 0.3 * Math.sin(t * 0.19), 0, st.tz + dr * 0.3 * Math.sin(t * 0.17 + 1)), pos = new THREE.Vector3();
    const pose = (d) => {
      pos.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(d).add(T);
      pos.x += dr * d * Math.sin(t * 0.31 + 1.3); pos.y += dr * d * 0.4 * Math.sin(t * 0.23 + 0.4); pos.z += dr * d * 0.6 * Math.sin(t * 0.27 + 2.1);
      cam.position.copy(pos); cam.fov = st.fov; cam.updateProjectionMatrix(); cam.lookAt(T); cam.rotateZ(st.roll * D2R); cam.updateMatrixWorld();
    };
    let d = st.dist;
    if (st.fit > 0.05 && st.zb > st.za) {
      const xp = this.xPlay(t) * st.follow + st.tx * (1 - st.follow), lim = st.fit;
      const back = st.follow * this.L.U * (this.score.tempo.bpmAt(Math.max(0, this.beatAt(t))) / 60) * 0.5; // and the last half second
      const ok = (d) => { pose(d); for (const x of [xp, xp - back]) for (const z of [st.za, st.zb]) { v.set(x, 0, z).project(cam); if (v.z > 1 || Math.abs(v.x) > lim || Math.abs(v.y) > lim) return false; } return true; };
      if (!ok(d)) { let lo = d, hi = d * 1.5; while (!ok(hi) && hi < d * 30) { lo = hi; hi *= 1.5; } for (let k = 0; k < 16; k++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; } d = hi; }
    }
    pose(d);
    return { pos: pos.clone(), target: T, fov: st.fov, roll: st.roll, shot: i, dist: d };
  }
  placeCamera(t) { return this.cameraAt(t); }

  // ── a frame ────────────────────────────────────────────────────────────
  draw(t) {
    this.t = t; this.frame = (this.frame || 0) + 1;
    const lk = this.look, cam = this.placeCamera(t);
    this.ensureTiles();
    const A = this.active(t), cp = this.camera.position, den = lk.fogDensity, col = new THREE.Color();
    const fogK = (x, z) => { const d = Math.hypot(x - cp.x, cp.y, z - cp.z) * den; return Math.exp(-d * d); };
    let nc = 0, no = 0, np = 0, nf = 0;
    const sums = new Map();
    for (const a of A) {
      const { h, I } = a, hdr = 0.55 + 2.4 * I + 2.2 * a.flash * lk.flare;
      col.copy(h.color).multiplyScalar(hdr);
      const m = h.open ? this.litOpen : this.litClosed, n = h.open ? no++ : nc++;
      if (n < 1500) { m.setMatrixAt(n, this.headMatrix(h, 1.06, 0.004)); m.setColorAt(n, col); }
      if (np < 1500) {
        const R = lk.pool * (0.75 + 0.5 * I), f = fogK(h.x, h.z);
        this.pools.setMatrixAt(np, new THREE.Matrix4().compose(new THREE.Vector3(h.x, 0.0015, h.z), new THREE.Quaternion(), new THREE.Vector3(R * 1.5, 1, R)));
        this.pools.setColorAt(np++, col.copy(h.color).multiplyScalar(I * lk.poolStrength * f));
      }
      if (a.sounding && nf < this.flares.length && lk.flare > 0) {
        const s = this.flares[nf++], f = fogK(h.x, h.z), k = (0.35 + 0.65 * Math.min(1, a.I) + 0.8 * a.flash) * lk.flare;
        const dc = Math.hypot(h.x - cp.x, cp.y, h.z - cp.z); s.visible = true; s.position.set(h.x, 0.03, h.z); s.scale.setScalar(Math.min(this.L.S * 3.4, 0.022 * dc) * k);
        s.material.color.copy(h.color).lerp(new THREE.Color('#ffffff'), 0.55).multiplyScalar(f * (0.6 + a.flash)); s.material.rotation = 0.35;
      }
      const sm = sums.get(h.voice) || { I: 0, x: 0, z: 0, c: h.color }; sm.I += I; sm.x += h.x * I; sm.z += h.z * I; sums.set(h.voice, sm);
    }
    for (let i = nf; i < this.flares.length; i++) this.flares[i].visible = false;
    for (const [m, n] of [[this.litClosed, nc], [this.litOpen, no]]) { m.count = Math.min(n, 1500); m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    this.pools.count = np; this.pools.instanceMatrix.needsUpdate = true; if (this.pools.instanceColor) this.pools.instanceColor.needsUpdate = true;
    // coloured lights at the brightest voices
    const top = [...sums.values()].sort((a, b) => b.I - a.I);
    this.glowLights.forEach((p, i) => {
      const s = top[i]; if (!s) { p.intensity = 0; return; }
      p.position.set(s.x / s.I, 0.32, s.z / s.I); p.color.copy(s.c); p.intensity = Math.min(3, 0.35 * s.I) * lk.lightStrength;
    });
    // mist and motes, anchored to the world, following the camera
    const tgt = cam.target;
    if (this.mist) this.mist.forEach((m, i) => { m.position.x = tgt.x; m.position.z = tgt.z; const a = m.material.alphaMap; a.offset.set((tgt.x / 60) * a.repeat.x + t * 0.012 * (i + 1), (-tgt.z / 60) * a.repeat.y + t * 0.004); });
    if (this.motes) this.updateMotes(t, tgt);
    this.key.position.set(tgt.x - 3, 4, tgt.z - 6); this.key.target.position.copy(tgt);
    this.vig.uniforms.seed.value = Math.round(t * 30) % 997;
    this.composer.render();
    return cam;
  }
  updateMotes(t, tgt) {
    const lk = this.look.motes, pos = this.motes.geometry.attributes.position.array, BX = 16, BZ = 14, H = 2.6;
    const wrap = (v, a, b) => a + ((((v - a) % (b - a)) + (b - a)) % (b - a));
    this.moteSeed.forEach(([a, b, c, d], i) => {
      let x = a * 200, y = b * H, z = c * 60;
      if (lk.kind === 'snow') { y = wrap(y - t * (0.12 + 0.1 * d), 0.01, H); x += 0.25 * Math.sin(t * (0.4 + d) + i); z += 0.2 * Math.cos(t * (0.3 + d) + i); }
      else if (lk.kind === 'embers') { y = wrap(y + t * (0.08 + 0.08 * d), 0.01, H); x += 0.2 * Math.sin(t * 0.7 * (0.5 + d) + i); }
      else { x += 0.3 * Math.sin(t * 0.11 * (0.5 + d) + i); y = 0.05 + b * H * 0.8 + 0.15 * Math.sin(t * 0.13 + i * 1.7); z += 0.3 * Math.cos(t * 0.09 * (0.5 + c) + i); }
      pos[i * 3] = wrap(x, tgt.x - BX * 0.4, tgt.x + BX * 0.6); pos[i * 3 + 1] = y; pos[i * 3 + 2] = wrap(z, tgt.z - BZ * 0.7, tgt.z + BZ * 0.3);
    });
    this.motes.geometry.attributes.position.needsUpdate = true;
  }

  // ── checks (check.mjs calls runChecks) ─────────────────────────────────
  runChecks() {
    const errors = [...this.score.errors], warnings = [...this.score.warnings], info = {}, sc = this.score, L = this.L;
    for (const v of Object.values(this.voices)) {
      const notes = sc.notes.filter((n) => n.voice === v.id);
      if (!notes.length) warnings.push(`voice ${v.id} has no notes`);
      const rg = v.range && (RANGES[v.range] || v.range);
      if (rg) for (const n of notes) if (n.midi < rg[0] || n.midi > rg[1]) errors.push(`voice ${v.id}: midi ${n.midi} at bar ${sc.barOf(n.beat)} is outside the ${v.range} range ${rg[0]}–${rg[1]}`);
      const c = new THREE.Color(v.color || '#fff'), hsl = {}; c.getHSL(hsl);
      if (hsl.l < 0.35) warnings.push(`voice ${v.id}: colour ${v.color} is dark — it will not read as light`);
    }
    for (const id of sc.voices.keys()) if (!this.voices[id]) errors.push(`notes written for undeclared voice "${id}"`);
    const vs = Object.values(this.voices);
    for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
      const a = new THREE.Color(vs[i].color), b = new THREE.Color(vs[j].color), d = Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
      if (d < 0.18 && (vs[i].staff ?? vs[i].id) !== (vs[j].staff ?? vs[j].id)) warnings.push(`voices ${vs[i].id} and ${vs[j].id} have nearly the same colour`);
    }
    this.shots.forEach((s, i) => {
      if (s.at > this.DURATION) errors.push(`shot ${i} starts at ${s.at.toFixed(2)} s, after the end (${this.DURATION} s)`);
      if (i && s.at < this.shots[i - 1].at) errors.push(`shot ${i} starts before shot ${i - 1}`);
      const next = this.shots[i + 1]; if (next && s.blend > next.at - s.at + 1e-6) warnings.push(`shot ${i}: blend ${s.blend} s is longer than the shot (${(next.at - s.at).toFixed(2)} s)`);
      if (s.pitch < 6) warnings.push(`shot ${i}: pitch ${s.pitch}° is nearly edge-on — the staves merge into lines`);
    });
    // what is sounding must be on screen
    const per = this.shots.map(() => ({ n: 0, seen: 0, focusN: 0, focusSeen: 0, px: [] })), v = new THREE.Vector3();
    const W = this.SIZE.W;
    let minY = Infinity;
    for (let t = this.intro; t < this.intro + this.musicEnd; t += 0.25) {
      const c = this.placeCamera(t); minY = Math.min(minY, this.camera.position.y);
      const m = t - this.intro, sh = this.shots[c.shot], p = per[c.shot];
      if (c.shot > 0 && t < sh.at + sh.blend) continue; // judge a shot once its move has settled
      const zr = sh.x == null ? this.zRange(sh.z) : null;
      for (const h of L.heads) {
        if (h.t0 > m) break; if (h.t1 < m || m - h.t0 > 0.5) continue; // judged while it lights up
        if (zr && (h.z < zr[0] - L.S * 4 || h.z > zr[1] + L.S * 4)) continue; // a voice the shot does not frame
        v.set(h.x, 0, h.z).project(this.camera);
        const inside = Math.abs(v.x) < 0.97 && Math.abs(v.y) < 0.95 && v.z < 1;
        p.n++; if (inside) p.seen++;
        if (sh.focus && (Array.isArray(sh.focus) ? sh.focus : [sh.focus]).includes(h.voice)) { p.focusN++; if (inside) p.focusSeen++; }
        if (inside && p.px.length < 400) { const a = v.clone(), b = new THREE.Vector3(h.x + L.S, 0, h.z).project(this.camera); p.px.push((Math.abs(b.x - a.x) * W) / 2); }
      }
    }
    if (minY < 0.05) errors.push(`the camera goes below the paper (y = ${minY.toFixed(3)})`);
    info.shots = per.map((p, i) => {
      const r = p.n ? p.seen / p.n : 1, fr = p.focusN ? p.focusSeen / p.focusN : null, px = p.px.sort((a, b) => a - b)[p.px.length >> 1] || 0;
      const s = this.shots[i], tag = `shot ${i} (${s.at.toFixed(1)} s)`;
      if (p.n && r < 0.25) errors.push(`${tag}: only ${(r * 100).toFixed(0)}% of sounding notes are on screen`);
      else if (p.n && r < 0.55) warnings.push(`${tag}: ${(r * 100).toFixed(0)}% of sounding notes are on screen`);
      if (fr !== null && fr < 0.8) errors.push(`${tag}: focus ${s.focus} on screen only ${(fr * 100).toFixed(0)}% of the time it sounds`);
      if (p.n && px < 3) warnings.push(`${tag}: a staff space is ${px.toFixed(1)} px — the notes are specks (camera too far)`);
      return { at: +s.at.toFixed(2), seen: +r.toFixed(2), focus: fr === null ? null : +fr.toFixed(2), staffSpacePx: +px.toFixed(1) };
    });
    if (this.cfg.title && this.intro > 0.5) {
      this.placeCamera(this.intro * 0.4); v.set(this.titleCenter.x, 0, this.titleCenter.z).project(this.camera);
      if (!(Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1)) warnings.push('the title is not on screen during the intro');
    }
    for (const c of this.checks) { try { const r = c.fn(this); if (r && r !== true) errors.push(`${c.name}: ${r}`); } catch (e) { errors.push(`${c.name}: threw ${e.message}`); } }
    info.notes = sc.notes.length; info.heads = L.heads.length; info.bars = sc.bars; info.music = +this.musicEnd.toFixed(2); info.duration = this.DURATION;
    info.voices = Object.keys(this.voices).length; info.staves = L.staffs.length;
    this.draw(this.t ?? 0);
    return { errors, warnings, info };
  }

  audioSpec() {
    const vs = {}; for (const [id, v] of Object.entries(this.voices)) vs[id] = { synth: v.synth || 'strings', gain: v.gain ?? 1, pan: v.pan ?? 0, section: !!v.section, transpose: v.transpose || 0, ring: v.ring || 0 };
    return { duration: this.DURATION, voices: vs, reverb: { mix: 0.26, size: 0.84, damp: 0.35, ...((this.cfg.audio || {}).reverb || {}) }, peak: (this.cfg.audio || {}).peak, notes: this.score.notes.map((n) => ({ voice: n.voice, midi: n.midi, t0: n.t0 + this.intro, t1: n.t1 + this.intro, vel: n.vel, orn: n.orn })) };
  }

  // ── contract + live player ─────────────────────────────────────────────
  installContract() {
    Object.assign(window, { DURATION: this.DURATION, FPS: this.cfg.fps || 30, SIZE: this.SIZE, piece: this, seek: (t) => this.draw(t), renderAt: (t) => this.draw(t), runChecks: () => this.runChecks(), audioSpec: () => this.audioSpec() });
    if (RENDER) { this.draw(FROZEN ?? 0); window.READY = true; return; }
    if (FROZEN !== null) { this.draw(FROZEN); window.READY = true; return; }
    livePlayer(this); window.READY = true;
  }
}

function autoShots(P) {
  const bars = P.score.bars, out = [{ at: 0, x: 'title', z: 'title', yaw: 18, pitch: 26, dist: 4.2, fov: 30 }];
  out.push({ at: Math.max(0.5, P.intro - 1.5), blend: P.intro + 0.5, z: 'all', yaw: 34, pitch: 17, dist: 5.5, lead: 1 });
  const presets = [{ yaw: 40, pitch: 14, dist: 4.6, lead: 1.5 }, { yaw: 22, pitch: 24, dist: 6.5, lead: 0.5 }, { yaw: 52, pitch: 12, dist: 4.2, lead: 2 }, { yaw: 30, pitch: 19, dist: 5.5, lead: 1 }];
  for (let b = 9, k = 0; b <= bars; b += 8, k++) out.push({ bar: b, blend: 3.5, z: 'all', ...presets[k % presets.length] });
  return out;
}

function livePlayer(P) {
  const css = document.createElement('style');
  css.textContent = `html,body{margin:0;height:100%;background:#000;overflow:hidden}#frame{display:block;width:100vw;height:100vh}
  .ls-bar{position:fixed;left:0;right:0;bottom:0;display:flex;gap:10px;align-items:center;padding:10px 14px;font:13px/1 system-ui,sans-serif;color:#ddd;background:linear-gradient(transparent,rgba(0,0,0,.55));opacity:.0;transition:opacity .3s}
  body:hover .ls-bar,.ls-bar.show{opacity:1}.ls-bar button{all:unset;cursor:pointer;padding:6px 10px;border:1px solid rgba(255,255,255,.35);border-radius:999px;white-space:nowrap}
  .ls-bar input{flex:1;accent-color:#ddd;min-width:40px}.ls-time{font-variant-numeric:tabular-nums;min-width:84px;text-align:right}`;
  document.head.appendChild(css);
  const bar = document.createElement('div'); bar.className = 'ls-bar show';
  bar.innerHTML = `<button data-k="play">❚❚</button><button data-k="sound">♪ Sound on</button><input type="range" min="0" max="${P.DURATION}" step="0.01" value="0"><span class="ls-time"></span>`;
  document.body.appendChild(bar); setTimeout(() => bar.classList.remove('show'), 3500);
  const [bPlay, bSound, range, time] = [bar.querySelector('[data-k=play]'), bar.querySelector('[data-k=sound]'), bar.querySelector('input'), bar.querySelector('.ls-time')];
  let t = 0, playing = !Q.has('paused'), last = performance.now(), ctx = null, buffer = null, src = null, srcStart = 0, preparing = false;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const stopSrc = () => { if (src) { try { src.stop(); } catch {} src.disconnect(); src = null; } };
  const startSrc = () => { stopSrc(); if (!ctx || !buffer || !playing) return; src = ctx.createBufferSource(); src.buffer = buffer; src.connect(ctx.destination); src.start(0, Math.min(t, buffer.duration - 0.01)); srcStart = ctx.currentTime - t; };
  const set = (nt) => { t = ((nt % P.DURATION) + P.DURATION) % P.DURATION; startSrc(); };
  bPlay.onclick = () => { playing = !playing; bPlay.textContent = playing ? '❚❚' : '▶'; last = performance.now(); playing ? startSrc() : stopSrc(); };
  bSound.onclick = async () => {
    if (ctx) { stopSrc(); ctx.close(); ctx = null; bSound.textContent = '♪ Sound on'; return; }
    if (preparing) return; preparing = true; bSound.textContent = '♪ preparing…';
    ctx = new AudioContext(); await new Promise((r) => setTimeout(r, 30));
    if (!buffer) { const a = renderAudio(P.audioSpec(), { sampleRate: ctx.sampleRate > 44100 ? 44100 : ctx.sampleRate }); buffer = ctx.createBuffer(2, a.L.length, a.sampleRate); buffer.copyToChannel(a.L, 0); buffer.copyToChannel(a.R, 1); }
    preparing = false; bSound.textContent = '♪ Sound off'; if (!playing) bPlay.onclick(); else startSrc();
  };
  range.oninput = () => set(+range.value);
  addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); bPlay.onclick(); } if (e.code === 'ArrowRight') set(t + 5); if (e.code === 'ArrowLeft') set(t - 5); });
  const tick = (now) => {
    if (playing) {
      if (src && ctx) { t = ctx.currentTime - srcStart; if (t >= P.DURATION - 0.02) set(0); }
      else { t += Math.min(0.1, (now - last) / 1000); if (t >= P.DURATION) set(0); }
    }
    last = now; P.draw(t); range.value = t; time.textContent = `${fmt(t)} / ${fmt(P.DURATION)}`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ── helpers ─────────────────────────────────────────────────────────────
let fontsLoaded = null;
export function loadFonts() {
  if (fontsLoaded) return fontsLoaded;
  const faces = [
    new FontFace('LSMusic', `url(${LIB}fonts/NotoMusic-subset.woff2)`),
    new FontFace('LSSerif', `url(${LIB}fonts/SourceSerif4-Variable.woff2)`, { weight: '200 900' }),
    new FontFace('LSSerifItalic', `url(${LIB}fonts/SourceSerif4-Italic-Variable.woff2)`, { weight: '200 900' }),
    new FontFace('LSKR', `url(${LIB}fonts/NotoSansKR-700-ksx1001.woff2)`, { weight: '100 900' }),
  ];
  fontsLoaded = Promise.all(faces.map((f) => f.load().then((ff) => document.fonts.add(ff))));
  return fontsLoaded;
}
function titleInk(ctx, str, T) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = `700 ${T.size * ctx.k}px ${FONT.serif}`; ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, (T.x - ctx.x0) * ctx.k + ctx.ox, (T.z - ctx.z0) * ctx.k + ctx.oz); ctx.restore();
}
function mulberry(a) { return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function noiseTexture(n, seed, grey) {
  const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'), img = x.createImageData(n, n), r = mulberry(seed);
  const G = 16, grid = Array.from({ length: G * G }, r), val = (u, v, g) => { const s = G / g; const X = u * s, Y = v * s, i = Math.floor(X), j = Math.floor(Y), fx = X - i, fy = Y - j, a = (p, q) => grid[(((q % s) + s) % s) * G + (((p % s) + s) % s)]; const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); return lerp(lerp(a(i, j), a(i + 1, j), sx), lerp(a(i, j + 1), a(i + 1, j + 1), sx), sy); };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const u = i / n, v = j / n; let s = 0;
    if (grey) s = 0.5 * val(u, v, 4) + 0.3 * val(u, v, 2) + 0.2 * r(); else s = clamp((0.55 * val(u, v, 4) + 0.3 * val(u, v, 2) + 0.15 * val(u, v, 1) - 0.35) * 2.2, 0, 1);
    const k = (j * n + i) * 4, b = Math.round(s * 255); img.data[k] = img.data[k + 1] = img.data[k + 2] = b; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0); return new THREE.CanvasTexture(c);
}
function radialTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.45)'); g.addColorStop(0.6, 'rgba(255,255,255,.1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
function flareTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  for (const [w, h] of [[64, 2.2], [2.2, 40]]) { const l = x.createLinearGradient(64 - w, 0, 64 + w, 0); x.save(); x.translate(64, 64); const gg = x.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h)); gg.addColorStop(0, 'rgba(255,255,255,.9)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gg; x.fillRect(-w, -h, 2 * w, 2 * h); x.restore(); void l; }
  return new THREE.CanvasTexture(c);
}
