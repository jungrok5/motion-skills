// machine-wilds · new-realm.mjs — start a realm folder from the starter (or from an example).
//   node <skill>/scripts/new-realm.mjs <dir> [--from iron-valley] [--title "Name"] [--lang ko]
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), skill = resolve(here, '..'), args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const dir = args[0] && !args[0].startsWith('--') ? resolve(args[0]) : null;
if (!dir) { console.error('usage: new-realm.mjs <dir> [--from iron-valley] [--title "Name"] [--lang ko]'); process.exit(1); }
if (existsSync(join(dir, 'src'))) { console.error(dir + ' already has src/ — not overwriting'); process.exit(1); }
const from = opt('from', ''), src = from ? join(skill, 'examples', from) : join(skill, 'starter');
if (!existsSync(join(src, 'src'))) { console.error('no such example: ' + from + ' (have: ' + readdirSync(join(skill, 'examples')).join(', ') + ')'); process.exit(1); }
mkdirSync(dir, { recursive: true }); cpSync(join(src, 'src'), join(dir, 'src'), { recursive: true });
const meta = existsSync(join(src, 'realm.json')) ? JSON.parse(readFileSync(join(src, 'realm.json'), 'utf8')) : {};
if (opt('title')) { meta.title = opt('title'); meta.subtitle = ''; } if (opt('lang')) meta.lang = opt('lang');
writeFileSync(join(dir, 'realm.json'), JSON.stringify(meta, null, 2) + '\n');
writeFileSync(join(dir, 'BRIEF.md'), readFileSync(join(skill, 'references', 'BRIEF.md'), 'utf8').split('<!-- template -->')[1] || '# Brief\n');
if (existsSync(join(src, 'assets.json'))) cpSync(join(src, 'assets.json'), join(dir, 'assets.json'));
writeFileSync(join(dir, '.gitignore'), 'out/\nassets/\n');
console.log(`${dir}\n  BRIEF.md    write this first (references/BRIEF.md)\n  realm.json  title, subtitle, lang\n  assets.json the scans this place is made of (references/ASSETS.md)\n  src/        ${readdirSync(join(dir, 'src')).join(' · ')}\nthen: node ${join(skill, 'scripts', 'gym.mjs')} ${dir} --course --sheet --map   →  the machines proved, out/gym-course.png, out/map.png
      node ${join(skill, 'scripts', 'fetch-assets.mjs')} ${dir}   →  assets/\n      node ${join(skill, 'scripts', 'build.mjs')} ${dir}          →  index.html (serve the folder, or open with the render script)`);
