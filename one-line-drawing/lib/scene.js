// one-line-drawing · scene.js — the picture under the pen. A scene is a setting (horizon, ground, fog) and named shapes
// with a depth (0 = near and dark, 1 = far and lost in fog). The same shapes paint the misty reference (ref.js) and give
// the line its contours (line.js), so what the pen follows is what you see under it.
import { maskOf, traceMask, simplify, bbox, chaikin, clamp } from './core.js';
import * as kit from './kit.js';

export const W = 1080, H = 1920;

export class Scene {
  constructor({ seed = 1 } = {}) {
    this.seed = seed; this.shapes = new Map(); this.figures = new Map();
    this.set = { horizon: 900, ground: 'wet', fog: '#d6d6d4', sky: '#e4e4e2', earth: '#9a9a98', tint: [0, 0, 0], light: .5 };
    this.kit = kit;
  }
  // horizon: y of the vanishing fog line · ground: 'wet' (road, reflections) | 'water' | 'field' | 'snow' | 'floor'
  setting(o) { Object.assign(this.set, o); return this; }
  // a named silhouette. depth 0…1, draw(g) fills in the current colour. ground: the y it stands on (reflections flip
  // about it; default its bottom). trace: false for a shape that only paints the reference (fog banks, far hills).
  shape(name, { depth = .3, draw, ground = null, reflect = true, trace = true, tone = null } = {}) {
    if (this.shapes.has(name)) throw new Error(`shape "${name}" twice`);
    if (typeof draw !== 'function') throw new Error(`shape "${name}": draw(g) missing`);
    const s = { name, depth: clamp(depth), draw, ground, reflect, trace, tone, _mask: null, _loops: null };
    this.shapes.set(name, s); return s;
  }
  // a person from the rig in kit.js; returns the rig (joints for props: rig.joints['near hand'])
  figure(name, o) {
    const J = kit.figureRig(o);
    this.shape(name, { depth: o.depth ?? .15, draw: kit.figure(J), ground: o.ground, reflect: o.reflect ?? true, trace: o.trace ?? true });
    this.figures.set(name, J); return J;
  }
  get(name) { const s = this.shapes.get(name); if (!s) throw new Error(`no shape "${name}" (have: ${[...this.shapes.keys()].join(', ')})`); return s; }
  mask(name) { const s = this.get(name); return s._mask || (s._mask = maskOf(s.draw, W, H, .5)); }
  // outer contours (largest first), simplified, page coordinates
  loops(name) {
    const s = this.get(name);
    if (!s._loops) s._loops = traceMask(this.mask(name), 10).map(l => simplify(chaikin(l, 1, true), 1.2));
    return s._loops;
  }
  contour(name, i = 0) { const l = this.loops(name); if (!l[i]) throw new Error(`shape "${name}" has no contour ${i} (it has ${l.length})`); return l[i]; }
  bounds(name) { return bbox(this.contour(name)); }
  groundOf(name) { const s = this.get(name); return s.ground ?? this.bounds(name).y1; }
  // horizontal extent of the shape at row y (page px): [x0, x1] or null — for sweeps across a silhouette
  span(name, y) {
    const { m, w, h, res } = this.mask(name), yy = Math.round(y * res); if (yy < 0 || yy >= h) return null;
    let a = -1, b = -1; for (let x = 0; x < w; x++) if (m[yy * w + x]) { if (a < 0) a = x; b = x; }
    return a < 0 ? null : [a / res, (b + 1) / res];
  }
}
