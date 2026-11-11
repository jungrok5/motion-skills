// kinetic-type-collage · kit.js — what props and pictures are built from. Nothing here is a finished prop: a film designs
// its own objects for its topic out of these parts (references/KIT.md) and registers them with F.prop(name, (K) => …).
//   materials  K.mat(color, { rough, metal, map, clear })   K.basic(color)   K.col(name)
//   textures   K.paint(w, h, (g, w, h) => …)   K.font(key, px) for canvas text   painters K.tex.*
//   solids     K.box K.rbox K.cyl K.sphere K.lathe K.torus K.extrude K.tube K.plane
//   plates     K.slab (rounded plate with a painted face: tile, card, key, packet, sign board)   K.disc (round plate: coin, dial, lid, sign)
//   placing    K.group(...children)   K.at(obj, [x, y, z], [rx, ry, rz] in degrees, scale)
import * as THREE from 'three';

const D = Math.PI / 180;
export const rng = (seed = 1) => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };

export function makeKit(F) {
  const K = {}, mats = new Map();
  K.col = (c) => F.col(c);
  K.css = (c) => '#' + F.col(c).getHexString();
  K.rng = rng;
  K.font = (key, px) => F.ts.css(key, px);                       // a canvas font string for painters: g.font = K.font('han', 220)
  K.mat = (color = 'paper', o = {}) => {
    const cacheable = !o.map && !o.side && !o.emissive, key = [color, o.rough, o.metal, o.clear, o.flat].join('|');
    if (cacheable && mats.has(key)) return mats.get(key);
    const P = { color: F.col(color), roughness: o.rough ?? 0.55, metalness: o.metal ?? 0, flatShading: !!o.flat, side: o.side ?? THREE.FrontSide };
    if (o.map) { P.map = o.map; P.color = new THREE.Color('#fff'); }
    if (o.emissive) { P.emissive = F.col(o.emissive); P.emissiveIntensity = o.glow ?? 1; }
    const m = o.clear ? new THREE.MeshPhysicalMaterial({ ...P, clearcoat: o.clear, clearcoatRoughness: 0.12 }) : new THREE.MeshStandardMaterial(P);
    if (cacheable) mats.set(key, m); return m;
  };
  K.basic = (color = 'ink', o = {}) => new THREE.MeshBasicMaterial({ color: o.map ? '#fff' : F.col(color), map: o.map || null, side: o.side ?? THREE.DoubleSide, transparent: !!o.alpha, alphaTest: o.alpha ? 0.03 : 0 });
  // a canvas texture painted in code. w, h in px; the painter gets (g, w, h)
  K.paint = (w, h, fn, o = {}) => {
    const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); const g = c.getContext('2d'); fn(g, c.width, c.height, K);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
    return t;
  };
  const mesh = (geo, mat) => new THREE.Mesh(geo, mat || K.mat('paper'));
  K.box = (w, h, d, mat) => mesh(new THREE.BoxGeometry(w, h, d), mat);
  const rrect = (w, h, r) => { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2); s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
  K.rrect = rrect;
  // box with rounded edges (r) — centred
  K.rbox = (w, h, d, r, mat) => {
    r = Math.min(r, w / 2, h / 2, d / 2);
    const g = new THREE.ExtrudeGeometry(rrect(w - 2 * r, h - 2 * r, 0.0001), { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 4, curveSegments: 6 });
    g.translate(0, 0, -(d - 2 * r) / 2); return mesh(g, mat);
  };
  K.cyl = (r, h, mat, o = {}) => mesh(new THREE.CylinderGeometry(o.r2 ?? r, r, h, o.seg ?? 48, 1, !!o.open), mat);   // r = bottom radius, r2 = top
  K.sphere = (r, mat, o = {}) => { const m = mesh(new THREE.SphereGeometry(r, o.seg ?? 40, Math.round((o.seg ?? 40) * 0.6)), mat); if (o.s) m.scale.set(...o.s); return m; };
  // profile [[radius, y], …] turned around the y axis (cups, bowls, bottles, pots, lamps)
  K.lathe = (profile, mat, o = {}) => { const m = mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), o.seg ?? 56), mat || K.mat('paper', { side: THREE.DoubleSide })); return m; };
  K.torus = (R, r, mat, o = {}) => mesh(new THREE.TorusGeometry(R, r, o.rseg ?? 18, o.seg ?? 56, (o.arc ?? 360) * D), mat);
  // outline [[x, y], …] (or a THREE.Shape) pushed to a depth, centred on z
  K.extrude = (pts, depth, mat, o = {}) => {
    const s = pts instanceof THREE.Shape ? pts : new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const b = o.bevel ?? 0, g = new THREE.ExtrudeGeometry(s, { depth: depth - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: o.seg ?? 16 });
    g.translate(0, 0, -(depth - 2 * b) / 2); return mesh(g, mat);
  };
  K.tube = (pts, r, mat, o = {}) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), !!o.closed), o.seg ?? 64, r, 12, !!o.closed), mat);
  K.plane = (w, h, mat) => mesh(new THREE.PlaneGeometry(w, h), mat || K.basic('ink'));
  // rounded plate, painted front: face = (g, w, h) painter over the whole front, in px (res px on the long side)
  K.slab = (w, h, d, o = {}) => {
    const r = o.r ?? Math.min(w, h) * 0.08, G = new THREE.Group(), body = K.extrude(rrect(w, h, r), d, K.mat(o.side ?? 'paper', { rough: o.rough ?? 0.45, clear: o.clear }), { bevel: Math.min(d * 0.25, r * 0.5) });
    G.add(body);
    const face = (fn, z, flip) => { const res = o.res ?? 768, k = res / Math.max(w, h), t = K.paint(w * k, h * k, (g, W, H) => { g.save(); const R = r * k * 0.9; g.beginPath(); g.roundRect(0, 0, W, H, R); g.clip(); fn(g, W, H, K); g.restore(); }); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: o.rough ?? 0.45, transparent: true, alphaTest: 0.5 })); m.position.z = z; if (flip) m.rotation.y = Math.PI; G.add(m); };
    if (o.face) face(o.face, d / 2 + 0.002, false);
    if (o.back) face(o.back, -d / 2 - 0.002, true);
    return G;
  };
  // round plate lying in the xy plane (faces +z), painted front
  K.disc = (r, d, o = {}) => {
    const G = new THREE.Group(), body = K.cyl(r, d, K.mat(o.side ?? 'paper', { rough: o.rough ?? 0.4, metal: o.metal ?? 0 })); body.rotation.x = Math.PI / 2; G.add(body);
    const face = (fn, z, flip) => { const res = o.res ?? 768, t = K.paint(res, res, (g, W, H) => { g.save(); g.beginPath(); g.arc(W / 2, H / 2, W / 2, 0, 7); g.clip(); fn(g, W, H, K); g.restore(); }); const m = new THREE.Mesh(new THREE.CircleGeometry(r * 0.985, 64), new THREE.MeshStandardMaterial({ map: t, roughness: o.rough ?? 0.4 })); m.position.z = z; if (flip) m.rotation.y = Math.PI; G.add(m); };
    if (o.face) face(o.face, d / 2 + 0.002, false);
    if (o.back) face(o.back, -d / 2 - 0.002, true);
    return G;
  };
  K.group = (...kids) => { const G = new THREE.Group(); for (const k of kids.flat()) if (k) G.add(k); return G; };
  K.at = (obj, at = [0, 0, 0], rot = [0, 0, 0], s) => { obj.position.set(...at); obj.rotation.set(rot[0] * D, rot[1] * D, rot[2] * D); if (Array.isArray(s)) obj.scale.set(...s); else if (s != null) obj.scale.setScalar(s); return obj; };

  // ---- painters: flat graphic fills for pictures, strips and faces. All take (g, w, h, options) and use palette names.
  const c = (n) => K.css(n);
  K.tex = {
    fill: (g, w, h, color = 'paper') => { g.fillStyle = c(color); g.fillRect(0, 0, w, h); },
    stripes: (g, w, h, { colors = ['ink', 'paper'], n = 12, angle = 0 } = {}) => { g.save(); g.translate(w / 2, h / 2); g.rotate(angle * D); const L = Math.hypot(w, h), s = L / n; for (let i = 0; i < n; i++) { g.fillStyle = c(colors[i % colors.length]); g.fillRect(-L / 2 + i * s, -L / 2, s + 1, L); } g.restore(); },
    checker: (g, w, h, { colors = ['paper', 'ink'], n = 8 } = {}) => { const s = w / n; for (let y = 0; y * s < h; y++) for (let x = 0; x < n; x++) { g.fillStyle = c(colors[(x + y) % 2]); g.fillRect(x * s, y * s, s + 1, s + 1); } },
    dots: (g, w, h, { bg = 'paper', color = 'ink', n = 14, r = 0.3, stagger = true } = {}) => { g.fillStyle = c(bg); g.fillRect(0, 0, w, h); g.fillStyle = c(color); const s = w / n; for (let y = 0; y * s < h + s; y++) for (let x = -1; x <= n; x++) { g.beginPath(); g.arc((x + 0.5 + (stagger && y % 2 ? 0.5 : 0)) * s, (y + 0.5) * s, s * r, 0, 7); g.fill(); } },
    // dots that grow along a direction: the printed-photo stand-in
    halftone: (g, w, h, { bg = 'paper', color = 'ink', n = 28, angle = 90, from = 0.05, to = 0.62 } = {}) => { g.fillStyle = c(bg); g.fillRect(0, 0, w, h); g.fillStyle = c(color); const s = w / n, a = angle * D, dx = Math.cos(a), dy = Math.sin(a); for (let y = 0; y * s < h + s; y++) for (let x = -1; x <= n; x++) { const px = (x + 0.5 + (y % 2 ? 0.5 : 0)) * s, py = (y + 0.5) * s, k = Math.max(0, Math.min(1, ((px / w - 0.5) * dx + (py / h - 0.5) * dy) + 0.5)); g.beginPath(); g.arc(px, py, s * (from + (to - from) * k), 0, 7); g.fill(); } },
    grid: (g, w, h, { bg = 'paper', color = 'ink', n = 10, lw = 0.06 } = {}) => { g.fillStyle = c(bg); g.fillRect(0, 0, w, h); g.fillStyle = c(color); const s = w / n, t = s * lw; for (let x = 0; x <= n; x++) g.fillRect(x * s - t / 2, 0, t, h); for (let y = 0; y * s <= h; y++) g.fillRect(0, y * s - t / 2, w, t); },
    waves: (g, w, h, { bg = 'paper', color = 'ink', n = 10, amp = 0.35, freq = 3, lw = 0.4 } = {}) => { g.fillStyle = c(bg); g.fillRect(0, 0, w, h); g.strokeStyle = c(color); const s = h / n; g.lineWidth = s * lw; g.lineCap = 'round'; for (let i = -1; i <= n; i++) { g.beginPath(); for (let x = -10; x <= w + 10; x += 6) { const y = (i + 0.5) * s + Math.sin((x / w) * freq * 6.283 + i * 0.9) * s * amp; x < 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); } },
    // scattered marks: grain on a surface, seeds, crumbs, static
    speckle: (g, w, h, { bg = 'paper', color = 'ink', n = 900, size = [0.002, 0.008], seed = 7, long = 1 } = {}) => { g.fillStyle = c(bg); g.fillRect(0, 0, w, h); g.fillStyle = c(color); const r = rng(seed); for (let i = 0; i < n; i++) { const s = (size[0] + (size[1] - size[0]) * r()) * w; g.save(); g.translate(r() * w, r() * h); g.rotate(r() * 6.283); g.beginPath(); g.ellipse(0, 0, s * long, s, 0, 0, 7); g.fill(); g.restore(); } },
    // n vertical bands, each its own painter: K.tex.bands(g, w, h, [(g, w, h) => …, …]) — the "layers" strip picture
    bands: (g, w, h, painters, { gap = 0 } = {}) => { const s = w / painters.length; painters.forEach((fn, i) => { g.save(); g.beginPath(); g.rect(i * s + gap / 2, 0, s - gap, h); g.clip(); g.translate(i * s, 0); fn(g, s, h, K); g.restore(); }); },
  };
  return K;
}

// a small studio to reflect: soft top light, a strip each side, a dark floor — gives the cups, steel and gloss their highlights
export function studioEnv(renderer) {
  const s = new THREE.Scene(), box = (w, h, d, x, y, z, v) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v), side: THREE.DoubleSide })); m.position.set(x, y, z); s.add(m); };
  const room = new THREE.Mesh(new THREE.BoxGeometry(40, 24, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.42, 0.42, 0.41), side: THREE.BackSide })); s.add(room);
  box(16, 0.2, 12, 0, 11.5, 2, 3.2); box(0.2, 12, 9, -19.5, 3, 4, 3); box(0.2, 9, 5, 19.5, 2, -6, 2); box(14, 7, 0.2, 2, 4, 19.5, 1.6); box(40, 0.2, 40, 0, -11.8, 0, 0.3);
  const p = new THREE.PMREMGenerator(renderer), t = p.fromScene(s, 0.035).texture; p.dispose();
  s.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return t;
}
