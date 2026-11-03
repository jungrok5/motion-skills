// knit-diorama · new-scene.mjs — start a project: lib/ (engine + kit + three.js), scene.html, out/.
//   node <skill>/scripts/new-scene.mjs my-scene                 → from templates/scene.html
//   node <skill>/scripts/new-scene.mjs my-scene --from harbour  → from examples/harbour/index.html
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--'));
const fi = args.indexOf('--from'), from = fi > -1 ? args[fi + 1] : null;
if (!dir) { console.error('usage: new-scene.mjs <dir> [--from harbour]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'scene.html'))) { console.error(`${out}/scene.html exists — not overwriting`); process.exit(1); }
const src = from ? join(skill, 'examples', from, 'index.html') : join(skill, 'templates', 'scene.html');
if (!existsSync(src)) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
// point the import map at the project's own lib/
const html = readFileSync(src, 'utf8').replace(/"three": "[^"]*three\.module\.min\.js"/, '"three": "./lib/three.module.min.js"').replace(/"knit\/": "[^"]*"/, '"knit/": "./lib/"');
writeFileSync(join(out, 'scene.html'), html);
writeFileSync(join(out, '.gitignore'), 'out/\n');
console.log(`${out}/scene.html  (from ${from ? 'examples/' + from : 'templates/scene.html'})
next:  cd ${dir} && node ${join(skill, 'scripts/render.mjs')} scene.html --stills 1,6,10 --scale .5`);
