// ─────────────────────────────────────────────────────────────
//  artifacts-desk — kit for the 실물을 공간에 늘어놓기 look (three.js).
//  Real artifacts (editor, terminal, logs, dashboards, files) are 2D canvases painted from t and shown as lit
//  slabs standing on a dark floor: rim light, floor reflection, contact shadow, light pools; glowing screen-space
//  lines and flying chips carry data between them; a framed, monotone-cubic camera walks through.
//
//  Materials and machinery only. Palette, text, which artifacts exist and where, camera keys, chapters and
//  every topic decision stay in the page. No default scene; colour defaults are neutral greys.
//
//  Load: copy to <project>/assets/kits/artifacts-desk.js; the page's importmap maps 'three' and 'three/addons/'.
//    import { createDesk, createPaint, camPath } from '../assets/kits/artifacts-desk.js';
//  Units: 1 world unit = 100 design px. Design px are the units painters draw in (an artifact w × h in design px
//  is w/100 × h/100 world units). Canvas resolution = design px × ts (default 1.5).
//  Deterministic: no Math.random / Date / performance.now; textures are a cache keyed on quantised t, so any
//  seek order gives the same frame.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ── small pure helpers (same formulas as the skill's pages) ──
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const pp = (t, s, d) => clamp((t - s) / d);
const eo = t => 1 - Math.pow(1 - t, 3);
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const glf = x => { const s = String(x); return /[.e]/.test(s) ? s : s + '.0'; };          // number → GLSL float literal
const glv = a => `vec3(${a.map(glf).join(',')})`;

/** rgba('#rrggbb', a) → css rgba string. */
export function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
/** Seeded PRNG (mulberry32): rng(seed)() → [0, 1). Use it for every "random" layout so frames stay pure in t. */
export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }

/** Cubic bezier point. P = [a, b, c, d] (THREE.Vector3), u 0..1 → new Vector3. */
export function bez(P, u) {
  const [a, b, c, d] = P, v = 1 - u;
  return new THREE.Vector3(
    v * v * v * a.x + 3 * v * v * u * b.x + 3 * v * u * u * c.x + u * u * u * d.x,
    v * v * v * a.y + 3 * v * v * u * b.y + 3 * v * u * u * c.y + u * u * u * d.y,
    v * v * v * a.z + 3 * v * v * u * b.z + 3 * v * u * u * c.z + u * u * u * d.z);
}
/** Path a → b for left-to-right hand-offs: leaves a along +x, arcs up by `lift` world units, enters b from −x. */
export const link = (a, b, lift = 1.2, out = 1.5) => {
  const dx = b.x - a.x;
  return [a, new THREE.Vector3(a.x + Math.max(out, dx * .35), a.y + lift, a.z), new THREE.Vector3(b.x - Math.max(out, dx * .35), b.y + lift, b.z), b];
};
/** Path a → b in either direction, lifted by `up` and pulled toward the camera by `dz` (world units). */
export const lift = (a, b, up = 1.5, out = 1.2, dz = .6) => {
  const dx = b.x - a.x, sgn = Math.sign(dx) || 1;
  return [a, new THREE.Vector3(a.x + sgn * Math.max(out, Math.abs(dx) * .3), a.y + up, a.z + dz), new THREE.Vector3(b.x - sgn * Math.max(out, Math.abs(dx) * .3), b.y + up, b.z + dz), b];
};
/** Straight path a → b as a bezier (so it works with curve / chips). */
export const straight = (a, b) => [a, a.clone().lerp(b, .33), a.clone().lerp(b, .66), b];
/** Reverse a bezier path. */
export const reverse = P => [P[3], P[2], P[1], P[0]];

/** Camera key from explicit world points: raw([x,y,z] position, [x,y,z] target). */
export const raw = (pos, tgt) => ({ pos: new THREE.Vector3(...pos), tgt: new THREE.Vector3(...tgt) });

/**
 * Monotone cubic (Fritsch–Carlson) camera path through keys [[t, {pos, tgt}], …] (t in s, ascending).
 * Per component, no overshoot: holds (two equal keys) stay still, long moves keep their speed through keys.
 * Returns camAt(t) → { pos, tgt } (new Vector3s). Clamps t to the first / last key.
 */
export function camPath(keys) {
  const T = keys.map(k => k[0]);
  const C = ['pos', 'tgt'].flatMap(key => ['x', 'y', 'z'].map(ax => {
    const y = keys.map(k => k[1][key][ax]), n = y.length, d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (T[i + 1] - T[i]));
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) continue;
      const h0 = T[i] - T[i - 1], h1 = T[i + 1] - T[i], w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
    return { y, m };
  }));
  return function camAt(t) {
    const n = keys.length;
    t = clamp(t, T[0], T[n - 1]);
    let i = 0; while (i < n - 2 && t > T[i + 1]) i++;
    const h = T[i + 1] - T[i], u = (t - T[i]) / h, u2 = u * u, u3 = u2 * u;
    const v = C.map(({ y, m }) => y[i] * (2 * u3 - 3 * u2 + 1) + m[i] * h * (u3 - 2 * u2 + u) + y[i + 1] * (-2 * u3 + 3 * u2) + m[i + 1] * h * (u3 - u2));
    return { pos: new THREE.Vector3(v[0], v[1], v[2]), tgt: new THREE.Vector3(v[3], v[4], v[5]) };
  };
}

/**
 * Chip motion along several legs: legs([[t0, t1, pathFn, hold?], …]) → posFn(t) → { q } or null.
 * pathFn() returns a bezier (recomputed each frame, so it follows moving artifacts); hold = sit at pathFn()[0].
 */
export function legs(L) {
  return t => {
    for (const [a, b, P, hold] of L) if (t >= a && t < b) { const r = (t - a) / (b - a); return { q: hold ? P()[0].clone() : bez(P(), eio(r)) }; }
    return null;
  };
}

/** Load fonts for canvases. faces: [[family, file, weight], …]; tries each base dir in turn. Await before first paint. */
export async function loadFonts(faces = [['Pretendard', 'Pretendard-Variable.woff2', '100 900'], ['JetBrains Mono', 'JetBrainsMono.woff2', '100 800']],
  bases = ['../assets/fonts/', 'assets/fonts/']) {
  for (const [family, file, weight] of faces) {
    for (const base of bases) {
      try { document.fonts.add(await new FontFace(family, `url(${base}${file})`, { weight }).load()); break; } catch (e) { /* try next */ }
    }
  }
  await document.fonts.ready;
}

// ═════════════════════════════════════════════════════════════
//  2D PAINTERS (draw on an artifact canvas in design px)
// ═════════════════════════════════════════════════════════════
/**
 * createPaint(theme) → painter set bound to fonts and neutral chrome colours. All colours are optional;
 * a topic passes its own (the defaults are plain greys, so an un-themed page looks unfinished on purpose).
 * theme: { sans, mono, ts (canvas px per design px, 1.5), tb (title-bar height, 62), radius (14),
 *   text, hi, dim, faint, bg (window body), bar (title bar), border, line (separators), accent (active tab underline),
 *   panel, panelBorder, panelTitle (dashboard panels), grid (chart grid lines),
 *   syntax: { colors: {kw, str, num, com, fn, prop, txt, punc}, kw: [...], prop: [...], comment: ['//'], quotes: '"\'', ci: false } }
 */
