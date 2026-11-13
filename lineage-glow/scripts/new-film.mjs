// lineage-glow · new-film.mjs — start a film project: copies the template (or an example) and the skill's lib/.
//   node <skill>/scripts/new-film.mjs my-film                         → my-film/{BRIEF.md, film.html, score.js, lib/}
//   node <skill>/scripts/new-film.mjs my-film --from jesus-genealogy    (start from the worked example instead)
// Then: write BRIEF.md for YOUR topic first (references/BRIEF.md) and redesign the beats — the template is an example.
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2), dest = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--from');
const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : null;
if (!dest) { console.error('usage: new-film.mjs <dir> [--from <example>]'); process.exit(1); }
const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..'), out = resolve(dest);
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from} (have: ${readdirSync(join(skill, 'examples')).join(', ')})`); process.exit(1); }
if (existsSync(out) && readdirSync(out).length) { console.error(`${out} is not empty`); process.exit(1); }
mkdirSync(out, { recursive: true });
for (const f of readdirSync(src)) if (f !== 'lib' && f !== 'out') cpSync(join(src, f), join(out, f), { recursive: true });
if (existsSync(join(out, 'index.html')) && !existsSync(join(out, 'film.html'))) renameSync(join(out, 'index.html'), join(out, 'film.html'));
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
// the page now finds the engine beside it
const page = join(out, 'film.html'); writeFileSync(page, readFileSync(page, 'utf8').replace(/"lg\/": "[^"]*"/, '"lg/": "./lib/"'));
console.log(`${out}\n  BRIEF.md   write this first — topic → beats (see ${join(skill, 'references', 'BRIEF.md')})\n  film.html  the film (serve the folder to watch live: python3 -m http.server)\n  score.js   the score\n  lib/       the engine (extend in the project; leave the skill's copy alone)\nnext: node ${join(skill, 'scripts', 'check.mjs')} ${join(dest, 'film.html')}`);
