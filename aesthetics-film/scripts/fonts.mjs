// aesthetics-film · fonts.mjs — fetch subset fonts holding exactly the characters the film writes, so the page renders
// the same on every machine and works offline afterwards. Run again whenever the text changes (check.mjs tells you).
//   node <skill>/scripts/fonts.mjs film.html [--native "Noto Serif KR"] [--latin "EB Garamond"]
// The native serif is picked from the text: Hangul → Noto Serif KR, kana → Noto Serif JP, Han → Noto Serif SC
// (--tc for Noto Serif TC), Latin only → Cormorant Garamond. Writes fonts/fonts.css (families "Essay Serif" and
// "Essay Latin"), fonts/*.woff2, fonts/chars.txt and fonts/LICENSE.txt. All fonts are SIL Open Font License 1.1,
// served by Google Fonts (https://fonts.google.com) — this script needs the network once.
import { mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { openFilm } from './_browser.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find((a) => a.endsWith('.html')) || '');
if (!page$.endsWith('.html')) { console.error('usage: fonts.mjs film.html [--native "Noto Serif KR"] [--latin "EB Garamond"] [--tc]'); process.exit(1); }
const { browser, page } = await openFilm(page$, 'render=1&scale=.2&msaa=0', { tolerate: (s) => /fonts\//.test(s) || /Failed to load resource/.test(s) });
const text = await page.evaluate(() => window.film.allText());
await browser.close();

const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
const chars = [...new Set([...text + ASCII + '·—–…“”‘’'])].filter((c) => !/[\n\r\t]/.test(c)).join('');
const hasHangul = /[가-힯ᄀ-ᇿ]/.test(chars), hasKana = /[぀-ヿ]/.test(chars), hasHan = /[一-鿿]/.test(chars);
const native = opt('native', hasHangul ? 'Noto Serif KR' : hasKana ? 'Noto Serif JP' : hasHan ? (args.includes('--tc') ? 'Noto Serif TC' : 'Noto Serif SC') : 'Cormorant Garamond');
const latin = opt('latin', 'EB Garamond');
const dir = join(dirname(page$), 'fonts'); mkdirSync(dir, { recursive: true });
for (const f of readdirSync(dir)) if (f.endsWith('.woff2')) rmSync(join(dir, f));
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const get = async (url, bin) => { for (let k = 0; k < 4; k++) { try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error(r.status + ' ' + url); return bin ? Buffer.from(await r.arrayBuffer()) : await r.text(); } catch (e) { if (k === 3) throw e; await new Promise((s) => setTimeout(s, 2000 * 2 ** k)); } } };
let css = `/* subset fonts for this film (scripts/fonts.mjs). ${native} + ${latin}, SIL Open Font License 1.1, via Google Fonts. */\n`;
let n = 0;
async function family(fam, axes, alias, subset) {
  const list = [...subset], chunks = [];
  for (let i = 0; i < list.length; i += 90) chunks.push(list.slice(i, i + 90).join(''));
  for (const ch of chunks) {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam).replace(/%20/g, '+')}:${axes}&text=${encodeURIComponent(ch)}&display=block`;
    const sheet = await get(url);
    for (const block of sheet.match(/@font-face\s*{[^}]*}/g) ?? []) {
      const src = block.match(/url\((https:[^)]+)\)/)[1], w = (block.match(/font-weight:\s*(\d+)/) || [])[1] ?? '400', st = (block.match(/font-style:\s*(\w+)/) || [])[1] ?? 'normal';
      const file = `${alias.replace(/\s/g, '')}-${w}${st === 'italic' ? 'i' : ''}-${n++}.woff2`;
      writeFileSync(join(dir, file), await get(src, true));
      css += block.replace(/font-family:\s*'[^']*'/, `font-family: '${alias}'`).replace(/src:[^;]*;/, `src: url(${file}) format('woff2');`).replace(/font-display:[^;]*;/, '') + '\n';
    }
  }
}
const isLatin = (c) => c.charCodeAt(0) < 0x2e80;
await family(native, native === 'Cormorant Garamond' ? 'ital,wght@0,500;0,600;0,700' : 'wght@500;600;700', 'Essay Serif', chars);
await family(latin, 'ital,wght@0,400;0,500;0,600;1,400', 'Essay Latin', [...chars].filter(isLatin).join(''));
writeFileSync(join(dir, 'fonts.css'), css);
writeFileSync(join(dir, 'chars.txt'), chars);
writeFileSync(join(dir, 'LICENSE.txt'), `${native} and ${latin}: SIL Open Font License 1.1 (https://openfontlicense.org).\nSubsets fetched from Google Fonts by aesthetics-film/scripts/fonts.mjs for the characters in chars.txt.\n`);
console.log(`${dir}/fonts.css  ${native} + ${latin}, ${[...chars].length} characters, ${n} files`);
