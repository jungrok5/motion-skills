// knit-diorama · kit.js — knitted props. Every prop is built at its final place on the ground and registered with
// D.add(…), so it pops out of the yarn ball when the knit front reaches it. Props that move (smoke, beams, blades,
// boats) animate in D.onFrame(t) — pure functions of t like everything else.
//   import * as K from 'knit/kit.js';   K.tree(D, { at: [x, z], crown: PAL.moss })
import { THREE, V, col, PAL, yarn, fuzz, tube, rng, hash, noise1, clamp, lerp, smooth } from './knit.js';

const TAU = Math.PI * 2;
// uv repeat for a primitive whose uv spans (u metres × v metres), so stitches stay ~`tile` metres per tile
const rep = (u, v, tile = .3) => [Math.max(1, Math.round(u / tile)), Math.max(1, Math.round(v / tile))];
const mesh = (g, m, shadow = true) => { const x = new THREE.Mesh(g, m); x.castShadow = shadow; x.receiveShadow = true; return x; };
const groundY = (D, at) => D.groundAt(at[0], at[1]) - .02;
const place = (D, g, at, o = {}) => { g.position.set(at[0], groundY(D, at), at[1]); if (o.rot != null) g.rotation.y = o.rot; return D.add(g, { at, ...o.pop }); };

