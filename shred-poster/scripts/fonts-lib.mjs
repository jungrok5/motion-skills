// shred-poster · fonts-lib.mjs — which font files a project needs. A project keeps fonts in fonts/<name>/ with a
// faces.json: [{ family, weight, style, file, range }] (range = a CSS unicode-range, or empty for the whole font).
// Only the faces whose range covers a character the project actually uses are embedded (and kept by --prune).
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

export function usedChars(proj) {
  const set = new Set();
  for (let c = 0x20; c < 0x7f; c++) set.add(c);   // ASCII is always in
  const files = [];
  const walk = (d) => { if (!existsSync(d)) return; for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(js|json|txt)$/.test(f) && !/faces\.json$/.test(f)) files.push(p); } };
  walk(join(proj, 'src')); if (existsSync(join(proj, 'film.json'))) files.push(join(proj, 'film.json'));
  for (const f of files) for (const ch of readFileSync(f, 'utf8')) set.add(ch.codePointAt(0));
  return set;
}
export function parseRange(r) {
  if (!r) return null;
  return r.split(',').map((s) => s.trim().replace(/^U\+/i, '')).filter(Boolean).map((s) => { if (s.includes('?')) return [parseInt(s.replace(/\?/g, '0'), 16), parseInt(s.replace(/\?/g, 'f'), 16)]; const [a, b] = s.split('-'); return [parseInt(a, 16), parseInt(b || a, 16)]; });
}
export function covers(range, chars) { const rr = parseRange(range); if (!rr) return true; for (const c of chars) for (const [a, b] of rr) if (c >= a && c <= b) return true; return false; }
export function projectFaces(proj) {
  const dir = join(proj, 'fonts'), out = [];
  if (!existsSync(dir)) return out;
  for (const d of readdirSync(dir)) { const fj = join(dir, d, 'faces.json'); if (existsSync(fj)) for (const f of JSON.parse(readFileSync(fj, 'utf8'))) out.push({ ...f, path: join(dir, d, f.file), dir: join(dir, d) }); }
  return out;
}
