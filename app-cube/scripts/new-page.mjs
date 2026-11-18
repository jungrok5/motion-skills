// app-cube · new-page.mjs — start a project: a copy of lib/ and the template (or an example), paths fixed to lib/…
//   node <skill>/scripts/new-page.mjs my-cube                       (templates/: the Desk Cube + BRIEF.md to fill)
//   node <skill>/scripts/new-page.mjs my-cube --from lisbon-weekend (a worked example as the start)
import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--')), fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
if (!dir) { console.error('usage: new-page.mjs <dir> [--from lisbon-weekend]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'index.html'))) { console.error(`${out}/index.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from} (have: ${readdirSync(join(skill, 'examples')).join(', ')})`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
const fix = s => s.replace(/(["'])(?:\.\.\/)+lib\//g, '$1lib/');
for (const f of readdirSync(src)) if (/\.(js|md|html|css)$/.test(f)) writeFileSync(join(out, f), fix(readFileSync(join(src, f), 'utf8')));
writeFileSync(join(out, '.gitignore'), 'out/\n');
const rel = relative(process.cwd(), out) || '.', sk = relative(process.cwd(), skill) || '.';
console.log(`${rel}/index.html  (from ${from ? 'examples/' + from : 'templates/'})
next: fill ${rel}/BRIEF.md from the topic (${sk}/references/BRIEF.md), redesign the six faces and CONFIG, then
  node ${sk}/scripts/check.mjs ${rel}/index.html
  node ${sk}/scripts/still.mjs ${rel}/index.html --out ${rel}/out --act idle,twist,typed,back,under`);
