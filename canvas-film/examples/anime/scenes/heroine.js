/* heroine.js — ONE character, drawn from one head function in every shot (the model-sheet rule).
   Views: 'q' (3/4), 'side' (profile), 'back'; all face screen-right (mirror with ctx.scale(-1,1) to face left).
   Local units: cranium sphere centre (0,0), radius ~80; eyes at y≈+22, nose base +54, mouth +75, chin +113;
   the bust reaches y≈+340. Expressions: neutral, smile, smileopen, surprised, sad, blink, talk.
   Construction and proportions follow the 80s-cel head of lemo-opuscar (styles/cel-anime-80s, MIT): cranium + jaw,
   far eye foreshortened with a cheekbone turn, almond eyes with a layered iris, a dark under-layer between hair locks,
   brows drawn over the bangs. Lines here are tapered ink ribbons, heavier on the side away from the light.
   Needs Pilot (lib.js). Usage: Heroine.draw(ctx, { view, expr, t, wind, light, body, rim, scale }). */
const Heroine = (() => {
  const TAU = Math.PI * 2, { mix: mixA, hex: hexA, clamp } = Pilot;
  const mx = (a, b, k) => '#' + mixA(hexA(a), hexA(b), k).map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const rgba = (c, a) => { const [r, g, b] = hexA(c); return `rgba(${r},${g},${b},${a})`; };
  const TW = t => Math.floor(t * 12 + 1e-6) / 12;

  const PAL = {
    skin: { f: '#ffe8db', s: '#f4bcab', s2: '#df988c', l: '#8c4b45', h: '#fff6ee' },
    hair: { f: '#7c4a3a', s: '#57312a', u: '#3b221e', h: '#b98366', ring: '#eabd9a', l: '#3a1d1c' },
    eye: { f: '#2f72b0', s: '#1b3369', h: '#8fdaf5', l: '#13204a' }, lash: '#2a1418', white: '#ffffff',
    mouth: '#7a2232', tongue: '#e57a84', blush: '#ff8a8a',
    blouse: { f: '#f7f8fc', s: '#c4cae4', l: '#4a4766' }, collar: { f: '#2c3d76', s: '#1d2955', l: '#151b3c' },
    scarf: { f: '#e0414e', s: '#a62a39', l: '#5a141e' }, tie: { f: '#ff6f7d', s: '#c8404f', l: '#5a141e' },
  };
  const EXPR = {
    neutral: { open: 1, lid: .05, brow: [0, 0, 2], mouth: 'closed' },
    smile: { open: .7, lid: .1, brow: [-3, -1, 3], mouth: 'smile', smileEyes: 1, blush: .32 },
    smileopen: { open: .72, lid: .08, brow: [-4, -2, 3.5], mouth: 'smileopen', smileEyes: 1, blush: .36 },
    surprised: { open: 1.12, lid: -.22, brow: [-8, -6, 4.5], mouth: 'oh', iris: .8 },
    sad: { open: .82, lid: .3, brow: [-7, 4, 1], mouth: 'sad', look: [0, .25], tear: 1, blush: .3 },
    blink: { open: 0, lid: 0, brow: [0, 0, 2], mouth: 'closed' },
    talk: { open: 1, lid: .08, brow: [0, 0, 2], mouth: 'talk' },
  };

  // ---- paths: Catmull-Rom through points, [x,y,1] = corner; sampled so the same points fill and ink ----
  function cr(P, closed = true, n = 8) {
    const N = P.length, out = [], G = i => closed ? P[(i + N) % N] : P[Math.max(0, Math.min(N - 1, i))];
    const segs = closed ? N : N - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = G(i - 1), p1 = G(i), p2 = G(i + 1), p3 = G(i + 2);
      let c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      if (p1[2] || (!closed && i === 0)) c1 = [p1[0] + (p2[0] - p1[0]) / 3, p1[1] + (p2[1] - p1[1]) / 3];
      if (p2[2] || (!closed && i === segs - 1)) c2 = [p2[0] - (p2[0] - p1[0]) / 3, p2[1] - (p2[1] - p1[1]) / 3];
      for (let k = 0; k < n; k++) { const t = k / n, u = 1 - t;
        const pt = [u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0], u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1]];
        if (k === 0 && p1[2]) pt[2] = 1; out.push(pt); }
    }
    if (!closed) out.push([P[N - 1][0], P[N - 1][1], 1]);
    return out;
  }
  const P2 = S => { const p = new Path2D(); S.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath(); return p; };
  const moved = (p, d) => { const q = new Path2D(); q.addPath(p); q.addPath(p, new DOMMatrix().translate(d[0], d[1])); return q; };
  let LIGHT = [-.6, -.8], INKK = 1;
  // tapered ink ribbon (see glance.html): thin at open ends and corners, heavier where the normal faces away from light
  function ink(g, S, w, col, o = {}) {
    const n = S.length; if (n < 2) return; const closed = !!o.closed, len = [0];
    for (let i = 1; i < n; i++) len.push(len[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]));
    const tot = len[n - 1] || 1; let cx = 0, cy = 0; S.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= n; cy /= n; if (o.c) [cx, cy] = o.c;
    const a = o.a ?? .15, b = o.b ?? .2, dir = o.dir ?? .7, wmin = o.wmin ?? .12; w *= INKK;
    const L = [], R = [];
    for (let i = 0; i < n; i++) { const p = S[i], q = closed ? S[(i + 1) % n] : S[Math.min(n - 1, i + 1)], r = closed ? S[(i - 1 + n) % n] : S[Math.max(0, i - 1)];
      const tx = q[0] - r[0], ty = q[1] - r[1], l = Math.hypot(tx, ty) || 1; let nx = -ty / l, ny = tx / l;
      const sg = nx * (p[0] - cx) + ny * (p[1] - cy) < 0 ? -1 : 1;
      let k = 1 - dir + dir * (.4 + 1.0 * Math.max(0, -(sg * nx * LIGHT[0] + sg * ny * LIGHT[1])));
      if (!closed) { const s = len[i] / tot; k *= Math.max(wmin, Math.min(1, s / a, (1 - s) / b)) ** .7; }
      if (p[2] && o.sharp !== false) k *= .4;
      const h = w * k / 2; L.push([p[0] + nx * h, p[1] + ny * h]); R.push([p[0] - nx * h, p[1] - ny * h]); }
    g.fillStyle = col; g.beginPath();
    if (closed) { L.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); R.reverse().forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); }
    else { L.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); R.reverse().forEach(p => g.lineTo(p[0], p[1])); g.closePath(); }
    g.fill();
  }
  // cel fill: flat fill, hard shadow crescent (shape − shape shifted toward the light), extra shadow shapes, rim, ink
  function cel(g, pts, o) {
    const S = pts.sampled ? pts : cr(pts); S.sampled = 1;
    const P = P2(S);
    g.fillStyle = o.f; g.fill(P);
    if (o.so || o.sh || o.rim || o.hi || o.fn) { g.save(); g.clip(P);
      if (o.so) { g.fillStyle = o.s; g.fill(moved(P, [LIGHT[0] * o.so, LIGHT[1] * o.so]), 'evenodd'); }
      if (o.sh) { g.fillStyle = o.s; for (const s of o.sh) g.fill(P2(s.sampled ? s : cr(s))); }
      if (o.sh2) { g.fillStyle = o.s2; for (const s of o.sh2) g.fill(P2(s.sampled ? s : cr(s))); }
      if (o.hi) { g.fillStyle = o.h; for (const s of o.hi) g.fill(P2(s.sampled ? s : cr(s))); }
      if (o.rim) { g.fillStyle = o.rim; g.fill(moved(P, [-LIGHT[0] * 3, -LIGHT[1] * 2.4]), 'evenodd'); }
      if (o.fn) o.fn(g, P);
      g.restore(); }
    if (o.l) ink(g, o.open ? S.slice(o.open[0], S.length - o.open[1]) : S, o.lw || 2.2, o.l, { closed: !o.open, a: .1, b: .1 });
    return S;
  }
  const C = pts => { const s = cr(pts); s.sampled = 1; return s; };
  // a hair lock: two root points → a sharp tip, bowed by `bend` (and an S by `s2`)
  function lock(x0, y0, x1, y1, tx, ty, bend = 0, s2 = 0) {
    const mxp = (x0 + x1) / 2, myp = (y0 + y1) / 2, dx = tx - mxp, dy = ty - myp, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    return [[x0, y0], [x0 + dx * .35 + nx * (bend * .8 + s2), y0 + dy * .35 + ny * (bend * .8 + s2)], [x0 + dx * .7 + nx * (bend - s2 * .6), y0 + dy * .7 + ny * (bend - s2 * .6)], [tx, ty, 1],
      [x1 + dx * .62 + nx * (bend * .8 - s2 * .6), y1 + dy * .62 + ny * (bend * .8 - s2 * .6)], [x1 + dx * .3 + nx * (bend * .6 + s2), y1 + dy * .3 + ny * (bend * .6 + s2)], [x1, y1]];
  }
  // a ribbon (ponytail lock, scarf tail): spine + width function
  function ribbon(spine, width) {
    const n = spine.length, L = [], R = [];
    for (let i = 0; i < n; i++) { const a = spine[Math.max(0, i - 1)], b = spine[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; const w = width(i / (n - 1)) / 2;
      L.push([spine[i][0] - dy * w, spine[i][1] + dx * w]); R.push([spine[i][0] + dy * w, spine[i][1] - dx * w]); }
    const S = L.concat(R.reverse()); S[n - 1][2] = 1; S[n][2] = 1; return S;
  }
  function flutter(x, y, ang, len, n, amp, waves, phase, droop = 0) {
    const pts = [], ca = Math.cos(ang), sa = Math.sin(ang);
    for (let i = 0; i < n; i++) { const u = i / (n - 1), s = u * len, off = Math.sin(u * waves * TAU - phase) * amp * Math.pow(u, .8) + droop * u * u;
      pts.push([x + ca * s - sa * off, y + sa * s + ca * off]); }
    return pts;
  }

  // ---- eyes ----
  function eye(g, cx, cy, w, h, dir, fs, E) {
    const open = Math.max(0, E.open ?? 1), lid = E.lid || 0, W2 = w / 2, X = u => cx + dir * u * W2;
    const inY = cy + h * .1, outY = cy - h * .06 - (E.smileEyes ? h * .05 : 0);
    const topY = cy - h * .5 * open + lid * h * .32, botY = cy + h * .46 * Math.min(1, open + .25) - (E.smileEyes ? h * .28 : 0);
    const t = h * .17;
    if (open > .08) {
      const WS = C([[X(-1), inY, 1], [X(-.45), topY + h * .06], [X(.3), topY], [X(1), outY, 1], [X(.45), botY], [X(-.4), botY - h * .03]]), WP = P2(WS);
      g.save(); g.clip(WP); g.fillStyle = PAL.white; g.fill(WP);
      g.fillStyle = mx(PAL.white, PAL.skin.s, .6); g.fillRect(cx - w, topY - 8, w * 2, h * .24 + 8);
      const sc = E.iris || 1, iw = w * .27 * sc * (fs < 1 ? .9 : 1), ih = h * .47 * sc;
      const ix = cx + dir * W2 * .05 + (E.look?.[0] || 0) * w * .16, iy = cy + h * .08 + (E.look?.[1] || 0) * h * .14;
      const IR = new Path2D(); IR.ellipse(ix, iy, iw, ih, 0, 0, TAU);
      g.fillStyle = PAL.eye.f; g.fill(IR);
      g.save(); g.clip(IR);
      g.fillStyle = PAL.eye.s; g.fillRect(ix - iw, iy - ih, iw * 2, ih * .95);
      g.fillStyle = mx(PAL.eye.s, PAL.lash, .55); g.fillRect(ix - iw, iy - ih, iw * 2, ih * .4);
      g.strokeStyle = rgba(PAL.eye.h, .35); g.lineWidth = iw * .07;
      for (let k = 0; k < 10; k++) { const a = Math.PI * (.12 + .76 * k / 9); g.beginPath(); g.moveTo(ix + Math.cos(a) * iw * .5, iy + Math.sin(a) * ih * .5); g.lineTo(ix + Math.cos(a) * iw * .95, iy + Math.sin(a) * ih * .95); g.stroke(); }
      g.fillStyle = mx(PAL.eye.l, PAL.lash, .3); g.beginPath(); g.ellipse(ix, iy, iw * .45, ih * .5, 0, 0, TAU); g.fill();
      g.fillStyle = PAL.eye.h; g.beginPath(); g.ellipse(ix, iy + ih * .92, iw * 1.05, ih * .5, 0, 0, TAU); g.fill();
      g.fillStyle = mx(PAL.eye.h, '#ffffff', .5); g.beginPath(); g.ellipse(ix, iy + ih * 1.06, iw * .66, ih * .3, 0, 0, TAU); g.fill();
      g.restore();
      g.strokeStyle = PAL.eye.l; g.lineWidth = Math.max(.8, w * .03) * INKK; g.stroke(IR);
      g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(ix - iw * .36, iy - ih * .34, iw * .44, ih * .28, -.5, 0, TAU); g.fill();
      g.beginPath(); g.arc(ix + iw * .42, iy + ih * .36, iw * .19, 0, TAU); g.fill();
      if (E.tear) { g.fillStyle = 'rgba(200,240,255,.55)'; g.fillRect(cx - w, botY - h * .16, w * 2, h * .2); }
      g.restore();
      ink(g, C([[X(1), outY + h * .14], [X(.55), botY + .5], [X(.1), botY + 1.2]]).map(p => (p[2] = 0, p)), w * .045, mx(PAL.skin.l, PAL.skin.f, .25), { a: .4, b: .4, dir: 0 });
      // lash line: a filled wedge, thick and flicked up at the outer corner, plus three lashes
      cel(g, [[X(-1.04), inY + 1, 1], [X(-.45), topY + h * .06 - t * .55], [X(.3), topY - t * .75], [X(.95), outY - t], [X(1.25), outY - t * 2.1, 1],
        [X(1.04), outY + t * .5], [X(.3), topY + t * .45], [X(-.45), topY + h * .06 + t * .3], [X(-.98), inY + t * .55, 1]], { f: PAL.lash });
      for (let k = 0; k < 3; k++) { const u = .5 + k * .22, bx = X(u), by = topY + (outY - topY) * ((u - .3) / .7) - t * .5;
        cel(g, [[bx - dir * 2, by, 1], [bx + dir * (4 + k * 3) * w / 44, by - h * (.15 + k * .05), 1], [bx + dir * 3, by + 1, 1]], { f: PAL.lash }); }
      ink(g, C([[X(-.25), topY - h * .2], [X(.45), topY - h * .24], [X(1), outY - h * .3]]), w * .05, mx(PAL.skin.l, PAL.skin.f, .2), { a: .3, b: .3, dir: 0 });
      if (E.tear) { cel(g, [[X(.6), botY + 2], [X(.68), botY + h * .5], [X(.58), botY + h * .58], [X(.5), botY + h * .4]], { f: 'rgba(210,245,255,.9)', l: rgba('#5a8ab8', .8), lw: .9 }); }
    } else {   // closed: blink (arc down) or smiling (arc up)
      const up = E.smileEyes ? -1 : 1;
      cel(g, [[X(-1), inY, 1], [X(0), cy + h * .18 * up], [X(1.05), outY + h * .04], [X(1.22), outY - t, 1], [X(1), outY + t * .8], [X(0), cy + h * .18 * up + t * .8], [X(-.98), inY + t * .5, 1]], { f: PAL.lash });
    }
  }
  function eyeSide(g, cx, cy, w, h, E) {
    const open = Math.max(0, E.open ?? 1), lid = E.lid || 0, topY = cy - h * .5 * open + lid * h * .32, front = cx + w * .5, back = cx - w * .5;
    const botY = cy + h * .46 - (E.smileEyes ? h * .26 : 0), t = h * .17;
    if (open > .08) {
      const WP = P2(C([[back, cy - h * .12, 1], [cx - w * .1, topY], [front, cy + h * .06, 1], [cx, botY]]));
      g.save(); g.clip(WP); g.fillStyle = PAL.white; g.fill(WP);
      const ix = cx + w * .2 + (E.look?.[0] || 0) * w * .1, iy = cy + h * .1, iw = w * .24 * (E.iris || 1), ih = h * .46 * (E.iris || 1);
      g.fillStyle = PAL.eye.f; g.beginPath(); g.ellipse(ix, iy, iw, ih, 0, 0, TAU); g.fill();
      g.fillStyle = PAL.eye.s; g.fillRect(ix - iw, iy - ih, iw * 2, ih * .95);
      g.fillStyle = mx(PAL.eye.s, PAL.lash, .55); g.fillRect(ix - iw, iy - ih, iw * 2, ih * .4);
      g.fillStyle = PAL.eye.h; g.beginPath(); g.ellipse(ix, iy + ih * .9, iw, ih * .5, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ix - iw * .15, iy - ih * .32, iw * .45, ih * .24, 0, 0, TAU); g.fill();
      if (E.tear) { g.fillStyle = 'rgba(200,240,255,.55)'; g.fillRect(cx - w, botY - h * .18, w * 2, h * .2); }
      g.restore();
      cel(g, [[back - w * .35, cy - h * .3 - t, 1], [cx - w * .1, topY - t * .6], [front + w * .04, cy + h * .02, 1], [cx - w * .1, topY + t * .5], [back, cy - h * .06, 1]], { f: PAL.lash });
      cel(g, [[back - w * .1, cy - h * .2, 1], [back - w * .55, cy - h * .48, 1], [back - w * .05, cy - h * .12, 1]], { f: PAL.lash });
      ink(g, C([[cx - w * .15, botY], [front - w * .1, cy + h * .26]]), w * .05, mx(PAL.skin.l, PAL.skin.f, .25), { dir: 0 });
      if (E.tear) cel(g, [[cx + w * .1, botY + 1], [cx + w * .2, botY + h * .55], [cx + w * .05, botY + h * .62], [cx - w * .04, botY + h * .4]], { f: 'rgba(210,245,255,.9)', l: rgba('#5a8ab8', .8), lw: .9 });
    } else cel(g, [[back - w * .3, cy - h * .12, 1], [cx, cy + h * .2], [front, cy + h * .08, 1], [cx, cy + h * .28], [back, cy + h * .02, 1]], { f: PAL.lash });
  }
  function brow(g, ix, iy, ox, oy, B) {
    const a = [ix, iy + B[0]], c = [ox, oy + B[1]], m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2 - B[2]];
    cel(g, [[a[0], a[1] - 1.3, 1], [m[0], m[1] - 1.5], [c[0], c[1] - .2, 1], [m[0], m[1] + 1.1], [a[0], a[1] + 1.3, 1]], { f: mx(PAL.hair.l, PAL.hair.f, .25) });
  }
  function mouth(g, cx, cy, w, type, fs = 1) {
    const L = cx - w / 2, R = cx + w / 2 * fs, lc = PAL.skin.l;
    const lowLip = (y, ww) => ink(g, C([[cx - ww * .6, y], [cx + ww * .5, y]]), 1.3, mx(lc, PAL.skin.f, .45), { dir: 0 });
    if (type === 'closed') { ink(g, C([[L, cy], [cx - w * .12, cy - .6], [cx + w * .06, cy + .2], [R, cy]]), 2.1, lc, { a: .3, b: .3, dir: 0 }); lowLip(cy + 5.5, w * .2); return; }
    if (type === 'smile') { ink(g, C([[L - 1, cy - 3], [cx - w * .15, cy + 1.6], [cx + w * .1, cy + 1.6], [R + 1, cy - 3]]), 2.1, lc, { a: .25, b: .25, dir: 0 }); lowLip(cy + 6.5, w * .16); return; }
    if (type === 'sad') { ink(g, C([[L, cy + 2.5], [cx - w * .1, cy - .5], [cx + w * .08, cy - .5], [R, cy + 2.5]]), 2, lc, { a: .3, b: .3, dir: 0 }); lowLip(cy + 6, w * .16); return; }
    let pts, teeth = 0, tongue = 0, bot;
    if (type === 'smileopen') { pts = [[L - 1, cy - 3, 1], [cx, cy - 2], [R + 1, cy - 3, 1], [cx + w * .2, cy + 6], [cx, cy + 10], [cx - w * .22, cy + 6]]; teeth = 1; tongue = 1; bot = cy + 10; }
    else if (type === 'oh') { pts = [[cx - w * .22, cy + 3], [cx, cy - 4], [cx + w * .2, cy + 3], [cx + w * .14, cy + 13], [cx - w * .14, cy + 13]]; bot = cy + 13; }
    else { pts = [[L + 3, cy, 1], [cx, cy - 1], [R - 3, cy, 1], [cx + w * .08, cy + 7], [cx - w * .1, cy + 7]]; tongue = .8; bot = cy + 7; }
    const S = C(pts), MP = P2(S);
    g.save(); g.clip(MP); g.fillStyle = PAL.mouth; g.fill(MP);
    if (tongue) { g.fillStyle = PAL.tongue; g.beginPath(); g.ellipse(cx, bot + 1, w * .28, 6, 0, 0, TAU); g.fill(); }
    if (teeth) { g.fillStyle = '#fff'; g.fillRect(cx - w, cy - 8, w * 2, 10.5); }
    g.restore(); ink(g, S, 1.9, lc, { closed: true, dir: 0 }); lowLip(bot + 4.5, w * .14);
  }
  function halo(g, cx, cy, rx, ry, a0, a1, th, teeth) {
    const up = [], dn = [];
    for (let i = 0; i <= teeth * 2; i++) { const u = i / (teeth * 2), a = a0 + (a1 - a0) * u, env = Math.sin(u * Math.PI) * .7 + .3;
      up.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); const d = th * env * (i % 2 ? 1.9 : .5); dn.push([cx + Math.cos(a) * (rx - d * .15), cy + Math.sin(a) * ry + d]); }
    g.fillStyle = PAL.hair.h; g.beginPath(); up.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); for (let i = dn.length - 1; i >= 0; i--) g.lineTo(dn[i][0], dn[i][1]); g.closePath(); g.fill();
    g.strokeStyle = rgba(PAL.hair.ring, .9); g.lineWidth = 1.6; g.beginPath(); up.slice(2, -2).forEach((p, i) => i ? g.lineTo(p[0], p[1] + 2) : g.moveTo(p[0], p[1] + 2)); g.stroke();
  }

  // ---- per-view geometry ----
  const V = {
    q: {
      face: [[-64, -40], [-67, 0], [-65, 34], [-58, 62], [-45, 86], [-26, 103], [2, 113], [22, 107], [36, 95], [44, 80], [48, 64], [53, 48], [56, 33], [51, 18], [54, 2], [55, -40], [18, -62], [-36, -62]],
      faceInk: [3, 8],
      neck: [[-34, 64, 1], [14, 92, 1], [18, 158, 1], [-44, 158, 1]],
      chin: [[-48, 58], [26, 58], [24, 98], [2, 115], [-26, 104], [-48, 86]],
      far: [[92, 30], [92, 122], [18, 113], [34, 98], [42, 82], [46, 68], [50, 52], [55, 36]],
      ear: [[-60, 6], [-74, 8], [-80, 28], [-73, 48], [-58, 50]],
      eyes: [[-20, 22, 44, 40, -1, 1], [35, 20, 26, 37, 1, .6]], brows: [[-2, -4, -42, -2], [24, -6, 48, -1]],
      nose: g => { cel(g, [[42, 40, 1], [46, 51, 1], [39, 55, 1], [39, 49, 1]], { f: PAL.skin.s }); ink(g, C([[37, 55.5], [44, 53]]), 1.8, PAL.skin.l, { dir: 0 }); },
      mouth: [24, 75, 22, .7], blush: [[-30, 50, 15, 5], [44, 47, 6, 3.5]],
      back: [[-80, -30], [-94, 18], [-88, 66], [-60, 86], [-24, 80], [30, 62], [52, 20], [52, -20], [-10, -60]],
      cap: [[-88, 4], [-95, -44], [-72, -90], [-26, -107], [24, -103], [58, -80], [66, -48], [60, -8], [46, -30], [0, -54], [-58, -34]],
      locks: [[-56, -86, -24, -94, -42, -8, 2, 2], [0, -96, 28, -90, 16, -10, -2, 0], [-96, -50, -60, -72, -86, 10, -6, 2], [-76, -76, -34, -88, -58, -2, -4, -2], [-50, -88, -6, -94, -28, -14, 2, 2],
        [-20, -94, 18, -94, 6, 14, 2, -2], [4, -94, 42, -86, 26, -10, 4, 0], [26, -86, 62, -70, 46, 0, 5, -2], [46, -72, 70, -52, 60, 6, 5, 0]],
      strays: [[-22, -92, -34, 6, 5], [20, -92, 30, 0, -4]],
      side: [[-80, -44, -60, -58, -78, 108, -10, 4], [54, -40, 62, -30, 58, 76, 8, -2]],
      halo: [-10, -10, 74, 60, Math.PI * 1.12, Math.PI * 1.86, 8, 8], tie: [-56, -84],
      body: { dx: -14 },
    },
    side: {
      face: [[56, -52], [70, -26], [73, -2], [70, 14], [73, 30], [79, 46, 1], [74, 51], [75, 60], [73.5, 67], [74.5, 73], [71, 83], [72, 96], [62, 109], [34, 106], [8, 92], [-6, 62], [-8, 20], [16, -52]],
      faceInk: [0, 6],
      neck: [[-12, 58, 1], [18, 98, 1], [14, 158, 1], [-40, 158, 1]],
      chin: [[-20, 56], [52, 56], [62, 110], [34, 106], [6, 92]],
      far: [[-40, -60], [8, -60], [2, 0], [-4, 40], [0, 70], [-40, 90]],
      ear: [[4, 8], [-12, 6], [-19, 28], [-12, 50], [3, 46]],
      eyes: [[58, 22, 26, 36, 0, 0, 1]], brows: [[52, -4, 72, -3]],
      nose: g => ink(g, C([[71, 49], [76, 50]]), 1.6, PAL.skin.l, { dir: 0 }),
      mouth: null, blush: [[58, 50, 10, 3.5]],
      back: [[-20, -60], [-62, -40], [-64, 10], [-48, 38], [-16, 44], [-12, 20], [0, -40]],
      cap: [[-64, 18], [-76, -30], [-60, -80], [-18, -103], [32, -99], [66, -76], [78, -46], [64, -40], [30, -58], [-4, -40], [-12, 0], [-38, 28]],
      locks: [[10, -98, 40, -90, 62, -4, 4, 2], [30, -92, 58, -78, 80, 0, 6, -2], [42, -82, 76, -62, 86, -6, 8, 0], [52, -68, 80, -48, 82, 6, 6, 2], [-10, -98, 16, -100, 26, -40, 6, 0]],
      strays: [[40, -88, 72, 10, 6]],
      side: [[2, -60, 22, -50, 18, 70, 10, 4]],
      halo: [0, -10, 68, 60, Math.PI * 1.08, Math.PI * 1.8, 8, 8], tie: [-52, -86],
      body: { dx: -30 },
    },
    back: {
      face: null, neck: [[-28, 40, 1], [28, 40, 1], [34, 158, 1], [-34, 158, 1]],
      ear: [[-80, 8], [-92, 14], [-94, 32], [-86, 48], [-78, 42]],
      back: null,
      cap: [[-84, 10], [-93, -40], [-72, -90], [-26, -106], [26, -106], [72, -90], [93, -40], [84, 10], [66, 34], [48, 30, 1], [36, 52], [20, 40, 1], [6, 60], [-8, 42, 1], [-24, 56], [-38, 34, 1], [-54, 44], [-68, 30]],
      locks: [], strays: [], side: [[-82, -30, -66, -46, -86, 74, -6, 2], [82, -30, 66, -46, 86, 74, 6, -2]],
      halo: [0, -16, 80, 70, Math.PI * 1.12, Math.PI * 1.88, 8, 9], tie: [0, -78],
      body: { dx: 0 },
    },
  };

  function body(g, view, E, wind, q) {
    const B = PAL.blouse, K = PAL.collar, sh = E.shoulders || 0;
    if (view === 'back') {
      cel(g, [[-186, 360], [-176, 214 + sh], [-138, 168 + sh], [-46, 150], [46, 150], [138, 168 + sh], [176, 214 + sh], [186, 360]], { f: B.f, s: B.s, so: 26, l: B.l, lw: 2.4 });
      const fl = wind * 6;
      const flap = [[-42, 148, 1], [-130, 172, 1], [-122 + fl * .5, 268 + Math.abs(fl) * -.3, 1], [122 + fl, 268 - Math.abs(fl) * .4, 1], [130, 172, 1], [42, 148, 1], [0, 160]];
      const S = cel(g, flap, { f: K.f, s: K.s, so: 10, l: K.l, lw: 2.2 });
      for (const k of [9, 15]) ink(g, C([[-118 + k, 176, 1], [-112 + k + fl * .5, 262 - k, 1], [112 - k + fl, 262 - k, 1], [118 - k, 176, 1]]), 1.6, '#eef1fa', { dir: 0, a: .02, b: .02, sharp: false });
      return;
    }
    const dx = V[view].body.dx;
    if (view === 'side') {
      cel(g, [[-120, 360], [-112, 206], [-84, 164], [-22, 148], [40, 152], [80, 184], [98, 256], [104, 360]], { f: B.f, s: B.s, so: 22, l: B.l, lw: 2.4 });
      cel(g, [[-20, 146, 1], [-112, 170, 1], [-120 + wind * 5, 262, 1], [-34, 246, 1]], { f: K.f, s: K.s, so: 8, l: K.l, lw: 2.2 });
      ink(g, C([[-104, 178, 1], [-110 + wind * 5, 252, 1], [-42, 238, 1]]), 1.6, '#eef1fa', { dir: 0, a: .02, b: .02, sharp: false });
      cel(g, [[26, 150, 1], [70, 176, 1], [92, 252, 1], [74, 210, 1]], { f: K.f, s: K.s, so: 6, l: K.l, lw: 2 });
      return;
    }
    // q
    cel(g, [[-186 + dx, 360], [-178 + dx, 214 + sh], [-140 + dx, 166 + sh], [-58 + dx, 146], [44 + dx, 140], [112 + dx, 158 + sh], [150 + dx, 206 + sh], [160 + dx, 360]], { f: B.f, s: B.s, so: 26, l: B.l, lw: 2.4,
      fn: gg => { for (const F of [[[-120 + dx, 260], [-110 + dx, 300], [-104 + dx, 360]], [[110 + dx, 250], [118 + dx, 300], [124 + dx, 360]]]) ink(gg, C(F), 1.6, rgba(B.l, .5), { dir: 0, a: .3, b: .3 }); } });
    cel(g, [[-58 + dx, 140, 1], [-170 + dx, 170, 1], [-182 + dx, 214, 1], [-150 + dx, 196, 1]], { f: K.f, s: K.s, so: 6, l: K.l, lw: 2 });
    const V0 = [30 + dx, 258];
    cel(g, [[-40 + dx, 140, 1], [-150 + dx, 172, 1], [V0[0], V0[1], 1], [-20 + dx, 186, 1]], { f: K.f, s: K.s, so: 8, l: K.l, lw: 2.2 });
    cel(g, [[42 + dx, 136, 1], [118 + dx, 162, 1], [V0[0], V0[1], 1], [34 + dx, 180, 1]], { f: K.f, s: K.s, so: 8, l: K.l, lw: 2.2 });
    for (const k of [8, 14]) { ink(g, C([[-150 + dx + k * .3, 172 + k, 1], [V0[0] - k * .9, V0[1] - k * 1.1, 1]]), 1.5, '#eef1fa', { dir: 0, a: .02, b: .02, sharp: false });
      ink(g, C([[118 + dx - k * .4, 162 + k * .9, 1], [V0[0] + k * .4, V0[1] - k * 1.2, 1]]), 1.4, '#eef1fa', { dir: 0, a: .02, b: .02, sharp: false }); }
  }
  function scarf(g, view, E, wind, q) {
    if (view === 'back') return;
    const S = PAL.scarf, dx = V[view].body.dx, k = view === 'side' ? [92, 246] : [30 + dx, 252];
    const sw = Math.sin(q * 5) * 3 * (.4 + Math.abs(wind));
    cel(g, [[k[0] - 4, k[1] - 6], [k[0] - 40, k[1] - 22], [k[0] - 48, k[1] + 6], [k[0] - 14, k[1] + 12]], { f: S.f, s: S.s, so: 4, l: S.l, lw: 1.8 });
    cel(g, [[k[0] + 4, k[1] - 6], [k[0] + 38, k[1] - 22], [k[0] + 46, k[1] + 6], [k[0] + 14, k[1] + 12]], { f: S.f, s: S.s, so: 4, l: S.l, lw: 1.8 });
    for (const [o, len] of [[-6, 70], [6, 60]]) { const sp = flutter(k[0] + o, k[1] + 6, Math.PI / 2 - wind * .5, len, 10, 4 + Math.abs(wind) * 6, 1, q * 7 + o, 0);
      cel(g, ribbon(sp.map(p => [p[0] + sw * 0, p[1]]), u => 16 * (1 - u * .4)), { f: S.f, s: S.s, so: 4, l: S.l, lw: 1.6 }); }
    cel(g, [[k[0] - 9, k[1] - 9], [k[0] + 9, k[1] - 9], [k[0] + 10, k[1] + 8], [k[0] - 10, k[1] + 8]], { f: mx(S.f, '#ffffff', .1), s: S.s, so: 3, l: S.l, lw: 1.8 });
  }

  function draw(g, o = {}) {
    const view = o.view || 'q', G = V[view], E = { ...EXPR[o.expr || 'neutral'], ...(o.E || {}) };
    const q = TW(o.t || 0), wind = o.wind ?? .4, ph = q * 1.3;
    LIGHT = o.light || [-.6, -.8]; INKK = o.inkScale || 1;
    const H = PAL.hair, hairSt = { f: H.f, s: H.s, l: H.l, lw: 2.4 };
    // 1. ponytail + dark under-layer of the back hair
    const [tx, ty] = G.tie;
    const tail = () => { if (o.ponytail === false) return; for (let k = 0; k < 4; k++) {
      let ang = view === 'back' ? Math.PI / 2 + (k - 1.5) * .12 - wind * .9 : (Math.PI + .3 - k * .12) * clamp(Math.abs(wind) * 1.4) + (Math.PI / 2 + .5 - k * .1) * (1 - clamp(Math.abs(wind) * 1.4));
      if (view !== 'back' && wind < 0) ang = Math.PI / 2 + .2 - k * .08 + wind * .3;
      const len = (view === 'back' ? 220 : 290) - k * 34;
      const sp = flutter(tx + (k - 1.5) * 7, ty + k * 4, ang, len, 14, (8 + k * 5) * Math.abs(wind) + 3, 1, ph * 4 + k * 1.9, view === 'back' ? 0 : -(10 + k * 18) * Math.abs(wind));
      cel(g, ribbon(sp, u => Math.pow(1 - u, .85) * (view === 'back' ? 58 - k * 6 : 62 - k * 8) + 1), { ...hairSt, f: k === 1 || k === 2 ? H.s : H.f, so: 8 });
    } };
    if (view !== 'back') tail();
    if (G.back) cel(g, G.back, { ...hairSt, f: H.s, s: H.u, so: 10 });
    // 2. body, neck (+ jaw shadow), scarf
    const BT = f => { g.save(); g.translate(0, 136); g.scale(.86, .86); g.translate(0, -136 - 22); f(); g.restore(); };
    if (o.body !== false) BT(() => body(g, view, E, wind, q));
    cel(g, G.neck, { f: PAL.skin.f, s: PAL.skin.s, l: PAL.skin.l, lw: 1.9, sh: G.chin ? [G.chin] : [[[-40, 30], [40, 30], [40, 80], [-40, 80]]], open: [0, 0] });
    if (o.body !== false) BT(() => scarf(g, view, E, wind, q));
    // 3. face (or the back of the head), ear, features
    if (G.ear) cel(g, G.ear, { f: PAL.skin.f, s: PAL.skin.s, so: 3, l: PAL.skin.l, lw: 1.7, fn: gg => ink(gg, C(G.ear.slice(1, 4).map(p => [p[0] * .85 + (G.ear[0][0]) * .15 + (view === 'side' ? 3 : view === 'back' ? 4 : 4), p[1]])), 1.2, PAL.skin.l, { dir: 0 }) });
    if (view === 'back') { const e2 = G.ear.map(p => [-p[0], p[1]]); cel(g, e2, { f: PAL.skin.f, s: PAL.skin.s, so: 3, l: PAL.skin.l, lw: 1.7 }); }
    if (G.face) {
      const FS = cel(g, G.face, { f: PAL.skin.f, s: PAL.skin.s, s2: PAL.skin.s2, sh: [G.far], rim: o.rim || null,
        fn: gg => { gg.fillStyle = mx(PAL.skin.f, PAL.skin.s, .75);   // shadow the bangs cast on the forehead
          for (const L of G.locks) { const [x0, y0, x1, y1, ex, ey, b, s2] = L; gg.fill(P2(cr(lock(x0 - 4, y0 + 8, x1 + 6, y1 + 8, ex + 3, ey + 9, b, s2)))); }
          gg.fillRect(-140, -140, 280, view === 'side' ? 56 : 60); } });
      ink(g, FS.slice(G.faceInk[0] * 8, FS.length - G.faceInk[1] * 8), 2.6, PAL.skin.l, { a: .06, b: .06, c: [0, 30] });
      for (const [x, y, rx, ry] of G.blush) { const gr = g.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, rgba(PAL.blush, E.blush ?? .22)); gr.addColorStop(1, rgba(PAL.blush, 0));
        g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, TAU); g.fill(); g.restore(); }
      G.nose(g);
      if (G.mouth) mouth(g, G.mouth[0], G.mouth[1], G.mouth[2], E.mouth, G.mouth[3]);
      else { const lc = PAL.skin.l; if (E.mouth === 'smile' || E.mouth === 'smileopen') ink(g, C([[66, 66], [71, 70], [77, 68]]), 1.9, lc, { dir: 0 });
        else if (E.mouth === 'oh' || E.mouth === 'talk') { const S = C([[69, 66, 1], [78, 65], [76, 75], [70, 74]]); g.fillStyle = PAL.mouth; g.fill(P2(S)); ink(g, S, 1.6, lc, { closed: true, dir: 0 }); }
        else ink(g, C([[68, 69], [74, E.mouth === 'sad' ? 70.5 : 69]]), 1.9, lc, { dir: 0 }); }
      for (const e of G.eyes) e[6] ? eyeSide(g, e[0], e[1], e[2], e[3], E) : eye(g, e[0], e[1], e[2], e[3], e[4], e[5], E);
    }
    // 4. hair: cap → side locks → dark gaps → locks (overlapping) → strays → angel ring; brows over the bangs
    const capS = cel(g, G.cap, { ...hairSt, so: 10, rim: o.rim ? mx(o.rim, H.f, .3) : null });
    if (view === 'back') {   // hair pulled up to the tie: flow lines converge on it
      for (const [sx, sy] of [[-70, 10], [-50, 34], [-24, 46], [0, 50], [24, 46], [50, 34], [70, 10], [-84, -30], [84, -30]])
        ink(g, C([[sx, sy], [(sx + tx) / 2 + sx * .15, (sy + ty) / 2], [tx + sx * .05, ty + 6]]), 1.6, rgba(H.l, .6), { dir: 0, a: .3, b: .3 });
    }
    if (view === 'back') tail();
    const lf = Math.sin(ph * TAU / 1.3) * 2 * wind;
    for (const L of G.side) { const [x0, y0, x1, y1, ex, ey, b, s2] = L, sw = Math.sin(ph * 4) * 4 * wind; cel(g, lock(x0, y0, x1, y1, ex - 10 * wind + sw, ey, b, s2), { ...hairSt, so: 7, open: [6, 12] }); }
    g.save(); g.clip(P2(capS.map(p => [p[0] * 1.02, p[1] + 4]))); g.fillStyle = H.u; for (const L of G.locks) { const [x0, y0, x1, y1, ex, ey, b, s2] = L; g.fill(P2(cr(lock(x0 - 9, y0, x1 + 9, y1, ex, ey + 3 + lf, b, s2)))); } g.restore();
    const lockSt = { ...hairSt, l: mx(H.l, H.s, .3), lw: 1.9 };
    for (const L of G.locks) { const [x0, y0, x1, y1, ex, ey, b, s2] = L; cel(g, lock(x0, y0, x1, y1, ex, ey + lf, b, s2), { ...lockSt, so: 6, open: [12, 16] }); }
    for (const [x0, y0, ex, ey, b] of G.strays) ink(g, C([[x0, y0], [(x0 + ex) / 2 + b, (y0 + ey) / 2], [ex, ey + lf]]), 1.8, mx(H.l, H.s, .2), { dir: 0, a: .1, b: .5 });
    g.save(); const HC = P2(capS); for (const L of G.locks) { const [x0, y0, x1, y1, ex, ey, b, s2] = L; HC.addPath(P2(cr(lock(x0, y0, x1, y1, ex, ey + lf, b, s2)))); }
    g.clip(HC); const hz = G.halo; halo(g, hz[0], hz[1], hz[2], hz[3], hz[4], hz[5], hz[6], hz[7]); g.restore();
    if (G.brows && G.face) for (const b of G.brows) brow(g, b[0], b[1], b[2], b[3], E.brow || [0, 0, 2]);
    // scrunchie at the tie
    const sc = view === 'back' ? [[tx - 16, ty - 8], [tx + 16, ty - 8], [tx + 18, ty + 10], [tx - 18, ty + 10]] : [[tx - 12, ty - 8], [tx + 8, ty - 12], [tx + 14, ty + 12], [tx - 8, ty + 16]];
    cel(g, sc, { f: PAL.tie.f, s: PAL.tie.s, so: 3, l: PAL.tie.l, lw: 1.8 });
  }
  return { draw, PAL, EXPR, cel, ink, cr, ribbon, flutter };
})();
