// logo-construction · film.js — turns a Mark into the construction film: rough sketch → guides drawn by a cursor →
// circles → select all → shape builder fills the mark → guides cleared → corners rounded → the mark alone → mockups.
// Every frame is seek(t): the same page plays live and renders to MP4.
import { clamp, lerp, prog, ease, dist, mix, sub, add, mul, norm, canvas, rgba, rng, contrast } from './core.js';
import { drawMockup, MOCKUPS } from './mockups.js';
import * as UI from './ui.js';

export const W = 1080, H = 1920, FPS = 30;
const BLUE = '#3d7bff', RED = '#e0344a';

const DEFAULT_TIMING = { sketch: 2.2, construct: 14, select: 2.6, build: 8, clean: 1.1, refine: 4.2, reveal: 2.6, mockup: 1.7 };

export class Film {
  constructor(mark, o = {}) {
    this.m = mark.build();
    this.o = {
      signature: '@studio', title: '', subtitle: '', ink: '#111111', paper: '#ffffff', signatureTone: '#b4b5bb',
      mockups: [], mockupInk: null, labels: 'en', seed: mark.seed || 1, ...o,
    };
    this.T = { ...DEFAULT_TIMING, ...(o.timing || {}) };
    this.r = rng(this.o.seed * 131 + 7);
    this.adj = 1; this._plan();
    // travel time depends on the layout, so plan twice: the second pass fits the construction to its target
    const got = this.acts.construct.end - this.acts.construct.start;
    if (Math.abs(got - this.T.construct) > .5) { this.adj = clamp(this.T.construct / got, .45, 1.6); this.r = rng(this.o.seed * 131 + 7); this.dist = null; this._plan(); }
  }

