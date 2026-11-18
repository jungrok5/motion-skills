// check.mjs — proves an event-horizon-page page, with numbers. Exit code 1 if anything failed.
//   node scripts/check.mjs <page.html> [--q 0.5]
// The shared checks (scripts/hic-test.mjs: loads, draws, a real click through the drawing focuses and types, frames, phone
// width, the fallback) run first on the frozen page (#still=1&nointro), then this skill's own:
//   physics   the deflection table matches the weak-field limit far out and diverges at the photon sphere (b = √27 M)
//   lens      gravity on vs off changes the pixels around the object; the far corner stays the same
//   drag      a real mouse drag moves the object with the hand (px error); a fling coasts, then settles (simulated seconds)
//   bent      an element whose light is bent (displaced > 8 px) is clicked through the lens with a real mouse
//   select    a real mouse drag across bent text selects it
//   feed      a word typed into the feed field and sent is torn off: hidden in the DOM, a mesh of pieces, pixels change
//   hungry    Hungry (a real click) eats the words the object crosses; Restore gives every one back and the text is whole
//   mass      the mass slider grows the Einstein radius
//   still     two loads at #still=2 give the same picture
//   sound     the sound toggle starts Web Audio without errors
import { run, open, waitReady, stats, diff } from './hic-test.mjs';

const a = process.argv.slice(2);
const file = a.find(x => !x.startsWith('--') && a[a.indexOf(x) - 1] !== '--q');
const qi = a.indexOf('--q'), q = qi >= 0 ? a[qi + 1] : '0.5';
if (!file) { console.log('usage: node scripts/check.mjs <page.html> [--q 0.5]'); process.exit(1); }
const HASH = `still=1&nointro&q=${q}`;

const E = (page, fn, arg) => page.evaluate(fn, arg);
const frames = async (page, n = 3) => { for (let i = 0; i < n; i++) await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r()))); };
// wait until the engine has drawn after a change (software GL is slow)
async function drawn(page, ms = 400) {
  const d0 = await E(page, () => { window.__hic.eh.redraw(); return window.__hic.eh.state.drawn; });
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) { await page.waitForTimeout(120); if (await E(page, () => window.__hic.eh.state.drawn) > d0) break; }
  await page.waitForTimeout(ms);
}
const st = page => E(page, () => { const s = window.__hic.eh.state; return { x: s.x, y: s.y, s: s.s, eaten: window.__hic.eh.eatenCount(), pieces: window.__hic.eh.pieces() }; });

