// sprite-stack-short · new-short.mjs — start a project: a copy of lib/, the template (or an example), out/.
//   node <skill>/scripts/new-short.mjs my-short                    (templates: BRIEF.md, a commented cast + short + sheet)
//   node <skill>/scripts/new-short.mjs my-short --from tugboat-dawn
import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--')), fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
if (!dir) { console.error('usage: new-short.mjs <dir> [--from tugboat-dawn]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'index.html'))) { console.error(`${out}/index.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
const fix = s => s.replace(/(["'(])(?:\.\.\/)+lib\//g, '$1lib/');
for (const f of readdirSync(src)) if (/\.(js|md|html)$/.test(f)) writeFileSync(join(out, f), fix(readFileSync(join(src, f), 'utf8')));
if (!existsSync(join(out, 'BRIEF.md'))) writeFileSync(join(out, 'BRIEF.md'), readFileSync(join(skill, 'templates', 'BRIEF.md'), 'utf8'));
writeFileSync(join(out, '.gitignore'), 'out/\nref/\n');
console.log(`${out}/index.html  (from ${from ? 'examples/' + from : 'templates/'})
next: write BRIEF.md from the topic, draw the hero's four views in cast.js, then
  cd ${dir} && node ${join(skill, 'scripts/check.mjs')} sheet.html && node ${join(skill, 'scripts/render.mjs')} sheet.html --stills 0`);
