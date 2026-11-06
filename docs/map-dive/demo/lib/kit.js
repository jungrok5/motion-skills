// map-dive · kit.js — chunky toy miniatures for the map: landmarks, life (planes, boats, turbines, clouds) and filler.
// Every prop: K.name(S, { at: [x, z], s = 1, rot = 0 (deg), ...options }) → THREE.Group added to stage S.
// `s` is the prop's size in world units (≈ its height or footprint); y comes from S.surface(x, z) unless `y` is given.
// Moving props animate in S.onFrame(t => …) from t alone. Build your own with part(), mat(), group() — see references/KIT.md.
import * as THREE from 'three';
import { rng, hash, lerp, clamp } from './dive.js';

const _m = new Map();
export function mat(color, o = {}) {
  const k = color + JSON.stringify(o); if (_m.has(k)) return _m.get(k);
  const { phong, ...rest } = o;
  const m = phong ? new THREE.MeshPhongMaterial({ color, shininess: 40, ...rest }) : new THREE.MeshLambertMaterial({ color, ...rest });
  _m.set(k, m); return m;
}
export function part(geo, color, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, shadow = true, m } = {}) {
  const o = new THREE.Mesh(geo, m || mat(color)); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(sx, sy, sz);
  o.castShadow = shadow; o.receiveShadow = true; return o;
}
// place a group at {at, y, s, rot} on stage S
export function group(S, { at = [0, 0], y, s = 1, rot = 0 } = {}) {
  const g = new THREE.Group(), gy = y ?? (S.surface ? S.surface(at[0], at[1]) : 0);
  g.position.set(at[0], gy, at[1]); g.scale.setScalar(s); g.rotation.y = rot * Math.PI / 180; S.add(g); return g;
}
const G = {
  box: new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), cyl: new THREE.CylinderGeometry(.5, .5, 1, 18).translate(0, .5, 0),
  cone: new THREE.ConeGeometry(.5, 1, 18).translate(0, .5, 0), sph: new THREE.SphereGeometry(.5, 20, 14), ico: new THREE.IcosahedronGeometry(.5, 1),
};

