// pencil-dream-short · film.js — one continuous take on one sketchbook spread: marks drawn on in time (by the hero's pencil,
// by a flying pencil, or by themselves), the hero alive on the page, a spot-colour swarm, a crayon wash, and the camera
// that ends by pulling back to show the sketchbook lying on a desk. Every frame is a pure function of t.
//
//   const F = new Film({ dur: 30, paper, spot, lead, page: { w: 3400, h: 2200 }, score: SCORE, seed });
//   F.hero(SPEC, t => pose, { z: 10, drawOn: [0, 1.4] });            the hero (lib/hero.js) — track gives the pose minus the pen arm
//   const m = F.draw(parts, { at: 6, dur: 1.2, by: 'hero', z: 0 });  a mark: parts drawn on in order. by: 'hero' | 'pencil' | 'self'
//   F.spread(items, { at, origin, speed, rate });                     items [{ at: [x, y], parts }] start drawing as a wave reaches them
//   F.pencil({ intro: m, catchAt: 7.4, meet: [x, y] });               the flying pencil draws m, then lands in the hero's hand
//   F.swarm({ … });  F.wash([…]);  F.desk({ … });  F.camera([{ t, x, y, w, r }]);  F.beat('name', t);  F.check(name, t => ok);
//   F.start();
// Contract: window.seek(t), DURATION, FPS (24), SIZE, runChecks(t), shotAt(t) (the beat), film, __ready.
// ?render=1 fixed canvas (with ?t=12: that frame) · ?t=12 live from 12 s · ?scale=.5 · ?off=grain,grade,vignette,tooth
import * as P from './pencil.js';
import { Painter, opWeight, opHead } from './draw.js';
import { hero as drawHero, pencil as pencilPart, blinkAt } from './hero.js';
import { drawDesk, deskTexture, deskFront } from './desk.js';
import { swarmParts } from './kit.js';
import { renderScore } from './score.js';
const { clamp, lerp, ease, keys, hash, n1, span } = P;

export class Film {
  constructor(o = {}) {
    const q = new URLSearchParams(location.search);
    this.q = q; this.render = q.has('render'); this.W = 1920; this.H = 1080; this.FPS = o.fps || 24; this.boilFps = o.boil || 6;
    this.off = new Set((q.get('off') || '').split(',').filter(Boolean));
    this.S = +(q.get('scale') || (this.render ? 1 : Math.min(1, Math.max(.5, (innerWidth * devicePixelRatio) / this.W))));
    this.dur = o.dur || 30; this.seed = o.seed || 1; this.title = o.title || document.title;
    this.paper = o.paper || '#f2ede2'; this.spot = o.spot || '#e8692e'; this.lead = o.lead || '#37373b';
    this.page = { w: 3400, h: 2200, ...(o.page || {}) }; this.z0 = this.W / (this.page.w * 1.06);
    this.score = o.score || null; this.fadeIn = o.fadeIn ?? .5; this.fadeOut = o.fadeOut ?? .9; this.grade = { warm: .05, vignette: .22, grain: .045, ...(o.grade || {}) };
    this.marks = []; this.cam = [{ t: 0, x: 0, y: 0, w: this.page.w * 1.06 }]; this.rules = []; this.beats = []; this.swarms = []; this.washes = [];
    this.heroSpec = null; this.pencilSpec = null; this.deskSpec = null;
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
    this.mk = mk; this.canvas = mk(this.W * this.S, this.H * this.S); this.ctx = this.canvas.getContext('2d');
    this.layer = mk(this.W * this.S, this.H * this.S); this.lctx = this.layer.getContext('2d'); this.layer2 = mk(this.W * this.S, this.H * this.S); this.l2 = this.layer2.getContext('2d');
    this.pt = new Painter(this.ctx, { paper: this.paper, spot: this.spot, lead: this.lead });
    this.lpt = new Painter(this.l2, { paper: this.paper, spot: this.spot, lead: this.lead });
    this.tooth = this.ctx.createPattern(P.toothTile(this.seed + 3), 'repeat');
    this.crayon = this.lctx.createPattern(P.crayonTile(this.seed + 4), 'repeat');
    this.grainTiles = P.grainTiles(this.seed + 5);
    this.renderScore = (spec, sr, dur) => renderScore({ ...spec, sfx: [...(spec.sfx || []), ...(spec.pen === false ? [] : this.penSfx())] }, sr, dur);
    document.body.style.margin = 0; document.body.style.background = '#16130f'; document.body.style.overflow = 'hidden';
    document.body.appendChild(this.canvas);
  }

