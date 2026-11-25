import { createRequire } from 'node:module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
import { pathToFileURL } from 'node:url';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }); const p = await b.newPage();
await p.goto(pathToFileURL(process.argv[2]).href + '?render=1'); await p.waitForFunction(() => window.__ready);
const r = await p.evaluate(() => { const m = window.__film.film.motion.after, C = m.C, l = C.limbs.find(l => l.id === 'HN'), o = [];
  for (let t = 3.15; t < 3.26; t += 1 / 60) { const P = m.pose(t), fr = C.solve(P), ff = fr.toW(fr.limbs.HN.foot), tg = m.footTarget(l, t, P, ff); const S = C.solve(P, { feet: { HN: tg } });
    o.push([t.toFixed(3), P.hind.toFixed(3), ff.map(v => v.toFixed(1)).join(','), tg.map(v => v.toFixed(1)).join(','), S.toW(S.limbs.HN.foot).map(v => v.toFixed(1)).join(','), S.limbs.HN.short.toFixed(1)]); } return o; });
for (const x of r) console.log(x.join('\t')); await b.close();
