// torn-page-journey · new-journey.mjs — start a project: a copy of lib/, the template (or an example), out/.
//   node <skill>/scripts/new-journey.mjs my-journey                 (templates: 3 commented chapters + a cast + a score)
//   node <skill>/scripts/new-journey.mjs my-journey --from lemon-tree
import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--')), fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
if (!dir) { console.error('usage: new-journey.mjs <dir> [--from lemon-tree]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'index.html'))) { console.error(`${out}/index.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
const fix = s => s.replace(/"tpj\/": "[^"]*"/, '"tpj/": "./lib/"').replace(/(['"])(?:\.\.\/)+lib\//g, '$1./lib/');
for (const f of readdirSync(src)) if (/\.(js|md|html)$/.test(f)) writeFileSync(join(out, f), fix(readFileSync(join(src, f), 'utf8')));
writeFileSync(join(out, '.gitignore'), 'out/\nref/\n');
console.log(`${out}/index.html  (from ${from ? 'examples/' + from : 'templates/'})
next: write BRIEF.md from the topic, design cast.js, then
  cd ${dir} && node ${join(skill, 'scripts/render.mjs')} cast.html --stills 0 --scale .5`);
