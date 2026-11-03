// crayon-statechart · new-film.mjs — start a project: lib/ (engine + fonts), film.html (template or an example), out/.
//   node <skill>/scripts/new-film.mjs my-film                → from templates/film.html (one chapter, 8 steps)
//   node <skill>/scripts/new-film.mjs my-film --from kimchi  → from examples/kimchi/ (3 chapters, 20 steps)
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
const dir = args.find((a, i) => !a.startsWith('--') && (fi < 0 || i !== fi + 1));
if (!dir) { console.error('usage: new-film.mjs <dir> [--from kimchi]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'film.html'))) { console.error(`${out}/film.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from, 'index.html') : join(skill, 'templates', 'film.html');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
writeFileSync(join(out, 'film.html'), readFileSync(src, 'utf8').replace(/"sc\/": "[^"]*"/, '"sc/": "./lib/"'));
writeFileSync(join(out, '.gitignore'), 'out/\n');
console.log(`${out}/film.html  (from ${from ? 'examples/' + from : 'templates/film.html'})
next:  cd ${dir} && node ${join(skill, 'scripts/check.mjs')} film.html
       node ${join(skill, 'scripts/render.mjs')} film.html --sheet 12 --scale .5`);
