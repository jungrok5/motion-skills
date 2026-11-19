// new-game.mjs — start a prompt-sprite-game project (or refresh its copy of the runtime).
//
//   node <skill>/scripts/new-game.mjs <dir> [--kind=platform|arena] [--title="…"]   new project from the starter
//   node <skill>/scripts/new-game.mjs <dir> --from=lighthouse-cat                   copy a worked example to study / adapt
//   node <skill>/scripts/new-game.mjs <dir> --refresh                               replace <dir>/lib with the skill's lib
//
// Writes index.html, lib/ (engine.js, tessera-link.js, game.css), game.json, BRIEF.md and .gitignore (ref/).
// The starter game.json runs but fails check.mjs on purpose (its prompts and intro say REPLACE): every part of it is
// replaced by what the brief designs (cast, prompts, pixels, tiles, backdrop, level, tune, text).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const opt = (n, d) => { const a = args.find((x) => x.startsWith(`--${n}`)); return a ? a.split('=').slice(1).join('=') || true : d; };
if (!dir) { console.error('usage: node new-game.mjs <dir> [--kind=platform|arena] [--title=…] [--from=<example>] [--refresh]'); process.exit(2); }
const out = path.resolve(dir);
const copyLib = () => { fs.mkdirSync(path.join(out, 'lib'), { recursive: true }); for (const f of fs.readdirSync(path.join(skill, 'lib'))) fs.copyFileSync(path.join(skill, 'lib', f), path.join(out, 'lib', f)); };

if (opt('refresh')) {
  if (!fs.existsSync(path.join(out, 'game.json'))) { console.error(`${out}: not a project (no game.json)`); process.exit(2); }
  copyLib(); console.log(`refreshed ${path.relative(process.cwd(), out)}/lib from the skill`); process.exit(0);
}
if (fs.existsSync(path.join(out, 'game.json'))) { console.error(`${out} already has a game.json (use --refresh to update lib/ only)`); process.exit(2); }
fs.mkdirSync(out, { recursive: true });

const from = opt('from');
if (from) {
  const src = path.join(skill, 'examples', from);
  if (!fs.existsSync(src)) { console.error(`no example "${from}" (have: ${fs.readdirSync(path.join(skill, 'examples')).join(', ')})`); process.exit(2); }
  for (const f of ['game.json', 'BRIEF.md', 'index.html']) if (fs.existsSync(path.join(src, f))) fs.copyFileSync(path.join(src, f), path.join(out, f));
} else {
  const kind = opt('kind', 'platform');
  const title = opt('title', 'New Game');
  const starter = JSON.parse(fs.readFileSync(path.join(skill, 'templates', `starter-${kind}.json`), 'utf8'));
  starter.title = title;
  fs.writeFileSync(path.join(out, 'game.json'), JSON.stringify(starter, null, 1) + '\n');
  fs.writeFileSync(path.join(out, 'index.html'), fs.readFileSync(path.join(skill, 'templates', 'index.html'), 'utf8').replace('__TITLE__', title));
  const brief = fs.readFileSync(path.join(skill, 'references', 'BRIEF.md'), 'utf8');
  const tpl = brief.slice(brief.indexOf('<!-- template -->') + '<!-- template -->'.length, brief.indexOf('<!-- /template -->')).trim();
  fs.writeFileSync(path.join(out, 'BRIEF.md'), tpl.replace('__TITLE__', title) + '\n');
}
copyLib();
const gi = path.join(out, '.gitignore');
if (!fs.existsSync(gi) || !/^ref\/$/m.test(fs.readFileSync(gi, 'utf8'))) fs.appendFileSync(gi, '# Tessera previews and Tessera-sprite sheets: generated, never committed\nref/\n');
const rel = path.relative(process.cwd(), out) || '.';
console.log(`created ${rel}/  (index.html, game.json, BRIEF.md, lib/, .gitignore)
next:  write ${rel}/BRIEF.md → design game.json → node ${path.relative(process.cwd(), skill)}/scripts/check.mjs ${rel}
play:  cd ${rel} && python3 -m http.server 8000   → http://localhost:8000/`);
