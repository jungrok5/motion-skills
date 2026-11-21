// manga-background-3d · kit.js — the Stage: a 3D set built from code. Units are metres, y is up, +z points at the
// default camera. Every primitive sits on its `pos` (y = its bottom) unless noted. A primitive carries what the
// manga renderer needs: its grey tone (1 = paper white … 0 = ink), a flag (glass / light / sign / ink), and how its
// edges are inked. Props (desk, window, building, pole …) live in props.js and are built from these primitives;
// a piece adds its own props the same way in its scenes.js.
import * as THREE from 'three';
import { rng, DEG } from './core.js';

export const FLAG = { solid: 0, glass: 1, light: 2, sign: 3, ink: 4 };
const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

export class Stage {
  constructor(o = {}) {
    this.seed = o.seed ?? 1;
    this.rand = rng(this.seed);
    this.mood = o.mood ?? 'day';            // 'day' | 'dusk' | 'night' — sky, ambient light, glow
    this.prims = [];                        // meshes (world-space geometry + manga attributes)
    this.lines = [];                        // stroke-only polylines (wires, cables, cracks, rails)
    this.lights = [];                       // point lights (night): {pos, intensity, distance}
    this.models = [];                       // GLB requests, loaded by the engine
    this.sunOpt = null;
    this.ambient = o.ambient ?? null;       // null → by mood
    this.stack = [new THREE.Matrix4()];
    this.font = o.font ?? '"Gaegu", "Noto Sans KR", sans-serif';
  }
  get M() { return this.stack[this.stack.length - 1]; }

