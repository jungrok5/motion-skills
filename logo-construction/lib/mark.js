// logo-construction · mark.js — how you author a mark: a construction grid of guides (lines + circles), then shapes
// whose every corner is a crossing of two guides. The film draws the guides in the order you add them, fills the
// shapes in the order you add them, and rounds the corners you gave a radius.
//
//   const m = new Mark({ lean: 14, pivot: 600, seed: 3 });
//   m.slant('back', 300)                       one guide leaning `lean`° from vertical, crossing y = pivot at x = 300
//   m.slants('leg', [380, 450, 560, 640])      a family of parallels: leg1 … leg4 (first drawn, the rest copied across)
//   m.h('top', 220) · m.hs('row', [..]) · m.v('mid', 500) · m.vs(…)
//   m.h('sea', 792, { family: 'deck' })        join a family by name: drawn as an alt-drag copy of the family's previous line
//   m.line('snout', [x, y], [x, y])            a free guide through two points (any angle)
//   m.angled('ear', [x, y], deg)               a free guide through a point at an angle (0 = horizontal, 90 = vertical)
//   m.parallel('tailTop', 'chin', [x, y])      a free guide parallel to another one (fewer directions = a calmer grid)
//   m.circle('eye', cx, cy, r)                 a circle guide (cut it out of the mark, add it, or keep it as a measure)
//   m.circles('wave', [[x, y], …], r)          equal circles wave1 … waveN (first dragged out, the rest copied across)
//   m.shape('body', ['back&top', 'leg4&top', 'leg4&ground:0', …], { round: 14 })
//        corners are 'guideA&guideB' (their crossing); ':r' after a corner sets its own radius (':0' = stays sharp)
//   m.cut('eye') · m.add('nose')               subtract / add a circle guide in the finished mark
//   m.reads({ subject: 'fox', facing: 'right', ground: 'ground' })   what the mark depicts (check.mjs proves it)
import { crossLines, clipLine, bbox, area, roundedPath, roundedPoints, densify, norm, rng, noise1, canvas, interior, dist, inside, segDist } from './core.js';

const rad = d => d * Math.PI / 180;

export class Mark {
  constructor({ lean = 12, pivot = 600, seed = 1, sketch = {} } = {}) {
    this.lean = lean; this.pivot = pivot; this.seed = seed;
    this.guides = []; this.byName = {}; this.shapes = []; this.ops = []; this.meta = {};
    this.sketchOpt = { jitter: 12, wobble: 4.5, round: 24, tone: '#a3a4aa', streak: '#bfc0c6', grain: .5, ...sketch };
  }
  _add(g) {
    if (this.byName[g.name]) throw new Error(`guide "${g.name}" defined twice`);
    // any guide can join a family of parallels by name: { family: 'deck' } — it is then copied from the one before
    if (g.family && g.nth === undefined) g.nth = this.guides.filter(q => q.family === g.family).length;
    g.i = this.guides.length; this.guides.push(g); this.byName[g.name] = g; return this;
  }
  // a slanted guide: leans `lean` degrees from vertical (positive = top to the right, like "/")
  slant(name, x, o = {}) { const a = rad(o.lean ?? this.lean); return this._add({ name, kind: 'line', family: o.family || null, p: [x, this.pivot], d: norm([Math.sin(a), -Math.cos(a)]), at: x, axis: 'slant', lean: o.lean ?? this.lean, ...o }); }
  slants(base, xs, o = {}) { xs.forEach((x, i) => this.slant(base + (i + 1), x, { ...o, family: base, nth: i })); return this; }
  h(name, y, o = {}) { return this._add({ name, kind: 'line', family: o.family || null, p: [0, y], d: [1, 0], at: y, axis: 'h', ...o }); }
  hs(base, ys, o = {}) { ys.forEach((y, i) => this.h(base + (i + 1), y, { ...o, family: base, nth: i })); return this; }
  v(name, x, o = {}) { return this._add({ name, kind: 'line', family: o.family || null, p: [x, 1000], d: [0, -1], at: x, axis: 'v', ...o }); }
  vs(base, xs, o = {}) { xs.forEach((x, i) => this.v(base + (i + 1), x, { ...o, family: base, nth: i })); return this; }
  line(name, a, b, o = {}) { const d = norm([b[0] - a[0], b[1] - a[1]]); return this._add({ name, kind: 'line', family: o.family || null, p: a, d: d[1] > 0 ? [-d[0], -d[1]] : d, axis: 'free', ...o }); }
  angled(name, p, deg, o = {}) { return this.line(name, p, [p[0] + Math.cos(rad(deg)) * 100, p[1] - Math.sin(rad(deg)) * 100], o); }
  // a free guide parallel to another, through a point: reuse a direction instead of adding a new one
  parallel(name, ref, p, o = {}) { const R = this.byName[ref]; if (!R || R.kind !== 'line') throw new Error(`parallel("${name}"): no line guide "${ref}"`); return this._add({ name, kind: 'line', family: o.family || null, p, d: R.d, axis: R.axis === 'slant' ? 'slant' : 'free', lean: R.lean, ...o }); }
  circle(name, x, y, r, o = {}) { return this._add({ name, kind: 'circle', x, y, r, family: o.family || null, ...o }); }
  // a family of equal circles: the first is dragged out, the rest are alt-dragged copies
  circles(base, centers, r, o = {}) { centers.forEach(([x, y], i) => this.circle(base + (i + 1), x, y, r, { ...o, family: base, nth: i })); return this; }
  shape(name, corners, o = {}) { this.shapes.push({ name, corners, round: o.round ?? 0, order: o.order ?? this.shapes.length, foot: !!o.foot, ...o }); return this; }
  cut(name) { this.ops.push({ op: 'cut', name }); return this; }
  add(name) { this.ops.push({ op: 'add', name }); return this; }
  reads(meta) { this.meta = { ...this.meta, ...meta }; return this; }

