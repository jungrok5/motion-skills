// dragon-realm · build.mjs — put three.js, the engine (lib/*.js) and a film's sources (src/*.js) into ONE html file.
//   node <skill>/scripts/build.mjs [project-dir]      → <project-dir>/index.html
// Every source is a plain script; they are joined in name order inside one module, so a later file sees the earlier ones.
// The built page has no imports, no fetches and no data: URIs — it plays from disk (file://) as well as from a server.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), skill = resolve(here, '..');
export function build(projectDir, { quiet = false } = {}) {
  const proj = resolve(projectDir || '.');
  const srcDir = join(proj, 'src');
  if (!existsSync(srcDir)) throw new Error(`no src/ in ${proj} — a film is a folder with src/*.js (start one with new-film.mjs)`);
  const js = (d) => readdirSync(d).filter((f) => f.endsWith('.js')).sort().map((f) => join(d, f));
  const skip = (process.env.DR_SKIP || '').split(',').filter(Boolean);   // DR_SKIP=40_flora,45_arch leaves sources out while they are being written
  const files = [...js(join(skill, 'lib')), ...js(srcDir)].filter((f) => !skip.some((k) => basename(f).includes(k)));
  // three.js: one ES module that ends in export{a as B,…}; → an object, inside its own scope
  let three = readFileSync(join(skill, 'vendor', 'three.module.min.js'), 'utf8');
  const banner = (three.match(/^\/\*\*[\s\S]*?\*\//) || [''])[0];
  const m = three.match(/export\s*\{([^}]*)\}\s*;?\s*$/);
  if (!m) throw new Error('vendor/three.module.min.js: no trailing export list');
  const pairs = m[1].split(',').map((s) => s.trim()).filter(Boolean).map((s) => { const [a, b] = s.split(/\s+as\s+/); return `${b || a}:${a}`; });
  three = `${banner}\nconst THREE=(()=>{${three.slice(0, m.index).replace(banner, '')}\nreturn{${pairs.join(',')}};})();`;
  const parts = files.map((f) => `\n// ── ${f.startsWith(skill) ? 'lib/' : 'src/'}${basename(f)} ──\n${readFileSync(f, 'utf8')}`);
  const body = three + '\n' + parts.join('\n');
  if (/<\/script/i.test(body)) throw new Error('a source contains "</script" — split the string');
  let shell = readFileSync(existsSync(join(proj, 'shell.html')) ? join(proj, 'shell.html') : join(skill, 'lib', 'shell.html'), 'utf8');
  const meta = existsSync(join(proj, 'film.json')) ? JSON.parse(readFileSync(join(proj, 'film.json'), 'utf8')) : {};
  shell = shell.replace(/__TITLE__/g, meta.title || basename(proj)).replace(/__LANG__/g, meta.lang || 'en').replace(/__BG__/g, meta.bg || '#05070b');
  const html = shell.replace('/*__FILM__*/', () => body);
  const out = join(proj, 'index.html');
  writeFileSync(out, html);
  if (!quiet) console.log(`${out}  ${(html.length / 1024).toFixed(0)} KB  (${files.length} sources)`);
  return out;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { build(process.argv[2] || '.'); } catch (e) { console.error('build failed:', e.message); process.exit(1); }
}
