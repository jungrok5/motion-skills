// swarm-world · new-world.mjs — start a project: lib/ (engine, three.js, fonts), BRIEF.md, world.html, out/.
//   node <skill>/scripts/new-world.mjs my-world                        → templates/world.html (a 12 s starter, commented)
//   node <skill>/scripts/new-world.mjs my-world --from valley-line     → examples/valley-line (the source's world: fields, harbour, summit)
//   node <skill>/scripts/new-world.mjs my-world --from moon-base       → examples/moon-base (a rover on the Moon, Korean crew)
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
const dir = args.find((a, i) => !a.startsWith('--') && (fi < 0 || i !== fi + 1));
if (!dir) { console.error('usage: new-world.mjs <dir> [--from valley-line|moon-base]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'world.html'))) { console.error(`${out}/world.html exists — not overwriting`); process.exit(1); }
const srcDir = from ? join(skill, 'examples', from) : join(skill, 'templates');
const src = from ? join(srcDir, 'index.html') : join(srcDir, 'world.html');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
writeFileSync(join(out, 'world.html'), readFileSync(src, 'utf8').replace(/"sw\/": "[^"]*"/, '"sw/": "./lib/"'));
writeFileSync(join(out, 'BRIEF.md'), readFileSync(existsSync(join(srcDir, 'BRIEF.md')) ? join(srcDir, 'BRIEF.md') : join(skill, 'templates', 'BRIEF.md'), 'utf8'));
writeFileSync(join(out, '.gitignore'), 'out/\n');
console.log(`${out}/world.html  (from ${from ? 'examples/' + from : 'templates/world.html'})
next:  write BRIEF.md from the topic first (references/BRIEF.md), then world.html
       cd ${dir} && node ${join(skill, 'scripts/check.mjs')} world.html
       node ${join(skill, 'scripts/render.mjs')} world.html --sheet 12 --scale .5`);
