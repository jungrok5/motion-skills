// scanned-realm · build.mjs — put three.js, the engine (lib/*.js) and a realm's sources (src/*.js) into one html file
// that reads its scans (assets/manifest.json, written by fetch-assets.mjs) from the assets/ folder beside it.
//   node <skill>/scripts/build.mjs [project-dir] [--cdn] [--out file.html]      → <project-dir>/index.html
// Every source is a plain script; they are joined in name order inside one module, so a later file sees the earlier ones.
// The page has no imports; its only requests are the scans.  Serve the folder (python3 -m http.server) — a browser
// will not read textures from file:// — or build with --cdn: then the page reads the same files from Poly Haven's
// server and index.html alone can be hosted (it must then show where the scans come from; the HUD's credit line does).
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), skill = resolve(here, '..');
export function build(projectDir, { quiet = false, cdn = false, out: outFile = null } = {}) {
  const proj = resolve(projectDir || '.');
  const srcDir = join(proj, 'src');
  if (!existsSync(srcDir)) throw new Error(`no src/ in ${proj} — a realm is a folder with src/*.js (start one with new-realm.mjs)`);
  const js = (d) => readdirSync(d).filter((f) => f.endsWith('.js')).sort().map((f) => join(d, f));
  const skip = (process.env.LR_SKIP || '').split(',').filter(Boolean);   // LR_SKIP=85_audio leaves sources out while they are being written
  const files = [...js(join(skill, 'lib')), ...js(srcDir)].filter((f) => !skip.some((k) => basename(f).includes(k)));
  // three.js: one ES module that ends in export{a as B,…}; → an object, inside its own scope
  let three = readFileSync(join(skill, 'vendor', 'three.module.min.js'), 'utf8');
  const banner = (three.match(/^\/\*\*[\s\S]*?\*\//) || [''])[0];
  const m = three.match(/export\s*\{([^}]*)\}\s*;?\s*$/);
  if (!m) throw new Error('vendor/three.module.min.js: no trailing export list');
  const pairs = m[1].split(',').map((s) => s.trim()).filter(Boolean).map((s) => { const [a, b] = s.split(/\s+as\s+/); return `${b || a}:${a}`; });
  three = `${banner}\nconst THREE=(()=>{${three.slice(0, m.index).replace(banner, '')}\nreturn{${pairs.join(',')}};})();`;
  const parts = files.map((f) => `\n// ── ${f.startsWith(skill + '/lib') ? 'lib/' : 'src/'}${basename(f)} ──\n${readFileSync(f, 'utf8')}`);
  // meshoptimizer's simplifier (MIT, vendor/LICENSE-meshoptimizer.md): one self-contained script with its wasm inside — it makes the
  // lighter levels of detail of scanned objects when the page loads.  Its trailing export line is dropped.
  const mo = join(skill, 'vendor', 'meshopt_simplifier.js'), meshopt = existsSync(mo) ? readFileSync(mo, 'utf8').replace(/\nexport\s*\{\s*MeshoptSimplifier\s*\};?\s*$/, '\n') : '';
  const body = three + '\n' + meshopt + '\n' + parts.join('\n');
  if (/<\/script/i.test(body)) throw new Error('a source contains "</script" — split the string');
  let shell = readFileSync(existsSync(join(proj, 'shell.html')) ? join(proj, 'shell.html') : join(skill, 'lib', 'shell.html'), 'utf8');
  const meta = existsSync(join(proj, 'realm.json')) ? JSON.parse(readFileSync(join(proj, 'realm.json'), 'utf8')) : {};
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  shell = shell.replace(/__TITLE__/g, esc(meta.title || basename(proj))).replace(/__SUB__/g, esc(meta.subtitle || '')).replace(/__LANG__/g, meta.lang || 'en').replace(/__BG__/g, meta.bg || '#0b0d10');
  const assets = existsSync(join(proj, 'assets', 'manifest.json')) ? JSON.parse(readFileSync(join(proj, 'assets', 'manifest.json'), 'utf8')) : null;   // written by fetch-assets.mjs
  // the page reads its scans from assets/ beside it; with --cdn it reads the same files from Poly Haven's server instead
  if (assets) { assets.cdn = !!cdn; for (const t of Object.values(assets.textures || {})) { if (cdn) t.files = t.urls; delete t.urls; } for (const m of Object.values(assets.models || {})) { if (cdn) m.file = m.url; else delete m.inc; delete m.url; if (m.alpha) { if (m.alpha.diff) m.diff = cdn ? m.alpha.diff.url : m.alpha.diff.file; m.alpha = cdn ? m.alpha.url : m.alpha.file; } delete m.tris; }
    for (const a of Object.values(assets.atlases || {})) { if (cdn) a.files = a.urls; delete a.urls; } }
  const html = shell.replace('/*__REALM__*/', () => `const REALM_META=${JSON.stringify(meta)};\nconst REALM_ASSETS=${JSON.stringify(assets)};\n` + body);
  const out = outFile ? resolve(outFile) : join(proj, 'index.html');
  writeFileSync(out, html);
  if (!quiet) console.log(`${out}  ${(html.length / 1024).toFixed(0)} KB  (${files.length} sources)`);
  return out;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const av = process.argv.slice(2), oi = av.indexOf('--out');
  try { build(av[0] && !av[0].startsWith('--') ? av[0] : '.', { cdn: av.includes('--cdn'), out: oi > -1 ? av[oi + 1] : null }); } catch (e) { console.error('build failed:', e.message); process.exit(1); }
}
