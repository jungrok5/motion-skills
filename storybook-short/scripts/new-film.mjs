// storybook-short · new-film.mjs — start a film project with its own copy of lib/.
//   node <skill>/scripts/new-film.mjs my-film                    the starter (templates/: BRIEF.md, cast.js, film.js, index.html)
//   node <skill>/scripts/new-film.mjs my-film --from market-day start from a worked example instead
// The starter is one example of the style, not a menu: write BRIEF.md for your topic first, then design the cast and shots.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dest = args.find(a => !a.startsWith('--'));
const fromI = args.indexOf('--from'), from = fromI > -1 ? args[fromI + 1] : null;
if (!dest) { console.error('usage: new-film.mjs <folder> [--from <example>]'); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from} (have: ${readdirSync(join(skill, 'examples')).join(', ')})`); process.exit(1); }
const out = resolve(dest);
if (existsSync(out) && readdirSync(out).length) { console.error(`${out} is not empty`); process.exit(1); }
mkdirSync(out, { recursive: true });
for (const f of readdirSync(src)) if (f !== 'lib' && f !== 'out') cpSync(join(src, f), join(out, f), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
// the skill's pages import ../lib/ or ../../lib/; in the project, lib/ sits beside them
for (const f of readdirSync(out).filter(f => /\.(html|js)$/.test(f))) {
  const p = join(out, f); writeFileSync(p, readFileSync(p, 'utf8').replace(/"ss\/": "(\.\.\/)+lib\/"/, '"ss/": "./lib/"').replace(/(['"])(\.\.\/)+lib\//g, '$1./lib/'));
}
console.log(`${out}
  BRIEF.md     write this first: topic → cast → shots → motion → sound → review (references/BRIEF.md)
  cast.js      the characters (head design + body), built at the sizes the shots need
  film.js      the shots: plates, camera, cast poses, effects, sound; the score
  index.html   open through a local server: python3 -m http.server, then /index.html  (?cast for the cast sheet)
next: node ${join(skill, 'scripts/check.mjs')} ${join(dest, 'index.html')}`);
