// torn-page-journey · journey.js — the runtime: one traveller rides through chapters; each chapter is one feeling painted in
// one medium; a torn page carries the ride from one chapter to the next; the last page tears back into the first, so the
// film loops seamlessly. Live playback with sound, and the render contract (seek(t) …) for scripts/render.mjs.
//
//   const J = new Journey({ rider: SPEC, score: SCORE, speed: 230, tear: 1.4 });
//   J.chapter({ name: 'joy', mood: 'joy', medium: 'crayon', dur: 8,
//     ground: x => 880 + 12 * Math.sin(x / 300),                       // the road line, in this chapter's world x (z = 1)
//     layers: [{ z: 0, paint: (c, M, x0, x1, H) => K.sky(c, M, 0, 0, 1920, 1080, {…}) },   // painted once (a plate)
//              { z: .4, paint: … }, { z: 1, paint: … }],
//     back: g => …, front: g => …,                                      // live, every frame (critters, birds, rain)
//     gestures: [{ at: 3.2, kind: 'wave' }], coast: [[5, 6.5]] });
//   J.start();
//
// Depth z: 0 = fixed to the screen, 1 = the road the rider is on, > 1 = in front. A layer at depth z scrolls by distance·z.
// All motion comes from tables built once (distance, speed, crank, follow-through springs): a frame is a pure function of t.
import { TAU, clamp, lerp, hash, n1, ease, rgba, shade, mix, canvas, rng } from './core.js';
import { medium, MEDIA } from './media.js';
import * as Rider from './rider.js';
import { renderScore } from './score.js';

const POST = { grain: .05, vignette: .22 };
const DT = 1 / 240;

