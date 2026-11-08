// perspective-illusion · new-scene.mjs — start a project: lib/, scene.html, BRIEF.md, out/.
//   node <skill>/scripts/new-scene.mjs my-loop                          → from templates/ (Corner Street, a day street)
//   node <skill>/scripts/new-scene.mjs my-loop --from country-platform  → from examples/country-platform/
// Write BRIEF.md from the user's topic first (references/BRIEF.md), then replace the scene section of scene.html
// (layout → buildings → street → swap objects → detail) and keep the engine parts (look, shots, keys, start).
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
const dir = args.find((a, i) => !a.startsWith('--') && !(fi > -1 && i === fi + 1));
if (!dir) { console.error('usage: new-scene.mjs <dir> [--from country-platform]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'scene.html'))) { console.error(`${out}/scene.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from} (examples: ${readdirSync(join(skill, 'examples')).join(', ')})`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
// the page imports the engine through an import map: point it at the project's own copy
const fix = (s) => s.replace(/"three": "[^"]*"/, '"three": "./lib/three.module.min.js"').replace(/"illusion\/": "[^"]*"/, '"illusion/": "./lib/"');
for (const f of readdirSync(src)) {
  const p = join(src, f);
  if (statSync(p).isDirectory()) { if (f !== 'out') cpSync(p, join(out, f), { recursive: true }); continue; }
  const name = f === 'index.html' ? 'scene.html' : f;
  writeFileSync(join(out, name), f.endsWith('.html') ? fix(readFileSync(p, 'utf8')) : readFileSync(p));
}
if (!existsSync(join(out, 'BRIEF.md'))) cpSync(join(skill, 'templates', 'BRIEF.md'), join(out, 'BRIEF.md'));
writeFileSync(join(out, '.gitignore'), 'out/\n');
const s = join(skill, 'scripts');
console.log(`${out}/scene.html  (from ${from ? 'examples/' + from : 'templates/'})
next:  cd ${dir}
       node ${join(s, 'check.mjs')} scene.html
       node ${join(s, 'render.mjs')} scene.html --sheet --scale .4`);
