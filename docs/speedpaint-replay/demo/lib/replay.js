// speedpaint-replay · replay.js — plays the making of one Sketch as a "making replay" page:
// a title, six stage chips (rough · line · flats · shadow · highlight · finish), the canvas card, and a stylus that
// draws every item in order. Every frame is a pure function of t (seek(t)), so the page plays live and renders to MP4.
//
//   const R = new Replay(sketch, { stages: { rough: 5, line: 14, flat: 6, shadow: 6, highlight: 5, finish: 5 }, hold: 3 });
//   R.start();
import { clamp, lerp, smooth, easeInOut, span, mix, rgba, area, hash } from './core.js';
import { pen, pencil, fillWhole, fillVia, toPath } from './brush.js';
import { STAGES } from './sketch.js';

const FONT = 'SPR Pretendard';
export const LABELS = {
  ko: { title: '메이킹 재생', note: '선도 색도 코드로 그리고 있습니다', chips: ['러프', '선화', '밑색', '그림자', '하이라이트', '마무리'] },
  en: { title: 'Making replay', note: 'every line and colour is drawn in code', chips: ['Rough', 'Lines', 'Flats', 'Shadow', 'Highlight', 'Finish'] },
};
export const THEME = { bg: '#ebe5dc', bg2: '#e4ddd2', title: '#2a2421', note: '#8d847b', chip: '#f8f5f0', chipLine: '#e0d8cc', chipDone: '#4f4844',
  chipTodo: '#a69d94', accent: '#c4552d', paper: '#fdfcf8', shadow: 'rgba(70,50,30,.16)' };

export class Replay {
  constructor(sketch, o = {}) {
    this.s = sketch; this.o = o;
    this.W = 1080; this.H = 1220; this.fps = o.fps ?? 30;
    this.card = { x: 21, y: 138, w: 1038, h: 1038, r: 9 };
    this.k = this.card.w / 1000;
    this.labels = typeof o.labels === 'string' ? LABELS[o.labels] : { ...LABELS.ko, ...(o.labels || {}) };
    this.theme = { ...THEME, ...(o.theme || {}) };
    this.stageDur = { rough: 5, line: 14, flat: 6, shadow: 6, highlight: 5, finish: 5, ...(o.stages || {}) };
    this.intro = o.intro ?? .6; this.hold = o.hold ?? 3;
    this.rules = [];
    this._schedule();
  }
  check(name, fn) { this.rules.push({ name, fn }); return this; }