  // ---- the plan: every action gets a time; the cursor and camera get keys -----------------------------------
  _plan() {
    const m = this.m, T = this.T, r = this.r;
    const cur = this.cursor = [], cam = this.cam = [], ev = this.events = [];
    const acts = this.acts = {};
    const box = m.guideBox, bw = box.x1 - box.x0, bh = box.y1 - box.y0;
    // the mark fills the frame; the guides run on past it and off the edges, as on a zoomed-in artboard
    this.S = Math.min(860 / m.box.w, 1080 / m.box.h, 1060 / bw * 1.35);
    this.base = { cx: m.box.cx, cy: m.box.cy + m.box.h * .04, z: 1 };
    this.center = [W / 2, H * .47];
    let t = 0;
    const K = (k) => cur.push(k);
    const moveTo = (x, y, sp, t1, kind = 'arrow', e = 'hand') => K({ t: t1, x, y, sp, kind, down: false, e });
    const camTo = (t0, dur, c) => { const last = cam[cam.length - 1]; if (last && t0 < last.t0 + last.dur) t0 = last.t0 + last.dur; cam.push({ t0, dur, ...c }); return t0 + dur; };

    // 1 · the sketch sits on the artboard; the cursor comes in from the lower right
    acts.sketch = { start: 0, end: T.sketch };
    K({ t: 0, x: W * .86, y: H * .82, sp: 'scr', kind: 'arrow', down: false });
    t = T.sketch;

    // 2 · construction: guides in the order authored. A family's first line is drawn; the rest are alt-dragged copies.
    const gs = m.guides;
    // guides end a little inside the frame, so every line is drawn where you can see the cursor
    const vr = { x0: this.base.cx - (W / 2 - 60) / this.S, x1: this.base.cx + (W / 2 - 60) / this.S, y0: this.base.cy - (this.center[1] - 70) / this.S, y1: this.base.cy + (H - this.center[1] - 200) / this.S };
    this.view = { x0: Math.max(vr.x0, box.x0), x1: Math.min(vr.x1, box.x1), y0: Math.max(vr.y0, box.y0), y1: Math.min(vr.y1, box.y1) };
    for (const g of gs) if (g.kind === 'line') g.seg = clipSeg(g, this.view) || g.seg;
    const pxLen = g => (g.kind === 'circle' ? g.r * 2 : dist(g.seg[0], g.seg[1])) * this.S;
    const nat = gs.map(g => g.kind === 'circle' ? (g.family && g.nth > 0 ? .5 : 1.1) : g.family && g.nth > 0 ? .62 : .5 + pxLen(g) / 2400);
    const dists = gs.filter(g => g.family && g.distribute).map(g => g.family).filter((f, i, a) => a.indexOf(f) === i);
    const natTotal = nat.reduce((a, b) => a + b, 0) + gs.length * .3 + dists.length * 1.6;
    const sc = clamp(T.construct / natTotal * this.adj, .45, 1.9);
    acts.construct = { start: t };
    this.gEv = [];
    // families that get distributed are first placed a little unevenly
    this.jit = {};
    for (const g of gs) if (g.family && g.distribute && g.nth > 0) this.jit[g.name] = r.range(-1, 1) * 16 * (g.nth % 2 ? 1 : -.7);
    let circleRun = null, last = [W * .86, H * .82];
    // travel time from where the cursor is: a hand covers ~1500 px/s, never instantly
    const travel = p => { const q = this._toScrBase(p), d0 = dist(last, q); last = q; return clamp(d0 / 1900, .1, .6) * clamp(this.adj, .85, 1.15); };
    for (let i = 0; i < gs.length; i++) {
      const g = gs[i], e = { g, t0: t }; let d;
      if (g.kind === 'circle' && g.family && g.nth > 0) {
        // alt-drag a copy of the previous circle of the family to its centre
        const prev = gs.find(q => q.family === g.family && q.nth === g.nth - 1);
        const grab = [prev.x + prev.r * .55, prev.y - prev.r * .55], delta = [g.x - prev.x, g.y - prev.y];
        const mv = travel(grab), drag = clamp(Math.hypot(...delta) * this.S / 1100, .22, .6) * clamp(sc, .8, 1.3);
        moveTo(grab[0], grab[1], 'art', t + mv);
        e.tDown = t + mv + .06; K({ t: e.tDown, x: grab[0], y: grab[1], sp: 'art', kind: 'copy', down: true, e: 'lin' });
        e.tUp = e.tDown + drag; K({ t: e.tUp, x: grab[0] + delta[0], y: grab[1] + delta[1], sp: 'art', kind: 'copy', down: true, e: 'io' });
        K({ t: e.tUp + .04, x: grab[0] + delta[0], y: grab[1] + delta[1], sp: 'art', kind: 'arrow', down: false, e: 'lin' });
        last = this._toScrBase(add(grab, delta));
        e.mode = 'ccopy'; e.prev = prev; e.delta = delta; ev.push({ t: e.tDown, type: 'click' }, { t: e.tUp, type: 'release' });
        d = e.tUp - t + .1 * sc;
        if (circleRun && --circleRun.left === 0) { d = camTo(t + d, .55 * sc, this.base) - t + .05; circleRun = null; }
      } else if (g.kind === 'circle') {
        // zoom in on a run of circles once, not per circle
        if (!circleRun) {
          const run = []; for (let j = i; j < gs.length && gs[j].kind === 'circle'; j++) run.push(gs[j]);
          const xs = run.flatMap(q => [q.x - q.r, q.x + q.r]), ys = run.flatMap(q => [q.y - q.r, q.y + q.r]);
          const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
          const z = clamp(380 / (span * this.S), 1.5, 3.2);
          const zEnd = camTo(t, .5 * sc, { cx: (Math.max(...xs) + Math.min(...xs)) / 2, cy: (Math.max(...ys) + Math.min(...ys)) / 2, z });
          circleRun = { left: run.length, zEnd };
        }
        const mv = Math.max(travel([g.x, g.y]), circleRun.zEnd - t + .04), drag = .5 * nat[i] * sc;
        moveTo(g.x, g.y, 'art', t + mv, 'cross');
        e.tDown = t + mv + .07; K({ t: e.tDown, x: g.x, y: g.y, sp: 'art', kind: 'cross', down: true, e: 'lin' });
        e.tUp = e.tDown + drag; K({ t: e.tUp, x: g.x + g.r * .707, y: g.y + g.r * .707, sp: 'art', kind: 'cross', down: true, e: 'io' });
        K({ t: e.tUp + .04, x: g.x + g.r * .707, y: g.y + g.r * .707, sp: 'art', kind: 'arrow', down: false, e: 'lin' });
        last = this._toScrBase([g.x + g.r * .707, g.y + g.r * .707]);
        e.mode = 'circle'; ev.push({ t: e.tDown, type: 'click' }, { t: e.tUp, type: 'release' });
        d = e.tUp - t + .25 * sc;
        if (--circleRun.left === 0) { d = camTo(t + d, .55 * sc, this.base) - t + .05; circleRun = null; }
      } else if (g.family && g.nth > 0) {
        // alt-drag a copy of the previous line of the family to this one's place
        const prev = gs.find(q => q.family === g.family && q.nth === g.nth - 1);
        const grab = mix(prev.seg[0], prev.seg[1], .35 + r() * .3);
        const delta = this._offset(prev, g, true), mv = travel(grab), drag = clamp(Math.hypot(...delta) * this.S / 1100, .2, .65) * clamp(sc, .7, 1.3);
        moveTo(grab[0], grab[1], 'art', t + mv);
        e.tDown = t + mv + .06; K({ t: e.tDown, x: grab[0], y: grab[1], sp: 'art', kind: 'copy', down: true, e: 'lin' });
        e.tUp = e.tDown + drag; K({ t: e.tUp, x: grab[0] + delta[0], y: grab[1] + delta[1], sp: 'art', kind: 'copy', down: true, e: 'io' });
        K({ t: e.tUp + .04, x: grab[0] + delta[0], y: grab[1] + delta[1], sp: 'art', kind: 'arrow', down: false, e: 'lin' });
        last = this._toScrBase(add(grab, delta));
        e.mode = 'copy'; e.prev = prev; e.delta = delta; ev.push({ t: e.tDown, type: 'click' }, { t: e.tUp, type: 'release' });
        d = e.tUp - t + .1 * sc;
      } else {
        // draw from whichever end is nearer the hand
        let [a, b] = this._segAt(g, null);
        if (dist(last, this._toScrBase(b)) < dist(last, this._toScrBase(a))) [a, b] = [b, a];
        e.rev = a !== this._segAt(g, null)[0];
        const mv = travel(a), drag = clamp(pxLen(g) / 1700, .2, .7) * clamp(sc, .7, 1.3); // a long line takes longer to pull
        moveTo(a[0], a[1], 'art', t + mv, 'cross');
        e.tDown = t + mv + .07; K({ t: e.tDown, x: a[0], y: a[1], sp: 'art', kind: 'cross', down: true, e: 'lin' });
        e.tUp = e.tDown + drag; K({ t: e.tUp, x: b[0], y: b[1], sp: 'art', kind: 'cross', down: true, e: 'io' });
        K({ t: e.tUp + .04, x: b[0], y: b[1], sp: 'art', kind: 'arrow', down: false, e: 'lin' });
        last = this._toScrBase(b);
        e.mode = 'draw'; ev.push({ t: e.tDown, type: 'click' }, { t: e.tUp, type: 'release' });
        d = e.tUp - t + .1 * sc;
      }
      this.gEv.push(e); t += d;
      // the last line of a family that wants even spacing: open the Align panel and distribute
      if (g.family && g.distribute && !gs.slice(i + 1).some(q => q.family === g.family)) {
        const fam = gs.filter(q => q.family === g.family), d2 = 1.6 * Math.min(sc, 1.2);
        const pan = UI.alignPanel.rect, btn = UI.alignPanel.button;
        const e2 = { family: g.family, t0: t, tOpen: t + .25 * d2, tClick: t + .62 * d2, tSnap: t + .62 * d2 + .3, tClose: t + d2 };
        moveTo(pan.x + pan.w * .5, pan.y + 30, 'scr', t + Math.max(.22 * d2, clamp(dist(last, [pan.x + pan.w * .5, pan.y + 30]) / 1500, .14, .7))); last = [btn.x, btn.y];
        moveTo(btn.x, btn.y, 'scr', e2.tClick - .06, 'arrow');
        K({ t: e2.tClick, x: btn.x, y: btn.y, sp: 'scr', kind: 'arrow', down: true, e: 'lin' });
        K({ t: e2.tClick + .1, x: btn.x, y: btn.y, sp: 'scr', kind: 'arrow', down: false, e: 'lin' });
        ev.push({ t: e2.tClick, type: 'click' }, { t: e2.tSnap, type: 'snap' });
        (this.dist = this.dist || []).push(e2); fam.forEach(q => (q.distEv = e2));
        t += d2;
      }
    }
    acts.construct.end = t;

    // 3 · select all (marquee), toolbar slides in, pick the shape builder
    acts.select = { start: t };
    const cl = p => [clamp(p[0], 150, W - 30), clamp(p[1], 120, H - 160)]; // a marquee only has to touch the guides
    const tl = cl(this._toScrBase([m.box.x0 - 50, m.box.y0 - 70])), br = cl(this._toScrBase([m.box.x1 + 50, m.box.y1 + 70]));
    const S3 = T.select;
    moveTo(tl[0], tl[1], 'scr', t + .25 * S3);
    this.marquee = { t0: t + .3 * S3, t1: t + .6 * S3, a: tl, b: br };
    K({ t: this.marquee.t0, x: tl[0], y: tl[1], sp: 'scr', kind: 'arrow', down: true, e: 'lin' });
    K({ t: this.marquee.t1, x: br[0], y: br[1], sp: 'scr', kind: 'arrow', down: true, e: 'io' });
    K({ t: this.marquee.t1 + .05, x: br[0], y: br[1], sp: 'scr', kind: 'arrow', down: false, e: 'lin' });
    ev.push({ t: this.marquee.t0, type: 'click' }, { t: this.marquee.t1, type: 'release' });
    this.selectAt = this.marquee.t1;
    this.toolbar = { tIn: t + .55 * S3, tOut: null };
    const tb = UI.toolbar.builder;
    moveTo(tb.x + 4, tb.y + 4, 'scr', t + .88 * S3);
    K({ t: t + .92 * S3, x: tb.x + 4, y: tb.y + 4, sp: 'scr', kind: 'arrow', down: true, e: 'lin' });
    K({ t: t + .96 * S3, x: tb.x + 4, y: tb.y + 4, sp: 'scr', kind: 'builder', down: false, e: 'lin' });
    ev.push({ t: t + .92 * S3, type: 'click' });
    this.toolPick = t + .92 * S3;
    t += S3; acts.select.end = t;

    // 4 · shape builder: hover a region (dotted, red edge), click, it fills
    acts.build = { start: t };
    camTo(t - .2, .8, { cx: m.box.cx, cy: m.box.cy, z: clamp(Math.min(820 / (m.box.w * this.S), 1100 / (m.box.h * this.S)), 1, 1.45) });
    const shp = m.order, per = T.build / Math.max(1, shp.length);
    this.sEv = [];
    for (const s of shp) {
      const p = s.hit;
      moveTo(p[0], p[1], 'art', t + .42 * per, 'builder');
      const e = { s, tHover: t + .3 * per, tFill: t + .72 * per };
      K({ t: e.tFill, x: p[0], y: p[1], sp: 'art', kind: 'builder', down: true, e: 'lin' });
      K({ t: e.tFill + .09, x: p[0], y: p[1], sp: 'art', kind: 'builder', down: false, e: 'lin' });
      ev.push({ t: e.tFill, type: 'fill' });
      this.sEv.push(e); t += per;
    }
    acts.build.end = t;

    // 5 · clean: select the guides, delete; the sketch goes too
    acts.clean = { start: t, end: t + T.clean };
    this.cleanAt = { sel: t + .2 * T.clean, del: t + .55 * T.clean };
    this.toolbar.tOut = t + .1 * T.clean;
    const off = cl(this._toScrBase([m.box.x1 + 40, m.box.y0 + m.box.h * .3]));
    moveTo(off[0], off[1], 'scr', t + .5 * T.clean, 'arrow');
    ev.push({ t: this.cleanAt.del, type: 'delete' });
    t += T.clean;

    // 6 · refine: zoom in, anchor points, drag the corner widgets → corners round, a group of shapes at a time
    acts.refine = { start: t };
    const rounded = shp.filter(s => s.radii.some(x => x > 0)).sort((a, b) => a.hit[0] - b.hit[0]); // left to right: one smooth pan
    const groups = [], ng = clamp(rounded.length, 1, 4);
    rounded.forEach((s, i) => { const k = Math.floor(i * ng / rounded.length); (groups[k] = groups[k] || []).push(s); });
    // each group: pan (never during a drag) → move to its widget → pull it in → release
    const slot = Math.max(1.05, (T.refine - .4) / Math.max(1, groups.length));
    this.rEv = [];
    let tt = t + .2;
    for (const grp of groups) {
      const pts = grp.flatMap(s => s.poly), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const gx = (Math.min(...xs) + Math.max(...xs)) / 2, gy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const gw = Math.max(...xs) - Math.min(...xs), gh = Math.max(...ys) - Math.min(...ys);
      const panEnd = camTo(tt, .4, { cx: gx, cy: gy, z: clamp(Math.min(860 / (gw * this.S), 1300 / (gh * this.S)), 1.1, 2) }); // the whole group stays in frame
      // grab the widget of the sharpest rounded corner in the group
      let best = null;
      for (const s of grp) s.poly.forEach((p, i) => { if (s.radii[i] > 0 && (!best || s.radii[i] > best.r)) best = { s, i, r: s.radii[i] }; });
      const w = this._widget(best.s, best.i, 0), w1 = this._widget(best.s, best.i, 1);
      const arrive = Math.max(panEnd + .05, tt + slot * .45);
      moveTo(w[0], w[1], 'art', arrive, 'direct');
      const e = { shapes: grp, tDown: arrive + .07, tUp: arrive + .07 + Math.min(.45, slot * .4) };
      K({ t: e.tDown, x: w[0], y: w[1], sp: 'art', kind: 'direct', down: true, e: 'lin' });
      K({ t: e.tUp, x: w1[0], y: w1[1], sp: 'art', kind: 'direct', down: true, e: 'io' });
      K({ t: e.tUp + .05, x: w1[0], y: w1[1], sp: 'art', kind: 'direct', down: false, e: 'lin' });
      ev.push({ t: e.tDown, type: 'click' }, { t: e.tUp, type: 'release' });
      this.rEv.push(e); tt = Math.max(tt + slot, e.tUp + .12);
    }
    const R = Math.max(T.refine, tt - t + .3);
    this.anchorsAt = { on: t + .15, off: t + R - .15 };
    t += R; acts.refine.end = t;

    // 7 · reveal: the mark alone, small, with the signature (and wordmark)
    acts.reveal = { start: t, end: t + T.reveal };
    const zFinal = clamp(330 / (Math.max(m.box.w, m.box.h) * this.S), .3, 1.2);
    camTo(t - .1, .9, { cx: m.box.cx, cy: m.box.cy + m.box.h * (this.o.title ? .32 : .12), z: zFinal });
    moveTo(W * 1.05, H * .9, 'scr', t + .8, 'arrow');
    t += T.reveal;

    // 8 · mockups: hard cuts, a slow push-in on each
    acts.mockups = { start: t };
    this.mEv = this.o.mockups.map((mk, i) => ({ mk, t0: t + i * T.mockup, t1: t + (i + 1) * T.mockup }));
    t += this.o.mockups.length * T.mockup;
    acts.mockups.end = t;
    if (!this.o.mockups.length) delete acts.mockups;
    for (const e of this.mEv) ev.push({ t: e.t0, type: 'cut' });

    this.DURATION = +t.toFixed(3);
    cur.sort((a, b) => a.t - b.t);
    this.events.sort((a, b) => a.t - b.t);
  }

