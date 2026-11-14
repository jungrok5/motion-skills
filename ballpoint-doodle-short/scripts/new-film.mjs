// ballpoint-doodle-short · new-film.mjs — start a project: lib/ (with the font), BRIEF.md, cast.js + cast.html, film.html + score.js, out/.
//   node <skill>/scripts/new-film.mjs my-film                  → from templates/ (11.5 s, 3 shots, one hero + a prop)
//   node <skill>/scripts/new-film.mjs my-film --from seed      → from examples/seed/ (46.5 s, 9 shots, three creatures)
// Then: rewrite BRIEF.md from the user's topic FIRST (references/BRIEF.md), then the cast (cast.js, reviewed on cast.html),
// then the shots. The template and the example are examples of the style, not forms to fill.
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--'));
const fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
if (!dir) { console.error('usage: new-film.mjs <dir> [--from seed]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'film.html'))) { console.error(`${out}/film.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
// pages import the library through an import map ("bds/"); modules import it by relative path — both are pointed at ./lib/
const fix = s => s.replace(/"bds\/": "[^"]*"/, '"bds/": "./lib/"').replace(/(['"])(?:\.\.\/)+lib\//g, '$1./lib/');
writeFileSync(join(out, 'film.html'), fix(readFileSync(join(src, from ? 'index.html' : 'film.html'), 'utf8')));
for (const f of readdirSync(src)) if (f.endsWith('.js') || f.endsWith('.md') || (f.endsWith('.html') && f !== 'index.html' && f !== 'film.html')) writeFileSync(join(out, f), fix(readFileSync(join(src, f), 'utf8')));
writeFileSync(join(out, '.gitignore'), 'out/\n');
console.log(`${out}/film.html  (from ${from ? 'examples/' + from : 'templates/film.html'})
next:  rewrite BRIEF.md from the topic, design cast.js, then
       cd ${dir} && node ${join(skill, 'scripts/render.mjs')} cast.html --stills 0 --scale .5`);
