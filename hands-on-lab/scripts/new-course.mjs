// Start a course project: copies the engine (lib/) and one example as a construction reference, with paths fixed.
//   node <skill>/scripts/new-course.mjs <dir> [--from circuits|simple-machines]
// Then write <dir>/BRIEF.md (references/BRIEF.md) and replace the example's lessons, parts and diagrams with the topic's own.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { args } from './_lib.mjs';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { a, flag } = args(process.argv);
const from = flag('--from', 'circuits');
const [dir] = a;
if (!dir) { console.error('usage: new-course.mjs <dir> [--from circuits|simple-machines]'); process.exit(1); }
const src = path.join(skill, 'examples', from);
if (!fs.existsSync(src)) { console.error(`no example "${from}" (have: ${fs.readdirSync(path.join(skill, 'examples')).join(', ')})`); process.exit(1); }
if (fs.existsSync(dir) && fs.readdirSync(dir).length) { console.error(`${dir} is not empty`); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });
fs.cpSync(path.join(skill, 'lib'), path.join(dir, 'lib'), { recursive: true });
for (const f of fs.readdirSync(src)) {
  let t = fs.readFileSync(path.join(src, f), 'utf8');
  if (/\.(js|html)$/.test(f)) t = t.replaceAll('../../lib/', './lib/');
  if (f === 'BRIEF.md') { fs.writeFileSync(path.join(dir, `REFERENCE-BRIEF-${from}.md`), t); continue; }
  fs.writeFileSync(path.join(dir, f), t);
}
const tmpl = fs.readFileSync(path.join(skill, 'references', 'BRIEF.md'), 'utf8').match(/```markdown\n([\s\S]*?)```/)[1];
fs.writeFileSync(path.join(dir, 'BRIEF.md'), tmpl);
fs.writeFileSync(path.join(dir, '.gitignore'), 'out/\n');
console.log(`${dir}/ ready (from ${from}).
  1. fill BRIEF.md (the example's brief is beside it as a reference)
  2. rewrite course.js / parts.js${fs.existsSync(path.join(src, 'symbols.js')) ? ' / symbols.js' : ''} for the topic — the example is a construction reference, not a template to fill
  3. cd ${dir} && node ${path.relative(path.resolve(dir), path.join(skill, 'scripts', 'check.mjs'))} .
  4. node ${path.relative(path.resolve(dir), path.join(skill, 'scripts', 'render.mjs'))} . out/lessons --lessons --on   (read every still)
  5. node ${path.relative(path.resolve(dir), path.join(skill, 'scripts', 'render.mjs'))} . out/tour.mp4`);
