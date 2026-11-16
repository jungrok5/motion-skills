// living-realm · build.mjs — put three.js, the engine (lib/*.js) and a realm's sources (src/*.js) into ONE html file.
//   node <skill>/scripts/build.mjs [project-dir]      → <project-dir>/index.html
// Every source is a plain script; they are joined in name order inside one module, so a later file sees the earlier ones.
// The built page has no imports, no fetches and no data: URIs — it runs from disk (file://) as well as from a server.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), skill = resolve(here, '..');
export function build(projectDir, { quiet = false } = {}) {
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
  const body = three + '\n' + parts.join('\n');
  if (/<\/script/i.test(body)) throw new Error('a source contains "</script" — split the string');
  let shell = readFileSync(existsSync(join(proj, 'shell.html')) ? join(proj, 'shell.html') : join(skill, 'lib', 'shell.html'), 'utf8');
  const meta = existsSync(join(proj, 'realm.json')) ? JSON.parse(readFileSync(join(proj, 'realm.json'), 'utf8')) : {};
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  shell = shell.replace(/__TITLE__/g, esc(meta.title || basename(proj))).replace(/__SUB__/g, esc(meta.subtitle || '')).replace(/__LANG__/g, meta.lang || 'en').replace(/__BG__/g, meta.bg || '#0b0d10');
  const html = shell.replace('/*__REALM__*/', () => `const REALM_META=${JSON.stringify(meta)};\n` + body);
  const out = join(proj, 'index.html');
  writeFileSync(out, html);
  if (!quiet) console.log(`${out}  ${(html.length / 1024).toFixed(0)} KB  (${files.length} sources)`);
  return out;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { build(process.argv[2] || '.'); } catch (e) { console.error('build failed:', e.message); process.exit(1); }
}
