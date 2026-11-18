// machine-wilds · 46_lods — levels of detail for a scanned tree, made when it arrives.
// A tree model is a trunk, thousands of twigs and tens of thousands of leaves or needle sprays, each its own little
// piece of mesh.  Edge collapse cannot take a crown from a million triangles to a few thousand: the pieces do not touch.
// So, as every engine that draws a forest does it: leaves are dropped by a fixed lottery (each level a subset of the one
// before, so nothing reappears) and the ones left are enlarged about their own middles so the crown keeps its cover;
// twigs are dropped thinnest first; what is kept is then simplified within itself.
//   LR.lods.tree(p, 'leaf' | 'wood', MeshoptSimplifier) → [{ idx, pos?, nor?, uv?, k? }, …]   seven levels, the first the scan itself
//   (a level with no triangles is not drawn: thin wood far away)
//   (a level without pos shares the primitive's own vertices; k: how deep in the crown each vertex is, 0 … 1 — see crown())
{
  const L = (LR.lods = {});
  const hash1 = (x) => { const v = Math.sin(x * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  // the connected pieces of a primitive: triangles that share a position (to half a millimetre) belong together
  L.pieces = (pos, idx) => {
    const nv = pos.length / 3, weld = new Int32Array(nv), map = new Map(); let nw = 0;
    for (let i = 0; i < nv; i++) { const k = ((Math.round(pos[i * 3] * 2000) + 65536) * 131072 + Math.round(pos[i * 3 + 1] * 2000) + 65536) * 131072 + Math.round(pos[i * 3 + 2] * 2000) + 65536; let w = map.get(k); if (w === undefined) { w = nw++; map.set(k, w); } weld[i] = w; }
    const par = new Int32Array(nw); for (let i = 0; i < nw; i++) par[i] = i;
    const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    const nt = idx.length / 3; for (let t = 0; t < nt; t++) { const a = find(weld[idx[t * 3]]), b = find(weld[idx[t * 3 + 1]]), c = find(weld[idx[t * 3 + 2]]); if (b !== a) par[b] = a; if (c !== a) par[find(c)] = a; }
    const id = new Int32Array(nw).fill(-1), of = new Int32Array(nt); let n = 0; for (let t = 0; t < nt; t++) { const r = find(weld[idx[t * 3]]); if (id[r] < 0) id[r] = n++; of[t] = id[r]; }
    const tris = new Int32Array(n), area = new Float32Array(n), cx = new Float32Array(n), cy = new Float32Array(n), cz = new Float32Array(n);
    for (let t = 0; t < nt; t++) { const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3, ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const ar = 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) + 1e-9, q = of[t]; tris[q]++; area[q] += ar; cx[q] += ar * (pos[a] + pos[b] + pos[c]) / 3; cy[q] += ar * (pos[a + 1] + pos[b + 1] + pos[c + 1]) / 3; cz[q] += ar * (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3; }
    for (let q = 0; q < n; q++) { cx[q] /= area[q]; cy[q] /= area[q]; cz[q] /= area[q]; }
    return { of, n, tris, area, cx, cy, cz };
  };
  // how deep in the crown a vertex is: 0 at the middle of the tree's box, 1 at its skin (the light inside a crown falls off)
  L.crown = (pos, min, max) => { const nv = pos.length / 3, k = new Uint8Array(nv), cx = (min[0] + max[0]) / 2, cz = (min[2] + max[2]) / 2, y0 = min[1] + (max[1] - min[1]) * 0.55, rx = Math.max(0.05, (max[0] - min[0]) / 2), ry = Math.max(0.05, (max[1] - min[1]) * 0.5), rz = Math.max(0.05, (max[2] - min[2]) / 2);
    for (let i = 0; i < nv; i++) k[i] = Math.min(255, Math.round(Math.hypot((pos[i * 3] - cx) / rx, (pos[i * 3 + 1] - y0) / ry, (pos[i * 3 + 2] - cz) / rz) * 255)); return k; };
  // [share kept, share of their triangles kept, error allowed (of the model's size)] for the levels after the scan itself.
  // leaves: share of the pieces, by lottery.  wood: share of the surface, the largest pieces first.
  L.LEAF = [[1, 0.45, 0.02], [0.3, 0.45, 0.04], [0.1, 0.45, 0.07], [0.035, 0.5, 0.12], [0.012, 0.5, 0.2], [0.004, 0.5, 0.3]];
  L.WOOD = [[1, 0.5, 0.008, 1e9], [0.62, 0.4, 0.02, 20000], [0.36, 0.3, 0.04, 8000], [0.19, 0.22, 0.07, 3000], [0.09, 0.16, 0.12, 1200], [0.04, 0.12, 0.2, 500]];      // …, and no more triangles than this
  L.tree = (p, kind, MS, o = {}) => {
    const full = p.idx, out = [{ idx: full }], spec = kind === 'leaf' ? L.LEAF : L.WOOD, nv = p.pos.length / 3;
    if (full.length < 300 * 3) { for (let l = 0; l < spec.length; l++) out.push(out[0]); return out; }
    const P = L.pieces(p.pos, full), nt = full.length / 3;
    const simp = (idx, ratio, err) => { if (!MS) return idx; const target = Math.max(12, Math.floor((idx.length * ratio) / 3) * 3); if (idx.length <= target) return idx;
      try { let r = MS.simplify(idx, p.pos, 3, target, err, [])[0];
        if (r.length > target * 1.4 && kind === 'wood' && MS.simplifyWithAttributes) { const q = MS.simplifyWithAttributes(idx, p.pos, 3, p.uv, 2, [0.5, 0.5], null, target, Math.max(err, 0.08), ['Permissive'])[0]; if (q.length < r.length) r = q; }
        return r.length ? Uint32Array.from(r) : idx; } catch (e) { return idx; } };
    if (kind === 'leaf') {
      // a piece that is a good part of the whole is a stem: never dropped, never enlarged.  A spray several times the
      // usual size is enlarged less (a big spray grown sixfold would be a sail)
      const s = Array.from(P.tris).sort((a, b) => a - b), med = s[s.length >> 1] || 1, big = Math.max(40, nt * 0.03), lot = new Float32Array(P.n); for (let q = 0; q < P.n; q++) lot[q] = hash1(q * 0.7391 + 3.1);
      const cap = o.grow === undefined ? 6 : o.grow;
      for (const [f, r, err] of spec) {
        let n = 0; for (let t = 0; t < nt; t++) { const q = P.of[t]; if (P.tris[q] >= big || lot[q] < f) n++; }
        const kept = new Uint32Array(n * 3); n = 0; for (let t = 0; t < nt; t++) { const q = P.of[t]; if (P.tris[q] >= big || lot[q] < f) { kept[n++] = full[t * 3]; kept[n++] = full[t * 3 + 1]; kept[n++] = full[t * 3 + 2]; } }
        const idx = simp(kept, r, err), grow = f >= 1 ? 1 : Math.min(cap, Math.pow(1 / f, 0.45));
        if (grow === 1) { out.push({ idx }); continue; }
        // its own vertices: the pieces kept, each enlarged about its middle
        const vp = new Int32Array(nv).fill(-1); for (let t = 0; t < nt; t++) { const q = P.of[t]; vp[full[t * 3]] = q; vp[full[t * 3 + 1]] = q; vp[full[t * 3 + 2]] = q; }
        const map = new Int32Array(nv).fill(-1), ni = new Uint32Array(idx.length); let m = 0; for (let i = 0; i < idx.length; i++) { const v = idx[i]; if (map[v] < 0) map[v] = m++; ni[i] = map[v]; }
        const pos = new Float32Array(m * 3), nor = new Float32Array(m * 3), uv = new Float32Array(m * 2), k = p.k ? new Uint8Array(m) : null;
        for (let v = 0; v < nv; v++) { const w = map[v]; if (w < 0) continue; const q = vp[v], g = P.tris[q] >= big ? 1 : 1 + (grow - 1) * Math.min(1, (med * 4) / P.tris[q]);
          pos[w * 3] = P.cx[q] + (p.pos[v * 3] - P.cx[q]) * g; pos[w * 3 + 1] = P.cy[q] + (p.pos[v * 3 + 1] - P.cy[q]) * g; pos[w * 3 + 2] = P.cz[q] + (p.pos[v * 3 + 2] - P.cz[q]) * g;
          nor[w * 3] = p.nor[v * 3]; nor[w * 3 + 1] = p.nor[v * 3 + 1]; nor[w * 3 + 2] = p.nor[v * 3 + 2]; uv[w * 2] = p.uv[v * 2]; uv[w * 2 + 1] = p.uv[v * 2 + 1]; if (k) k[w] = p.k[v]; }
        out.push({ idx: ni, pos, nor, uv, k });
      }
      return out;
    }
    // wood: the pieces by surface, largest first; a level keeps them until its share of the whole surface is reached
    const order = Array.from({ length: P.n }, (_, q) => q).sort((a, b) => P.area[b] - P.area[a]); let total = 0; for (let q = 0; q < P.n; q++) total += P.area[q];
    const rank = new Float32Array(P.n); { let acc = 0; for (const q of order) { rank[q] = acc / total; acc += P.area[q]; } }         // the share of the surface that is in larger pieces than this one
    let l = 0; for (const [f, r, err, most] of spec) { l++;
      let n = 0; for (let t = 0; t < nt; t++) if (rank[P.of[t]] < f) n++;
      const kept = new Uint32Array(n * 3); n = 0; for (let t = 0; t < nt; t++) if (rank[P.of[t]] < f) { kept[n++] = full[t * 3]; kept[n++] = full[t * 3 + 1]; kept[n++] = full[t * 3 + 2]; }
      const idx = simp(kept, Math.min(r, (most * 3) / Math.max(1, kept.length)), err);
      out.push({ idx: l >= 2 && idx.length < 120 * 3 ? new Uint32Array(0) : idx });      // a stem of a few triangles is a pixel wide from here on: not worth a draw call
    }
    return out;
  };
}
