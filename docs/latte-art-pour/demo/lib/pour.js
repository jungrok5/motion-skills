// latte-art-pour · pour.js — the pour score: a list of barista moves → the pitcher's track in time.
// Pure ES module (no DOM, no Math.random). Coordinates are the cup's liquid surface: the unit disc, x right, y down,
// radius 1 = the liquid's edge. `dir` is the way the milk is poured, in degrees on screen (180 = toward the left, the
// pitcher held on the right). Height h: 0 = spout on the surface (foam rides up and draws), 1 = high (milk dives under
// the crema, nothing white appears). Flow q: 0 … 1.
//
// Moves (every move has `dur` in seconds; `say` starts a new step label on screen):
//   fill   { at, swirl, q }        high, circling `swirl` around `at`: the base. No white.
//   drop   { at, q }               bring the spout down to the surface (a small lift first — anticipation); white appears
//   pour   { to, q }               stay low and pour (a blob grows ahead of the spout), drifting to `to`
//   wiggle { to, hold, amp, ampTo, hz, q }  low, rocking side to side across the pour direction — in place for `hold`
//                                  seconds, then drifting to `to`:
//                                  the rocking lays alternating lobes → rosetta leaves
//   punch  { to, q }               lift, move to `to` with a trickle, then a full high burst that punches a brown hole
//                                  (the gap that keeps a tulip's stacks apart) — follow with `drop`
//   lift   { q }                   raise the spout (thin stream)
//   cut    { to, q }               high thin stream dragged to `to`, then off: the draw-through (heart point, rosetta stem)
//   move   { to, h, q }            anything else
//   turn   { dir }                 change the pour direction (the pitcher swings round the cup)
//   stop   {}                      flow off, spout up
//   etch   { path, ink, width }    the pitcher has gone; a pin drags through the surface along `path` (≥ 2 points),
//                                  leaving a thin line of crema (ink 0, default) or foam (ink 1); ink null = drag only
//   wait   {}                      nothing
// The pitcher's entrance before the first move and its exit after the last pour are added automatically.

import { E, keys, clamp } from './principles.js';

const ease = E.inOut;
export const MOVES = ['fill', 'drop', 'pour', 'wiggle', 'punch', 'lift', 'cut', 'move', 'turn', 'stop', 'etch', 'wait'];

function catmull(pts, u) {
  const n = pts.length - 1, s = clamp(u) * n, i = Math.min(n - 1, Math.floor(s)), f = s - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  const c = (a, b, c2, d) => .5 * (2 * b + (-a + c2) * f + (2 * a - 5 * b + 4 * c2 - d) * f * f + (-a + 3 * b - 3 * c2 + d) * f * f * f);
  return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
}

