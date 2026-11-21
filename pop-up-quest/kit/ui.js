// pop-up-quest — the reader's furniture around the book: imprint and tools, the chapter heading, the journey line
// with the prop's call to action, the page rail, the task card, "Read this page", the fold-out map with stamps,
// and the drawn cursor the tour uses. Everything is real DOM (selectable, keyboard-reachable, read by screen readers);
// the 3D book is only the picture. sync(state) redraws it from the shared state, so the tour can seek any frame.
const ICON = {
  book: 'M4 5c3-1 5-1 8 1 3-2 5-2 8-1v13c-3-1-5-1-8 1-3-2-5-2-8-1zM12 6v13',
  map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  reset: 'M4 12a8 8 0 1 0 3-6.2M4 4v5h5',
  soundOff: 'M4 9h4l5-4v14l-5-4H4zM17 9l4 6M21 9l-4 6',
  soundOn: 'M4 9h4l5-4v14l-5-4H4zM17 8c2 2 2 6 0 8M19.5 5.5c3.5 3.5 3.5 9.5 0 13',
  back: 'M15 5l-7 7 7 7', next: 'M9 5l7 7-7 7', close: 'M6 6l12 12M18 6L6 18',
  feather: 'M20 4c-8 0-14 6-14 14l-2 2M6 18c6 0 11-4 12-10M10 14h5',
  stamp: 'M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.8z',
};
const svg = (k, cls = '') => `<svg class="pq-ico ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[k]}"/></svg>`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');

