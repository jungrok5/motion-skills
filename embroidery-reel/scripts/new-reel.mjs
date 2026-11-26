// embroidery-reel · new-reel.mjs — start a reel project.
//   node <skill>/scripts/new-reel.mjs my-reel --title "제목"        → my-reel/{index.html, reel.js, BRIEF.md, lib/}
//   node <skill>/scripts/new-reel.mjs my-reel --from bibimbap      → copy an example to study it (then replace everything)
//   node <skill>/scripts/new-reel.mjs my-reel --refresh            → re-copy the engine into my-reel/lib/ (keeps your files)
// lib/ holds the engine (reel.js, stitch.js, props.js), three.js (MIT) and the fonts (OFL) — the project runs on its own.
import { mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const dir = args.find((a, i) => !a.startsWith('--') && !['--title', '--from'].includes(args[i - 1]));
if (!dir) { console.error('usage: new-reel.mjs <dir> [--title "…"] [--from <example>|starter] [--refresh]'); process.exit(1); }
const out = resolve(dir), lib = join(out, 'lib');
mkdirSync(join(lib, 'fonts'), { recursive: true });
for (const f of ['reel.js', 'stitch.js', 'props.js', 'three.module.min.js', 'THREE-LICENSE']) copyFileSync(join(SKILL, 'lib', f), join(lib, f));
for (const f of readdirSync(join(SKILL, 'lib/fonts'))) copyFileSync(join(SKILL, 'lib/fonts', f), join(lib, 'fonts', f));
if (args.includes('--refresh')) { console.log(`refreshed ${lib}`); process.exit(0); }
if (existsSync(join(out, 'reel.js'))) { console.error(`${out}/reel.js exists — use --refresh to update lib/ only`); process.exit(1); }
const title = opt('title', 'Untitled reel'), from = opt('from');
const page = readFileSync(join(SKILL, 'starter/index.html'), 'utf8').replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`).replace(/"\.\.\/lib\//g, '"./lib/');
writeFileSync(join(out, 'index.html'), page);
if (from) {
  const src = from === 'starter' ? join(SKILL, 'starter') : join(SKILL, 'examples', from);
  if (!existsSync(src)) { console.error(`no example "${from}" (have: starter, ${readdirSync(join(SKILL, 'examples')).join(', ')})`); process.exit(1); }
  copyFileSync(join(src, 'reel.js'), join(out, 'reel.js'));
  if (existsSync(join(src, 'BRIEF.md'))) copyFileSync(join(src, 'BRIEF.md'), join(out, 'BRIEF.md'));
  console.log(`${out}: copied ${from} to study — a new topic replaces its items, patches, palette and brief`);
} else {
  writeFileSync(join(out, 'reel.js'), readFileSync(join(SKILL, 'templates/reel.js'), 'utf8').replaceAll('__TITLE__', title));
  writeFileSync(join(out, 'BRIEF.md'), readFileSync(join(SKILL, 'templates/BRIEF.md'), 'utf8').replaceAll('__TITLE__', title));
  console.log(`${out}: index.html, reel.js (placeholder items), BRIEF.md (form), lib/ — write the brief first`);
}
console.log(`next: fill BRIEF.md → design the items in reel.js → node ${join(SKILL, 'scripts/check.mjs')} ${dir}`);
