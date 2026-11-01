// specimen3d — three.js machinery for "fly inside a specimen" shorts: stage (renderer + bloom + soft studio env), procedural
// canvas textures, builders for cut-open bodies (bowls, blobs, tubes, walls from a polygon, instanced beads), a camera tour
// that orbits each target and pulls back / pushes in between them, an x-ray half pass, and a frame compositor that lays the
// 2D HUD (specimen-zoom.js, window.SZ) over the 3D picture. No subject, palette or layout of its own — see references/STYLE-3D.md.
// Every frame is a pure function of t.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const TAU = Math.PI * 2;
const SZ = () => window.SZ;

// ---------- stage ----------
// scale < 1 renders the 3D picture smaller (faster software renders); the HUD is still drawn at W × H
export function createStage({ W, H, scale = 1, bg = 0x020604, fog = .02, fov = 35, bloom = [.55, .55, .8], exposure = 1.05, samples = 4 }) {
  const outW = W, outH = H; W = Math.round(W * scale); H = Math.round(H * scale);
  const glCanvas = document.createElement('canvas'); glCanvas.width = W; glCanvas.height = H;
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = exposure; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(bg); if (fog) scene.fog = new THREE.FogExp2(bg, fog);
  const camera = new THREE.PerspectiveCamera(fov, W / H, .02, 500);
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), bloom[0], bloom[1], bloom[2]); composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  return { W, H, outW, outH, scale, glCanvas, renderer, scene, camera, composer, bloom: bloomPass };
}
// a soft studio for reflections: gradient dome + three light panels, prefiltered (PMREM)
export function studioEnv(renderer, o = {}) {
  const s = new THREE.Scene();
  const dome = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(o.top ?? 0x5d8fb0) }, bot: { value: new THREE.Color(o.bot ?? 0x040806) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform vec3 top, bot; varying vec3 vP; void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-.3, .9, vP.y)), 1.); }' });
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), dome));
  const panel = (c, k, p, sc) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...p); m.scale.set(...sc); m.lookAt(0, 0, 0); s.add(m); };
  (o.panels || [[0xffffff, 5, [-20, 30, 18], [26, 14, 1]], [0x88ccff, 2.5, [26, 12, -20], [20, 22, 1]], [0xffe2b8, 1.6, [0, -6, 32], [30, 8, 1]]]).forEach(a => panel(...a));
  const pm = new THREE.PMREMGenerator(renderer), env = pm.fromScene(s, .02).texture; pm.dispose(); return env;
}

// ---------- textures from 2D paintings ----------
export function canvasTex(c, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; t.needsUpdate = true; return t;
}
// paint(g, size) on a square canvas and return it as a texture
export function paintTex(size, paint, o = {}) { const c = SZ().mk(size, size); paint(c.getContext('2d'), size); return canvasTex(c, o); }

