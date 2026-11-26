// nested-world-loop · starter 「액자 속 오두막」 (The Cottage in the Frame) — the smallest ring: two worlds.
//   room     a study at dusk; on the far wall a framed painting whose canvas is a real opening (an aperture portal)
//   painting the painted hillside at 1:100; the cottage's lit window opens (another aperture) onto … the room.
// It shows the contract, not a look: a new topic designs its own worlds, portals and keys (references/BRIEF.md).
import { film, THREE } from 'nwl/nwl.js';
import * as M from 'nwl/make.js';

// ---------- world 0: the room (metres) ----------
function room(ctx) {
  const { root, renderer } = ctx;
  ctx.scene.environment = M.envMap(renderer, { base: '#1a1512', panels: [{ color: '#ffcf96', intensity: 5, pos: [3, 3, 2], size: [2, 2] }, { color: '#6d84b8', intensity: 2, pos: [0, 1, 4.9], size: [3, 2] }] });
  const plasterM = M.mat.paint('#b8a690', { map: M.plaster({ base: '#cdbba2', dark: '#8f7d68' }) });
  const floorW = M.wood({ base: '#7a5232', dark: '#3c2414', planks: 6 }); floorW.map.repeat.set(2, 2); floorW.rough.repeat.set(2, 2);
  // a wall with a rectangular hole: the painting's canvas and the cottage window are openings, not pictures
  const wallWithHole = (w, h, hole, depth = .12) => { const s = new THREE.Shape([[-w / 2, 0], [w / 2, 0], [w / 2, h], [-w / 2, h]].map(p => new THREE.Vector2(...p))); const [cx, cy, hw, hh] = hole; s.holes.push(new THREE.Path([[cx - hw / 2, cy - hh / 2], [cx + hw / 2, cy - hh / 2], [cx + hw / 2, cy + hh / 2], [cx - hw / 2, cy + hh / 2]].map(p => new THREE.Vector2(...p)))); const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); return new THREE.Mesh(g, plasterM); };
  const back = wallWithHole(4, 2.6, [0, 1.6, .8, .6]); back.position.z = -2.12; root.add(back);           // front face at z = -2
  const front = wallWithHole(4, 2.6, [0, 1.4, .9, 1.1], .15); front.position.z = 1.85; root.add(front);   // window wall, outer face at z = 2
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(.12, 2.6, 4.3), plasterM); w.position.set(sx * 2.06, 1.3, 0); root.add(w); }
  const floor = new THREE.Mesh(new THREE.BoxGeometry(4.3, .05, 4.3), M.mat.wood(floorW)); floor.position.y = -.025; root.add(floor);
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(4.3, .05, 4.3), M.mat.paint('#e8dccb')); ceil.position.y = 2.625; root.add(ceil);
  // picture frame moulding around the opening
  const gilt = M.mat.metal('#b8924a', { rough: .38 });
  for (const [x, y, w, h] of [[0, 1.94, 1, .08], [0, 1.26, 1, .08], [-.46, 1.6, .08, .76], [.46, 1.6, .08, .76]]) { const b = new THREE.Mesh(M.rbox(w, h, .05, .012), gilt); b.position.set(x, y, -1.975); root.add(b); }
  // desk, lamp, cup, book under the painting
  const deskW = M.wood({ base: '#5e3b22', dark: '#2a170c', planks: 3, seed: 4 });
  const top = new THREE.Mesh(M.rbox(1.4, .05, .6, .01), M.mat.wood(deskW)); top.position.set(0, .76, -1.6); root.add(top);
  for (const [x, z] of [[-.64, -1.36], [.64, -1.36], [-.64, -1.84], [.64, -1.84]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.05, .74, .05), M.mat.wood(deskW)); l.position.set(x, .37, z); root.add(l); }
  const brass = M.mat.metal('#c09a58', { rough: .3 });
  const lampBase = new THREE.Mesh(M.lathe([[0, 0], [.09, 0], [.09, .02], [.02, .03], [.015, .04]]), brass); lampBase.position.set(-.48, .785, -1.62); root.add(lampBase);
  const arm = new THREE.Mesh(M.tube([[-.48, .8, -1.62], [-.47, 1.05, -1.66], [-.38, 1.16, -1.6]], .008), brass); root.add(arm);
  const shade = new THREE.Mesh(M.lathe([[.0, .0], [.03, .0], [.08, -.09], [.079, -.092]], 32), M.mat.paint('#2f4a3a', { side: THREE.DoubleSide })); shade.position.set(-.36, 1.18, -1.6); shade.rotation.z = -.5; root.add(shade);
  M.lamp(root, { pos: [-.33, 1.12, -1.6], color: '#ffc27a', intensity: 1.6, shadow: 1024, bulb: .018, glow: 30, near: .02, far: 8 });
  const cup = new THREE.Mesh(M.lathe([[0, 0], [.035, 0], [.04, .08], [.036, .08], [.031, .006], [0, .006]]), M.mat.ceramic('#ede6d8')); cup.position.set(.3, .785, -1.5); root.add(cup);
  const book = new THREE.Mesh(M.rbox(.2, .035, .28, .004), M.mat.paint('#6b2430')); book.position.set(.05, .802, -1.55); book.rotation.y = .3; root.add(book);
  // dusk through the window (cool), a little fill
  const sky = M.spot(root, { pos: [.4, 2.2, 3.6], target: [0, .4, 0], color: '#7d97d6', intensity: 7, angle: .7, penumbra: 1 });
  root.add(new THREE.HemisphereLight('#5c6a8a', '#2a1d14', .25));
  M.shadows(root);
  return sky;
}

