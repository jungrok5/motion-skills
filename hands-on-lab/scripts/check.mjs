// Check a course before you trust a still: data, model, every lesson on the page, the tour, the phone layout.
// Run from a directory that contains both the course and lib/ (the project root; for the skill's examples, the skill folder):
//   node <skill>/scripts/check.mjs <course>            <course> = the project folder or its index.html
// Exit code 1 if anything fails. Warnings do not fail.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { serve, browser, args, pageOf } from './_lib.mjs';

const { a } = args(process.argv);
const [course] = a;
if (!course) { console.error('usage: check.mjs <course>'); process.exit(1); }
const fails = [], warns = [];
const fail = (m) => fails.push(m), warn = (m) => warns.push(m);

const { server, url, misses } = serve();
const br = await browser();
const page = pageOf(course);

// ---------- 1. data and model (in the page, so the course's own imports resolve) ----------
const tab = await br.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
tab.on('pageerror', (e) => errors.push(String(e)));
tab.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await tab.goto(url(page, 'render&nothumbs'));
await tab.evaluate(() => window.ready);

const data = await tab.evaluate(() => {
  const { course, lessons } = window.lab, langs = course.langs || ['en'];
  const out = { fails: [], warns: [] }, F = (m) => out.fails.push(m), W = (m) => out.warns.push(m);
  const isText = (o) => o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length && Object.keys(o).every((k) => /^[a-z]{2}(-[A-Z]{2})?$/.test(k)) && Object.keys(o).some((k) => langs.includes(k) || k === 'en');
  const texts = (o, where, seen = new Set()) => {
    if (!o || typeof o !== 'object' || seen.has(o)) return; seen.add(o);
    if (isText(o)) { for (const l of langs) if (typeof o[l] !== 'string' || !o[l].trim()) F(`${where}: missing "${l}" text (${JSON.stringify(o).slice(0, 60)})`); return; }
    for (const [k, v] of Object.entries(o)) if (k !== 'units' || where === 'course') texts(v, `${where}.${k}`, seen);
  };
  const bad = (s) => /NaN|undefined|Infinity|\[object/.test(s);
  const strs = (x, where) => { const all = []; const walk = (o) => { if (o == null) return; if (typeof o === 'string') all.push(o); else if (typeof o === 'object') Object.values(o).forEach(walk); }; walk(x); for (const s of all) if (bad(s)) F(`${where}: shows "${s.slice(0, 70)}"`); };
  for (const k of ['title', 'tagline']) if (!course[k]) F(`course: no ${k}`);
  texts({ title: course.title, tagline: course.tagline, experiment: course.experiment }, 'course');
  const ids = new Set();
  for (const L of lessons) {
    const w = `lesson ${L.id}`;
    if (ids.has(L.id)) F(`${w}: duplicate id`); ids.add(L.id);
    for (const k of ['title', 'build', 'solve', 'parts', 'controls', 'overview']) if (!L[k]) F(`${w}: no ${k}`);
    texts(L, w);
    if (!L.maths) W(`${w}: no maths tab content`);
    if (!L.chart) W(`${w}: no chart`);
    if (!L.try?.length) W(`${w}: no "try it" goals (the lesson completes on first touch)`);
    const partIds = new Set((L.parts || []).map((p) => p.id));
    for (const c of L.controls || []) {
      if (c.part && !partIds.has(c.part)) F(`${w}: control ${c.key} points at part "${c.part}" that is not in parts`);
      if (!(c.key in (L.inputs || {}))) F(`${w}: control ${c.key} has no default in inputs`);
    }
    // every control must change something the learner can see (a value, or the bench via rebuild)
    const base = { ...(L.inputs || {}) }; if ('power' in base) base.power = true;
    const m0 = L.init ? L.init(base) : {};
    const sim = (inp) => { let m = L.init ? L.init(inp) : {}; if (L.step) for (let i = 0; i < 120; i++) m = L.step(m, 1 / 60, inp) || m; return L.solve(inp, m); };
    const num = (v) => JSON.stringify(v, (k, x) => (typeof x === 'number' ? +x.toPrecision(6) : x));
    const v0 = sim(base);
    for (const [k, x] of Object.entries(v0)) if (typeof x === 'number' && !Number.isFinite(x)) F(`${w}: value ${k} is ${x} with default inputs`);
    for (const c of L.controls || []) {
      if (c.type === 'power') continue;
      const opts = c.type === 'choice' ? (c.options || []).map((o) => (o && typeof o === 'object' && 'value' in o ? o.value : o))
        : c.type === 'slider' ? [c.min, (c.min + c.max) / 2, c.max] : [true, false];
      let changes = (L.rebuild || []).includes(c.key);
      for (const val of opts) {
        const inp = { ...base, [c.key]: val }, v = sim(inp);
        for (const [k, x] of Object.entries(v)) if (typeof x === 'number' && !Number.isFinite(x)) F(`${w}: ${c.key} = ${JSON.stringify(val)} gives ${k} = ${x}`);
        if (num(v) !== num(v0)) changes = true;
        try {
          const ctx = { inp, build: L.builds?.[0]?.id, lang: langs[0], T: (t) => t, si: window.lab.si, fix: window.lab.fix };
          for (const lang of langs) {
            const T = (t) => (t && typeof t === 'object' && !Array.isArray(t) ? t[lang] : t);
            if (L.maths) strs(L.maths(v, inp, { ...ctx, T, lang }), `${w} maths (${c.key}=${JSON.stringify(val)}, ${lang})`);
            for (const p of L.parts || []) if (p.title) { const t = p.title(inp, v); if (t && typeof t === 'object') texts(t, `${w} part ${p.id} title`); strs(t, `${w} part ${p.id} title`); }
            if (L.chart?.sub) strs(L.chart.sub(v, inp), `${w} chart sub`);
          }
          for (const x of L.try || []) x.when && x.when(inp, v);
        } catch (e) { F(`${w}: ${c.key} = ${JSON.stringify(val)} throws ${e.message}`); }
      }
      if (!changes) F(`${w}: control "${c.key}" changes nothing the learner can see (no value moves and it does not rebuild the bench)`);
    }
    // determinism of the model: same inputs, same steps → same numbers
    if (L.step) { const a = num(sim(base)), b = num(sim(base)); if (a !== b) F(`${w}: step() is not deterministic`); }
  }
  // tour steps point at real things
  for (const s of course.tour?.steps || []) {
    if (s.do === 'lesson' && !lessons.find((L) => L.id === s.id)) out.fails.push(`tour @${s.at}: no lesson "${s.id}"`);
    if (s.do === 'lang' && s.code && !langs.includes(s.code)) out.fails.push(`tour @${s.at}: no language "${s.code}"`);
  }
  return out;
});
fails.push(...data.fails); warns.push(...data.warns);

// ---------- 2. every lesson on the page ----------
const lessons = await tab.evaluate(() => window.lab.lessons.map((L) => ({ id: L.id, builds: (L.builds || []).map((b) => b.id), langs: window.lab.course.langs || ['en'] })));
for (const L of lessons) {
  for (const b of L.builds.length ? L.builds : [null]) for (const on of [false, true]) for (const lang of L.langs) for (const tabId of ['experiment', 'overview', 'parts', 'maths']) {
    if ((tabId !== 'experiment' || lang !== L.langs[0]) && (on === false || b !== (L.builds[0] ?? null))) continue;   // the full matrix only where it matters
    const w = `${L.id}${b ? '/' + b : ''}${on ? '/on' : ''}/${lang}/${tabId}`;
    const r = await tab.evaluate(({ id, b, on, lang, tabId }) => {
      const lab = window.lab;
      lab.go(id); lab.act({ do: 'lang', code: lang }); if (b) lab.act({ do: 'build', id: b });
      const L = lab.lessons.find((x) => x.id === id);
      if (on) { if ((L.controls || []).some((c) => c.type === 'power')) lab.act({ do: 'power', value: true }); }
      lab.act({ do: 'tab', id: tabId }); lab.run(1.5);
      const res = { problems: [], warns: [] };
      const P = (m) => res.problems.push(m);
      const fr = lab.frame(), tol = 6;
      if (fr.x0 < -tol || fr.y0 < -tol || fr.x1 > fr.w + tol || fr.y1 > fr.h + tol) P(`bench sticks out of the frame (${Math.round(fr.x0)},${Math.round(fr.y0)})–(${Math.round(fr.x1)},${Math.round(fr.y1)}) in ${fr.w}×${fr.h}`);
      if (fr.x1 - fr.x0 < fr.w * 0.35 && fr.y1 - fr.y0 < fr.h * 0.35) res.warns.push(`bench is small in the frame (${Math.round(fr.x1 - fr.x0)}×${Math.round(fr.y1 - fr.y0)} px)`);
      const labs = lab.labels().filter((l) => l.visible && l.box);
      for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) {
        const A = labs[i].box, B = labs[j].box;
        if (A.x < B.x + B.w && A.x + A.w > B.x && A.y < B.y + B.h && A.y + A.h > B.y) P(`labels overlap: "${labs[i].text}" / "${labs[j].text}"`);
      }
      const parts = new Map(lab.parts().map((p) => [p.id, p]));
      for (const c of L.controls || []) if (c.part) {
        if (!parts.has(c.part)) P(`part "${c.part}" (control ${c.key}) is not on the bench`);
        if (tabId === 'experiment' && !document.querySelector(`.lab-body .sc [data-part="${c.part}"]`)) P(`part "${c.part}" is not in the schematic`);
      }
      for (const p of L.parts || []) if (!parts.has(p.id) && !(id && p.optional)) res.warns.push(`part "${p.id}" has no mesh on the bench`);
      const body = document.querySelector('.lab-body');
      if (body.scrollWidth > body.clientWidth + 1) P(`panel scrolls sideways (${body.scrollWidth} > ${body.clientWidth})`);
      const txt = document.querySelector('.lab').innerText;
      const m = txt.match(/.{0,30}(NaN|undefined|Infinity|\[object Object\]).{0,20}/); if (m) P(`shows "${m[0].trim()}"`);
      for (const svg of document.querySelectorAll('.lab-body .sc, .lab-chart .ch')) {
        const vb = svg.viewBox.baseVal, bb = svg.getBBox();
        if (bb.x < vb.x - 6 || bb.y < vb.y - 6 || bb.x + bb.width > vb.x + vb.width + 6 || bb.y + bb.height > vb.y + vb.height + 6) P(`${svg.classList.contains('sc') ? 'schematic' : 'chart'} draws outside its box (${Math.round(bb.x)},${Math.round(bb.y)} ${Math.round(bb.width)}×${Math.round(bb.height)} in ${vb.width}×${vb.height})`);
      }
      return res;
    }, { id: L.id, b, on, lang, tabId });
    for (const p of r.problems) fail(`${w}: ${p}`);
    for (const p of r.warns) warn(`${w}: ${p}`);
  }
}

