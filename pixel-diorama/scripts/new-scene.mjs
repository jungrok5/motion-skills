// pixel-diorama · new-scene.mjs — start a project: the engine, the kit and a scene page to build on.
//   node <skill>/scripts/new-scene.mjs my-cover               → my-cover/scene.html, my-cover/lib/, my-cover/out/
//   node <skill>/scripts/new-scene.mjs my-cover --from halloween-rain   (start from a bundled example instead of the template)
// Then, inside the project: node <skill>/scripts/render.mjs scene.html --stills 0,10 --scale 2
import { cpSync, mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--'));
const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : null;
if (!dir) { console.error('usage: new-scene.mjs <dir> [--from <example>]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'scene.html'))) { console.error(`${out}/scene.html already exists`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
let html;
if (from) {
  const src = join(skill, 'examples', from, 'index.html');
  if (!existsSync(src)) { console.error(`no example ${from}`); process.exit(1); }
  html = readFileSync(src, 'utf8').replaceAll('src="../../lib/', 'src="lib/');
} else html = readFileSync(join(skill, 'templates', 'scene.html'), 'utf8');
writeFileSync(join(out, 'scene.html'), html);
if (!existsSync(join(out, '.gitignore'))) writeFileSync(join(out, '.gitignore'), 'out/\n');
console.log(`${out}/scene.html  (lib/ copied${from ? `, from examples/${from}` : ''})`);
