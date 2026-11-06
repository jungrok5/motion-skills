// parallax-facade · new-film.mjs — start a project: lib/, film.html, BRIEF.md, audio/, out/.
//   node <skill>/scripts/new-film.mjs my-loop                      → from templates/ (Clock Square, soft finish)
//   node <skill>/scripts/new-film.mjs my-loop --from hanok-alley   → from examples/hanok-alley/ (ink finish)
// Write BRIEF.md from the user's topic first (references/BRIEF.md), then design the town in film.html.
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--from');
const fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
if (!dir) { console.error('usage: new-film.mjs <dir> [--from hanok-alley]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'film.html'))) { console.error(`${out}/film.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true }); mkdirSync(join(out, 'audio'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
// the page imports the engine through an import map: point it at the project's own copy
const fix = (s) => s.replace(/"three": "[^"]*"/, '"three": "./lib/three.module.min.js"').replace(/"facade\/": "[^"]*"/, '"facade/": "./lib/"');
for (const f of readdirSync(src)) {
  const p = join(src, f);
  if (statSync(p).isDirectory()) { if (f !== 'out') cpSync(p, join(out, f), { recursive: true }); continue; }
  const name = f === 'index.html' ? 'film.html' : f;
  writeFileSync(join(out, name), f.endsWith('.html') ? fix(readFileSync(p, 'utf8')) : readFileSync(p));
}
if (!existsSync(join(out, 'BRIEF.md'))) cpSync(join(skill, 'templates', 'BRIEF.md'), join(out, 'BRIEF.md'));
writeFileSync(join(out, '.gitignore'), 'out/\n');
const s = join(skill, 'scripts');
console.log(`${out}/film.html  (from ${from ? 'examples/' + from : 'templates/'})
next:  cd ${dir}
       node ${join(s, 'check.mjs')} film.html
       node ${join(s, 'render.mjs')} film.html --sheet 9 --scale .4 --q blur=1`);
