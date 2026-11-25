// fold-out-map · fonts.mjs — fetch subset fonts holding exactly the characters the film writes (the printed map, the
// leaflet's back, the label cards, titles), so the page renders the same everywhere and works offline afterwards. Run it
// again whenever the text changes (check.mjs tells you).
//   node <skill>/scripts/fonts.mjs film.html [--family "Noto Serif KR"]
// "Map Serif" (weights 500 600 700 900) is picked from the text: Hangul → Noto Serif KR, kana → Noto Serif JP, Han →
// Noto Serif SC, else Noto Serif KR (its Latin is a clean book serif). "Map Italic" is Noto Serif italic (Latin only,
// for the romanised names). Writes fonts/fonts.css, *.woff2, chars.txt, LICENSE.txt — all SIL Open Font License 1.1,
// from Google Fonts; needs the network once.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: fonts.mjs film.html [--family "Noto Serif KR"]'); process.exit(1); }

const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 180, height: 320 } });
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto(pathToFileURL(page$).href + '?render=1&scale=.1&msaa=0&tex=.15', { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) { if (Date.now() - t0 > 240000) throw new Error('never ready'); await new Promise(r => setTimeout(r, 100)); }
const text = await page.evaluate(() => window.FILM.allText());
await browser.close();

const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
const chars = [...new Set([...text + ASCII + '·—–…“”‘’°▲'])].filter(c => !/[\n\r\t]/.test(c)).join('');
const fam = opt('family', /[가-힯ᄀ-ᇿ]/.test(chars) ? 'Noto Serif KR' : /[぀-ヿ]/.test(chars) ? 'Noto Serif JP' : /[一-鿿]/.test(chars) ? 'Noto Serif SC' : 'Noto Serif KR');
const dir = join(dirname(page$), 'fonts'); mkdirSync(dir, { recursive: true });
for (const f of readdirSync(dir)) if (/\.(woff2|ttf)$/.test(f)) rmSync(join(dir, f));
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const get = async (url, bin) => { for (let k = 0; k < 4; k++) { try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error(r.status + ' ' + url); return bin ? Buffer.from(await r.arrayBuffer()) : await r.text(); } catch (e) { if (k === 3) throw e; await new Promise(s => setTimeout(s, 2000 * 2 ** k)); } } };
let css = `/* subset fonts for this film (fold-out-map/scripts/fonts.mjs): ${fam} as "Map Serif", Noto Serif italic as "Map Italic". SIL Open Font License 1.1, via Google Fonts. */\n`, n = 0;
const latin = [...chars].filter(c => c.codePointAt(0) < 0x2100).join('');
async function face(family, as, axis, list, prefix) {
  for (let i = 0; i < list.length; i += 90) {
    const ch = list.slice(i, i + 90).join('');
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:${axis}&text=${encodeURIComponent(ch)}&display=block`;
    const sheet = await get(url);
    for (const block of sheet.match(/@font-face\s*{[^}]*}/g) ?? []) {
      const src = block.match(/url\((https:[^)]+)\)/)[1], w = (block.match(/font-weight:\s*(\d+)/) || [])[1] ?? '400';
      const fmt = (block.match(/format\('([^']+)'\)/) || [])[1] || 'woff2', ext = fmt === 'truetype' ? 'ttf' : 'woff2';
      const file = `${prefix}-${w}-${n++}.${ext}`;
      writeFileSync(join(dir, file), await get(src, true));
      let b = block.replace(/font-family:\s*'[^']*'/, `font-family: '${as}'`).replace(/src:[^;]*;/, `src: url(${file}) format('${fmt}');`).replace(/font-display:[^;]*;/, '');
      if (!/unicode-range/.test(b)) b = b.replace(/}\s*$/, `  unicode-range: ${[...ch].map(c => 'U+' + c.codePointAt(0).toString(16)).join(', ')};\n}`);
      css += b + '\n';
    }
  }
}
await face(fam, 'Map Serif', 'wght@500;600;700;900', [...chars], 'MapSerif');
await face('Noto Serif', 'Map Italic', 'ital,wght@1,400;1,500', [...latin], 'MapItalic');
writeFileSync(join(dir, 'fonts.css'), css);
writeFileSync(join(dir, 'chars.txt'), chars);
writeFileSync(join(dir, 'LICENSE.txt'), `${fam} and Noto Serif (italic): SIL Open Font License 1.1 (https://openfontlicense.org).\nSubsets fetched from Google Fonts by fold-out-map/scripts/fonts.mjs for the characters in chars.txt.\n`);
console.log(`${dir}/fonts.css  ${fam} + Noto Serif italic, ${chars.length} characters, ${n} files`);
