/* nested-world-loop · make.js — modelling, surfaces and light from numbers. No model files, no image files, no
   downloaded textures: every map is drawn on a canvas from seeded noise, every shape is a lathe, an extrusion, a
   rounded box or a tube. These are tools, not a look — each world designs its own objects with them (references/LOOK.md).

   Textures:  canvasTex · wood · brushed · noiseMap · brick · cobbles · plaster · paper · dial · label · windowLights
   Materials: mat.metal · mat.wood · mat.ceramic · mat.glass · mat.leather · mat.paint · mat.emissive · mat.water
   Geometry:  gear · lathe · rbox · tube · ring · prism · instanced · scatter
   Light:     envMap (a procedural room for reflections) · lamp (point light + bulb + shade glow) · spot · beam (a visible cone)
   Weather:   rain (instanced streaks, loop-periodic) · dust (floating motes) */
import * as THREE from 'three';
import { rng, hash } from './nwl.js';
export { rng, hash };

// ---------- noise ----------
const perm = new Uint8Array(512); { const r = rng(1337), p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
export function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
  const g = (h, x, y) => { const a = h * Math.PI * 2 / 256; return Math.cos(a) * x + Math.sin(a) * y; };
  const u = fade(xf), v = fade(yf), L = (a, b, t) => a + (b - a) * t;
  return L(L(g(perm[X + perm[Y]], xf, yf), g(perm[X + 1 + perm[Y]], xf - 1, yf), u), L(g(perm[X + perm[Y + 1]], xf, yf - 1), g(perm[X + 1 + perm[Y + 1]], xf - 1, yf - 1), u), v) * 1.41;
}
export const fbm = (x, y, oct = 4) => { let s = 0, a = .5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise2(x * f + i * 17.3, y * f - i * 9.1); f *= 2; a *= .5; } return s; };
const hex = c => new THREE.Color(c);
const rgbStr = (c, a = 1) => { const k = hex(c); return `rgba(${Math.round(k.r * 255)},${Math.round(k.g * 255)},${Math.round(k.b * 255)},${a})`; };

