// sight-gag-short · new-film.mjs — start a project: lib/ + fonts/ (copies), film.html + cast.js + cast.html (the cast
// sheet) + score.js + BRIEF.md, out/.
//   node <skill>/scripts/new-film.mjs my-film                          → from templates/ (a 2-gag starting film)
//   node <skill>/scripts/new-film.mjs my-film --from crossing-guard    → from examples/crossing-guard/ (the worked example)
// Rewrite BRIEF.md from the user's topic first (references/BRIEF.md), then the cast, the set and the gags.
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--from');
const fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
if (!dir) { console.error('usage: new-film.mjs <dir> [--from crossing-guard]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'film.html'))) { console.error(`${out}/film.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
cpSync(join(skill, 'fonts'), join(out, 'fonts'), { recursive: true });
const fix = s => s.replace(/"three":\s*"[^"]*"/, '"three": "./lib/three.module.min.js"').replace(/"gag\/":\s*"[^"]*"/, '"gag/": "./lib/"');
writeFileSync(join(out, 'film.html'), fix(readFileSync(join(src, from ? 'index.html' : 'film.html'), 'utf8')));
for (const f of readdirSync(src)) if (f.endsWith('.js') || f === 'BRIEF.md') writeFileSync(join(out, f), readFileSync(join(src, f), 'utf8'));
if (existsSync(join(src, 'cast.html'))) writeFileSync(join(out, 'cast.html'), fix(readFileSync(join(src, 'cast.html'), 'utf8')));
writeFileSync(join(out, '.gitignore'), 'out/\n');
console.log(`${out}/film.html  (from ${from ? 'examples/' + from : 'templates/'})
next:  cd ${dir} && node ${join(skill, 'scripts/check.mjs')} film.html
       node ${join(skill, 'scripts/render.mjs')} film.html --sheet 16 --scale .5 --q mb=1`);
