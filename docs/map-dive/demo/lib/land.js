// map-dive · land.js — the ground of each stage:
//   island(S, {...})   the floating toy map: the region's outline extruded into a thick slab (painted top, grass lip,
//                      terracotta soil sides), optional sea slabs, names and rivers painted on the top
//   terrain(S, {...})  a close-up ground: a height field with a painted texture, 3D tree canopies, optional water plane
//   city(S, {...})     a street grid with avenues, instanced buildings (windows light up at night), roofs, street lamps
// All three paint with the same Painter: base(x, z) → colour per texel (evaluated at `res`, upscaled smoothly), then vector
// strokes on top at `tex` resolution (rivers, roads, fields, names). Lines and sizes are in world units.
import * as THREE from 'three';
import { rng, hash, fbm, noise, clamp, lerp, smooth, hex, mixc, inside, distToLine, FONT } from './dive.js';

const css = c => Array.isArray(c) ? `rgb(${c.map(toSRGB8).join(',')})` : c;   // linear rgb array or any CSS colour
const toSRGB8 = v => Math.round(clamp(v <= .0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - .055) * 255);

// ---------------------------------------------------------------- painter
export class Painter {
  // bounds = [x0, z0, x1, z1] in world units
  constructor(bounds, { tex = 4096, res = 640, base, glow = false } = {}) {
    const [x0, z0, x1, z1] = bounds; this.b = bounds;
    const w = x1 - x0, h = z1 - z0, k = tex / Math.max(w, h);
    this.TW = Math.round(w * k); this.TH = Math.round(h * k); this.k = k;
    this.canvas = document.createElement('canvas'); this.canvas.width = this.TW; this.canvas.height = this.TH;
    this.ctx = this.canvas.getContext('2d'); this.texts = [];
    if (base) {
      const rw = Math.round(res * w / Math.max(w, h)), rh = Math.round(res * h / Math.max(w, h));
      const small = document.createElement('canvas'); small.width = rw; small.height = rh;
      const sg = small.getContext('2d'), img = sg.createImageData(rw, rh);
      for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) {
        const c = base(x0 + (i + .5) / rw * w, z0 + (j + .5) / rh * h), o = (j * rw + i) * 4;
        img.data[o] = toSRGB8(c[0]); img.data[o + 1] = toSRGB8(c[1]); img.data[o + 2] = toSRGB8(c[2]); img.data[o + 3] = 255;
      }
      sg.putImageData(img, 0, 0); this.ctx.imageSmoothingEnabled = true; this.ctx.imageSmoothingQuality = 'high';
      this.ctx.drawImage(small, 0, 0, this.TW, this.TH);
    }
    if (glow) { this.glowCanvas = document.createElement('canvas'); this.glowCanvas.width = this.TW >> 1; this.glowCanvas.height = this.TH >> 1; this.g2 = this.glowCanvas.getContext('2d'); this.g2.fillStyle = '#000'; this.g2.fillRect(0, 0, this.TW, this.TH); }
  }
  X(x) { return (x - this.b[0]) * this.k; } Z(z) { return (z - this.b[1]) * this.k; } S(v) { return v * this.k; }
  path(g, pts, closed, k = 1) { g.beginPath(); pts.forEach(([x, z], i) => g[i ? 'lineTo' : 'moveTo'](this.X(x) * k, this.Z(z) * k)); if (closed) g.closePath(); }
  // filled outline (fields, lakes, parks, the sea). blur softens the edge (world units)
  fill(loop, color, { alpha = 1, blur = 0, stroke, strokeWidth = .05 } = {}) {
    const g = this.ctx; g.save(); g.globalAlpha = alpha; if (blur) g.filter = `blur(${this.S(blur)}px)`;
    this.path(g, loop, true); g.fillStyle = css(color); g.fill();
    if (stroke) { g.lineWidth = this.S(strokeWidth); g.strokeStyle = css(stroke); g.stroke(); } g.restore(); return this;
  }
  line(pts, width, color, { alpha = 1, cap = 'round', dash, blur = 0 } = {}) {
    const g = this.ctx; g.save(); g.globalAlpha = alpha; g.lineCap = cap; g.lineJoin = 'round'; if (blur) g.filter = `blur(${this.S(blur)}px)`;
    if (dash) g.setLineDash(dash.map(d => this.S(d)));
    this.path(g, pts, false); g.lineWidth = this.S(width); g.strokeStyle = css(color); g.stroke(); g.restore(); return this;
  }
  // a river: a pale bank under a blue line
  river(pts, width = .06, { color = '#4a9be0', bank = '#d7eef7' } = {}) { this.line(pts, width * 2.1, bank, { alpha: .75 }); return this.line(pts, width, color); }
  // a road: optional casing under the fill; glow paints the same line into the night-glow layer
  road(pts, width = .05, { color = '#f4f1ea', edge = '#b9b2a4', glow = 0 } = {}) {
    if (edge) this.line(pts, width * 1.45, edge); this.line(pts, width, color);
    if (glow && this.g2) { const g = this.g2; g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; this.path(g, pts, false, .5); g.lineWidth = this.S(width) * .5 * 1.1; g.strokeStyle = `rgba(255,255,255,${glow})`; g.filter = `blur(${this.S(width) * .25}px)`; g.stroke(); g.restore(); }
    return this;
  }
  dot([x, z], r, color, { alpha = 1 } = {}) { const g = this.ctx; g.save(); g.globalAlpha = alpha; g.beginPath(); g.arc(this.X(x), this.Z(z), this.S(r), 0, Math.PI * 2); g.fillStyle = css(color); g.fill(); g.restore(); return this; }
  // a soft light in the night-glow layer (a town seen from above at night)
  light([x, z], r, strength = 1) {
    if (!this.g2) return this; const g = this.g2, X = this.X(x) * .5, Z = this.Z(z) * .5, R = this.S(r) * .5;
    const gr = g.createRadialGradient(X, Z, 0, X, Z, R); gr.addColorStop(0, `rgba(255,255,255,${strength})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.globalCompositeOperation = 'lighter'; g.fillRect(X - R, Z - R, R * 2, R * 2); g.globalCompositeOperation = 'source-over'; return this;
  }
  // a name lying on the map. size = cap height in world units
  text(str, [x, z], { size = .12, weight = 600, color = '#3b3f46', halo = 'rgba(255,255,255,.75)', haloWidth = .22, rotate = 0, align = 'center' } = {}) {
    const g = this.ctx; g.save(); g.translate(this.X(x), this.Z(z)); g.rotate(rotate * Math.PI / 180);
    const px = this.S(size); g.font = `${weight} ${px}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle';
    const lines = String(str).split('\n');
    lines.forEach((l, i) => { const y = (i - (lines.length - 1) / 2) * px * 1.1;
      if (halo) { g.lineWidth = px * haloWidth; g.strokeStyle = halo; g.lineJoin = 'round'; g.strokeText(l, 0, y); }
      g.fillStyle = css(color); g.fillText(l, 0, y); });
    g.restore(); this.texts.push(str); return this;
  }
  // a patchwork of fields inside an outline: cells of `cell` units, colours picked by hash, thin borders
  fields(loop, { cell = .4, angle = 0, colors = ['#a7cf6a', '#c6d97a', '#8fbf5a', '#d9cf86'], border = 'rgba(70,90,50,.18)', borderWidth = .012, alpha = .6, seed = 3, keep } = {}) {
    const g = this.ctx; g.save(); this.path(g, loop, true); g.clip();
    const xs = loop.map(p => p[0]), zs = loop.map(p => p[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const R = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2 + cell;
    const ca = Math.cos(angle * Math.PI / 180), sa = Math.sin(angle * Math.PI / 180);
    for (let i = -Math.ceil(R / cell); i <= Math.ceil(R / cell); i++) for (let j = -Math.ceil(R / cell); j <= Math.ceil(R / cell); j++) {
      const u = i * cell, v = j * cell;
      const corners = [[u, v], [u + cell, v], [u + cell, v + cell], [u, v + cell]].map(([a, b]) => [cx + a * ca - b * sa, cz + a * sa + b * ca]);
      const mid = [(corners[0][0] + corners[2][0]) / 2, (corners[0][1] + corners[2][1]) / 2];
      if (keep && !keep(mid[0], mid[1])) continue;
      this.path(g, corners, true); g.fillStyle = css(colors[Math.floor(hash(i, j, seed + 2) * colors.length)]); g.globalAlpha = alpha * (.45 + .55 * hash(i, j, seed + 3)); g.fill();
      g.globalAlpha = 1; g.lineWidth = this.S(borderWidth); g.strokeStyle = border; g.stroke();
    }
    g.restore(); return this;
  }
  texture() { const t = new THREE.CanvasTexture(this.canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; }
  glowTexture() { if (!this.glowCanvas) return null; const t = new THREE.CanvasTexture(this.glowCanvas); t.colorSpace = THREE.SRGBColorSpace; return t; }
}

function boundsOf(loops, m = 0) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const l of loops) for (const [x, z] of l) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
  return [x0 - m, z0 - m, x1 + m, z1 + m];
}
function nightGlow(S, mat, strength) { S.onFrame((t, n) => { mat.emissiveIntensity = S.film.off.has('glow') ? 0 : n * strength; }); }

// a slab: the outline extruded `depth` down from y = top, rounded edge; caps get `top` material, sides vertex colours
function slab(loop, { depth = .5, bevel = .09, top = 0, uvB, lip = '#7cbc4f', lipDepth = .07, soil = ['#e39a68', '#b8683f'], bottom = '#7c4a33', cap }) {
  const shape = new THREE.Shape(loop.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * .9, bevelSegments: 4, curveSegments: 1, steps: 1 });
  g.rotateX(-Math.PI / 2); g.computeBoundingBox(); g.translate(0, top - g.boundingBox.max.y, 0);
  const p = g.attributes.position, n = p.count, uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
  const [x0, z0, x1, z1] = uvB, L = hex(lip), A = hex(soil[0]), B = hex(soil[1]), Bo = hex(bottom), ymin = top - depth - bevel * 2;
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    uv[i * 2] = (x - x0) / (x1 - x0); uv[i * 2 + 1] = 1 - (z - z0) / (z1 - z0);
    const d = top - y, c = d < lipDepth ? L : y < ymin + .01 ? Bo : mixc(A, B, clamp((d - lipDepth) / (depth + bevel)));
    col.set(c, i * 3);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// ---------------------------------------------------------------- island: the floating toy map
// land: [outline, …] (xz points, use smoothLoop on a projected outline) · sea: [outline, …] water slabs under/around it
// base(x, z) → linear rgb (use hex()) · paint(P) draws on top (P.river, P.road, P.text, P.fields, P.light …)
// returns { mesh, painter, top: y of the map surface }
export function island(S, { land, sea = [], base, paint, depth = .55, bevel = .1, tex = 4096, res = 640, lip = '#7cbc4f', soil, bottom,
  seaColor = '#2f7fd2', shallow = '#5cc0e4', foam = '#eef9fc', seaSide = ['#2a6cc0', '#1b4590'], seaDrop = .13, glow = 1.6 } = {}) {
  const all = [...land, ...sea], B = boundsOf(all, .25);
  const P = new Painter(B, { tex: tex * (S.film.texScale || 1), res, base: base || (() => hex('#8cc35a')), glow: true });
  if (sea.length) {            // the sea: everything outside the land, shallows and a foam line along the coast
    const g = P.ctx; g.save(); g.beginPath(); g.rect(0, 0, P.TW, P.TH);
    for (const l of land) l.forEach(([x, z], i) => g[i ? 'lineTo' : 'moveTo'](P.X(x), P.Z(z)));
    g.clip('evenodd'); g.fillStyle = css(seaColor); g.fillRect(0, 0, P.TW, P.TH);
    for (const l of land) { P.line([...l, l[0]], .5, shallow, { alpha: .75, blur: .12 }); P.line([...l, l[0]], .16, shallow, { blur: .03 }); P.line([...l, l[0]], .045, foam, { alpha: .9 }); }
    g.restore();
  }
  if (paint) paint(P);
  S.texts.push(...P.texts);
  const map = P.texture(), gl = P.glowTexture();
  const topMat = new THREE.MeshLambertMaterial({ map, emissiveMap: gl, emissive: new THREE.Color('#ffc46b'), emissiveIntensity: 0 });
  nightGlow(S, topMat, glow);
  const side = new THREE.MeshLambertMaterial({ vertexColors: true });
  const group = new THREE.Group();
  for (const l of land) {
    const g = slab(l, { depth, bevel, uvB: B, lip, soil, bottom });
    const m = new THREE.Mesh(g, [topMat, side]); m.receiveShadow = true; group.add(m);
  }
  if (sea.length) {
    const wm = new THREE.MeshPhongMaterial({ map, shininess: 70, specular: new THREE.Color('#5a7aa8') });
    const ws = new THREE.MeshLambertMaterial({ vertexColors: true });
    for (const l of sea) {
      const g = slab(l, { depth: depth - seaDrop + bevel * .2, bevel: bevel * 1.1, top: -seaDrop, uvB: B, lip: seaSide[0], lipDepth: .02, soil: seaSide, bottom: '#173a7a' });
      const m = new THREE.Mesh(g, [wm, ws]); m.receiveShadow = true; group.add(m);
    }
  }
  S.add(group);
  const half = Math.max(B[2] - B[0], B[3] - B[1]) / 2 + .5, c = [(B[0] + B[2]) / 2, 0, (B[1] + B[3]) / 2];
  S.fitShadow(half, c);
  S.groundAt = () => -depth; S.surface = () => 0;
  return { mesh: group, painter: P, top: 0, bounds: B, inLand: (x, z) => land.some(l => inside([x, z], l)) };
}

// ---------------------------------------------------------------- terrain: a close-up of a place
// size: square side in world units · height(x, z) → y · base(x, z) → rgb · paint(P)
// trees: { where(x, z) → 0..1, n, size: [min, max], colors } · water: { level, color, opacity }
// apron: { size, base, paint, y } — a wide, low-detail ground around the square so its edge never shows (fog hides the rest)
export function terrain(S, { size = 60, seg = 220, height = () => 0, base, paint, tex = 4096, res = 640, trees, water, center = [0, 0], glow = 1.4, apron } = {}) {
  const [cx, cz] = center, B = [cx - size / 2, cz - size / 2, cx + size / 2, cz + size / 2];
  const P = new Painter(B, { tex: tex * (S.film.texScale || 1), res, base: base || (() => hex('#7fb556')), glow: true });
  if (paint) paint(P);
  S.texts.push(...P.texts);
  const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ map: P.texture(), emissiveMap: P.glowTexture(), emissive: new THREE.Color('#ffbf66'), emissiveIntensity: 0 });
  nightGlow(S, mat, glow);
  const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; S.add(mesh);
  if (apron) {
    const A = apron.size || size * 8, AB = [cx - A / 2, cz - A / 2, cx + A / 2, cz + A / 2];
    const AP = new Painter(AB, { tex: (apron.tex || 2048) * (S.film.texScale || 1), res: apron.res || 384, base: apron.base || base, glow: true });
    if (apron.paint) apron.paint(AP);
    // a ring: the apron has a square hole where the detailed terrain is (keep the terrain's edges near apron.y)
    const h = size / 2 - .02, sh = new THREE.Shape([[-A / 2, -A / 2], [A / 2, -A / 2], [A / 2, A / 2], [-A / 2, A / 2]].map(([x, y]) => new THREE.Vector2(x, y)));
    sh.holes.push(new THREE.Path([[-h, -h], [-h, h], [h, h], [h, -h]].map(([x, y]) => new THREE.Vector2(x, y))));
    const ag = new THREE.ShapeGeometry(sh); ag.rotateX(-Math.PI / 2); ag.translate(cx, apron.y ?? 0, cz);
    const ap = ag.attributes.position, auv = ag.attributes.uv;
    for (let i = 0; i < ap.count; i++) auv.setXY(i, (ap.getX(i) - AB[0]) / A, 1 - (ap.getZ(i) - AB[1]) / A);
    const amat = new THREE.MeshLambertMaterial({ map: AP.texture(), emissiveMap: AP.glowTexture(), emissive: new THREE.Color('#ffbf66'), emissiveIntensity: 0 });
    nightGlow(S, amat, apron.glow ?? glow); const am = new THREE.Mesh(ag, amat); am.receiveShadow = true; S.add(am);
  }
  let w = null;
  if (water) {
    const wg = new THREE.PlaneGeometry(size, size); wg.rotateX(-Math.PI / 2);   // only over the detailed square (the apron paints its own water)
    const wmat = new THREE.MeshPhongMaterial({ color: water.color || '#2f9ac4', transparent: true, opacity: water.opacity ?? .55, shininess: 90, specular: new THREE.Color('#bfe3ff'), depthWrite: false });
    w = new THREE.Mesh(wg, wmat); w.position.set(cx, water.level ?? 0, cz); w.renderOrder = 2; w.receiveShadow = true; S.add(w);
  }
  let canopy = null;
  if (trees) canopy = forest(S, { ...trees, height, bounds: B });
  S.fitShadow(Math.min(size / 2, trees?.shadowHalf ?? size / 2), [cx, 0, cz]);
  S.groundAt = (x, z) => Math.max(height(x, z), water ? water.level ?? 0 : -Infinity); S.surface = height;
  return { mesh, water: w, canopy, painter: P, height };
}

