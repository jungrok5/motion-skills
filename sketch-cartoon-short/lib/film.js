// sketch-cartoon-short · film.js — the runtime: shots on a timeline, a multiplane camera, boiling pencil lines, the draw-on
// reveal, transitions (dissolve, scribble wipe, back to blank paper, flash), the paper grade, live playback with sound, and
// the render contract.
//
//   const F = new Film({ seed: 7, paper: '#b8bb98' });
//   const town = F.plate(2400, 1080, c => K.facades(c, …), { boil: 3 });   // painted once per boil variant, at build time
//   F.shot(5, g => { g.paper(); g.put(town, -240, 0, .6); g.at(1, c => R.person(c, MAYA, { … })); }, { cam: [{ t: 0, zoom: 1 }, { t: 5, zoom: 1.06 }] });
//   F.start();
//
// Depth z: 0 = infinitely far (never moves), 1 = the focal plane, > 1 = foreground. The camera {x, y, zoom, rot} is keyed per
// shot in focal-plane stage units; a layer at depth z moves by cam·z and scales by zoom^z.
// Timing: the film runs at 24 fps; lines boil at 8 drawings a second (S.pen.boil); characters move on twos (g.twos()).
import * as S from './sketch.js';
import { renderScore } from './score.js';
const { keys, hash, n1, clamp, ease, rgba } = S;

const POST = {
  paperTooth: .16,                 // the paper texture multiplied over everything (fills get the paper's grain too)
  warm: '#efe2c4', warmA: .08,     // a faint warm multiply
  cool: '#6f8f8c', coolA: .1,      // soft-light cool at the top (the reference's sage-teal air)
  lift: '#2c2f2b',                 // blacks never go below this (pencil, not ink)
  vignette: .28, grain: .05, flicker: .018,
};

export class Film {
  constructor(o = {}) {
    const q = new URLSearchParams(location.search);
    this.q = q; this.render = q.has('render'); this.W = o.W || 1920; this.H = o.H || 1080; this.FPS = o.fps || 24; this.boilFps = o.boil || 8;
    this.off = new Set((q.get('off') || '').split(',').filter(Boolean));
    this.S = +(q.get('scale') || (this.render ? 1 : Math.min(1, Math.max(.5, (innerWidth * devicePixelRatio) / this.W))));
    this.post = { ...POST, ...(o.post || {}) }; this.seed = o.seed || 1; this.paperTone = o.paper || '#b9bb98';
    this.score = o.score || null; this.title = o.title || document.title; this.renderScore = renderScore;
    this.shots = []; this.rules = []; this.dur = 0; this.fadeIn = o.fadeIn ?? .6; this.fadeOut = o.fadeOut ?? .8;
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
    this.mk = mk;
    this.canvas = mk(this.W * this.S, this.H * this.S); this.ctx = this.canvas.getContext('2d');
    this.buf = mk(this.W * this.S, this.H * this.S); this.bctx = this.buf.getContext('2d');
    const R = S.rng(this.seed);
    this.grainTiles = [0, 1, 2].map(() => {
      const c = mk(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256);
      for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (R() + R() + R() - 1.5) * 110; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      x.putImageData(d, 0, 0); return c;
    });
    // the sheet: one paper plate (stage size) used by g.paper() and by the grade's tooth
    this.sheet = this.plate(this.W, this.H, (c, w, h) => S.paper(c, w, h, { tone: this.paperTone, seed: this.seed + 1 }));
    document.body.appendChild(this.canvas);
  }

  /** a plate: an offscreen canvas painted once (per boil variant) by paint(ctx, w, h, variant) in stage units */
  plate(w, h, paint, o = {}) {
    const S0 = this.S, n = o.boil || 1, cs = [];
    for (let v = 0; v < n; v++) {
      const c = this.mk(Math.ceil(w * S0), Math.ceil(h * S0)), x = c.getContext('2d');
      x.scale(S0, S0); S.frame(v * 3 + 1, this.seed + (o.seed || 0)); paint(x, w, h, v);
      if (o.blur > 0 && !this.off.has('dof')) { const d = this.mk(c.width, c.height), y = d.getContext('2d'); y.filter = `blur(${o.blur * S0}px)`; y.drawImage(c, 0, 0); cs.push(d); } else cs.push(c);
    }
    return { c: cs, w, h, n };
  }
  /** a shot: dur seconds; draw(g, lt, u). o.cam = keys [{t, x, y, zoom, rot}], o.shake = lt => px, o.tr = { type, d } (INTO this shot) */
  shot(dur, draw, o = {}) { this.shots.push({ dur, draw, cam: o.cam || [{ t: 0 }], shake: o.shake, tr: o.tr || null, name: o.name || 'shot ' + (this.shots.length + 1), start: this.dur }); this.dur += dur; return this; }
  check(name, fn) { this.rules.push({ name, fn }); }

