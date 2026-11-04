// aesthetics-film · new-film.mjs — start a project: lib/, film.html, score.js, BRIEF.md, fonts/, out/.
//   node <skill>/scripts/new-film.mjs my-film                        → from templates/ (a 2-chapter, ~30 s starting film)
//   node <skill>/scripts/new-film.mjs my-film --from korean-beauty   → from examples/korean-beauty/ (the worked example)
// Write BRIEF.md from the user's topic first (references/BRIEF.md), then the essay, the sets, the shots.
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--from');
const fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
if (!dir) { console.error('usage: new-film.mjs <dir> [--from korean-beauty]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'film.html'))) { console.error(`${out}/film.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
// the page imports the engine through an import map: point it at the project's own copy
const fix = (s) => s.replace(/"three": "[^"]*"/, '"three": "./lib/three.module.min.js"').replace(/"essay\/": "[^"]*"/, '"essay/": "./lib/"');
for (const f of readdirSync(src)) {
  const p = join(src, f);
  if (statSync(p).isDirectory()) { if (f !== 'out') cpSync(p, join(out, f), { recursive: true }); continue; }
  const name = f === 'index.html' ? 'film.html' : f;
  writeFileSync(join(out, name), f.endsWith('.html') ? fix(readFileSync(p, 'utf8')) : readFileSync(p));
}
writeFileSync(join(out, '.gitignore'), 'out/\n');
console.log(`${out}/film.html  (from ${from ? 'examples/' + from : 'templates/'})
next:  cd ${dir} && node ${join(skill, 'scripts/check.mjs')} film.html && node ${join(skill, 'scripts/render.mjs')} film.html --sheet 12 --scale .4`);
