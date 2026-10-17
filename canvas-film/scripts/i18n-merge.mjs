// Merge per-scene translations scenes/i18n/<lang>/<scene>.json ({"source string": "translation"}) into the file the scenes
// load: scenes/i18n/<lang>.json ({ _dir, <scene>: {…}, _ui: {…}, _fonts: {…} }). Run from the film project root:
//   node <skill>/scripts/i18n-merge.mjs en      (no argument = every language folder)
import { readdirSync, readFileSync, writeFileSync, renameSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
const base = join(resolve(process.env.FILM_ROOT || '.'), 'scenes', 'i18n');
const RTL = new Set(['ar', 'fa', 'ur', 'he', 'ps', 'sd', 'ckb', 'yi', 'ug', 'dv', 'arz', 'ary', 'arq', 'aeb', 'apd', 'azb', 'pnb', 'prs', 'haz', 'bal', 'skr', 'ks']);
const langs = process.argv.slice(2).length ? process.argv.slice(2)
  : readdirSync(base).filter(d => !d.startsWith('_') && statSync(join(base, d)).isDirectory());
for (const lang of langs) {
  const out = { _dir: RTL.has(lang) ? 'rtl' : 'ltr' };
  for (const f of readdirSync(join(base, lang)).filter(f => f.endsWith('.json')).sort()) {
    const j = JSON.parse(readFileSync(join(base, lang, f), 'utf8'));
    if (f === '_meta.json') { Object.assign(out, j); continue; }   // e.g. { "_dir": "rtl" } to override
    out[f.slice(0, -5)] = j;
  }
  const dst = join(base, lang + '.json'), tmp = dst + '.' + process.pid;
  writeFileSync(tmp, JSON.stringify(out, null, 1) + '\n'); renameSync(tmp, dst);
  console.log(`→ ${lang}.json · ${Object.keys(out).filter(k => !k.startsWith('_')).length} scenes`);
}
