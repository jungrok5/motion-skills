// luminous-score · new-piece.mjs — start a project: lib/, piece.html, BRIEF.md, out/.
//   node <skill>/scripts/new-piece.mjs my-piece                          → from templates/ (First Snow)
//   node <skill>/scripts/new-piece.mjs my-piece --from candle-prelude    → from examples/candle-prelude/
// Write BRIEF.md from the user's piece first (references/BRIEF.md), then replace the title, voices, notes, look and shots.
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
const dir = args.find((a, i) => !a.startsWith('--') && !(fi > -1 && i === fi + 1));
if (!dir) { console.error('usage: new-piece.mjs <dir> [--from candle-prelude]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'piece.html'))) { console.error(`${out}/piece.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from} (examples: ${readdirSync(join(skill, 'examples')).join(', ')})`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
const fix = (s) => s.replace(/"three": "[^"]*"/, '"three": "./lib/three.module.min.js"').replace(/"ls\/": "[^"]*"/, '"ls/": "./lib/"');
for (const f of readdirSync(src)) {
  const p = join(src, f);
  if (statSync(p).isDirectory()) { if (f !== 'out') cpSync(p, join(out, f), { recursive: true }); continue; }
  const name = f === 'index.html' ? 'piece.html' : f;
  writeFileSync(join(out, name), f.endsWith('.html') ? fix(readFileSync(p, 'utf8')) : readFileSync(p));
}
if (!existsSync(join(out, 'BRIEF.md'))) cpSync(join(skill, 'templates', 'BRIEF.md'), join(out, 'BRIEF.md'));
writeFileSync(join(out, '.gitignore'), 'out/\n');
const s = join(skill, 'scripts');
console.log(`${out}/piece.html  (from ${from ? 'examples/' + from : 'templates/'})
next:  cd ${dir}
       node ${join(s, 'check.mjs')} piece.html
       node ${join(s, 'render.mjs')} piece.html --sheet --scale .5`);
