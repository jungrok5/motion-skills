// scanned-realm · fetch-assets.mjs — downloads the scanned assets a realm names (Poly Haven, CC0) into <realm>/assets/.
//   node <skill>/scripts/fetch-assets.mjs <realm-dir> [--res 1k|2k] [--force]
// <realm>/assets.json: { "res": "1k", "textures": ["cobblestone_floor_04", { "id": "pine_bark", "maps": "dna" }, …],
//   "models": ["wine_barrel_01", { "id": "rock_face_01", "res": "2k" }, { "id": "croissant", "maps": "d" }, …], "atlases": [{ "id": "fir_tree_01", "map": "twig" }] }
// Writes assets/tex/<id>/{diff,nor,arm,disp}.jpg, assets/models/<id>/…, assets/manifest.json (real-world sizes, files)
// and assets/CREDITS.md.  Nothing here is committed: assets/ is in .gitignore; run this after cloning.
// Uses curl (it honours proxies and system certificates); Node 18+.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
const args = process.argv.slice(2), dir = resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.');
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; }, force = args.includes('--force');
if (!existsSync(join(dir, 'assets.json'))) { console.error('usage: fetch-assets.mjs <realm-dir>   (needs <realm-dir>/assets.json)'); process.exit(1); }
const want = JSON.parse(readFileSync(join(dir, 'assets.json'), 'utf8')), res = opt('res', want.res || '1k');
const API = 'https://api.polyhaven.com', UA = 'scanned-realm-fetch/1.0';
const curl = (url, out) => execFileSync('curl', ['-sS', '-L', '--fail', '--retry', '3', '-m', '300', '-A', UA, ...(out ? ['-o', out] : []), url], { maxBuffer: 1 << 28 });
const json = (url) => JSON.parse(curl(url).toString());
const get = (url, out) => { if (!force && existsSync(out) && statSync(out).size > 0) return false; mkdirSync(dirname(out), { recursive: true }); curl(url, out); return true; };
const manifest = { source: 'Poly Haven (https://polyhaven.com), CC0', res, textures: {}, models: {}, atlases: {} }, credits = [];
// the box of every root object of a glTF (after its nodes' transforms) and its triangles: [{ min, max, tris }, …]
const boxes = (file) => { const j = JSON.parse(readFileSync(file, 'utf8')), bufs = (j.buffers || []).map((b) => readFileSync(join(dirname(file), b.uri)));
  const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
  const trs = (n) => { if (n.matrix) return n.matrix; const [x, y, z, w] = n.rotation || [0, 0, 0, 1], [sx, sy, sz] = n.scale || [1, 1, 1], [tx, ty, tz] = n.translation || [0, 0, 0];
    return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0, 2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0, 2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1]; };
  const out = [];
  const walk = (ni, pm, box) => { const n = j.nodes[ni], m = mul(pm, trs(n));
    if (n.mesh !== undefined) for (const pr of j.meshes[n.mesh].primitives) { if ((pr.mode === undefined ? 4 : pr.mode) !== 4 || pr.attributes.POSITION === undefined) continue;
      const A = j.accessors[pr.attributes.POSITION], bv = j.bufferViews[A.bufferView], off = (bv.byteOffset || 0) + (A.byteOffset || 0), st = bv.byteStride || 12, b = bufs[bv.buffer];
      for (let k = 0; k < A.count; k++) { const x = b.readFloatLE(off + k * st), y = b.readFloatLE(off + k * st + 4), z = b.readFloatLE(off + k * st + 8), p = [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
        for (let c = 0; c < 3; c++) { if (p[c] < box.min[c]) box.min[c] = p[c]; if (p[c] > box.max[c]) box.max[c] = p[c]; } }
      box.tris += Math.floor(j.accessors[pr.indices !== undefined ? pr.indices : pr.attributes.POSITION].count / 3); }
    for (const c of n.children || []) walk(c, m, box); };
  for (const r of j.scenes[j.scene || 0].nodes) { const box = { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9], tris: 0 }; walk(r, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], box); if (box.tris) out.push({ min: box.min.map((v) => +v.toFixed(5)), max: box.max.map((v) => +v.toFixed(5)), tris: box.tris }); }
  return out; };
