// principle-pass · new-piece.mjs — start a piece with its own copy of lib/.
//   node <skill>/scripts/new-piece.mjs my-piece                       the starter (templates/: BRIEF.md, piece.js, index.html)
//   node <skill>/scripts/new-piece.mjs my-piece --from penguin-slide  start from the worked example instead
// The starter is one example of the style, not a menu: write BRIEF.md for your topic first, then design the creature,
// its story keys and its pass for it.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), fromI = args.indexOf('--from'), from = fromI > -1 ? args[fromI + 1] : null;
const dest = args.find((a, i) => !a.startsWith('--') && (fromI < 0 || i !== fromI + 1));
if (!dest) { console.error('usage: new-piece.mjs <folder> [--from <example>]'); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from} (have: ${readdirSync(join(skill, 'examples')).join(', ')})`); process.exit(1); }
const out = resolve(dest);
if (existsSync(out) && readdirSync(out).length) { console.error(`${out} is not empty`); process.exit(1); }
mkdirSync(out, { recursive: true });
for (const f of readdirSync(src)) if (f !== 'lib' && f !== 'out') cpSync(join(src, f), join(out, f), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
for (const f of readdirSync(out).filter(f => f.endsWith('.html'))) { const p = join(out, f); writeFileSync(p, readFileSync(p, 'utf8').replace(/"pp\/": "(\.\.\/)+lib\/"/, '"pp/": "./lib/"')); }
console.log(`${out}
  BRIEF.md     write this first: topic → creature → beats (story keys) → the pass → review
  piece.js     the creature, the story keys, the pass keys, plants, follow, life, study
  index.html   open through a local server (python3 -m http.server), ?cast for the cast sheet
next: node ${join(skill, 'scripts/check.mjs')} ${join(dest, 'index.html')}`);