  // perpendicular offset that carries line A onto line B (for an alt-drag copy); `jit` = B's uneven first placement
  _offset(A, B, jit) {
    const n = [-A.d[1], A.d[0]];
    const pa = A.p, pb = this._shiftP(B, jit ? (this.jit[B.name] || 0) : 0), pA = this._shiftP(A, jit ? (this.jit[A.name] || 0) : 0);
    const dd = (pb[0] - pA[0]) * n[0] + (pb[1] - pA[1]) * n[1];
    void pa; return [n[0] * dd, n[1] * dd];
  }
  _shiftP(g, dx) { return g.axis === 'h' ? [g.p[0], g.p[1] + dx] : [g.p[0] + dx, g.p[1]]; }
  // where a line guide sits at time t (families that get distributed slide from uneven to even)
  _lineAt(g, t) {
    let j = this.jit?.[g.name] || 0;
    if (j && g.distEv && t !== null) j *= 1 - ease.io(prog(t, g.distEv.tSnap - .3, g.distEv.tSnap));
    if (!j) return g;
    return { ...g, p: this._shiftP(g, j) };
  }
  _segAt(g, t) {
    const L = this._lineAt(g, t);
    if (L === g) return g.seg;
    return clipSeg(L, this.m.guideBox) || g.seg;
  }
  _widget(s, i, k) { // the round-corner widget of corner i: inside the corner along its bisector
    const n = s.poly.length, p = s.poly[i], a = s.poly[(i + n - 1) % n], b = s.poly[(i + 1) % n];
    const bis = norm(add(norm(sub(a, p)), norm(sub(b, p))));
    const d = 26 / this.S + k * s.radii[i] * .9;
    return add(p, mul(bis, d));
  }

