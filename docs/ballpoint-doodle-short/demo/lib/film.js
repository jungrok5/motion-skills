// ballpoint-doodle-short · film.js — the runtime: shots on a timeline, a camera that looks at a point of the world (and
// follows the hero along the line), lines that breathe on the boil, drawings on twos, draw-on reveals, cuts / dissolves /
// a wipe back to the blank page, the paper grade (the sheet's tooth over the crayon), live playback with sound, the contract.
//
//   const F = new Film({ seed: 7, score: SCORE });
//   F.shot(5, g => { g.paper(); g.world(c => { L.draw(c, g.view.x0, g.view.x1); R.critter(c, HERO, { … }); }); },
//          { name: 'home', cam: lt => ({ x: 540 + lt * 40, y: 600, zoom: 1 }) });
//   F.check('hero on the line', t => …);   F.start();
//
// The camera {x, y, zoom, rot}: the world point at the middle of the square, keyed per shot ([{t, x, y, zoom}] or a
// function of local time). g.at(z, fn) draws a layer at depth z (1 = the line's plane, < 1 = farther, moves less).
import * as P from './pen.js';
import { renderScore } from './score.js';
const { keys, hash, n1, clamp, ease, rgba } = P;

const POST = { tooth: .1, warm: '#f3e3c2', warmA: 0, vignette: .06, grain: .03 };

export class Film {
  constructor(o = {}) {
    const q = new URLSearchParams(location.search);
    this.q = q; this.render = q.has('render'); this.W = o.W || 1080; this.H = o.H || 1080; this.FPS = o.fps || 24; this.boilFps = o.boil || 8;
    this.off = new Set((q.get('off') || '').split(',').filter(Boolean));
    this.S = +(q.get('scale') || (this.render ? 1 : Math.min(1, Math.max(.5, (Math.min(innerWidth, innerHeight) * devicePixelRatio) / this.H))));
    this.post = { ...POST, ...(o.post || {}) }; this.seed = o.seed || 1; this.paperTone = o.paper || P.PAPER; P.pen.paper = this.paperTone;
    this.score = o.score || null; this.title = o.title || document.title; this.renderScore = renderScore;
    this.shots = []; this.rules = []; this.dur = 0; this.fadeIn = o.fadeIn ?? .4; this.fadeOut = o.fadeOut ?? .5;
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
    this.mk = mk;
    this.canvas = mk(this.W * this.S, this.H * this.S); this.ctx = this.canvas.getContext('2d');
    this.buf = mk(this.W * this.S, this.H * this.S); this.bctx = this.buf.getContext('2d');
    const R = P.rng(this.seed);
    this.grainTiles = [0, 1, 2].map(() => {
      const c = mk(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256);
      for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (R() + R() + R() - 1.5) * 110; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      x.putImageData(d, 0, 0); return c;
    });
    this.sheet = this.plate(this.W, this.H, (c, w, h) => P.paper(c, w, h, { tone: this.paperTone, seed: this.seed + 1, S: this.S }));
    // the handwriting font (bundled next to this file) — start() waits for it so the first frame already has it
    this.fontReady = (async () => { try { const f = new FontFace('DoodleHand', `url(${new URL('./fonts/Caveat-500.woff2', import.meta.url).href})`); await f.load(); document.fonts.add(f); } catch (e) { console.warn('handwriting font not loaded:', e.message); } })();
    document.body.appendChild(this.canvas);
  }

  /** a plate: an offscreen canvas painted once (per boil variant) by paint(ctx, w, h, variant), in stage/world units */
  plate(w, h, paint, o = {}) {
    const S0 = this.S, n = o.boil || 1, cs = [];
    for (let v = 0; v < n; v++) { const c = this.mk(Math.ceil(w * S0), Math.ceil(h * S0)), x = c.getContext('2d'); x.scale(S0, S0); P.frame(v * 3 + 1, this.seed + (o.seed || 0)); paint(x, w, h, v); cs.push(c); }
    return { c: cs, w, h, n };
  }
  /** a shot: dur seconds; draw(g, lt, u). o.cam = keys [{t, x, y, zoom, rot}] or lt => ({x, y, zoom}); o.tr = transition INTO this shot */
  shot(dur, draw, o = {}) { this.shots.push({ dur, draw, cam: o.cam || [{ t: 0 }], shake: o.shake, tr: o.tr || null, name: o.name || 'shot ' + (this.shots.length + 1), start: this.dur }); this.dur += dur; return this; }
  check(name, fn) { this.rules.push({ name, fn }); }