export class Journey {
  constructor(o = {}) {
    const q = new URLSearchParams(location.search);
    this.q = q; this.render = q.has('render'); this.W = 1920; this.H = 1080; this.FPS = o.fps || 24;
    this.S = +(q.get('scale') || (this.render ? 1 : Math.min(1, Math.max(.5, (innerWidth * devicePixelRatio) / this.W))));
    this.off = new Set((q.get('off') || '').split(',').filter(Boolean));
    this.seed = o.seed || 1; this.rider = o.rider; this.score = o.score || null; this.renderScore = renderScore;
    this.speed = o.speed || 230; this.tear = o.tear ?? 1.4; this.RX = o.riderX ?? .34 * this.W; this.gear = o.gear || 1.3;
    this.post = { ...POST, ...(o.post || {}) }; this.title = o.title || document.title;
    this.chapters = []; this.rules = []; this.boilFps = 6; this.fadeIn = 0; this.fadeOut = 0;
    this.canvas = canvas(this.W * this.S, this.H * this.S); this.ctx = this.canvas.getContext('2d');
    this.buf = canvas(this.W * this.S, this.H * this.S); this.bctx = this.buf.getContext('2d');
    const R = rng(this.seed);
    this.grainTiles = [0, 1, 2].map(() => { const c = canvas(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (R() + R() + R() - 1.5) * 110; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; });
    this.plates = new Map();
    document.body.appendChild(this.canvas);
  }
  chapter(def) { this.chapters.push({ gestures: [], coast: [], layers: [], ...def, M: medium(def.medium), i: this.chapters.length }); return this; }
  check(name, fn) { this.rules.push({ name, fn }); }

  // ── timeline ──
  build() {
    const C = this.chapters, T = this.tear; let s = 0;
    for (const c of C) { c.start = s; s += c.dur; c.speed = c.speed || this.speed; }
    this.dur = s;
    // boundaries: chapter i → i+1 centred on the boundary; the last page tears back into the first, ending exactly at dur
    this.tears = C.slice(1).map((c, i) => ({ a: i, b: i + 1, t0: c.start - T / 2, t1: c.start + T / 2 }));
    this.tears.push({ a: C.length - 1, b: 0, t0: this.dur - T, t1: this.dur, reprise: true });
    const N = Math.ceil(this.dur / DT) + 2, spd = new Float64Array(N), cad = new Float64Array(N);
    const chAt = t => { let i = 0; while (i < C.length - 1 && t >= C[i + 1].start) i++; return i; };
    const speedAt = t => {   // the chapter's speed, eased across each tear
      for (const tr of this.tears) if (t >= tr.t0 && t <= tr.t1) return lerp(C[tr.a].speed, C[tr.b].speed, ease.sine((t - tr.t0) / (tr.t1 - tr.t0)));
      return C[chAt(t)].speed;
    };
    const coastAt = t => {
      for (const tr of this.tears) if (tr.reprise && t >= tr.t0) return this.coasting(0, t - this.dur);
      const i = chAt(t); return this.coasting(i, t - C[i].start);
    };
    for (let k = 0; k < N; k++) { const t = k * DT; spd[k] = speedAt(t); cad[k] = coastAt(t) ? 0 : 1; }
    // wheels: distance → angle, scaled a hair so a whole number of turns fits the loop (no pop at the seam, no slip)
    const R = this.rider.R || 70; let D = 0; for (let k = 1; k < N; k++) D += (spd[k] + spd[k - 1]) / 2 * DT;
    const Dloop = (() => { let d = 0; for (let k = 1; k * DT <= this.dur + 1e-9; k++) d += (spd[k] + spd[k - 1]) / 2 * DT; return d; })();
    const ks = Math.round(Dloop / (TAU * R)) * TAU * R / Dloop; for (let k = 0; k < N; k++) spd[k] *= ks;
    const dist = new Float64Array(N), crank = new Float64Array(N);
    for (let k = 1; k < N; k++) dist[k] = dist[k - 1] + (spd[k] + spd[k - 1]) / 2 * DT;
    let Cr = 0; for (let k = 1; k < N; k++) { Cr += cad[k] * spd[k] / R * this.gear * DT; crank[k] = Cr; }
    const kLoop = Math.round(crank[Math.round(this.dur / DT)] / TAU) * TAU / (crank[Math.round(this.dur / DT)] || 1);
    for (let k = 0; k < N; k++) crank[k] *= kLoop || 1;
    // follow-through: a spring on the speed (scarf, tail, ears lag and overshoot); run twice so the loop's start = its end
    const vs = new Float64Array(N), acc = new Float64Array(N), w = TAU * 1.1, z = .45;
    let x = spd[0] / this.speed, v = 0, a = 0, av = 0;
    for (let pass = 0; pass < 2; pass++) for (let k = 0; k < N; k++) {
      const tgt = clamp(spd[k] / this.speed, 0, 1.3), dv = k ? (spd[k] - spd[k - 1]) / DT / 300 : 0;
      v += (w * w * (tgt - x) - 2 * z * w * v) * DT; x += v * DT;
      av += (w * w * (dv - a) - 2 * z * w * av) * DT; a += av * DT;
      if (pass) { vs[k] = x; acc[k] = clamp(a, -1, 1); }
    }
    this.tab = { N, spd, dist, crank, vs, acc, cad };
    // what each chapter must cover: local distance range over every window it is on screen
    for (const c of C) {
      const wins = [[c.start - T / 2, c.start + c.dur + T / 2]]; if (c.i === 0) wins.push([this.dur - T, this.dur]);
      let lo = 1e9, hi = -1e9;
      for (const [a, b] of wins) for (let t = a; t <= b + .05; t += .05) { const ld = this.localDist(c.i, t, a >= this.dur - T - 1e-6 && c.i === 0); lo = Math.min(lo, ld); hi = Math.max(hi, ld); }
      c.ldRange = [lo - 20, hi + 20];
    }
    this.gestureIssues = [];
    for (const c of C) for (const ge of c.gestures) { const def = this.rider.gestures?.[ge.kind] || Rider.GESTURES[ge.kind]; if (!def) this.gestureIssues.push(`motion: no gesture "${ge.kind}"`); else { const p = Rider.gestureProblem(def, ge.kind); if (p) this.gestureIssues.push('motion: ' + p); if (def.feetOff && !this.coasting(c.i, ge.at + def.dur * .5)) this.gestureIssues.push(`motion: "${ge.kind}" lifts the feet in ${c.name} but the rider is pedalling (add a coast)`); } }
  }
  coasting(i, lt) {
    const c = this.chapters[i];
    for (const [a, b] of c.coast) if (lt >= a && lt <= b) return true;
    for (const ge of c.gestures) { const def = this.rider.gestures?.[ge.kind] || Rider.GESTURES[ge.kind]; if (def?.feetOff && lt >= ge.at - .3 && lt <= ge.at + def.dur + .3) return true; }
    return false;
  }
  tabAt(arr, t) { const k = clamp(t / DT, 0, this.tab.N - 1.001), i = Math.floor(k), f = k - i; return lerp(arr[i], arr[i + 1], f); }
  localDist(i, t, reprise) { const d = this.tabAt(this.tab.dist, t); return reprise ? d - this.tabAt(this.tab.dist, this.dur) : d - this.tabAt(this.tab.dist, this.chapters[i].start); }
  locate(t) { let i = 0; while (i < this.chapters.length - 1 && t >= this.chapters[i + 1].start) i++; return i; }

  // ── plates ──
  platesFor(c) {
    let P = this.plates.get(c.i); if (P) return P;
    const S = this.S, M = c.M, [lo, hi] = c.ldRange;
    P = { page: canvas(this.W * S, this.H * S), layers: [] };
    { const x = P.page.getContext('2d'); x.scale(S, S); M.page(x, this.W, this.H, this.seed + c.i * 7); }
    for (const L of [...c.layers].sort((a, b) => a.z - b.z)) {
      const x0 = Math.floor(lo * L.z) - 60, x1 = Math.ceil(hi * L.z + this.W) + 60, cv = canvas((x1 - x0) * S, (L.h || this.H) * S), x = cv.getContext('2d');
      x.scale(S, S); x.translate(-x0, 0); L.paint(x, M, x0, x1, this.H, c);
      P.layers.push({ z: L.z, x0, cv, w: x1 - x0, h: L.h || this.H, front: !!L.front });
    }
    this.plates.set(c.i, P);
    if (this.plates.size > 3) for (const k of this.plates.keys()) if (k !== c.i && Math.abs(k - c.i) > 1 && !(k === 0 && c.i === this.chapters.length - 1)) { this.plates.delete(k); break; }
    return P;
  }

  riderState(c, t, lt, ld, reprise) {
    const g = c.ground || (() => 880), gtime = reprise ? t : t;
    let gesture = null;
    for (const ge of c.gestures) { const def = this.rider.gestures?.[ge.kind] || Rider.GESTURES[ge.kind]; if (def && lt >= ge.at && lt <= ge.at + def.dur) gesture = { kind: ge.kind, u: (lt - ge.at) / def.dur }; }
    return { x: ld + this.RX, ground: g, f: 1, wheel: this.tabAt(this.tab.dist, gtime) / (this.rider.R || 70), crank: this.tabAt(this.tab.crank, gtime), t, vs: this.tabAt(this.tab.vs, gtime), acc: this.tabAt(this.tab.acc, gtime), mood: c.mood, gesture, boil: Math.floor(t * this.boilFps + 1e-6), coast: this.tabAt(this.tab.cad, gtime) < .5, pose: c.pose };
  }
  /** draw chapter i at film time t into ctx (full frame) */
  drawChapter(ctx, i, t, reprise = false) {
    const c = this.chapters[i], M = c.M, S = this.S, W = this.W, H = this.H, P = this.platesFor(c);
    const lt = reprise ? t - this.dur : t - c.start, ld = this.localDist(i, t, reprise);
    ctx.save(); ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.drawImage(P.page, 0, 0, W, H);
    const st = this.riderState(c, t, lt, ld, reprise), film = this;
    const g = { ctx, M, t, lt, u: lt / c.dur, ld, X: st.x, W, H, ground: st.ground, chapter: c, film, boil: st.boil, st,
      at(z, fn) { ctx.save(); ctx.translate(-ld * z, 0); fn(ctx); ctx.restore(); },
      screen(fn) { ctx.save(); fn(ctx); ctx.restore(); } };
    const layer = L => ctx.drawImage(L.cv, L.x0 - ld * L.z, 0, L.w, L.h);
    for (const L of P.layers) if (!L.front && L.z <= 1) layer(L);
    if (c.back) c.back(g);
    ctx.save(); ctx.translate(-ld, 0); g.J = Rider.draw(ctx, M, this.rider, st); ctx.restore();
    for (const L of P.layers) if (L.front || L.z > 1) layer(L);
    if (c.front) c.front(g);
    if (!this.off.has('texture')) M.post(ctx, W, H, this.seed + i * 13 + (st.boil % 3));
    ctx.restore();
    this.last = { i, J: g.J, st, ld, c };
    return g;
  }
  /** the torn edge of the incoming page at progress u (screen space) */
  edge(tr, u) {
    const W = this.W, H = this.H, s = tr.b * 31 + 7, base = W + 90 - (W + 220) * ease.sine(u), P = [];
    for (let i = 0, y = -30; y <= H + 30; y += 12, i++) P.push([base + 38 * n1(y / 210, s) + 9 * (hash(i, s) - .5) * 2 + (y - H / 2) * .07, y]);
    return P;
  }
  frame(t) {
    t = clamp(t, 0, this.dur - 1e-4);
    const ctx = this.ctx, S = this.S; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    Rider.audit.length = 0;
    const tr = this.tears.find(r => t >= r.t0 && t < r.t1);
    if (!tr) { const i = t >= this.dur - this.tear ? 0 : this.locate(t); this.drawChapter(ctx, i, t); }
    else {
      const u = (t - tr.t0) / (tr.t1 - tr.t0);
      this.drawChapter(ctx, tr.a, t);
      const aRules = [...Rider.audit];
      this.bctx.setTransform(1, 0, 0, 1, 0, 0); this.drawChapter(this.bctx, tr.b, t, tr.reprise);
      const E = this.edge(tr, u), W = this.W, H = this.H, region = [...E, [W + 400, H + 40], [W + 400, -40]];
      const paper = this.chapters[tr.b].M.paper, rimCol = mix(paper, '#fbf8f0', lumOf(paper) < .4 ? .55 : .7);
      const rim = E.map(([x, y], k) => [x - (7 + 9 * (hash(k, tr.b) * .6 + .4 * (n1(y / 40, tr.b) * .5 + .5))), y]);
      ctx.save(); ctx.setTransform(S, 0, 0, S, 0, 0);
      ctx.save(); ctx.shadowColor = 'rgba(20,16,10,.42)'; ctx.shadowBlur = 26 * S; ctx.shadowOffsetX = -7 * S; ctx.fillStyle = rimCol; ctx.beginPath(); poly(ctx, [...rim, [W + 400, H + 40], [W + 400, -40]]); ctx.fill(); ctx.restore();
      ctx.save(); ctx.beginPath(); poly(ctx, region); ctx.clip(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.buf, 0, 0); ctx.restore();
      ctx.fillStyle = rimCol; ctx.beginPath(); poly(ctx, [...E, ...rim.slice().reverse()]); ctx.fill();
      ctx.strokeStyle = rgba(shade(rimCol, -.25), .5); ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < rim.length; k++) { const [x, y] = rim[k], L = 3 + hash(k, 5) * 7; ctx.moveTo(x, y); ctx.lineTo(x - L, y + (hash(k, 6) - .5) * 6); } ctx.stroke();
      ctx.restore();
      // the rider is checked on whichever page shows it
      const hub = this.last.J.world.rearHub[0] - this.last.ld;
      if (hub < Math.min(...E.map(p => p[0])) - 40) { Rider.audit.length = 0; Rider.audit.push(...aRules); }
    }
    this.grade(t);
  }
  grade(t) {
    const P = this.post, ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (P.vignette && !this.off.has('vignette')) { const g = ctx.createRadialGradient(cw / 2, ch / 2, ch * .45, cw / 2, ch / 2, Math.hypot(cw, ch) * .62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(30,24,16,${P.vignette})`); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); }
    if (P.grain && !this.off.has('grain')) { const f = Math.floor(t * 12), tile = this.grainTiles[f % 3], ox = Math.floor(hash(f, 1) * 256), oy = Math.floor(hash(f, 2) * 256); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = P.grain; for (let y = -oy; y < ch; y += 256) for (let x = -ox; x < cw; x += 256) ctx.drawImage(tile, x, y); ctx.globalAlpha = 1; }
    ctx.globalCompositeOperation = 'source-over';
  }

  /** what the score needs to know about the ride (scores are functions of this: lib/score.js arrange) */
  info() {
    const coast = []; let a = null;
    for (let k = 0; k < this.tab.N && k * DT <= this.dur; k++) { const c = this.tab.cad[k] < .5, t = k * DT; if (c && a === null) a = t; if (!c && a !== null) { coast.push([a, t]); a = null; } }
    if (a !== null) coast.push([a, this.dur]);
    return { dur: this.dur, tear: this.tear, tears: this.tears.map(r => r.t0), coast,
      chapters: this.chapters.map(c => ({ name: c.name, start: c.start, dur: c.dur, mood: c.mood, medium: c.M.name, gestures: c.gestures, sound: c.sound })) };
  }
  start() {
    this.build();
    if (typeof this.score === 'function') this.score = this.score(this.info());
    const W = this.W, H = this.H;
    this.shots = this.chapters.map(c => ({ name: c.name, start: c.start, dur: c.dur, medium: c.M.name, mood: c.mood }));
    window.DURATION = +this.dur.toFixed(3); window.FPS = this.FPS; window.SIZE = { W, H }; window.film = this;
    window.seek = t => this.frame(t);
    window.runChecks = t => {
      const out = [...this.gestureIssues, ...new Set(Rider.audit)];
      const L = this.last; if (L && L.J) {
        const w = L.J.world, g = L.st.ground, R = this.rider.R || 70;
        for (const [hub, con, nm] of [[w.rearHub, w.rearContact, 'rear'], [w.frontHub, w.frontContact, 'front']]) { const gap = Math.abs(hub[1] + R - g(con[0])); if (gap > 3) out.push(`wheels: ${nm} wheel ${gap.toFixed(1)} px off the road`); }
        const sx = w.hd[0] - L.ld; if (sx < 60 || sx > W - 60 || w.hd[1] < 40) out.push('rider: head out of frame');
      }
      for (const r of this.rules) { try { if (!r.fn(t)) out.push(r.name); } catch { out.push(r.name); } }
      return out;
    };
    window.shotAt = t => { const i = t >= this.dur - this.tear ? 0 : this.locate(t); return { i, name: this.chapters[i].name, lt: t - this.chapters[i].start, medium: this.chapters[i].M.name }; };
    window.riderAt = t => { this.frame(t); const L = this.last; return { ...L.J.world, breath: L.J.breath, crank: L.st.crank, wheel: L.st.wheel, gesture: L.st.gesture, coast: L.st.coast, foot: L.J.numbers.foot, ld: L.ld }; };
    const st = document.createElement('style');
    st.textContent = `html,body{margin:0;height:100%;background:#1d1b18;overflow:hidden}canvas{display:block;width:100vw;height:100vh;object-fit:contain}
      .tpj-ui{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;gap:10px;padding:8px 12px;font:12px/1.2 system-ui,sans-serif;color:#f2ecdc;background:linear-gradient(transparent,rgba(0,0,0,.55));opacity:0;transition:opacity .3s}
      body:hover .tpj-ui,.tpj-ui.on{opacity:1}.tpj-ui button{all:unset;cursor:pointer;padding:4px 8px;border:1px solid rgba(255,255,255,.35);border-radius:4px}
      .tpj-bar{flex:1;height:14px;cursor:pointer;position:relative}.tpj-bar i{position:absolute;left:0;top:6px;height:2px;background:#f0d58a}.tpj-bar:before{content:"";position:absolute;left:0;right:0;top:6px;height:2px;background:rgba(255,255,255,.25)}
      .tpj-bar b{position:absolute;top:3px;width:1px;height:8px;background:rgba(255,255,255,.5)}`;
    document.head.appendChild(st);
    if (this.q.has('t')) this.frame(+this.q.get('t'));
    else if (this.render) this.frame(0);
    else this.live();
    window.__ready = true;
  }
  live() {
    let t0 = performance.now(), base = 0, paused = false, ac = null, src = null, buffer = null, loading = false;
    const ui = document.createElement('div'); ui.className = 'tpj-ui';
    ui.innerHTML = `<button data-k="play">❚❚</button>${this.score ? '<button data-k="snd">♪ sound</button>' : ''}<div class="tpj-bar"><i></i>${this.chapters.slice(1).map(c => `<b style="left:${c.start / this.dur * 100}%"></b>`).join('')}</div><span class="tm"></span>`;
    document.body.appendChild(ui);
    const bar = ui.querySelector('.tpj-bar'), fill = bar.querySelector('i'), tm = ui.querySelector('.tm'), pb = ui.querySelector('[data-k=play]'), sb = ui.querySelector('[data-k=snd]');
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
    let lastF = -1, warm = -1;
    const loop = () => {
      const t = now(), fi = Math.floor(t * this.FPS), i = this.locate(t);
      if (!paused && fi !== lastF) { this.frame(fi / this.FPS); lastF = fi; }
      if (warm !== i) { warm = i; const nx = (i + 1) % this.chapters.length; (window.requestIdleCallback || setTimeout)(() => this.platesFor(this.chapters[nx])); }   // paint the next page before it arrives
      fill.style.width = (t / this.dur * 100) + '%'; tm.textContent = `${t.toFixed(1)} / ${this.dur.toFixed(0)} s · ${this.chapters[i].name} · ${this.chapters[i].M.name}`;
      requestAnimationFrame(loop);
    };
    loop();
  }
}
function poly(ctx, P) { ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); }
function lumOf(c) { const s = c.replace('#', ''); const r = parseInt(s.slice(0, 2), 16), g = parseInt(s.slice(2, 4), 16), b = parseInt(s.slice(4, 6), 16); return (.299 * r + .587 * g + .114 * b) / 255; }
export { MEDIA, Rider };
