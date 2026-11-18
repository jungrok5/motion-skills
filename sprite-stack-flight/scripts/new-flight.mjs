// sprite-stack-flight · new-flight.mjs — start a project: the engine, the kit, a flight page and a brief to fill.
//   node <skill>/scripts/new-flight.mjs my-flight                        → my-flight/index.html, BRIEF.md, lib/, out/
//   node <skill>/scripts/new-flight.mjs my-flight --from canyon-biplane  (start from a bundled example instead)
// Then, inside the project: node <skill>/scripts/render.mjs index.html --q map=1 --stills 0 --scale 2
import { cpSync, mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--from');
const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : null;
if (!dir) { console.error('usage: new-flight.mjs <dir> [--from <example>]'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'index.html'))) { console.error(`${out}/index.html already exists`); process.exit(1); }
mkdirSync(join(out, 'out'), { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
let html, brief = readFileSync(join(skill, 'templates', 'BRIEF.md'), 'utf8');
if (from) {
  const src = join(skill, 'examples', from);
  if (!existsSync(join(src, 'index.html'))) { console.error(`no example ${from}`); process.exit(1); }
  html = readFileSync(join(src, 'index.html'), 'utf8').replaceAll('src="../../lib/', 'src="lib/');
  if (existsSync(join(src, 'BRIEF.md'))) brief = readFileSync(join(src, 'BRIEF.md'), 'utf8');
} else html = readFileSync(join(skill, 'templates', 'flight.html'), 'utf8');
writeFileSync(join(out, 'index.html'), html);
if (!existsSync(join(out, 'BRIEF.md'))) writeFileSync(join(out, 'BRIEF.md'), brief);
if (!existsSync(join(out, '.gitignore'))) writeFileSync(join(out, '.gitignore'), 'out/\nref/\n');
console.log(`${out}/index.html + BRIEF.md  (lib/ copied${from ? `, from examples/${from}` : ''})`);
