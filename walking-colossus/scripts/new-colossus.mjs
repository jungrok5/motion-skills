// Start a colossus project: copies the engine in (so the project runs on its own), writes colossus.js,
// a skeleton mods/body.js, the BRIEF.md form, index.html and .gitignore.
//   node <skill>/scripts/new-colossus.mjs my-colossus --title "Low Tide" [--legs 4] [--len 88] [--depth 15] [--height 19]
// --legs = legs a side. Then: write BRIEF.md, design mods/body.js, tune colossus.js, `check.mjs --events`, stills.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './_browser.mjs';

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = parseArgs();
const dir = path.resolve(a._[0] || 'my-colossus');
if (fs.existsSync(path.join(dir, 'colossus.js')) && !a.force) { console.error(`${dir} already has colossus.js (use --force to overwrite)`); process.exit(1); }
const title = a.title || path.basename(dir).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const len = +(a.len || 88), depth = +(a.depth || 15), height = +(a.height || 19), n = Math.max(2, +(a.legs || 4));
const span = len * 0.75, legx = Array.from({ length: n }, (_, i) => +(-span / 2 + span * i / (n - 1)).toFixed(1));
const hipz = +(depth / 2 + 1.7).toFixed(1), footz = +(hipz + 13.8).toFixed(1);
fs.mkdirSync(path.join(dir, 'mods'), { recursive: true });
fs.cpSync(path.join(SKILL, 'engine'), path.join(dir, 'engine'), { recursive: true });
const fill = (s) => s.replaceAll('__TITLE__', title).replaceAll('__LEN__', len).replaceAll('__DEPTH__', depth).replaceAll('__HEIGHT__', height)
  .replaceAll('__LEGX__', JSON.stringify(legx).replace(/,/g, ', ')).replaceAll('__HIPZ__', hipz).replaceAll('__FOOTZ__', footz);
fs.writeFileSync(path.join(dir, 'colossus.js'), fill(fs.readFileSync(path.join(SKILL, 'templates/colossus.js'), 'utf8')));
fs.writeFileSync(path.join(dir, 'BRIEF.md'), fill(fs.readFileSync(path.join(SKILL, 'templates/BRIEF.md'), 'utf8')));
if (!fs.existsSync(path.join(dir, 'mods/body.js')) || a.force) fs.copyFileSync(path.join(SKILL, 'templates/body.js'), path.join(dir, 'mods/body.js'));
fs.writeFileSync(path.join(dir, 'index.html'), fs.readFileSync(path.join(SKILL, 'templates/index.html'), 'utf8').replace('<title>Colossus</title>', `<title>${title}</title>`));
fs.writeFileSync(path.join(dir, '.gitignore'), 'out/\nshots/\naudio/\nref/\n');
console.log(`created ${path.relative(process.cwd(), dir) || '.'}: colossus.js, mods/body.js, BRIEF.md, index.html, engine/
next:
  cd ${path.relative(process.cwd(), dir) || '.'}
  (write BRIEF.md first)  node ${path.relative(dir, SKILL)}/scripts/check.mjs --fast --events
  node ${path.relative(dir, SKILL)}/scripts/serve.mjs          # http://127.0.0.1:5177/?shot=hero  ?free  ?t=12
  node ${path.relative(dir, SKILL)}/scripts/shot.mjs --board --n 1`);