// ─── trees ───
// tree: a round (or tall) pom-pom crown on a twisted trunk. crown: colour; shape: 'round' | 'tall' | 'double'
export function tree(D, o = {}) {
  const { at = [0, 0], crown = PAL.moss, trunk = PAL.bark, size = 1, shape = 'round', seed = hash(at[0] * 100, at[1] * 100) * 1e4 | 0, stitch = 'stockinette' } = o;
  const g = new THREE.Group(); g.name = 'tree';
  const R = rng(seed), h = (.55 + .2 * R()) * size, r = (.48 + .12 * R()) * size;
  const tr = mesh(new THREE.CylinderGeometry(.07 * size, .1 * size, h + r * .4, 10), yarn({ color: trunk, stitch: 'strand', repeat: [3, 4] }));
  tr.position.y = (h + r * .4) / 2; g.add(tr);
  const blobs = shape === 'double' ? [[0, h + r * .7, 0, r * .85], [.18 * size, h + r * 1.45, .05, r * .62]] : [[0, h + r * .85, 0, r]];
  for (const [x, y, z, rr] of blobs) {
    const geo = new THREE.SphereGeometry(rr, 32, 20); if (shape === 'tall') geo.scale(.8, 1.35, .8);
    const m = mesh(geo, yarn({ color: crown, stitch, repeat: rep(TAU * rr, Math.PI * rr, .26) }));
    m.position.set(x, shape === 'tall' ? y + rr * .3 : y, z); m.rotation.y = R() * TAU; g.add(m);
    fuzz(m, { color: crown, length: .045 * size, density: 140, layers: 10 });
  }
  return place(D, g, at, o);
}
// pine: stacked ribbed cones with a little pom-pom on top
export function pine(D, o = {}) {
  const { at = [0, 0], color = PAL.pine, size = 1, tiers = 3, pom = PAL.cream } = o;
  const g = new THREE.Group(); g.name = 'pine';
  const tr = mesh(new THREE.CylinderGeometry(.06 * size, .08 * size, .4 * size, 8), yarn({ color: PAL.bark, stitch: 'strand', repeat: [2, 2] })); tr.position.y = .2 * size; g.add(tr);
  for (let i = 0; i < tiers; i++) {
    const k = i / tiers, r = (.62 - .16 * i) * size, h = (.75 - .08 * i) * size;
    const c = mesh(new THREE.ConeGeometry(r, h, 28, 1, true), yarn({ color, stitch: 'rib', repeat: rep(TAU * r, h, .22) }));
    c.position.y = (.35 + i * .42) * size + h / 2; g.add(c);
    const under = mesh(new THREE.CircleGeometry(r, 28), yarn({ color, stitch: 'garter', repeat: [2, 2] })); under.rotation.x = Math.PI / 2; under.position.y = (.35 + i * .42) * size; g.add(under);
  }
  const p = mesh(new THREE.SphereGeometry(.09 * size, 14, 10), yarn({ color: pom, stitch: 'boucle' })); p.position.y = (.35 + (tiers - 1) * .42 + .72) * size; g.add(p);
  fuzz(p, { color: pom, length: .025, density: 40 });
  return place(D, g, at, o);
}
// bush: two or three fuzzy lumps
export function bush(D, o = {}) {
  const { at = [0, 0], color = PAL.sage, size = 1, seed = 3, berries = null } = o;
  const g = new THREE.Group(); g.name = 'bush'; const R = rng(seed);
  for (let i = 0; i < 3; i++) {
    const r = (.2 + .1 * R()) * size, m = mesh(new THREE.SphereGeometry(r, 20, 14), yarn({ color, stitch: 'boucle', repeat: [2, 1] }));
    m.position.set((i - 1) * .22 * size, r * .75, (R() - .5) * .2 * size); m.scale.y = .85; g.add(m);
    fuzz(m, { color, length: .03 * size, density: 90, layers: 8 });
    if (berries) for (let b = 0; b < 4; b++) { const s = mesh(new THREE.SphereGeometry(.035 * size, 8, 6), yarn({ color: berries, stitch: 'felt' }), false); const a = R() * TAU, e = R() * 1.2; s.position.set(m.position.x + Math.cos(a) * Math.cos(e) * r, m.position.y + Math.sin(e) * r * .85, m.position.z + Math.sin(a) * Math.cos(e) * r); g.add(s); }
  }
  return place(D, g, at, o);
}
// flowers: a cluster of n stems with pom-pom heads, one instanced mesh per part, popping together
export function flowers(D, o = {}) {
  const { at = [0, 0], n = 9, spread = .5, colors = [PAL.rose, PAL.butter, PAL.lilac, PAL.white], seed = 5, height = .28 } = o;
  const g = new THREE.Group(); g.name = 'flowers'; const R = rng(seed);
  const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(.012, .014, 1, 5).translate(0, .5, 0), yarn({ color: PAL.moss, stitch: 'strand', repeat: [1, 3] }), n);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(.055, 12, 8), yarn({ color: '#ffffff', stitch: 'boucle' }), n);
  const M = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, d = Math.sqrt(R()) * spread, x = Math.cos(a) * d, z = Math.sin(a) * d, h = height * (.7 + .6 * R());
    const y = D.groundAt(at[0] + x, at[1] + z) - D.groundAt(at[0], at[1]);
    M.compose(V(x, y, z), new THREE.Quaternion(), V(1, h, 1)); stem.setMatrixAt(i, M);
    M.compose(V(x, y + h, z), new THREE.Quaternion(), V(1, .8, 1)); head.setMatrixAt(i, M); head.setColorAt(i, col(colors[i % colors.length]));
  }
  stem.castShadow = head.castShadow = true; g.add(stem, head);
  return place(D, g, at, o);
}
// rock: a squashed felt lump
export function rock(D, o = {}) {
  const { at = [0, 0], color = PAL.stone, size = .35, seed = 1 } = o;
  const geo = new THREE.IcosahedronGeometry(size, 3), p = geo.attributes.position, R = rng(seed), a = [R() * 9, R() * 9, R() * 9];
  for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const k = 1 + .12 * Math.sin(v.x * 7 + a[0]) * Math.sin(v.z * 6 + a[1]) + .08 * Math.sin(v.y * 9 + a[2]); v.multiplyScalar(k); p.setXYZ(i, v.x, Math.max(v.y * .6, -size * .1), v.z); }
  geo.computeVertexNormals();
  const g = new THREE.Group(); g.name = 'rock'; const m = mesh(geo, yarn({ color, stitch: 'seed', repeat: [3, 2] })); m.position.y = size * .1; g.add(m);
  fuzz(m, { color, length: .015, density: 120, layers: 6 });
  return place(D, g, at, o);
}

