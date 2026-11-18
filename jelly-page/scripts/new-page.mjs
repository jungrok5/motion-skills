// new-page.mjs — start a jelly page project: one self-contained folder (index.html + BRIEF.md + lib/).
//   node <skill>/scripts/new-page.mjs <dir> [--from party-invite]
// Copies the skill's lib/ into <dir>/lib and the template (or an example) into <dir>, rewriting the script paths to lib/….
// Then: fill BRIEF.md from the topic, rewrite the page HTML and CONFIG, run scripts/check.mjs and scripts/still.mjs.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dir = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--from');
const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : null;
if (!dir) { console.error('usage: new-page.mjs <dir> [--from <example>]'); process.exit(1); }
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error('no such example: ' + from + ' (have: ' + readdirSync(join(skill, 'examples')).join(', ') + ')'); process.exit(1); }
if (existsSync(join(dir, 'index.html'))) { console.error(dir + '/index.html exists; not overwriting'); process.exit(1); }
mkdirSync(dir, { recursive: true });
cpSync(join(skill, 'lib'), join(dir, 'lib'), { recursive: true });
for (const f of readdirSync(src)) {
  const p = join(src, f);
  if (f.endsWith('.html')) writeFileSync(join(dir, f), readFileSync(p, 'utf8').replace(/src="(\.\.\/)+lib\//g, 'src="lib/'));
  else cpSync(p, join(dir, f), { recursive: true });
}
console.log(`made ${dir}/ from ${from ? 'examples/' + from : 'templates'}: index.html, BRIEF.md, lib/ (hic.js, jelly.js, squelch.js)`);
console.log(`next: fill ${dir}/BRIEF.md, then node ${join(skill, 'scripts/check.mjs')} ${dir}/index.html`);
