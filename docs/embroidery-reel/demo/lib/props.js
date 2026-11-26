// embroidery-reel · props.js — the sewing table, all from code: linen, the leaf-shadow gobo, a small studio env map, and
// the props (spool, thimble, scissors, pincushion, button, needle). Sizes are in patch widths (1 unit ≈ 5 cm).
import * as THREE from 'three';
import { rng, rgb, css, shade } from './stitch.js';

const canvas = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c, srgb = true, rep = 1) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; return t; };

// ── linen: plain weave, slubby threads, colour drift; normal from the same weave ──
export function linen(color = '#d8c8a6', seed = 3, size = 512, threads = 128) {
  const R = rng(seed), base = rgb(color), c = canvas(size), x = c.getContext('2d'), hc = canvas(size), hx = hc.getContext('2d', { willReadFrequently: true });
  const cell = size / threads; x.fillStyle = css(shade(base, -.28)); x.fillRect(0, 0, size, size); hx.fillStyle = '#000'; hx.fillRect(0, 0, size, size);
  const warp = Array.from({ length: threads }, () => ({ k: (R() - .5) * .14, w: .72 + R() * .22 })), weft = Array.from({ length: threads }, () => ({ k: (R() - .5) * .14, w: .72 + R() * .22 }));
  for (let j = 0; j < threads; j++) for (let i = 0; i < threads; i++) {
    const over = (i + j) % 2 === 0, t = over ? warp[i] : weft[j], k = t.k + (R() - .5) * .05, col = shade(base, k);
    const px = i * cell, py = j * cell, w = cell * t.w;
    const g = over ? x.createLinearGradient(px, 0, px + cell, 0) : x.createLinearGradient(0, py, 0, py + cell);
    g.addColorStop(0, css(shade(col, -.18))); g.addColorStop(.5, css(shade(col, .1))); g.addColorStop(1, css(shade(col, -.18)));
    x.fillStyle = g; over ? x.fillRect(px + (cell - w) / 2, py - cell * .1, w, cell * 1.2) : x.fillRect(px - cell * .1, py + (cell - w) / 2, cell * 1.2, w);
    const hg = over ? hx.createLinearGradient(px, 0, px + cell, 0) : hx.createLinearGradient(0, py, 0, py + cell);
    hg.addColorStop(0, '#333'); hg.addColorStop(.5, '#fff'); hg.addColorStop(1, '#333'); hx.fillStyle = hg;
    over ? hx.fillRect(px + (cell - w) / 2, py, w, cell) : hx.fillRect(px, py + (cell - w) / 2, cell, w);
  }
  for (let n = 0; n < threads * 1.4; n++) { // slubs: a thicker run of one thread
    const v = R() < .5, at = Math.floor(R() * threads) * cell + cell / 2, s = R() * size, l = cell * (3 + R() * 9);
    x.strokeStyle = css(shade(base, (R() - .3) * .16), .55); x.lineWidth = cell * .9; x.beginPath();
    v ? (x.moveTo(at, s), x.lineTo(at, s + l)) : (x.moveTo(s, at), x.lineTo(s + l, at)); x.stroke();
  }
  const hd = hx.getImageData(0, 0, size, size).data, nc = canvas(size), nx = nc.getContext('2d'), id = nx.createImageData(size, size);
  const h = (i, j) => hd[(((j + size) % size) * size + ((i + size) % size)) * 4] / 255;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let a = (h(i - 1, j) - h(i + 1, j)) * 1.6, b = (h(i, j + 1) - h(i, j - 1)) * 1.6; const l = Math.hypot(a, b, 1), o = (j * size + i) * 4;
    id.data[o] = (a / l * .5 + .5) * 255; id.data[o + 1] = (b / l * .5 + .5) * 255; id.data[o + 2] = (1 / l * .5 + .5) * 255; id.data[o + 3] = 255;
  }
  nx.putImageData(id, 0, 0);
  return { map: tex(c), normal: tex(nc, false) };
}