export function createPaint(theme = {}) {
  const T = {
    sans: 'Pretendard, "WenQuanYi Zen Hei", "DejaVu Sans", sans-serif',
    mono: '"JetBrains Mono", Pretendard, "DejaVu Sans Mono", monospace',
    ts: 1.5, tb: 62, radius: 14,
    text: '#c4c4c4', hi: '#ececec', dim: '#8e8e8e', faint: '#5e5e5e',
    bg: '#1c1c1d', bar: '#2a2a2b', border: '#3d3d3e', line: '#2a2a2b', accent: '#d6d6d6',
    panel: '#19191a', panelBorder: '#303031', panelTitle: '#d6d6d6', grid: 'rgba(255,255,255,0.07)',
    ...theme,
  };
  const SANS = T.sans, MONO = T.mono, TS = T.ts, TB = T.tb;
  const defaultSyntax = {
    kw: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'new', 'import', 'from', 'export', 'public', 'private',
      'static', 'void', 'int', 'string', 'bool', 'true', 'false', 'null', 'def', 'async', 'await', 'package', 'func', 'struct', 'type'],
    prop: [], comment: ['//'], quotes: '"\'', ci: false, colors: {},
  };
  const synCache = new WeakMap();
  function prepSyntax(s) {
    s = s || T.syntax || defaultSyntax;
    let P = synCache.get(s); if (P) return P;
    const ci = !!s.ci, norm = w => ci ? w.toLowerCase() : w;
    const col = { kw: T.text, str: T.text, num: T.text, com: T.dim, fn: T.text, prop: T.text, txt: T.text, punc: T.text, ...(s.colors || {}) };
    const esc = x => x.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    const com = (s.comment || ['//']).map(c => esc(c) + '.*$');
    const quotes = s.quotes ?? '"\'';
    const str = [...quotes].map(q => `${esc(q)}[^${esc(q)}]*${esc(q)}`);
    const re = new RegExp(`(${[...com, ...str, '\\s+', '0x[0-9a-fA-F]+', '\\d+', '[A-Za-z_]\\w*', '::', '.'].join('|')})`, 'g');
    P = { re, col, comments: s.comment || ['//'], quotes, kw: new Set((s.kw || []).map(norm)), prop: new Set((s.prop || []).map(norm)), norm };
    synCache.set(s, P); return P;
  }

  /** Rounded-rect path (no fill). */
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  /** Text. o: { size 28, weight 500, color theme.text, align, mono, alpha, base, ls (letter spacing px) }. */
  function gt(g, s, x, y, o = {}) {
    const { size = 28, weight = 500, color = T.text, align = 'left', mono = false, alpha = 1, base = 'alphabetic', ls = 0 } = o;
    if (alpha <= 0) return;
    g.save(); g.globalAlpha *= alpha; g.font = `${weight} ${size}px ${mono ? MONO : SANS}`;
    g.fillStyle = color; g.textAlign = align; g.textBaseline = base; if (ls) g.letterSpacing = ls + 'px'; g.fillText(s, x, y); g.restore();
  }
  /** Measure text width in design px. */
  function mw(g, s, size, weight = 500, mono = false) { g.font = `${weight} ${size}px ${mono ? MONO : SANS}`; return g.measureText(s).width; }
  /** Filled dot, radius r. */
  function gdot(g, x, y, r, col, a = 1) { g.save(); g.globalAlpha *= a; g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = col; g.fill(); g.restore(); }
  /** Check mark of size s centred at x, y; lw = stroke as a fraction of s. */
  function gcheck(g, x, y, s, col, a = 1, lw = .16) { if (a <= 0) return; g.save(); g.globalAlpha *= a; g.strokeStyle = col; g.lineWidth = s * lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x - s * .36, y); g.lineTo(x - s * .1, y + s * .26); g.lineTo(x + s * .38, y - s * .28); g.stroke(); g.restore(); }
  /** Cross (✗) of size s centred at x, y. */
  function gcross(g, x, y, s, col, a = 1) { if (a <= 0) return; g.save(); g.globalAlpha *= a; g.strokeStyle = col; g.lineWidth = s * .16; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - s * .3, y - s * .3); g.lineTo(x + s * .3, y + s * .3); g.moveTo(x + s * .3, y - s * .3); g.lineTo(x - s * .3, y + s * .3); g.stroke(); g.restore(); }
  /** Pill label centred vertically on y; x = left edge (align 'right' → right edge, 'center' → centre). Returns width.
   *  o: { size 22, align, fillA .16, alpha, mono true, weight 700, r 8, lw 1.5, strokeA .75 } */
  function gchip(g, label, x, y, col, o = {}) {
    const { size = 22, align = 'left', fillA = .16, alpha = 1, mono = true, weight = 700, r = 8, lw = 1.5, strokeA = .75 } = o;
    if (alpha <= 0) return 0;
    const w = mw(g, label, size, weight, mono) + size * 1.1, h = size * 1.6;
    const X = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    g.save(); g.globalAlpha *= alpha; rr(g, X, y - h / 2, w, h, r); g.fillStyle = rgba(col, fillA); g.fill(); g.lineWidth = lw; g.strokeStyle = rgba(col, strokeA); g.stroke();
    gt(g, label, X + w / 2, y + size * .36, { size, weight, color: col, align: 'center', mono }); g.restore();
    return w;
  }
  /** Split one line of code into [[token, colour], …] with a syntax spec (see createPaint). */
  function tokens(line, syntax) {
    const S = prepSyntax(syntax), out = [], re = S.re; let m;
    re.lastIndex = 0;
    while ((m = re.exec(line))) {
      const s = m[0], n = S.norm(s); let c = S.col.txt;
      if (S.comments.some(cm => s.startsWith(cm))) c = S.col.com;
      else if (S.quotes.includes(s[0])) c = S.col.str;
      else if (/^(0x[0-9a-fA-F]+|\d+)$/.test(s)) c = S.col.num;
      else if (S.kw.has(n)) c = S.col.kw;
      else if (S.prop.has(n)) c = S.col.prop;
      else if (/^[A-Za-z_]\w*$/.test(s) && line[m.index + s.length] === '(') c = S.col.fn;
      else if (/^[^\w\s]+$/.test(s)) c = S.col.punc;
      out.push([s, c]);
    }
    return out;
  }
  /** One syntax-coloured mono line at x, y; limit = max characters shown (typing). Returns the x after the last glyph. */
  function codeLine(g, s, x, y, size, limit = Infinity, syntax) {
    g.font = `500 ${size}px ${MONO}`; let xx = x;
    for (const [tok, c] of tokens(s, syntax)) { if (limit <= 0) break; const v = tok.slice(0, limit); g.fillStyle = c; g.fillText(v, xx, y); xx += g.measureText(v).width; limit -= v.length; }
    return xx;
  }
  /**
   * Window chrome for an artifact canvas: clears, sets the ts transform, body, title bar, border.
   * o: { bg, bar, stroke, lw 2, dash, r (radius),
   *   role: [label, colour, sub?]  (dot + bold label + dim sub, left),
   *   tabs: [[name, active, accent?], …]  (mono file tabs after the role),
   *   ver: [label, colour, flash 0..1]  (pill at the right),  right: 'text' (dim mono at the right) }
   */
  function frame(g, w, h, o = {}) {
    const R = o.r ?? T.radius;
    g.setTransform(TS, 0, 0, TS, 0, 0); g.clearRect(0, 0, w, h);
    rr(g, 2, 2, w - 4, h - 4, R); g.fillStyle = o.bg || T.bg; g.fill();
    g.save(); rr(g, 2, 2, w - 4, h - 4, R); g.clip(); g.fillStyle = o.bar || T.bar; g.fillRect(0, 0, w, TB); g.fillStyle = o.sep || T.border; g.fillRect(0, TB, w, 1.5); g.restore();
    let x = 24;
    if (o.role) {
      const [lab, col, sub] = o.role;
      gdot(g, x + 7, TB / 2, 7, col);
      gt(g, lab, x + 24, TB / 2 + 10, { size: 28, weight: 800, color: col }); x += 24 + mw(g, lab, 28, 800) + 14;
      if (sub) { gt(g, sub, x, TB / 2 + 9, { size: 24, color: T.dim }); x += mw(g, sub, 24) + 22; }
    }
    for (const [name, active, acc] of (o.tabs || [])) {
      const tw = mw(g, name, 23, 500, true) + 40;
      if (active) { g.fillStyle = o.bg || T.bg; g.fillRect(x, 8, tw, TB - 8); g.fillStyle = acc || T.accent; g.fillRect(x, TB - 3, tw, 3); }
      gt(g, name, x + 20, TB / 2 + 10, { size: 23, mono: true, color: active ? T.hi : T.dim });
      x += tw + 4;
    }
    if (o.ver) gchip(g, o.ver[0], w - 22, TB / 2, o.ver[1], { align: 'right', size: 21, fillA: .14 + (o.ver[2] || 0) * .35 });
    else if (o.right) gt(g, o.right, w - 24, TB / 2 + 9, { size: 22, mono: true, color: T.dim, align: 'right' });
    g.save(); if (o.dash) g.setLineDash(o.dash); rr(g, 2, 2, w - 4, h - 4, R); g.lineWidth = o.lw || 2; g.strokeStyle = o.stroke || T.border; g.stroke(); g.restore();
  }

  // ── stock painters: generic artifacts, content entirely from options ──
  /**
   * Code editor. Draws frame + gutter + coloured lines; returns { rowY(i), colX(c), x, y, lh } for anchoring.
   * o: { frame: {…frame opts}, lines: [string], syntax, size 30, lh 44, x 96 (code left), y TB+60 (first baseline),
   *   chars (characters typed so far, Infinity = all), caret ('auto' | true | false), t (for caret blink),
   *   gutter true, gutterColor, insert: { at (line index), s, k 0..1 (slide-in), chars, col (band colour) },
   *   marks: [{ line, from, to, col, a }]  (boxes around columns from..to), band: [{ line, col, a }] (row highlight),
   *   status: [left, right] (bottom status line) }
   */
  function editor(g, w, h, o = {}) {
    const { lines = [], syntax, size = 30, lh = 44, x = 96, y = TB + 60, chars = Infinity, gutter = true, insert = null, t = 0 } = o;
    frame(g, w, h, o.frame || {});
    const cw = mw(g, 'M', size, 500, true), ins = insert ? clamp(insert.k ?? 1) : 0, at = insert ? insert.at : Infinity;
    const rowY = i => y + (i + (i >= at ? ins : 0)) * lh, colX = c => x + c * cw;
    for (const b of (o.band || [])) { if (b.a <= 0) continue; g.fillStyle = rgba(b.col, .16 * (b.a ?? 1)); g.fillRect(0, rowY(b.line) - lh * .74, w, lh); }
    if (ins > 0) {
      const yy = y + at * lh, col = insert.col || T.accent;
      g.save(); g.globalAlpha *= ins; g.fillStyle = rgba(col, .16); g.fillRect(0, yy - lh * .74, w, lh); g.fillStyle = col; g.fillRect(x - 26, yy - lh * .74, 5, lh);
      if (gutter) gt(g, String(at + 1), x - 40, yy, { size: size * .7, color: col, mono: true, align: 'right' });
      codeLine(g, insert.s, x, yy, size, insert.chars ?? Infinity, syntax); g.restore();
    }
    let left = chars, cur = null;
    lines.forEach((ln, i) => {
      if (left <= 0) return;
      const yy = rowY(i);
      if (gutter) gt(g, String(i + 1 + (i >= at && ins > .5 ? 1 : 0)), x - 40, yy, { size: size * .7, color: o.gutterColor || T.faint, mono: true, align: 'right' });
      cur = [codeLine(g, ln, x, yy, size, left, syntax), yy]; left -= ln.length + 1;
    });
    for (const m of (o.marks || [])) {
      if ((m.a ?? 1) <= 0) continue;
      g.save(); g.globalAlpha *= m.a ?? 1; rr(g, colX(m.from) - 5, rowY(m.line) - size, (m.to - m.from) * cw + 10, size * 1.3, 6); g.lineWidth = 2.5; g.strokeStyle = m.col; g.stroke(); g.restore();
    }
    const total = lines.reduce((s, l) => s + l.length + 1, 0);
    const caret = o.caret ?? 'auto';
    if (cur && caret && (caret === true || chars < total || Math.floor(t * 2) % 2 === 0)) { g.fillStyle = T.hi; g.fillRect(cur[0] + 2, cur[1] - size * .85, 3, size * 1.1); }
    if (o.status) {
      g.fillStyle = T.line; g.fillRect(0, h - 48, w, 1.5);
      gt(g, o.status[0] || '', 24, h - 16, { size: 21, color: T.dim, mono: true });
      gt(g, o.status[1] || '', w - 24, h - 16, { size: 21, color: T.dim, align: 'right' });
    }
    return { rowY, colX, x, y, lh };
  }
  /**
   * Terminal with typed commands and output appearing at given times.
   * o: { frame, events: [[time, text, kind, typeDur]] (kind 'cmd' types over typeDur s; others appear at time),
   *   prompt: [text, colour], sep '$', size 30, lh 46, rows 6 (visible, scrolls), x 28, y0 TB+54,
   *   promptW (x of sep from x; default text width + 22), cmdGap 36, colors: { cmd, out, ok, err, … } (kind → colour),
   *   bold: ['ok', 'err'] }
   */
  function terminal(g, w, h, t, o = {}) {
    const { events = [], prompt = ['~', T.hi], sep = '$', size = 30, lh = 46, rows: nRows = 6, x = 28, y0 = TB + 54, cmdGap = 36, bold = ['ok', 'err'] } = o;
    const colors = { cmd: T.hi, out: T.dim, ok: T.hi, err: T.hi, ...(o.colors || {}) };
    frame(g, w, h, o.frame || {});
    const rows = [];
    for (const [tt, s, kind, td] of events) {
      if (t < tt - (kind === 'cmd' ? .5 : 0)) break;
      if (kind === 'cmd') rows.push({ kind, s: s.slice(0, Math.floor(s.length * pp(t, tt, td))), typing: t < tt + td });
      else rows.push({ kind, s });
    }
    const last = rows[rows.length - 1];
    if (!last || last.kind !== 'cmd') rows.push({ kind: 'cmd', s: '', idle: true });
    const vis = rows.slice(-nRows), sx = x + (o.promptW ?? mw(g, prompt[0], size, 700, true) + 22), cx = sx + cmdGap;
    vis.forEach((r, i) => {
      const yy = y0 + i * lh;
      if (r.kind === 'cmd') {
        gt(g, prompt[0], x, yy, { size, mono: true, color: prompt[1], weight: 700 });
        gt(g, sep, sx, yy, { size, mono: true, color: T.dim });
        gt(g, r.s, cx, yy, { size, mono: true, color: colors.cmd });
        if (i === vis.length - 1 && (r.typing || Math.floor(t * 2) % 2 === 0)) { g.fillStyle = T.hi; g.fillRect(cx + 2 + mw(g, r.s, size, 500, true), yy - size * 26 / 30, size * 16 / 30, size * 32 / 30); }
      } else gt(g, r.s, x, yy, { size, mono: true, color: colors[r.kind] || colors.out, weight: bold.includes(r.kind) ? 700 : 500 });
    });
  }
  /**
   * Log / table rows that appear at given times, with a fading "fresh" band.
   * o: { frame, comment: [text, colour] (first line), y0 TB+58 (comment baseline), top (first row baseline, y0+46), lh 46,
   *   rows: [{ at, color, cells: [string, …] }], cols: [{ x, size 30, mono true, weight 500, color ('row' = row colour), align }],
   *   fresh: [delay .3, dur .8, alpha .14], fadeIn .25, maxRows (scroll: only the last N appeared rows, packed) }
   * A row's cell may be a function (row, t) → string for live values.
   */
  function logTable(g, w, h, t, o = {}) {
    const { y0 = TB + 58, lh = 46, rows = [], cols = [], fresh = [.3, .8, .14], fadeIn = .25, maxRows = 0 } = o;
    const top = o.top ?? y0 + 46;
    frame(g, w, h, o.frame || {});
    if (o.comment) gt(g, o.comment[0], cols[0] ? cols[0].x : 28, y0, { size: 26, mono: true, color: o.comment[1] || T.dim });
    let list = rows.map((r, i) => [r, i]);
    if (maxRows) list = list.filter(([r]) => t >= r.at).slice(-maxRows).map(([r], j) => [r, j]);
    for (const [r, i] of list) {
      const k = eo(pp(t, r.at, fadeIn)); if (k <= 0) continue;
      const yy = top + i * lh, col = r.color || T.hi;
      const fr = 1 - pp(t, r.at + fresh[0], fresh[1]);
      if (fr > 0) { g.fillStyle = rgba(col, fresh[2] * fr * k); g.fillRect(0, yy - Math.round(lh * .72), w, lh); }
      cols.forEach((c, j) => {
        let s = r.cells[j]; if (typeof s === 'function') s = s(r, t); if (s == null || s === '') return;
        gt(g, String(s), c.x, yy, { size: c.size ?? 30, mono: c.mono ?? true, weight: c.weight ?? 500, color: c.color === 'row' ? col : c.color || T.hi, align: c.align || 'left', alpha: k });
      });
    }
  }
  /** Dashboard panel: rounded box + title at (x+22, y+44). o: { fill, stroke } */
  function panel(g, x, y, w, h, title, o = {}) {
    rr(g, x, y, w, h, 8); g.fillStyle = o.fill || T.panel; g.fill(); g.lineWidth = 1.5; g.strokeStyle = o.stroke || T.panelBorder; g.stroke();
    if (title) gt(g, title, x + 22, y + 44, { size: 30, weight: 700, color: T.panelTitle });
  }
  /**
   * Line chart inside a box (design px). Returns { X, Y } (data → px).
   * o: { x0, x1, y0 (bottom px), y1 (top px), xMax, yMax, xMin 0, yMin 0, yTicks [], xTicks [], fmtY, fmtX,
   *   fn (x → y), upto (draw up to this x), step, endV (value at upto; default fn(upto)), col, fill true, lw 3.5,
   *   dotColor, minX (draw only when upto > minX), threshold: { v, col, label } }
   */
  function lineChart(g, o) {
    const { x0, x1, y0, y1, xMin = 0, yMin = 0, xMax, yMax, yTicks = [], xTicks = [], fmtY = v => String(v), fmtX = v => String(v), col = T.hi, lw = 3.5 } = o;
    const X = v => x0 + (x1 - x0) * ((v - xMin) / (xMax - xMin)), Y = v => y0 + (y1 - y0) * ((v - yMin) / (yMax - yMin));
    g.lineWidth = 1; g.strokeStyle = T.grid;
    yTicks.forEach(v => { g.beginPath(); g.moveTo(x0, Y(v)); g.lineTo(x1, Y(v)); g.stroke(); gt(g, fmtY(v), x0 - 14, Y(v) + 8, { size: 22, mono: true, color: T.dim, align: 'right' }); });
    xTicks.forEach(v => gt(g, fmtX(v), X(v), y0 + 38, { size: 22, mono: true, color: T.dim, align: 'center' }));
    if (o.threshold) {
      const th = o.threshold;
      g.save(); g.setLineDash([10, 9]); g.strokeStyle = rgba(th.col, .85); g.lineWidth = 2.5; g.beginPath(); g.moveTo(x0, Y(th.v)); g.lineTo(x1, Y(th.v)); g.stroke(); g.restore();
      if (th.label) gt(g, th.label, x0 + 12, Y(th.v) - 14, { size: 26, weight: 800, color: th.col, mono: true });
    }
    const upto = o.upto ?? xMax, step = o.step ?? (xMax - xMin) / 150;
    if (o.fn && upto > (o.minX ?? xMin)) {
      const endV = o.endV ?? o.fn(upto);
      if (o.fill !== false) {
        const gr = g.createLinearGradient(0, y1, 0, y0); gr.addColorStop(0, rgba(col, .3)); gr.addColorStop(1, rgba(col, 0));
        g.beginPath(); g.moveTo(X(xMin), y0);
        for (let c = xMin; c <= upto; c += step) g.lineTo(X(c), Y(o.fn(c)));
        g.lineTo(X(upto), Y(endV)); g.lineTo(X(upto), y0); g.closePath(); g.fillStyle = gr; g.fill();
      }
      g.beginPath(); for (let c = xMin; c <= upto; c += step) { const yy = Y(o.fn(c)); c > xMin ? g.lineTo(X(c), yy) : g.moveTo(X(c), yy); }
      g.lineTo(X(upto), Y(endV)); g.strokeStyle = col; g.lineWidth = lw; g.stroke();
      gdot(g, X(upto), Y(endV), 8, o.dotColor || col);
    }
    return { X, Y };
  }
  /** Stat panel: panel + big value + sparkline. spark: u (0..1 along the line) → 0..1 height, or null. o: { size 66, n 60 } */
  function stat(g, x, y, w, h, label, value, col, spark, o = {}) {
    panel(g, x, y, w, h, label, o);
    gt(g, value, x + 22, y + 140, { size: o.size ?? 66, weight: 800, mono: true, color: col });
    if (!spark) return;
    const n = o.n ?? 60;
    g.beginPath();
    for (let s = 0; s <= n; s++) { const xx = x + 22 + (w - 44) * s / n, yy = y + h - 24 - clamp(spark(s / n)) * 74; s ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
    g.strokeStyle = rgba(col, .8); g.lineWidth = 2.5; g.stroke();
  }
  /** Horizontal meter: label, value text and a bar filled to frac (0..1). o: { w 276, labelSize 28, valueSize 46 } */
  function meter(g, x, y, label, valueText, frac, col, o = {}) {
    const w = o.w ?? 276;
    gt(g, label, x, y, { size: o.labelSize ?? 28, weight: 700, color: T.hi });
    gt(g, valueText, x + w, y + 52, { size: o.valueSize ?? 46, weight: 800, mono: true, color: col, align: 'right' });
    rr(g, x, y + 70, w, 10, 5); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fill();
    rr(g, x, y + 70, Math.max(8, w * clamp(frac)), 10, 5); g.fillStyle = col; g.fill();
  }

  return { theme: T, TS, TB, SANS, MONO, rr, gt, mw, gdot, gcheck, gcross, gchip, tokens, codeLine, frame, editor, terminal, logTable, panel, lineChart, stat, meter };
}