  // ── authoring ──────────────────────────────────────────────────────────────────────────────────────────────────────
  /** a mark: parts (or t => parts with a stable stroke count) drawn on from `at`. by: 'hero' (her pencil draws it),
   *  'pencil' (the flying pencil), 'self' (lines grow by themselves). rate = world units a second (when no dur).
   *  move: t => { x, y, s, r, ox, oy } (the mark lives after it is drawn); out: [t0, t1] fades it away; z: layer order */
  draw(parts, o = {}) {
    const m = { parts: typeof parts === 'function' ? null : parts, make: typeof parts === 'function' ? parts : null, at: o.at ?? 0, dur: o.dur, by: o.by || 'self',
      rate: o.rate ?? (o.by === 'hero' ? 520 : o.by === 'pencil' ? 900 : 1400), lift: o.lift ?? (o.by === 'hero' ? .07 : .03), z: o.z ?? 0, move: o.move || null,
      out: o.out || null, name: o.name || `mark ${this.marks.length + 1}`, alpha: o.alpha || null };
    this.marks.push(m); return m;
  }
  /** many marks that start as a wave from `origin` reaches each item's anchor (speed world units / s) */
  spread(items, o = {}) {
    const org = o.origin || [0, 0], sp = o.speed || 900;
    return items.map((it, i) => this.draw(it.parts, { ...o, at: (o.at || 0) + P.dist(org, it.at) / sp + (it.delay || 0), dur: it.dur, name: it.name || `${o.name || 'spread'} ${i + 1}`, z: it.z ?? o.z }));
  }
  hero(spec, track, o = {}) { this.heroSpec = spec; this.heroTrack = track; this.heroOpt = { z: 10, ...o }; }
  /** the flying pencil: draws the `intro` mark, then lands in the hero's hand at catchAt (meeting point `meet`, world) */
  pencil(o) { this.pencilSpec = { ...o }; if (o.intro) o.intro.by = 'pencil'; }
  swarm(o) { this.swarms.push({ zBack: -2, zFront: 20, ...o }); }
  /** crayon colour laid in over the drawing: regions [{ poly, at, dur, col | grad: { c, r: [r0, r1], stops }, gap, angle, a }] */
  wash(regions) { for (const r of regions) this.washes.push({ type: 'fill', pts: r.poly, gap: r.gap || 16, angle: r.angle ?? -.35, a: r.a ?? .8, seed: hash(this.washes.length, 77) * 1e6 | 0, off: [0, 0], speed: 1, clip: false, ...r }); }
  desk(o) { this.deskSpec = o; }
  camera(k) { this.cam = k; }
  beat(name, t) { this.beats.push({ name, start: t }); this.beats.sort((a, b) => a.start - b.start); }
  check(name, fn) { this.rules.push({ name, fn }); }

