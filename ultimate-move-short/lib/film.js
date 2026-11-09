// ultimate-move-short · film.js — the runtime: shots on a timeline, a camera per shot (orbit or placed) with impact shake
// and FOV punches, hit-stop (the action freezes while the camera keeps shaking), the world of one frame built fresh and
// drawn far → near, impact frames (invert · black · white · accent burst), the shear that cuts the whole frame along a
// line and slides the halves apart, motion blur by sub-frames, the grade, live playback with sound, the render contract.
//
//   const F = new Film({ seed: 7, score: SCORE, accent: '#e0142d', env: { far: 'pillars' } });
//   F.shot(2.4, (w, lt, u) => {                  // w = this frame's world; lt = content seconds into the shot
//     w.fighter(H);  w.ink(H, { span: .4 });  w.smear(H, .3, .6, { red: true });
//     w.add(z, ctx => …) · w.at(point, ctx => …) · w.screen(ctx => …) · w.top(ctx => …) · w.shear({ … })
//   }, { cam: [{ t: 0, at: [0, 1.1, 0], yaw: .3, pitch: .05, dist: 5, fov: 40 }, { t: 2.4, yaw: .6 }],
//        hits: [{ t: .8, a: 18, d: .35 }], holds: [[.8, .12]], mb: .6, env: { dark: 0 } });
//   F.env.cracks.push({ crack: groundCrack(…), t0, d, until })   a crack that grows at film time t0 over d s, gone at until
//   w.shear({ y, dx, angle } | { bands: [{ y0, y1, dx }], zoom: 1.2 })  the frame cut along lines, slid apart (zoomed so no edge shows)
//   F.impact(3.2, .1, 'invert')                  // film time, duration, type ('invert' | 'black' | 'white' | 'burst' | 'flash')
//   F.start();
import { keys, hash, clamp, ease, rgba, rng, sn, v3, lerp, mix, TAU } from './core.js';
import { view } from './cam.js';
import { env as mkEnv, drawEnv, drawCrack } from './world.js';
import { drawFighter } from './fighter.js';
import { inkShadow, flecks } from './ink.js';
import { smear as smearFx, burst } from './fx.js';
import { renderScore } from './score.js';

const POST = { inkBlur: 1.1, contrast: 1.04, sat: .92, tint: '#b9c2cc', tintA: .06, vignette: .22, grain: .045, paper: .05 };

export class Film {
  constructor(o = {}) {
    const q = new URLSearchParams(location.search);
    this.q = q; this.render = q.has('render'); this.W = o.W || 1920; this.H = o.H || 1080; this.FPS = o.fps || 30;
    this.off = new Set((q.get('off') || '').split(',').filter(Boolean));
    this.S = +(q.get('scale') || (this.render ? 1 : Math.min(1, Math.max(.5, (innerWidth * devicePixelRatio) / this.W))));
    this.mbN = q.has('mb') ? +q.get('mb') : (this.render ? (o.mbSamples || 5) : 1);
    this.post = { ...POST, ...(o.post || {}) }; this.accent = o.accent || '#e0142d';
    this.env = mkEnv(o.env || {}); this.score = o.score || null; this.renderScore = renderScore; this.title = o.title || document.title;
    this.shots = []; this.rules = []; this.impacts = []; this.dur = 0; this.cache = new Map(); this.fadeIn = o.fadeIn ?? 0; this.fadeOut = o.fadeOut ?? 0;
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; };
    this.mk = mk;
    const cw = this.W * this.S, ch = this.H * this.S;
    this.canvas = mk(cw, ch); this.ctx = this.canvas.getContext('2d');
    for (const k of ['buf', 'acc', 'tmp', 'snap', 'sil', 'lay']) { this[k] = mk(cw, ch); this[k + 'X'] = this[k].getContext('2d'); }
    const R = rng(o.seed || 1);
    this.grainTiles = [0, 1, 2, 3].map(() => { const c = mk(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (R() + R() + R() - 1.5) * 120; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; });
    // paper: a large soft mottle, fixed to the frame (like the texture of the drawing paper)
    this.paper = (() => { const c = mk(512, 288), x = c.getContext('2d'), d = x.createImageData(512, 288); for (let j = 0; j < 288; j++) for (let i = 0; i < 512; i++) { const n = (Math.sin(i * .05 + Math.sin(j * .07) * 2) + Math.sin(j * .043 + Math.sin(i * .031) * 3)) * .25 + (R() - .5) * .5; const v = 128 + n * 60, k = (j * 512 + i) * 4; d.data[k] = d.data[k + 1] = d.data[k + 2] = v; d.data[k + 3] = 255; } x.putImageData(d, 0, 0); return c; })();
    document.body.appendChild(this.canvas);
  }

