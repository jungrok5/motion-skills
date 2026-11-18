// wet-ink-page · new-page.mjs — start a project: one self-contained folder (index.html + lib/ + BRIEF.md).
//   node <skill>/scripts/new-page.mjs my-page                (from templates/: the poetry broadside, commented)
//   node <skill>/scripts/new-page.mjs my-page --from tea-room (from examples/tea-room)
import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--') && a !== args[args.indexOf('--from') + 1] || args.indexOf('--from') < 0 && !a.startsWith('--'));
const fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
if (!dir) { console.error('usage: new-page.mjs <dir> [--from tea-room]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'index.html'))) { console.error(`${out}/index.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(out, { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
for (const f of readdirSync(src)) if (/\.(js|md|html|css)$/.test(f)) writeFileSync(join(out, f), readFileSync(join(src, f), 'utf8').replace(/(["'])(?:\.\.\/)+lib\//g, '$1lib/'));
writeFileSync(join(out, '.gitignore'), 'out/\n');
console.log(`${out}/index.html  (from ${from ? 'examples/' + from : 'templates/'})
next: fill BRIEF.md from the topic, redesign index.html, then
  node ${join(skill, 'scripts/check.mjs')} ${join(dir, 'index.html')}`);
