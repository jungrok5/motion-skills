// machine-sim — an interactive 3D machine on a study sheet: a three.js model built in code, a HUD whose
// readouts come from the same model that poses the parts, view presets, and display modes
// (labels with leader lines, solver overlay, x-ray, exploded, isolate one part, orbit).
//
// One deterministic state S advances in fixed steps (DT). The live page steps it from the clock and from
// user input; a tour (a list of timed clicks and slider drags, with a drawn cursor) replays it from t = 0,
// so window.renderAt(t) gives the same frame every time and scripts/render.mjs can bake an MP4.
//
//   import { createSim, THREE, U } from '../../kit/machine-sim.js';
//   const sim = createSim({ views, display, isolate });
//   const K = sim.K;                      // geometry + material helpers
//   ... build the model under sim.root, register parts with sim.part(obj, {...})
//   sim.model({ init, inputs, commands, step, pose, follow, hud, solver });
//   ... build panels with sim.hud.*;  sim.tour([...]);  sim.start();
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export { THREE };

export const DT = 1 / 60;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const approach = (x, target, step) => x < target ? Math.min(target, x + step) : Math.max(target, x - step);
const wrap = (x, m = 1) => ((x % m) + m) % m;
const deg = r => r * 180 / Math.PI, rad = d => d * Math.PI / 180;
const angDiff = (a, b) => wrap(b - a + 180, 360) - 180;   // degrees, shortest a→b
function rng(seed = 1) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), s ^= s >>> 16) >>> 0) / 4294967296; }
export const U = { clamp, lerp, smooth, ease, approach, wrap, deg, rad, angDiff, rng };

const Q = new URLSearchParams(location.search);
const RENDER = Q.has('render');

