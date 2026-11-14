// load.mjs — import a piece's art.js (resolving its "fp/" imports to the skill's lib) and record it.
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const LIB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib');

// art.js imports '../lib/…' or 'fp/…'. Node has no import map, so we rewrite 'fp/' to the lib next to the piece
// (if the project has its own lib/ copy) or to the skill's lib, into a temp module beside the original.
export async function loadArt(file, extra = {}) {
  const abs = path.resolve(file);
  const dir = path.dirname(abs);
  const local = fs.existsSync(path.join(dir, 'lib', 'drawing.js')) ? path.join(dir, 'lib') : LIB;
  const src = fs.readFileSync(abs, 'utf8').replace(/(['"])fp\/([^'"]+)\1/g, (_, q, p) => q + pathToFileURL(path.join(local, p)).href + q);
  const tmp = path.join(dir, `.art-${process.pid}-${Date.now()}.mjs`);
  fs.writeFileSync(tmp, src);
  try {
    const mod = await import(pathToFileURL(tmp).href);
    const d = await mod.art(extra);
    const { Surface } = await import(pathToFileURL(path.join(local, 'surface.js')).href);
    return { d, Surface, lib: local, mod };
  } finally { fs.rmSync(tmp, { force: true }); }
}