// ─── buildings ───
// cottage: knitted walls (optionally colourwork), a ribbed pitched roof, lit windows, a chimney with smoke
export function cottage(D, o = {}) {
  const { at = [0, 0], rot = 0, w = 1.3, d = 1, h = .85, wall = PAL.cream, wallPattern = null, wall2 = PAL.oat, roof = PAL.brick, door = PAL.denim, smoke = true, size = 1 } = o;
  const g = new THREE.Group(); g.name = 'cottage';
  const walls = mesh(new THREE.BoxGeometry(w, h, d), yarn({ color: wall, stitch: 'stockinette', repeat: rep(w, h, .28), pattern: wallPattern, color2: wall2 }));
  walls.position.y = h / 2; g.add(walls);
  // roof: a triangular prism, overhanging
  const rh = .55 * w, sh = new THREE.Shape(); sh.moveTo(-w / 2 - .12, 0); sh.lineTo(0, rh); sh.lineTo(w / 2 + .12, 0); sh.lineTo(w / 2 + .02, -.06); sh.lineTo(0, rh - .1); sh.lineTo(-w / 2 - .02, -.06); sh.closePath();
  const rg = new THREE.ExtrudeGeometry(sh, { depth: d + .24, bevelEnabled: false }); rg.translate(0, 0, -(d + .24) / 2);
  // remap uv: ExtrudeGeometry's uv is in shape units, fine for a tiled stitch
  const rm = mesh(rg, yarn({ color: roof, stitch: 'rib', repeat: [2.6, 2.6] })); rm.position.y = h; g.add(rm);
  const gab = new THREE.Shape(); gab.moveTo(-w / 2, 0); gab.lineTo(0, rh - .1); gab.lineTo(w / 2, 0); gab.closePath();
  for (const s of [-1, 1]) { const gm = mesh(new THREE.ShapeGeometry(gab), walls.material); gm.position.set(0, h, s * d / 2); if (s < 0) gm.rotation.y = Math.PI; g.add(gm); }
  // door and windows on the front (+z)
  const dm = mesh(new THREE.BoxGeometry(.24, .42, .05), yarn({ color: door, stitch: 'garter', repeat: [1, 1] })); dm.position.set(-w * .18, .21, d / 2 + .01); g.add(dm);
  const knob = mesh(new THREE.SphereGeometry(.022, 8, 6), yarn({ color: PAL.mustard, stitch: 'felt' }), false); knob.position.set(-w * .18 + .07, .21, d / 2 + .045); g.add(knob);
  const lit = yarn({ color: '#fff2c2', stitch: 'garter', emissive: '#f6c56a', sheen: 0 }); lit.emissiveIntensity = .55;
  const frame = yarn({ color: PAL.white, stitch: 'strand', repeat: [2, 1] });
  const win = (x, y, z, ry = 0) => { const q = new THREE.Group(); const p = mesh(new THREE.BoxGeometry(.22, .22, .04), lit, false); q.add(p);
    for (const [fw, fh, fx, fy] of [[.27, .035, 0, .125], [.27, .035, 0, -.125], [.035, .27, .125, 0], [.035, .27, -.125, 0], [.02, .22, 0, 0]]) { const f = mesh(new THREE.BoxGeometry(fw, fh, .05), frame, false); f.position.set(fx, fy, .01); q.add(f); }
    q.position.set(x, y, z); q.rotation.y = ry; g.add(q); };
  win(w * .2, .48, d / 2 + .01); win(w / 2 + .01, .5, 0, Math.PI / 2); win(-w / 2 - .01, .5, 0, -Math.PI / 2);
  // chimney
  const ch = mesh(new THREE.BoxGeometry(.18, .5, .18), yarn({ color: PAL.stone, stitch: 'seed', repeat: [1, 2] })); ch.position.set(w * .25, h + rh * .55, -d * .15); g.add(ch);
  if (smoke) puffs(D, g, V(w * .25, h + rh * .55 + .3, -d * .15), { seed: hash(at[0], at[1]) * 99 | 0 });
  g.scale.setScalar(size);
  return place(D, g, at, { rot, ...o });
}
// smoke: fuzzy puffs that rise, swell and fade on a loop (period seconds); attach to any group
export function puffs(D, parent, from, o = {}) {
  const { n = 4, period = 3.2, rise = 1.3, color = PAL.white, seed = 1 } = o;
  const mat = yarn({ color, stitch: 'boucle' }), list = [];
  for (let i = 0; i < n; i++) { const p = mesh(new THREE.SphereGeometry(.12, 14, 10), mat, false); fuzz(p, { color, length: .03, density: 40, layers: 6 }); parent.add(p); list.push(p); }
  D.onFrame(t => list.forEach((p, i) => {
    const k = ((t / period + i / n + seed * .137) % 1 + 1) % 1, s = Math.sin(Math.PI * Math.min(1, k * 1.2)) * (.6 + .9 * k);
    p.position.set(from.x + .25 * k + .06 * Math.sin(t * 1.3 + i), from.y + rise * k, from.z + .05 * Math.cos(t + i)); p.scale.setScalar(Math.max(.001, s));
  }));
  return list;
}
// lighthouse: a striped tapering tower, a gallery, a glowing lantern and a slow sweeping beam
export function lighthouse(D, o = {}) {
  const { at = [0, 0], h = 2.6, r = .42, c1 = PAL.white, c2 = PAL.coral, beam = true, period = 6 } = o;
  const g = new THREE.Group(); g.name = 'lighthouse';
  const tower = mesh(new THREE.CylinderGeometry(r * .72, r, h, 36, 1, true), yarn({ color: c1, color2: c2, stitch: 'stockinette', repeat: [Math.round(TAU * r / .22), Math.round(h / .5)], pattern: { stripe: [3, 2] } }));
  tower.position.y = h / 2; g.add(tower);
  const base = mesh(new THREE.CylinderGeometry(r * 1.15, r * 1.2, .18, 36), yarn({ color: PAL.stone, stitch: 'seed', repeat: [6, 1] })); base.position.y = .09; g.add(base);
  const gal = mesh(new THREE.CylinderGeometry(r * .98, r * .98, .08, 36), yarn({ color: PAL.charcoal, stitch: 'garter', repeat: [6, 1] })); gal.position.y = h + .04; g.add(gal);
  const rail = mesh(new THREE.TorusGeometry(r * .95, .025, 6, 40), yarn({ color: PAL.charcoal, stitch: 'strand', repeat: [20, 1] })); rail.rotation.x = Math.PI / 2; rail.position.y = h + .25; g.add(rail);
  const glow = yarn({ color: '#fff4c8', stitch: 'felt', emissive: '#ffd36e', sheen: 0 }); glow.emissiveIntensity = 1.2;
  const lamp = mesh(new THREE.CylinderGeometry(r * .5, r * .5, .38, 20), glow, false); lamp.position.y = h + .27; g.add(lamp);
  const cap = mesh(new THREE.ConeGeometry(r * .68, .42, 24), yarn({ color: c2, stitch: 'rib', repeat: [5, 1] })); cap.position.y = h + .67; g.add(cap);
  const knob = mesh(new THREE.SphereGeometry(.07, 10, 8), yarn({ color: c2, stitch: 'boucle' })); knob.position.y = h + .9; g.add(knob);
  const door = mesh(new THREE.BoxGeometry(.2, .36, .05), yarn({ color: PAL.denim, stitch: 'garter' })); door.position.set(0, .3, r * .97); g.add(door);
  if (beam) {
    // a soft cone of light that fades along its length (additive, no depth write)
    const L = 3.4, bg = new THREE.ConeGeometry(.5, L, 24, 1, true); bg.translate(0, -L / 2, 0); bg.rotateZ(Math.PI / 2);
    const bm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { uOp: { value: 0 }, uLen: { value: L }, uCol: { value: col('#ffe9b0') } },
      vertexShader: 'varying float vD; void main(){ vD = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'uniform float uOp, uLen; uniform vec3 uCol; varying float vD; void main(){ float k = clamp(vD / uLen, 0., 1.); gl_FragColor = vec4(uCol * uOp * pow(1. - k, 1.6), 1.); }' });
    const b = new THREE.Mesh(bg, bm); b.position.y = h + .27; b.name = 'beam'; g.add(b);
    D.onFrame(t => { b.rotation.y = -t / period * TAU; b.material.uniforms.uOp.value = .22 * smooth(0, 1, t - D.knit[1]) * (D.unravel ? 1 - smooth(D.unravel[0] - .5, D.unravel[0], t) : 1); });
  }
  return place(D, g, at, o);
}
// windmill: a tapering knitted tower, a cap, four lattice sails turning
export function windmill(D, o = {}) {
  const { at = [0, 0], rot = 0, h = 1.7, color = PAL.cream, sail = PAL.white, cap = PAL.berry, speed = 1.2 } = o;
  const g = new THREE.Group(); g.name = 'windmill';
  const tw = mesh(new THREE.CylinderGeometry(.32, .52, h, 8), yarn({ color, stitch: 'garter', repeat: [6, 4] })); tw.position.y = h / 2; g.add(tw);
  const c = mesh(new THREE.ConeGeometry(.42, .45, 8), yarn({ color: cap, stitch: 'rib', repeat: [5, 1] })); c.position.y = h + .2; g.add(c);
  const door = mesh(new THREE.BoxGeometry(.2, .32, .05), yarn({ color: PAL.bark, stitch: 'garter' })); door.position.set(0, .16, .47); door.rotation.x = -.1; g.add(door);
  const hub = new THREE.Group(); hub.position.set(0, h - .05, .42); g.add(hub);
  const sm = yarn({ color: sail, color2: PAL.oat, stitch: 'garter', repeat: [2, 4], pattern: { check: 2 } });
  const arm = yarn({ color: PAL.bark, stitch: 'strand', repeat: [1, 4] });
  for (let i = 0; i < 4; i++) {
    const a = new THREE.Group(); a.rotation.z = i * Math.PI / 2;
    const spar = mesh(new THREE.BoxGeometry(.05, 1.15, .05), arm); spar.position.y = .6; a.add(spar);
    const s = mesh(new THREE.BoxGeometry(.28, .85, .025), sm); s.position.set(.17, .72, 0); a.add(s); hub.add(a);
  }
  const nut = mesh(new THREE.SphereGeometry(.08, 10, 8), yarn({ color: cap, stitch: 'boucle' })); hub.add(nut);
  D.onFrame(t => { hub.rotation.z = -t * speed; });
  return place(D, g, at, { rot, ...o });
}

