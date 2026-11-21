// manga-background-3d · film.js — the film around the sets: shots on a timeline, the wipe from clay to manga, the
// letterbox with the location name, the mode label and the caption, the closing card; plus the live player, the
// background plates (line layer / tone layer) for an artist's page, a manga page made from the plates, and the
// contract the scripts read. Every frame is seek(t): the same page plays live and renders to MP4.
import { Stage } from './kit.js';
import './props.js';
import { Engine } from './engine.js';
import { keyed, clamp, ease, smooth } from './core.js';

const Q = new URLSearchParams(location.search);
const FONT_URL = new URL('./fonts/Gaegu-700.woff2', import.meta.url).href;

export class Film {
  constructor(o) {
    this.o = o;
    this.W = o.size?.[0] ?? 1920; this.H = o.size?.[1] ?? 1080;
    this.FPS = o.fps ?? 24;
    this.bar = Math.round(this.H * (o.bars ?? 0.1));               // letterbox height
    this.labels = { model: '3D 모델', manga: '만화 배경', ...(o.labels || {}) };
    this.font = o.font ?? 'Gaegu';
    let t = 0;
    this.shots = o.shots.map((s, i) => { const sh = { ...s, i, start: t, dur: s.dur ?? 3.5 }; t += sh.dur; return sh; });
    this.DURATION = +t.toFixed(3);
  }

  async start() {
    const ff = new FontFace('Gaegu', `url(${FONT_URL})`, { weight: '700' });
    document.fonts.add(await ff.load());
    for (const f of this.o.fonts || []) document.fonts.add(await new FontFace(f.family, `url(${f.url})`, f.descriptors || {}).load());
    await document.fonts.ready;
    this.scale = +(Q.get('scale') || 1);
    this.engine = new Engine({ look: this.o.look });
    this.sets = {};
    const used = new Set([...this.shots.filter(s => s.scene).map(s => s.scene), ...(this.o.page?.panels || []).map(p => p.scene ?? this.shots[p.shot]?.scene).filter(Boolean)]);
    for (const id of used) {
      const def = this.o.scenes[id];
      if (!def) throw new Error(`shot uses scene "${id}" but scenes has no such key`);
      const S = new Stage({ seed: def.seed ?? hashStr(id), mood: def.mood ?? 'day', ambient: def.ambient });
      await def.build(S);
      this.sets[id] = await this.engine.prepare(S);
      this.sets[id].def = def;
    }
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    document.body.style.cssText = 'margin:0;background:#111;overflow:hidden';
    document.body.appendChild(this.canvas);
    this._contract();
    const sheet = Q.get('sheet'), plate = Q.get('plate');
    if (sheet === 'page' || plate !== null) {
      if (sheet === 'page') await this.drawPage(); else this.drawPlate(+plate, Q.get('layer') || 'full', +(Q.get('w') || 2400));
      if (!Q.has('render')) { document.body.style.overflow = 'auto'; this.canvas.style.cssText = 'display:block;max-width:100%;height:auto;margin:0 auto'; }
    } else if (Q.has('render')) {
      this.canvas.width = Math.round(this.W * this.scale); this.canvas.height = Math.round(this.H * this.scale);
      this.seek(Q.has('t') ? +Q.get('t') : 0);
    } else this._live(Q.has('t') ? +Q.get('t') : 0, Q.has('t'));   // ?t= opens the player paused on that moment
    window.__ready = true;
    return this;
  }

  shotAt(t) { t = clamp(t, 0, this.DURATION - 1e-4); return this.shots.find(s => t >= s.start && t < s.start + s.dur) || this.shots[this.shots.length - 1]; }
  viewAt(shot, u) {
    const k = keyed(shot.cam, u, shot.ease ? ease[shot.ease] : ease.dolly);
    return { pos: k.pos, look: k.look, fov: k.fov ?? 50, roll: k.roll ?? 0, seed: shot.i * 13 + 5 };
  }
  // the wipe position in [0, 1] of the frame width (1 = all manga) and which label shows
  wipeAt(shot, u) {
    if (shot.mode === 'model') return 0;
    if (shot.mode !== 'wipe') return 1;
    const [a, b] = shot.wipe ?? [0.28, 0.72];
    return ease.inOut(clamp((u - a) / (b - a)));
  }