// instanced tree canopies scattered where(x, z) says (probability 0..1)
export function forest(S, { where, n = 6000, size = [.25, .5], colors = ['#3f8a3a', '#2f7434', '#4f9a3f', '#367d2f'], height = () => 0, bounds, seed = 11, shape = 'round', castShadow = true }) {
  const R = rng(seed), [x0, z0, x1, z1] = bounds, pts = [];
  for (let tries = 0; pts.length < n && tries < n * 30; tries++) {
    const x = lerp(x0, x1, R()), z = lerp(z0, z1, R());
    if (R() < where(x, z)) pts.push([x, z, lerp(size[0], size[1], R()), Math.floor(R() * colors.length), R()]);
  }
  const geo = shape === 'cone' ? new THREE.ConeGeometry(.6, 1.6, 7).translate(0, .8, 0) : new THREE.IcosahedronGeometry(1, 1).scale(1, .82, 1).translate(0, .55, 0);
  const mat = new THREE.MeshLambertMaterial({ color: '#fff' });
  const m = new THREE.InstancedMesh(geo, mat, pts.length), M = new THREE.Matrix4(), c = new THREE.Color();
  pts.forEach(([x, z, s, ci, r], i) => {
    M.compose(new THREE.Vector3(x, height(x, z) - s * .1, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r * 6.28), new THREE.Vector3(s, s * (.85 + r * .3), s));
    m.setMatrixAt(i, M); m.setColorAt(i, c.set(colors[ci]).multiplyScalar(.85 + .3 * r));
  });
  m.castShadow = castShadow; m.receiveShadow = true; S.add(m); return m;
}

