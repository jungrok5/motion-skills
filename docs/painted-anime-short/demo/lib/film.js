// painted-anime-short · film.js — the runtime: plates, shots on a timeline, a multiplane camera, transitions, the film
// grade (bloom, warm/cool split, lifted blacks, vignette, grain), live playback with sound, and the render contract.
//
//   const F = new Film({ seed: 7 });
//   const sky = F.plate(1920, 1080, (c, w, h) => P.sky(c, w, h, [...], R));      // painted once, at build time
//   F.shot(6, g => { g.put(sky, 0, 0, 0); g.put(trees, -100, 300, .6); … }, { cam: [{t:0, zoom:1}, {t:6, zoom:1.08}] });
//   F.start();
//
// Depth z: 0 = infinitely far (never moves), 1 = the focal plane, > 1 = foreground (moves and scales more). The camera
// {x, y, zoom, rot} is keyed per shot in focal-plane stage units; a layer at depth z moves by cam·z and scales by zoom^z.
import { keys, hash, noise2, clamp, ease, rgba, rng } from './paint.js';

const POST = {
  bloom: .28, bloomR: 18,          // soft glow of the bright parts
  split: .2, top: '#7fa6b4', bottom: '#f3c58c',   // soft-light grade: cool above, warm below
  lift: '#1d2a29',                // blacks never go below this (faded print)
  warm: .1, cream: '#fff0d8',     // multiply toward cream
  vignette: .42, grain: .065, letterbox: 0, // letterbox: bar height in stage px
};