// ---------- builders ----------
const V3 = a => new THREE.Vector3(a[0], a[1], a[2]);
// lower half of an ellipsoid, open at the top (a cut-open body seen from above). outer + inner wall + rim + optional floor
export function bowl(rx, ry, rz, outerMat, innerMat, o = {}) {
  const g = new THREE.Group(), seg = o.seg ?? 72, th = o.thick ?? .08, cut = o.cut ?? 0; // cut: rim height as a fraction of ry (0 = equator)
  const t0 = Math.PI / 2 - Math.asin(cut);
  const outer = new THREE.Mesh(new THREE.SphereGeometry(1, seg, seg / 2, 0, TAU, t0, Math.PI - t0), outerMat); outer.scale.set(rx, ry, rz); g.add(outer);
  const ki = 1 - th, ti = Math.PI / 2 - Math.asin(Math.min(.99, cut / ki));
  const inner = new THREE.Mesh(new THREE.SphereGeometry(1, seg, seg / 2, 0, TAU, ti, Math.PI - ti), innerMat); inner.scale.set(rx * ki, ry * ki, rz * ki); g.add(inner);
  const ro = Math.sqrt(1 - cut * cut), riIn = ki * Math.sqrt(Math.max(0, 1 - (cut / ki) ** 2));
  const rim = new THREE.Mesh(new THREE.RingGeometry(riIn, ro, seg, 1), o.rimMat || outerMat); rim.rotation.x = -Math.PI / 2; rim.scale.set(rx, rz, 1); rim.position.y = ry * cut; g.add(rim);
  if (o.floorMat) { const f = new THREE.Mesh(new THREE.CircleGeometry(1, seg), o.floorMat); f.rotation.x = -Math.PI / 2; const fy = (o.floor ?? -.15), k = Math.sqrt(Math.max(0, 1 - fy * fy)) * ki; f.scale.set(rx * k, rz * k, 1); f.position.y = ry * fy; g.add(f); g.userData.floorY = ry * fy; g.userData.floorK = k; }
  return g;
}
// an organic blob: a sphere pushed in and out along its normals by smooth seeded waves
export function blobGeo(seed, amp = .12, seg = 96) {
  const R = SZ().rng(seed), geo = new THREE.SphereGeometry(1, seg, seg / 2), p = geo.attributes.position, w = [];
  for (let i = 0; i < 6; i++) w.push([R() * 2 - 1, R() * 2 - 1, R() * 2 - 1, 1 + R() * 2.5, R() * TAU]);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); let d = 0; for (const [a, b, c, f, ph] of w) d += Math.sin((v.x * a + v.y * b + v.z * c) * f * 2 + ph); v.multiplyScalar(1 + amp * d / 3); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals(); return geo;
}
export function tube(pts, r, mat, o = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(V3), !!o.closed, 'centripetal');
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, o.seg ?? Math.max(16, pts.length * 8), r, o.radial ?? 12, !!o.closed), mat);
  if (o.flat) { const g = m.geometry; g.computeBoundingBox(); const cy = (g.boundingBox.min.y + g.boundingBox.max.y) / 2; g.translate(0, -cy, 0); g.scale(1, o.flat, 1); g.translate(0, cy, 0); }   // flatten about its own height
  return m;
}
// many beads of one material: [[x, y, z, r], …] or [[x, y, z, sx, sy, sz, rx, ry, rz], …]
export function beads(list, mat, geo) {
  geo = geo || new THREE.SphereGeometry(1, 20, 14); const im = new THREE.InstancedMesh(geo, mat, list.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  list.forEach((a, i) => { const s = a.length > 4 ? [a[3], a[4], a[5]] : [a[3], a[3], a[3]]; e.set(a[6] || 0, a[7] || 0, a[8] || 0); q.setFromEuler(e); m.compose(V3(a), q, V3(s)); im.setMatrixAt(i, m); });
  im.instanceMatrix.needsUpdate = true; return im;
}
// walls standing on a polygon (x, z), height h, thickness t; rounded ridges on top and rounded corners. uv in world units / texScale
export function walls(poly, h, t, mat, o = {}) {
  const g = new THREE.Group(), n = poly.length, ts = o.texScale ?? 2, skip = new Set(o.skip || []);
  for (let i = 0; i < n; i++) {
    if (skip.has(i)) continue;
    const a = poly[i], b = poly[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const geo = new THREE.BoxGeometry(L, h, t); const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * L / ts, uv.getY(k) * h / ts);
    const m = new THREE.Mesh(geo, mat); m.position.set((a[0] + b[0]) / 2, (o.y0 ?? 0) + h / 2, (a[1] + b[1]) / 2); m.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); g.add(m);
    if (o.rim !== false) g.add(tube([[a[0], (o.y0 ?? 0) + h, a[1]], [b[0], (o.y0 ?? 0) + h, b[1]]], t * .62, mat, { seg: 8, radial: 16 }));
  }
  if (o.corners !== false) poly.forEach((a, i) => { if (skip.has(i) && skip.has((i + n - 1) % n)) return; const c = new THREE.Mesh(new THREE.CylinderGeometry(t * .62, t * .62, h, 20), mat); c.position.set(a[0], (o.y0 ?? 0) + h / 2, a[1]); g.add(c); const s = new THREE.Mesh(new THREE.SphereGeometry(t * .62, 20, 12), mat); s.position.set(a[0], (o.y0 ?? 0) + h, a[1]); g.add(s); });
  return g;
}
// a flat plate in the shape of a polygon (x, z), top at y, thickness d
export function plate(poly, y, d, mat, o = {}) {
  const sh = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }); geo.rotateX(-Math.PI / 2); geo.translate(0, y - d, 0);
  const uv = geo.attributes.uv, ts = o.texScale ?? 1; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) / ts, uv.getY(k) / ts);
  return new THREE.Mesh(geo, mat);
}
// polygon helpers (2D, x/z)
export function insetPoly(poly, d) { return SZ().insetPoly(poly, d); }
export function reflectPoly(poly, i) { const a = poly[i], b = poly[(i + 1) % poly.length]; return poly.map(q => SZ().reflect(q, a, b)); }
export function inPoly(poly, x, z) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; }

