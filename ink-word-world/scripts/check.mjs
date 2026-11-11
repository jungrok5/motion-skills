#!/usr/bin/env node
// Check a world: node <skill>/scripts/check.mjs <project folder> [--quick] [--no-perform | --only-perform]
// It plays the world under its own clock and fails on anything that would show up as a broken piece:
//   page      loads with no console error and no missing file; WebGL sheet is up; the brush font has every glyph
//   source    world.js uses the world's clock and random source (no Math.random, Date.now, timers)
//   words     every word can be typed, makes something happen on the sheet, and puts nothing at NaN
//   rules     every rule fires when its words are written; every word takes part in at least one rule
//   perform   the whole performance runs: every body obeys its limits (heading, bend, back up, in its element),
//             the sheet neither stays empty nor floods with ink, lines appear, sound cues are made
//   same      the performance is the same twice (deterministic)
//   sound     the performance's sound renders offline, is audible and does not clip
//   cast      cast.html draws, and every kind of body seen in the performance is on it
//   phone     the page fits a 390-px screen with no sideways scroll
import fs from 'node:fs';
import path from 'node:path';
import { open, args, pageOf } from './_lib.mjs';

const { a, bool } = args(process.argv), quick = bool('--quick'), noPerform = bool('--no-perform'), onlyPerform = bool('--only-perform'), target = a[0] || '.';
const file = pageOf(target), dir = path.dirname(path.resolve(file)), fails = [], notes = [];
const ok = (cond, what) => { if (!cond) fails.push(what); return cond; };
const diff = (A, B) => { let n = 0; for (let i = 0; i < A.length; i++) if (Math.abs(A[i] - B[i]) > .04) n++; return n / A.length; };
const line = (name, text) => console.log(`${name.padEnd(8)} ${text}`);