  // ---- camera / mapping ------------------------------------------------------------------------------------
  camAt(t) {
    let c = { ...this.base };
    for (const k of this.cam) {
      if (t >= k.t0 + k.dur) { c = { cx: k.cx, cy: k.cy, z: k.z }; continue; }
      if (t > k.t0) { const e = ease.io((t - k.t0) / k.dur); c = { cx: lerp(c.cx, k.cx, e), cy: lerp(c.cy, k.cy, e), z: Math.exp(lerp(Math.log(c.z), Math.log(k.z), e)) }; }
      break;
    }
    return c;
  }
  toScr(p, c) { const s = this.S * c.z; return [(p[0] - c.cx) * s + this.center[0], (p[1] - c.cy) * s + this.center[1]]; }
  _toScrBase(p) { return this.toScr(p, this.base); }

  cursorAt(t) {
    const K = this.cursor, c = this.camAt(t);
    let i = 0; while (i < K.length - 1 && K[i + 1].t <= t) i++;
    const a = K[i], b = K[i + 1];
    const P = k => (k.sp === 'art' ? this.toScr([k.x, k.y], (a.down && b && b.down) ? c : this.camAt(k.t)) : [k.x, k.y]);
    if (!b || t <= a.t) return { p: P(a), kind: a.kind, down: a.down };
    const k = (t - a.t) / (b.t - a.t), e = (ease[b.e] || ease.hand)(clamp(k));
    const pa = P(a), pb = P(b);
    let p = mix(pa, pb, e);
    if (!b.down && !a.down) { const d = sub(pb, pa), n = [-d[1], d[0]]; p = add(p, mul(n, Math.sin(Math.PI * e) * .06)); } // a slight arc
    return { p, kind: k > .5 ? b.kind : a.kind, down: a.down && b.down };
  }

  actAt(t) { for (const [k, a] of Object.entries(this.acts)) if (t >= a.start && t < a.end) return k; return t >= this.DURATION ? 'end' : 'sketch'; }

  // ---- drawing -----------------------------------------------------------------------------------------------
  draw(ctx, t) {
    const o = this.o, m = this.m;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); // every frame starts from nothing
    const me = this.mEv.find(e => t >= e.t0 && (t < e.t1 || e === this.mEv[this.mEv.length - 1]));
    if (me && t >= me.t0) { this._mockup(ctx, me, t); ctx.restore(); return; }
    ctx.fillStyle = o.paper; ctx.fillRect(0, 0, W, H);
    const c = this.camAt(t), s = this.S * c.z;
    const art = () => ctx.setTransform(this._k * s, 0, 0, this._k * s, this._k * (this.center[0] - c.cx * s), this._k * (this.center[1] - c.cy * s));
    const scr = () => ctx.setTransform(this._k, 0, 0, this._k, 0, 0);

    // sketch + signature (part of the artwork: they zoom with it)
    const sketchA = 1 - prog(t, this.cleanAt.del - .05, this.cleanAt.del + .45);
    const sketchIn = 1;
    if (sketchA > 0) { art(); ctx.globalAlpha = sketchA * sketchIn; ctx.drawImage(this.sk, 0, 0, 1000, 1000); ctx.globalAlpha = 1; }
    art(); this._signature(ctx, t);

