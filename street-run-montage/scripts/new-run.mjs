// street-run-montage · new-run.mjs — start a project: lib/ + BRIEF.md + cast.js + cast.html + index.html + score.js + out/.
//   node <skill>/scripts/new-run.mjs my-run                    → from templates/ (a 12 s, 5-shot starting film)
//   node <skill>/scripts/new-run.mjs my-run --from ferry-bell  → from examples/ferry-bell/ (the worked example)
// Write BRIEF.md from the user's topic first (references/BRIEF.md), then the cast, then the ride and the shots.
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--'));
const fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
if (!dir) { console.error('usage: new-run.mjs <dir> [--from <example>]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'index.html'))) { console.error(`${out}/index.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
// pages import the engine through an import map: point it at the project's own copy
const fix = s => s.replace(/"three": "[^"]*"/, '"three": "./lib/three.module.min.js"').replace(/"srm\/": "[^"]*"/, '"srm/": "./lib/"');
for (const f of readdirSync(src)) {
  const p = join(src, f);
  if (statSync(p).isDirectory()) { if (f !== 'out') cpSync(p, join(out, f), { recursive: true }); continue; }
  writeFileSync(join(out, f), f.endsWith('.html') ? fix(readFileSync(p, 'utf8')) : readFileSync(p));
}
writeFileSync(join(out, '.gitignore'), 'out/\nref/\n');
console.log(`${out}/index.html  (from ${from ? 'examples/' + from : 'templates/'})
next:  cd ${dir} && node ${join(skill, 'scripts/check.mjs')} cast.html && node ${join(skill, 'scripts/render.mjs')} index.html --sheet 16 --scale .5`);
