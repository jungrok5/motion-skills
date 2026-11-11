// aphorism-film · bundle.mjs — one self-contained HTML file: the film page with lib/ and the project's own modules
// inlined as data: URLs in its import map. It still paints and plays live in the browser (with the ♪ score) — no video
// inside, no network, ~400 KB with the fonts. Hand this file over when someone asks for "a single HTML file".
//   node <skill>/scripts/bundle.mjs film.html                → out/film.single.html
//   node <skill>/scripts/bundle.mjs film.html --out x.html
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: bundle.mjs <film.html> [--out out/film.single.html]'); process.exit(1); }
const dir = dirname(page$), html = readFileSync(page$, 'utf8');
const m = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
if (!m) { console.error('no import map in the page'); process.exit(1); }
const map = JSON.parse(m[1]), lib = resolve(dir, map.imports['af/']);
const data = src => 'data:text/javascript;base64,' + Buffer.from(src).toString('base64');
const imports = {};
// lib modules: their relative imports become bare 'af/…' so they resolve through the map from inside a data: URL
for (const f of readdirSync(lib).filter(f => f.endsWith('.js'))) imports['af/' + f] = data(readFileSync(join(lib, f), 'utf8').replace(/from '\.\/([\w-]+\.js)'/g, "from 'af/$1'"));
// the bundled fonts (and any project fonts in ./fonts/) become data: URLs that type.js picks up from window.__AF_FONTS
const fonts = {};
for (const d of [join(lib, 'fonts'), join(dir, 'fonts')]) if (existsSync(d)) for (const f of readdirSync(d).filter(f => /\.(woff2?|ttf|otf)$/.test(f))) fonts[f] = 'data:font/' + f.split('.').pop() + ';base64,' + readFileSync(join(d, f)).toString('base64');
// the project's own modules next to the page (hero.js, score.js …), imported by the page as './x.js'
for (const f of readdirSync(dir).filter(f => f.endsWith('.js'))) imports['./' + f] = data(readFileSync(join(dir, f), 'utf8').replace(/from '\.\/([\w-]+\.js)'/g, "from './$1'"));
const out = resolve(opt('out', join(dir, 'out', (basename(page$) === 'index.html' ? basename(dir) : basename(page$).replace(/\.html$/, '')) + '.single.html')));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html.replace(m[0], `<script>window.__AF_FONTS=${JSON.stringify(fonts)}</script><script type="importmap">${JSON.stringify({ imports })}</script>`));
console.log(`${out}  (${(readFileSync(out).length / 1024).toFixed(0)} KB, ${Object.keys(imports).length} modules and ${Object.keys(fonts).length} fonts inlined)`);
