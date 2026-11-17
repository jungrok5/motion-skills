// pencil-live-action · fetch-assets.mjs — downloads the photographed world a film names (Poly Haven, CC0) into <film>/assets/.
//   node <skill>/scripts/fetch-assets.mjs <film-dir> [--res 2k] [--force]
//
// <film>/assets.json:
//   { "res": "2k",
//     "hdri": "palermo_square",                         the place: light (HDR) + the backdrop (its full-size tonemapped JPG)
//     "textures": ["cobblestone_floor_08", "wood_table_worn"],      scanned surfaces (the ground, the table top …)
//     "models": [{ "id": "food_apple_01", "res": "1k" }] }          scanned objects (what a drawing turns into, props)
//
// Writes  assets/hdri/<id>.hdr + <id>.jpg, assets/tex/<id>/{diff,nor,arm}.jpg, assets/models/<id>/…, assets/manifest.json,
//         assets/CREDITS.md   — never committed (assets/ is git-ignored; never copy it into docs/)
// and     manifest.cdn.json beside assets.json — the same manifest with Poly Haven's URLs instead of files: small, safe to
//         commit; a page opened with ?cdn=1 (or built for the site) reads the scans straight from Poly Haven's server.
// Uses curl (it honours proxies and system certificates); Node 18+.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';

const args = process.argv.slice(2), dir = resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.');
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; }, force = args.includes('--force');
if (!existsSync(join(dir, 'assets.json'))) { console.error('usage: fetch-assets.mjs <film-dir>   (needs <film-dir>/assets.json)'); process.exit(1); }
const want = JSON.parse(readFileSync(join(dir, 'assets.json'), 'utf8')), res = opt('res', want.res || '2k');
const API = 'https://api.polyhaven.com', UA = 'pencil-live-action-fetch/1.0';
const curl = (url, out) => execFileSync('curl', ['-sS', '-L', '--fail', '--retry', '3', '-m', '600', '-A', UA, ...(out ? ['-o', out] : []), url], { maxBuffer: 1 << 28 });
const json = url => JSON.parse(curl(url).toString());
const get = (url, out) => { if (!force && existsSync(out) && statSync(out).size > 0) return; mkdirSync(dirname(out), { recursive: true }); curl(url, out); };
let bytes = 0; const size = f => { bytes += statSync(f).size; };
const local = { source: 'Poly Haven (https://polyhaven.com), CC0', res, hdri: null, textures: {}, models: {} };
const cdn = JSON.parse(JSON.stringify(local)), credits = [];
const who = info => Object.keys(info.authors || {}).join(', ') || 'Poly Haven';

// the place
if (want.hdri) {
  const id = want.hdri, files = json(`${API}/files/${id}`), info = json(`${API}/info/${id}`);
  const hres = want.hdriRes || (res === '1k' ? '1k' : '2k'), hdr = files.hdri[hres].hdr.url, jpg = files.tonemapped && files.tonemapped.url;
  const fh = join(dir, 'assets', 'hdri', `${id}.hdr`); get(hdr, fh); size(fh);
  local.hdri = { id, name: info.name, authors: who(info), hdr: `assets/hdri/${id}.hdr` }; cdn.hdri = { ...local.hdri, hdr };
  if (jpg) { const fj = join(dir, 'assets', 'hdri', `${id}.jpg`); get(jpg, fj); size(fj); local.hdri.jpg = `assets/hdri/${id}.jpg`; cdn.hdri.jpg = jpg; }
  credits.push(`- HDRI **${info.name}** (\`${id}\`) by ${who(info)} — https://polyhaven.com/a/${id} — CC0`);
  console.log(`hdri ${id}  (${hres} HDR${jpg ? ' + full-size JPG backdrop' : ''})`);
}
// surfaces
for (const entry of want.textures || []) {
  const te = typeof entry === 'string' ? { id: entry } : entry, id = te.id, tres = te.res || res;
  const files = json(`${API}/files/${id}`), info = json(`${API}/info/${id}`), L = { files: {} }, C = { files: {} };
  const pick = key => files[key] && files[key][tres] && files[key][tres].jpg ? files[key][tres].jpg.url : null;
  for (const [name, key] of [['diff', 'Diffuse'], ['nor', 'nor_gl'], ['arm', 'arm']]) {
    const url = pick(key); if (!url) continue; const f = join(dir, 'assets', 'tex', id, name + '.jpg'); get(url, f); size(f);
    L.files[name] = `assets/tex/${id}/${name}.jpg`; C.files[name] = url;
  }
  const dm = info.dimensions || [2000, 2000]; L.tile = C.tile = Math.max(dm[0], dm[1]) / 1000; L.name = C.name = info.name;
  local.textures[id] = L; cdn.textures[id] = C;
  credits.push(`- texture **${info.name}** (\`${id}\`) by ${who(info)} — https://polyhaven.com/a/${id} — CC0`);
  console.log(`texture ${id}  ${L.tile} m  ${Object.keys(L.files).join(' ')}`);
}
// objects
for (const entry of want.models || []) {
  const e = typeof entry === 'string' ? { id: entry } : entry, id = e.id, mres = e.res || '1k';
  const files = json(`${API}/files/${id}`), info = json(`${API}/info/${id}`), g = files.gltf && files.gltf[mres] && files.gltf[mres].gltf;
  if (!g) { console.error(`model ${id}: no glTF at ${mres}`); continue; }
  const out = join(dir, 'assets', 'models', id), main = join(out, basename(g.url)); get(g.url, main); size(main);
  const inc = {}; for (const [rel, i] of Object.entries(g.include || {})) { const f = join(out, rel); get(i.url, f); size(f); inc[rel] = i.url; }
  local.models[id] = { name: info.name, file: `assets/models/${id}/${basename(g.url)}` };
  cdn.models[id] = { name: info.name, file: g.url, inc };
  credits.push(`- model **${info.name}** (\`${id}\`) by ${who(info)} — https://polyhaven.com/a/${id} — CC0`);
  console.log(`model ${id}  ${Object.keys(inc).length + 1} files`);
}
mkdirSync(join(dir, 'assets'), { recursive: true });
writeFileSync(join(dir, 'assets', 'manifest.json'), JSON.stringify(local, null, 1));
writeFileSync(join(dir, 'manifest.cdn.json'), JSON.stringify(cdn, null, 1));
writeFileSync(join(dir, 'assets', 'CREDITS.md'), `# Scans used by this film\nAll from Poly Haven (https://polyhaven.com), CC0 — no attribution required; credited anyway.\n\n${credits.join('\n')}\n`);
console.log(`${(bytes / 1e6).toFixed(1)} MB in assets/ (not committed) · manifest.cdn.json written (commit it for ?cdn=1 / the site)`);
