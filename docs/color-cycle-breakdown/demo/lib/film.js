// color-cycle-breakdown · film.js — the film: a living indexed pixel picture that holds, comes apart into its layers
// as planes in space (each labelled), turns into explainer panels (palette cycling · flow field · wind rig), then
// comes back together. One canvas, Canvas 2D, everything a function of t.
//
//   film({ title, size, art, fps, seed, theme, wind, timing, paint({ pal, layer, kit, rng, W, H, wind }), panels })
//
// The page contract: window.seek(t), DURATION, FPS, SIZE, ART, filmInfo(), __film (measurements for check.mjs),
// __ready. Query: ?render=1 (no player) · ?t=7.5 (open paused there) · ?scale=.5 · ?debug=1.
import { Palette, Layer, makeKit, makeWind, packed, rng, clamp, lerp, smooth, hex, mod, hash } from './pixel.js';

const BASE_W = 1920;
export const THEME = {
  bg: '#0d131a', card: '#141c25', ink: '#e8eef2', dim: '#97a4b0', rule: '#283441', accent: '#86e3d4', glass: 'rgba(30,42,54,.2)',
  mark: ['#3a2c63', '#58449a', '#7b63c6', '#a48fe8', '#d6cbfc'],          // fixed-index slots: dark → light purple
  bones: ['#f3e39a', '#86e3d4', '#f6b48c', '#bba8f2', '#a9e38b', '#f09bb5'],
  arrow: '#86e3d4',
};
export const TIMING = { hold: 3, explode: 1.7, exploded: 1.5, fade: .5, panel: 3.6, back: 1.1, collapse: 1.5, end: 2.6 };
export const FONTS = {
  sans: "CCBSans, CCBKR, system-ui, sans-serif",
  mono: "CCBMono, CCBKR, ui-monospace, monospace",
};
// text roles: size in px at 1920 wide, weight, family — check.mjs reads these sizes
export const TYPE = {
  kicker: { size: 22, weight: 500, family: 'mono', spacing: 3 },
  title: { size: 54, weight: 700, family: 'sans' },
  label: { size: 28, weight: 700, family: 'sans' },
  caption: { size: 26, weight: 500, family: 'sans' },
  slot: { size: 18, weight: 500, family: 'mono', spacing: 1 },
  layer: { size: 30, weight: 700, family: 'sans' },
};

const Q = new URLSearchParams(location.search);

async function loadFonts() {
  const base = new URL('./fonts/', import.meta.url);
  const faces = [
    ['CCBSans', 'Inter-500.woff2', '500'], ['CCBSans', 'Inter-700.woff2', '700'],
    ['CCBKR', 'NotoSansKR-500.woff2', '500'], ['CCBKR', 'NotoSansKR-500.woff2', '700'],
    ['CCBMono', 'JetBrainsMono.woff2', '100 800'],
  ];
  await Promise.all(faces.map(async ([fam, file, w]) => { const f = new FontFace(fam, `url(${new URL(file, base)})`, { weight: w }); await f.load(); document.fonts.add(f); }));
}