    // the mark: filled shapes so far, rounded by the refine drags
    const filled = this.sEv.filter(e => t >= e.tFill).map(e => e.s);
    if (filled.length) {
      const L = this.layer, g = L.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, L.width, L.height);
      g.setTransform(this._k * s, 0, 0, this._k * s, this._k * (this.center[0] - c.cx * s), this._k * (this.center[1] - c.cy * s));
      g.fillStyle = o.ink;
      // each shape's rounding: the drag of its group
      const kOf = sh => { const e = this.rEv.find(r => r.shapes.includes(sh)); return e ? ease.out(prog(t, e.tDown, e.tUp)) : 0; };
      const allAdds = filled.length === this.sEv.length;
      g.beginPath();
      for (const sh of filled) m.pathShape(g, sh, kOf(sh));
      if (allAdds) for (const a of m.adds) { g.moveTo(a.x + a.r, a.y); g.arc(a.x, a.y, a.r, 0, Math.PI * 2); }
      g.fill();
      if (m.cuts.length) { g.globalCompositeOperation = 'destination-out'; g.beginPath(); for (const cu of m.cuts) { g.moveTo(cu.x + cu.r, cu.y); g.arc(cu.x, cu.y, cu.r, 0, Math.PI * 2); } g.fill(); g.globalCompositeOperation = 'source-over'; }
      scr(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const last = this.sEv.find(e => t >= e.tFill && t < e.tFill + .08);
      ctx.globalAlpha = 1; ctx.drawImage(L, 0, 0);
      if (last) { ctx.globalAlpha = .35 * (1 - prog(t, last.tFill, last.tFill + .08)); ctx.fillStyle = o.paper; ctx.fillRect(0, 0, L.width, L.height); ctx.globalAlpha = 1; }
    }

    // shape builder hover: the region under the cursor, dotted with a red edge
    const hov = this.sEv.find(e => t >= e.tHover && t < e.tFill);
    if (hov) { scr(); this._hover(ctx, hov.s, c); }

    // guides
    const gA = 1 - prog(t, this.cleanAt.del, this.cleanAt.del + .12);
    if (gA > 0) { scr(); ctx.globalAlpha = gA; this._guides(ctx, t, c); ctx.globalAlpha = 1; }

    // marquee
    const mq = this.marquee;
    if (t >= mq.t0 && t < mq.t1 + .05) {
      scr(); const k = ease.io(prog(t, mq.t0, mq.t1)), b = mix(mq.a, mq.b, k);
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
      ctx.strokeRect(mq.a[0], mq.a[1], b[0] - mq.a[0], b[1] - mq.a[1]); ctx.setLineDash([]);
    }

    // refine: anchor points and corner widgets
    if (t >= this.anchorsAt.on && t < this.anchorsAt.off) { scr(); this._anchors(ctx, t, c); }