// ---------------------------------------------------------------- landmarks
// mountains: a few faceted peaks with snow caps (the toy-map lavender by default)
export function mountain(S, { peaks = 3, color = '#a99ae0', shade = '#8b7fd0', snow = '#f6f3ff', seed = 1, ...o } = {}) {
  const g = group(S, o), R = rng(seed);
  for (let i = 0; i < peaks; i++) {
    const h = i === 0 ? 1 : .55 + R() * .3, r = h * (.55 + R() * .15), x = i === 0 ? 0 : (R() - .5) * 1.1, z = i === 0 ? 0 : (R() - .3) * .7;
    const cone = new THREE.ConeGeometry(r, h, 6 + (i % 2), 1).translate(0, h / 2, 0);
    g.add(part(cone, i % 2 ? shade : color, { x, z, ry: R() * 3 }));
    g.add(part(new THREE.ConeGeometry(r * .36, h * .36, 6 + (i % 2), 1).translate(0, h * .82, 0), snow, { x, z, ry: R() * 3, sx: 1.04, sz: 1.04 }));
  }
  return g;
}
// a crater cone (tuff cone, volcano): lathe profile with a bowl; lake: true puts water in the bowl
export function crater(S, { color = '#86b552', rim = '#9a8a66', inner = '#6f9c45', lake = false, water = '#4aa3d8', h = .55, ...o } = {}) {
  const g = group(S, o);
  const prof = [[.5, 0], [.46, h * .18], [.36, h * .62], [.3, h * .92], [.27, h], [.22, h * .93], [.14, h * .55], [0, h * .5]].map(([r, y]) => new THREE.Vector2(r, y));
  g.add(part(new THREE.LatheGeometry(prof.slice(0, 5), 28), color));
  g.add(part(new THREE.LatheGeometry(prof.slice(3, 6), 28), rim));
  g.add(part(new THREE.LatheGeometry(prof.slice(4), 28), inner, { m: mat(inner, { side: THREE.DoubleSide }) }));
  if (lake) g.add(part(new THREE.CircleGeometry(.12, 24).rotateX(-Math.PI / 2), water, { y: h * .56, m: mat(water, { phong: true, shininess: 80 }) }));
  return g;
}
// a waterfall: a horseshoe cliff (on the group's −z side, open toward +z) with falling white water, a pool and mist
export function waterfall(S, { w = 1, h = .45, rock = '#8c6a4f', top = '#6faa48', water = '#e9f7ff', pool = '#3ea0c8', arc = 200, ...o } = {}) {
  const g = group(S, o), th = arc * Math.PI / 180;
  g.add(part(new THREE.CylinderGeometry(w * .5, w * .52, h, 28, 1, true, -th / 2 + Math.PI, th).translate(0, h / 2, 0), rock, { m: mat(rock, { side: THREE.DoubleSide }) }));
  g.add(part(new THREE.RingGeometry(w * .5, w * .7, 28, 1, Math.PI / 2 - th / 2, th).rotateX(-Math.PI / 2).translate(0, h, 0), top));
  g.add(part(new THREE.CircleGeometry(w * .5, 28).rotateX(-Math.PI / 2).translate(0, .01, 0), pool, { m: mat(pool, { phong: true, shininess: 70 }) }));
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d');
  for (let i = 0; i < 64; i++) { x.fillStyle = `rgba(255,255,255,${.35 + .65 * hash(i, 3)})`; x.fillRect(i, 0, 1, 256); }
  for (let j = 0; j < 40; j++) { x.fillStyle = 'rgba(190,225,245,.55)'; x.fillRect(hash(j, 5) * 64, hash(j, 6) * 256, 2, 30); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 1); tex.colorSpace = THREE.SRGBColorSpace;
  const fall = new THREE.Mesh(new THREE.CylinderGeometry(w * .47, w * .49, h, 28, 1, true, -th / 2 + Math.PI, th).translate(0, h / 2, 0), new THREE.MeshLambertMaterial({ map: tex, transparent: true, opacity: .95, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: .25 }));
  g.add(fall);
  for (let i = 0; i < 7; i++) g.add(part(G.sph, water, { x: Math.sin(i * .9) * w * .3, y: .04, z: Math.cos(i * .9) * w * .18 - w * .05, sx: w * .3, sy: w * .12, sz: w * .26, shadow: false, m: mat('#ffffff', { transparent: true, opacity: .45, depthWrite: false }) }));
  S.onFrame(t => { tex.offset.y = t * .9; });
  return g;
}
// a dam: a long wall of ribs with a spillway
export function dam(S, { len = 2, h = .3, color = '#d8d4cc', rib = '#a9a49a', water = '#3f8fd1', ...o } = {}) {
  const g = group(S, o);
  g.add(part(G.box, color, { sx: len, sy: h, sz: h * .9 }));
  const n = Math.round(len / .09);
  for (let i = 0; i < n; i++) g.add(part(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), rib, { x: -len / 2 + (i + .5) * len / n, sx: len / n * .35, sy: h * 1.04, sz: h * 1.25, z: h * .14 }));
  g.add(part(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), '#8f8a80', { y: h, sx: len * 1.02, sy: h * .08, sz: h * .3 }));
  return g;
}
// a tower: 'spire' (cathedral), 'tv' (needle with a pod), 'pagoda'
export function tower(S, { kind = 'spire', color = '#efe9df', roof = '#7a8796', ...o } = {}) {
  const g = group(S, o);
  if (kind === 'spire') { g.add(part(G.box, color, { sx: .35, sy: .35, sz: .35 })); g.add(part(G.cone, roof, { y: .35, sx: .32, sy: .65, sz: .32 })); g.add(part(G.box, color, { x: .26, sx: .3, sy: .22, sz: .26 })); }
  else if (kind === 'tv') { g.add(part(G.cyl, color, { sx: .07, sz: .07, sy: 1 })); g.add(part(G.sph, roof, { y: .72, sx: .2, sy: .14, sz: .2 })); g.add(part(G.cone, color, { y: 1, sx: .03, sy: .2, sz: .03 })); }
  else for (let i = 0; i < 5; i++) { const s = 1 - i * .16; g.add(part(G.box, color, { y: i * .18, sx: .3 * s, sy: .12, sz: .3 * s })); g.add(part(new THREE.ConeGeometry(.5, 1, 4).translate(0, .5, 0), roof, { y: i * .18 + .11, ry: Math.PI / 4, sx: .55 * s, sy: .08, sz: .55 * s })); }
  return g;
}
export function lighthouse(S, { color = '#ffffff', stripe = '#d9433b', ...o } = {}) {
  const g = group(S, o);
  for (let i = 0; i < 4; i++) g.add(part(new THREE.CylinderGeometry(.13 - i * .012, .14 - i * .012, .18, 16).translate(0, .09, 0), i % 2 ? stripe : color, { y: i * .18 }));
  g.add(part(G.cyl, '#fff3b0', { y: .72, sx: .16, sy: .1, sz: .16, m: mat('#fff3b0', { emissive: '#ffe28a', emissiveIntensity: .6 }) }));
  g.add(part(G.cone, stripe, { y: .82, sx: .22, sy: .14, sz: .22 }));
  return g;
}
// a pavilion (East-Asian gate hall): stone base, red pillars, a hipped roof with lifted corners
export function pavilion(S, { roof = '#7c8794', ridge = '#e9e6df', pillar = '#a8412f', band = '#3f8f7c', base = '#cfc6b6', bays = [4, 2], ...o } = {}) {
  const g = group(S, o), [nx, nz] = bays, W = .25 * nx, D = .25 * nz + .1;
  g.add(part(G.box, base, { sx: W + .24, sy: .07, sz: D + .24 }));
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= 1; j++) g.add(part(G.cyl, pillar, { x: -W / 2 + i * W / nx, z: j ? D / 2 : -D / 2, y: .07, sx: .04, sz: .04, sy: .26 }));
  g.add(part(G.box, band, { y: .3, sx: W + .06, sy: .06, sz: D + .06 }));                       // painted beams under the eaves
  const hip = new THREE.ConeGeometry(.7071, 1, 4, 1).rotateY(Math.PI / 4).translate(0, .5, 0);
  g.add(part(hip, roof, { y: .34, sx: W + .55, sy: .32, sz: D + .45 }));                         // lower, wide eaves
  g.add(part(hip, roof, { y: .44, sx: W + .05, sy: .5, sz: D * .62 }));                          // upper roof, steeper
  g.add(part(G.box, ridge, { y: .8, sx: W * .5, sy: .05, sz: .07 }));                            // white ridge
  for (const x of [-1, 1]) g.add(part(G.box, ridge, { x: x * W * .27, y: .62, sx: .05, sy: .04, sz: D * .5, rz: 0 }));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(part(G.cone, roof, { x: x * (W / 2 + .25), z: z * (D / 2 + .2), y: .33, sx: .07, sy: .14, sz: .07, rz: -x * .9, rx: z * .9 }));
  return g;
}
// a wind turbine; blades turn with t (speed in turns per second)
export function turbine(S, { speed = .35, color = '#f7f8fa', phase = 0, ...o } = {}) {
  const g = group(S, o);
  g.add(part(new THREE.CylinderGeometry(.018, .03, 1, 10).translate(0, .5, 0), color));
  g.add(part(G.box, color, { y: .98, z: -.02, sx: .05, sy: .05, sz: .12 }));
  const hub = new THREE.Group(); hub.position.set(0, 1, .05); g.add(hub);
  for (let i = 0; i < 3; i++) { const b = part(new THREE.BoxGeometry(.03, .48, .008).translate(0, .24, 0), color); b.rotation.z = i * Math.PI * 2 / 3; hub.add(b); }
  S.onFrame(t => { hub.rotation.z = -(t * speed + phase) * Math.PI * 2; });
  return g;
}
// a stone guardian statue (generic: body, face, hat)
export function statue(S, { color = '#6f7378', dark = '#53575c', ...o } = {}) {
  const g = group(S, o);
  g.add(part(G.cyl, color, { sx: .32, sz: .3, sy: .55 }));
  g.add(part(G.sph, color, { y: .7, sx: .36, sy: .42, sz: .34 }));
  g.add(part(G.cyl, dark, { y: .86, sx: .38, sz: .38, sy: .06 })); g.add(part(G.sph, dark, { y: .92, sx: .3, sy: .2, sz: .3 }));
  for (const x of [-.07, .07]) g.add(part(G.sph, dark, { x, y: .74, z: .16, sx: .07, sy: .07, sz: .04 }));
  g.add(part(G.sph, dark, { y: .64, z: .17, sx: .08, sy: .1, sz: .06 }));
  g.add(part(G.box, dark, { y: .32, z: .15, sx: .26, sy: .06, sz: .03 }));
  return g;
}
export function stadium(S, { color = '#e8e4dc', field = '#5aa64a', ...o } = {}) {
  const g = group(S, o);
  g.add(part(new THREE.CylinderGeometry(.62, .55, .2, 32, 1, true).translate(0, .1, 0), color, { sz: .72, m: mat(color, { side: THREE.DoubleSide }) }));
  g.add(part(new THREE.CircleGeometry(.5, 32).rotateX(-Math.PI / 2).translate(0, .02, 0), field, { sz: .72 }));
  return g;
}
export function bridge(S, { len = 2, color = '#e7e3dc', cable = '#c8423a', ...o } = {}) {
  const g = group(S, o);
  g.add(part(G.box, color, { y: .12, sx: len, sy: .04, sz: .14 }));
  for (const x of [-len * .3, len * .3]) { g.add(part(G.box, cable, { x, sx: .05, sy: .45, sz: .05, z: -.05 })); g.add(part(G.box, cable, { x, sx: .05, sy: .45, sz: .05, z: .05 })); }
  return g;
}
// a glass dome (greenhouse, observatory)
export function dome(S, { glass = '#cfe8f2', frame = '#f4f4f0', ...o } = {}) {
  const g = group(S, o);
  g.add(part(new THREE.SphereGeometry(.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), glass, { m: mat(glass, { phong: true, shininess: 90, transparent: true, opacity: .85, emissive: '#2a4a55', emissiveIntensity: .2 }) }));
  g.add(part(new THREE.TorusGeometry(.5, .015, 6, 32).rotateX(Math.PI / 2), frame));
  for (let i = 0; i < 6; i++) g.add(part(new THREE.TorusGeometry(.5, .01, 4, 24, Math.PI).rotateY(i * Math.PI / 6), frame, { shadow: false }));
  return g;
}