// ---------- textures (canvas, drawn in code) ----------
// canvasTex(w, h, draw(ctx, w, h, img?), { color: true|false, repeat:[u,v], pixels: fn(x,y)->[r,g,b] })
export function canvasTex(w, h, draw, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: !!o.pixels });
  if (o.pixels) { const img = x.createImageData(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const p = o.pixels(i / w, j / h, i, j); const k = (j * w + i) * 4; img.data[k] = p[0]; img.data[k + 1] = p[1]; img.data[k + 2] = p[2]; img.data[k + 3] = p[3] ?? 255; } x.putImageData(img, 0, 0); }
  if (draw) draw(x, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = o.color === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; if (o.repeat) t.repeat.set(...o.repeat);
  t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const to255 = c => { const k = hex(c); return [k.r * 255, k.g * 255, k.b * 255]; };

// wood({ base, dark, planks, seed, size, ring }) → { map, rough } (planks run along u)
export function wood(o = {}) {
  const S = o.size || 512, base = to255(o.base || '#9a6a3c'), dark = to255(o.dark || '#4e301a'), planks = o.planks || 4, seed = o.seed || 1, ring = o.ring ?? 9;
  const val = (u, v) => {
    const pi = Math.floor(v * planks), r0 = hash(pi, seed), vv = v * planks - pi;
    const off = r0 * 40, warp = fbm(u * 3 + off, vv * .7 + pi, 3) * 1.2;
    const g = Math.sin((vv * ring + warp * 4 + u * .6) * Math.PI) * .5 + .5;
    const fine = fbm(u * 60 + off, vv * 4, 2) * .5 + .5;
    let k = .35 + .35 * Math.pow(g, 3) + .25 * fine + (r0 - .5) * .25;
    if (vv < .015 || vv > .985) k = 1.25;  // seam between planks
    if (hash(Math.floor(u * 3 + r0 * 3), pi, seed + 7) > .86) { const d = Math.hypot((u * 3 % 1) - .5, vv - .5); if (d < .08) k += (1 - d / .08) * .5; }  // a knot
    return Math.min(1.3, k);
  };
  const map = canvasTex(S, S, null, { pixels: (u, v) => mixc(base, dark, Math.min(1, val(u, v))) });
  const rough = canvasTex(S >> 1, S >> 1, null, { color: false, pixels: (u, v) => { const k = 150 + 70 * val(u, v); return [k, k, k]; } });
  return { map, rough };
}
// brushed({ radial, base, streak, seed }) → { map, rough } brushed / turned metal
export function brushed(o = {}) {
  const S = o.size || 512, radial = !!o.radial, seed = o.seed || 3, b = o.base ?? 200, st = o.streak ?? 26;
  const val = (u, v) => {
    if (radial) { const dx = u - .5, dy = v - .5, r = Math.hypot(dx, dy); return fbm(r * 220 + seed, seed, 2) * .6 + fbm(r * 40, Math.atan2(dy, dx) * 2, 2) * .4; }
    return fbm(u * 1.5 + seed, v * 260, 2) * .7 + fbm(u * 8, v * 40, 2) * .3;
  };
  const map = canvasTex(S, S, null, { pixels: (u, v) => { const k = b + st * val(u, v); return [k, k, k]; } });
  const rough = canvasTex(S, S, null, { color: false, pixels: (u, v) => { const k = 90 + 90 * Math.abs(val(u, v)); return [k, k, k]; } });
  return { map, rough };
}
// noiseMap({ scale, lo, hi, seed, color }) — a generic grey / tinted fbm map (roughness, bump, grime)
export function noiseMap(o = {}) {
  const S = o.size || 256, sc = o.scale || 6, lo = o.lo ?? 90, hi = o.hi ?? 200, seed = o.seed || 5;
  return canvasTex(S, S, null, { color: !!o.color, pixels: (u, v) => { const k = lo + (hi - lo) * (fbm(u * sc + seed, v * sc - seed, 4) * .5 + .5); return o.color ? mixc(to255(o.color[0]), to255(o.color[1]), (k - lo) / (hi - lo)) : [k, k, k]; } });
}
// brick({ base, mortar, rows, cols, seed, soot }) → { map, rough, bump }
export function brick(o = {}) {
  const S = o.size || 512, rows = o.rows || 16, cols = o.cols || 8, seed = o.seed || 2, base = to255(o.base || '#8a4a36'), mortar = to255(o.mortar || '#b9ad98');
  const cell = (u, v) => { const r = Math.floor(v * rows), shift = (r % 2) * .5, c = Math.floor(u * cols + shift), fu = (u * cols + shift) % 1, fv = (v * rows) % 1; const m = fu < .06 || fv < .1; return { r, c, m, fu, fv }; };
  const map = canvasTex(S, S, null, { pixels: (u, v) => { const { r, c, m } = cell(u, v); if (m) return mixc(mortar, [60, 55, 50], fbm(u * 80, v * 80, 2) * .3 + .2); const h = hash(r, c, seed); let col = mixc(base, to255(h > .7 ? '#5a2f24' : h > .4 ? '#9b5a40' : '#7a3e2c'), .55 * h); col = mixc(col, [30, 25, 22], Math.max(0, fbm(u * 30 + h * 9, v * 30, 3)) * .5 + (o.soot || 0) * (1 - v)); return col; } });
  const bump = canvasTex(S >> 1, S >> 1, null, { color: false, pixels: (u, v) => { const { m } = cell(u, v); const k = m ? 40 : 200 + 40 * fbm(u * 60, v * 60, 2); return [k, k, k]; } });
  return { map, bump, rough: noiseMap({ lo: 190, hi: 250, scale: 20, seed }) };
}
// cobbles({ base, seed, n }) → { map, bump }
export function cobbles(o = {}) {
  const S = o.size || 512, n = o.n || 18, seed = o.seed || 4, base = to255(o.base || '#55565a');
  const site = (i, j) => [i + .2 + .6 * hash(i, j, seed), j + .2 + .6 * hash(i, j, seed + 1)];
  const near = (u, v) => { const x = u * n, y = v * n, xi = Math.floor(x), yi = Math.floor(y); let d1 = 9, d2 = 9, id = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const [sx, sy] = site(xi + a, yi + b); const d = Math.hypot(x - sx, y - sy); if (d < d1) { d2 = d1; d1 = d; id = hash(xi + a, yi + b, seed + 2); } else if (d < d2) d2 = d; } return { e: d2 - d1, id }; };
  const map = canvasTex(S, S, null, { pixels: (u, v) => { const { e, id } = near(u, v); const k = e < .08 ? .25 : .6 + .4 * id; return mixc([20, 20, 22], base, k * (.85 + .3 * fbm(u * 40, v * 40, 2))); } });
  const bump = canvasTex(S >> 1, S >> 1, null, { color: false, pixels: (u, v) => { const { e } = near(u, v); const k = Math.min(255, e * 900); return [k, k, k]; } });
  return { map, bump };
}
// plaster / paper: soft mottled surfaces
export const plaster = (o = {}) => noiseMap({ color: [o.dark || '#6b5d4f', o.base || '#a89580'], scale: o.scale || 5, lo: 0, hi: 1, seed: o.seed || 8, size: 256 });
export function paper(o = {}) {
  const S = o.size || 512, base = to255(o.base || '#efe6d2'), ink = o.ink || '#2a2420', lines = o.lines ?? 0, seed = o.seed || 9;
  return canvasTex(S, S, (x, w, h) => {
    if (lines) { x.strokeStyle = rgbStr('#7a8aa8', .35); x.lineWidth = 1; for (let i = 1; i < lines; i++) { x.beginPath(); x.moveTo(w * .08, h * i / lines); x.lineTo(w * .95, h * i / lines); x.stroke(); } }
    if (o.scribble) { const r = rng(seed); x.strokeStyle = rgbStr(ink, .75); x.lineWidth = 1.4; for (let l = 1; l < (lines || 14) - 1; l++) { if (r() < .2) continue; x.beginPath(); let px = w * .1; const py = h * l / (lines || 14) - 3; x.moveTo(px, py); const end = w * (.5 + .4 * r()); while (px < end) { px += 3 + r() * 5; x.lineTo(px, py + (r() - .5) * 5); } x.stroke(); } }
  }, { pixels: (u, v) => mixc(base, [150, 130, 100], Math.max(0, fbm(u * 6 + seed, v * 6, 4)) * .35 + Math.pow(Math.hypot(u - .5, v - .5) * 1.2, 3) * .4) });
}
// dial({ face, ink, numerals: 'roman'|'arabic'|'none', ticks, text, size }) → map of a clock / gauge face
export function dial(o = {}) {
  const S = o.size || 512;
  return canvasTex(S, S, (x, w) => {
    const c = w / 2; x.fillStyle = o.face || '#efe8d8'; x.beginPath(); x.arc(c, c, c, 0, Math.PI * 2); x.fill();
    const g = x.createRadialGradient(c, c, c * .2, c, c, c); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(120,100,70,.25)'); x.fillStyle = g; x.fill();
    x.strokeStyle = x.fillStyle = o.ink || '#1d1a17';
    const ticks = o.ticks ?? 60;
    for (let i = 0; i < ticks; i++) { const a = i / ticks * Math.PI * 2, big = i % (ticks / 12) === 0; x.lineWidth = big ? w * .012 : w * .004; x.beginPath(); x.moveTo(c + Math.sin(a) * c * .9, c - Math.cos(a) * c * .9); x.lineTo(c + Math.sin(a) * c * (big ? .8 : .86), c - Math.cos(a) * c * (big ? .8 : .86)); x.stroke(); }
    const R = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    if ((o.numerals || 'roman') !== 'none') { x.font = `${w * (o.numerals === 'arabic' ? .1 : .075)}px Georgia, 'Times New Roman', serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.fillText(o.numerals === 'arabic' ? String(i || 12) : R[i], c + Math.sin(a) * c * .66, c - Math.cos(a) * c * .66); } }
    if (o.text) { x.font = `${w * .045}px Georgia, serif`; x.textAlign = 'center'; x.fillText(o.text, c, c * 1.35); }
  });
}
// label(text, { w, h, bg, fg, font, border }) → sign / book spine / plate
export function label(text, o = {}) {
  const w = o.w || 512, h = o.h || 128;
  return canvasTex(w, h, (x) => {
    x.fillStyle = o.bg || '#1f3a2e'; x.fillRect(0, 0, w, h);
    if (o.border) { x.strokeStyle = o.border; x.lineWidth = h * .05; x.strokeRect(h * .08, h * .08, w - h * .16, h - h * .16); }
    x.fillStyle = o.fg || '#d9c38a'; x.font = o.font || `${h * .5}px Georgia, 'Times New Roman', serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (o.spacing) x.letterSpacing = o.spacing;
    x.fillText(text, w / 2, h * .54);
  });
}
// windowLights({ cols, rows, lit, warm, seed }) → emissive map of a facade's windows (lit share, warm colour)
export function windowLights(o = {}) {
  const S = o.size || 256, cols = o.cols || 4, rows = o.rows || 3, lit = o.lit ?? .5, seed = o.seed || 6;
  return canvasTex(S, S, (x, w, h) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { if (hash(i, j, seed) > lit) continue; const k = .6 + .4 * hash(j, i, seed + 1); x.fillStyle = rgbStr(o.warm || '#ffb45e', k); x.fillRect((i + .25) * w / cols, (j + .2) * h / rows, w / cols * .5, h / rows * .6); }
  });
}

