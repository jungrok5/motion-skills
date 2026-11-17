// lit-room · new-page.mjs — start a project: one self-contained folder with lib/ and a page to redesign.
//   node <skill>/scripts/new-page.mjs <dir>                     (from templates/: index.html + BRIEF.md)
//   node <skill>/scripts/new-page.mjs <dir> --from night-watch  (from examples/night-watch/)
// The page's ../lib/ or ../../lib/ paths become lib/, so the folder works from file://, a static server or as an artifact.
import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--from');
const fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
if (!dir) { console.error('usage: new-page.mjs <dir> [--from night-watch]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'index.html'))) { console.error(`${out}/index.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(out, { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
const fix = s => s.replace(/(["'])(?:\.\.\/)+lib\//g, '$1lib/');
for (const f of readdirSync(src)) if (/\.(html|md|js)$/.test(f)) writeFileSync(join(out, f), fix(readFileSync(join(src, f), 'utf8')));
writeFileSync(join(out, '.gitignore'), 'out/\n');
console.log(`${out}/index.html  (from ${from ? 'examples/' + from : 'templates/'})
next: fill BRIEF.md from the topic, redesign ROOM and the page, then
  node ${join(skill, 'scripts/check.mjs')} ${join(dir, 'index.html')}
  node ${join(skill, 'scripts/still.mjs')} ${join(dir, 'index.html')} --out ${join(dir, 'out')} --act "idle;close"`);
