// cinematic-3d · new-film.mjs — start a film project: lib/ (engine + three.js), one shot page per id from the template,
// film.json, audio/. Shots load ../lib/ relatively, so the folder works anywhere (and copies straight onto a website).
//   node <skill>/scripts/new-film.mjs my-film --shots dusk,rain,snow
import { cpSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--'));
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
if (!dir) { console.error('usage: new-film.mjs <dir> [--shots a,b,c]'); process.exit(1); }
if (existsSync(join(dir, 'film.json'))) { console.error(dir + '/film.json exists — not overwriting'); process.exit(1); }
const ids = opt('shots', 'shot1').split(',');
mkdirSync(join(dir, 'shots'), { recursive: true }); mkdirSync(join(dir, 'audio'), { recursive: true });
cpSync(join(skill, 'lib'), join(dir, 'lib'), { recursive: true });
const tpl = readFileSync(join(skill, 'templates', 'shot.html'), 'utf8');
for (const id of ids) writeFileSync(join(dir, 'shots', id + '.html'), tpl.replace('<title>shot</title>', `<title>${id}</title>`));
writeFileSync(join(dir, 'film.json'), JSON.stringify({ title: dir, fps: 30, dissolve: .8, fade: .6, shots: ids.map(id => ({ id, page: `shots/${id}.html` })), audio: 'audio/mix.wav' }, null, 2) + '\n');
writeFileSync(join(dir, '.gitignore'), 'out/\naudio/mix.wav\n');
console.log(`${dir}/  lib/  shots/${ids.join('.html, shots/')}.html  film.json  audio/`);
