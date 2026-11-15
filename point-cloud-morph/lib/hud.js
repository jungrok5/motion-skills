// point-cloud-morph · hud.js — the instrument layer drawn over the cloud on the same frame (so the MP4 has it):
// site chrome (top bar, bottom strip with stats and section tabs, left ruler), the figure label and the live
// YAW / PITCH / SCAN readout, the section copy (kicker, two-tone headline, body, button, link), callouts pinned to 3D
// points, rings and dotted paths in 3D, the orbit hint and a vignette. All sizes are 1080p px; all timing is a function
// of the shot's local time, so a frame is the same however you reach it.
const MONO = '"PCM Mono", "PCM KR", ui-monospace, monospace', SANS = '"PCM Sans", "PCM KR", system-ui, sans-serif';
const span = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const sm = (t) => t * t * (3 - 2 * t);

export async function loadFonts() {
  const u = (f) => `url(${new URL('./fonts/' + f, import.meta.url).href})`;
  const faces = [
    new FontFace('PCM Sans', u('Inter-500.woff2'), { weight: '400 500' }), new FontFace('PCM Sans', u('Inter-600.woff2'), { weight: '600' }),
    new FontFace('PCM Sans', u('Inter-700.woff2'), { weight: '700 900' }), new FontFace('PCM Mono', u('JetBrainsMono.woff2'), { weight: '100 800' }),
    new FontFace('PCM KR', u('NotoSansKR-500.woff2'), { weight: '100 900' }),
  ];
  await Promise.all(faces.map(async (f) => { try { document.fonts.add(await f.load()); } catch (e) { console.warn('font failed', f.family, e.message); } }));
}

export class Hud {
  constructor(film, cfg = {}) {
    this.f = film;
    this.c = { brand: 'STUDIO', nav: [], contact: 'CONTACT', tabs: [], hint: 'DRAG TO ORBIT / ARROWS TO NAVIGATE', chrome: true, ruler: true, vignette: 0.6, readout: true, ...cfg };
    this.m = document.createElement('canvas').getContext('2d');
  }
  // ---- layout helpers (1080p units)
  _wrap(text, font, maxW) { const g = this.m; g.font = font; g.letterSpacing = '0px'; const out = []; for (const para of String(text).split('\n')) { let line = ''; for (const w of para.split(/\s+/)) { const tryL = line ? line + ' ' + w : w; if (g.measureText(tryL).width > maxW && line) { out.push(line); line = w; } else line = tryL; } out.push(line); } return out; }
  _copyLayout(s) {
    const h = s.hud || {}; if (!h.title && !h.kicker && !h.body) return null;
    const x = h.copyX ?? 128, maxW = h.copyW ?? 560, tSize = h.titleSize ?? 64, rows = [];
    let y = 0;
    if (h.kicker) { rows.push({ k: 'kicker', y: y + 14 }); y += 50; }
    const title = [].concat(h.title || []); title.forEach((_, i) => rows.push({ k: 'title', i, y: y + tSize * 0.8 + i * tSize * 1.02 })); if (title.length) y += title.length * tSize * 1.02 + 26;
    const body = h.body ? this._wrap(h.body, `400 20px ${SANS}`, maxW - 40) : []; body.forEach((l, i) => rows.push({ k: 'body', l, y: y + 18 + i * 30 })); if (body.length) y += body.length * 30 + 30;
    if (h.button) { rows.push({ k: 'button', y }); y += 52 + 26; }
    if (h.link) { rows.push({ k: 'link', y: y + 14 }); y += 34; }
    const top = (h.copyY ?? 540) - y / 2;
    return { x, top, w: maxW, h: y, rows, tSize, title };
  }
  copyBox(s) { const L = this._copyLayout(s); return L ? [L.x - 16, L.top - 16, L.w + 16, L.h + 32] : null; }
  copyIn(s) { return s.hud?.copyAt ?? Math.max(0.3, s.in.dur * 0.6); }
  _callouts(s) { return (s.hud?.callouts || []).map((c, j) => ({ ...c, at0: c.t ?? s.in.dur + 0.4 + j * 0.45 })); }
  _calloutBox(c, ax, ay) {
    const g = this.m; g.font = `500 14px ${MONO}`; g.letterSpacing = '1.6px';
    const tw = g.measureText(c.text).width, dx = c.dx ?? 110, dy = c.dy ?? -70, ex = ax + dx, ey = ay + dy, w = tw + 26, hh = 32;
    const bx = dx >= 0 ? ex + 22 : ex - 22 - w;
    return { box: [bx, ey - hh / 2, w, hh], ex, ey };
  }
  // where each callout lands when it appears (check + cues)
  calloutBoxes(s) {
    const F = this.f, out = [], pt = [];
    for (const c of this._callouts(s)) {
      F._camera(s, Math.min(s.dur - 0.01, c.at0 + 0.4), false); F.project(c.at, pt);
      const ax = pt[0] / F.k, ay = pt[1] / F.k, onScreen = pt[2] && ax >= 0 && ax <= 1920 && ay >= 0 && ay <= 1080;
      out.push({ text: c.text, onScreen, at0: c.at0, ...this._calloutBox(c, ax, ay) });
    }
    return out;
  }
  label(g, text, k) { g.save(); g.scale(k, k); g.font = `500 15px ${MONO}`; g.letterSpacing = '2px'; g.fillStyle = 'rgba(236,233,226,.75)'; g.fillText(text, 48, 1080 - 44); g.restore(); }

