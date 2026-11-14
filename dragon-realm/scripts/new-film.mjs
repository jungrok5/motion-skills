// dragon-realm · new-film.mjs — start a film folder from the starter (or from the worked example).
//   node <skill>/scripts/new-film.mjs <dir> [--from cheongryong] [--title "My Film"]
// Copies src/, BRIEF.md and film.json; nothing in the skill folder is changed.  Then: write BRIEF.md, redesign every
// numbered step in src/ for your topic (the copied sources are an example of the style, not a template to fill in).
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const dir = args[0] && !args[0].startsWith('--') ? resolve(args[0]) : null;
if (!dir) { console.error('usage: new-film.mjs <dir> [--from cheongryong] [--title "…"]'); process.exit(1); }
if (existsSync(join(dir, 'src'))) { console.error(`${dir}/src already exists — not overwriting`); process.exit(1); }
const from = opt('from', ''), src = from ? join(skill, 'examples', from) : join(skill, 'starter');
if (!existsSync(join(src, 'src'))) { console.error(`no such example: ${from}`); process.exit(1); }
mkdirSync(dir, { recursive: true }); cpSync(join(src, 'src'), join(dir, 'src'), { recursive: true });
const title = opt('title', basename(dir));
writeFileSync(join(dir, 'film.json'), JSON.stringify({ ...(existsSync(join(src, 'film.json')) ? JSON.parse(readFileSync(join(src, 'film.json'), 'utf8')) : {}), title }, null, 1) + '\n');
writeFileSync(join(dir, 'BRIEF.md'), readFileSync(join(skill, 'references', 'BRIEF.md'), 'utf8').split('<!-- form -->')[1] || '# BRIEF\n');
writeFileSync(join(dir, '.gitignore'), 'out/\n');
const rel = (p) => p;
console.log(`${dir}\n  BRIEF.md   fill this in first (references/BRIEF.md explains every line)\n  src/       ${from ? 'the worked example ' + from : 'the starter film (Tarn Wyrm, 14 s)'} — redesign it for your topic\n\nnext:\n  node ${rel(join(skill, 'scripts', 'check.mjs'))} ${dir}\n  node ${rel(join(skill, 'scripts', 'render.mjs'))} ${dir} --sheet --scale .33\n  node ${rel(join(skill, 'scripts', 'render.mjs'))} ${dir} --cast --scale .5\n  node ${rel(join(skill, 'scripts', 'score.mjs'))} ${dir} && node ${rel(join(skill, 'scripts', 'render.mjs'))} ${dir}`);
