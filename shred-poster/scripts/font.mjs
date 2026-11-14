// shred-poster · font.mjs — get a Google Fonts family (via its @fontsource package on npm, SIL OFL) into a project.
//   node <skill>/scripts/font.mjs add <project> "Inter Tight" 500       → <project>/fonts/inter-tight-500/
//   node <skill>/scripts/font.mjs add <project> ./MyFace.otf 700 "My Face"   (your own file: you must own its licence)
//   node <skill>/scripts/font.mjs prune <project>                         keep only the chunks the text uses
//   node <skill>/scripts/font.mjs list <project>
// Needs the network once (npm). The build embeds only the chunks whose unicode-range covers characters in src/, so a
// Korean family (≈120 chunks) costs only what the poster uses; prune before committing an example.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { join, resolve, basename, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { usedChars, covers, projectFaces } from './fonts-lib.mjs';

const [cmd, projArg, a, b, c] = process.argv.slice(2);
const proj = resolve(projArg || '.');
if (cmd === 'add') {
  if (existsSync(a) && /\.(ttf|otf|woff2?)$/i.test(a)) {
    const family = c || basename(a, extname(a)), dir = join(proj, 'fonts', family.toLowerCase().replace(/\s+/g, '-') + '-' + (b || 400));
    mkdirSync(dir, { recursive: true }); copyFileSync(a, join(dir, basename(a)));
    writeFileSync(join(dir, 'faces.json'), JSON.stringify([{ family, weight: +(b || 400), style: 'normal', file: basename(a), range: '' }], null, 1));
    console.log(`${dir}  (your own file — keep its licence next to it)`); process.exit(0);
  }
  const family = a, weight = +(b || 400), slug = family.toLowerCase().replace(/\s+/g, '-');
  const tmp = join(tmpdir(), 'sp-font-' + slug);   // kept as a cache: a second weight of the same family needs no download
  if (!existsSync(join(tmp, 'package'))) {
    rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
    try { execSync(`npm pack @fontsource/${slug} --silent`, { cwd: tmp, stdio: ['ignore', 'pipe', 'inherit'] }); } catch { console.error(`no @fontsource/${slug} on npm — check the exact family name on fonts.google.com`); process.exit(1); }
    const tgz = readdirSync(tmp).find((f) => f.endsWith('.tgz')); execSync(`tar xzf "${tgz}"`, { cwd: tmp }); rmSync(join(tmp, tgz));
  }
  const pkg = join(tmp, 'package'), cssF = join(pkg, `${weight}.css`);
  if (!existsSync(cssF)) { console.error(`${family} has no weight ${weight}: ` + readdirSync(pkg).filter((f) => /^\d+\.css$/.test(f)).join(' ')); process.exit(1); }
  const css = readFileSync(cssF, 'utf8'), faces = [];
  for (const blk of css.split('@font-face').slice(1)) {
    const file = (blk.match(/url\(\.\/files\/([^)]+\.woff2)\)/) || [])[1], range = ((blk.match(/unicode-range:\s*([^;]+);/) || [])[1] || '').trim();
    if (file) faces.push({ family, weight, style: 'normal', file, range });
  }
  const dir = join(proj, 'fonts', `${slug}-${weight}`); mkdirSync(dir, { recursive: true });
  for (const f of faces) copyFileSync(join(pkg, 'files', f.file), join(dir, f.file));
  if (existsSync(join(pkg, 'LICENSE'))) copyFileSync(join(pkg, 'LICENSE'), join(dir, 'LICENSE'));
  writeFileSync(join(dir, 'faces.json'), JSON.stringify(faces, null, 1));
  console.log(`${dir}  ${faces.length} faces · use { family: '${family}', weight: ${weight} }`);
} else if (cmd === 'prune') {
  const chars = usedChars(proj); let kept = 0, gone = 0;
  const byDir = {}; for (const f of projectFaces(proj)) (byDir[f.dir] ||= []).push(f);
  for (const [dir, fs] of Object.entries(byDir)) {
    const keep = fs.filter((f) => covers(f.range, chars));
    for (const f of fs) if (!keep.includes(f)) { rmSync(f.path, { force: true }); gone++; }
    kept += keep.length; writeFileSync(join(dir, 'faces.json'), JSON.stringify(keep.map(({ path, dir, ...r }) => r), null, 1));
  }
  console.log(`kept ${kept} faces, removed ${gone}`);
} else if (cmd === 'list') {
  const chars = usedChars(proj); for (const f of projectFaces(proj)) console.log(`${covers(f.range, chars) ? '●' : '○'} ${f.family} ${f.weight}  ${f.file}`);
} else { console.error('usage: font.mjs add|prune|list <project> …'); process.exit(1); }
