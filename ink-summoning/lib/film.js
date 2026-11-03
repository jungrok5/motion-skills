// ink-summoning · film.js — the runtime: shots on a timeline, an orbit camera per shot, the world built fresh every
// frame (pure function of t), the studio + its mirrored reflection on the glossy floor, depth-sliced ink so a ring of
// ink passes in front of AND behind the figure it circles, motion blur by sub-frame accumulation, the monochrome grade,
// live playback with sound, and the render contract.
//
//   const F = new Film({ seed: 7, score: SCORE });
//   F.shot(2.4, (w, lt) => {                         // w = this frame's world; lt = seconds into the shot
//     w.summoner(hero);                              // a figure (solid: depth-sorted)
//     w.trace(hero, .3, 1.2, { w: .5, seed: 4 });    // the ink its brush lays between lt .3 and 1.2
//     w.beast(tiger);  w.puffs(I.billow(lt, {...}));  w.drops(...);  w.floorInk(ribbon);  w.shadow(x, z, r)
//   }, { cam: [{ t: 0, at: [0, 1.2, 0], yaw: .3, pitch: .1, dist: 6, fov: 40 }, { t: 2.4, yaw: .6 }], mb: .5 });
//   F.start();
import { keys, hash, noise2, clamp, ease, rgba, rng, sn, v3, lerp } from './core.js';
import { view, studio, floor, fresnel, tracePoly, ROOM } from './space.js';
import { drawRibbon, drawPuffs, drawDrops, drawSplats, smokeSprites, ribbon } from './ink.js';
import { drawSummoner } from './summoner.js';
import { renderScore } from './score.js';

let UID = 0;
const POST = {
  bloom: .3, bloomR: 22,           // glow of the light slots and the white floor
  tint: '#a7b4c2', tintA: .14,     // soft-light cool steel tint (high-key monochrome)
  contrast: 1.06, sat: .35,        // a gentle curve; colour nearly gone
  vignette: .28, grain: .05,
  reflect: .55, reflectBlur: 3,  // glossy floor: reflection strength at the horizon, blur (stage px)
};