// ---------- world 1: the painting (metres, seen at 1:100) ----------
function painting(ctx) {
  const { root, renderer } = ctx;
  ctx.scene.environment = M.envMap(renderer, { base: '#1d2236', panels: [{ color: '#ff9a5a', intensity: 3, pos: [-4.5, .5, -3], size: [4, 1.5] }, { color: '#4b5d8f', intensity: 1.5, pos: [0, 4.6, 0], size: [6, 6] }] });
  // sky: a dome seen from inside, dusk gradient (it sits behind the picture plane, so it never enters the room)
  const dome = new THREE.SphereGeometry(140, 48, 24), cols = [], p = dome.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 140, x = p.getX(i) / 140; const c = new THREE.Color().lerpColors(new THREE.Color('#f08a4b'), new THREE.Color('#1b2546'), Math.min(1, Math.max(0, y * 2.2 + .08))).multiplyScalar(1.4 + .8 * Math.max(0, -x) * (1 - Math.abs(y) * 3)); cols.push(c.r, c.g, c.b); }
  dome.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const domeM = new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })); domeM.position.z = -100; root.add(domeM);
  // hills: a displaced plane with grass tones
  const GZ = -83, g = new THREE.PlaneGeometry(260, 250, 160, 150); g.rotateX(-Math.PI / 2);   // reaches z = 42: just past the picture plane
  const gp = g.attributes.position, gc = [];
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i); const d = Math.hypot(x, z + GZ - 1); let y = M.fbm(x * .02, z * .02, 4) * 10 + Math.max(0, -z - 40) * .12; y *= Math.min(1, d / 14); gp.setY(i, y); const k = .5 + .5 * M.fbm(x * .15, z * .15, 3); const c = new THREE.Color().lerpColors(new THREE.Color('#2f3d22'), new THREE.Color('#6b7a3a'), k); gc.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3)); g.computeVertexNormals();
  const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 })); ground.position.z = GZ; ground.receiveShadow = true; root.add(ground);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshStandardMaterial({ color: '#4a5530', roughness: 1 })); pad.rotation.x = -Math.PI / 2; pad.position.y = .01; root.add(pad);
  // the cottage: a hollow shell (walls with a window hole, roof) — the room of world 0 sits inside it
  const stone = M.mat.paint('#c9b89a', { map: M.plaster({ base: '#d8c7a8', dark: '#8c7a60', seed: 3 }) });
  const shape = (w, h, hole) => { const s = new THREE.Shape([[-w / 2, 0], [w / 2, 0], [w / 2, h], [-w / 2, h]].map(q => new THREE.Vector2(...q))); if (hole) { const [cx, cy, hw, hh] = hole; s.holes.push(new THREE.Path([[cx - hw / 2, cy - hh / 2], [cx + hw / 2, cy - hh / 2], [cx + hw / 2, cy + hh / 2], [cx - hw / 2, cy + hh / 2]].map(q => new THREE.Vector2(...q)))); } return s; };
  const wall = (w, h, hole, d) => new THREE.Mesh(new THREE.ExtrudeGeometry(shape(w, h, hole), { depth: d, bevelEnabled: false }), stone);
  const f = wall(6.4, 3.1, [0, 1.5, .9, 1.1], .15); f.position.z = 3; root.add(f);                  // outer face z = 3.15
  const b = wall(6.4, 3.1, null, .15); b.position.z = -2.3; root.add(b);
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(.15, 3.1, 5.45), stone); w.position.set(sx * 3.12, 1.55, .35); root.add(w); }
  const roofM = M.mat.paint('#5a3b2e', { map: M.noiseMap({ color: ['#3d261c', '#7a4f3a'], scale: 30, lo: 0, hi: 1 }) });
  for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(3.9, .18, 6.2), roofM); r.position.set(sx * 1.55, 4.15, .35); r.rotation.z = -sx * .66; root.add(r); }
  const gable = M.prism([[-3.2, 0], [3.2, 0], [0, 2.3]], .15); for (const z of [3.075, -2.225]) { const gm = new THREE.Mesh(gable, stone); gm.position.set(0, 3.1, z); root.add(gm); }
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(.6, 1.6, .6), stone); chimney.position.set(1.8, 4.9, -.6); root.add(chimney);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(1.2, .08, .3), stone); sill.position.set(0, .92, 3.2); root.add(sill);
  // trees: trunks + layered cones, scattered away from the cottage and the view line
  const pts = M.scatter(70, [-90, -110, 90, 20], 5, 7).filter(([x, z]) => Math.hypot(x, z) > 14 && !(Math.abs(x) < 10 && z > 0));
  const coneG = new THREE.ConeGeometry(1, 1, 9), trunkG = new THREE.CylinderGeometry(.12, .18, 1, 6);
  const leaf = new THREE.MeshStandardMaterial({ color: '#2b3a24', roughness: .9 }), bark = new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 1 });
  root.add(M.instanced(coneG, leaf, pts.length * 3, (i, o, r) => { const [x, z] = pts[Math.floor(i / 3)], h = 4 + 4 * M.hash(Math.floor(i / 3), 3), l = i % 3; o.position.set(x, groundY(x, z) + h * (.45 + l * .22), z); o.scale.set(h * (.34 - l * .08), h * .45, h * (.34 - l * .08)); return '#' + new THREE.Color('#26361f').offsetHSL(0, 0, (M.hash(i, 9) - .5) * .06).getHexString(); }, 3));
  root.add(M.instanced(trunkG, bark, pts.length, (i, o) => { const [x, z] = pts[i]; o.position.set(x, groundY(x, z) + .8, z); o.scale.set(1, 1.6, 1); }));
  function groundY(x, z) { const zz = z - GZ, d = Math.hypot(x, z - 1); let y = M.fbm(x * .02, zz * .02, 4) * 10 + Math.max(0, -zz - 40) * .12; return y * Math.min(1, d / 14); }
  // light: low sun behind the hills (warm rim), sky fill, the cottage door lamp
  const sun = new THREE.DirectionalLight('#ffab6b', 2.2); sun.position.set(-60, 18, -70); sun.target.position.set(0, 0, 0); root.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 200 }); sun.shadow.bias = -.0005; sun.shadow.normalBias = .05;
  root.add(new THREE.HemisphereLight('#6876a8', '#2b2418', .6));
  M.lamp(root, { pos: [1.1, 2.3, 3.45], color: '#ffb35c', intensity: 6, bulb: .07, glow: 25 });
  ctx.scene.fog = new THREE.FogExp2('#5b5f7a', .006);
  M.shadows(root); domeM.castShadow = domeM.receiveShadow = false;
}

