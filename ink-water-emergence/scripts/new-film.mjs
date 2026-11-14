// ink-water-emergence · new-film.mjs — start a film project: copies the skill's lib/ and a starting film into a folder
// and points the page's import map at the local copy, so the project runs on its own (no network, no npm install).
//   node <skill>/scripts/new-film.mjs my-film                 (from the starter: a quadruped, 7 shots)
//   node <skill>/scripts/new-film.mjs my-film --from whale    (from examples/whale: a swimmer, open water)
// Then: write BRIEF.md (references/BRIEF.md) BEFORE touching the shots; the starter's cast and shots are an example of
// the style, to be redesigned for the topic.
import { cpSync, existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const dest = args.find(a => !a.startsWith('--') && a !== opt('from'));
if (!dest) { console.error('usage: new-film.mjs <dir> [--from whale]'); process.exit(1); }
const skill = join(dirname(fileURLToPath(import.meta.url)), '..'), from = opt('from');
const src = from ? join(skill, 'examples', from) : join(skill, 'starter');
if (!existsSync(src)) { console.error('no such example: ' + src); process.exit(1); }
const D = resolve(dest);
if (existsSync(D) && readdirSync(D).length) { console.error(dest + ' is not empty'); process.exit(1); }
mkdirSync(D, { recursive: true });
cpSync(src, D, { recursive: true });
cpSync(join(skill, 'lib'), join(D, 'lib'), { recursive: true });
for (const f of readdirSync(D).filter(f => f.endsWith('.html')))
  writeFileSync(join(D, f), readFileSync(join(D, f), 'utf8').replace(/"inkwater\/"\s*:\s*"[^"]+"/, '"inkwater/": "./lib/"'));
console.log(`${dest}/ ready (from ${from ? 'examples/' + from : 'starter'}). Next: write ${dest}/BRIEF.md, render cast.html, then the shots.
  node ${join(skill, 'scripts/render.mjs')} ${dest}/cast.html --stills 0
  node ${join(skill, 'scripts/check.mjs')} ${dest}`);
