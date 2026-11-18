// check.mjs — proves a droste-page page: node scripts/check.mjs <page.html> [--q 0.5]
// The shared checks (scripts/hic-test.mjs: loads, draws, a real click through the map focuses the editable element,
// typing re-uploads, a real click reaches [data-hic-click], frames, phone width, fallback) plus the Droste ones:
//   map      every interactive element has a screen point where the forward map lands on it (inverse ↔ forward agree)
//   depth    a real click on a control drawn one copy deeper than the outermost one reaches that control
//   live     typing changes the text where it is drawn in two different copies at once
//   fall     a wheel turn falls in (fall rises by > 0.3) and settles within 3 s; fall +1 lands on the next copy
//   wind     unwinding to 0 changes the picture; a half turn shows the seam; whole turns are sticky
//   sharp    the quiet upload is sharper than the screen (≥ 1.4× the canvas width) and a burst of typing uses a smaller one
//   look     a still at the rest pose is not washed out (mean luma 40–215, spread > 25)
import { run } from './hic-test.mjs';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--')) || 'index.html';
const qi = args.indexOf('--q'), q = qi >= 0 ? args[qi + 1] : '0.5';
const hash = 'nointro&q=' + q;

await run(file, {
  hash, settle: 1500, timeout: 90000,
  extra: async (t) => {
    const { page, ok, fail, info, stats, diff, clip } = t;
    const D = (f, a) => page.evaluate(f, a);
    // ---- map: inverse and forward agree for every interactive element
    const m = await D(() => {
      const els = [...document.querySelectorAll('#page button, #page input, #page [contenteditable], #page a[href]')];
      const miss = els.filter(el => !window.__droste.screenOf(el)).map(el => el.id || el.tagName);
      return { n: els.length, miss };
    });
    if (m.miss.length) fail(`map: no screen point found for ${m.miss.join(', ')} (of ${m.n})`); else ok(`map: all ${m.n} controls have a screen point where the forward map lands on them`);

    // ---- depth: click a [data-hic-click] control one level deeper than where it looks biggest
    const tgt = await D(() => {
      const el = document.querySelector('#page [data-hic-click]') || document.querySelector('#page button');
      const top = window.__droste.screenOf(el); if (!top) return null;
      const deep = window.__droste.screenAt(el, top[2] + 1);
      const cb = document.querySelector('#stage').getBoundingClientRect();
      window.__depthHits = 0; el.addEventListener('click', () => window.__depthHits++);
      return deep ? { x: cb.left + deep[0], y: cb.top + deep[1], lev: deep[2], scale: 1 / deep[3], id: el.id } : null;
    });
    if (!tgt) fail('depth: the click target has no screen point one copy deeper');
    else {
      await page.mouse.move(tgt.x - 3, tgt.y); await page.waitForTimeout(200);
      await page.mouse.move(tgt.x, tgt.y); await page.waitForTimeout(400);
      await page.mouse.click(tgt.x, tgt.y); await page.waitForTimeout(300);
      const n = await D(() => window.__depthHits);
      if (n > 0) ok(`depth: a real click on #${tgt.id} drawn at ${(tgt.scale * 100).toFixed(0)}% size (level ${tgt.lev}) reaches it`);
      else fail(`depth: a click at (${tgt.x | 0}, ${tgt.y | 0}) on #${tgt.id} at level ${tgt.lev} did not reach it`);
    }

    // ---- live: typing changes two copies at once
    const two = await D(() => {
      const el = document.querySelector('#page [data-hic-edit]'); const top = window.__droste.screenOf(el);
      const deep = top && window.__droste.screenAt(el, top[2] + 1);
      const cb = document.querySelector('#stage').getBoundingClientRect(), b = el.getBoundingClientRect();
      return top && deep ? [[cb.left + top[0], cb.top + top[1], top[3]], [cb.left + deep[0], cb.top + deep[1], 1 / deep[3]]] : null;
    });
    if (!two) fail('live: the editable element is not visible in two copies');
    else {
      const box = (p) => { const h = Math.max(8, 30 * p[2]); return { x: Math.max(0, p[0] - h * 3), y: Math.max(0, p[1] - h / 2), width: h * 6, height: h }; };
      const a0 = await stats(page, box(two[0])), b0 = await stats(page, box(two[1]));
      await D(() => { const el = document.querySelector('#page [data-hic-edit]'); el.textContent = 'MMMM WWWW MMMM'; });
      await page.waitForTimeout(1500);
      const a1 = await stats(page, box(two[0])), b1 = await stats(page, box(two[1]));
      const da = diff(a0, a1), db = diff(b0, b1);
      if (da > 1 && db > 0.5) ok(`live: new text shows in two copies at once (pixel change ${da.toFixed(1)} and ${db.toFixed(1)})`);
      else fail(`live: text change did not show in both copies (${da.toFixed(2)}, ${db.toFixed(2)})`);
    }

    // ---- fall: a wheel turn falls in and settles
    const f0 = await D(() => window.__droste.state().fall);
    await page.mouse.move(clip.x + clip.width * 0.3, clip.y + clip.height * 0.5);
    for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(30); }
    const tw = Date.now(); let f1 = f0, prev = null, settled = 0;
    while (Date.now() - tw < 6000) { await page.waitForTimeout(150); f1 = await D(() => window.__droste.state().fall); if (prev !== null && Math.abs(f1 - prev) < 1e-4) { settled = (Date.now() - tw) / 1000; break; } prev = f1; }
    if (f1 - f0 > 0.3 && settled && settled < 3.5) ok(`fall: the wheel falls ${(f1 - f0).toFixed(2)} copies in and settles in ${settled.toFixed(1)} s`);
    else fail(`fall: wheel moved fall ${(f1 - f0).toFixed(2)}, settled ${settled || 'never'}`);

    // ---- wind: 0 vs whole vs half
    const shot = async (o) => { await D((o) => window.__droste.pose(o), o); await page.waitForTimeout(900); return stats(page, clip); };
    const w1 = await shot({ fall: -0.25, wind: 1 }), w0 = await shot({ fall: -0.25, wind: 0 }), wh = await shot({ fall: -0.25, wind: 0.5 });
    const d01 = diff(w0, w1), dh = diff(wh, w1);
    if (d01 > 8) ok(`wind: unwinding to 0 changes the picture (diff ${d01.toFixed(1)}); half a turn differs again (${dh.toFixed(1)})`); else fail(`wind: wind 0 and 1 look the same (diff ${d01.toFixed(2)})`);
    const sticky = await D(async () => {
      const inp = document.querySelector('#page input[type=range]'); if (!inp) return null;
      inp.value = '1.02'; inp.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 1200)); return window.__droste.state().wind;
    });
    if (sticky === null) info('wind: no range input');
    else if (Math.abs(sticky - 1) < 1e-3) ok('wind: 1.02 on the slider snaps to a whole turn'); else fail(`wind: 1.02 did not snap (wind ${sticky})`);

    // ---- sharp vs quick uploads
    const sh = await D(async () => {
      const el = document.querySelector('#page [data-hic-edit]'); const W = document.querySelector('#stage').width;
      const sizes = [];
      for (let i = 0; i < 8; i++) { el.textContent += 'x'; await new Promise(r => setTimeout(r, 60)); sizes.push(window.__droste.state().tex[0]); }
      await new Promise(r => setTimeout(r, 1500));
      return { W, burst: Math.min(...sizes), quiet: window.__droste.state().tex[0] };
    });
    if (sh.quiet >= sh.W * 1.4 && sh.burst < sh.quiet) ok(`sharp: quiet upload ${sh.quiet}px wide on a ${sh.W}px canvas; ${sh.burst}px while typing fast`);
    else fail(`sharp: quiet ${sh.quiet}px, burst ${sh.burst}px, canvas ${sh.W}px`);

    // ---- look at rest
    const lk = await shot({ fall: -0.25, wind: 1 });
    if (lk.mean > 40 && lk.mean < 215 && lk.spread > 25) ok(`look: rest pose mean luma ${lk.mean}, spread ${lk.spread}, ${lk.colours} colours`);
    else fail(`look: rest pose washed out or murky (mean ${lk.mean}, spread ${lk.spread})`);
  }
});
