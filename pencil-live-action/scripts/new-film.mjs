// pencil-live-action · new-film.mjs — start a film project: the skill's lib/, the template (or an example), out/.
//   node <skill>/scripts/new-film.mjs my-film                → my-film/{film.html, cast.html, cast.js, props.js, score.js, BRIEF.md, assets.json, lib/}
//   node <skill>/scripts/new-film.mjs my-film --from kite    → the worked example instead (examples/kite)
// Then: node <skill>/scripts/fetch-assets.mjs my-film   (the scans; or open the pages with ?cdn=1) and serve my-film/.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
const dest = resolve(args.find(a => !a.startsWith('--')) || ''), fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
if (!args.length || !dest) { console.error('usage: new-film.mjs <dir> [--from kite]'); process.exit(1); }
if (existsSync(dest) && readdirSync(dest).length) { console.error(`${dest} is not empty`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(join(dest, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(dest, 'lib'), { recursive: true });
for (const f of readdirSync(src)) {
  if (f === 'assets' || f === 'out' || statSync(join(src, f)).isDirectory()) continue;
  const to = join(dest, f === 'index.html' ? 'film.html' : f);
  if (/\.html$/.test(f)) writeFileSync(to, readFileSync(join(src, f), 'utf8').replaceAll('../../lib/', './lib/'));
  else cpSync(join(src, f), to);
}
writeFileSync(join(dest, '.gitignore'), 'assets/\nout/\n');
console.log(`${dest}\n  film.html · cast.html · cast.js · props.js · score.js · assets.json${existsSync(join(dest, 'BRIEF.md')) ? ' · BRIEF.md' : ''} · lib/\nnext: node ${join(skill, 'scripts', 'fetch-assets.mjs')} ${dest}   (or open the pages with ?cdn=1)`);