  // dur seconds; draw(w, lt, u). o: cam keys | function, hits [{t, a (px), d, roll, fov}], holds [[t, d]] hit-stop,
  // mb shutter (0 off … 1.5 whip; or lt → shutter — keep it low on fast camera moves or the sub-frames strobe), step (drawings per second, e.g. 12 = "on twos"; camera stays smooth), env overrides,
  // tr: { type: 'cut' | 'white' | 'black' | 'flash', d } transition INTO this shot, name
  shot(dur, draw, o = {}) {
    this.shots.push({ dur, draw, cam: o.cam || [{ t: 0 }], hits: o.hits || [], holds: o.holds || [], mb: o.mb ?? .5, step: o.step || 0, env: o.env || {}, tr: o.tr || null, name: o.name || 'shot ' + (this.shots.length + 1), start: this.dur });
    this.dur += dur; return this;
  }
  impact(t, d, type = 'invert', o = {}) { this.impacts.push({ t, d, type, ...o }); return this; }
  check(name, fn) { this.rules.push({ name, fn }); }
  locate(t) { let i = 0; while (i < this.shots.length - 1 && t >= this.shots[i + 1].start) i++; return i; }
  memo(key, fn) { let v = this.cache.get(key); if (v === undefined) { v = fn(); this.cache.set(key, v); } return v; }
  // content time inside a shot: hit-stop holds freeze it
  content(sh, lt) { let c = lt; for (const [t, d] of sh.holds) c -= clamp(lt - t, 0, d); if (sh.step) c = Math.floor(c * sh.step + 1e-6) / sh.step; return c; }

  camAt(sh, lt) {
    let c;
    if (typeof sh.cam === 'function') c = { ...sh.cam(lt) };
    else {
      const K = sh.cam.map(k => ({ ...k, ax: k.at?.[0], ay: k.at?.[1], az: k.at?.[2], px: k.pos?.[0], py: k.pos?.[1], pz: k.pos?.[2] }));
      c = { at: [keys(K, lt, 'ax', 0), keys(K, lt, 'ay', 1.2), keys(K, lt, 'az', 0)], yaw: keys(K, lt, 'yaw', 0), pitch: keys(K, lt, 'pitch', .05), dist: keys(K, lt, 'dist', 6), fov: keys(K, lt, 'fov', 40), roll: keys(K, lt, 'roll', 0), sx: keys(K, lt, 'sx', 0), sy: keys(K, lt, 'sy', 0) };
      if (K.some(k => k.pos)) c.pos = [keys(K, lt, 'px', 0), keys(K, lt, 'py', 1.5), keys(K, lt, 'pz', 6)];
    }
    // impact shake: a decaying jolt (screen px + a little roll) and an optional FOV punch
    for (const h of sh.hits) {
      const a = lt - h.t; if (a < 0 || a > (h.d ?? .35)) continue;
      const k = Math.pow(1 - a / (h.d ?? .35), 2), amp = (h.a ?? 14) * k;
      c.sx = (c.sx || 0) + sn(a * 38, h.t * 7) * amp; c.sy = (c.sy || 0) + sn(a * 41, h.t * 7 + 3) * amp * .8;
      c.roll = (c.roll || 0) + sn(a * 23, h.t * 5) * (h.roll ?? .012) * k;
      if (h.fov) c.fov += h.fov * ease.out(clamp(a / .04)) * k;
    }
    return c;
  }