// ---------------------------------------------------------------- filler
// a village: n little houses scattered in a radius (roof colours picked from the list)
export function houses(S, { n = 6, spread = .5, roofs = ['#d9583b', '#e08a3c', '#3f6fb5'], wall = '#f6f2ea', seed = 2, size = .14, ...o } = {}) {
  const g = group(S, o), R = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = R() * 6.28, r = Math.sqrt(R()) * spread, x = Math.cos(a) * r, z = Math.sin(a) * r, ry = R() * 3, k = size * (.8 + R() * .5);
    g.add(part(G.box, wall, { x, z, ry, sx: k * 1.3, sy: k * .8, sz: k }));
    g.add(part(new THREE.ConeGeometry(.7071, 1, 4).rotateY(Math.PI / 4).translate(0, .5, 0), roofs[Math.floor(R() * roofs.length)], { x, z, y: k * .8, ry, sx: k * 1.5, sy: k * .55, sz: k * 1.2 }));
  }
  return g;
}
// a clump of trees: 'round', 'pine', 'palm', 'orange' (round with fruit dots)
export function trees(S, { n = 5, spread = .4, kind = 'round', color, seed = 4, size = .16, ...o } = {}) {
  const g = group(S, o), R = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = R() * 6.28, r = Math.sqrt(R()) * spread, x = Math.cos(a) * r, z = Math.sin(a) * r, k = size * (.75 + R() * .5);
    if (kind === 'pine') { g.add(part(G.cyl, '#7a5a3c', { x, z, sx: k * .15, sz: k * .15, sy: k * .3 })); g.add(part(new THREE.ConeGeometry(.5, 1, 7).translate(0, .5, 0), color || '#2f7a46', { x, z, y: k * .25, sx: k * .8, sy: k * 1.5, sz: k * .8 })); }
    else if (kind === 'palm') { g.add(part(G.cyl, '#9c7a52', { x, z, sx: k * .1, sz: k * .1, sy: k * 1.4, rz: (R() - .5) * .3 })); for (let j = 0; j < 5; j++) g.add(part(G.sph, color || '#4f9e3c', { x: x + Math.cos(j * 1.26) * k * .3, z: z + Math.sin(j * 1.26) * k * .3, y: k * 1.38, sx: k * .55, sy: k * .12, sz: k * .2, ry: -j * 1.26 })); }
    else {
      g.add(part(G.cyl, '#7a5a3c', { x, z, sx: k * .14, sz: k * .14, sy: k * .45 }));
      g.add(part(G.ico, color || (kind === 'orange' ? '#3d8a3c' : ['#5aa845', '#4a9a3e', '#6db84f'][i % 3]), { x, z, y: k * .7, sx: k, sy: k * .9, sz: k }));
      if (kind === 'orange') for (let j = 0; j < 5; j++) g.add(part(G.sph, '#f39a1e', { x: x + Math.cos(j * 2.4) * k * .42, z: z + Math.sin(j * 2.4) * k * .42, y: k * (.55 + .25 * hash(i, j)), sx: k * .16, sy: k * .16, sz: k * .16, shadow: false }));
    }
  }
  return g;
}
// grazing animals: little bodies with legs ('cow' patches or 'horse' brown)
export function animals(S, { n = 4, spread = .4, kind = 'cow', seed = 6, size = .1, ...o } = {}) {
  const g = group(S, o), R = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = R() * 6.28, r = Math.sqrt(R()) * spread, x = Math.cos(a) * r, z = Math.sin(a) * r, ry = R() * 6.28, k = size;
    const body = kind === 'horse' ? ['#8a5a3a', '#5c3a26', '#b07a4c'][i % 3] : '#f4f1ea', a2 = new THREE.Group(); a2.position.set(x, 0, z); a2.rotation.y = ry; g.add(a2);
    a2.add(part(G.box, body, { y: k * .45, sx: k * 1.2, sy: k * .5, sz: k * .45 }));
    a2.add(part(G.box, kind === 'horse' ? body : '#3a3a3a', { x: k * .65, y: k * .7, sx: k * .4, sy: k * .32, sz: k * .3 }));
    for (const [lx, lz] of [[-.4, -.15], [-.4, .15], [.4, -.15], [.4, .15]]) a2.add(part(G.box, '#3b2b20', { x: lx * k, z: lz * k, sx: k * .1, sy: k * .45, sz: k * .1, shadow: false }));
    if (kind === 'cow') a2.add(part(G.box, '#3a3a3a', { x: -k * .1, y: k * .55, z: 0, sx: k * .4, sy: k * .41, sz: k * .47, shadow: false }));
  }
  return g;
}
// towers of a downtown: n boxes, tallest near the middle
export function skyline(S, { n = 9, spread = .45, height = 1, colors = ['#dfe3e8', '#c9d3de', '#eef0f2', '#b8c6d6'], seed = 8, ...o } = {}) {
  const g = group(S, o), R = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = R() * 6.28, r = Math.sqrt(R()) * spread, x = Math.cos(a) * r, z = Math.sin(a) * r, h = height * (.35 + .65 * (1 - r / spread)) * (.6 + R() * .5);
    g.add(part(G.box, colors[i % colors.length], { x, z, sx: .12 + R() * .06, sy: h, sz: .12 + R() * .06 }));
  }
  return g;
}