    // UI cameos (screen space)
    scr();
    const tb = this.toolbar, tbK = t < tb.tIn ? 0 : t < tb.tOut ? ease.out(prog(t, tb.tIn, tb.tIn + .35)) : 1 - ease.in(prog(t, tb.tOut, tb.tOut + .3));
    if (tbK > 0) UI.drawToolbar(ctx, tbK, t >= this.toolPick);
    for (const d of this.dist || []) {
      const k = t < d.tOpen ? ease.out(prog(t, d.t0, d.tOpen)) : t < d.tClose - .2 ? 1 : 1 - prog(t, d.tClose - .2, d.tClose);
      if (k > 0 && t < d.tClose) UI.drawAlignPanel(ctx, k, t >= d.tClick && t < d.tClick + .25);
    }
    // the size tooltip while a circle is dragged
    const ce = this.gEv.find(e => e.mode === 'circle' && t >= e.tDown && t < e.tUp + .15);
    const cu = this.cursorAt(t);
    if (ce) { const k = ease.io(prog(t, ce.tDown, ce.tUp)); UI.drawTooltip(ctx, cu.p, (ce.g.r * 2 * k * .42).toFixed(2)); }
    UI.drawCursor(ctx, cu.p, cu.kind, cu.down);
    // the wordmark under the finished mark
    if (o.title) { art(); this._title(ctx, t); }
    ctx.restore();
  }

  _signature(ctx, t) {
    const m = this.m, b = m.box, size = Math.max(b.w, b.h);
    const fade = 1 - prog(t, this.acts.reveal.start - 1.2, this.acts.reveal.start - .6) * (this.o.title ? 1 : 0);
    if (fade <= 0) return;
    ctx.save(); ctx.globalAlpha = fade;
    ctx.translate(b.cx + size * .02, b.y1 + size * .13); ctx.rotate(-.06);
    ctx.font = `500 ${size * .07}px LCHand`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = this.o.signatureTone;
    ctx.fillText(this.o.signature, 0, 0); ctx.restore();
  }
  _title(ctx, t) {
    const m = this.m, b = m.box, size = Math.max(b.w, b.h), k = ease.out(prog(t, this.acts.reveal.start + .5, this.acts.reveal.start + 1.2));
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = this.o.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const fam = /[ㄱ-힝]/.test(this.o.title) ? 'LCKo' : 'LCSans';
    ctx.font = `700 ${size * .15}px ${fam}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${size * .012}px`;
    ctx.fillText(this.o.title, b.cx, b.y1 + size * .3 + (1 - k) * size * .03);
    if (this.o.subtitle) { ctx.font = `500 ${size * .055}px ${fam}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${size * .03}px`; ctx.globalAlpha = k * .7; ctx.fillText(this.o.subtitle.toUpperCase(), b.cx, b.y1 + size * .4); }
    ctx.restore();
  }
  _guides(ctx, t, c) {
    const sel = t >= this.selectAt && t < this.acts.build.start + .25;
    const selG = t >= this.cleanAt.sel && t < this.cleanAt.del;
    const blue = sel || selG;
    ctx.lineWidth = 2.2; ctx.lineCap = 'butt';
    for (const e of this.gEv) {
      if (t < e.tDown) continue;
      const g = e.g, k = ease.io(prog(t, e.tDown, e.tUp));
      ctx.strokeStyle = blue ? BLUE : '#111';
      if (g.kind === 'circle') {
        const ctr = e.mode === 'ccopy' && t < e.tUp ? [e.prev.x + e.delta[0] * k, e.prev.y + e.delta[1] * k] : [g.x, g.y];
        const p = this.toScr(ctr, c), r = (e.mode === 'ccopy' ? 1 : k) * g.r * this.S * c.z;
        ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(.5, r), 0, Math.PI * 2); ctx.stroke();
        if (t < e.tUp) { ctx.fillStyle = BLUE; ctx.fillRect(p[0] - 2.5, p[1] - 2.5, 5, 5); if (e.mode === 'ccopy') { ctx.save(); ctx.strokeStyle = BLUE; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } }
        if (blue) { ctx.fillStyle = BLUE; for (const a of [0, 1, 2, 3]) { const q = [p[0] + Math.cos(a * Math.PI / 2) * r, p[1] + Math.sin(a * Math.PI / 2) * r]; ctx.fillRect(q[0] - 3, q[1] - 3, 6, 6); } ctx.fillRect(p[0] - 2, p[1] - 2, 4, 4); }
        continue;
      }
      let a, b;
      if (e.mode === 'copy' && t < e.tUp) {
        const d = mul(e.delta, k), L = this._lineAt(e.prev, t);
        const seg = clipSeg({ ...L, p: add(L.p, d) }, this.m.guideBox) || e.prev.seg; [a, b] = seg;
      } else if (e.mode === 'draw' && t < e.tUp) { const [s0, s1] = this._segAt(g, t); a = s0; b = mix(s0, s1, k); }
      else [a, b] = this._segAt(g, t);
      const A = this.toScr(a, c), B = this.toScr(b, c);
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      if (blue) { ctx.fillStyle = BLUE; ctx.fillRect(A[0] - 3, A[1] - 3, 6, 6); ctx.fillRect(B[0] - 3, B[1] - 3, 6, 6); }
    }
  }
  _hover(ctx, s, c) {
    const pts = s.poly.map(p => this.toScr(p, c));
    ctx.save(); ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    for (const cu of this.m.cuts) { if (!insidePoly([cu.x, cu.y], s.poly)) continue; const q = this.toScr([cu.x, cu.y], c), r = cu.r * this.S * c.z; ctx.moveTo(q[0] + r, q[1]); ctx.arc(q[0], q[1], r, 0, Math.PI * 2, true); }
    ctx.fillStyle = this.dots; ctx.fill('evenodd');
    ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  }
  _anchors(ctx, t, c) {
    const a = ease.out(prog(t, this.anchorsAt.on, this.anchorsAt.on + .25)) * (1 - prog(t, this.anchorsAt.off - .2, this.anchorsAt.off));
    ctx.save(); ctx.globalAlpha = a;
    for (const e of this.sEv) {
      const s = e.s, re = this.rEv.find(r => r.shapes.includes(s)), k = re ? ease.out(prog(t, re.tDown, re.tUp)) : 0;
      s.poly.forEach((p, i) => {
        const q = this.toScr(p, c);
        ctx.fillStyle = '#fff'; ctx.strokeStyle = BLUE; ctx.lineWidth = 1.6;
        ctx.fillRect(q[0] - 4, q[1] - 4, 8, 8); ctx.strokeRect(q[0] - 4, q[1] - 4, 8, 8);
        if (s.radii[i] > 0 && re && t < re.tUp + .3) {
          const w = this.toScr(this._widget(s, i, k), c);
          ctx.beginPath(); ctx.arc(w[0], w[1], 6, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.arc(w[0], w[1], 2, 0, Math.PI * 2); ctx.fillStyle = BLUE; ctx.fill();
        }
      });
    }
    ctx.restore();
  }
  _mockup(ctx, e, t) {
    const key = this.mEv.indexOf(e);
    if (!this.mk[key]) this.mk[key] = drawMockup(e.mk, this.m, this.o, this.o.seed + key * 17);
    const img = this.mk[key], k = ease.sine(prog(t, e.t0, e.t1 + .6)), z = 1 + .055 * k;
    ctx.setTransform(this._k, 0, 0, this._k, 0, 0);
    const fx = e.mk.focus ? e.mk.focus[0] : W / 2, fy = e.mk.focus ? e.mk.focus[1] : H / 2;
    ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy);
    ctx.drawImage(img, 0, 0, W, H);
  }

  // ---- page ----------------------------------------------------------------------------------------------------
  async start() {
    const q = new URLSearchParams(location.search);
    const render = q.has('render'), frozen = q.has('t') ? +q.get('t') : null;
    this._k = +(q.get('scale') || 1);
    await loadFonts();
    const cv = canvas(W * this._k, H * this._k); this.cv = cv; document.body.appendChild(cv);
    this.layer = canvas(W * this._k, H * this._k);
    this.sk = this.m.sketch(2.4);
    const d = canvas(7, 7), dg = d.getContext('2d'); dg.fillStyle = 'rgba(0,0,0,.06)'; dg.fillRect(0, 0, 7, 7); dg.fillStyle = '#8d8d93'; dg.fillRect(1, 1, 2.2, 2.2);
    this.dots = cv.getContext('2d').createPattern(d, 'repeat');
    this.mk = [];
    const ctx = cv.getContext('2d');
    const seek = t => { this.t = clamp(t, 0, this.DURATION); this.draw(ctx, this.t); };
    Object.assign(window, {
      seek, DURATION: this.DURATION, FPS, SIZE: { W, H }, film: this,
      filmInfo: () => this.info(), markCheck: () => this.markCheck(), legibility: s => this.legibility(s), glyphCheck: () => glyphCheck(this.o),
      soundEvents: () => this.events, mockupCheck: () => this.mockupCheck(), sketchCheck: () => this.sketchCheck(),
      cursorAt: t => this.cursorAt(t),
    });
    document.body.style.cssText = 'margin:0;background:#1c1c1e;display:grid;place-items:center;min-height:100vh;overflow:hidden';
    if (q.get('sheet') === 'mark') { cv.style.cssText = render ? '' : 'height:100vh;width:auto'; drawMarkSheet(ctx, this); window.__ready = true; return; }
    if (render || frozen !== null) {
      cv.style.cssText = render ? '' : 'height:100vh;width:auto';
      seek(frozen ?? 0); window.__ready = true; return;
    }
    this._live(cv, seek);
    window.__ready = true;
  }
  _live(cv, seek) {
    cv.style.cssText = 'height:100vh;max-width:100vw;width:auto;object-fit:contain;cursor:pointer';
    const bar = document.createElement('div'); bar.style.cssText = 'position:fixed;left:0;bottom:0;height:4px;background:#e8b04a;width:0;z-index:2';
    const hit = document.createElement('div'); hit.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:18px;cursor:ew-resize;z-index:3';
    document.body.append(bar, hit);
    let t0 = performance.now(), off = 0, paused = false;
    const now = () => paused ? off : (off + (performance.now() - t0) / 1000) % (this.DURATION + 1.5);
    const set = t => { off = clamp(t, 0, this.DURATION); t0 = performance.now(); };
    cv.addEventListener('click', () => { if (paused) { paused = false; t0 = performance.now(); } else { off = now(); paused = true; } });
    addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); cv.click(); } if (e.key === 'ArrowRight') set(now() + 3); if (e.key === 'ArrowLeft') set(now() - 3); });
    const scrub = e => set(e.clientX / innerWidth * this.DURATION);
    hit.addEventListener('pointerdown', e => { scrub(e); hit.setPointerCapture(e.pointerId); hit.onpointermove = scrub; });
    hit.addEventListener('pointerup', () => (hit.onpointermove = null));
    const loop = () => { const t = now(); seek(Math.min(t, this.DURATION)); bar.style.width = (100 * Math.min(t, this.DURATION) / this.DURATION) + '%'; requestAnimationFrame(loop); };
    loop();
  }

  info() {
    const m = this.m;
    return {
      duration: this.DURATION, acts: this.acts,
      guides: m.guides.map(g => ({ name: g.name, kind: g.kind, axis: g.axis, family: g.family, lean: g.lean })),
      shapes: m.shapes.map(s => ({ name: s.name, corners: s.corners.length, round: Math.max(...s.radii) })),
      cuts: m.cuts.map(c => c.name), adds: m.adds.map(c => c.name), meta: m.meta,
      fills: this.sEv.map(e => ({ name: e.s.name, hover: e.tHover, fill: e.tFill })),
      rounds: this.rEv.map(e => ({ shapes: e.shapes.map(s => s.name), from: e.tDown, to: e.tUp })),
      mockups: this.mEv.map(e => ({ kind: e.mk.kind, from: e.t0, to: e.t1 })),
      cursorKeys: this.cursor.length, events: this.events.length,
    };
  }

  // the construction rules, measured (check.mjs reports these)
  markCheck() {
    const m = this.m, out = { problems: [...m.problems], offGrid: [], unusedGuides: [], angles: [], feet: null };
    const used = new Set();
    for (const s of m.shapes) {
      s.pts.forEach((q, i) => {
        q.guides.forEach(n => used.add(n));
        const nx = s.pts[(i + 1) % s.pts.length];
        if (q.free || nx.free) { out.offGrid.push(`${s.name}: corner ${i + 1} is not a guide crossing`); return; }
        if (!q.guides.some(n => nx.guides.includes(n))) out.offGrid.push(`${s.name}: edge ${i + 1}→${(i + 1) % s.pts.length + 1} (${q.guides.join('&')} → ${nx.guides.join('&')}) lies on no guide`);
      });
    }
    for (const c of [...m.cuts, ...m.adds]) used.add(c.name);
    for (const g of m.guides) if (!used.has(g.name) && !g.measure) out.unusedGuides.push(g.name);
    // directions, with mirrored pairs (θ and 180° − θ) counted once: a symmetric grid is still a calm grid
    const ang = new Set(m.guides.filter(g => g.kind === 'line').map(g => { const a = Math.round(((Math.atan2(-g.d[1], g.d[0]) * 180 / Math.PI) + 360) % 180); return Math.min(a, (180 - a) % 180); }));
    out.angles = [...ang].sort((a, b) => a - b);
    if (m.meta.ground) {
      const gr = m.byName[m.meta.ground], feet = m.shapes.filter(s => s.foot);
      out.feet = { ground: m.meta.ground, count: feet.length, floating: feet.filter(s => !s.pts.some(q => q.guides.includes(m.meta.ground))).map(s => s.name) };
      if (!gr) out.problems.push(`reads.ground "${m.meta.ground}" is not a guide`);
    }
    // facing: the eye (the highest cut) sits on the side the mark faces
    if (/^(left|right)$/.test(m.meta.facing || '') && m.cuts.length) {
      const eye = [...m.cuts].sort((a, b) => a.y - b.y)[0], side = eye.x > m.box.cx ? 'right' : 'left';
      out.facing = { want: m.meta.facing, eye: eye.name, side };
    }
    out.circlesInShapes = m.cuts.map(c => ({ name: c.name, inside: m.shapes.some(s => insidePoly([c.x, c.y], s.poly)) }));
    return out;
  }
  // does every hole survive at small sizes? count paper holes enclosed by ink at 512 px vs at `px`
  legibility(px = 32) {
    const count = size => {
      const c = this.m.sprite(size, '#000', 2), g = c.getContext('2d'), { width: w, height: h } = c, d = g.getImageData(0, 0, w, h).data;
      const ink = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) ink[i] = d[i * 4 + 3] > 110 ? 1 : 0;
      const seen = new Uint8Array(w * h); let holes = 0, inkPx = 0;
      for (let i = 0; i < w * h; i++) inkPx += ink[i];
      for (let i = 0; i < w * h; i++) {
        if (ink[i] || seen[i]) continue;
        let edge = false, n = 0; const st = [i]; seen[i] = 1;
        while (st.length) { const j = st.pop(), x = j % w, y = (j / w) | 0; n++; if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
          for (const k of [j - 1, j + 1, j - w, j + w]) if (k >= 0 && k < w * h && !seen[k] && !ink[k] && Math.abs((k % w) - x) <= 1) { seen[k] = 1; st.push(k); } }
        if (!edge && n >= 1) holes++;
      }
      return { holes, cover: inkPx / (w * h) };
    };
    const big = count(512), small = count(px);
    return { px, holesBig: big.holes, holesSmall: small.holes, coverBig: +big.cover.toFixed(3), coverSmall: +small.cover.toFixed(3) };
  }
  // the sketch is the same idea drawn loosely: close to the mark, never a copy of it (IoU of the two silhouettes)
  sketchCheck() {
    const N = 400, a = canvas(N, N), b = canvas(N, N), ga = a.getContext('2d'), gb = b.getContext('2d');
    ga.drawImage(this.sk, 0, 0, N, N); gb.scale(N / 1000, N / 1000); gb.fillStyle = '#000'; this.m.fill(gb);
    const da = ga.getImageData(0, 0, N, N).data, db = gb.getImageData(0, 0, N, N).data;
    let i = 0, u = 0; for (let k = 3; k < da.length; k += 4) { const x = da[k] > 60, y = db[k] > 60; if (x && y) i++; if (x || y) u++; }
    return { iou: +(i / Math.max(1, u)).toFixed(3) };
  }
  mockupCheck() {
    return this.o.mockups.map((mk, i) => {
      const img = this.mk[i] || (this.mk[i] = drawMockup(mk, this.m, this.o, this.o.seed + i * 17));
      const g = img.getContext('2d'), d = g.getImageData(0, 0, img.width, img.height).data;
      let sum = 0, sq = 0, n = 0; for (let j = 0; j < d.length; j += 4 * 97) { const l = .3 * d[j] + .59 * d[j + 1] + .11 * d[j + 2]; sum += l; sq += l * l; n++; }
      const mean = sum / n, sd = Math.sqrt(sq / n - mean * mean);
      return { kind: mk.kind, known: !!MOCKUPS[mk.kind], mean: +mean.toFixed(1), sd: +sd.toFixed(1), inkContrast: +contrast(mk.ink || '#000000', mk.base || '#ffffff').toFixed(2) };
    });
  }
}

