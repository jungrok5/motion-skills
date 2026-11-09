// landmark-map-3d · labels.js — the map's words: POI pins (round category badge + name with a halo), the landmark's
// star badge, area and water names, street names painted on the ground along the real road, the title block, a clock
// chip that follows the time of day, the end card and the OpenStreetMap credit. Pins are drawn in 2D over the frame at
// their projected 3D anchor; street names are 3D (they lie on the road and foreshorten with it). All pure functions of t.
import { THREE, clamp, smooth, ease, col, shade, cumLen, along, strHash, polyLen } from './core.js';

export const CATS = {
  food: '#ff8a3d', cafe: '#c07f4f', bar: '#a46be0', shop: '#ef5a9d', hotel: '#6b7ce6', museum: '#d68d24', sight: '#8a6cf2',
  park: '#3fae5a', transit: '#3b8ee8', ferry: '#22a6c9', worship: '#8b8aa3', culture: '#e3587b', school: '#c9a227', health: '#e64b4b',
  info: '#5a8fd8', water: '#3e8fd8', star: '#8a6cf2', view: '#22a6a0',
};
export const FONT = `'Map Round', 'Map Sans', 'Noto Sans KR', system-ui, sans-serif`;

// 24×24 glyphs, white on the badge
const ICON = {
  food: g => { g.lineWidth = 2.2; g.beginPath(); g.moveTo(8, 4); g.lineTo(8, 20); g.moveTo(5.5, 4); g.lineTo(5.5, 9); g.quadraticCurveTo(8, 12, 10.5, 9); g.lineTo(10.5, 4); g.moveTo(16, 20); g.lineTo(16, 4); g.quadraticCurveTo(19.5, 7, 18.5, 12); g.lineTo(16, 12); g.stroke(); },
  cafe: g => { g.lineWidth = 2.2; g.beginPath(); g.moveTo(5, 9); g.lineTo(17, 9); g.lineTo(16, 17); g.quadraticCurveTo(11, 20, 6, 17); g.closePath(); g.stroke(); g.beginPath(); g.arc(18, 12, 2.5, -1.3, 1.3); g.stroke(); g.beginPath(); g.moveTo(9, 3); g.quadraticCurveTo(7.5, 5, 9, 7); g.moveTo(13, 3); g.quadraticCurveTo(11.5, 5, 13, 7); g.stroke(); },
  bar: g => { g.lineWidth = 2.2; g.beginPath(); g.moveTo(5, 5); g.lineTo(19, 5); g.lineTo(12, 13); g.closePath(); g.moveTo(12, 13); g.lineTo(12, 19); g.moveTo(8, 19.5); g.lineTo(16, 19.5); g.stroke(); },
  shop: g => { g.lineWidth = 2.2; g.beginPath(); g.roundRect(5, 8, 14, 12, 2); g.stroke(); g.beginPath(); g.arc(12, 8, 3.5, Math.PI, 0); g.stroke(); },
  hotel: g => { g.lineWidth = 2.2; g.beginPath(); g.moveTo(4, 6); g.lineTo(4, 19); g.moveTo(4, 15); g.lineTo(20, 15); g.lineTo(20, 19); g.moveTo(10, 15); g.lineTo(10, 11); g.lineTo(18, 11); g.quadraticCurveTo(20, 11, 20, 13); g.lineTo(20, 15); g.stroke(); g.beginPath(); g.arc(7, 11.5, 1.8, 0, 7); g.fill(); },
  museum: g => { g.lineWidth = 2; g.beginPath(); g.moveTo(3.5, 9); g.lineTo(12, 4); g.lineTo(20.5, 9); g.closePath(); g.stroke(); for (const x of [6.5, 10.2, 13.8, 17.5]) { g.beginPath(); g.moveTo(x, 11); g.lineTo(x, 17); g.stroke(); } g.beginPath(); g.moveTo(4, 19.5); g.lineTo(20, 19.5); g.stroke(); },
  sight: g => star(g, 12, 12.6, 8.6, 3.8),
  star: g => star(g, 12, 12.6, 8.6, 3.8),
  park: g => { g.beginPath(); g.arc(12, 9.5, 5.6, 0, 7); g.fill(); g.lineWidth = 2.4; g.beginPath(); g.moveTo(12, 12); g.lineTo(12, 20); g.stroke(); },
  transit: g => { g.lineWidth = 2.1; g.beginPath(); g.roundRect(6.5, 3.5, 11, 14, 3); g.stroke(); g.beginPath(); g.moveTo(6.5, 11); g.lineTo(17.5, 11); g.stroke(); g.beginPath(); g.arc(9.3, 14.3, 1.2, 0, 7); g.arc(14.7, 14.3, 1.2, 0, 7); g.fill(); g.beginPath(); g.moveTo(8.5, 18); g.lineTo(6.5, 21); g.moveTo(15.5, 18); g.lineTo(17.5, 21); g.stroke(); },
  ferry: g => { g.lineWidth = 2.1; g.beginPath(); g.moveTo(3.5, 13); g.lineTo(20.5, 13); g.lineTo(17.5, 18); g.lineTo(6.5, 18); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(8, 13); g.lineTo(8, 9); g.lineTo(16, 9); g.lineTo(16, 13); g.moveTo(12, 9); g.lineTo(12, 5.5); g.stroke(); },
  worship: g => { g.lineWidth = 2.1; g.beginPath(); g.moveTo(5, 20); g.lineTo(5, 11); g.quadraticCurveTo(12, 3, 19, 11); g.lineTo(19, 20); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(12, 3); g.lineTo(12, 6.5); g.stroke(); },
  culture: g => { g.beginPath(); g.moveTo(9, 18.5); g.lineTo(9, 6); g.lineTo(18, 4); g.lineTo(18, 16); g.lineWidth = 2.2; g.stroke(); g.beginPath(); g.ellipse(7, 18.5, 2.6, 2, -.3, 0, 7); g.ellipse(16, 16.5, 2.6, 2, -.3, 0, 7); g.fill(); },
  school: g => { g.lineWidth = 2.1; g.beginPath(); g.moveTo(12, 7); g.quadraticCurveTo(8, 4.5, 4, 6); g.lineTo(4, 18); g.quadraticCurveTo(8, 16.5, 12, 19); g.quadraticCurveTo(16, 16.5, 20, 18); g.lineTo(20, 6); g.quadraticCurveTo(16, 4.5, 12, 7); g.lineTo(12, 19); g.stroke(); },
  health: g => { g.fillRect(10, 5, 4, 14); g.fillRect(5, 10, 14, 4); },
  info: g => { g.beginPath(); g.arc(12, 6.5, 1.8, 0, 7); g.fill(); g.fillRect(10.4, 10, 3.2, 9.5); },
  view: g => { g.lineWidth = 2.1; g.beginPath(); g.ellipse(12, 12, 8, 5, 0, 0, 7); g.stroke(); g.beginPath(); g.arc(12, 12, 2.6, 0, 7); g.fill(); },
  water: g => { g.beginPath(); g.moveTo(12, 4); g.quadraticCurveTo(19, 12, 17, 16); g.quadraticCurveTo(12, 22, 7, 16); g.quadraticCurveTo(5, 12, 12, 4); g.fill(); },
};
function star(g, cx, cy, R, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r : R; g.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); } g.closePath(); g.fill(); }
const css = c => '#' + col(c).getHexString(THREE.SRGBColorSpace);

