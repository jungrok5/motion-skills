// ten-second-scene · new-scene.mjs — start a scene as ONE html file with the kit inlined, plus BRIEF.md and AUDIT.md.
//   node <skill>/scripts/new-scene.mjs my-scene --renderer canvas2d|webgl|three [--title "제목"]
//   node <skill>/scripts/new-scene.mjs my-scene --from first-bus        (copy an example's scene + brief; AUDIT.md starts fresh)
//   node <skill>/scripts/new-scene.mjs --refresh my-scene/scene.html    (re-inline the current kit into an existing scene)
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };

export function inline(html) {
  return html.replace(/<script data-kit="([\w.-]+)"[^>]*>[\s\S]*?<\/script>/g, (m, name) => {
    const f = join(SKILL, 'lib', name);
    if (!existsSync(f)) throw new Error('unknown kit file ' + name);
    return `<script data-kit="${name}">\n${readFileSync(f, 'utf8').trim()}\n</script>`;
  });
}

if (opt('refresh')) {
  const f = resolve(opt('refresh'));
  writeFileSync(f, inline(readFileSync(f, 'utf8')));
  if (/from 'three'/.test(readFileSync(f, 'utf8')) && !existsSync(join(dirname(f), 'three.module.min.js'))) for (const v of ['three.module.min.js', 'LICENSE']) copyFileSync(join(SKILL, 'vendor', v), join(dirname(f), v === 'LICENSE' ? 'three.LICENSE' : v));
  console.log('kit refreshed in ' + f); process.exit(0);
}

const dir = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') !== true);
if (!dir) { console.error('usage: new-scene.mjs <dir> --renderer canvas2d|webgl|three [--title …] | --from <example> | --refresh <scene.html>'); process.exit(1); }
const out = resolve(dir); mkdirSync(out, { recursive: true });
if (existsSync(join(out, 'scene.html'))) { console.error(join(out, 'scene.html') + ' exists — not overwriting'); process.exit(1); }
const from = opt('from');
let html, brief;
if (from) {
  const ex = join(SKILL, 'examples', from);
  if (!existsSync(ex)) { console.error('no example ' + from); process.exit(1); }
  html = readFileSync(join(ex, 'scene.html'), 'utf8'); brief = readFileSync(join(ex, 'BRIEF.md'), 'utf8');
} else {
  const r = opt('renderer', 'canvas2d');
  if (!['canvas2d', 'webgl', 'three'].includes(r)) { console.error('renderer is canvas2d, webgl or three'); process.exit(1); }
  html = readFileSync(join(SKILL, 'templates', r + '.html'), 'utf8').replaceAll('__TITLE__', opt('title', 'untitled'));
  const ref = readFileSync(join(SKILL, 'references', 'BRIEF.md'), 'utf8');
  brief = ref.slice(ref.indexOf('<!-- template -->') + 17, ref.indexOf('<!-- /template -->')).trim() + '\n';
}
writeFileSync(join(out, 'scene.html'), inline(html));
writeFileSync(join(out, 'BRIEF.md'), brief);
writeFileSync(join(out, 'AUDIT.md'), `# AUDIT — ${opt('title', from || dir)}\n\nThe loop: render → five random moments at 100% → mark each against the five criteria → fix → render again, until one\nround passes all 25 cells. Each round is appended by \`audit.mjs\`; you fill the cells (✓ or ✗ + what is wrong),\nfindings and fixes. Never edit an old round.\n`);
if (/from 'three'/.test(html)) { copyFileSync(join(SKILL, 'vendor', 'three.module.min.js'), join(out, 'three.module.min.js')); copyFileSync(join(SKILL, 'vendor', 'LICENSE'), join(out, 'three.LICENSE')); }
console.log(`created ${out}/scene.html, BRIEF.md, AUDIT.md — write the brief first, then design the scene.`);
