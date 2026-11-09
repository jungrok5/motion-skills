// landmark-map-3d · kit.js — parts for hand-building the hero landmark in the same soft toy style as the city:
// materials that glow at night, rounded boxes, lathes, extrusions, lofted 4-sided columns with an X-braced lattice skin
// (steel towers, cranes, bridges), arches, domes, cables, strings of lights that twinkle, a rotating beacon, animated
// screens (billboards drawn per frame from t), and a group helper that places it on the map (metres, rotation in degrees).
// A landmark is code written for the place: proportions from real dimensions, a few signature details, a night look.
import { THREE, col, shade, clamp, rng, hash } from './core.js';
import { glowMaterial } from './world.js';

export function makeKit(F) {
  const nightMats = [], updaters = [];
  const K = {
    // a material: { rough, metal, emissive (colour), glow (emissive strength at night), day (strength by day), side, flat }
    mat(c, o = {}) {
      const m = new THREE.MeshStandardMaterial({ color: col(c), roughness: o.rough ?? .78, metalness: o.metal ?? 0, side: o.side ?? THREE.FrontSide, flatShading: !!o.flat, transparent: !!o.opacity, opacity: o.opacity ?? 1 });
      if (o.emissive) { m.emissive = col(o.emissive); nightMats.push({ m, night: o.glow ?? 1, day: o.day ?? 0 }); }
      return m;
    },
    // a group on the map: at [x, z], y, rot (degrees, clockwise seen from above), s (scale)
    group(parent, o = {}) {
      const g = new THREE.Group(); (parent || F.scene).add(g);
      if (o.at) g.position.set(o.at[0], o.y ?? 0, o.at[1]); else if (o.pos) g.position.set(...o.pos);
      if (o.rot) g.rotation.y = -o.rot * Math.PI / 180;
      if (o.s) g.scale.setScalar(o.s);
      return g;
    },
    add(parent, geo, mat, o = {}) {
      const m = new THREE.Mesh(geo, mat); m.castShadow = o.cast ?? true; m.receiveShadow = o.receive ?? true;
      if (o.at) m.position.set(...o.at); if (o.rot) m.rotation.set(...o.rot.map(d => d * Math.PI / 180)); if (o.scale) m.scale.set(...[o.scale].flat().length === 3 ? o.scale : [o.scale, o.scale, o.scale]);
      parent.add(m); return m;
    },
    box(parent, w, h, d, mat, o = {}) { const g = o.round ? roundedBox(w, h, d, o.round, 3) : new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); return K.add(parent, g, matOf(mat), o); },
    cyl(parent, rt, rb, h, mat, o = {}) { const g = new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 24, 1, !!o.open); g.translate(0, h / 2, 0); return K.add(parent, g, matOf(mat), o); },
    sphere(parent, r, mat, o = {}) { return K.add(parent, new THREE.SphereGeometry(r, o.seg ?? 24, Math.max(8, (o.seg ?? 24) >> 1), 0, Math.PI * 2, 0, o.half ? Math.PI / 2 : Math.PI), matOf(mat), o); },
    // profile [[r, y], …] turned around y
    lathe(parent, profile, mat, o = {}) { return K.add(parent, new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), o.seg ?? 32), matOf(mat), o); },
    // a flat outline [[x, z], …] pushed up by depth (y), optional bevel
    extrude(parent, pts, depth, mat, o = {}) {
      const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
      for (const h of o.holes || []) sh.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
      const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: !!o.bevel, bevelSize: o.bevel ?? 0, bevelThickness: o.bevel ?? 0, bevelSegments: 2, curveSegments: o.curve ?? 12 });
      g.rotateX(-Math.PI / 2); return K.add(parent, g, matOf(mat), o);
    },
    // a beam (box or round) from a to b
    beam(parent, a, b, r, mat, o = {}) {
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
      const g = o.round ? new THREE.CylinderGeometry(r, r, L, 8) : new THREE.BoxGeometry(r * 2, L, r * 2);
      const m = K.add(parent, g, matOf(mat), o); m.position.copy(A).add(B).multiplyScalar(.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); return m;
    },
    // a cable that sags between a and b
    cable(parent, a, b, sag, r, mat, n = 24) {
      const pts = []; for (let i = 0; i <= n; i++) { const u = i / n; pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - sag * 4 * u * (1 - u), a[2] + (b[2] - a[2]) * u)); }
      return K.add(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, r, 5), matOf(mat), { cast: true });
    },
    // the X-braced lattice skin: alpha-cut material; cell = metres per bracing cell
    lattice(c, o = {}) {
      const tex = latticeTex(o.pattern ?? 'x', o.bar ?? .14);
      const m = new THREE.MeshStandardMaterial({ color: col(c), roughness: o.rough ?? .7, metalness: o.metal ?? .15, alphaMap: tex, alphaTest: .5, side: THREE.DoubleSide });
      if (o.emissive) { m.emissive = col(o.emissive); nightMats.push({ m, night: o.glow ?? 1, day: o.day ?? 0 }); }
      m.userData.cell = o.cell ?? 4; return m;
    },
    // a lofted 4-sided column through sections [{ c: [x, y, z], hx, hz }]; skin = lattice or solid material; edges = corner beams
    column(parent, sections, skin, o = {}) {
      const pos = [], uv = [], idx = [], cell = skin.userData?.cell ?? 4;
      const corner = (s, k) => { const sx = [-1, 1, 1, -1][k], sz = [-1, -1, 1, 1][k]; return [s.c[0] + sx * s.hx, s.c[1], s.c[2] + sz * s.hz]; };
      for (let side = 0; side < 4; side++) {
        let v = 0; const base = pos.length / 3;
        for (let i = 0; i < sections.length; i++) {
          const a = corner(sections[i], side), b = corner(sections[i], (side + 1) % 4);
          if (i) { const p0 = corner(sections[i - 1], side); v += Math.hypot(a[0] - p0[0], a[1] - p0[1], a[2] - p0[2]) / cell; }
          const w = Math.hypot(b[0] - a[0], b[2] - a[2]) / cell;
          pos.push(...a, ...b); uv.push(0, v, Math.max(1, Math.round(w)), v);
          if (i) { const k = base + (i - 1) * 2; idx.push(k, k + 1, k + 3, k, k + 3, k + 2); }
        }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const mesh = K.add(parent, g, skin);
      if (o.edges) { const em = o.edgeMat ?? (skin.userData.solid ??= K.mat(skin.color, { rough: skin.roughness, metal: skin.metalness })); for (let k = 0; k < 4; k++) for (let i = 1; i < sections.length; i++) K.beam(parent, corner(sections[i - 1], k), corner(sections[i], k), o.edges, em); }
      return mesh;
    },
    // an arch in the x–y plane (span along x), thickness t, depth d; band = lattice band height
    arch(parent, span, rise, t, d, mat, o = {}) {
      const n = o.seg ?? 32, pts = [];
      for (let i = 0; i <= n; i++) { const u = i / n, x = -span / 2 + span * u, y = rise * (o.shape === 'round' ? Math.sqrt(1 - (2 * u - 1) ** 2) : 1 - (2 * u - 1) ** 2); pts.push([x, y]); }
      const outer = pts.map(([x, y]) => [x, y + t]), sh = new THREE.Shape([...outer.map(([x, y]) => new THREE.Vector2(x, y)), ...pts.slice().reverse().map(([x, y]) => new THREE.Vector2(x, y))]);
      const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
      return K.add(parent, g, matOf(mat), o);
    },
    // a rectangular band of panels (w × h around a d-deep rectangle) whose UVs repeat the lattice cell — platform friezes, railings
    band(parent, w, h, d, mat, o = {}) {
      const cell = mat.userData?.cell ?? 4, g = new THREE.Group(); parent.add(g); if (o.at) g.position.set(...o.at);
      for (const [len, x, z, ry] of [[w, 0, -d / 2, 0], [w, 0, d / 2, Math.PI], [d, w / 2, 0, -Math.PI / 2], [d, -w / 2, 0, Math.PI / 2]]) {
        const p = new THREE.PlaneGeometry(len, h); const uv = p.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(len / cell)), uv.getY(i) * Math.max(1, Math.round(h / cell)));
        const m = K.add(g, p, mat); m.position.set(x, h / 2, z); m.rotation.y = ry;
      }
      return g;
    },
    dome(parent, r, h, mat, o = {}) { const g = new THREE.SphereGeometry(r, o.seg ?? 32, 16, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, h / r, 1); return K.add(parent, g, matOf(mat), o); },
    // points of light (bulbs) on the landmark: glow at night; twinkle = { rate, from, to } random flashes (a sparkle show)
    lights(parent, points, c = '#ffd9a0', o = {}) {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
      const r = rng(o.seed ?? 3); geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(points.map(() => r()), 1));
      const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { c: { value: col(c) }, k: { value: 0 }, size: { value: o.size ?? 4 }, scale: { value: 1000 }, t: { value: 0 }, tw: { value: 0 }, rate: { value: o.twinkle?.rate ?? 6 } },
        vertexShader: `uniform float size, scale, t, tw, rate; attribute float aSeed; varying float vA;
          void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv;
            float ph = fract(aSeed * 91.7 + t * rate * (.6 + aSeed)); float fl = tw > 0. ? smoothstep(.0, .05, ph) * smoothstep(.22, .05, ph) : 1.;
            vA = mix(1., fl * 2.2, tw); gl_PointSize = size * scale / -mv.z * (tw > 0. ? .6 + fl : 1.); }`,
        fragmentShader: `uniform vec3 c; uniform float k; varying float vA; void main(){ vec2 d = gl_PointCoord - .5; float r = length(d) * 2.; float a = pow(max(1. - r, 0.), 2.) + pow(max(1. - r * 4., 0.), 2.) * 2.; gl_FragColor = vec4(c * a * k * vA, 1.); }`,
      });
      const p = new THREE.Points(geo, m); p.frustumCulled = false; p.renderOrder = 5; p.layers.set(1); parent.add(p);
      updaters.push((t, L) => {
        m.uniforms.t.value = t; m.uniforms.scale.value = F.pointScale;
        const tw = o.twinkle ? clamp((t - o.twinkle.from) / .4) * (1 - clamp((t - o.twinkle.to) / .4)) : 0;
        m.uniforms.tw.value = tw; m.uniforms.k.value = (o.always ? 1 : L.glow) * (o.k ?? 1) * (o.twinkle && o.twinkle.only ? tw : 1);
      });
      return p;
    },
    // a rotating searchlight: two beams from a point, at night
    beacon(parent, at, o = {}) {
      const len = o.len ?? 260, g = new THREE.ConeGeometry(o.spread ?? 16, len, 24, 1, true); g.translate(0, -len / 2, 0); g.rotateZ(Math.PI / 2);
      const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { k: { value: 0 }, c: { value: col(o.color ?? '#fff3d6') }, len: { value: len } },
        vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
        fragmentShader: `uniform float k, len; uniform vec3 c; varying vec3 vP; void main(){ float u = clamp(vP.x / len, 0., 1.); gl_FragColor = vec4(c * (1. - u) * (1. - u) * .35 * k, 1.); }`,
      });
      const piv = new THREE.Group(); piv.position.set(...at); parent.add(piv);
      for (const s of [0, Math.PI]) { const b = new THREE.Mesh(g, m); b.rotation.y = s; b.rotation.z = -(o.tilt ?? 4) * Math.PI / 180; b.renderOrder = 6; b.frustumCulled = false; b.layers.set(1); piv.add(b); }
      updaters.push((t, L) => { piv.rotation.y = t * (o.speed ?? .55); m.uniforms.k.value = Math.max(0, (L.glow - .45) / .55) * (o.k ?? 1); });
      return piv;
    },
    // an animated screen: draw(g, t, w, h) paints a canvas each frame (deterministic); glows a little at night
    screen(parent, w, h, draw, o = {}) {
      const res = o.res ?? 256, cv = document.createElement('canvas'); cv.width = Math.round(res * w / h); cv.height = res; const g = cv.getContext('2d');
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
      const mesh = K.add(parent, new THREE.PlaneGeometry(w, h), m, { ...o, cast: false }); if (o.at) mesh.position.set(...o.at);
      updaters.push((t, L) => { draw(g, t, cv.width, cv.height); tex.needsUpdate = true; m.color.setScalar(.75 + .7 * L.glow); });
      return mesh;
    },
    every(fn) { updaters.push(fn); },
    // sample points along a polyline [[x,y,z]…] every `step` metres (for strings of lights)
    sample(path, step) { const out = []; for (let i = 0; i < path.length - 1; i++) { const a = path[i], b = path[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(1, Math.round(L / step)); for (let k = 0; k < n; k++) { const u = k / n; out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]); } } out.push(path.at(-1)); return out; },
    shade, col, rng, hash,
    update(t, L) {
      for (const n of nightMats) n.m.emissiveIntensity = n.day + (n.night - n.day) * L.glow;
      for (const u of updaters) u(t, L);
    },
  };
  return K;
}
const matOf = m => m instanceof THREE.Material ? m : new THREE.MeshStandardMaterial({ color: col(m ?? '#ffffff'), roughness: .8 });