  // ---------- the world of one frame ----------
  world(sh, lt, ct) {
    const film = this, items = [], screen = [], top = [], post = { shear: null, envOver: {} };
    const w = {
      t: ct, lt: ct, real: lt, u: ct / sh.dur, dur: sh.dur, film, accent: this.accent, E: this.env,
      add(z, f) { items.push({ z, f }); },
      at(p, f, dz = 0) { items.push({ p, f, dz }); },
      screen(f) { screen.push(f); }, top(f) { top.push(f); },
      env(o) { Object.assign(post.envOver, o); },
      shear(o) { post.shear = o; },
      // the fighter. o: { t (its own time), flat, alpha, outline (colour), outlineW, ghost: [dt…] afterimages, glow, edge }
      fighter(H, o = {}) {
        const tt = o.t ?? ct, r = H.rig(tt); (film._seen ||= []).push({ H, t: tt });
        items.push({ p: r.chest, dz: o.dz || 0, f: (ctx, v) => {
          if (o.ghosts) for (const g of o.ghosts) drawFighter(ctx, v, H, tt - g.dt, { flat: true, alpha: g.a ?? .5, tone: g.tone || '#0b0b0e', noCloth: g.noCloth });
          if (o.outline) film.outlined(ctx, v, H, tt, o); else drawFighter(ctx, v, H, tt, o);
        } });
        return r;
      },
      // the 墨影 trail behind the fighter (drawn just behind it)
      ink(H, o = {}) { const tt = o.t ?? ct, r = H.rig(tt); items.push({ p: r.chest, dz: .15 + (o.dz || 0), f: (ctx, v) => film.layer(ctx, o.alpha ?? 1, c => inkShadow(c, v, H, tt, { accent: film.accent, ...o, alpha: 1, red: o.red ? { col: film.accent, ...(typeof o.red === 'object' ? o.red : {}) } : null })) }); },
      // draw anything on a separate layer and lay it down at one opacity (fading ink without overlap seams)
      layer(z, alpha, draw) { const f = (ctx, v) => film.layer(ctx, alpha, c => draw(c, v)); items.push(Array.isArray(z) ? { p: z, f } : { z, f }); },     // z: a depth, or a world point
      // the blade's path from t0 to t1 as a smear (drawn just in front of the fighter)
      smear(H, t0, t1, o = {}) { const r = H.rig(Math.min(ct, t1)); items.push({ p: r.chest, dz: o.behind ? .1 : -.1, f: (ctx, v) => film.layer(ctx, 1, c => smearFx(c, v, H, t0, t1, ct, { ...o, red: o.red ? { col: film.accent, ...(typeof o.red === 'object' ? o.red : {}) } : null })) }); },
      // ink placed at a world point and laid down through the wet layer (slashes, splashes, plumes)
      inked(p, draw, dz = 0, alpha = 1) { items.push({ p, dz, f: (ctx, v) => film.layer(ctx, alpha, c => draw(c, v)) }); },
      flecks(list, o = {}) { items.push({ z: o.z ?? 1e5 - 1, f: (ctx, v) => flecks(ctx, v, list, ct, o) }); },
    };
    sh.draw(w, ct, ct / sh.dur);
    return { items, screen, top, post };
  }

