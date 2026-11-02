// pop-up-textbook kit: an interactive 3D textbook on a desk under a banker's lamp. Each lesson is a spread — the left
// page is typeset text (title, formula, key words, a predict question, a lift-the-flap answer), the right page carries a
// pop-up diorama drawn in an ink-and-hatching engraving style that the reader can poke (switches, plugs, kettles) and
// that animates the physics (electrons, meters, waves). Pages turn with a curling leaf; the diorama folds flat and pops
// up again. A magnifier loupe, key-word / predict / why cards and a lesson HUD sit on top.
//
// Everything on screen is a pure function of time t and a list of timed events (the reader's clicks or a scripted
// tour), so window.renderAt(t) gives the same frame every time and scripts/render.mjs can bake an MP4.
//
//   import { createBook } from '../kit/book.js';
//   const book = createBook({ title, lessons: [{ no, title, lead, formula, terms, predict, …, diorama(D) {…} }], tour });
//   book.start();
import * as THREE from 'three';
import { CW, CH, LAYOUT, drawLeft, drawRight, drawFlap } from './page.js';
export { THREE };

const Q = new URLSearchParams(location.search);
const RENDER = Q.has('render');
export const U = {
  clamp: (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)),
  lerp: (a, b, k) => a + (b - a) * k,
  ease: k => (k = Math.min(1, Math.max(0, k)), k * k * (3 - 2 * k)),
  easeOut: k => (k = Math.min(1, Math.max(0, k)), 1 - Math.pow(1 - k, 3)),
  easeInOut: k => (k = Math.min(1, Math.max(0, k)), k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  backOut: k => { k = Math.min(1, Math.max(0, k)); const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
  rng(seed = 1) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; },
  tri: x => 1 - Math.abs(((x % 2) + 2) % 2 - 1),               // 0..1..0 triangle wave, period 2
};

const W = 1, H = 1.32;                              // page size (world units; 1 unit ≈ a 21 cm page)
const T0 = 0.05, GUT = 0.03;                        // page-block height at the spine, extra height of the flat page
const pageY = ax => T0 + GUT * (1 - Math.pow(1 - U.clamp(ax / 0.22), 2));
const YP = pageY(1);                                // height of the flat part of a page
const FOLD = 0.5, TURN_AT = 0.4, TURN_DUR = 1.25, POP_AT = 1.55, POP_DUR = 1.15, TURN_ALL = POP_AT + POP_DUR;

const THEME = {
  paper: '#f3ead6', flap: '#ece0c4', tint: 'rgba(160,120,60,0.08)', ink: '#2a2521', soft: '#7a6e60', accent: '#b4432f',
  pencil: '#3f4a5c', cover: '#26303c', desk: '#8a5632', shade: '#0f6a3c', brass: '#b58a45', glow: '#ffe2bc',
  hatch: '#2a2521', fill: '#ffffff', icon: '#e2922f',
};
const ICONS = {
  bulb: '<path d="M7 1.5a4.5 4.5 0 0 0-2.6 8.2c.4.3.6.8.6 1.3V12h4v-1c0-.5.2-1 .6-1.3A4.5 4.5 0 0 0 7 1.5z"/><path d="M5.2 13.5h3.6" fill="none"/>',
  dot: '<circle cx="7" cy="7" r="4"/>',
  star: '<path d="M7 1.6l1.6 3.4 3.7.4-2.8 2.5.8 3.6L7 9.7 3.7 11.5l.8-3.6L1.7 5.4l3.7-.4z"/>',
  moon: '<path d="M9.5 1.8a5.3 5.3 0 1 0 2.7 9.5A5.6 5.6 0 0 1 9.5 1.8z"/>',
};
const SVG = {
  prev: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" class="fill"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13M16 5.5v13"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h9"/></svg>',
  loupe: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.5"/><path d="M15 15l4.5 4.5"/></svg>',
  view: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M5 9.5h3l4.5-4v13L8 14.5H5z" class="fill"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M5 9.5h3l4.5-4v13L8 14.5H5z" class="fill"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};
const CURSOR = '<svg viewBox="0 0 22 22" width="22" height="22"><path d="M3 2 L3 18 L7.5 13.8 L10.6 20.4 L13.4 19.1 L10.4 12.6 L16.4 12.6 Z" fill="#fff" stroke="#111" stroke-width="1.3" stroke-linejoin="round"/></svg>';

