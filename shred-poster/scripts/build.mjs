// shred-poster · build.mjs — three.js, the engine (lib/*.js), the project's fonts and its sources (src/*.js) → ONE html.
//   node <skill>/scripts/build.mjs [project-dir]      → <project-dir>/index.html
// Sources are plain scripts joined in name order inside one module, so a later file sees the earlier ones.
// Fonts: only the faces (unicode-range chunks) that cover characters used in src/ are embedded.
// The built page has no imports and no fetches — it plays from disk (file://) as well as from a server.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { usedChars, covers, projectFaces } from './fonts-lib.mjs';

const here = dirname(fileURLToPath(import.meta.url)), skill = resolve(here, '..');
export function build(projectDir, { quiet = false } = {}) {
  const proj = resolve(projectDir || '.');
  const srcDir = join(proj, 'src');
  if (!existsSync(srcDir)) throw new Error(`no src/ in ${proj} — a film is a folder with src/*.js (start one with new-film.mjs)`);
  const js = (d) => readdirSync(d).filter((f) => f.endsWith('.js')).sort().map((f) => join(d, f));
  const files = [...js(join(skill, 'lib')), ...js(srcDir)];
  let three = readFileSync(join(skill, 'vendor', 'three.module.min.js'), 'utf8');
  const banner = (three.match(/^\/\*\*[\s\S]*?\*\//) || [''])[0];
  const m = three.match(/export\s*\{([^}]*)\}\s*;?\s*$/);
  if (!m) throw new Error('vendor/three.module.min.js: no trailing export list');
  const pairs = m[1].split(',').map((s) => s.trim()).filter(Boolean).map((s) => { const [a, b] = s.split(/\s+as\s+/); return `${b || a}:${a}`; });
  three = `${banner}\nconst THREE=(()=>{${three.slice(0, m.index).replace(banner, '')}\nreturn{${pairs.join(',')}};})();`;
  const chars = usedChars(proj), faces = projectFaces(proj).filter((f) => covers(f.range, chars));
  const fontData = faces.map((f) => ({ family: f.family, weight: f.weight, style: f.style || 'normal', range: f.range || '', b64: readFileSync(f.path).toString('base64') }));
  const fontJs = `const FONT_DATA=${JSON.stringify(fontData)};`;
  const parts = files.map((f) => `\n// ── ${f.startsWith(skill) ? 'lib/' : 'src/'}${basename(f)} ──\n${readFileSync(f, 'utf8')}`);
  const body = three + '\n' + fontJs + '\n' + parts.join('\n');
  if (/<\/script/i.test(body)) throw new Error('a source contains "</script" — split the string');
  let shell = readFileSync(existsSync(join(proj, 'shell.html')) ? join(proj, 'shell.html') : join(skill, 'lib', 'shell.html'), 'utf8');
  const meta = existsSync(join(proj, 'film.json')) ? JSON.parse(readFileSync(join(proj, 'film.json'), 'utf8')) : {};
  shell = shell.replace(/__TITLE__/g, meta.title || basename(proj)).replace(/__LANG__/g, meta.lang || 'en').replace(/__BG__/g, meta.bg || '#141414');
  const html = shell.replace('/*__FILM__*/', () => body);
  const out = join(proj, 'index.html');
  writeFileSync(out, html);
  if (!quiet) console.log(`${out}  ${(html.length / 1024).toFixed(0)} KB  (${files.length} sources, ${faces.length} font faces)`);
  return out;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { build(process.argv[2] || '.'); } catch (e) { console.error('build failed:', e.message); process.exit(1); }
}