film({
  title: '액자 속 오두막 · The Cottage in the Frame',
  size: [1920, 1080], fps: 30, duration: 14,   // keys carry no times: the engine paces the move evenly over 14 s
  look: { exposure: .35, bloom: { strength: .35, threshold: 1.2 }, vignette: .3, grain: .03, grade: { shadows: [-.04, 0, .06], highlights: [.06, .02, -.04], contrast: 1.05, sat: 1.05 } },
  worlds: [
    { id: 'room', background: '#0a0908', build: room,
      // the painting's canvas: world 1 at 1:100, its picture plane (z = 38) on the wall's front face (z = -2), its ground (y = 0) at the canvas's lower edge
      portal: { at: [0, 1.32, -2.38], scale: .01, aperture: { center: [0, 1.6, -2], normal: [0, 0, 1], w: .8, h: .6 },
        bounds: [-150, -40, -250, 150, 150, 36.8] },   // the painting's space, from just behind the wall (z = -2.132 here)
      keys: [
        { pos: [0, 1.5, 2.4], look: [0, 1.5, -2], fov: 40, bokeh: 4 },
        { pos: [.35, 1.42, .5], look: [0, 1.5, -2], fov: 38, bokeh: 6 },
        { pos: [.04, 1.59, -1.25], look: [0, 1.6, -2.3], fov: 36, bokeh: 5 },
      ] },
    { id: 'painting', background: '#1b2546', build: painting,
      // the cottage window: world 0 at 1:1 behind it (room window (0, 1.4, 2) ↦ cottage window (0, 1.5, 3))
      portal: { at: [0, .1, 1], scale: 1, aperture: { center: [0, 1.5, 3.15], normal: [0, 0, 1], w: .9, h: 1.1 },
        bounds: [-2.15, -.05, -2.2, 2.15, 2.7, 1.84] },    // the room's space, inside its walls
      keys: [
        { pos: [0, 24, 36], look: [0, 3, 0], fov: 36, bokeh: 3 },
        { pos: [6, 7, 17], look: [0, 1.8, 3], fov: 36, bokeh: 5 },
        { pos: [.8, 1.8, 6.6], look: [0, 1.5, 3], fov: 38, bokeh: 6 },
      ] },
  ],
});