// ─── water things ───
// boat: a little knitted hull with a striped sail, bobbing and rocking on the sea
export function boat(D, o = {}) {
  const { at = [0, 0], rot = 0, hull = PAL.coral, sail = PAL.white, sail2 = PAL.sea, size = 1, seed = 1, drift = .25 } = o;
  const g = new THREE.Group(); g.name = 'boat';
  const body = new THREE.Group(); g.add(body);
  const hg = new THREE.SphereGeometry(.5, 24, 12, 0, TAU, Math.PI / 2, Math.PI / 2); hg.scale(1.15, .5, .5);
  const hm = mesh(hg, yarn({ color: hull, stitch: 'garter', repeat: [6, 2] })); hm.position.y = .2; body.add(hm);
  const deck = mesh(new THREE.CircleGeometry(.5, 24), yarn({ color: PAL.oat, stitch: 'rib', repeat: [3, 3] })); deck.scale.set(1.15, .5, 1); deck.rotation.x = -Math.PI / 2; deck.position.y = .2; body.add(deck);
  const mast = mesh(new THREE.CylinderGeometry(.025, .03, 1.1, 8), yarn({ color: PAL.bark, stitch: 'strand', repeat: [1, 3] })); mast.position.set(-.05, .75, 0); body.add(mast);
  const ss = new THREE.Shape(); ss.moveTo(0, 0); ss.lineTo(0, .85); ss.quadraticCurveTo(.3, .4, .48, 0); ss.closePath();
  const sg = new THREE.ShapeGeometry(ss); const uv = sg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 2);
  const sm = mesh(sg, yarn({ color: sail, color2: sail2, stitch: 'stockinette', repeat: [1, 1], pattern: { stripe: [2, 3] } })); sm.material.side = THREE.DoubleSide;
  sm.position.set(-.01, .32, 0); body.add(sm);
  const flag = mesh(new THREE.PlaneGeometry(.16, .09), yarn({ color: PAL.mustard, stitch: 'garter' })); flag.material.side = THREE.DoubleSide; flag.position.set(.05, 1.25, 0); body.add(flag);
  g.scale.setScalar(size);
  D.onFrame(t => {
    const p = t * .9 + seed * 3.1;
    body.position.set(drift * noise1(t * .12, seed), .03 * Math.sin(p * 1.7) - .05, drift * .5 * noise1(t * .1, seed + 9));
    body.rotation.set(.08 * Math.sin(p * 1.3), .15 * noise1(t * .2, seed + 3), .1 * Math.sin(p));
    flag.rotation.y = .3 * Math.sin(t * 5 + seed);
  });
  return place(D, g, at, { rot, ...o });
}
// wave: a little white crest stitched onto the water, bobbing
export function wave(D, o = {}) {
  const { at = [0, 0], rot = 0, len = .7, color = PAL.white, seed = 1 } = o;
  const g = new THREE.Group(); g.name = 'wave';
  const pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(V((u - .5) * len, .04 + .05 * Math.sin(Math.PI * u), .06 * Math.sin(TAU * u))); }
  const m = mesh(tube(pts, .03, { seg: 32 }), yarn({ color, stitch: 'strand', repeat: [8, 1] }), false); g.add(m);
  D.onFrame(t => { const k = Math.sin(t * 1.6 + seed * 2.3); m.position.set(.08 * k, .02 * k, 0); m.scale.set(1 + .08 * k, 1, 1); });
  return place(D, g, at, { rot, ...o });
}
// pier: planks on posts, from `at` out toward `to`
export function pier(D, o = {}) {
  const { at = [0, 0], to = [1, 0], wide = .5, color = PAL.oat, y = .12 } = o;
  const g = new THREE.Group(); g.name = 'pier';
  const dx = to[0] - at[0], dz = to[1] - at[1], L = Math.hypot(dx, dz), n = Math.round(L / .16);
  const plank = yarn({ color, stitch: 'garter', repeat: [2, 1] }), post = yarn({ color: PAL.bark, stitch: 'strand', repeat: [1, 2] });
  for (let i = 0; i < n; i++) { const p = mesh(new THREE.BoxGeometry(.13, .05, wide), plank); p.position.set(i * L / n + .07, y + .02 * hash(i, 4), 0); p.rotation.y = .04 * (hash(i, 5) - .5); g.add(p); }
  for (let i = 0; i <= n; i += 3) for (const s of [-1, 1]) { const p = mesh(new THREE.CylinderGeometry(.04, .04, .45, 8), post); p.position.set(i * L / n, y - .15, s * wide * .45); g.add(p); }
  g.rotation.y = -Math.atan2(dz, dx);
  g.position.set(at[0], groundY(D, at), at[1]);
  return D.add(g, { at, ...o.pop });
}

