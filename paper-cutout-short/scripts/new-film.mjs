// paper-cutout-short · new-film.mjs — start a project: lib/, BRIEF.md, cast.js + cast.html, film.html + score.js, out/.
//   node <skill>/scripts/new-film.mjs my-film                        → from templates/ (8 s, 2 shots, one puppet + a prop)
//   node <skill>/scripts/new-film.mjs my-film --from lamplighter     → from examples/lamplighter/ (20.2 s, 3 shots)
//   node <skill>/scripts/new-film.mjs my-film --from parts-route     → the image route: a parts sheet, cut parts, a rig from them
// BRIEF.md comes along: rewrite it from the user's topic first (references/BRIEF.md), then the cast, then the shots.
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--from');
const fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
if (!dir) { console.error('usage: new-film.mjs <dir> [--from lamplighter | parts-route]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'film.html'))) { console.error(`${out}/film.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from} (have: ${readdirSync(join(skill, 'examples')).join(', ')})`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
// every page and module points at the project's own lib/
const fix = s => s.replace(/"pcs\/": "[^"]*"/, '"pcs/": "./lib/"').replace(/(['"])(?:\.\.\/)+lib\//g, '$1./lib/').replace(/(['"])\.\.\/lamplighter\//g, '$1./');
for (const f of readdirSync(src)) {
  const p = join(src, f);
  if (f === 'out') continue;
  if (statSync(p).isDirectory()) { cpSync(p, join(out, f), { recursive: true }); continue; }     // parts/, sheets/
  const name = f === 'index.html' ? 'film.html' : f;
  if (/\.(html|js|md)$/.test(f)) writeFileSync(join(out, name), fix(readFileSync(p, 'utf8')));
  else cpSync(p, join(out, name));                                                                    // sheet.png …
}
if (from === 'parts-route') cpSync(join(skill, 'examples', 'lamplighter', 'cast.js'), join(out, 'cast.js'));   // make-sheet.html draws from it
if (!existsSync(join(out, 'BRIEF.md'))) cpSync(join(skill, 'templates', 'BRIEF.md'), join(out, 'BRIEF.md'));
if (from === 'parts-route') writeFileSync(join(out, 'cast.js'), fix(readFileSync(join(out, 'cast.js'), 'utf8')));
writeFileSync(join(out, '.gitignore'), 'out/\n');
console.log(`${out}/film.html  (from ${from ? 'examples/' + from : 'templates/'})
next:  write BRIEF.md from the topic, then  cd ${dir} && node ${join(skill, 'scripts/render.mjs')} cast.html --stills 0 --scale .5`);
