// cartoon-3d-short · new-film.mjs — start a project: lib/, film.html, BRIEF.md, score.js, voice/, out/.
//   node <skill>/scripts/new-film.mjs my-short                       → from templates/ (a 5-shot starting film)
//   node <skill>/scripts/new-film.mjs my-short --from leaning-tower  → from examples/leaning-tower/ (the worked example)
// Write BRIEF.md from the user's topic first (references/BRIEF.md), then the voice, then the shots.
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--'));
const fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
if (!dir) { console.error('usage: new-film.mjs <dir> [--from leaning-tower]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'film.html'))) { console.error(`${out}/film.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
// the page imports the engine through an import map: point it at the project's own copy
const fix = (s) => s.replace(/"three": "[^"]*"/, '"three": "./lib/three.module.min.js"').replace(/"toon\/": "[^"]*"/, '"toon/": "./lib/"');
for (const f of readdirSync(src)) {
  const p = join(src, f);
  if (statSync(p).isDirectory()) { if (f !== 'out') cpSync(p, join(out, f), { recursive: true }); continue; }
  const name = f === 'index.html' ? 'film.html' : f;
  writeFileSync(join(out, name), f.endsWith('.html') ? fix(readFileSync(p, 'utf8')) : readFileSync(p));
}
mkdirSync(join(out, 'voice'), { recursive: true });
writeFileSync(join(out, '.gitignore'), 'out/\n');
console.log(`${out}/film.html  (from ${from ? 'examples/' + from : 'templates/'})
next:  cd ${dir} && node ${join(skill, 'scripts/check.mjs')} film.html && node ${join(skill, 'scripts/render.mjs')} film.html --sheet 16 --scale .5`);
