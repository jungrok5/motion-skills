// one-line-drawing · film.js — turns a scene and its one line into the film: a tablet with a faded grey photo, a white
// stylus that comes in and draws the whole picture in one unbroken line while the camera rides close behind the nib,
// a pull back, the photo fading out, the clean line art on white, a signature, a hold. Every frame is seek(t).
import { clamp, lerp, prog, ease, dist, sub, add, mul, norm, canvas, noise1, distField, mixHex, bbox, boxBlur } from './core.js';
import { Scene, W, H } from './scene.js';
import { Line } from './line.js';
import { paintRef, photoRef } from './ref.js';
import { figureRig, figure as drawFigure, LIMITS } from './kit.js';

export const FPS = 30;
const SW = 1080, SH = 1920, K0 = .86;                 // screen size; page scale when the whole tablet is in view
const BEZEL = 46, DESK = '#121213', BODY = '#1b1b1d';
const DEF_TIMING = { intro: 1.8, draw: 46, pull: 1.9, fade: 1.5, clean: .9, sign: 1.5, hold: 2.6 };
// how fast each kind of stretch goes, relative to the pace (a hand races down long lines, slows into loops)
const PACE = { line: 1.25, curve: 1, contour: .9, step: 1, curl: .62, zig: 1.08, wave: 1, scallop: .85, sweep: 1.12, back: 1.35 };

