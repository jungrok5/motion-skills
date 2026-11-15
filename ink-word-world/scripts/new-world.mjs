#!/usr/bin/env node
// Start a project: node <skill>/scripts/new-world.mjs <folder> [--from tide]
// Copies the starter world (or a named example) and the library into <folder>, so the project stands on its own:
//   <folder>/index.html · world.js · cast.html · BRIEF.md · lib/
// Then write BRIEF.md for your topic and replace world.js section by section.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), a = process.argv.slice(2), i = a.indexOf('--from'), from = i >= 0 ? a.splice(i, 2)[1] : null, dest = a[0];
if (!dest) { console.error('usage: new-world.mjs <folder> [--from <example>]'); process.exit(1); }
const src = from ? path.join(skill, 'examples', from) : path.join(skill, 'starter');
if (!fs.existsSync(src)) { console.error(`no such example: ${from} (have: ${fs.readdirSync(path.join(skill, 'examples')).join(', ')})`); process.exit(1); }
if (fs.existsSync(dest) && fs.readdirSync(dest).length) { console.error(`${dest} is not empty`); process.exit(1); }
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true, filter: f => !f.includes(`${path.sep}out`) });
fs.cpSync(path.join(skill, 'lib'), path.join(dest, 'lib'), { recursive: true });
for (const f of ['index.html', 'cast.html']) { const p = path.join(dest, f); if (fs.existsSync(p)) fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/"inkworld\/"\s*:\s*"[^"]+"/, '"inkworld/": "./lib/"')); }
if (!from) fs.copyFileSync(path.join(skill, 'references', 'BRIEF.md'), path.join(dest, 'BRIEF.template.md'));
console.log(`${dest}: ${fs.readdirSync(dest).join('  ')}\nnext: write BRIEF.md, then serve the folder (python3 -m http.server) and open it`);