  // ---- draw
  draw(g, st) {
    const { a, s, cam, k } = st, F = this.f, C = this.c, h = s.hud || {}, lt = a.lt, ink = F.o.ink, acc = F.o.accent;
    const prev = F.shots[s.i - 1], chromeOf = (x) => (x?.hud?.chrome ?? C.chrome) ? 1 : 0;
    const chrome = s.i === 0 ? chromeOf(s) : chromeOf(prev) + (chromeOf(s) - chromeOf(prev)) * sm(span(lt, 0, 0.9));
    const out = 1 - sm(span(lt, s.dur - 0.45, s.dur - 0.05)), last = s.i === F.shots.length - 1 && !F.o.loop;
    const outK = last ? 1 : out;
    g.save(); g.scale(k, k);
    // vignette
    if (C.vignette > 0) { const vg = g.createRadialGradient(960, 540, 300, 960, 540, 1150); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${C.vignette})`); g.fillStyle = vg; g.fillRect(0, 0, 1920, 1080); }
    // 3D rings and dotted paths (behind text)
    const draw3 = span(lt, s.in.dur * 0.7, s.in.dur * 0.7 + 1.4) * outK;
    if (draw3 > 0) {
      for (const r of h.rings || []) this._ring(g, r, draw3, ink);
      for (const p of h.paths || []) this._path(g, p, draw3, ink);
    }
    // site chrome
    if (chrome > 0.001) {
      g.globalAlpha = chrome;
      this._topbar(g, ink, acc); this._strip(g, s, ink, acc); if (C.ruler) this._ruler(g, ink);
      g.globalAlpha = 1;
    }
    // figure label (top left) and readout (top right)
    const topY = 40 + 78 * chrome;
    if (h.fig) {
      const [l1, l2] = [].concat(h.fig), tp = span(lt, 0.15, 0.85), A = (s.i === 0 ? 1 : sm(span(lt, 0.1, 0.4))) * outK;
      g.globalAlpha = A; this._text(g, type(l1, tp), 64, topY, `500 14px ${MONO}`, ink, 2.2);
      if (l2) this._text(g, type(l2, span(lt, 0.4, 1.0)), 64, topY + 20, `400 13px ${MONO}`, rgba(ink, 0.5), 2);
      g.globalAlpha = 1;
    }
    if (C.readout) {
      const yaw = String(Math.round(((cam.yawShown % 360) + 360) % 360)).padStart(3, '0'), pitch = String(Math.round(cam.pitchShown)).padStart(2, '0');
      this._text(g, `YAW ${yaw} / PITCH ${pitch}`, 1856, topY, `500 14px ${MONO}`, ink, 2.2, 'right');
      const pct = String(Math.round(a.p * 100)).padStart(3, '0');
      this._text(g, `${h.scan || 'SCAN ' + String(s.i + 1).padStart(2, '0')} / ${pct}%`, 1856, topY + 20, `400 13px ${MONO}`, rgba(ink, 0.5), 2, 'right');
    }
    // callouts
    const pt = [];
    for (const c of this._callouts(s)) {
      const p = span(lt, c.at0, c.at0 + 0.9); if (p <= 0) continue;
      F.project(c.at, pt); if (!pt[2]) continue;
      const ax = pt[0] / k, ay = pt[1] / k, { box, ex, ey } = this._calloutBox(c, ax, ay), A = outK;
      g.globalAlpha = A;
      const lp = span(p, 0, 0.35), sq = 9 * sm(span(p, 0, 0.2));
      g.strokeStyle = rgba(ink, 0.85); g.lineWidth = 1.2; g.strokeRect(ax - sq / 2, ay - sq / 2, sq, sq);
      g.beginPath(); g.moveTo(ax, ay); const mx = ax + (ex - ax) * lp, my = ay + (ey - ay) * lp; g.lineTo(mx, my);
      if (lp >= 1) g.lineTo(ex + (c.dx ?? 110) / Math.abs(c.dx ?? 110) * 22 * span(p, 0.35, 0.45), ey);
      g.stroke();
      const bp = span(p, 0.4, 0.55);
      if (bp > 0) {
        g.globalAlpha = A * bp; g.fillStyle = 'rgba(8,10,12,.78)'; g.fillRect(box[0], box[1], box[2], box[3]); g.strokeStyle = rgba(ink, 0.22); g.strokeRect(box[0] + 0.5, box[1] + 0.5, box[2] - 1, box[3] - 1);
        const txt = type(c.text, span(p, 0.45, 1)), sp = c.text.indexOf(' '), head = sp > 0 ? txt.slice(0, sp) : txt, rest = sp > 0 ? txt.slice(sp) : '';
        g.font = `500 14px ${MONO}`; g.letterSpacing = '1.6px'; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillStyle = c.accent === false ? ink : acc; g.fillText(head, box[0] + 13, box[1] + 17); const hw = g.measureText(head).width;
        g.fillStyle = rgba(ink, 0.82); g.fillText(rest, box[0] + 13 + hw, box[1] + 17); g.textBaseline = 'alphabetic';
      }
      g.globalAlpha = 1;
    }
    // section copy
    const L = this._copyLayout(s);
    if (L) {
      const ci = this.copyIn(s), A = sm(span(lt, ci, ci + 0.7)) * outK, dy = (1 - sm(span(lt, ci, ci + 0.9))) * 18;
      if (A > 0) {
        g.globalAlpha = A;
        for (const r of L.rows) {
          const y = L.top + r.y + dy;
          if (r.k === 'kicker') this._text(g, type(h.kicker, span(lt, ci, ci + 0.8)), L.x, y, `500 14px ${MONO}`, mixc(ink, acc, 0.45), 2.2);
          else if (r.k === 'title') this._text(g, L.title[r.i], L.x - 3, y, `600 ${L.tSize}px ${SANS}`, r.i === 0 ? ink : rgba(ink, 0.5), -L.tSize * 0.035);
          else if (r.k === 'body') this._text(g, r.l, L.x, y, `400 20px ${SANS}`, rgba(ink, 0.82), 0);
          else if (r.k === 'button') this._button(g, h.button, L.x, y, ink, acc);
          else if (r.k === 'link') { this._text(g, h.link + '  ↗', L.x, y, `500 13px ${MONO}`, ink, 2.2); g.fillStyle = rgba(ink, 0.5); g.fillRect(L.x, y + 8, this._measure(h.link, `500 13px ${MONO}`, 2.2), 1); }
        }
        g.globalAlpha = 1;
      }
    }
    // hint
    if (C.hint) this._text(g, C.hint, 1856, 1080 - 48 - 96 * chrome, `400 13px ${MONO}`, rgba(ink, 0.55), 2.4, 'right');
    g.restore();
  }

  _text(g, t, x, y, font, color, ls = 0, align = 'left') { if (!t) return; g.font = font; g.letterSpacing = `${ls}px`; g.fillStyle = color; g.textAlign = align; g.fillText(t, x, y); g.textAlign = 'left'; g.letterSpacing = '0px'; }
  _measure(t, font, ls = 0) { const g = this.m; g.font = font; g.letterSpacing = `${ls}px`; return g.measureText(t).width; }
  _button(g, label, x, y, ink, acc) {
    const w = this._measure(label, `600 13px ${MONO}`, 2.4) + 64;
    g.fillStyle = rgba(ink, 0.92); g.fillRect(x, y, w, 52); g.fillStyle = acc; g.fillRect(x + w, y, 52, 52);
    this._text(g, label, x + 32, y + 31, `600 13px ${MONO}`, '#0b0d10', 2.4);
    g.strokeStyle = '#0b0d10'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x + w + 18, y + 26); g.lineTo(x + w + 34, y + 26); g.moveTo(x + w + 28, y + 20); g.lineTo(x + w + 34, y + 26); g.lineTo(x + w + 28, y + 32); g.stroke();
  }
  _topbar(g, ink, acc) {
    const C = this.c;
    g.fillStyle = 'rgba(4,5,6,.55)'; g.fillRect(0, 0, 1920, 76); g.fillStyle = rgba(ink, 0.1); g.fillRect(0, 76, 1920, 1);
    g.fillStyle = ink; for (let i = 0; i < 3; i++) g.fillRect(64, 31 + i * 6, 20, 1.6);
    this._text(g, C.brand, 104, 44, `700 17px ${MONO}`, ink, 4);
    if (C.nav.length) {
      const fs = `500 13px ${MONO}`, ws = C.nav.map((n) => this._measure(n, fs, 2.2) + 22), gap = 48, tot = ws.reduce((a, b) => a + b, 0) + gap * (C.nav.length - 1);
      let x = 960 - tot / 2;
      C.nav.forEach((n, i) => { this._text(g, n, x, 44, fs, rgba(ink, 0.72), 2.2); this._text(g, String(i + 2).padStart(2, '0'), x + ws[i] - 18, 36, `500 9px ${MONO}`, rgba(ink, 0.5), 1); x += ws[i] + gap; });
    }
    const cw = this._measure(C.contact, `500 13px ${MONO}`, 2.2) + 36;
    g.strokeStyle = rgba(ink, 0.55); g.lineWidth = 1; g.strokeRect(1856 - cw + 0.5, 22.5, cw, 34); this._text(g, C.contact, 1856 - cw / 2, 44, `500 13px ${MONO}`, ink, 2.2, 'center');
    g.strokeStyle = rgba(ink, 0.4); g.strokeRect(1856 - cw - 50.5, 22.5, 34, 34); g.fillStyle = rgba(ink, 0.8); g.fillRect(1856 - cw - 40, 36, 2, 8); g.fillRect(1856 - cw - 34, 36, 2, 8);
    g.fillStyle = acc; g.fillRect(1856 - cw - 84, 34, 10, 10);
  }
  _strip(g, s, ink, acc) {
    const C = this.c, h = s.hud || {}, y = 1080 - 96;
    g.fillStyle = 'rgba(4,5,6,.6)'; g.fillRect(0, y, 1920, 96); g.fillStyle = rgba(ink, 0.1); g.fillRect(0, y, 1920, 1);
    const stats = h.stats || [];
    stats.slice(0, 3).forEach(([l1, l2, v], i) => { const x = 64 + i * 190; if (i) { g.fillStyle = rgba(ink, 0.1); g.fillRect(x - 22, y + 20, 1, 56); } this._text(g, l1, x, y + 30, `500 12px ${MONO}`, rgba(ink, 0.5), 1.8); if (l2) this._text(g, l2, x, y + 46, `500 12px ${MONO}`, rgba(ink, 0.5), 1.8); this._text(g, v, x, y + 74, `500 19px ${MONO}`, ink, 1.6); });
    const tabs = C.tabs; if (tabs.length) {
      const x0 = 720, x1 = 1640, tw = (x1 - x0) / tabs.length, act = h.tab ?? s.i;
      tabs.forEach((n, i) => { const x = x0 + i * tw, on = i === act; g.fillStyle = rgba(ink, 0.1); g.fillRect(x, y + 20, 1, 56); if (on) { g.fillStyle = acc; g.fillRect(x, y, tw, 2); } this._text(g, String(i + 1).padStart(2, '0'), x + 22, y + 38, `500 12px ${MONO}`, rgba(ink, on ? 0.8 : 0.4), 1.8); this._text(g, n, x + 22, y + 62, `500 14px ${MONO}`, on ? ink : rgba(ink, 0.45), 2); });
    }
    g.fillStyle = rgba(ink, 0.7); g.fillRect(1760, y + 40, 3, 16); g.fillRect(1768, y + 40, 3, 16);
  }
  _ruler(g, ink) {
    g.fillStyle = rgba(ink, 0.18); g.fillRect(64, 150, 1, 780);
    for (let i = 0, y = 156; y < 930; i++, y += 26) { const big = i % 5 === 0; g.fillRect(64, y, big ? 12 : 6, 1); if (big) this._text(g, String(6 + i / 5).padStart(2, '0'), 84, y + 4, `400 10px ${MONO}`, rgba(ink, 0.4), 1); }
  }
  _ring(g, r, p, ink) {
    const F = this.f, pt = [], n = 128, axis = r.axis || 'y', on = (a, rr) => { const c = Math.cos(a) * rr, s = Math.sin(a) * rr; return axis === 'y' ? [r.c[0] + c, r.c[1], r.c[2] + s] : axis === 'x' ? [r.c[0], r.c[1] + c, r.c[2] + s] : [r.c[0] + c, r.c[1] + s, r.c[2]]; };
    g.strokeStyle = rgba(ink, (r.alpha ?? 0.45) * p); g.lineWidth = 1.2; g.beginPath(); let started = false;
    for (let i = 0; i <= n * p; i++) { F.project(on((i / n) * Math.PI * 2, r.r), pt); if (!pt[2]) { started = false; continue; } const x = pt[0] / F.k, y = pt[1] / F.k; if (!started) { g.moveTo(x, y); started = true; } else g.lineTo(x, y); }
    g.stroke();
    const ticks = r.ticks ?? 72; g.beginPath();
    for (let i = 0; i < ticks * p; i++) { const a = (i / ticks) * Math.PI * 2, big = i % 6 === 0, A = []; F.project(on(a, r.r), pt); A.push(pt[0] / F.k, pt[1] / F.k, pt[2]); F.project(on(a, r.r * (big ? 1.06 : 1.03)), pt); if (A[2] && pt[2]) { g.moveTo(A[0], A[1]); g.lineTo(pt[0] / F.k, pt[1] / F.k); } }
    g.stroke();
  }
  _path(g, P, p, ink) {
    const F = this.f, pt = [], pts = P.pts.map((v) => { F.project(v, pt); return [pt[0] / F.k, pt[1] / F.k, pt[2]]; });
    let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    const until = L * p, gap = P.gap ?? 9; g.fillStyle = rgba(ink, P.alpha ?? 0.8); g.strokeStyle = rgba(ink, P.alpha ?? 0.6); g.lineWidth = 1.2;
    if (P.dotted === false) { g.beginPath(); let acc = 0; g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { if (acc + seg[i - 1] > until) { const t = (until - acc) / seg[i - 1]; g.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t); break; } acc += seg[i - 1]; g.lineTo(pts[i][0], pts[i][1]); } g.stroke(); return; }
    let acc = 0, next = 0;
    for (let i = 1; i < pts.length; i++) { const d = seg[i - 1]; while (next <= acc + d && next <= until) { const t = (next - acc) / (d || 1); if (pts[i][2] && pts[i - 1][2]) g.fillRect(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t - 1.3, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t - 1.3, 2.6, 2.6); next += gap; } acc += d; }
  }
}

function type(t, p) { if (!t) return ''; const n = Math.round(t.length * p); return n >= t.length ? t : t.slice(0, n) + (n > 0 && p < 1 ? '▍' : ''); }
function hex(c) { const m = /^#?([0-9a-f]{6})$/i.exec(c); const v = m ? parseInt(m[1], 16) : 0xffffff; return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
function rgba(c, a) { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; }
function mixc(a, b, t) { const A = hex(a), B = hex(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(',')})`; }