export class Film {
  constructor(o = {}) {
    const q = new URLSearchParams(location.search);
    this.q = q; this.render = q.has('render'); this.W = o.W || 1920; this.H = o.H || 1080; this.FPS = o.fps || 30;
    this.off = new Set((q.get('off') || '').split(',').filter(Boolean));
    this.S = +(q.get('scale') || (this.render ? 1 : Math.min(1, Math.max(.5, (innerWidth * devicePixelRatio) / this.W))));
    this.mbN = q.has('mb') ? +q.get('mb') : (this.render ? (o.mbSamples || 7) : 1);
    this.post = { ...POST, ...(o.post || {}) }; this.room = { ...ROOM, ...(o.room || {}) };
    this.score = o.score || null; this.title = o.title || document.title; this.renderScore = renderScore;
    this.shots = []; this.rules = []; this.dur = 0; this.cache = new Map();
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; };
    this.mk = mk;
    const cw = this.W * this.S, ch = this.H * this.S;
    this.canvas = mk(cw, ch); this.ctx = this.canvas.getContext('2d');
    for (const k of ['buf', 'refl', 'acc', 'tmp', 'prev']) { this[k] = mk(cw, ch); this[k + 'X'] = this[k].getContext('2d'); }
    this.small = mk(cw / 4, ch / 4); this.smallX = this.small.getContext('2d');
    this.smoke = smokeSprites(mk, o.seed || 5);
    const R = rng(o.seed || 1); this.grainTiles = [0, 1, 2, 3].map(() => {
      const c = mk(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256);
      for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (R() + R() + R() - 1.5) * 120; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      x.putImageData(d, 0, 0); return c;
    });
    document.body.appendChild(this.canvas);
  }

  // dur seconds; draw(w, lt, u). o.cam: keys [{t, at:[x,y,z], yaw, pitch, dist, fov, roll}] or a function lt → cam.
  // o.mb: shutter (fraction of a frame, 0 = no blur, 1 = full frame; whip pans want 1–2). o.shake: lt → radians.
  // o.tr: { type: 'white' | 'black' | 'dissolve', d } — the transition INTO this shot. o.room: overrides for this shot.
  shot(dur, draw, o = {}) {
    this.shots.push({ dur, draw, cam: o.cam || [{ t: 0 }], shake: o.shake, tr: o.tr || null, mb: o.mb ?? .5, room: o.room ? { ...this.room, ...o.room } : this.room, name: o.name || 'shot ' + (this.shots.length + 1), start: this.dur, dof: o.dof || 0 });
    this.dur += dur; return this;
  }
  check(name, fn) { this.rules.push({ name, fn }); }
  locate(t) { let i = 0; while (i < this.shots.length - 1 && t >= this.shots[i + 1].start) i++; return i; }
  memo(key, fn) { let v = this.cache.get(key); if (v === undefined) { v = fn(); this.cache.set(key, v); } return v; }

  camAt(sh, lt) {
    let c;
    if (typeof sh.cam === 'function') c = sh.cam(lt);
    else {
      const K = sh.cam.map(k => ({ ...k, ax: k.at?.[0], ay: k.at?.[1], az: k.at?.[2] }));
      c = { at: [keys(K, lt, 'ax', 0), keys(K, lt, 'ay', 1.2), keys(K, lt, 'az', 0)], yaw: keys(K, lt, 'yaw', 0), pitch: keys(K, lt, 'pitch', .1), dist: keys(K, lt, 'dist', 6), fov: keys(K, lt, 'fov', 40), roll: keys(K, lt, 'roll', 0) };
    }
    const a = sh.shake ? sh.shake(lt) : 0;
    if (a) { c = { ...c, yaw: c.yaw + sn(lt * 13, 3.1) * a, pitch: c.pitch + sn(lt * 13, 7.7) * a * .7, roll: (c.roll || 0) + sn(lt * 9, 1.3) * a * .5 }; }
    return c;
  }

  // ---------- the world of one frame ----------
  world(sh, lt) {
    const film = this, items = { solids: [], inks: [], puffs: [], drops: [], floor: [], splats: [], shadows: [] };
    const w = {
      t: lt, lt, u: lt / sh.dur, dur: sh.dur, film, items,
      summoner(S, o = {}) { items.solids.push({ at: r => r.chest, S, t: o.t ?? lt, kind: 'summoner', o }); if (o.shadow !== false) { const r = S.rig(o.t ?? lt); items.shadows.push({ p: [r.pelvis[0], 0, r.pelvis[2]], r: .75, a: .34 * clamp(1 - r.p.jump * 1.2) }); } return S; },
      beast(B, o = {}) { const st = B.state(o.t ?? lt); items.solids.push({ B, st, kind: 'beast', o }); if (B.shadow) for (const s of B.shadow(st)) items.shadows.push(s); return st; },
      solid(at, draw) { items.solids.push({ kind: 'custom', at, draw }); },
      ink(rb, o = {}) { (rb.flat ? items.floor : items.inks).push({ rb, o }); return rb; },
      // the ribbon a summoner's brush lays between t0 and t1 (shot time). o: ribbon look + trace options (reach, lift,
      // floor) + fade: { at, d } (evaporate after) — it grows as lt passes t0 … t1.
      trace(S, t0, t1, o = {}) {
        const key = `tr|${S.id || (S.id = 's' + (++UID))}|${t0}|${t1}|${o.reach || 0}|${o.lift || 0}|${o.seed || 0}|${o.n || 0}`;
        const rb = film.memo(key, () => { const tr = S.trace(t0, t1, o); return ribbon(tr.pts, tr.wid, o); });
        const head = clamp((lt - t0) / (t1 - t0)), fade = o.fade ? clamp((lt - o.fade.at) / o.fade.d) : 0;
        if (head > 0) items.inks.push({ rb, o: { head, fade } });
        return rb;
      },
      floorInk(rb, o = {}) { rb.flat = true; items.floor.push({ rb, o }); return rb; },
      puffs(list) { items.puffs.push(...list); },
      drops(d) { items.drops.push(...d.air); items.splats.push(...d.floor); },
      splats(list) { items.splats.push(...list); },
      shadow(p, r, a = .3) { items.shadows.push({ p, r, a }); },
    };
    sh.draw(w, lt, lt / sh.dur);
    return items;
  }

  drawItems(ctx, v, it) {
    // solids sorted far → near; ink, smoke and drops are drawn slab by slab between them
    const sol = it.solids.map(s => {
      let z;
      if (s.kind === 'summoner') z = v.depth(s.S.rig(s.t).chest);
      else if (s.kind === 'beast') z = v.depth(s.B.center(s.st));
      else z = v.depth(s.at);
      return { ...s, z };
    }).sort((a, b) => b.z - a.z);
    const bounds = [1e9, ...sol.map(s => s.z), -1e9];
    for (let k = 0; k < bounds.length - 1; k++) {
      const zmax = bounds[k], zmin = bounds[k + 1];
      for (const i of it.inks) drawRibbon(ctx, v, i.rb, { ...i.o, zmin, zmax });
      drawPuffs(ctx, v, it.puffs, this.smoke, { zmin, zmax });
      drawDrops(ctx, v, it.drops, { zmin, zmax });
      const s = sol[k]; if (!s) continue;
      if (s.kind === 'summoner') drawSummoner(ctx, v, s.S, s.t, s.o);
      else if (s.kind === 'beast') s.B.draw(ctx, v, s.st, this);
      else s.draw(ctx, v);
    }
  }

  drawShot(ctx, i, lt) {
    const sh = this.shots[i], S = this.S, W = this.W, H = this.H, R = sh.room;
    const it = this.world(sh, lt), cam = this.camAt(sh, lt), v = view(cam, W, H), m = v.mirror();
    // reflection: the studio and the world seen in the floor
    const rx = this.reflX; rx.setTransform(1, 0, 0, 1, 0, 0); rx.clearRect(0, 0, this.refl.width, this.refl.height); rx.setTransform(S, 0, 0, S, 0, 0);
    if (!this.off.has('reflect')) { studio(rx, m, R); this.drawItems(rx, m, it); }
    ctx.save(); ctx.setTransform(S, 0, 0, S, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.fillStyle = R.ceil; ctx.fillRect(0, 0, W, H);
    if (sh.dof && !this.off.has('dof')) {
      const tx = this.tmpX; tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, this.tmp.width, this.tmp.height); tx.setTransform(S, 0, 0, S, 0, 0); studio(tx, v, R);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = `blur(${sh.dof * S}px)`; ctx.drawImage(this.tmp, 0, 0); ctx.restore();
    } else studio(ctx, v, R);
    const fs = floor(ctx, v, R);
    if (fs) {
      ctx.save(); ctx.beginPath(); tracePoly(ctx, fs); ctx.clip();
      if (!this.off.has('reflect')) {
        // Fresnel: strongest at the horizon; blurred like a polished (not mirror) floor
        rx.setTransform(S, 0, 0, S, 0, 0); rx.globalCompositeOperation = 'destination-in'; rx.fillStyle = fresnel(rx, v, .35, 1); rx.fillRect(0, 0, W, H); rx.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = this.post.reflect; ctx.filter = `blur(${this.post.reflectBlur * S}px)`; ctx.drawImage(this.refl, 0, 0); ctx.restore();
      }
      // contact shadows, then ink lying on the floor and the splats
      for (const s of it.shadows) shadowOn(ctx, v, s);
      for (const f of it.floor) drawRibbon(ctx, v, f.rb, f.o);
      drawSplats(ctx, v, it.splats);
      ctx.restore();
    }
    this.drawItems(ctx, v, it);
    ctx.restore();
    return v;
  }

  frame(t) {
    t = clamp(t, 0, this.dur - 1e-4);
    const ctx = this.ctx, i = this.locate(t), sh = this.shots[i], lt = t - sh.start, W = this.W, H = this.H, S = this.S, cw = this.canvas.width, ch = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    const N = sh.mb > 0 && !this.off.has('mb') ? Math.max(1, this.mbN) : 1;
    if (N > 1) {
      // motion blur: average N sub-frames spread over the shutter (centred on t), never crossing the shot's edges
      const ax = this.accX, span = sh.mb / this.FPS; ax.setTransform(1, 0, 0, 1, 0, 0); ax.globalAlpha = 1;
      for (let k = 0; k < N; k++) {
        const st = clamp(lt + (k / (N - 1) - .5) * span, 0, sh.dur - 1e-4);
        this.drawShot(this.bufX, i, st);
        ax.globalAlpha = 1 / (k + 1); ax.drawImage(this.buf, 0, 0);
      }
      ctx.drawImage(this.acc, 0, 0);
    } else this.drawShot(ctx, i, lt);
    // transitions
    const tr = sh.tr, nx = this.shots[i + 1];
    if (tr && i > 0 && tr.type === 'dissolve' && lt < tr.d) {
      const p = this.shots[i - 1]; this.drawShot(this.prevX, i - 1, Math.min(p.dur - 1e-4, p.dur - .001 + lt * 0));
      ctx.globalAlpha = 1 - ease.sine(lt / tr.d); ctx.drawImage(this.prev, 0, 0); ctx.globalAlpha = 1;
    }
    const flash = (tr2, k) => { ctx.fillStyle = rgba(tr2.type === 'white' ? (tr2.col || '#ffffff') : '#060607', ease.sine(k)); ctx.fillRect(0, 0, cw, ch); };
    if (tr && i > 0 && (tr.type === 'white' || tr.type === 'black') && lt < tr.d / 2) flash(tr, 1 - lt / (tr.d / 2));
    if (nx && nx.tr && (nx.tr.type === 'white' || nx.tr.type === 'black') && sh.dur - lt < nx.tr.d / 2) flash(nx.tr, 1 - (sh.dur - lt) / (nx.tr.d / 2));
    if (i === 0 && this.fadeIn && lt < this.fadeIn) flash({ type: this.fadeCol || 'white' }, 1 - lt / this.fadeIn);
    if (!nx && this.fadeOut && sh.dur - lt < this.fadeOut) flash({ type: 'black' }, 1 - (sh.dur - lt) / this.fadeOut);
    this.grade(t);
  }

  grade(t) {
    const P = this.post, ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height, off = this.off;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    if (!off.has('grade')) {
      const tx = this.tmpX; tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'copy'; tx.filter = `contrast(${P.contrast}) saturate(${P.sat})`; tx.drawImage(this.canvas, 0, 0); tx.filter = 'none'; tx.globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'copy'; ctx.drawImage(this.tmp, 0, 0); ctx.globalCompositeOperation = 'source-over';
    }
    if (P.bloom && !off.has('bloom')) {
      const s = this.smallX, sw = this.small.width, sh = this.small.height;
      s.globalCompositeOperation = 'copy'; s.filter = `brightness(1.1) contrast(2.4) blur(${P.bloomR * this.S / 4}px)`; s.drawImage(this.canvas, 0, 0, sw, sh); s.filter = 'none';
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = P.bloom; ctx.drawImage(this.small, 0, 0, cw, ch); ctx.globalAlpha = 1;
    }
    if (!off.has('grade') && P.tintA) { ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = rgba(P.tint, P.tintA * 3); ctx.fillRect(0, 0, cw, ch); }
    if (P.vignette && !off.has('vignette')) {
      const g = ctx.createRadialGradient(cw / 2, ch / 2, ch * .4, cw / 2, ch / 2, Math.hypot(cw, ch) * .6);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(20,24,30,${P.vignette})`);
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    }
    if (P.grain && !off.has('grain')) {
      const f = Math.round(t * this.FPS), tile = this.grainTiles[f % 4], ox = Math.floor(hash(f, 1) * 256), oy = Math.floor(hash(f, 2) * 256);
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
    window.runChecks = t => this.rules.filter(r => { try { return !r.fn(t); } catch { return true; } }).map(r => r.name);
    window.shotAt = t => { const i = this.locate(t); return { i, name: this.shots[i].name, lt: t - this.shots[i].start }; };
    const st = document.createElement('style');
    st.textContent = `html,body{margin:0;height:100%;background:#0b0c0d;overflow:hidden}canvas{display:block;width:100vw;height:100vh;object-fit:contain}
      .ink-ui{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;gap:10px;padding:8px 12px;font:12px/1.2 system-ui,sans-serif;color:#f1f2f3;background:linear-gradient(transparent,rgba(0,0,0,.55));opacity:0;transition:opacity .3s}
      body:hover .ink-ui,.ink-ui.on{opacity:1}.ink-ui button{all:unset;cursor:pointer;padding:4px 8px;border:1px solid rgba(255,255,255,.35);border-radius:4px}
      .ink-bar{flex:1;height:14px;cursor:pointer;position:relative}.ink-bar i{position:absolute;left:0;top:6px;height:2px;background:#fff}.ink-bar:before{content:"";position:absolute;left:0;right:0;top:6px;height:2px;background:rgba(255,255,255,.25)}`;
    document.head.appendChild(st);
    if (this.q.has('t')) this.frame(+this.q.get('t'));
    else if (this.render) this.frame(0);
    else this.live();
    window.__ready = true;
  }
  live() {
    let t0 = performance.now(), base = 0, paused = false, ac = null, src = null, buffer = null, loading = false;
    const ui = document.createElement('div'); ui.className = 'ink-ui';
    ui.innerHTML = `<button data-k="play">❚❚</button>${this.score ? '<button data-k="snd">♪ sound</button>' : ''}<div class="ink-bar"><i></i></div><span class="tm"></span>`;
    document.body.appendChild(ui);
    const bar = ui.querySelector('.ink-bar'), fill = bar.querySelector('i'), tm = ui.querySelector('.tm'), pb = ui.querySelector('[data-k=play]'), sb = ui.querySelector('[data-k=snd]');
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
    const loop = () => {
      const t = now(); if (!paused) this.frame(t);
      fill.style.width = (t / this.dur * 100) + '%'; tm.textContent = `${t.toFixed(1)} / ${this.dur.toFixed(0)} s · ${this.shots[this.locate(t)].name}`;
      requestAnimationFrame(loop);
    };
    loop();
  }
}

// a soft contact shadow lying on the floor: concentric projected discs
function shadowOn(ctx, v, s) {
  const n = 18;
  for (const [k, a] of [[1, .25], [.7, .35], [.42, .5]]) {
    const pts = []; for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2; pts.push([s.p[0] + Math.cos(an) * s.r * k * (s.sx || 1), .001, s.p[2] + Math.sin(an) * s.r * k * (s.sz || 1)]); }
    const q = v.poly(pts); if (!q) continue;
    ctx.fillStyle = `rgba(30,32,36,${s.a * a})`; ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (const p of q) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill();
  }
}