  seek(t) {
    const c = this.ctx, W = this.canvas.width, H = this.canvas.height, k = W / this.W;
    const shot = this.shotAt(t), u = clamp((t - shot.start) / shot.dur);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    const bar = Math.round(this.bar * k), ah = H - 2 * bar;
    if (shot.card) { this._card(shot, u, t - shot.start, k); return; }
    const set = this.sets[shot.scene], view = this.viewAt(shot, u), wf = this.wipeAt(shot, u);
    const wipePx = wf * W;
    const r = this.engine.render(set, view, W, ah, { wipe: wf >= 1 ? 1e9 : wipePx, mode: wf <= 0 ? 'model' : 'manga', unit: ah / 864 });
    c.drawImage(r.canvas, 0, bar, W, ah);
    if (wf > 0) {
      c.save(); c.beginPath(); c.rect(0, bar, wipePx, ah); c.clip();
      this.engine.draw(c, r.strokes, set, { oy: bar, unit: ah / 864 });
      c.restore();
    }
    if (wf > 0 && wf < 1) { c.fillStyle = '#0b0b0b'; c.fillRect(wipePx - 2.5 * k, bar, 5 * k, ah); }
    this.lastStrokes = r.strokes.length;
    // letterbox text
    const name = shot.label ?? set.def.name ?? shot.scene;
    this._text(name, 34 * k, bar * 0.52, bar * 0.4, 'left', '#f2f2f2');
    if (shot.mode !== 'manga' || shot.tag) this._text(shot.tag ?? (wf < 0.5 ? this.labels.model : this.labels.manga), W - 34 * k, bar * 0.52, bar * 0.36, 'right', '#f2f2f2');
    if (shot.caption) this._text(shot.caption, W / 2, H - bar * 0.5, bar * 0.46, 'center', '#ffffff');
  }

  _text(s, x, y, size, align, color) {
    const c = this.ctx; c.save();
    c.font = `700 ${size}px "${this.font}", "Gaegu", sans-serif`; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = color;
    c.fillText(s, x, y); c.restore();
  }
  _card(shot, u, local, k) {
    const c = this.ctx, W = this.canvas.width, H = this.canvas.height;
    const lines = [].concat(shot.card), fs = 74 * k, a = smooth(0.15, 0.9, local);
    c.save(); c.globalAlpha = a;
    lines.forEach((l, i) => this._text(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * fs * 1.25 - (shot.sub ? fs * 0.35 : 0), fs, 'center', '#f4f4f4'));
    if (shot.sub) { c.globalAlpha = smooth(0.7, 1.4, local); this._text(shot.sub, W / 2, H / 2 + (lines.length / 2) * fs * 1.25 + fs * 0.25, 26 * k, 'center', '#cfcfcf'); }
    c.restore();
  }

  // a background plate for the page: layer 'lines' (ink on transparent), 'tone' (greys only) or 'full'
  drawPlate(i, layer, w) {
    const shot = this.shots[i];
    if (!shot || shot.card) throw new Error(`plate ${i}: no such shot (or a card)`);
    const ah = this.H - 2 * this.bar, h = Math.round((w * ah) / this.W);
    this.canvas.width = w; this.canvas.height = h;
    const set = this.sets[shot.scene], view = this.viewAt(shot, shot.plate ?? 0.5);
    const r = this.engine.render(set, view, w, h, { unit: h / 864 });
    const c = this.ctx; c.clearRect(0, 0, w, h);
    if (layer !== 'lines') c.drawImage(r.canvas, 0, 0);
    if (layer !== 'tone') this.engine.draw(c, r.strokes, set, { unit: h / 864 });
  }