  // resolve every corner to a point; remember which guides made it (check.mjs needs this)
  build() {
    if (this.built) return this;
    const problems = [];
    const point = spec => {
      const [body, r] = String(spec).split(':');
      if (Array.isArray(spec)) return { p: spec, guides: [], free: true, r: null };
      const names = body.split('&');
      if (names.length !== 2) { problems.push(`corner "${spec}" must be "guideA&guideB"`); return { p: [500, 500], guides: [], free: true, r: null }; }
      const [A, B] = names.map(n => this.byName[n]);
      if (!A || !B) { problems.push(`corner "${spec}": no guide named ${!A ? names[0] : names[1]}`); return { p: [500, 500], guides: names, free: true, r: null }; }
      if (A.kind !== 'line' || B.kind !== 'line') { problems.push(`corner "${spec}": corners are crossings of two straight guides`); return { p: [500, 500], guides: names, free: true, r: null }; }
      const p = crossLines(A, B);
      if (!p) { problems.push(`corner "${spec}": ${names[0]} and ${names[1]} are parallel`); return { p: [500, 500], guides: names, free: true, r: null }; }
      return { p, guides: names, free: false, r: r === undefined ? null : +r };
    };
    for (const s of this.shapes) {
      s.pts = s.corners.map(point);
      s.poly = s.pts.map(q => q.p);
      if (area(s.poly) < 0) { s.poly.reverse(); s.pts.reverse(); }
      s.radii = s.pts.map(q => q.r ?? s.round);
    }
    // a corner that sits on or inside another shape is a joint, not an outside corner: it stays sharp unless set
    for (const s of this.shapes) s.pts.forEach((q, i) => {
      if (q.r !== null) return;
      if (this.shapes.some(o => o !== s && (inside(q.p, o.poly) || o.poly.some((a, j) => segDist(q.p, a, o.poly[(j + 1) % o.poly.length]) < .75)))) s.radii[i] = 0;
    });
    this.cuts = this.ops.filter(o => o.op === 'cut').map(o => this.byName[o.name]).filter(Boolean);
    this.adds = this.ops.filter(o => o.op === 'add').map(o => this.byName[o.name]).filter(Boolean);
    for (const o of this.ops) if (!this.byName[o.name] || this.byName[o.name].kind !== 'circle') problems.push(`${o.op}("${o.name}"): not a circle guide`);
    for (const s of this.shapes) s.hit = interior(s.poly, this.cuts.map(c => ({ x: c.x, y: c.y, r: c.r })));
    this.order = [...this.shapes].sort((a, b) => a.order - b.order);
    const all = this.shapes.flatMap(s => s.poly).concat(this.adds.flatMap(c => [[c.x - c.r, c.y - c.r], [c.x + c.r, c.y + c.r]]));
    this.box = bbox(all.length ? all : [[300, 300], [700, 700]]);
    // the guides are drawn across the mark and a margin around it, like lines on an artboard
    const m = Math.max(70, Math.max(this.box.w, this.box.h) * .16);
    this.guideBox = { x0: this.box.x0 - m, y0: this.box.y0 - m, x1: this.box.x1 + m, y1: this.box.y1 + m };
    for (const g of this.guides) {
      if (g.kind === 'line') g.seg = clipLine(g, this.guideBox) || [g.p, g.p];
      g.len = g.kind === 'line' ? dist(g.seg[0], g.seg[1]) : 2 * Math.PI * g.r;
    }
    this.problems = problems; this.built = true;
    return this;
  }

