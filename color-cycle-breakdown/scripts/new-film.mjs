// color-cycle-breakdown · new-film.mjs — start a project next to you:
//   node <skill>/scripts/new-film.mjs my-film --title "Harbour at dawn"     (skeleton film.js + BRIEF.md + lib/)
//   node <skill>/scripts/new-film.mjs my-film --from lighthouse-cove         (a copy of a bundled film to study — then
//                                                                             replace everything; it is not a template)
//   node <skill>/scripts/new-film.mjs my-film --refresh                      (re-copy the engine into my-film/lib/)
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const name = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') !== true);
if (!name) { console.error('usage: new-film.mjs <folder> [--title "…"] [--from starter|<example>] [--refresh]'); process.exit(1); }
const dir = resolve(name), title = opt('title', name), from = opt('from');
mkdirSync(dir, { recursive: true });
cpSync(join(skill, 'lib'), join(dir, 'lib'), { recursive: true });
console.log(`${name}/lib/ ← engine (film.js, pixel.js, fonts/)`);
if (args.includes('--refresh')) process.exit(0);
const html = readFileSync(join(skill, 'starter', 'index.html'), 'utf8').replace('"../lib/"', '"./lib/"').replace(/<title>[^<]*<\/title>/, `<title>${title} · color-cycle-breakdown</title>`);
if (!existsSync(join(dir, 'index.html'))) writeFileSync(join(dir, 'index.html'), html);
const write = (f, s) => { if (existsSync(join(dir, f))) { console.log(`${name}/${f} kept (exists)`); return; } writeFileSync(join(dir, f), s); console.log(`${name}/${f}`); };
if (from) {
  const src = from === 'starter' ? join(skill, 'starter') : join(skill, 'examples', from);
  if (!existsSync(join(src, 'film.js'))) { console.error(`no film "${from}" (starter or one of examples/)`); process.exit(1); }
  write('film.js', readFileSync(join(src, 'film.js'), 'utf8'));
  write('BRIEF.md', readFileSync(join(skill, 'templates', 'BRIEF.md'), 'utf8').replaceAll('__TITLE__', title));
  console.log(`studying "${from}": replace its picture, layers and words — check.mjs fails lines borrowed from it`);
} else {
  write('film.js', readFileSync(join(skill, 'templates', 'film.js'), 'utf8').replaceAll('__TITLE__', title));
  write('BRIEF.md', readFileSync(join(skill, 'templates', 'BRIEF.md'), 'utf8').replaceAll('__TITLE__', title));
}
console.log(`\nnext: fill ${name}/BRIEF.md, design ${name}/film.js, then\n  node ${join(skill, 'scripts', 'check.mjs')} ${name}\n  node ${join(skill, 'scripts', 'render.mjs')} ${name} --shots`);
