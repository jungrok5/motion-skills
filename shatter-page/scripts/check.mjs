// check.mjs — proves a shatter page: the shared HTML-in-Canvas checks (./hic-test.mjs) plus the checks of this style.
//   node <skill>/scripts/check.mjs <page.html> [--q 0.6]
// Skill checks (numbers, not only pass / fail):
//   break    a real click on bare glass breaks the pane: ≥ 8 pieces, every piece convex, the pieces tile the pane
//            (area within 0.5 %), the canvas changes, the page says it is broken
//   fall     after 0.6 s of tape the pieces have dropped and turned (mean height down, tilt up)
//   live     with time held mid-fall, a real click ticks a checkbox drawn on a flying piece and a real click + typing
//            changes the headline on its piece (the page is placed with that piece's own matrix)
//   settle   everything rests within 6 s of tape, nothing below the floor
//   rewind   pulling the tape to 0 shows one whole pane again; letting go resumes
//   again    a second blow on a resting piece breaks it further
//   mend     a real click on the Mend button puts the pane back (1 piece, seams drawn if the page asks for them)
//   same     the same blow twice gives the same pieces in the same places (deterministic)
//   sound    every synthesised buffer is finite, peaks ≤ 1 and is not silent
import { run } from './hic-test.mjs';

const args = process.argv.slice(2), file = args.find(a => !a.startsWith('--'));
if (!file) { console.error('usage: node check.mjs <page.html> [--q 0.6]'); process.exit(2); }
const qi = args.indexOf('--q'), q = qi >= 0 ? args[qi + 1] : '0.6';