function el(tag, cls, html, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------------------------------------------------------
export function createBook(cfg) {
  const th = { ...THEME, ...(cfg.theme || {}) };
  const lessons = cfg.lessons; const N = lessons.length;
  const START = U.clamp(cfg.start ?? 0, 0, N - 1) | 0;

  // ---------- DOM ----------
  document.body.classList.add('ptb');
  const canvas = el('canvas', null, null, document.body); canvas.id = 'c';
  el('div', 'vignette', null, document.body);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.id = 'callouts'; document.body.appendChild(svg);
  const ui = el('div', 'ui', null, document.body);

  // ---------- renderer, scene, camera ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: RENDER });
  renderer.setPixelRatio(RENDER ? 1 : Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#140d08'); scene.fog = new THREE.Fog('#140d08', 5.5, 11);
  const camera = new THREE.PerspectiveCamera(cfg.fov ?? 32, 1, 0.05, 40);
  const G = { uPx: { value: 3.3 }, uLit: { value: cfg.inkLit ?? 1.0 } };     // shared ink uniforms

  // ---------- desk, lamp, lights ----------
  const deskTex = new THREE.CanvasTexture(woodCanvas(th.desk)); deskTex.colorSpace = THREE.SRGBColorSpace; deskTex.anisotropy = ANISO;
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshStandardMaterial({ map: deskTex, roughness: 0.5, metalness: 0 }));
  desk.rotation.x = -Math.PI / 2; desk.position.z = -1; desk.receiveShadow = true; scene.add(desk);

  const lampPos = new THREE.Vector3(...(cfg.lamp ?? [-0.15, 0, -2.0]));
  const lamp = buildLamp(th); lamp.position.copy(lampPos); scene.add(lamp);
  const LAMP_POWER = cfg.lampPower ?? 2.2; let lampK = 1;
  const spot = new THREE.SpotLight(th.glow, LAMP_POWER, 0, 0.98, 0.7, 0);
  spot.position.copy(lampPos).add(new THREE.Vector3(0.05, 1.32, 0.42)); spot.target.position.set(0.05, 0, 0.35);
  spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0004; spot.shadow.normalBias = 0.003;
  spot.shadow.camera.near = 0.4; spot.shadow.camera.far = 6; spot.shadow.radius = 3;
  scene.add(spot, spot.target);
  const hemi = new THREE.HemisphereLight('#b0a090', '#3a2414', 0.7); scene.add(hemi);
  const fill = new THREE.DirectionalLight('#fff0dc', 1.25); fill.position.set(-1.2, 2.6, 4); scene.add(fill);

  // ---------- the book ----------
  const bookG = new THREE.Group(); scene.add(bookG);
  const cover = new THREE.Mesh(new THREE.BoxGeometry(2 * W + 0.07, 0.016, H + 0.07), new THREE.MeshStandardMaterial({ color: th.cover, roughness: 0.75 }));
  cover.position.y = 0.008; cover.castShadow = cover.receiveShadow = true; bookG.add(cover);
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, H + 0.07, 16, 1, false, Math.PI / 2, Math.PI), cover.material);
  spine.rotation.x = Math.PI / 2; spine.position.set(0, 0.016, 0); bookG.add(spine);
  const blockMat = new THREE.MeshStandardMaterial({ color: '#e6d9bb', roughness: 0.9 });
  for (const s of [-1, 1]) {
    const sh = new THREE.Shape(); sh.moveTo(0, 0.016);
    for (let i = 0; i <= 24; i++) { const ax = (i / 24) * W; sh.lineTo(s * ax, pageY(ax) - 0.002); }
    sh.lineTo(s * W, 0.016); sh.closePath();
    const blk = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: H - 0.01, bevelEnabled: false }), blockMat);
    blk.position.z = -(H - 0.01) / 2; blk.castShadow = blk.receiveShadow = true; bookG.add(blk);
  }
  function pageGeo(side) {
    const g = new THREE.PlaneGeometry(W, H, 40, 1); g.rotateX(-Math.PI / 2); g.translate(side * W / 2, 0, 0);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, pageY(Math.abs(p.getX(i))));
    g.computeVertexNormals(); return g;
  }
  const pageMat = side => new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0, side: THREE.FrontSide });
  const leftPage = new THREE.Mesh(pageGeo(-1), pageMat()); const rightPage = new THREE.Mesh(pageGeo(1), pageMat());
  for (const p of [leftPage, rightPage]) { p.receiveShadow = true; bookG.add(p); }
  leftPage.userData.side = 'L'; rightPage.userData.side = 'R';
  // turning leaf: a strip of columns bent along an arc so its length never changes
  const LEAF_N = 48;
  const leafGeo = new THREE.PlaneGeometry(W, H, LEAF_N, 1); leafGeo.rotateX(-Math.PI / 2); leafGeo.translate(W / 2, 0, 0);
  const leafFront = new THREE.Mesh(leafGeo, new THREE.MeshStandardMaterial({ roughness: 0.88, side: THREE.FrontSide }));
  const leafBack = new THREE.Mesh(leafGeo, new THREE.MeshStandardMaterial({ roughness: 0.88, side: THREE.BackSide }));
  for (const m of [leafFront, leafBack]) { m.castShadow = true; m.receiveShadow = true; m.visible = false; bookG.add(m); }
  function poseLeaf(p) {
    const c = 0.42, pos = leafGeo.attributes.position, xs = [], ys = [];
    let x = 0, y = T0 + 0.002;
    for (let i = 0; i <= LEAF_N; i++) {
      const u = i / LEAF_N;
      const th_ = Math.PI * U.easeInOut(U.clamp(p * (1 + c) - c * u));
      // blend the arc with the page's own gutter curve at the two ends of the turn
      const wR = 1 - U.ease(p / 0.08), wL = U.ease((p - 0.92) / 0.08);
      const fx = u * W;
      xs.push(x * (1 - wR - wL) + fx * wR - fx * wL); ys.push(y * (1 - wR - wL) + (pageY(fx) + 0.0015) * (wR + wL));
      x += (W / LEAF_N) * Math.cos(th_); y += (W / LEAF_N) * Math.sin(th_);
    }
    for (let i = 0; i < pos.count; i++) { const col = i % (LEAF_N + 1); pos.setX(i, xs[col]); pos.setY(i, ys[col]); }
    pos.needsUpdate = true; leafGeo.computeVertexNormals(); leafGeo.computeBoundingSphere();
  }
  const pageToWorld = (side, px, py) => {
    const x = side === 'L' ? -W + (px / CW) * W : (px / CW) * W;
    return new THREE.Vector3(x, pageY(Math.abs(x)) + 0.001, -H / 2 + (py / CH) * H);
  };

  // ---------- page textures (drawn lazily, redrawn when what they print changes) ----------
  const pages = lessons.map(() => ({ L: null, R: null }));
  function pageTex(i, side, st) {
    const L = lessons[i], ls = st.ls[i];
    const key = side === 'L' ? `${ls.choice}|${ls.flap.open ? 1 : 0}` : `${ls.speed}`;
    let P = pages[i][side];
    if (!P) {
      const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = ANISO;
      const flip = new THREE.CanvasTexture(cv); flip.colorSpace = THREE.SRGBColorSpace; flip.anisotropy = ANISO;
      flip.wrapS = THREE.RepeatWrapping; flip.repeat.x = -1; flip.offset.x = 1;
      P = pages[i][side] = { cv, tex, flip, key: null, regions: [] };
    }
    if (P.key !== key) {
      const ctx = P.cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const r = side === 'L' ? drawLeft(ctx, L, cfg, { choice: ls.choice, flapOpen: ls.flap.open }, th) : drawRight(ctx, L, cfg, { speed: ls.speed }, th);
      P.regions = r.regions; P.key = key; P.tex.needsUpdate = true; P.flip.needsUpdate = true;
      for (const o of r.overflow) { const msg = `[layout] lesson ${L.no} ${side}: ${o}`; if (!overflow.includes(msg)) { overflow.push(msg); console.warn(msg); } }
    }
    return P;
  }
  const overflow = [];

  // flap: a hinged card over the printed answer
  const flapW = (LAYOUT.mainR - LAYOUT.mainX) / CW * W, flapH = LAYOUT.flapH / CH * H;
  const flapPivot = new THREE.Group(); bookG.add(flapPivot);
  const flapC = pageToWorld('L', LAYOUT.mainX, LAYOUT.flapY + LAYOUT.flapH);   // hinged on its lower edge: it swings up towards the reader
  flapPivot.position.set(flapC.x, YP + 0.003, flapC.z);
  const flapGeo = new THREE.PlaneGeometry(flapW, flapH); flapGeo.rotateX(-Math.PI / 2); flapGeo.translate(flapW / 2, 0, -flapH / 2);
  const flapFront = new THREE.Mesh(flapGeo, new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.FrontSide }));
  const flapBack = new THREE.Mesh(flapGeo, new THREE.MeshStandardMaterial({ color: th.flap, roughness: 0.9, side: THREE.BackSide }));
  flapFront.castShadow = true; flapPivot.add(flapFront, flapBack); flapPivot.visible = false;
  const flapTex = lessons.map(L => {
    if (!L.predict) return null;
    const cv = document.createElement('canvas'); cv.width = LAYOUT.mainR - LAYOUT.mainX; cv.height = LAYOUT.flapH;
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; t.userData = { cv, L }; return t;
  });

  // ---------- ink material: flat colour + screen-space hatching where the light falls off + outlines ----------
  const INK = new THREE.Color(th.hatch), PAPER = new THREE.Color(th.paper);
  function inkMaterial(color, o, uFill) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, map: o.map || null, side: o.side ?? THREE.FrontSide,
      transparent: o.opacity != null, opacity: o.opacity ?? 1 });
    const u = { uFill, uHatch: { value: o.hatch ?? 1 }, uInk: { value: INK }, uPaper: { value: PAPER }, uPx: G.uPx, uLit: G.uLit,
      uSunMode: { value: o.sun ? (Array.isArray(o.sun) ? 2 : 1) : 0 }, uSun: { value: new THREE.Vector3(...(Array.isArray(o.sun) ? o.sun : [0, 1, 0])) } };
    m.userData.ink = u; m.userData.sunObj = o.sun && !Array.isArray(o.sun) ? o.sun : null;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = 'varying vec3 vInkW;\nvarying vec3 vInkN;\n' + sh.vertexShader.replace('#include <project_vertex>',
        '#include <project_vertex>\nvInkW = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvInkN = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = `uniform float uFill, uHatch, uPx, uLit; uniform vec3 uInk, uPaper, uSun; uniform int uSunMode;
varying vec3 vInkW; varying vec3 vInkN;\n` + sh.fragmentShader.replace('#include <opaque_fragment>', `
{
  vec3 alb = max(diffuseColor.rgb, vec3(0.02));
  vec3 irr = totalDiffuse / alb;                          // light arriving here (shadows included), per channel
  float s = dot(irr, vec3(0.3333)) / uLit;
  if (uSunMode == 1) s = max(dot(normalize(vInkN), normalize(uSun - vInkW)), 0.0) * 1.15;
  if (uSunMode == 2) s = max(dot(normalize(vInkN), normalize(uSun)), 0.0) * 1.15;
  s = clamp(s, 0.0, 1.0);
  vec2 q = gl_FragCoord.xy / uPx;
  float d1 = abs(fract((q.x + q.y) * 0.7071) - 0.5), d2 = abs(fract((q.x - q.y) * 0.7071) - 0.5);
  float aa = 0.7 / uPx;
  float w1 = clamp((0.52 - s) / 0.52, 0.0, 1.0) * 0.36, w2 = clamp((0.26 - s) / 0.26, 0.0, 1.0) * 0.30;
  float h = max((1.0 - smoothstep(w1 - aa, w1 + aa, d1)) * min(w1 * 30.0, 1.0), (1.0 - smoothstep(w2 - aa, w2 + aa, d2)) * min(w2 * 30.0, 1.0));
  vec3 lit = mix(irr, vec3(uLit), 0.6) * (uSunMode > 0 ? mix(0.75, 1.0, s) : 1.0);
  vec3 col = mix(diffuseColor.rgb * lit, uInk, h * uHatch * 0.82);
  outgoingLight = mix(uPaper * irr, col, uFill);
}
#include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'ink1';
    return m;
  }
  let glowTex = null;
  function glowTexture() {
    if (glowTex) return glowTex;
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128); glowTex = new THREE.CanvasTexture(cv); return glowTex;
  }

  // ---------- diorama context: what a lesson's diorama(D) builds with ----------
  const AREA = { w: (LAYOUT.rightR - LAYOUT.rightX) / CW * W, d: (LAYOUT.dioramaY1 - LAYOUT.dioramaY0) / CH * H };
  const areaC = pageToWorld('R', (LAYOUT.rightX + LAYOUT.rightR) / 2, (LAYOUT.dioramaY0 + LAYOUT.dioramaY1) / 2);
  function makeD(L, idx) {
    const root = new THREE.Group(); root.position.set(areaC.x, YP, areaC.z); bookG.add(root); root.visible = false;
    const uFill = { value: 1 };
    const lineMat = new THREE.LineBasicMaterial({ color: th.hatch, transparent: true, opacity: 1 });
    const hullMat = new THREE.MeshBasicMaterial({ color: th.hatch, side: THREE.BackSide, transparent: true, opacity: 1 });
    const hullU = { uOut: { value: cfg.outline ?? 0.0032 } };
    hullMat.onBeforeCompile = sh => { Object.assign(sh.uniforms, hullU); sh.vertexShader = 'uniform float uOut;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * uOut;'); };
    hullMat.customProgramCacheKey = () => 'hull1';
    const R = { root, uFill, lines: [], hulls: [], pieces: [], callouts: [], screens: [], basics: [], sunMats: [], clicks: [], update: null, lineMat, hullMat };
    const at = (o, p, r) => { if (p) o.position.set(...p); if (r) o.rotation.set(...r); return o; };
    const D = {
      THREE, U, root, area: AREA, theme: th,
      ink(color = th.fill, o = {}) { const m = inkMaterial(color, o, uFill); if (m.userData.sunObj) R.sunMats.push(m); return m; },
      basic(color, o = {}) { const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, ...(o.blend ? { blending: THREE.AdditiveBlending, depthWrite: false } : {}), map: o.map || null, side: o.side ?? THREE.FrontSide }); R.basics.push(m); return m; },
      group(parent = root, pos, rot) { const g = at(new THREE.Group(), pos, rot); parent.add(g); return g; },
      mesh(geo, mat, parent = root, pos, rot, o = {}) {
        const m = at(new THREE.Mesh(geo, mat), pos, rot); parent.add(m);
        const isBasic = mat.isMeshBasicMaterial;
        m.castShadow = o.shadow ?? !isBasic; m.receiveShadow = !isBasic;
        if (!isBasic && o.lines !== false) {
          const ls = new THREE.LineSegments(new THREE.EdgesGeometry(geo, o.crease ?? 32), lineMat); ls.raycast = () => {}; m.add(ls); R.lines.push(ls);
        }
        if (!isBasic && o.hull) { const h = new THREE.Mesh(geo, hullMat); h.raycast = () => {}; h.castShadow = false; m.add(h); R.hulls.push(h); }
        return m;
      },
      box(w, h, d, mat, parent, pos, o = {}) { return D.mesh(new THREE.BoxGeometry(w, h, d), mat, parent, pos, o.rot, o); },
      rbox(w, h, d, r, mat, parent, pos, o = {}) {           // box rounded in its x–y profile, depth along z
        const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
        s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
        const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 5 }); g.translate(0, 0, -d / 2);
        return D.mesh(g, mat, parent, pos, o.rot, o);
      },
      cyl(r1, r2, h, mat, parent, pos, o = {}) {
        const g = new THREE.CylinderGeometry(r1, r2, h, o.seg ?? 28, 1, !!o.open, o.thetaStart ?? 0, o.theta ?? Math.PI * 2);
        if (o.axis === 'x') g.rotateZ(-Math.PI / 2); if (o.axis === 'z') g.rotateX(Math.PI / 2);
        return D.mesh(g, mat, parent, pos, o.rot, { hull: true, ...o });
      },
      sphere(r, mat, parent, pos, o = {}) { return D.mesh(new THREE.SphereGeometry(r, o.seg ?? 40, Math.round((o.seg ?? 40) * 0.6)), mat, parent, pos, o.rot, { hull: true, lines: false, ...o }); },
      lathe(pts, mat, parent, pos, o = {}) { return D.mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), o.seg ?? 36), mat, parent, pos, o.rot, { hull: true, crease: 50, ...o }); },
      torus(Rr, r, mat, parent, pos, o = {}) { return D.mesh(new THREE.TorusGeometry(Rr, r, o.radial ?? 10, o.seg ?? 64, o.arc ?? Math.PI * 2), mat, parent, pos, o.rot, { hull: true, lines: false, ...o }); },
      prism(pts, depth, mat, parent, pos, o = {}) {           // profile in (x, y), extruded along z (axis 'x': profile in (z, y), along x)
        const s = new THREE.Shape(pts.map(p => new THREE.Vector2(...p)));
        const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2);
        if (o.axis === 'x') g.rotateY(Math.PI / 2); if (o.axis === 'y') g.rotateX(-Math.PI / 2);
        return D.mesh(g, mat, parent, pos, o.rot, o);
      },
      tube(points, r, mat, parent = root, o = {}) {
        const curve = points.getPointAt ? points : new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'catmullrom', o.tension ?? 0.5);
        const m = D.mesh(new THREE.TubeGeometry(curve, o.seg ?? 96, r, o.radial ?? 10, false), mat, parent, null, null, { hull: true, lines: false, ...o });
        m.userData.curve = curve; return m;
      },
      curve(points, closed = false) { return new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed); },
      base(w = AREA.w * 0.9, d = AREA.d * 0.8, h = 0.018, mat) { return D.box(w, h, d, mat || D.ink(th.fill), root, [0, h / 2, 0]); },
      piece(obj, delay = 0) { obj.userData.pop = { delay, sy: obj.scale.y }; R.pieces.push(obj); return obj; },
      callout(n, obj, anchor = [0, 0, 0], offset = [0.08, 0.08, 0]) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'callout');
        g.innerHTML = '<line/><text></text>'; g.lastChild.textContent = n; svg.appendChild(g);
        R.callouts.push({ g, obj, a: new THREE.Vector3(...anchor), b: new THREE.Vector3(anchor[0] + offset[0], anchor[1] + offset[1], anchor[2] + offset[2]) });
      },
      screen(w, h, draw, parent = root, pos, rot, o = {}) {
        const res = o.res ?? 320, cv = document.createElement('canvas'); cv.width = res; cv.height = Math.round(res * h / w);
        const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
        const m = D.mesh(new THREE.PlaneGeometry(w, h), D.basic('#ffffff', { map: tex }), parent, pos, rot);
        R.screens.push({ cv, ctx: cv.getContext('2d'), tex, draw }); return m;
      },
      flow(curve, n, o = {}) {                                // dots riding a curve (electrons, water, particles)
        const im = new THREE.InstancedMesh(new THREE.SphereGeometry(o.r ?? 0.006, 10, 8), D.basic(o.color ?? '#2f6fd8'), n);
        (o.parent || root).add(im); im.frustumCulled = false; const v = new THREE.Vector3(), M = new THREE.Matrix4();
        return { mesh: im, place(fn) { for (let i = 0; i < n; i++) { const u = fn(i); curve.getPointAt(((u % 1) + 1) % 1, v); M.makeTranslation(v.x, v.y, v.z); im.setMatrixAt(i, M); } im.instanceMatrix.needsUpdate = true; } };
      },
      glow(color, size, parent = root, pos) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
        at(sp, pos); sp.scale.setScalar(size); parent.add(sp); sp.userData.size = size;
        sp.set = k => { sp.material.opacity = k * uFill.value; sp.visible = k > 0.002; }; return sp;
      },
      text(str, parent = root, pos, o = {}) {                 // flat ink lettering (lies on the base unless rot is given)
        const font = `${o.weight ?? 500} ${o.px ?? 64}px ${o.hand ? 'BookHand' : 'BookSerif'}`, cv = document.createElement('canvas'), c = cv.getContext('2d');
        c.font = font; const w = Math.ceil(c.measureText(str).width) + 16, h = Math.ceil((o.px ?? 64) * 1.3);
        cv.width = w; cv.height = h; c.font = font; c.fillStyle = o.color ?? th.ink; c.textBaseline = 'middle'; c.fillText(str, 8, h / 2);
        const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = ANISO;
        const size = o.size ?? 0.03, m = new THREE.Mesh(new THREE.PlaneGeometry(size * w / h, size), D.basic('#ffffff', { map: tex }));
        at(m, pos, o.rot ?? [-Math.PI / 2, 0, 0]); parent.add(m); return m;
      },
      click(obj, id) { obj.traverse(m => { if (m.isMesh) m.userData.act = id; }); R.clicks.push({ obj, id }); return obj; },
      setLamp(k) { lampK = k; },                              // dim or brighten the desk lamp (call from update, every frame)
    };
    const out = L.diorama ? L.diorama(D) : null;
    R.update = out?.update || null;
    if (!R.pieces.length) {                                   // nothing marked as a piece: the whole diorama pops as one
      const kids = [...root.children], g = new THREE.Group(); root.add(g); kids.forEach(k => g.attach(k)); D.piece(g);
    }
    let lineCount = 0; for (const ls of R.lines) lineCount += ls.geometry.attributes.position.count; R.lineCount = lineCount;
    return R;
  }
  let dio = [];                                       // built in start(), after the fonts load (D.text uses them)

  // ---------- state: everything is derived from (t, events) ----------
  const VIEWS = {
    lamp: { target: [lampPos.x + 0.05, 0.72, lampPos.z + 0.55], az: 0, el: 20, fit: [2.6, 2.15] },
    book: { target: [0, 0.06, 0.06], az: 0, el: 57, fit: [2.32, 1.62] },
    left: { target: [-0.5, 0.07, 0.04], az: 0, el: 64, fit: [1.12, 1.18] },
    right: { target: [0.5, 0.14, -0.08], az: -3, el: 50, fit: [1.12, 1.12] },
    ...(cfg.views || {}),
  };
  const VIEW_CYCLE = ['book', 'left', 'right'];
  let events = [];
  function freshState(t) {
    return {
      t, cur: START, turn: null, popAt: cfg.popAt ?? 0.2,
      cam: { to: Q.has('live') || !cfg.tour ? 'book' : (cfg.startView ?? 'book'), from: null, at: 0, dur: 1 },
      loupe: false, card: null, menu: false,
      ls: lessons.map(L => ({ choice: -1, flap: { open: false, at: -99 }, speed: L.speed?.start ?? 0, speedLog: [[-1e9, L.speed?.factors?.[L.speed?.start ?? 0] ?? 1]], acts: {} })),
    };
  }
  const busy = (st, t) => st.turn && t - st.turn.at < TURN_ALL - 0.25;
  function turnTo(st, i, t) {
    if (i === st.cur || i < 0 || i >= N || busy(st, t)) return;
    st.turn = { from: st.cur, to: i, at: t, dir: i > st.cur ? 1 : -1 }; st.cur = i; st.card = null; st.menu = false; st.popAt = t + POP_AT;
  }
  function apply(st, e) {
    const [cmd, arg] = e.cmd.split(/:(.*)/s); const ls = st.ls[st.cur], L = lessons[st.cur];
    switch (cmd) {
      case 'next': turnTo(st, st.cur + 1, e.t); break;
      case 'prev': turnTo(st, st.cur - 1, e.t); break;
      case 'goto': turnTo(st, +arg, e.t); st.menu = false; break;
      case 'opt': if (!busy(st, e.t)) ls.choice = +arg; break;
      case 'flap': if (L.predict && !busy(st, e.t)) { ls.flap = { open: !ls.flap.open, at: e.t }; st.card = ls.flap.open ? { type: 'why', at: e.t } : null; } break;
      case 'card': st.card = st.card?.type === arg ? null : { type: arg, at: e.t }; st.menu = false; break;
      case 'speed': if (L.speed) { ls.speed = +arg; ls.speedLog.push([e.t, L.speed.factors?.[+arg] ?? 1]); } break;
      case 'act': if (!busy(st, e.t)) { const a = ls.acts[arg]; ls.acts[arg] = { on: !a?.on, at: e.t }; st.card = null; } break;
      case 'loupe': st.loupe = arg === 'on' ? true : arg === 'off' ? false : !st.loupe; break;
      case 'menu': st.menu = !st.menu; st.card = null; break;
      case 'close': st.card = null; st.menu = false; break;
      case 'view': {
        const to = arg === 'cycle' ? VIEW_CYCLE[(VIEW_CYCLE.indexOf(st.cam.to) + 1) % VIEW_CYCLE.length] : arg;
        if (VIEWS[to]) st.cam = { from: camPose(st, e.t), to, at: e.t, dur: e.dur ?? 1.6 };
        break;
      }
    }
  }
  function derive(t) { const st = freshState(t); for (const e of events) { if (e.t > t) break; apply(st, e); } return st; }
  const simTime = (ls, t) => { let s = 0; for (let i = 0; i < ls.speedLog.length; i++) { const a = Math.max(ls.speedLog[i][0], 0), b = i + 1 < ls.speedLog.length ? ls.speedLog[i + 1][0] : t; if (b > a) s += (Math.min(b, t) - a) * ls.speedLog[i][1]; } return s; };

  // ---------- camera ----------
  let vw = 1, vh = 1;
  function viewPose(name) {
    const v = VIEWS[name], f = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), asp = vw / vh;
    const dist = Math.max(v.fit[1] / 2 / f, v.fit[0] / 2 / (f * asp)) * (asp < 0.8 ? 0.98 : 1.04);
    // portrait screens: look down more steeply so the spread uses the tall frame
    const el = asp < 0.8 && name !== 'lamp' ? Math.max(v.el, v.portraitEl ?? 74) : v.el;
    return { target: v.target, az: v.az, el, dist };
  }
  function camPose(st, t) {
    const to = viewPose(st.cam.to); if (!st.cam.from) return to;
    const k = U.easeInOut((t - st.cam.at) / st.cam.dur), f = st.cam.from;
    return { target: f.target.map((x, i) => U.lerp(x, to.target[i], k)), az: U.lerp(f.az, to.az, k), el: U.lerp(f.el, to.el, k), dist: Math.exp(U.lerp(Math.log(f.dist), Math.log(to.dist), k)) };
  }
  function placeCamera(p) {
    const az = THREE.MathUtils.degToRad(p.az), elv = THREE.MathUtils.degToRad(p.el);
    camera.position.set(p.target[0] + p.dist * Math.sin(az) * Math.cos(elv), p.target[1] + p.dist * Math.sin(elv), p.target[2] + p.dist * Math.cos(az) * Math.cos(elv));
    camera.lookAt(...p.target); camera.updateMatrixWorld();
    scene.fog.near = p.dist + 2.2; scene.fog.far = p.dist + 8;   // fog only swallows the far desk, at any distance
  }
  const toScreen = v => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * vw, (1 - p.y) / 2 * vh, p.z]; };

  // ---------- HUD ----------
  const chip = el('div', 'chip', `<button class="nav" data-cmd="prev" aria-label="Previous lesson">${SVG.prev}</button>
    <div class="meta"><div class="kick"><b></b><span class="icons"></span></div><div class="ttl"></div></div>
    <button class="nav" data-cmd="next" aria-label="Next lesson">${SVG.next}</button>`, ui);
  const tools = el('div', 'tools', `<button data-cmd="play" aria-label="Play the tour">${SVG.play}</button><button data-cmd="menu" aria-label="Contents">${SVG.menu}</button>
    <button data-cmd="loupe" aria-label="Magnifier">${SVG.loupe}</button><button data-cmd="view:cycle" aria-label="Change view">${SVG.view}</button>
    <button data-cmd="sound" aria-label="Sound">${SVG.sound}</button>`, ui);
  const menu = el('div', 'menu', `<div class="k">${esc(cfg.subject || 'Contents')}</div><div class="mt">${esc(cfg.title || '')}</div>` +
    lessons.map((L, i) => `<button data-cmd="goto:${i}"><span>${esc(L.no)}</span>${esc(L.title)}</button>`).join(''), ui);
  const card = el('div', 'card', '', ui);
  el('div', 'credit', esc(cfg.credit || ''), ui);
  const hint = el('div', 'hint', esc(cfg.hint || 'Click the page · ← → turn pages · M magnifier'), ui);
  const cursor = el('div', 'cursor', CURSOR, document.body), ripple = el('div', 'ripple', null, document.body);
  const icon = ICONS[cfg.icon || 'bulb'] || ICONS.bulb;
  let hudKey = '';
  function drawHud(st) {
    const L = lessons[st.cur];
    const key = `${st.cur}|${st.menu}|${touring}|${soundOn}|${st.loupe || liveLoupe}`;
    if (key !== hudKey) {
      hudKey = key;
      chip.querySelector('.kick b').textContent = `${cfg.lessonWord || 'Lesson'} ${L.no}`;
      chip.querySelector('.icons').innerHTML = lessons.map((_, i) => `<svg viewBox="0 0 14 14" class="${i < st.cur ? 'done' : i === st.cur ? 'cur' : ''}">${icon}</svg>`).join('');
      chip.querySelector('.ttl').textContent = L.title;
      chip.querySelector('[data-cmd=prev]').disabled = st.cur === 0; chip.querySelector('[data-cmd=next]').disabled = st.cur === N - 1;
      menu.classList.toggle('on', st.menu);
      menu.querySelectorAll('button').forEach((b, i) => b.classList.toggle('cur', i === st.cur));
      tools.querySelector('[data-cmd=play]').innerHTML = touring && !RENDER ? SVG.pause : SVG.play;
      tools.querySelector('[data-cmd=sound]').innerHTML = soundOn ? SVG.sound : SVG.mute;
      tools.querySelector('[data-cmd=loupe]').classList.toggle('on', st.loupe || liveLoupe);
    }
  }
  let cardKey = '';
  function drawCard(st) {
    const c = st.card, L = lessons[st.cur];
    const k = c ? U.easeOut((st.t - c.at) / 0.3) : 0;
    if (!c || k <= 0) { card.style.display = 'none'; cardKey = ''; return; }
    const ls = st.ls[st.cur], key = `${st.cur}|${c.type}|${ls.choice}`;
    if (key !== cardKey) {
      cardKey = key; let h = '';
      if (c.type === 'terms') h = `<div class="k">${esc(cfg.termsWord || 'Key words')}</div><dl>${L.terms.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>`;
      else if (c.type === 'predict') h = `<div class="k">${esc(cfg.predictWord || 'Predict')}</div><div class="q">${esc(L.predict.q)}</div>` +
        L.predict.options.map((o, i) => `<button data-cmd="opt:${i}" class="${ls.choice === i ? 'on' : ''}"><i></i>${esc(o)}</button>`).join('');
      else if (c.type === 'why') h = `<div class="k">${esc(L.flap?.kicker || 'Why?')}</div><p>${esc(L.predict.why)}</p>` +
        (ls.choice >= 0 ? `<div class="verdict ${ls.choice === L.predict.answer ? 'ok' : ''}">${ls.choice === L.predict.answer ? 'You predicted it.' : 'Answer: ' + esc(L.predict.options[L.predict.answer])}</div>` : '');
      else if (c.type === 'formula') h = `<div class="k">${esc(cfg.formulaWord || 'Formula')}</div><div class="f">${esc(L.formula.text)}</div>${L.formula.caption ? `<p>${esc(L.formula.caption)}</p>` : ''}` +
        (L.formula.example ? `<div class="ex">${L.formula.example.map(esc).join('<br>')}</div>` : '');
      else if (c.type === 'challenge') h = `<div class="k">${esc(cfg.challengeWord || 'Challenge')}</div><p>${esc(L.challenge)}</p>`;
      else h = `<p>${esc(c.type)}</p>`;
      card.innerHTML = `<button class="x" data-cmd="close" aria-label="Close">${SVG.close}</button>` + h;
      card.dataset.type = c.type;
    }
    card.style.display = 'block';
    // place next to the region it explains
    const regionId = { terms: 'card:terms', predict: 'card:predict', why: 'flap', formula: 'card:formula', challenge: 'challenge' }[c.type];
    const P = pages[st.cur].L, r = P?.regions.find(r => r.id === regionId);
    const cw = card.offsetWidth, ch = card.offsetHeight; let x = vw / 2 - cw / 2, y = vh / 2 - ch / 2;
    if (r) {
      const a = toScreen(pageToWorld('L', r.x, r.y)), b = toScreen(pageToWorld('L', r.x + r.w, r.y + r.h));
      x = (a[0] + b[0]) / 2 - cw / 2; y = a[1] - ch - 14; if (y < 70) y = b[1] + 14;
    }
    x = U.clamp(x, 12, vw - cw - 12); y = U.clamp(y, 64, Math.max(64, vh - ch - 12));
    card.style.transform = `translate(${x}px, ${y + (1 - k) * 10}px)`; card.style.opacity = k;
  }

  // ---------- loupe: a zoomed render of the spot under the cursor, masked to a lens ----------
  const LOUPE = { r: 92, zoom: 2.3 };
  const loupeRT = new THREE.WebGLRenderTarget(512, 512, { samples: 4 }); loupeRT.texture.colorSpace = THREE.SRGBColorSpace;
  const loupeScene = new THREE.Scene(), loupeCam = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);
  const loupeMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    transparent: true, depthTest: false, uniforms: { map: { value: loupeRT.texture } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D map; varying vec2 vUv;
      void main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard;
        vec2 uv = 0.5 + p * (0.92 + 0.08 * r * r) * 0.5;               // a little barrel bulge
        vec3 c = texture2D(map, uv).rgb;
        float rim = smoothstep(0.90, 0.97, r); c = mix(c, vec3(0.93, 0.92, 0.9), rim * 0.85);
        c *= 1.0 - smoothstep(0.97, 1.0, r) * 0.6; c += vec3(0.06) * pow(max(0.0, 1.0 - length(p - vec2(-0.45, 0.5))), 3.0);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  loupeScene.add(loupeMesh);
  function drawLoupe(pos) {
    const r = LOUPE.r * (vh < 600 ? 0.75 : 1), src = r / LOUPE.zoom;
    camera.setViewOffset(vw, vh, pos[0] - src, pos[1] - src, src * 2, src * 2);
    renderer.setRenderTarget(loupeRT); renderer.render(scene, camera); renderer.setRenderTarget(null);
    camera.clearViewOffset();
    loupeCam.right = vw; loupeCam.top = vh; loupeCam.updateProjectionMatrix();
    loupeMesh.position.set(pos[0], vh - pos[1], 0); loupeMesh.scale.set(r * 2, r * 2, 1);
    renderer.autoClear = false; renderer.render(loupeScene, loupeCam); renderer.autoClear = true;
  }

  // ---------- tour: timed clicks with a drawn cursor ----------
  let TOUR_EVENTS = [], CURSOR_KEYS = [], CLICKS = [], touring = false, DURATION = cfg.duration ?? 20;
  function targetCmd(tg) {
    if (tg.startsWith('hud.')) return tg.slice(4) === 'view' ? 'view:cycle' : tg.slice(4);
    if (tg.startsWith('menu:')) return 'goto:' + tg.slice(5);
    if (tg.startsWith('part:')) return 'act:' + tg.slice(5);
    if (/^[LR]:/.test(tg)) return tg.slice(2);
    return null;
  }
  function targetPos(tg, st) {
    if (Array.isArray(tg)) return [tg[0] * vw, tg[1] * vh];
    if (tg.startsWith('hud.') || tg.startsWith('menu:')) {
      const sel = tg.startsWith('menu:') ? `.menu [data-cmd="goto:${tg.slice(5)}"]` : `[data-cmd="${targetCmd(tg)}"]`;
      const b = ui.querySelector(sel)?.getBoundingClientRect(); return b ? [b.x + b.width / 2, b.y + b.height / 2] : [vw / 2, vh / 2];
    }
    if (tg.startsWith('part:')) {
      const c = dio[st.cur].clicks.find(c => c.id === tg.slice(5)); if (!c) return [vw / 2, vh / 2];
      const box = new THREE.Box3().setFromObject(c.obj), p = box.getCenter(new THREE.Vector3());
      p.y = box.min.y + (box.max.y - box.min.y) * 0.3;          // low in the box: on the part, not in the air above it
      const s = toScreen(p); return [s[0], s[1]];
    }
    const m = tg.match(/^([LR])[@:](.*)$/); if (!m) return [vw / 2, vh / 2];
    const side = m[1];
    if (tg[1] === '@') { const [u, v] = m[2].split(',').map(Number); const s = toScreen(pageToWorld(side, u * CW, v * CH)); return [s[0], s[1]]; }
    const r = pages[st.cur][side]?.regions.find(r => r.id === m[2]); if (!r) return [vw / 2, vh / 2];
    const s = toScreen(pageToWorld(side, r.x + (r.id.startsWith('opt') ? Math.min(r.w, 380) * 0.25 : r.w / 2), r.y + r.h / 2)); return [s[0], s[1]];
  }
  function tour(steps) {
    TOUR_EVENTS = []; CURSOR_KEYS = []; CLICKS = []; let end = 0;
    for (const s of steps) {
      const dur = s.dur ?? 0.75;
      if (s.view) TOUR_EVENTS.push({ t: s.t, cmd: 'view:' + s.view, dur: s.dur ?? 1.8 });
      if (s.cmd) TOUR_EVENTS.push({ t: s.t, cmd: s.cmd });
      if (s.loupe != null) TOUR_EVENTS.push({ t: s.t, cmd: s.loupe ? 'loupe:on' : 'loupe:off' });
      if (s.move) CURSOR_KEYS.push({ t: s.t, target: s.move, dur });
      if (s.click) { CURSOR_KEYS.push({ t: s.t, target: s.click, dur }); const c = targetCmd(s.click); if (c) TOUR_EVENTS.push({ t: s.t + dur, cmd: c }); CLICKS.push(s.t + dur); }
      if (s.hide) CURSOR_KEYS.push({ t: s.t, hide: true });
      end = Math.max(end, s.t + (s.view ? s.dur ?? 1.8 : dur));
    }
    TOUR_EVENTS.sort((a, b) => a.t - b.t);
    DURATION = cfg.duration ?? Math.ceil(end + 1.5);
    api.DURATION = window.DURATION = DURATION;
  }
  function cursorAt(st) {
    const t = st.t; let i = -1; for (let j = 0; j < CURSOR_KEYS.length; j++) if (CURSOR_KEYS[j].t <= t) i = j;
    if (i < 0 || CURSOR_KEYS[i].hide) return null;
    const k = CURSOR_KEYS[i], to = targetPos(k.target, st);
    let from = null; for (let j = i - 1; j >= 0; j--) if (!CURSOR_KEYS[j].hide) { from = targetPos(CURSOR_KEYS[j].target, st); break; }
    if (!from || CURSOR_KEYS[i - 1]?.hide) from = [to[0] + vw * 0.12, to[1] + vh * 0.18];
    const e = U.easeInOut((t - k.t) / k.dur);
    return [U.lerp(from[0], to[0], e), U.lerp(from[1], to[1], e) - Math.sin(Math.PI * e) * 18];
  }

  // ---------- frame ----------
  let liveLoupe = false, livePos = null, soundOn = true, lastSt = null;
  const tmp = new THREE.Vector3();
  function frame(t) {
    const st = derive(t); st.t = t; lastSt = st;
    placeCamera(camPose(st, t));
    // which lesson is printed where, and the leaf
    const tr = st.turn, tt = tr ? t - tr.at : 1e9, turning = tr && tt < TURN_AT + TURN_DUR;
    let leftI = st.cur, rightI = st.cur;
    if (turning) {
      const lifted = tt >= TURN_AT; const p = U.clamp((tt - TURN_AT) / TURN_DUR);
      if (tr.dir > 0) { leftI = tr.from; rightI = lifted ? tr.to : tr.from; }
      else { leftI = lifted ? tr.to : tr.from; rightI = tr.from; }
      leafFront.visible = leafBack.visible = lifted;
      if (lifted) {
        const pp = tr.dir > 0 ? p : 1 - p; poseLeaf(pp);
        leafFront.material.map = pageTex(tr.dir > 0 ? tr.from : tr.to, 'R', st).tex;
        leafBack.material.map = pageTex(tr.dir > 0 ? tr.to : tr.from, 'L', st).flip;
        leafFront.material.needsUpdate = leafBack.material.needsUpdate = true;
      }
    } else leafFront.visible = leafBack.visible = false;
    const lp = pageTex(leftI, 'L', st), rp = pageTex(rightI, 'R', st);
    if (leftPage.material.map !== lp.tex) { leftPage.material.map = lp.tex; leftPage.material.needsUpdate = true; }
    if (rightPage.material.map !== rp.tex) { rightPage.material.map = rp.tex; rightPage.material.needsUpdate = true; }
    // flap
    const ls = st.ls[st.cur], fk = ls.flap.open ? U.easeOut((t - ls.flap.at) / 0.7) : 1 - U.ease((t - ls.flap.at) / 0.45);
    flapPivot.visible = !turning && !!flapTex[st.cur] && fk > 0.001;
    if (flapPivot.visible) {
      const ft = flapTex[st.cur]; if (!ft.userData.drawn) { drawFlap(ft.userData.cv.getContext('2d'), ft.userData.cv.width, ft.userData.cv.height, th, ft.userData.L.flap); ft.needsUpdate = true; ft.userData.drawn = true; }
      if (flapFront.material.map !== ft) { flapFront.material.map = ft; flapFront.material.needsUpdate = true; }
      flapPivot.rotation.x = fk * 2.15; flapPivot.position.y = YP + 0.003 + Math.sin(fk * Math.PI) * 0.01;
    }
    // dioramas: fold the old one, pop the new one
    lampK = 1;
    for (let i = 0; i < N; i++) {
      const R = dio[i]; let pop = 0;
      if (i === st.cur) pop = U.clamp((t - st.popAt) / POP_DUR);
      else if (tr && i === tr.from && tt < FOLD) pop = 1 - U.clamp(tt / FOLD);
      R.root.visible = pop > 0.001;
      R.pop = pop;
      if (!R.root.visible) { R.callouts.forEach(c => c.g.style.display = 'none'); continue; }
      const lineK = U.clamp(pop / 0.55), fillK = U.ease((pop - 0.4) / 0.6);
      R.uFill.value = fillK; R.lineMat.opacity = Math.min(1, lineK * 1.4);
      for (const ls_ of R.lines) ls_.geometry.setDrawRange(0, Math.ceil(ls_.geometry.attributes.position.count * lineK / 2) * 2);
      R.hullMat.opacity = U.clamp((pop - 0.15) / 0.4); R.hullMat.visible = pop > 0.15;
      for (const m of R.basics) m.opacity = fillK;
      for (const p of R.pieces) { const k = U.clamp((pop - p.userData.pop.delay * 0.4) / 0.6); p.scale.y = p.userData.pop.sy * Math.max(0.002, U.backOut(k)); }
      for (const m of R.sunMats) m.userData.sunObj.getWorldPosition(m.userData.ink.uSun.value);
      {
        const L = lessons[i], lsi = st.ls[i];
        const s = {
          t: t - st.popAt, time: t, simT: simTime(lsi, t), pop, speed: lsi.speedLog[lsi.speedLog.length - 1][1],
          choice: lsi.choice, flap: lsi.flap.open,
          on: id => !!lsi.acts[id]?.on,
          since: id => lsi.acts[id] ? t - lsi.acts[id].at : -1,
          k: (id, dur = 0.8, ease = U.easeInOut) => { const a = lsi.acts[id]; if (!a) return 0; const e = ease((t - a.at) / dur); return a.on ? e : 1 - e; },
          simSince: id => { const a = lsi.acts[id]; if (!a?.on) return -1; return simTime(lsi, t) - simTime(lsi, a.at); },
        };
        R.update?.(s, L);
        for (const sc of R.screens) { sc.draw(sc.ctx, s, sc.cv.width, sc.cv.height); sc.tex.needsUpdate = true; }
      }
    }
    spot.intensity = LAMP_POWER * lampK; lamp.userData.set(lampK);
    // shadows + main render
    renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera);
    // callouts (after the render so they sit on the frame we just drew)
    for (let i = 0; i < N; i++) {
      const R = dio[i]; const show = R.root.visible && i === st.cur && R.pop > 0.85;
      for (const c of R.callouts) {
        if (!show) { c.g.style.display = 'none'; continue; }
        const a = toScreen(c.obj.localToWorld(tmp.copy(c.a))), b = toScreen(c.obj.localToWorld(tmp.copy(c.b)));
        c.g.style.display = ''; c.g.style.opacity = U.clamp((R.pop - 0.85) / 0.15);
        const ln = c.g.firstChild, tx = c.g.lastChild, dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, gap = 14;
        ln.setAttribute('x1', a[0]); ln.setAttribute('y1', a[1]); ln.setAttribute('x2', b[0] - dx / d * gap); ln.setAttribute('y2', b[1] - dy / d * gap);
        tx.setAttribute('x', b[0]); tx.setAttribute('y', b[1]); tx.style.fontSize = Math.max(11, Math.min(26, Math.min(vh * 0.024, vw * 0.03))) + 'px';
      }
    }
    drawHud(st); drawCard(st);
    // cursor, ripple, loupe
    let cpos = null;
    if (touring || RENDER) cpos = cursorAt(st);
    if (cpos) {
      cursor.style.display = 'block'; cursor.style.transform = `translate(${cpos[0] - 3}px, ${cpos[1] - 2}px)`;
      const c = CLICKS.filter(c => c <= t && t - c < 0.45).pop();
      if (c != null) { const k = (t - c) / 0.45; ripple.style.display = 'block'; ripple.style.transform = `translate(${cpos[0]}px, ${cpos[1]}px) scale(${0.4 + k * 1.2})`; ripple.style.opacity = 1 - k; }
      else ripple.style.display = 'none';
    } else { cursor.style.display = 'none'; ripple.style.display = 'none'; }
    const lpos = touring || RENDER ? (st.loupe ? cpos : null) : (liveLoupe || st.loupe) && livePos ? livePos : null;
    if (lpos) drawLoupe(lpos);
    hint.style.opacity = !touring && !RENDER && !st.card && !st.menu ? 1 : 0;
    return st;
  }

  // ---------- input ----------
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(x, y) {
    if (!lastSt) return null;
    ndc.set(x / vw * 2 - 1, -(y / vh) * 2 + 1); raycaster.setFromCamera(ndc, camera);
    const st = lastSt, R = dio[st.cur];
    const objs = [leftPage, rightPage]; if (flapPivot.visible) objs.push(flapFront);
    if (R.root.visible && R.pop > 0.9) objs.push(R.root);
    const hits = raycaster.intersectObjects(objs, true);
    const act = hits.find(h => h.object.userData.act);          // a part you can poke wins over wires or props in front of it
    if (act) return 'act:' + act.object.userData.act;
    for (const h of hits) {
      if (h.object === flapFront) return 'flap';
      if (h.object === leftPage || h.object === rightPage) {
        const side = h.object.userData.side, px = h.uv.x * CW, py = (1 - h.uv.y) * CH;
        const r = pages[st.cur][side]?.regions.find(r => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h && r.id !== 'diorama' && r.id !== 'title' && !r.id.startsWith('legend'));
        return r ? r.id : null;
      }
      if (R.root.visible) return null;      // a diorama part that does nothing
    }
    return null;
  }
  let clock0 = 0, tNow = 0;
  const nowT = () => (performance.now() - clock0) / 1000;
  function stopTour() { if (!touring) return; touring = false; events = events.filter(e => e.t <= tNow); hudKey = ''; }
  function cmd(c) {
    if (c === 'play') { if (touring) { stopTour(); return; } events = TOUR_EVENTS.slice(); touring = true; clock0 = performance.now(); hudKey = ''; return; }
    if (c === 'sound') { soundOn = !soundOn; hudKey = ''; return; }
    stopTour();
    if (c === 'loupe') { liveLoupe = !liveLoupe; if (lastSt?.loupe) events.push({ t: tNow, cmd: 'loupe:off' }); hudKey = ''; return; }
    if (lastSt && lastSt.cam.to === 'lamp') events.push({ t: tNow, cmd: 'view:book', dur: 1.4 });
    events.push({ t: tNow, cmd: c }); sfx(c);
  }
  ui.addEventListener('click', e => { const b = e.target.closest('[data-cmd]'); if (b && !b.disabled) { e.stopPropagation(); cmd(b.dataset.cmd); } });
  canvas.addEventListener('pointermove', e => { livePos = [e.clientX, e.clientY]; if (!touring) canvas.style.cursor = pick(e.clientX, e.clientY) ? 'pointer' : 'default'; });
  canvas.addEventListener('pointerleave', () => { livePos = null; });
  canvas.addEventListener('click', e => { livePos = [e.clientX, e.clientY]; const c = pick(e.clientX, e.clientY); if (c) cmd(c); else if (lastSt?.card || lastSt?.menu) cmd('close'); else stopTour(); });
  addEventListener('keydown', e => {
    const k = { ArrowRight: 'next', ArrowLeft: 'prev', m: 'loupe', M: 'loupe', Escape: 'close', 0: 'view:lamp', 1: 'view:book', 2: 'view:left', 3: 'view:right', ' ': 'play' }[e.key];
    if (k) { e.preventDefault(); cmd(k); }
  });
  // small synthesized sounds: a paper swoosh for turns, a tick for clicks
  let actx = null;
  function sfx(c) {
    if (!soundOn || RENDER) return;
    try {
      actx ??= new AudioContext(); const t = actx.currentTime, turn = /^(next|prev|goto)/.test(c);
      const len = turn ? 0.55 : 0.05, buf = actx.createBuffer(1, Math.ceil(actx.sampleRate * len), actx.sampleRate), d = buf.getChannelData(0);
      const r = U.rng(7); for (let i = 0; i < d.length; i++) d[i] = (r() * 2 - 1);
      const src = actx.createBufferSource(); src.buffer = buf;
      const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(turn ? 900 : 2500, t); if (turn) f.frequency.linearRampToValueAtTime(3200, t + len); f.Q.value = 0.8;
      const g = actx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(turn ? 0.16 : 0.12, t + (turn ? 0.12 : 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      src.connect(f).connect(g).connect(actx.destination); src.start(t);
    } catch { /* audio is optional */ }
  }

  // ---------- size, start ----------
  function fit() {
    vw = innerWidth; vh = innerHeight; renderer.setSize(vw, vh, false); camera.aspect = vw / vh; camera.updateProjectionMatrix();
    const bufH = vh * renderer.getPixelRatio(); G.uPx.value = U.clamp(bufH / 1080 * 3.4, 2.4, 8);
    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`); document.body.classList.toggle('portrait', vh > vw);
    if (lastSt) frame(tNow);
  }
  addEventListener('resize', fit);
  function renderAt(t) { tNow = t; return frame(t); }
  const api = { where: tg => targetPos(tg, lastSt), pick: (x, y) => pick(x, y), THREE, U, scene, camera, renderer, lessons, get dio() { return dio; }, cmd, tour, renderAt, overflow, views: VIEWS, get state() { return lastSt; }, DURATION };

  function start() {
    if (cfg.tour && !TOUR_EVENTS.length) tour(cfg.tour);
    api.DURATION = window.DURATION = DURATION;
    const fonts = ['400 30px BookSerif', '600 30px BookSerif', '700 30px BookSerif', 'italic 400 30px BookSerif', 'italic 600 30px BookSerif', '500 30px BookHand', '600 14px Inter'];
    const ready = Promise.all(fonts.map(f => document.fonts.load(f))).then(() => document.fonts.ready).then(() => {
      dio = lessons.map((L, i) => makeD(L, i));
      fit(); events = (RENDER || !Q.has('live')) ? TOUR_EVENTS.slice() : []; touring = !RENDER && !Q.has('live') && TOUR_EVENTS.length > 0;
      renderAt(RENDER ? 0 : Number(Q.get('t') || 0));
    });
    window.ready = ready; window.renderAt = renderAt; window.book = api;
    if (RENDER) return ready;
    ready.then(() => {
      clock0 = performance.now() - Number(Q.get('t') || 0) * 1000; let lastT = tNow;
      const loop = () => {
        tNow = nowT();
        if (touring && tNow > DURATION) { touring = false; hudKey = ''; events.push({ t: tNow, cmd: 'view:book', dur: 1.6 }); }
        if (touring) for (const e of events) if (e.t > lastT && e.t <= tNow) sfx(e.cmd);
        lastT = tNow; frame(tNow); requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    return ready;
  }
  api.start = start;
  return api;
}

// ---------------------------------------------------------------------------------------------------------------
function woodCanvas(base) {
  const w = 2048, h = 1024, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d'), img = c.createImageData(w, h), d = img.data;
  const b = new (class { constructor() { this.p = []; const r = U.rng(9); for (let i = 0; i < 512; i++) this.p.push(r()); } n(x) { const i = Math.floor(x), f = x - i, a = this.p[i & 511], bb = this.p[(i + 1) & 511]; return a + (bb - a) * f * f * (3 - 2 * f); } })();
  const col = new THREE.Color(base), br = col.r * 255, bg = col.g * 255, bb = col.b * 255;
  const planks = 5, ph = h / planks;
  for (let y = 0; y < h; y++) {
    const pk = Math.floor(y / ph), py = (y % ph) / ph;
    for (let x = 0; x < w; x++) {
      const xx = x / w * 7 + pk * 13.7, warp = b.n(xx * 1.3 + pk * 3) * 2.2;
      const grain = Math.sin((py * 34 + warp * 6 + b.n(xx * 9) * 0.8) * Math.PI);
      const fine = b.n(x * 0.9 + y * 0.03 + pk * 77) - 0.5;
      let k = 0.86 + grain * 0.07 + fine * 0.08 + (b.n(xx * 0.7 + pk) - 0.5) * 0.25;
      if (py < 0.006 || py > 0.994) k *= 0.45;
      const i = (y * w + x) * 4; d[i] = br * k * 1.04; d[i + 1] = bg * k; d[i + 2] = bb * k * 0.95; d[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0); return cv;
}

function buildLamp(th) {
  const g = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: th.brass, roughness: 0.32, metalness: 0.35 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.37, 0.07, 48), brass); base.scale.z = 0.62; base.position.y = 0.035;
  const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.06, 48), brass); base2.scale.z = 0.62; base2.position.y = 0.095;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 1.08, 20), brass); stem.position.y = 0.66;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 20, 14), brass); knob.position.y = 0.18;
  const arm = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 10, 32, Math.PI * 0.62), brass); arm.position.set(0, 1.12, 0.2); arm.rotation.set(0, Math.PI / 2, Math.PI * 0.36);
  const shadeMat = new THREE.MeshStandardMaterial({ color: th.shade, roughness: 0.22, metalness: 0.1, emissive: th.shade, emissiveIntensity: 0.3, side: THREE.FrontSide });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.05, 48, 1, false, -Math.PI * 0.62, Math.PI * 1.24), shadeMat);
  shade.rotation.set(0.08, 0, Math.PI / 2); shade.position.set(0.05, 1.3, 0.42); shade.scale.set(1, 1, 0.85);
  const inner = new THREE.Mesh(shade.geometry, new THREE.MeshBasicMaterial({ color: '#fff1cf', side: THREE.BackSide }));
  inner.rotation.copy(shade.rotation); inner.position.copy(shade.position); inner.scale.copy(shade.scale).multiplyScalar(0.985);
  const caps = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.03, 48, 1, false, -Math.PI * 0.62, Math.PI * 1.24), brass); m.rotation.copy(shade.rotation); m.scale.copy(shade.scale); m.position.copy(shade.position).add(new THREE.Vector3(s * 0.53, 0, 0)); return m; });
  const chain = new THREE.Group(); for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), brass); b.position.set(0.32, 1.2 - i * 0.03, 0.42); chain.add(b); }
  const pull = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.01, 0.06, 12), brass); pull.position.set(0.32, 0.92, 0.42); chain.add(pull);
  const glow = new THREE.PointLight(th.glow, 1.4, 2.6, 1.2); glow.position.set(0.05, 1.18, 0.42);
  for (const m of [base, base2, stem, knob, arm, shade, ...caps]) { m.castShadow = true; m.receiveShadow = true; }
  g.add(base, base2, stem, knob, arm, shade, inner, ...caps, chain, glow);
  const innerC = new THREE.Color('#fff1cf'), offC = new THREE.Color('#6a6250');
  g.userData.set = k => { shadeMat.emissiveIntensity = 0.08 + 0.22 * k; inner.material.color.copy(offC).lerp(innerC, k); glow.intensity = 1.4 * k; };
  return g;
}
