// check.mjs — proves a jelly page: the shared HTML-in-Canvas checks (hic-test.mjs run()) plus the jelly's own, with numbers.
//   node <skill>/scripts/check.mjs <page.html>
// Jelly checks (each prints ok / FAIL and its numbers):
//   pull      a real press-and-drag on the jelly moves its surface > 18 px on screen
//   settle    after the release it wobbles (peak > 3 px at 0.25 s) and settles within 3 s (< 1 px, energy tiny)
//   live      mid-wobble (held still while the click lands, since software GL draws ~1 fps), a real click on a flavour
//             control through the deformed warp reaches it and changes the flavour
//   colour    the flavour change recolours the jelly (mean colour of the slab moves)
//   drop      a real click on the drop button lifts the slab (> .3 units), it lands, squashes (> .04) and settles in 4 s
//   melt      temperature to the top melts it flat (m < .02 in 2.5 s); the flat page is still clickable and typeable;
//             cooling sets it again (m > .98)
//   sound     no AudioContext exists before a gesture; a sound toggle exists outside the canvas
//   still     two loads of #still=0.9&act=drop give the same picture
import { run, open, waitReady, stats, diff } from './hic-test.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: check.mjs <page.html>'); process.exit(1); }

async function extra(t) {
  const { page, ok, fail, info } = t;
  const J = (fn, arg) => page.evaluate(fn, arg);
  const scr = await J(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.left, y: c.top }; });
  const info0 = await J(() => window.__hic.info);
  info(`mesh ${info0.mesh} · wobble grid ${info0.grid} · page ${info0.page} · upload ${info0.upload}`);

  // --- pull: press on the front shoulder (no page drawn there, so the press reaches the canvas) and drag
  await J(() => window.__jelly.settle());
  await page.waitForTimeout(400);
  const g = await J(() => {
    const j = window.__jelly, M = j.mould;
    for (const f of [0.86, 0.8, 0.9, 0.74]) {
      const y = -M.B * f, h = M.h(0, y), p = j.project([0.25, y, h]), m = j.mapPoint(p[0], p[1]);
      if (m.hit && m.ex === null) return { x: p[0], y: p[1] };
    }
    const p = j.project([0, -M.B * 0.85, M.H0 * 0.6]); return { x: p[0], y: p[1] };
  });
  const pxPerUnit = await J(() => { const j = window.__jelly, a = j.project([0, 0, 0.3]), b = j.project([0.1, 0, 0.3]); return Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1; });
  await page.mouse.move(scr.x + g.x, scr.y + g.y); await page.waitForTimeout(150);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(scr.x + g.x + 22 * i, scr.y + g.y + 8 * i); await page.waitForTimeout(60); }
  await page.waitForTimeout(500);
  const pulled = await J(() => ({ grab: !!window.__jelly.wobble.grab, peak: window.__jelly.peak() }));
  const pullPx = pulled.peak * pxPerUnit;
  if (!pulled.grab) fail('a press on the jelly did not grab it');
  else if (pullPx < 18) fail(`the pull moved the surface only ${pullPx.toFixed(1)} px`);
  else ok(`pull: a real drag grabs the jelly and moves its surface ${pullPx.toFixed(0)} px`);
  await J(() => { window.__jelly.state.held = true; });
  await page.mouse.up(); await page.waitForTimeout(50);
  const wob = await J(() => { const j = window.__jelly; j.release(); j.tick(0.25); const a = j.peak(); j.tick(2.75); return { a, b: j.peak(), e: j.energy() }; });
  const aPx = wob.a * pxPerUnit, bPx = wob.b * pxPerUnit;
  if (aPx < 3) fail(`no wobble after the release (peak ${aPx.toFixed(1)} px at 0.25 s)`);
  else if (bPx > 1) fail(`still moving 3 s after the release (peak ${bPx.toFixed(2)} px)`);
  else ok(`settle: wobbles ${aPx.toFixed(0)} px at 0.25 s, ${bPx.toFixed(2)} px at 3 s (energy ${wob.e.toExponential(1)})`);

  // --- live mid-wobble: click a flavour control that is not the current one
  const flav = await J(() => {
    const j = window.__jelly; j.settle(); j.state.freeze = true;   // hold the wobble still (deformed) while the real click lands: software GL draws ~1 fps
    const radios = [...j.page.querySelectorAll('input[type=radio]')];
    const r = radios.find(x => !x.checked); if (!r) return null;
    if (!r.id) r.id = 'chk-radio';
    const target = r.closest('label') || r;
    if (!target.id) target.id = 'chk-radio-label';
    const b = window.HIC.box(j.page, target);
    j.poke(b[0] + b[2] / 2, b[1] + b[3] / 2 - 60, 1.4); j.tick(0.15);
    const p = j.screenOf(target);
    return { id: r.id, value: r.value, x: p[0], y: p[1], before: j.flavour() };
  });
  if (flav) {
    const col0 = await J(() => window.__jellyCol());
    await page.mouse.move(scr.x + flav.x - 4, scr.y + flav.y); await page.mouse.move(scr.x + flav.x, scr.y + flav.y); await page.waitForTimeout(60);
    await page.mouse.click(scr.x + flav.x, scr.y + flav.y); await page.waitForTimeout(150);
    const after = await J((id) => { window.__jelly.state.freeze = false; return { checked: document.getElementById(id).checked, f: window.__jelly.flavour() }; }, flav.id);
    if (after.checked && after.f === flav.value) ok(`live: mid-wobble, a real click picks the flavour "${flav.value}" through the warp`);
    else fail(`mid-wobble click missed the flavour control (checked ${after.checked}, flavour ${after.f})`);
    const col1 = await J(() => { window.__jelly.tick(1.5); return window.__jellyCol(); });
    const dc = Math.hypot(col1[0] - col0[0], col1[1] - col0[1], col1[2] - col0[2]);
    if (dc < 12) fail(`the flavour did not recolour the jelly (mean colour moved ${dc.toFixed(1)})`);
    else ok(`colour: the slab's mean colour moved ${dc.toFixed(0)} (${col0.map(Math.round)} → ${col1.map(Math.round)})`);
  } else info('no flavour radios on this page: live/colour checks skipped');

  // --- drop: a real click on the drop button
  const dropSel = await J(() => { const b = window.__jelly.page.querySelector('[data-jelly-drop]') || window.__jelly.page.querySelector('#drop'); if (!b) return null; window.__jelly.settle(); return '#' + (b.id || (b.id = 'chk-drop')); });
  if (dropSel) {
    const p = await J((s) => window.__jelly.screenOf(document.querySelector(s)), dropSel);
    await page.mouse.move(scr.x + p[0], scr.y + p[1]); await page.waitForTimeout(60);
    await J(() => { window.__jelly.state.freeze = true; });
    await page.mouse.click(scr.x + p[0], scr.y + p[1]); await page.waitForTimeout(80);
    const d = await J(() => {
      const j = window.__jelly, st = j.state; j.state.freeze = false;
      const started = st.drop > 0; let lift = 0, sq = 0, landed = -1;
      for (let i = 0; i < 90; i++) { j.tick(1 / 60 * 2); lift = Math.max(lift, st.lift); sq = Math.max(sq, j.wobble.bu[3]); if (landed < 0 && i > 5 && st.drop === 0) landed = i * 2 / 60; }
      j.tick(2.5); return { started, lift, sq, landed, rest: j.peak(), lifted: st.lift };
    });
    if (!d.started) fail('a click on the drop button did not start a drop');
    else if (d.lift < 0.3 || d.landed < 0 || d.sq < 0.04) fail(`drop: lift ${d.lift.toFixed(2)}, landed at ${d.landed}s, squash ${d.sq.toFixed(3)}`);
    else if (d.rest * pxPerUnit > 1 || d.lifted !== 0) fail(`drop: not settled 4 s later (peak ${(d.rest * pxPerUnit).toFixed(2)} px)`);
    else ok(`drop: a real click lifts it ${d.lift.toFixed(2)} u, it lands at ${d.landed.toFixed(2)} s, squashes ${d.sq.toFixed(3)}, settles by 4 s`);
  } else info('no drop button: drop check skipped');

  // --- melt: the range to the top, then the flat page is still a page
  const range = await J(() => { const r = window.__jelly.page.querySelector('input[type=range]'); if (!r) return null; r.id = r.id || 'chk-range'; return { id: r.id, max: r.max || '1', v: r.value }; });
  if (range) {
    const m = await J((r) => { const el = document.getElementById(r.id); el.value = r.max; el.dispatchEvent(new Event('input', { bubbles: true })); window.__jelly.tick(2.5); return window.__jelly.state.m; }, range);
    if (m > 0.02) fail(`melt: m = ${m.toFixed(3)} 2.5 s after the temperature went to the top`); else ok(`melt: flat after 2.5 s (m ${m.toFixed(3)})`);
    await page.waitForTimeout(600);
    const edit = await J(() => { const e = window.__jelly.page.querySelector('[data-hic-edit]'); const p = window.__jelly.screenOf(e); return { id: e.id, x: p[0], y: p[1], before: e.textContent }; });
    await page.mouse.move(scr.x + edit.x - 3, scr.y + edit.y); await page.mouse.move(scr.x + edit.x, scr.y + edit.y); await page.waitForTimeout(80);
    await page.mouse.click(scr.x + edit.x, scr.y + edit.y); await page.waitForTimeout(120);
    await page.keyboard.press('End'); await page.keyboard.type('!', { delay: 30 }); await page.waitForTimeout(200);
    const after = await J((id) => document.getElementById(id).textContent, edit.id);
    if (after !== edit.before) ok('melt: the melted, flat page is still clickable and typeable'); else fail('melt: could not type into the flat page');
    const m2 = await J((r) => { const el = document.getElementById(r.id); el.value = r.v; el.dispatchEvent(new Event('input', { bubbles: true })); window.__jelly.tick(2.5); return window.__jelly.state.m; }, range);
    if (m2 < 0.98) fail(`cooling did not set it again (m ${m2.toFixed(3)})`); else ok(`melt: cooling sets it again (m ${m2.toFixed(3)})`);
  } else info('no temperature range: melt check skipped');

  // --- sound
  const s = await J(() => ({ ctx: window.__jelly.sound.ctx ? window.__jelly.sound.ctx() : null, btn: !!document.querySelector('body > button[aria-pressed], body > [data-jelly-sound]') }));
  if (s.ctx) fail('an AudioContext exists before any gesture turned sound on'); else ok('sound: no AudioContext until the toggle is pressed');
  if (!s.btn) fail('no sound toggle outside the canvas (a button with aria-pressed)'); else ok('sound: a toggle button sits outside the canvas');
}