  locate(t) { let i = 0; while (i < this.shots.length - 1 && t >= this.shots[i + 1].start) i++; return i; }
  camAt(sh, lt) {
    const W = this.W, H = this.H;
    const c = typeof sh.cam === 'function' ? { x: W / 2, y: H / 2, zoom: 1, rot: 0, ...sh.cam(lt) } : { x: keys(sh.cam, lt, 'x', W / 2), y: keys(sh.cam, lt, 'y', H / 2), zoom: keys(sh.cam, lt, 'zoom', 1), rot: keys(sh.cam, lt, 'rot', 0) };
    const a = sh.shake ? sh.shake(lt) : 0;
    if (a) { const q = Math.floor(lt * 12); c.x += n1(q * .9, 3) * a; c.y += n1(q * .9, 7) * a; }
    return c;
  }
  drawShot(ctx, i, lt, t) {
    const sh = this.shots[i], W = this.W, H = this.H, Sc = this.S, cam = this.camAt(sh, lt), film = this;
    const boil = Math.floor(t * this.boilFps + 1e-6);
    P.frame(boil, this.seed + i * 101);
    ctx.save(); ctx.setTransform(Sc, 0, 0, Sc, 0, 0); ctx.fillStyle = this.paperTone; ctx.fillRect(0, 0, W, H);
    const tf = z => { const sc = Math.pow(cam.zoom, z); ctx.translate(W / 2, H / 2); if (cam.rot) ctx.rotate(cam.rot); ctx.scale(sc, sc); ctx.translate(-(W / 2 + (cam.x - W / 2) * z), -(H / 2 + (cam.y - H / 2) * z)); };
    const half = W / 2 / cam.zoom;
    const g = {
      ctx, t, lt, u: lt / sh.dur, dur: sh.dur, W, H, cam, film, off: this.off, boil,
      /** the world strip in view (for drawing only what can be seen) */
      view: { x0: cam.x - half - 60, x1: cam.x + half + 60, y0: cam.y - H / 2 / cam.zoom - 60, y1: cam.y + H / 2 / cam.zoom + 60 },
      at(z, fn) { ctx.save(); tf(z); fn(ctx); ctx.restore(); },
      world(fn) { g.at(1, fn); },
      put(p, x, y, z = 1, o = {}) { const c = p.c[(o.v ?? boil) % p.n]; ctx.save(); tf(z); ctx.globalAlpha = o.a ?? 1; ctx.drawImage(c, x, y, p.w, p.h); ctx.restore(); },
      /** the blank sheet, fixed to the screen */
      paper(o = {}) { ctx.save(); ctx.globalAlpha = o.a ?? 1; ctx.drawImage(film.sheet.c[0], 0, 0, W, H); ctx.restore(); },
      screen(fn) { ctx.save(); fn(ctx); ctx.restore(); },
      /** drawings held two frames (12 a second); twos(lt, 8) = on threes */
      twos: (v = lt, fps = 12) => Math.floor(v * fps + 1e-6) / fps,
      /** draw-on: run fn with only the first k (0…1) of its strokes, in the order fn draws them */
      drawOn(k, fn) { if (k >= 1) { fn(ctx); return; } if (k <= 0) return; const n = P.countStrokes(() => fn(ctx)); P.pen.budget = P.pen.used + k * n; fn(ctx); P.pen.budget = Infinity; },
    };
    sh.draw(g, lt, lt / sh.dur);
    ctx.restore();
  }
  frame(t) {
    t = clamp(t, 0, this.dur - 1e-4);
    const ctx = this.ctx, i = this.locate(t), sh = this.shots[i], lt = t - sh.start;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    P.audit.length = 0;
    this.drawShot(ctx, i, lt, t);
    const tr = sh.tr, nx = this.shots[i + 1];
    if (tr && i > 0 && tr.type === 'dissolve' && lt < tr.d) {
      const p = this.shots[i - 1]; this.bctx.setTransform(1, 0, 0, 1, 0, 0); this.drawShot(this.bctx, i - 1, p.dur + lt, t);
      ctx.globalAlpha = 1 - ease.sine(lt / tr.d); ctx.drawImage(this.buf, 0, 0); ctx.globalAlpha = 1;
    }
    const cover = (tr2, k) => this.cover(tr2, clamp(k), t);
    if (tr && i > 0 && tr.type !== 'dissolve' && lt < tr.d / 2) cover(tr, 1 - lt / (tr.d / 2));
    if (nx && nx.tr && nx.tr.type !== 'dissolve' && sh.dur - lt < nx.tr.d / 2) cover(nx.tr, 1 - (sh.dur - lt) / (nx.tr.d / 2));
    if (i === 0 && this.fadeIn && lt < this.fadeIn) cover({ type: 'paper' }, 1 - lt / this.fadeIn);
    if (!nx && this.fadeOut && sh.dur - lt < this.fadeOut) cover({ type: 'paper' }, 1 - (sh.dur - lt) / this.fadeOut);
    this.grade(t);
  }
  /** a transition cover at strength k (1 = fully covered at the cut): paper (back to the blank sheet), wipe (a sheet slides over), white */
  cover(tr, k, t) {
    const ctx = this.ctx, W = this.W, H = this.H, Sc = this.S;
    ctx.save(); ctx.setTransform(Sc, 0, 0, Sc, 0, 0);
    if (tr.type === 'white') { ctx.fillStyle = rgba('#fbf7ec', ease.sine(k)); ctx.fillRect(0, 0, W, H); }
    else if (tr.type === 'paper') { ctx.globalAlpha = ease.sine(k); ctx.drawImage(this.sheet.c[0], 0, 0, W, H); }
    else if (tr.type === 'wipe') {   // the next page slides in from the right edge with a soft pencil edge
      const x = W * (1 - ease.io(k)); ctx.drawImage(this.sheet.c[0], x, 0, W - x, H, x, 0, W - x, H);
      P.frame(Math.floor(t * this.boilFps), this.seed + 7); P.ink(ctx, [[x, -10], [x + 4, H * .5], [x - 2, H + 10]], { col: P.INK.grey, w: 1.6, a: .5, second: 0 });
    }
    ctx.restore();
  }
  grade(t) {
    const Pp = this.post, ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height, off = this.off;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!off.has('grade')) {
      if (Pp.tooth) { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = Pp.tooth; ctx.drawImage(this.sheet.c[0], 0, 0, cw, ch); ctx.globalAlpha = 1; }
      if (Pp.warmA) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgba(Pp.warm, Pp.warmA * 3); ctx.fillRect(0, 0, cw, ch); }
    }
    if (Pp.vignette && !off.has('vignette')) {
      const g = ctx.createRadialGradient(cw / 2, ch / 2, ch * .45, cw / 2, ch / 2, ch * .78);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(120,96,60,${Pp.vignette})`);
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    }
    if (Pp.grain && !off.has('grain')) {
      const f = Math.floor(t * 12), tile = this.grainTiles[f % 3], ox = Math.floor(hash(f, 1) * 256), oy = Math.floor(hash(f, 2) * 256);
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = Pp.grain;
      for (let y = -oy; y < ch; y += 256) for (let x = -ox; x < cw; x += 256) ctx.drawImage(tile, x, y);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  async start() {
    await this.fontReady;
    const W = this.W, H = this.H;
    window.DURATION = +this.dur.toFixed(3); window.FPS = this.FPS; window.SIZE = { W, H }; window.film = this;
    window.seek = t => this.frame(t);
    window.runChecks = t => [...this.rules.filter(r => { try { return !r.fn(t); } catch { return true; } }).map(r => r.name), ...new Set(P.audit)];
    window.shotAt = t => { const i = this.locate(t); return { i, name: this.shots[i].name, lt: t - this.shots[i].start }; };
    const st = document.createElement('style');
    st.textContent = `html,body{margin:0;height:100%;background:#2a2723;overflow:hidden}canvas{display:block;width:100vw;height:100vh;object-fit:contain}
      .bds-ui{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;gap:10px;padding:8px 12px;font:12px/1.2 system-ui,sans-serif;color:#f3ecdb;background:linear-gradient(transparent,rgba(0,0,0,.5));opacity:0;transition:opacity .3s}
      body:hover .bds-ui,.bds-ui.on{opacity:1}.bds-ui button{all:unset;cursor:pointer;padding:4px 8px;border:1px solid rgba(255,255,255,.35);border-radius:4px}
      .bds-bar{flex:1;height:14px;cursor:pointer;position:relative}.bds-bar i{position:absolute;left:0;top:6px;height:2px;background:#f2c230}.bds-bar:before{content:"";position:absolute;left:0;right:0;top:6px;height:2px;background:rgba(255,255,255,.25)}`;
    document.head.appendChild(st);
    if (this.q.has('t')) this.frame(+this.q.get('t'));
    else if (this.render) this.frame(0);
    else this.live();
    window.__ready = true;
  }
  live() {
    let t0 = performance.now(), base = 0, paused = false, ac = null, src = null, buffer = null, loading = false;
    const ui = document.createElement('div'); ui.className = 'bds-ui';
    ui.innerHTML = `<button data-k="play">❚❚</button>${this.score ? '<button data-k="snd">♪ sound</button>' : ''}<div class="bds-bar"><i></i></div><span class="tm"></span>`;
    document.body.appendChild(ui);
    const bar = ui.querySelector('.bds-bar'), fill = bar.querySelector('i'), tm = ui.querySelector('.tm'), pb = ui.querySelector('[data-k=play]'), sb = ui.querySelector('[data-k=snd]');
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
      if (!buffer) { await new Promise(r => setTimeout(r, 30)); const sr = ac.sampleRate, [L, R] = renderScore(this.score, sr, this.dur); buffer = ac.createBuffer(2, L.length, sr); buffer.copyToChannel(L, 0); buffer.copyToChannel(R, 1); }
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
      fill.style.width = (t / this.dur * 100) + '%'; tm.textContent = `${t.toFixed(1)} / ${this.dur.toFixed(1)} s · ${this.shots[this.locate(t)].name}`;
      requestAnimationFrame(loop);
    };
    loop();
  }
}