export function createSim(cfg = {}) {
  const {
    canvas = document.getElementById('c'),
    views = { hero: { az: 35, el: 22, dist: 14, target: [0, 1.5, 0], fov: 30 } },
    startView = Object.keys(views)[0],
    display = [['labels', 'Labels'], ['xray', 'X-ray'], ['exploded', 'Exploded'], ['orbit', 'Orbit']],
    isolate = null,               // { group: 'leg-FL', view: 'leg' } — what the 'isolate' display mode keeps solid
    bg = '#ebeae6', grid = 1, gridColor = '#cbc7be', shadowBox = 9, orbitSpeed = 14,
  } = cfg;
  document.documentElement.classList.toggle('render', RENDER);

  // ---------- stage ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: RENDER });
  renderer.setPixelRatio(RENDER ? 1 : Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  scene.fog = new THREE.Fog(bg, 34, 85);
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 400);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xcfc9bd, 2.1);
  const sun = new THREE.DirectionalLight(0xffffff, 2.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -shadowBox, right: shadowBox, top: shadowBox, bottom: -shadowBox, near: 1, far: 60 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 5;
  const fill = new THREE.DirectionalLight(0xfff4ea, 0.7);
  scene.add(hemi, sun, sun.target, fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShadowMaterial({ color: 0x3a3630, opacity: 0.2 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  const gridLines = new THREE.GridHelper(120, Math.round(120 / grid), gridColor, gridColor);
  gridLines.material.transparent = true; gridLines.material.opacity = 0.9; gridLines.position.y = 0.002;
  scene.add(ground, gridLines);
  const root = new THREE.Group(); scene.add(root);           // the machine
  const solverGroup = new THREE.Group(); scene.add(solverGroup);  // world-space overlays (drawn by model.solver)

  // ---------- helpers: materials + geometry ----------
  const mats = new Map();
  const K = {
    mat(color, o = {}) {
      const key = color + JSON.stringify(o);
      if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.62, metalness: o.metal ?? 0.05,
        emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1, side: o.side ?? THREE.FrontSide, flatShading: !!o.flat }));
      return mats.get(key);
    },
    mesh(geo, mat, parent, pos, rot) {
      const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
      if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot);
      if (parent) parent.add(m); return m;
    },
    group(parent, pos, rot) { const g = new THREE.Group(); if (pos) g.position.set(...pos); if (rot) g.rotation.set(...rot); if (parent) parent.add(g); return g; },
    // chamfered box centred on its origin (bevel b catches the light on every edge)
    boxGeo(w, h, d, b = 0.04) {
      b = Math.min(b, w / 3, h / 3, d / 3);
      const s = new THREE.Shape(); const x = w / 2 - b, y = h / 2 - b;
      s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 1 });
      g.translate(0, 0, -(d - 2 * b) / 2); g.computeVertexNormals(); return g;
    },
    box(w, h, d, mat, parent, pos, o = {}) { return K.mesh(K.boxGeo(w, h, d, o.bevel ?? 0.04), mat, parent, pos, o.rot); },
    // profile pts [[u,v],…] extruded by depth; axis 'x': profile in (z,y), depth along x; 'z': profile in (x,y); 'y': profile in (x,-z)
    prismGeo(pts, depth, axis = 'x', b = 0.03) {
      const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
      const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, depth - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 1 });
      g.translate(0, 0, -(depth - 2 * b) / 2);
      if (axis === 'x') g.rotateY(-Math.PI / 2); else if (axis === 'y') g.rotateX(-Math.PI / 2);
      g.computeVertexNormals(); return g;
    },
    prism(pts, depth, mat, parent, pos, o = {}) { return K.mesh(K.prismGeo(pts, depth, o.axis ?? 'x', o.bevel ?? 0.03), mat, parent, pos, o.rot); },
    // cylinder along an axis ('x' | 'y' | 'z')
    cylGeo(r1, r2, h, axis = 'y', seg = 32) {
      const g = new THREE.CylinderGeometry(r1, r2, h, seg);
      if (axis === 'x') g.rotateZ(-Math.PI / 2); else if (axis === 'z') g.rotateX(Math.PI / 2);
      return g;
    },
    cyl(r1, r2, h, mat, parent, pos, o = {}) { return K.mesh(K.cylGeo(r1, r2, h, o.axis ?? 'y', o.seg ?? 32), mat, parent, pos, o.rot); },
    // a unit cylinder (height 1 along y) stretched between two points of its parent each frame
    strut(mesh, a, b) {
      const d = new THREE.Vector3().subVectors(b, a); const len = d.length();
      mesh.position.copy(a).addScaledVector(d, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      mesh.scale.set(1, len, 1);
    },
    line(points, color = 0xe4572e, parent = solverGroup, o = {}) {
      const g = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
      const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: o.opacity ?? 1, depthTest: o.depthTest ?? true }));
      parent.add(l); return l;
    },
    setLine(line, points) {
      let a = line.geometry.attributes.position;
      if (a.count < points.length) { line.geometry.dispose(); line.geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p))); return; }
      while (points.length < a.count) points = [...points, points[points.length - 1]];   // pad with the last point
      points.forEach((p, i) => a.setXYZ(i, p[0], p[1], p[2])); a.needsUpdate = true; line.geometry.computeBoundingSphere();
    },
  };

  // ---------- parts: labels, explode, ghost (x-ray / isolate), internals ----------
  const parts = [];
  function part(obj, o = {}) {
    const p = { obj, id: o.id ?? obj.name ?? `p${parts.length}`, label: o.label, sub: o.sub, side: o.side,
      anchor: new THREE.Vector3(...(o.anchor ?? [0, 0, 0])), explode: new THREE.Vector3(...(o.explode ?? [0, 0, 0])),
      group: o.group ?? null, role: o.role ?? 'shell', base: obj.position.clone(), meshes: [], clones: new Map(), g: 0, vis: 1 };
    obj.userData.part = p; parts.push(p); return p;
  }
  function bindMeshes() {
    const walk = (o, owner) => {
      if (o.userData.part) owner = o.userData.part;
      if (o.isMesh && owner && !o.userData.noGhost) {
        o.userData.solid = o.material; owner.meshes.push(o);
        if (!o.isInstancedMesh && o.geometry.attributes.position.count < 6000) {
          const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 28), owner.edgeMat ??= new THREE.LineBasicMaterial({ color: 0x7d7a73, transparent: true, opacity: 0, depthWrite: false }));
          e.visible = false; e.raycast = () => {}; o.add(e); o.userData.edges = e;
        }
      }
      for (const c of o.children) if (!c.isLineSegments) walk(c, owner);
    };
    walk(root, null);
  }
  function ghostMaterial(p, m) {
    if (!p.clones.has(m)) { const c = m.clone(); c.transparent = true; p.clones.set(m, c); }
    return p.clones.get(m);
  }

  // ---------- state ----------
  let M = null;   // model definition
  const viewNames = Object.keys(views);
  const camFrom = v => ({ az: v.az, el: v.el, dist: v.dist, tx: v.target[0], ty: v.target[1], tz: v.target[2], fov: v.fov ?? 30 });
  const modes = display.map(d => d[0]);
  function fresh() {
    const S = { time: 0, view: startView, prevView: startView, cam: camFrom(views[startView]), tween: null, on: {}, k: {}, queue: [], drags: [], tourIdx: 0,
      in: { ...(M?.inputs ?? {}) } };
    for (const m of modes) { S.on[m] = false; S.k[m] = 0; }
    S.m = M?.init ? M.init(S) : {};
    return S;
  }
  let S = fresh();

  function setView(name, dur = 1.3) {
    const v = views[name]; if (!v) return;
    S.prevView = S.view === name ? S.prevView : S.view; S.view = name;
    const to = camFrom(v);
    to.az = S.cam.az + angDiff(S.cam.az, to.az);
    S.tween = { from: { ...S.cam }, to, t0: S.time, dur };
  }
  function apply(name, arg) {
    if (name.startsWith('view.')) setView(name.slice(5));
    else if (name.startsWith('display.')) {
      const m = name.slice(8); S.on[m] = !S.on[m];
      if (m === 'isolate' && isolate?.view) setView(S.on[m] ? isolate.view : (S.prevView === isolate.view ? startView : S.prevView));
    } else if (name.startsWith('in.')) S.in[name.slice(3)] = arg;
    else M?.commands?.[name]?.(S.m, S, arg);
  }
  const cmd = (name, arg) => S.queue.push([name, arg]);

  function step(dt) {
    for (const [n, a] of S.queue.splice(0)) apply(n, a);
    for (const d of S.drags) { const u = clamp((S.time - d.t0) / d.dur); S.in[d.key] = lerp(d.from, d.to, ease(u)); }
    S.drags = S.drags.filter(d => S.time - d.t0 < d.dur);
    for (const m of modes) S.k[m] = approach(S.k[m], S.on[m] ? 1 : 0, dt * 2.6);
    if (S.tween) {
      const u = (S.time - S.tween.t0) / S.tween.dur;
      if (u >= 1) { S.cam = { ...S.tween.to }; S.tween = null; }
      else { const e = ease(u); for (const k in S.cam) S.cam[k] = lerp(S.tween.from[k], S.tween.to[k], e); }
    } else if (S.on.orbit) S.cam.az += orbitSpeed * dt;
    M?.step?.(S.m, dt, S.in, S);
    S.time += dt;
  }

  // ---------- layout: design canvas scaled to the window ----------
  const hudEl = document.getElementById('hud');
  let W = 1, H = 1, scale = 1, portrait = false;
  function fit() {
    W = innerWidth; H = innerHeight; portrait = W / H < 0.95;
    document.documentElement.classList.toggle('portrait', portrait);
    const dw = portrait ? 540 : Math.max(1100, 720 * W / H), dh = portrait ? 540 * H / W : 720;
    scale = portrait ? W / 540 : Math.min(H / 720, W / dw);
    hudEl.style.width = dw + 'px'; hudEl.style.height = (portrait ? dh : H / scale) + 'px';
    hudEl.style.transform = `scale(${scale})`;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    if (portrait) camera.setViewOffset(W, H, 0, H * 0.21, W, H); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', () => { fit(); if (!RENDER) draw(); });

  // ---------- camera ----------
  const followV = new THREE.Vector3();
  function placeCamera() {
    const f = M?.follow ? M.follow(S.m) : [0, 0, 0];
    followV.set(f[0], f[1], f[2]);
    const c = S.cam, az = rad(c.az), el = rad(c.el);
    const dist = c.dist * (portrait ? Math.min(1.85, 0.9 / (W / H)) : 1) * (W / H < 1.5 && !portrait ? 1.5 / (W / H) : 1);
    const tgt = new THREE.Vector3(c.tx, c.ty, c.tz).add(followV);
    camera.position.set(tgt.x + dist * Math.cos(el) * Math.sin(az), tgt.y + dist * Math.sin(el), tgt.z + dist * Math.cos(el) * Math.cos(az));
    if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
    camera.lookAt(tgt);
    if (controls) controls.target.copy(tgt);
    // light, floor and grid travel with the machine (grid snaps to whole cells so it reads as infinite)
    sun.position.set(followV.x + 7, 14, followV.z + 6); sun.target.position.copy(followV);
    fill.position.set(followV.x - 8, 6, followV.z - 5);
    ground.position.set(followV.x, 0, followV.z);
    gridLines.position.x = Math.round(followV.x / grid) * grid; gridLines.position.z = Math.round(followV.z / grid) * grid;
  }
  let controls = null, userCam = false;
  if (!RENDER) {
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = false; controls.maxPolarAngle = Math.PI * 0.495; controls.minDistance = 3; controls.maxDistance = 60;
    controls.addEventListener('start', () => { userCam = true; S.tween = null; stopTour(); });
    controls.addEventListener('end', () => { userCam = false; });
    controls.addEventListener('change', () => {
      if (!userCam) return;   // only read back what the user did
      const off = new THREE.Vector3().subVectors(camera.position, controls.target);
      const dist = off.length();
      const k = (portrait ? Math.min(1.85, 0.9 / (W / H)) : 1) * (W / H < 1.5 && !portrait ? 1.5 / (W / H) : 1);
      S.cam.dist = dist / k; S.cam.el = deg(Math.asin(clamp(off.y / dist, -1, 1))); S.cam.az = deg(Math.atan2(off.x, off.z));
      S.cam.tx = controls.target.x - followV.x; S.cam.ty = controls.target.y - followV.y; S.cam.tz = controls.target.z - followV.z;
    });
  }

  // ---------- labels (SVG overlay, screen pixels) ----------
  const svg = document.getElementById('labels');
  const tmpV = new THREE.Vector3(), box = new THREE.Box3();
  function drawLabels() {
    const kL = S.k.labels ?? 0;
    if (kL < 0.01) { if (svg.innerHTML) svg.innerHTML = ''; return; }
    const items = [];
    for (const p of parts) {
      if (!p.label || p.vis < 0.05) continue;
      p.obj.localToWorld(tmpV.copy(p.anchor)); tmpV.project(camera);
      if (tmpV.z > 1) continue;
      items.push({ p, x: (tmpV.x + 1) / 2 * W, y: (1 - tmpV.y) / 2 * H, a: p.vis });
    }
    if (!items.length) { svg.innerHTML = ''; return; }
    const cx = items.reduce((s, i) => s + i.x, 0) / items.length;
    const s = scale * (portrait ? 1.2 : 1), gap = 27 * s, edge = portrait ? 6 * s : 262 * scale;
    // the model's footprint on screen: label columns sit just outside it
    box.setFromObject(root); let bl = Infinity, br = -Infinity;
    for (let c = 0; c < 8; c++) { tmpV.set(c & 1 ? box.max.x : box.min.x, c & 2 ? box.max.y : box.min.y, c & 4 ? box.max.z : box.min.z).project(camera); const x = (tmpV.x + 1) / 2 * W; bl = Math.min(bl, x); br = Math.max(br, x); }
    const sides = { l: items.filter(i => (i.p.side ?? (i.x < cx ? 'l' : 'r')) === 'l'), r: items.filter(i => (i.p.side ?? (i.x < cx ? 'l' : 'r')) === 'r') };
    let out = '';
    for (const side of ['l', 'r']) {
      const L = sides[side].sort((a, b) => a.y - b.y); if (!L.length) continue;
      const colX = side === 'l' ? Math.max(edge + 125 * s, Math.min(bl + 10 * s, Math.min(...L.map(i => i.x)) - 40 * s)) : Math.min(W - edge - 125 * s, Math.max(br - 10 * s, Math.max(...L.map(i => i.x)) + 40 * s));
      for (let i = 0; i < L.length; i++) { L[i].ly = L[i].y; if (i && L[i].ly < L[i - 1].ly + gap) L[i].ly = L[i - 1].ly + gap; }
      const over = L[L.length - 1].ly - (H - 40 * s); if (over > 0) L.forEach(i => i.ly -= over);
      for (const i of L) {
        const a = (kL * i.a).toFixed(3), tx = side === 'l' ? colX : colX, end = side === 'l' ? colX + 5 * s : colX - 5 * s;
        out += `<g opacity="${a}"><line x1="${i.x.toFixed(1)}" y1="${i.y.toFixed(1)}" x2="${end.toFixed(1)}" y2="${i.ly.toFixed(1)}" stroke="#1c1c1a" stroke-width="${(0.8 * s).toFixed(2)}"/>`
          + `<circle cx="${i.x.toFixed(1)}" cy="${i.y.toFixed(1)}" r="${(1.8 * s).toFixed(2)}" fill="#1c1c1a"/>`;
        const sq = 4.2 * s, fs = 7.2 * s, fs2 = 5.6 * s;
        if (side === 'l') {
          out += `<rect x="${(tx - sq - 2 * s).toFixed(1)}" y="${(i.ly - sq / 2 - 1).toFixed(1)}" width="${sq}" height="${sq}" fill="#e4572e"/>`
            + `<text x="${(tx - sq - 6 * s).toFixed(1)}" y="${(i.ly + fs * 0.32).toFixed(1)}" text-anchor="end" font-size="${fs}" font-weight="700" letter-spacing="${0.9 * s}" fill="#1c1c1a">${esc(i.p.label)}</text>`;
          if (i.p.sub) out += `<text x="${(tx - sq - 6 * s).toFixed(1)}" y="${(i.ly + fs + 3 * s).toFixed(1)}" text-anchor="end" font-size="${fs2}" letter-spacing="${0.8 * s}" fill="#96938c">${esc(i.p.sub)}</text>`;
        } else {
          out += `<rect x="${(tx + 2 * s).toFixed(1)}" y="${(i.ly - sq / 2 - 1).toFixed(1)}" width="${sq}" height="${sq}" fill="#e4572e"/>`
            + `<text x="${(tx + sq + 6 * s).toFixed(1)}" y="${(i.ly + fs * 0.32).toFixed(1)}" font-size="${fs}" font-weight="700" letter-spacing="${0.9 * s}" fill="#1c1c1a">${esc(i.p.label)}</text>`;
          if (i.p.sub) out += `<text x="${(tx + sq + 6 * s).toFixed(1)}" y="${(i.ly + fs + 3 * s).toFixed(1)}" font-size="${fs2}" letter-spacing="${0.8 * s}" fill="#96938c">${esc(i.p.sub)}</text>`;
        }
        out += '</g>';
      }
    }
    svg.innerHTML = out;
  }
  const esc = t => String(t).toUpperCase().replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // ---------- draw one frame from S ----------
  const explodeV = new THREE.Vector3();
  function draw() {
    for (const p of parts) p.obj.position.copy(p.base);
    M?.pose?.(S.m, S);
    const kx = S.k.xray ?? 0, ke = ease(S.k.exploded ?? 0), ki = S.k.isolate ?? 0;
    for (const p of parts) {
      if (ke > 0) p.obj.position.addScaledVector(p.explode, ke);
      const inIso = isolate && p.group && (Array.isArray(isolate.group) ? isolate.group.includes(p.group) : p.group === isolate.group);
      const gIso = isolate ? (inIso ? 0 : ki) : 0;
      if (p.role === 'internal') {
        p.vis = kx * (1 - gIso * 0.85); p.g = 0;
        p.obj.visible = p.vis > 0.01;
        for (const m of p.meshes) { const c = ghostMaterial(p, m.userData.solid); c.opacity = p.vis; c.depthWrite = p.vis > 0.6; m.material = c; m.castShadow = false; }
        continue;
      }
      p.g = Math.max(p.role === 'shell' ? kx : 0, gIso);
      p.vis = 1 - 0.75 * p.g;
      for (const m of p.meshes) {
        if (p.g < 0.005) { m.material = m.userData.solid; m.castShadow = true; if (m.userData.edges) m.userData.edges.visible = false; continue; }
        const c = ghostMaterial(p, m.userData.solid); c.opacity = lerp(1, 0.07, smooth(0, 0.8, p.g)); c.depthWrite = p.g < 0.35;
        m.material = c; m.castShadow = p.g < 0.5;
        if (m.userData.edges) { m.userData.edges.visible = true; }
      }
      if (p.edgeMat) p.edgeMat.opacity = 0.6 * smooth(0, 0.7, p.g);
    }
    const ks = S.k.solver ?? 0;
    solverGroup.visible = ks > 0.01;
    M?.solver?.(S.m, S, ks);
    placeCamera();
    scene.updateMatrixWorld(true);
    renderer.render(scene, camera);
    drawLabels();
    M?.hud?.(S.m, S);
    for (const c of Object.values(ctl)) c.sync?.();
  }

  // ---------- HUD builder ----------
  const ctl = {};
  const el = (tag, cls, html, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  hudEl.innerHTML = '';
  const top = el('div', 'topbar', null, hudEl);
  const colL = el('div', 'col l', null, hudEl), colR = el('div', 'col r', null, hudEl);
  const foot = el('div', 'foot', null, hudEl);
  const hud = {
    el, colL, colR,
    top({ code, kicker, title, sub, logo }) {
      top.innerHTML = `<div class="logo">${logo ?? ''}<span>${code ?? ''}</span></div>
        <div class="ttl"><div class="kicker">${kicker ?? ''}</div><h1>${title}<span class="sl">/</span></h1><div class="sub">${sub ?? ''}</div></div>
        <div class="plus">${'<span>+</span>'.repeat(30)}</div>
        <div class="status"><b></b><span></span></div><div class="big"><b></b><span></span></div>`;
      const st = top.querySelector('.status'), bg = top.querySelector('.big');
      return { status(a, b) { st.children[0].textContent = a; st.children[1].textContent = b; }, big(a, b) { bg.children[0].textContent = a; bg.children[1].textContent = b; } };
    },
    foot(t) { foot.innerHTML = t; },
    panel(side, title, o = {}) {
      const p = el('div', 'panel' + (o.portraitHide ? ' p-hide' : ''), `<h3><span>${title}</span><span class="no">${o.no ?? ''}</span></h3>`, side === 'r' ? colR : colL);
      if (o.id) p.id = o.id; return el('div', 'body', null, p);
    },
    // a big number, a caption under it, and up to two right-aligned lines
    stat(body) {
      const e = el('div', 'row stat', '<div><b></b><div class="cap"></div></div><div style="text-align:right"><div class="num lg"></div><div class="cap" style="margin-top:4px"></div></div>', body);
      const q = e.querySelectorAll('b, .cap, .num');
      return { set(big, cap, right, rightCap) { q[0].textContent = big; q[1].textContent = cap; q[2].textContent = right ?? ''; q[3].textContent = rightCap ?? ''; } };
    },
    // timeline rows: rows [{k, segs:[[a,b],…]}] in 0..1; set(head, activeRow)
    chart(body, rows, o = {}) {
      if (o.caption) el('div', 'cap', o.caption, body).style.marginTop = '10px';
      const c = el('div', 'chart', null, body);
      const segEls = rows.map(r => { const ln = el('div', 'ln', `<span class="k">${r.k}</span>`, c); const tr = el('div', 'tr', null, ln);
        return r.segs.map(([a, b]) => { const s = el('div', 'seg', null, tr); s.style.left = a * 100 + '%'; s.style.width = (b - a) * 100 + '%'; return s; }); });
      const head = el('div', 'head', null, c);
      const note = el('div', 'cap', '', body); note.style.marginTop = '9px';
      return { set(h, active, text, hot) {
        head.style.left = `calc(22px + (100% - 22px) * ${clamp(h)})`;
        segEls.forEach((ss, i) => ss.forEach((s, j) => s.classList.toggle('on', active?.[0] === i && active?.[1] === j)));
        note.textContent = text ?? ''; note.classList.toggle('hot', !!hot);
      } };
    },
    // bar rows: rows [{k}]; set(i, frac, value, trailing, sub, hot)
    bars(body, rows, o = {}) {
      if (o.head) el('div', 'row cap', o.head.map(h => `<span>${h}</span>`).join(''), body).style.marginBottom = '7px';
      const wrap = el('div', 'bars', null, body);
      const R = rows.map(r => {
        const e = el('div', 'bar', `<span class="k">${r.k}</span><span class="track"><span class="fill"></span></span><span class="num v"></span><span class="num dim t"></span><span class="cap sub"></span>`, wrap);
        return { e, fill: e.querySelector('.fill'), v: e.querySelector('.v'), t: e.querySelector('.t'), sub: e.querySelector('.sub') };
      });
      if (o.footer) { const f = el('div', 'row cap', '', body); f.style.marginTop = '10px'; o.footerEl = f; }
      return { set(i, frac, v, t, sub, hot) { const r = R[i]; r.fill.style.width = clamp(frac) * 100 + '%'; r.v.textContent = v; r.t.textContent = t ?? ''; r.sub.textContent = sub ?? ''; r.sub.classList.toggle('hot', !!hot); r.e.classList.toggle('swing', !!hot); },
        footer(a, b) { if (o.footerEl) o.footerEl.innerHTML = `<span>${a}</span><span class="num" style="color:var(--ink)">${b}</span>`; } };
    },
    // a slider bound to S.in[key]
    slider(body, { key, label, min, max, step = 0.1, fmt = v => v.toFixed(1) }) {
      const e = el('div', 'slider', `<div class="row"><span class="cap">${label}</span><span class="num"></span></div><input type="range" min="${min}" max="${max}" step="${step}">`, body);
      const input = e.querySelector('input'), num = e.querySelector('.num');
      input.dataset.ctl = 'in.' + key;
      input.addEventListener('input', () => { stopTour(); cmd('in.' + key, Number(input.value)); });
      ctl['in.' + key] = { el: input, kind: 'slider', min, max, sync() { const v = S.in[key]; if (document.activeElement !== input || RENDER || touring) input.value = v; num.textContent = fmt(v); } };
      return input;
    },
    // buttons: items [{id, label, red}] — id is a command ('walk', 'view.plan', 'display.xray'); on(id) → pressed?
    buttons(body, items, o = {}) {
      const g = el('div', 'btns' + (o.seg ? ' seg' : ''), null, body);
      for (const it of items) {
        const b = el('button', it.red ? 'red' : '', it.label, g); b.type = 'button'; b.dataset.ctl = it.id;
        b.addEventListener('click', () => { stopTour(); cmd(it.id); });
        ctl[it.id] = { el: b, kind: 'button', sync() { b.classList.toggle('on', !!(o.on ? o.on(it.id, S) : isOn(it.id))); b.classList.toggle('press', pressUntil[it.id] > curT); } };
      }
      return g;
    },
    svg(body, w, h) { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', `0 0 ${w} ${h}`); s.classList.add('svgbox'); body.appendChild(s); return s; },
    // the standard Views and Display panels
    standard({ col = 'r', viewLabels = {}, no = [6, 7] } = {}) {
      hud.buttons(hud.panel(col, 'Views', { no: String(no[0]).padStart(2, '0') }), viewNames.map(v => ({ id: 'view.' + v, label: viewLabels[v] ?? v })));
      hud.buttons(hud.panel(col, 'Display', { no: String(no[1]).padStart(2, '0') }), display.map(([id, label]) => ({ id: 'display.' + id, label })));
    },
  };
  const isOn = id => id.startsWith('view.') ? S.view === id.slice(5) && !S.on.orbit : id.startsWith('display.') ? S.on[id.slice(8)] : false;

  // ---------- tour: timed clicks and drags with a drawn cursor ----------
  let TOUR = [], touring = false, curT = 0; const pressUntil = {};
  const cursor = el('div', null, '<svg viewBox="0 0 22 22" width="22" height="22"><path d="M3 2 L3 18 L7.5 13.8 L10.6 20.4 L13.4 19.1 L10.4 12.6 L16.4 12.6 Z" fill="#fff" stroke="#111" stroke-width="1.3" stroke-linejoin="round"/></svg>', document.body);
  cursor.id = 'cursor';
  const ripple = el('div', null, null, document.body); ripple.id = 'ripple';
  function tour(steps) {
    // steps: { t, click: 'display.xray' } | { t, drag: 'speed', to: 1.6, dur: 0.8 } | { t, cmd: 'fire' } (no cursor) | { t, move: [x, y] } (design px)
    const last = {}; TOUR = steps.map(s => ({ ...s })).sort((a, b) => a.t - b.t);
    for (const s of TOUR) if (s.drag) { s.from = last[s.drag] ?? M?.inputs?.[s.drag] ?? 0; last[s.drag] = s.to; s.dur ??= 0.8; }
    const end = TOUR.length ? TOUR[TOUR.length - 1].t + (TOUR[TOUR.length - 1].dur ?? 0) : 0;
    api.DURATION = window.DURATION = cfg.duration ?? Math.ceil(end + 2);
  }
  function runTour(t0, t1) {
    for (const s of TOUR) {
      if (s.t < t0 - 1e-9 || s.t >= t1 - 1e-9) continue;
      if (s.click || s.cmd) apply(s.click ?? s.cmd);
      if (s.drag) S.drags.push({ key: s.drag, from: s.from, to: s.to, t0: s.t, dur: s.dur });
      if (s.click) pressUntil[s.click] = s.t + 0.14;
    }
  }
  function targetPoint(s, t) {
    const pt = e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    if (s.move) return [s.move[0] * scale, s.move[1] * scale];
    if (s.click) { const c = ctl[s.click]; return c ? pt(c.el) : null; }
    if (s.drag) {
      const c = ctl['in.' + s.drag]; if (!c) return null; const r = c.el.getBoundingClientRect();
      const u = clamp((t - s.t) / s.dur), v = lerp(s.from, s.to, ease(u)), th = 11 * scale;
      return [r.left + th / 2 + (r.width - th) * (v - c.min) / (c.max - c.min), r.top + r.height / 2];
    }
    return null;
  }
  function drawCursor(t) {
    const pts = TOUR.filter(s => !s.cmd).map(s => ({ s, t: s.t, end: s.t + (s.drag ? s.dur : 0) }));
    if (!pts.length) return;
    let pos = [W * 0.62, H * 0.62];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      if (t < a.t) {
        const prevEnd = i ? pts[i - 1].end : -1, travel = Math.min(0.75, Math.max(0.25, (a.t - prevEnd) * 0.7));
        const p1 = targetPoint(a.s, a.t) ?? pos, p0 = i ? targetPoint(pts[i - 1].s, pts[i - 1].end) ?? pos : pos;
        const u = ease((t - (a.t - travel - 0.12)) / travel);
        // a slight arc so the path does not look robotic
        const mx = lerp(p0[0], p1[0], u), my = lerp(p0[1], p1[1], u) - Math.sin(Math.PI * u) * 18 * scale;
        pos = [mx, my]; break;
      }
      pos = targetPoint(a.s, Math.min(t, a.end)) ?? pos;
    }
    cursor.style.display = 'block';
    cursor.style.transform = `translate(${pos[0] - 3}px, ${pos[1] - 2}px) scale(${Math.max(0.8, scale * 1.15)})`;
    cursor.style.transformOrigin = '3px 2px';
    const last = [...pts].reverse().find(p => p.s.click && t >= p.t && t < p.t + 0.4);
    if (last) {
      const u = (t - last.t) / 0.4, r = (6 + 18 * u) * scale, p = targetPoint(last.s, last.t);
      Object.assign(ripple.style, { display: 'block', width: 2 * r + 'px', height: 2 * r + 'px', opacity: (1 - u) * 0.9, transform: `translate(${p[0] - r}px, ${p[1] - r}px)` });
    } else ripple.style.display = 'none';
  }
  function stopTour() { if (!touring) return; touring = false; cursor.style.display = 'none'; ripple.style.display = 'none'; }

  // ---------- playback ----------
  function reset() { S = fresh(); }
  function advanceTo(t) {
    if (t < S.time - 1e-6) reset();
    while (S.time + DT <= t + 1e-6) { runTour(S.time, S.time + DT); step(DT); }
  }
  function renderAt(t) { curT = t; advanceTo(t); draw(); if (TOUR.length) drawCursor(t); }

  let keyMap = {};
  function keys(map) { keyMap = map; }
  if (!RENDER) addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' && e.key !== ' ') return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const n = Number(k); let f = keyMap[k];
    if (!f && n >= 1 && n <= viewNames.length) f = 'view.' + viewNames[n - 1];
    if (!f) return;
    e.preventDefault(); stopTour();
    if (typeof f === 'function') f(S, cmd); else cmd(f);
  });

  let started = false;
  function start() {
    if (started) return; started = true;
    bindMeshes(); fit();
    const ready = document.fonts.ready.then(() => { fit(); renderAt(0); });
    window.ready = ready; window.renderAt = renderAt; window.sim = api; window.DURATION ??= api.DURATION ?? 10;
    if (RENDER) return ready;
    const t0q = Number(Q.get('t') ?? 0);
    touring = TOUR.length > 0 && !Q.has('live');
    let last = performance.now(), tourStart = last - t0q * 1000, acc = 0;
    for (const e of ['pointerdown', 'wheel']) canvas.addEventListener(e, stopTour, { passive: true });
    const loop = now => {
      requestAnimationFrame(loop);
      if (touring) {
        const t = (now - tourStart) / 1000;
        if (t > api.DURATION) { stopTour(); }    // the tour ends; the machine keeps running live
        else { renderAt(t); last = now; return; }
      }
      acc += Math.min(0.1, (now - last) / 1000); last = now;
      while (acc >= DT) { step(DT); acc -= DT; }
      curT = S.time; draw();
    };
    ready.then(() => { last = performance.now(); tourStart = last - t0q * 1000; requestAnimationFrame(loop); });
    return ready;
  }

  const api = {
    THREE, U, K, scene, camera, renderer, root, solverGroup, hud, parts, views,
    part, cmd, setView: n => cmd('view.' + n), tour, keys, start, renderAt,
    model(def) { M = def; reset(); },
    get S() { return S; }, set S(v) { S = v; },
    get scale() { return scale; }, get portrait() { return portrait; },
    DURATION: cfg.duration ?? 10,
  };
  return api;
}
