// ultimate-move-short · new-film.mjs — start a project: lib/, film.html + score.js (template or an example), out/.
//   node <skill>/scripts/new-film.mjs my-film                     → from templates/film.html (the starting film)
//   node <skill>/scripts/new-film.mjs my-film --from thousand-moons → from examples/thousand-moons/ (30 s, 16 shots)
// BRIEF.md comes along: rewrite it from the user's topic first (references/BRIEF.md), then the shots.
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--'));
const fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
if (!dir) { console.error('usage: new-film.mjs <dir> [--from thousand-moons]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'film.html'))) { console.error(`${out}/film.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
const fix = s => s.replace(/"um\/": "[^"]*"/, '"um/": "./lib/"');
writeFileSync(join(out, 'film.html'), fix(readFileSync(join(src, from ? 'index.html' : 'film.html'), 'utf8')));
for (const f of readdirSync(src)) if (f.endsWith('.js') || f === 'BRIEF.md') writeFileSync(join(out, f), readFileSync(join(src, f), 'utf8'));
writeFileSync(join(out, '.gitignore'), 'out/\n');
console.log(`${out}/film.html  (from ${from ? 'examples/' + from : 'templates/film.html'})
next:  cd ${dir} && node ${join(skill, 'scripts/render.mjs')} film.html --sheet 12 --scale .5`);