  // ── timing ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  prepare() {
    for (const m of this.marks) {
      const parts = m.parts || m.make(m.at), ops = parts.flatMap(p => p.ops), w = ops.map(op => opWeight(op, this.pt));
      const tot = w.reduce((a, b) => a + b, 0), gaps = m.lift * Math.max(0, ops.length - 1);
      let scale = 1 / m.rate, g = m.lift;
      if (m.dur !== undefined) { const avail = Math.max(.05, m.dur - gaps * (m.dur < gaps * 2 ? .3 : 1)); scale = avail / (tot || 1); g = m.dur < gaps * 2 ? m.lift * .3 : m.lift; }
      let t = m.at; m.alloc = ops.map((op, i) => { const a = t, b = t + w[i] * scale; t = b + g; return [a, b]; });
      m.end = m.alloc.length ? m.alloc[m.alloc.length - 1][1] : m.at; if (m.dur === undefined) m.dur = m.end - m.at;
    }
    this.heroMarks = this.marks.filter(m => m.by === 'hero').sort((a, b) => a.at - b.at);
    this.shots = (this.beats.length ? this.beats : [{ name: 'take', start: 0 }]).map((b, i, a) => ({ name: b.name, start: b.start, dur: (a[i + 1] ? a[i + 1].start : this.dur) - b.start }));
  }
  partsOf(m, t) { return m.parts || m.make(t); }
  xfOf(m, t) { if (!m.move) return null; const o = m.move(t); if (!o) return null; return p => P.tf([p], o)[0]; }
  progFn(m, t) { const A = m.alloc; return i => { const a = A[i]; if (!a) return 1; return t >= a[1] ? 1 : t <= a[0] ? 0 : (t - a[0]) / (a[1] - a[0]); }; }
  /** where a mark's pencil is at t → { p, drawing } (null outside the mark) */
  headOf(m, t) {
    if (t < m.at || t > m.end) return null;
    const parts = this.partsOf(m, t), ops = parts.flatMap(p => p.ops), A = m.alloc, xf = this.xfOf(m, t) || (p => p);
    for (let i = 0; i < A.length; i++) {
      if (t <= A[i][1]) {
        if (t >= A[i][0]) return { p: xf(opHead(ops[i], (t - A[i][0]) / (A[i][1] - A[i][0] || 1), this.pt)), drawing: true };
        const a = xf(opHead(ops[i - 1], 1, this.pt)), b = xf(opHead(ops[i], 0, this.pt)), k = ease.sine((t - A[i - 1][1]) / (A[i][0] - A[i - 1][1] || 1)), lift = Math.sin(Math.PI * k) * Math.min(30, P.dist(a, b) * .25);
        return { p: [lerp(a[0], b[0], k), lerp(a[1], b[1], k) - lift], drawing: false };
      }
    }
    return { p: xf(opHead(ops[ops.length - 1], 1, this.pt)), drawing: false };
  }
  /** the hero's pen target at t → { p, w } (w = how much the drawing arm follows the pen) */
  penAt(t) {
    const L = this.heroMarks, lead = .45;
    for (const m of L) { const h = this.headOf(m, t); if (h) return { p: h.p, w: 1 }; }
    let prev = null, next = null; for (const m of L) { if (m.end < t) prev = m; else if (m.at > t && !next) next = m; }
    const pe = prev && this.headOf(prev, prev.end), ns = next && this.headOf(next, next.at);
    if (prev && next && next.at - prev.end < lead * 2.2) { const k = ease.sine((t - prev.end) / (next.at - prev.end)), lift = Math.sin(Math.PI * k) * 25; return { p: [lerp(pe.p[0], ns.p[0], k), lerp(pe.p[1], ns.p[1], k) - lift], w: 1 }; }
    if (next && next.at - t < lead) return { p: ns.p, w: ease.sine(1 - (next.at - t) / lead) };
    if (prev && t - prev.end < lead) return { p: pe.p, w: ease.sine(1 - (t - prev.end) / lead) };
    return { p: null, w: 0 };
  }
  /** the hero at t: the track's pose + the pen arm + the catch */
  heroAt(t) {
    if (!this.heroSpec) return null;
    const spec = this.heroSpec, hand = spec.hand || 'R', pose = { ...this.heroTrack(t) }, pc = this.pencilSpec;
    pose.arms = { ...(pose.arms || {}) };
    if (pose.blink === undefined) pose.blink = blinkAt(t, 3);
    const holds = !pc || t >= pc.catchAt; if (holds) pose.hold = hand;
    if (pc && t < pc.catchAt && t > pc.catchAt - .7) {           // reach for the pencil
      const rest = drawHero(spec, pose).at.hand[hand], k = ease.inOut((t - (pc.catchAt - .7)) / .7);
      pose.arms[hand] = { to: [lerp(rest[0], pc.meet[0], k), lerp(rest[1], pc.meet[1], k)] }; pose.open = hand;
    } else if (holds) {
      const pen = this.penAt(t);
      if (pc && t < pc.catchAt + .45 && pen.w === 0) { const k = ease.inOut((t - pc.catchAt) / .45), rest = drawHero(spec, pose).at.hand[hand]; pose.arms[hand] = { grip: [lerp(pc.meet[0], rest[0], k), lerp(pc.meet[1], rest[1], k)] }; }
      if (pen.w > 0) { const restTip = drawHero(spec, pose).at.tip || pen.p; pose.arms[hand] = { to: [lerp(restTip[0], pen.p[0], pen.w), lerp(restTip[1], pen.p[1], pen.w)] }; pose.penTarget = pen.p; pose.penW = pen.w; }
    }
    const h = drawHero(spec, pose);
    if (pose.penW === 1 && h.at.tip && P.dist(h.at.tip, pose.penTarget) > (spec.H || 240) * .04) h.audit.push(`body: ${spec.name || 'hero'}'s pencil is not on the line it draws (${Math.round(P.dist(h.at.tip, pose.penTarget))} away) — move the mark or the hero`);
    return { ...h, pose };
  }
  /** the free pencil before the catch → { tip, dir, a } or null */
  pencilAt(t) {
    const pc = this.pencilSpec; if (!pc || t >= pc.catchAt) return null;
    const m = pc.intro, Lp = (this.heroSpec.pencil?.len ?? .17) * (this.heroSpec.H || 240);
    const ang = a => [Math.cos(a), Math.sin(a)], tilt = (pc.tilt ?? 62) * Math.PI / 180;
    if (t < m.at - .35) return null;
    if (t <= m.end) { const h = this.headOf(m, Math.max(t, m.at)) || { p: this.headOf(m, m.at).p }; const a = tilt + n1(t * 1.3, 4) * .25; return { tip: h.p, dir: ang(a), a: clamp((t - (m.at - .35)) / .35) }; }
    const last = this.headOf(m, m.end).p, k = ease.inOut((t - m.end) / (pc.catchAt - m.end)), hd = this.heroSpec.hand || 'R';
    const pose = this.heroTrack(pc.catchAt), heldA = ((pose.penAng ?? 60) * Math.PI / 180), d = ang(lerp(tilt, heldA, k));
    const grip = pc.meet, tipEnd = [grip[0] + d[0] * Lp * .7, grip[1] + d[1] * Lp * .7], arcY = Math.sin(Math.PI * k) * (pc.arc ?? 60);
    return { tip: [lerp(last[0], tipEnd[0], k), lerp(last[1], tipEnd[1], k) - arcY], dir: d, a: 1 };
  }
  /** does the frame show anything beyond the page (the desk)? check.mjs judges colour on the page only */
  deskShows(t) { const c = this.camAt(t), hw = c.w / 2 + Math.abs(c.r) * c.w * .3, hh = c.w * 9 / 32 + Math.abs(c.r) * c.w * .3; return c.x - hw < -this.page.w / 2 || c.x + hw > this.page.w / 2 || c.y - hh < -this.page.h / 2 || c.y + hh > this.page.h / 2; }
  camAt(t) { const c = { x: keys(this.cam, t, 'x', 0), y: keys(this.cam, t, 'y', 0), w: Math.exp(keys(this.cam.map(k => ({ ...k, lw: k.w !== undefined ? Math.log(k.w) : undefined })), t, 'lw', Math.log(this.page.w))), r: keys(this.cam, t, 'r', 0) }; return c; }

  // ── rendering ──────────────────────────────────────────────────────────────────────────────────────────────────────
  frame(t) {
    t = clamp(t, 0, this.dur - 1e-4);
    const ctx = this.ctx, pt = this.pt, W = this.W, H = this.H, Sc = this.S, cam = this.camAt(t), pg = this.page;
    this.audit = [];
    ctx.setTransform(Sc, 0, 0, Sc, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    pt.view(cam, W, H, this.z0); pt.boil = Math.floor(t * this.boilFps + 1e-6); pt.xf = null;
    const corners = [[-pg.w / 2, -pg.h / 2], [pg.w / 2, -pg.h / 2], [pg.w / 2, pg.h / 2], [-pg.w / 2, pg.h / 2]].map(p => pt.S(p));
    const deskOn = !!this.deskSpec && !corners.every(() => false) && cam.w > pg.w * .98;
    ctx.fillStyle = '#1a1612'; ctx.fillRect(0, 0, W, H);
    if (this.deskSpec && cam.w > pg.w * .9) { if (!this._desk) this._desk = deskTexture(this, this.deskSpec); drawDesk(ctx, pt, this, t, this.deskSpec, this._desk); }
    // the page
    ctx.save(); ctx.beginPath(); corners.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fillStyle = this.paper; ctx.fill(); ctx.clip();
    // content by z
    const items = this.marks.filter(m => t >= m.at).map(m => ({ z: m.z, m }));
    const hero = this.heroSpec ? this.heroAt(t) : null;
    if (hero) { items.push({ z: this.heroOpt.z, hero }); this.audit.push(...hero.audit); }
    const pen = this.pencilAt(t); if (pen) items.push({ z: (this.heroOpt?.z || 10) + 1, pen });
    for (const s of this.swarms) { const sp = swarmParts(s, t, this); if (sp.back.length) items.push({ z: s.zBack, parts: sp.back }); if (sp.front.length) items.push({ z: s.zFront, parts: sp.front }); }
    items.sort((a, b) => a.z - b.z);
    for (const it of items) {
      if (it.m) {
        const m = it.m, parts = this.partsOf(m, t); pt.xf = this.xfOf(m, t);
        const a = (m.out ? 1 - span(t, m.out[0], m.out[1]) : 1) * (m.alpha ? m.alpha(t) : 1);
        if (a > 0) pt.parts(parts, this.progFn(m, t), { alpha: a });
        pt.xf = null;
      } else if (it.hero) {
        const d = this.heroOpt.drawOn;
        if (d && t < d[1]) { const n = it.hero.parts.reduce((s, p) => s + p.ops.length, 0), k = span(t, d[0], d[1], ease.lin) * n; pt.parts(it.hero.parts, i => clamp(k - i)); }
        else pt.parts(it.hero.parts);
      } else if (it.pen) {
        const Lp = (this.heroSpec.pencil?.len ?? .17) * (this.heroSpec.H || 240), g = [it.pen.tip[0] - it.pen.dir[0] * Lp * .7, it.pen.tip[1] - it.pen.dir[1] * Lp * .7];
        pt.parts([pencilPart(g, it.pen.dir, Lp, this.heroSpec.ink ?? 2, this.heroSpec.H)], null, { alpha: it.pen.a });
      } else if (it.parts) pt.parts(it.parts);
    }
    // crayon wash
    const wl = this.washes.filter(w => t >= w.at);
    if (wl.length) {
      const L = this.lctx, lp = this.lpt; L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, this.layer.width, this.layer.height); L.setTransform(Sc, 0, 0, Sc, 0, 0);
      lp.view(cam, W, H, this.z0); lp.boil = pt.boil;
      for (const w of wl) {
        // each region is coloured in on a scratch layer; a 'bloom' region (any gradient wash) spreads from its centre with a soft edge
        const k = clamp((t - w.at) / (w.dur || 2)), B = this.l2, bloom = (w.reveal || (w.grad ? 'bloom' : 'zig')) === 'bloom';
        B.setTransform(1, 0, 0, 1, 0, 0); B.clearRect(0, 0, this.layer2.width, this.layer2.height); B.setTransform(Sc, 0, 0, Sc, 0, 0);
        if (w.grad) { const c = lp.S(w.grad.c), g = B.createRadialGradient(c[0], c[1], w.grad.r[0] * lp.v.z, c[0], c[1], w.grad.r[1] * lp.v.z); for (const [o, col] of w.grad.stops) g.addColorStop(o, col); lp.spot = g; }
        else lp.spot = w.col || this.spot;
        lp.fill({ ...w, col: 'spot', edge: false }, bloom ? 1 : k);
        if (bloom && k < 1) {
          const c = lp.S(w.grad ? w.grad.c : w.from || [0, 0]), R = (w.reach || 3000) * lp.v.z * ease.out(k), fe = Math.max(40, R * .45), g = B.createRadialGradient(c[0], c[1], Math.max(0, R - fe), c[0], c[1], R + 1);
          g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); B.globalCompositeOperation = 'destination-in'; B.fillStyle = g; B.fillRect(0, 0, W, H); B.globalCompositeOperation = 'source-over';
        }
        L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(this.layer2, 0, 0); L.restore();
      }
      // the paper's tooth shows through the crayon
      L.globalCompositeOperation = 'destination-in'; const o = lp.S([0, 0]), s = clamp(lp.v.z * 2.2, .6, 2.5);
      this.crayon.setTransform(new DOMMatrix().translate(o[0], o[1]).scale(s)); L.fillStyle = this.crayon; L.fillRect(0, 0, W, H); L.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(this.layer, 0, 0); ctx.restore();
    }
    // paper tooth (world-anchored, two octaves cross-faded so a long zoom never shows the tile swim) + the spread's gutter
    if (!this.off.has('tooth')) {
      const z = pt.v.z, lv = Math.log2(300 / (40 * z)), k0 = Math.floor(lv), f = lv - k0, o = pt.S([0, 0]);
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      for (const [kk, a] of [[k0, 1 - f], [k0 + 1, f]]) { if (a < .02) continue; const s = 40 * Math.pow(2, kk) * z / 256; this.tooth.setTransform(new DOMMatrix().translate(o[0], o[1]).rotate(pt.v.r * 180 / Math.PI).scale(s)); ctx.globalAlpha = a; ctx.fillStyle = this.tooth; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
    }
    const gA = pt.S([-pg.w * .045, 0]), gB = pt.S([pg.w * .045, 0]), gg = ctx.createLinearGradient(gA[0], gA[1], gB[0], gB[1]);
    gg.addColorStop(0, 'rgba(90,80,64,0)'); gg.addColorStop(.42, 'rgba(90,80,64,.06)'); gg.addColorStop(.5, 'rgba(70,60,48,.17)'); gg.addColorStop(.58, 'rgba(90,80,64,.06)'); gg.addColorStop(1, 'rgba(90,80,64,0)');
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    if (this.deskSpec && cam.w > pg.w * .9) deskFront(ctx, pt, this, t, this.deskSpec);
    this.post(t, cam);
  }
  post(t, cam) {
    const ctx = this.ctx, W = this.W, H = this.H, G = this.grade, off = this.off;
    ctx.setTransform(this.S, 0, 0, this.S, 0, 0);
    if (!off.has('grade') && G.warm) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = P.rgba('#f4e2c0', G.warm * 3); ctx.fillRect(0, 0, W, H); }
    if (!off.has('vignette') && G.vignette) {
      const deskK = this.deskSpec ? clamp((cam.w - this.page.w) / (this.page.w * .8)) : 0, v = G.vignette + deskK * .25;
      const g = ctx.createRadialGradient(W / 2, H / 2, H * .38, W / 2, H / 2, Math.hypot(W, H) * .62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(38,30,22,${v})`);
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = 'source-over';
    if (this.fadeIn && t < this.fadeIn) { ctx.globalAlpha = 1 - ease.sine(t / this.fadeIn); ctx.fillStyle = this.paper; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (this.fadeOut && t > this.dur - this.fadeOut) { ctx.globalAlpha = ease.sine((t - (this.dur - this.fadeOut)) / this.fadeOut); ctx.fillStyle = '#120f0c'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (!off.has('grain') && G.grain) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); const cw = this.canvas.width, ch = this.canvas.height, f = Math.floor(t * 12), tile = this.grainTiles[f % 3], ox = Math.floor(hash(f, 1) * 256), oy = Math.floor(hash(f, 2) * 256);
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = G.grain; for (let y = -oy; y < ch; y += 256) for (let x = -ox; x < cw; x += 256) ctx.drawImage(tile, x, y);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }

  /** pencil sound from the drawing itself: one scratch per half second while anything is being drawn (louder for more lines) */
  penSfx() {
    if (!this.marks[0] || !this.marks[0].alloc) this.prepare();
    const out = [], step = .5;
    for (let t = 0; t < this.dur; t += step) {
      let n = 0, hero = 0, fills = 0;
      for (const m of this.marks) for (const [a, b] of m.alloc) if (a < t + step && b > t) { n++; if (m.by === 'hero') hero = 1; }
      if (n) out.push({ t: +t.toFixed(2), type: 'pencil', d: step + .08, v: Math.min(.62, .2 + .1 * Math.sqrt(n) + hero * .15), pan: hero ? .15 : (hash(t * 10, 3) - .5) * .5 });
    }
    return out;
  }

  // ── contract ───────────────────────────────────────────────────────────────────────────────────────────────────────
  start() {
    this.prepare();
    window.seek = t => this.frame(t); window.DURATION = this.dur; window.FPS = this.FPS; window.SIZE = { W: this.W, H: this.H };
    window.runChecks = t => [...this.rules.filter(r => { try { return !r.fn(t); } catch { return true; } }).map(r => r.name), ...new Set(this.audit || [])];
    window.shotAt = t => { let i = 0; while (i < this.shots.length - 1 && t >= this.shots[i + 1].start) i++; return { i, name: this.shots[i].name, lt: t - this.shots[i].start }; };
    window.film = this; this.spotHue = P.hue(this.spot);
    if (this.render) { this.canvas.style.width = '100%'; this.frame(+(this.q.get('t') || 0)); }
    else { this.fit(); this.live(+(this.q.get('t') || 0)); }
    window.__ready = true;
  }
  fit() { const s = this.canvas.style; s.position = 'fixed'; s.left = '50%'; s.top = '50%'; s.transform = 'translate(-50%,-50%)'; s.width = `min(100vw, ${16 / 9 * 100}vh)`; s.height = 'auto'; }
  live(from = 0) {
    let t0 = performance.now(), base = clamp(from, 0, this.dur - .01), paused = false, ac = null, src = null, buffer = null, loading = false;
    const st = document.createElement('style'); st.textContent = `.pds-ui{position:fixed;left:12px;right:12px;bottom:10px;display:flex;gap:10px;align-items:center;font:13px system-ui,sans-serif;color:#e9e1d0;opacity:.25;transition:opacity .3s}.pds-ui:hover{opacity:1}.pds-ui button{background:#2b241c;color:#e9e1d0;border:1px solid #5a4c3a;border-radius:6px;padding:4px 10px;cursor:pointer}.pds-bar{flex:1;height:6px;background:#3a3127;border-radius:3px;cursor:pointer}.pds-bar i{display:block;height:100%;background:${this.spot};border-radius:3px;width:0}`;
    document.head.appendChild(st);
    const ui = document.createElement('div'); ui.className = 'pds-ui';
    ui.innerHTML = `<button data-k="play">❚❚</button>${this.score ? '<button data-k="snd">♪ sound</button>' : ''}<div class="pds-bar"><i></i></div><span class="tm"></span>`;
    document.body.appendChild(ui);
    const bar = ui.querySelector('.pds-bar'), fill = bar.querySelector('i'), tm = ui.querySelector('.tm'), pb = ui.querySelector('[data-k=play]'), sb = ui.querySelector('[data-k=snd]');
    const now = () => paused ? base : (ac && src ? (ac.currentTime - this._acStart) : base + (performance.now() - t0) / 1000) % this.dur;
    const stopAudio = () => { if (src) { try { src.stop(); } catch { } src = null; } };
    const playAudio = at => { if (!buffer || paused) return; stopAudio(); src = ac.createBufferSource(); src.buffer = buffer; src.loop = true; src.connect(ac.destination); src.start(0, at % this.dur); this._acStart = ac.currentTime - at % this.dur; };
    const go = t => { base = (t % this.dur + this.dur) % this.dur; t0 = performance.now(); if (src) playAudio(base); };
    const toggle = () => { if (paused) { paused = false; go(base); if (buffer) playAudio(base); } else { base = now(); paused = true; stopAudio(); } pb.textContent = paused ? '▶' : '❚❚'; };
    pb.onclick = e => { e.stopPropagation(); toggle(); };
    if (sb) sb.onclick = async e => {
      e.stopPropagation();
      if (src) { base = now(); stopAudio(); t0 = performance.now(); sb.textContent = '♪ sound'; return; }
      if (loading) return; loading = true; sb.textContent = '♪ …';
      ac = ac || new AudioContext();
      if (!buffer) { await new Promise(r => setTimeout(r, 30)); const sr = ac.sampleRate, [L, R] = this.renderScore(this.score, sr, this.dur); buffer = ac.createBuffer(2, L.length, sr); buffer.copyToChannel(L, 0); buffer.copyToChannel(R, 1); }
      loading = false; sb.textContent = '♪ on'; const at = now(); paused = false; pb.textContent = '❚❚'; playAudio(at);
    };
    const scrub = e => { const r = bar.getBoundingClientRect(); go(clamp((e.clientX - r.left) / r.width) * this.dur); if (paused) this.frame(base); };
    bar.onpointerdown = e => { e.stopPropagation(); bar.setPointerCapture(e.pointerId); scrub(e); bar.onpointermove = scrub; };
    bar.onpointerup = () => { bar.onpointermove = null; };
    this.canvas.onclick = toggle;
    addEventListener('keydown', e => {
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { const t = now() + (e.code === 'ArrowRight' ? 1 : -1); paused ? (base = (t + this.dur) % this.dur, this.frame(base)) : go(t); }
    });
    let lastF = -1;
    const loop = () => {
      const t = now(), fi = Math.floor(t * this.FPS);
      if (!paused && fi !== lastF) { this.frame(fi / this.FPS); lastF = fi; }
      fill.style.width = (t / this.dur * 100) + '%'; tm.textContent = `${t.toFixed(1)} / ${this.dur.toFixed(0)} s · ${window.shotAt(t).name}`;
      requestAnimationFrame(loop);
    };
    loop();
  }
}
