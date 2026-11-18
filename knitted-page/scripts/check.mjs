// check.mjs — proves a knitted page: the shared HTML-in-Canvas checks (hic-test.mjs) + the knitting's own, with numbers.
//   node scripts/check.mjs <page.html> [--keep-intro]
// Shared (run): loads ready, draws, a real click through the knitting focuses the headline, typing re-uploads and changes
// pixels, a real click reaches [data-hic-click], frames keep coming, phone width, the fallback page.
// Knitting (extra), each with numbers:
//   stitches   every stitch has one yarn; the page reads (ink stitches under the headline, ≥ 3 yarns in use)
//   re-knit    typing knits the changed stitches back in row by row, and they settle (none still moving after 3 s)
//   caret      the drawn caret (a stitch-wide block) shows while the headline has focus
//   colourway  a real click on a control that recolours the page re-knits a large share of the stitches
//   thread     the loose end breathes at rest (moves > 0.3 px over 2 s); a real drag on it unravels the knitting
//              (> 2 % of the stitches), builds the heap, and letting go knits it back to the last stitch
//   unravel    a real click on [data-knit-unravel] unravels all of it; bare, the page is inert and the reveal (#under) is
//              live: a real click on [data-knit-back] (not hidden by the heap) knits it back up
//   net        a press that lands on nothing while the picture shows a control still works that control
//   still      #still=1 gives the same pixels on two loads; #pose=pull draws the heap and the strand
import { run, open, waitReady, stats, diff } from './hic-test.mjs';
const file = process.argv.slice(2).find(a => a.endsWith('.html'));
if (!file) { console.error('usage: node scripts/check.mjs <page.html>'); process.exit(2); }
const HASH = 'nointro&q=0.5';