// ═════════════════════════════════════════════════════════════
//  THE DESK (three.js)
// ═════════════════════════════════════════════════════════════
/**
 * createDesk(o) → desk. Builds the offscreen renderer → composer (RenderPass, UnrealBloomPass, OutputPass), the floor,
 * shared textures, the line system and the chip system. Add artifacts with desk.add(); per frame call
 * setCamera → place → (lines: begin, seg/curve) → updateChips → render(ctx), then draw the 2D overlay on ctx.
 * o: {
 *   width 1920, height 1080, fov 40, near .1, far 600, bg (scene background, near-black neutral), ts 1.5,
 *   bloom: { strength .5, radius .45, threshold .86 },
 *   paint (a createPaint() set; used for floor labels and fonts), mono, sans,
 *   floor: { size 900, center [x, z], base [r,g,b] (raw linear), grain: { amount .004, scale [1.5, 28] } | null,
 *     grid: { cell 2, color [r,g,b], k .55, fade .02 } | null, pool [r,g,b] (light-pool colour, raw),
 *     poolColors false (true = placeFn may return pool: hex per artifact; costs a uniform array read per pool per pixel), poolGain .085,
 *     poolShape .55 (depth/width ratio of a pool), fadeTo [r,g,b], fade .012, fadeGain 1.4, pools 16 (max pools),
 *     uniforms {name: {value}}, glsl '' (extra code: may read vW, d, uniforms; adds to vec3 c before the distance fade) },
 *   pool: { dz 1.2, w .7, base .45, rim .9 }  (pool under each artifact: z offset, width × artifact width, k × (base + rim × rimK)),
 *   slab: { color 0x161617, depth .12, inset .06 }, tint .97 (texture brightness), rise .6 (sink when k → 0),
 *   rim: { margin 44, radius 14, width 2.2, outerFall 16, outer .45, topLo .55, topRange .45,
 *          sweepK 1.6, sweepX .7, sweepY 1, sweepW .006, speed .35, phase .07, period 1.6, offset .3, max 1.6 },
 *   refl: { tint .6, opacity .2, fadeTo '#666' }, shadow: { opacity .7, depth 2.6, widen 1.15, dz .25, falloff .12 },
 *   maxSeg 1400, lineSub 40,
 *   chip: { size 34, padX 22, h 64, radius 12, bg '#141414', fg '#f4f4f4', dot 7, lw 3, lift .42, glow 1.6, dotGlow 2, pulse .12, pulseHz 20, fade 8 },
 *   sway: { x .06, y .05, fx .5, fy .37, py 1 }  (idle camera drift, world units / rad per s)
 * }
 */
