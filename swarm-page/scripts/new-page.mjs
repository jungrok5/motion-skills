// new-page.mjs — start a swarm page project: one self-contained folder (index.html, BRIEF.md, lib/).
//   node <skill>/scripts/new-page.mjs <dir> [--from <example>]      e.g. --from bee-ledger
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2), dir = a.find(x => !x.startsWith('--') && a[a.indexOf(x) - 1] !== '--from');
const from = a.includes('--from') ? a[a.indexOf('--from') + 1] : null;
if (!dir) { console.error('usage: node scripts/new-page.mjs <dir> [--from <example>]'); process.exit(2); }
const src = from ? path.join(skill, 'examples', from) : path.join(skill, 'templates');
if (!fs.existsSync(src)) { console.error('no such example: ' + from); process.exit(2); }
if (fs.existsSync(dir) && fs.readdirSync(dir).length) { console.error(dir + ' exists and is not empty'); process.exit(1); }
fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
for (const f of fs.readdirSync(path.join(skill, 'lib'))) fs.copyFileSync(path.join(skill, 'lib', f), path.join(dir, 'lib', f));
for (const f of fs.readdirSync(src)) {
  const s = path.join(src, f); if (fs.statSync(s).isDirectory()) continue;
  let t = fs.readFileSync(s, 'utf8');
  if (f.endsWith('.html')) t = t.replace(/(src|href)="(\.\.\/)+lib\//g, '$1="lib/');
  fs.writeFileSync(path.join(dir, f), t);
}
if (!fs.existsSync(path.join(dir, 'BRIEF.md'))) fs.copyFileSync(path.join(skill, 'templates', 'BRIEF.md'), path.join(dir, 'BRIEF.md'));
console.log(`made ${dir}: index.html, BRIEF.md, lib/ (${fs.readdirSync(path.join(dir, 'lib')).join(', ')})`);
console.log(`next: fill BRIEF.md, design the page, then  node ${path.relative(process.cwd(), path.join(skill, 'scripts/check.mjs'))} ${path.join(dir, 'index.html')}`);
