// storybook-portrait · new-portrait.mjs — start a portrait project with its own copy of lib/.
//   node <skill>/scripts/new-portrait.mjs my-portrait                    the starter (templates/: BRIEF.md, character.js, piece.html)
//   node <skill>/scripts/new-portrait.mjs my-portrait --from beekeeper   start from a worked example instead
// The starter is one example of the style, not a menu: write BRIEF.md for your topic first, then redesign character.js.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dest = args.find(a => !a.startsWith('--'));
const fromI = args.indexOf('--from'), from = fromI > -1 ? args[fromI + 1] : null;
if (!dest) { console.error('usage: new-portrait.mjs <folder> [--from <example>]'); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from} (have: ${readdirSync(join(skill, 'examples')).join(', ')})`); process.exit(1); }
const out = resolve(dest);
if (existsSync(out) && readdirSync(out).length) { console.error(`${out} is not empty`); process.exit(1); }
mkdirSync(out, { recursive: true });
for (const f of readdirSync(src)) if (f !== 'lib' && f !== 'out') cpSync(join(src, f), join(out, f), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
// the page in the skill imports ../lib/ or ../../lib/; in the project, lib/ sits beside it
const page = join(out, 'piece.html');
if (existsSync(page)) writeFileSync(page, readFileSync(page, 'utf8').replace(/"sp\/": "(\.\.\/)+lib\/"/, '"sp/": "./lib/"'));
const ch = join(out, 'character.js');
if (existsSync(ch)) writeFileSync(ch, readFileSync(ch, 'utf8').replace(/(['"])(\.\.\/)+lib\//g, '$1./lib/'));
console.log(`${out}
  BRIEF.md       write this first: topic → who → design → motion → review (references/BRIEF.md)
  character.js   design (data) + extras (props drawn in the same media) + motion (beats)
  piece.html     open through a local server: python3 -m http.server, then /piece.html  (?cast for the cast sheet)
next: node ${join(skill, 'scripts/check.mjs')} ${join(dest, 'piece.html')}`);