// ─── sky ───
// cloud: a cluster of bouclé puffs that drops in from the sky (kind 'drop') and drifts
export function cloud(D, o = {}) {
  const { at = [0, 0], y = 4.2, size = 1, color = PAL.white, seed = 1, rho = null, drift = .4 } = o;
  const g = new THREE.Group(); g.name = 'cloud'; const R = rng(seed);
  const inner = new THREE.Group(); g.add(inner);
  const mat = yarn({ color, stitch: 'boucle', repeat: [2, 1] });
  for (let i = 0; i < 5; i++) {
    const r = (.32 + .18 * R()) * size * (i === 2 ? 1.3 : 1), m = mesh(new THREE.SphereGeometry(r, 22, 14), mat);
    m.position.set((i - 2) * .38 * size, r * .4 + (i === 2 ? .15 : 0) * size, (R() - .5) * .3 * size); inner.add(m);
    fuzz(m, { color, length: .05 * size, density: 70, layers: 8 });
  }
  g.position.set(at[0], y, at[1]);
  D.onFrame(t => { inner.position.set(drift * noise1(t * .08, seed), .08 * Math.sin(t * .7 + seed), 0); });
  return D.add(g, { at, kind: 'drop', rho: rho ?? Math.hypot(at[0], at[1]), height: 10, ...o.pop });
}
// fence: posts and two rails along a polyline [[x,z],…]
export function fence(D, o = {}) {
  const { path = [[0, 0], [1, 0]], color = PAL.white, every = .45 } = o;
  const g = new THREE.Group(); g.name = 'fence';
  const pm = yarn({ color, stitch: 'garter', repeat: [1, 1] }), rm = yarn({ color, stitch: 'strand', repeat: [8, 1] });
  const pts = [];
  for (let i = 1; i < path.length; i++) { const [ax, az] = path[i - 1], [bx, bz] = path[i], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / every)); for (let k = i === 1 ? 0 : 1; k <= n; k++) pts.push([lerp(ax, bx, k / n), lerp(az, bz, k / n)]); }
  const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]), y0 = groundY(D, c);
  for (const [x, z] of pts) { const p = mesh(new THREE.BoxGeometry(.07, .36, .07), pm); p.position.set(x - c[0], D.groundAt(x, z) - y0 + .16, z - c[1]); g.add(p); }
  for (const hh of [.12, .26]) g.add(mesh(tube(pts.map(([x, z]) => V(x - c[0], D.groundAt(x, z) - y0 + hh, z - c[1])), .022, { seg: pts.length * 4 }), rm));
  g.position.set(c[0], y0, c[1]);
  return D.add(g, { at: c, ...o.pop });
}

// ─── layout helper ───
// scatter(n, { seed, half, ok:(x,z)=>bool, gap }) → [[x,z]…] positions that pass ok() and keep `gap` apart
export function scatter(n, o = {}) {
  const { seed = 1, half = 7, ok = () => true, gap = .8, tries = 4000 } = o, R = rng(seed), out = [];
  for (let k = 0; k < tries && out.length < n; k++) {
    const x = (R() * 2 - 1) * half, z = (R() * 2 - 1) * half;
    if (!ok(x, z)) continue;
    if (out.some(([a, b]) => Math.hypot(a - x, b - z) < gap)) continue;
    out.push([x, z]);
  }
  return out;
}
