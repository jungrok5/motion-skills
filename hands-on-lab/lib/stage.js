// hands-on-lab · the 3D bench: renderer, toon shading, ink outlines, flow stripes, labels, picking, camera, thumbnails,
// and the part kit (`k`) a lesson's build() uses. Everything a lesson makes goes through the kit so it gets the look.
import * as THREE from 'three';

export { THREE };

const INK = '#1c2330';
const ACCENT = '#1f8f72';

// ---------- shared materials ----------
let GRADIENT = null;
function gradientMap() {
  if (GRADIENT) return GRADIENT;
  // three tones: shade, mid, lit (toon steps)
  const d = new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]);
  GRADIENT = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  GRADIENT.minFilter = GRADIENT.magFilter = THREE.NearestFilter;
  GRADIENT.needsUpdate = true;
  return GRADIENT;
}

const OUTLINE_VS = `
attribute vec3 oNormal;
uniform vec2 uRes; uniform float uWidth;
void main(){
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec3 vn = normalize(normalMatrix * oNormal);
  vec2 dir = (projectionMatrix * vec4(vn, 0.0)).xy;
  float l = length(dir);
  dir = l > 1e-5 ? dir / l : vec2(0.0);
  clip.xy += dir * uWidth * clip.w * 2.0 / uRes;
  gl_Position = clip;
}`;
const OUTLINE_FS = `uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor, 1.0); }`;

const FLOW_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const FLOW_FS = `
varying vec2 vUv; uniform float uPhase, uLen, uDash, uOn, uAxis; uniform vec3 uColor;
void main(){
  if (uOn < 0.5) discard;
  float s = fract(mix(vUv.x, vUv.y, uAxis) * uLen / uDash - uPhase);
  if (s > 0.42) discard;
  gl_FragColor = vec4(uColor, 1.0);
}`;

// smooth normals by position, so hard-edged boxes get an outline without gaps at the corners
function outlineNormals(geo) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const map = new Map(), acc = [], ids = new Int32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const key = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    let id = map.get(key);
    if (id === undefined) { id = acc.length; map.set(key, id); acc.push(new THREE.Vector3()); }
    acc[id].x += nor.getX(i); acc[id].y += nor.getY(i); acc[id].z += nor.getZ(i);
    ids[i] = id;
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const v = acc[ids[i]]; const l = v.length() || 1;
    out[i * 3] = v.x / l; out[i * 3 + 1] = v.y / l; out[i * 3 + 2] = v.z / l;
  }
  geo.setAttribute('oNormal', new THREE.BufferAttribute(out, 3));
}

// ---------- canvas textures ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { tex: t, canvas: c, g };
}
const FONT_MONO = '"Lab Mono", "JetBrains Mono", ui-monospace, monospace';
const FONT_COND = '"Lab Cond", "Barlow Condensed", "Lab KR", sans-serif';

const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };

