// engraving-collage-film · new-piece.mjs — start a piece: copies the starter (or an example) and the skill's lib/.
//   node <skill>/scripts/new-piece.mjs my-film                     → my-film/{BRIEF.md, piece.html, world.js, cast.js, cast.html, lib/}
//   node <skill>/scripts/new-piece.mjs my-film --from ice-voyage   (start from an example instead)
// Then write BRIEF.md for YOUR topic first (references/BRIEF.md), engrave its world in world.js and design its cast in
// cast.js — the starter's clock-tower town and apprentice are an example of the style, not a template to fill in.
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2), dest = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--from');
const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : null;
if (!dest) { console.error('usage: new-piece.mjs <dir> [--from <example>]'); process.exit(1); }
const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..'), out = resolve(dest);
const src = from ? join(skill, 'examples', from) : join(skill, 'templates');
if (!existsSync(src)) { console.error(`no such example: ${from} (have: ${readdirSync(join(skill, 'examples')).join(', ')})`); process.exit(1); }
if (existsSync(out) && readdirSync(out).length) { console.error(`${out} is not empty`); process.exit(1); }
mkdirSync(out, { recursive: true });
for (const f of readdirSync(src)) if (f !== 'lib' && f !== 'out') cpSync(join(src, f), join(out, f), { recursive: true });
if (existsSync(join(out, 'index.html'))) renameSync(join(out, 'index.html'), join(out, 'piece.html'));
cpSync(join(skill, 'lib'), join(out, 'lib'), { recursive: true });
for (const f of ['piece.html', 'cast.html']) {
  const p = join(out, f); if (!existsSync(p)) continue;
  writeFileSync(p, readFileSync(p, 'utf8').replace(/"three": "[^"]*"/, '"three": "./lib/vendor/three.module.min.js"').replace(/"ec\/": "[^"]*"/, '"ec/": "./lib/"'));
}
console.log(`${out}
  BRIEF.md    write this first — topic → world, subjects, cast, shots (see ${join(skill, 'references', 'BRIEF.md')})
  world.js    the engraved sets (references/KIT.md: Plate, the kit, cards)
  cast.js     the characters: head / torso painters for four views → review cast.html before any shot
  piece.html  the film: shots, cameras, acts, score (serve the folder to watch live: python3 -m http.server)
  lib/        the engine (extend in the project; leave the skill's copy alone)
next: node ${join(skill, 'scripts', 'render.mjs')} ${join(dest, 'cast.html')} --cast   then   --shots --scale .5   then   check.mjs`);