export async function film(cfg) {
  const theme = { ...THEME, ...(cfg.theme || {}) };
  const T = { ...TIMING, ...(cfg.timing || {}) };
  const [SW, SH] = cfg.size || [1920, 1080], [W, H] = cfg.art || [320, 180];
  const scale = +(Q.get('scale') || 1), CW = Math.round(SW * scale), CH = Math.round(SH * scale), U = CW / BASE_W;
  const FPS = cfg.fps || 30, seed = cfg.seed ?? 1;
  const canvas = document.getElementById('film'); canvas.width = CW; canvas.height = CH;
  const c = canvas.getContext('2d', { alpha: false });

  // ── the picture ──
  const pal = new Palette(), layers = [], wind = makeWind({ seed, ...(cfg.wind || {}) });
  const pctx = { W, H, pal, flows: [], rigs: [], wind };
  const kit = makeKit(pctx);
  const layer = (name, o = {}) => { if (layers.some(l => l.name === name)) throw new Error(`layer "${name}" twice`); const L = new Layer(name, W, H, o); layers.push(L); return L; };
  cfg.paint({ pal, layer, kit, rng: rng(seed), W, H, wind, theme });
  if (!layers.length) throw new Error('paint() made no layers');
  const planes = layers;                           // every layer is one plane when the picture comes apart
  const panels = (cfg.panels || []).map((p, i) => ({ ...p, n: i + 1 }));
  for (const p of panels) {
    if (p.kind === 'cycle' && !pal.cycles.find(x => x.name === p.cycle)) throw new Error(`panel ${p.n}: no cycle "${p.cycle}"`);
    if (p.kind === 'flow') { p.flows = p.flows || [p.flow]; for (const f of p.flows) if (!pctx.flows.find(x => x.name === f)) throw new Error(`panel ${p.n}: no flow "${f}"`); }
    if (p.kind === 'rig' && !layers.find(l => l.name === p.layer && l.rigs.length)) throw new Error(`panel ${p.n}: layer "${p.layer}" has no rigged plants`);
    if (!['cycle', 'flow', 'rig'].includes(p.kind)) throw new Error(`panel ${p.n}: kind must be cycle, flow or rig`);
  }

  // ── timeline: shots that overlap by `fade` ──
  const shots = []; let t = 0;
  const x0 = T.hold + T.explode + T.exploded;
  shots.push({ kind: 'stage', label: 'scene → layers', t0: 0, t1: x0 + T.fade });
  panels.forEach((p, i) => shots.push({ kind: 'panel', panel: p, label: `panel ${p.n} · ${p.kind}`, t0: x0 + i * T.panel, t1: x0 + (i + 1) * T.panel + T.fade }));
  const r0 = x0 + panels.length * T.panel, c0 = r0 + T.fade + T.back, c1 = c0 + T.collapse, DURATION = +(c1 + T.end).toFixed(3);
  shots.push({ kind: 'stage', label: 'layers → scene', t0: r0, t1: DURATION });
  t = 0;
  const e0 = T.hold, e1 = T.hold + T.explode;
  // how far apart the layers are (0 flat … 1 exploded): quintic in, quintic out — C2, no velocity step
  const explodeAt = t => t < e0 ? 0 : t < e1 ? smooth((t - e0) / (e1 - e0)) : t < c0 ? 1 : t < c1 ? 1 - smooth((t - c0) / (c1 - c0)) : 0;

  // ── colour modes: the same indices through different palettes ──
  const L01 = ([r, g, b]) => (.2126 * r + .7152 * g + .0722 * b) / 255;
  const bgc = hex(theme.bg);
  const dimOf = col => { const l = L01(col); return [bgc[0] + 14 + l * 62, bgc[1] + 16 + l * 66, bgc[2] + 20 + l * 72, col[3]].map(Math.round); };
  const markOf = (k, n) => { const m = theme.mark.map(hex), u = n > 1 ? k / (n - 1) : .5, f = u * (m.length - 1), a = Math.floor(f), w = f - a, A = m[a], B = m[Math.min(m.length - 1, a + 1)]; return [0, 1, 2].map(j => Math.round(A[j] + (B[j] - A[j]) * w)).concat(255); };
  const staticCache = new Map();
  function colours(mode, t) {
    if (mode === 'live') return packed(pal.at(t));
    if (staticCache.has(mode)) return staticCache.get(mode);
    let cols;
    if (mode.startsWith('index:')) {
      const cy = pal.cycles.find(x => x.name === mode.slice(6));
      cols = pal.cols.map((col, i) => i === 0 ? col : (i >= cy.start && i < cy.start + cy.len) ? (col[3] === 0 ? [...markOf(i - cy.start, cy.len).slice(0, 3), 150] : markOf(i - cy.start, cy.len)) : dimOf(col));
    } else if (mode.startsWith('flowdim:')) {
      const names = mode.slice(8).split(','), cys = pal.cycles.filter(cy => pctx.flows.some(f => names.includes(f.name) && f.cycle === cy.name));
      const tint = hex(theme.arrow);
      cols = pal.cols.map((col, i) => { if (i === 0) return col; const d = dimOf(col); if (cys.some(cy => i >= cy.start && i < cy.start + cy.len)) return [0, 1, 2].map(j => Math.round(d[j] * .62 + tint[j] * .16)).concat(col[3]); return d; });
    } else if (mode === 'dim') cols = pal.cols.map((col, i) => i === 0 ? col : dimOf(col));
    const p = packed(cols); staticCache.set(mode, p); return p;
  }

  // ── art-size canvases ──
  const mk = (w, h) => { const k = document.createElement('canvas'); k.width = w; k.height = h; return k; };
  const lc = new Map(layers.map(L => { const k = mk(W, H); return [L.name, { k, x: k.getContext('2d'), img: new ImageData(W, H) }]; }));
  const comp = mk(W, H), cx = comp.getContext('2d');
  let frameT = null; const idxAt = new Map();
  function indices(L, t) { if (frameT !== t) { idxAt.clear(); frameT = t; } if (!idxAt.has(L.name)) idxAt.set(L.name, L.frame(t)); return idxAt.get(L.name); }
  function paintLayer(L, t, mode) {
    const e = lc.get(L.name), idx = indices(L, t), P = colours(mode, t), u = new Uint32Array(e.img.data.buffer);
    for (let i = 0; i < idx.length; i++) u[i] = P[idx[i]];
    e.x.putImageData(e.img, 0, 0); return e.k;
  }
  function composite(t, mode = 'live', only = null) {
    cx.clearRect(0, 0, W, H);
    for (const L of layers) if (!only || only.includes(L.name)) cx.drawImage(paintLayer(L, t, mode), 0, 0);
    return comp;
  }

  // ── text ──
  let texts = [];
  const font = (role, sz) => { const r = TYPE[role]; return `${r.weight} ${Math.round((sz || r.size) * U)}px ${FONTS[r.family]}`; };
  function text(ctx, str, x, y, role, color, o = {}) {
    const r = TYPE[role]; ctx.save(); ctx.font = font(role); ctx.letterSpacing = ((r.spacing || 0) * U) + 'px';
    ctx.fillStyle = color; ctx.globalAlpha *= o.alpha ?? 1; ctx.textBaseline = 'alphabetic'; ctx.textAlign = o.align || 'left';
    const w = ctx.measureText(str).width; ctx.fillText(str, x, y);
    if (o.record !== false && (o.alpha ?? 1) > .01) texts.push({ role, str, size: r.size, x: o.align === 'center' ? x - w / 2 : x, y: y - r.size * U * .8, w, h: r.size * U * 1.05, max: o.max });
    ctx.restore(); return w;
  }

  // ── the stage: flat picture, or the layers as planes in space ──
  const D = 3.2;                                   // camera distance in plane widths
  const geo = (p, t) => {
    const phi = -p * (34 + 2.2 * Math.sin(t * .5)) * Math.PI / 180;
    const n = planes.length, dx = .36 * p, dz = .3 * p, lift = -64 * U * p + p * fit.oy, ox = p * fit.ox;
    return { phi, n, dx, dz, lift, ox };
  };
  function project(g, i, u, v, k) {               // plane i, u ∈ [0,1] across, v ∈ [0,1] down → screen
    const X = u - .5, oi = i - (g.n - 1) / 2;
    const x = X * Math.cos(g.phi) + oi * g.dx, z = -X * Math.sin(g.phi) - oi * g.dz;   // later layers come nearer and to the right
    const F = CW * D * k, s = F / (D + z);
    return [CW / 2 + g.ox + x * s, CH / 2 + g.lift + (v - .5) * (H / W) * s, s];
  }
  // fit: the zoom at which the fully exploded stack fills ~84 % × 62 % of the frame
  // and the offset that centres it (the near plane is bigger than the far ones, so the stack is not centred by itself)
  const fit = { ox: 0, oy: 0 }; let fitK = 1;
  { const g = geo(1, 0); g.lift = 0; g.ox = 0; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let i = 0; i < g.n; i++) for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const [sx, sy] = project(g, i, u, v, 1); x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
    fitK = Math.min(.84 * CW / (x1 - x0), .6 * CH / (y1 - y0));
    fit.ox = -fitK * ((x0 + x1) / 2 - CW / 2); fit.oy = -fitK * ((y0 + y1) / 2 - CH / 2); }
  const camAt = t => { const p = explodeAt(t), g = geo(p, t); return { p, phi: g.phi, k: lerp(1, fitK, p), lift: g.lift }; };
  function planeQuads(t) {
    const p = explodeAt(t), g = geo(p, t), k = lerp(1, fitK, p);
    return planes.map((L, i) => ({ L, i, z: -(i - (g.n - 1) / 2) * g.dz, pts: [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => project(g, i, u, v, k)) }));
  }
  function drawStage(ctx, t) {
    const p = explodeAt(t);
    ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, CW, CH);
    ctx.imageSmoothingEnabled = false;
    if (p <= 0) { ctx.drawImage(composite(t), 0, 0, CW, CH); return; }
    const g = geo(p, t), k = lerp(1, fitK, p);
    // back to front: the first layer (the opaque picture) is furthest; the layers painted over it come nearer
    const order = planes.map((L, i) => ({ L, i, z: -(i - (g.n - 1) / 2) * g.dz })).sort((a, b) => b.z - a.z);
    for (const { L, i } of order) {
      const src = paintLayer(L, t, 'live');
      const quad = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => project(g, i, u, v, k));
      if (i > 0) { ctx.save(); ctx.globalAlpha = clamp(p * 1.6); ctx.fillStyle = theme.glass; ctx.beginPath(); quad.forEach(([x, y], j) => j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.restore(); }
      for (let col = 0; col < W; col++) {
        const a = project(g, i, col / W, 0, k), b = project(g, i, (col + 1) / W, 0, k), m = project(g, i, (col + .5) / W, 0, k);
        const top = m[1], hh = (H / W) * m[2];
        const xa = Math.min(a[0], b[0]), wa = Math.abs(b[0] - a[0]);
        ctx.drawImage(src, col, 0, 1, H, xa, top, wa + (p > 0 ? .75 : 0), hh);
      }
      ctx.save(); ctx.globalAlpha = clamp(p * 1.4) * .75; ctx.strokeStyle = L.color; ctx.lineWidth = Math.max(1, 1.6 * U);
      ctx.beginPath(); quad.forEach(([x, y], j) => j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.stroke(); ctx.restore();
    }
    // the layer names, one column each, under a hairline
    const a = clamp((p - .55) / .45); if (a <= 0) return;
    const m = 128 * U, colW = (CW - 2 * m) / planes.length, yl = CH - 112 * U;
    planes.forEach((L, i) => {
      const x = m + i * colW; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = theme.rule; ctx.fillRect(x, yl - 50 * U, colW - 36 * U, Math.max(1, 1.5 * U)); ctx.restore();
      text(ctx, L.label, x, yl, 'layer', L.color, { alpha: a, max: colW - 36 * U });
    });
  }

  // ── panels ──
  const VIEW = { w: 768, h: 432, gap: 128 };
  const layout = () => {
    const vw = VIEW.w * U, vh = VIEW.h * U, gap = VIEW.gap * U, left = (CW - 2 * vw - gap) / 2;
    const top = (CH - (432 + 330) * U) / 2;          // content block ≈ 762 px tall, centred
    return { vw, vh, gap, lx: left, rx: left + vw + gap, kickerY: top + 22 * U, titleY: top + 92 * U, labelY: top + 166 * U, viewY: top + 186 * U, belowY: top + 186 * U + vh };
  };
  const crop = (p, zoom) => {
    const cw = VIEW.w / zoom, ch = VIEW.h / zoom, [cx0, cy0] = p.center || [W / 2, H / 2];
    return [clamp(Math.round(cx0 - cw / 2), 0, W - cw), clamp(Math.round(cy0 - ch / 2), 0, H - ch), cw, ch];
  };
  function view(ctx, src, cr, x, y, w, h, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = theme.card; ctx.fillRect(x, y, w, h);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(src, cr[0], cr[1], cr[2], cr[3], x, y, w, h);
    ctx.strokeStyle = theme.rule; ctx.lineWidth = Math.max(1, 1.5 * U); ctx.strokeRect(x + .5, y + .5, w - 1, h - 1); ctx.restore();
  }
  const ease = (tau, a, b) => smooth((tau - a) / (b - a));
  function drawPanel(ctx, t, p, tau) {
    ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, CW, CH); ctx.imageSmoothingEnabled = false;
    const Lo = layout(), aH = ease(tau, .1, .55), aL = ease(tau, .25, .7), aV = ease(tau, .3, .8), aC = ease(tau, .55, 1.05);
    const rise = v => (1 - v) * 14 * U;
    const kick = `${String(p.n).padStart(2, '0')}  /  ${(p.kicker || p.kind).toUpperCase()}`;
    text(ctx, kick, Lo.lx, Lo.kickerY + rise(aH), 'kicker', theme.accent, { alpha: aH });
    text(ctx, p.title, Lo.lx, Lo.titleY + rise(aH), 'title', theme.ink, { alpha: aH, max: CW - 2 * Lo.lx });
    text(ctx, p.left, Lo.lx, Lo.labelY + rise(aL), 'label', theme.ink, { alpha: aL, max: Lo.vw });
    text(ctx, p.right, Lo.rx, Lo.labelY + rise(aL), 'label', theme.ink, { alpha: aL, max: Lo.vw });
    const zoom = p.zoom || (p.kind === 'rig' ? 6 : 3), cr = crop(p, zoom), s = Lo.vw / cr[2];
    const sc = 1 - (1 - aV) * .015, vw = Lo.vw * sc, vh = Lo.vh * sc, dxv = (Lo.vw - vw) / 2, dyv = (Lo.vh - vh) / 2;
    const at = (x, y) => [Lo.lx + dxv + (x - cr[0]) * s * sc, Lo.viewY + dyv + (y - cr[1]) * s * sc];
    if (p.kind === 'cycle') {
      view(ctx, composite(t, 'index:' + p.cycle), cr, Lo.lx + dxv, Lo.viewY + dyv, vw, vh, aV);
      view(ctx, composite(t, 'live'), cr, Lo.rx + dxv, Lo.viewY + dyv, vw, vh, aV);
      const cy = pal.cycles.find(x => x.name === p.cycle), now = pal.at(t), n = cy.len, g = 14 * U;
      const sw = Math.min(110 * U, (Lo.vw - g * (n - 1)) / n), y = Lo.belowY + 30 * U;
      for (let k = 0; k < n; k++) {
        const a = aC * ease(tau, .55 + k * .05, .9 + k * .05), x = Lo.rx + k * (sw + g), col = now[cy.start + k];
        ctx.save(); ctx.globalAlpha = a;
        if (col[3] < 8) { ctx.strokeStyle = theme.dim; ctx.setLineDash([4 * U, 4 * U]); ctx.lineWidth = 1.5 * U; ctx.strokeRect(x + 1, y + 1, sw - 2, 50 * U - 2); }
        else { ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${Math.max(.35, col[3] / 255)})`; ctx.fillRect(x, y, sw, 50 * U); }
        const m = markOf(k, n), chip = Math.min(22 * U, sw); ctx.fillStyle = `rgb(${m[0]},${m[1]},${m[2]})`; ctx.fillRect(x, y + 58 * U, chip, chip); ctx.restore();
        // a long cycle labels every fourth slot (the numbers would collide)
        if (n <= 12) text(ctx, String(k + 1).padStart(2, '0'), x + 30 * U, y + 76 * U, 'slot', theme.ink, { alpha: a });
        else if (k % 4 === 0) text(ctx, String(k + 1).padStart(2, '0'), x, y + 104 * U, 'slot', theme.ink, { alpha: a });
      }
      text(ctx, p.caption, Lo.lx, Lo.belowY + 62 * U, 'caption', theme.dim, { alpha: aC, max: Lo.vw });
    } else if (p.kind === 'flow') {
      view(ctx, composite(t, 'flowdim:' + p.flows.join(',')), cr, Lo.lx + dxv, Lo.viewY + dyv, vw, vh, aV);
      view(ctx, composite(t, 'live'), cr, Lo.rx + dxv, Lo.viewY + dyv, vw, vh, aV);
      // the vectors: the measured gradient of each flow's `along`, sampled on a grid inside its mask
      const fl = pctx.flows.filter(f => p.flows.includes(f.name)), step = Math.max(6, Math.round(56 / s)), len = step * .62;
      ctx.save(); ctx.beginPath(); ctx.rect(Lo.lx + dxv, Lo.viewY + dyv, vw, vh); ctx.clip();
      ctx.strokeStyle = theme.arrow; ctx.fillStyle = theme.arrow; ctx.lineWidth = Math.max(1.2, 2.2 * U); ctx.lineCap = 'round';
      let n = 0;
      for (let gy = cr[1] + step / 2; gy < cr[1] + cr[3]; gy += step) for (let gx = cr[0] + step / 2; gx < cr[0] + cr[2]; gx += step) {
        const f = fl.find(f => f.mask(Math.floor(gx), Math.floor(gy))); if (!f) continue;
        const v = flowDir(f, gx, gy); if (!v) continue;
        const a = aV * ease(tau, .45 + (n++ % 17) * .02, .85 + (n % 17) * .02); ctx.globalAlpha = a * .95;
        const [ax, ay] = at(gx - v[0] * len / 2, gy - v[1] * len / 2), [bx, by] = at(gx + v[0] * len / 2, gy + v[1] * len / 2);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        const hx = -v[0], hy = -v[1], hs = 9 * U;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + (hx * .87 - hy * .5) * hs, by + (hy * .87 + hx * .5) * hs); ctx.lineTo(bx + (hx * .87 + hy * .5) * hs, by + (hy * .87 - hx * .5) * hs); ctx.closePath(); ctx.fill();
        const q = mod(t * .9 + hash(gx | 0, gy | 0, 5), 1), [px, py] = at(gx + v[0] * len * (q - .5), gy + v[1] * len * (q - .5));
        ctx.globalAlpha = a * Math.sin(q * Math.PI); ctx.beginPath(); ctx.arc(px, py, 3.2 * U, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      text(ctx, p.caption, Lo.lx, Lo.belowY + 62 * U, 'caption', theme.dim, { alpha: aC, max: Lo.vw });
    } else if (p.kind === 'rig') {
      view(ctx, composite(t, 'live', [p.layer]), cr, Lo.lx + dxv, Lo.viewY + dyv, vw, vh, aV);
      view(ctx, composite(t, 'dim', [p.layer]), cr, Lo.rx + dxv, Lo.viewY + dyv, vw, vh, aV);
      const L = layers.find(l => l.name === p.layer), atR = (x, y) => { const [a, b] = at(x, y); return [a + (Lo.rx - Lo.lx), b]; };
      let fi = 0;
      for (const r of L.rigs) {
        if (r.x < cr[0] - 20 || r.x > cr[0] + cr[2] + 20 || r.y < cr[1] - 5 || r.y > cr[1] + cr[3] + 40) continue;
        for (const pts of r.pose(t)) {
          const col = theme.bones[fi++ % theme.bones.length], a = aV * ease(tau, .5 + fi * .04, .9 + fi * .04);
          ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(1.2, 2.4 * U); ctx.lineJoin = 'round';
          ctx.beginPath(); pts.forEach(([x, y], j) => { const [sx, sy] = atR(x, y); j ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }); ctx.stroke();
          pts.forEach(([x, y], j) => { const [sx, sy] = atR(x, y); ctx.beginPath(); ctx.arc(sx, sy, (j === 0 ? 6 : 4) * U, 0, Math.PI * 2); ctx.fill(); });
          ctx.restore();
        }
      }
      ctx.save(); ctx.globalAlpha = aC; ctx.fillStyle = theme.rule; ctx.fillRect(Lo.lx, Lo.belowY + 34 * U, Lo.rx + Lo.vw - Lo.lx, Math.max(1, 1.5 * U)); ctx.restore();
      text(ctx, p.caption, Lo.lx, Lo.belowY + 84 * U, 'caption', theme.dim, { alpha: aC, max: Lo.rx + Lo.vw - Lo.lx });
    }
  }
  function flowDir(f, x, y) {
    const e = 1.5, gx = f.along(x + e, y) - f.along(x - e, y), gy = f.along(x, y + e) - f.along(x, y - e), l = Math.hypot(gx, gy);
    return l > 1e-6 ? [gx / l, gy / l] : null;
  }

  // ── seek ──
  const off = mk(CW, CH), ox = off.getContext('2d');
  function drawShot(ctx, s, t) { if (s.kind === 'stage') drawStage(ctx, t); else drawPanel(ctx, t, s.panel, t - s.t0); }
  function seek(tt) {
    const t = clamp(+tt || 0, 0, DURATION); texts = [];
    const act = shots.filter(s => t >= s.t0 && t < s.t1 + (s === shots[shots.length - 1] ? 1e-9 : 0));
    if (!act.length) act.push(shots[shots.length - 1]);
    drawShot(c, act[0], t);
    if (act[1]) {
      const a = smooth((t - act[1].t0) / T.fade); const keep = texts; texts = [];
      drawShot(ox, act[1], t); c.save(); c.globalAlpha = a; c.drawImage(off, 0, 0); c.restore();
      texts = a > .5 ? texts : keep;
    }
    if (Q.get('debug')) { c.save(); c.font = `600 ${18 * U}px monospace`; c.fillStyle = '#fff'; c.fillText(`${t.toFixed(2)} s · ${act.map(s => s.label).join(' + ')}`, 14 * U, 28 * U); c.restore(); }
    window.__t = t; return t;
  }

  // ── contract ──
  await loadFonts();
  const fontsOk = () => ['500 20px CCBSans', '700 20px CCBSans', '500 20px CCBKR', '500 20px CCBMono'].every(f => document.fonts.check(f));
  Object.assign(window, {
    seek, DURATION, FPS, SIZE: [SW, SH], ART: [W, H],
    filmInfo: () => ({
      title: cfg.title, duration: DURATION, fps: FPS, size: [SW, SH], art: [W, H], scale, timing: T,
      shots: shots.map(s => ({ kind: s.kind, label: s.label, t0: s.t0, t1: s.t1, panel: s.panel ? { n: s.panel.n, kind: s.panel.kind, title: s.panel.title, left: s.panel.left, right: s.panel.right, caption: s.panel.caption, kicker: s.panel.kicker, cycle: s.panel.cycle, flows: s.panel.flows, layer: s.panel.layer, zoom: s.panel.zoom, crop: crop(s.panel, s.panel.zoom || (s.panel.kind === 'rig' ? 6 : 3)) } : null })),
      explode: { e0, e1, c0, c1 },
      layers: layers.map(L => ({ name: L.name, label: L.label, color: L.color, dynamic: L.dynamic, flows: L.flows.map(f => f.name), rigs: L.rigs.map(r => r.name) })),
      palette: pal.cols.length, ramps: Object.values(pal.ramps).map(r => ({ name: r.name, start: r.start, len: r.len })),
      cycles: pal.cycles.map(c => ({ ...c })),
      flows: pctx.flows.map(f => ({ name: f.name, layer: f.layer, cycle: f.cycle })),
      rigs: pctx.rigs.map(r => ({ name: r.name, layer: r.layer, x: r.x, y: r.y, fronds: r.fronds.map(f => ({ len: f.len, segs: f.segs, kind: f.kind })) })),
    }),
    __film: {
      camAt, planeQuads: t => planeQuads(t).map(q => ({ name: q.L.name, pts: q.pts.map(p => [p[0], p[1]]) })), fontsOk, texts: () => texts.slice(),
      layerIdx: (name, t) => Array.from(layers.find(l => l.name === name).frame(t)),
      paletteAt: t => pal.at(t), cols: () => pal.cols.map(c => c.slice()),
      compositeRGBA: (t, mode = 'live') => { composite(t, mode); return Array.from(cx.getImageData(0, 0, W, H).data); },
      rigAngles: (name, t) => pctx.rigs.find(r => r.name === name).angles(t), rigPose: (name, t) => pctx.rigs.find(r => r.name === name).pose(t),
      flowField: name => { const f = pctx.flows.find(f => f.name === name), out = []; for (let y = 2; y < H; y += 5) for (let x = 2; x < W; x += 5) if (f.mask(x, y)) { const v = flowDir(f, x + .5, y + .5); if (v) out.push([x, y, v[0], v[1]]); } return out; },
      wind: (t, x) => wind.at(t, x), U, layout: layout(),
    },
  });
  const t0 = Q.get('t');
  seek(t0 != null ? +t0 : 0);
  window.__ready = true;
  if (Q.get('render')) return;
  // live player: click / space pauses, ← → jump a second
  let playing = t0 == null, clock = t0 != null ? +t0 : 0, last = performance.now();
  const tick = now => { if (playing) { clock = (clock + (now - last) / 1000) % DURATION; seek(clock); } last = now; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const toggle = () => { playing = !playing; };
  canvas.addEventListener('click', toggle);
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { clock = clamp(clock + (e.code === 'ArrowRight' ? 1 : -1), 0, DURATION - .001); seek(clock); }
  });
}