// ── leaves: the gobo the sun shines through (white = light). Two layers so the sway reads as depth ──
export function leaves(seed = 11, size = 2048, density = 1, tiles = 3) {
  // one canvas over the whole light cone (three.js ignores a spot map's repeat), leaves sized so one "tile" of branches is
  // ~leafScale world units; branches are scattered, not repeated, so the overview shows no pattern
  const R = rng(seed), c = canvas(size), x = c.getContext('2d'), k = Math.max(1, tiles), u = size / k;
  x.fillStyle = '#fff'; x.fillRect(0, 0, size, size);
  x.fillStyle = '#20160c';
  const leaf = (px, py, len, ang, a) => { x.save(); x.translate(px, py); x.rotate(ang); x.globalAlpha = a; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(len * .5, -len * .3, len, 0); x.quadraticCurveTo(len * .5, len * .3, 0, 0); x.fill(); x.restore(); };
  const branches = Math.round(15 * density * k * k);
  for (let b = 0; b < branches; b++) {
    let px = R() * size, py = R() * size, ang = R() * Math.PI * 2;
    const steps = 12 + Math.floor(R() * 16);
    for (let s = 0; s < steps; s++) {
      px += Math.cos(ang) * u * .016; py += Math.sin(ang) * u * .016; ang += (R() - .5) * .6;
      for (const side of [-1, 1]) leaf(px, py, u * (.028 + R() * .032), ang + side * (.6 + R() * .5), .45 + R() * .45);
    }
  }
  const d = canvas(size), y = d.getContext('2d'); y.filter = `blur(${Math.max(2, u / 110)}px)`; y.drawImage(c, 0, 0);
  const t = tex(d); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// ── a small studio for reflections: warm room, one bright window ──
export function studioEnv(renderer, warm = '#f3dcc0') {
  const s = new THREE.Scene(), box = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(warm).multiplyScalar(.35), side: THREE.BackSide }));
  s.add(box);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4e2').multiplyScalar(6) })); win.position.set(-6, 3, -9.9); s.add(win);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color('#8a6a48').multiplyScalar(.6) })); fl.rotation.x = -Math.PI / 2; fl.position.y = -4.9; s.add(fl);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff').multiplyScalar(1.6) })); top.rotation.x = Math.PI / 2; top.position.y = 4.9; s.add(top);
  const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(s, .02); pm.dispose(); return rt.texture;
}

// ── materials ──
function woodMap(seed, tone = '#c49a63') {
  const R = rng(seed), c = canvas(256, 256), x = c.getContext('2d'), b = rgb(tone); x.fillStyle = css(b); x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) { x.strokeStyle = css(shade(b, (R() - .6) * .3), .5); x.lineWidth = 1 + R() * 3; x.beginPath(); const y = R() * 256; x.moveTo(0, y); x.bezierCurveTo(80, y + (R() - .5) * 20, 170, y + (R() - .5) * 20, 256, y + (R() - .5) * 10); x.stroke(); }
  return tex(c);
}
function threadMap(color, seed) {
  const R = rng(seed), c = canvas(64, 256), x = c.getContext('2d'), b = rgb(color); x.fillStyle = css(shade(b, -.3)); x.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 2.2) { x.strokeStyle = css(shade(b, (R() - .4) * .25)); x.lineWidth = 1.7; x.beginPath(); x.moveTo(0, y); x.lineTo(64, y + .9); x.stroke(); x.strokeStyle = css(shade(b, .35), .35); x.lineWidth = .5; x.beginPath(); x.moveTo(0, y - .4); x.lineTo(64, y + .5); x.stroke(); }
  return tex(c);
}
const metal = (color, rough = .32) => new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: rough });