function insidePoly(pt, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; }
function clipSeg(L, R) {
  let t0 = -1e9, t1 = 1e9; const { p, d } = L;
  for (const [pi, di, lo, hi] of [[p[0], d[0], R.x0, R.x1], [p[1], d[1], R.y0, R.y1]]) {
    if (Math.abs(di) < 1e-12) { if (pi < lo || pi > hi) return null; continue; }
    let a = (lo - pi) / di, b = (hi - pi) / di; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b);
  }
  return t0 > t1 ? null : [[p[0] + d[0] * t0, p[1] + d[1] * t0], [p[0] + d[0] * t1, p[1] + d[1] * t1]];
}

const FONT_DIR = new URL('./fonts/', import.meta.url);
async function loadFonts() {
  const faces = [['LCHand', 'Caveat-500.woff2', '500'], ['LCSans', 'Inter-500.woff2', '500'], ['LCSans', 'Inter-600.woff2', '600'], ['LCSans', 'Inter-700.woff2', '700'], ['LCKo', 'Pretendard-Bold.subset.woff2', '700'], ['LCKo', 'Pretendard-Bold.subset.woff2', '500']];
  await Promise.all(faces.map(async ([fam, file, weight]) => { const f = new FontFace(fam, `url(${new URL(file, FONT_DIR)})`, { weight }); await f.load(); document.fonts.add(f); }));
}
function glyphCheck(o) {
  const miss = [];
  const test = (txt, fam) => { for (const ch of new Set([...txt.replace(/\s/g, '')])) if (!hasGlyph(ch, fam)) miss.push(`${ch} (${fam})`); };
  test(o.signature || '', 'LCHand');
  const ko = /[ㄱ-힝]/.test(o.title || '');
  test((o.title || '') + (o.subtitle || ''), ko ? 'LCKo' : 'LCSans');
  for (const mk of o.mockups) if (mk.text) test(mk.text, /[ㄱ-힝]/.test(mk.text) ? 'LCKo' : 'LCSans');
  return miss;
}
let _gc;
function hasGlyph(ch, fam) { // a glyph the font lacks falls back: compare against a font that cannot exist
  _gc = _gc || canvas(64, 64).getContext('2d');
  const w = f => { _gc.font = `40px ${f}`; return _gc.measureText(ch).width; };
  return Math.abs(w(`${fam}, LCNoSuchA`) - w('LCNoSuchA')) > .01 || Math.abs(w(`${fam}, monospace`) - w('monospace')) > .01;
}