let bytes = 0; const size = (f) => { const s = statSync(f).size; bytes += s; return s; };
// a surface is named by its id, or as { "id": …, "maps": "dna" } — which of colour, normal, occlusion-roughness and
// height to fetch (height, "h", is what the relief march and the creases read: bark and cloth do without)
for (const entry of want.textures || []) {
  const te = typeof entry === 'string' ? { id: entry } : entry, id = te.id, tmaps = te.maps || 'dnah';
  const files = json(`${API}/files/${id}`), info = json(`${API}/info/${id}`), out = join(dir, 'assets', 'tex', id), m = { files: {}, urls: {} };
  const pick = (key) => files[key] && files[key][res] && files[key][res].jpg ? files[key][res].jpg.url : null;
  for (const [name, key, letter] of [['diff', 'Diffuse', 'd'], ['nor', 'nor_gl', 'n'], ['arm', 'arm', 'a'], ['disp', 'Displacement', 'h']]) { const url = tmaps.includes(letter) ? pick(key) : null; if (!url) continue; const f = join(out, name + '.jpg'); get(url, f); size(f); m.files[name] = `assets/tex/${id}/${name}.jpg`; m.urls[name] = url; }
  const dm = info.dimensions || [2000, 2000]; m.tile = Math.round(Math.max(dm[0], dm[1])) / 1000; m.name = info.name; m.authors = Object.keys(info.authors || {});
  manifest.textures[id] = m; credits.push(`- texture **${info.name}** (\`${id}\`) by ${m.authors.join(', ') || 'Poly Haven'} — https://polyhaven.com/a/${id} — CC0`);
  console.log(`texture ${id}  ${m.tile} m  ${Object.keys(m.files).join(' ')}`);
}
// a model is named by its id, or as { "id": …, "res": "2k", "maps": "d" | "dn" | "dna" } — maps: which of colour, normal and
// occlusion-roughness to fetch (small things do with colour alone)
for (const entry of want.models || []) {
  const e = typeof entry === 'string' ? { id: entry } : entry, id = e.id, mres = e.res || res, maps = e.maps || 'dna';
  const files = json(`${API}/files/${id}`), info = json(`${API}/info/${id}`), g = files.gltf && files.gltf[mres] && files.gltf[mres].gltf;
  if (!g) { console.error(`model ${id}: no glTF at ${mres}`); continue; }
  const skip = (rel) => (/_nor_gl_|_nor_dx_/.test(rel) && !maps.includes('n')) || (/_arm_|_rough_|_metal_|_ao_/.test(rel) && !maps.includes('a'));
  const out = join(dir, 'assets', 'models', id), main = join(out, basename(g.url)); get(g.url, main); size(main);
  const inc = {}; let n = 0; for (const [rel, i] of Object.entries(g.include || {})) { if (skip(rel)) continue; const f = join(out, rel); get(i.url, f); size(f); inc[rel] = i.url; n++; }
  // a plant's cut-out lives beside the glTF, not in it: its Alpha / opacity map
  const ak = Object.keys(files).find((k) => /^(alpha|opacity)$/i.test(k)), au = ak && files[ak][mres] && files[ak][mres].jpg ? files[ak][mres].jpg.url : null; let alpha = null;
  if (au) { const f = join(out, 'textures', basename(au)); get(au, f); size(f); alpha = { file: `assets/models/${id}/textures/${basename(au)}`, url: au };
    const dr = Object.keys(inc).find((r) => /_diff_/.test(r)); if (dr) alpha.diff = { file: `assets/models/${id}/${dr}`, url: inc[dr] }; }                // its colour map by name too: plants' atlases are also read as pictures
  // the triangles that will really be drawn: counted from the file (the library's own "polycount" is of another version of the model)
  let tris = 0; try { const gj = JSON.parse(readFileSync(main, 'utf8')); for (const me of gj.meshes || []) for (const pr of me.primitives || []) tris += Math.floor((gj.accessors[pr.indices !== undefined ? pr.indices : pr.attributes.POSITION].count) / 3); } catch (e) { tris = 0; }
  // its box and each of its objects' boxes, measured from the vertices: with them the page can place a model before its
  // triangles have arrived (the walk starts on the generated place; the scans come in as they load)
  let roots = null; try { roots = boxes(main); } catch (e) { console.error(`model ${id}: could not measure it (${e.message}) — the page will wait for it instead`); }
  manifest.models[id] = { file: `assets/models/${id}/${basename(g.url)}`, url: g.url, inc, maps, alpha, name: info.name, authors: Object.keys(info.authors || {}), tris, roots };
  credits.push(`- model **${info.name}** (\`${id}\`) by ${manifest.models[id].authors.join(', ') || 'Poly Haven'} — https://polyhaven.com/a/${id} — CC0`);
  console.log(`model ${id}  ${basename(g.url)} + ${n} files  ${mres} ${maps}  ${tris} triangles${alpha ? '  cut-out' : ''}`);
}
// leaf and twig atlases: the colour and cut-out maps of a tree model's foliage, without its millions of triangles —
// { "id": "island_tree_02", "map": "leaves" } → assets/atlas/island_tree_02_leaves_{diff,alpha}.jpg; the trees' own sprays are made of them
for (const e of want.atlases || []) {
  const id = e.id, map = e.map || 'leaves', ares = e.res || res, files = json(`${API}/files/${id}`), info = json(`${API}/info/${id}`), key = `${id}:${map}`, m = { files: {}, urls: {} };
  for (const k of ['diff', 'alpha']) { const fk = Object.keys(files).find((q) => q.toLowerCase() === `${map}_${k}`.toLowerCase()) || (map === 'all' ? Object.keys(files).find((q) => q.toLowerCase() === (k === 'diff' ? 'diffuse' : 'alpha')) : null);
    const u = fk && files[fk][ares] && files[fk][ares].jpg ? files[fk][ares].jpg.url : null; if (!u) { console.error(`atlas ${key}: no ${k} map at ${ares}`); continue; }
    const f = join(dir, 'assets', 'atlas', `${id}_${map}_${k}.jpg`); get(u, f); size(f); m.files[k] = `assets/atlas/${id}_${map}_${k}.jpg`; m.urls[k] = u; }
  if (!m.files.diff || !m.files.alpha) continue;
  manifest.atlases[key] = m; credits.push(`- foliage atlas **${info.name}** (\`${id}\`, ${map}) by ${Object.keys(info.authors || {}).join(', ') || 'Poly Haven'} — https://polyhaven.com/a/${id} — CC0`);
  console.log(`atlas ${key}  diff alpha  ${ares}`);
}
manifest.bytes = bytes;                                                     // what the page will load: shown before it does, inside a frame
mkdirSync(join(dir, 'assets'), { recursive: true });
writeFileSync(join(dir, 'assets', 'manifest.json'), JSON.stringify(manifest, null, 1));
writeFileSync(join(dir, 'assets', 'CREDITS.md'), `# Assets\n\nAll from Poly Haven (https://polyhaven.com), licence CC0 — free for any use, credit not required but given here.\n\n${credits.join('\n')}\n`);
console.log(`${Object.keys(manifest.textures).length} textures, ${Object.keys(manifest.models).length} models, ${Object.keys(manifest.atlases).length} atlases, ${(bytes / 1e6).toFixed(1)} MB → ${join(dir, 'assets')}`);