// source
const srcFile = path.join(dir, 'world.js');
if (ok(fs.existsSync(srcFile), 'source: world.js not found next to the page')) {
  const src = fs.readFileSync(srcFile, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  for (const bad of ['Math.random', 'Date.now', 'performance.now', 'setTimeout', 'setInterval', 'new Date']) ok(!src.includes(bad), `source: world.js uses ${bad} — use w.rand / w.t / thing.age so the world plays the same every time`);
  line('source', 'world.js read');
}

// page, words, rules (a coarse sheet is enough and three times faster)
{
  const s = await open(file, { width: 960, height: 540, query: 'drive&q=low' }), I = fn => s.page.evaluate(fn);
  const info = await s.page.evaluate(() => ({ words: __inkworld.words, rules: __inkworld.rules, missing: __inkworld.missingGlyphs(), D: __inkworld.DURATION, script: __inkworld.world.script.map(x => x[0]) }));
  ok(!s.errors.length, 'page: console errors — ' + s.errors.slice(0, 3).join(' | ')); ok(!s.misses.length, 'page: missing files — ' + s.misses.join(', '));
  ok(!info.missing.length, `page: the brush font has no glyph for ${info.missing.join(' ')} — choose another font or subset one that has them (scripts/font.py)`);
  ok(info.words.length >= 4, 'words: a world needs at least four words'); ok(info.rules.length >= 3, 'rules: a world needs at least three rules (things must affect each other)');
  for (const w of info.words) if (!w.keys.some(k => /^[a-z0-9]+$/i.test(k)) && !/^[a-z0-9]+$/i.test(w.id)) notes.push(`words: ${w.id} has no Latin way to type it (keys: ['…']) — it can only be written with an input method or its chip`);
  line('page', `${info.words.length} words · ${info.rules.length} rules · performance ${info.D}s · font ok: ${!info.missing.length}`);

  globalThis.pendingRules = info.rules.filter(r => !(r.when || r.needs)).map(r => r.id); globalThis.info = info;
  if (!onlyPerform) {
  // every word acts
  const acts = async (id, before = []) => s.page.evaluate(async ([id, before]) => {
    const K = __inkworld; K.reset(false); K.advance(150, false);
    for (const b of before) { K.summon(b); K.advance(170, false); }
    K.advance(1); const base = K.thumb(), s0 = K.state(); K.summon(id); K.advance(250); const A = K.thumb(), s1 = K.state();
    return { base, A, s0, s1 };
  }, [id, before]);
  const control = async (before) => s.page.evaluate(async before => { const K = __inkworld; K.reset(false); K.advance(150, false); for (const b of before) { K.summon(b); K.advance(170, false); } K.advance(251); return K.thumb(); }, before);
  let dead = 0;
  for (const w of info.words) {
    // the typed way: the first key, as key presses
    let r = await acts(w.id), d = diff(r.A, r.base), how = 'on an empty sheet';
    const thing = (r.s1.things[w.id] || 0) > 0;
    if (!thing && d < .03 || (!thing && r.s1.night === r.s0.night)) {                                      // a word that only acts on others: give it something to act on
      const others = info.words.filter(o => o.id !== w.id).slice(0, 2).map(o => o.id), c = await control(others); r = await acts(w.id, others); d = diff(r.A, c); how = `after ${others.join(' ')}`;
    }
    ok(r.s1.nan === 0, `words: ${w.id} puts a thing at a non-finite position`);
    if (!ok(d >= .012 || (r.s1.things[w.id] || 0) > 0, `words: ${w.id} changes nothing on the sheet (${how}; ${(d * 100).toFixed(1)}% of it differs)`)) dead++;
  }
  // typing reaches every word
  const typed = await s.page.evaluate(async () => { const K = __inkworld, w = K.world, out = []; for (const d of K.words) { K.reset(false); w._typed((d.keys[0] || d.id), true); if (w.summoned[w.summoned.length - 1]?.id !== d.id) out.push(d.id); } return out; });
  ok(!typed.length, `words: typing does not reach ${typed.join(' ')} (another word's key shadows it?)`);
  ok(!s.errors.length, 'words: errors while summoning — ' + s.errors.slice(0, 3).join(' | '));
  line('words', `${info.words.length - dead}/${info.words.length} act · typing reaches ${info.words.length - typed.length}/${info.words.length}`);

  // rules
  const inRule = new Set(); let fired = 0; const pending = [];
  for (const r of info.rules) {
    const need = r.when || r.needs; if (need) need.forEach(x => inRule.add(x));
    if (!need) { pending.push(r.id); continue; }
    const got = await s.page.evaluate(async ([id, need]) => { const K = __inkworld; K.reset(false); K.advance(130, false); for (const n of need) { K.summon(n); K.advance(60, false); } for (let i = 0; i < 24 && !K.state().fired[id]; i++) K.advance(60, false); return K.state().fired[id] || 0; }, [r.id, need]);
    if (ok(got > 0, `rules: "${r.id}" did not happen within 25 s of writing ${need.join(' + ')}`)) fired++;
    for (const n of need) ok(info.words.some(w => w.id === n), `rules: "${r.id}" needs ${n}, which is not a word of this world`);
  }
  const clearers = info.words.filter(w => !inRule.has(w.id)).map(w => w.id);
  // a word may stay out of the rules only if it is the one that empties the sheet
  const lonely = []; for (const id of clearers) { const left = await s.page.evaluate(async id => { const K = __inkworld; K.reset(false); K.advance(130, false); K.summon(K.words.find(w => w.id !== id).id); K.advance(120, false); K.summon(id); K.advance(200, false); return Object.keys(K.state().things).length; }, id); if (left > 0) lonely.push(id); }
  ok(!lonely.length, `rules: ${lonely.join(' ')} take part in no rule — every thing must affect, or be affected by, another`);
  line('rules', `${fired}/${info.rules.length - pending.length} fire when their words are written${pending.length ? ` · ${pending.length} checked in the performance` : ''}`);
  }
  await s.close();
}

// the performance, twice for determinism (full quality)
if (!noPerform) {
  const info = globalThis.info, run = async (seconds, withAudio) => {
    const s = await open(file, { width: 1280, height: 720 }), t0 = Date.now();
    const r = await s.page.evaluate(async ([seconds, withAudio]) => {
      const K = __inkworld, thumbs = [], inkMax = []; K.reset(true);
      for (let t = 1; t <= seconds; t++) { K.advance(60, t % 6 === 0); if (t % 6 === 0) { thumbs.push(K.thumb()); inkMax.push(K.state().ink); } }
      K.advance(1); const st = K.state(), audio = withAudio ? await K.audio(seconds) : null; if (audio) delete audio.wav;
      return { st, thumbs, inkMax, audio, final: K.thumb() };
    }, [seconds, withAudio]);
    const out = { r, errors: s.errors.slice(), ms: (Date.now() - t0) / (seconds * 60) }; await s.close(); return out;
  };
  const D = quick ? Math.min(30, info.D) : info.D, full = await run(D, true), st = full.r.st;
  ok(!full.errors.length, 'perform: errors — ' + full.errors.slice(0, 3).join(' | '));
  const V = Object.entries(st.violations); for (const [k, v] of V) ok(false, `perform: ${k} — ${v.n} times, worst ${v.worst.toFixed(2)}, first at ${v.t.toFixed(1)}s`);
  ok(st.nan === 0, 'perform: a thing is at a non-finite position');
  const flat = full.r.thumbs.map(t => { const m = t.reduce((a, b) => a + b, 0) / t.length, v = t.reduce((a, b) => a + (b - m) * (b - m), 0) / t.length; return Math.sqrt(v); });
  ok(Math.max(...flat) > .05, 'perform: the sheet stays nearly blank the whole way through');
  ok(Math.max(...full.r.inkMax) < 1.1, `perform: the sheet floods with ink (mean absorbance ${Math.max(...full.r.inkMax).toFixed(2)}) — write less ink, raise fluid.fade, or space the words`);
  if (!quick) {
    const wrote = new Set(st.summoned), unwritten = info.script.filter(x => x !== 'stir' && x !== 'wait' && !wrote.has(x));
    ok(!unwritten.length, `perform: the performance never writes ${unwritten.join(' ')}`);
    const unused = info.words.filter(w => !wrote.has(w.id)).map(w => w.id); if (unused.length) notes.push(`perform: not in the performance: ${unused.join(' ')}`);
    for (const id of globalThis.pendingRules) ok(st.fired[id] > 0, `rules: "${id}" (a condition, no word list) never happened in the performance — give it needs: [...] or perform what triggers it`);
    const n = Object.keys(st.fired).length; ok(n >= Math.ceil(info.rules.length * .5), `perform: only ${n} of ${info.rules.length} rules happen in the performance — order the words so things meet`);
    ok(st.lines.length >= 3, 'perform: fewer than three lines appear at the side');
  }
  ok(Object.keys(st.cues).length >= 4, 'perform: almost no sound cues'); ok(full.r.audio.rms > .004, `sound: the performance is nearly silent (rms ${full.r.audio.rms.toFixed(4)})`);
  ok(full.r.audio.peak < 1.6, `sound: far too loud before limiting (peak ${full.r.audio.peak.toFixed(2)}) — lower voice volumes`);
  line('perform', `${D}s · ${Object.keys(st.bodies).map(k => k).join(' ') || 'no bodies'} · violations ${V.length} · ${Object.keys(st.fired).length}/${info.rules.length} rules · ${st.lines.length} lines · ${full.ms.toFixed(0)} ms/step here`);
  line('sound', `${full.r.audio.cues} cues · peak ${full.r.audio.peak.toFixed(2)} · rms ${full.r.audio.rms.toFixed(3)}`);
  const A = await run(8, false), B = await run(8, false);
  ok(A.r.st.hash === B.r.st.hash && diff(A.r.final, B.r.final) < .002, 'same: two runs of the first 8 s differ — something uses a clock or random source outside the world');
  line('same', A.r.st.hash === B.r.st.hash ? 'two runs agree' : 'two runs differ');
  globalThis.bodies = Object.keys(st.bodies);
}

// cast sheet
const castFile = path.join(dir, 'cast.html');
if (fs.existsSync(castFile)) {
  const { browser, serve, rootOf } = await import('./_lib.mjs'), sv = serve(rootOf(castFile)), b = await browser(), p = await b.newPage({ viewport: { width: 1400, height: 900 } }), errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
  await p.goto(sv.url(castFile)); const c = await p.waitForFunction(() => window.__cast && window.__cast.ready && window.__cast, null, { timeout: 30000 }).then(h => h.jsonValue()).catch(() => null);
  ok(c, 'cast: cast.html did not finish drawing'); ok(!errs.length, 'cast: errors — ' + errs.slice(0, 3).join(' | '));
  if (c && globalThis.bodies) { const missing = globalThis.bodies.filter(k => !c.creatures.includes(k)); ok(!missing.length, `cast: ${missing.join(' ')} move in the performance but are not on the cast sheet (export them in \`cast\`)`); }
  line('cast', c ? `${c.creatures.join(' ')}` : 'failed'); await b.close(); sv.server.close();
} else if (globalThis.bodies && globalThis.bodies.length) ok(false, `cast: this world has creatures (${globalThis.bodies.join(' ')}) but no cast.html`);

// phone
{
  const s = await open(file, { width: 390, height: 844, scale: 2, query: 'drive&q=low' });
  const r = await s.page.evaluate(() => { __inkworld.advance(30); const chips = document.querySelector('.iw-chips').getBoundingClientRect(), b = document.querySelector('.iw-btns').getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, iw: innerWidth, chips: [chips.left, chips.right, chips.top, chips.bottom], btn: [b.left, b.right], ih: innerHeight }; });
  ok(r.sw <= r.iw + 1, `phone: the page scrolls sideways at 390 px (${r.sw} > ${r.iw})`); ok(r.chips[0] >= -1 && r.chips[1] <= r.iw + 1 && r.chips[3] <= r.ih + 1, 'phone: the row of words does not fit a 390-px screen');
  ok(r.chips[2] > r.ih * .45, 'phone: the words cover more than half of a phone screen — fewer chips (chip: false) or shorter words'); ok(!s.errors.length, 'phone: errors — ' + s.errors.slice(0, 2).join(' | '));
  line('phone', `390 px: fits, words take ${Math.round((r.ih - r.chips[2]) / r.ih * 100)}% of the height`); await s.close();
}

for (const n of notes) console.log('note     ' + n);
if (fails.length) { console.log(`\nFAILED (${fails.length})`); for (const f of fails) console.log('  ✗ ' + f); process.exit(1); }
console.log('\nOK');