// ---------- camera tour ----------
// shots: [{ t: [x, y, z] target, d distance, az / el degrees (az 0 = camera on +z), orbit deg/s, fov? }]
export function tour(shots, { shot = 2, transition = .42, base = { d: 24, el: 55 } } = {}) {
  const N = shots.length, DURATION = shot * N, R = Math.PI / 180;
  const shotAt = t => { t = ((t % DURATION) + DURATION) % DURATION; const k = Math.min(N - 1, Math.floor(t / shot)); return { t, k, lt: t - k * shot }; };
  const pose = (k, lt) => { const s = shots[k]; return { t: s.t, d: s.d * (1 - (s.push ?? .06) * lt / shot), az: s.az + (s.orbit || 0) * lt, el: s.el + (s.tilt || 0) * lt }; };
  const place = P => { const az = P.az * R, el = P.el * R; return { pos: new THREE.Vector3(P.t[0] + P.d * Math.cos(el) * Math.sin(az), P.t[1] + P.d * Math.sin(el), P.t[2] + P.d * Math.cos(el) * Math.cos(az)), target: V3(P.t), d: P.d }; };
  function at(t) {
    const { k, lt } = shotAt(t); let A = k, B = k, u = null;
    if (lt < transition) { A = (k + N - 1) % N; u = (lt + transition) / (2 * transition); } else if (lt > shot - transition) { B = (k + 1) % N; u = (lt - (shot - transition)) / (2 * transition); }
    if (u === null) return { ...place(pose(k, lt)), k, lt, u: null, A, B };
    const pa = pose(A, shot - transition), pb = pose(B, transition), s = SZ().eio(u);
    const la = Math.log(pa.d), lb = Math.log(pb.d), lo = Math.log(base.d), dip = Math.max(0, lo - Math.max(la, lb)) * .6 + .15;
    let daz = ((pb.az - pa.az) % 360 + 540) % 360 - 180;
    const P = { t: [0, 1, 2].map(i => SZ().lerp(pa.t[i], pb.t[i], s)), d: Math.exp(SZ().lerp(la, lb, s) + dip * Math.sin(Math.PI * s)), az: pa.az + daz * s, el: SZ().lerp(pa.el, pb.el, s) + (base.el - (pa.el + pb.el) / 2) * .4 * Math.sin(Math.PI * s) };
    return { ...place(P), k, lt, u, A, B };
  }
  return { N, DURATION, shot, transition, shotAt, at };
}
export function aim(camera, c, o = {}) { camera.position.copy(c.pos); camera.lookAt(c.target); camera.near = Math.max(.01, c.d * (o.near ?? .02)); camera.far = c.d * 40 + 200; if (o.fov) camera.fov = o.fov; camera.updateProjectionMatrix(); }

// ---------- x-ray half ----------
export function xrayMaterial(color = 0x3ff0c8, power = 2.2) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { col: { value: new THREE.Color(color) }, pw: { value: power } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 p = vec4(position, 1.); vec3 n = normal;
        #ifdef USE_INSTANCING
          p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
        #endif
        vec4 mv = modelViewMatrix * p; vN = normalize(normalMatrix * n); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 col; uniform float pw; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), pw); gl_FragColor = vec4(col * (.05 + 1.25 * f), 1.); }` });
}
// re-render the scene right of screen x = cut with an x-ray material, over a black background
export function renderXray(stage, cut, mat) {
  const { renderer, scene, camera, W, H } = stage; if (cut >= W) return;
  const bg = scene.background, fog = scene.fog; scene.background = new THREE.Color(0); scene.fog = null; scene.overrideMaterial = mat;
  renderer.setScissorTest(true); renderer.setScissor(Math.max(0, Math.floor(cut)), 0, W, H); renderer.setViewport(0, 0, W, H);
  renderer.setRenderTarget(null); renderer.render(scene, camera);
  renderer.setScissorTest(false); scene.overrideMaterial = null; scene.background = bg; scene.fog = fog;
}

// ---------- film: what SZ.player expects (W, H, DURATION, build, renderAt), with the HUD drawn by the topic ----------
export function film({ stage, tour: T, build, frame, hud }) {
  const W = stage.outW, H = stage.outH, picture = SZ().mk(W, H), pg = picture.getContext('2d');
  const F = { W, H, DURATION: T.DURATION, SHOT: T.shot, stage, tour: T, scene: picture, shotAt: T.shotAt };   // F.scene: the 3D frame at full size (the HUD's glass blurs it)
  F.build = async (progress = () => {}, onBasic) => {
    await SZ().loadFonts(); progress(.1); await new Promise(r => setTimeout(r, 0));
    await build(F, progress); stage.renderer.compile(stage.scene, stage.camera); progress(1);
    if (onBasic) onBasic();
  };
  F.renderAt = (ctx, t) => {
    const c = T.at(t); frame(t, c, F);             // topic: aim the camera, animate, maybe change things per shot
    stage.composer.render(); if (F.after) F.after(t, c, F);
    pg.drawImage(stage.glCanvas, 0, 0, W, H); ctx.drawImage(picture, 0, 0); if (hud) hud(ctx, t, c, F);
  };
  return F;
}
export { THREE };