  locate(t) { let i = 0; while (i < this.shots.length - 1 && t >= this.shots[i + 1].start) i++; return i; }
  camAt(sh, lt) {
    const c = { x: keys(sh.cam, lt, 'x', 0), y: keys(sh.cam, lt, 'y', 0), zoom: keys(sh.cam, lt, 'zoom', 1), rot: keys(sh.cam, lt, 'rot', 0) };
    const a = sh.shake ? sh.shake(lt) : 0;
    if (a) { const q = Math.floor(lt * 12); c.x += n1(q * .9, 3) * a; c.y += n1(q * .9, 7) * a; }   // shakes on twos too
    return c;
  }
  drawShot(ctx, i, lt, t) {
    const sh = this.shots[i], W = this.W, H = this.H, Sc = this.S, cam = this.camAt(sh, lt), film = this;
    const boil = Math.floor(t * this.boilFps + 1e-6);
    S.frame(boil, this.seed + i * 101);
    ctx.save(); ctx.setTransform(Sc, 0, 0, Sc, 0, 0); ctx.fillStyle = this.paperTone; ctx.fillRect(0, 0, W, H);
    const tf = z => { const sc = Math.pow(cam.zoom, z); ctx.translate(W / 2, H / 2); if (cam.rot) ctx.rotate(cam.rot * Math.min(1, z)); ctx.scale(sc, sc); ctx.translate(-W / 2 - cam.x * z, -H / 2 - cam.y * z); };
    const g = {
      ctx, t, lt, u: lt / sh.dur, dur: sh.dur, W, H, cam, film, off: this.off, boil,
      at(z, fn) { ctx.save(); tf(z); fn(ctx); ctx.restore(); },
      put(p, x, y, z = 1, o = {}) {
        const c = p.c[(o.v ?? boil) % p.n];
        ctx.save(); tf(z); ctx.globalAlpha = o.a ?? 1; if (o.op) ctx.globalCompositeOperation = o.op;
        if (o.rot || o.s) { const ox = o.ox ?? p.w / 2, oy = o.oy ?? p.h / 2; ctx.translate(x + ox, y + oy); ctx.rotate(o.rot || 0); ctx.scale(o.s || 1, o.s || 1); ctx.drawImage(c, -ox, -oy, p.w, p.h); }
        else ctx.drawImage(c, x, y, p.w, p.h);
        ctx.restore();
      },
      /** the blank toned sheet, fixed to the screen (z 0) or moving with a layer (z) */
      paper(z = 0, o = {}) { if (z === 0) { ctx.save(); ctx.globalAlpha = o.a ?? 1; ctx.drawImage(film.sheet.c[0], 0, 0, W, H); ctx.restore(); } else g.put(film.sheet, -W * .5, -H * .5, z, { s: 2 }); },
      screen(fn) { ctx.save(); fn(ctx); ctx.restore(); },
      /** hand-drawn timing: hold each drawing 2 frames (12 a second); twos(lt, 8) = on threes */
      twos: (v = lt, fps = 12) => Math.floor(v * fps + 1e-6) / fps,
      /** draw-on: run fn with only the first k (0…1) of its strokes, in the order fn draws them */
      drawOn(k, fn) {
        if (k >= 1) { fn(ctx); return; }
        const n = S.countStrokes(() => fn(ctx));
        const save = { n: S.pen.n }; S.pen.budget = k * n; S.pen.used = 0; fn(ctx); S.pen.budget = Infinity; S.pen.n = save.n + n;
      },
    };
    sh.draw(g, lt, lt / sh.dur);
    ctx.restore();
  }
  frame(t) {
    t = clamp(t, 0, this.dur - 1e-4);
    const ctx = this.ctx, i = this.locate(t), sh = this.shots[i], lt = t - sh.start, W = this.W, H = this.H, Sc = this.S;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    S.audit.length = 0;
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
  /** a transition cover at strength k (1 = fully covered at the cut) */
  cover(tr, k, t) {
    const ctx = this.ctx, W = this.W, H = this.H, Sc = this.S;
    ctx.save(); ctx.setTransform(Sc, 0, 0, Sc, 0, 0);
    if (tr.type === 'white' || tr.type === 'black') { ctx.fillStyle = rgba(tr.type === 'white' ? (tr.col || '#f3efe0') : '#1c1d1b', ease.sine(k)); ctx.fillRect(0, 0, W, H); }
    else if (tr.type === 'paper') { ctx.globalAlpha = ease.sine(k); ctx.drawImage(this.sheet.c[0], 0, 0, W, H); }
    else if (tr.type === 'scribble') {    // dark pencil scribble eats the frame, then lets the next one through
      S.frame(Math.floor(t * this.boilFps), this.seed + 999);
      const n = 26, r = S.rng(7);
      for (let j = 0; j < n; j++) {
        const x = r() * W, y = r() * H, R = (220 + r() * 260) * ease.out(clamp(k * 1.25 - r() * .25));
        if (R > 4) S.scribble(ctx, x, y, R, R * .8, { col: tr.col || '#1d1e1c', core: tr.col || '#232422', coreA: clamp(k * 1.4 - .3), n: 40, w: 3, a: .9 });
      }
    }
    ctx.restore();
  }
  grade(t) {
    const P = this.post, ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height, off = this.off;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!off.has('grade')) {
      if (P.paperTooth) { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = P.paperTooth; ctx.drawImage(this.sheet.c[0], 0, 0, cw, ch); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = P.paperTooth * .55; ctx.drawImage(this.sheet.c[0], 0, 0, cw, ch); ctx.globalAlpha = 1; }
      if (P.coolA) { const g = ctx.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, rgba(P.cool, P.coolA)); g.addColorStop(1, rgba(P.cool, 0)); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); }
      if (P.warmA) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgba(P.warm, P.warmA * 3); ctx.fillRect(0, 0, cw, ch); }
      if (P.lift) { ctx.globalCompositeOperation = 'lighten'; ctx.fillStyle = P.lift; ctx.fillRect(0, 0, cw, ch); }
      if (P.flicker) { const v = n1(Math.floor(t * this.boilFps) * .7, 5) * P.flicker; ctx.globalCompositeOperation = v > 0 ? 'screen' : 'multiply'; ctx.fillStyle = v > 0 ? rgba('#ffffff', v) : rgba('#000000', -v); if (v < 0) { ctx.globalCompositeOperation = 'source-over'; } ctx.fillRect(0, 0, cw, ch); }
    }
    if (P.vignette && !off.has('vignette')) {
      const g = ctx.createRadialGradient(cw / 2, ch / 2, ch * .4, cw / 2, ch / 2, Math.hypot(cw, ch) * .6);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(40,44,38,${P.vignette})`);
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    }
    if (P.grain && !off.has('grain')) {
      const f = Math.floor(t * 12), tile = this.grainTiles[f % 3], ox = Math.floor(hash(f, 1) * 256), oy = Math.floor(hash(f, 2) * 256);
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = P.grain;
      for (let y = -oy; y < ch; y += 256) for (let x = -ox; x < cw; x += 256) ctx.drawImage(tile, x, y);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  start() {
    const W = this.W, H = this.H;
    window.DURATION = +this.dur.toFixed(3); window.FPS = this.FPS; window.SIZE = { W, H }; window.film = this;
    window.seek = t => this.frame(t);
    window.runChecks = t => [...this.rules.filter(r => { try { return !r.fn(t); } catch { return true; } }).map(r => r.name), ...new Set(S.audit)];   // + body rules the rig found in this frame
    window.shotAt = t => { const i = this.locate(t); return { i, name: this.shots[i].name, lt: t - this.shots[i].start }; };
    const st = document.createElement('style');
    st.textContent = `html,body{margin:0;height:100%;background:#20221f;overflow:hidden}canvas{display:block;width:100vw;height:100vh;object-fit:contain}
      .scs-ui{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;gap:10px;padding:8px 12px;font:12px/1.2 system-ui,sans-serif;color:#efeadb;background:linear-gradient(transparent,rgba(0,0,0,.5));opacity:0;transition:opacity .3s}
      body:hover .scs-ui,.scs-ui.on{opacity:1}.scs-ui button{all:unset;cursor:pointer;padding:4px 8px;border:1px solid rgba(255,255,255,.35);border-radius:4px}
      .scs-bar{flex:1;height:14px;cursor:pointer;position:relative}.scs-bar i{position:absolute;left:0;top:6px;height:2px;background:#e9dfb8}.scs-bar:before{content:"";position:absolute;left:0;right:0;top:6px;height:2px;background:rgba(255,255,255,.25)}`;
    document.head.appendChild(st);
    if (this.q.has('t')) { this.frame(+this.q.get('t')); }
    else if (this.render) this.frame(0);
    else this.live();
    window.__ready = true;
  }
  live() {
    let t0 = performance.now(), base = 0, paused = false, ac = null, src = null, buffer = null, loading = false;
    const ui = document.createElement('div'); ui.className = 'scs-ui';
    ui.innerHTML = `<button data-k="play">❚❚</button>${this.score ? '<button data-k="snd">♪ sound</button>' : ''}<div class="scs-bar"><i></i></div><span class="tm"></span>`;
    document.body.appendChild(ui);
    const bar = ui.querySelector('.scs-bar'), fill = bar.querySelector('i'), tm = ui.querySelector('.tm'), pb = ui.querySelector('[data-k=play]'), sb = ui.querySelector('[data-k=snd]');
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
      if (!paused && fi !== lastF) { this.frame(fi / this.FPS); lastF = fi; }   // draw at the film's 24 fps, not the screen's
      fill.style.width = (t / this.dur * 100) + '%'; tm.textContent = `${t.toFixed(1)} / ${this.dur.toFixed(0)} s · ${this.shots[this.locate(t)].name}`;
      requestAnimationFrame(loop);
    };
    loop();
  }
}
