// storybook-portrait · portrait.js — the page runtime: paints a character's strokes onto layers, plays the drawing being
// made, then keeps the character alive (breath, blinks, glances). One clock: t in seconds.
//   0 … motion.draw          the strokes go down in a painter's order (each op wiped in along its brush direction)
//   motion.draw … DURATION   alive: every layer moves by the pose from motion.js
// Page contract: window.__ready, window.DURATION, window.seek(t) (draws that moment, no state carried between calls),
// window.__sp = { portrait, pose(t), figure, rig(), cast() }. Query: ?render=1 (no clock) ?scale=.5 ?t=3 ?done ?cast
import * as P from './paint.js';
import { build, LAYERS, LIMITS } from './figure.js';
import { makeMotion } from './motion.js';

const STAGE = { 'x:behind': 8.8, head: 0, neck: 1, face: 2, '@face': 3, 'x:head': 3.5, hairBack: 4, hairFront: 5, ears: 6, earringL: 7, earringR: 7, '@strays': 8, 'x:hair': 8.5, body: 9, 'x:body': 9.5, 'x:back': 10, 'x:front': 11 };

/** paint one op into its own canvas (bbox-sized), so paper tooth knocked out of it never bites what is underneath */
function paintOp(o, scale) {
  const [x0, y0, x1, y1] = o.bb, c = P.canvas((x1 - x0) * scale, (y1 - y0) * scale), g = c.getContext('2d');
  g.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale); o.draw(g);
  return c;
}

export class Portrait {
  constructor(character, opt = {}) {
    this.C = character; this.scale = opt.scale || 1;
    this.design = character.design || {};
    this.M = makeMotion(character.motion || {}, this.design);
    this.drawT = character.motion?.draw ?? 7;
    this.DURATION = +(this.drawT + (character.motion?.live ?? 10)).toFixed(3);
    this.fig = build(this.design, opt.view || {});
    this.W = this.fig.W; this.H = this.fig.H;
    const S = this.scale;
    this.paper = P.paper(this.W, this.H, this.fig.D.canvas.paper, (this.fig.D.seed || 1) + 2, S);
    // layers: bbox of their ops, clipped to the sheet (+ margin for things that swing in)
    const order = this.fig.D.ears.over === false ? LAYERS.map(l => l[0] === 'ears' ? ['ears', 'head'] : l).sort((a, b) => (a[0] === 'ears' ? 8.5 : LAYERS.findIndex(l => l[0] === a[0])) - (b[0] === 'ears' ? 8.5 : LAYERS.findIndex(l => l[0] === b[0]))) : LAYERS;
    this.layers = order.map(([name, attach]) => {
      const mine = this.fig.ops.filter(o => o.layer === name);
      let bb = mine.length ? P.union(...mine.map(o => o.bb)) : null;
      if (bb) bb = [Math.max(-60, Math.floor(bb[0] - 4)), Math.max(-60, Math.floor(bb[1] - 4)), Math.min(this.W + 60, Math.ceil(bb[2] + 4)), Math.min(this.H + 60, Math.ceil(bb[3] + 4))];
      return { name, attach, bb, canvas: bb ? P.canvas((bb[2] - bb[0]) * S, (bb[3] - bb[1]) * S) : null, live: name.startsWith('@') };
    });
    this.byName = Object.fromEntries(this.layers.map(l => [l.name, l]));
    // the order the hand paints in (stable within a stage), and when each op is laid down
    const seq = this.fig.ops.map((o, i) => ({ ...o, i, rank: STAGE[o.layer] ?? 10 }));
    for (const name of ['@face', '@strays']) seq.push({ layer: name, name, rank: STAGE[name], w: .35, i: 1e4 + seq.length, pseudo: true });
    for (const x of this.fig.live.extras) seq.push({ layer: x.layer + '@live', name: 'extra live', rank: (STAGE[x.layer] ?? 11) + .01, w: .2, i: 2e4 + x.i, pseudo: true });
    seq.sort((a, b) => a.rank - b.rank || a.i - b.i);
    const t0 = .3, t1 = Math.max(t0 + .5, this.drawT - .6), total = seq.reduce((s, o) => s + (o.w ?? 1), 0);
    let acc = 0; for (const o of seq) { o.t0 = t0 + (t1 - t0) * acc / total; acc += o.w ?? 1; o.t1 = t0 + (t1 - t0) * acc / total; }
    this.seq = seq; this.committed = 0; this.curCache = null; this.complete = false;
  }