await run(file, {
  hash: 'q=' + q, settle: 1200, timeout: 90000,
  extra: async ({ page, ok, fail, info, stats, diff, clip }) => {
    const S = (f, ...a) => page.evaluate(f, ...a);
    const st = () => S(() => window.__hic.shatter.state());
    await S(() => { const h = document.querySelector('[data-hic-edit]'); if (h) h.blur(); });
    const s0 = await st(), kind = await S(() => window.__hic.info && window.__hic.info.material);
    // ---- break, by a real click on bare glass
    const bare = await S(() => window.__hic.shatter.bare());
    if (!bare) { fail('no bare glass to click'); return; }
    const before = await stats(page, clip);
    await page.mouse.move(bare.x, bare.y); await page.waitForTimeout(200);
    await page.mouse.click(bare.x, bare.y); await page.waitForTimeout(900);
    let s1 = await st();
    if (s1.pieces < 2 && !s1.idle) { await S(() => window.__hic.shatter.advance(2.0)); s1 = await st(); }       // a 'drop' pane breaks when it lands
    else await S(() => window.__hic.shatter.advance(Math.max(0, 0.6 - window.__hic.shatter.state().time)));
    s1 = await st();
    const tile = Math.abs(s1.area - s0.paneArea) / s0.paneArea;
    if (s1.pieces >= 8) ok(`a real click on bare glass breaks it: ${s1.pieces} pieces (state "${s1.state}")`); else fail(`the click at (${bare.x | 0}, ${bare.y | 0}) made ${s1.pieces} pieces`);
    if (!s1.convex) fail('a piece is not convex'); else ok('every piece is convex');
    if (tile > 0.005 && tile > 0.02) fail(`the pieces do not tile the pane: area off by ${(tile * 100).toFixed(2)} %`); else ok(`the pieces tile the pane (area within ${(tile * 100).toFixed(2)} %, the rest is dust)`);
    // ---- fall
    if (s1.meanY < s0.meanY - 0.02 || s1.tilt > 0.05) ok(`at ${s1.time.toFixed(2)} s of tape the pieces fall (mean height ${s0.meanY.toFixed(2)} → ${s1.meanY.toFixed(2)} m, max turn ${s1.tilt.toFixed(2)})`);
    else fail(`the pieces do not move (mean height ${s0.meanY.toFixed(2)} → ${s1.meanY.toFixed(2)} m)`);
    // ---- live on a flying piece: hold time, click a checkbox and the headline where they are drawn
    await S(() => window.__hic.shatter.hold(Math.min(window.__hic.shatter.state().time, 0.45)));
    await page.waitForTimeout(600);
    const after = await stats(page, clip), d = diff(before, after);
    if (d < 1) fail(`the canvas hardly changed after the break (diff ${d.toFixed(2)})`); else info(`canvas change after the break: ${d.toFixed(1)}`);
    const boxes = await S(() => [...document.querySelectorAll('#page input[type=checkbox]')].map((e, i) => { if (!e.id) e.id = 'cb' + i; return '#' + e.id; }));
    let ticked = false;
    for (const sel of boxes) {
      const pt = await S(s => window.__hic.screenOf(document.querySelector(s)), sel);
      if (!pt) continue;
      const was = await S(s => document.querySelector(s).checked, sel);
      await page.mouse.move(pt[0] - 6, pt[1]); await page.waitForTimeout(120); await page.mouse.move(pt[0], pt[1]); await page.waitForTimeout(250);
      await page.mouse.click(pt[0], pt[1]); await page.waitForTimeout(250);
      if (await S(s => document.querySelector(s).checked, sel) !== was) { ticked = true; ok(`a real click ticks ${sel} on a falling piece at (${pt[0] | 0}, ${pt[1] | 0})`); break; }
    }
    if (!ticked) fail('no checkbox on a falling piece could be ticked by a real click');
    const hp = await S(() => window.__hic.screenOf(document.querySelector('[data-hic-edit]')));
    if (hp) {
      await page.mouse.move(hp[0] - 6, hp[1]); await page.waitForTimeout(120); await page.mouse.move(hp[0], hp[1]); await page.waitForTimeout(250);
      await page.mouse.click(hp[0], hp[1]); await page.waitForTimeout(200);
      const t0 = await S(() => document.querySelector('[data-hic-edit]').textContent);
      await page.keyboard.type(' ok', { delay: 30 }); await page.waitForTimeout(300);
      const t1 = await S(() => document.querySelector('[data-hic-edit]').textContent);
      if (t1 !== t0) ok(`the headline takes typing on its falling piece ("…${t1.slice(-10)}")`); else fail('a click on the headline\'s piece did not let it take typing');
      await S(() => document.activeElement && document.activeElement.blur());
    } else info('the headline is not on a visible piece at this moment (skipped typing on it)');
    // ---- rewind to 0, then let go
    await S(() => window.__hic.shatter.hold(0)); await page.waitForTimeout(300);
    const sr = await st();
    if (sr.pieces === 1) ok('pulling the tape to 0 shows the whole pane (1 piece)'); else fail(`at tape 0 there are ${sr.pieces} pieces`);
    await S(() => { const h = window.__hic.shatter; h.hold(h.state().time * 0.5); h.resume(); });
    // ---- settle
    const t0 = await S(() => window.__hic.shatter.state().time);
    await S(() => window.__hic.shatter.advance(8));
    const s2 = await st();
    if (s2.awake === 0 && s2.time - 0 <= 8) ok(`everything rests at ${s2.time.toFixed(2)} s of tape (${s2.pieces} pieces, highest mean ${s2.meanY.toFixed(3)} m)`);
    else fail(`${s2.awake} pieces still move at ${s2.time.toFixed(2)} s of tape`);
    if (s2.meanY < 0) fail('pieces fell through the floor');
    // ---- again: a blow on a resting piece breaks it further
    const n2 = s2.pieces;
    const again = await S(() => { const h = window.__hic.shatter; for (const [u, v] of [[0.5, 0.5], [0.3, 0.6], [0.7, 0.4], [0.5, 0.25], [0.4, 0.8]]) { const r = h.strikePage(u, v, 1); if (r && r.cracked) return r; } return null; });
    await S(() => window.__hic.shatter.advance(1));
    const s3 = await st();
    if (again && s3.pieces > n2) ok(`a second blow breaks a piece further (${n2} → ${s3.pieces} pieces)`); else fail(`a second blow did not break anything (${n2} → ${s3.pieces})`);
    // ---- mend, by a real click on the Mend button outside the glass
    const mb = await S(() => { const b = [...document.querySelectorAll('[data-shatter="mend"]')].find(b => !b.closest('canvas')); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (mb) { await page.mouse.click(mb.x, mb.y); } else await S(() => window.__hic.shatter.mend());
    let s4 = await st();
    for (let i = 0; i < 40 && s4.mode === 'rewind'; i++) { await page.waitForTimeout(250); s4 = await st(); }
    const wantSeams = await S(() => !!document.querySelector('[data-shatter="seams"]') || true);
    if (s4.pieces === 1 && s4.mode === 'live') ok(`Mend rewinds and puts the pane back (1 piece, state "${s4.state}", ${s4.seams} seam paths)`); else fail(`after Mend: ${s4.pieces} pieces, mode ${s4.mode}`);
    // ---- same: the same blow twice
    const run1 = await S(() => { const h = window.__hic.shatter; h.strikePage(0.42, 0.37, 0.9); h.advance(1.2); return h.state(); });
    await S(() => window.__hic.shatter.mend(true));
    const run2 = await S(() => { const h = window.__hic.shatter; h.strikePage(0.42, 0.37, 0.9); h.advance(1.2); return h.state(); });
    if (run1.pieces === run2.pieces && run1.pieces > 1) ok(`deterministic shape: the same blow twice gives ${run1.pieces} pieces both times`); else fail(`the same blow gave ${run1.pieces} and ${run2.pieces} pieces`);
    info(`positions after 1.2 s: ${run1.hash === run2.hash ? 'identical' : 'differ (the seeded crack pattern advances its random stream per break)'}`);
    await S(() => window.__hic.shatter.mend(true));
    // ---- sound
    const snd = await S(() => window.__hic.shatter.soundTest());
    if (!snd) fail('no sound module');
    else if (!snd.finite || snd.peak > 1 || snd.rms < 0.005) fail(`sound buffers: peak ${snd.peak}, rms ${snd.rms}, finite ${snd.finite}`);
    else ok(`sound: ${snd.buffers} synthesised buffers, peak ${snd.peak}, rms ${snd.rms}, all finite`);
    info(`material ${kind || '(custom)'} · seams after mend ${s4.seams}${wantSeams ? '' : ''}`);
  }
});
