// perspective-illusion · kit.js — parts at real-world scale (metres) for illustrated scenes: primitives that stand on y,
// canvas textures painted in metres, code-drawn labels in bundled fonts, and street pieces with the detail the corner
// views reveal (buildings with frames, sills, AC units, pipes and roof kit; utility poles with arms, insulators and
// transformers; wires; cones; signs; vending machines; fences; cars; trees). Everything is built inside the current
// group (K.group), so nothing lands on the scene root by accident. New pieces for a scene are written in the scene file
// as functions over K — the kit is not edited per scene.
import { THREE, rng } from "./illusion.js";
const D2R = Math.PI / 180;
export const FONT = { latin: "PI Barlow", kr: "PI Noto KR" };

export function kit(F, opt = {}) {
  const K = { F, THREE, rand: rng(opt.seed ?? 11) };
  let G = F.root;
  const M = (c, o = {}) => F.mat(c, o);
  const tf = (m, x = 0, y = 0, z = 0, o = {}) => {
    m.position.set(x, y, z); m.rotation.set((o.rx ?? 0) * D2R, (o.ry ?? 0) * D2R, (o.rz ?? 0) * D2R, "YXZ");
    if (o.noCast) m.userData.noCast = true;
    G.add(m); return m;
  };
  const geo = {}, unit = (k, make) => (geo[k] ??= make());

  // ---------- groups ----------
  /** build inside g: K.into(g, () => { K.box(...) }) */
  K.into = (g, fn) => { const p = G; G = g; try { fn(g); } finally { G = p; } return g; };
  /** a new group at { x, y, z, ry (deg), s } in the current group, filled by fn */
  K.group = (o, fn) => {
    const g = new THREE.Group(); g.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0); g.rotation.y = (o.ry ?? 0) * D2R; if (o.s) g.scale.setScalar(o.s);
    if (o.name) g.name = o.name; G.add(g); return fn ? K.into(g, fn) : g;
  };

  // ---------- primitives (all stand on y; colours are CSS strings or F.mat materials) ----------
  /** a box w × h × d standing on y, centred on x / z. o: { rx, ry, rz, ink, map, glow, noCast } */
  K.box = (w, h, d, c, x = 0, y = 0, z = 0, o = {}) => {
    const g = unit("box", () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
    const m = tf(new THREE.Mesh(g, M(c, o)), x, y, z, o); m.scale.set(w, h, d); return m;
  };
  /** a cylinder of radius r (o.rt: top radius, 0 = cone) and height h standing on y. o: { seg, rx, ry, rz, open } */
  K.cyl = (r, h, c, x = 0, y = 0, z = 0, o = {}) => {
    const seg = o.seg ?? 20, rt = o.rt ?? r;
    const g = rt === r && !o.open ? unit(`cyl${seg}`, () => new THREE.CylinderGeometry(1, 1, 1, seg).translate(0, 0.5, 0)) : new THREE.CylinderGeometry(rt, r, h, seg, 1, !!o.open).translate(0, h / 2, 0);
    const m = tf(new THREE.Mesh(g, M(c, o)), x, y, z, o); if (rt === r && !o.open) m.scale.set(r, h, r); return m;
  };
  /** a ball of radius r centred at y; o.s = [sx, sy, sz] */
  K.ball = (r, c, x = 0, y = 0, z = 0, o = {}) => {
    const g = unit(`ball${o.seg ?? 1}`, () => new THREE.IcosahedronGeometry(1, o.seg ?? 1));
    const m = tf(new THREE.Mesh(g, M(c, o)), x, y, z, o); m.scale.set(r * (o.s?.[0] ?? 1), r * (o.s?.[1] ?? 1), r * (o.s?.[2] ?? 1)); return m;
  };
  /** a tube through points [[x, y, z], …] */
  K.tube = (pts, r, c, o = {}) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), !!o.closed);
    return tf(new THREE.Mesh(new THREE.TubeGeometry(curve, o.seg ?? Math.max(8, pts.length * 6), r, o.radial ?? 6, !!o.closed), M(c, o)), 0, 0, 0, o);
  };
  /** a sagging wire from a to b (catenary-ish). o: { sag (m), r, c } */
  K.wire = (a, b, o = {}) => {
    const sag = o.sag ?? 0.35, n = 14, pts = [];
    for (let i = 0; i <= n; i++) { const u = i / n; pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - sag * 4 * u * (1 - u), a[2] + (b[2] - a[2]) * u]); }
    return K.tube(pts, o.r ?? 0.016, o.c ?? "#2a2733", { seg: 28, radial: 5, noCast: o.noCast ?? true });
  };
  /** a vertical rectangle w × h facing +z (signs, posters, glass). o: { ry, rx, map, ink, glow, double } */
  K.quad = (w, h, c, x = 0, y = 0, z = 0, o = {}) => {
    const g = unit("quad", () => new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0));
    const m = tf(new THREE.Mesh(g, M(c, { ...o, side: o.double ? "double" : undefined })), x, y, z, o); m.scale.set(w, h, 1); return m;
  };
  /** a horizontal rectangle (x0..x1, z0..z1) at height y, facing up */
  K.slab = (x0, x1, z0, z1, c, y = 0, o = {}) => {
    const g = unit("slab", () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
    const m = tf(new THREE.Mesh(g, M(c, o)), (x0 + x1) / 2, y, (z0 + z1) / 2, o); m.scale.set(x1 - x0, 1, z1 - z0); return m;
  };
  /** a prism from a 2D outline [[x, y], …] (counter-clockwise) extruded d along z, standing on its own y */
  K.prism = (shape, d, c, x = 0, y = 0, z = 0, o = {}) => {
    const s = new THREE.Shape(shape.map(([a, b]) => new THREE.Vector2(a, b)));
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }).translate(0, 0, -d / 2);
    return tf(new THREE.Mesh(g, M(c, o)), x, y, z, o);
  };

  // ---------- textures and labels ----------
  /** a canvas texture: paint(g, w, h). o: { rep: [x, y], nearest } */
  K.tex = (w, h, paint, o = {}) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h; paint(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    if (o.rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...o.rep); }
    if (o.nearest) t.magFilter = THREE.NearestFilter;
    return t;
  };
  /** load the bundled fonts (await before painting any label) */
  K.fonts = async () => {
    const base = new URL("./fonts/", import.meta.url);
    const faces = [new FontFace(FONT.latin, `url(${new URL("BarlowCondensed-700.woff2", base)})`), new FontFace(FONT.kr, `url(${new URL("NotoSansKR-500.woff2", base)})`)];
    for (const f of faces) { try { document.fonts.add(await f.load()); } catch (e) { console.warn("font failed:", f.family, e.message); } }
  };
  /** a text texture. o: { w, h (px), bg, fg, font: "latin" | "kr" | CSS family, size (× h), lines: [..] (or text with \n),
   *  border: colour, round, align, pad, stroke } */
  K.label = (text, o = {}) => K.tex(o.w ?? 512, o.h ?? 128, (g, w, h) => {
    const r = o.round ?? 0;
    if (o.bg) { g.fillStyle = o.bg; g.beginPath(); g.roundRect(0, 0, w, h, r * h); g.fill(); }
    if (o.border) { g.strokeStyle = o.border; g.lineWidth = h * (o.borderW ?? 0.06); g.beginPath(); g.roundRect(g.lineWidth / 2 + h * 0.04, g.lineWidth / 2 + h * 0.04, w - g.lineWidth - h * 0.08, h - g.lineWidth - h * 0.08, r * h); g.stroke(); }
    const lines = Array.isArray(o.lines) ? o.lines : String(text).split("\n");
    const fam = o.font === "kr" ? FONT.kr : o.font === "latin" || !o.font ? FONT.latin : o.font;
    let size = (o.size ?? 0.62) * h / lines.length;
    g.fillStyle = o.fg ?? "#1b1b22"; g.textBaseline = "middle"; g.textAlign = o.align ?? "center";
    const pad = (o.pad ?? 0.08) * w, x = g.textAlign === "left" ? pad : g.textAlign === "right" ? w - pad : w / 2;
    g.font = `${o.weight ?? 700} ${size}px "${fam}", sans-serif`;
    const widest = Math.max(...lines.map((l) => g.measureText(l).width));
    if (widest > w - 2 * pad) { size *= (w - 2 * pad) / widest; g.font = `${o.weight ?? 700} ${size}px "${fam}", sans-serif`; }
    lines.forEach((l, i) => g.fillText(l, x, h * ((i + 0.5) / lines.length) * (o.spread ?? 1) + h * (1 - (o.spread ?? 1)) / 2));
  });
  /** paint a ground plane in metres: K.ground({ x0, x1, z0, z1, ppm: 48, base: "#555", paint: (g, P) => …, y })
   *  P.x(m) / P.z(m) → px, P.s(m) → px length. One plane per surface: markings are painted on, never stacked. */
  K.ground = (o) => {
    const ppm = o.ppm ?? 40, W = Math.round((o.x1 - o.x0) * ppm), H = Math.round((o.z1 - o.z0) * ppm);
    const P = { x: (x) => (x - o.x0) * ppm, z: (z) => (z - o.z0) * ppm, s: (m) => m * ppm, ppm };
    const t = K.tex(Math.min(W, 8192), Math.min(H, 8192), (g, w, h) => {
      g.scale(w / W, h / H); g.fillStyle = o.base ?? "#55575f"; g.fillRect(0, 0, W, H); o.paint?.(g, P, K.rand);
    });
    return K.slab(o.x0, o.x1, o.z0, o.z1, "#ffffff", o.y ?? 0, { map: t, ink: o.ink ?? 1 });
  };
  /** asphalt grain + cracks for K.ground paint */
  K.asphalt = (g, P, r, o = {}) => {
    const W = g.canvas.width * 4, H = g.canvas.height * 4;
    for (let i = 0; i < (o.n ?? 900); i++) { const x = r() * W, y = r() * H, L = P.s(0.3 + r() * 1.2), a = (r() - 0.5) * 0.6; g.strokeStyle = r() > 0.5 ? "rgba(255,255,255,.08)" : "rgba(10,10,25,.12)"; g.lineWidth = P.s(0.02 + r() * 0.03); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
  };

  // ---------- signs ----------
  /** a board with a code-drawn face. o: { x, y (bottom), z, w, h, ry, d (thickness), text | map, bg, fg, font, frame,
   *  back (colour of the back), post: height of a post under it (0 = none), both: same face on the back } */
  K.sign = (o) => K.group({ x: o.x, y: 0, z: o.z, ry: o.ry }, () => {
    const d = o.d ?? 0.05, y = o.y ?? 2;
    const face = o.map ?? K.label(o.text ?? "", { w: o.px ?? 512, h: Math.round((o.px ?? 512) * o.h / o.w), bg: o.bg ?? "#f2f0e8", fg: o.fg, font: o.font, border: o.border, lines: o.lines, size: o.size, round: o.round });
    K.box(o.w + 0.04, o.h + 0.04, d, o.frame ?? "#d8d8dc", 0, y - 0.02, 0);
    K.quad(o.w, o.h, "#ffffff", 0, y, d / 2 + 0.004, { map: face, ink: 0.5 });
    if (o.both) K.quad(o.w, o.h, "#ffffff", 0, y, -d / 2 - 0.004, { map: face, ink: 0.5, ry: 180 });
    if (o.post) K.cyl(0.035, y + 0.02, o.postC ?? "#8d909c", 0, 0, -d / 2 - 0.04);
  });
  /** a traffic sign on a post: shape "round" | "tri" | "diamond" | "rect" | "octagon", face: paint(g, s) on a square canvas */
  K.roadSign = (o) => K.group({ x: o.x, z: o.z, ry: o.ry }, () => {
    const h = o.h ?? 2.5, s = o.size ?? 0.6, y = h - s;
    K.cyl(0.03, h + (o.under ?? 0), "#8b8f9a", 0, 0, -0.04, { seg: 10 });
    const face = K.tex(256, 256, (g, w) => { g.save(); o.face?.(g, w); g.restore(); });
    const shapes = {
      round: () => { const c = new THREE.CircleGeometry(s / 2, 32); return c.translate(0, s / 2, 0); },
      tri: () => new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-s / 2, s * 0.98), new THREE.Vector2(s / 2, s * 0.98), new THREE.Vector2(0, 0.08 * s)])),
      diamond: () => new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(s / 2, s / 2), new THREE.Vector2(0, s), new THREE.Vector2(-s / 2, s / 2)])),
      rect: () => new THREE.PlaneGeometry(s * (o.aspect ?? 1), s).translate(0, s / 2, 0),
      octagon: () => new THREE.CircleGeometry(s / 2, 8, Math.PI / 8).translate(0, s / 2, 0),
    };
    const g = shapes[o.shape ?? "round"](), uv = g.attributes.uv, p = g.attributes.position;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (s * (o.aspect ?? 1)) + 0.5, p.getY(i) / s);
    const front = new THREE.Mesh(g, M("#ffffff", { map: face, ink: 0.5 })); tf(front, 0, y, 0.012);
    const back = new THREE.Mesh(g, M(o.back ?? "#9aa0ab")); tf(back, 0, y, -0.012, { ry: 180 });
    K.box(0.05, 0.08, 0.06, "#6f737d", 0, y + s / 2 - 0.04, -0.03);
  });

  // ---------- buildings ----------
  /** a building with its front at local +z. o: { x, z, ry, w, d, floors, storey, color, trim, glass, base,
   *  win: { cols, w, h, side (cols on the sides), back }, sills, ac (count), pipes, bands,
   *  roof: { parapet, tank, rail, antenna, slope: { h, c } }, shop: { color, shutter, glass, awning, sign: text | map,
   *  signBg, signFg, font }, door: { x, c } } → the group. The ground floor is a shop when o.shop is given. */
  K.building = (o) => K.group({ x: o.x, z: o.z, ry: o.ry, name: o.name ?? "building" }, () => {
    const w = o.w ?? 8, d = o.d ?? 8, st = o.storey ?? 3, fl = o.floors ?? 3, H = fl * st + (o.extra ?? 0.4);
    const C = { wall: o.color ?? "#c9c4b8", trim: o.trim ?? "#e9e6dd", glass: o.glass ?? "#3a4560", base: o.base ?? "#8b8780", dark: "#2d2b33" };
    K.box(w, H, d, C.wall, 0, 0, 0);
    K.box(w + 0.06, 0.45, d + 0.06, C.base, 0, 0, 0);                                    // plinth
    const win = { cols: Math.max(1, Math.round(w / 2.6)), w: 1.2, h: 1.3, ...(o.win ?? {}) };
    const r = K.rand;
    // one window on the face that looks along n (local frame: u across the face, the face at depth f)
    const face = (side, cols, len) => {
      const at = (u, y, z) => side === "front" ? [u, y, d / 2 + z] : side === "back" ? [-u, y, -d / 2 - z] : side === "left" ? [-w / 2 - z, y, u] : [w / 2 + z, y, -u];
      const ry = side === "front" ? 0 : side === "back" ? 180 : side === "left" ? -90 : 90;
      const put = (fn, u, y, z, ...a) => { const [px, py, pz] = at(u, y, z); fn(...a, px, py, pz, { ry }); };
      const one = (u, y) => {
        const ww = win.w, wh = win.h, f = 0.07;
        put((...a) => K.box(ww - 0.1, wh - 0.1, 0.03, C.glass, ...a.slice(0, 3), a[3]), u, y + 0.05, 0.005);
        put((...a) => K.box(ww, f, 0.12, C.trim, ...a), u, y + wh - f, 0.03);            // head
        put((...a) => K.box(ww + 0.16, 0.08, 0.2, C.trim, ...a), u, y - 0.08, 0.06);        // sill
        put((...a) => K.box(f, wh, 0.12, C.trim, ...a), u - ww / 2 + f / 2, y, 0.03);
        put((...a) => K.box(f, wh, 0.12, C.trim, ...a), u + ww / 2 - f / 2, y, 0.03);
        if (win.mullion !== false) put((...a) => K.box(0.05, wh, 0.08, C.trim, ...a), u, y, 0.03);
        if (r() < (o.blinds ?? 0.35)) put((...a) => K.box(ww - 0.2, wh * (0.3 + r() * 0.4), 0.02, o.blindC ?? "#e7e0cf", ...a), u, y + wh * 0.5, 0.025);
      };
      for (let f = o.shop && side === "front" ? 1 : 0; f < fl; f++) for (let i = 0; i < cols; i++) {
        const u = -len / 2 + (len / cols) * (i + 0.5); one(u, f * st + 0.9);
      }
      if (o.bands !== false) for (let f = 1; f < fl; f++) put((...a) => K.box(len + 0.04, 0.14, 0.06, C.trim, ...a), 0, f * st - 0.07, 0.01);
    };
    face("front", win.cols, w);
    if (win.side !== 0) { const sc = win.side ?? Math.max(1, Math.round(d / 3.2)); face("left", sc, d); face("right", sc, d); }
    if (win.back) face("back", win.cols, w);
    // AC units under windows and on the sides (the corner views find them)
    for (let i = 0; i < (o.ac ?? 2); i++) {
      const f = 1 + Math.floor(r() * Math.max(1, fl - 1)), side = r() < 0.5 ? -1 : 1, onSide = r() < 0.5;
      if (onSide) K.ac(side * (w / 2 + 0.17), f * st + 0.15, (r() - 0.5) * d * 0.6, side * 90);
      else K.ac((r() - 0.5) * (w - 1.2), f * st + 0.15, d / 2 + 0.17, 0);
    }
    if (o.pipes !== false) { const px = (w / 2 - 0.15) * (r() < 0.5 ? -1 : 1); K.cyl(0.05, H, "#9a9aa4", px, 0, d / 2 + 0.07, { seg: 10 }); }
    // the ground floor
    if (o.shop) {
      const S = o.shop, sh = st - 0.35;
      K.box(w - 0.4, sh - 0.3, 0.06, S.shutter ? "#ffffff" : C.glass, 0, 0.45, d / 2 + 0.02, S.shutter ? { map: K.tex(64, 256, (g, W, Hh) => { g.fillStyle = "#c9ccd2"; g.fillRect(0, 0, W, Hh); g.fillStyle = "#9da1aa"; for (let y = 0; y < Hh; y += 16) g.fillRect(0, y, W, 3); }), ink: 0.5 } : {});
      if (!S.shutter) for (let i = 1; i < 4; i++) K.box(0.07, sh - 0.3, 0.1, C.trim, -w / 2 + 0.2 + ((w - 0.4) / 4) * i, 0.45, d / 2 + 0.05);
      K.box(w, 0.6, 0.18, S.color ?? C.trim, 0, sh, d / 2 + 0.09);
      if (S.sign) K.quad(w * 0.7, 0.46, "#ffffff", 0, sh + 0.07, d / 2 + 0.185, { map: typeof S.sign === "string" ? K.label(S.sign, { w: 1024, h: 128, bg: S.signBg ?? "#f4f1e6", fg: S.signFg ?? "#1d1c24", font: S.font }) : S.sign, ink: 0.5 });
      if (S.awning) K.box(w * 0.9, 0.12, 1.1, S.awning, 0, sh - 0.25, d / 2 + 0.6, { rx: -12 });
    } else if (o.door !== false) {
      const dx = o.door?.x ?? w * 0.25;
      K.box(1.0, 2.15, 0.06, o.door?.c ?? "#6d5b4c", dx, 0.45, d / 2 + 0.02);
      K.box(1.3, 0.1, 0.7, C.trim, dx, 2.65, d / 2 + 0.35);                                // door canopy
    }
    // the roof kit
    const R = o.roof ?? { parapet: true };
    if (R.slope) {
      const sh = R.slope.h ?? 1.6;
      K.prism([[-w / 2 - 0.3, 0], [w / 2 + 0.3, 0], [0, sh]], d + 0.5, R.slope.c ?? "#59545e", 0, H, 0);
    } else if (R.parapet !== false) {
      const t = 0.15, ph = 0.5, pc = o.trim ?? C.trim;
      K.box(w, ph, t, pc, 0, H, d / 2 - t / 2); K.box(w, ph, t, pc, 0, H, -d / 2 + t / 2);
      K.box(t, ph, d, pc, -w / 2 + t / 2, H, 0); K.box(t, ph, d, pc, w / 2 - t / 2, H, 0);
    }
    if (R.tank) { const tx = (r() - 0.5) * (w - 3), tz = (r() - 0.5) * (d - 3); K.box(1.6, 0.6, 1.6, "#7f7d86", tx, H, tz); K.cyl(0.7, 1.3, R.tank === true ? "#d9d4c4" : R.tank, tx, H + 0.6, tz); }
    if (R.rail) { for (let x = -w / 2 + 0.3; x <= w / 2 - 0.2; x += 1.2) K.cyl(0.025, 1.0, "#5f6370", x, H + 0.5, d / 2 - 0.4, { seg: 6 }); K.box(w - 0.5, 0.05, 0.05, "#5f6370", 0, H + 1.45, d / 2 - 0.4); }
    if (R.antenna) { const ax = (r() - 0.5) * (w - 2); K.cyl(0.03, 2.4, "#4a4c57", ax, H, -d / 4, { seg: 6 }); for (let k = 0; k < 4; k++) K.box(0.9 - k * 0.15, 0.03, 0.03, "#4a4c57", ax, H + 1.4 + k * 0.25, -d / 4); }
    return H;
  });
  /** an air-conditioner unit on a wall (x, y, z = the unit's centre on the wall face, ry = facing) */
  K.ac = (x, y, z, ry = 0) => K.group({ x, y, z, ry }, () => {
    K.box(0.8, 0.56, 0.3, "#e4e3dd", 0, 0, 0);
    K.cyl(0.19, 0.02, "#4a4955", 0.12, 0.09, 0.15, { rx: 90, seg: 20 });
    K.box(0.6, 0.04, 0.32, "#c3c2bb", 0, -0.04, 0);
  });

  // ---------- street furniture ----------
  /** a concrete utility pole: tapered, crossarm with insulators, an optional transformer and street light.
   *  o: { x, z, h, ry, arm: true, transformer, lamp, band } → { group, tops: [[x, y, z], …] } (wire points, world) */
  K.pole = (o) => {
    const h = o.h ?? 9, tops = [];
    const g = K.group({ x: o.x, z: o.z, ry: o.ry, name: "pole" }, () => {
      K.cyl(0.17, h, o.c ?? "#a8a5a0", 0, 0, 0, { rt: 0.12, seg: 16 });
      if (o.band !== false) { K.cyl(0.175, 0.25, "#f2c230", 0, 1.6, 0, { seg: 16 }); K.cyl(0.176, 0.25, "#26232c", 0, 1.85, 0, { seg: 16 }); }
      for (let y = 2.6; y < h - 1.2; y += 0.45) K.box(0.24, 0.03, 0.03, "#6b6d75", 0, y, 0, { ry: (y * 90) % 180, noCast: true });   // step bolts
      if (o.arm !== false) {
        K.box(1.9, 0.12, 0.12, "#8b8e98", 0, h - 0.6, 0);
        for (const x of [-0.8, -0.3, 0.3, 0.8]) { K.cyl(0.05, 0.14, "#f1efe8", x, h - 0.48, 0, { seg: 8, noCast: true }); tops.push([x, h - 0.32, 0]); }
      }
      if (o.transformer) { K.cyl(0.32, 0.9, "#9aa0a6", 0.42, h - 2.9, 0, { seg: 18 }); K.box(0.12, 0.5, 0.12, "#7b7f87", 0.25, h - 2.7, 0); }
      if (o.lamp) { K.tube([[0, h - 2, 0], [0.5, h - 1.85, 0.1], [1.1, h - 1.9, 0.2]], 0.035, "#7b7f87"); K.box(0.42, 0.12, 0.22, "#5a5e68", 1.15, h - 2.05, 0.2); K.box(0.36, 0.03, 0.18, "#fff7d8", 1.15, h - 2.08, 0.2, { glow: true }); }
      if (o.plate) K.quad(0.22, 0.6, "#ffffff", 0, 2.3, 0.165, { map: K.label(o.plate, { w: 96, h: 256, bg: "#f4f3ee", fg: "#1f1f28", lines: o.plate.split(" "), size: 0.7, font: o.font }), ink: 0.5 });
    });
    g.updateMatrixWorld(true);
    return { group: g, tops: tops.map((p) => g.localToWorld(new THREE.Vector3(...p)).toArray()) };
  };
  /** wires between consecutive poles: K.wires([poleA, poleB, …], { sag, pick: [0, 1, 2, 3] }) */
  K.wires = (poles, o = {}) => {
    const pick = o.pick ?? [0, 1, 2, 3];
    for (let i = 0; i < poles.length - 1; i++) for (const k of pick) { const a = poles[i].tops[k], b = poles[i + 1].tops[k]; if (a && b) K.wire(a, b, { sag: (o.sag ?? 0.45) + (k % 2) * 0.08, r: o.r }); }
  };
  /** a traffic cone (returns its group: a good swap object). o: { x, z, c, band, h } */
  K.cone = (o = {}) => K.group({ x: o.x, z: o.z, ry: o.ry, name: "cone" }, () => {
    const h = o.h ?? 0.72;
    K.box(0.4, 0.05, 0.4, o.base ?? "#2e2c34", 0, 0, 0);
    K.cyl(0.15, h, o.c ?? "#f0582a", 0, 0.05, 0, { rt: 0.028, seg: 24 });
    K.cyl(0.11, 0.12, o.band ?? "#f4f2ee", 0, 0.05 + h * 0.42, 0, { rt: 0.088, seg: 24 });
    K.cyl(0.075, 0.08, o.band ?? "#f4f2ee", 0, 0.05 + h * 0.66, 0, { rt: 0.058, seg: 24 });
  });
  /** a vending machine facing +z. o: { x, z, ry, c, rows (drink colours), label } */
  K.vending = (o = {}) => K.group({ x: o.x, z: o.z, ry: o.ry, name: "vending" }, () => {
    const c = o.c ?? "#d9433b";
    K.box(1.0, 1.85, 0.75, c, 0, 0, 0);
    const shelf = K.tex(256, 384, (g, W, H) => {
      g.fillStyle = "#f6f4ee"; g.fillRect(0, 0, W, H); const rows = 4, cols = 6, cs = o.rows ?? ["#e9483b", "#2d6fd4", "#f2b22a", "#3aa35a", "#ffffff", "#8a5a3b"];
      for (let j = 0; j < rows; j++) { g.fillStyle = "#d6d3cb"; g.fillRect(0, (j + 1) * H / (rows + 0.6) - 4, W, 6);
        for (let i = 0; i < cols; i++) { g.fillStyle = cs[(i + j * 2) % cs.length]; const x = 10 + i * (W - 20) / cols, y = (j + 0.22) * H / (rows + 0.6); g.beginPath(); g.roundRect(x + 4, y, (W - 20) / cols - 8, H / (rows + 0.6) * 0.66, 6); g.fill(); g.fillStyle = "#26232c"; g.fillRect(x + 10, y + H / (rows + 0.6) * 0.74, 12, 5); } }
    });
    K.quad(0.84, 1.0, "#ffffff", 0, 0.72, 0.377, { map: shelf, ink: 0.5, glow: true });
    K.box(0.84, 0.3, 0.04, "#2d2b33", 0, 0.12, 0.38);                                     // the pick-up slot
    K.box(0.2, 0.32, 0.03, "#e6e4dc", 0.3, 0.42, 0.385);
    if (o.label) K.quad(0.84, 0.18, "#ffffff", 0, 1.72 - 0.02, 0.377, { map: K.label(o.label, { w: 512, h: 96, bg: c, fg: "#ffffff", font: o.font }), ink: 0.5 });
  });
  /** a lidded bin. o: { x, z, c } */
  K.bin = (o = {}) => K.group({ x: o.x, z: o.z, ry: o.ry, name: "bin" }, () => {
    K.cyl(0.26, 0.82, o.c ?? "#3c6e5a", 0, 0, 0, { rt: 0.3, seg: 18 });
    K.cyl(0.32, 0.06, "#2f5848", 0, 0.82, 0, { seg: 18 });
  });
  /** a fence along x from x0 to x1 at z: posts, two rails and pickets. o: { h, c, gap } */
  K.fence = (o) => {
    const h = o.h ?? 1.2, c = o.c ?? "#d7d8dc", len = Math.abs(o.x1 - o.x0), x0 = Math.min(o.x0, o.x1);
    K.group({ x: 0, z: o.z ?? 0, ry: o.ry }, () => {
      for (let x = x0; x <= x0 + len + 1e-6; x += o.post ?? 2) K.box(0.07, h + 0.1, 0.07, o.postC ?? c, x, 0, 0);
      K.box(len, 0.05, 0.05, c, x0 + len / 2, h * 0.85, 0); K.box(len, 0.05, 0.05, c, x0 + len / 2, h * 0.2, 0);
      for (let x = x0 + 0.1; x < x0 + len; x += o.gap ?? 0.16) K.box(0.03, h * 0.8, 0.02, c, x, h * 0.12, 0);
    });
  };
  /** a guard rail (pipes on posts) from x0 to x1 at z */
  K.guard = (o) => {
    const len = Math.abs(o.x1 - o.x0), x0 = Math.min(o.x0, o.x1), c = o.c ?? "#e8e8ea";
    K.group({ x: 0, z: o.z ?? 0, ry: o.ry }, () => {
      for (let x = x0; x <= x0 + len + 1e-6; x += 1.5) K.cyl(0.04, 0.85, c, x, 0, 0, { seg: 10 });
      for (const y of [0.45, 0.8]) K.cyl(0.03, len, c, x0 + len / 2, y, 0, { rz: 90, seg: 10 });
    });
  };
  /** a curved traffic mirror on an orange post */
  K.mirror = (o) => K.group({ x: o.x, z: o.z, ry: o.ry, name: "mirror" }, () => {
    K.cyl(0.04, 2.9, "#e8742c", 0, 0, 0, { seg: 10 });
    K.cyl(0.36, 0.06, "#e8742c", 0, 2.85, 0.1, { rx: 90, seg: 28 });
    K.cyl(0.31, 0.02, "#b9c7d6", 0, 2.85, 0.14, { rx: 90, seg: 28, ink: 0.5 });
  });
  /** a tree: trunk + clumps of foliage. o: { x, z, h, r, c, trunk } */
  K.tree = (o) => K.group({ x: o.x, z: o.z, name: "tree" }, () => {
    const h = o.h ?? 4.5, r = o.r ?? 1.4, rr = rng(o.seed ?? (o.x * 13 + o.z * 7));
    K.cyl(0.13, h * 0.6, o.trunk ?? "#6b5546", 0, 0, 0, { rt: 0.09, seg: 10 });
    for (let i = 0; i < (o.n ?? 5); i++) { const a = rr() * 6.28, k = i === 0 ? 0 : r * 0.55; K.ball(r * (0.55 + rr() * 0.3), o.c ?? "#5f8a4f", Math.cos(a) * k, h * 0.62 + rr() * r * 0.8, Math.sin(a) * k, { seg: 1 }); }
  });
  /** a planter box with a shrub */
  K.planter = (o) => K.group({ x: o.x, z: o.z, ry: o.ry, name: "planter" }, () => {
    K.box(o.w ?? 0.8, 0.45, 0.45, o.c ?? "#b8a58a", 0, 0, 0);
    K.ball(0.32, o.leaf ?? "#5d8a52", -0.15, 0.62, 0, { s: [1, 0.8, 1] }); K.ball(0.26, o.leaf ?? "#5d8a52", 0.2, 0.58, 0.02, { s: [1, 0.85, 1] });
  });
  /** a bench facing +z */
  K.bench = (o) => K.group({ x: o.x, z: o.z, ry: o.ry, name: "bench" }, () => {
    const w = o.w ?? 1.6, c = o.c ?? "#a8744f";
    for (const x of [-w / 2 + 0.15, w / 2 - 0.15]) { K.box(0.06, 0.44, 0.42, "#4f525c", x, 0, 0); K.box(0.06, 0.45, 0.06, "#4f525c", x, 0.44, -0.18); }
    for (const z of [-0.12, 0.02, 0.16]) K.box(w, 0.04, 0.11, c, 0, 0.44, z);
    for (const y of [0.62, 0.78]) K.box(w, 0.1, 0.03, c, 0, y, -0.2);
  });
  /** a small car facing +z (o.ry turns it). o: { x, z, ry, c, glass, kind: "kei" | "sedan" | "van", plate } */
  K.car = (o) => K.group({ x: o.x, z: o.z, ry: o.ry, name: "car" }, () => {
    const kind = o.kind ?? "kei", c = o.c ?? "#3e5fb8", gl = o.glass ?? "#2c3446";
    const L = kind === "sedan" ? 4.5 : kind === "van" ? 4.7 : 3.4, W = kind === "kei" ? 1.48 : 1.75, h0 = 0.32;
    const roof = kind === "van" ? 1.95 : kind === "kei" ? 1.65 : 1.42, belt = kind === "sedan" ? 0.92 : 0.95;
    K.box(W, belt - h0, L, c, 0, h0, 0);
    const cl = kind === "sedan" ? L * 0.5 : L * 0.8, cz = kind === "sedan" ? -0.15 : -L * 0.06;
    K.box(W - 0.12, roof - belt, cl, c, 0, belt, cz);
    K.box(W - 0.1, roof - belt - 0.14, 0.04, gl, 0, belt + 0.06, cz + cl / 2 + 0.01);           // windscreen
    K.box(W - 0.1, roof - belt - 0.14, 0.04, gl, 0, belt + 0.06, cz - cl / 2 - 0.01);
    for (const s of [-1, 1]) K.box(0.04, roof - belt - 0.14, cl - 0.3, gl, s * (W / 2 - 0.05), belt + 0.06, cz);
    for (const s of [-1, 1]) for (const z of [L / 2 - 0.62, -L / 2 + 0.62]) K.cyl(0.3, 0.2, "#26242b", s * (W / 2 - 0.08), 0.3, z, { rz: 90, seg: 18 });
    for (const s of [-1, 1]) { K.box(0.28, 0.14, 0.04, "#fff4d6", s * (W / 2 - 0.25), 0.62, L / 2 + 0.01, { glow: true }); K.box(0.26, 0.12, 0.04, "#d83a33", s * (W / 2 - 0.25), 0.66, -L / 2 - 0.01); }
    K.box(W + 0.04, 0.1, 0.12, "#2e2c34", 0, 0.32, L / 2); K.box(W + 0.04, 0.1, 0.12, "#2e2c34", 0, 0.32, -L / 2);
    if (o.plate) K.quad(0.42, 0.21, "#ffffff", 0, 0.42, L / 2 + 0.065, { map: K.label(o.plate, { w: 256, h: 128, bg: "#f3f1e4", fg: "#1f5a38", border: "#1f5a38", font: o.font }), ink: 0.5 });
  });
  /** a street lamp on a curved arm */
  K.lamp = (o) => K.group({ x: o.x, z: o.z, ry: o.ry, name: "lamp" }, () => {
    const h = o.h ?? 5.5, c = o.c ?? "#5d6170";
    K.cyl(0.07, h, c, 0, 0, 0, { rt: 0.05, seg: 12 });
    K.tube([[0, h - 0.1, 0], [0.25, h + 0.25, 0], [0.75, h + 0.2, 0]], 0.04, c);
    K.box(0.5, 0.14, 0.26, c, 0.85, h + 0.05, 0); K.box(0.42, 0.03, 0.2, "#fff6d6", 0.85, h + 0.03, 0, { glow: true });
  });
  /** a bicycle rack and a parked bicycle, leaning, facing +x */
  K.bike = (o) => K.group({ x: o.x, z: o.z, ry: o.ry, name: "bike" }, () => {
    const c = o.c ?? "#3a6fb0";
    for (const x of [-0.52, 0.52]) K.cyl(0.33, 0.04, "#26242b", x, 0.33, 0, { rx: 90, seg: 22, open: false });
    K.tube([[-0.52, 0.33, 0], [-0.05, 0.75, 0], [0.4, 0.78, 0], [0.52, 0.33, 0]], 0.025, c);
    K.tube([[-0.05, 0.75, 0], [0.02, 0.33, 0], [0.4, 0.78, 0]], 0.025, c);
    K.box(0.22, 0.05, 0.1, "#26242b", -0.08, 0.86, 0); K.tube([[0.45, 0.78, 0], [0.43, 1.0, 0]], 0.022, c); K.box(0.06, 0.03, 0.5, "#26242b", 0.43, 1.0, 0);
    K.box(0.3, 0.22, 0.3, "#c9c2b2", 0.62, 0.8, 0);
  });
  return K;
}