// ---------- the stage ----------
export function createStage(host, opt = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!opt.preserve });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  renderer.domElement.className = 'lab-canvas';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 400);
  const amb = new THREE.HemisphereLight(0xfffaf0, 0xd9c8a6, 1.5); scene.add(amb);
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-5, 10, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 6; sun.shadow.bias = -0.0008;
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  scene.add(sun); scene.add(sun.target);

  // floor: shadow catcher + faint paper grid
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.16, color: 0x6b5a3a }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const grid = new THREE.GridHelper(40, 40, 0xcdbd9c, 0xd9cbb0);
  grid.material.transparent = true; grid.material.opacity = 0.55; grid.position.y = 0.001; scene.add(grid);

  const world = new THREE.Group(); scene.add(world);
  const shared = { uRes: { value: new THREE.Vector2(1, 1) }, uWidth: { value: 2 }, uWidthHi: { value: 3 } };
  const outlineMats = {
    ink: new THREE.ShaderMaterial({ uniforms: { uRes: shared.uRes, uWidth: shared.uWidth, uColor: { value: new THREE.Color(INK) } }, vertexShader: OUTLINE_VS, fragmentShader: OUTLINE_FS, side: THREE.BackSide }),
    hover: new THREE.ShaderMaterial({ uniforms: { uRes: shared.uRes, uWidth: shared.uWidthHi, uColor: { value: new THREE.Color(ACCENT) } }, vertexShader: OUTLINE_VS, fragmentShader: OUTLINE_FS, side: THREE.BackSide }),
  };

  for (const m of Object.values(outlineMats)) m.userData.shared = true;
  const cam = { az: 35, el: 32, dist: 14, target: new THREE.Vector3(0, 0.6, 0), fov: 22 };
  const st = { w: 1, h: 1, parts: new Map(), labels: [], flows: [], hover: null, selected: null, onPick: null, labelLayer: null };

  const labelLayer = document.createElement('div'); labelLayer.className = 'lab-labels'; host.appendChild(labelLayer);
  st.labelLayer = labelLayer;

  function resize() {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);   // layout px (the page may be scaled)
    if (w === st.w && h === st.h) return;
    st.w = w; st.h = h;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const pr = renderer.getPixelRatio();
    shared.uRes.value.set(w * pr, h * pr);
    const s = Math.min(1.35, Math.max(0.7, Math.min(w / 820, h / 560)));
    shared.uWidth.value = 2.1 * pr * s; shared.uWidthHi.value = 3.4 * pr * s;
  }

  function placeCamera() {
    const az = THREE.MathUtils.degToRad(cam.az), el = THREE.MathUtils.degToRad(cam.el);
    camera.fov = cam.fov;
    camera.position.set(cam.target.x + cam.dist * Math.cos(el) * Math.sin(az), cam.target.y + cam.dist * Math.sin(el), cam.target.z + cam.dist * Math.cos(el) * Math.cos(az));
    camera.lookAt(cam.target); camera.updateProjectionMatrix();
  }

  // fit the bench into view from the current angle: distance from the bounding sphere, target at its centre
  function fit(margin = 1.12) {
    const box = new THREE.Box3();
    world.traverse(o => { if (o.isMesh && !o.userData.noFit && shown(o)) box.expandByObject(o); });
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    cam.target.copy(sphere.center); cam.target.y = Math.max(0.3, sphere.center.y * 0.8);
    const vf = THREE.MathUtils.degToRad(cam.fov) / 2, hf = Math.atan(Math.tan(vf) * camera.aspect);
    cam.dist = sphere.radius * margin / Math.sin(Math.min(vf, hf));
    cam.fit = { dist: cam.dist, target: cam.target.clone() };
  }

  function clear() {
    for (const l of st.labels) l.el.remove();
    st.labels = []; st.flows = []; st.parts.clear(); st.hover = null;
    world.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) if (!m.userData.shared) { if (m.map && !m.map.userData?.shared) m.map.dispose(); m.dispose(); }
    });
    world.clear();
  }

  function setOutline(part, mode) {
    const p = st.parts.get(part); if (!p) return;
    for (const o of p.outlines) o.material = mode ? outlineMats.hover : outlineMats.ink;
  }
  function refreshHighlight() {
    for (const [id] of st.parts) setOutline(id, id === st.hover || id === st.selected);
  }

  // labels: project, then push apart (greedy, upward) so name tags never sit on each other
  function layoutLabels() {
    const v = new THREE.Vector3(), placed = [];
    const items = st.labels.filter(l => l.visible !== false);
    for (const l of items) {
      if (l.obj) l.obj.getWorldPosition(v).add(l.offset); else v.copy(l.pos);
      v.project(camera);
      l.x = (v.x * 0.5 + 0.5) * st.w; l.y = (-v.y * 0.5 + 0.5) * st.h; l.behind = v.z > 1;
      l.bw = l.el.offsetWidth || 40; l.bh = l.el.offsetHeight || 16;
    }
    items.sort((a, b) => (a.kind === 'value') - (b.kind === 'value') || a.y - b.y);
    for (const l of items) {
      let x = l.x - l.bw / 2, y = l.y - l.bh / 2;
      for (let it = 0; it < 6; it++) {
        const hit = placed.find(p => x < p.x + p.w + 3 && x + l.bw + 3 > p.x && y < p.y + p.h + 2 && y + l.bh + 2 > p.y);
        if (!hit) break;
        y = hit.y - l.bh - 3;
      }
      x = Math.max(2, Math.min(st.w - l.bw - 2, x)); y = Math.max(2, Math.min(st.h - l.bh - 2, y));
      placed.push({ x, y, w: l.bw, h: l.bh });
      l.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      l.el.style.visibility = l.behind ? 'hidden' : '';
      l.box = { x, y, w: l.bw, h: l.bh };
    }
    for (const l of st.labels) if (l.visible === false) l.el.style.visibility = 'hidden';
  }

  function render(phases = {}) {
    resize(); placeCamera();
    sun.target.position.copy(cam.target); sun.position.copy(cam.target).add(new THREE.Vector3(-5, 10, 6));
    for (const f of st.flows) {
      const ph = phases[f.name] ?? 0, rate = (phases._rates || {})[f.name] ?? 0;
      f.mat.uniforms.uPhase.value = ph * (f.reverse ? -1 : 1);
      f.mat.uniforms.uOn.value = Math.abs(rate) > 1e-4 ? 1 : 0;
    }
    renderer.render(scene, camera);
    layoutLabels();
  }

  // picking
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pickAt(clientX, clientY) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const meshes = []; for (const p of st.parts.values()) if (p.pickable) meshes.push(...p.meshes);
    const hit = ray.intersectObjects(meshes, false)[0];
    return hit ? hit.object.userData.part : null;
  }
  function screenOf(part) {
    const p = st.parts.get(part); if (!p) return null;
    const box = new THREE.Box3(); for (const m of p.meshes) box.expandByObject(m);
    const c = box.getCenter(new THREE.Vector3()).project(camera);
    return { x: (c.x * 0.5 + 0.5) * st.w, y: (-c.y * 0.5 + 0.5) * st.h };
  }

  // snapshot of a bench built by `build(k)` from a fixed angle (lesson-strip thumbnails)
  let thumbR = null;
  function thumbnail(buildFn, w = 220, h = 132, view = {}) {
    if (!thumbR) { thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbR.setPixelRatio(1); }
    thumbR.setSize(w, h, false);
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xfffaf0, 0xd9c8a6, 1.5));
    const d = new THREE.DirectionalLight(0xffffff, 2.1); d.position.set(-5, 10, 6); sc.add(d);
    const g = new THREE.Group(); sc.add(g);
    const tmp = { parts: new Map(), labels: [], flows: [] };
    const kit = makeKit(g, tmp, outlineMats, { thumb: true });
    buildFn(kit);
    const box = new THREE.Box3(); g.traverse(o => { if (o.isMesh && !o.userData.noFit) box.expandByObject(o); });
    const sph = box.getBoundingSphere(new THREE.Sphere());
    const c = new THREE.PerspectiveCamera(22, w / h, 0.1, 400);
    const az = THREE.MathUtils.degToRad(view.az ?? 35), el = THREE.MathUtils.degToRad(view.el ?? 30);
    const dist = sph.radius * 1.02 / Math.sin(THREE.MathUtils.degToRad(11) * Math.min(1, w / h));
    c.position.set(sph.center.x + dist * Math.cos(el) * Math.sin(az), sph.center.y + dist * Math.sin(el), sph.center.z + dist * Math.cos(el) * Math.cos(az));
    c.lookAt(sph.center);
    const res = outlineMats.ink.uniforms.uRes.value.clone(), wd = shared.uWidth.value;
    shared.uRes.value.set(w, h); shared.uWidth.value = 1.3;
    thumbR.render(sc, c);
    shared.uRes.value.copy(res); shared.uWidth.value = wd;
    const url = thumbR.domElement.toDataURL('image/png');
    sc.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && !o.material.userData?.shared) o.material.dispose?.(); });
    return url;
  }
  function disposeThumbs() { if (thumbR) { thumbR.dispose(); thumbR = null; } }

  const kit = () => makeKit(world, st, outlineMats, {});
  return { renderer, scene, camera, world, cam, st, fit, clear, render, resize, kit, pickAt, screenOf, refreshHighlight, setOutline, thumbnail, disposeThumbs, labelLayer };
}

