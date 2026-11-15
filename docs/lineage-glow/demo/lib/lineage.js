// lineage-glow · lineage.js — the shapes of the style: a doubling ancestor tree (fan-in), a single line of descent
// (chain), a burst of countless lines from one point (fan-out), and the convergence morph (many ends drawn into one).
// Layouts are pure data built once with a seed; draw(g, state) is called every frame with time-derived state.
import { clamp, lerp, rng, sCurve, bez, mix2, ease } from './core.js';

// ── generation spacing: near generations wide apart, far ones packed into thin bands under the horizon ────────────────
// stack({ first: 260, ratio: .82, min: 7 }) → y(k) for k = 0 … (k=0 is the root at y = 0; up is negative)
export function stack({ first = 260, ratio = .82, min = 6 } = {}) {
  const ys = [0]; let d = first;
  for (let k = 1; k < 80; k++) { ys.push(ys[k - 1] - d); d = Math.max(min, d * ratio); }
  const y = k => { if (k <= 0) return 0; const i = Math.floor(k), f = k - i; return lerp(ys[i], ys[Math.min(79, i + 1)], f); };
  y.list = ys; return y;
}

// ── the ancestor tree: generation k has 2^k people; person (k, i) has parents (k+1, 2i) and (k+1, 2i+1) ───────────────
// binaryTree({ y: stack(...), half: k => half-width of generation k (world px; default a cone: 70 + |y| × slope), explicit: 8, fibres: 420, seed })
export function binaryTree({ y = stack(), half = null, slope = .78, explicit = 8, fibres = 420, seed = 7 } = {}) {
  // default width: proportional to the height above the root, so the whole tree is a cone that widens to the horizon
  half = half || (k => 70 + Math.abs(y(k)) * slope);
  const T = { y, half, explicit, fibres };
  T.pos = (k, i) => { const n = 2 ** k, h = half(k); return [n === 1 ? 0 : -h + (i + .5) * (2 * h / n), y(k)]; };
  T.link = (k, i, side) => sCurve(T.pos(k, i), T.pos(k + 1, 2 * i + side), .5);
  // sampled fibres for a far generation band (too many people to draw one by one): child x random in gen k, parent x
  // follows proportionally with a little scatter — the dense "hair" of the reference
  const band = new Map();
  T.band = k => {
    if (!band.has(k)) {
      const r = rng(seed * 997 + k), list = [], n = Math.min(2 ** (k + 1), fibres), h0 = half(k), h1 = half(k + 1), y0 = y(k), y1 = y(k + 1);
      for (let j = 0; j < n; j++) {
        const u = (j + r()) / n * 2 - 1, x0 = u * h0, x1 = clamp(u * h1 + (r() - .5) * (h1 * 2 / n) * 3, -h1, h1);
        list.push(sCurve([x0, y0], [x1, y1], .5));
      }
      band.set(k, list);
    }
    return band.get(k);
  };
  // draw. s: { grown: generations grown (fractional, from the root up), a: alpha, on: k => 0..1 (switch per generation),
  //   onNode: (k, i) => 0..1 (per person, explicit generations only), nodes: draw dots up to this generation,
  //   rows: alpha of the bright row at each far generation, labels: { 'k,i': 'text' } }
  T.draw = (g, s = {}) => {
    const grown = s.grown ?? 99, A = s.a ?? 1, onG = s.on ?? (() => 1), last = Math.ceil(grown);
    for (let k = 0; k < last; k++) {
      const u = clamp(grown - k), a = A * (s.fade ? s.fade(k) : 1);
      if (a <= .002 || !g.visibleY(y(k), 600)) continue;
      if (k < explicit) {
        const n = 2 ** k, w = Math.max(.7, 2.4 - k * .22);
        if (s.onNode && k <= 6) {
          for (let i = 0; i < n; i++) for (const side of [0, 1]) g.curve(T.link(k, i, side), { u1: u, a, w, on: s.onNode(k + 1, 2 * i + side), tip: u < 1 ? 1 : 0 });
        } else {
          const list = []; for (let i = 0; i < n; i++) list.push(T.link(k, i, 0), T.link(k, i, 1));
          const part = u < 1 ? list.map(c => partial(c, u)) : list;
          g.fibers(part, { a: a * (k < 4 ? .95 : .75), w, halo: true, on: onG(k) });
        }
      } else {
        const list = T.band(k), part = u < 1 ? list.map(c => partial(c, u)) : list;
        g.fibers(part, { a: a * clamp(.5 - (k - explicit) * .015, .14, .5), w: .9, on: onG(k) });
        if ((s.rows ?? .35) > 0 && u >= 1) row(g, half(k + 1), y(k + 1), a * (s.rows ?? .35), onG(k));
      }
    }
    // people (dots) for the near generations
    const nd = Math.min(s.nodes ?? 6, last);
    for (let k = 1; k <= nd; k++) {
      const n = 2 ** k, vis = clamp((grown - k + 1) * 3) * A; if (vis <= .01) continue;
      for (let i = 0; i < n; i++) { const p = T.pos(k, i); g.node(p[0], p[1], { r: Math.max(2, 6.5 - k * .8), a: vis * (k < 5 ? 1 : .6), on: s.onNode ? s.onNode(k, i) : onG(k - 1) }); }
    }
    if (s.labels) for (const key in s.labels) { const [k, i] = key.split(',').map(Number); if (grown >= k) { const p = T.pos(k, i); g.label(p[0], p[1], s.labels[key], { a: A * clamp((grown - k) * 3) * (s.labelA ?? 1), dy: 38, size: s.labelSize ?? 26 }); } }
  };
  return T;
}
const partial = (c, u) => { if (u >= 1) return c; const a = mix2(c[0], c[1], u), b = mix2(c[1], c[2], u), d = mix2(c[2], c[3], u), e = mix2(a, b, u), f = mix2(b, d, u); return [c[0], a, e, mix2(e, f, u)]; };
function row(g, h, y, a, on) { g.fibers([[[-h, y], [-h / 3, y], [h / 3, y], [h, y]]], { a: a, w: 1.6, on, halo: true }); }

