// nested-world-loop · new-loop.mjs — start a loop project.
//   node <skill>/scripts/new-loop.mjs my-loop --title "제목"            → my-loop/{index.html, loop.js, BRIEF.md, lib/}
//   node <skill>/scripts/new-loop.mjs my-loop --from lighthouse-bottle  → copy an example to study it (then replace everything)
//   node <skill>/scripts/new-loop.mjs my-loop --refresh                 → re-copy the engine into my-loop/lib/ (keeps your files)
// lib/ holds the engine (nwl.js, make.js) and three.js (MIT) — the project runs on its own, without the skill folder.
import { mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const dir = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--title' && args[args.indexOf(a) - 1] !== '--from');
if (!dir) { console.error('usage: new-loop.mjs <dir> [--title "…"] [--from <example>|starter] [--refresh]'); process.exit(1); }
const out = resolve(dir), lib = join(out, 'lib');
mkdirSync(lib, { recursive: true });
copyFileSync(join(SKILL, 'lib/nwl.js'), join(lib, 'nwl.js'));
copyFileSync(join(SKILL, 'lib/make.js'), join(lib, 'make.js'));
copyFileSync(join(SKILL, 'vendor/three.module.min.js'), join(lib, 'three.module.min.js'));
copyFileSync(join(SKILL, 'vendor/LICENSE'), join(lib, 'three.LICENSE'));
if (args.includes('--refresh')) { console.log(`refreshed ${lib}`); process.exit(0); }
if (existsSync(join(out, 'loop.js'))) { console.error(`${out}/loop.js exists — use --refresh to update lib/ only`); process.exit(1); }
const title = opt('title', 'Untitled loop'), from = opt('from');
const page = t => `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title>
<script type="importmap">{ "imports": { "three": "./lib/three.module.min.js", "nwl/": "./lib/" } }</script>
</head><body>
<script type="module" src="./loop.js"></script>
</body></html>
`;
if (from) {
  const src = from === 'starter' ? join(SKILL, 'starter') : join(SKILL, 'examples', from);
  if (!existsSync(src)) { console.error(`no example ${from}: ${readdirSync(join(SKILL, 'examples')).join(', ')}, starter`); process.exit(1); }
  for (const f of ['loop.js', 'BRIEF.md']) if (existsSync(join(src, f))) copyFileSync(join(src, f), join(out, f));
  writeFileSync(join(out, 'index.html'), page(title));
  console.log(`${out}: copied ${from} — study it, then design your own worlds (an example is not a template)`);
} else {
  writeFileSync(join(out, 'loop.js'), readFileSync(join(SKILL, 'templates/loop.js'), 'utf8').replaceAll('__TITLE__', title));
  const brief = readFileSync(join(SKILL, 'references/BRIEF.md'), 'utf8');
  const form = brief.slice(brief.indexOf('<!-- form -->') + 13, brief.indexOf('<!-- /form -->')).replaceAll('__TITLE__', title);
  writeFileSync(join(out, 'BRIEF.md'), form.trim() + '\n');
  writeFileSync(join(out, 'index.html'), page(title));
  console.log(`${out}: index.html, loop.js (skeleton), BRIEF.md (form), lib/ — write the brief first`);
}
console.log(`view: (cd ${dir} && python3 -m http.server) → http://localhost:8000/   check: node ${join(SKILL, 'scripts/check.mjs')} ${dir}`);
