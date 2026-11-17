import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CFG, MODS as MOD_PATHS, ANCHORS, GROUND, TITLE } from './config.js';
import * as gait from './gait.js';
import { LOOK, SKY_GLSL } from './look.js';
import { createPost } from './post.js';
import { Mats, weathered, applyWeather } from './materials.js';
import * as TEX from './textures.js';
import { evalShot, DURATION, TIMELINE } from './shots.js';

const Q = new URLSearchParams(location.search);
const FIXED_W = +Q.get('w') || 0, FIXED_H = +Q.get('h') || 0;
// modules come from colossus.js MODS (paths from the project root, e.g. 'engine/mods/legs', 'mods/building');
// ?mods=ground,legs loads only the ones whose file name is listed (look-dev, isolating a module)
const ONLY = Q.get('mods') ? Q.get('mods').split(',').filter(Boolean) : null;
const MODS = MOD_PATHS.filter((p) => !ONLY || ONLY.includes(p.split('/').pop()));
document.title = TITLE;
const state = {
  t: +Q.get('t') || 0, shot: Q.get('shot') || '', playing: !Q.has('still') && !FIXED_W,
  free: Q.has('free'), camOverride: null, frame: 0,
};
if (Q.get('cam')) {
  const v = Q.get('cam').split(',').map(Number);
  state.camOverride = { pos: v.slice(0, 3), tgt: v.slice(3, 6), fov: v[6] || 45 };
}

// look-dev overrides: ?look=bloom:0.5,grain:0.02
if (Q.get('look')) for (const kv of Q.get('look').split(',')) { const [k, v] = kv.split(':'); if (k in LOOK && typeof LOOK[k] === 'number') LOOK[k] = +v; }
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = true;
renderer.info.autoReset = false;

function targetSize() {
  if (FIXED_W) return [FIXED_W, FIXED_H];
  const sc = +Q.get('scale') || 1;
  let w = window.innerWidth, h = window.innerHeight;
  if (w / h > 16 / 9) w = Math.round(h * 16 / 9); else h = Math.round(w * 9 / 16);
  return [Math.max(320, Math.round(w * sc)), Math.max(180, Math.round(h * sc))];
}
let [W, H] = targetSize();
renderer.setSize(W, H, false);
canvas.style.width = FIXED_W ? W + 'px' : Math.round(W / (+Q.get('scale') || 1)) + 'px';
canvas.style.height = FIXED_W ? H + 'px' : Math.round(H / (+Q.get('scale') || 1)) + 'px';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, W / H, 0.3, 3000);
const post = createPost(renderer, W, H);

