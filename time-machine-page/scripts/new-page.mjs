// new-page.mjs — start a time-machine project: one self-contained folder (index.html, BRIEF.md, lib/).
//   node <skill>/scripts/new-page.mjs <dir> [--from <example>]
// Copies the skill's lib/ into <dir>/lib and the template (or examples/<example>/) into <dir>, rewriting the script paths
// to lib/…, so the folder works on its own (file://, a static host, a Claude artifact). Refuses to overwrite a page.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dir = args.find(a => !a.startsWith('--'));
const fi = args.indexOf('--from'), from = fi >= 0 ? args[fi + 1] : null;
if (!dir) { console.error('usage: node scripts/new-page.mjs <dir> [--from <example>]   examples: ' + readdirSync(join(skill, 'examples')).join(', ')); process.exit(2); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(join(src, 'index.html'))) { console.error('no such example: ' + from); process.exit(2); }
const out = resolve(dir);
if (existsSync(join(out, 'index.html'))) { console.error(out + '/index.html exists; not overwriting'); process.exit(1); }
mkdirSync(out, { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
const html = readFileSync(join(src, 'index.html'), 'utf8').replace(/(src=")(?:\.\.\/)+lib\//g, '$1lib/');
writeFileSync(join(out, 'index.html'), html);
const brief = join(src, 'BRIEF.md');
if (existsSync(brief)) writeFileSync(join(out, 'BRIEF.md'), readFileSync(brief, 'utf8'));
console.log(`made ${out}\n  index.html  (from ${from ? 'examples/' + from : 'templates'})\n  BRIEF.md\n  lib/        hic.js, passes.js, time-machine.js\nnext: fill BRIEF.md for your topic, redesign index.html, then\n  node ${join(skill, 'scripts/check.mjs')} ${join(out, 'index.html')}`);
