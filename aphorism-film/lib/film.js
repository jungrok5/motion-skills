// aphorism-film · film.js — the runtime: plates painted once, shots on a timeline with a multiplane camera, the quote layer
// on its own timeline (so a quote can hold across a cut), the transition vocabulary of the style (paper storm, cracking
// wall, paper vortex, ink flood, whip slide, dissolve, flashes), a printed-paper grade, live playback with sound, the contract.
//
//   const F = new Film({ seed: 7, score: SCORE });
//   const wall = F.plate(1920, 1080, (c, w, h) => K.stoneWall(c, 0, 0, w, h, { seed: 3 }));   // painted in start(), after fonts
//   F.shot(7, g => { g.put(wall, 0, 0, .3); … }, { cam: [{ t: 0, zoom: 1 }, { t: 7, zoom: 1.06 }], tr: { type: 'papers', d: 1.2 } });
//   F.quote({ t0: .4, t1: 6.6, x: 150, y: 260, size: 150, lines: ['k:THE ONLY', 'D:wisdom'] , by: 'Socrates' });
//   F.start();
//
// Depth z: 0 = infinitely far (never moves), 1 = focal plane, > 1 = foreground. Camera {x, y, zoom, rot} keyed per shot.
import { keys, hash, noise2, clamp, ease, rgba, rng, lerp, TAU, lum } from './core.js';
import { renderScore } from './score.js';
import { loadFonts, drawQuote, quoteBox } from './type.js';
import { clearIssues, issues } from './figure.js';
import { paper as paperSheet, INK } from './kit.js';

const POST = { paper: .09, grain: .06, vignette: .3, sat: 1.06, contrast: 1.04, lift: '#120e16', letterbox: 0 };

export class Film {
  constructor(o = {}) {
    const q = new URLSearchParams(location.search);
    this.q = q; this.render = q.has('render'); this.W = o.W || 1920; this.H = o.H || 1080; this.FPS = o.fps || 30;
    this.off = new Set((q.get('off') || '').split(',').filter(Boolean));
    this.S = +(q.get('scale') || (this.render ? 1 : Math.min(1, Math.max(.5, (innerWidth * devicePixelRatio) / this.W))));
    this.post = { ...POST, ...(o.post || {}) };
    this.score = o.score || null; this.renderScore = renderScore; this.seed = o.seed || 1;
    this.shots = []; this.rules = []; this.quotes = []; this.plates = []; this.dur = 0; this.fadeIn = o.fadeIn ?? .6; this.fadeOut = o.fadeOut ?? .8;
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
    this.mk = mk;
    this.canvas = mk(this.W * this.S, this.H * this.S); this.ctx = this.canvas.getContext('2d');
    this.buf = mk(this.W * this.S, this.H * this.S); this.bctx = this.buf.getContext('2d');
    this.fonts = loadFonts();
    document.body.appendChild(this.canvas);
  }

  // a plate: painted once (in start(), after the fonts load) by paint(ctx, w, h) in stage units. o.blur = depth of field.
  plate(w, h, paint, o = {}) { const p = { c: null, w, h, paint, o }; this.plates.push(p); return p; }
  paintPlate(p) {
    const S = this.S, c = this.mk(Math.ceil(p.w * S), Math.ceil(p.h * S)), x = c.getContext('2d');
    x.scale(S, S); p.paint(x, p.w, p.h);
    if (p.o.blur > 0 && !this.off.has('dof')) { const d = this.mk(c.width, c.height), y = d.getContext('2d'); y.filter = `blur(${p.o.blur * S}px)`; y.drawImage(c, 0, 0); p.c = d; } else p.c = c;
  }
  // a shot: dur seconds; draw(g, lt, u). o.cam = keys [{t, x, y, zoom, rot}], o.shake = lt => px, o.tr = the transition INTO it:
  //   { type: 'cut'|'dissolve'|'white'|'black'|'papers'|'crack'|'vortex'|'ink'|'slide', d, dir, at: [x, y], sheets: [colours] }
  shot(dur, draw, o = {}) { this.shots.push({ dur, draw, cam: o.cam || [{ t: 0 }], shake: o.shake, tr: o.tr || null, name: o.name || 'shot ' + (this.shots.length + 1), start: this.dur }); this.dur += dur; return this; }
  // a quote on the type timeline (absolute seconds) — see type.js for the line markup
  quote(Q) { this.quotes.push(Q); return Q; }
  check(name, fn) { this.rules.push({ name, fn }); }