await run(file, {
  hash: HASH,
  extra: async (t) => {
    const { page, ok, fail, info } = t;
    const W = await E(page, () => innerWidth), H = await E(page, () => innerHeight);

    // physics -------------------------------------------------------------------------------------------------------
    const ph = await E(page, () => { const h = window.__hic.eh, C = h.consts;
      const far = 40, weak = 4 / far + 15 * Math.PI / 4 / far / far;
      let mono = true; for (let b = C.BC + .01; b < 40; b += .37) if (h.alpha(b + .37) > h.alpha(b) + 1e-6) mono = false;
      return { err: Math.abs(h.alpha(far) - weak) / weak, near: h.alpha(C.BC + .002), mono, the: C.THE }; });
    if (ph.err < .03 && ph.near > 4 && ph.mono) ok(`physics: α(40 M) within ${(ph.err * 100).toFixed(1)}% of 4/b + 15π/4b²; α(√27 + .002) = ${ph.near.toFixed(2)} rad; α falls monotonically`);
    else fail(`physics: weak-field error ${(ph.err * 100).toFixed(1)}%, α near the photon sphere ${ph.near.toFixed(2)}, monotone ${ph.mono}`);

    // lens ----------------------------------------------------------------------------------------------------------
    await E(page, () => window.__hic.eh.moveTo(innerWidth * .45, innerHeight * .55)); await drawn(page);
    let s0 = await st(page);
    const R = Math.min(W, H) * .2, near = { x: Math.max(0, s0.x - R), y: Math.max(0, s0.y - R), width: 2 * R, height: 2 * R };
    const corner = { x: 0, y: 0, width: 120, height: 90 };
    const nOn = await stats(page, near), cOn = await stats(page, corner);
    await E(page, () => { window.__hic.eh.gravity(false); window.__hic.eh.run(2); }); await drawn(page);
    const nOff = await stats(page, near), cOff = await stats(page, corner);
    await E(page, () => { window.__hic.eh.gravity(true); window.__hic.eh.run(2); }); await drawn(page);
    const dn = diff(nOn, nOff), dc = diff(cOn, cOff);
    if (dn > 8 && dc < 1) ok(`lens: around the object the picture changes by ${dn.toFixed(1)} with gravity on vs off; the far corner by ${dc.toFixed(2)}`);
    else fail(`lens: change near the object ${dn.toFixed(1)} (want > 8), in the far corner ${dc.toFixed(2)} (want < 1)`);

    // drag + fling ----------------------------------------------------------------------------------------------------
    s0 = await st(page);
    await page.mouse.move(s0.x, s0.y); await page.mouse.down();
    const dx = -Math.min(260, W * .25), dy = Math.min(110, H * .12);
    for (let i = 1; i <= 12; i++) { await page.mouse.move(s0.x + dx * i / 12, s0.y + dy * i / 12); await page.waitForTimeout(30); }
    await page.mouse.up(); await frames(page);
    const s1 = await st(page), err = Math.hypot(s1.x - (s0.x + dx), s1.y - (s0.y + dy));
    if (err < 6) ok(`drag: a real mouse drag of ${Math.hypot(dx, dy).toFixed(0)} px moves the object with the hand (error ${err.toFixed(1)} px)`);
    else fail(`drag: the object is ${err.toFixed(1)} px from where the hand left it`);
    const fl = await E(page, () => { const h = window.__hic.eh, s = h.state; h.moveTo(innerWidth * .5, innerHeight * .5); s.vx = 900; s.vy = -250;
      const x0 = s.x, y0 = s.y; let settle = -1; for (let i = 1; i <= 240; i++) { h.run(1 / 60); if (settle < 0 && Math.hypot(s.vx, s.vy) < 1.5) settle = i / 60; }
      return { d: Math.hypot(s.x - x0, s.y - y0), settle }; });
    if (fl.d > 60 && fl.settle > 0 && fl.settle < 3) ok(`fling: released at 930 px/s it coasts ${fl.d.toFixed(0)} px and settles in ${fl.settle.toFixed(2)} s (simulated)`);
    else fail(`fling: coasted ${fl.d.toFixed(0)} px, settled at ${fl.settle} s`);

    // bent element clicked through the lens -----------------------------------------------------------------------------
    const target = await E(page, () => {
      const el = document.querySelector('canvas [data-hic-click]') || document.querySelector('canvas button, canvas input[type=checkbox]');
      const pg = document.querySelector('canvas [drawable]'), b = HIC.box(pg, el), h = window.__hic.eh, thE = h.einstein() / h.state.s * h.state.s;
      const cx = b[0] + b[2] / 2, cy = b[1] + b[3] / 2;
      // put the object beside it, a little more than the Einstein radius away, on the side with more room
      const side = cx > innerWidth / 2 ? -1 : 1; h.moveTo(cx + side * (h.einstein() * 1.35 + b[2] / 2), cy + h.einstein() * .25);
      const p = window.__hic.screenOf(el), s2 = h.sourceOf(p[0], p[1]);
      if (!el.id) el.id = 'eh-check-target';
      return { sel: '#' + el.id, p, disp: Math.hypot(p[0] - cx, p[1] - cy), back: s2 ? Math.hypot(s2[0] - cx, s2[1] - cy) : -1 };
    });
    await drawn(page, 200);
    await E(page, s => { const el = document.querySelector(s); window.__ehHit = 0; el.addEventListener('click', () => window.__ehHit++, { once: true }); }, target.sel);
    await page.mouse.move(target.p[0] - 20, target.p[1]); await page.waitForTimeout(150);
    await page.mouse.move(target.p[0], target.p[1]); await page.waitForTimeout(300);
    await page.mouse.click(target.p[0], target.p[1]); await page.waitForTimeout(250);
    const hit = await E(page, () => window.__ehHit);
    if (hit && target.disp > 8) ok(`bent: ${target.sel} drawn ${target.disp.toFixed(0)} px from its layout place is clicked there with a real mouse (inverse lens error ${target.back.toFixed(2)} px)`);
    else fail(`bent: click on ${target.sel} at its drawn place (${target.disp.toFixed(0)} px from layout) ${hit ? 'landed' : 'missed'}`);
    await E(page, s => { const el = document.querySelector(s); if (el.getAttribute('aria-pressed') === 'true' || el.checked) el.click(); }, target.sel);

    // select bent text --------------------------------------------------------------------------------------------------
    const sel = await E(page, () => {
      const h = window.__hic.eh, pg = document.querySelector('canvas [drawable]');
      const p = [...pg.querySelectorAll('p,li span,h2 span')].find(e => e.textContent.trim().length > 12 && !e.closest('[data-eh-dock]'));
      const b = HIC.box(pg, p), y = b[1] + 10, x0 = b[0] + 4;
      h.moveTo(x0 + 60, y + h.einstein() * 1.6);
      const a = window.__hic.eh.screenOf([x0, y]), c = window.__hic.eh.screenOf([x0 + Math.min(120, b[2] - 8), y]);
      return { a, c, disp: Math.hypot(a[0] - x0, a[1] - y) };
    });
    await drawn(page, 200);
    await E(page, () => getSelection().removeAllRanges());
    await page.mouse.move(sel.a[0] - 10, sel.a[1]); await page.waitForTimeout(120); await page.mouse.move(sel.a[0], sel.a[1]); await page.waitForTimeout(200);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) { await page.mouse.move(sel.a[0] + (sel.c[0] - sel.a[0]) * i / 8, sel.a[1] + (sel.c[1] - sel.a[1]) * i / 8); await page.waitForTimeout(40); }
    await page.mouse.up();
    const selected = await E(page, () => String(getSelection()).trim());
    if (selected.length >= 3 && sel.disp > 4) ok(`select: a real drag across bent text (displaced ${sel.disp.toFixed(0)} px) selects "${selected.slice(0, 24)}"`);
    else fail('select: dragging across bent text selected nothing');
    await E(page, () => getSelection().removeAllRanges());

    // feed through the real form ----------------------------------------------------------------------------------------
    const form = await E(page, () => { const i = document.querySelector('canvas form input[type=text], canvas form input:not([type])');
      if (!i) return null; if (!i.id) i.id = 'eh-feed-input'; const h = window.__hic.eh, pg = document.querySelector('canvas [drawable]'), b = HIC.box(pg, i);
      h.moveTo(Math.min(innerWidth * .8, b[0] + b[2] + h.einstein() * 1.4), b[1] + b[3] * .5); return '#' + i.id; });
    if (!form) info('feed: no feed form on this page (skipped)');
    else {
      await drawn(page, 200);
      const ip = await E(page, s => window.__hic.screenOf(document.querySelector(s)), form);
      const fc = await E(page, () => { const s = window.__hic.eh.state, tr = document.querySelector('canvas form').parentNode.getBoundingClientRect(), R = window.__hic.eh.einstein() * 1.3;
        const x0 = Math.max(0, Math.min(tr.left, s.x - R)), y0 = Math.max(0, Math.min(tr.top, s.y - R)), x1 = Math.min(innerWidth, Math.max(tr.right, s.x + R)), y1 = Math.min(innerHeight, Math.max(tr.bottom, s.y + R));
        return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }; });
      const before = await stats(page, fc);
      await page.mouse.move(ip[0] - 10, ip[1]); await page.waitForTimeout(100); await page.mouse.move(ip[0], ip[1]); await page.waitForTimeout(250);
      await page.mouse.click(ip[0], ip[1]); await page.waitForTimeout(150);
      await page.keyboard.type('quasar', { delay: 30 }); await page.keyboard.press('Enter');
      let f = null; const t0 = Date.now();
      while (Date.now() - t0 < 15000) { await page.waitForTimeout(250); f = await st(page); if (f.pieces > 0) break; }
      await E(page, () => window.__hic.eh.run(1.3)); await drawn(page, 1200);
      const after = await stats(page, fc);
      const leaves = await E(page, () => window.__hic.eh.feedLeaves);
      const hidden = await E(page, (leaves) => [...document.querySelectorAll(leaves ? '[data-eh-fed]:not([data-eh-eaten])' : '[data-eh-eaten]')].some(e => /quasar/.test(e.textContent)), leaves);
      const d = diff(before, after);
      if (hidden && f.pieces > 50 && d > .2) ok(`feed: "quasar" sent through the real form is torn off (${leaves ? 'a copy; the word stays listed' : 'hidden in the DOM'}, ${f.pieces} mesh vertices) and falls in (pixel change ${d.toFixed(1)})`);
      else fail(`feed: ${leaves ? 'listed' : 'hidden'} ${hidden}, ${f && f.pieces} vertices, pixel change ${d.toFixed(2)}`);
      await E(page, () => { window.__hic.eh.giveBack(); window.__hic.eh.run(5); });
      await page.waitForTimeout(1500);
    }

    // hungry + restore ----------------------------------------------------------------------------------------------------
        const text0 = await E(page, () => [...document.querySelectorAll('canvas [drawable] p')].find(e => e.textContent.trim().length > 40).textContent);
    const hb = await E(page, () => { const h = document.querySelector('#hungry, [data-eh-dock] input[type=checkbox]:nth-of-type(2)'); const r = h.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await page.mouse.click(hb[0], hb[1]); await page.waitForTimeout(200);
    const hungryOn = await E(page, () => window.__hic.eh.state.hungry);
    const eat = await E(page, () => { const h = window.__hic.eh, pg = document.querySelector('canvas [drawable]');
      const p = [...pg.querySelectorAll('p')].find(e => e.textContent.trim().length > 40); const b = HIC.box(pg, p);
      for (let i = 0; i <= 40; i++) { h.moveTo(b[0] + b[2] * i / 40, b[1] + b[3] * .5); h.run(.03); }
      return h.eatenCount(); });
    await page.waitForTimeout(800);
    const pieces = (await st(page)).pieces;
    if (hungryOn && eat >= 5 && pieces > 200) ok(`hungry: switched on by a real click, crossing a paragraph eats ${eat} words (${pieces} mesh vertices)`);
    else fail(`hungry: on ${hungryOn}, ate ${eat} words, ${pieces} vertices`);
    const rb = await E(page, () => { const r = document.querySelector('#restore, [data-eh-dock] button').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await page.mouse.click(rb[0], rb[1]); await page.waitForTimeout(200);
    await E(page, () => window.__hic.eh.run(5)); await page.waitForTimeout(1500); await E(page, () => window.__hic.eh.run(.1)); await page.waitForTimeout(800);
    const back = await E(page, () => ({ eaten: window.__hic.eh.eatenCount(), pieces: window.__hic.eh.pieces(), text: [...document.querySelectorAll('canvas [drawable] p')].find(e => e.textContent.trim().length > 40).textContent }));
    if (back.eaten === 0 && back.pieces === 0 && back.text === text0) ok('restore: a real click gives every word back; no pieces left; the paragraph text is exactly as before');
    else fail(`restore: ${back.eaten} still eaten, ${back.pieces} vertices, text ${back.text === text0 ? 'same' : 'changed'}`);

    // mass ------------------------------------------------------------------------------------------------------------------
    const m = await E(page, () => { const h = window.__hic.eh; h.setMass(0); h.run(.1); const a = h.einstein(); h.setMass(1); h.run(.1); const b = h.einstein(); h.setMass(.45); h.run(.1); return [a, b]; });
    if (m[1] > m[0] * 2) ok(`mass: the slider takes the Einstein radius from ${m[0].toFixed(0)} px to ${m[1].toFixed(0)} px`);
    else fail(`mass: Einstein radius ${m[0].toFixed(0)} → ${m[1].toFixed(0)} px`);

    // sound ---------------------------------------------------------------------------------------------------------------
    const sb = await E(page, () => { const s = document.querySelector('#sound'); if (!s) return null; const r = s.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    if (sb) { await page.mouse.click(sb[0], sb[1]); await page.waitForTimeout(400);
      const en = await E(page, () => window.__hic.eh.sound.enabled);
      if (en) ok('sound: the toggle starts the synthesised sound (Web Audio, no samples)'); else fail('sound: the toggle did not start the sound');
      await page.mouse.click(sb[0], sb[1]); }
  }
});

// determinism: two fresh loads at #still=2 give the same picture
{
  const shots = [];
  for (let i = 0; i < 2; i++) {
    const { browser, page, errors } = await open(file, { hash: `still=2&nointro&q=${q}`, width: 960, height: 600 });
    await waitReady(page, errors); await page.waitForTimeout(1500);
    await drawn(page, 600);
    shots.push(await stats(page, { x: 0, y: 0, width: 960, height: 600 }));
    await browser.close();
  }
  const d = diff(shots[0], shots[1]);
  if (d < .5) console.log(`ok   still: two loads at #still=2 give the same picture (diff ${d.toFixed(3)})`);
  else { console.log(`FAIL still: two loads at #still=2 differ by ${d.toFixed(3)}`); process.exitCode = 1; }
}