export function createDesk(o = {}) {
  const W = o.width ?? 1920, H = o.height ?? 1080, FOV = o.fov ?? 40, TS = o.ts ?? 1.5;
  const paint = o.paint || createPaint({ ts: TS, ...(o.mono ? { mono: o.mono } : {}), ...(o.sans ? { sans: o.sans } : {}) });
  const MONO = o.mono || paint.MONO;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(o.bg ?? '#0a0a0b');
  const camera = new THREE.PerspectiveCamera(FOV, W / H, o.near ?? .1, o.far ?? 600);
  scene.add(camera);
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bl = { strength: .5, radius: .45, threshold: .86, ...(o.bloom || {}) };
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), bl.strength, bl.radius, bl.threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const TAN = Math.tan(FOV / 2 * Math.PI / 180);

  /** New offscreen canvas. */
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  /** sRGB CanvasTexture with max anisotropy; mip = false for small sprites. */
  function canvasTex(c, mip = true) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.generateMipmaps = mip; if (!mip) t.minFilter = THREE.LinearFilter; return t; }

  // ── floor ──
  const F = { size: 900, center: [0, 0], base: [.010, .010, .010], grain: { amount: .004, scale: [1.5, 28] }, grid: null, pool: [.06, .06, .06], poolGain: .085,
    poolShape: .55, fadeTo: [.0102, .0102, .0102], fade: .012, fadeGain: 1.4, pools: 16, poolColors: false, uniforms: {}, glsl: '', ...(o.floor || {}) };
  const NPOOL = F.pools;
  const poolDefault = new THREE.Vector3(...F.pool);
  const floorUniforms = { uCam: { value: new THREE.Vector3() }, uPool: { value: Array.from({ length: NPOOL }, () => new THREE.Vector4()) },
    ...(F.poolColors ? { uPC: { value: Array.from({ length: NPOOL }, () => poolDefault.clone()) } } : {}), ...F.uniforms };
  const extraDecl = Object.entries(F.uniforms).map(([k, u]) => {
    const v = u.value, ty = typeof v === 'number' ? 'float' : v.isVector2 ? 'vec2' : v.isVector3 || v.isColor ? 'vec3' : v.isVector4 ? 'vec4' : 'float';
    return `uniform ${ty} ${k};`;
  }).join(' ');
  const grain = F.grain && F.grain.amount ? `float grain = hash(floor(vW.xz * vec2(${glf(F.grain.scale[0])}, ${glf(F.grain.scale[1])}))) * ${glf(F.grain.amount)};
      vec3 c = base + grain;` : 'vec3 c = base;';
  const grid = F.grid ? `{ vec2 gq = abs(fract(vW.xz / ${glf(F.grid.cell ?? 2)}) - .5);
      float lw = fwidth(vW.x / ${glf(F.grid.cell ?? 2)}) * 1.2 + .004;
      float grid = 1. - smoothstep(0., lw, .5 - max(gq.x, gq.y));
      c += ${glv(F.grid.color)} * grid * ${glf(F.grid.k ?? .55)} * exp(-d * ${glf(F.grid.fade ?? .02)}); }` : '';
  const floorMat = new THREE.ShaderMaterial({
    depthWrite: false, fog: false, uniforms: floorUniforms,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vW; uniform vec3 uCam; uniform vec4 uPool[${NPOOL}]; ${F.poolColors ? `uniform vec3 uPC[${NPOOL}];` : ''} ${extraDecl}
    float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
    void main(){
      float d = length(vW.xz - uCam.xz);
      vec3 base = ${glv(F.base)};
      ${grain}
      ${grid}
      for (int i = 0; i < ${NPOOL}; i++) {
        vec4 P = uPool[i];
        if (P.w <= 0.) continue;
        vec2 q = (vW.xz - P.xy) / vec2(P.z, P.z * ${glf(F.poolShape)});
        c += ${F.poolColors ? 'uPC[i]' : glv(F.pool)} * exp(-dot(q,q)) * P.w;
      }
      ${F.glsl}
      float fade = exp(-d * ${glf(F.fade)});
      c = mix(${glv(F.fadeTo)}, c, clamp(fade * ${glf(F.fadeGain)}, 0., 1.));
      gl_FragColor = vec4(c, 1.);
    }`,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(F.size, F.size), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(F.center[0], 0, F.center[1]); floor.renderOrder = 0;
  scene.add(floor);

  // ── shared textures ──
  const RF = { tint: .6, opacity: .2, fadeTo: '#666', ...(o.refl || {}) };
  const SH = { opacity: .7, depth: 2.6, widen: 1.15, dz: .25, falloff: .12, ...(o.shadow || {}) };
  const shadowTex = (() => { const c = mkCanvas(256, 128), g = c.getContext('2d'); const gr = g.createRadialGradient(128, 64, 0, 128, 64, 128); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.setTransform(1, 0, 0, .5, 0, 32); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();
  const reflAlpha = (() => { const c = mkCanvas(4, 256), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#000'); gr.addColorStop(.55, '#000'); gr.addColorStop(1, RF.fadeTo); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); return new THREE.CanvasTexture(c); })();
  const glowTex = (() => { const c = mkCanvas(128, 128), g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.2, 'rgba(255,255,255,.8)'); gr.addColorStop(.5, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();

  // ── artifact registry ──
  const RM = { margin: 44, radius: 14, width: 2.2, outerFall: 16, outer: .45, topLo: .55, topRange: .45, sweepK: 1.6, sweepX: .7, sweepY: 1, sweepW: .006,
    speed: .35, phase: .07, period: 1.6, offset: .3, max: 1.6, ...(o.rim || {}) };
  const SL = { color: 0x161617, depth: .12, inset: .06, ...(o.slab || {}) };
  const PO = { dz: 1.2, w: .7, base: .45, rim: .9, ...(o.pool || {}) };
  const TINT = o.tint ?? .97, RISE = o.rise ?? .6;
  const rimMat = () => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uSize: { value: new THREE.Vector2() }, uM: { value: RM.margin }, uK: { value: 0 }, uC: { value: new THREE.Color() }, uS: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; uniform vec2 uSize; uniform float uM; uniform float uK; uniform vec3 uC; uniform float uS;
      float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
      void main(){
        vec2 full = uSize + 2. * uM; vec2 p = (vUv - .5) * full;
        float d = sdRR(p, uSize * .5 - 2., ${glf(RM.radius)});
        float rim = exp(-abs(d) / ${glf(RM.width)});
        float outer = d > 0. ? exp(-d / ${glf(RM.outerFall)}) * ${glf(RM.outer)} : 0.;
        float top = ${glf(RM.topLo)} + ${glf(RM.topRange)} * clamp(p.y / full.y + .5, 0., 1.);
        float sweep = exp(-pow((p.x / full.x * ${glf(RM.sweepX)} - p.y / full.y * ${glf(RM.sweepY)}) - uS, 2.) / ${glf(RM.sweepW)});
        vec3 c = uC * (rim * (top + ${glf(RM.sweepK)} * sweep) + outer);
        gl_FragColor = vec4(c * uK, 1.);
      }`,
  });
  const ART = {}, ORDER = [];
  /**
   * Register an artifact. spec: { w, h (design px), pos [x, y, z] (centre, world), yaw (rad), draw(g, t) (paints the
   * canvas; call paint.frame first, it sets the ts transform), live: [[t0, t1], …] (when the content changes; outside,
   * the texture holds the state at the last edge), fps 60 (redraw quantisation), slab (hex, optional) }.
   * Registration order = pool order and draw order for ties. Returns the record (grp, mesh, tex, …).
   */
  function add(id, s) {
    s = { yaw: 0, live: [], ...s };
    const ww = s.w / 100, hh = s.h / 100;
    const c = mkCanvas(Math.round(s.w * TS), Math.round(s.h * TS)), g = c.getContext('2d');
    const tex = canvasTex(c);
    const grp = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .02, side: THREE.FrontSide, fog: false, color: new THREE.Color(TINT, TINT, TINT) });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(ww, hh), mat); mesh.renderOrder = 5; mesh.position.z = .061;
    const slabMat = new THREE.MeshBasicMaterial({ color: s.slab ?? SL.color, transparent: true, fog: false });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(ww - SL.inset, hh - SL.inset, SL.depth), slabMat); slab.renderOrder = 4;
    const rm = rimMat(); rm.uniforms.uSize.value.set(s.w, s.h);
    const rim = new THREE.Mesh(new THREE.PlaneGeometry(ww + 2 * RM.margin / 100, hh + 2 * RM.margin / 100), rm); rim.position.z = .07; rim.renderOrder = 6;
    grp.add(slab); grp.add(mesh); grp.add(rim);
    scene.add(grp);
    const reflMat = new THREE.MeshBasicMaterial({ map: tex, alphaMap: reflAlpha, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, color: new THREE.Color(RF.tint, RF.tint, RF.tint) });
    const refl = new THREE.Mesh(new THREE.PlaneGeometry(ww, hh), reflMat); refl.renderOrder = 1; scene.add(refl);
    const shMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, fog: false });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(ww * SH.widen, SH.depth), shMat); shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 2; scene.add(shadow);
    const a = { id, s, c, g, tex, grp, mesh, mat, slab, slabMat, rim, rm, refl, reflMat, shadow, shMat, key: null };
    ART[id] = a; ORDER.push(id); return a;
  }
  /** Design px (x, y) on artifact id → world point, using its current placement (call after place()). z: lift off the face. */
  function artPt(id, x, y, z = .07) {
    const a = ART[id]; a.grp.updateMatrixWorld();
    return a.grp.localToWorld(new THREE.Vector3((x / a.s.w - .5) * a.s.w / 100, (.5 - y / a.s.h) * a.s.h / 100, z));
  }
  /** The time an artifact's content shows at t, given its live intervals (exported for custom caches). */
  function liveT(iv, t) {
    if (!iv.length) return 0;
    let last = iv[0][0];
    for (const [a, b] of iv) { if (t < a) return last; if (t <= b) return t; last = b; }
    return last;
  }

  // ── camera ──
  const frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sphere = new THREE.Sphere();
  const SW = { x: .06, y: .05, fx: .5, fy: .37, py: 1, ...(o.sway || {}) };
  /**
   * Framed pose: puts world point c at screen (sx, sy) px with s screen px per design px (so text size on screen is
   * predictable), looking along yaw / pitch (degrees; yaw + turns toward −x, pitch + looks down). → { pos, tgt, yaw }
   */
  function fr(c, s, sx, sy, yawDeg = 0, pitchDeg = 0) {
    const yaw = yawDeg * Math.PI / 180, pit = pitchDeg * Math.PI / 180;
    const dir = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pit), -Math.sin(pit), -Math.cos(yaw) * Math.cos(pit));
    const d = H / (200 * s * TAN), ppu = s * 100;
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();
    const C = new THREE.Vector3(...c);
    const pos = C.clone().addScaledVector(dir, -d).addScaledVector(right, (W / 2 - sx) / ppu).addScaledVector(up, (sy - H / 2) / ppu);
    return { pos, tgt: pos.clone().addScaledVector(dir, d), yaw };
  }
  /** World point that lands at screen (sx, sy) for a pose, at the depth where 1 design px = s screen px (pop-up cards). */
  function onPose(pose, sx, sy, s) {
    const dir = pose.tgt.clone().sub(pose.pos).normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();
    const L = H / (200 * s * TAN), half = L * TAN;
    return pose.pos.clone().addScaledVector(dir, L).addScaledVector(right, (sx - W / 2) / (H / 2) * half).addScaledVector(up, (H / 2 - sy) / (H / 2) * half);
  }
  /** Apply a { pos, tgt } pose at time t (adds the idle sway) and refresh the frustum used for texture culling. */
  function setCamera(cam, t) {
    camera.position.copy(cam.pos);
    camera.position.x += Math.sin(t * SW.fx) * SW.x; camera.position.y += Math.sin(t * SW.fy + SW.py) * SW.y;
    camera.lookAt(cam.tgt); camera.updateMatrixWorld();
    _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(_pm);
  }
  /** World point → [screen x, screen y, ndc z] for the 2D overlay. */
  function proj(v) { const q = v.clone().project(camera); return [(q.x + 1) / 2 * W, (1 - q.y) / 2 * H, q.z]; }

  /**
   * Place every artifact for frame t. placeFn(id, t) → { k 0..1 presence, pos?, yaw?, rimK 0..max, rimCol (hex), bright 1,
   * grounded true (false = floating card: no reflection, shadow or pool), pool (hex; default floor.pool) } (missing fields = defaults).
   * Also fills the floor light pools and redraws visible textures whose live time changed.
   */
  function place(t, placeFn) {
    const pools = floorUniforms.uPool.value, pcs = F.poolColors ? floorUniforms.uPC.value : null; let pi = 0;
    for (const id of ORDER) {
      const a = ART[id], pl = (placeFn && placeFn(id, t)) || {}, k = pl.k ?? 1;
      const [x, y, z] = pl.pos || a.s.pos, yaw = pl.yaw ?? a.s.yaw, rimK = clamp(pl.rimK ?? 0, 0, RM.max), br = pl.bright ?? 1, grounded = pl.grounded ?? true;
      const rise = (1 - k) * RISE;
      a.grp.position.set(x, y - rise, z); a.grp.rotation.set(0, yaw, 0); a.grp.updateMatrixWorld();
      const vis = k > .003;
      a.grp.visible = vis; a.refl.visible = vis && grounded; a.shadow.visible = vis && grounded;
      a.mat.opacity = k; a.slabMat.opacity = k;
      if (br !== a._br) { a.mat.color.setScalar(TINT * br); a.reflMat.color.setScalar(RF.tint * br); a._br = br; }
      a.rm.uniforms.uK.value = rimK * k * br; a.rm.uniforms.uC.value.set(pl.rimCol || '#ffffff'); a.rm.uniforms.uS.value = ((t * RM.speed + x * RM.phase) % RM.period) - RM.offset;
      a.refl.position.set(x, -(y - rise), z + .06); a.refl.rotation.set(0, yaw, 0); a.refl.scale.set(1, -1, 1); a.reflMat.opacity = RF.opacity * k;
      a.shadow.position.set(x, .012, z + SH.dz); a.shMat.opacity = SH.opacity * k * clamp(1.4 - (y - a.s.h / 200) * SH.falloff);
      if (pi < NPOOL && grounded) {
        pools[pi].set(x, z + PO.dz, a.s.w / 100 * PO.w, k * (PO.base + PO.rim * clamp(rimK)));
        if (F.poolColors) { if (pl.pool) pcs[pi].set(...new THREE.Color(pl.pool).multiplyScalar(F.poolGain).toArray()); else pcs[pi].copy(poolDefault); }
        pi++;
      }
      if (vis) {
        _sphere.set(a.grp.position, Math.hypot(a.s.w, a.s.h) / 200);
        if (frustum.intersectsSphere(_sphere)) {
          const fps = a.s.fps || 60, key = Math.round(liveT(a.s.live, t) * fps);
          if (a.key !== key) { a.g.setTransform(1, 0, 0, 1, 0, 0); a.s.draw(a.g, key / fps); a.tex.needsUpdate = true; a.key = key; }
        }
      }
    }
    for (; pi < NPOOL; pi++) pools[pi].set(0, 0, 1, 0);
  }

  // ── glowing lines: instanced screen-space quads, additive ──
  const MAXSEG = o.maxSeg ?? 1400, LSUB = o.lineSub ?? 40;
  const lineGeo = new THREE.InstancedBufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3));
  lineGeo.setIndex([0, 1, 2, 0, 2, 3]);
  const iA = new THREE.InstancedBufferAttribute(new Float32Array(MAXSEG * 3), 3), iB = new THREE.InstancedBufferAttribute(new Float32Array(MAXSEG * 3), 3);
  const iC = new THREE.InstancedBufferAttribute(new Float32Array(MAXSEG * 3), 3), iWd = new THREE.InstancedBufferAttribute(new Float32Array(MAXSEG), 1);
  [iA, iB, iC, iWd].forEach(a => a.setUsage(THREE.DynamicDrawUsage));
  lineGeo.setAttribute('iA', iA); lineGeo.setAttribute('iB', iB); lineGeo.setAttribute('iC', iC); lineGeo.setAttribute('iW', iWd);
  const lineMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uRes: { value: new THREE.Vector2(W, H) } },
    vertexShader: `attribute vec3 iA; attribute vec3 iB; attribute vec3 iC; attribute float iW; uniform vec2 uRes; varying vec3 vC; varying float vS;
      void main(){
        vec4 a = projectionMatrix * viewMatrix * vec4(iA, 1.);
        vec4 b = projectionMatrix * viewMatrix * vec4(iB, 1.);
        const float N = .12;
        if (a.w < N && b.w < N) { gl_Position = vec4(2., 2., 2., 1.); vC = vec3(0.); vS = 0.; return; }
        if (a.w < N) a = mix(a, b, (N - a.w) / (b.w - a.w));
        if (b.w < N) b = mix(b, a, (N - b.w) / (a.w - b.w));
        vec2 sa = a.xy / a.w * uRes * .5, sb = b.xy / b.w * uRes * .5;
        vec2 dir = sb - sa; float L = length(dir); dir = L > 1e-4 ? dir / L : vec2(1., 0.);
        vec2 n = vec2(-dir.y, dir.x);
        vec4 c = mix(a, b, position.x);
        vec2 off = (n * position.y + dir * (position.x * 2. - 1.) * .5) * iW;
        c.xy += off / (uRes * .5) * c.w;
        gl_Position = c; vC = iC; vS = position.y;
      }`,
    fragmentShader: `varying vec3 vC; varying float vS; void main(){ float f = exp(-vS * vS * 3.5); gl_FragColor = vec4(vC * f, 1.); }`,
  });
  const lineMesh = new THREE.Mesh(lineGeo, lineMat); lineMesh.frustumCulled = false; lineMesh.renderOrder = 7; scene.add(lineMesh);
  let NS = 0;
  const _c = new THREE.Color();
  /** Start this frame's lines (call once per frame before seg / curve). */
  function beginLines() { NS = 0; }
  /** One glowing segment a → b (world Vector3s): colour hex, intensity (additive, ~.1–2), width in screen px. */
  function seg(a, b, col, inten, wd) {
    if (NS >= MAXSEG || inten <= .002) return;
    _c.set(col);
    iA.array.set([a.x, a.y, a.z], NS * 3); iB.array.set([b.x, b.y, b.z], NS * 3);
    iC.array.set([_c.r * inten, _c.g * inten, _c.b * inten], NS * 3); iWd.array[NS] = wd; NS++;
  }
  /**
   * Bezier P drawn as glowing segments. k = reveal 0..1 from the start, base = intensity, wd = px width,
   * hot = 0..1 position of a bright travelling head (−1 none), dash = skip every other segment, sub = segment count.
   */
  function curve(P, k, col, base, wd = 3, hot = -1, dash = false, sub = LSUB) {
    if (k <= 0) return;
    let prev = bez(P, 0);
    for (let i = 1; i <= sub; i++) {
      const u = k * i / sub, q = bez(P, u);
      if (!dash || i % 2) {
        const heat = hot >= 0 ? Math.exp(-Math.pow((u - hot) * 9, 2)) : 0;
        seg(prev, q, col, base + heat * 1.6, wd + heat * 3);
      }
      prev = q;
    }
  }

  // ── chips: the thing in flight (a file, a field, a packet), sprites with a glow ──
  const CH = { size: 34, padX: 22, h: 64, radius: 12, bg: '#141414', fg: '#f4f4f4', dot: 7, lw: 3, lift: .42, glow: 1.6, dotGlow: 2, pulse: .12, pulseHz: 20, fade: 8, ...(o.chip || {}) };
  /** Chip texture for a label (mono, dot + text in a pill). → { t: texture, aspect } */
  function chipTex(label, col) {
    const size = CH.size, padX = CH.padX;
    const c0 = mkCanvas(8, 8).getContext('2d'); c0.font = `700 ${size}px ${MONO}`;
    const w = Math.ceil(c0.measureText(label).width + padX * 2 + 30), h = CH.h;
    const c = mkCanvas(w * 2, h * 2), g = c.getContext('2d'); g.scale(2, 2);
    paint.rr(g, 2, 2, w - 4, h - 4, CH.radius); g.fillStyle = CH.bg; g.fill(); g.lineWidth = CH.lw; g.strokeStyle = col; g.stroke();
    paint.gdot(g, padX + 4, h / 2, CH.dot, col);
    g.font = `700 ${size}px ${MONO}`; g.fillStyle = CH.fg; g.textBaseline = 'middle'; g.fillText(label, padX + 22, h / 2 + 2);
    const t = canvasTex(c, false); return { t, aspect: w / h };
  }
  const CHIPS = [];
  const glowSprite = (col, mul) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(col).multiplyScalar(mul), blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, fog: false })); s.renderOrder = 8; scene.add(s); return s; };
  const motion = (a, b, c) => typeof a === 'function' ? { posFn: a, size: b } : { t0: a, dur: b, pathFn: c };
  /**
   * Flying label. Either addChip(label, col, t0, dur, pathFn, size .62) — travels pathFn() (a bezier, re-evaluated
   * each frame) from t0 over dur s, eased, fading at both ends — or addChip(label, col, posFn, size) with
   * posFn(t) → { q: Vector3, fade? } | null (see legs()). size = world height.
   */
  function addChip(label, col, a, b, c, d) {
    const m = motion(a, b, c), size = (typeof a === 'function' ? b : d) ?? .62;
    const { t, aspect } = chipTex(label, col);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, depthWrite: false, transparent: true, fog: false }));
    sp.renderOrder = 9; sp.center.set(.5, .5); scene.add(sp);
    const gl = glowSprite(col, CH.glow);
    const chip = { sp, gl, ...m, size, aspect, label, col }; CHIPS.push(chip); return chip;
  }
  /** Glow dot only (packets in a burst): addDot(col, t0, dur, pathFn, size .5) or addDot(col, posFn, size). */
  function addDot(col, a, b, c, d) {
    const m = motion(a, b, c), size = (typeof a === 'function' ? b : d) ?? .5;
    const gl = glowSprite(col, CH.dotGlow);
    const chip = { sp: null, gl, ...m, size }; CHIPS.push(chip); return chip;
  }
  /** Move / show / hide every chip for frame t. */
  function updateChips(t) {
    for (const c of CHIPS) {
      let q = null, fade = 1;
      if (c.posFn) { const r = c.posFn(t); if (r) { q = r.q; fade = r.fade ?? 1; } }
      else { const r = pp(t, c.t0, c.dur); if (r > 0 && r < 1) { q = bez(c.pathFn(), eio(r)); fade = Math.min(1, r * CH.fade, (1 - r) * CH.fade); } }
      const on = !!q;
      if (c.sp) c.sp.visible = on; c.gl.visible = on;
      if (!on) continue;
      if (c.sp) {
        c.sp.position.copy(q).add(new THREE.Vector3(0, CH.lift, 0));
        c.sp.scale.set(c.size * c.aspect, c.size, 1); c.sp.material.opacity = fade;
      }
      c.gl.position.copy(q); const gs = (c.sp ? 1.1 : c.size * 2.2) * (1 + CH.pulse * Math.sin(t * CH.pulseHz)); c.gl.scale.set(gs, gs, 1); c.gl.material.opacity = fade;
    }
  }

  // ── floor labels and dust ──
  const FLOOR_LABELS = [];
  /**
   * Text painted flat on the floor (who owns which area). lines: [big, small?]; wU = width in world units.
   * o: { size 96, subSize 64, subColor } → Mesh (set position; fade with material.opacity, starts at 0).
   */
  function floorLabel(lines, col, wU, o2 = {}) {
    const c = mkCanvas(1400, 260), g = c.getContext('2d');
    const paintIt = () => { g.clearRect(0, 0, 1400, 260); paint.gt(g, lines[0], 20, 110, { size: o2.size ?? 96, weight: 800, color: col });
      if (lines[1]) paint.gt(g, lines[1], 24, 210, { size: o2.subSize ?? 64, weight: 600, color: o2.subColor || 'rgba(220,220,220,0.75)' }); t.needsUpdate = true; };
    const t = canvasTex(c); paintIt(); FLOOR_LABELS.push(paintIt);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wU, wU * 260 / 1400), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false, opacity: 0 }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 3; scene.add(m); return m;
  }
  /**
   * Seeded dust in a box. o: { n 600, x [min, max], y [min, max], z [min, max], color, size .05, opacity .35, seed 17,
   * spin .004 (rad/s about y), bob [freq .3, amp .15] } → { points, at(t) } (call at(t) each frame).
   */
  function addDust(o2 = {}) {
    const D = { n: 600, x: [-15, 105], y: [0, 16], z: [-20, 14], color: 0xd8d8d8, size: .05, opacity: .35, seed: 17, spin: .004, bob: [.3, .15], ...o2 };
    const R = rng(D.seed), pos = new Float32Array(D.n * 3);
    for (let i = 0; i < D.n; i++) { pos[i * 3] = D.x[0] + R() * (D.x[1] - D.x[0]); pos[i * 3 + 1] = D.y[0] + R() * (D.y[1] - D.y[0]); pos[i * 3 + 2] = D.z[0] + R() * (D.z[1] - D.z[0]); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: D.size, color: D.color, transparent: true, opacity: D.opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(points);
    return { points, at(t) { points.rotation.y = t * D.spin; points.position.y = Math.sin(t * D.bob[0]) * D.bob[1]; } };
  }

  /** After fonts load: rebuild chip textures, invalidate artifact textures, repaint floor labels. */
  function fontsReady() {
    for (const c of CHIPS) if (c.sp) { const { t: tex, aspect } = chipTex(c.label, c.col); c.sp.material.map.dispose(); c.sp.material.map = tex; c.aspect = aspect; }
    for (const id of ORDER) ART[id].key = null;
    FLOOR_LABELS.forEach(f => f());
  }

  /** Flush lines, render the 3D frame and copy it onto the 2D context ctx (draw the overlay afterwards). */
  function render(ctx) {
    iA.needsUpdate = iB.needsUpdate = iC.needsUpdate = iWd.needsUpdate = true;
    lineGeo.instanceCount = Math.max(1, NS);
    if (!NS) iC.array.fill(0, 0, 3);
    floorUniforms.uCam.value.copy(camera.position);
    composer.render();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.drawImage(renderer.domElement, 0, 0, W, H);
  }

  return {
    THREE, W, H, TS, TAN, renderer, scene, camera, composer, bloom, paint, floor, floorMat, floorUniforms, glowTex,
    mkCanvas, canvasTex, add, ART, ORDER, artPt, liveT, place, fr, onPose, setCamera, proj,
    beginLines, seg, curve, bez, link, lift, straight, chipTex, addChip, addDot, updateChips, CHIPS, floorLabel, addDust, fontsReady, render,
    get segCount() { return NS; },
  };
}
