// cursor-swarm · new-build.mjs — start a project: lib/ (engine + fonts), BRIEF.md, build.html, out/.
//   node <skill>/scripts/new-build.mjs my-build                    → templates/site.html (a small 3-section web page)
//   node <skill>/scripts/new-build.mjs my-build --from bakery      → examples/bakery (a website, 7 sections)
//   node <skill>/scripts/new-build.mjs my-build --from deck        → examples/deck (6 slides, pictures in assets/)
//   node <skill>/scripts/new-build.mjs my-build --from book        → examples/book (a cover and two spreads)
// To rebuild an existing .pptx / .pdf instead, use import-doc.py (it writes the same project layout).
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
const dir = args.find((a, i) => !a.startsWith('--') && (fi < 0 || i !== fi + 1));
if (!dir) { console.error('usage: new-build.mjs <dir> [--from bakery|deck|book]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'build.html'))) { console.error(`${out}/build.html exists — not overwriting`); process.exit(1); }
const srcDir = from ? join(skill, 'examples', from) : join(skill, 'templates');
const src = from ? join(srcDir, 'index.html') : join(srcDir, 'site.html');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
if (from && existsSync(join(srcDir, 'assets'))) cpSync(join(srcDir, 'assets'), join(out, 'assets'), { recursive: true });
writeFileSync(join(out, 'build.html'), readFileSync(src, 'utf8').replace(/"cs\/": "[^"]*"/, '"cs/": "./lib/"'));
const brief = join(srcDir, 'BRIEF.md');
if (existsSync(brief)) writeFileSync(join(out, 'BRIEF.md'), readFileSync(brief, 'utf8'));
writeFileSync(join(out, '.gitignore'), 'out/\n');
console.log(`${out}/build.html  (from ${from ? 'examples/' + from : 'templates/site.html'})
next:  write BRIEF.md from the topic first (references/BRIEF.md), then build.html
       cd ${dir} && node ${join(skill, 'scripts/check.mjs')} build.html
       node ${join(skill, 'scripts/render.mjs')} build.html --sheet 16 --scale .5`);