  // ---- timing: each stage gets its seconds; items share them by how much drawing they are ----
  _natural(it) {
    if (it.dur) return it.dur;
    const w = it.weight ?? 1;
    if (it.kind === 'pencil') return (.14 + it.L / 900) * w;
    if (it.kind === 'pen') return (.05 + it.L / 1500) * w;
    if (it.kind === 'fill') return it.reveal === 'fade' ? .5 * w : (.12 + it.sweepL / 9000) * w;
    return .8 * w;
  }
  _schedule() {
    const s = this.s; let t = this.intro;
    // regions referenced as clips must exist
    for (const it of s.items) for (const c of [].concat(it.clip || [])) if (!s.regions[c]) throw new Error(`item ${it.id} (${it.stage}) clips to "${c}", but no flat has that name`);
    this.clips = {};
    for (const [name, list] of Object.entries(s.regions)) { const p = new Path2D(); for (const it of list) p.addPath(it.path); this.clips[name] = p; }
    this.stages = [];
    for (const st of STAGES) {
      const list = s.items.filter(i => i.stage === st).sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id)), D = this.stageDur[st];
      const nat = list.map(i => this._natural(i)), sum = nat.reduce((a, b) => a + b, 0) || 1;
      const start = t;
      list.forEach((it, i) => { const d = nat[i] / sum * D; it.t0 = t; it.t1 = t + d * (it.kind === 'fx' ? 1 : .86); t += d; });
      if (!list.length) t += D;
      this.stages.push({ name: st, start, end: t, n: list.length });
    }
    this.drawEnd = t; this.dur = +(t + this.hold).toFixed(3);
    this.order = s.items.slice().sort((a, b) => a.t0 - b.t0);  // timeline order
    this.byStage = Object.fromEntries(STAGES.map(st => [st, s.items.filter(i => i.stage === st).sort((a, b) => a.z - b.z || a.id - b.id)]));
    this.tints = s.items.filter(i => i.tint);
  }
  stageAt(t) { return this.stages.find(g => t >= g.start && t < g.end) || (t < this.intro ? this.stages[0] : this.stages[this.stages.length - 1]); }

  // ---- drawing ----
  _setupCanvases(scale) {
    const cv = this.canvas; cv.width = Math.round(this.W * scale); cv.height = Math.round(this.H * scale);
    this.ctx = cv.getContext('2d', { alpha: false });
    const aw = Math.round(this.card.w * scale), ah = Math.round(this.card.h * scale);
    const mk = () => { const c = document.createElement('canvas'); c.width = aw; c.height = ah; return c; };
    this.art = mk(); this.ink = mk(); this.tmp = mk(); this._masks = {};
    this.scale = scale; this.ak = this.k * scale;   // art units → art-canvas pixels
  }
  _item(ctx, it, t, tmp) {
    const u = it.t1 > it.t0 ? clamp((t - it.t0) / (it.t1 - it.t0)) : 1;
    if (it.kind === 'pen') return pen(ctx, it, u);
    if (it.kind === 'pencil') return pencil(ctx, it, u);
    if (it.kind === 'fill') {
      const mask = it.clip ? this._mask(it.clip) : null, fade = it.reveal === 'fade' ? smooth(u) : 1;
      if (u >= 1 && !mask) { fillWhole(ctx, it); return null; }
      if (it.reveal === 'fade' && !mask) { fillWhole(ctx, it, fade); return it.sweep[Math.floor(u * (it.sweep.length - 1))]; }
      const tip = fillVia(ctx, tmp || this.tmp, it, u, mask, fade);
      return u >= 1 ? null : tip || it.sweep[Math.floor(u * (it.sweep.length - 1))];
    }
    if (it.kind === 'fx') { ctx.save(); it.draw(ctx, smooth(u), { t, k: this.ak, art: this.s, replay: this }); ctx.restore(); return it.sweep[Math.floor(u * (it.sweep.length - 1))]; }
  }
  // the VISIBLE part of the named flat region(s): their shapes minus every flat painted above them. A shadow clipped to
  // 'neck' must not darken the face that covers the top of the neck — like a clipping layer in a paint program.
  _mask(clip) {
    const names = [].concat(clip), key = names.join('+');
    if (this._masks[key]) return this._masks[key];
    const m = document.createElement('canvas'); m.width = this.art.width; m.height = this.art.height;
    const g = m.getContext('2d'); g.setTransform(this.ak, 0, 0, this.ak, 0, 0);
    for (const it of this.byStage.flat) {
      if (it.mode && it.mode !== 'source-over') continue;
      g.save();
      if (it.clip) g.clip(this._clipPath(it.clip));
      // a flat clipped to one of these regions (an iris on the eye white) is painted ON it, so it stays inside
      const inside = names.includes(it.name) || [].concat(it.clip || []).some(c => names.includes(c));
      g.globalCompositeOperation = inside ? 'source-over' : 'destination-out';
      g.fillStyle = '#fff'; g.fill(it.path); g.restore();
    }
    return (this._masks[key] = m);
  }
  _clipPath(c) { const p = new Path2D(); for (const n of [].concat(c)) p.addPath(this.clips[n]); return p; }

  drawArt(t) {
    const a = this.art.getContext('2d'), k = this.ak, s = this.s;
    a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'source-over'; a.globalAlpha = 1; a.filter = 'none';
    a.fillStyle = s.paper; a.fillRect(0, 0, this.art.width, this.art.height);
    a.setTransform(k, 0, 0, k, 0, 0);
    let tip = null;
    const run = (ctx, list, pred = () => true) => { for (const it of list) if (it.t0 <= t && pred(it)) { const p = this._item(ctx, it, t, this.tmp); if (p && t < it.t1) tip = p; } };
    run(a, this.byStage.flat); run(a, this.byStage.shadow); run(a, this.byStage.highlight);
    run(a, this.byStage.finish, it => !it.over && !it.tint);
    // line art on its own layer, so the finish can recolour it
    const g = this.ink.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, this.ink.width, this.ink.height);
    g.setTransform(k, 0, 0, k, 0, 0);
    run(g, this.byStage.line);
    for (const it of this.tints) if (it.t0 <= t) {
      const u = smooth((t - it.t0) / (it.t1 - it.t0));
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = it.tint.amount * u; g.fillStyle = it.tint.color; g.fillRect(0, 0, this.ink.width, this.ink.height);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      if (t < it.t1) tip = it.sweep[Math.floor(u * (it.sweep.length - 1))];
    }
    a.setTransform(1, 0, 0, 1, 0, 0); a.globalAlpha = s.inkAlpha ?? 1; a.drawImage(this.ink, 0, 0); a.globalAlpha = 1;
    a.setTransform(k, 0, 0, k, 0, 0);
    run(a, this.byStage.finish, it => it.over && !it.tint);
    // the rough stays on top, fading out under the line art and flats
    const L = this.stages[1], F = this.stages[2];
    const ra = t < L.start ? 1 : t < L.end ? lerp(1, .45, span(t, L.start, L.end)) : lerp(.45, 0, span(t, F.start, F.start + (F.end - F.start) * .6));
    if (ra > 0.003) { a.globalAlpha = 1; const saved = this.byStage.rough; for (const it of saved) if (it.t0 <= t) { const ia = it.alpha; it.alpha = (ia ?? .8) * ra; const p = this._item(a, it, t); it.alpha = ia; if (p && t < it.t1) tip = p; } }
    return tip;
  }

  // the stylus position: on the active item's tip, gliding between items, lifting away at the end
  stylus(t, tip) {
    if (tip) return { p: tip, lift: 0 };
    const o = this.order; let prev = null, next = null;
    for (const it of o) { if (it.t1 <= t) prev = it; else if (it.t0 > t) { next = it; break; } }
    const end = it => it.kind === 'fill' || it.kind === 'fx' ? it.sweep[it.sweep.length - 1] : it.pts[it.pts.length - 1];
    const start = it => it.kind === 'fill' || it.kind === 'fx' ? it.sweep[0] : it.pts[0];
    if (prev && next) { const u = easeInOut(span(t, prev.t1, next.t0)), a = end(prev), b = start(next); return { p: [lerp(a[0], b[0], u), lerp(a[1], b[1], u)], lift: Math.sin(Math.PI * u) }; }
    if (!prev && next) { const b = start(next), u = easeInOut(span(t, next.t0 - .5, next.t0)); return { p: [lerp(1150, b[0], u), lerp(1100, b[1], u)], lift: 1 - u, alpha: u }; }
    if (prev && !next) { const a = end(prev), u = easeInOut(span(t, prev.t1, prev.t1 + .8)); return { p: [lerp(a[0], 1180, u), lerp(a[1], 1120, u)], lift: u, alpha: 1 - u }; }
    return null;
  }

  render(t) {
    t = clamp(t, 0, this.dur); this.t = t;
    const c = this.ctx, S = this.scale, W = this.W, H = this.H, th = this.theme, L = this.labels, cd = this.card;
    const tip = this.drawArt(t);
    c.setTransform(S, 0, 0, S, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
    const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, th.bg); bg.addColorStop(1, th.bg2); c.fillStyle = bg; c.fillRect(0, 0, W, H);
    // header
    c.fillStyle = th.title; c.font = `800 37px "${FONT}"`; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    if (c.letterSpacing !== undefined) c.letterSpacing = '3px';
    c.fillText(L.title, cd.x, 63);
    if (c.letterSpacing !== undefined) c.letterSpacing = '0px';
    c.fillStyle = th.note; c.font = `600 17px "${FONT}"`; c.textAlign = 'right'; c.fillText(L.note, cd.x + cd.w, 56); c.textAlign = 'left';
    // stage chips
    const cur = this.stageAt(t), ci = STAGES.indexOf(cur.name);
    c.font = `600 20px "${FONT}"`;
    let x = cd.x; const cy = 102, hh = 40;
    this._chips = [];
    L.chips.forEach((txt, i) => {
      const tw = c.measureText(txt).width, w = tw + 54;
      const on = i === ci, done = i < ci;
      c.beginPath(); c.roundRect(x, cy - hh / 2, w, hh, hh / 2);
      c.fillStyle = on ? th.accent : th.chip; c.fill();
      if (!on) { c.strokeStyle = th.chipLine; c.lineWidth = 1.5; c.stroke(); }
      c.fillStyle = on ? '#fff' : done ? th.chipDone : th.chipTodo;
      c.beginPath(); c.arc(x + 19, cy, 4.2, 0, 7); c.fill();
      c.fillText(txt, x + 31, cy + 7);
      this._chips.push({ x, y: cy - hh / 2, w, h: hh });
      x += w + 9;
    });
    // card
    c.save(); c.shadowColor = th.shadow; c.shadowBlur = 22; c.shadowOffsetY = 5; c.fillStyle = this.s.paper;
    c.beginPath(); c.roundRect(cd.x, cd.y, cd.w, cd.h, cd.r); c.fill(); c.restore();
    c.save(); c.beginPath(); c.roundRect(cd.x, cd.y, cd.w, cd.h, cd.r); c.clip();
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(this.art, Math.round(cd.x * S), Math.round(cd.y * S)); c.restore();
    // stylus
    c.setTransform(S, 0, 0, S, 0, 0);
    const st = this.stylus(t, tip); this._stylus = st;
    if (st && !this.off?.has('stylus')) this._pen(c, cd.x + st.p[0] * this.k, cd.y + st.p[1] * this.k, st.lift, st.alpha ?? 1);
  }

  _pen(c, x, y, lift = 0, alpha = 1) {
    if (alpha <= 0) return;
    const ang = -0.98, len = 250, bw = 15, cone = 30, lx = 6 * lift, ly = -10 * lift;
    c.save(); c.globalAlpha = alpha;
    const shape = () => {
      c.beginPath();
      c.moveTo(0, 0); c.lineTo(cone, -bw * .42); c.lineTo(cone + 4, -bw / 2); c.lineTo(len - bw / 2, -bw / 2);
      c.arc(len - bw / 2, 0, bw / 2, -Math.PI / 2, Math.PI / 2); c.lineTo(cone + 4, bw / 2); c.lineTo(cone, bw * .42); c.closePath();
    };
    // shadow on the paper (further away when the pen lifts)
    c.save(); c.translate(x + 16 + 22 * lift, y + 12 + 18 * lift); c.rotate(ang); c.filter = `blur(${5 + 6 * lift}px)`; c.fillStyle = `rgba(40,30,20,${.22 - .08 * lift})`; shape(); c.fill(); c.restore();
    c.translate(x + lx, y + ly); c.rotate(ang);
    shape();
    const g = c.createLinearGradient(0, -bw / 2, 0, bw / 2); g.addColorStop(0, '#ffffff'); g.addColorStop(.55, '#f1f1ef'); g.addColorStop(1, '#c9c8c4');
    c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(90,85,80,.45)'; c.lineWidth = 1; c.stroke();
    // the nib
    c.beginPath(); c.moveTo(0, 0); c.lineTo(cone, -bw * .42); c.lineTo(cone, bw * .42); c.closePath();
    const n = c.createLinearGradient(0, -bw / 2, 0, bw / 2); n.addColorStop(0, '#d9d8d4'); n.addColorStop(1, '#8e8b86'); c.fillStyle = n; c.fill();
    c.beginPath(); c.moveTo(0, 0); c.lineTo(7, -2.6); c.lineTo(7, 2.6); c.closePath(); c.fillStyle = '#4a4744'; c.fill();
    c.restore();
  }

  // ---- checks the scripts call ----
  runChecks(t) { const bad = []; for (const r of this.rules) { let ok; try { ok = r.fn(t, this); } catch { ok = false; } if (!ok) bad.push(r.name); } return bad; }
  // every item, drawn alone, leaves a mark (a region clipped away to nothing, a zero-length line, a fill outside the canvas)
  itemCheck() {
    const bad = [], aw = this.art.width, ah = this.art.height;
    const c = document.createElement('canvas'); c.width = aw; c.height = ah; const g = c.getContext('2d', { willReadFrequently: true });
    for (const it of this.s.items) {
      if (it.kind === 'fx') continue;
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, aw, ah); g.setTransform(this.ak, 0, 0, this.ak, 0, 0);
      const keep = { mode: it.mode, alpha: it.alpha, fill: it.fill, color: it.color, reveal: it.reveal };
      Object.assign(it, { mode: 'source-over', alpha: 1, reveal: 'sweep' }); if (it.kind === 'fill') it.fill = '#000'; else it.color = '#000';
      if (it.kind === 'pen') pen(g, it, 1); else if (it.kind === 'pencil') pencil(g, it, 1);
      else if (it.clip) fillVia(g, this.tmp, it, 1, this._mask(it.clip)); else fillWhole(g, it);
      Object.assign(it, keep);
      const d = g.getImageData(0, 0, aw, ah).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) { n++; if (n > 1) break; }
      if (n < 1) bad.push({ id: it.id, stage: it.stage, kind: it.kind, name: it.name || '', clip: [].concat(it.clip || []).join('+'), box: it.box && [Math.round(it.box.x), Math.round(it.box.y), Math.round(it.box.w), Math.round(it.box.h)] });
    }
    return bad;
  }
  glyphCheck() {
    const c = this.ctx, miss = new Set(), L = this.labels;
    for (const s of [L.title, L.note, ...L.chips]) for (const ch of s) {
      if (ch.trim() === '' || ch.charCodeAt(0) < 128) continue;
      c.font = `600 40px "${FONT}", monospace`; const a = c.measureText(ch).width; c.font = `600 40px "${FONT}", serif`; const b = c.measureText(ch).width;
      if (Math.abs(a - b) > .01) miss.add(ch);
    }
    return [...miss];
  }
  info() {
    return { dur: this.dur, drawEnd: this.drawEnd, stages: this.stages, card: this.card, k: this.k, pose: this.s.pose, marks: this.s.marks, eyes: this.s.eyes, title: this.s.meta.title,
      items: this.s.items.map(i => ({ id: i.id, stage: i.stage, kind: i.kind, t0: i.t0, t1: i.t1, name: i.name || '', clip: i.clip || '' })),
      count: Object.fromEntries(STAGES.map(st => [st, this.s.items.filter(i => i.stage === st).length])) };
  }

  // ---- body sheet: line art with the body marks and eye boxes, the finished piece, and the piece mirrored ----
  // Mirroring a finished picture is the quickest way to see a face that has drifted (a far eye that is too big, a nose
  // on the wrong side, a jaw that turns the other way from the eyes). check.mjs saves it as out/<name>-body.png.
  bodySheet() {
    const P = 640, G = 28, W = P * 3 + G * 4, H = P + 140, cv = this.canvas, S = this.scale;
    cv.width = W; cv.height = H; const c = cv.getContext('2d');
    c.fillStyle = this.theme.bg; c.fillRect(0, 0, W, H);
    const shot = t => { this.drawArt(t); const k = document.createElement('canvas'); k.width = this.art.width; k.height = this.art.height; k.getContext('2d').drawImage(this.art, 0, 0); return k; };
    const line = shot(this.stages[1].end - .02), done = shot(this.dur);
    const s = this.s, pose = s.pose, marks = s.marks;
    const panel = (i, img, title, mirror, overlay) => {
      const x = G + i * (P + G), y = 92;
      c.save(); c.translate(x, y); c.beginPath(); c.rect(0, 0, P, P); c.clip();
      if (mirror) { c.translate(P, 0); c.scale(-1, 1); }
      c.drawImage(img, 0, 0, P, P);
      if (overlay) {
        const f = P / 1000; c.lineWidth = 2;
        for (const e of s.eyes) { c.strokeStyle = '#2a8f6a'; c.strokeRect((e.c[0] - e.w / 2) * f, (e.c[1] - e.h / 2) * f, e.w * f, e.h * f); }
        for (const [n, p] of Object.entries(marks)) { c.fillStyle = '#d4462a'; c.beginPath(); c.arc(p[0] * f, p[1] * f, 5, 0, 7); c.fill(); if (!mirror) { c.font = `600 15px "${FONT}"`; c.fillStyle = '#7a2414'; c.fillText(n, p[0] * f + 8, p[1] * f - 6); } }
        const m = marks; if (m.eyeL && m.eyeR) { c.strokeStyle = 'rgba(42,143,106,.8)'; c.beginPath(); c.moveTo(m.eyeL[0] * f, m.eyeL[1] * f); c.lineTo(m.eyeR[0] * f, m.eyeR[1] * f); c.stroke(); }
        if (m.shoulderL && m.shoulderR) { c.strokeStyle = 'rgba(212,70,42,.7)'; c.beginPath(); c.moveTo(m.shoulderL[0] * f, m.shoulderL[1] * f); c.lineTo(m.shoulderR[0] * f, m.shoulderR[1] * f); c.stroke(); }
      }
      c.restore();
      c.fillStyle = this.theme.title; c.font = `800 22px "${FONT}"`; c.fillText(title, x, y - 14);
    };
    c.fillStyle = this.theme.title; c.font = `800 30px "${FONT}"`; c.fillText(`${s.meta.title || 'piece'} — body sheet`, G, 46);
    c.font = `600 17px "${FONT}"`; c.fillStyle = this.theme.note;
    c.fillText(pose ? `facing ${pose.facing} · head yaw ${pose.head?.yaw ?? 0}° roll ${pose.head?.roll ?? 0}° pitch ${pose.head?.pitch ?? 0}° · torso yaw ${pose.torso?.yaw ?? 0}° roll ${pose.torso?.roll ?? 0}°` : 'no pose set (no character)', G + 520, 46);
    panel(0, line, 'line art + marks', false, true);
    panel(1, done, 'finished', false, false);
    panel(2, done, 'mirrored (does it still read?)', true, true);
    c.font = `600 16px "${FONT}"`; c.fillStyle = this.theme.note;
    c.fillText('Ask of every panel: does the face turn one way (far eye narrower, nose and chin toward the facing side, ear on the back)? Neck and shoulders possible?', G, H - 18);
    return { W, H };
  }

  // ---- page ----
  async start() {
    const Q = new URLSearchParams(location.search), render = Q.has('render');
    this.off = new Set((Q.get('off') || '').split(',').filter(Boolean));
    const scale = +(Q.get('scale') || 1);
    this.canvas = document.createElement('canvas');
    document.body.style.cssText = `margin:0;background:${this.theme.bg};overflow:hidden;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center`;
    document.body.appendChild(this.canvas);
    const base = new URL('./fonts/', import.meta.url).href;
    for (const [w, f] of [[600, 'Pretendard-SemiBold.subset.woff2'], [800, 'Pretendard-Bold.subset.woff2']]) { const face = new FontFace(FONT, `url(${base}${f})`, { weight: String(w) }); await face.load(); document.fonts.add(face); }
    this._setupCanvases(render ? scale : Math.min(1, scale * Math.max(.5, Math.min(1.5, (innerHeight * devicePixelRatio) / this.H))));
    Object.assign(window, { replay: this, DURATION: this.dur, FPS: this.fps, SIZE: { W: this.W, H: this.H }, seek: t => this.render(t),
      runChecks: t => this.runChecks(t), stageAt: t => this.stageAt(t).name, itemCheck: () => this.itemCheck(), glyphCheck: () => this.glyphCheck(), replayInfo: () => this.info() });
    if (Q.get('sheet') === 'body') { this.bodySheet(); window.__ready = true; return; }
    if (render) { this.canvas.style.width = Math.min(innerWidth, innerHeight * this.W / this.H) + 'px'; this.render(+(Q.get('t') || 0)); }
    else this._player(+(Q.get('t') || 0));
    window.__ready = true;
  }
  _player(t0) {
    const cv = this.canvas, fit = () => { const h = Math.min(innerHeight - 46, (innerWidth - 8) * this.H / this.W); cv.style.height = h + 'px'; cv.style.width = h * this.W / this.H + 'px'; };
    fit(); addEventListener('resize', fit);
    const bar = document.createElement('div');
    bar.style.cssText = `display:flex;gap:10px;align-items:center;width:min(92vw,560px);height:40px;font:13px system-ui;color:${this.theme.note}`;
    bar.innerHTML = `<button data-k=play style="all:unset;cursor:pointer;width:24px;text-align:center;color:${this.theme.title}">❚❚</button><input data-k=bar type=range min=0 max=1000 value=0 style="flex:1;accent-color:${this.theme.accent}"><span data-k=time style="width:84px;text-align:right;font-variant-numeric:tabular-nums"></span>`;
    document.body.appendChild(bar);
    const $ = k => bar.querySelector(`[data-k=${k}]`);
    let t = t0, playing = true, last = performance.now();
    const setPlay = p => { playing = p; $('play').textContent = p ? '❚❚' : '▶'; };
    $('play').onclick = () => setPlay(!playing);
    cv.onclick = e => {
      // a click on a stage chip jumps to that stage
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * this.W, y = (e.clientY - r.top) / r.height * this.H;
      const i = (this._chips || []).findIndex(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
      if (i > -1) { t = this.stages[i].start; return; }
      setPlay(!playing);
    };
    $('bar').oninput = e => { t = e.target.value / 1000 * this.dur; };
    addEventListener('keydown', e => {
      if (e.key === ' ') { setPlay(!playing); e.preventDefault(); }
      if (e.key === 'ArrowRight') t = Math.min(this.dur, t + 3);
      if (e.key === 'ArrowLeft') t = Math.max(0, t - 3);
    });
    const loop = now => {
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      if (playing) { t += dt; if (t > this.dur) t = 0; }
      this.render(t);
      $('bar').value = Math.round(t / this.dur * 1000);
      $('time').textContent = `${t.toFixed(1)} / ${this.dur.toFixed(0)} s`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