export class Film {
  constructor(o = {}) {
    const q = new URLSearchParams(location.search);
    this.q = q; this.render = q.has('render'); this.W = o.W || 1920; this.H = o.H || 1080; this.FPS = o.fps || 30;
    this.off = new Set((q.get('off') || '').split(',').filter(Boolean));
    this.S = +(q.get('scale') || (this.render ? 1 : Math.min(1, Math.max(.5, (innerWidth * devicePixelRatio) / this.W))));
    this.post = { ...POST, ...(o.post || {}) };
    this.score = o.score || null; this.title = o.title || document.title; this.libURL = import.meta.url;
    this.shots = []; this.rules = []; this.dur = 0;
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; };
    this.mk = mk;
    this.canvas = mk(this.W * this.S, this.H * this.S); this.ctx = this.canvas.getContext('2d');
    this.buf = mk(this.W * this.S, this.H * this.S); this.bctx = this.buf.getContext('2d');
    this.small = mk(this.W * this.S / 4, this.H * this.S / 4); this.sctx = this.small.getContext('2d');
    const R = rng(o.seed || 1); this.grainTiles = [0, 1, 2, 3].map(() => {
      const c = mk(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256);
      for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (R() + R() + R() - 1.5) * 120; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      x.putImageData(d, 0, 0); return c;
    });
    document.body.appendChild(this.canvas);
  }

  // a plate: an offscreen canvas painted once by paint(ctx, w, h) in stage units. blur (stage px) = depth of field.
  plate(w, h, paint, o = {}) {
    const S = this.S, c = this.mk(Math.ceil(w * S), Math.ceil(h * S)), x = c.getContext('2d');
    x.scale(S, S); paint(x, w, h);
    if (o.blur > 0 && !this.off.has('dof')) {
      const d = this.mk(c.width, c.height), y = d.getContext('2d');
      y.filter = `blur(${o.blur * S}px)`; y.drawImage(c, 0, 0); return { c: d, w, h };
    }
    return { c, w, h };
  }
  // a shot: dur seconds; draw(g, lt, u) paints it. o.cam = keys [{t, x, y, zoom, rot}], o.shake = lt => stage px,
  // o.tr = { type: 'dissolve' | 'white' | 'black', d } — the transition INTO this shot.
  shot(dur, draw, o = {}) { this.shots.push({ dur, draw, cam: o.cam || [{ t: 0 }], shake: o.shake, tr: o.tr || null, name: o.name || 'shot ' + (this.shots.length + 1), start: this.dur }); this.dur += dur; return this; }
  check(name, fn) { this.rules.push({ name, fn }); }

  locate(t) { let i = 0; while (i < this.shots.length - 1 && t >= this.shots[i + 1].start) i++; return i; }
  camAt(sh, lt) {
    const c = { x: keys(sh.cam, lt, 'x', 0), y: keys(sh.cam, lt, 'y', 0), zoom: keys(sh.cam, lt, 'zoom', 1), rot: keys(sh.cam, lt, 'rot', 0) };
    const a = sh.shake ? sh.shake(lt) : 0;
    if (a) { c.x += (noise2(lt * 14, 3.1) - .5) * 2 * a; c.y += (noise2(lt * 14, 7.7) - .5) * 2 * a; }
    return c;
  }
  drawShot(ctx, i, lt, t) {
    const sh = this.shots[i], W = this.W, H = this.H, S = this.S, cam = this.camAt(sh, lt);
    ctx.save(); ctx.setTransform(S, 0, 0, S, 0, 0); ctx.fillStyle = '#0c0f10'; ctx.fillRect(0, 0, W, H);
    const tf = z => { const sc = Math.pow(cam.zoom, z); ctx.translate(W / 2, H / 2); if (cam.rot) ctx.rotate(cam.rot * Math.min(1, z)); ctx.scale(sc, sc); ctx.translate(-W / 2 - cam.x * z, -H / 2 - cam.y * z); };
    const g = {
      ctx, t, lt, u: lt / sh.dur, dur: sh.dur, W, H, cam, film: this, off: this.off,
      at(z, fn) { ctx.save(); tf(z); fn(ctx); ctx.restore(); },
      put(p, x, y, z = 1, o = {}) {
        ctx.save(); tf(z); ctx.globalAlpha = o.a ?? 1; if (o.op) ctx.globalCompositeOperation = o.op;
        if (o.rot || o.s) { const ox = o.ox ?? p.w / 2, oy = o.oy ?? p.h / 2; ctx.translate(x + ox, y + oy); ctx.rotate(o.rot || 0); ctx.scale(o.s || 1, o.s || 1); ctx.drawImage(p.c, -ox, -oy, p.w, p.h); }
        else ctx.drawImage(p.c, x, y, p.w, p.h);
        ctx.restore();
      },
      screen(fn) { ctx.save(); fn(ctx); ctx.restore(); },
    };
    sh.draw(g, lt, lt / sh.dur);
    ctx.restore();
  }
  frame(t) {
    t = clamp(t, 0, this.dur - 1e-4);
    const ctx = this.ctx, i = this.locate(t), sh = this.shots[i], lt = t - sh.start, W = this.W, H = this.H, S = this.S;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    this.drawShot(ctx, i, lt, t);
    // transitions
    const tr = sh.tr, nx = this.shots[i + 1];
    if (tr && i > 0 && tr.type === 'dissolve' && lt < tr.d) {
      const p = this.shots[i - 1]; this.bctx.setTransform(1, 0, 0, 1, 0, 0); this.drawShot(this.bctx, i - 1, p.dur + lt, t);
      ctx.globalAlpha = 1 - ease.sine(lt / tr.d); ctx.drawImage(this.buf, 0, 0); ctx.globalAlpha = 1;
    }
    const flash = (tr2, k) => { const col = tr2.type === 'white' ? (tr2.col || '#fff4dc') : '#050506'; ctx.fillStyle = rgba(col, ease.sine(k)); ctx.fillRect(0, 0, W * S, H * S); };
    if (tr && i > 0 && (tr.type === 'white' || tr.type === 'black') && lt < tr.d / 2) flash(tr, 1 - lt / (tr.d / 2));
    if (nx && nx.tr && (nx.tr.type === 'white' || nx.tr.type === 'black') && sh.dur - lt < nx.tr.d / 2) flash(nx.tr, 1 - (sh.dur - lt) / (nx.tr.d / 2));
    if (i === 0 && this.fadeIn && lt < this.fadeIn) flash({ type: 'black' }, 1 - lt / this.fadeIn);
    if (!nx && this.fadeOut && sh.dur - lt < this.fadeOut) flash({ type: 'black' }, 1 - (sh.dur - lt) / this.fadeOut);
    this.grade(t);
  }
  grade(t) {
    const P = this.post, ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height, off = this.off;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (P.bloom && !off.has('bloom')) {
      const s = this.sctx, sw = this.small.width, sh = this.small.height;
      s.globalCompositeOperation = 'copy'; s.filter = `brightness(1.05) contrast(1.9) blur(${P.bloomR * this.S / 4}px)`; s.drawImage(this.canvas, 0, 0, sw, sh); s.filter = 'none';
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = P.bloom; ctx.drawImage(this.small, 0, 0, cw, ch); ctx.globalAlpha = 1;
    }
    if (!off.has('grade')) {
      if (P.split) { const g = ctx.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, rgba(P.top, P.split)); g.addColorStop(1, rgba(P.bottom, P.split)); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); }
      if (P.warm) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgba(P.cream, P.warm * 3); ctx.fillRect(0, 0, cw, ch); }
      if (P.lift) { ctx.globalCompositeOperation = 'lighten'; ctx.fillStyle = P.lift; ctx.fillRect(0, 0, cw, ch); }
    }
    if (P.vignette && !off.has('vignette')) {
      const g = ctx.createRadialGradient(cw / 2, ch / 2, ch * .35, cw / 2, ch / 2, Math.hypot(cw, ch) * .58);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(28,22,26,${P.vignette})`);
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    }
    if (P.grain && !off.has('grain')) {
      const f = Math.round(t * this.FPS), tile = this.grainTiles[f % 4], ox = Math.floor(hash(f, 1) * 256), oy = Math.floor(hash(f, 2) * 256);
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = P.grain;
      for (let y = -oy; y < ch; y += 256) for (let x = -ox; x < cw; x += 256) ctx.drawImage(tile, x, y);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
    if (P.letterbox) { const b = P.letterbox * this.S; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, b); ctx.fillRect(0, ch - b, cw, b); }
  }

  start() {
    const W = this.W, H = this.H;
    window.DURATION = +this.dur.toFixed(3); window.FPS = this.FPS; window.SIZE = { W, H }; window.film = this;
    window.seek = t => this.frame(t);
    window.runChecks = t => this.rules.filter(r => { try { return !r.fn(t); } catch { return true; } }).map(r => r.name);
    window.shotAt = t => { const i = this.locate(t); return { i, name: this.shots[i].name, lt: t - this.shots[i].start }; };
    const st = document.createElement('style');
    st.textContent = `html,body{margin:0;height:100%;background:#0b0d0e;overflow:hidden}canvas{display:block;width:100vw;height:100vh;object-fit:contain}
      .pas-ui{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;gap:10px;padding:8px 12px;font:12px/1.2 system-ui,sans-serif;color:#f3ead8;background:linear-gradient(transparent,rgba(0,0,0,.55));opacity:0;transition:opacity .3s}
      body:hover .pas-ui,.pas-ui.on{opacity:1}.pas-ui button{all:unset;cursor:pointer;padding:4px 8px;border:1px solid rgba(255,255,255,.35);border-radius:4px}
      .pas-bar{flex:1;height:14px;cursor:pointer;position:relative}.pas-bar i{position:absolute;left:0;top:6px;height:2px;background:#f3d9a4}.pas-bar:before{content:"";position:absolute;left:0;right:0;top:6px;height:2px;background:rgba(255,255,255,.25)}`;
    document.head.appendChild(st);
    if (this.q.has('t')) { this.frame(+this.q.get('t')); }
    else if (this.render) this.frame(0);
    else this.live();
    window.__ready = true;
  }
  live() {
    let t0 = performance.now(), base = 0, paused = false, ac = null, src = null, buffer = null, loading = false;
    const ui = document.createElement('div'); ui.className = 'pas-ui';
    ui.innerHTML = `<button data-k="play">❚❚</button>${this.score ? '<button data-k="snd">♪ sound</button>' : ''}<div class="pas-bar"><i></i></div><span class="tm"></span>`;
    document.body.appendChild(ui);
    const bar = ui.querySelector('.pas-bar'), fill = bar.querySelector('i'), tm = ui.querySelector('.tm'), pb = ui.querySelector('[data-k=play]'), sb = ui.querySelector('[data-k=snd]');
    const now = () => paused ? base : (ac && src ? (ac.currentTime - this._acStart) : base + (performance.now() - t0) / 1000) % this.dur;
    const stopAudio = () => { if (src) { try { src.stop(); } catch { } src = null; } };
    const playAudio = at => { if (!buffer || paused) return; stopAudio(); src = ac.createBufferSource(); src.buffer = buffer; src.connect(ac.destination); src.start(0, at % this.dur); this._acStart = ac.currentTime - at % this.dur; };
    const go = t => { base = (t % this.dur + this.dur) % this.dur; t0 = performance.now(); if (src) playAudio(base); };
    const toggle = () => { if (paused) { paused = false; go(base); if (buffer) playAudio(base); } else { base = now(); paused = true; stopAudio(); } pb.textContent = paused ? '▶' : '❚❚'; };
    pb.onclick = e => { e.stopPropagation(); toggle(); };
    if (sb) sb.onclick = async e => {
      e.stopPropagation();
      if (src) { base = now(); stopAudio(); t0 = performance.now(); sb.textContent = '♪ sound'; return; }
      if (loading) return; loading = true; sb.textContent = '♪ …';
      ac = ac || new AudioContext();
      if (!buffer) { const { renderScore } = await import(new URL('./score.js', this.libURL).href); const sr = ac.sampleRate, [L, R] = renderScore(this.score, sr, this.dur); buffer = ac.createBuffer(2, L.length, sr); buffer.copyToChannel(L, 0); buffer.copyToChannel(R, 1); }
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
    const loop = () => {
      const t = now(); if (!paused) this.frame(t);
      fill.style.width = (t / this.dur * 100) + '%'; tm.textContent = `${t.toFixed(1)} / ${this.dur.toFixed(0)} s · ${this.shots[this.locate(t)].name}`;
      requestAnimationFrame(loop);
    };
    loop();
  }
}
