// nested-world-loop · example 「병 속의 등대」 (The Lighthouse in the Bottle) — a ring of three worlds, 1/400 per loop.
//   cabin    the keeper's room at night (cm). On the desk, an uncorked bottle with a lighthouse inside it.
//   bottle   the sea inside the bottle (m, 1 m = 0.25 cm): resin waves, an islet, the lighthouse, a boat; the cabin
//            looms beyond the glass. The camera enters by the neck and climbs to the lantern's open door.
//   lantern  the lantern room (cm, real size): the turning Fresnel lens; outside the panes, the bottle's sea and, beyond
//            the glass, the giant cabin. A hatch in the floor drops back into … the cabin, through its ceiling.
// Designed from BRIEF.md. Nothing is loaded: every surface, map and light below is made in code.
import { film, THREE } from 'nwl/nwl.js';
import * as M from 'nwl/make.js';

const D2R = Math.PI / 180;
const BEAM_TURNS = 2;                          // the lens turns twice per loop — the same angle drives the beam (bottle) and the lens (lantern)
const LANTERN_YAW = Math.atan2(-.6, .8);       // the lantern world is turned so its door (+z) faces the camera's approach in the bottle

// ---------------------------------------------------------------- world 0 · the cabin (cm)
function cabin(ctx) {
  const { root, renderer } = ctx, add = o => { root.add(o); return o; };
  ctx.scene.environment = M.envMap(renderer, { base: '#120c08', panels: [{ color: '#ffbe78', intensity: 6, pos: [-3, 2, -3], size: [2, 2] }, { color: '#4a5d8c', intensity: 1.5, pos: [0, 1.5, -4.9], size: [3, 2] }, { color: '#ffd7a0', intensity: 2, pos: [1, 4.9, 1], size: [1.5, 1.5] }] });
  // shell: plank walls, plank floor, a beamed ceiling with a round hatch, a window in the back wall
  const pine = M.wood({ base: '#8a5a34', dark: '#3b2412', planks: 8, seed: 11, ring: 12 }); pine.map.repeat.set(1, 2); pine.rough.repeat.set(1, 2);
  const wallM = new THREE.MeshStandardMaterial({ map: pine.map, roughnessMap: pine.rough, roughness: .8, color: '#f0e2cc', envMapIntensity: .3 });
  const floorW = M.wood({ base: '#6e4527', dark: '#2a170b', planks: 6, seed: 12 }); floorW.map.repeat.set(3, 3); floorW.rough.repeat.set(3, 3);
  const plank = (w, h, d, m, x, y, z) => { const b = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)); b.position.set(x, y, z); return b; };
  plank(424, 4, 384, M.mat.wood(floorW, { rough: .6 }), 0, -2, 0);
  // back wall (z = -190) with the window opening x -60..60, y 110..220
  const backS = new THREE.Shape([[-212, 0], [212, 0], [212, 262], [-212, 262]].map(p => new THREE.Vector2(...p)));
  backS.holes.push(new THREE.Path([[-60, 110], [60, 110], [60, 220], [-60, 220]].map(p => new THREE.Vector2(...p))));
  const back = add(new THREE.Mesh(new THREE.ExtrudeGeometry(backS, { depth: 12, bevelEnabled: false }), wallM)); back.position.z = -202;
  back.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v / 200; });
  plank(424, 262, 12, wallM, 0, 131, 198);
  for (const sx of [-1, 1]) plank(12, 262, 400, wallM, sx * 218, 131, 0);
  // ceiling slab 260..275 with the hatch hole (r 40 at x 60, z 40)
  const ceilS = new THREE.Shape([[-224, -204], [224, -204], [224, 204], [-224, 204]].map(p => new THREE.Vector2(...p)));
  const hh = new THREE.Path(); hh.absarc(60, -40, 40, 0, Math.PI * 2, true); ceilS.holes.push(hh);
  const ceilG = new THREE.ExtrudeGeometry(ceilS, { depth: 15, bevelEnabled: false, curveSegments: 48 }); ceilG.rotateX(-Math.PI / 2);   // shape y → -z
  const ceil = add(new THREE.Mesh(ceilG, new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: .9, map: pine.map }))); ceil.position.y = 260;
  const beamM = M.mat.wood(M.wood({ base: '#5a3a22', dark: '#24150a', planks: 1, seed: 13 }), { rough: .75 });
  for (const x of [-150, -60, 140]) plank(18, 22, 384, beamM, x, 249, 0);
  const rim = add(new THREE.Mesh(M.ring(40, 46, 15), M.mat.metal('#6d5a3e', { rough: .5 }))); rim.rotation.x = Math.PI / 2; rim.position.set(60, 267.5, 40);
  // ladder up to the hatch
  const ladM = M.mat.wood(M.wood({ base: '#7a5130', dark: '#32200f', planks: 1, seed: 14 }));
  const lad = new THREE.Group(); add(lad); lad.position.set(60, 0, 82); lad.rotation.x = -.13;
  for (const sx of [-1, 1]) { const r = new THREE.Mesh(M.rbox(5, 268, 7, 1.5), ladM); r.position.set(sx * 22, 134, 0); lad.add(r); }
  for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 44, 10), ladM); r.rotation.z = Math.PI / 2; r.position.set(0, 25 + i * 28, 0); lad.add(r); }
  // window: frame, mullions, panes; outside, a night sea under a low moon (a backdrop inside this world)
  const frameM = M.mat.paint('#2e3a36', { rough: .5 });
  for (const [w, h, x, y] of [[132, 8, 0, 110], [132, 8, 0, 220], [8, 118, -62, 165], [8, 118, 62, 165], [4, 110, -20, 165], [4, 110, 20, 165], [124, 4, 0, 165]]) { const b = add(new THREE.Mesh(M.rbox(w, h, 10, 1), frameM)); b.position.set(x, y, -196); }
  const sill = add(new THREE.Mesh(M.rbox(140, 5, 22, 1.5), M.mat.wood(pine))); sill.position.set(0, 106, -186);
  const pane = add(new THREE.Mesh(new THREE.PlaneGeometry(120, 110), M.mat.glass({ tint: '#cfe0e8', opacity: .08 }))); pane.position.set(0, 165, -197);
  const skyG = new THREE.SphereGeometry(6000, 48, 24), sc = []; { const p = skyG.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 6000; const c = new THREE.Color().lerpColors(new THREE.Color('#2b3a5c'), new THREE.Color('#05070d'), Math.min(1, Math.max(0, y * 3))).multiplyScalar(.9); sc.push(c.r, c.g, c.b); } }
  skyG.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
  const sky = add(new THREE.Mesh(skyG, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }))); sky.position.set(0, 0, -400);
  const stars = M.instanced(new THREE.SphereGeometry(6, 4, 3), M.mat.emissive('#cfd8ff', 3), 260, (i, o, r) => { const a = r.range(-1.2, 1.2), e = r.range(.08, .7); o.position.set(Math.sin(a) * 5500 * Math.cos(e), Math.sin(e) * 5500, -400 - Math.cos(a) * 5500 * Math.cos(e)); o.scale.setScalar(r.range(.5, 1.6)); }, 31); add(stars); stars.castShadow = stars.receiveShadow = false;
  const moon = add(new THREE.Mesh(new THREE.CircleGeometry(140, 48), M.mat.emissive('#f3ead2', 6))); moon.position.set(900, 1150, -5200); moon.lookAt(0, 165, -190);
  const seaO = add(new THREE.Mesh(new THREE.PlaneGeometry(14000, 9000, 1, 1), M.mat.water('#04080d', { rough: .18, env: .6 }))); seaO.rotation.x = -Math.PI / 2; seaO.position.set(0, -240, -4700);
  const glitter = M.instanced(new THREE.PlaneGeometry(1, 1), M.mat.emissive('#f6e8c8', 2.5), 240, (i, o, r) => { const f = Math.pow(r(), .7); o.position.set(900 * f + r.normal(0, 40 + 120 * f), -239, -5200 * f - 300); o.rotation.x = -Math.PI / 2; o.scale.set(r.range(10, 60) * (1 - f * .6), r.range(2, 5), 1); }, 32); add(glitter); glitter.castShadow = glitter.receiveShadow = false;
  // the desk under the window
  const deskW = M.wood({ base: '#6a3f22', dark: '#2a160a', planks: 3, seed: 15, ring: 7 });
  const deskM = M.mat.wood(deskW, { rough: .45 }), brass = M.mat.metal('#c29b57', { rough: .28 }), darkBrass = M.mat.metal('#8a6a3a', { rough: .45 });
  const top = add(new THREE.Mesh(M.rbox(170, 5, 84, 1.2), deskM)); top.position.set(0, 77.5, -148);
  for (const sx of [-1, 1]) {
    const ped = add(new THREE.Mesh(M.rbox(46, 74, 78, 1), deskM)); ped.position.set(sx * 60, 38, -150);
    for (let j = 0; j < 3; j++) { const dr = add(new THREE.Mesh(M.rbox(40, 20, 2, .8), deskM)); dr.position.set(sx * 60, 14 + j * 23, -110); const kn = add(new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8), brass)); kn.position.set(sx * 60, 15 + j * 23, -108.5); }
  }
  // oil lamp: brass foot, glass font, burner, chimney, flame — the room's key light
  const LP = [-58, 80, -150];
  const foot = add(new THREE.Mesh(M.lathe([[0, 0], [7, 0], [7, .8], [3, 2.5], [2, 6], [3.5, 8]], 40), brass)); foot.position.set(...LP);
  const font = add(new THREE.Mesh(M.lathe([[0, 8], [3.5, 8], [6.2, 11], [6, 14], [3, 16], [0, 16]], 40), M.mat.glass({ tint: '#d8c48a', opacity: .35 }))); font.position.set(...LP);
  const oil = add(new THREE.Mesh(M.lathe([[0, 8.3], [3.3, 8.3], [5.6, 10.6], [5.4, 12], [0, 12]], 32), new THREE.MeshPhysicalMaterial({ color: '#8a5a12', roughness: .2, transmission: 0, transparent: true, opacity: .7 }))); oil.position.set(...LP);
  const burner = add(new THREE.Mesh(M.lathe([[0, 16], [3, 16], [3.2, 19], [2.4, 20], [2.6, 21], [0, 21]], 32), brass)); burner.position.set(...LP);
  const chim = add(new THREE.Mesh(M.lathe([[2.3, 21], [3.6, 24], [4.4, 27], [2.6, 32], [2.2, 40], [2.3, 40]], 40), M.mat.glass({ tint: '#f2ece0', opacity: .14 }))); chim.position.set(...LP);
  const flame = add(new THREE.Mesh(M.lathe([[0, 0], [.55, .4], [.75, 1.4], [.5, 2.6], [0, 3.6]], 16), M.mat.emissive('#ffb347', 28))); flame.position.set(LP[0], LP[1] + 21.6, LP[2]);
  const flameCore = add(new THREE.Mesh(M.lathe([[0, 0], [.25, .3], [.3, .9], [0, 1.6]], 12), M.mat.emissive('#bcd2ff', 6))); flameCore.position.set(LP[0], LP[1] + 21.3, LP[2]);
  const lamp = M.lamp(root, { pos: [LP[0], LP[1] + 23.5, LP[2]], color: '#ffb260', intensity: 9000, shadow: 1024, bulb: false, near: 3, far: 900, bias: -.004, normalBias: .6 });
  ctx.tick(t => { const w = ctx.angle(t); const f = 1 + .05 * Math.sin(w * 17) + .03 * Math.sin(w * 29 + 1) + .02 * Math.sin(w * 47 + 2); lamp.userData.base.intensity = 9000 * f; flame.scale.set(1, .95 + .1 * Math.sin(w * 23), 1); });
  // the bottle on its cradle, uncorked: axis along x at y 84.5, z -140; bottom at x 46, lip at x 6
  const bottleG = M.lathe([[0, .3], [3.6, 0], [4.7, .4], [5, 1.6], [5, 25.8], [4.5, 28.2], [2.4, 30.8], [1.4, 32.4], [1.3, 38.9], [1.65, 39.2], [1.65, 40], [1.05, 40.1]], 72);
  const bottle = add(new THREE.Mesh(bottleG, M.mat.glass({ tint: '#d4eadf', opacity: .13, env: 1.8 }))); bottle.rotation.z = Math.PI / 2; bottle.position.set(46, 86.5, -140);
  bottle.castShadow = false; bottle.userData.noShadow = true;
  const notch = []; for (let i = 0; i <= 24; i++) { const a = Math.PI + Math.asin(1.5 / 5.1) + (Math.PI - 2 * Math.asin(1.5 / 5.1)) * i / 24; notch.push([Math.cos(a) * 5.1, 6.5 + Math.sin(a) * 5.1]); }
  const cradleS = new THREE.Shape([[-7, 0], [7, 0], [7, 5], ...notch.reverse(), [-7, 5]].map(p => new THREE.Vector2(...p)));
  for (const x of [24, 40]) { const c = add(new THREE.Mesh(new THREE.ExtrudeGeometry(cradleS, { depth: 3, bevelEnabled: true, bevelSize: .3, bevelThickness: .3, bevelSegments: 1 }), deskM)); c.rotation.y = Math.PI / 2; c.position.set(x - 1.5, 80, -140); }
  const cork = add(new THREE.Mesh(M.lathe([[0, 0], [1.25, 0], [1.45, 3.4], [0, 3.4]], 24), M.mat.paint('#a7784a', { map: M.noiseMap({ color: ['#7a5230', '#c49a6a'], scale: 40, lo: 0, hi: 1 }) }))); cork.rotation.set(Math.PI / 2, 0, .4); cork.position.set(1, 81.3, -126);
  // logbook open, a pen, a telescope, a compass, a mug
  const cover = add(new THREE.Mesh(M.rbox(46, 1.2, 31, .4), M.mat.leather('#5a2a1c'))); cover.position.set(-10, 80.6, -122); cover.rotation.y = .12;
  for (const sx of [-1, 1]) { const pg = add(new THREE.Mesh(new THREE.BoxGeometry(21.5, .9, 29), M.mat.paint('#efe4c8', { map: M.paper({ lines: 22, scribble: true, seed: sx > 0 ? 3 : 7 }), rough: .9 }))); pg.position.set(-10 + sx * 11 * Math.cos(.12), 81.6 + .3, -122 - sx * 11 * Math.sin(.12)); pg.rotation.set(0, .12, sx * -.035); }
  const pen = add(new THREE.Mesh(M.tube([[0, 0, 0], [14, 0, 0]], .45), M.mat.paint('#151515', { rough: .3 }))); pen.position.set(8, 82.7, -110); pen.rotation.y = -.5;
  const nib = add(new THREE.Mesh(new THREE.ConeGeometry(.45, 2, 12), brass)); nib.rotation.z = Math.PI / 2; nib.position.set(8 + 15 * Math.cos(.5), 82.7, -110 - 15 * Math.sin(.5)); nib.rotation.y = -.5;
  const scope = add(new THREE.Mesh(M.lathe([[0, 0], [2.4, 0], [2.4, 22], [2.1, 22.5], [2.1, 38], [1.8, 38.5], [1.8, 50], [1.5, 50.5], [1.5, 56], [0, 56]], 36), brass)); scope.rotation.z = -Math.PI / 2 + .02; scope.position.set(-60, 82.5, -178); scope.rotation.y = .06;
  const compass = add(new THREE.Mesh(M.lathe([[0, 0], [6.5, 0], [7, 1], [6.8, 3], [6, 3.3], [0, 3.3]], 48), darkBrass)); compass.position.set(62, 80, -118);
  const rose = add(new THREE.Mesh(new THREE.CircleGeometry(5.8, 48), new THREE.MeshStandardMaterial({ map: M.dial({ numerals: 'none', ticks: 32, text: 'N', face: '#e9dcc0' }), roughness: .5 }))); rose.rotation.x = -Math.PI / 2; rose.position.set(62, 83.1, -118);
  const needle = add(new THREE.Mesh(new THREE.BoxGeometry(8.5, .2, .5), M.mat.paint('#8a1f18'))); needle.position.set(62, 83.4, -118);
  ctx.tick(t => { needle.rotation.y = .25 + .06 * Math.sin(ctx.angle(t, 3)); });
  const mug = add(new THREE.Mesh(M.lathe([[0, 0], [4.2, 0], [4.6, 9.5], [4.2, 9.5], [3.8, .6], [0, .6]], 40), M.mat.ceramic('#e8e0cf'))); mug.position.set(-38, 80, -168);
  const handle = add(new THREE.Mesh(new THREE.TorusGeometry(2.4, .55, 10, 24, Math.PI), M.mat.ceramic('#e8e0cf'))); handle.rotation.z = -Math.PI / 2; handle.position.set(-33.4, 85, -168);
  // a chair, a rug, a shelf of books, a barometer
  const chair = new THREE.Group(); add(chair); chair.position.set(-8, 0, -82); chair.rotation.y = .18;
  const seat = new THREE.Mesh(M.rbox(46, 4, 44, 1.2), deskM); seat.position.y = 46; chair.add(seat);
  for (const [x, z] of [[-20, -18], [20, -18], [-20, 18], [20, 18]]) { const l = new THREE.Mesh(M.rbox(4, 46, 4, .8), deskM); l.position.set(x, 23, z); chair.add(l); }
  for (const x of [-20, 20]) { const p = new THREE.Mesh(M.rbox(4, 52, 4, .8), deskM); p.position.set(x, 72, 19); chair.add(p); }
  for (const y of [80, 92]) { const r = new THREE.Mesh(M.rbox(44, 6, 3, 1), deskM); r.position.set(0, y, 19); chair.add(r); }
  const rugT = M.canvasTex(512, 352, (x, w, h) => { x.fillStyle = '#7a2a20'; x.fillRect(0, 0, w, h); const band = (i, c) => { x.strokeStyle = c; x.lineWidth = 10; x.strokeRect(i, i, w - 2 * i, h - 2 * i); }; band(14, '#2a1c3a'); band(30, '#c49a52'); band(44, '#2a1c3a');
    x.fillStyle = '#5a1c16'; for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) { x.save(); x.translate(90 + i * 42, 86 + j * 45); x.rotate(Math.PI / 4); x.fillRect(-11, -11, 22, 22); x.restore(); } });
  const rug = add(new THREE.Mesh(new THREE.PlaneGeometry(190, 130), M.mat.paint('#ffffff', { map: rugT, rough: 1 }))); rug.rotation.x = -Math.PI / 2; rug.position.set(0, .3, -70);
  const shelf = add(new THREE.Mesh(M.rbox(26, 3, 120, .6), deskM)); shelf.position.set(198, 150, -90);
  const bookCols = ['#5b2a22', '#2f4a3a', '#6e5a2a', '#2a3550', '#7a3a2a', '#3e2a40'];
  add(M.instanced(new THREE.BoxGeometry(1, 1, 1), M.mat.paint('#ffffff', { rough: .7 }), 26, (i, o, r) => { const h = r.range(18, 27), w = r.range(2.4, 4.6); o.position.set(198 + r.range(-2, 2), 151.5 + h / 2, -146 + i * 4.3 + r.range(-.3, .3)); o.scale.set(r.range(15, 20), h, w * .92); o.rotation.x = i > 22 ? .25 : 0; return r.pick(bookCols); }, 41));
  const baro = add(new THREE.Mesh(M.lathe([[0, 0], [11, 0], [12, 1.5], [11.5, 3], [0, 3]], 48), M.mat.wood(deskW))); baro.rotation.x = Math.PI / 2; baro.position.set(-120, 170, -195);
  const bface = add(new THREE.Mesh(new THREE.CircleGeometry(9.5, 48), new THREE.MeshStandardMaterial({ map: M.dial({ numerals: 'arabic', text: 'FAIR', face: '#efe6d0' }), roughness: .45 }))); bface.position.set(-120, 170, -191.9);
  const bglass = add(new THREE.Mesh(new THREE.CircleGeometry(10, 48), M.mat.glass({ opacity: .1 }))); bglass.position.set(-120, 170, -191.5);
  const sconce = add(new THREE.Mesh(M.lathe([[0, 0], [5, 0], [6, 6], [3, 9], [0, 9]], 24), brass)); sconce.rotation.z = Math.PI / 2; sconce.position.set(212, 190, -10);
  const sglass = add(new THREE.Mesh(M.lathe([[2.5, 0], [4, 4], [3.6, 11], [2.4, 13]], 24), M.mat.emissive('#ffb060', 3, { transparent: true, opacity: .85 }))); sglass.position.set(203, 194, -10);
  M.lamp(root, { pos: [202, 200, -10], color: '#ffa850', intensity: 6000, bulb: false });
  // light: the oil lamp (key), the lantern's glow down the hatch (warm top light), moonlight through the window (cool), a little fill
  M.spot(root, { pos: [60, 330, 40], target: [40, 0, -30], color: '#ffd59a', intensity: 2.6e5, angle: .42, penumbra: .8, shadow: 1024, near: 20, far: 800, bias: -.003, normalBias: .5 });
  M.spot(root, { pos: [140, 520, -900], target: [0, 60, -120], color: '#8ea6e0', intensity: 1.1e6, angle: .16, penumbra: .9, shadow: 1024, near: 400, far: 1600, bias: -.002, normalBias: .5 });
  add(new THREE.HemisphereLight('#4a5070', '#3a2414', .3));
  M.lamp(root, { pos: [-20, 170, -40], color: '#ff9e58', intensity: 22000, bulb: false });   // the lamp's light thrown back by the desk and walls (no shadow)
  M.shadows(root); for (const o of [sky, seaO, moon, pane, bottle, chim, font, oil, bglass, flame, flameCore, burner]) { o.castShadow = false; }   // nothing round the flame blocks its own light
  const motes = M.dust({ count: 50, box: [-90, 95, -170, -25, 135, -120], size: .07, color: '#ffe3b8', seed: 5, glow: 0 }); add(motes.mesh);
  ctx.tick(t => motes.update(t, ctx.DURATION));
}