  layer(ctx, alpha, draw, blur = this.post.inkBlur) {
    if (alpha <= 0) return;
    if (this.off.has('inkblur')) blur = 0;
    if (alpha >= 1 && !blur) { draw(ctx); return; }
    const L = this.layX, S = this.S; L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = 1; L.globalCompositeOperation = 'source-over'; L.clearRect(0, 0, this.lay.width, this.lay.height); L.setTransform(S, 0, 0, S, 0, 0);
    draw(L);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha; if (blur) ctx.filter = `blur(${blur * S}px)`; ctx.drawImage(this.lay, 0, 0); ctx.filter = 'none'; if (blur) { ctx.globalAlpha = alpha * .55; ctx.drawImage(this.lay, 0, 0); } ctx.restore();
  }

  // the fighter with a solid outline (a white halo on black, or a black halo on white)
  outlined(ctx, v, H, t, o) {
    const s = this.sil, sx = this.silX, S = this.S, ow = (o.outlineW ?? 3) * S;
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'source-over'; sx.clearRect(0, 0, s.width, s.height);
    sx.setTransform(S, 0, 0, S, 0, 0); drawFighter(sx, v, H, t, { flat: true, tone: '#000' });
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = o.outline; sx.fillRect(0, 0, s.width, s.height); sx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; ctx.drawImage(s, Math.cos(a) * ow, Math.sin(a) * ow); }
    ctx.restore();
    drawFighter(ctx, v, H, t, { ...o, flat: o.flatInside ?? o.flat });
  }

  drawShot(ctx, i, lt) {
    const sh = this.shots[i], S = this.S, W = this.W, H = this.H, ct = this.content(sh, lt);
    const wd = this.world(sh, lt, ct), cam = this.camAt(sh, lt), v = view(cam, W, H);
    const envO = { ...sh.env, ...wd.post.envOver };
    ctx.save(); ctx.setTransform(S, 0, 0, S, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    if (envO.bg) { ctx.fillStyle = envO.bg; ctx.fillRect(0, 0, W, H); } else drawEnv(ctx, v, this.env, envO);
    // permanent ground cracks registered on the env: { crack, t0, d } in film time
    if (!envO.bg && envO.cracks !== false) for (const c of this.env.cracks) { const ft = sh.start + ct; if (ft >= (c.until ?? 1e9)) continue; const g = clamp((ft - c.t0) / c.d); if (g > 0) drawCrack(ctx, v, c.crack, g, { alpha: (1 - clamp(envO.dark || 0)) * (c.alpha ?? 1) }); }
    const it = wd.items.map(x => ({ ...x, zz: x.z !== undefined ? x.z : v.depth(x.p) + (x.dz || 0) })).sort((a, b) => b.zz - a.zz);
    for (const x of it) { ctx.save(); x.f(ctx, v); ctx.restore(); }
    for (const f of wd.screen) { ctx.save(); f(ctx, v); ctx.restore(); }
    ctx.restore();
    return { v, wd, ct };
  }

  frame(t) {
    t = clamp(t, 0, this.dur - 1e-4);
    const ctx = this.ctx, i = this.locate(t), sh = this.shots[i], lt = t - sh.start, cw = this.canvas.width, ch = this.canvas.height, W = this.W, H = this.H, S = this.S;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    const mb = typeof sh.mb === 'function' ? sh.mb(lt) : sh.mb, N = mb > 0 && !this.off.has('mb') ? Math.max(1, this.mbN) : 1;
    let res;
    if (N > 1) {
      const ax = this.accX, span = mb / this.FPS; ax.setTransform(1, 0, 0, 1, 0, 0); ax.globalAlpha = 1;
      for (let k = 0; k < N; k++) {
        const st = clamp(lt + (k / (N - 1) - .5) * span, 0, sh.dur - 1e-4);
        const r = this.drawShot(this.bufX, i, st); if (k === (N >> 1)) res = r;
        ax.globalAlpha = 1 / (k + 1); ax.drawImage(this.buf, 0, 0);
      }
      ctx.drawImage(this.acc, 0, 0);
    } else res = this.drawShot(ctx, i, lt);
    // the shear: cut the frame along a line and slide the two sides apart (a world cut in two)
    const shr = res.wd.post.shear;
    if (shr && !this.off.has('shear')) this.shearFrame(shr);
    this.grade(t);
    // impact frames (film time)
    for (const im of this.impacts) if (t >= im.t && t < im.t + im.d) this.impactFrame(im, (t - im.t) / im.d);
    // transitions
    const tr = sh.tr, nx = this.shots[i + 1];
    const flash = (col, k) => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = rgba(col, clamp(k)); ctx.fillRect(0, 0, cw, ch); };
    if (tr && i > 0 && tr.type !== 'cut' && lt < tr.d) flash(tr.type === 'black' ? '#050506' : '#ffffff', 1 - lt / tr.d);
    if (i === 0 && this.fadeIn && lt < this.fadeIn) flash('#ffffff', 1 - lt / this.fadeIn);
    if (!nx && this.fadeOut && sh.dur - lt < this.fadeOut) flash('#ffffff', 1 - (sh.dur - lt) / this.fadeOut);
    // top layer: drawn over everything, impact frames included (the accent cut line)
    if (res.wd.top.length) { ctx.save(); ctx.setTransform(S, 0, 0, S, 0, 0); for (const f of res.wd.top) { ctx.save(); f(ctx, res.v); ctx.restore(); } ctx.restore(); }
  }

  shearFrame(o) {
    const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height, S = this.S, sx = this.snapX;
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'copy'; sx.drawImage(this.canvas, 0, 0); sx.globalCompositeOperation = 'source-over';
    // bands: [{ y0, y1 (stage px), dx }] or one cut { y, angle, dx, gap }
    const bands = o.bands || [{ y0: -1e4, y1: o.y, dx: -(o.dx || 0) }, { y0: o.y, y1: 1e4, dx: o.dx || 0 }];
    const ang = o.angle || 0;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = o.gapCol || '#ffffff'; ctx.fillRect(0, 0, cw, ch);
    for (const b of bands) {
      ctx.save(); ctx.beginPath();
      const y0 = b.y0 * S, y1 = b.y1 * S, tn = Math.tan(ang);
      const xc = cw / 2; ctx.moveTo(-cw, y0 + (-cw - xc) * tn); ctx.lineTo(cw * 2, y0 + (cw * 2 - xc) * tn); ctx.lineTo(cw * 2, y1 + (cw * 2 - xc) * tn); ctx.lineTo(-cw, y1 + (-cw - xc) * tn); ctx.closePath(); ctx.clip();
      const z = o.zoom ?? 1.2; ctx.drawImage(this.snap, (b.dx || 0) * S - cw * (z - 1) / 2, (b.dy || 0) * S - ch * (z - 1) / 2, cw * z, ch * z);
      ctx.restore();
    }
    ctx.restore();
  }

  impactFrame(im, k) {
    const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height, S = this.S;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over';
    if (im.type === 'invert') {          // a hard black-and-white negative of the frame
      const tx = this.tmpX; tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'copy'; tx.filter = `grayscale(1) contrast(${im.contrast ?? 6}) invert(1)`; tx.drawImage(this.canvas, 0, 0); tx.filter = 'none'; tx.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.tmp, 0, 0);
    } else if (im.type === 'black' || im.type === 'white') {
      const tx = this.tmpX; tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'copy';
      // silhouette version: dark things become a thin opposite-coloured line drawing on a flat field
      tx.filter = `grayscale(1) contrast(9) ${im.type === 'black' ? 'invert(1)' : ''}`; tx.drawImage(this.canvas, 0, 0); tx.filter = 'none'; tx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = im.type === 'black' ? '#030304' : '#fbfbf9'; ctx.fillRect(0, 0, cw, ch);
      if (im.keep !== false) { ctx.globalAlpha = im.keepA ?? .9; ctx.globalCompositeOperation = im.type === 'black' ? 'lighten' : 'darken'; ctx.drawImage(this.tmp, 0, 0); }
    } else if (im.type === 'burst') {
      ctx.setTransform(S, 0, 0, S, 0, 0); burst(ctx, this.W, this.H, { bg: this.accent, ...im });
    } else if (im.type === 'flash') {
      ctx.fillStyle = rgba(im.col || '#ffffff', 1 - k); ctx.fillRect(0, 0, cw, ch);
    }
    ctx.restore();
  }

  grade(t) {
    const P = this.post, ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height, off = this.off;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    if (!off.has('grade')) {
      const tx = this.tmpX; tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'copy'; tx.filter = `contrast(${P.contrast}) saturate(${P.sat})`; tx.drawImage(this.canvas, 0, 0); tx.filter = 'none'; tx.globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'copy'; ctx.drawImage(this.tmp, 0, 0); ctx.globalCompositeOperation = 'source-over';
      if (P.tintA) { ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = rgba(P.tint, P.tintA * 3); ctx.fillRect(0, 0, cw, ch); }
    }
    if (P.paper && !off.has('paper')) { ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = P.paper * 2; ctx.drawImage(this.paper, 0, 0, cw, ch); ctx.globalAlpha = 1; }
    if (P.vignette && !off.has('vignette')) {
      const g = ctx.createRadialGradient(cw / 2, ch / 2, ch * .45, cw / 2, ch / 2, Math.hypot(cw, ch) * .62);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(24,26,30,${P.vignette})`);
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
    // the body check: every fighter drawn at t, its joints against the limits (check.mjs fails on any)
    window.bodyAt = t => { this._seen = []; const i = this.locate(t), sh = this.shots[i], lt = t - sh.start; this.world(sh, lt, this.content(sh, lt)); return this._seen.flatMap(s => s.H.limits(s.t).map(m => `${s.H.name}: ${m}`)); };
    window.shotAt = t => { const i = this.locate(t); return { i, name: this.shots[i].name, lt: t - this.shots[i].start }; };
    const st = document.createElement('style');
    st.textContent = `html,body{margin:0;height:100%;background:#0b0c0d;overflow:hidden}canvas{display:block;width:100vw;height:100vh;object-fit:contain}
      .um-ui{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;gap:10px;padding:8px 12px;font:12px/1.2 system-ui,sans-serif;color:#f1f2f3;background:linear-gradient(transparent,rgba(0,0,0,.55));opacity:0;transition:opacity .3s}
      body:hover .um-ui,.um-ui.on{opacity:1}.um-ui button{all:unset;cursor:pointer;padding:4px 8px;border:1px solid rgba(255,255,255,.35);border-radius:4px}
      .um-bar{flex:1;height:14px;cursor:pointer;position:relative}.um-bar i{position:absolute;left:0;top:6px;height:2px;background:${this.accent}}.um-bar:before{content:"";position:absolute;left:0;right:0;top:6px;height:2px;background:rgba(255,255,255,.25)}`;
    document.head.appendChild(st);
    if (this.q.has('t')) this.frame(+this.q.get('t'));
    else if (this.render) this.frame(0);
    else this.live();
    window.__ready = true;
  }
  live() {
    let t0 = performance.now(), base = 0, paused = false, ac = null, src = null, buffer = null, loading = false;
    const ui = document.createElement('div'); ui.className = 'um-ui';
    ui.innerHTML = `<button data-k="play">❚❚</button>${this.score ? '<button data-k="snd">♪ sound</button>' : ''}<div class="um-bar"><i></i></div><span class="tm"></span>`;
    document.body.appendChild(ui);
    const bar = ui.querySelector('.um-bar'), fill = bar.querySelector('i'), tm = ui.querySelector('.tm'), pb = ui.querySelector('[data-k=play]'), sb = ui.querySelector('[data-k=snd]');
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