  // a manga page laid out from the sets: panels are views into the scenes, inked and toned exactly like the film
  async drawPage() {
    const pg = this.o.page; if (!pg) throw new Error('new Film({ page }) is not set');
    const [PW, PH] = pg.size ?? [1500, 2122], k = this.scale, c = this.ctx;
    this.canvas.width = Math.round(PW * k); this.canvas.height = Math.round(PH * k);
    c.fillStyle = '#fbfbf8'; c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    for (const p of pg.panels) {
      const [x, y, w, h] = p.rect.map((v, j) => Math.round(v * (j % 2 ? PH : PW) * k));
      const shot = p.shot !== undefined ? this.shots[p.shot] : null;
      const set = this.sets[p.scene ?? shot.scene];
      const view = p.cam ? { ...keyed(p.cam, 0), seed: 3 } : this.viewAt(shot, p.at ?? shot.plate ?? 0.5);
      const r = this.engine.render(set, view, w, h, { unit: Math.min(w, h) / 700 });
      c.drawImage(r.canvas, x, y);
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
      this.engine.draw(c, r.strokes, set, { ox: x, oy: y, unit: Math.min(w, h) / 700 });
      c.restore();
      c.lineWidth = 5 * k; c.strokeStyle = '#111'; c.strokeRect(x, y, w, h);
      if (p.box) {   // a narration box: the only text on the page (characters and balloons are the artist's)
        const fs = 34 * k, lines = [].concat(p.box), bw = Math.max(...lines.map(l => { c.font = `700 ${fs}px "${this.font}"`; return c.measureText(l).width; })) + fs * 1.2, bh = lines.length * fs * 1.25 + fs * 0.8;
        const bx = x + (p.boxAt?.[0] ?? 0.04) * w, by = y + (p.boxAt?.[1] ?? 0.06) * h;
        c.fillStyle = '#fff'; c.fillRect(bx, by, bw, bh); c.lineWidth = 3 * k; c.strokeRect(bx, by, bw, bh);
        c.fillStyle = '#111'; c.font = `700 ${fs}px "${this.font}"`; c.textBaseline = 'middle';
        lines.forEach((l, i) => c.fillText(l, bx + fs * 0.6, by + fs * 0.4 + fs * 1.25 * (i + 0.5)));
      }
    }
  }

  _contract() {
    const film = this;
    Object.assign(window, {
      film, DURATION: this.DURATION, FPS: this.FPS, SIZE: { W: this.W, H: this.H, bar: this.bar },
      seek: t => this.seek(t),
      filmInfo: () => ({
        duration: this.DURATION, fps: this.FPS,
        shots: this.shots.map(s => ({ i: s.i, scene: s.scene ?? null, card: !!s.card, start: s.start, dur: s.dur, mode: s.mode ?? (s.card ? 'card' : 'manga'), caption: s.caption ?? null, wipe: s.wipe ?? null, plate: s.plate ?? 0.5 })),
        scenes: Object.entries(this.sets).map(([id, st]) => ({ id, name: st.def.name, mood: st.mood, prims: st.stage.prims.length, meshes: st.meshes.length, wires: st.stage.lines.length, edges: st.edges.stat.length / 4 + st.edges.sil.length / 9, lights: st.stage.lights.length, signs: st.stage.prims.filter(p => p.text).map(p => p.text.text) })),
        page: this.o.page ? { panels: this.o.page.panels.length } : null,
      }),
      viewAt: t => { const s = this.shotAt(t); return s.card ? null : this.viewAt(s, clamp((t - s.start) / s.dur)); },
      wipeAt: t => { const s = this.shotAt(t); return s.card ? null : this.wipeAt(s, clamp((t - s.start) / s.dur)); },
      strokeCount: () => this.lastStrokes ?? 0,
      // the line layer alone at time t (for the stability check): an ImageData-free summary — ink pixel mask as base64
      linesAt: (t, w) => {
        const s = this.shotAt(t); if (s.card) return null;
        const set = this.sets[s.scene], u = clamp((t - s.start) / s.dur), view = this.viewAt(s, u);
        const h = Math.round(w * (this.H - 2 * this.bar) / this.W), r = this.engine.render(set, view, w, h, { unit: h / 864 });
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
        this.engine.draw(g, r.strokes, set, { unit: h / 864 });
        const d = g.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
        for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 100 ? 1 : 0;
        let s2 = ''; for (let i = 0; i < m.length; i += 8192) s2 += String.fromCharCode.apply(null, m.subarray(i, i + 8192));
        return { w, h, mask: btoa(s2), strokes: r.strokes.length };
      },
      // how much of the view is closer than 0.3 m (a camera inside or against geometry) and how much is sky
      depthStats: t => {
        const s = this.shotAt(t); if (s.card) return null;
        this.seek(t);
        const D = this.engine.depth, n = D.length / 4; let near = 0, sky = 0;
        for (let i = 0; i < n; i++) { if (D[i * 4 + 3] < 0.5) sky++; else if (D[i * 4] < 0.3) near++; }
        return { near: near / n, sky: sky / n };
      },
      // every caption, label and card line fits its space
      textCheck: () => {
        const c = document.createElement('canvas').getContext('2d'), out = [], W = this.W, bar = this.bar;
        const fit = (s, size, max, where) => { if (!s) return; c.font = `700 ${size}px "${this.font}", "Gaegu"`; const w = c.measureText(s).width; if (w > max) out.push(`${where}: "${s}" is ${Math.round(w)} px wide, room for ${Math.round(max)}`); };
        for (const s of this.shots) {
          fit(s.caption, bar * 0.46, W * 0.9, `shot ${s.i} caption`);
          if (!s.card) fit(s.label ?? this.sets[s.scene]?.def.name, bar * 0.4, W * 0.42, `shot ${s.i} location`);
          for (const l of [].concat(s.card || [])) fit(l, 74, W * 0.86, `shot ${s.i} card`);
          fit(s.sub, 26, W * 0.9, `shot ${s.i} card sub`);
        }
        return out;
      },
      glyphCheck: () => {
        const texts = [...this.shots.flatMap(s => [s.caption, s.label, s.tag, ...[].concat(s.card || []), s.sub]), this.labels.model, this.labels.manga,
          ...Object.values(this.sets).map(st => st.def.name), ...(this.o.page?.panels || []).flatMap(p => [].concat(p.box || [])),
          ...Object.values(this.sets).flatMap(st => st.stage.prims.filter(p => p.text).map(p => p.text.text))].filter(Boolean).join('');
        const cv = document.createElement('canvas').getContext('2d'), miss = new Set();
        for (const ch of new Set([...texts.replace(/\s/g, '')])) {
          cv.font = `700 40px "${this.font}", monospace`; const a = cv.measureText(ch).width;
          cv.font = `700 40px "${this.font}", serif`; const b = cv.measureText(ch).width;
          if (Math.abs(a - b) > 0.01) miss.add(ch);
        }
        return { chars: new Set(texts).size, missing: [...miss] };
      },
      soundEvents: () => this.shots.flatMap(s => {
        const ev = [{ t: s.start, kind: s.card ? 'card' : 'cut' }];
        if (s.mode === 'wipe') { const [a, b] = s.wipe ?? [0.28, 0.72]; ev.push({ t: s.start + a * s.dur, kind: 'wipe', dur: (b - a) * s.dur }); }
        return ev;
      }),
    });
  }

