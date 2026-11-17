// liquid-glass-page · new-page.mjs — start a project: one self-contained folder with lib/, index.html and BRIEF.md.
//   node <skill>/scripts/new-page.mjs my-page                     (the template: a reading card in the rain)
//   node <skill>/scripts/new-page.mjs my-page --from honey-tasting (a worked example as the starting point)
// Paths to ../lib/ or ../../lib/ are rewritten to ./lib/, so the folder works from file:// and as a Claude artifact.
import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--')), fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
if (!dir) { console.error('usage: new-page.mjs <dir> [--from honey-tasting]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'index.html'))) { console.error(`${out}/index.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from} (have: ${readdirSync(join(skill, 'examples')).join(', ')})`); process.exit(1); }
mkdirSync(out, { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
const fix = s => s.replace(/(["'])(?:\.\.\/)+lib\//g, '$1./lib/');
for (const f of readdirSync(src)) {
  const p = join(src, f); if (statSync(p).isDirectory()) { cpSync(p, join(out, f), { recursive: true }); continue; }
  if (/\.(js|md|html|css|json)$/.test(f)) writeFileSync(join(out, f), fix(readFileSync(p, 'utf8')));
}
writeFileSync(join(out, '.gitignore'), 'out/\n');
console.log(`${join(out, 'index.html')}  (from ${from ? 'examples/' + from : 'templates/'})
next: write BRIEF.md from the topic (references/BRIEF.md), redesign the page, the liquid, the weather and the light, then
  node ${join(skill, 'scripts/check.mjs')} ${join(dir, 'index.html')}
  node ${join(skill, 'scripts/still.mjs')} ${join(dir, 'index.html')} --out ${join(dir, 'out')} --at 2 --act drag`);
