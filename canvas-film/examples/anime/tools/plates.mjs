// Render reference frames of a scene in plate mode (backgrounds only) for the image model to repaint.
//   node tools/plates.mjs scenes/crossing-paint.html --o h --out out/plates "B:7" "L:13" "D:26" "Bnf:7:nofront"
// Each spec is name:time[:platemode] → out/plates/<name>-<o>.png
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), page$ = resolve(args[0]);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const ori = opt('o', 'h'), out = resolve(opt('out', 'out/plates')), [W, H] = ori === 'h' ? [1920, 1080] : [1080, 1920];
const specs = args.slice(1).filter((a, i, A) => !a.startsWith('--') && !(A[i - 1] || '').startsWith('--'));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--allow-file-access-from-files'] });
for (const sp of specs) {
  const [name, t, mode = '1'] = sp.split(':');
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto(pathToFileURL(page$).href + `?render=1&o=${ori}&plate=${mode}`);
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  await p.evaluate(t => window.seek(t), +t); await p.screenshot({ path: join(out, `${name}-${ori}.png`) }); await p.close();
}
await browser.close(); console.log('plates in', out, specs.join(' '));
