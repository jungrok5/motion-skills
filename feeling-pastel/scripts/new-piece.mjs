#!/usr/bin/env node
// new-piece.mjs — start a piece: copies the starter (or an example) and the drawing library into a project folder.
//   node <skill>/scripts/new-piece.mjs my-piece                 starter 「여름방학 마지막 밤」 (3 tools, 4 stages)
//   node <skill>/scripts/new-piece.mjs my-piece --from held-breath   the worked example 「참았던 숨」 (5 tools, 8 stages)
// Then: rewrite BRIEF.md for YOUR story first, then art.js. The copied art is an example of the style, not a template to fill.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const dest = argv.find((a) => !a.startsWith('--'));
const fi = argv.indexOf('--from'), from = fi >= 0 ? argv[fi + 1] : null;
if (!dest) { console.error('usage: new-piece.mjs <dir> [--from held-breath]'); process.exit(1); }
const src = from ? path.join(skill, 'examples', from) : path.join(skill, 'templates');
if (!fs.existsSync(src)) { console.error(`no such example: ${from} (have ${fs.readdirSync(path.join(skill, 'examples')).join(', ')})`); process.exit(1); }
if (fs.existsSync(dest) && fs.readdirSync(dest).length) { console.error(`${dest} is not empty`); process.exit(1); }
fs.mkdirSync(dest, { recursive: true });
for (const f of ['art.js', 'BRIEF.md']) fs.copyFileSync(path.join(src, f), path.join(dest, f));
// the page: imports "fp/" from the project's own lib copy
const page = fs.readFileSync(path.join(skill, 'templates', 'piece.html'), 'utf8');
fs.writeFileSync(path.join(dest, 'piece.html'), page);
fs.cpSync(path.join(skill, 'lib'), path.join(dest, 'lib'), { recursive: true });
fs.writeFileSync(path.join(dest, '.gitignore'), 'out/\n');
const sk = path.relative(process.cwd(), skill).startsWith('../..') ? skill : path.relative(process.cwd(), skill) || '.';
console.log(`${dest}/  BRIEF.md · art.js · piece.html · lib/   (from ${from || 'starter'})
next:
  1. rewrite ${dest}/BRIEF.md for your story (feelings → never drawn → translation → one picture → palette → 3–5 tools)
  2. redesign ${dest}/art.js from the brief
  3. node ${sk}/scripts/render.mjs ${dest}/art.js --stages --scale .5
  4. node ${sk}/scripts/check.mjs ${dest}/art.js
  5. cd ${dest} && python3 -m http.server   → piece.html draws it live`);
