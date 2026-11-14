// speedpaint-replay · new-piece.mjs — start a piece: copies the starter (or an example) and the skill's lib/.
//   node <skill>/scripts/new-piece.mjs my-piece                        → my-piece/{BRIEF.md, piece.html, art.js, lib/}
//   node <skill>/scripts/new-piece.mjs my-piece --from rainy-window    (start from the worked example instead)
// Then: write BRIEF.md for YOUR subject first (references/BRIEF.md) and draw it — the starter is an example of the
// style, not a template to fill in.
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2), dest = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--from');
const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : null;
if (!dest) { console.error('usage: new-piece.mjs <dir> [--from <example>]'); process.exit(1); }
const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..'), out = resolve(dest);
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from} (have: ${readdirSync(join(skill, 'examples')).join(', ')})`); process.exit(1); }
if (existsSync(out) && readdirSync(out).length) { console.error(`${out} is not empty`); process.exit(1); }
mkdirSync(out, { recursive: true });
for (const f of readdirSync(src)) if (f !== 'lib' && f !== 'out') cpSync(join(src, f), join(out, f), { recursive: true });
if (existsSync(join(out, 'index.html'))) renameSync(join(out, 'index.html'), join(out, 'piece.html'));
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
// the page now finds the engine beside it
const page = join(out, 'piece.html'); writeFileSync(page, readFileSync(page, 'utf8').replace(/"sp\/": "[^"]*"/, '"sp/": "./lib/"'));
console.log(`${out}
  BRIEF.md    write this first — subject → design → stages (see ${join(skill, 'references', 'BRIEF.md')})
  art.js      the drawing, stage by stage (references/DRAWING.md)
  piece.html  the replay page (serve the folder to watch live: python3 -m http.server)
  lib/        the engine (extend in the project; leave the skill's copy alone)
next: node ${join(skill, 'scripts', 'check.mjs')} ${join(dest, 'piece.html')}`);