// ---------------------------------------------------------------- life
// a puffy pastel cloud; drift = [dx, dz] world units per second
export function cloud(S, { at = [0, 0], y = 2, s = 1, color = '#f7c9de', drift = [.05, 0], seed = 9, shadow = false } = {}) {
  const g = new THREE.Group(), R = rng(seed);
  const m = mat(color, { emissive: color, emissiveIntensity: .35 });
  for (let i = 0; i < 6; i++) { const k = .35 + R() * .35; g.add(part(G.sph, color, { x: (i - 2.5) * .22 + R() * .08, y: k * .2 + R() * .08, z: (R() - .5) * .25, sx: k, sy: k * .8, sz: k * .9, shadow, m })); }
  g.scale.setScalar(s); S.add(g);
  S.onFrame(t => g.position.set(at[0] + drift[0] * t, y, at[1] + drift[1] * t));
  return g;
}
// a small plane flying along path(t) → [x, y, z]; it faces its direction of travel
export function plane(S, { path, color = '#ffffff', accent = '#e0473c', s = .25 } = {}) {
  const g = new THREE.Group();
  g.add(part(new THREE.CapsuleGeometry(.08, .6, 4, 12).rotateX(Math.PI / 2), color));
  g.add(part(G.box, color, { sx: .9, sy: .02, sz: .14, y: -.01 }));
  g.add(part(G.box, accent, { z: -.32, y: .02, sx: .02, sy: .16, sz: .1 }));
  g.add(part(G.box, color, { z: -.33, sx: .32, sy: .02, sz: .08 }));
  g.scale.setScalar(s); S.add(g);
  S.onFrame(t => { const p = path(t), q = path(t + .05); g.position.set(...p); g.lookAt(q[0], q[1], q[2]); });
  return g;
}
// a boat sailing along path(t) → [x, z] (or anchored when no path), with a gentle bob
export function boat(S, { at = [0, 0], path, color = '#ffffff', hull = '#d9433b', s = .2, y = 0, sail = true } = {}) {
  const g = new THREE.Group();
  g.add(part(G.box, hull, { sx: .25, sy: .08, sz: .7 })); g.add(part(G.box, color, { y: .08, sx: .2, sy: .1, sz: .3, z: -.08 }));
  if (sail) g.add(part(new THREE.ConeGeometry(.2, .5, 3).translate(0, .25, 0), '#fbfaf5', { y: .16, sx: .3, sz: 1.2, z: .05 }));
  g.scale.setScalar(s); S.add(g);
  S.onFrame(t => { const p = path ? path(t) : at, q = path ? path(t + .1) : [at[0], at[1] + 1]; g.position.set(p[0], y + Math.sin(t * 2.1 + p[0]) * .01 * s, p[1]); g.rotation.y = Math.atan2(q[0] - p[0], q[1] - p[1]); });
  return g;
}
