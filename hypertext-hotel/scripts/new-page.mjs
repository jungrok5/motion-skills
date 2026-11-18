// new-page.mjs — start a hypertext-hotel project: one self-contained folder (index.html, BRIEF.md, lib/).
//   node scripts/new-page.mjs <dir>                        the template (a townhouse: the house example of the style)
//   node scripts/new-page.mjs <dir> --from night-bakery    a copy of an example to change
// Then: fill BRIEF.md for your topic, redesign index.html (building, rooms, props, controls and their CSS, palette,
// sounds), and run  node <skill>/scripts/check.mjs <dir>/index.html  and  node <skill>/scripts/still.mjs <dir>/index.html --out <dir>/out
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args[0];
const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : null;
if (!dir || dir.startsWith('--')) { console.error('usage: node scripts/new-page.mjs <dir> [--from <example>]'); process.exit(2); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error('no such example: ' + from + ' (have: ' + readdirSync(join(skill, 'examples')).join(', ') + ')'); process.exit(2); }
if (existsSync(join(dir, 'index.html'))) { console.error(dir + '/index.html exists; not overwriting'); process.exit(1); }
mkdirSync(dir, { recursive: true });
cpSync(join(skill, 'lib'), join(dir, 'lib'), { recursive: true });
for (const f of readdirSync(src)) {
  if (f === 'out') continue;
  const p = join(src, f);
  if (f.endsWith('.html')) writeFileSync(join(dir, f), readFileSync(p, 'utf8').replace(/(["'])(?:\.\.\/)+lib\//g, '$1lib/'));
  else cpSync(p, join(dir, f), { recursive: true });
}
console.log(`made ${dir}: index.html, BRIEF.md, lib/ (from ${from ? 'examples/' + from : 'templates'})`);
console.log(`next: fill ${join(dir, 'BRIEF.md')} for your topic, then redesign index.html and run check.mjs and still.mjs`);