// --- environment map from the dusk sky (for wet specular reflections) ---
{
  const skyScene = new THREE.Scene();
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uZenith: { value: LOOK.zenith }, uHorizon: { value: LOOK.horizon }, uSkyGlowDir: { value: LOOK.skyGlowDir }, uSkyGlow: { value: LOOK.skyGlow }, uFogCol: { value: LOOK.fogColor } },
    vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vD; uniform vec3 uFogCol; ${SKY_GLSL}
      void main(){ vec3 d = normalize(vD); vec3 c = skyColor(d);
        // below the horizon: dark wet field
        c = mix(c, vec3(0.012,0.02,0.022), smoothstep(0.02, -0.15, d.y));
        c = mix(c, uFogCol, 0.35 * exp(-abs(d.y) * 6.0));
        gl_FragColor = vec4(c * 1.6, 1.0); }`,
  });
  skyScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat));
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(skyScene, 0.02).texture;
  scene.environmentIntensity = LOOK.envIntensity;
  pm.dispose();
}

// --- lights ---
const hemi = new THREE.HemisphereLight(LOOK.hemiSky, LOOK.hemiGround, LOOK.hemiIntensity);
scene.add(hemi);
const key = new THREE.DirectionalLight(LOOK.keyColor, LOOK.keyIntensity);
key.castShadow = true;
key.shadow.mapSize.set(4096, 4096);
{ const sx = CFG.BODY_LEN / 2 + 34, sy = Math.max(60, CFG.FOOT_Z * 2.6); key.shadow.camera.left = -sx; key.shadow.camera.right = sx; key.shadow.camera.top = sy; key.shadow.camera.bottom = -sy; }
key.shadow.camera.near = 10; key.shadow.camera.far = 260;
key.shadow.bias = -0.0006; key.shadow.normalBias = 0.12;
key.shadow.radius = 5;
scene.add(key, key.target);

// --- walker root ---
const walker = new THREE.Group();
walker.name = 'walker';
scene.add(walker);

const ctx = { THREE, scene, walker, CFG, gait, LOOK, Mats, weathered, applyWeather, TEX, renderer, camera, post, Q, rng: TEX.mulberry32, anchors: ANCHORS, ground: GROUND, puddlesNear: null };
const modules = [];
const buildMs = {};
const errors = [];

async function loadModules() {
  for (const path of MODS) {
    const name = path.split('/').pop();
    try {
      const t0 = performance.now();
      const m = await import(`../${path}.js`);
      const inst = await m.create(ctx);
      modules.push({ name, inst });
      buildMs[name] = Math.round(performance.now() - t0);
    } catch (e) {
      console.error(`[module ${name}]`, e);
      errors.push(`${name}: ${e && e.stack ? e.stack : e}`);
    }
  }
}

let controls = null;
if (state.free) {
  controls = new OrbitControls(camera, canvas);
  camera.position.set(-CFG.BODY_LEN * 0.9, 6, CFG.BODY_LEN * 0.65); controls.target.set(0, CFG.RIDE_H + 3, 0);
}

const _pose = {}, _sh = [0, 0, 0], _v = new THREE.Vector3();
const frameInfo = { t: 0, dt: 1 / 30, camera, pose: _pose, shot: null, frame: 0 };

function renderAt(t, opts = {}) {
  state.t = t;
  renderer.info.reset();
  const frame = Math.round((opts.frameT ?? t) * 30);
  gait.bodyPose(t, _pose);
  walker.position.set(_pose.x, _pose.y, _pose.z);
  walker.rotation.set(_pose.roll, _pose.yaw, _pose.pitch);
  walker.updateMatrixWorld(true);

  let shot = null;
  if (!state.free) {
    shot = state.camOverride
      ? { pos: [state.camOverride.pos[0] + gait.SPEED * t, state.camOverride.pos[1], state.camOverride.pos[2]], tgt: [state.camOverride.tgt[0] + gait.SPEED * t, state.camOverride.tgt[1], state.camOverride.tgt[2]], fov: state.camOverride.fov, roll: 0, dof: null, shake: 1, post: {}, near: 0.3 }
      : evalShot(state.shot, t);
    gait.shake(t, shot.pos[0], shot.pos[2], _sh);
    camera.position.set(shot.pos[0] + _sh[0] * shot.shake, Math.max(0.15, shot.pos[1] + _sh[1] * shot.shake), shot.pos[2] + _sh[2] * shot.shake);
    camera.up.set(Math.sin(shot.roll), Math.cos(shot.roll), 0);
    // subtle handheld / operator drift (deterministic): ~0.12 degrees of slow wander
    const hd = Math.hypot(shot.tgt[0] - shot.pos[0], shot.tgt[1] - shot.pos[1], shot.tgt[2] - shot.pos[2]) * 0.0021 * (shot.handheld ?? 1);
    const hx = (Math.sin(t * 0.83 + 1.3) + 0.5 * Math.sin(t * 2.17 + 0.4)) * hd;
    const hy = (Math.sin(t * 1.07 + 2.9) + 0.5 * Math.sin(t * 2.63 + 1.7)) * hd * 0.7;
    camera.lookAt(shot.tgt[0] + hx, shot.tgt[1] + hy + _sh[1] * 0.5 * shot.shake, shot.tgt[2] + hx * 0.6);
    camera.fov = shot.fov; camera.near = shot.near;
    // sub-pixel jitter per accumulated sub-frame = free supersampling on top of MSAA
    if (opts.accum && opts.accum.n > 1) {
      const i = opts.accum.i + 1;
      const hal = (b) => { let f = 1, r = 0, k = i; while (k > 0) { f /= b; r += f * (k % b); k = Math.floor(k / b); } return r; };
      camera.setViewOffset(W, H, hal(2) - 0.5, hal(3) - 0.5, W, H);
    } else if (camera.view) camera.clearViewOffset();
    camera.updateProjectionMatrix();
  } else {
    controls.target.x += 0; controls.update();
  }
  camera.updateMatrixWorld(true);

  // key light follows the walker
  key.target.position.set(_pose.x, 10, 0);
  key.position.copy(key.target.position).addScaledVector(LOOK.keyDir, 150);
  key.target.updateMatrixWorld();

  frameInfo.t = t; frameInfo.frame = frame; frameInfo.shot = shot; frameInfo.dt = opts.dt ?? 1 / 30;
  for (const m of modules) {
    try { m.inst && m.inst.update && m.inst.update(t, frameInfo); }
    catch (e) { if (!m.err) { m.err = true; console.error(`[update ${m.name}]`, e); errors.push(`${m.name}.update: ${e.stack || e}`); } }
  }

  // volumetric warm halos: along the facades + under the belly
  let gi = 0;
  const addGlow = (lx, ly, lz, rad, r, g, b) => {
    _v.set(lx, ly, lz).applyMatrix4(walker.matrixWorld);
    post.glowPos[gi].set(_v.x, _v.y, _v.z, rad); post.glowCol[gi].setRGB(r, g, b); gi++;
  };
  for (const gl of ANCHORS.glows) if (gi < post.glowPos.length) addGlow(...gl);

  const sp = shot ? shot.post : {};
  post.render(scene, camera, {
    t, frame, dof: shot ? shot.dof : null, glowN: gi,
    fade: opts.fade ?? sp.fade ?? 1, exposureMul: sp.exposureMul, fogMul: sp.fogMul, mistMul: sp.mistMul,
    letterbox: sp.letterbox ?? 0, accum: opts.accum,
  });
  state.frame++;
}

// motion blur: average n sub-frames across the shutter interval [t, t + shutter]
function renderBlur(t, n = 4, shutter = 1 / 60) {
  // forward shutter [t, t + shutter); never let sub-frames cross a cut of the film timeline
  let lo = -1e9, hi = 1e9;
  if (!state.shot && !state.camOverride && !state.free) for (const s of TIMELINE) if (t >= s.start && t < s.end) { lo = s.start; hi = s.end - 1e-4; }
  for (let i = 0; i < n; i++) renderAt(Math.min(hi, Math.max(lo, t + shutter * (i + 0.5) / n)), { accum: { i, n }, frameT: t });
  state.t = t;
}

const ready = (async () => {
  await loadModules();
  // warm-up render compiles shaders
  renderAt(state.t);
  return { errors };
})();

window.__app = {
  ready, renderAt, renderBlur, state, scene, camera, renderer, walker, errors, LOOK, post, modules,
  setShot(name) { state.shot = name; state.camOverride = null; },
  setCam(pos, tgt, fov = 45) { state.camOverride = { pos, tgt, fov }; },
  info() { return { W, H, gl: renderer.getContext().getParameter(renderer.getContext().getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL ?? 0x1F01), calls: renderer.info.render.calls, tris: renderer.info.render.triangles, errors, buildMs }; },
};

// --- live preview loop ---
if (!FIXED_W) {
  let last = performance.now();
  const hud = document.getElementById('hud');
  ready.then(() => {
    function loop(now) {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (state.playing) state.t += dt;
      if (!state.shot && !state.free && !state.camOverride && state.t > DURATION) state.t = 0;
      renderAt(state.t);
      if (hud) hud.textContent = `t=${state.t.toFixed(2)} shot=${state.shot || 'timeline'} ${(1 / dt).toFixed(0)}fps ${errors.length ? 'ERR ' + errors[0].slice(0, 200) : ''}`;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') state.playing = !state.playing;
    if (e.code === 'ArrowRight') state.t += 1;
    if (e.code === 'ArrowLeft') state.t = Math.max(0, state.t - 1);
  });
  window.addEventListener('resize', () => location.reload());
}