export class Film {
  constructor(piece, o = {}) {
    this.piece = piece;
    this.o = { title: '', signature: null, ink: '#141414', width: 3.6, zoom: 2.4, breathe: 'auto', photo: null, seed: 1, ...o };
    this.T = { ...DEF_TIMING, ...(o.timing || {}) };
  }
  // ---- build: scene → line → pace → camera ------------------------------------------------------------------
  _build() {
    const S = this.S = new Scene({ seed: this.o.seed });
    this.piece.scene(S);
    const L = new Line(S, { seed: this.o.seed });
    this.piece.line(L, S);
    const tr = this.track = L.finish();
    const P = tr.pts, n = P.length;
    // curvature → speed; kind → speed; ease into and out of pauses and the ends
    const v = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 3)], b = P[i], c = P[Math.min(n - 1, i + 3)], u = norm(sub(b, a)), w = norm(sub(c, b));
      const turn = Math.acos(clamp(u[0] * w[0] + u[1] * w[1], -1, 1)) / Math.max(1, (dist(a, b) + dist(b, c)) / 2);
      v[i] = (PACE[tr.kind[i]] || 1) / (1 + turn * 9);
    }
    for (let pass = 0; pass < 2; pass++) { const q = v.slice(); for (let i = 0; i < n; i++) { let s = 0, m = 0; for (let k = -10; k <= 10; k++) { const j = i + k; if (j >= 0 && j < n) { s += q[j]; m++; } } v[i] = s / m; } }
    const stops = [0, n - 1, ...tr.pauses.map(p => p.i)];
    for (let i = 0; i < n; i++) { let dmin = Infinity; for (const s of stops) dmin = Math.min(dmin, Math.abs(i - s) * 2); v[i] *= .35 + .65 * clamp(dmin / 60) ** .6; }
    const pauseAt = new Map(tr.pauses.map(p => [p.i, p.s]));
    let raw = 0; const tt = new Float64Array(n);
    for (let i = 1; i < n; i++) { raw += dist(P[i - 1], P[i]) / v[i]; tt[i] = raw; }
    const pauseTotal = tr.pauses.reduce((s, p) => s + p.s, 0);
    const drawT = this.T.draw ?? raw / 340 + pauseTotal;
    this.V0 = raw / Math.max(1, drawT - pauseTotal);
    let acc = 0; for (let i = 1; i < n; i++) { if (pauseAt.has(i - 1)) acc += pauseAt.get(i - 1); tt[i] = tt[i] / this.V0 + acc; }
    this.tt = tt; this.v = v;
    // ink width: a little heavier where the hand slows, tapered at both ends
    const vmax = Math.max(...v), wd = this.wd = new Float32Array(n);
    let s = 0; const total = this.len = P.reduce((a, p, i) => a + (i ? dist(P[i - 1], p) : 0), 0);
    for (let i = 0; i < n; i++) { if (i) s += dist(P[i - 1], P[i]); wd[i] = this.o.width * (.8 + .4 * (1 - v[i] / vmax)) * (.45 + .55 * clamp(s / 40)) * (.45 + .55 * clamp((total - s) / 60)); }
    // runs of 6 samples (one stroke each, one width), with their bounds for culling
    this.runs = []; for (let i = 0; i < n - 1; i += 6) { const j = Math.min(n - 1, i + 6), b = bbox(P.slice(i, j + 1)); let w = 0; for (let k = i; k <= j; k++) w += wd[k]; this.runs.push({ i, j, w: w / (j - i + 1), b }); }
    // acts
    const T = this.T, a = this.acts = {};
    a.intro = [0, T.intro]; a.draw = [T.intro, T.intro + tt[n - 1]];
    a.pull = [a.draw[1], a.draw[1] + T.pull]; a.fade = [a.draw[1] + T.pull * .35, a.draw[1] + T.pull + T.fade];
    a.clean = [a.fade[1], a.fade[1] + T.clean]; a.sign = [a.clean[1] - .1, a.clean[1] - .1 + T.sign]; a.hold = [a.sign[1], a.sign[1] + T.hold];
    this.DURATION = +a.hold[1].toFixed(3);
    this.box = bbox(P);
    this._breathers(); this._camera(); this._signature();
  }
  // where the camera pulls back for a breath: given times, or automatically where the line moves on to a new tag
  _breathers() {
    const b = this.o.breathe, a = this.acts.draw; this.br = [];
    if (Array.isArray(b)) { this.br = b.map(t => a[0] + t); return; }
    if (b !== 'auto') return;
    const changes = []; const tg = this.track.tag;
    for (let i = 1; i < tg.length; i++) if (tg[i] !== tg[i - 1]) changes.push(a[0] + this.tt[i]);
    for (let t = a[0] + 12; t < a[1] - 8; t += 13) { const c = changes.filter(x => Math.abs(x - t) < 5).sort((x, y) => Math.abs(x - t) - Math.abs(y - t))[0]; if (c && !this.br.some(x => Math.abs(x - c) < 8)) this.br.push(c); }
  }
  zoomAt(t) {
    const a = this.acts, Z = this.o.zoom;
    let z = lerp(1, Z, ease.io(prog(t, a.draw[0] - .3, a.draw[0] + 2.2)));
    for (const b of this.br) { const k = Math.min(ease.io(prog(t, b - 1.2, b)), 1 - ease.io(prog(t, b + 1.4, b + 2.6))); z = lerp(z, Math.max(1.15, Z * .58), k); }
    return lerp(z, 1, ease.io(prog(t, a.pull[0], a.pull[1])));
  }
  // the camera follows the pen with a spring, a little ahead of it, and keeps the nib inside the frame
  _camera() {
    const dt = 1 / 60, N = Math.ceil(this.DURATION / dt) + 2, cam = this.cam = new Float32Array(N * 2);
    let x = W / 2, y = H / 2, vx = 0, vy = 0; const w = 2.6;
    for (let i = 0; i < N; i++) {
      const t = i * dt, z = this.zoomAt(t), s = z * K0, hw = SW / 2 / s, hh = SH / 2 / s;
      let target = [W / 2, H / 2];
      if (t > this.acts.draw[0] - 1) target = this.penAt(Math.min(t + .35, this.acts.draw[1])).p;
      const k = clamp((z - 1) / .4);  // at the whole-tablet view the camera rests on the middle
      target = [lerp(W / 2, target[0], k), lerp(H / 2, target[1], k)];
      for (let sub2 = 0; sub2 < 4; sub2++) { const h = dt / 4; vx += (w * w * (target[0] - x) - 2 * w * vx) * h; vy += (w * w * (target[1] - y) - 2 * w * vy) * h; x += vx * h; y += vy * h; }
      // the nib stays inside the middle 70 % of the frame
      if (t >= this.acts.draw[0] && t <= this.acts.draw[1] && z > 1.05) {
        const p = this.penAt(t).p, mx = hw * .7, my = hh * .7;
        if (p[0] < x - mx) { x = p[0] + mx; vx = Math.min(vx, 0); } if (p[0] > x + mx) { x = p[0] - mx; vx = Math.max(vx, 0); }
        if (p[1] < y - my) { y = p[1] + my; vy = Math.min(vy, 0); } if (p[1] > y + my) { y = p[1] - my; vy = Math.max(vy, 0); }
      }
      // stay over the tablet
      const mg = BEZEL + 30;
      x = hw * 2 >= W + 2 * mg ? W / 2 : clamp(x, hw - mg, W - hw + mg); y = hh * 2 >= H + 2 * mg ? H / 2 : clamp(y, hh - mg, H - hh + mg);
      const kp = ease.io(prog(t, this.acts.pull[0], this.acts.pull[1]));
      cam[i * 2] = lerp(x, W / 2, kp); cam[i * 2 + 1] = lerp(y, H / 2, kp);
    }
  }
  camAt(t) {
    const f = clamp(t * 60, 0, this.cam.length / 2 - 1.001), i = Math.floor(f), k = f - i, c = this.cam;
    return { c: [lerp(c[i * 2], c[i * 2 + 2], k), lerp(c[i * 2 + 1], c[i * 2 + 3], k)], z: this.zoomAt(t) };
  }
  // the pen at time t: page point, sample index, touching or not, lift 0…1
  penAt(t) {
    const a = this.acts, tt = this.tt, P = this.track.pts, n = P.length;
    if (t <= a.draw[0]) return { p: P[0], i: 0, f: 0, down: false, lift: 1 - ease.out(prog(t, a.intro[0] + .2, a.draw[0])) };
    const u = t - a.draw[0];
    if (u >= tt[n - 1]) return { p: P[n - 1], i: n - 1, f: 0, down: false, lift: ease.io(prog(t, a.draw[1], a.draw[1] + .6)) };
    let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tt[m] <= u) lo = m; else hi = m; }
    const f = (u - tt[lo]) / Math.max(1e-6, tt[hi] - tt[lo]);
    // in a pause the nib lifts a hair
    let lift = 0; for (const ps of this.track.pauses) { const t0 = tt[ps.i], k = (u - t0) / ps.s; if (k > 0 && k < 1) lift = Math.sin(Math.PI * k) * .35; }
    return { p: [lerp(P[lo][0], P[hi][0], clamp(f)), lerp(P[lo][1], P[hi][1], clamp(f))], i: lo, f: clamp(f), down: lift < .05, lift };
  }
  // ---- the signature: a few cursive loops and, if given, the artist's own handle in the hand font ---------------
  _signature() {
    const b = this.box, x = clamp(b.x1 - (this.o.signature ? 330 : 150), 120, W - (this.o.signature ? 400 : 200)), y = clamp(b.y1 + 46, 200, H - 26), pts = [];
    for (let i = 0; i <= 90; i++) { const k = i / 90, a = k * Math.PI * 2 * 3.5; pts.push([x + k * 120 + Math.cos(a) * 9 - 9, y - Math.abs(Math.sin(a / 2)) * 16 + Math.sin(k * 6) * 2]); }
    this.sig = { pts, x, y, text: this.o.signature };
  }
  // ---- drawing ---------------------------------------------------------------------------------------------
  draw(g, t) {
    const a = this.acts, K = this._k;
    const { c, z } = this.camAt(t);
    // the last act moves from the tablet to the clean page: scale .86 → 1, desk and bezel → white
    const kc = ease.io(prog(t, a.clean[0], a.clean[1])), s = z * K0 * lerp(1, 1 / K0, kc);
    g.setTransform(K, 0, 0, K, 0, 0);
    g.fillStyle = kc > 0 ? mixHex(DESK, '#ffffff', kc) : DESK; g.fillRect(0, 0, SW, SH);
    if (kc < 1) { const dg = g.createRadialGradient(SW * .3, SH * .2, 50, SW / 2, SH / 2, SH * .8); dg.addColorStop(0, `rgba(255,255,255,${.05 * (1 - kc)})`); dg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = dg; g.fillRect(0, 0, SW, SH); }
    g.setTransform(K * s, 0, 0, K * s, K * (SW / 2 - c[0] * s), K * (SH / 2 - c[1] * s));
    // tablet body and bezel
    if (kc < 1) {
      g.save(); g.globalAlpha = 1 - kc; g.fillStyle = BODY; rrect(g, -BEZEL, -BEZEL, W + BEZEL * 2, H + BEZEL * 2, 72); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.09)'; g.lineWidth = 2 / s; rrect(g, -BEZEL + 3, -BEZEL + 3, W + BEZEL * 2 - 6, H + BEZEL * 2 - 6, 69); g.stroke();
      g.fillStyle = '#0b0b0c'; g.beginPath(); g.arc(W / 2, -BEZEL / 2, 6, 0, Math.PI * 2); g.fill(); g.restore();
    }
    // the page: white, the grey photo fading out after the line is done
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    const refA = 1 - ease.io(prog(t, a.fade[0], a.fade[1]));
    if (refA > 0) { g.globalAlpha = refA; g.drawImage(this.ref, 0, 0, W, H); g.globalAlpha = 1; }
    // the line so far
    const pen = this.penAt(t), view = { x0: c[0] - SW / 2 / s - 20, x1: c[0] + SW / 2 / s + 20, y0: c[1] - SH / 2 / s - 20, y1: c[1] + SH / 2 / s + 20 };
    this._ink(g, pen.i, pen.f, view);
    // the signature
    if (t > a.sign[0]) this._sign(g, prog(t, a.sign[0], a.sign[1]));
    // the stylus (gone once the camera has pulled back)
    const sa = 1 - prog(t, a.pull[0] + .3, a.pull[1] - .2);
    if (sa > 0) this._stylus(g, t, pen, sa);
  }
  _ink(g, i, f, view) {
    const P = this.track.pts, R = this.runs;
    g.strokeStyle = this.o.ink; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const r of R) {
      if (r.i > i) break;
      if (r.b.x1 < view.x0 || r.b.x0 > view.x1 || r.b.y1 < view.y0 || r.b.y0 > view.y1) continue;
      const j = Math.min(r.j, i);
      g.lineWidth = r.w; g.beginPath(); g.moveTo(P[r.i][0], P[r.i][1]);
      for (let k = r.i + 1; k <= j; k++) g.lineTo(P[k][0], P[k][1]);
      if (j === i && i < P.length - 1 && f > 0) g.lineTo(lerp(P[i][0], P[i + 1][0], f), lerp(P[i][1], P[i + 1][1], f));
      g.stroke();
    }
  }
  _sign(g, k) {
    const sg = this.sig, n = Math.floor(sg.pts.length * clamp(k / .6));
    g.strokeStyle = this.o.ink; g.lineWidth = this.o.width * .7; g.lineCap = 'round'; g.lineJoin = 'round';
    if (n > 1) { g.beginPath(); sg.pts.slice(0, n).forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); }
    if (sg.text && k > .55) {
      g.save(); g.font = '500 40px OLDHand'; g.fillStyle = this.o.ink; g.textBaseline = 'alphabetic';
      const tw = g.measureText(sg.text).width, kk = clamp((k - .55) / .4);
      const tx = sg.x + 132; g.beginPath(); g.rect(tx - 6, sg.y - 60, (tw + 12) * kk, 90); g.clip(); g.fillText(sg.text, tx, sg.y + 4); g.restore();
    }
  }
  // a white stylus in page units: long, its body running off to the lower right; the nib on the line
  _stylus(g, t, pen, alpha) {
    const a = this.acts, n1 = this._n1 || (this._n1 = noise1(this.o.seed * 7 + 3));
    let p = pen.p, lift = pen.lift;
    // entering at the start, leaving at the end: slides in from (and out to) the lower right
    const kin = ease.out(prog(t, a.intro[0] + .1, a.intro[1] - .3)), kout = ease.in(prog(t, a.draw[1] + .3, a.pull[1]));
    const ang = .62 + n1(t * .23) * .12 + (p[0] / W - .5) * -.25 + (p[1] / H - .5) * .15;
    const dir = [Math.cos(ang), Math.sin(ang)];
    p = add(p, mul(dir, (1 - kin) * 900 + kout * 900));
    const len = 640, bw = 30, cone = 56, lx = 10 * lift, ly = -16 * lift;
    const shape = () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(cone, -bw * .4); g.lineTo(cone + 6, -bw / 2); g.lineTo(len, -bw / 2); g.lineTo(len, bw / 2); g.lineTo(cone + 6, bw / 2); g.lineTo(cone, bw * .4); g.closePath(); };
    g.save(); g.globalAlpha = alpha;
    // the shadow: a blurred sprite made once (no ctx.filter per frame)
    if (!this._shadow) { const sc = canvas(len + 120, bw + 120), sg = sc.getContext('2d'); sg.translate(60, 60 + bw / 2); sg.fillStyle = 'rgb(20,20,20)'; const g0 = g; g = sg; shape(); sg.fill(); g = g0; boxBlur(sc, 13); this._shadow = sc; }
    g.save(); g.translate(p[0] - 26 - 30 * lift, p[1] + 22 + 26 * lift); g.rotate(ang); g.globalAlpha = alpha * (.22 - .08 * lift); g.drawImage(this._shadow, -60, -60 - bw / 2); g.restore();
    g.translate(p[0] + lx, p[1] + ly); g.rotate(ang); shape();
    const gr = g.createLinearGradient(0, -bw / 2, 0, bw / 2); gr.addColorStop(0, '#fdfdfd'); gr.addColorStop(.42, '#f4f4f2'); gr.addColorStop(.8, '#dcdcd8'); gr.addColorStop(1, '#b9b8b4');
    g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(80,80,80,.35)'; g.lineWidth = 1.2; g.stroke();
    // a faint flat along the barrel and the nib cone
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(cone + 20, -bw * .32, len - cone - 40, bw * .12);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(cone, -bw * .4); g.lineTo(cone, bw * .4); g.closePath();
    const nb = g.createLinearGradient(0, -bw / 2, 0, bw / 2); nb.addColorStop(0, '#f2f2f0'); nb.addColorStop(1, '#bdbcb8'); g.fillStyle = nb; g.fill();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(11, -3.4); g.lineTo(11, 3.4); g.closePath(); g.fillStyle = '#d8d8d5'; g.fill();
    g.restore();
  }

  // ---- sheets ----------------------------------------------------------------------------------------------
  // the line sheet: the whole line coloured by time over the faded photo, pauses, tags, uncovered outlines, numbers
  drawLineSheet(g) {
    const K = this._k; g.setTransform(K, 0, 0, K, 0, 0); g.fillStyle = '#fff'; g.fillRect(0, 0, SW, SH);
    g.globalAlpha = .45; g.drawImage(this.ref, 0, 0, W, H); g.globalAlpha = 1;
    const P = this.track.pts, n = P.length, cov = this.coverage();
    for (const c of cov.shapes) for (const seg of c.gaps) { g.strokeStyle = 'rgba(230,40,60,.9)'; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); seg.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.setLineDash([]); }
    g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 3;
    for (let i = 0; i < n - 1; i += 4) { const j = Math.min(n - 1, i + 4); g.strokeStyle = `hsl(${(220 - 220 * i / n).toFixed(0)},75%,40%)`; g.beginPath(); g.moveTo(P[i][0], P[i][1]); for (let k = i + 1; k <= j; k++) g.lineTo(P[k][0], P[k][1]); g.stroke(); }
    g.fillStyle = '#0a8a3a'; g.beginPath(); g.arc(P[0][0], P[0][1], 12, 0, 7); g.fill(); g.fillStyle = '#c21'; g.fillRect(P[n - 1][0] - 10, P[n - 1][1] - 10, 20, 20);
    for (const ps of this.track.pauses) { g.strokeStyle = '#111'; g.lineWidth = 2; g.beginPath(); g.arc(P[ps.i][0], P[ps.i][1], 14, 0, 7); g.stroke(); }
    g.font = '600 22px system-ui, sans-serif'; const seen = new Set(); const tg = this.track.tag;
    for (let i = 0; i < n; i++) if (!seen.has(tg[i])) { seen.add(tg[i]); const p = P[i]; g.fillStyle = 'rgba(255,255,255,.85)'; const tw = g.measureText(tg[i]).width; g.fillRect(p[0] + 10, p[1] - 30, tw + 12, 28); g.fillStyle = '#111'; g.fillText(tg[i], p[0] + 16, p[1] - 9); }
    const info = this.info(), lc = this.lineCheck();
    const lines = [`ONE LINE · ${Math.round(this.len)} px · ${info.acts.draw.toFixed(1)} s drawing · pace ${Math.round(this.V0)} px/s`,
      `lifts ${lc.lifts} · biggest gap ${lc.maxGap} px · off the page ${lc.offPage}`,
      Object.entries(this.track.count).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(' · '),
      `coverage ${cov.shapes.map(c => `${c.name} ${Math.round(c.cover * 100)}%`).join(' · ')}`];
    g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(20, SH - 30 - lines.length * 30, SW - 40, lines.length * 30 + 14);
    g.fillStyle = '#111'; g.font = '500 20px system-ui, sans-serif'; lines.forEach((l, i) => g.fillText(l.slice(0, 110), 34, SH - 22 - (lines.length - 1 - i) * 30));
  }
  // the cast sheet: each figure as posed, then the same rig facing left / right / toward / away, joints shown
  drawCastSheet(g) {
    const K = this._k; g.setTransform(K, 0, 0, K, 0, 0); g.fillStyle = '#fff'; g.fillRect(0, 0, SW, SH);
    const figs = [...this.S.figures.entries()];
    g.font = '600 26px system-ui, sans-serif'; g.fillStyle = '#111';
    if (!figs.length) { g.fillText('no figures in this scene', 40, 80); return; }
    const rowH = Math.min(600, (SH - 80) / figs.length);
    figs.forEach(([name, J], r) => {
      const y0 = 60 + r * rowH, hh = rowH * .62, A = J.angles;
      // every view carries the solved pose: side views keep the arm angles, frontal views show the same stride
      const arms = J.side ? { near: { sh: A['near shoulder'], el: A['near elbow'] }, far: { sh: A['far shoulder'], el: A['far elbow'] } } : { left: { sh: A['left shoulder'], el: A['left elbow'] }, right: { sh: A['right shoulder'], el: A['right elbow'] } };
      const views = [['as posed', { ...J.o, reach: null, arms }], ...['left', 'right', 'toward', 'away'].map(f => [f, { ...J.o, facing: f, reach: null, arms: (f === 'left' || f === 'right') === J.side ? arms : undefined }])];
      g.fillStyle = '#111'; g.fillText(`${name} — ${J.facing}, stride ${J.o.stride ?? 0}`, 30, y0 + 10);
      views.forEach(([label, o], k) => {
        const cx = 110 + k * 205, gy = y0 + 40 + hh + 30;
        const Jv = figureRig({ ...o, x: cx, ground: gy, h: hh });
        g.fillStyle = '#bdbdbd'; g.strokeStyle = '#bdbdbd'; drawFigure(Jv)(g);
        g.strokeStyle = '#d23'; g.lineWidth = 2.5; const j = Jv.joints;
        const bones = [['hip', 'chest'], ['chest', 'head']]; for (const s of Jv.side ? ['near', 'far'] : ['left', 'right']) bones.push([`${s} shoulder`, `${s} elbow`], [`${s} elbow`, `${s} hand`]);
        for (const s of Jv.side ? ['front', 'back'] : ['left', 'right']) bones.push([`${s} hip`, `${s} knee`], [`${s} knee`, `${s} ankle`], [`${s} ankle`, `${s} toe`]);
        for (const [p, q] of bones) if (j[p] && j[q]) { g.beginPath(); g.moveTo(...j[p]); g.lineTo(...j[q]); g.stroke(); }
        g.fillStyle = '#d23'; for (const p of Object.values(j)) { g.beginPath(); g.arc(p[0], p[1], 4, 0, 7); g.fill(); }
        g.strokeStyle = '#333'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - 80, gy); g.lineTo(cx + 80, gy); g.stroke();
        g.fillStyle = Jv.problems.length ? '#c21' : '#111'; g.font = '500 20px system-ui, sans-serif'; g.fillText(label, cx - 40, gy + 30);
        if (k === 0) Jv.problems.slice(0, 3).forEach((m, i) => g.fillText(m, 30, gy + 58 + i * 24));
      });
      g.font = '600 26px system-ui, sans-serif';
    });
  }

  // ---- checks ----------------------------------------------------------------------------------------------
  lineCheck() {
    const P = this.track.pts; let maxGap = 0, off = 0;
    for (let i = 1; i < P.length; i++) maxGap = Math.max(maxGap, dist(P[i - 1], P[i]));
    for (const p of P) if (p[0] < 10 || p[1] < 10 || p[0] > W - 10 || p[1] > H - 10) off++;
    const tags = {}; for (let i = 1; i < P.length; i++) { const k = this.track.tag[i]; tags[k] = (tags[k] || 0) + dist(P[i - 1], P[i]); }
    const vs = []; for (let i = 1; i < P.length; i++) vs.push(dist(P[i - 1], P[i]) / Math.max(1e-6, this.tt[i] - this.tt[i - 1]));
    const sorted = vs.filter(Number.isFinite).sort((a, b) => a - b), q = k => Math.round(sorted[Math.floor((sorted.length - 1) * k)]);
    return { lifts: 0, samples: P.length, length: Math.round(this.len), maxGap: +maxGap.toFixed(2), offPage: off, count: this.track.count, tags: Object.fromEntries(Object.entries(tags).map(([k, v]) => [k, Math.round(v)])),
      speed: { p10: q(.1), median: q(.5), p95: q(.95), max: q(1) }, pauses: this.track.pauses.length, box: this.box };
  }
  // how much of each traced shape's outline the line passes within 14 px of
  coverage() {
    if (this._cov) return this._cov;
    const res = .5, w = W * res, h = H * res, c = canvas(w, h), g = c.getContext('2d'), P = this.track.pts;
    g.setTransform(res, 0, 0, res, 0, 0); g.lineWidth = 3; g.strokeStyle = '#000'; g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
    const im = g.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) m[i] = im[i * 4 + 3] > 60 ? 1 : 0;
    const D = distField(m, w, h), R = 14 * res, shapes = [];
    for (const s of this.S.shapes.values()) {
      if (!s.trace) continue;
      // every separate piece of the silhouette counts (two stools are two outlines)
      const loops = this.S.loops(s.name).filter((l, i) => i === 0 || l.length > 24); if (!loops.length) continue;
      const loop = loops.flat();
      let near = 0; const gaps = []; let cur = null;
      for (const p of loop) { const x = Math.round(p[0] * res), y = Math.round(p[1] * res), d = x >= 0 && y >= 0 && x < w && y < h ? D[y * w + x] : 99; if (d <= R) { near++; cur = null; } else { if (!cur) gaps.push(cur = []); cur.push(p); } }
      shapes.push({ name: s.name, cover: +(near / loop.length).toFixed(3), gaps: gaps.filter(gp => gp.length > 6) });
    }
    return (this._cov = { shapes });
  }
  camCheck() {
    const a = this.acts, out = []; let maxZ = 0, minZ = 99, maxStep = 0, prev = null, outside = 0;
    for (let t = a.draw[0]; t <= a.draw[1]; t += 1 / FPS) {
      const { c, z } = this.camAt(t), s = z * K0, p = this.penAt(t).p, sx = SW / 2 + (p[0] - c[0]) * s, sy = SH / 2 + (p[1] - c[1]) * s;
      maxZ = Math.max(maxZ, z); minZ = Math.min(minZ, z);
      if (sx < 40 || sy < 40 || sx > SW - 40 || sy > SH - 40) { outside++; if (out.length < 5) out.push(+t.toFixed(2)); }
      if (prev) maxStep = Math.max(maxStep, Math.hypot(c[0] - prev[0], c[1] - prev[1]) * s); prev = c;
    }
    return { outside, at: out, zoom: [+minZ.toFixed(2), +maxZ.toFixed(2)], maxStep: +maxStep.toFixed(1), breathers: this.br.map(t => +t.toFixed(2)) };
  }
  bodyCheck() {
    const cov = this.coverage().shapes, res = [];
    for (const [name, J] of this.S.figures) {
      const toes = Object.entries(J.joints).filter(([k]) => k.endsWith('toe')).map(([, p]) => p[1]);
      const foot = Math.max(...toes), floatPx = +Math.abs(foot - J.ground).toFixed(1);
      const c = cov.find(s => s.name === name);
      res.push({ name, facing: J.facing, problems: J.problems.slice(), angles: J.angles, footOff: floatPx, traced: this.S.get(name).trace, cover: c ? c.cover : 0 });
    }
    return res;
  }
  revealCheck() {
    const a = this.acts, end = this.DURATION - .05, pen = this.penAt(end);
    return { lineDone: pen.i === this.track.pts.length - 1, refGone: 1 - ease.io(prog(end, a.fade[0], a.fade[1])) === 0, signDone: prog(end, a.sign[0], a.sign[1]) === 1, hold: +(a.hold[1] - a.hold[0]).toFixed(2) };
  }
  // the photo under the pen must read as a picture: tonal spread, mid-light like a faded print
  refCheck() {
    const c = canvas(108, 192), g = c.getContext('2d'); g.drawImage(this.ref, 0, 0, 108, 192);
    const d = g.getImageData(0, 0, 108, 192).data; let s = 0, s2 = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { const l = .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]; s += l; s2 += l * l; n++; }
    const mean = s / n; return { mean: +mean.toFixed(1), sd: +Math.sqrt(s2 / n - mean * mean).toFixed(1) };
  }
  info() {
    const r = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? v.map(x => +x.toFixed(2)) : v]));
    const acts = r(this.acts); acts.draw = +(this.acts.draw[1] - this.acts.draw[0]).toFixed(2);
    return { duration: this.DURATION, actTimes: r(this.acts), acts, length: Math.round(this.len), pace: Math.round(this.V0), shapes: [...this.S.shapes.keys()], figures: [...this.S.figures.keys()], title: this.o.title, signature: this.o.signature };
  }
  soundEvents() {
    const a = this.acts, out = { pen: [], taps: [a.draw[0]], lifts: [a.draw[1]], dur: this.DURATION };
    let prev = this.penAt(a.draw[0]).p;
    for (let t = a.draw[0]; t <= a.draw[1]; t += .01) { const pn = this.penAt(t), sp = dist(prev, pn.p) / .01; prev = pn.p; out.pen.push([+t.toFixed(2), +(sp / 900).toFixed(3), pn.down ? 1 : 0]); }
    for (const ps of this.track.pauses) { const t0 = a.draw[0] + this.tt[ps.i]; out.lifts.push(+(t0 + ps.s * .2).toFixed(2)); out.taps.push(+(t0 + ps.s * .85).toFixed(2)); }
    out.sign = [a.sign[0], a.sign[1]];
    return out;
  }

  // ---- page --------------------------------------------------------------------------------------------------
  async start() {
    const q = new URLSearchParams(location.search), render = q.has('render'), frozen = q.has('t') ? +q.get('t') : null;
    this._k = +(q.get('scale') || 1);
    await loadFonts();
    this._build();
    this.ref = this.o.photo ? photoRef(await loadImage(this.o.photo)) : paintRef(this.S);
    const cv = canvas(SW * this._k, SH * this._k); this.cv = cv; document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    const seek = t => { this.t = clamp(t, 0, this.DURATION); this.draw(ctx, this.t); };
    Object.assign(window, {
      seek, DURATION: this.DURATION, FPS, SIZE: { W: SW, H: SH }, film: this,
      filmInfo: () => this.info(), lineCheck: () => this.lineCheck(), coverage: () => this.coverage(), camCheck: () => this.camCheck(),
      bodyCheck: () => this.bodyCheck(), revealCheck: () => this.revealCheck(), refCheck: () => this.refCheck(), penAt: t => this.penAt(t), soundEvents: () => this.soundEvents(),
      glyphCheck: () => [...new Set([...(this.o.signature || '')])].filter(ch => !/[\x20-\x7e]/.test(ch)), limits: LIMITS,
    });
    document.body.style.cssText = 'margin:0;background:#111;display:grid;place-items:center;min-height:100vh;overflow:hidden';
    const sheet = q.get('sheet');
    if (sheet) { cv.style.cssText = render ? '' : 'height:100vh;width:auto'; if (sheet === 'cast') this.drawCastSheet(ctx); else this.drawLineSheet(ctx); window.__ready = true; return; }
    if (render || frozen !== null) { cv.style.cssText = render ? '' : 'height:100vh;width:auto'; seek(frozen ?? 0); window.__ready = true; return; }
    this._live(cv, seek); window.__ready = true;
  }
  _live(cv, seek) {
    cv.style.cssText = 'height:100vh;max-width:100vw;width:auto;object-fit:contain;cursor:pointer';
    const bar = document.createElement('div'); bar.style.cssText = 'position:fixed;left:0;bottom:0;height:4px;background:#e8b04a;width:0;z-index:2';
    const hit = document.createElement('div'); hit.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:18px;cursor:ew-resize;z-index:3';
    document.body.append(bar, hit);
    let t0 = performance.now(), off = 0, paused = false;
    const now = () => paused ? off : (off + (performance.now() - t0) / 1000) % (this.DURATION + 1.5);
    const set = t => { off = clamp(t, 0, this.DURATION); t0 = performance.now(); };
    cv.addEventListener('click', () => { if (paused) { paused = false; t0 = performance.now(); } else { off = now(); paused = true; } });
    addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); cv.click(); } if (e.key === 'ArrowRight') set(now() + 3); if (e.key === 'ArrowLeft') set(now() - 3); });
    const scrub = e => set(e.clientX / innerWidth * this.DURATION);
    hit.addEventListener('pointerdown', e => { scrub(e); hit.setPointerCapture(e.pointerId); hit.onpointermove = scrub; });
    hit.addEventListener('pointerup', () => (hit.onpointermove = null));
    const loop = () => { const t = now(); seek(Math.min(t, this.DURATION)); bar.style.width = (100 * Math.min(t, this.DURATION) / this.DURATION) + '%'; requestAnimationFrame(loop); };
    loop();
  }
}

function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const FONT_DIR = new URL('./fonts/', import.meta.url);
async function loadFonts() { const f = new FontFace('OLDHand', `url(${new URL('Caveat-500.woff2', FONT_DIR)})`, { weight: '500' }); await f.load(); document.fonts.add(f); }
function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error(`photo not found: ${src}`)); im.src = src; }); }
