// street-run-montage · sheet.js — the cast sheet: the rider and the buddy turned every way and in every key pose,
// rendered as one image (a grid of viewports). Review it before writing any shot (references/BRIEF.md · cast review).
//   rows: rider riding (front · back · right · left · ¾ · ¾ back) · rider's moves facing right · the same facing left
//         · buddy turned (front · back · right · left · ¾ · sitting) · buddy's gait and leap (gallop ×2, trot, walk, gather, air)
// window.runChecks() lists any joint out of its limits, any foot out of reach, and any facing mistake found here.
import * as THREE from 'three';
import { Route } from './town.js';
import { Rider } from './rider.js';
import { Buddy } from './critter.js';
import { LIGHTS, lights, cel, RES } from './look.js';
import { DEG } from './core.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export function castSheet(CAST, o = {}) {
  const q = new URLSearchParams(location.search), scale = +(q.get('scale') || 1), W = Math.round(1920 * scale), H = Math.round(1350 * scale);
  const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out);
  document.body.style.cssText = 'margin:0;background:#20242c'; out.style.cssText = 'width:100vw;height:auto;display:block';
  const gl = document.createElement('canvas'); gl.width = W; gl.height = H;
  const r = new THREE.WebGLRenderer({ canvas: gl, antialias: true, preserveDrawingBuffer: true }); r.setPixelRatio(1); r.setSize(W, H, false);
  r.shadowMap.enabled = true; r.outputColorSpace = THREE.SRGBColorSpace; r.setScissorTest(true);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#dfe7f0');
  const L = LIGHTS[o.light || 'afternoon'], li = lights(scene, L);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), cel('#c9ccd2')); floor.receiveShadow = true; floor.position.set(0, -.001, -150); scene.add(floor);
  const route = new Route([{ len: 400 }]), dur = 16;
  const rider = new Rider(CAST.rider, route, { dur });
  // a demo ride that holds every move: pushes, cruise, ollie, kickflip, manual, slow down, step off, cheer
  rider.plan({ speed: [{ t: 0, v: 1.4 }, { t: 2, v: 3.6 }, { t: 8, v: 3.6 }, { t: 9.6, v: 0 }], moves: [
    { at: .2, do: 'push', n: 2, every: .9 }, { at: 3.4, do: 'ollie', h: .4 }, { at: 5.4, do: 'kickflip', h: .44 }, { at: 7, do: 'manual', dur: 1 },
    { at: 10, do: 'dismount' }, { at: 11.6, do: 'cheer', dur: 2 }] });
  scene.add(rider.group);
  let bud = null; if (CAST.buddy) {
    bud = new Buddy(CAST.buddy, route, rider, { dur });
    // the buddy's demo: walk, trot, gallop, gather and leap, sit
    bud.plan({ lead: [{ t: 0, v: 0 }, { t: 3, v: 0 }, { t: 8, v: 6 }, { t: 9.6, v: 6 }, { t: 12, v: 7 }], side: [{ t: 0, v: 0 }], y: [{ t: 0, v: 0 }, { t: 9.9, v: 0 }, { t: 10.1, v: .5 }], moves: [{ at: 9.7, do: 'leap', h: .5 }, { at: 13, do: 'sit', dur: 3 }] });
    scene.add(bud.group);
  }
  const cam = new THREE.PerspectiveCamera(30, 1, .05, 400);
  const ctx = out.getContext('2d'), bad = new Set();
  const air = rider.moves.find(m => m.do === 'ollie'), kf = rider.moves.find(m => m.do === 'kickflip');
  const RIDE = 2.6, POSES = [['push', .62], ['ride', RIDE], ['gather', air.at - .05], ['air', air.at + air.air * .45], ['flip', kf.at + kf.air * .5], ['land', air.land + .07], ['stand', 11.2], ['cheer', 12.2]];
  const views = [['front', 0], ['back', 180], ['right', -90], ['left', 90], ['¾ front', -40], ['¾ back', -140]];
  const rows = [];
  rows.push(views.map(([n, a]) => ({ who: 'rider', tau: RIDE, view: a, label: 'ride · ' + n })));
  rows.push(POSES.map(([n, t]) => ({ who: 'rider', tau: t, view: -90, label: n + ' · right' })));
  rows.push(POSES.map(([n, t]) => ({ who: 'rider', tau: t, view: 90, label: n + ' · left' })));
  if (bud) {
    const gal = 7.2, trot = 4.2;
    rows.push([...views.slice(0, 5).map(([n, a]) => ({ who: 'buddy', tau: gal, view: a, label: 'run · ' + n })), { who: 'buddy', tau: 14.5, view: -40, label: 'sit (idle)' }]);
    rows.push([{ who: 'buddy', tau: gal, view: -90, label: 'gallop a' }, { who: 'buddy', tau: gal + .09, view: -90, label: 'gallop b' }, { who: 'buddy', tau: gal + .18, view: 90, label: 'gallop c · left' }, { who: 'buddy', tau: 1.5, view: -90, label: 'trot · right' }, { who: 'buddy', tau: 1.25, view: 90, label: 'trot · left' }, { who: 'buddy', tau: 9.55, view: -90, label: 'leap gather' }, { who: 'buddy', tau: 9.85, view: -90, label: 'leap air' }]);
  }
  const nr = rows.length, nc = Math.max(...rows.map(r => r.length)), cw = W / nc, ch = H / nr;
  RES.set(cw, ch);
  const draw = () => {
    r.setClearColor('#dfe7f0'); r.setScissor(0, 0, W, H); r.setViewport(0, 0, W, H); r.clear();
    const labels = [];
    rows.forEach((row, ri) => row.forEach((cell, ci) => {
      const rp = rider.pose(cell.tau); const bp = bud ? bud.pose(cell.tau) : null;
      for (const b of rp.bad) bad.add(`rider @${cell.label}: ${b}`); if (bp) for (const b of bp.bad) bad.add(`buddy @${cell.label}: ${b}`);
      rider.group.visible = cell.who === 'rider'; if (bud) bud.group.visible = cell.who === 'buddy';
      const c = cell.who === 'rider' ? rp.hips.clone().setY(route.y(rp.s) + .78) : bp.pos.clone().setY(bp.pos.y - .05);
      const fwd = cell.who === 'rider' ? (cell.label.startsWith('ride') ? rp.bodyF.clone() : route.tan(rp.s)) : bp.fwd.clone();
      const a = cell.view * DEG, dir = fwd.clone().applyAxisAngle(V(0, 1, 0), a), dist = cell.who === 'rider' ? 4.6 : 2.0;
      cam.aspect = cw / ch; cam.fov = cell.who === 'rider' ? 30 : 24; cam.updateProjectionMatrix();
      cam.position.copy(c).addScaledVector(dir, dist).add(V(0, cell.who === 'rider' ? .25 : .35, 0)); cam.lookAt(c);
      li.sun.target.position.copy(c); li.sun.position.copy(c).addScaledVector(li.dir, 30); li.sun.target.updateMatrixWorld();
      const x = ci * cw, y = H - (ri + 1) * ch; r.setViewport(x, y, cw, ch); r.setScissor(x, y, cw, ch); r.render(scene, cam);
      labels.push([cell.label, x, (ri + 1) * ch]);
      // facing check: chest, face and toes on one side (rider: the head never more than the neck limit from the chest)
      if (cell.who === 'buddy' && bp.v > .3 && bp.fwd.dot(bp.travel) < .5) bad.add(`buddy @${cell.label}: faces away from where it runs`);
    }));
    ctx.drawImage(gl, 0, 0);
    ctx.font = `${Math.round(15 * scale)}px system-ui, sans-serif`; ctx.fillStyle = 'rgba(20,24,32,.75)';
    for (const [t, x, y] of labels) ctx.fillText(t, x + 8 * scale, y - 8 * scale);
    ctx.strokeStyle = 'rgba(20,24,32,.15)'; for (let i = 1; i < nc; i++) { ctx.beginPath(); ctx.moveTo(i * cw, 0); ctx.lineTo(i * cw, H); ctx.stroke(); } for (let i = 1; i < nr; i++) { ctx.beginPath(); ctx.moveTo(0, i * ch); ctx.lineTo(W, i * ch); ctx.stroke(); }
    ctx.fillStyle = 'rgba(20,24,32,.8)'; ctx.font = `600 ${Math.round(18 * scale)}px system-ui, sans-serif`; ctx.fillText(`${CAST.rider?.name || 'rider'} · ${CAST.buddy?.name || ''} — cast sheet`, 10 * scale, 24 * scale);
  };
  draw();
  window.DURATION = 1; window.FPS = 1; window.seek = () => draw();
  window.runChecks = () => [...bad];
  window.report = () => ({ problems: [...bad], numbers: { cells: rows.flat().length } });
  window.__ready = true;
}