  /** bring every layer to "ops seq[0..k) painted" */
  commit(k) {
    if (k < this.committed) { for (const l of this.layers) if (l.canvas) l.canvas.getContext('2d').clearRect(0, 0, l.canvas.width, l.canvas.height); this.committed = 0; }
    const S = this.scale;
    for (let i = this.committed; i < k; i++) {
      const o = this.seq[i]; if (o.pseudo) continue;
      const l = this.byName[o.layer], c = paintOp(o, S);
      l.canvas.getContext('2d').drawImage(c, (o.bb[0] - l.bb[0]) * S, (o.bb[1] - l.bb[1]) * S);
    }
    this.committed = k;
  }
  finish() { if (!this.complete) { this.commit(this.seq.length); this.complete = true; } }

  /** the transform each attach point rides on, for a pose */
  transforms(pose) {
    const g = this.fig.geo, a = g.head.a, I = new DOMMatrix();
    if (!pose) return { none: I, body: I, head: I, face: I, hair: I, earL: I, earR: I };
    const [bx, by] = g.pivot.body, [nx, ny] = g.pivot.neck, [cx, cy] = g.pivot.crown;
    const k = 1 + pose.breath * .0055;
    const body = new DOMMatrix().translate(bx, by).rotate(pose.shoulder * 4).scale(1 + pose.breath * .0015, k).translate(-bx, -by);
    const neckRise = (by - ny) * (k - 1);
    const head = new DOMMatrix().translate(pose.shoulder * a * .12, -neckRise - pose.rise).translate(nx, ny).rotate(pose.tilt * 180 / Math.PI).translate(-nx, -ny);
    const face = head.translate(pose.yaw * a * .55, Math.abs(pose.yaw) * a * .02);
    const hair = head.translate(cx, cy).rotate(pose.hairLag * 180 / Math.PI).translate(-cx, -cy).translate((pose.yaw * .3 + pose.hairYaw * .25) * a, 0);
    const ear = (side, sw) => { const e = g.ears.find(e => e.side === side); if (!e || !e.vis) return head; return head.translate(pose.yaw * a * (side * pose.yaw > 0 ? .05 : .22), 0).translate(e.lobe[0], e.lobe[1]).rotate(sw * 180 / Math.PI).translate(-e.lobe[0], -e.lobe[1]); };
    return { none: I, body, head, face, hair, earL: ear(-1, pose.swingL), earR: ear(1, pose.swingR) };
  }