// ---------- materials ----------
export const mat = {
  metal: (color = '#c8c2b8', o = {}) => new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: o.rough ?? .32, map: o.map, roughnessMap: o.roughMap, envMapIntensity: o.env ?? 1, side: o.side }),
  wood: (w, o = {}) => new THREE.MeshStandardMaterial({ map: w.map, roughnessMap: w.rough, roughness: o.rough ?? .7, metalness: 0, color: o.color || '#ffffff', envMapIntensity: o.env ?? .6 }),
  ceramic: (color = '#f1ece2', o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: o.rough ?? .25, clearcoat: 1, clearcoatRoughness: .08, metalness: 0, map: o.map, envMapIntensity: o.env ?? .9 }),
  glass: (o = {}) => new THREE.MeshPhysicalMaterial({ color: o.tint || '#dfe9e6', roughness: o.rough ?? .04, metalness: 0, transparent: true, opacity: o.opacity ?? .18, side: o.side ?? THREE.DoubleSide, depthWrite: false, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: o.env ?? 1.6, specularIntensity: 1 }),
  leather: (color = '#6b3b22', o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: o.rough ?? .62, sheen: .4, sheenRoughness: .6, sheenColor: new THREE.Color(color).offsetHSL(0, -.1, .2), map: o.map, roughnessMap: o.roughMap }),
  paint: (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? .55, metalness: 0, map: o.map, bumpMap: o.bump, bumpScale: o.bumpScale ?? 1, roughnessMap: o.roughMap, envMapIntensity: o.env ?? .5, side: o.side }),
  emissive: (color, strength = 4, o = {}) => new THREE.MeshStandardMaterial({ color: '#000', emissive: color, emissiveIntensity: strength, emissiveMap: o.map, roughness: 1, toneMapped: false, transparent: !!o.transparent, opacity: o.opacity ?? 1, depthWrite: o.transparent ? false : true, side: o.side }),
  water: (color = '#0d2a33', o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: o.rough ?? .08, metalness: 0, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: o.env ?? 1.4, transparent: o.opacity !== undefined, opacity: o.opacity ?? 1 }),
};