// ---------- the kit ----------
// k.box / cyl / sphere / lathe / extrude / tube / group / text / screen / glow / label / part
// Every mesh gets a toon material and an ink outline; `part: 'id'` registers it for labels, picking and highlight.
function makeKit(root, st, outlineMats, flags) {
  const matCache = new Map();
  const toon = (color, o = {}) => {
    const key = `${color}|${o.emissive || ''}|${o.opacity ?? 1}|${o.flat ? 1 : 0}`;
    if (!o.fresh && matCache.has(key)) return matCache.get(key);
    const m = o.flat ? new THREE.MeshBasicMaterial({ color })
      : new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), emissive: o.emissive || 0x000000 });
    if ((o.opacity ?? 1) < 1) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; }
    if (!o.fresh) matCache.set(key, m); return m;
  };

  function place(obj, o = {}) {
    if (o.at) obj.position.set(...o.at);
    if (o.rot) obj.rotation.set(...o.rot.map(d => THREE.MathUtils.degToRad(d)));
    if (o.scale) Array.isArray(o.scale) ? obj.scale.set(...o.scale) : obj.scale.setScalar(o.scale);
    (o.parent || root).add(obj);
    return obj;
  }
  function register(mesh, o) {
    if (!o.part) return;
    let p = st.parts.get(o.part);
    if (!p) { p = { id: o.part, meshes: [], outlines: [], pickable: false }; st.parts.set(o.part, p); }
    p.meshes.push(mesh); mesh.userData.part = o.part;
    if (mesh.userData.outline) p.outlines.push(mesh.userData.outline);
  }
  function mesh(geo, o = {}) {
    const mat = o.material || toon(o.color ?? '#cccccc', o);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = o.shadow !== false && (o.opacity ?? 1) >= 1; m.receiveShadow = !!o.receive;
    if (o.outline !== false && (o.opacity ?? 1) >= 1) {
      if (!geo.attributes.normal) geo.computeVertexNormals();
      outlineNormals(geo);
      const ol = new THREE.Mesh(geo, outlineMats.ink); ol.userData.noFit = true; ol.raycast = () => {};
      m.add(ol); m.userData.outline = ol;
    }
    if (o.noFit) m.userData.noFit = true;
    place(m, o); register(m, o);
    return m;
  }

  function roundRect(w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }

  const k = {
    THREE, toon,
    /** group: k.group({ at, rot, parent }) → Object3D to nest moving assemblies */
    group(o = {}) { return place(new THREE.Group(), o); },
    /** rounded block: k.box(w, h, d, { color, r: corner radius, at, rot, part }) — centred, y up */
    box(w, h, d, o = {}) {
      const r = o.r ?? Math.min(w, h, d) * 0.12;
      let geo;
      if (r <= 0.001) geo = new THREE.BoxGeometry(w, h, d);
      else {
        const bev = Math.min(r, d / 2 - 0.001) * 0.9, bs = bev * 0.6;
        geo = new THREE.ExtrudeGeometry(roundRect(w - bs * 2, h - bs * 2, Math.max(0.001, r - bs)), { depth: Math.max(0.001, d - bev * 2), bevelEnabled: true, bevelThickness: bev, bevelSize: bs, bevelSegments: 2, curveSegments: 5 });
        geo.translate(0, 0, -(d - bev * 2) / 2);
      }
      return mesh(geo, o);
    },
    /** cylinder: k.cyl(rTop, rBottom, h, { axis: 'y'|'x'|'z', seg, color, at, part }) */
    cyl(rt, rb, h, o = {}) {
      const geo = new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 28, 1, !!o.open);
      if (o.axis === 'x') geo.rotateZ(Math.PI / 2); else if (o.axis === 'z') geo.rotateX(Math.PI / 2);
      return mesh(geo, o);
    },
    sphere(r, o = {}) { return mesh(new THREE.SphereGeometry(r, o.seg ?? 28, Math.round((o.seg ?? 28) * 0.7)), o); },
    torus(r, tube, o = {}) { const g = new THREE.TorusGeometry(r, tube, 12, o.seg ?? 32, o.arc ?? Math.PI * 2); if (o.axis === 'y') g.rotateX(Math.PI / 2); return mesh(g, o); },
    /** lathe: profile [[radius, y], …] spun round y (bulb glass, knobs, caps) */
    lathe(pts, o = {}) {
      if (pts[0][1] > pts[pts.length - 1][1]) pts = [...pts].reverse();   // bottom → top, so faces point outward
      return mesh(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), o.seg ?? 32), o);
    },
    /** extrude a 2D outline [[x, y], …] (or a THREE.Shape) by depth along z, centred on z */
    extrude(pts, depth, o = {}) {
      const shape = pts instanceof THREE.Shape ? pts : new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
      const bev = o.bevel ?? Math.min(0.03, depth * 0.2);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.001, depth - bev * 2), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: o.curve ?? 8 });
      geo.translate(0, 0, -(depth - bev * 2) / 2);
      return mesh(geo, o);
    },
    /** tube along points (wire, rope, pipe). flow: 'name' adds moving stripes driven by values.flows[name] */
    tube(points, r, o = {}) {
      const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'catmullrom', o.tension ?? 0.5);
      const segs = Math.max(24, Math.round(curve.getLength() * 18));
      const m = mesh(new THREE.TubeGeometry(curve, segs, r, o.radial ?? 10, false), o);
      if (o.caps !== false) for (const p of [points[0], points[points.length - 1]]) mesh(new THREE.SphereGeometry(r * 1.0, 12, 8), { ...o, at: p, part: o.part, outline: false });
      if (o.flow && !flags.thumb) {
        const len = curve.getLength();
        const mat = new THREE.ShaderMaterial({
          uniforms: { uPhase: { value: 0 }, uLen: { value: len }, uDash: { value: o.dash ?? 0.5 }, uOn: { value: 0 }, uAxis: { value: 0 }, uColor: { value: new THREE.Color(o.flowColor || '#ffd23f') } },
          vertexShader: FLOW_VS, fragmentShader: FLOW_FS,
        });
        const f = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, r * 1.05, o.radial ?? 10, false), mat);
        f.userData.noFit = true; f.raycast = () => {};
        (o.parent || root).add(f);
        st.flows.push({ name: o.flow, mat, reverse: !!o.reverse });
      }
      m.userData.curve = curve;
      return m;
    },
    /** straight rod you re-aim every frame (taut rope, spring, axle): k.rod(r, { color, flow }) → { mesh, set(a, b) } */
    rod(r, o = {}) {
      const geo = new THREE.CylinderGeometry(r, r, 1, o.radial ?? 10, 1, true); geo.translate(0, 0.5, 0);
      const m = mesh(geo, { ...o, at: undefined, rot: undefined });
      let fm = null;
      if (o.flow && !flags.thumb) {
        fm = new THREE.ShaderMaterial({ uniforms: { uPhase: { value: 0 }, uLen: { value: 1 }, uDash: { value: o.dash ?? 0.4 }, uOn: { value: 0 }, uAxis: { value: 1 }, uColor: { value: new THREE.Color(o.flowColor || '#ffd23f') } }, vertexShader: FLOW_VS, fragmentShader: FLOW_FS });
        const f = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.06, r * 1.06, 1, o.radial ?? 10, 1, true).translate(0, 0.5, 0), fm);
        f.userData.noFit = true; f.raycast = () => {}; m.add(f);
        st.flows.push({ name: o.flow, mat: fm, reverse: !!o.reverse });
      }
      const A = new THREE.Vector3(), B = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
      const set = (a, b) => {
        A.set(...a); B.set(...b); const d = B.clone().sub(A), len = Math.max(1e-4, d.length());
        m.position.copy(A); m.quaternion.setFromUnitVectors(up, d.normalize()); m.scale.set(1, len, 1);
        if (fm) fm.uniforms.uLen.value = len;
      };
      if (o.from && o.to) set(o.from, o.to);
      return { mesh: m, set };
    },
    /** flat text printed on a surface: k.text('3 V', { w, h, at, rot, color, bg, font, weight, size, parent }) */
    text(str, o = {}) {
      const W = 512, H = Math.round(512 * (o.h ?? 0.4) / (o.w ?? 1));
      const { tex } = canvasTex(W, H, (g) => {
        if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, W, H); }
        g.fillStyle = o.color || '#1c2330'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `${o.weight || 700} ${Math.round(H * (o.size ?? 0.7))}px ${o.font === 'mono' ? FONT_MONO : FONT_COND}`;
        g.fillText(str, W / 2, H / 2 + H * 0.04);
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(o.w ?? 1, o.h ?? 0.4), new THREE.MeshBasicMaterial({ map: tex, transparent: !o.bg, depthWrite: !!o.bg }));
      m.userData.noFit = true; m.renderOrder = 2;
      return place(m, o);
    },
    /** LCD / meter screen: returns { mesh, set(text, sub) } — redraws only when the text changes */
    screen(w, h, o = {}) {
      const W = 384, H = Math.round(384 * h / w);
      const c = canvasTex(W, H, () => {});
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: c.tex }));
      m.userData.noFit = true; place(m, o); register(m, o);
      let last = null;
      const set = (text, sub = '') => {
        const key = text + '|' + sub; if (key === last) return; last = key;
        const g = c.g; g.fillStyle = o.bg || '#cdd5a0'; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, 0, W, H * 0.12);
        g.fillStyle = o.ink || '#1f2a1c'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `700 ${Math.round(H * (sub ? 0.5 : 0.62))}px ${FONT_MONO}`;
        g.fillText(text, W / 2, H * (sub ? 0.44 : 0.53));
        if (sub) { g.font = `600 ${Math.round(H * 0.17)}px ${FONT_MONO}`; g.globalAlpha = 0.7; g.fillText(sub, W / 2, H * 0.82); g.globalAlpha = 1; }
        c.tex.needsUpdate = true;
      };
      set(o.text ?? '', o.sub ?? '');
      return { mesh: m, set };
    },
    /** soft halo (bulbs, LEDs, lamps): returns { sprite, set(level 0..1) } */
    glow(at, o = {}) {
      const { tex } = canvasTex(128, 128, (g) => {
        const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      });
      const mat = new THREE.SpriteMaterial({ map: tex, color: o.color || '#ffd54a', transparent: true, depthWrite: false, opacity: 0 });
      const s = new THREE.Sprite(mat); s.scale.setScalar(o.size ?? 2); s.userData.noFit = true; s.renderOrder = 3;
      place(s, { at, parent: o.parent });
      return { sprite: s, set: (lv) => { lv = Math.max(0, Math.min(1, lv)); mat.opacity = lv * (o.max ?? 0.9); s.visible = lv > 0.005; s.scale.setScalar((o.size ?? 2) * (0.75 + 0.35 * lv)); } };
    },
    /** name tag or live value tag: k.label('r1', [x,y,z] | object, text, { kind: 'name'|'value', offset:[x,y,z] }) */
    label(part, anchor, text, o = {}) {
      if (flags.thumb) return { set() {}, show() {} };
      const el = document.createElement('div');
      el.className = 'lab-tag ' + (o.kind === 'value' ? 'is-value' : 'is-name');
      if (part) el.dataset.part = part;
      el.textContent = text;
      st.labelLayer.appendChild(el);
      const l = { el, kind: o.kind || 'name', part, offset: new THREE.Vector3(...(o.offset || [0, 0, 0])) };
      if (Array.isArray(anchor)) l.pos = new THREE.Vector3(...anchor); else l.obj = anchor;
      st.labels.push(l);
      return { el, set: (t) => { if (el.textContent !== t) el.textContent = t; }, show: (v) => { l.visible = !!v; if (v) el.style.visibility = ''; } };
    },
    /** mark meshes created elsewhere as a part (for picking + highlight) */
    /** world position of a point given in an object's local frame (terminals for wires) */
    at(obj, local = [0, 0, 0]) { obj.updateMatrixWorld(true); const v = obj.localToWorld(new THREE.Vector3(...local)); return [v.x, v.y, v.z]; },
    part(id, ...objs) { for (const o of objs) o.traverse(m => { if (m.isMesh && !m.userData.noFit) register(m, { part: id }); }); },
    mesh, register,
  };
  return k;
}
