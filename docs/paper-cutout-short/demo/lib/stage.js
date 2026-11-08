// paper-cutout-short · stage.js — the tabletop stage: shots on a timeline, a multiplane camera over paper layers, stop-motion
// timing (everything — puppets, props, camera — advances in 12 steps a second, each held for 2 frames of the 24 fps film), a
// little hand-placed jitter per step, warm practical light, shallow focus, the grade, live playback with sound, the contract.
//
//   const F = new Stage({ seed: 3, light: [10, 14] });
//   const sky = F.layer([0, 0, 2600, 1080], c => K.backdrop(c, 2600, 1080, { stops: […] }));       // painted once
//   F.shot(6, g => { g.put(sky, 0, 0, .1); g.puppet(WREN, { x: 400 + g.lt * 80, ground: 880, angles: P.walk(g.lt) }, 1); },
//          { cam: [{ t: 0, x: 0 }, { t: 6, x: 500 }] });
//   F.start();
//
// Depth z: 0 = fixed to the screen, 1 = the puppet plane, < 1 = layers behind (move less), > 1 = in front (move more, blurred).
// The camera {x, y, zoom} is keyed per shot in z = 1 units; a layer at depth z moves by cam·z and scales by zoom^z.
import * as P from './paper.js';
import * as Pup from './puppet.js';
import { renderScore } from './score.js';
const { keys, hash, n1, clamp, ease, rgba } = P;

const GRADE = {
  key: '#ffd9a0', keyA: .16, keyAt: [.18, .05],   // a warm practical lamp, soft-light, from the upper left (where the shadows come from)
  fill: '#6a5a9a', fillA: .1,                    // a cool fill pooling at the bottom
  vignette: .42, grain: .035, flicker: .012,      // stop-motion exposure flicker per step
  lift: '#1e1319',                                // nothing goes below this (paper never reads as black)
};

export class Stage {
  constructor(o = {}) {
    const q = new URLSearchParams(location.search);
    this.q = q; this.render = q.has('render'); this.W = o.W || 1920; this.H = o.H || 1080; this.FPS = o.fps || 24; this.step = o.step ?? 12;
    this.off = new Set((q.get('off') || '').split(',').filter(Boolean));
    this.S = +(q.get('scale') || (this.render ? 1 : Math.min(1, Math.max(.5, (innerWidth * devicePixelRatio) / this.W))));
    P.opts.res = this.S; P.opts.light = o.light || [10, 14]; P.opts.seed = o.seed || 1;
    this.grade = { ...GRADE, ...(o.grade || {}) }; this.seed = o.seed || 1; this.bg = o.bg || '#2a1f2a';
    this.jitter = o.jitter ?? 1; this.score = o.score || null; this.title = o.title || document.title; this.renderScore = renderScore;
    this.shots = []; this.rules = []; this.dur = 0; this.fadeIn = o.fadeIn ?? .5; this.fadeOut = o.fadeOut ?? .7;
    this.canvas = P.mk(this.W * this.S, this.H * this.S); this.ctx = this.canvas.getContext('2d');
    this.buf = P.mk(this.W * this.S, this.H * this.S); this.bctx = this.buf.getContext('2d');
    const R = P.rng(this.seed);
    this.grainTiles = [0, 1, 2].map(() => {
      const c = P.mk(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256);
      for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (R() + R() + R() - 1.5) * 110; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      x.putImageData(d, 0, 0); return c;
    });
    document.body.appendChild(this.canvas);
    // the label face (lib/fonts, SIL OFL): load before painting any sprite with type in it — await F.ready()
    const url = new URL('./fonts/SourceSerif4-Variable.woff2', import.meta.url).href;
    this._fonts = new FontFace('PaperSerif', `url(${url})`, { weight: '200 900' }).load().then(f => { document.fonts.add(f); }).catch(e => console.warn('label font not loaded:', e.message));
  }
  /** await before painting layers: fonts loaded (and anything else passed in) */
  async ready(...more) { await this._fonts; await Promise.all(more); return this; }

