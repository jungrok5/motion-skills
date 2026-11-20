// pixel-world-compiler · new-world.mjs — start a world project.
//   node <skill>/scripts/new-world.mjs my-world                    → my-world/{index.html, world.js, BRIEF.md, lib/}
//   node <skill>/scripts/new-world.mjs my-world --from tundra-camp → start from a worked example's tables
// The library is copied, not linked: a project extends it in world.js (FW.forms.register, new materials, new
// cast rows) and never edits lib/. Re-run with --lib-only to refresh lib/ from the skill.
import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const opt = (k) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : null; };
if (!dir) { console.error('usage: new-world.mjs <dir> [--from <example>] [--lib-only]'); process.exit(1); }
const out = resolve(dir);
mkdirSync(out, { recursive: true });
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
if (args.includes('--lib-only')) { console.log(`refreshed ${join(out, 'lib')}`); process.exit(0); }
const from = opt('from');
const src = from ? join(skill, 'examples', from) : null;
if (from && !existsSync(src)) { console.error(`no example '${from}' in ${join(skill, 'examples')}`); process.exit(1); }
const name = basename(out);
const keep = (f) => existsSync(join(out, f)) && (console.log(`kept existing ${f}`), true);
if (!keep('world.js')) writeFileSync(join(out, 'world.js'), readFileSync(src ? join(src, 'world.js') : join(skill, 'templates', 'world.js'), 'utf8'));
if (!keep('index.html')) writeFileSync(join(out, 'index.html'), readFileSync(join(skill, 'templates', 'world.html'), 'utf8').replace('__TITLE__', name));
if (!keep('BRIEF.md')) writeFileSync(join(out, 'BRIEF.md'), readFileSync(src ? join(src, 'BRIEF.md') : join(skill, 'templates', 'BRIEF.md'), 'utf8'));
mkdirSync(join(out, 'out'), { recursive: true });
console.log(`${out}
  index.html  the page (open it: arrows walk, space pauses; ?sheet=cast for the cast sheet)
  world.js    the tables — write BRIEF.md first, then these rows
  BRIEF.md    the topic → the causes, authorities and beats
  lib/        the compiler (do not edit; extend in world.js)
next: node ${join(skill, 'scripts', 'check.mjs')} ${join(dir, 'index.html')}`);