  /** draw the moment t into ctx (a canvas sized W·scale × H·scale) */
  draw(ctx, t) {
    const S = this.scale, drawing = t < this.drawT;
    let k = this.seq.length, cur = null, prog = 1;
    if (drawing) { k = this.seq.findIndex(o => o.t1 > t); if (k < 0) k = this.seq.length; else { cur = this.seq[k]; prog = P.clamp((t - cur.t0) / (cur.t1 - cur.t0)); if (prog <= 0) cur = null; } }
    if (drawing) { this.commit(k); this.complete = false; } else this.finish();
    const visible = new Set(this.seq.slice(0, k).filter(o => o.pseudo).map(o => o.layer));
    const pose = drawing ? this.M.pose(0) : this.M.pose(t - this.drawT);
    const T = this.transforms(pose), base = new DOMMatrix([S, 0, 0, S, 0, 0]);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.paper, 0, 0);
    const tt = drawing ? 0 : t - this.drawT;
    for (const l of this.layers) {
      if (this.noFront && l.name === 'x:front') continue;   // checks measure the body without what flies in front of it
      const M = base.multiply(T[l.attach] || T.none);
      if (l.live) {
        if (drawing && !visible.has(l.name) && !(cur && cur.layer === l.name)) continue;
        ctx.save(); ctx.setTransform(M); if (drawing && cur && cur.layer === l.name) ctx.globalAlpha = prog;
        if (l.name === '@face') this.fig.live.face(ctx, pose); else if (l.name === '@strays') this.fig.live.strays(ctx, pose, tt);
        ctx.restore(); continue;
      }
      if (l.canvas) { ctx.save(); ctx.setTransform(M); ctx.drawImage(l.canvas, l.bb[0], l.bb[1], l.canvas.width / S, l.canvas.height / S); ctx.restore(); }
      if (cur && !cur.pseudo && cur.layer === l.name) this.wipe(ctx, cur, prog, M);
      for (const x of this.fig.live.extras) if (x.layer === l.name && (!drawing || visible.has(x.layer + '@live'))) { ctx.save(); ctx.setTransform(M); x.fn(ctx, this.fig.geo.anchors, pose, tt); ctx.restore(); }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return pose;
  }