  /** a layer: a sprite painted once. b = [x0, y0, x1, y1] in its own px; o = { shadow: 14 (blur of the shadow it casts), blur (depth of field), res } */
  layer(b, paint, o = {}) { return P.sprite(b, paint, { shadow: 14, pad: 10, ...o }); }
  /** a prop sprite (smaller shadow) */
  prop(b, paint, o = {}) { return P.sprite(b, paint, { shadow: 7, pad: 6, ...o }); }
  /** a shot: dur seconds; draw(g, lt, u). o.cam = keys [{t, x, y, zoom}], o.tr = { type: 'dissolve' | 'black' | 'card', d } (INTO this shot) */
  shot(dur, draw, o = {}) { this.shots.push({ dur, draw, cam: o.cam || [{ t: 0 }], tr: o.tr || null, name: o.name || 'shot ' + (this.shots.length + 1), start: this.dur }); this.dur += dur; return this; }
  check(name, fn) { this.rules.push({ name, fn }); }

  locate(t) { let i = 0; while (i < this.shots.length - 1 && t >= this.shots[i + 1].start - 1e-9) i++; return i; }
  /** stop-motion time: t held on 12 steps a second */
  quant(t) { return this.step ? Math.floor(t * this.step + 1e-6) / this.step : t; }
  camAt(sh, lt) { return { x: keys(sh.cam, lt, 'x', 0), y: keys(sh.cam, lt, 'y', 0), zoom: keys(sh.cam, lt, 'zoom', 1) }; }
  drawShot(ctx, i, lt, t) {
    const sh = this.shots[i], W = this.W, H = this.H, Sc = this.S, cam = this.camAt(sh, lt), film = this, stepN = Math.round(t * (this.step || 24));
    ctx.save(); ctx.setTransform(Sc, 0, 0, Sc, 0, 0); ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H);
    const tf = z => { const s = Math.pow(cam.zoom, z); ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2 - cam.x * z, -H / 2 - cam.y * z); };
    const jit = (seed, amt = 1) => this.jitter && !this.off.has('jitter') ? [(hash(stepN, seed) - .5) * amt * this.jitter, (hash(stepN, seed + 1) - .5) * amt * this.jitter] : [0, 0];
    const g = {
      ctx, t, lt, u: lt / sh.dur, dur: sh.dur, W, H, cam, film, off: this.off, step: stepN, P, Pup,
      /** run fn in the coordinates of depth z */
      at(z, fn) { ctx.save(); tf(z); fn(ctx); ctx.restore(); },
      /** place a sprite at (x, y) on depth z. o = { lift: px off the layer behind (shadow), rot (rad), s, a, jit: px (hand-placed wobble), sx } */
      put(s, x, y, z = 1, o = {}) {
        ctx.save(); tf(z); const [jx, jy] = jit(P.sid(o.id || (x * 7 + y * 13)), o.jit ?? .6);
        ctx.translate(x + jx, y + jy); if (o.rot) ctx.rotate(o.rot); if (o.s || o.sx) ctx.scale((o.sx ?? 1) * (o.s ?? 1), o.s ?? 1);
        P.put(ctx, s, { lift: o.lift ?? 0, a: o.a, shA: o.shA }); ctx.restore();
      },
      /** draw a puppet on depth z (pose.step/jitter are filled in: parts shift a hair each step, like hands re-placing them) */
      puppet(pp, pose, z = 1, o = {}) {
        let M; g.at(z, c => { M = Pup.draw(c, pp, { step: stepN, jitter: film.off.has('jitter') ? 0 : (o.jitter ?? .9) * film.jitter, ...pose }, o); }); return M;
      },
      /** screen-space drawing (z 0, no camera) */
      screen(fn) { ctx.save(); fn(ctx); ctx.restore(); },
      /** a warm glow (lamp, window, flame) on depth z — additive, flickers a little per step */
      glow(x, y, r, col = '#ffc46b', a = .6, z = 1) {
        g.at(z, c => { const fl = 1 + n1(stepN * .9, P.sid(x + ',' + y)) * .08, gr = c.createRadialGradient(x, y, 0, x, y, r * fl); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(.4, rgba(col, a * .35)); gr.addColorStop(1, rgba(col, 0)); c.globalCompositeOperation = 'screen'; c.fillStyle = gr; c.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4); });
      },
      /** stop-motion phase helper: a cycle count for walk cycles etc. (already stepped, since t is) */
      cycle: (rate, off = 0) => lt * rate + off,
    };
    sh.draw(g, lt, lt / sh.dur);
    ctx.restore();
  }
  frame(t0) {
    const t = clamp(this.quant(clamp(t0, 0, this.dur - 1e-4)), 0, this.dur - 1e-4);
    const ctx = this.ctx, i = this.locate(t), sh = this.shots[i], lt = t - sh.start;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    P.audit.length = 0;
    this.drawShot(ctx, i, lt, t);
    const tr = sh.tr, nx = this.shots[i + 1];
    if (tr && i > 0 && tr.type === 'dissolve' && lt < tr.d) {
      const p = this.shots[i - 1]; this.bctx.setTransform(1, 0, 0, 1, 0, 0); this.drawShot(this.bctx, i - 1, p.dur + lt, t);
      ctx.globalAlpha = 1 - ease.sine(lt / tr.d); ctx.drawImage(this.buf, 0, 0); ctx.globalAlpha = 1;
    }
    if (tr && i > 0 && tr.type !== 'dissolve' && lt < tr.d / 2) this.cover(tr, 1 - lt / (tr.d / 2), -1);
    if (nx && nx.tr && nx.tr.type !== 'dissolve' && sh.dur - lt < nx.tr.d / 2) this.cover(nx.tr, 1 - (sh.dur - lt) / (nx.tr.d / 2), 1);
    if (i === 0 && this.fadeIn && lt < this.fadeIn) this.cover({ type: 'black' }, 1 - lt / this.fadeIn);
    if (!nx && this.fadeOut && sh.dur - lt < this.fadeOut) this.cover({ type: 'black' }, 1 - (sh.dur - lt) / this.fadeOut);
    this.post(t);
  }
  /** a transition cover at strength k (1 = fully covered at the cut); dir −1 = leaving, +1 = arriving */
  cover(tr, k, dir = 1) {
    const ctx = this.ctx, W = this.W, H = this.H, Sc = this.S; k = clamp(k);
    ctx.save(); ctx.setTransform(Sc, 0, 0, Sc, 0, 0);
    if (tr.type === 'black') { ctx.fillStyle = rgba('#140d12', ease.sine(k)); ctx.fillRect(0, 0, W, H); }
    else if (tr.type === 'card') {   // a sheet of card slides across the lens (in from the right, out to the left)
      if (!this._card) this._card = P.sprite([0, 0, W + 80, H + 80], c => P.piece(c, P.rect(0, 0, W + 80, H + 80), tr.col || '#e9d8bc', { rough: 6, light: .5 }), { shadow: 30, pad: 20 });
      const e = ease.io(k), x = dir > 0 ? W * (1 - e) - 40 : -(W + 80) * (1 - e) - 40;
      ctx.translate(x, -40); P.put(ctx, this._card, { lift: 30 });
    }
    ctx.restore();
  }
  post(t) {
    const G = this.grade, ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height, off = this.off, st = Math.floor(t * (this.step || 24) + 1e-6);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!off.has('grade')) {
      if (G.keyA) { const g = ctx.createRadialGradient(cw * G.keyAt[0], ch * G.keyAt[1], 0, cw * G.keyAt[0], ch * G.keyAt[1], Math.hypot(cw, ch) * .85); g.addColorStop(0, rgba(G.key, G.keyA * 2)); g.addColorStop(1, rgba(G.key, 0)); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); }
      if (G.fillA) { const g = ctx.createLinearGradient(0, ch * .45, 0, ch); g.addColorStop(0, rgba(G.fill, 0)); g.addColorStop(1, rgba(G.fill, G.fillA * 2)); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); }
      if (G.lift) { ctx.globalCompositeOperation = 'lighten'; ctx.fillStyle = G.lift; ctx.fillRect(0, 0, cw, ch); }
      if (G.flicker) { const v = n1(st * .77, 5) * G.flicker; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = v > 0 ? rgba('#fff4e0', v) : rgba('#1a0f16', -v); ctx.fillRect(0, 0, cw, ch); }
    }
    if (G.vignette && !off.has('vignette')) {
      const g = ctx.createRadialGradient(cw / 2, ch * .48, ch * .38, cw / 2, ch / 2, Math.hypot(cw, ch) * .62);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(36,18,32,${G.vignette})`);
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    }
    if (G.grain && !off.has('grain')) {
      const tile = this.grainTiles[st % 3], ox = Math.floor(hash(st, 1) * 256), oy = Math.floor(hash(st, 2) * 256);
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = G.grain;
      for (let y = -oy; y < ch; y += 256) for (let x = -ox; x < cw; x += 256) ctx.drawImage(tile, x, y);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  start() {
    const W = this.W, H = this.H;
    window.DURATION = +this.dur.toFixed(3); window.FPS = this.FPS; window.STEP = this.step; window.SIZE = { W, H }; window.film = this;
    window.seek = t => this.frame(t);
    window.runChecks = t => [...this.rules.filter(r => { try { return !r.fn(this.quant(t)); } catch { return true; } }).map(r => r.name), ...new Set(P.audit)];
    window.shotAt = t => { const i = this.locate(this.quant(t)); return { i, name: this.shots[i].name, lt: this.quant(t) - this.shots[i].start }; };
    const st = document.createElement('style');
    st.textContent = `html,body{margin:0;height:100%;background:#1c1418;overflow:hidden}canvas{display:block;width:100vw;height:100vh;object-fit:contain}
      .pcs-ui{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;gap:10px;padding:8px 12px;font:12px/1.2 system-ui,sans-serif;color:#f5ead8;background:linear-gradient(transparent,rgba(0,0,0,.5));opacity:0;transition:opacity .3s}
      body:hover .pcs-ui,.pcs-ui.on{opacity:1}.pcs-ui button{all:unset;cursor:pointer;padding:4px 8px;border:1px solid rgba(255,255,255,.35);border-radius:4px}
      .pcs-bar{flex:1;height:14px;cursor:pointer;position:relative}.pcs-bar i{position:absolute;left:0;top:6px;height:2px;background:#f1c98a}.pcs-bar:before{content:"";position:absolute;left:0;right:0;top:6px;height:2px;background:rgba(255,255,255,.25)}`;
    document.head.appendChild(st);
    if (this.q.has('t')) this.frame(+this.q.get('t'));
    else if (this.render) this.frame(0);
    else this.live();
    window.__ready = true;
  }
  live() {
    let t0 = performance.now(), base = 0, paused = false, ac = null, src = null, buffer = null, loading = false;
    const ui = document.createElement('div'); ui.className = 'pcs-ui';
    ui.innerHTML = `<button data-k="play">❚❚</button>${this.score ? '<button data-k="snd">♪ sound</button>' : ''}<div class="pcs-bar"><i></i></div><span class="tm"></span>`;
    document.body.appendChild(ui);
    const bar = ui.querySelector('.pcs-bar'), fill = bar.querySelector('i'), tm = ui.querySelector('.tm'), pb = ui.querySelector('[data-k=play]'), sb = ui.querySelector('[data-k=snd]');
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
      const t = now(), fi = Math.floor(t * (this.step || this.FPS));
      if (!paused && fi !== lastF) { this.frame(t); lastF = fi; }   // a new drawing only on each stop-motion step
      fill.style.width = (t / this.dur * 100) + '%'; tm.textContent = `${t.toFixed(1)} / ${this.dur.toFixed(1)} s · ${this.shots[this.locate(t)].name}`;
      requestAnimationFrame(loop);
    };
    loop();
  }
}
