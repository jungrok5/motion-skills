// shred-poster · new-film.mjs — start a project folder from the starter (or from an example) to design a new topic in.
//   node <skill>/scripts/new-film.mjs <dir> [--from starter|toego]
// Copies film.json, src/ and fonts/. Then: write BRIEF.md, redesign src/10_poster.js for the topic, tune src/90_film.js.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), dir = args.find((a) => !a.startsWith('--'));
const i = args.indexOf('--from'), from = i > -1 ? args[i + 1] : 'starter';
const src = from === 'starter' ? join(skill, 'starter') : join(skill, 'examples', from);
if (!dir || !existsSync(src)) { console.error('usage: new-film.mjs <dir> [--from starter|toego]'); process.exit(1); }
const out = resolve(dir); if (existsSync(join(out, 'src'))) { console.error(`${out}/src exists — not overwriting`); process.exit(1); }
mkdirSync(out, { recursive: true });
for (const p of ['film.json', 'src', 'fonts']) if (existsSync(join(src, p))) cpSync(join(src, p), join(out, p), { recursive: true });
console.log(`${out}  (from ${from})
next: write ${dir}/BRIEF.md (references/BRIEF.md), add fonts with scripts/font.mjs, redesign src/10_poster.js,
      node ${skill}/scripts/render.mjs ${dir} --poster   then --sheet, check.mjs, --draft, and the final render`);
