// check.mjs — proves a swarm page: the shared HTML-in-Canvas checks (hic-test.mjs run()) plus the swarm's own, with numbers.
//   node scripts/check.mjs <page.html> [--quick]       (--quick skips the phone and fallback runs)
// The page runs at half render scale (#q=0.5) with no intro (#nointro); the flock is stepped by simulated time
// (__swarm.manual + advance), so the numbers are the same on a slow software-GL machine as on a fast one.
import { run, open, waitReady } from './hic-test.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/check.mjs <page.html> [--quick]'); process.exit(2); }
const quick = process.argv.includes('--quick');
const HASH = 'nointro&q=0.5';
const f2 = x => (+x).toFixed(2);

await run(file, {
  hash: HASH, phone: !quick, fallback: !quick, timeout: 90000,
  extra: async ({ page, ok, fail, info }) => {
    const ev = (fn, a) => page.evaluate(fn, a);
    const cfg = await ev(() => ({ info: window.__hic.info, sw: window.__swarm.info(), land: !!document.querySelector('[data-swarm-hold]') }));
    info(`grains ${cfg.sw.grains} (cell ${f2(cfg.sw.cell)} px) · lead birds ${cfg.info.leaders} · neighbours ${cfg.info.neighbours} · creature ${cfg.info.shape}`);
    if (cfg.info.neighbours !== 7) info(`note: topological neighbours set to ${cfg.info.neighbours} (murmurations use 7)`);

    // the idle breathes: with the page formed, a few birds shuffle on the roost now and then (real time)
    const h0 = (await ev(() => window.__swarm.info())).hops; await page.waitForTimeout(4500); const h1 = (await ev(() => window.__swarm.info())).hops;
    if (h1 - h0 < 1) fail(`idle: no bird shuffled on the roost in 4.5 s (hops ${h1 - h0})`); else ok(`idle breathes: ${h1 - h0} small hop(s) on the roost in 4.5 s`);

    // anticipation and the lift-off wave
    await ev(() => { window.__swarm.manual(); window.__swarm.advance(1.5); });
    await ev(() => { window.__swarm.fly(); window.__swarm.advance(0.2, 1 / 60); });
    const g02 = await ev(() => window.__swarm.grains());
    if (g02.quiver < 0.03) fail(`no gathering before lift-off: ${f2(g02.quiver * 100)} % of grains quiver at 0.2 s`); else ok(`gathers before lift-off: ${f2(g02.quiver * 100)} % of grains quiver and crouch at 0.2 s, ${f2(g02.air * 100)} % already up`);
    if (!(g02.air > 0.01 && g02.air < 0.8)) fail(`lift-off is not a wave: ${f2(g02.air * 100)} % airborne at 0.2 s`); else ok(`lift-off runs as a wave from the trigger (${f2(g02.air * 100)} % up at 0.2 s)`);
    await ev(() => window.__swarm.advance(2.8));
    const g3 = await ev(() => window.__swarm.grains());
    if (g3.air < 0.85) fail(`only ${f2(g3.air * 100)} % of the ink is airborne 3 s after the trigger`); else ok(`the page is a flock: ${f2(g3.air * 100)} % of ${g3.ink} ink grains airborne at 3 s, mean ${g3.meanOff | 0} px from home`);
    if (g3.maxAccel > g3.amax * 0.34 + 1) fail(`a grain accelerated at ${g3.maxAccel | 0} px/s² in flight (cap ${g3.amax / 3 | 0})`); else ok(`inertia: flight acceleration ≤ ${g3.maxAccel | 0} px/s² (cap ${g3.amax / 3 | 0}), no instant flips`);
    const tr = await ev(() => window.__swarm.maxTurnRate(2));
    if (tr.maxRate > tr.limit * 1.05) fail(`a lead bird turned at ${f2(tr.maxRate)} rad/s (limit ${f2(tr.limit)})`); else ok(`turn rate ≤ ${f2(tr.maxRate)} rad/s (limit ${f2(tr.limit)} when startled)`);
    const rp = await ev(() => window.__swarm.ripple());
        if (rp.reached <= rp.neighbours || !(rp.last - rp.first > 0.3)) fail(`the turn does not ripple: reached ${rp.reached}/${rp.birds}, first ${f2(rp.first)} s, median ${f2(rp.median)} s`);
    else ok(`a turn ripples through the 7-neighbour flock: ${rp.reached}/${rp.birds} birds beyond the first bird's 7 neighbours follow, first after ${f2(rp.first)} s, half by ${f2(rp.median)} s, last ${f2(rp.last)} s`);
    const wg = await ev(() => window.__swarm.wings(0.4));
    if (cfg.info.shape !== 'plane' && wg.flapping < 0.05) fail(`wings: only ${f2(wg.flapping * 100)} % of birds flap`);
    else if (cfg.info.shape !== 'plane' && cfg.info.shape !== 'firefly' && wg.gliding < 0.03) fail(`wings: no bird glides (${f2(wg.gliding * 100)} %) — the beat never rests`);
    else ok(`wingbeat: mean ${f2(wg.meanHz)} beats/s · ${f2(wg.flapping * 100)} % flapping · ${f2(wg.gliding * 100)} % gliding`);

    // held controls stay put and work; a real click on the place of an element recalls it and it can be typed into
    if (cfg.land) {
      const hl = await ev(() => window.__swarm.offsetIn('[data-swarm-hold]'));
      if (hl.n && hl.max > 0.5) fail(`a held control flew (${f2(hl.max)} px)`); else ok(`held controls stay on the page in flight (max ${f2(hl.max)} px over ${hl.n} grains)`);
    }
    const ed = await ev(() => { const e = document.querySelector('[data-hic-edit]'); const r = e.getBoundingClientRect(); return { x: r.left + Math.min(40, r.width / 3), y: r.top + r.height / 2, t: e.textContent }; });
    await page.mouse.click(ed.x, ed.y); await page.keyboard.press('End'); await page.keyboard.type(' ok', { delay: 30 }); await page.waitForTimeout(300);
    await ev(() => window.__swarm.advance(2.4));
    const rc = await ev(() => ({ o: window.__swarm.offsetIn('[data-hic-edit]'), t: document.querySelector('[data-hic-edit]').textContent, f: document.activeElement === document.querySelector('[data-hic-edit]') }));
    if (!rc.f || rc.t === ed.t) fail(`in flight a click on the headline's place did not make it typeable (focus ${rc.f})`);
    else if (rc.o.max > 1.5) fail(`the typed element did not re-form in flight (max ${f2(rc.o.max)} px)`);
    else ok(`in flight, clicking where a line was recalls its birds: it re-forms (max ${f2(rc.o.max)} px) and takes typing`);
    await ev(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.__swarm.advance(4); });

    // landing: a real click on the held Land control (or land()), then every bird settles, dipping past home first
    const landEl = await ev(() => { const l = document.querySelector('[data-swarm-hold]'); if (!l || !/land|home/i.test(l.textContent + l.id)) return null; const r = l.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (landEl) { await page.mouse.click(landEl.x, landEl.y); await page.waitForTimeout(100); }
    let m = await ev(() => window.__swarm.info().mode);
    if (landEl && m !== 'land') fail(`a real click on Land did not land the flock (mode ${m})`); else if (landEl) ok('a real click on the held Land control lands the flock');
    if (m === 'fly') await ev(() => window.__swarm.land());
    await ev(() => window.__swarm.advance(2.0));
    const gl1 = await ev(() => window.__swarm.grains());
    await ev(() => window.__swarm.advance(3.5));
    const gl = await ev(() => window.__swarm.grains()); m = await ev(() => window.__swarm.info().mode);
    if (!(gl1.away > 0.05 && gl1.away < 0.98)) fail(`landing is not staggered (${f2(gl1.away * 100)} % still away at 2 s)`); else ok(`birds come home in order: ${f2(gl1.away * 100)} % still away 2 s into the landing`);
    if (gl.maxOff > 0.5 || m !== 'rest') fail(`not settled 5.5 s after landing: max ${f2(gl.maxOff)} px off home, mode ${m}`); else ok(`settled: every grain home (max ${f2(gl.maxOff)} px) 5.5 s after Land, page formed again`);
    if (gl.dip < 0.4 || gl.dip > 7) fail(`settle dip ${f2(gl.dip)} px (want a small overshoot, 0.4–7 px)`); else ok(`landing with weight: birds dip ${f2(gl.dip)} px past home and come back`);

    // typing at rest: the new letters fly in and land
    const ep = await ev(() => { const e = document.querySelector('[data-hic-edit]'); const r = e.getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; });
    await page.mouse.click(ep.x, ep.y); await page.keyboard.press('End'); await page.keyboard.type('Wy', { delay: 60 }); await page.waitForTimeout(700);
    await ev(() => window.__swarm.advance(0.05));
    const gt = await ev(() => window.__swarm.grains());
    await ev(() => window.__swarm.advance(2.5));
    const gt2 = await ev(() => window.__swarm.grains());
    if (!(gt.away > 0)) fail('typing at rest: no letter flew in'); else if (gt2.maxOff > 0.5) fail(`typed letters did not settle (${f2(gt2.maxOff)} px)`);
    else ok(`typing at rest: new letters fly in (${(gt.away * gt.ink) | 0} grains) and settle within 2.6 s`);
  }
});

// calm: no idle motion, no intro
{
  const { browser, page, errors } = await open(file, { hash: 'calm&q=0.5' });
  if (await waitReady(page, errors, 90000)) {
    await page.waitForTimeout(3500);
    const i = await page.evaluate(() => window.__swarm.info());
    console.log(i.hops === 0 && i.mode === 'rest' ? `ok   #calm: no idle hops, no intro (mode ${i.mode})` : `FAIL #calm still moves (hops ${i.hops}, mode ${i.mode})`);
    if (!(i.hops === 0 && i.mode === 'rest')) process.exitCode = 1;
  } else { console.log('FAIL #calm: never ready'); process.exitCode = 1; }
  await browser.close();
}