// ---------- geometry ----------
// gear({ teeth, r, toothH, depth, hole, spokes, spokeW, rim }) → ExtrudeGeometry, flat in XY, thickness along +Z (centred)
export function gear(o = {}) {
  const n = o.teeth || 24, r = o.r || 1, th = o.toothH ?? r * .09, depth = o.depth ?? r * .12, hole = o.hole ?? r * .12;
  const s = new THREE.Shape(), steps = n * 4;
  for (let i = 0; i <= steps; i++) {
    const a = i / steps * Math.PI * 2, ph = i % 4, rr = ph === 0 || ph === 3 ? r - th * .5 : r + th * .5;
    const a2 = a + (ph === 1 ? -.08 : ph === 2 ? .08 : 0) * Math.PI * 2 / n;
    const x = Math.cos(a2) * rr, y = Math.sin(a2) * rr; i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  if (o.spokes) {
    const rim = o.rim ?? r * .78, hub = o.hub ?? r * .22, k = o.spokes, sw = (o.spokeW ?? .5) * Math.PI / k;
    for (let i = 0; i < k; i++) {
      const a0 = i / k * Math.PI * 2 + sw, a1 = (i + 1) / k * Math.PI * 2 - sw, p = new THREE.Path();
      const seg = 10; p.moveTo(Math.cos(a0) * hub * 1.25, Math.sin(a0) * hub * 1.25);
      for (let j = 0; j <= seg; j++) { const a = a0 + (a1 - a0) * j / seg; p.lineTo(Math.cos(a) * rim, Math.sin(a) * rim); }
      for (let j = seg; j >= 0; j--) { const a = a0 + (a1 - a0) * j / seg; p.lineTo(Math.cos(a) * hub * 1.25, Math.sin(a) * hub * 1.25); }
      s.holes.push(p);
    }
  }
  if (hole > 0) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h); }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * .12, bevelSize: Math.min(th * .15, depth * .1), bevelSegments: 1, curveSegments: 8 });
  g.translate(0, 0, -depth / 2); g.computeVertexNormals(); return g;
}
// lathe([[r, y], …], segments) — profile revolved about Y
export const lathe = (pts, seg = 48) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), seg);
// rbox(w, h, d, r, seg) — rounded box (bevelled extrusion), centred
export function rbox(w, h, d, r = Math.min(w, h, d) * .1, seg = 3) {
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const s = new THREE.Shape(), x = -w / 2 + r, y = -h / 2 + r, ww = w - 2 * r, hh = h - 2 * r;
  s.moveTo(x, y - r); s.lineTo(x + ww, y - r); s.absarc(x + ww, y, r, -Math.PI / 2, 0); s.lineTo(x + ww + r, y + hh); s.absarc(x + ww, y + hh, r, 0, Math.PI / 2); s.lineTo(x, y + hh + r); s.absarc(x, y + hh, r, Math.PI / 2, Math.PI); s.lineTo(x - r, y); s.absarc(x, y, r, Math.PI, Math.PI * 1.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r * .999, bevelSegments: seg, curveSegments: seg * 2 });
  g.translate(0, 0, -(d - 2 * r) / 2); g.computeVertexNormals();
  // planar uvs on the big faces
  const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5);
  return g;
}
// tube([[x,y,z], …], radius, { closed, seg, radial })
export const tube = (pts, radius, o = {}) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), !!o.closed, 'centripetal'), o.seg || pts.length * 12, radius, o.radial || 10, !!o.closed);
// ring(rIn, rOut, depth) — flat washer / bezel (extruded annulus), thickness along Z
export function ring(rIn, rOut, depth, seg = 64) { const s = new THREE.Shape(); s.absarc(0, 0, rOut, 0, Math.PI * 2, false); const h = new THREE.Path(); h.absarc(0, 0, rIn, 0, Math.PI * 2, true); s.holes.push(h); const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * .15, bevelSize: Math.min(depth * .15, (rOut - rIn) * .2), bevelSegments: 2, curveSegments: seg }); g.translate(0, 0, -depth / 2); g.computeVertexNormals(); return g; }
// prism([[x,y], …], depth, bevel) — any outline extruded along Z (roof profiles, brackets, plates)
export function prism(pts, depth, bevel = 0) { const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))); const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1 }); g.translate(0, 0, -depth / 2); g.computeVertexNormals(); return g; }
// instanced(geometry, material, count, place(i, o: Object3D, r) ) — many copies, one draw
export function instanced(geo, material, count, place, seed = 1) {
  const m = new THREE.InstancedMesh(geo, material, count), o = new THREE.Object3D(), r = rng(seed);
  for (let i = 0; i < count; i++) { o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); const c = place(i, o, r); o.updateMatrix(); m.setMatrixAt(i, o.matrix); if (c) m.setColorAt(i, new THREE.Color(c)); }
  m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.castShadow = m.receiveShadow = true; return m;
}
// scatter(n, area [x0, z0, x1, z1], minDist, seed) → [[x, z], …] (dart throwing)
export function scatter(n, [x0, z0, x1, z1], minD = 0, seed = 1) { const r = rng(seed), out = []; for (let t = 0; t < n * 30 && out.length < n; t++) { const p = [x0 + (x1 - x0) * r(), z0 + (z1 - z0) * r()]; if (out.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) >= minD)) out.push(p); } return out; }