// ---------------------------------------------------------------- city
// A street grid (rotated by `angle`) with avenues (polylines), parks and water kept clear, instanced buildings.
//   keep(x, z)    → false where no building may stand (parks, water, the landmark's plaza)
//   floors(x, z, r) → storeys for a lot (r = 0..1 per lot); 1–2 = houses with coloured roofs, 6+ = towers
// returns { buildings, roofs, lamps, painter } — windows glow and lamps light up with the stage's night value.
export function city(S, { size = 40, center = [0, 0], angle = 12, block = [2.2, 1.6], street = .32, avenues = [], avenueWidth = .55,
  parks = [], waters = [], keep = () => true, floors = (x, z, r) => 2 + Math.floor(r * 4), floorH = .16, base, paint, ground,
  walls = ['#f3efe6', '#e9e1d2', '#dcd6cc', '#f6f3ee', '#d9cfc0'], roofs = ['#d9583b', '#c94b35', '#3f6fb5', '#e08a3c', '#5f8f4e', '#9aa3ad'],
  lampEvery = 1.1, seed = 5, tex = 4096, trees, glow = .6, waterColor = '#4aa7d2' } = {}) {
  const [cx, cz] = center, a = angle * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  const toW = (u, v) => [cx + u * ca - v * sa, cz + u * sa + v * ca], half = size / 2;
  const blocked = (x, z, m = 0) => parks.some(l => inside([x, z], l)) || waters.some(l => inside([x, z], l)) || avenues.some(av => distToLine([x, z], av) < avenueWidth / 2 + m) || !keep(x, z);
  const streets = [];
  for (let u = -half * 1.5; u <= half * 1.5; u += block[0]) streets.push([toW(u, -half * 1.5), toW(u, half * 1.5)]);
  for (let v = -half * 1.5; v <= half * 1.5; v += block[1]) streets.push([toW(-half * 1.5, v), toW(half * 1.5, v)]);
  // the far city: the same grid painted flat around the square (streets, roofs, water), so the city has no edge
  const R0 = rng(seed + 1), farA = size * 6;
  const apron = {
    size: farA, tex: 4096, res: 256, base: (x, z) => mixc(hex('#e1dbcf'), hex('#cfc8ba'), fbm(x * .05, z * .05, 3)),
    paint: P => {
      for (let u = -farA / 2; u <= farA / 2; u += block[0]) P.road([toW(u, -farA), toW(u, farA)], street, { color: '#c4c0b8', edge: null, glow: .45 });
      for (let v = -farA / 2; v <= farA / 2; v += block[1]) P.road([toW(-farA, v), toW(farA, v)], street, { color: '#c4c0b8', edge: null, glow: .45 });
      for (const av of avenues) P.road(av, avenueWidth, { color: '#b7b2a9', edge: null, glow: .8 });
      const g = P.ctx;
      for (let u = -farA * .72; u < farA * .72; u += block[0] / 2) for (let v = -farA * .72; v < farA * .72; v += block[1] / 2) {
        const [x, z] = toW(u + block[0] / 4, v + block[1] / 4), r = R0();
        if (Math.abs(x - cx) < half && Math.abs(z - cz) < half) continue;
        if (Math.abs(x - cx) > farA / 2 || Math.abs(z - cz) > farA / 2 || blocked(x, z, .3) || r < .12) continue;
        g.save(); g.translate(P.X(x), P.Z(z)); g.rotate(a); g.fillStyle = r < .55 ? walls[Math.floor(r * 37) % walls.length] : roofs[Math.floor(r * 53) % roofs.length];
        const w = P.S(block[0] / 2 - street * .8) * (.7 + .25 * hash(u, v, 3)), d = P.S(block[1] / 2 - street * .8) * (.7 + .25 * hash(u, v, 4));
        g.fillRect(-w / 2, -d / 2, w, d); g.restore();
        if (r > .45 && P.g2) { const q = P.g2; q.save(); q.translate(P.X(x) / 2, P.Z(z) / 2); q.rotate(a); q.fillStyle = `rgba(255,255,255,${.25 + .4 * hash(u, v, 5)})`; q.fillRect(-w / 5, -d / 5, w / 2.5, d / 2.5); q.restore(); }   // lit windows seen from above
      }
      for (const l of waters) P.fill(l, waterColor, { stroke: '#cfeaf3', strokeWidth: .12 });
      for (const l of parks) P.fill(l, '#7dbb57');
    },
  };
  const T = terrain(S, {
    size, center, tex, seg: 2, apron, base: base || ((x, z) => mixc(hex('#e7e2d8'), hex('#d8d2c6'), fbm(x * .3, z * .3, 3))), trees,
    paint: P => {
      for (const l of parks) P.fill(l, '#7dbb57', { stroke: '#6aa64a', strokeWidth: .06 });
      for (const s of streets) P.road(s, street, { color: '#c9c6c0', edge: null, glow: .5 });
      for (const av of avenues) P.road(av, avenueWidth, { color: '#bdb9b2', edge: '#f6f4ef', glow: .8 });
      for (const l of waters) P.fill(l, waterColor, { stroke: '#cfeaf3', strokeWidth: .12 });
      if (paint) paint(P);
    }, glow, ...(ground || {}),
  });
  // lots: each block split into 2–3 × 2 lots
  const R = rng(seed), lots = [];
  for (let u = -half * 1.5; u < half * 1.5; u += block[0]) for (let v = -half * 1.5; v < half * 1.5; v += block[1]) {
    const nu = 2 + (R() > .5 ? 1 : 0), nv = 2, iu = (block[0] - street) / nu, iv = (block[1] - street) / nv;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const uu = u + street / 2 + (i + .5) * iu, vv = v + street / 2 + (j + .5) * iv, [x, z] = toW(uu, vv), r = R(), r2 = R();
      if (Math.abs(x - cx) > half - .4 || Math.abs(z - cz) > half - .4) continue;
      if (blocked(x, z, Math.max(iu, iv) * .6)) continue;
      const f = Math.max(1, Math.round(floors(x, z, r))); if (r2 < .06) continue;
      lots.push({ x, z, w: iu * (.72 + .18 * r2), d: iv * (.72 + .18 * R()), f, r });
    }
  }
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0);
  const wallMat = windowMaterial(new THREE.MeshLambertMaterial({ color: '#fff' }), S.uNight, { floorH });
  const B = new THREE.InstancedMesh(box, wallMat, lots.length), Rf = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: '#fff' }), lots.length);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a), c = new THREE.Color();
  lots.forEach((L, i) => {
    const h = L.f * floorH;
    M.compose(new THREE.Vector3(L.x, 0, L.z), q, new THREE.Vector3(L.w, h, L.d)); B.setMatrixAt(i, M);
    B.setColorAt(i, c.set(walls[Math.floor(hash(i, 1, seed) * walls.length)]));
    const low = L.f <= 3;
    M.compose(new THREE.Vector3(L.x, h, L.z), q, new THREE.Vector3(L.w * (low ? 1.06 : .96), low ? floorH * .35 : floorH * .12, L.d * (low ? 1.06 : .96))); Rf.setMatrixAt(i, M);
    Rf.setColorAt(i, c.set(low ? roofs[Math.floor(hash(i, 2, seed) * roofs.length)] : '#b9bcc2'));
  });
  for (const m of [B, Rf]) { m.castShadow = true; m.receiveShadow = true; S.add(m); }
  // lamps along streets and avenues
  const lamps = [];
  for (const s of [...streets, ...avenues]) for (let i = 0; i < s.length - 1; i++) {
    const [ax, az] = s[i], [bx, bz] = s[i + 1], L = Math.hypot(bx - ax, bz - az);
    for (let d = lampEvery / 2; d < L; d += lampEvery) { const x = ax + (bx - ax) * d / L, z = az + (bz - az) * d / L; if (Math.abs(x - cx) < half && Math.abs(z - cz) < half && !waters.some(l => inside([x, z], l))) lamps.push([x, .12, z]); }
  }
  const lampPts = S.glow(lamps, { size: .5, color: '#ffbf6e', strength: .9 });
  S.fitShadow(half, [cx, 0, cz]);
  return { buildings: B, roofs: Rf, lamps: lampPts, painter: T.painter, lots, terrain: T };
}