// ---------------------------------------------------------------- world 1 · the sea in the bottle (m; 1 m = 0.25 cm)
// The bottle's inside is a cylinder of radius 18.4 along x (axis at y 6.4), body x -52 … 52, neck to x -108.
function bottleSea(ctx) {
  const { root, renderer } = ctx, add = o => { root.add(o); return o; };
  ctx.scene.environment = M.envMap(renderer, { base: '#0d0907', panels: [{ color: '#ffb46a', intensity: 7, pos: [-4.9, 1, -.5], size: [3, 3] }, { color: '#ffd8a0', intensity: 1.5, pos: [0, 4.9, 0], size: [5, 5] }] });
  // the bottle's inside radius along x (from the cabin's lathe profile: a cm from the bottom, r cm; x = 52 - 4a, r_in = 4 (r - 0.2))
  const PROF = [[0, 3.6], [.4, 4.7], [1.6, 5], [25.8, 5], [28.2, 4.5], [30.8, 2.4], [32.4, 1.4], [38.9, 1.3]];
  const rIn = x => { const a = (52 - x) / 4; for (let i = 1; i < PROF.length; i++) if (a <= PROF[i][0]) { const [a0, r0] = PROF[i - 1], [a1, r1] = PROF[i]; return 4 * (r0 + (r1 - r0) * (a - a0) / (a1 - a0) - .2); } return 4 * (PROF[PROF.length - 1][1] - .2); };
  const AX = 6.4, X0 = -70.5, X1 = 50.5, half = x => Math.sqrt(Math.max(0, (rIn(x) - .25) ** 2 - AX * AX));
  // resin under the waves: the lower part of each slice of the bottle, from the shoulder to the bottom
  { const NX = 120, NA = 40, pos = [], idx = [];
    for (let i = 0; i <= NX; i++) { const x = X0 + (X1 - X0) * i / NX, r = rIn(x) - .15, pa = Math.asin(Math.max(-1, Math.min(1, (-.45 - AX) / r)));
      for (let j = 0; j <= NA; j++) { const ph = pa + (-Math.PI - 2 * pa) * j / NA; pos.push(x, AX + r * Math.sin(ph), r * Math.cos(ph)); } }
    for (let i = 0; i < NX; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + NA + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const cap = (i, flip) => { const c = pos.length / 3; pos.push(X0 + (X1 - X0) * i / NX, -.45, 0); for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j; flip ? idx.push(c, a + 1, a) : idx.push(c, a, a + 1); } };
    cap(0, true); cap(NX, false);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    add(new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: '#08262a', roughness: .3, clearcoat: 1, clearcoatRoughness: .1, envMapIntensity: .8, side: THREE.DoubleSide }))); }
  // waves: a grid that narrows with the bottle, heights recomputed every frame from whole-cycle sines (the loop closes)
  const seaG = new THREE.PlaneGeometry(1, 2, 240, 70); seaG.rotateX(-Math.PI / 2);
  { const p = seaG.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i) + .5, v = p.getZ(i), x = X0 + (X1 - X0) * u; p.setXYZ(i, x, 0, v * half(x)); } }
  const sea = add(new THREE.Mesh(seaG, M.mat.water('#0b2f36', { rough: .12, env: 1.3 }))); sea.receiveShadow = true;
  const base = Float32Array.from(seaG.attributes.position.array);
  const waves = [[.21, .05, 3, .32, 0], [.07, .19, 2, .22, 1.3], [.33, -.12, 5, .1, 2.1], [-.15, .27, 4, .12, .7], [.6, .4, 8, .035, 1.9]];
  const wave = (x, z, t) => { let h = 0; for (const [kx, kz, n, a, p] of waves) h += a * Math.sin(kx * x + kz * z - ctx.angle(t, n) + p); return h; };
  ctx.tick(t => { const p = seaG.attributes.position; for (let i = 0; i < p.count; i++) { const x = base[i * 3], z = base[i * 3 + 2]; const edge = Math.min(1, (half(x) - Math.abs(z)) / 2.5); p.setY(i, wave(x, z, t) * edge); } p.needsUpdate = true; seaG.computeVertexNormals(); });
  // the islet: rough boulders round the tower's footing
  const rockM = new THREE.MeshStandardMaterial({ color: '#4a4440', roughness: .92, map: M.noiseMap({ color: ['#2a2622', '#7a7064'], scale: 9, lo: 0, hi: 1 }), envMapIntensity: .4 });
  const IS = [12, -3], rr = M.rng(77);
  for (let i = 0; i < 11; i++) {
    const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position; const s = rr.range(1.6, 3.4);
    for (let j = 0; j < p.count; j++) { const v = new THREE.Vector3().fromBufferAttribute(p, j); const k = 1 + .28 * M.fbm(v.x * 1.7 + i, v.y * 1.7 + v.z, 3); p.setXYZ(j, v.x * k, v.y * k * .75, v.z * k); }
    g.computeVertexNormals();
    const a = i / 11 * Math.PI * 2 + rr.range(-.2, .2), d = i < 3 ? rr.range(0, 1.5) : rr.range(3, 5.6);
    const m = add(new THREE.Mesh(g, rockM)); m.position.set(IS[0] + Math.cos(a) * d, rr.range(-.5, 1.4) + (i < 3 ? 1 : 0), IS[1] + Math.sin(a) * d); m.scale.setScalar(s); m.rotation.set(rr() * 3, rr() * 3, rr() * 3);
  }
  const pad = add(new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.9, 3, 32), rockM)); pad.position.set(IS[0], 1.2, IS[1]);
  // the lighthouse: banded tower, gallery, lantern (salt-misted panes, glowing), dome; an open door at the lantern
  const bands = M.canvasTex(64, 512, (x, w, h) => { x.fillStyle = '#e9e4d8'; x.fillRect(0, 0, w, h); x.fillStyle = '#9a2c22'; for (const [a, b] of [[.18, .32], [.5, .64]]) x.fillRect(0, h * (1 - b), w, h * (b - a)); x.globalAlpha = .2; for (let i = 0; i < 400; i++) { x.fillStyle = i % 2 ? '#5a5048' : '#ffffff'; x.fillRect(M.hash(i, 1) * w, M.hash(i, 2) * h, 2, 6 + 20 * M.hash(i, 3)); } });
  const tower = add(new THREE.Mesh(M.lathe([[0, 2.6], [2.35, 2.6], [2.3, 3], [1.62, 16.6], [1.9, 16.8], [0, 16.8]], 48), new THREE.MeshStandardMaterial({ map: bands, roughness: .7 }))); tower.position.set(IS[0], 0, IS[1]);
  const towerWin = M.mat.emissive('#ffb766', 2.2);
  for (const [y, a] of [[6, .4], [9.5, 2.2], [13, -.9]]) { const r = 2.3 - (y - 3) / 13.6 * .68, w = add(new THREE.Mesh(new THREE.BoxGeometry(.5, .8, .2), towerWin)); w.position.set(IS[0] + Math.sin(a) * r, y, IS[1] + Math.cos(a) * r); w.rotation.y = a; }
  const iron = M.mat.metal('#2a2a2a', { rough: .5 }), gallery = add(new THREE.Mesh(new THREE.CylinderGeometry(2.65, 2.4, .22, 48), iron)); gallery.position.set(IS[0], 16.9, IS[1]);
  add(M.instanced(new THREE.CylinderGeometry(.03, .03, 1.05, 6), iron, 32, (i, o) => { const a = i / 32 * Math.PI * 2; o.position.set(IS[0] + Math.cos(a) * 2.58, 17.5, IS[1] + Math.sin(a) * 2.58); }));
  const rail = add(new THREE.Mesh(new THREE.TorusGeometry(2.58, .035, 6, 64), iron)); rail.rotation.x = Math.PI / 2; rail.position.set(IS[0], 18.03, IS[1]);
  const lantern = new THREE.Group(); add(lantern); lantern.position.set(IS[0], 17, IS[1]); lantern.rotation.y = LANTERN_YAW;
  const parapet = new THREE.Mesh(new THREE.CylinderGeometry(1.76, 1.76, .4, 36, 1, false, .24, Math.PI * 2 - .48), M.mat.paint('#e6e0d2', { side: THREE.DoubleSide })); parapet.position.y = .2; lantern.add(parapet);
  const mist = M.mat.emissive('#ffc887', 1.6, { transparent: true, opacity: .82, side: THREE.DoubleSide });
  for (let i = 1; i < 12; i++) { const a = i * 30 * D2R, p = new THREE.Mesh(new THREE.PlaneGeometry(.9, 2.2), mist); p.position.set(Math.sin(a) * 1.68, 1.5, Math.cos(a) * 1.68); p.rotation.y = a; lantern.add(p); }
  for (let i = 0; i < 12; i++) { const a = (i * 30 + 15) * D2R, m = new THREE.Mesh(new THREE.BoxGeometry(.06, 2.3, .06), iron); m.position.set(Math.sin(a) * 1.74, 1.5, Math.cos(a) * 1.74); lantern.add(m); }
  const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(.7, 1.9, .04), M.mat.paint('#2c3b34')); doorLeaf.geometry.translate(.35, 0, 0); doorLeaf.position.set(-.35, .95, 1.72); doorLeaf.rotation.y = -1.9; lantern.add(doorLeaf);
  const dome = new THREE.Mesh(M.lathe([[1.8, 0], [1.75, .3], [1.3, .9], [.5, 1.25], [.2, 1.35], [0, 1.4]], 36), M.mat.metal('#3d5a4a', { rough: .55 })); dome.position.y = 2.62; lantern.add(dome);
  const vent = new THREE.Mesh(new THREE.SphereGeometry(.26, 16, 12), iron); vent.position.y = 4.15; lantern.add(vent);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1.2, 6), iron); rod.position.y = 4.8; lantern.add(rod);
  // the keeper's cottage on the islet
  const cot = add(new THREE.Mesh(M.rbox(4.2, 2.6, 3.2, .1), M.mat.paint('#ddd5c4'))); cot.position.set(IS[0] - 7.2, 3.1, IS[1] + 3.6); cot.rotation.y = .5;
  const roof = add(new THREE.Mesh(M.prism([[-2.4, 0], [2.4, 0], [0, 1.5]], 3.6), M.mat.paint('#7a3226'))); roof.position.set(IS[0] - 7.2, 4.4, IS[1] + 3.6); roof.rotation.y = .5;
  const cwin = add(new THREE.Mesh(new THREE.PlaneGeometry(.6, .6), M.mat.emissive('#ffb35c', 3))); cwin.position.set(IS[0] - 7.2 + Math.sin(.5) * 1.62, 3.1, IS[1] + 3.6 + Math.cos(.5) * 1.62); cwin.rotation.y = .5;
  // a small boat going round the islet once per loop, riding the waves
  const boat = new THREE.Group(); add(boat);
  const hull = new THREE.Mesh(M.prism([[-1.6, .5], [1.4, .5], [1.9, .9], [1.6, 0], [-1.3, 0]], 1.1, .05), M.mat.paint('#3a2a20')); boat.add(hull);
  const cabinB = new THREE.Mesh(M.rbox(.9, .7, .8, .05), M.mat.paint('#d8cfbe')); cabinB.position.set(-.3, 1.1, 0); boat.add(cabinB);
  const bwin = new THREE.Mesh(new THREE.PlaneGeometry(.3, .25), M.mat.emissive('#ffc070', 4)); bwin.position.set(.16, 1.15, 0); bwin.rotation.y = Math.PI / 2; boat.add(bwin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.03, .04, 2.4, 6), iron); mast.position.set(.5, 1.6, 0); boat.add(mast);
  const blamp = M.lamp(boat, { pos: [.5, 2.85, 0], color: '#ffd08a', intensity: 3, bulb: .05, glow: 5 });
  ctx.tick(t => { const a = ctx.angle(t, 1), x = 6 + Math.cos(a) * 30, z = Math.sin(a) * 10.5; const h = wave(x, z, t); boat.position.set(x, h - .05, z); boat.rotation.set(Math.sin(ctx.angle(t, 5)) * .06, -a - Math.PI / 2 + Math.PI, Math.cos(ctx.angle(t, 4)) * .08); });
  void blamp;
  // light: the oil lamp beyond the glass (warm key from -x), the lantern's glow, a turning beam, cool fill
  const key = new THREE.DirectionalLight('#ffb878', 1.6); key.position.set(-60, 18, -6); key.target.position.set(0, 0, 0); add(key); add(key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -40, right: 40, top: 30, bottom: -20, near: 1, far: 140 }); key.shadow.bias = -.0006; key.shadow.normalBias = .04;
  M.lamp(root, { pos: [IS[0], 18.5, IS[1]], color: '#ffc57e', intensity: 160, bulb: false });
  const beams = new THREE.Group(); add(beams); beams.position.set(IS[0], 18.5, IS[1]);
  for (const s of [0, Math.PI]) { const b = M.beam({ length: 70, r0: .5, r1: 7, color: '#ffe7b8', strength: .55 }); b.rotation.y = s; beams.add(b); }
  const sweep = new THREE.SpotLight('#ffe2b0', 3500, 0, .14, .5, 2); sweep.position.set(IS[0], 18.5, IS[1]); add(sweep); add(sweep.target);
  ctx.tick(t => { const a = ctx.angle(t, BEAM_TURNS) + LANTERN_YAW; beams.rotation.y = a; sweep.target.position.set(IS[0] + Math.sin(a) * 40, 2, IS[1] + Math.cos(a) * 40); });
  add(new THREE.HemisphereLight('#7e6a58', '#0c1a1e', .35));
  ctx.scene.fog = new THREE.FogExp2('#2a1e16', .007);
  M.shadows(root); for (const o of [beams]) o.traverse(c => { c.castShadow = false; c.receiveShadow = false; });
}

