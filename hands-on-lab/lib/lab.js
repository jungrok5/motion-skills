// hands-on-lab · the course app. mountLab(course) builds the shell (header, bench, panel, lesson strip), runs each lesson's
// model on a fixed step, keeps the 3D bench, the schematic, the chart and the maths on the same numbers, and plays a
// scripted tour that renders frame by frame (window.renderAt(t)).
import { createStage, THREE } from './stage.js';
import { CHROME, LANG_NAMES, makeT, esc, si, fix, schematic, chartSVG, mathsHTML, ICON } from './ui.js';

export { si, fix, THREE };
const H = 1 / 60;                       // fixed simulation step (s)
const Q = new URLSearchParams(location.search);
const MODE = Q.has('render') ? 'render' : Q.has('tour') ? 'tour' : 'live';

export function mountLab(course, host = document.getElementById('lab')) {
  // ---------- course index ----------
  const lessons = [], unitOf = new Map();
  for (const u of course.units) for (const L of u.lessons) { lessons.push(L); unitOf.set(L.id, u); }
  const byId = new Map(lessons.map((L) => [L.id, L]));
  const langs = course.langs || ['en'];
  const chrome = (l) => ({ ...CHROME.en, ...(CHROME[l] || {}), ...((course.chrome || {})[l] || {}) });

  let st = initialState();
  let world = newWorld(st);
  const T = makeT(() => st.lang);
  const C = (k) => chrome(st.lang)[k] ?? k;

  function initialState() {
    const start = (MODE === 'live' ? null : course.tour?.start) || {};
    const s = {
      lang: Q.get('lang') || start.lang || (MODE === 'live' && langPref()) || langs[0],
      lesson: Q.get('lesson') || start.lesson || lessons[0].id,
      tab: Q.get('tab') || start.tab || 'experiment',
      inp: {}, build: {}, selected: {}, done: {}, touched: {},
      cam: { az: 0, el: 0, zoom: 1 }, tween: null, diagram: false, chart: MODE !== 'live' || window.innerWidth > 760, menu: null,
    };
    if (!byId.has(s.lesson)) s.lesson = lessons[0].id;
    if (!langs.includes(s.lang)) s.lang = langs[0];
    for (const L of lessons) {
      s.inp[L.id] = { ...(L.inputs || {}) };
      s.build[L.id] = L.builds?.[0]?.id ?? null;
      s.selected[L.id] = firstPick(L);
      s.done[L.id] = (L.try || []).map(() => false);
    }
    if (MODE === 'live') restore(s);
    if (Q.get('build')) s.build[s.lesson] = Q.get('build');
    resetCam(s);
    return s;
  }
  function firstPick(L) { return (L.controls || []).find((c) => c.part)?.part ?? L.parts?.[0]?.id ?? null; }
  function resetCam(s) { const v = byId.get(s.lesson).view || {}; s.cam = { az: v.az ?? 35, el: v.el ?? 30, zoom: v.zoom ?? 1 }; s.tween = null; }
  function langPref() { const l = (navigator.language || 'en').slice(0, 2); return langs.includes(l) ? l : null; }
  function restore(s) {
    try { const d = JSON.parse(localStorage.getItem('hands-on-lab:' + course.id) || '{}'); for (const id in d.done || {}) if (s.done[id]) s.done[id] = s.done[id].map((x, i) => !!d.done[id][i]); if (d.lang && langs.includes(d.lang) && !Q.get('lang')) s.lang = d.lang; } catch { /* storage off */ }
  }
  function save() { if (MODE !== 'live') return; try { localStorage.setItem('hands-on-lab:' + course.id, JSON.stringify({ done: st.done, lang: st.lang })); } catch { /* storage off */ } }

  // ---------- the model ----------
  const L0 = () => byId.get(st.lesson);
  function newWorld(s) {
    const L = byId.get(s.lesson), inp = s.inp[L.id];
    return { t: 0, m: L.init ? L.init(inp) : {}, phase: {}, rate: {}, hist: [], lastSample: -1 };
  }
  function resetWorld(w, s) { const L = byId.get(s.lesson); w.m = L.init ? L.init(s.inp[L.id]) : {}; w.phase = {}; w.rate = {}; w.hist = []; w.lastSample = -1; }
  function solve(L, inp, m) { const v = L.solve ? L.solve(inp, m || {}) : {}; v.flows = v.flows || {}; return v; }
  function stepWorld(w, s) {
    const L = byId.get(s.lesson), inp = s.inp[L.id];
    if (L.step) w.m = L.step(w.m, H, inp) || w.m;
    const v = solve(L, inp, w.m);
    for (const k in v.flows) w.phase[k] = (w.phase[k] || 0) + v.flows[k] * H;
    w.rate = v.flows;
    w.t += H;
    if (L.chart?.kind === 'time' && w.t - w.lastSample >= 0.05 - 1e-9) {
      w.lastSample = w.t; w.hist.push([w.t, L.chart.y.of(v, inp)]);
      const keep = (L.chart.x.window ?? 10) + 0.5; while (w.hist.length && w.hist[0][0] < w.t - keep) w.hist.shift();
    }
    checkTry(L, s, inp, v);
  }
  function advance(w, s, until) { let n = 0; while (w.t + H <= until + 1e-9 && n++ < 100000) stepWorld(w, s); }
  function checkTry(L, s, inp, v) {
    const d = s.done[L.id];
    (L.try || []).forEach((x, i) => { if (!d[i] && x.when && x.when(inp, v)) { d[i] = true; if (s === st) save(); } });
  }
  const lessonDone = (s, id) => { const d = s.done[id]; return d.length ? d.every(Boolean) : !!s.touched[id]; };

  // ---------- actions (DOM events and tour steps share these) ----------
  function act(a, s = st, w = world) {
    const L = byId.get(s.lesson), inp = s.inp[L.id];
    switch (a.do) {
      case 'lesson': if (byId.has(a.id) && a.id !== s.lesson) { s.lesson = a.id; resetWorld(w, s); resetCam(s); s.menu = null; s.diagram = false; } break;
      case 'next': case 'prev': {
        const i = lessons.findIndex((x) => x.id === s.lesson) + (a.do === 'next' ? 1 : -1);
        if (i >= 0 && i < lessons.length) act({ do: 'lesson', id: lessons[i].id }, s, w); break;
      }
      case 'tab': s.tab = a.id; break;
      case 'set': {
        inp[a.key] = a.value; s.touched[L.id] = true;
        const c = (L.controls || []).find((x) => x.key === a.key);
        if (c?.part) s.selected[L.id] = c.part;
        if (c?.reset) resetWorld(w, s);
        break;
      }
      case 'toggle': act({ do: 'set', key: a.key, value: !inp[a.key] }, s, w); break;
      case 'power': act({ do: 'set', key: 'power', value: a.value ?? !inp.power }, s, w); break;
      case 'hold': act({ do: 'set', key: a.key, value: !!a.value }, s, w); break;
      case 'select': if (a.part) s.selected[L.id] = a.part; break;
      case 'build': s.build[L.id] = a.id; s.touched[L.id] = true; break;
      case 'lang': s.lang = a.code || langs[(langs.indexOf(s.lang) + 1) % langs.length]; s.menu = null; break;
      case 'menu': s.menu = s.menu === a.id ? null : a.id; break;
      case 'diagram': s.diagram = a.open ?? !s.diagram; break;
      case 'chart': s.chart = a.open ?? !s.chart; break;
      case 'reset': s.inp[L.id] = { ...(L.inputs || {}) }; s.build[L.id] = L.builds?.[0]?.id ?? null; resetWorld(w, s); resetCam(s); break;
      case 'cam': {
        const c = { ...s.cam };
        if (a.op === 'l') c.az -= 30; if (a.op === 'r') c.az += 30;
        if (a.op === 'in') c.zoom = Math.max(0.45, c.zoom * 0.82); if (a.op === 'out') c.zoom = Math.min(2.2, c.zoom / 0.82);
        if (a.op === 'home') { const v = L.view || {}; Object.assign(c, { az: v.az ?? 35, el: v.el ?? 30, zoom: v.zoom ?? 1 }); }
        s.tween = { from: { ...s.cam }, to: c, t0: a.t0 ?? w.t, dur: 0.45 }; s.cam = c; break;
      }
      case 'orbit': {
        const c = { az: a.az ?? s.cam.az, el: a.el ?? s.cam.el, zoom: a.zoom ?? s.cam.zoom };
        s.tween = { from: { ...camNow(s, w.t) }, to: c, t0: a.t0 ?? w.t, dur: a.dur ?? 1.5 }; s.cam = c; break;
      }
      default: break;
    }
  }
  function camNow(s, t) {
    const tw = s.tween; if (!tw) return s.cam;
    const u = Math.min(1, Math.max(0, (t - tw.t0) / tw.dur)), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
    return { az: tw.from.az + (tw.to.az - tw.from.az) * e, el: tw.from.el + (tw.to.el - tw.from.el) * e, zoom: tw.from.zoom + (tw.to.zoom - tw.from.zoom) * e };
  }

  // ---------- shell ----------
  host.classList.add('lab');
  // ?fit: lay the app out at 1280×720 and scale it to the window (an embedded demo); phones keep their own layout
  if (Q.has('fit')) {
    const fit = () => {
      const on = window.innerWidth >= 480 && window.innerWidth < 1280;
      host.classList.toggle('is-fit', on);
      host.style.transform = on ? `scale(${window.innerWidth / 1280})` : '';
      document.documentElement.style.overflow = on ? 'hidden' : '';
    };
    fit(); window.addEventListener('resize', fit);
  }
  if (MODE === 'render') host.classList.add('is-render');   // no CSS transitions: a frame must not depend on when it is captured
  if (course.theme) for (const [k, v] of Object.entries(course.theme)) host.style.setProperty('--' + k, v);
  host.innerHTML = `
    <header class="lab-top">
      <div class="lab-logo">${course.logo || defaultLogo()}</div>
      <div class="lab-title"><h1 data-t="title"></h1><p data-t="tagline"></p></div>
      <div class="lab-prog" data-slot="prog"></div>
      <button class="lab-langbtn" data-act="menu" data-id="lang" data-slot="langbtn"></button>
    </header>
    <nav class="lab-rail" data-slot="rail"></nav>
    <main class="lab-stage" data-slot="stage">
      <div class="lab-tools" data-slot="tools"></div>
      <div class="lab-chart" data-slot="chart"></div>
      <p class="lab-hint" data-slot="hint"></p>
    </main>
    <aside class="lab-panel"><div class="lab-tabs" role="tablist" data-slot="tabs"></div><div class="lab-body" data-slot="body"></div></aside>
    <footer class="lab-strip" data-slot="strip"></footer>
    <div class="lab-pop" data-slot="pop"></div>
    <div class="lab-modal" data-slot="modal" hidden></div>
    <div class="lab-cursor" data-slot="cursor" hidden><svg viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.4-6.6L4 20z"/></svg><i></i></div>`;
  const $ = (n) => host.querySelector(`[data-slot="${n}"]`);
  const slots = Object.fromEntries(['prog', 'langbtn', 'rail', 'stage', 'tools', 'chart', 'hint', 'tabs', 'body', 'strip', 'pop', 'modal', 'cursor'].map((n) => [n, $(n)]));
  const stage = createStage(slots.stage, { preserve: MODE !== 'live' });
  slots.stage.prepend(stage.renderer.domElement);

  const cache = new Map();
  const put = (el, key, html) => { if (!el) return false; if (cache.get(el) === key) return false; cache.set(el, key); el.innerHTML = html; return true; };

  // ---------- scene ----------
  let built = { key: null, update: null };
  function ctxFor(s, L) { return { inp: s.inp[L.id], build: s.build[L.id], lang: s.lang, T, si, fix, C }; }
  function ensureScene(s) {
    const L = byId.get(s.lesson), inp = s.inp[L.id];
    const key = [L.id, s.build[L.id], s.lang, ...(L.rebuild || []).map((k) => JSON.stringify(inp[k]))].join('|');
    if (key === built.key) return;
    const lessonChanged = !built.key || built.key.split('|')[0] !== L.id;
    stage.clear();
    const k = stage.kit();
    built = { key, update: L.build(k, ctxFor(s, L)) || (() => {}) };
    for (const c of L.controls || []) if (c.part && stage.st.parts.has(c.part)) stage.st.parts.get(c.part).pickable = true;
    for (const l of stage.st.labels) if (l.part && stage.st.parts.get(l.part)?.pickable) { l.el.classList.add('is-pick'); l.el.dataset.act = 'select'; }
    built.needFit = lessonChanged || !stage.cam.fit;
  }

  // ---------- panels ----------
  function controlHTML(c, inp, L) {
    const lab = c.label ? `<div class="ctl-l">${esc(T(c.label))}</div>` : '';
    if (c.type === 'choice') {
      const opts = (c.options || []).map((o) => (typeof o === 'object' && o !== null && 'value' in o ? o : { value: o }));
      return `<div class="ctl">${lab}<div class="seg">${opts.map((o) => `<button data-act="set" data-key="${c.key}" data-value='${esc(JSON.stringify(o.value))}' aria-pressed="${JSON.stringify(inp[c.key]) === JSON.stringify(o.value)}">${esc(T(o.label ?? (c.fmt ? c.fmt(o.value) : o.value)))}</button>`).join('')}</div>${c.desc ? `<p class="ctl-d">${esc(T(c.desc))}</p>` : ''}</div>`;
    }
    if (c.type === 'slider') {
      return `<div class="ctl">${lab ? `<div class="ctl-row">${lab}<b class="ctl-v" data-val="${c.key}"></b></div>` : ''}<input type="range" data-act="set" data-key="${c.key}" min="${c.min}" max="${c.max}" step="${c.step ?? (c.max - c.min) / 100}">${c.ends ? `<div class="ctl-ends"><span>${esc(T(c.ends[0]))}</span><span>${esc(T(c.ends[1]))}</span></div>` : ''}</div>`;
    }
    if (c.type === 'toggle') return `<div class="ctl"><button class="tgl" data-act="toggle" data-key="${c.key}" aria-pressed="${!!inp[c.key]}"><i></i><span>${esc(T(c.label))}</span></button>${c.desc ? `<p class="ctl-d">${esc(T(c.desc))}</p>` : ''}</div>`;
    if (c.type === 'hold') return `<div class="ctl"><button class="hold" data-act="hold" data-key="${c.key}" aria-pressed="${!!inp[c.key]}">${ICON.bolt}<span>${esc(T(c.label))}</span></button></div>`;
    return '';
  }
  function renderPanel(s, w, v) {
    const L = byId.get(s.lesson), inp = s.inp[L.id], u = unitOf.get(L.id);
    const exp = T(course.experiment || { en: 'Experiment', ko: '실험' });
    const tabs = [['overview', C('overview')], ['parts', C('parts')], ['experiment', exp], ['maths', C('maths')]];
    put(slots.tabs, s.lang + s.tab, tabs.map(([id, t]) => `<button role="tab" data-act="tab" data-id="${id}" aria-selected="${s.tab === id}">${esc(t)}</button>`).join(''));
    const sel = s.selected[L.id];
    const pickable = new Set((L.controls || []).filter((c) => c.part).map((c) => c.part));
    let html = '', key = '';
    if (s.tab === 'overview') {
      const d = s.done[L.id];
      key = `ov|${L.id}|${s.lang}|${d.join()}`;
      html = `<section class="card ov"><div class="kick">${esc(T(u.title))} · ${esc(C('lesson'))} ${lessons.indexOf(L) + 1}</div><h2>${esc(T(L.title))}</h2>${(L.overview || []).map((p) => `<p>${esc(T(p))}</p>`).join('')}</section>` +
        (L.try?.length ? `<section class="card"><h3>${esc(C('tryIt'))} <small>${d.filter(Boolean).length}/${d.length}</small></h3><ul class="try">${L.try.map((x, i) => `<li class="${d[i] ? 'is-done' : ''}"><i>${d[i] ? ICON.check : ''}</i>${esc(T(x.text))}</li>`).join('')}</ul></section>` : '');
    } else if (s.tab === 'parts') {
      key = `pa|${L.id}|${s.lang}|${sel}`;
      html = `<section class="card"><p class="hint">${esc(C('partsHint'))}</p><ul class="plist">${(L.parts || []).map((p) => `<li data-act="select" data-part="${p.id}" class="${p.id === sel ? 'is-sel' : ''}"><b>${esc(T(p.name))}</b><span>${esc(T(p.desc))}</span></li>`).join('')}</ul></section>`;
    } else if (s.tab === 'maths') {
      const blocks = L.maths ? L.maths(v, inp, ctxFor(s, L)) : [];
      html = `<section class="card maths"><p class="hint">${esc(C('mathsHint'))}</p>${mathsHTML(blocks, T)}</section>`;
      key = html;
    } else {
      const power = (L.controls || []).find((c) => c.type === 'power');
      const general = (L.controls || []).filter((c) => !c.part && c.type !== 'power');
      const partCtl = (L.controls || []).filter((c) => c.part === sel);
      const P = (L.parts || []).find((p) => p.id === sel);
      const sc = schematic(...(L.schematicSize || [300, 170]), { selected: sel, pickable });
      if (L.schematic) L.schematic(sc, v, inp, ctxFor(s, L));
      const scSVG = sc.svg();
      const ptitle = P ? (P.title ? T(P.title(inp, v)) : T(P.name)) : '';
      html = `<section class="card x-head"><div class="x-row"><h2>${esc(exp)}</h2><div class="x-tools">` +
        `<button class="ib" data-act="diagram" title="${esc(C('expand'))}" aria-label="${esc(C('expand'))}">${ICON.expand}</button>` +
        `<button class="ib" data-act="reset" title="${esc(C('reset'))}" aria-label="${esc(C('reset'))}">${ICON.reset}</button>` +
        (power ? `<button class="pwr" data-act="power" aria-pressed="${!!inp.power}"><i></i>${esc(inp.power ? C('powerOn') : C('powerOff'))}</button>` : '') +
        `</div></div><p class="hint">${esc(C('clickHint'))}</p>` +
        (L.builds?.length ? `<div class="ctl"><div class="ctl-l">${esc(C('buildIt'))}</div><div class="seg">${L.builds.map((b) => `<button data-act="build" data-id="${b.id}" aria-pressed="${s.build[L.id] === b.id}">${esc(T(b.label))}</button>`).join('')}</div><p class="ctl-d">${esc(T(L.builds.find((b) => b.id === s.build[L.id])?.desc))}</p></div>` : '') +
        general.map((c) => controlHTML(c, inp, L)).join('') +
        `</section><div class="x-sc">${scSVG}</div>` +
        (P ? `<section class="card x-part"><h3>${esc(ptitle)}</h3><p>${esc(T(P.desc))}</p>${partCtl.map((c) => controlHTML(c, inp, L)).join('')}</section>` : '');
      key = html;
      if (s.diagram) put(slots.modal, 'm' + scSVG + s.lang, `<div class="lab-modal-card"><div class="x-row"><h2>${esc(exp)} · ${esc(T(L.title))}</h2><button class="ib" data-act="diagram" data-open="0" aria-label="${esc(C('close'))}">${ICON.close}</button></div><div class="x-sc big">${scSVG}</div></div>`);
    }
    put(slots.body, key, html);
    slots.modal.hidden = !s.diagram;
    // live values that must not rebuild their control (sliders being dragged)
    for (const c of L.controls || []) {
      if (c.type !== 'slider') continue;
      for (const r of host.querySelectorAll(`input[data-key="${c.key}"]`)) if (document.activeElement !== r || MODE !== 'live') r.value = inp[c.key];
      for (const b of host.querySelectorAll(`[data-val="${c.key}"]`)) b.textContent = c.fmt ? T(c.fmt(inp[c.key])) : inp[c.key];
    }
    // schematic flow dashes
    for (const p of host.querySelectorAll('.sc-flow')) {
      const k = p.dataset.flow, on = Math.abs(v.flows[k] || 0) > 1e-4;
      p.style.opacity = on ? 1 : 0; p.style.strokeDashoffset = (-(w.phase[k] || 0) * 12 * (p.dataset.rev ? -1 : 1)).toFixed(2);
    }
  }
  function renderChart(s, w, v) {
    const L = byId.get(s.lesson), inp = s.inp[L.id], c = L.chart;
    slots.chart.hidden = !c;
    if (!c) return;
    let series, marker;
    if (c.kind === 'time') {
      const win = c.x.window ?? 10, t0 = Math.max(0, w.t - win);
      series = w.hist.filter(([t]) => t >= t0).map(([t, y]) => [t - t0, y]);
      marker = series.length ? series[series.length - 1] : null;
      c.x.min = 0; c.x.max = win;
    } else {
      // sweep one input across the x range; `power: true` draws the curve as if switched on, `lines` adds variants
      const n = c.n ?? 40, key = c.x.key, base = { ...inp, ...(c.power ? { power: true } : {}) };
      const sweep = (b) => { const pts = []; for (let i = 0; i <= n; i++) { const x = c.x.min + (c.x.max - c.x.min) * i / n; const i2 = { ...b, [key]: x }; pts.push([x, c.y.of(solve(L, i2, w.m), i2)]); } return pts; };
      series = c.lines ? c.lines.map((l) => ({ pts: sweep({ ...base, ...l.set }), cls: l.cls || '' })) : [{ pts: sweep(base) }];
      marker = [inp[key], c.y.of(v, inp)];
    }
    const sub = c.sub ? T(c.sub(v, inp)) : '';
    const svg = chartSVG({ x: c.x, y: c.y, series, marker }, T);
    put(slots.chart, `${s.chart}|${s.lang}|${sub}|${svg}`, `<button class="ch-head" data-act="chart" aria-expanded="${s.chart}"><b>${esc(T(c.title))}</b>${ICON.chevD}</button>${s.chart ? `<div class="ch-sub">${esc(sub)}</div>${svg}` : ''}`);
    slots.chart.classList.toggle('is-closed', !s.chart);
  }
  function renderChrome(s) {
    const L = byId.get(s.lesson), u = unitOf.get(L.id);
    for (const el of host.querySelectorAll('[data-t]')) { const t = T(course[el.dataset.t]); if (el.textContent !== t) el.textContent = t; }
    document.documentElement.lang = s.lang;
    const ul = u.lessons, nd = ul.filter((x) => lessonDone(s, x.id)).length;
    put(slots.prog, `${s.lang}|${u.id}|${nd}`, `<span class="pi">${ICON.book}</span><div><b>${esc(T(u.title))}</b><div class="bar"><i style="width:${(100 * nd / ul.length).toFixed(1)}%"></i></div></div><span class="pn">${nd}/${ul.length}</span>`);
    put(slots.langbtn, s.lang, `${ICON.globe}<span>${s.lang.toUpperCase()}</span>`);
    slots.langbtn.setAttribute('aria-label', C('language'));
    put(slots.rail, s.lang + s.chart, `<button data-act="menu" data-id="units" title="${esc(C('lessons'))}" aria-label="${esc(C('lessons'))}">${ICON.book}</button><button data-act="chart" aria-pressed="${s.chart}" title="${esc(C('chart'))}" aria-label="${esc(C('chart'))}">${ICON.chart}</button><button data-act="menu" data-id="lang" title="${esc(C('language'))}" aria-label="${esc(C('language'))}">${ICON.globe}<small>${s.lang.toUpperCase()}</small></button>`);
    put(slots.tools, s.lang, [['l', 'rotL', 'rotL'], ['r', 'rotR', 'rotR'], ['out', 'minus', 'zoomOut'], ['in', 'plus', 'zoomIn'], ['home', 'home', 'home']].map(([op, ic, t]) => `<button data-act="cam" data-op="${op}" title="${esc(C(t))}" aria-label="${esc(C(t))}">${ICON[ic]}</button>`).join(''));
    put(slots.hint, s.lang, esc(C('camHint')));
    const dn = lessons.map((x) => (lessonDone(s, x.id) ? 1 : 0)).join('');
    put(slots.strip, `${s.lang}|${L.id}|${dn}|${thumbsKey}`,
      `<button class="unit" data-act="menu" data-id="units">${ICON.bolt}<span>${esc(C('lesson'))}: <b>${esc(T(u.title))}</b></span>${ICON.chevD}</button>` +
      `<div class="cards">${ul.map((x, i) => `<button class="lc${x.id === L.id ? ' is-cur' : ''}${lessonDone(s, x.id) ? ' is-done' : ''}" data-act="lesson" data-id="${x.id}">${thumbs[x.id] ? `<img src="${thumbs[x.id]}" alt="">` : '<span class="ph"></span>'}<span class="lt">${i + 1}. ${esc(T(x.title))}</span>${lessonDone(s, x.id) ? `<i class="ok">${ICON.check}</i>` : ''}</button>`).join('')}</div>` +
      `<div class="nav"><button data-act="prev" aria-label="${esc(C('prev'))}">${ICON.chevL}</button><button class="go" data-act="next" aria-label="${esc(C('next'))}">${ICON.chevR}</button></div>`);
    const cur = slots.strip.querySelector('.lc.is-cur');
    if (cur && cache.get(cur) !== 'scrolled') { cache.set(cur, 'scrolled'); const cards = cur.parentElement; cards.scrollLeft = Math.max(0, cur.offsetLeft - cards.clientWidth / 2 + cur.offsetWidth / 2); }
    let pop = '';
    if (s.menu === 'units') pop = `<div class="menu units">${course.units.map((uu) => { const n = uu.lessons.filter((x) => lessonDone(s, x.id)).length; return `<button data-act="lesson" data-id="${uu.lessons[0].id}" class="${uu === u ? 'is-cur' : ''}"><b>${esc(T(uu.title))}</b><span>${n}/${uu.lessons.length}</span></button>`; }).join('')}</div>`;
    if (s.menu === 'lang') pop = `<div class="menu langs">${langs.map((l) => `<button data-act="lang" data-code="${l}" class="${l === s.lang ? 'is-cur' : ''}"><b>${esc(LANG_NAMES[l] || l)}</b><span>${l.toUpperCase()}</span></button>`).join('')}</div>`;
    put(slots.pop, s.menu + s.lang + dn, pop);
    slots.pop.dataset.menu = s.menu || '';
  }

  // ---------- one frame ----------
  function draw(s, w, tNow) {
    const L = byId.get(s.lesson), inp = s.inp[L.id];
    ensureScene(s);
    const v = solve(L, inp, w.m);
    built.update(v, inp, { ...ctxFor(s, L), t: w.t });
    const c = camNow(s, tNow ?? w.t);
    if (built.needFit || L.view?.follow) {   // fit after the first update, so parts the update hides or moves are framed as shown
      built.needFit = false; const v0 = L.view || {};
      stage.cam.az = v0.az ?? 35; stage.cam.el = v0.el ?? 30; stage.resize();
      applyShift(L.view?.shift ?? (L.chart && s.chart ? [0.08, 0.05] : [0, 0])); stage.fit(L.view?.margin ?? 1.1);
    }
    stage.cam.az = c.az; stage.cam.el = c.el;
    if (stage.cam.fit) stage.cam.dist = stage.cam.fit.dist * c.zoom;
    stage.st.selected = s.selected[L.id]; stage.refreshHighlight();
    const shift = L.view?.shift ?? (L.chart && s.chart ? [0.08, 0.05] : [0, 0]);
    applyShift(shift);
    stage.render({ ...w.phase, _rates: v.flows });
    for (const l of stage.st.labels) l.el.classList.toggle('is-sel', !!l.part && l.part === s.selected[L.id]);
    renderPanel(s, w, v); renderChart(s, w, v); renderChrome(s);
    return v;
  }
  function applyShift([sx, sy]) {
    const { w, h } = stage.st, cam = stage.camera;
    if (sx || sy) cam.setViewOffset(w, h, sx * w, sy * h, w, h); else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }

  // ---------- thumbnails for the lesson strip ----------
  const thumbs = {}; let thumbsKey = 0;
  function makeThumbs() {
    const s0 = initialState();
    for (const L of lessons) {
      try {
        const inp = { ...(L.inputs || {}), ...(L.thumb?.inputs || {}) }; if ('power' in inp && L.thumb?.inputs?.power === undefined) inp.power = true;
        const s1 = { ...s0, lesson: L.id, inp: { ...s0.inp, [L.id]: inp } };
        thumbs[L.id] = stage.thumbnail((k) => { const up = L.build(k, ctxFor(s1, L)); const m = L.init ? L.init(inp) : {}; if (up) up(solve(L, inp, m), inp, { ...ctxFor(s1, L), t: 0 }); }, 220, 132, L.thumb || L.view || {});
      } catch (e) { console.error('thumbnail', L.id, e); }
    }
    stage.disposeThumbs(); thumbsKey++;
  }

  // ---------- tour ----------
  const tour = course.tour || { steps: [] };
  const steps = expandSteps(tour.steps || []);
  const DURATION = tour.duration ?? (steps.length ? steps[steps.length - 1].at + 2 : 10);
  function expandSteps(list) {
    const out = [];
    for (const a of list) {
      if (a.do === 'set' && a.dur && typeof a.value === 'number') {
        const n = Math.max(2, Math.round(a.dur * 20));
        for (let i = 1; i <= n; i++) out.push({ ...a, at: a.at + (a.dur * i) / n, value: a.from + (a.value - a.from) * (i / n), sub: i < n, first: a.at });
      } else if (a.do === 'hold') { out.push({ ...a, value: true }); out.push({ ...a, at: a.at + (a.dur ?? 1.5), value: false, release: true }); }
      else out.push(a);
    }
    for (const a of out) if (a.do === 'set' && a.dur && a.from === undefined) throw new Error('tour: a slider "set" with dur needs from');
    return out.sort((a, b) => a.at - b.at);
  }
  function stateAt(t) {
    const s = initialState(), w = newWorld(s);
    for (const a of steps) {
      if (a.at > t) break;
      advance(w, s, a.at);
      act({ ...a, t0: a.at }, s, w);
    }
    advance(w, s, t);
    return { s, w };
  }
  // cursor: where each step points (DOM element centre, a slider's thumb, or a 3D part)
  function targetOf(a, s) {
    const root = host.getBoundingClientRect(), sc = root.width / host.offsetWidth || 1;   // screen px → layout px
    const q = (sel) => [...host.querySelectorAll(sel)].find((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; }) || null;
    let el = null, x = null, y = null;
    switch (a.do) {
      case 'lesson': el = q(`.lab-strip [data-act="lesson"][data-id="${a.id}"]`) || q('.lab-strip .unit'); break;
      case 'next': case 'prev': el = q(`.lab-strip [data-act="${a.do}"]`); break;
      case 'tab': el = q(`[data-act="tab"][data-id="${a.id}"]`); break;
      case 'set': {
        const r = q(`input[data-key="${a.key}"]`);
        if (r) { const c = byId.get(s.lesson).controls.find((x) => x.key === a.key); const b = r.getBoundingClientRect(); const f = (a.value - c.min) / (c.max - c.min); x = (b.left + (8 + f * (b.width / sc - 16)) * sc - root.left) / sc; y = (b.top + b.height / 2 - root.top) / sc; }
        else el = q(`[data-act="set"][data-key="${a.key}"][data-value='${JSON.stringify(a.value)}']`);
        break;
      }
      case 'toggle': el = q(`[data-act="toggle"][data-key="${a.key}"]`); break;
      case 'hold': el = q(`[data-act="hold"][data-key="${a.key}"]`); break;
      case 'power': el = q('[data-act="power"]'); break;
      case 'build': el = q(`[data-act="build"][data-id="${a.id}"]`); break;
      case 'lang': el = s.menu === 'lang' ? q(`[data-act="lang"][data-code="${a.code}"]`) : q('[data-act="menu"][data-id="lang"]'); break;
      case 'menu': el = q(`[data-act="menu"][data-id="${a.id}"]`); break;
      case 'diagram': el = s.diagram ? q('.lab-modal [data-act="diagram"]') : q('.lab-body [data-act="diagram"]'); break;
      case 'chart': el = q('.lab-chart .ch-head'); break;
      case 'cam': el = q(`[data-act="cam"][data-op="${a.op}"]`); break;
      case 'select': {
        const lab = q(`.lab-tag[data-part="${a.part}"]`);
        if (lab && lab.style.visibility !== 'hidden') el = lab;
        else { const p = stage.screenOf(a.part); const sr = slots.stage.getBoundingClientRect(); if (p) { x = p.x + (sr.left - root.left) / sc; y = p.y + (sr.top - root.top) / sc; } }
        break;
      }
      case 'orbit': { const sr = slots.stage.getBoundingClientRect(); x = (sr.left - root.left + sr.width * 0.45) / sc; y = (sr.top - root.top + sr.height * 0.55) / sc; break; }
      default: return null;
    }
    if (el && MODE !== 'live') { const body = el.closest('.lab-body'); if (body) { const b = el.getBoundingClientRect(), bb = body.getBoundingClientRect(); if (b.bottom > bb.bottom - 6) body.scrollTop += b.bottom - bb.bottom + 12; else if (b.top < bb.top + 6) body.scrollTop -= bb.top - b.top + 12; } }
    if (el) { const b = el.getBoundingClientRect(); x = (b.left + b.width / 2 - root.left) / sc; y = (b.top + b.height / 2 - root.top) / sc; }
    return x == null ? null : [x, y];
  }
  function drawCursor(t, s) {
    const cur = slots.cursor;
    const vis = steps.filter((a) => !a.sub && !a.release && !a.silent);
    if (!vis.length) { cur.hidden = true; return; }
    cur.hidden = false;
    let i = vis.findIndex((a) => a.at > t); if (i < 0) i = vis.length;
    const next = vis[i], prev = vis[i - 1];
    const home = [host.offsetWidth * 0.55, host.offsetHeight * 0.6];
    const pPrev = (prev && targetOf(prev, s)) || home;
    let pos = pPrev;
    if (prev?.do === 'orbit' && t < prev.at + (prev.dur ?? 1.5)) {   // drag across the bench
      const u = Math.min(1, (t - prev.at) / (prev.dur ?? 1.5));
      pos = [pPrev[0] + (u - 0.5) * 160 * (prev.drag ?? -1), pPrev[1] + Math.sin(u * Math.PI) * 10];
    } else if (prev?.dur && prev.do === 'set' && t < prev.at + prev.dur) {
      pos = targetOf({ ...prev, value: s.inp[s.lesson][prev.key] }, s) || pPrev;
    }
    if (next) {
      const move = Math.min(0.75, Math.max(0.25, (next.at - (prev ? prev.at + (prev.dur ?? 0) : 0)) * 0.6));
      if (t > next.at - move) {
        const pNext = targetOf(next.do === 'set' && next.dur ? { ...next, value: next.from } : next, s) || pPrev;
        const u = (t - (next.at - move)) / move, e = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
        pos = [pPrev[0] + (pNext[0] - pPrev[0]) * e, pPrev[1] + (pNext[1] - pPrev[1]) * e - Math.sin(u * Math.PI) * 18];
      }
    }
    cur.style.transform = `translate(${pos[0].toFixed(1)}px, ${pos[1].toFixed(1)}px)`;
    const since = prev ? t - prev.at : 99;
    const ring = cur.querySelector('i');
    const held = prev && (prev.do === 'hold' || (prev.do === 'set' && prev.dur)) && t < prev.at + (prev.dur ?? 0);
    ring.style.opacity = held ? 0.7 : since < 0.45 ? (1 - since / 0.45).toFixed(3) : 0;
    ring.style.transform = `translate(-50%,-50%) scale(${held ? 0.9 : (0.4 + since * 2.2).toFixed(3)})`;
  }

  let noCursor = false;
  function renderAt(t) {
    noCursor = false;
    const r = stateAt(t);
    // keep the camera tween on the replay clock
    st = r.s; world = r.w;
    slots.body.scrollTop = 0;            // a frame is a function of t only: no scroll left over from another frame
    draw(st, world, t);
    drawCursor(t, st);
    return true;
  }

  // ---------- input (live) ----------
  let tourT0 = null;
  function stopTour() { if (MODE === 'tour' && tourT0 !== null) { tourT0 = null; slots.cursor.hidden = true; } }
  host.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b || !host.contains(b) || b.matches('input')) return;
    if (b.dataset.act === 'hold') return;
    stopTour();
    const a = { do: b.dataset.act, id: b.dataset.id, key: b.dataset.key, part: b.dataset.part, op: b.dataset.op, code: b.dataset.code };
    if (b.dataset.value !== undefined) a.value = JSON.parse(b.dataset.value);
    if (b.dataset.open !== undefined) a.open = b.dataset.open === '1';
    if (a.do === 'select' && st.tab === 'parts') { /* stay on the parts list */ }
    if (a.do !== 'menu' && !b.closest('.lab-pop')) st.menu = null;
    act(a);
    if (a.do === 'lesson' || a.do === 'next' || a.do === 'prev') { const c = host.querySelector('.lab-strip .cards'); if (c) cache.delete(c); }
  });
  host.addEventListener('input', (e) => {
    const r = e.target; if (!r.matches('input[type=range][data-key]')) return;
    stopTour(); act({ do: 'set', key: r.dataset.key, value: Number(r.value) });
  });
  const holdEnd = () => { for (const b of host.querySelectorAll('[data-act="hold"][aria-pressed="true"]')) act({ do: 'hold', key: b.dataset.key, value: false }); };
  host.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-act="hold"]'); if (b) { stopTour(); e.preventDefault(); act({ do: 'hold', key: b.dataset.key, value: true }); b.setAttribute('aria-pressed', 'true'); } });
  window.addEventListener('pointerup', holdEnd); window.addEventListener('pointercancel', holdEnd);
  document.addEventListener('click', (e) => { if (!host.contains(e.target) && st.menu) st.menu = null; });

  // bench: drag to turn, click to pick, wheel to zoom
  const cv = stage.renderer.domElement;
  let drag = null;
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, az: st.cam.az, el: st.cam.el, moved: false, id: e.pointerId, touch: e.pointerType === 'touch' }; });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) { const p = stage.pickAt(e.clientX, e.clientY); if (p !== stage.st.hover) { stage.st.hover = p; cv.style.cursor = p ? 'pointer' : 'grab'; } return; }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; stopTour(); try { cv.setPointerCapture(drag.id); } catch { /* ok */ } }
    if (drag.moved) { st.tween = null; st.cam.az = drag.az - dx * 0.35; if (!drag.touch) st.cam.el = Math.max(10, Math.min(75, drag.el + dy * 0.25)); }
  });
  cv.addEventListener('pointerup', (e) => { if (drag && !drag.moved) { const p = stage.pickAt(e.clientX, e.clientY); if (p) { stopTour(); act({ do: 'select', part: p }); if (st.tab !== 'experiment' && st.tab !== 'parts') st.tab = 'experiment'; } } drag = null; });
  cv.addEventListener('pointerleave', () => { if (!drag) stage.st.hover = null; });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); stopTour(); st.tween = null; st.cam.zoom = Math.max(0.45, Math.min(2.2, st.cam.zoom * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    const op = { q: 'l', e: 'r', '-': 'out', '=': 'in', '+': 'in', 0: 'home' }[e.key.toLowerCase()];
    if (op) { stopTour(); act({ do: 'cam', op, t0: world.t }); }
    if (e.key === 'ArrowRight' && e.altKey) act({ do: 'next' }); if (e.key === 'ArrowLeft' && e.altKey) act({ do: 'prev' });
    if (e.key === 'Escape') { st.menu = null; st.diagram = false; }
  });

  // ---------- run ----------
  const ready = (async () => {
    try { await document.fonts.ready; } catch { /* ok */ }
    if (!Q.has('nothumbs')) makeThumbs();
    if (MODE === 'render') { renderAt(Number(Q.get('t') || 0)); return; }
    draw(st, world);
    let last = performance.now();
    if (MODE === 'tour') tourT0 = last - Number(Q.get('t') || 0) * 1000;
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (tourT0 !== null) {
        const t = (now - tourT0) / 1000;
        if (t > DURATION) tourT0 = now; else renderAt(t);
      } else {
        advance(world, st, world.t + dt);
        draw(st, world);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  })();

  function defaultLogo() { return `<svg viewBox="0 0 40 40"><path d="M20 3l15 8.5v17L20 37 5 28.5v-17z" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M13 20h4l2-5 3 10 2-5h3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }

  // ---------- API for scripts ----------
  const api = {
    course, lessons, ready, renderAt, DURATION, mode: MODE, si, fix,
    get state() { return st; }, get world() { return world; }, stage,
    act: (a) => { act(a); draw(st, world); },
    go(id, opts = {}) { slots.cursor.hidden = true; noCursor = true; st = initialState(); world = newWorld(st); act({ do: 'lesson', id }, st, world); Object.assign(st, opts); if (opts.inputs) Object.assign(st.inp[id], opts.inputs); draw(st, world); return true; },
    values() { const L = L0(); return solve(L, st.inp[L.id], world.m); },
    solve: (id, inp, m) => solve(byId.get(id), inp, m || {}),
    run(seconds) { advance(world, st, world.t + seconds); draw(st, world); },
    draw: () => draw(st, world),
    labels: () => stage.st.labels.map((l) => ({ part: l.part, kind: l.kind, text: l.el.textContent, box: l.box, visible: l.visible !== false && l.el.style.visibility !== 'hidden' })),
    parts: () => [...stage.st.parts.values()].map((p) => ({ id: p.id, pickable: p.pickable, n: p.meshes.length, screen: stage.screenOf(p.id) })),
    bench: () => { const r = slots.stage.getBoundingClientRect(); return { w: r.width, h: r.height }; },
    thumbs,
    /** the bench's screen box (px, relative to the bench) — everything should sit inside it */
    frame() {
      const box = new THREE.Box3(); stage.world.traverse((o) => { let vis = true; for (let p = o; p; p = p.parent) if (!p.visible) vis = false; if (o.isMesh && !o.userData.noFit && vis) box.expandByObject(o); });
      const r = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, w: stage.st.w, h: stage.st.h };
      for (let i = 0; i < 8; i++) { const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(stage.camera); const x = (p.x * 0.5 + 0.5) * r.w, y = (-p.y * 0.5 + 0.5) * r.h; r.x0 = Math.min(r.x0, x); r.x1 = Math.max(r.x1, x); r.y0 = Math.min(r.y0, y); r.y1 = Math.max(r.y1, y); }
      return r;
    },
    /** every tour step that shows a click: does its target exist on screen at that moment? */
    tourTargets() {
      const rect = { width: host.offsetWidth, height: host.offsetHeight }, out = [];
      for (const a of steps) {
        if (a.sub || a.release || a.silent) continue;
        renderAt(Math.max(0, a.at - 0.02));
        const p = targetOf(a, st);
        out.push({ at: a.at, do: a.do, id: a.id || a.key || a.part || a.code || a.op || '', ok: !!p && p[0] >= 0 && p[1] >= 0 && p[0] <= rect.width && p[1] <= rect.height });
      }
      return out;
    },
  };
  window.lab = api; window.ready = ready; window.renderAt = renderAt; window.DURATION = DURATION;
  return api;
}