// Lambert + a window grid on vertical faces: glass tint by day, warm lights at night (uNight = stage.uNight)
export function windowMaterial(mat, uNight, { floorH = .16, col = .14, lit = .55, warm = '#ffc779' } = {}) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uNight = uNight; sh.uniforms.uWin = { value: new THREE.Vector2(col, floorH) }; sh.uniforms.uWarm = { value: new THREE.Color(warm) }; sh.uniforms.uLit = { value: lit };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 wp4 = vec4(transformed, 1.); vec3 wn = objectNormal;
        #ifdef USE_INSTANCING
          wp4 = instanceMatrix * wp4; wn = mat3(instanceMatrix) * wn;
        #endif
        vWP = (modelMatrix * wp4).xyz; vWN = normalize(mat3(modelMatrix) * wn);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vWP; varying vec3 vWN; uniform float uNight, uLit; uniform vec2 uWin; uniform vec3 uWarm;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float side = 1. - step(.5, abs(vWN.y));
        vec2 gw = vec2(dot(vWP.xz, normalize(vec2(-vWN.z, vWN.x) + 1e-5)) / uWin.x, (vWP.y - uWin.y * .15) / uWin.y);
        vec2 fw = fract(gw), iw = floor(gw);
        float win = side * step(.2, fw.x) * step(fw.x, .8) * step(.28, fw.y) * step(fw.y, .78) * step(.5, vWP.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.55, .66, .8), win * .75);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float on = step(1. - uLit, h21(iw + floor(vWP.xz * .37) * 7.31));
        totalEmissiveRadiance += uWarm * win * on * uNight * 1.15;`);
  };
  return mat;
}
