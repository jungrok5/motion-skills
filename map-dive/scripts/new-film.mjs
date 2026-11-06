// map-dive · new-film.mjs — start a project: lib/ (engine, land, kit, three.js), film.html, fonts/, BRIEF.md, out/.
//   node <skill>/scripts/new-film.mjs my-film               → film.html from templates/film.html (a made-up region)
//   node <skill>/scripts/new-film.mjs my-film --from jeju   → film.html from examples/jeju/index.html
// Then write BRIEF.md first, rewrite film.html for your topic, and run fonts.mjs whenever its text changes.
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--'));
const fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
if (!dir) { console.error('usage: new-film.mjs <dir> [--from jeju]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'film.html'))) { console.error(`${out}/film.html exists — not overwriting`); process.exit(1); }
const srcDir = from ? join(skill, 'examples', from) : join(skill, 'templates');
const src = from ? join(srcDir, 'index.html') : join(srcDir, 'film.html');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
if (existsSync(join(srcDir, 'fonts'))) cpSync(join(srcDir, 'fonts'), join(out, 'fonts'), { recursive: true });
const html = readFileSync(src, 'utf8').replace(/"three": "[^"]*three\.module\.min\.js"/, '"three": "./lib/three.module.min.js"').replace(/"dive\/": "[^"]*"/, '"dive/": "./lib/"');
writeFileSync(join(out, 'film.html'), html);
if (!existsSync(join(out, 'BRIEF.md'))) cpSync(from && existsSync(join(srcDir, 'BRIEF.md')) ? join(srcDir, 'BRIEF.md') : join(skill, 'templates', 'BRIEF.md'), join(out, 'BRIEF.md'));
writeFileSync(join(out, '.gitignore'), 'out/\n');
console.log(`${out}/film.html  (from ${from ? 'examples/' + from : 'templates/film.html'})
next:  write ${dir}/BRIEF.md, then  cd ${dir} && node ${join(skill, 'scripts/render.mjs')} film.html --stills 2,8,12 --scale .5`);
