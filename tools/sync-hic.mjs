// Copies the shared HTML-in-Canvas runtime into every live-page skill, so each skill folder works on its own.
//   node tools/sync-hic.mjs           copy                    node tools/sync-hic.mjs --check   exit 1 if a copy differs
// Masters → copies (a skill is a live-page skill when its SKILL.md says `hic: true` in the frontmatter):
//   tools/hic/hic.js               → <skill>/lib/hic.js
//   tools/hic/hic-test.mjs         → <skill>/scripts/hic-test.mjs
//   references/HTML-IN-CANVAS.md   → <skill>/references/HIC.md
//   tools/hic/hic.js               → docs/<skill>/demo/lib/hic.js (the samples page's live demo), when it exists
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAP = [['tools/hic/hic.js', 'lib/hic.js'], ['tools/hic/hic-test.mjs', 'scripts/hic-test.mjs'], ['references/HTML-IN-CANVAS.md', 'references/HIC.md']];
const check = process.argv.includes('--check');
const skills = fs.readdirSync(root).filter(d => {
  const f = path.join(root, d, 'SKILL.md');
  return fs.existsSync(f) && /^---[\s\S]*?\nhic:\s*true\s*\n[\s\S]*?---/.test(fs.readFileSync(f, 'utf8'));
});
let bad = 0, wrote = 0;
const jobs = [];
for (const s of skills) {
  for (const [from, to] of MAP) jobs.push([s, from, path.join(s, to)]);
  if (fs.existsSync(path.join(root, 'docs', s, 'demo', 'lib'))) jobs.push([s, 'tools/hic/hic.js', path.join('docs', s, 'demo', 'lib', 'hic.js')]);
}
for (const [s, from, to] of jobs) {
  const src = fs.readFileSync(path.join(root, from), 'utf8'), dst = path.join(root, to);
  const cur = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf8') : null;
  if (cur === src) continue;
  if (check) { bad++; console.error(`${to} differs from ${from}: run node tools/sync-hic.mjs`); continue; }
  fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, src); wrote++;
}
if (check) { if (bad) process.exit(1); console.log(`ok: ${skills.length} live-page skills carry the current runtime`); }
else console.log(`${skills.length} live-page skills · ${wrote} file(s) written`);