// ── a single line of descent: n people from the root (i = 0, bottom) upward. x: i => world x (a slow wander reads as
// a living thread; keep |x| small), y: i => world y. Returns pos(i), link(i) (i → i+1), draw(g, state).
export function chain(n, { y = i => -i * 120, x = i => 0, k = .5 } = {}) {
  const C = { n, y, x };
  C.pos = i => [x(i), y(i)];
  C.link = i => sCurve(C.pos(i), C.pos(i + 1), k);
  // s: { grown: people reached (fractional; 0 = only the first), down: grow from the top person toward the root,
  //   a, on: i => 0..1, w, linkW: i => w, linkA: i => a, nodeR: i => r, flare: i => 0..1, labels: [..] or i => text,
  //   labelA: i => alpha, side: i => -1|1 (label left / right), labelSize, labelColor: i => css, labelGlow: i => 0..1 }
  C.draw = (g, s = {}) => {
    // down: light starts at the TOP person (n-1) and travels toward the root ("A begat B" read downward)
    const grown = s.grown ?? n - 1, A = s.a ?? 1, on = s.on ?? (() => 1), from = s.from ?? 0, w = s.w ?? 2.4, down = !!s.down;
    const segOrder = i => down ? n - 2 - i : i, nodeOrder = i => down ? n - 1 - i : i;
    // fadeTop: screen y above which the line fades out (keeps the light off the type at the top of the frame)
    const fade = i => s.fadeTop == null ? 1 : clamp((g.Y(C.pos(i)[1]) - s.fadeTop) / 220);
    for (let i = from; i < n - 1; i++) {
      const u = clamp(grown - segOrder(i)); if (u <= 0) continue;
      if (!g.visibleY(C.pos(i)[1], 400) && !g.visibleY(C.pos(i + 1)[1], 400)) continue;
      const c = C.link(i);
      g.curve(down ? [c[3], c[2], c[1], c[0]] : c, { u1: u, a: A * Math.min(1, (fade(i) + fade(i + 1)) * .6) * (s.linkA ? s.linkA(i) : 1), w: s.linkW ? s.linkW(i) : w, on: Math.min(on(i), on(i + 1)), tip: u < 1 ? 1 : 0 });
    }
    for (let i = from; i < n; i++) {
      const o = nodeOrder(i); if (grown < o - 1e-6) continue;
      const p = C.pos(i); if (!g.visibleY(p[1], 200)) continue;
      const appear = clamp((grown - o) * 4 + 1) * fade(i), r = s.nodeR ? s.nodeR(i) : 5;
      g.node(p[0], p[1], { r, a: A * appear, on: on(i), flare: s.flare ? s.flare(i) : 0 });
      const text = typeof s.labels === 'function' ? s.labels(i) : s.labels?.[i];
      const la = A * appear * (s.labelA ? s.labelA(i) : 1);
      if (text && la > .01) { const side = s.side ? s.side(i) : (i % 2 ? 1 : -1); g.label(p[0], p[1], text, { a: la, dx: side * (s.labelGap ?? 24), dy: 2, align: side > 0 ? 'left' : 'right', size: s.labelSize ?? 26, color: s.labelColor?.(i), glow: s.labelGlow?.(i) ?? 0 }); }
    }
  };
  return C;
}

// ── fan-out: countless lines leaving one point and spreading to a wide row (descendants, reach, "all nations") ─────────
// fan({ from: [0,0], n: 900, to: (j, r) => [x, y], lift: .45, seed }) → array of curves (build once; stamp via g.cached)
export function fan({ from = [0, 0], n = 600, to = (j, r) => [(r() * 2 - 1) * 520, -900 - r() * 200], lift = .5, seed = 3 } = {}) {
  const r = rng(seed), list = [];
  for (let j = 0; j < n; j++) { const e = to(j, r); list.push(sCurve(from, e, lift * (0.8 + r() * .4))); }
  return list;
}
// convergence: draw the far ends of curves toward one point while the middles bow outward — the lantern / onion shape
// of many lines meeting (shared ancestors, one source). u: 0 (as built) … 1 (fully converged). bulge: outward push.
export function converge(list, point, u, bulge = .35) {
  if (u <= 0) return list;
  const e = ease.inOut(clamp(u));
  return list.map(c => {
    const end = mix2(c[3], point, e), dx = c[3][0] - point[0];
    const c2 = [c[2][0] + dx * bulge * e, lerp(c[2][1], point[1] + (c[0][1] - point[1]) * .55, e)];
    return [c[0], c[1], c2, end];
  });
}
export { bez };