  /** the op being painted: its canvas revealed along its brush direction with a soft wet front */
  wipe(ctx, o, p, M) {
    const S = this.scale;
    if (!this.curCache || this.curCache.o !== o) this.curCache = { o, c: paintOp(o, S) };
    const c = this.curCache.c, w = c.width, h = c.height, tmp = this.tmp && this.tmp.width >= w && this.tmp.height >= h ? this.tmp : (this.tmp = P.canvas(Math.max(w, this.tmp?.width || 0), Math.max(h, this.tmp?.height || 0)));
    const g = tmp.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, tmp.width, tmp.height); g.drawImage(c, 0, 0);
    const [dx, dy] = o.dir || [0, 1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const proj = [[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => x * ux + y * uy), lo = Math.min(...proj), hi = Math.max(...proj), soft = 40 * S;
    const f = lo + (hi - lo + soft) * p, gr = g.createLinearGradient(ux * (f - soft), uy * (f - soft), ux * f, uy * f);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = gr; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(M); ctx.drawImage(tmp, 0, 0, w, h, o.bb[0], o.bb[1], w / S, h / S); ctx.restore();
  }

  /** the body rules, over the cast angles and every sampled moment of the live loop */
  rig(step = 1 / 30) {
    const out = [], add = (name, value, limit, ok, note = '') => out.push({ name, value: +(+value).toFixed(3), limit, ok, note });
    const g = this.fig.geo;
    // facing: at this build's yaw, nose and chin go towards the turn, the far eye is narrower, the near ear is the visible one
    for (const yaw of [-.7, -.35, 0, .35, .7]) {
      const f = yaw === this.fig.yaw ? this.fig : build(this.design, { yaw }), G = f.geo, s = Math.sign(yaw);
      if (!s) continue;
      const noseOff = (G.nose[0] - G.head.x) * s, eyes = G.eyes.filter(e => e.vis), far = G.eyes.find(e => e.side === s), near = G.eyes.find(e => e.side === -s);
      add(`facing ${yaw}: nose goes the way the face turns`, noseOff, '> 0', noseOff > 0);
      add(`facing ${yaw}: far eye narrower than near eye`, (far.vis ? far.rx : 0) - near.rx, '< 0', !far.vis || far.rx < near.rx);
      const farEar = G.ears.find(e => e.side === s), nearEar = G.ears.find(e => e.side === -s);
      if (farEar && nearEar) add(`facing ${yaw}: near ear shows, far ear hides or narrows`, (farEar.vis ? farEar.w : 0) - (nearEar.vis ? nearEar.w : 0), '< 0', !nearEar.vis ? false : (!farEar.vis || farEar.w < nearEar.w));
      add(`facing ${yaw}: body turns less than head (twist)`, Math.abs(yaw - G.bodyYaw), `≤ ${LIMITS.twist}`, Math.abs(yaw - G.bodyYaw) <= LIMITS.twist);
      add(`facing ${yaw}: chest front goes the way the face turns`, (G.body.front - G.head.x) * s, '> 0', (G.body.front - G.head.x) * s > 0);
      void eyes;
    }
    add('head yaw of this build', Math.abs(this.fig.yaw), `≤ ${LIMITS.yaw}`, Math.abs(this.fig.yaw) <= LIMITS.yaw);
    // the live loop
    let maxTilt = 0, maxYaw = 0, maxTwist = 0, pupilOut = 0, anchor = 0;
    const live = this.DURATION - this.drawT, T0 = this.transforms(this.M.pose(0));
    const [bx, by] = g.pivot.body;
    for (let τ = 0; τ <= live; τ += step) {
      const p = this.M.pose(τ); maxTilt = Math.max(maxTilt, Math.abs(p.tilt)); maxYaw = Math.max(maxYaw, Math.abs(p.yaw)); maxTwist = Math.max(maxTwist, Math.abs(p.yaw - p.shoulder));
      if (Math.abs(p.gaze[0]) > 1.05 || Math.abs(p.gaze[1]) > 1.05) pupilOut++;
      const T = this.transforms(p), q = T.body.transformPoint(new DOMPoint(bx, by)), q0 = T0.body.transformPoint(new DOMPoint(bx, by));
      anchor = Math.max(anchor, Math.hypot(q.x - q0.x, q.y - q0.y));
    }
    add('live: neck tilt', maxTilt, `≤ ${LIMITS.tilt} rad`, maxTilt <= LIMITS.tilt);
    add('live: head turn', maxYaw, `≤ ${LIMITS.liveYaw} rad`, maxYaw <= LIMITS.liveYaw);
    add('live: head vs shoulders twist', maxTwist, `≤ ${LIMITS.twist} rad`, maxTwist <= LIMITS.twist);
    add('live: pupils stay in the eye (frames out)', pupilOut, '0', pupilOut === 0);
    add('live: planted bottom edge drift (px)', anchor, '≤ 1.5', anchor <= 1.5);
    return out;
  }

  /** the motion rules: idle alive, irregular blinks, eyes lead the head, anticipation, overshoot, hair follows */
  motionReport(step = 1 / 120) {
    const out = [], add = (name, value, limit, ok, note = '') => out.push({ name, value: +(+value).toFixed(3), limit, ok, note });
    const live = this.DURATION - this.drawT, M = this.M;
    const bl = M.blinks.filter(t => t < live), iv = bl.slice(1).map((t, i) => t - bl[i]);
    const mean = iv.reduce((s, x) => s + x, 0) / (iv.length || 1), sd = Math.sqrt(iv.reduce((s, x) => s + (x - mean) ** 2, 0) / (iv.length || 1));
    add('idle: blinks in the live window', bl.length, `≥ ${Math.max(2, Math.floor(live / 5))}`, bl.length >= Math.max(2, Math.floor(live / 5)));
    add('idle: blink intervals irregular (s.d. s)', sd, '≥ 0.35', sd >= .35);
    let bmin = 1e9, bmax = -1e9; for (let τ = 0; τ < live; τ += .05) { const p = M.pose(τ); bmin = Math.min(bmin, p.breath); bmax = Math.max(bmax, p.breath); }
    add('idle: breath range', bmax - bmin, '≥ 1', bmax - bmin >= 1);
    add('idle: breath period (s)', M.period, '2.5 – 6', M.period >= 2.5 && M.period <= 6);
    // each head beat: when do the eyes and the head get half way, does the head first move the other way, overshoot, hair lag
    const heads = M.beats.filter(b => b.head && b.t < live);
    if (!heads.length) add('action: at least one head beat (a glance the head follows)', 0, '≥ 1', false);
    let prev = { yaw: 0, tilt: 0 };
    const land = { light: .6, medium: .75, heavy: 1.0 }[this.C.motion?.mass || 'medium'] || .75;
    heads.forEach((b, i) => { const nx = heads[i + 1]; if (nx && nx.t - b.t < land) add(`beat ${b.t}s: time to land before the next head beat (s)`, nx.t - b.t, `≥ ${land} (${this.C.motion?.mass || 'medium'} mass)`, false); });
    for (const [hi, b] of heads.entries()) {
      const to = { yaw: b.head.yaw ?? prev.yaw, tilt: b.head.tilt ?? prev.tilt };
      const p0 = M.pose(Math.max(0, b.t - .01)), key = Math.abs(to.yaw - p0.yaw) >= Math.abs(to.tilt - p0.tilt) ? 'yaw' : 'tilt', start = p0[key];
      const d = to[key] - start; if (Math.abs(d) < .02) { prev = to; continue; }
      const end = Math.min(live, b.t + 2.2, heads[hi + 1] ? heads[hi + 1].t : 1e9);
      if (live - b.t < land) { add(`beat ${b.t}s: lands before the loop ends (s left)`, live - b.t, `≥ ${land}`, false); prev = to; continue; }
      let tHead = null, tEye = null, minPre = 0, peak = 0, tPeak = null, hairPeak = null, hp = -1e9;
      const gTo = b.gaze ? b.gaze[0] : null, g0 = p0.gaze[0];
      for (let τ = b.t; τ < end; τ += step) {
        const p = M.pose(τ), prog = (p[key] - start) / d;
        if (tHead === null && prog >= .5) tHead = τ - b.t;
        if (gTo !== null && tEye === null && Math.abs(gTo - g0) > .05 && (p.gaze[0] - g0) / (gTo - g0) >= .5) tEye = τ - b.t;
        if (tHead === null) minPre = Math.min(minPre, prog);
        if (prog > peak) { peak = prog; tPeak = τ; }
        // the hair's own angle (head + its lag), as a fraction of the move: it should peak after the head does
        const hv = ((key === 'yaw' ? p.yaw + p.hairYaw : p.tilt + p.hairLag) - start) / d; if (hv > hp) { hp = hv; hairPeak = τ; }
      }
      const label = `beat ${b.t}s (${key} ${start.toFixed(2)} → ${to[key].toFixed(2)})`;
      if (tEye !== null) add(`${label}: eyes lead the head (s)`, (tHead ?? 9) - tEye, '≥ 0.06', (tHead ?? 9) - tEye >= .06);
      add(`${label}: anticipation (counter-move, fraction)`, -minPre, '≥ 0.03', -minPre >= .03);
      add(`${label}: overshoot (fraction past the key)`, peak - 1, '0.02 – 0.35', peak - 1 >= .02 && peak - 1 <= .35);
      add(`${label}: hair follows late (s after the head peak)`, (hairPeak ?? 0) - (tPeak ?? 0), '≥ 0.03', (hairPeak ?? 0) - (tPeak ?? 0) >= .03);
      prev = to;
    }
    return out;
  }
}

/** cast sheet: the build turned both ways, expressions, and the motion keys of a glance each way */
export function castSheet(character, opt = {}) {
  const sc = opt.cellScale || .3, design = character.design || {}, base = new Portrait(character, { scale: sc });
  const W = base.W * sc, H = base.H * sc, cols = 5, pad = 14, head = 34;
  const rows = [
    { title: 'turns · front, 3/4 and strong 3/4 both ways (head ≤ 0.75 rad, the chest follows by half)', cells: [-.7, -.35, 0, .35, .7].map(yaw => ({ yaw, label: `yaw ${yaw}` })) },
    { title: 'expressions (motion.js EXPRESSIONS) at the design yaw', cells: ['wary', 'calm', 'pleased', 'surprised', 'sleepy'].map(e => ({ expr: e, label: e })) },
    { title: 'glance → right: eyes first · counter-move · turn · overshoot · settle (hair late)', cells: [0, .1, .2, .35, .9].map(τ => ({ glance: 1, τ, label: `+${τ}s` })) },
    { title: 'glance → left: the same keys mirrored', cells: [0, .1, .2, .35, .9].map(τ => ({ glance: -1, τ, label: `+${τ}s` })) },
  ];
  const c = P.canvas(cols * (W + pad) + pad, rows.length * (H + pad + head) + pad), g = c.getContext('2d');
  g.fillStyle = '#efe9df'; g.fillRect(0, 0, c.width, c.height);
  const cell = P.canvas(W, H), cg = cell.getContext('2d');
  rows.forEach((row, ri) => {
    const y = pad + ri * (H + pad + head);
    g.fillStyle = '#3a3036'; g.font = '600 15px system-ui, sans-serif'; g.fillText(row.title, pad, y + 18);
    row.cells.forEach((cl, ci) => {
      let p, t = base.DURATION;
      if (cl.yaw !== undefined) p = new Portrait(character, { scale: sc, view: { yaw: cl.yaw } });
      else if (cl.expr) p = new Portrait({ ...character, motion: { ...(character.motion || {}), beats: [], expression: cl.expr } }, { scale: sc });
      else {
        const m = { ...(character.motion || {}), live: 3, beats: [{ t: .5, gaze: [cl.glance * .9, 0], head: { yaw: cl.glance * .16, tilt: cl.glance * .05 } }] };
        p = new Portrait({ ...character, motion: m }, { scale: sc }); t = p.drawT + .5 + cl.τ;
      }
      p.draw(cg, t);
      const x = pad + ci * (W + pad);
      g.drawImage(cell, x, y + head); g.strokeStyle = 'rgba(0,0,0,.15)'; g.strokeRect(x + .5, y + head + .5, W - 1, H - 1);
      g.fillStyle = 'rgba(40,30,36,.8)'; g.font = '13px system-ui, sans-serif'; g.fillText(cl.label, x + 8, y + head + 18);
    });
  });
  return c;
}

/** mount a character on the page: piece.html calls this */
export function mount(character) {
  const q = new URLSearchParams(location.search), scale = +(q.get('scale') || 1);
  document.title = character.meta?.title || document.title;
  const style = document.createElement('style');
  style.textContent = 'html,body{margin:0;height:100%;background:#e9e4da}body{display:grid;place-items:center}canvas{max-width:100vw;max-height:100vh;width:auto;height:auto;display:block;box-shadow:0 2px 24px rgba(0,0,0,.12)}';
  document.head.appendChild(style);
  if (q.has('cast')) {
    const c = castSheet(character, { cellScale: +(q.get('cell') || .3) }); document.body.appendChild(c);
    window.__sp = { cast: c }; window.DURATION = 0; window.seek = () => {}; window.__ready = true; return;
  }
  const p = new Portrait(character, { scale }), cv = P.canvas(p.W * scale, p.H * scale), ctx = cv.getContext('2d');
  document.body.appendChild(cv);
  window.DURATION = p.DURATION; window.FPS = character.motion?.fps || 30;
  window.seek = t => p.draw(ctx, t);
  window.__sp = { portrait: p, figure: p.fig, pose: t => (t < p.drawT ? p.M.pose(0) : p.M.pose(t - p.drawT)), rig: () => p.rig(), motion: () => p.motionReport(), DURATION: p.DURATION, drawT: p.drawT };
  if (q.has('render')) { p.draw(ctx, +(q.get('t') || 0)); window.__ready = true; return; }
  const start = performance.now() - (q.has('done') ? p.drawT * 1000 : (+(q.get('t') || 0)) * 1000);
  const tick = () => { p.draw(ctx, (performance.now() - start) / 1000); requestAnimationFrame(tick); };
  window.__ready = true; tick();
  cv.addEventListener('click', () => location.reload());
}