// ---------------------------------------------------------------- world 2 · the lantern room (cm, real size)
// Floor at y 0, glazing radius 170 from 40 to 260, door at +z, the hatch (r 42) at (60, 0, -60).
function lanternRoom(ctx) {
  const { root, renderer } = ctx, add = o => { root.add(o); return o; };
  ctx.scene.environment = M.envMap(renderer, { base: '#0b0706', panels: [{ color: '#ffd9a0', intensity: 9, pos: [0, 0, 0], size: [.8, .8] }, { color: '#ffb070', intensity: 2, pos: [-4.9, 0, 0], size: [3, 3] }] });
  const iron = M.mat.metal('#2b2826', { rough: .5 }), brass = M.mat.metal('#c7a058', { rough: .24 }), paint = M.mat.paint('#e3dccb', { rough: .6 });
  // floor plate with the hatch, the hatch lid standing open
  const fs = new THREE.Shape(); fs.absarc(0, 0, 178, 0, Math.PI * 2, false); const hole = new THREE.Path(); hole.absarc(60, -60, 42, 0, Math.PI * 2, true); fs.holes.push(hole);
  const fg = new THREE.ExtrudeGeometry(fs, { depth: 15, bevelEnabled: false, curveSegments: 64 }); fg.rotateX(-Math.PI / 2); fg.translate(0, -15, 0);   // shape y → -z: the hole lands at (60, 0, -60); plate y -15 … 0
  const floor = add(new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ color: '#5a524a', roughness: .55, metalness: .6, map: M.noiseMap({ color: ['#2e2a26', '#6e665c'], scale: 22, lo: 0, hi: 1 }) })));
  const lidRing = add(new THREE.Mesh(M.ring(42, 47, 4), brass)); lidRing.rotation.x = Math.PI / 2; lidRing.position.set(60, .5, -60);
  const lid = new THREE.Group(); add(lid); lid.position.set(60, 0, -102); lid.rotation.x = -1.75;
  const lidD = new THREE.Mesh(new THREE.CylinderGeometry(42, 42, 3, 48), iron); lidD.position.set(0, 1.5, 42); lid.add(lidD);
  // parapet, glazing (11 panes + the open door at +z), mullions and rings, dome ceiling
  const parapet = add(new THREE.Mesh(new THREE.CylinderGeometry(174, 174, 40, 64, 1, true, .24, Math.PI * 2 - .48), M.mat.paint('#e3dccb', { rough: .6, side: THREE.DoubleSide }))); parapet.position.y = 20;
  const glass = M.mat.glass({ tint: '#e8f0ee', opacity: .07, env: 1.2 });
  for (let i = 1; i < 12; i++) { const a = i * 30 * D2R, p = add(new THREE.Mesh(new THREE.PlaneGeometry(90, 220), glass)); p.position.set(Math.sin(a) * 170, 150, Math.cos(a) * 170); p.rotation.y = a; p.castShadow = false; }
  for (let i = 0; i < 12; i++) { const a = (i * 30 + 15) * D2R, m = add(new THREE.Mesh(M.rbox(6, 224, 6, 1), iron)); m.position.set(Math.sin(a) * 174, 150, Math.cos(a) * 174); m.rotation.y = a; }
  for (const y of [40, 150, 262]) { const gap = y < 200 ? .48 : 0, g = new THREE.TorusGeometry(173, 3, 8, 96, Math.PI * 2 - gap); g.rotateZ(Math.PI / 2 + gap / 2); g.rotateX(Math.PI / 2); const r = add(new THREE.Mesh(g, iron)); r.position.y = y; }
  const doorLeaf = new THREE.Group(); add(doorLeaf); doorLeaf.position.set(-35, 95, 172); doorLeaf.rotation.y = -1.9;
  const dl = new THREE.Mesh(M.rbox(70, 190, 4, 1), M.mat.paint('#2c3b34')); dl.position.x = 35; doorLeaf.add(dl);
  const ceilD = add(new THREE.Mesh(M.lathe([[180, 0], [175, 30], [130, 90], [50, 125], [20, 135], [0, 138]], 64), M.mat.metal('#5c4030', { rough: .6, side: THREE.DoubleSide }))); ceilD.position.y = 262;
  // gallery outside: deck and railing (seen through the panes)
  const deck = add(new THREE.Mesh(M.ring(178, 265, 20), iron)); deck.rotation.x = Math.PI / 2; deck.position.y = -10;
  add(M.instanced(new THREE.CylinderGeometry(3, 3, 105, 6), iron, 32, (i, o) => { const a = i / 32 * Math.PI * 2; o.position.set(Math.cos(a) * 258, 52, Math.sin(a) * 258); }));
  const rail = add(new THREE.Mesh(new THREE.TorusGeometry(258, 3.5, 6, 96), iron)); rail.rotation.x = Math.PI / 2; rail.position.y = 103;
  // the lens: cast pedestal, a turning carriage — brass cage, prism rings above and below, two bull's-eye panels, the lamp
  const ped = add(new THREE.Mesh(M.lathe([[0, 0], [38, 0], [38, 6], [26, 10], [18, 30], [18, 70], [30, 78], [30, 84], [0, 84]], 48), iron));
  const lens = new THREE.Group(); add(lens); lens.position.y = 84;
  const prism = new THREE.MeshPhysicalMaterial({ color: '#f6f1e0', roughness: .03, metalness: 0, transparent: true, opacity: .5, clearcoat: 1, envMapIntensity: 2.4, specularIntensity: 1, side: THREE.DoubleSide, depthWrite: false });
  for (let j = 0; j < 10; j++) { for (const s of [1, -1]) { const y = 66 + s * (24 + j * 5.2), r = 58 - j * j * .45; const t = new THREE.Mesh(new THREE.TorusGeometry(r, 3.1, 10, 72), prism); t.rotation.x = Math.PI / 2; t.position.y = y; t.scale.z = 1.3; lens.add(t); } }
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const rib = new THREE.Mesh(M.tube([[Math.cos(a) * 36, -4, Math.sin(a) * 36], [Math.cos(a) * 60, 40, Math.sin(a) * 60], [Math.cos(a) * 61, 66, Math.sin(a) * 61], [Math.cos(a) * 60, 92, Math.sin(a) * 60], [Math.cos(a) * 36, 136, Math.sin(a) * 36]], 1.3), brass); lens.add(rib); }
  for (const y of [-4, 136]) { const r = new THREE.Mesh(new THREE.TorusGeometry(36, 2.2, 8, 48), brass); r.rotation.x = Math.PI / 2; r.position.y = y; lens.add(r); }
  for (const s of [1, -1]) { const panel = new THREE.Group(); panel.position.set(0, 66, s * 60); panel.rotation.y = s > 0 ? 0 : Math.PI; lens.add(panel);
    const eye = new THREE.Mesh(M.lathe([[0, 7], [10, 6], [20, 3], [24, 0]], 36), prism); eye.rotation.x = Math.PI / 2; panel.add(eye);
    for (const r of [27, 31.5, 36, 40.5]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 2.4, 8, 56), prism); t.scale.z = 1.6; panel.add(t); }
    const fr = new THREE.Mesh(new THREE.TorusGeometry(44, 1.8, 8, 56), brass); panel.add(fr); }
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), M.mat.emissive('#fff0c8', 16)); bulb.position.y = 66; lens.add(bulb);
  const mantle = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 18, 24, 1, true), M.mat.emissive('#ffc070', 8, { transparent: true, opacity: .6, side: THREE.DoubleSide })); mantle.position.y = 66; lens.add(mantle);
  ctx.tick(t => { lens.rotation.y = ctx.angle(t, BEAM_TURNS); });
  // things a keeper leaves: a stool, an oil can, a brass rail round the pedestal
  const stool = new THREE.Group(); add(stool); stool.position.set(-95, 0, 55);
  const sTop = new THREE.Mesh(new THREE.CylinderGeometry(17, 17, 4, 32), M.mat.wood(M.wood({ base: '#6a4426', dark: '#2a1709', planks: 2, seed: 21 }))); sTop.position.y = 52; stool.add(sTop);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, l = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 52, 8), iron); l.position.set(Math.cos(a) * 11, 26, Math.sin(a) * 11); l.rotation.set(Math.sin(a) * .15, 0, -Math.cos(a) * .15); stool.add(l); }
  const can = add(new THREE.Mesh(M.lathe([[0, 0], [11, 0], [11, 22], [5, 30], [4, 36], [0, 36]], 32), M.mat.metal('#7a5c2e', { rough: .5 }))); can.position.set(-120, 0, -40);
  const spout = add(new THREE.Mesh(M.tube([[-114, 18, -40], [-100, 26, -40], [-92, 36, -40]], 1.4), M.mat.metal('#7a5c2e', { rough: .5 }))); void spout;
  // light: the lamp in the lens (and the light it throws), a faint warm glow from the bottle's world outside
  M.lamp(root, { pos: [0, 150, 0], color: '#ffe4b0', intensity: 2.2e4, shadow: 1024, bulb: false, near: 5, far: 1200, bias: -.003, normalBias: 1 });
  add(new THREE.HemisphereLight('#6a5240', '#1a120c', .45));
  M.shadows(root); for (const o of [ceilD]) o.castShadow = false;
  lens.traverse(c => { if (c.isMesh && c.material === prism) c.castShadow = false; });
}

