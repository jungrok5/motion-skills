// new-page.mjs — start an event-horizon-page project: one self-contained folder (index.html + BRIEF.md + lib/).
//   node scripts/new-page.mjs <dir> [--from <example>]        e.g. node scripts/new-page.mjs ../my-event-horizon --from pulsar-tour
// Copies lib/ and templates/ (or examples/<example>/) and rewrites the page's ../lib/ or ../../lib/ paths to lib/.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2);
const fi = a.indexOf('--from'), from = fi >= 0 ? a[fi + 1] : null;
const dir = a.find((x, i) => !x.startsWith('--') && (fi < 0 || i !== fi + 1));
if (!dir) { console.log('usage: node scripts/new-page.mjs <dir> [--from <example>]'); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error('no such example: ' + from + ' (have: ' + readdirSync(join(skill, 'examples')).join(', ') + ')'); process.exit(1); }
const out = resolve(dir);
if (existsSync(join(out, 'index.html'))) { console.error(out + '/index.html exists; not overwriting'); process.exit(1); }
mkdirSync(out, { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
for (const f of readdirSync(src)) cpSync(join(src, f), join(out, f), { recursive: true });
const p = join(out, 'index.html');
writeFileSync(p, readFileSync(p, 'utf8').replace(/(["'])(?:\.\.\/)+lib\//g, '$1lib/'));
console.log(`made ${out}\n  index.html  BRIEF.md  lib/\nnext: fill BRIEF.md, then edit index.html, then\n  node ${join(skill, 'scripts/check.mjs')} ${p}`);
