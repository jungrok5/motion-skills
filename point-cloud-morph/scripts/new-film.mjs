// point-cloud-morph · new-film.mjs — start a project: lib/, film.html, BRIEF.md, out/.
//   node <skill>/scripts/new-film.mjs my-film                         → from templates/ (Ridgeline, a wind farm studio)
//   node <skill>/scripts/new-film.mjs my-film --from deep-survey      → from examples/deep-survey/
// Write BRIEF.md from the user's topic first (references/BRIEF.md), then replace the forms, shots and copy in film.html
// with the topic's own; keep the engine calls (new Cloud → F.form → F.shot → F.check → F.start).
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
const dir = args.find((a, i) => !a.startsWith('--') && !(fi > -1 && i === fi + 1));
if (!dir) { console.error('usage: new-film.mjs <dir> [--from deep-survey]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'film.html'))) { console.error(`${out}/film.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from} (examples: ${readdirSync(join(skill, 'examples')).join(', ')})`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
const fix = (s) => s.replace(/"three": "[^"]*"/, '"three": "./lib/three.module.min.js"').replace(/"pcm\/": "[^"]*"/, '"pcm/": "./lib/"');
for (const f of readdirSync(src)) {
  const p = join(src, f);
  if (statSync(p).isDirectory()) { if (f !== 'out') cpSync(p, join(out, f), { recursive: true }); continue; }
  const name = f === 'index.html' ? 'film.html' : f;
  writeFileSync(join(out, name), f.endsWith('.html') ? fix(readFileSync(p, 'utf8')) : readFileSync(p));
}
if (!existsSync(join(out, 'BRIEF.md'))) cpSync(join(skill, 'templates', 'BRIEF.md'), join(out, 'BRIEF.md'));
writeFileSync(join(out, '.gitignore'), 'out/\n');
const s = join(skill, 'scripts');
console.log(`${out}/film.html  (from ${from ? 'examples/' + from : 'templates/'})
next:  cd ${dir}
       node ${join(s, 'check.mjs')} film.html
       node ${join(s, 'render.mjs')} film.html --forms --scale .5
       node ${join(s, 'render.mjs')} film.html --sheet --scale .5`);
