// cursor-swarm · new-site.mjs — start a project: lib/ (engine + fonts), BRIEF.md, site.html (template or an example), out/.
//   node <skill>/scripts/new-site.mjs my-site                 → from templates/site.html (a small 3-section page)
//   node <skill>/scripts/new-site.mjs my-site --from bakery   → from examples/bakery/ (7 sections, its filled brief)
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
const dir = args.find((a, i) => !a.startsWith('--') && (fi < 0 || i !== fi + 1));
if (!dir) { console.error('usage: new-site.mjs <dir> [--from bakery]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'site.html'))) { console.error(`${out}/site.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from, 'index.html') : join(skill, 'templates', 'site.html');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
writeFileSync(join(out, 'site.html'), readFileSync(src, 'utf8').replace(/"cs\/": "[^"]*"/, '"cs/": "./lib/"'));
const brief = from ? join(skill, 'examples', from, 'BRIEF.md') : join(skill, 'templates', 'BRIEF.md');
if (existsSync(brief)) writeFileSync(join(out, 'BRIEF.md'), readFileSync(brief, 'utf8'));
writeFileSync(join(out, '.gitignore'), 'out/\n');
console.log(`${out}/site.html  (from ${from ? 'examples/' + from : 'templates/site.html'})
next:  write BRIEF.md from the topic first (references/BRIEF.md), then site.html
       cd ${dir} && node ${join(skill, 'scripts/check.mjs')} site.html
       node ${join(skill, 'scripts/render.mjs')} site.html --sheet 16 --scale .5`);