function latticeTex(pattern, bar) {
  const N = 128, cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, N, N); g.strokeStyle = '#fff'; g.lineCap = 'square';
  const w = bar * N; g.lineWidth = w;
  g.strokeRect(w / 2, w / 2, N - w, N - w);
  g.lineWidth = w * .75; g.beginPath();
  if (pattern === 'x' || pattern === 'xx') { g.moveTo(0, 0); g.lineTo(N, N); g.moveTo(N, 0); g.lineTo(0, N); }
  if (pattern === 'xx') { g.moveTo(N / 2, 0); g.lineTo(N, N / 2); g.lineTo(N / 2, N); g.lineTo(0, N / 2); g.closePath(); }
  if (pattern === 'grid') { g.moveTo(N / 2, 0); g.lineTo(N / 2, N); g.moveTo(0, N / 2); g.lineTo(N, N / 2); }
  g.stroke();
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
// a box with rounded edges (r), centred, built by pushing a subdivided box onto rounded corners
export function roundedBox(w, h, d, r, seg = 3) {
  const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2), p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
  const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); c.set(clamp(v.x, -hw, hw), clamp(v.y, -hh, hh), clamp(v.z, -hd, hd));
    const n = v.clone().sub(c); if (n.lengthSq() > 1e-9) { n.normalize().multiplyScalar(r); v.copy(c).add(n); }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}
