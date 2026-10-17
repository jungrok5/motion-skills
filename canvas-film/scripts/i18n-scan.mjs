// Find every on-screen string of a scene, or what a language is still missing. Run from the film project root.
//   node <skill>/scripts/i18n-scan.mjs ko  [scene…]   → scenes/i18n/_ko/<scene>.json: the source strings to translate
//   (use the film's source language — film.json "source", default ko — as the first argument for the id scan)
//                                              ("ids": passed through Pilot.text/Pilot.tr — translatable as is;
//                                               "direct": Hangul drawn straight to the canvas — the scene must route it through Pilot.tr)
//   node <skill>/scripts/i18n-scan.mjs en  [scene…]   → prints, per scene, strings missing from i18n/en.json and Hangul still drawn (leaks)
// Seeks through the whole scene (every 0.25 s) in both orientations. No scene list = all 21 scenes.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const root = resolve(process.env.FILM_ROOT || '.'), FILM = JSON.parse(readFileSync(join(root, 'film.json'), 'utf8'));
const SRC = FILM.source || 'ko', ORDER = FILM.scenes.map(s => typeof s === 'string' ? s : s.id);
const [lang = SRC, ...only] = process.argv.slice(2);
const scenes = only.length ? only : ORDER;
const step = 0.25;
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
let bad = 0;
for (const sc of scenes) {
  const seen = new Set(), miss = new Set(), drawn = new Set();
  for (const ori of ['h', 'v']) {
    const page = await browser.newPage({ viewport: ori === 'h' ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 } });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await page.goto(pathToFileURL(join(root, 'scenes', sc + '.html')).href + `?render=1&collect=1&o=${ori}` + (lang === SRC ? '' : `&lang=${lang}`));
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    const r = await page.evaluate(async step => { for (let t = 0; t < window.DURATION; t += step) window.seek(t); return window.__i18n(); }, step);
    r.seen.forEach(s => seen.add(s)); r.miss.forEach(s => miss.add(s)); r.drawn.forEach(s => drawn.add(s));
    await page.close();
  }
  if (lang === SRC) {
    // drawn but never passed through Pilot.tr, and not merely a typed-in prefix of a translatable string
    const ids = [...seen].sort(), direct = [...drawn].filter(d => !seen.has(d) && ![...seen].some(s => s.startsWith(d) || s.includes(d))).sort();
    mkdirSync(join(root, 'scenes', 'i18n', '_' + SRC), { recursive: true });
    writeFileSync(join(root, 'scenes', 'i18n', '_' + SRC, sc + '.json'), JSON.stringify({ ids, direct }, null, 1) + '\n');
    console.log(`${sc}: ${ids.length} strings${direct.length ? `, ${direct.length} drawn directly (route through Pilot.tr): ` + direct.slice(0, 6).map(s => JSON.stringify(s)).join(' ') : ''}`);
    if (direct.length) bad++;
  } else {
    // a leak = source-language text still on the canvas. With a Korean/Japanese/Chinese source the script itself tells
    // (the harness only records drawn text in that script); with a Latin-script source, compare with the scanned source ids.
    let leaks = [...drawn];
    if (!['ko', 'ja', 'zh'].includes(SRC.split('-')[0])) {
      let ids = []; try { ids = JSON.parse(readFileSync(join(root, 'scenes', 'i18n', '_' + SRC, sc + '.json'), 'utf8')).ids; } catch (e) {}
      leaks = leaks.filter(d => ids.some(s => s === d || s.split('\n').includes(d) || (d.length > 3 && s.startsWith(d))));
    }
    console.log(`${sc}: ${miss.size ? miss.size + ' missing' : 'complete'}${leaks.length ? `, ${leaks.length} Hangul still drawn` : ''}`);
    for (const m of miss) console.log('   missing:', JSON.stringify(m));
    for (const l of leaks.filter(l => !miss.has(l)).slice(0, 12)) console.log('   leak:', JSON.stringify(l));
    if (miss.size || leaks.length) bad++;
  }
}
await browser.close();
process.exit(bad ? 1 : 0);