// ---------- light ----------
// envMap(renderer, { base, panels:[{ color, intensity, pos:[x,y,z], size:[w,h] }], floor }) → a PMREM environment:
// a small dark room with glowing panels, so metal and glass have something true to reflect. One per world.
export function envMap(renderer, o = {}) {
  const sc = new THREE.Scene(), pm = new THREE.PMREMGenerator(renderer);
  const room = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: o.base || '#151210', side: THREE.BackSide })); sc.add(room);
  if (o.floor) { const f = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: o.floor })); f.rotation.x = -Math.PI / 2; f.position.y = -4.9; sc.add(f); }
  for (const p of (o.panels || [{ color: '#ffd9a8', intensity: 6, pos: [0, 4.5, 0], size: [4, 4] }])) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(...(p.size || [2, 2])), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color).multiplyScalar(p.intensity ?? 4), side: THREE.DoubleSide }));
    m.position.set(...p.pos); m.lookAt(0, 0, 0); sc.add(m);
  }
  const t = pm.fromScene(sc, .02).texture; pm.dispose(); return t;
}
// lamp(root, { pos, color, intensity, distance, shadow, bulb }) → PointLight with a visible glowing bulb
export function lamp(root, o = {}) {
  const L = new THREE.PointLight(o.color || '#ffcf93', o.intensity ?? 40, o.distance ?? 0, 2); L.position.set(...(o.pos || [0, 2, 0]));
  if (o.shadow) { L.castShadow = true; L.shadow.mapSize.set(o.shadow, o.shadow); L.shadow.camera.near = o.near ?? .05; L.shadow.camera.far = o.far ?? 50; L.shadow.bias = o.bias ?? -.002; L.shadow.normalBias = o.normalBias ?? .02; L.shadow.radius = 4; }
  root.add(L);
  if (o.bulb !== false) { const b = new THREE.Mesh(new THREE.SphereGeometry(o.bulb || .03, 16, 12), mat.emissive(o.color || '#ffcf93', o.glow ?? 12)); b.position.copy(L.position); root.add(b); L.userData.bulb = b; }
  return L;
}
// spot(root, { pos, target, color, intensity, angle, penumbra, shadow }) → SpotLight with its target inside the world
export function spot(root, o = {}) {
  const L = new THREE.SpotLight(o.color || '#ffe2b8', o.intensity ?? 80, o.distance ?? 0, o.angle ?? .6, o.penumbra ?? .6, 2); L.position.set(...(o.pos || [0, 3, 0]));
  L.target.position.set(...(o.target || [0, 0, 0])); root.add(L, L.target);
  if (o.shadow) { L.castShadow = true; L.shadow.mapSize.set(o.shadow, o.shadow); L.shadow.camera.near = o.near ?? .05; L.shadow.camera.far = o.far ?? 50; L.shadow.bias = o.bias ?? -.0015; L.shadow.normalBias = o.normalBias ?? .01; L.shadow.radius = 5; }
  return L;
}
// beam({ length, r0, r1, color, strength }) → an additive cone (a beam of light seen in haze), apex at origin along +Z
export function beam(o = {}) {
  const len = o.length || 10, g = new THREE.CylinderGeometry(o.r1 ?? len * .2, o.r0 ?? .02, len, 32, 1, true); g.translate(0, -len / 2, 0); g.rotateX(-Math.PI / 2);
  const m = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(o.color || '#ffe9c0').multiplyScalar(o.strength ?? 1.2) }, uLen: { value: len } },
    vertexShader: `varying float vZ; varying vec3 vN; varying vec3 vV; void main(){ vZ = -position.z; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uLen; varying float vZ; varying vec3 vN; varying vec3 vV; void main(){ float a = pow(1. - clamp(vZ / uLen, 0., 1.), 1.6) * pow(abs(dot(vN, vV)), 1.5); gl_FragColor = vec4(uColor * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  return new THREE.Mesh(g, m);
}

// ---------- weather & air ----------
// rain({ count, area:[x0,z0,x1,z1], top, bottom, len, color, cycles }) → mesh + update(t, DURATION): streaks that fall
// a whole number of times per loop (so the loop closes) — call the returned update from ctx.tick.
export function rain(o = {}) {
  const n = o.count || 1500, [x0, z0, x1, z1] = o.area || [-10, -10, 10, 10], top = o.top ?? 10, bot = o.bottom ?? 0, len = o.len ?? .35;
  const g = new THREE.PlaneGeometry(o.width ?? .012, len); g.translate(0, -len / 2, 0);
  const m = new THREE.MeshBasicMaterial({ color: o.color || '#b8c6d8', transparent: true, opacity: o.opacity ?? .35, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(g, m, n); mesh.frustumCulled = false;
  const r = rng(o.seed || 11), P = Array.from({ length: n }, () => ({ x: x0 + (x1 - x0) * r(), z: z0 + (z1 - z0) * r(), ph: r(), k: 1 + Math.floor(r() * 2), yaw: r() * Math.PI }));
  const ob = new THREE.Object3D();
  const update = (t, D) => {
    const cyc = o.cycles || Math.max(1, Math.round(D / 1.1));    // falls per loop (whole number)
    P.forEach((p, i) => { const f = ((t / D * cyc * p.k + p.ph) % 1 + 1) % 1; ob.position.set(p.x, top - (top - bot) * f, p.z); ob.rotation.set(0, p.yaw, 0); ob.updateMatrix(); mesh.setMatrixAt(i, ob.matrix); });
    mesh.instanceMatrix.needsUpdate = true;
  };
  return { mesh, update };
}
// dust({ count, box:[x0,y0,z0,x1,y1,z1], size, color }) → motes drifting on closed loops (periodic in the film)
export function dust(o = {}) {
  const n = o.count || 300, [x0, y0, z0, x1, y1, z1] = o.box || [-1, 0, -1, 1, 1, 1];
  // motes are seen only where light catches them: a lit material with a faint glow, not stars painted on the dark
  const g = new THREE.SphereGeometry(o.size ?? .004, 6, 4), m = new THREE.MeshStandardMaterial({ color: o.color || '#ffe7c4', roughness: 1, emissive: o.color || '#ffe7c4', emissiveIntensity: o.glow ?? .05 });
  const mesh = new THREE.InstancedMesh(g, m, n); mesh.frustumCulled = false;
  const r = rng(o.seed || 21), P = Array.from({ length: n }, () => ({ c: [x0 + (x1 - x0) * r(), y0 + (y1 - y0) * r(), z0 + (z1 - z0) * r()], a: [(x1 - x0) * .05 * r(), (y1 - y0) * .05 * r(), (z1 - z0) * .05 * r()], p: [r() * 6.28, r() * 6.28, r() * 6.28], k: 1 + Math.floor(r() * 2) }));
  const ob = new THREE.Object3D();
  const update = (t, D) => { const w = t / D * Math.PI * 2; P.forEach((q, i) => { ob.position.set(q.c[0] + q.a[0] * Math.sin(w * q.k + q.p[0]), q.c[1] + q.a[1] * Math.sin(w * q.k + q.p[1]), q.c[2] + q.a[2] * Math.cos(w * q.k + q.p[2])); ob.updateMatrix(); mesh.setMatrixAt(i, ob.matrix); }); mesh.instanceMatrix.needsUpdate = true; };
  return { mesh, update };
}
// shadows on/off for a whole object tree
export const shadows = (o, cast = true, receive = true) => { o.traverse(c => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = receive; } }); return o; };
