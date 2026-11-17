// new-page.mjs — start a shatter page project: one self-contained folder (index.html + BRIEF.md + lib/).
//   node <skill>/scripts/new-page.mjs <dir> [--from plate-for-luck]
// Copies the skill's lib/ into <dir>/lib and the template (or a worked example) into <dir>, rewriting the script paths
// to lib/…, so the folder works on its own (file://, any static server, a Claude artifact). Refuses to overwrite.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2), dir = a.find(x => !x.startsWith('--')), fi = a.indexOf('--from'), from = fi >= 0 ? a[fi + 1] : null;
if (!dir) { console.error('usage: node new-page.mjs <dir> [--from <example>]  examples: ' + readdirSync(join(skill, 'examples')).join(', ')); process.exit(2); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error('no such example: ' + from); process.exit(2); }
const out = resolve(dir);
if (existsSync(join(out, 'index.html'))) { console.error(out + '/index.html exists; not overwriting'); process.exit(1); }
mkdirSync(out, { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
for (const f of readdirSync(src)) {
  if (f === 'index.html') writeFileSync(join(out, f), readFileSync(join(src, f), 'utf8').replace(/(["'])(?:\.\.\/)+lib\//g, '$1lib/'));
  else cpSync(join(src, f), join(out, f), { recursive: true });
}
console.log(`made ${out}: index.html, BRIEF.md, lib/ (${readdirSync(join(out, 'lib')).join(', ')})`);
console.log(`next: fill BRIEF.md (references/BRIEF.md), design the page, then\n  node ${join(skill, 'scripts/check.mjs')} ${join(out, 'index.html')}`);
