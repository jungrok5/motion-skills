// cinematic-3d · profile.mjs — where does a frame's time go? Renders N frames with ?prof=1 and prints ms per stage.
//   node <skill>/scripts/profile.mjs shots/rain.html [--scale 1] [--frames 3]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')));
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 540, height: 960 } });
p.on('pageerror', e => console.error('page error:', e.message));
await p.goto(pathToFileURL(page$).href + `?render=1&prof=1&scale=${opt('scale', 1)}`);
await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
const n = +opt('frames', 3);
const r = await p.evaluate(n => { const f = window.__film; f.prof = {}; const t0 = performance.now(); for (let i = 0; i < n; i++) window.seek(1 + i * .5);
  const info = f.renderer.info.render; return { total: (performance.now() - t0) / n, stages: Object.fromEntries(Object.entries(f.prof).map(([k, v]) => [k, +(v / n).toFixed(1)])), tris: info.triangles, calls: info.calls }; }, n);
console.log(JSON.stringify(r, null, 1));
await b.close();
