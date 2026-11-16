// scanned-realm · 46_atlas — photographed leaf, frond and twig atlases, read as pictures the engine paints its own
// foliage from.  A tree model at Poly Haven is millions of triangles, but its leaves are a small colour map and a
// cut-out map: those two pictures are all that is fetched ("atlases" in assets.json), and the trees the engine grows
// from numbers wear them — as do the ferns and broad leaves of the ground cover.  A cut-out plant model's own maps
// can be read the same way (its id is the key).
//   await LR.atlas.load(['island_tree_02:leaves', 'fir_tree_01:twig', 'fern_02'])       in LR.start({ materials })
//   a part is [u0, v0, u1, v1, turn] — a box in the picture (0..1, origin top left) and where its base is:
//   turn 0 base at the bottom (tip up) · 1 base at the left · 2 base at the top · 3 base at the right
//   (only the largest connected piece inside the box is kept, so a neighbour's corner does not come along; a sixth
//   entry of 1 keeps everything in the box)
//   LR.atlas.part(key, part)     → the piece upright, with smaller copies of itself: what the leaf painters sample
//   LR.atlas.canvas(key, part)   → the piece upright on a canvas (tip up): what the 2D painters draw
// A key that is not loaded (no scans fetched, ?scan=0, a file that did not arrive) simply is not there: has() is false
// and every painter keeps its generated picture.
{
  const AT = (LR.atlas = { data: {}, parts: new Map(), failed: [] });
  const wait = () => LR.qn('scanwait', 40) * 1000;
  const img = (url) => new Promise((res) => { const i = new Image(); let done = false; const end = (v) => { if (!done) { done = true; res(v); } };
    i.crossOrigin = 'anonymous'; setTimeout(() => end(null), wait()); i.onload = () => end(i); i.onerror = () => end(null); i.src = url; });
  AT.has = (key) => !!AT.data[key];
  AT.load = async (keys) => {
    if (LR.q('scan') === '0' || !LR.ASSETS) return;
    await Promise.all([].concat(keys).map(async (key) => {
      const A = LR.ASSETS, at = A.atlases && A.atlases[key], mo = A.models && A.models[key], f = at ? at.files : mo && mo.alpha && mo.diff ? { diff: mo.diff, alpha: mo.alpha } : null;
      if (!f) { AT.failed.push(key); console.warn(`foliage atlas "${key}" is not in assets/manifest.json (name it under "atlases" in assets.json, or fetch the cut-out model): the generated foliage is kept`); return; }
      const [d, al] = await Promise.all([img(f.diff), img(f.alpha)]);
      if (!d || !al) { AT.failed.push(key); console.warn(`foliage atlas "${key}" did not arrive: the generated foliage is kept`); return; }
      const w = d.naturalWidth, h = d.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(al, 0, 0, w, h); const am = x.getImageData(0, 0, w, h).data;
      x.clearRect(0, 0, w, h); x.drawImage(d, 0, 0, w, h); const px = x.getImageData(0, 0, w, h).data; for (let i = 0; i < px.length; i += 4) px[i + 3] = am[i];
      AT.data[key] = { w, h, px };
    }));
  };
  // the piece, turned upright (row 0 is its tip), as floats: colour in the engine's gamma-2 encoding times coverage, and
  // coverage — with a chain of half-size copies so a leaf drawn at a tenth of its size is an average, not a sample
  AT.part = (key, part) => {
    const id = key + '|' + part.join(','); if (AT.parts.has(id)) return AT.parts.get(id);
    const D = AT.data[key]; if (!D) return null;
    const x0 = Math.round(part[0] * D.w), y0 = Math.round(part[1] * D.h), x1 = Math.round(part[2] * D.w), y1 = Math.round(part[3] * D.h), sw = x1 - x0, sh = y1 - y0, turn = part[4] || 0;
    const w = turn % 2 ? sh : sw, h = turn % 2 ? sw : sh, a = new Float32Array(w * h * 4); let mr = 0, mg = 0, mb = 0, ma = 0;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const sx = turn === 0 ? x0 + i : turn === 1 ? x1 - 1 - j : turn === 2 ? x1 - 1 - i : x0 + j, sy = turn === 0 ? y0 + j : turn === 1 ? y0 + i : turn === 2 ? y1 - 1 - j : y1 - 1 - i;
      const s = (sy * D.w + sx) * 4, o = (j * w + i) * 4, al = D.px[s + 3] / 255, r = Math.pow(D.px[s] / 255, 1.1), g = Math.pow(D.px[s + 1] / 255, 1.1), b = Math.pow(D.px[s + 2] / 255, 1.1);
      a[o] = r * al; a[o + 1] = g * al; a[o + 2] = b * al; a[o + 3] = al; }
    // a box drawn round one piece often catches the corner of its neighbour: keep the largest connected piece only
    // (grown by two texels first, so a needle a hair's breadth off its twig still belongs) — part[5] = 1 keeps all
    if (!part[5]) { const n = w * h, m = new Uint8Array(n), g = new Uint8Array(n), lab = new Int32Array(n), st = new Int32Array(n); for (let i = 0; i < n; i++) m[i] = a[i * 4 + 3] > 0.25 ? 1 : 0;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let v = 0; for (let d = -2; d <= 2 && !v; d++) { const x = i + d; if (x >= 0 && x < w && m[j * w + x]) v = 1; } g[j * w + i] = v; }
      for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) { let v = 0; for (let d = -2; d <= 2 && !v; d++) { const y = j + d; if (y >= 0 && y < h && g[y * w + i]) v = 1; } lab[j * w + i] = v ? -1 : 0; }
      let best = 0, bestN = 0, id = 0;
      for (let s0 = 0; s0 < n; s0++) { if (lab[s0] !== -1) continue; id++; let top = 0, cnt = 0; st[top++] = s0; lab[s0] = id;
        while (top) { const q = st[--top], x = q % w, y = (q - x) / w; cnt += m[q]; if (x > 0 && lab[q - 1] === -1) { lab[q - 1] = id; st[top++] = q - 1; } if (x < w - 1 && lab[q + 1] === -1) { lab[q + 1] = id; st[top++] = q + 1; } if (y > 0 && lab[q - w] === -1) { lab[q - w] = id; st[top++] = q - w; } if (y < h - 1 && lab[q + w] === -1) { lab[q + w] = id; st[top++] = q + w; } }
        if (cnt > bestN) { bestN = cnt; best = id; } }
      for (let i = 0; i < n; i++) if (lab[i] !== best) a[i * 4] = a[i * 4 + 1] = a[i * 4 + 2] = a[i * 4 + 3] = 0; }
    for (let i = 0; i < w * h * 4; i += 4) { mr += a[i]; mg += a[i + 1]; mb += a[i + 2]; ma += a[i + 3]; }
    const mips = [{ w, h, a }]; for (let m = mips[0]; m.w > 4 && m.h > 4;) { const nw = m.w >> 1, nh = m.h >> 1, n = new Float32Array(nw * nh * 4);
      for (let j = 0; j < nh; j++) for (let i = 0; i < nw; i++) for (let c = 0; c < 4; c++) n[(j * nw + i) * 4 + c] = (m.a[((j * 2) * m.w + i * 2) * 4 + c] + m.a[((j * 2) * m.w + i * 2 + 1) * 4 + c] + m.a[((j * 2 + 1) * m.w + i * 2) * 4 + c] + m.a[((j * 2 + 1) * m.w + i * 2 + 1) * 4 + c]) / 4;
      m = { w: nw, h: nh, a: n }; mips.push(m); }
    const P = { w, h, mips, mean: ma > 0 ? [mr / ma, mg / ma, mb / ma] : [0.3, 0.4, 0.2], cover: ma / (w * h) }; AT.parts.set(id, P); return P;
  };
  // sample a piece: u across (0..1), t along from base (0) to tip (1), at the copy `lod` (0 = full size) → out[0..3] = colour × coverage, coverage
  AT.sample = (P, u, t, lod, out) => {
    const m = P.mips[Math.max(0, Math.min(P.mips.length - 1, Math.round(lod)))], fx = u * m.w - 0.5, fy = (1 - t) * m.h - 0.5, ix = Math.floor(fx), iy = Math.floor(fy), ax = fx - ix, ay = fy - iy;
    out[0] = out[1] = out[2] = out[3] = 0;
    for (let k = 0; k < 4; k++) { const xx = ix + (k & 1), yy = iy + (k >> 1); if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) continue; const wgt = (k & 1 ? ax : 1 - ax) * (k >> 1 ? ay : 1 - ay), o = (yy * m.w + xx) * 4;
      out[0] += m.a[o] * wgt; out[1] += m.a[o + 1] * wgt; out[2] += m.a[o + 2] * wgt; out[3] += m.a[o + 3] * wgt; }
    return out;
  };
  // the piece upright on a canvas, in the engine's gamma-2 encoding (what its 2D painters use), straight alpha; transparent
  // texels carry the piece's mean colour so edges do not darken
  AT.canvas = (key, part) => {
    const P = AT.part(key, part); if (!P) return null; if (P.canvas) return P.canvas;
    const c = document.createElement('canvas'); c.width = P.w; c.height = P.h; const x = c.getContext('2d'), im = x.createImageData(P.w, P.h), a = P.mips[0].a, e = (v) => Math.round(255 * LR.sat(v));
    for (let i = 0; i < P.w * P.h; i++) { const al = a[i * 4 + 3], k = al > 1e-3 ? 1 / al : 0; im.data[i * 4] = e(k ? a[i * 4] * k : P.mean[0]); im.data[i * 4 + 1] = e(k ? a[i * 4 + 1] * k : P.mean[1]); im.data[i * 4 + 2] = e(k ? a[i * 4 + 2] * k : P.mean[2]); im.data[i * 4 + 3] = Math.round(al * 255); }
    x.putImageData(im, 0, 0); P.canvas = c; return c;
  };
}