// the mark sheet (?sheet=mark): every guide with its name, the corners as dots, the filled mark faint underneath, and
// the finished mark small at 128 / 48 / 24 px — the page to look at while you design the grid
function drawMarkSheet(ctx, F) {
  const m = F.m, k = F._k; ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  const gb = m.guideBox, S = Math.min(1000 / (gb.x1 - gb.x0), 1300 / (gb.y1 - gb.y0)), ox = 40 - gb.x0 * S, oy = 60 - gb.y0 * S;
  const P = p => [p[0] * S + ox, p[1] * S + oy];
  ctx.save(); ctx.setTransform(k * S, 0, 0, k * S, k * ox, k * oy); ctx.globalAlpha = .25; ctx.drawImage(F.sk, 0, 0, 1000, 1000); ctx.globalAlpha = .55; ctx.fillStyle = '#111'; m.fill(ctx); ctx.restore();
  ctx.font = '500 17px LCSans'; ctx.lineWidth = 1.4;
  m.guides.forEach((g, i) => {
    ctx.strokeStyle = g.kind === 'circle' ? '#e0344a' : g.axis === 'slant' ? '#3d7bff' : g.axis === 'free' ? '#9b51e0' : '#16a34a';
    ctx.fillStyle = ctx.strokeStyle;
    if (g.kind === 'circle') { const c = P([g.x, g.y]); ctx.beginPath(); ctx.arc(c[0], c[1], g.r * S, 0, 7); ctx.stroke(); ctx.fillText(g.name, c[0] + g.r * S + 3, c[1]); return; }
    const a = P(g.seg[0]), b = P(g.seg[1]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    const lp = i % 2 ? a : b; ctx.fillText(g.name, lp[0] + 3, lp[1] + (i % 2 ? -4 : 14));
  });
  for (const s of m.shapes) s.pts.forEach((q, i) => { const p = P(q.p); ctx.fillStyle = q.free ? '#f0f' : s.radii[i] > 0 ? '#111' : '#e0344a'; ctx.beginPath(); ctx.arc(p[0], p[1], 3.5, 0, 7); ctx.fill(); });
  let x = 60; const y = 1560;
  for (const px of [256, 128, 48, 24]) { const sp = m.sprite(px, '#111'); ctx.drawImage(sp, x, y + (256 - sp.height) / 2); ctx.fillStyle = '#888'; ctx.fillText(px + ' px', x, y + 290); x += px + 60; }
  { const sp = m.sprite(128, '#111'); ctx.save(); ctx.translate(x + sp.width, y + (256 - sp.height) / 2); ctx.scale(-1, 1); ctx.drawImage(sp, 0, 0); ctx.restore(); ctx.fillStyle = '#888'; ctx.fillText('mirrored', x, y + 290); }
  ctx.fillStyle = '#555'; ctx.fillText('blue = slant · green = h / v · purple = free · red = circle · red dot = sharp corner · magenta = off-grid', 40, 1880);
}