// ---------- 3. tour: targets on screen, deterministic frames ----------
const tt = await tab.evaluate(() => window.lab.tourTargets());
for (const s of tt) if (!s.ok) fail(`tour @${s.at}s ${s.do} ${s.id}: the cursor has nothing on screen to click`);
const dur = await tab.evaluate(() => window.DURATION);
const shot = async (t) => { await tab.evaluate((t) => window.renderAt(t), t); return tab.screenshot(); };
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
for (const t of [dur * 0.3, dur * 0.7]) {
  const a1 = await shot(t); await shot(dur * 0.5); const a2 = await shot(t);
  // exact match, or only anti-aliasing noise (Chromium repaints SVG tiles slightly differently): ≤ 0.1 % pixels, ≤ 24 levels
  const differs = md5(a1) !== md5(a2) && await tab.evaluate(async ([x, y]) => {
    const load = async (b64) => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()); const c = new OffscreenCanvas(bm.width, bm.height), g = c.getContext('2d'); g.drawImage(bm, 0, 0); return g.getImageData(0, 0, bm.width, bm.height).data; };
    const A = await load(x), B = await load(y); let n = 0, big = false;
    for (let i = 0; i < A.length; i += 4) { const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2])); if (d) n++; if (d > 24) big = true; }
    return big || n > A.length / 4 * 0.001;
  }, [a1.toString('base64'), a2.toString('base64')]);
  if (differs) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab-check-'));
    fs.writeFileSync(path.join(dir, 'first.png'), a1); fs.writeFileSync(path.join(dir, 'second.png'), a2);
    fail(`renderAt(${t.toFixed(1)}) is not reproducible — compare ${dir}/first.png and second.png`);
  }
}
if (errors.length) for (const e of [...new Set(errors)].slice(0, 8)) fail(`page error: ${e}`);
await tab.close();

// ---------- 4. live page with thumbnails, at phone width ----------
const ph = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const perr = []; ph.on('pageerror', (e) => perr.push(String(e)));
await ph.goto(url(page)); await ph.evaluate(() => window.ready); await ph.waitForTimeout(400);
const sw = await ph.evaluate(() => document.documentElement.scrollWidth);
if (sw > 391) fail(`phone (390 px): page scrolls sideways (${sw} px wide)`);
const th = await ph.evaluate(() => Object.keys(window.lab.thumbs).length);
const nL = lessons.length; if (th !== nL) fail(`lesson strip: ${th}/${nL} thumbnails drew`);
for (const e of perr) fail(`phone: ${e}`);
await br.close(); server.close();
if (misses.length) for (const m of [...new Set(misses)]) fail(`404 ${m}`);

for (const w of warns) console.log('warn  ' + w);
for (const f of fails) console.log('FAIL  ' + f);
console.log(fails.length ? `\n${fails.length} problem(s)` : `ok: ${nL} lessons, tour of ${tt.length} clicks, phone layout`);
process.exit(fails.length ? 1 : 0);