export function createUI(root, book, h) {
  const N = book.chapters.length, hero = book.cast?.[book.hero]?.name || 'Our hero';
  root.insertAdjacentHTML('beforeend', `
  <div class="pq-shade" aria-hidden="true"></div>
  <header class="pq-head">
    <div class="pq-brand"><span class="pq-imprint">${svg(book.mark || 'book')}</span><div><b>${esc(book.title)}</b><small>${esc(book.subtitle || '')}</small></div></div>
    <nav class="pq-tools" aria-label="Book tools">
      <button class="pq-btn pq-reset" title="Return to the reader's seat">${svg('reset')}<span>Reset view</span></button>
      <button class="pq-btn pq-sound" aria-pressed="false" aria-label="Turn paper sounds on">${svg('soundOff')}</button>
      <button class="pq-btn pq-mapbtn" aria-haspopup="dialog">${svg('map')}<span>Map</span></button>
    </nav>
  </header>
  <section class="pq-chapter" aria-live="off"><div class="pq-eyebrow"><span></span><b class="pq-folio"></b></div><h1 class="pq-title"></h1><p class="pq-region"></p><p class="pq-hint"></p></section>
  <div class="pq-bottom">
    <div class="pq-narration"><div class="pq-smallcap">${svg('feather')} ${esc(hero.toUpperCase())}’S JOURNEY</div><p class="pq-line"></p>
      <div class="pq-actions"><button class="pq-cta"></button><button class="pq-read" aria-haspopup="dialog">Read this page ${svg('book')}</button></div></div>
    <div class="pq-transport" aria-label="Turn the pages">
      <div class="pq-turnlabel"><span>DRAG THE PAPER TO TURN</span><b class="pq-counter"></b></div>
      <div class="pq-railrow"><button class="pq-round pq-prev" aria-label="Previous chapter">${svg('back')}</button>
        <div class="pq-rail"><div class="pq-dots" aria-hidden="true">${book.chapters.map(() => '<i></i>').join('')}</div><input class="pq-scrub" type="range" min="0" max="${N - 1}" step=".01" value="0" aria-label="Turn the page slowly"></div>
        <button class="pq-round pq-next" aria-label="Next chapter">${svg('next')}</button></div>
    </div>
  </div>
  <aside class="pq-task" hidden aria-live="polite"><button class="pq-x" aria-label="Close task">${svg('close')}</button>
    <div class="pq-smallcap pq-task-eyebrow"></div><h2 class="pq-task-prompt"></h2><div class="pq-options"></div><p class="pq-feedback"></p>
    <div class="pq-solved" hidden><div class="pq-stamp">${svg('stamp')}<span></span></div><p></p><button class="pq-cta pq-onward">Turn the page ${svg('next')}</button></div></aside>
  <dialog class="pq-dialog pq-readdlg"><div class="pq-inside"><button class="pq-x" aria-label="Close page">${svg('close')}</button><div class="pq-smallcap pq-read-folio"></div><h2 class="pq-read-title"></h2><div class="pq-read-body"></div></div></dialog>
  <dialog class="pq-dialog pq-mapdlg"><div class="pq-inside"><button class="pq-x" aria-label="Close map">${svg('close')}</button><div class="pq-smallcap">FOLD-OUT MAP · ${esc((book.title || '').toUpperCase())}</div><h2>${esc(book.mapTitle || 'The way through')}</h2><div class="pq-chart"></div><p class="pq-stamps"></p></div></dialog>
  <div class="pq-cursor" hidden aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 3l14 8-6 1.6L10 19z"/></svg><i></i></div>
  <p class="pq-sr" role="status" aria-live="polite"></p>`);
  const $ = s => root.querySelector(s);
  const E = { title: $('.pq-title'), folio: $('.pq-folio'), region: $('.pq-region'), hint: $('.pq-hint'), line: $('.pq-line'), cta: $('.pq-narration .pq-cta'), counter: $('.pq-counter'), scrub: $('.pq-scrub'), dots: [...root.querySelectorAll('.pq-dots i')],
    task: $('.pq-task'), tEyebrow: $('.pq-task-eyebrow'), tPrompt: $('.pq-task-prompt'), options: $('.pq-options'), feedback: $('.pq-feedback'), solved: $('.pq-solved'), sr: $('.pq-sr'),
    read: $('.pq-readdlg'), map: $('.pq-mapdlg'), chart: $('.pq-chart'), stamps: $('.pq-stamps'), cursor: $('.pq-cursor'), next: $('.pq-next'), mapbtn: $('.pq-mapbtn') };
  let shown = -1, taskShown = null, scrubbing = false, local = { picks: [], count: null };

  // chapter heading + journey line
  function showChapter(i) {
    const c = book.chapters[i]; shown = i;
    E.folio.textContent = `CHAPTER ${pad(i + 1)} / ${pad(N)}${c.feature ? ' · ' + c.feature.toUpperCase() : ''}`;
    E.title.innerHTML = (c.title || [c.name]).map(esc).join('<br>'); E.region.textContent = c.region || '';
    E.hint.textContent = c.hint || ''; E.line.textContent = c.line || c.story || '';
    E.cta.innerHTML = `${esc(c.prop?.label || 'Begin')} ${svg('next')}`; E.counter.textContent = `${pad(i + 1)} / ${pad(N)}`;
  }
  // task card
  function renderTask(i, st, t) {
    const c = book.chapters[i], task = c.task, solved = st.solved[i] != null;
    if (taskShown !== i) {
      taskShown = i; local = { picks: [], count: task.min ?? 0 };
      E.tEyebrow.textContent = `TASK · ${(c.stamp || c.feature || '').toUpperCase()}`; E.tPrompt.textContent = task.prompt;
      if (task.type === 'choice') E.options.innerHTML = task.options.map((o, k) => `<button class="pq-opt" data-k="${k}"><i>${'ABCDEFG'[k]}</i><span>${esc(o)}</span></button>`).join('');
      if (task.type === 'order') E.options.innerHTML = shuffle(task.items.map((o, k) => k), i).map(k => `<button class="pq-opt pq-ord" data-k="${k}"><i></i><span>${esc(task.items[k])}</span></button>`).join('');
      if (task.type === 'count') E.options.innerHTML = `<div class="pq-count"><button class="pq-round pq-minus" data-k="-" aria-label="Fewer">−</button><output>${task.min ?? 0}</output><span>${esc(task.unit || '')}</span><button class="pq-round pq-plus" data-k="+" aria-label="More">+</button></div><button class="pq-opt pq-check" data-k="check"><span>${esc(task.check || 'Try it')}</span></button>`;
      E.solved.querySelector('.pq-stamp span').textContent = c.stamp || 'Stamp';
      E.solved.querySelector('p').textContent = task.solved || '';
      E.solved.querySelector('.pq-onward').hidden = i >= N - 1;
    }
    const picks = h.render ? st.picks : local.picks.length || task.type === 'count' ? (task.type === 'count' ? [local.count] : local.picks) : st.picks;
    for (const b of E.options.querySelectorAll('.pq-opt')) {
      const k = +b.dataset.k;
      if (task.type === 'choice') { b.classList.toggle('picked', picks[0] === k); b.classList.toggle('right', solved && k === task.answer); }
      if (task.type === 'order') { const n = picks.indexOf(k); b.classList.toggle('picked', n >= 0); b.querySelector('i').textContent = n >= 0 ? n + 1 : ''; b.classList.toggle('right', solved); }
    }
    const out = E.options.querySelector('output'); if (out) out.textContent = picks[0] ?? task.min ?? 0;
    const wrongAge = st.wrong != null ? t - st.wrong : 9;
    if (h.render) { E.task.style.translate = wrongAge < .45 ? `${Math.sin(wrongAge * 42) * 6 * (1 - wrongAge / .45)}px 0` : ''; const sa = solved ? Math.min(1, (t - st.solved[i]) / .45) : 1, k = 1 + (1 - sa) * (1 - sa) * 1.2; E.solved.querySelector('.pq-stamp').style.transform = `scale(${k}) rotate(${-6 - (1 - sa) * 10}deg)`; E.solved.querySelector('.pq-stamp').style.opacity = sa; }
    else E.task.classList.toggle('shake', wrongAge < .45);
    E.feedback.textContent = solved ? '' : wrongAge < 3 ? (task.hint || 'Not quite — look at the page again.') : (c.prop?.hint || '');
    E.solved.hidden = !solved; E.task.classList.toggle('done', solved);
    E.task.classList.toggle('settled', solved && t - st.solved[i] > 1.6);   // after the stamp lands, fold the card down so the set's answer shows
    if (!h.render) E.task.classList.toggle('pop', solved && t - st.solved[i] < .6);
  }
  E.options.addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b || h.render) return; const i = taskShown, task = book.chapters[i].task; const k = b.dataset.k;
    if (task.type === 'choice') { local.picks = [+k]; h.answer(+k); }
    if (task.type === 'order') { if (local.picks.includes(+k)) return; local.picks.push(+k); const r = h.answer(local.picks); if (r === 'wrong') setTimeout(() => { local.picks = []; }, 450); }
    if (task.type === 'count') { if (k === '+') local.count = Math.min(task.max ?? 9, local.count + 1); else if (k === '-') local.count = Math.max(task.min ?? 0, local.count - 1); else h.answer(local.count); }
  });
  // map
  function drawMap(st) {
    const pts = book.chapters.map((c, i) => c.mapAt || [.15 + .7 * i / Math.max(1, N - 1), .62 - .3 * Math.sin(i / Math.max(1, N - 1) * Math.PI)]);
    const isl = []; for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2, w = 1 + .07 * Math.sin(3 * a + 1) + .05 * Math.sin(7 * a + 2); isl.push(`${(50 + Math.cos(a) * 45 * w).toFixed(1)},${(31 + Math.sin(a) * 25 * w).toFixed(1)}`); }
    E.chart.innerHTML = `<svg viewBox="0 0 100 62" role="img" aria-label="Map of the journey"><polygon class="isl" points="${isl.join(' ')}"/>
      <polyline class="route" points="${pts.map(p => `${p[0] * 100},${p[1] * 62}`).join(' ')}"/>
      ${pts.map((p, i) => { const got = st.solved[i] != null; return `<g class="place${got ? ' got' : ''}" transform="translate(${p[0] * 100} ${p[1] * 62})"><circle r="${got ? 4.2 : 3}"/><text y="1.1">${i + 1}</text><text class="nm" y="${p[1] > .5 ? 8 : -5.6}">${esc((book.chapters[i].title || []).join(' '))}</text></g>`; }).join('')}</svg>`;
    const got = Object.keys(st.solved).length; E.stamps.textContent = `${got} of ${N} stamps collected${got === N ? ' — the journey is complete.' : '.'}`;
  }
  function openRead(i) {
    const c = book.chapters[i]; root.querySelector('.pq-read-folio').textContent = `CHAPTER ${pad(i + 1)} · ${(c.region || '').toUpperCase()}`;
    root.querySelector('.pq-read-title').textContent = (c.title || []).join(' ');
    root.querySelector('.pq-read-body').innerHTML = `<p>${esc(c.story)}</p>${c.lesson ? `<div class="pq-lesson"><b>${esc(c.feature || 'The idea')}</b><p>${esc(c.lesson)}</p></div>` : ''}<p class="pq-task-line">${esc(c.task?.prompt || '')}</p>`;
    E.read.showModal();
  }
  // wiring
  $('.pq-prev').onclick = () => h.goTo(-1); E.next.onclick = () => h.goTo(1);
  root.querySelector('.pq-onward').onclick = () => h.goTo(1);
  E.cta.onclick = () => h.openTask(); $('.pq-read').onclick = () => openRead(shown);
  root.querySelector('.pq-task .pq-x').onclick = () => h.closeTask();
  $('.pq-reset').onclick = () => h.reset();
  const snd = $('.pq-sound'); snd.onclick = () => { const on = snd.getAttribute('aria-pressed') !== 'true'; snd.setAttribute('aria-pressed', on); snd.innerHTML = svg(on ? 'soundOn' : 'soundOff'); snd.setAttribute('aria-label', on ? 'Turn paper sounds off' : 'Turn paper sounds on'); h.sound(on); };
  E.mapbtn.onclick = () => { lastSt && drawMap(lastSt); E.map.showModal(); };
  for (const d of [E.read, E.map]) { d.querySelector('.pq-x').onclick = () => d.close(); d.addEventListener('click', e => { if (e.target === d) d.close(); }); }
  E.scrub.addEventListener('input', () => { scrubbing = true; h.scrub(+E.scrub.value); });
  E.scrub.addEventListener('change', () => { scrubbing = false; h.release(); });
  let lastSt = null;

  // tour cursor: glide to the aimed thing, press on clicks
  const cursorPos = (aim, st) => {
    if (!aim) return null;
    if (aim.target === 'prop') return h.project('prop', aim.ci);
    const r = (aim.target === 'next' ? E.next : aim.target === 'map' ? E.mapbtn : aim.k === '+' ? E.options.querySelector('.pq-plus') : aim.k === 'check' ? E.options.querySelector('.pq-check') : E.options.querySelector(`[data-k="${aim.k}"]`))?.getBoundingClientRect();
    return r && r.width ? { x: r.left + r.width * .5, y: r.top + r.height * .55 } : null;
  };
  const HOME = () => ({ x: innerWidth * .62, y: innerHeight * .8 });
  function syncCursor(st, t) {
    const c = st.cursor; if (!c) { E.cursor.hidden = true; return; }
    E.cursor.hidden = false;
    const to = cursorPos(c.aim, st) || HOME(), from = cursorPos(c.prev, st) || HOME();
    const u = Math.min(1, Math.max(0, (t - c.aimT) / .55)), e = u * u * (3 - 2 * u);
    const x = from.x + (to.x - from.x) * e, y = from.y + (to.y - from.y) * e - Math.sin(Math.PI * e) * 24;
    E.cursor.style.transform = `translate(${x}px, ${y}px)`;
    const press = t - c.down, ring = E.cursor.querySelector('i'); E.cursor.classList.toggle('down', press >= 0 && press < .18);
    ring.style.opacity = press >= 0 && press < .5 ? 1 - press / .5 : 0; ring.style.transform = `translate(-50%, -50%) scale(${.4 + Math.min(1, Math.max(0, press) / .5) * 1.2})`;
  }

  return {
    sync(st, t, i, p) {
      lastSt = st;
      const near = Math.round(st.s); if (near !== shown) showChapter(near);
      const c = book.chapters[near], said = st.solved[near] != null ? (c.task?.solved || c.line) : (c.line || c.story || '');
      if (E.line.textContent !== said) E.line.textContent = said;   // once solved, the journey line tells what happened
      if (!scrubbing) E.scrub.value = st.s;
      E.dots.forEach((d, k) => { d.classList.toggle('on', k <= st.s + 1e-3); d.classList.toggle('got', st.solved[k] != null); });
      root.style.setProperty('--turn', (st.s % 1).toFixed(3));
      const open = st.open != null && Math.abs(st.s - st.open) < 1e-3;
      E.task.hidden = !open; if (open) renderTask(st.open, st, t); else taskShown = null;
      E.cta.classList.toggle('solved', st.solved[near] != null); E.cta.disabled = Math.abs(st.s - near) > 1e-3;
      root.classList.toggle('turning', p > 1e-3);
      if (h.render) {
        if (st.map && !E.map.open) { drawMap(st); E.map.show(); } else if (!st.map && E.map.open) E.map.close();
        if (st.map) drawMap(st);
        syncCursor(st, t);
      }
    },
    arrived(i) { E.sr.textContent = `Chapter ${i + 1}: ${(book.chapters[i].title || []).join(' ')}. ${book.chapters[i].line || ''}`; },
    announce(text) { E.sr.textContent = text; },
  };
}
function shuffle(arr, seed) { let s = seed * 9301 + 49297; const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  if (a.every((v, k) => v === k)) a.push(a.shift()); return a; }