film({
  title: '병 속의 등대 · The Lighthouse in the Bottle',
  size: [1920, 1080], fps: 30, duration: 24, outer: 2,
  look: { exposure: .85, bloom: { strength: .42, threshold: 1.25, radius: .8 }, dof: { maxBlur: 20 }, vignette: .34, grain: .03, aberration: .0015,
    grade: { shadows: [-.05, -.01, .06], highlights: [.07, .03, -.04], contrast: 1.06, sat: 1.04 } },
  worlds: [
    { id: 'cabin', background: '#06070b', build: cabin,
      // containment: the bottle's sea at 1 m = 0.25 cm; its axis (y 6.4) on the bottle's axis (86.5), x 0 at the body's middle (33)
      portal: { at: [33, 84.9, -140], scale: .25, bounds: [-52, -6.5, -12.9, 52, 19.3, 12.9] },
      keys: [
        { pos: [60, 266, 44], look: [15, 84, -138], fov: 42, bokeh: 3 },
        { pos: [28, 196, 8], look: [-8, 84, -136], fov: 40, bokeh: 5 },
        { pos: [-82, 138, -62], look: [-25, 86, -140], fov: 38, bokeh: 6 },
        { pos: [-42, 100, -102], look: [22, 87, -140], fov: 36, bokeh: 8, pace: .9 },
        { pos: [-13, 90, -127], look: [26, 87, -140], fov: 34, bokeh: 9, pace: .8 },
        { pos: [-1.5, 86.9, -139.6], look: [30, 86.6, -140], fov: 36, bokeh: 6, pace: .75 },
      ] },
    { id: 'bottle', background: '#120a06', build: bottleSea,
      // the lantern room at real size (cm → m), turned so its door faces the approach; its floor on the gallery (y 17)
      portal: { at: [12, 17, -3], scale: .01, rot: [0, LANTERN_YAW, 0], aperture: { center: [10.968, 17.95, -1.624], normal: [-.6, 0, .8], w: .72, h: 1.9 },
        bounds: [-270, -20, -270, 270, 420, 270] },
      keys: [
        { pos: [-90, 7, .5], look: [12, 9, -3], fov: 40, bokeh: 4, pace: .8 },
        { pos: [-46, 3.2, 5], look: [12, 9, -3], fov: 38, bokeh: 5 },
        { pos: [-15, 2.4, 8.5], look: [12, 10, -3], fov: 36, bokeh: 6 },
        { pos: [1.5, 9.5, 9], look: [12, 15.5, -3], fov: 36, bokeh: 6 },
        { pos: [7.2, 18.6, 3.6], look: [11, 18.4, -1.6], fov: 38, bokeh: 5, pace: .85 },
      ] },
    { id: 'lantern', background: '#120a06', build: lanternRoom,
      // the hatch: the cabin below, at real size — its ceiling (y 275) under this floor (y -15), its hatch (60, 40) under ours (60, -60)
      portal: { at: [0, -290, -100], scale: 1, aperture: { center: [60, 0, -60], normal: [0, 1, 0], up: [0, 0, -1], r: 42 },
        bounds: [-213, -2, -193, 213, 276, 193] },
      keys: [
        { pos: [0, 150, 200], look: [0, 150, 0], fov: 40, bokeh: 4, pace: .85 },
        { pos: [-10, 138, 118], look: [0, 150, 0], fov: 38, bokeh: 6 },
        { pos: [112, 168, 72], look: [0, 145, 0], fov: 38, bokeh: 6, pace: .8 },
        { pos: [128, 150, -20], look: [60, 10, -62], fov: 40, bokeh: 4 },
        { pos: [66, 72, -56], look: [59, -150, -70], up: [0, 0, -1], fov: 44, bokeh: 3 },
      ] },
  ],
});