  locate(t) { let i = 0; while (i < this.shots.length - 1 && t >= this.shots[i + 1].start) i++; return i; }
  camAt(sh, lt) {
    const c = { x: keys(sh.cam, lt, 'x', 0), y: keys(sh.cam, lt, 'y', 0), zoom: keys(sh.cam, lt, 'zoom', 1), rot: keys(sh.cam, lt, 'rot', 0) };
    const a = sh.shake ? sh.shake(lt) : 0;
    if (a) { c.x += (noise2(lt * 16, 3.1) - .5) * 2 * a; c.y += (noise2(lt * 16, 7.7) - .5) * 2 * a; }
    return c;
  }
  drawShot(ctx, i, lt, t) {
    const sh = this.shots[i], W = this.W, H = this.H, S = this.S, cam = this.camAt(sh, lt);
    ctx.save(); ctx.setTransform(S, 0, 0, S, 0, 0); ctx.fillStyle = '#120e16'; ctx.fillRect(0, 0, W, H);
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
      twos: (v = lt, fps = 12) => Math.floor(v * fps + 1e-6) / fps,
    };
    sh.draw(g, lt, lt / sh.dur);
    ctx.restore();
  }

  // ---------- the frame ----------
  frame(t, o = {}) {
    t = clamp(t, 0, this.dur - 1e-4); clearIssues();
    const ctx = this.ctx, i = this.locate(t), sh = this.shots[i], lt = t - sh.start, W = this.W, H = this.H, S = this.S;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    this.drawShot(ctx, i, lt, t);
    const tr = sh.tr;
    if (tr && i > 0 && lt < tr.d && tr.type !== 'cut') {
      const p = this.shots[i - 1], k = lt / tr.d;
      this.bctx.setTransform(1, 0, 0, 1, 0, 0); this.drawShot(this.bctx, i - 1, p.dur + lt, t);
      ctx.save(); ctx.setTransform(S, 0, 0, S, 0, 0);
      (TRANSITIONS[tr.type] || TRANSITIONS.dissolve).call(this, ctx, this.buf, k, tr, W, H);
      ctx.restore();
    }
    const nx = this.shots[i + 1];
    const flash = (col, a) => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = rgba(col, ease.sine(a)); ctx.fillRect(0, 0, W * S, H * S); };
    if (nx && nx.tr && (nx.tr.type === 'white' || nx.tr.type === 'black') && sh.dur - lt < nx.tr.d / 2) flash(nx.tr.type === 'white' ? '#fbf7ee' : '#0b0810', 1 - (sh.dur - lt) / (nx.tr.d / 2));
    // the quote layer, above the picture, below the grade
    if (!this.off.has('type') && !o.noType) { ctx.save(); ctx.setTransform(S, 0, 0, S, 0, 0); for (const Q of this.quotes) drawQuote(ctx, Q, t); ctx.restore(); }
    if (i === 0 && this.fadeIn && lt < this.fadeIn) flash('#0b0810', 1 - lt / this.fadeIn);
    if (!nx && this.fadeOut && sh.dur - lt < this.fadeOut) flash('#0b0810', 1 - (sh.dur - lt) / this.fadeOut);
    if (!o.noGrade) this.grade(t);
  }
  grade(t) {
    const P = this.post, ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height, off = this.off;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!off.has('grade') && (P.sat !== 1 || P.contrast !== 1)) {
      this.bctx.setTransform(1, 0, 0, 1, 0, 0); this.bctx.globalCompositeOperation = 'copy'; this.bctx.filter = `saturate(${P.sat}) contrast(${P.contrast})`; this.bctx.drawImage(this.canvas, 0, 0); this.bctx.filter = 'none'; this.bctx.globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'copy'; ctx.drawImage(this.buf, 0, 0); ctx.globalCompositeOperation = 'source-over';
    }
    if (P.lift && !off.has('grade')) { ctx.globalCompositeOperation = 'lighten'; ctx.fillStyle = P.lift; ctx.fillRect(0, 0, cw, ch); }
    if (P.paper && !off.has('paper')) { // printed-paper tooth: fibres and blotches, fixed to the frame like the stock of a print
      if (!this.paperTile) this.paperTile = makePaper(this.mk, this.seed);
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = P.paper * 4;
      for (let y = 0; y < ch; y += 512) for (let x = 0; x < cw; x += 512) ctx.drawImage(this.paperTile, x, y);
      ctx.globalAlpha = 1;
    }
    if (P.vignette && !off.has('vignette')) {
      const g = ctx.createRadialGradient(cw / 2, ch / 2, ch * .4, cw / 2, ch / 2, Math.hypot(cw, ch) * .6);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(20,12,22,${P.vignette})`); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    }
    if (P.grain && !off.has('grain')) {
      if (!this.grainTiles) { const R = rng(this.seed); this.grainTiles = [0, 1, 2, 3].map(() => { const c = this.mk(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (R() + R() + R() - 1.5) * 110; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; }); }
      const f = Math.round(t * this.FPS), tile = this.grainTiles[f % 4], ox = Math.floor(hash(f, 1) * 256), oy = Math.floor(hash(f, 2) * 256);
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = P.grain;
      for (let y = -oy; y < ch; y += 256) for (let x = -ox; x < cw; x += 256) ctx.drawImage(tile, x, y);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
    if (P.letterbox) { const b = P.letterbox * this.S; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, b); ctx.fillRect(0, ch - b, cw, b); }
  }
  // the stage boxes of the quotes on screen at t, with the mean luminance of the picture under each (type off)
  textCheck(t) {
    const boxes = this.quotes.map(Q => ({ Q, b: quoteBox(Q, t) })).filter(x => x.b); if (!boxes.length) return [];
    this.frame(t, { noType: true, noGrade: true });
    const S = this.S, out = [];
    for (const { Q, b } of boxes) {
      const x0 = Math.max(0, Math.floor(b.x * S)), y0 = Math.max(0, Math.floor(b.y * S)), w = Math.max(1, Math.min(this.canvas.width - x0, Math.ceil(b.w * S))), h = Math.max(1, Math.min(this.canvas.height - y0, Math.ceil(b.h * S)));
      const d = this.ctx.getImageData(x0, y0, w, h).data; let sum = 0, n = 0;
      for (let i = 0; i < d.length; i += 4 * 7) { sum += lum('#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('')); n++; }
      out.push({ ...b, lum: sum / n, dark: lum(Q.col || '#fbf7ee') < .3, scrim: Q.scrim || 0 });
    }
    this.frame(t); return out;
  }

  async start() {
    await this.fonts;
    for (const p of this.plates) if (!p.c) this.paintPlate(p);
    const W = this.W, H = this.H;
    window.DURATION = +this.dur.toFixed(3); window.FPS = this.FPS; window.SIZE = { W, H }; window.film = this;
    window.seek = t => this.frame(t);
    window.runChecks = t => this.rules.filter(r => { try { return !r.fn(t); } catch { return true; } }).map(r => r.name).concat(issues());
    window.shotAt = t => { const i = this.locate(t); return { i, name: this.shots[i].name, lt: t - this.shots[i].start }; };
    window.textCheck = t => this.textCheck(t);
    const st = document.createElement('style');
    st.textContent = `html,body{margin:0;height:100%;background:#0b0810;overflow:hidden}canvas{display:block;width:100vw;height:100vh;object-fit:contain}
      .af-ui{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;gap:10px;padding:8px 12px;font:12px/1.2 system-ui,sans-serif;color:#fbf7ee;background:linear-gradient(transparent,rgba(0,0,0,.55));opacity:0;transition:opacity .3s}
      body:hover .af-ui,.af-ui.on{opacity:1}.af-ui button{all:unset;cursor:pointer;padding:4px 8px;border:1px solid rgba(255,255,255,.35);border-radius:4px}
      .af-bar{flex:1;height:14px;cursor:pointer;position:relative}.af-bar i{position:absolute;left:0;top:6px;height:2px;background:#f2b51d}.af-bar:before{content:"";position:absolute;left:0;right:0;top:6px;height:2px;background:rgba(255,255,255,.25)}`;
    document.head.appendChild(st);
    if (this.q.has('t')) this.frame(+this.q.get('t'));
    else if (this.render) this.frame(0);
    else this.live();
    window.__ready = true;
  }
  live() {
    let t0 = performance.now(), base = 0, paused = false, ac = null, src = null, buffer = null, loading = false;
    const ui = document.createElement('div'); ui.className = 'af-ui';
    ui.innerHTML = `<button data-k="play">❚❚</button>${this.score ? '<button data-k="snd">♪ sound</button>' : ''}<div class="af-bar"><i></i></div><span class="tm"></span>`;
    document.body.appendChild(ui);
    const bar = ui.querySelector('.af-bar'), fill = bar.querySelector('i'), tm = ui.querySelector('.tm'), pb = ui.querySelector('[data-k=play]'), sb = ui.querySelector('[data-k=snd]');
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
      if (!buffer) { const sr = ac.sampleRate, [L, R] = renderScore(this.score, sr, this.dur); buffer = ac.createBuffer(2, L.length, sr); buffer.copyToChannel(L, 0); buffer.copyToChannel(R, 1); }
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

function makePaper(mk, seed) {
  const c = mk(512, 512), x = c.getContext('2d'), R = rng(seed + 77);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { const px = R() * 512, py = R() * 512, a = R() * TAU, l = 4 + R() * 18; x.strokeStyle = `rgba(120,100,80,${.05 + R() * .12})`; x.lineWidth = .5 + R(); x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  for (let i = 0; i < 40; i++) { const px = R() * 512, py = R() * 512, r = 20 + R() * 70, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(150,120,90,${.04 + R() * .05})`); g.addColorStop(1, 'rgba(150,120,90,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, 2 * r, 2 * r); }
  return c;
}

// ---------- transitions: draw the OLD shot (buf) over the new one already on ctx, in stage units; k = 0 … 1 ----------
const sheetCache = new Map();
function sheets(film, tr) {   // printed sheets, painted once per transition style
  const key = (tr.sheets || []).join() + film.S;
  if (!sheetCache.has(key)) {
    const cols = tr.sheets || ['#fbf7ee', '#f1e6cc', '#fbf7ee', '#e9d39b'];
    sheetCache.set(key, cols.map((col, i) => { const w = 150, h = 200, c = film.mk(w * film.S, h * film.S), x = c.getContext('2d'); x.scale(film.S, film.S); paperSheet(x, w, h, { seed: 40 + i, col, lw: 2 }); return { c, w, h }; }));
  }
  return sheetCache.get(key);
}
// a flock of sheets around a moving front: n sheets, each with its own size, spin, flip and lag
function flock(ctx, film, tr, n, place) {
  const sp = sheets(film, tr);
  for (let i = 0; i < n; i++) {
    const s = sp[i % sp.length], q = place(i, hash(i, 1), hash(i, 2), hash(i, 3), hash(i, 4)); if (!q) continue;
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(q.s, q.s * Math.max(.08, Math.abs(Math.cos(q.flip))));
    ctx.globalAlpha = q.a ?? 1; ctx.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h); ctx.restore();
  }
}
const TRANSITIONS = {
  dissolve(ctx, A, k, tr, W, H) { ctx.globalAlpha = 1 - ease.sine(k); ctx.drawImage(A, 0, 0, W, H); ctx.globalAlpha = 1; },
  white(ctx, A, k, tr, W, H) { if (k < .5) { ctx.drawImage(A, 0, 0, W, H); } ctx.fillStyle = rgba('#fbf7ee', ease.sine(1 - Math.abs(k - .5) * 2)); ctx.fillRect(0, 0, W, H); },
  black(ctx, A, k, tr, W, H) { if (k < .5) { ctx.drawImage(A, 0, 0, W, H); } ctx.fillStyle = rgba('#0b0810', ease.sine(1 - Math.abs(k - .5) * 2)); ctx.fillRect(0, 0, W, H); },
  // a storm of printed sheets sweeps across (dir 1 = left → right); the new picture is behind the storm's front
  papers(ctx, A, k, tr, W, H) {
    const dir = tr.dir || 1, e = ease.io(k), front = lerp(-W * .25, W * 1.25, e), fx = x => dir > 0 ? x : W - x;
    ctx.save(); ctx.beginPath();
    const edge = y => front + Math.sin(y * .011 + k * 6) * 60 + (noise2(y * .006, k * 3) - .5) * 160;
    if (dir > 0) { ctx.moveTo(W + 10, -10); for (let y = -10; y <= H + 10; y += 40) ctx.lineTo(edge(y), y); ctx.lineTo(W + 10, H + 10); }
    else { ctx.moveTo(-10, -10); for (let y = -10; y <= H + 10; y += 40) ctx.lineTo(W - edge(y), y); ctx.lineTo(-10, H + 10); }
    ctx.closePath(); ctx.clip(); ctx.drawImage(A, 0, 0, W, H); ctx.restore();
    flock(ctx, this, tr, tr.n || 90, (i, a, b, c, d) => {
      const lag = (a - .5) * W * .55, x = front + lag + (k - .5) * d * 300, y = -120 + b * (H + 240) + Math.sin(k * 7 + i) * 40;
      return { x: fx(x), y, rot: (c - .5) * 3 + k * (c - .5) * 8 * dir, flip: k * (4 + d * 8) + i, s: .5 + d * 1.1, a: clamp(2.2 - Math.abs(lag) / (W * .22)) };
    });
  },
  // the old picture cracks from a point, splits into stone shards that drop away; dust and a few chips
  crack(ctx, A, k, tr, W, H) {
    const at = tr.at || [W * .5, H * .45], cols = 7, rows = 5;
    if (!this._shards) {   // irregular shards from a jittered grid (deterministic)
      const P = []; for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { const ex = i === 0 || i === cols, ey = j === 0 || j === rows; P.push([i * W / cols + (ex ? 0 : (hash(i, j, 5) - .5) * W / cols * .7), j * H / rows + (ey ? 0 : (hash(i, j, 6) - .5) * H / rows * .7)]); }
      const id = (i, j) => P[j * (cols + 1) + i], sh = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const q = [id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)]; if (hash(i, j, 7) < .5) { sh.push([q[0], q[1], q[2]]); sh.push([q[0], q[2], q[3]]); } else { sh.push([q[0], q[1], q[3]]); sh.push([q[1], q[2], q[3]]); } }
      this._shards = sh;
    }
    const crackK = clamp(k / .3), fall = clamp((k - .25) / .75);
    for (const [n, s] of this._shards.entries()) {
      const cx = (s[0][0] + s[1][0] + s[2][0]) / 3, cy = (s[0][1] + s[1][1] + s[2][1]) / 3, dist = Math.hypot(cx - at[0], cy - at[1]) / W;
      const f = clamp(fall * 1.6 - dist * .9 - hash(n, 2) * .3);
      if (f >= 1) continue;
      const dy = f * f * H * 1.5, dx = (cx - at[0]) * f * .25, rot = (hash(n, 3) - .5) * f * 1.6, sc = 1 - f * .15;
      ctx.save(); ctx.translate(cx + dx, cy + dy); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
      ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); ctx.lineTo(s[1][0], s[1][1]); ctx.lineTo(s[2][0], s[2][1]); ctx.closePath(); ctx.save(); ctx.clip(); ctx.drawImage(A, 0, 0, W, H);
      if (f > 0) { ctx.fillStyle = rgba(INK, f * .35); ctx.fill(); }
      ctx.restore();
      ctx.lineWidth = 2 + 2.5 * (1 - dist); ctx.strokeStyle = INK; ctx.globalAlpha = clamp((crackK * 1.25 - dist * 1.1) * 4); ctx.stroke();   // cracks run outward from the impact
      ctx.restore();
    }
    // dust puffs at the impact
    if (k > .2 && k < .9) for (let i = 0; i < 26; i++) { const a = hash(i, 9) * TAU, r = (k - .2) * (200 + hash(i, 8) * 500); ctx.beginPath(); ctx.arc(at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r * .6 + (k - .2) * 200, 10 + hash(i, 7) * 30 * (1 - k), 0, TAU); ctx.fillStyle = rgba('#efe2c2', .6 * (1 - k)); ctx.fill(); }
  },
  // the old picture twists into a spiral and sinks to the centre while sheets swirl; the new one is underneath
  vortex(ctx, A, k, tr, W, H) {
    const cx = (tr.at || [W / 2, H / 2])[0], cy = (tr.at || [W / 2, H / 2])[1], e = ease.in(k), rings = 10, Rm = Math.hypot(W, H) * .6;
    for (let r = rings; r >= 1; r--) {
      const r0 = (r - 1) / rings * Rm, r1 = r / rings * Rm, tw = e * (2.5 + (rings - r) * .55), sc = 1 - e * (.4 + r / rings * .6);
      if (sc <= .02) continue;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r1 * sc, 0, TAU); ctx.arc(cx, cy, r0 * sc, 0, TAU, true); ctx.clip();
      ctx.translate(cx, cy); ctx.rotate(tw); ctx.scale(sc, sc); ctx.translate(-cx, -cy); ctx.globalAlpha = clamp(1.3 - e * 1.2); ctx.drawImage(A, 0, 0, W, H); ctx.restore();
    }
    flock(ctx, this, tr, tr.n || 70, (i, a, b, c, d) => {
      const ang = a * TAU + k * (5 + d * 4), rr = (1 - k * (.6 + b * .4)) * (200 + c * Rm * .8);
      return { x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr * .8, rot: ang + 1.6, flip: k * 6 + i, s: (.4 + d * .9) * (1 - k * .5), a: clamp((1 - k) * 3) * clamp(k * 6) };
    });
  },
  // black ink floods up from the floor over the old picture, then drains to reveal the new one; a few sheets float in it
  ink(ctx, A, k, tr, W, H) {
    const up = k < .5, e = up ? ease.io(k * 2) : ease.io((k - .5) * 2);
    if (up) ctx.drawImage(A, 0, 0, W, H);
    const level = up ? H * (1.08 - e * 1.2) : H * (-.12 + e * 1.25);
    ctx.beginPath(); ctx.moveTo(-10, H + 10);
    for (let x = -10; x <= W + 10; x += 30) { const y = level + Math.sin(x * .01 + k * 9) * 30 + (noise2(x * .004, k * 4) - .5) * 180; ctx.lineTo(x, up ? y : Math.min(y, H + 10)); }
    if (up) { ctx.lineTo(W + 10, H + 10); } else { ctx.lineTo(W + 10, -10); ctx.lineTo(-10, -10); }
    ctx.closePath(); ctx.fillStyle = tr.col || '#0b0810'; ctx.fill();
    flock(ctx, this, tr, tr.n || 26, (i, a, b, c, d) => ({ x: a * W + Math.sin(k * 4 + i) * 60, y: level - 40 + b * 140 + (up ? 0 : -k * 200), rot: (c - .5) * 2 + k * 3, flip: k * 4 + i, s: .4 + d * .6, a: clamp(1 - Math.abs(k - .5) * 1.6) }));
  },
  // a whip: the old picture rushes off sideways over the new one, with speed lines
  slide(ctx, A, k, tr, W, H) {
    const dir = tr.dir || 1, e = ease.io(k);
    ctx.save(); ctx.translate(-dir * e * W, 0); ctx.drawImage(A, 0, 0, W, H); ctx.restore();   // the new shot waits underneath
    const s = Math.sin(Math.PI * k);
    ctx.fillStyle = rgba('#fbf7ee', .5 * s); for (let i = 0; i < 40; i++) { const y = hash(i, 11) * H, l = (200 + hash(i, 12) * 900) * s; ctx.fillRect(((hash(i, 13) * W * 1.5 - k * W * dir * 2) % (W * 1.5) + W * 1.5) % (W * 1.5) - l / 2, y, l, 2 + hash(i, 14) * 4); }
  },
};
