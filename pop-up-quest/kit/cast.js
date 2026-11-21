// pop-up-quest — the cast sheet. Every puppet of a book in one picture, so its body can be judged before any scene:
// facing right, facing left, from behind (plain card back), mid-step, mid-turn, the cheer's gather and hop, pointing.
// Open kit/cast.html?book=../examples/<book>/book.js  (render it with scripts/render.mjs … --query book=…).
import * as T from 'three';
import { makePuppet, pose, walkPlan, LIMITS } from './puppet.js';

const q = new URLSearchParams(location.search);
const book = (await import(q.get('book') || '../examples/packet-post/book.js')).default;
const ids = Object.keys(book.cast), COLS = ['right', 'left', 'back', 'step', 'turn', 'gather', 'hop', 'point'];
const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.outputColorSpace = T.SRGBColorSpace; document.body.appendChild(renderer.domElement);
const scene = new T.Scene(); scene.background = new T.Color('#efe2c2');
scene.add(new T.HemisphereLight('#fff7e6', '#8a7a60', 2.2)); const key = new T.DirectionalLight('#fff', 1.2); key.position.set(-2, 4, 6); scene.add(key);
const CW = 1.7, RH = 1.9, W = COLS.length * CW, H = ids.length * RH;
const cam = new T.OrthographicCamera(-1.2, W - .6, .8, -H + .5, -10, 10); cam.position.z = 5;
const report = [];
ids.forEach((id, r) => {
  const spec = book.cast[id];
  COLS.forEach((col, c) => {
    const a = makePuppet(spec, (spec.height || 1.05) * (book.puppetScale || 1.25)), m = a.mass;
    const g = new T.Group(); g.position.set(c * CW + .25, -r * RH - 1.1, 0); g.add(a.root); scene.add(g);
    const line = new T.Mesh(new T.PlaneGeometry(1.4, .012), new T.MeshBasicMaterial({ color: '#b9a57d' })); line.position.set(c * CW + .25, -r * RH - 1.1, -.5); scene.add(line);
    let plan = { x: 0, facing: 1 }, t = 0;
    if (col === 'left') plan.facing = -1;
    if (col === 'step') { plan.walk = walkPlan(a, 0, -.3, .3); t = .12 + m.step * 1.5; }
    if (col === 'turn') { plan.turn = { t0: 0, to: -1 }; t = m.turn * .32; }
    if (col === 'gather') { plan.cheer = 0; t = m.gather * .95; }
    if (col === 'hop') { plan.cheer = 0; t = m.gather + m.hop * .5; }
    if (col === 'point') { plan.point = { t0: 0, t1: 9 }; t = 1.2; }
    const rep = pose(a, plan, t);
    if (col === 'back') a.root.rotation.y = Math.PI;
    for (const [k, v] of Object.entries(rep.ang)) { const L = LIMITS[k]; if (L && (v < L[0] - .01 || v > L[1] + .01)) report.push(`${id} ${col}: ${k} ${v.toFixed(1)}°`); }
  });
});
const labels = document.createElement('div'); labels.className = 'cs-labels'; document.body.appendChild(labels);
function layout() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h);
  const asp = w / h, sw = W + .7, sh = H + .6, s = Math.max(sw / asp, sh) / 2, cx = W / 2 - .95, cy = -H / 2 + .55;
  Object.assign(cam, { left: cx - s * asp, right: cx + s * asp, top: cy + s, bottom: cy - s }); cam.updateProjectionMatrix();
  const px = (x, y) => { const v = new T.Vector3(x, y, 0).project(cam); return [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h]; };
  labels.innerHTML = COLS.map((c, i) => { const [x, y] = px(i * CW + .25, .72); return `<b style="left:${x}px;top:${y}px">${c}</b>`; }).join('') +
    ids.map((id, r) => { const [x, y] = px(-1.05, -r * RH - .4); const s = book.cast[id]; return `<i style="left:${x}px;top:${y}px">${s.name}<small>${s.species} · ${s.mass || 'medium'}</small></i>`; }).join('');
  renderer.render(scene, cam);
}
addEventListener('resize', layout); await document.fonts.ready; layout();
window.castReport = report; window.DURATION = 1; window.renderAt = () => renderer.render(scene, cam); window.ready = Promise.resolve();
if (report.length) console.warn('joint limits:', report.join('; '));
