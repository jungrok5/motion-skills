// scanned-realm · fetch-assets.mjs — downloads the scanned assets a realm names (Poly Haven, CC0) into <realm>/assets/.
//   node <skill>/scripts/fetch-assets.mjs <realm-dir> [--res 1k|2k] [--force]
// <realm>/assets.json: { "res": "1k", "textures": ["cobblestone_floor_04", …], "models": ["boulder_01", …] }
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
const manifest = { source: 'Poly Haven (https://polyhaven.com), CC0', res, textures: {}, models: {} }, credits = [];
let bytes = 0; const size = (f) => { const s = statSync(f).size; bytes += s; return s; };
for (const id of want.textures || []) {
  const files = json(`${API}/files/${id}`), info = json(`${API}/info/${id}`), out = join(dir, 'assets', 'tex', id), m = { files: {}, urls: {} };
  const pick = (key) => files[key] && files[key][res] && files[key][res].jpg ? files[key][res].jpg.url : null;
  for (const [name, key] of [['diff', 'Diffuse'], ['nor', 'nor_gl'], ['arm', 'arm'], ['disp', 'Displacement']]) { const url = pick(key); if (!url) continue; const f = join(out, name + '.jpg'); get(url, f); size(f); m.files[name] = `assets/tex/${id}/${name}.jpg`; m.urls[name] = url; }
  const dm = info.dimensions || [2000, 2000]; m.tile = Math.round(Math.max(dm[0], dm[1])) / 1000; m.name = info.name; m.authors = Object.keys(info.authors || {});
  manifest.textures[id] = m; credits.push(`- texture **${info.name}** (\`${id}\`) by ${m.authors.join(', ') || 'Poly Haven'} — https://polyhaven.com/a/${id} — CC0`);
  console.log(`texture ${id}  ${m.tile} m  ${Object.keys(m.files).join(' ')}`);
}
for (const id of want.models || []) {
  const files = json(`${API}/files/${id}`), info = json(`${API}/info/${id}`), g = files.gltf && files.gltf[res] && files.gltf[res].gltf;
  if (!g) { console.error(`model ${id}: no glTF at ${res}`); continue; }
  const out = join(dir, 'assets', 'models', id), main = join(out, basename(g.url)); get(g.url, main); size(main);
  const inc = {}; for (const [rel, i] of Object.entries(g.include || {})) { const f = join(out, rel); get(i.url, f); size(f); inc[rel] = i.url; }
  manifest.models[id] = { file: `assets/models/${id}/${basename(g.url)}`, url: g.url, inc, name: info.name, authors: Object.keys(info.authors || {}) };
  credits.push(`- model **${info.name}** (\`${id}\`) by ${manifest.models[id].authors.join(', ') || 'Poly Haven'} — https://polyhaven.com/a/${id} — CC0`);
  console.log(`model ${id}  ${basename(g.url)} + ${Object.keys(g.include || {}).length} files`);
}
manifest.bytes = bytes;                                                     // what the page will load: shown before it does, inside a frame
mkdirSync(join(dir, 'assets'), { recursive: true });
writeFileSync(join(dir, 'assets', 'manifest.json'), JSON.stringify(manifest, null, 1));
writeFileSync(join(dir, 'assets', 'CREDITS.md'), `# Assets\n\nAll from Poly Haven (https://polyhaven.com), licence CC0 — free for any use, credit not required but given here.\n\n${credits.join('\n')}\n`);
console.log(`${Object.keys(manifest.textures).length} textures, ${Object.keys(manifest.models).length} models, ${(bytes / 1e6).toFixed(1)} MB → ${join(dir, 'assets')}`);