  // ── transforms ────────────────────────────────────────────────────────────────────────────────
  // at([x,y,z], rotYdeg, fn, scale) — build fn's children in a moved / turned frame
  at(pos, rotY, fn, scale = 1) {
    if (typeof rotY === 'function') { scale = fn ?? 1; fn = rotY; rotY = 0; }
    const m = new THREE.Matrix4().compose(V3(pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (rotY || 0) * DEG, 0)), new THREE.Vector3(scale, scale, scale));
    this.stack.push(this.M.clone().multiply(m));
    try { fn(this); } finally { this.stack.pop(); }
    return this;
  }
  // a point in the current frame → world [x,y,z]
  world(p) { return V3(p).applyMatrix4(this.M).toArray(); }

  _local(o, pos) {
    const m = new THREE.Matrix4();
    const r = o.rot || [0, o.ry || 0, 0];
    m.makeRotationFromEuler(new THREE.Euler(r[0] * DEG, r[1] * DEG, r[2] * DEG, 'YXZ'));
    m.setPosition(pos[0], pos[1], pos[2]);
    return this.M.clone().multiply(m);
  }
  _add(geo, pos, o = {}) {
    geo.applyMatrix4(this._local(o, pos));
    if (geo.index) geo = geo.toNonIndexed();
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv', ...(o.beam ? ['color'] : [])].includes(k)) geo.deleteAttribute(k);
    const flag = typeof o.flag === 'string' ? FLAG[o.flag] : (o.flag ?? (o.map ? FLAG.sign : FLAG.solid));
    const p = {
      id: this.prims.length, geo, flag,
      tone: o.tone ?? (flag === FLAG.ink ? 0.1 : 1),
      map: o.map || null,
      lines: o.lines ?? 'all',              // 'all' | 'outline' (silhouettes + boundaries only) | 'none'
      weight: o.weight ?? 1,                // stroke weight multiplier
      crease: o.crease ?? 32,               // degrees: an edge sharper than this is always inked
      detail: !!o.detail,                   // small things: thinner lines, dropped when far
      cast: o.cast ?? true, receive: o.receive ?? true,
      double: !!o.double,                   // seen from both sides (cloth, paper, planes)
      see: !!o.see,                         // see-through glass: what is behind it shows and is inked
      beam: !!o.beam,                       // a shaft of light: additive, fading, steps down through the tones
    };
    this.prims.push(p);
    return p;
  }

  // ── primitives ────────────────────────────────────────────────────────────────────────────────
  box(pos, [w, h, d], o = {}) { return this._add(new THREE.BoxGeometry(w, h, d).translate(0, o.center ? 0 : h / 2, 0), pos, o); }
  // cylinder / frustum / cone: r = bottom radius, o.r2 = top radius, o.seg, o.open (no caps), o.center (centred on pos)
  cyl(pos, r, h, o = {}) { return this._add(new THREE.CylinderGeometry(o.r2 ?? r, r, h, o.seg ?? 16, 1, !!o.open).translate(0, o.center ? 0 : h / 2, 0), pos, { crease: 40, ...o }); }
  cone(pos, r, h, o = {}) { return this.cyl(pos, r, h, { ...o, r2: 0 }); }
  sphere(pos, r, o = {}) { return this._add(new THREE.SphereGeometry(r, o.seg ?? 14, o.seg2 ?? 10), pos, { crease: 50, ...o }); }
  // torus lying flat (a ring of rope, a tyre on its side): R = ring radius, r = tube radius
  torus(pos, R, r, o = {}) { return this._add(new THREE.TorusGeometry(R, r, o.tube ?? 6, o.seg ?? 18).rotateX(-Math.PI / 2).translate(0, r, 0), pos, { crease: 50, ...o }); }
  // vertical plane facing +z (posters, cloth, paper); o.floor → lying flat, centred on pos
  plane(pos, [w, h], o = {}) {
    const g = new THREE.PlaneGeometry(w, h);
    if (o.floor) g.rotateX(-Math.PI / 2); else g.translate(0, h / 2, 0);
    return this._add(g, pos, { cast: false, double: true, ...o });
  }
  // a profile in XY (metres) extruded along +z by depth (o.centerZ centres it)
  extrude(pos, pts, depth, o = {}) {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))), { depth, bevelEnabled: false, curveSegments: o.curve ?? 6 });
    if (o.centerZ) g.translate(0, 0, -depth / 2);
    return this._add(g, pos, o);
  }
  // a floor plan in XZ ([x, z] points) given thickness upward: floors, counters, platforms of any shape
  slab(pos, pts, thick, o = {}) {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], -p[1]))), { depth: thick, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return this._add(g, pos, o);
  }
  // turned shapes: profile [[radius, y], …] from bottom to top (bottles, vases, lamps, hulls)
  lathe(pos, profile, o = {}) { return this._add(new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(Math.max(p[0], 0.0001), p[1])), o.seg ?? 18), pos, { crease: 45, ...o }); }
  // any THREE.BufferGeometry you made yourself
  mesh(pos, geometry, o = {}) { return this._add(geometry, pos, o); }

  // a stroke-only polyline in the current frame: wires, cables, cracks, rope, a crack in plaster.
  // It is hidden where geometry is in front of it, like every other line. o.sag droops a 2-point line (metres).
  line(points, o = {}) {
    let pts = points;
    if (o.sag && points.length === 2) {
      const [a, b] = points, n = o.seg ?? 16; pts = [];
      for (let i = 0; i <= n; i++) { const t = i / n; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - o.sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]); }
    }
    this.lines.push({ id: this.lines.length, pts: pts.map(p => this.world(p)), weight: o.weight ?? 0.8, closed: !!o.closed });
  }

  // a board with lettering: shop signs, posters, route numbers, labels. The text is part of the set — it moves with
  // the camera and is drawn in the tone layer. o.vertical stacks the letters, o.bg / o.ink are tones, o.board adds depth.
  sign(pos, [w, h], text, o = {}) {
    const px = 256, cw = Math.max(16, Math.round(px * w)), ch = Math.max(16, Math.round(px * h));
    const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(cw, ch) : Object.assign(document.createElement('canvas'), { width: cw, height: ch });
    const g = cv.getContext('2d');
    const bg = o.bg ?? 1, ink = o.ink ?? 0.08, sh = v => `rgb(${v * 255 | 0},${v * 255 | 0},${v * 255 | 0})`;
    g.fillStyle = sh(bg); g.fillRect(0, 0, cw, ch);
    g.fillStyle = sh(ink); g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = String(text).split('\n');
    if (o.vertical) {
      const chars = [...lines[0]], fs = Math.min(cw * 0.78, (ch * 0.9) / chars.length);
      g.font = `700 ${fs}px ${o.font || this.font}`;
      chars.forEach((c, i) => g.fillText(c, cw / 2, ch * 0.05 + fs * (i + 0.5) * (0.9 * ch / (fs * chars.length))));
    } else {
      let fs = (ch * 0.8) / lines.length;
      g.font = `700 ${fs}px ${o.font || this.font}`;
      const widest = Math.max(...lines.map(l => g.measureText(l).width));
      if (widest > cw * 0.88) fs *= (cw * 0.88) / widest;
      g.font = `700 ${fs}px ${o.font || this.font}`;
      lines.forEach((l, i) => g.fillText(l, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * fs * 1.08));
    }
    if (o.frame !== false) { g.strokeStyle = sh(ink); g.lineWidth = Math.max(2, ch * 0.03); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, cw - g.lineWidth, ch - g.lineWidth); }
    const d = o.board ?? 0.04;
    const signText = { text: String(text), font: o.font || this.font };
    if (d > 0) this.box([pos[0], pos[1], pos[2] - d / 2 - 0.002], [w, h, d], { ry: o.ry, rot: o.rot, tone: o.boardTone ?? bg, lines: 'all', weight: o.weight });
    const p = this.plane([pos[0], pos[1], pos[2] + 0.001], [w, h], { ry: o.ry, rot: o.rot, map: cv, lines: d > 0 ? 'none' : 'all', tone: 1, cast: false });
    p.text = signText;
    return p;
  }

  // a grid of seam lines on a floor, ceiling or wall: tiles, ceiling boards, panel joints. [w, d] centred on pos;
  // o.plane 'floor' (default, faces up) | 'ceiling' | 'wall' (in the current frame's x–y plane, facing +z)
  grid(pos, [w, d], step, o = {}) {
    const [x, y, z] = pos, sx = o.stepY ?? step, wt = o.weight ?? 0.45, pl = o.plane ?? 'floor';
    const P = (a, b) => pl === 'wall' ? [x + a, y + b, z + 0.004] : [x + a, y + (pl === 'ceiling' ? -0.004 : 0.004), z + b];
    const nx = Math.round(w / step), nz = Math.round(d / sx);
    for (let i = 1; i < nx; i++) this.line([P(-w / 2 + i * step, -d / 2), P(-w / 2 + i * step, d / 2)], { weight: wt });
    for (let j = 1; j < nz; j++) this.line([P(-w / 2, -d / 2 + j * sx), P(w / 2, -d / 2 + j * sx)], { weight: wt });
  }

  // ── light ─────────────────────────────────────────────────────────────────────────────────────
  // the key light. dir points TOWARDS the sun; area = {center, radius} is what its shadows cover.
  sun(o = {}) { this.sunOpt = { dir: o.dir ?? [-0.5, 1, 0.35], strength: o.strength ?? null, area: o.area ?? { center: [0, 0, 0], radius: 12 }, shadow: o.shadow ?? true }; return this; }
  // a point light (lamps at night light what is near them). Keep a scene to ≤ 8.
  light(pos, o = {}) { this.lights.push({ pos: this.world(pos), intensity: o.intensity ?? 1, distance: o.distance ?? 6 }); return this; }
  // a glowing thing: bulbs, lanterns, lit windows, screens. It is white in the manga layer and blooms at night.
  glow(pos, size, o = {}) {
    const shape = o.shape ?? 'box';
    if (shape === 'sphere') return this.sphere(pos, size, { ...o, flag: 'light', cast: false });
    if (shape === 'cyl') return this.cyl(pos, size[0], size[1], { ...o, flag: 'light', cast: false });
    return this.box(pos, size, { ...o, flag: 'light', cast: false });
  }

  // a shaft of light (a lighthouse beam, a torch, a sunbeam through a window): a cone from pos along the frame's +z,
  // turned by o.ry / o.rot, radius r0 → r1 over length, fading out. It hides nothing; in the manga layer it lifts the
  // tones it crosses by steps, the way screentone is scraped for a beam.
  beam(pos, length, r0, r1, o = {}) {
    const g = new THREE.CylinderGeometry(r1, r0, length, o.seg ?? 24, 16, true).translate(0, length / 2, 0).rotateX(Math.PI / 2);
    const P = g.attributes.position, col = new Float32Array(P.count * 3), s = o.strength ?? 0.55;
    for (let i = 0; i < P.count; i++) { const f = Math.pow(Math.max(0, 1 - P.getZ(i) / length), o.falloff ?? 1.6) * s; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = f; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return this._add(g, pos, { ...o, beam: true, see: true, lines: 'none', cast: false, receive: false });
  }

  // ── outside models ────────────────────────────────────────────────────────────────────────────
  // a GLB (Polyfork CDN, or your own file): inked and toned like everything else. o.tone overrides the
  // tone taken from its colours; o.crease (deg) raises the crease angle for faceted low-poly models.
  model(url, o = {}) { this.models.push({ url, matrix: this._local(o, o.pos ?? [0, 0, 0]).multiply(new THREE.Matrix4().makeScale(o.scale ?? 1, o.scale ?? 1, o.scale ?? 1)), o }); return this; }

  // ── architecture ──────────────────────────────────────────────────────────────────────────────
  // a straight wall from (x0, z0) to (x1, z1), height h, thickness t, with openings along it:
  // [{ at: metres from the start, w, y: sill height, h, kind: 'window' | 'door' | 'hole', ...window/door options }]
  wall(x0, z0, x1, z1, h, o = {}) {
    const t = o.t ?? 0.14, len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(-(z1 - z0), x1 - x0) / DEG;
    const ops = (o.openings || []).map(p => ({ ...p, y: p.y ?? (p.kind === 'door' ? 0 : 0.85), h: p.h ?? (p.kind === 'door' ? 2.05 : 1.2) })).sort((a, b) => a.at - b.at);
    const tone = o.tone ?? 1;
    this.at([x0, o.y ?? 0, z0], ang, () => {
      let cur = 0;
      const piece = (a, b, y0, y1) => { if (b - a > 0.005 && y1 - y0 > 0.005) this.box([(a + b) / 2, y0, 0], [b - a, y1 - y0, t], { tone, lines: o.lines, crease: 20 }); };
      for (const p of ops) {
        const a = p.at - p.w / 2, b = p.at + p.w / 2;
        piece(cur, a, 0, h);
        piece(a, b, 0, p.y);
        piece(a, b, p.y + p.h, h);
        if (p.kind === 'window') this.window([(a + b) / 2, p.y, 0], p.w, p.h, { t, ...p });
        if (p.kind === 'door') this.door([(a + b) / 2, p.y, 0], p.w, p.h, { t, ...p });
        cur = b;
      }
      piece(cur, len, 0, h);
      if (o.skirting !== false && o.skirting) {
        let c = 0;
        for (const p of [...ops.filter(q => q.y < 0.1), { at: len + 1, w: 0 }]) { const a = Math.min(len, p.at - p.w / 2); if (a - c > 0.01) for (const s of [1, -1]) this.box([(c + a) / 2, 0, s * (t / 2 + 0.006)], [a - c, 0.08, 0.012], { tone: o.skirting === true ? 0.86 : o.skirting, detail: true, cast: false }); c = p.at + p.w / 2; }
      }
    });
  }
  // a box room centred on the origin of the current frame: walls n (−z), s (+z), e (+x), w (−x).
  // o.open = ['s'] leaves walls out (the side the camera looks in from); openings: { n: [...], e: [...] } as in wall().
  room(o = {}) {
    const w = o.w ?? 4, d = o.d ?? 4, h = o.h ?? 2.5, t = o.t ?? 0.14, open = o.open ?? [], ops = o.openings ?? {};
    const wt = o.wall ?? 1;
    this.box([0, -0.1, 0], [w + 2 * t, 0.1, d + 2 * t], { tone: o.floor ?? 0.92, crease: 20 });
    if (o.ceiling !== false) this.box([0, h, 0], [w + 2 * t, 0.1, d + 2 * t], { tone: o.ceil ?? 1, cast: false });
    const W = (k, x0, z0, x1, z1) => { if (!open.includes(k)) this.wall(x0, z0, x1, z1, h, { t, tone: o.wallTones?.[k] ?? wt, openings: ops[k], skirting: o.skirting }); };
    W('n', -w / 2 - t, -d / 2 - t / 2, w / 2 + t, -d / 2 - t / 2);
    W('s', w / 2 + t, d / 2 + t / 2, -w / 2 - t, d / 2 + t / 2);
    W('e', w / 2 + t / 2, -d / 2, w / 2 + t / 2, d / 2);
    W('w', -w / 2 - t / 2, d / 2, -w / 2 - t / 2, -d / 2);
  }
  // a window in a wall opening (local frame: x along the wall, z through it). o.panes = [cols, rows], o.frame tone,
  // o.sill true, o.open 0..1 slides the left pane, o.curtain tone.
  window(pos, w, h, o = {}) {
    const t = o.t ?? 0.14, f = o.frameW ?? 0.05, ft = o.frame ?? 0.8, [cols, rows] = o.panes ?? [2, 1];
    this.at(pos, () => {
      this.box([0, 0, 0], [w, f, t + 0.02], { tone: ft });
      this.box([0, h - f, 0], [w, f, t + 0.02], { tone: ft });
      this.box([-w / 2 + f / 2, 0, 0], [f, h, t + 0.02], { tone: ft });
      this.box([w / 2 - f / 2, 0, 0], [f, h, t + 0.02], { tone: ft });
      for (let c = 1; c < cols; c++) this.box([-w / 2 + (w * c) / cols, 0, 0], [f * 0.8, h, 0.05], { tone: ft, detail: true });
      for (let r = 1; r < rows; r++) this.box([0, (h * r) / rows - f * 0.4, 0], [w, f * 0.8, 0.05], { tone: ft, detail: true });
      if (o.glass !== false) this.box([0, f, 0], [w - 2 * f, h - 2 * f, 0.012], { flag: 'glass', lines: 'none', cast: false });
      if (o.sill) this.box([0, -0.035, 0.04], [w + 0.12, 0.04, t + 0.12], { tone: 0.9 });   // its top 5 mm above the opening's floor, never on it
    });
  }
  door(pos, w, h, o = {}) {
    const t = o.t ?? 0.14, f = 0.05;
    this.at(pos, () => {
      this.box([0, h - f, 0], [w, f, t + 0.03], { tone: o.frame ?? 0.85 });
      this.box([-w / 2 + f / 2, 0, 0], [f, h, t + 0.03], { tone: o.frame ?? 0.85 });
      this.box([w / 2 - f / 2, 0, 0], [f, h, t + 0.03], { tone: o.frame ?? 0.85 });
      if (o.leaf !== false) {
        const lw = w - 2 * f, open = (o.open ?? 0) * 80;
        this.at([-lw / 2, 0, 0], -open, () => {
          this.box([lw / 2, 0, 0], [lw, h - f, 0.04], { tone: o.tone ?? 0.82 });
          if (o.glassPanel) this.box([lw / 2, h * 0.45, 0.022], [lw * 0.6, h * 0.4, 0.006], { flag: 'glass', lines: 'all', cast: false });
          this.cyl([lw - 0.08, 0.95, 0.04], 0.018, 0.02, { rot: [90, 0, 0], tone: 0.5, detail: true });
        });
      }
    });
  }
  // straight stairs going up along −z: n steps from pos, each rise × run, width w
  stairs(pos, n, w, rise = 0.17, run = 0.28, o = {}) {
    this.at(pos, () => { for (let i = 0; i < n; i++) this.box([0, 0, -i * run - run / 2], [w, rise * (i + 1), run], { tone: o.tone ?? 0.94, crease: 20 }); });
  }
}