export class Labels {
  constructor(F) {
    this.F = F; this.list = []; this.ground = []; this.titles = []; this.chips = []; this.ends = [];
    this.S = F.W / 1080;
  }
  // a pin: { text, at: [x, z] | [x, y, z], icon, color, from, to, priority, big, sub, minDist, maxDist, side }
  add(o) {
    const at = o.at.length === 3 ? o.at : [o.at[0], o.y ?? this.F.anchorY(o.at[0], o.at[1]), o.at[1]];
    const L = { from: 0, to: 1e9, priority: o.big ? 100 : 10, icon: 'sight', side: 'right', ...o, at, id: this.list.length };
    L.color = o.color ?? CATS[L.icon] ?? CATS.sight;
    this.list.push(L); return L;
  }
  // area / water names: lying-flat-looking italic text at a point, no badge
  area(o) { return this.add({ kind: 'area', icon: null, priority: 5, y: o.y ?? .5, ...o }); }

  // a street name painted on the ground along a polyline: { text, path, size (m), color, opacity, from, to, offset }
  street(o) {
    const F = this.F, p = o.path; if (!p || p.length < 2) return null;
    const size = o.size ?? 7, track = o.spacing ?? .35, text = (o.caps ?? true) ? o.text.toUpperCase() : o.text;
    const cv = document.createElement('canvas'), g = cv.getContext('2d'), px = 64;
    g.font = `800 ${px}px ${FONT}`;
    const chars = [...text], widths = chars.map(c => g.measureText(c).width), tw = widths.reduce((a, b) => a + b, 0) + track * px * (chars.length - 1);
    cv.width = Math.ceil(tw + px * .6); cv.height = Math.ceil(px * 1.5);
    g.font = `800 ${px}px ${FONT}`; g.textBaseline = 'middle'; g.lineJoin = 'round';
    let x = px * .3;
    for (let i = 0; i < chars.length; i++) {
      g.lineWidth = px * .16; g.strokeStyle = o.stroke ?? 'rgba(70,60,95,.55)'; g.strokeText(chars[i], x, cv.height / 2);
      g.fillStyle = o.color ?? '#ffffff'; g.fillText(chars[i], x, cv.height / 2); x += widths[i] + track * px;
    }
    const lenM = size * cv.width / cv.height;            // metres along the road the text needs
    const c = cumLen(p), L = c.at(-1);
    const mid = o.at != null ? o.at : L / 2, s0 = clamp(mid - lenM / 2, 0, Math.max(0, L - lenM)), s1 = Math.min(L, s0 + lenM);
    // reading direction: left to right for the camera at time o.readAt
    const tRead = o.readAt ?? ((o.from ?? 0) + Math.min(o.to ?? F.duration, F.duration)) / 2;
    const cam = F.cameraAt(tRead), [, , dx, dz] = along(p, c, (s0 + s1) / 2);
    const right = [Math.cos(cam.yawR), Math.sin(cam.yawR)];           // camera's screen-right on the ground
    const flip = dx * right[0] + dz * right[1] < 0;
    const pos = [], uv = [], idx = [], N = Math.max(2, Math.ceil((s1 - s0) / 1.5)), hw = size * .5, y = (o.y ?? .1) + .02;
    for (let i = 0; i <= N; i++) {
      const s = s0 + (s1 - s0) * i / N, [qx, qz, tx, tz] = along(p, c, s), nx = -tz, nz = tx, off = o.offset ?? 0;
      const u = flip ? 1 - i / N : i / N;
      const sgn = flip ? -1 : 1;
      pos.push(qx + nx * (off - hw * sgn), y, qz + nz * (off - hw * sgn), qx + nx * (off + hw * sgn), y, qz + nz * (off + hw * sgn));
      uv.push(u, 1, u, 0);
      if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = F.renderer.capabilities.getMaxAnisotropy();
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: o.opacity ?? .78, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 4; F.scene.add(mesh);
    const G = { ...o, text, mesh, mat, base: o.opacity ?? .78, from: o.from ?? 0, to: o.to ?? 1e9, lenM };
    this.ground.push(G); return G;
  }
  title(o) { this.titles.push({ from: 0, to: 1e9, ...o }); }
  clock(o) { this.chips.push(o); }
  end(o) { this.ends.push(o); }
  allText() { return [...this.list.map(l => (l.text || '') + (l.sub || '')), ...this.ground.map(g => g.text), ...this.titles.flatMap(t => [t.text, t.kicker, t.sub, t.coords]), ...this.ends.flatMap(e => [e.text, e.sub, e.kicker]), ...this.chips.flatMap(c => (c.keys || []).map(k => k.label || '')), this.F.place?.credit || '', 'Map data © OpenStreetMap contributors', '0123456789:°′″NSEW·'].filter(Boolean).join(''); }

  update3d(t, L) {
    for (const g of this.ground) {
      const a = smooth(g.from, g.from + .8, t) * (1 - smooth(g.to - .8, g.to, t));
      g.mat.opacity = g.base * a * (1 - L.glow * .35); g.mesh.visible = a > .01;
    }
  }

  // ---------------------------------------------------------------- 2D pass (called after the frame is composited)
  draw(g, t, cam, L) {
    const F = this.F, S = this.S, W = F.W, H = F.H, night = clamp(L.glow ?? 0);
    const v = new THREE.Vector3(), items = [];
    for (const l of this.list) {
      if (t < l.from - .01 || t > l.to + .6) continue;
      v.set(...l.at).project(cam);
      if (v.z > 1 || v.z < -1) continue;
      const x = (v.x * .5 + .5) * W, y = (-v.y * .5 + .5) * H;
      if (x < -200 * S || x > W + 200 * S || y < -100 * S || y > H + 100 * S) continue;
      const dist = cam.position.distanceTo(v.set(...l.at));
      let a = smooth(l.from, l.from + .45, t) * (1 - smooth(l.to, l.to + .5, t));
      if (l.maxDist) a *= 1 - smooth(l.maxDist * .85, l.maxDist, dist);
      if (l.minDist) a *= smooth(l.minDist, l.minDist * 1.2, dist);
      // keep pins out of the title block and the bottom safe area
      a *= smooth(H * .035, H * .07, y) * (1 - smooth(H * .9, H * .95, y));
      if (a < .01) continue;
      const pop = ease.back(clamp((t - l.from) / .4));
      items.push({ l, x, y, a, pop, dist });
    }
    // collision: lower priority fades where it overlaps higher priority
    items.sort((p, q) => q.l.priority - p.l.priority || p.l.id - q.l.id);
    const rects = [];
    for (const it of items) {
      const r = this.measure(g, it); it.r = r;
      const out = Math.max(0, -r.x, r.x + r.w - W, -r.y, r.y + r.h - H) / (30 * S); it.a *= clamp(1 - out);
      let ov = 0; for (const o of rects) ov = Math.max(ov, overlap(r, o) / (r.w * r.h));
      it.a *= clamp(1 - ov * 3.5);
      if (it.a > .2) rects.push(r);
    }
    this.overlaps = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const A = items[i], B = items[j]; if (A.a < .6 || B.a < .6) continue;
      if (overlap(A.r, B.r) > .08 * Math.min(A.r.w * A.r.h, B.r.w * B.r.h)) this.overlaps.push(`${A.l.text} × ${B.l.text}`);
    }
    for (const it of items.reverse()) if (it.a > .01) this.pin(g, it, night);
    this.drawTitles(g, t, night); this.drawChips(g, t, L); this.drawEnds(g, t);
    // the data credit, always on
    g.save(); g.font = `700 ${15 * S}px ${FONT}`; g.textAlign = 'right'; g.fillStyle = `rgba(255,255,255,${.62 - night * .12})`; g.shadowColor = 'rgba(20,15,40,.55)'; g.shadowBlur = 4 * S;
    g.fillText(F.place?.credit ? '© OpenStreetMap contributors' : '', W - 22 * S, H - 22 * S); g.restore();
  }
  measure(g, { l, x, y }) {
    const S = this.S, fs = (l.big ? 40 : l.kind === 'area' ? 27 : 27) * S * (l.scale ?? 1);
    g.font = `${l.kind === 'area' ? 'italic 800' : '800'} ${fs}px ${FONT}`;
    const lines = wrap(l.text, l.big ? 18 : 16), w = Math.max(...lines.map(s => g.measureText(s).width)), br = (l.big ? 30 : 21) * S * (l.scale ?? 1);
    if (l.kind === 'area') return { x: x - w / 2, y: y - fs * lines.length / 2, w, h: fs * 1.2 * lines.length, lines, fs, br: 0 };
    // text on the requested side, flipped when it would run off the frame
    let side = l.side; const W = this.F.W, m = 18 * S;
    if (side !== 'left' && x + br + 8 * S + w > W - m && x - br - 8 * S - w > m) side = 'left';
    else if (side === 'left' && x - br - 8 * S - w < m && x + br + 8 * S + w < W - m) side = 'right';
    const tx = side === 'left' ? x - br - 8 * S - w : x + br + 8 * S;
    return { x: Math.min(tx, x - br), y: y - Math.max(br, fs * lines.length * .6), w: w + br * 2 + 8 * S, h: Math.max(br * 2, fs * 1.18 * lines.length), lines, fs, br, tx, side };
  }
  pin(g, { l, x, y, a, pop, r }, night) {
    const S = this.S, k = .55 + .45 * pop;
    g.save(); g.globalAlpha = a; g.lineJoin = 'round';
    const day = 1 - night, base = col(l.color);
    if (l.kind === 'area') {
      g.font = `italic 800 ${r.fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const tc = css(night > .5 ? shade(base, 1.5) : shade(base, .6));
      r.lines.forEach((s, i) => { const yy = y + (i - (r.lines.length - 1) / 2) * r.fs * 1.12; g.lineWidth = 6 * S; g.strokeStyle = night > .5 ? 'rgba(24,20,52,.72)' : 'rgba(255,255,255,.88)'; g.strokeText(s, x, yy); g.fillStyle = tc; g.fillText(s, x, yy); });
      g.restore(); return;
    }
    // badge
    const br = r.br * k;
    g.shadowColor = 'rgba(30,20,60,.35)'; g.shadowBlur = 8 * S; g.shadowOffsetY = 3 * S;
    const grd = g.createLinearGradient(x, y - br, x, y + br); grd.addColorStop(0, css(shade(base, 1.18))); grd.addColorStop(1, css(shade(base, .86)));
    g.beginPath(); g.arc(x, y, br, 0, 7); g.fillStyle = grd; g.fill();
    g.shadowColor = 'transparent'; g.lineWidth = 2.6 * S; g.strokeStyle = 'rgba(255,255,255,.95)'; g.stroke();
    if (l.icon && ICON[l.icon]) { g.save(); g.translate(x - br * .62, y - br * .62); g.scale(br * 1.24 / 24, br * 1.24 / 24); g.fillStyle = g.strokeStyle = '#fff'; g.lineCap = 'round'; ICON[l.icon](g); g.restore(); }
    // name
    g.font = `800 ${r.fs * k}px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = r.side === 'left' ? 'right' : 'left';
    const tx = r.side === 'left' ? x - br - 8 * S : x + br + 8 * S;
    const tc = night > .5 ? '#ffffff' : css(shade(base, l.big ? .5 : .55));
    r.lines.forEach((s, i) => {
      const yy = y + (i - (r.lines.length - 1) / 2) * r.fs * 1.08 * k;
      g.lineWidth = 7 * S; g.strokeStyle = night > .5 ? `rgba(24,20,52,${.55 + .25 * night})` : `rgba(255,255,255,${.75 + .2 * day})`; g.strokeText(s, tx, yy);
      g.fillStyle = tc; g.fillText(s, tx, yy);
    });
    if (l.sub) { g.font = `700 ${r.fs * .62}px ${FONT}`; const yy = y + r.lines.length * r.fs * .62 + 6 * S; g.lineWidth = 5 * S; g.strokeText(l.sub, tx, yy); g.fillStyle = night > .5 ? 'rgba(255,255,255,.8)' : css(shade(base, .45)); g.fillText(l.sub, tx, yy); }
    g.restore();
  }
  drawTitles(g, t, night) {
    const S = this.S, W = this.F.W;
    for (const T of this.titles) {
      const a = smooth(T.from, T.from + .9, t) * (1 - smooth(T.to - .7, T.to, t)); if (a < .005) continue;
      const rise = (1 - ease.out(clamp((t - T.from) / 1.1))) * 26 * S;
      const x = (T.x ?? 70) * S; let y = (T.y ?? 190) * S + rise;
      g.save(); g.globalAlpha = a; g.textBaseline = 'alphabetic';
      g.shadowColor = `rgba(25,18,55,${.45 + night * .2})`; g.shadowBlur = 18 * S; g.shadowOffsetY = 4 * S;
      if (T.kicker) { g.font = `800 ${25 * S}px ${FONT}`; g.fillStyle = 'rgba(255,255,255,.92)'; spaced(g, T.kicker.toUpperCase(), x + 3 * S, y, .22 * 25 * S); y += 92 * S; }
      g.font = `900 ${(T.size ?? 96) * S}px ${FONT}`; g.fillStyle = '#ffffff';
      for (const line of String(T.text).split('\n')) { g.fillText(line, x, y); y += (T.size ?? 96) * S * 1.04; }
      if (T.sub) { y -= (T.size ?? 96) * S * .3; g.font = `700 ${32 * S}px ${FONT}`; g.fillStyle = 'rgba(255,255,255,.95)'; g.fillText(T.sub, x + 3 * S, y + 6 * S); y += 50 * S; }
      if (T.coords) { g.font = `700 ${22 * S}px ${FONT}`; g.fillStyle = 'rgba(255,255,255,.78)'; spaced(g, T.coords, x + 3 * S, y + 4 * S, .08 * 22 * S); }
      g.restore();
      void W;
    }
  }
  drawChips(g, t, L) {
    const S = this.S, W = this.F.W;
    for (const C of this.chips) {
      const a = smooth(C.from ?? 0, (C.from ?? 0) + .8, t) * (1 - smooth((C.to ?? 1e9) - .6, C.to ?? 1e9, t)); if (a < .005) continue;
      // time label: interpolate minutes between keys
      const ks = C.keys; let i = 0; while (i < ks.length - 1 && ks[i + 1].t <= t) i++;
      const k0 = ks[i], k1 = ks[Math.min(i + 1, ks.length - 1)], u = k1 === k0 ? 0 : ease.inOut(clamp((t - k0.t) / (k1.t - k0.t)));
      const mins = m => { const [h, mm] = m.split(':').map(Number); return h * 60 + mm; };
      let m = Math.round(mins(k0.time) + (mins(k1.time) - mins(k0.time)) * u); m = ((m % 1440) + 1440) % 1440;
      const label = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      const wx = u < .5 ? k0.icon : k1.icon;
      g.save(); g.globalAlpha = a;
      g.font = `800 ${28 * S}px ${FONT}`; const tw = g.measureText(label).width, h = 54 * S, w = tw + 88 * S, x = W - (C.x ?? 64) * S - w, y = (C.y ?? 128) * S;
      g.shadowColor = 'rgba(25,18,55,.3)'; g.shadowBlur = 14 * S; g.shadowOffsetY = 3 * S;
      g.fillStyle = `rgba(255,255,255,${.86 - L.glow * .2})`; g.beginPath(); g.roundRect(x, y, w, h, h / 2); g.fill(); g.shadowColor = 'transparent';
      const ic = { sun: '#ffb627', moon: '#7b78e6', cloud: '#8f9bb3', rain: '#5b8fd6', sunset: '#ff8a5c' }[wx] || '#ffb627';
      g.save(); g.translate(x + 30 * S, y + h / 2); g.fillStyle = ic; g.strokeStyle = ic; g.lineWidth = 3 * S; g.lineCap = 'round';
      if (wx === 'moon') { g.beginPath(); g.arc(0, 0, 13 * S, 0, 7); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(7 * S, -5 * S, 11 * S, 0, 7); g.fill(); }
      else if (wx === 'cloud' || wx === 'rain') { g.beginPath(); g.arc(-5 * S, 2 * S, 8 * S, 0, 7); g.arc(4 * S, -2 * S, 10 * S, 0, 7); g.arc(10 * S, 4 * S, 6 * S, 0, 7); g.fill(); if (wx === 'rain') { g.strokeStyle = '#3d6fc0'; for (const dx of [-6, 1, 8]) { g.beginPath(); g.moveTo(dx * S, 12 * S); g.lineTo((dx - 3) * S, 19 * S); g.stroke(); } } }
      else { g.beginPath(); g.arc(0, wx === 'sunset' ? 3 * S : 0, 8 * S, wx === 'sunset' ? Math.PI : 0, wx === 'sunset' ? 0 : 7); g.fill(); for (let k = 0; k < 8; k++) { const an = k / 8 * Math.PI * 2; if (wx === 'sunset' && Math.sin(an) > .1) continue; g.beginPath(); g.moveTo(Math.cos(an) * 12 * S, Math.sin(an) * 12 * S + (wx === 'sunset' ? 3 * S : 0)); g.lineTo(Math.cos(an) * 16 * S, Math.sin(an) * 16 * S + (wx === 'sunset' ? 3 * S : 0)); g.stroke(); } }
      g.restore();
      g.fillStyle = '#3a3358'; g.textBaseline = 'middle'; g.fillText(label, x + 58 * S, y + h / 2 + 1 * S);
      g.restore();
    }
  }
  drawEnds(g, t) {
    const S = this.S, W = this.F.W, H = this.F.H;
    for (const E of this.ends) {
      const a = smooth(E.from, E.from + 1, t); if (a < .005) continue;
      g.save();
      const grd = g.createLinearGradient(0, H * .25, 0, H * .75); grd.addColorStop(0, 'rgba(20,14,48,0)'); grd.addColorStop(.5, `rgba(20,14,48,${.38 * a})`); grd.addColorStop(1, 'rgba(20,14,48,0)');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
      const rise = (1 - ease.out(clamp((t - E.from) / 1.2))) * 30 * S;
      g.shadowColor = 'rgba(20,14,48,.55)'; g.shadowBlur = 20 * S;
      let y = H * .47 + rise;
      if (E.kicker) { g.font = `800 ${25 * S}px ${FONT}`; g.fillStyle = 'rgba(255,255,255,.9)'; spaced(g, E.kicker.toUpperCase(), W / 2, y - 100 * S, .22 * 25 * S, true); }
      g.font = `900 ${(E.size ?? 104) * S}px ${FONT}`; g.fillStyle = '#fff';
      const lines = String(E.text).split('\n'); lines.forEach((s, i) => g.fillText(s, W / 2, y + (i - (lines.length - 1) / 2) * (E.size ?? 104) * S * 1.05));
      if (E.sub) { g.font = `700 ${32 * S}px ${FONT}`; g.fillStyle = 'rgba(255,255,255,.92)'; g.fillText(E.sub, W / 2, y + (lines.length * .5 + .55) * (E.size ?? 104) * S); }
      g.font = `700 ${19 * S}px ${FONT}`; g.fillStyle = 'rgba(255,255,255,.8)'; g.shadowBlur = 6 * S;
      g.fillText('Map data © OpenStreetMap contributors', W / 2, H - 110 * S);
      g.restore();
    }
  }
}
function wrap(s, n) { s = String(s); if (s.includes('\n')) return s.split('\n'); if (s.length <= n) return [s]; const w = s.split(' '); const out = ['']; for (const x of w) { if ((out.at(-1) + ' ' + x).trim().length > n && out.at(-1)) out.push(x); else out[out.length - 1] = (out.at(-1) + ' ' + x).trim(); } return out.slice(0, 2); }
function overlap(a, b) { const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); return x * y; }
function spaced(g, s, x, y, sp, center = false) {
  const ws = [...s].map(c => g.measureText(c).width), tw = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
  const al = g.textAlign; g.textAlign = 'left'; let cx = center ? x - tw / 2 : x;
  [...s].forEach((c, i) => { g.fillText(c, cx, y); cx += ws[i] + sp; }); g.textAlign = al;
}
export { polyLen, strHash };