// a mean colour of the slab's middle, read back right after a draw (the drawing buffer is not preserved)
const COL = `window.__jellyCol = function () { var j = window.__jelly, gl = j.gl; j.draw(); var c = j.project([0, 0, j.mould.H0]); var dpr = gl.canvas.width / j.S.W;
  var w = 48, x = Math.round(c[0] * dpr) - w / 2, y = gl.canvas.height - Math.round(c[1] * dpr) - w / 2, px = new Uint8Array(w * w * 4); gl.readPixels(x, y, w, w, gl.RGBA, gl.UNSIGNED_BYTE, px);
  var s = [0, 0, 0]; for (var i = 0; i < px.length; i += 4) { s[0] += px[i]; s[1] += px[i + 1]; s[2] += px[i + 2]; } return s.map(function (v) { return v / (w * w); }); };`;

let bad = await run(file, { extra: async (t) => { await t.page.evaluate(COL); await extra(t); } });

// determinism of a still with an act
const shot = async () => {
  const { browser, page, errors } = await open(file, { hash: 'still=0.9&act=drop', width: 960, height: 600 });
  await waitReady(page, errors, 60000);
  await page.waitForFunction(() => window.__hic.owed === 0, null, { timeout: 60000 }); await page.waitForTimeout(500);
  const s = await stats(page, { x: 0, y: 0, width: 960, height: 600 }); await browser.close(); return s;
};
const a = await shot(), b = await shot(), d = diff(a, b);
if (d > 0.5) { console.log(`FAIL still: two loads of #still=0.9&act=drop differ (${d.toFixed(2)})`); bad++; process.exitCode = 1; }
else console.log(`ok   still: #still=0.9&act=drop is the same picture on two loads (diff ${d.toFixed(2)})`);
console.log(bad ? `\n${bad} check(s) failed in total` : '\njelly checks passed');