// compile(moves, { t0, dir, enter, exit }) → { t0, t1, pourEnd, duration, steps, moves, at(t) }
// at(t) → { x, y, h, q, dir, dx, dy, enter, pin: { x, y, on, enter } | null, step, move }
export function compile(moves, o = {}) {
  const t0 = o.t0 ?? 0, enterDur = o.enter ?? .9, exitDur = o.exit ?? .8;
  for (const m of moves) {
    if (!MOVES.includes(m.do)) throw new Error(`pour: unknown move "${m.do}" (moves: ${MOVES.join(', ')})`);
    if (!(m.dur > 0)) throw new Error(`pour: move "${m.do}" needs dur > 0`);
  }
  const K = [], wig = [], swirls = [], pins = [], steps = [], spans = [];
  let t = t0, x = moves[0]?.at?.[0] ?? moves[0]?.to?.[0] ?? .3, y = moves[0]?.at?.[1] ?? moves[0]?.to?.[1] ?? 0;
  let h = 1, q = 0, dir = o.dir ?? 180;
  // the pitcher arrives (enter 0 → 1) above the first point, high, no flow
  K.push({ t, x, y, h, q, dir, enter: 0, pinE: 0 });
  t += enterDur; K.push({ t, x, y, h, q, dir, enter: 1 });
  let pitcherOut = false, pourEnd = t;
  const exitPitcher = () => {
    if (pitcherOut) return;
    K.push({ t, q: 0, h: 1, enter: 1 }); t += exitDur; K.push({ t, enter: 0 }); pitcherOut = true;
  };
  for (const m of moves) {
    const a = t, d = m.dur, b = a + d, to = m.to || m.at || [x, y];
    if (m.say) steps.push({ t0: a, label: m.say, do: m.do });
    spans.push({ t0: a, t1: b, do: m.do, say: m.say || null });
    switch (m.do) {
      case 'fill': {
        const qq = m.q ?? .85; [x, y] = m.at || [x, y];
        K.push({ t: a + Math.min(.4, d * .3), x, y, h: 1, q: qq });
        K.push({ t: b, x, y, h: 1, q: qq });
        swirls.push({ a, b, r: m.swirl ?? .16, hz: m.hz ?? .55 }); h = 1; q = qq; break;
      }
      case 'drop': {
        const qq = m.q ?? .9; [x, y] = to;
        // anticipation: the spout lifts a touch, then comes down to the surface
        K.push({ t: a + d * .3, x, y, h: Math.min(1.12, h + .12), q: Math.max(.25, q * .7) });
        K.push({ t: b, x, y, h: 0, q: qq }); h = 0; q = qq; break;
      }
      case 'pour': { const qq = m.q ?? .95; [x, y] = to; K.push({ t: a + Math.min(.25, d * .3), h: 0, q: qq }); K.push({ t: b, x, y, h: 0, q: qq }); h = 0; q = qq; break; }
      case 'wiggle': {
        const qq = m.q ?? .9, x0 = x, y0 = y; [x, y] = to;
        K.push({ t: a + Math.min(.25, d * .2), h: 0, q: qq });
        if (m.hold) K.push({ t: a + Math.min(m.hold, d - .2), x: x0, y: y0 });
        K.push({ t: b, x, y, h: 0, q: qq });
        wig.push({ a, b, amp: m.amp ?? .1, ampTo: m.ampTo ?? m.amp ?? .1, hz: m.hz ?? 3.5 }); h = 0; q = qq; break;
      }
      case 'punch': {
        const qq = m.q ?? 1; [x, y] = to;
        K.push({ t: a + d * .25, h: 1, q: .12 }); K.push({ t: a + d * .6, x, y, h: 1, q: .12 });
        K.push({ t: b, x, y, h: 1, q: qq }); h = 1; q = qq; break;
      }
      case 'lift': { const qq = m.q ?? .4; K.push({ t: b, h: 1, q: qq }); h = 1; q = qq; break; }
      case 'cut': {
        const qq = m.q ?? .35; [x, y] = to;
        K.push({ t: a + d * .15, h: 1, q: qq }); K.push({ t: b - d * .12, x, y, h: 1, q: qq, e: 'inOut' }); K.push({ t: b, x, y, h: 1, q: 0 });
        h = 1; q = 0; pourEnd = b; break;
      }
      case 'move': { if (m.h !== undefined) h = m.h; if (m.q !== undefined) q = m.q; [x, y] = to; K.push({ t: b, x, y, h, q }); break; }
      case 'turn': { dir = m.dir; K.push({ t: b, dir }); break; }
      case 'stop': { K.push({ t: b, h: 1, q: 0 }); h = 1; q = 0; pourEnd = b; break; }
      case 'etch': {
        if (!m.path || m.path.length < 2) throw new Error('pour: etch needs a path of ≥ 2 points');
        if (!pitcherOut) { pourEnd = Math.max(pourEnd, t); exitPitcher(); }
        const s = t; pins.push({ a: s, b: s + d + .9, path: m.path, d, ink: m.ink === undefined ? 0 : m.ink, width: m.width ?? 1 });
        t = s + d + .9; spans[spans.length - 1].t0 = s; spans[spans.length - 1].t1 = t;
        if (m.say) steps[steps.length - 1].t0 = s;
        continue;
      }
      case 'wait': K.push({ t: b }); break;
    }
    if (m.do !== 'etch') { t = b; if (q > 0) pourEnd = Math.max(pourEnd, b); }
  }
  if (!pitcherOut) { K.push({ t, q: 0, h: 1 }); pourEnd = Math.max(pourEnd, t); exitPitcher(); }
  for (let i = 0; i < steps.length; i++) steps[i].t1 = i + 1 < steps.length ? steps[i + 1].t0 : Math.max(pourEnd, ...pins.map(p => p.b - .5));
  const track = keys(K);
  const env = (t, a, b, r = .22) => Math.min(ease((t - a) / r), ease((b - t) / r));
  const at = tt => {
    const k = track(tt), out = { x: k.x, y: k.y, h: clamp(k.h, 0, 1.15), q: clamp(k.q), dir: k.dir, enter: clamp(k.enter), pin: null, step: -1, move: null };
    const rad = out.dir * Math.PI / 180; out.dx = Math.cos(rad); out.dy = Math.sin(rad);
    for (const w of wig) if (tt > w.a && tt < w.b) {
      const u = (tt - w.a) / (w.b - w.a), A = (w.amp + (w.ampTo - w.amp) * u) * env(tt, w.a, w.b), s = A * Math.sin(2 * Math.PI * w.hz * (tt - w.a));
      out.x += -out.dy * s; out.y += out.dx * s;
    }
    for (const s of swirls) if (tt > s.a && tt < s.b) {
      const A = s.r * env(tt, s.a, s.b, .5), ph = 2 * Math.PI * s.hz * (tt - s.a);
      out.x += A * Math.cos(ph) - A; out.y += A * Math.sin(ph);
    }
    for (const p of pins) if (tt >= p.a - .01 && tt <= p.b) {
      // the pin comes in (.45 s), drags along the path (d), lifts out (.45 s)
      const u = clamp((tt - p.a - .45) / p.d), [px, py] = catmull(p.path, ease(u));
      out.pin = { x: px, y: py, ink: p.ink, width: p.width, on: tt > p.a + .45 && tt < p.a + .45 + p.d, enter: Math.min(ease((tt - p.a) / .45), ease((p.b - tt) / .45)) };
    }
    for (let i = 0; i < steps.length; i++) if (tt >= steps[i].t0 && tt < steps[i].t1) out.step = i;
    for (const s of spans) if (tt >= s.t0 && tt < s.t1) out.move = s.do;
    return out;
  };
  return { t0, t1: t, pourEnd, duration: t - t0, steps, spans, moves, at };
}
