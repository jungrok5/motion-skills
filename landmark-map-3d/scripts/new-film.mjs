// landmark-map-3d · new-film.mjs — start a project: lib/ (engine + three.js), film.html, BRIEF.md, place.json, out/.
//   node <skill>/scripts/new-film.mjs my-film --q "Big Ben, London" --size 2000x2000   → fetches place.json, template film
//   node <skill>/scripts/new-film.mjs my-film --at 37.5759,126.9769                    → same, by coordinates
//   node <skill>/scripts/new-film.mjs my-film --from eiffel                            → a copy of the worked example (offline)
// Then: write BRIEF.md first, look at the place (place-map.mjs), fonts.mjs, and rewrite film.html for your place.
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--'));
const opt = k => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : null; };
if (!dir) { console.error('usage: new-film.mjs <dir> (--q "place" | --at lat,lon | --from eiffel) [--size 2000x2000]'); process.exit(1); }
const out = resolve(dir), from = opt('from');
if (existsSync(join(out, 'film.html'))) { console.error(`${out}/film.html exists — not overwriting`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
let html;
if (from) {
  const src = join(skill, 'examples', from);
  if (!existsSync(join(src, 'index.html'))) { console.error(`no such example: ${from}`); process.exit(1); }
  html = readFileSync(join(src, 'index.html'), 'utf8');
  for (const f of ['place.json', 'BRIEF.md']) if (existsSync(join(src, f))) cpSync(join(src, f), join(out, f));
  if (existsSync(join(src, 'fonts'))) cpSync(join(src, 'fonts'), join(out, 'fonts'), { recursive: true });
} else html = readFileSync(join(skill, 'templates', 'film.html'), 'utf8');
html = html.replace(/"three": "[^"]*three\.module\.min\.js"/, '"three": "./lib/three.module.min.js"').replace(/"lm\/": "[^"]*"/, '"lm/": "./lib/"');
writeFileSync(join(out, 'film.html'), html);
if (!existsSync(join(out, 'BRIEF.md'))) cpSync(join(skill, 'templates', 'BRIEF.md'), join(out, 'BRIEF.md'));
writeFileSync(join(out, '.gitignore'), 'out/\ndata/\n');
if (!from && (opt('q') || opt('at'))) {
  const a = [join(skill, 'scripts', 'fetch-place.mjs'), ...(opt('q') ? ['--q', opt('q')] : ['--at', opt('at')]), '--size', opt('size') || '2000x2000', '--out', join(out, 'place.json'), '--cache', join(out, 'data')];
  if (opt('name')) a.push('--name', opt('name'));
  execFileSync('node', a, { stdio: 'inherit' });
} else if (!from) console.log('no place yet — fetch one: node ' + join(skill, 'scripts/fetch-place.mjs') + ` --q "…" --out ${dir}/place.json`);
console.log(`${out}/film.html  (from ${from ? 'examples/' + from : 'templates/film.html'})
next:  write ${dir}/BRIEF.md · node ${join(skill, 'scripts/place-map.mjs')} ${dir}/place.json · node ${join(skill, 'scripts/fonts.mjs')} ${dir}/film.html
       node ${join(skill, 'scripts/render.mjs')} ${dir}/film.html --stills 1,6,12 --scale .5`);