// ── props: each returns a Group resting on y = 0, with its footprint radius in userData.r ──
export function spool(color = '#c0392b', seed = 1, lying = false) {
  const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ map: woodMap(seed), roughness: .62 });
  const prof = [[0, 0], [.33, 0], [.34, .02], [.34, .07], [.3, .085], [.21, .09], [.21, .71], [.3, .715], [.34, .73], [.34, .78], [.33, .8], [.1, .8], [.08, .79], [.08, .76], [0, .76]].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), wood); g.add(body);
  const tm = threadMap(color, seed + 3); tm.repeat.set(3, 1);
  const th = new THREE.Mesh(new THREE.CylinderGeometry(.29, .29, .615, 48, 1, true), new THREE.MeshStandardMaterial({ map: tm, roughness: .45 })); th.position.y = .4; g.add(th);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(.075, 24), new THREE.MeshBasicMaterial({ color: '#1a1006' })); hole.rotation.x = -Math.PI / 2; hole.position.y = .802; g.add(hole);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  if (lying) { const w = new THREE.Group(); g.rotation.z = Math.PI / 2; g.position.set(.4, .34, 0); w.add(g); w.userData.r = .5; return w; }
  g.userData.r = .36; return g;
}
export function thimble(seed = 2) {
  const prof = []; for (let i = 0; i <= 16; i++) { const t = i / 16; prof.push(new THREE.Vector2(.17 - .03 * t + (t > .85 ? -(t - .85) * .6 : 0), t * .36)); }
  prof.push(new THREE.Vector2(.07, .385), new THREE.Vector2(0, .39));
  const c = canvas(256, 128), x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#303030';
  for (let j = 0; j < 9; j++) for (let i = 0; i < 26; i++) { x.beginPath(); x.arc(i * 10 + (j % 2) * 5, 8 + j * 11, 3.2, 0, 7); x.fill(); }
  const m = metal('#d4a94e', .3); m.bumpMap = tex(c, false); m.bumpScale = 1.4;
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), m); mesh.castShadow = mesh.receiveShadow = true;
  const g = new THREE.Group(); g.add(mesh); g.userData.r = .2; return g;
}
export function scissors(seed = 3) {
  const g = new THREE.Group(), steel = metal('#cfd3d6', .22), gold = metal('#c99a3c', .3);
  const blade = new THREE.Shape(); blade.moveTo(0, -.05); blade.lineTo(1.25, -.012); blade.quadraticCurveTo(1.32, 0, 1.25, .012); blade.lineTo(0, .07); blade.lineTo(-.12, .02); blade.lineTo(-.12, -.03); blade.closePath();
  const bg = new THREE.ExtrudeGeometry(blade, { depth: .018, bevelEnabled: true, bevelSize: .006, bevelThickness: .006, bevelSegments: 1 });
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(bg, steel); b.rotation.x = -Math.PI / 2; b.rotation.z = s * .09; b.position.y = s > 0 ? .045 : .02; g.add(b);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(.03, .035, .42, 10), gold); arm.rotation.z = Math.PI / 2; arm.rotation.y = s * .45; arm.position.set(-.3, .04, s * .1); g.add(arm);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.2, .045, 12, 36), gold); ring.rotation.x = -Math.PI / 2; ring.position.set(-.62, .045, s * .24); ring.scale.set(1, s > 0 ? 1 : .8, 1); g.add(ring);
  }
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .07, 16), gold); pin.position.y = .05; g.add(pin);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.userData.r = .9; return g;
}
export function pincushion(color = '#b3202a', seed = 4) {
  const g = new THREE.Group(), R = rng(seed), c = canvas(256, 256), x = c.getContext('2d'), b = rgb(color);
  x.fillStyle = css(b); x.fillRect(0, 0, 256, 256); for (let i = 0; i < 4000; i++) { x.fillStyle = css(shade(b, (R() - .5) * .25), .5); x.fillRect(R() * 256, R() * 256, 1.5, 1.5); }
  const fab = new THREE.MeshStandardMaterial({ map: tex(c), roughness: .85 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.42, 40, 24), fab); ball.scale.set(1, .78, 1); ball.position.y = .33; g.add(ball);
  const heads = ['#f5d020', '#2f80ed', '#eb5757', '#27ae60', '#f2f2f2', '#9b51e0'];
  for (let i = 0; i < 7; i++) {
    const th = R() * Math.PI * 2, ph = .25 + R() * .7, n = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph) * .78, Math.sin(ph) * Math.sin(th)).normalize();
    const p = new THREE.Group(), shaft = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .34, 6), metal('#d9dde0', .2)); shaft.position.y = .17; p.add(shaft);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(.045, 16, 10), new THREE.MeshStandardMaterial({ color: heads[i % heads.length], roughness: .25 })); hd.position.y = .34; p.add(hd);
    p.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); p.position.set(n.x * .36, .33 + n.y * .36, n.z * .36); g.add(p);
  }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.userData.r = .45; return g;
}
export function button(color = '#e07a2f', seed = 5) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color, roughness: .35 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.16, .165, .05, 32), m); body.position.y = .025; g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.14, .018, 8, 32), m); rim.rotation.x = -Math.PI / 2; rim.position.y = .05; g.add(rim);
  const hm = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(.25) });
  for (let i = 0; i < 4; i++) { const h = new THREE.Mesh(new THREE.CircleGeometry(.022, 12), hm); h.rotation.x = -Math.PI / 2; h.position.set(Math.cos(i * Math.PI / 2 + .78) * .05, .0505, Math.sin(i * Math.PI / 2 + .78) * .05); g.add(h); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.r = .18; return g;
}
// the needle: tip at the group origin, shaft up along +y (length .95), eye near the top
export function needle() {
  const g = new THREE.Group(), steel = metal('#e6e9ec', .16); g.scale.setScalar(.72);
  const prof = [[0, 0], [.004, .02], [.011, .12], [.012, .8], [.011, .9], [.008, .945], [0, .95]].map(([r, y]) => new THREE.Vector2(r, y));
  const shaft = new THREE.Mesh(new THREE.LatheGeometry(prof, 12), steel); shaft.castShadow = true; g.add(shaft);
  const eye = new THREE.Mesh(new THREE.BoxGeometry(.006, .055, .026), new THREE.MeshBasicMaterial({ color: '#2a2a2a' })); eye.position.y = .87; g.add(eye);
  return g;
}