  _live(t0 = 0, pause = false) {
    const cv = this.canvas, bar = document.createElement('div'), fill = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:6px;background:rgba(255,255,255,.15);cursor:pointer';
    fill.style.cssText = 'height:100%;width:0;background:#e9e3d0';
    bar.appendChild(fill); document.body.appendChild(bar);
    const fit = () => {
      // live: at most 1600 px wide (every frame reads the depth buffer back for the line work)
      const s = Math.min(innerWidth / this.W, innerHeight / this.H), dpr = Math.min(devicePixelRatio || 1, 1600 / (this.W * s));
      cv.width = Math.round(this.W * s * dpr); cv.height = Math.round(this.H * s * dpr);
      cv.style.cssText = `display:block;position:absolute;left:${(innerWidth - this.W * s) / 2}px;top:${(innerHeight - this.H * s) / 2}px;width:${this.W * s}px;height:${this.H * s}px`;
    };
    fit(); addEventListener('resize', fit);
    let t = Math.max(0, Math.min(this.DURATION - 0.01, t0)), last = performance.now(), paused = pause;
    cv.addEventListener('click', () => { paused = !paused; });
    addEventListener('keydown', e => { if (e.key === ' ') { paused = !paused; e.preventDefault(); } if (e.key === 'ArrowRight') t += 3; if (e.key === 'ArrowLeft') t -= 3; t = (t + this.DURATION) % this.DURATION; });
    bar.addEventListener('click', e => { t = (e.clientX / innerWidth) * this.DURATION; });
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (!paused) t = (t + dt) % this.DURATION;
      this.seek(t); fill.style.width = `${(t / this.DURATION) * 100}%`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

function hashStr(s) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
