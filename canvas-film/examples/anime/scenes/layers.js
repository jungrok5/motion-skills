/* layers.js — a Live2D-style puppet from FULL layers (needs cutout.js for Cutout.warp).
   Unlike rig.js (parts cut out of one finished drawing), every layer here is drawn complete by the image model,
   including what other layers hide (back hair behind the head, the forehead under the bangs, the collar under the
   hair), so parts can move far without holes or cut edges. tools/l2dlayers.py keys + aligns them and writes
   <name>-l2d.json: per layer its file, depth, role, bbox and, for hair, a root → tip axis.
   Parameters (all optional, per frame):
     angX, angY  head turn (−1…1): each head layer slides by its depth (back hair against the turn, features and
                 bangs with it) on a curved, cylinder-like profile, so the face bulges round instead of sliding flat;
     angZ        head tilt (rad) about the neck;  body: [dx, dy] body sway;  breath (0…1);
     expr        name of the features variant ('' = neutral);
     hair        { layerName: angle (rad) } — the bend of each hair layer from its spring (Rig.sim on a pendulum).
   Layers.draw(ctx, P, x, y, s, prm): x, y = screen position of image (0,0), s = scale. */
const Layers = (() => {
  const loadJSON = src => new Promise((ok, no) => { const x = new XMLHttpRequest(); x.open('GET', src);
    x.onload = () => { try { ok(JSON.parse(x.responseText)); } catch (e) { no(e); } }; x.onerror = no; x.send(); });
  const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  async function load(dir, name) {
    const J = await loadJSON(dir + name + '-l2d.json');
    for (const L of J.layers) { L.img = await loadImg(dir + L.file); L.var = {};
      for (const [k, f] of Object.entries(L.variants || {})) L.var[k] = await loadImg(dir + f); }
    return J;
  }
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function draw(ctx, P, x, y, s, prm = {}) {
    const [W, H] = P.size, hd = P.head, ax = prm.angX || 0, ay = prm.angY || 0, az = prm.angZ || 0, br = prm.breath || 0;
    const [bdx, bdy] = prm.body || [0, 0], neck = P.neck;
    for (const L of P.layers) {
      const img = (prm.expr && L.var[prm.expr]) || L.img, isHead = L.role !== 'body', d = L.depth ?? 0;
      const bend = (prm.hair || {})[L.name] || 0, ax0 = L.axis;
      const field = (u, v) => {
        let px = u * W, py = v * H, dx = 0, dy = 0;
        if (L.role === 'body') { dx += bdx * (1 - v) * .6; dy += -br * 6 * (1 - ss(neck[1], H, py)) + bdy; return [dx * s, dy * s]; }
        // head turn: depth parallax on a cylinder profile, fading out below the jaw (the neck and body stay)
        const ex = (px - hd.cx) / hd.rx, ey = (py - hd.cy) / hd.ry, cyl = Math.sqrt(Math.max(0, 1 - Math.min(1, ex * ex)));
        const wHead = L.hair ? 1 : 1 - ss(.85, 1.25, Math.hypot(ex, ey));
        dx += ax * hd.rx * (.11 * d + .07 * cyl) * wHead; dy += ay * hd.ry * (.08 * d + .05 * Math.sqrt(Math.max(0, 1 - ey * ey))) * wHead;
        // hair bend: rotate about the root, more toward the tip (a soft bend, not a stiff rotation)
        if (bend && ax0) { const [rx, ry, tx, ty] = ax0, lx = tx - rx, ly = ty - ry, LL = Math.hypot(lx, ly) || 1;
          const sAlong = ((px - rx) * lx + (py - ry) * ly) / (LL * LL), w = Math.max(0, Math.min(1.2, sAlong)) ** 1.6, a = bend * w;
          const ox = px - rx, oy = py - ry; dx += ox * (Math.cos(a) - 1) - oy * Math.sin(a); dy += ox * Math.sin(a) + oy * (Math.cos(a) - 1); }
        // tilt about the neck and the body's sway carry the whole head
        if (az) { const ox = px + dx - neck[0], oy = py + dy - neck[1]; dx += ox * (Math.cos(az) - 1) - oy * Math.sin(az); dy += ox * Math.sin(az) + oy * (Math.cos(az) - 1); }
        dx += bdx * .5; dy += bdy - br * 4;
        return [dx * s, dy * s];
      };
      const [bx0, by0, bx1, by1] = L.bbox, m = 24;   // warp only the layer's box (+ margin) for speed
      const u0 = Math.max(0, bx0 - m) / W, v0 = Math.max(0, by0 - m) / H, u1 = Math.min(W, bx1 + m) / W, v1 = Math.min(H, by1 + m) / H;
      const nx = Math.max(4, Math.round((u1 - u0) * W / 40)), ny = Math.max(4, Math.round((v1 - v0) * H / 40));
      Cutout.warp(ctx, img, x, y, W * s, H * s, field, { nx, ny, u0, v0, u1, v1 });
    }
  }
  return { load, draw };
})();
