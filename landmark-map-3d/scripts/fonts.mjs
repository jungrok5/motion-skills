// landmark-map-3d · fonts.mjs — fetch subset fonts holding exactly the characters the film writes (pins, street names,
// title, clock, end card), so the page renders the same everywhere and works offline afterwards. Run it again whenever
// the text changes (check.mjs tells you).
//   node <skill>/scripts/fonts.mjs film.html [--round Nunito] [--sans "Noto Sans KR"]
// Two families, weights 700 / 800 / 900: 'Map Round' (a rounded Latin face, the map-label voice: Nunito) and 'Map Sans'
// (the fallback for everything Map Round lacks — Hangul, kana, Han: Noto Sans KR / JP / SC picked from the text).
// Writes fonts/fonts.css, fonts/*.woff2, fonts/chars.txt, fonts/LICENSE.txt. SIL Open Font License 1.1, via Google Fonts.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: fonts.mjs film.html'); process.exit(1); }

const { serve } = await import('./serve.mjs');
const { srv, url } = await serve(page$, '?render=1&scale=.1&msaa=0&shadow=256');
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'] });
let text = '';
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 480 } });
  await page.goto(url, { waitUntil: 'commit', timeout: 0 });
  for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) { if (Date.now() - t0 > 300000) throw new Error('never ready'); await new Promise(r => setTimeout(r, 150)); }
  text = await page.evaluate(() => window.FILM.allText());
} finally { await browser.close(); srv.close(); }

const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
const chars = [...new Set([...text + text.toUpperCase() + ASCII + '·—–…“”‘’°′″²éèêàâçôîïûüÉÈÀÇ'])].filter(c => !/[\n\r\t]/.test(c)).join('');
const round = opt('round', 'Nunito');
const sans = opt('sans', /[぀-ヿ]/.test(chars) ? 'Noto Sans JP' : /[一-鿿]/.test(chars) && !/[가-힯]/.test(chars) ? 'Noto Sans SC' : 'Noto Sans KR');
const dir = join(dirname(page$), 'fonts'); mkdirSync(dir, { recursive: true });
for (const f of readdirSync(dir)) if (/\.(woff2|ttf)$/.test(f)) rmSync(join(dir, f));
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const get = async (u, bin) => { for (let k = 0; k < 4; k++) { try { const r = await fetch(u, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error(r.status + ' ' + u); return bin ? Buffer.from(await r.arrayBuffer()) : await r.text(); } catch (e) { if (k === 3) throw e; await new Promise(s => setTimeout(s, 2000 * 2 ** k)); } } };
let css = `/* subset fonts for this film (landmark-map-3d/scripts/fonts.mjs): ${round} as 'Map Round', ${sans} as 'Map Sans'. SIL OFL 1.1, via Google Fonts. */\n`, n = 0;
for (const [fam, as] of [[round, 'Map Round'], [sans, 'Map Sans']]) {
  const list = [...chars];
  for (let i = 0; i < list.length; i += 90) {
    const ch = list.slice(i, i + 90).join('');
    const u = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam).replace(/%20/g, '+')}:wght@700;800;900&text=${encodeURIComponent(ch)}&display=block`;
    let sheet; try { sheet = await get(u); } catch (e) { console.warn(`skip ${fam} chunk: ${e.message}`); continue; }
    for (const block of sheet.match(/@font-face\s*{[^}]*}/g) ?? []) {
      const src = block.match(/url\((https:[^)]+)\)/)[1], w = (block.match(/font-weight:\s*(\d+)/) || [])[1] ?? '700';
      const fmt = (block.match(/format\('([^']+)'\)/) || [])[1] || 'woff2', ext = fmt === 'truetype' ? 'ttf' : 'woff2';
      const file = `${as.replace(' ', '')}-${w}-${n++}.${ext}`;
      writeFileSync(join(dir, file), await get(src, true));
      let b = block.replace(/font-family:\s*'[^']*'/, `font-family: '${as}'`).replace(/src:[^;]*;/, `src: url(${file}) format('${fmt}');`).replace(/font-display:[^;]*;/, '');
      if (!/unicode-range/.test(b)) b = b.replace(/}\s*$/, `  unicode-range: ${[...ch].map(c => 'U+' + c.codePointAt(0).toString(16)).join(', ')};\n}`);
      css += b + '\n';
    }
  }
}
writeFileSync(join(dir, 'fonts.css'), css);
writeFileSync(join(dir, 'chars.txt'), chars);
writeFileSync(join(dir, 'LICENSE.txt'), `${round} and ${sans}: SIL Open Font License 1.1 (https://openfontlicense.org).\nSubsets fetched from Google Fonts by landmark-map-3d/scripts/fonts.mjs for the characters in chars.txt.\n`);
console.log(`${dir}/fonts.css  ${round} + ${sans}, ${[...chars].length} characters, ${n} files`);