await run(file, {
  hash: HASH, typeText: ' zq7', typeSettle: 1500,
  extra: async ({ page, ok, fail, info, clip }) => {
    const K = (f, a) => page.evaluate(f, a);
    const I = () => K(() => window.__knit.info());
    let i0 = await I();
    info(`grid ${i0.cols} × ${i0.rows} = ${i0.NST} stitches, ${i0.stitchPx.map(v => v.toFixed(1)).join(' × ')} px each · scene ${i0.sceneMs} ms at q ${i0.q} · GPU ${i0.gpuMs} ms`);
    // ---- stitches: the page reads in yarn
    const yarn = await K(() => {
      const k = window.__knit, h = document.querySelector('[data-hic-edit]'), r = h.getBoundingClientRect(), c = document.querySelector('canvas').getBoundingClientRect();
      const bg = k.stitchAt(c.left + 2 + k.info().card[0] + 3, k.info().card[1] + k.info().card[3] * 0.5) || [0, 0, 0];
      let ink = 0, all = 0; const set = new Set();
      for (let y = r.top + 4; y < r.bottom - 4; y += 4) for (let x = r.left + 4; x < r.right - 4; x += 4) {
        const s = k.stitchAt(x - c.left, y - c.top); if (!s) continue; all++; set.add(s.slice(0, 3).join());
        if (Math.abs(s[0] - bg[0]) + Math.abs(s[1] - bg[1]) + Math.abs(s[2] - bg[2]) > 60) ink++;
      }
      const ii = k.info(), every = new Set();
      for (let j = 0; j < ii.rows; j += 2) for (let i = 0; i < ii.cols; i += 2) every.add(k.stitch(i, j).slice(0, 3).join());
      return { ink, all, yarns: every.size, inHead: set.size };
    });
    if (yarn.all && yarn.ink / yarn.all > 0.06 && yarn.yarns >= 3) ok(`stitches: the headline is knitted in (${(100 * yarn.ink / yarn.all).toFixed(0)} % ink stitches under it), ${yarn.yarns} yarns in use`);
    else fail(`stitches: headline ink ${yarn.ink}/${yarn.all}, ${yarn.yarns} yarns — the page does not read in the knitting`);
    // ---- re-knit after typing (run() typed already); a second burst, timed by simulated time
    await K(() => window.__knit.manual());
    const sw0 = (await I()).sweeps;
    const hp = await K(() => { const e = document.querySelector('[data-hic-edit]'), p = window.__hic.screenOf(e), c = document.querySelector('canvas').getBoundingClientRect(); return [c.left + p[0], c.top + p[1]]; });
    await page.mouse.click(hp[0], hp[1]); await page.keyboard.press('End'); await page.waitForTimeout(300);
    await K(() => window.__knit.advance(1));
    await page.keyboard.type(' wool', { delay: 30 }); await page.waitForTimeout(700);
    let a = await K(() => window.__knit.advance(0.1));
    const moving = a.active, changed = a.lastChanged, rows = a.lastRows;
    a = await K(() => window.__knit.advance(3));
    if (changed > 0 && moving > 0 && a.active === 0) ok(`re-knit: typing changed ${changed} stitches over ${rows} rows; ${moving} were being knitted, all settled within 3 s`);
    else fail(`re-knit: changed ${changed}, moving ${moving}, still moving after 3 s ${a.active}`);
    info(`re-knit sweeps with needles so far: ${a.sweeps - sw0 >= 0 ? a.sweeps : 0}`);
    const car = await K(() => { const k = window.__knit; for (let t = 0; t < 1.3; t += 0.1) { k.advance(0.1); if (k.info().caret !== 'off') return k.info().caret; } return 'off'; });
    if (car !== 'off') ok(`caret: a drawn, stitch-wide caret shows in the focused headline (${car})`); else fail('caret: no drawn caret while the headline has focus');
    // ---- a control that recolours the page (radio / checkbox / select), by a real click
    const ctl = await K(() => { const e = [...document.querySelectorAll('#card input[type=radio]:not(:checked), #card input[type=checkbox]')][0]; if (!e) return null; const l = e.closest('label') || e; const r = l.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    if (ctl) {
      const before = await K(() => window.__knit.info().reads);
      await page.mouse.click(ctl[0], ctl[1]); await page.waitForTimeout(900);
      const r = await K(() => window.__knit.advance(0.2));
      if (r.reads > before && r.lastChanged > r.NST * 0.05) ok(`colourway: a real click re-knits ${r.lastChanged} stitches (${(100 * r.lastChanged / r.NST).toFixed(0)} %)`);
      else fail(`colourway: after the click ${r.lastChanged} stitches changed (reads ${before} → ${r.reads})`);
      await K(() => window.__knit.advance(4));
    } else info('colourway: no radio or checkbox on the card; skipped');
    // ---- the thread breathes, then a real drag unravels and letting go knits back
    const m0 = await K(() => window.__knit.ropePoint(16)); await K(() => window.__knit.advance(2)); const m1 = await K(() => window.__knit.ropePoint(16));
    const sway = Math.hypot(m1[0] - m0[0], m1[1] - m0[1]);
    if (sway > 0.3) ok(`thread: the loose end breathes at rest (${sway.toFixed(2)} px over 2 s)`); else fail(`thread: the loose end is dead still (${sway.toFixed(2)} px)`);
    const cb = await K(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
    const end = await K(() => window.__knit.ropePoint(99));
    const sA = await stats(page, clip);
    await page.mouse.move(cb[0] + end[0], cb[1] + end[1]); await page.mouse.down();
    for (let s = 1; s <= 6; s++) { await page.mouse.move(cb[0] + Math.min(cb[2] - 4, end[0] + s * 16), cb[1] + Math.min(cb[3] - 4, end[1] + s * 50)); await K(() => window.__knit.advance(0.2)); }
    let p = await K(() => window.__knit.advance(0.5));
    const sB = await stats(page, clip);
    if (p.mode === 'pull' && p.U > p.NST * 0.02 && p.heapShown > 0) ok(`thread: a real drag unravels ${(100 * p.U / p.NST).toFixed(1)} % (${p.U | 0} stitches), heap ${p.heapShown} pts; canvas change ${diff(sA, sB).toFixed(1)}`);
    else fail(`thread: drag → mode ${p.mode}, U ${p.U | 0}/${p.NST}, heap ${p.heapShown}`);
    await page.mouse.up();
    p = await I();
    const tKnit = await K(() => { const k = window.__knit; let t = 0; while (k.info().mode !== 'idle' && t < 8) { k.advance(0.25); t += 0.25; } return t; });
    p = await I();
    if (p.mode === 'idle' && p.U === 0) ok(`thread: let go, the needles knit it back in ${tKnit.toFixed(2)} s`); else fail(`thread: after release mode ${p.mode}, U ${p.U | 0}`);
    // ---- the Unravel control, the bare table and the reveal
    const un = await K(() => { const e = document.querySelector('#card [data-knit-unravel]'); if (!e) return null; const p = window.__hic.screenOf(e), c = document.querySelector('canvas').getBoundingClientRect(); return [c.left + p[0], c.top + p[1]]; });
    if (!un) fail('unravel: no [data-knit-unravel] control on the card');
    else {
      await page.mouse.move(un[0], un[1]); await page.waitForTimeout(200); await page.mouse.click(un[0], un[1]); await page.waitForTimeout(150);
      const m = (await I()).mode;
      const tUn = await K(() => { const k = window.__knit; let t = 0; while (k.info().mode !== 'bare' && t < 10) { k.advance(0.25); t += 0.25; } return t; });
      p = await I();
      if (m === 'auto' && p.mode === 'bare' && p.U >= p.NST) ok(`unravel: a real click unravels every stitch in ${tUn.toFixed(2)} s (heap ${p.heapShown} pts)`);
      else fail(`unravel: click → ${m}, then ${p.mode} with U ${p.U | 0}/${p.NST}`);
      const back = await K(() => { const e = document.querySelector('#under [data-knit-back]'); if (!e) return null; const p = window.__hic.screenOf(e), c = document.querySelector('canvas').getBoundingClientRect(); const h = window.__knit.info(); const hd = document.querySelector('[data-hic-edit]').getBoundingClientRect();
        return { x: c.left + p[0], y: c.top + p[1], heapGap: Math.hypot(p[0] - h.heap[0], p[1] - h.heap[1]) - h.heapR, headHit: (() => { const el = document.elementFromPoint(hd.left + 8, hd.top + hd.height / 2), h = document.querySelector('[data-hic-edit]'); return !!el && h.contains(el); })() }; });
      if (back) {
        if (back.headHit) fail('bare: the knitted page still takes clicks with nothing knitted'); else ok('bare: nothing knitted, the page is inert where it was drawn');
        if (back.heapGap > 0) ok(`bare: the reveal's knit-back control is clear of the heap (${back.heapGap.toFixed(0)} px)`); else fail(`bare: the heap covers [data-knit-back] (${back.heapGap.toFixed(0)} px)`);
        await page.mouse.move(back.x, back.y); await page.waitForTimeout(200); await page.mouse.click(back.x, back.y); await page.waitForTimeout(150);
        const m2 = (await I()).mode;
        const t2 = await K(() => { const k = window.__knit; let t = 0; while (k.info().mode !== 'idle' && t < 8) { k.advance(0.25); t += 0.25; } return t; });
        p = await I();
        if (m2 === 'knit' && p.mode === 'idle' && p.U === 0) ok(`reveal: a real click on [data-knit-back] knits the page back up in ${t2.toFixed(2)} s`);
        else fail(`reveal: click → ${m2}, then ${p.mode}, U ${p.U | 0}`);
      } else {
        const t2 = await K(() => { const k = window.__knit; let t = 0; while (k.info().mode !== 'idle' && t < 8) { k.advance(0.25); t += 0.25; } return t; });
        if ((await I()).mode === 'idle') ok(`unravel: no reveal layer; it knits itself back in ${t2.toFixed(2)} s`); else fail('unravel: never knitted back');
      }
    }
    // ---- the safety net: the press lands on nothing (the page is made inert for a moment) yet the control works
    const net = await K(() => { const e = document.querySelector('#card [data-hic-click]'); if (!e) return null; const p = window.__hic.screenOf(e), c = document.querySelector('canvas').getBoundingClientRect(); return [c.left + p[0], c.top + p[1]]; });
    if (net) {
      const n0 = (await I()).net;
      await K(() => { window.__netClicks = 0; document.querySelector('#card [data-hic-click]').addEventListener('click', () => window.__netClicks++, { once: true }); document.querySelector('#page').style.pointerEvents = 'none'; });
      await page.mouse.click(net[0], net[1]); await page.waitForTimeout(150);
      const r = await K(() => { document.querySelector('#page').style.pointerEvents = ''; return window.__netClicks; });
      const n1 = (await I()).net;
      if (r > 0 && n1 > n0) ok('net: a press that lands on nothing still works the control drawn there'); else fail(`net: the control was not worked (clicks ${r}, net ${n0} → ${n1})`);
    }
  }
});

// ---- stills are the same picture on every load; a pose draws the heap
async function frame(hash) {
  const { browser, page, errors } = await open(file, { hash });
  const r = await waitReady(page, errors, 60000); await page.waitForTimeout(1500);
  const clip = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  const s = r ? await stats(page, clip) : null; const inf = r ? await page.evaluate(() => window.__knit.info()) : null;
  await browser.close(); return { s, inf, errors };
}
let bad = 0;
const A = await frame('still=1&q=0.5'), B = await frame('still=1&q=0.5');
if (A.s && B.s && diff(A.s, B.s) < 0.5) console.log(`ok   still: #still=1 is the same picture on two loads (diff ${diff(A.s, B.s).toFixed(2)})`);
else { bad++; console.log(`FAIL still: two loads differ (${A.s && B.s ? diff(A.s, B.s).toFixed(2) : 'not ready'}) ${A.errors.concat(B.errors).join(' | ')}`); }
const C = await frame('still=1&q=0.5&pose=pull&u=0.35');
if (C.inf && C.inf.mode === 'pull' && C.inf.heapShown > 100 && diff(A.s, C.s) > 2) console.log(`ok   pose: #pose=pull&u=0.35 draws ${(100 * C.inf.U / C.inf.NST).toFixed(0)} % unravelled, heap ${C.inf.heapShown} pts (diff ${diff(A.s, C.s).toFixed(1)})`);
else { bad++; console.log('FAIL pose: #pose=pull did not draw an unravelled state'); }
if (bad) { console.log(`${bad} more check(s) failed`); process.exitCode = 1; }