  // the finished mark as a canvas path (rounded by k = 0…1 of each corner's radius); call inside a transform
  pathShape(ctx, s, k = 1) {
    roundedPath(ctx, s.poly, s.radii.map(x => x * k), true);
  }
  // fill the whole mark (given shapes, rounding k) in the current fillStyle onto ctx — cuts punch through
  fill(ctx, shapes = this.order, k = 1, opt = {}) {
    ctx.beginPath();
    for (const s of shapes) this.pathShape(ctx, s, k);
    for (const c of this.adds) if (!opt.noAdds) { ctx.moveTo(c.x + c.r, c.y); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); }
    ctx.fill('nonzero');
    if (this.cuts.length && !opt.noCuts) {
      ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath();
      for (const c of this.cuts) { ctx.moveTo(c.x + c.r, c.y); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); }
      ctx.fill(); ctx.restore();
    }
  }
  // the finished mark into its own canvas, `size` px across its bbox (+ pad), in one colour
  sprite(size, color = '#111', pad = 0) {
    this.build();
    const b = this.box, s = size / Math.max(b.w, b.h);
    const c = canvas(b.w * s + pad * 2, b.h * s + pad * 2), g = c.getContext('2d');
    g.translate(pad, pad); g.scale(s, s); g.translate(-b.x0, -b.y0); g.fillStyle = color; this.fill(g);
    return c;
  }

  // the rough sketch the film starts from: the same idea, drawn loosely in grey marker (derived, never traced)
  sketch(scale = 2) {
    this.build();
    const o = this.sketchOpt, r = rng(this.seed * 7919 + 11), n = noise1(this.seed + 5);
    const c = canvas(1000 * scale, 1000 * scale), g = c.getContext('2d');
    g.scale(scale, scale);
    // each shape: corners pushed off a little, softly rounded, edges wobbling like a hand-held marker
    const jit = {}; const J = q => { const k = q.guides.join('&'); return jit[k] || (jit[k] = [r.range(-1, 1) * o.jitter, r.range(-1, 1) * o.jitter]); };
    let off = 0;
    g.fillStyle = o.tone; g.beginPath();
    for (const s of this.shapes) {
      const pts = s.pts.map(q => { const j = J(q); return [q.p[0] + j[0], q.p[1] + j[1]]; });
      const outline = densify(roundedPoints(pts, pts.map(() => o.round)), 5);
      outline.forEach((p, i) => {
        const a = outline[(i + outline.length - 1) % outline.length], b = outline[(i + 1) % outline.length];
        const nn = norm([b[1] - a[1], a[0] - b[0]]), w = n(off + i * .09) * o.wobble + n(off * 3 + i * .5) * o.wobble * .35;
        const q = [p[0] + nn[0] * w, p[1] + nn[1] * w];
        i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]);
      });
      g.closePath(); off += 37;
    }
    for (const a of this.adds) { g.moveTo(a.x + a.r, a.y); g.ellipse(a.x + r.range(-3, 3), a.y + r.range(-3, 3), a.r * 1.05, a.r * .95, r() * 3, 0, Math.PI * 2); }
    g.fill();
    // cut circles: the sketch has a looser, slightly smaller dot of paper
    g.save(); g.globalCompositeOperation = 'destination-out';
    for (const cu of this.cuts) { g.beginPath(); g.ellipse(cu.x + r.range(-4, 4), cu.y + r.range(-4, 4), cu.r * .8, cu.r * .72, r() * 3, 0, Math.PI * 2); g.fill(); }
    g.restore();
    // marker texture: passes of a lighter grey along the lean, and dry-brush speckle
    const b = this.box;
    g.save(); g.globalCompositeOperation = 'source-atop';
    const a = rad(this.lean), d = [Math.sin(a), -Math.cos(a)];
    for (let i = 0; i < 70; i++) {
      const x = r.range(b.x0 - 40, b.x1 + 40), y = r.range(b.y0, b.y1), L = r.range(80, 260), w = r.range(3, 11);
      g.strokeStyle = o.streak; g.globalAlpha = r.range(.18, .5) * o.grain * 2; g.lineWidth = w; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - d[0] * L / 2, y - d[1] * L / 2); g.lineTo(x + d[0] * L / 2 + r.range(-6, 6), y + d[1] * L / 2); g.stroke();
    }
    g.globalAlpha = 1; g.restore();
    g.save(); g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 2600 * o.grain; i++) { g.globalAlpha = r.range(.08, .45); g.fillRect(r.range(b.x0 - 10, b.x1 + 10), r.range(b.y0 - 10, b.y1 + 10), r.range(.6, 2.2), r.range(.6, 1.6)); }
    g.restore();
    return c;
  }
}
