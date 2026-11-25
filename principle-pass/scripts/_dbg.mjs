import { createRequire } from 'node:module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
import { pathToFileURL } from 'node:url';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }); const p = await b.newPage();
await p.goto(pathToFileURL(process.argv[2]).href + '?render=1'); await p.waitForFunction(() => window.__ready);
const [pt, t0, t1] = [process.argv[3], +process.argv[4], +process.argv[5]];
const r = await p.evaluate(([pt, t0, t1]) => { const tr = window.__film.track('after'); const P = tr.points[pt]; const o = []; for (let i = Math.round(t0 * 60); i <= t1 * 60; i++) o.push([i / 60, P[i][0].toFixed(1), P[i][1].toFixed(1), (Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]) * 60).toFixed(0)]); return o; }, [pt, t0, t1]);
for (const x of r) console.log(x.join('\t')); await b.close();
