// agent-launch-film · kit.js — the pieces a film is built from. Each K.x(...) returns a piece:
//   { node, kind, text?, reads?, cues?, update(t, lt)?, pose(t)?, layout()? }
// t is time since the piece came on (its `in`), lt is the scene's local time. Pieces never keep state between frames:
// update(t) sets everything from t, so seeking anywhere draws the same frame.
// Text takes light markup: *word* = accent colour, ==phrase== = highlighter sweep, {n} = a live counter.
let F = null, MID = 0;
export const setFilm = (f) => { F = f; };

const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, p) => a + (b - a) * p;
const Eo = (p) => 1 - (1 - p) ** 3, Eio = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
const Esp = (p) => (p >= 1 ? 1 : 1 - Math.exp(-7 * p) * Math.cos(9 * p));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const h = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const plain = (s) => String(s).replace(/\*([^*]+)\*/g, '$1').replace(/==([^=]+)==/g, '$1');
const u = (px) => `calc(${px}px * var(--u))`;
const fmtNum = (v, d = 0) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
export function rich(s, opt = {}) {
  let o = esc(s).replace(/\*([^*]+)\*/g, '<em class="a">$1</em>').replace(/==([^=]+)==/g, '<mark>$1</mark>');
  if (opt.n !== undefined) o = o.replace('{n}', '<span class="alf-n"></span>');
  return o;
}
const ICON = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="7" r="2.2"/><circle cx="14" cy="12" r="2.2"/><circle cx="8" cy="17" r="2.2"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
};

// ── typing: every character is a span laid out from the start (no reflow while typing); a caret follows the last one
function typer(container, { at, cps, caret = true, jitter = 0.35, seed = 1 }) {
  const chars = [];
  const walk = (n) => {
    for (const c of [...n.childNodes]) {
      if (c.nodeType === 3) { const frag = document.createDocumentFragment(); for (const ch of [...c.textContent]) { const s = document.createElement('span'); s.className = 'alf-ch'; s.textContent = ch; frag.appendChild(s); chars.push(s); } c.replaceWith(frag); }
      else if (c.classList && !c.classList.contains('alf-n')) walk(c);
    }
  };
  walk(container);
  const n = chars.length, t0 = at[0], t1 = at[1] ?? t0 + n / (cps || 22);
  // uneven but deterministic key times, like a person typing
  let r = seed * 9301 + 49297; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const w = chars.map((s) => (s.textContent === ' ' ? 1.6 : 1) * (1 - jitter / 2 + rnd() * jitter)), tot = w.reduce((a, b) => a + b, 0) || 1;
  let acc = 0; const times = w.map((x) => (acc += x, t0 + ((acc - x) / tot) * (t1 - t0)));
  let car = null, pos = null;
  if (caret) { car = document.createElement('i'); car.className = 'alf-caret'; container.style.position = container.style.position || 'relative'; container.appendChild(car); }
  let last = -1;
  return {
    n, t0, t1, cps: n / Math.max(0.01, t1 - t0), times,
    layout() { pos = chars.map((s) => [s.offsetLeft + s.offsetWidth, s.offsetTop, s.offsetHeight]); this.first = chars[0] ? [chars[0].offsetLeft, chars[0].offsetTop, chars[0].offsetHeight] : [0, 0, 30]; },
    update(t) {
      let k = 0; while (k < n && times[k] <= t) k++;
      if (k !== last) { for (let i = 0; i < n; i++) chars[i].classList.toggle('on', i < k); last = k; }
      if (car) {
        if (!pos) this.layout();
        const p = k > 0 ? pos[k - 1] : [this.first[0], this.first[1], this.first[2]];
        car.style.left = p[0] + 2 + 'px'; car.style.top = p[1] + p[2] * 0.12 + 'px'; car.style.height = p[2] * 0.78 + 'px';
        const typing = t >= t0 - 0.05 && t <= t1 + 0.15, blink = Math.floor((t - t1) / 0.5) % 2 === 0;
        car.style.opacity = t < t0 - 0.6 ? 0 : typing || blink ? 1 : 0;
      }
    },
    cues() { return times.map((x, i) => [x, 'type', chars[i].textContent === ' ' ? 0.25 : 0.5]); },
  };
}
function counter(span, n) {
  const { from = 0, to = 100, at = [0, 1.5], fmt, d = 0, suffix = '' } = n;
  const f = fmt || ((v) => fmtNum(v, d) + suffix);
  return {
    update(t) { span.textContent = f(lerp(from, to, Eo(cl((t - at[0]) / (at[1] - at[0]))))); },
    cues() { const out = []; for (let x = at[0]; x < at[1]; x += 0.075) out.push([x, 'tick', 0.25 * (1 - (x - at[0]) / (at[1] - at[0]) * 0.6)]); return out; },
    width(cs) { span.textContent = f(to); return span; },
  };
}

export const K = {
  rich, icon: ICON,

  // ── a headline: centred heavy grotesk, accent words, an optional sub line, counter, or typed on
  headline(text, o = {}) {
    const node = h(`<div class="alf-headline ${o.align === 'left' ? 'left' : ''}"><div class="h" data-read style="${o.size ? `font-size:${u(o.size)}` : ''}">${rich(text, o)}</div>${o.sub ? `<div class="sub">${rich(o.sub)}</div>` : ''}</div>`);
    const p = { node, kind: 'headline', text: plain(text).replace('{n}', o.n ? String(o.n.to) : ''), read: true, accents: (text.match(/\*[^*]+\*/g) || []).length, cues: [] };
    const subs = [];
    if (o.n) { const c = counter(node.querySelector('.alf-n'), o.n); subs.push(c); p.cues.push(...c.cues()); c.update(o.n.at[1] + 1); }
    if (o.type) { const ty = typer(node.querySelector('.h'), { at: Array.isArray(o.type) ? o.type : [0.15, 0.15 + plain(text).length / 26], caret: o.caret ?? false }); subs.push(ty); p.cues.push(...ty.cues()); p.typedEnd = ty.t1; p.cps = ty.cps; p.layout = () => ty.layout(); }
    p.update = (t) => subs.forEach((s) => s.update(t));
    return p;
  },

  // ── the input bar: placeholder, typed text, a button that is pressed
  input(o = {}) {
    const w = o.w ?? 900, btn = o.button ?? 'arrow';
    const node = h(`<div class="alf-input alf-glass" style="width:${u(w)}"><div class="field" data-read><span class="ph">${esc(o.placeholder || '')}</span><span class="tx">${esc(o.text || '')}</span></div><div class="alf-btn">${btn === 'arrow' ? ICON.arrow : btn === 'dots' ? ICON.dots : esc(btn)}</div></div>`);
    const tx = node.querySelector('.tx'), ph = node.querySelector('.ph'), b = node.querySelector('.alf-btn');
    const at = o.type === false ? [-1, -1] : o.type || [0.4, 0.4 + (o.text || '').length / 14];
    const ty = o.type === false ? { t1: 0, cps: 0, cues: () => [], layout() {}, update() {} } : typer(tx, { at, caret: true }), press = o.press;
    if (o.type === false) ph.remove();
    if (o.halo) node.appendChild(halo(o.halo));
    return {
      node, kind: 'input', text: o.text || o.placeholder || '', read: true, typedEnd: ty.t1, cps: ty.cps,
      cues: [...ty.cues(), ...(press != null ? [[press, 'click', 0.9]] : [])],
      layout: () => ty.layout(),
      update(t) {
        ty.update(t); if (o.type !== false) ph.style.opacity = t >= at[0] ? 0 : 1;
        if (press != null) { const q = t - press, k = q < 0 ? 1 : q < 0.09 ? lerp(1, 0.9, q / 0.09) : lerp(0.9, 1, Esp(cl((q - 0.09) / 0.5))); b.style.transform = `scale(${k})`; b.style.filter = q > 0 && q < 0.6 ? `brightness(${1 + 0.25 * (1 - q / 0.6)})` : ''; }
      },
    };
  },

  // ── a pointer: path [[t, dx, dy], …] relative to where it is placed; click: [t, …] squashes it
  cursor(o = {}) {
    const node = h(`<div class="alf-cursor"><svg viewBox="0 0 28 40"><path d="M2 2 L2 31 L9.5 24.5 L14.5 37 L19.5 35 L14.5 22.8 L24.5 22.8 Z" fill="#111" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/></svg></div>`);
    const path = o.path || [[0, 0, 0]], clicks = o.click || [];
    return {
      node, kind: 'cursor', enter: 'fade', enterCue: 'none', enterGain: 0, cues: clicks.map((c) => [c, 'click', 0.8]),
      pose(t) {
        let x = path[0][1], y = path[0][2];
        for (let i = 1; i < path.length; i++) { const [t0, x0, y0] = path[i - 1], [t1, x1, y1] = path[i]; if (t >= t0) { const p = Eio(cl((t - t0) / (t1 - t0 || 1e-6))); x = lerp(x0, x1, p); y = lerp(y0, y1, p); } }
        let s = 1; for (const c of clicks) { const q = t - c; if (q > 0 && q < 0.35) s *= q < 0.08 ? lerp(1, 0.82, q / 0.08) : lerp(0.82, 1, Eo((q - 0.08) / 0.27)); }
        return { x, y, s };
      },
    };
  },

  // ── one chat thread: bubbles arrive bottom-up, older ones climb; the agent "thinks" (a shimmer) then streams its line
  //   items: [{ who: 'agent' | 'user', text, at, think: 0.5, name, cps }]
  chat(items, o = {}) {
    const w = o.w ?? 900, keep = o.keep ?? 4, gap = o.gap ?? 16;
    const node = h(`<div class="alf-chat" style="width:${u(w)}"></div>`);
    const msgs = items.map((m, i) => {
      const who = m.who || 'agent', think = who === 'agent' ? m.think ?? 0.45 : 0;
      const el = h(`<div class="alf-msg ${who}">${who === 'agent' ? `<div class="alf-ava agent">${K.avatarSvg()}</div>` : `<div class="alf-ava user">${esc(m.initial || (o.user || 'U')[0])}</div>`}<div class="alf-bub ${who === 'agent' ? 'alf-glass' : ''}"><span class="tx" data-read>${rich(m.text)}</span>${think ? '<div class="alf-think"></div>' : ''}</div>${m.name ? `<div class="who">${esc(m.name)}</div>` : ''}</div>`);
      node.appendChild(el);
      const tx = el.querySelector('.tx'), sh = el.querySelector('.alf-think');
      const stream = who === 'agent' && m.stream !== false;
      const ty = stream ? typer(tx, { at: [m.at + think, m.at + think + plain(m.text).length / (m.cps || 48)], caret: false, jitter: 0.2, seed: i + 3 }) : null;
      return { m, who, el, tx, sh, think, ty, h: 0, at: m.at, shown: m.at + think };
    });
    const p = {
      node, kind: 'chat', read: true, text: items.map((m) => plain(m.text)).join(' '),
      reads: msgs.map((q, i) => ({ text: plain(q.m.text), from: (q.ty ? q.ty.t1 : q.at + 0.3), to: (msgs[i + keep] ? msgs[i + keep].at : Infinity) })),
      cps: Math.max(0, ...msgs.map((q) => (q.ty ? q.ty.cps : 0))),
      cues: msgs.flatMap((q) => [[q.at, q.who === 'user' ? 'send' : 'pop', 0.6], ...(q.think ? [[q.at + q.think, 'blip', 0.25]] : [])]),
      layout() { for (const q of msgs) { q.h = q.el.offsetHeight; q.ty?.layout(); } const H = msgs.slice(-keep).reduce((a, q) => a + q.h + gap, 0); node.style.height = Math.max(...msgs.map((q) => q.h), H) + 'px'; },
      update(t) {
        if (!msgs[0].h) p.layout();
        for (let i = 0; i < msgs.length; i++) {
          const q = msgs[i], a = t - q.at;
          if (a < 0) { q.el.style.opacity = 0; continue; }
          let y = 0;
          for (let j = i + 1; j < msgs.length; j++) { const b = t - msgs[j].at; if (b > 0) y += (msgs[j].h + gap) * Esp(cl(b / 0.55)); }
          // how many newer bubbles have fully arrived: beyond `keep` the old one leaves upward
          let newer = 0; for (let j = i + 1; j < msgs.length; j++) newer += cl((t - msgs[j].at) / 0.5);
          const gone = cl(newer - (keep - 1)), pa = cl(a / 0.5), sp = Esp(pa);
          q.el.style.opacity = (Eo(cl(a / 0.25)) * (1 - gone)).toFixed(3);
          q.el.style.transform = `translateY(${(-y + (1 - sp) * 26 - gone * 30).toFixed(1)}px) scale(${lerp(0.88, 1, sp).toFixed(4)})`;
          q.el.style.filter = gone > 0.02 ? `blur(${(gone * 8).toFixed(1)}px)` : '';
          if (q.ty) q.ty.update(t);
          if (q.sh) { const th = t - q.at; q.sh.style.opacity = th < q.think ? 1 : cl(1 - (th - q.think) / 0.3); q.sh.style.backgroundPosition = `${(120 - ((th * 1.6) % 1) * 160).toFixed(1)}% 0`; }
        }
      },
    };
    return p;
  },

  // ── a card: glass by default; parts stack inside and come in one after another
  card(o = {}) {
    const tone = o.tone || 'glass';
    const node = h(`<div class="alf-card ${tone === 'glass' ? 'alf-glass' : ''}" style="width:${u(o.w ?? 460)};${o.radius ? `border-radius:${u(o.radius)};` : ''}${tone !== 'glass' ? `background:${tone};border-radius:var(--r);box-shadow:var(--shadow);position:relative;` : ''}${o.pad != null ? `padding:${u(o.pad)};` : ''}${o.style || ''}"></div>`);
    if (o.halo) node.appendChild(halo(o.halo));
    const parts = (o.parts || []).map((q, i) => { const wrap = document.createElement('div'); wrap.className = 'alf-part'; wrap.appendChild(q.node); node.appendChild(wrap); return { q, wrap, d: q.delay ?? (o.delay ?? 0.15) + i * (o.stagger ?? 0.12) }; });
    const text = parts.map((x) => x.q.text).filter(Boolean).join(' ');
    return {
      node, kind: 'card', text: o.read === false ? '' : text, read: o.read ?? !!parts.some((x) => x.q.read),
      cues: parts.flatMap((x) => (x.q.cues || []).map(([t, k, g]) => [t + x.d, k, g])),
      layout() { parts.forEach((x) => x.q.layout?.()); },
      update(t) {
        for (const x of parts) {
          const a = t - x.d, p = cl(a / 0.45);
          x.wrap.style.opacity = Eo(p).toFixed(3);
          x.wrap.style.transform = p < 1 ? `translateY(${((1 - Esp(p)) * 14).toFixed(1)}px)` : '';
          x.q.update?.(a);
        }
      },
    };
  },
  title(text, o = {}) { return { node: h(`<div class="alf-title" data-read><span class="alf-dots4"><i></i><i></i><i></i><i></i></span><span>${rich(text)}</span>${o.badge ? `<span class="badge">${esc(o.badge)}</span>` : ''}</div>`), text: plain(text), read: true }; },
  meta(text) { return { node: h(`<div class="alf-meta">${esc(text)}</div>`) }; },
  line(text, o = {}) { return { node: h(`<div class="alf-line ${o.muted ? 'muted' : ''}" data-read style="${o.size ? `font-size:${u(o.size)}` : ''}">${rich(text)}</div>`), text: plain(text), read: true }; },
  foot(text, meta) { return { node: h(`<div><div class="alf-line" data-read>${rich(text)}</div>${meta ? `<div class="alf-meta" style="margin-top:${u(6)}">${esc(meta)}</div>` : ''}</div>`), text: plain(text), read: true }; },
  chips(list, o = {}) {
    const node = h(`<div class="alf-chips">${list.map((c) => `<span class="alf-chip ${o.tone || ''}" style="${o.size ? `font-size:${u(o.size)}` : ''}"><span class="alf-dots4"><i></i><i></i><i></i><i></i></span>${rich(c)}</span>`).join('')}</div>`);
    const ch = [...node.children];
    return { node, text: o.read === false ? '' : list.map(plain).join(' '), read: o.read ?? true, cues: ch.map((_, i) => [i * 0.09, 'pop', 0.2]), update(t) { ch.forEach((c, i) => { const p = cl((t - i * 0.09) / 0.4); c.style.opacity = Eo(p); c.style.transform = `scale(${lerp(0.85, 1, Esp(p))})`; }); } };
  },
  swatches(list, o = {}) {
    const cols = o.cols ?? 2;
    const node = h(`<div class="alf-sw" style="grid-template-columns:repeat(${cols},1fr)">${list.map((s) => `<div class="${lum(s.c) > 0.6 ? 'lt' : ''}" style="background:${s.c}"><span>${esc(s.name || s.c)}</span></div>`).join('')}</div>`);
    const ch = [...node.children];
    return { node, update(t) { ch.forEach((c, i) => { const p = cl((t - i * 0.07) / 0.4); c.style.opacity = Eo(p); c.style.transform = `scale(${lerp(0.7, 1, Esp(p))})`; }); } };
  },
  sliders(list, o = {}) {
    const n = o.dots ?? 17;
    const node = h(`<div class="alf-sl">${list.map(([a, b]) => `<div class="row"><div class="ends"><span class="alf-meta">${esc(a)}</span><span class="alf-meta">${esc(b)}</span></div><div class="track">${'<i></i>'.repeat(n)}<b></b></div></div>`).join('')}</div>`);
    const knobs = [...node.querySelectorAll('b')];
    return { node, update(t) { knobs.forEach((k, i) => { const v = list[i][2], p = Esp(cl((t - 0.2 - i * 0.12) / 0.8)); k.style.left = `${(lerp(0.5, v, p) * 100).toFixed(2)}%`; }); } };
  },
  stat(o = {}) {
    const node = h(`<div class="alf-stat"><div class="num" data-read><span class="alf-n"></span>${o.unit ? `<span style="font-size:.5em;letter-spacing:-.02em">${esc(o.unit)}</span>` : ''}</div>${o.label ? `<div class="lab">${rich(o.label)}</div>` : ''}${o.caption ? `<div class="cap" data-read>${rich(o.caption)}</div>` : ''}</div>`);
    const c = counter(node.querySelector('.alf-n'), { from: o.from ?? 0, to: o.value, at: o.at || [0.1, 1.4], fmt: o.fmt, d: o.d, suffix: o.suffix });
    const cap = node.querySelector('.cap'), at = o.at || [0.1, 1.4];
    return { node, text: `${o.value} ${plain(o.caption || '')}`, read: true, cues: c.cues(), update(t) { c.update(t); if (cap) cap.style.setProperty('--ul', `${(Eio(cl((t - at[1] - 0.1) / 0.6)) * 100).toFixed(1)}%`); } };
  },
  quote(o = {}) {
    const node = h(`<div class="alf-quote">${o.source ? `<div class="src"><i style="background:${o.color || 'var(--accent)'}">${esc((o.icon || o.source)[0])}</i>${esc(o.source)} <small>${esc(o.meta || '')}</small></div>` : ''}${o.stars ? `<div class="stars">${'★'.repeat(o.stars)}<span style="opacity:.25">${'★'.repeat(5 - o.stars)}</span></div>` : ''}<div class="q" data-read>${rich(o.text)}</div>${o.actions ? `<div class="actions">${o.actions.map(esc).map((a) => `<span>${a}</span>`).join('')}</div>` : ''}</div>`);
    const marks = [...node.querySelectorAll('mark')], at = o.mark ?? 0.5;
    return { node, text: plain(o.text), read: true, cues: marks.length ? [[at, 'swipe', 0.3]] : [], update(t) { marks.forEach((m, i) => m.style.setProperty('--hl', `${(Eio(cl((t - at - i * 0.25) / 0.45)) * 100).toFixed(1)}%`)); } };
  },
  bars(list, o = {}) {
    // each group is scaled to its own larger value (units differ between groups) unless o.max is given
    const at = o.at || [0.2, 1.4], H = o.h ?? 230;
    const node = h(`<div class="alf-bars">${list.map((g) => `<div class="g"><div class="pair" style="height:${u(H)}"><div class="col a"><span>${esc(g.fa ?? g.a)}</span></div><div class="col b"><span></span></div></div><div class="lab" data-read>${esc(g.label)}</div>${g.note ? `<div class="note">${esc(g.note)}</div>` : ''}</div>`).join('')}</div>`);
    const A = [...node.querySelectorAll('.col.a')], B = [...node.querySelectorAll('.col.b')];
    return {
      node, text: list.map((g) => `${g.label} ${g.fb ?? g.b}`).join(' '), read: true, cues: list.map((_, i) => [at[0] + i * 0.12, 'rise', 0.35]),
      update(t) {
        list.forEach((g, i) => {
          const mx = o.max ?? Math.max(g.a, g.b), p = Eo(cl((t - at[0] - i * 0.12) / (at[1] - at[0]))), pa = Eo(cl((t - at[0] + 0.2 - i * 0.12) / 0.6));
          A[i].style.height = u(Math.max(4, (g.a / mx) * H * pa)); B[i].style.height = u(Math.max(4, (g.b / mx) * H * p));
          const v = lerp(g.from ?? g.a, g.b, p); B[i].firstChild.textContent = g.fmt ? g.fmt(v) : (g.fb ?? String(g.b)).replace(/[\d.,]+/, (m) => fmtNum(v, (m.split('.')[1] || '').length));
        });
      },
    };
  },
  rows(list, o = {}) {
    const cols = o.cols || '36px 1fr 120px 60px', at = o.at ?? 0.2, every = o.every ?? 0.12;
    const node = h(`<div class="alf-rows">${o.head ? `<div class="r head" style="grid-template-columns:${cols}">${o.head.map((c) => `<span>${esc(c)}</span>`).join('')}</div>` : ''}${list.map((r) => `<div class="r" style="grid-template-columns:${cols}">${r.map((c) => (c === '@toggle' ? '<span class="tg"></span>' : typeof c === 'object' ? `<span class="th" style="background:${c.c}"></span>` : `<span>${rich(String(c))}</span>`)).join('')}</div>`).join('')}</div>`);
    const R = [...node.querySelectorAll('.r:not(.head)')];
    return { node, cues: R.map((_, i) => [at + i * every, 'tick', 0.3]), update(t) { R.forEach((r, i) => { const p = cl((t - at - i * every) / 0.3); r.style.opacity = Eo(p); r.style.transform = `translateX(${(1 - Eo(p)) * 24}px)`; const tg = r.querySelector('.tg'); if (tg) tg.classList.toggle('on', t > at + i * every + 0.35); }); } };
  },
  progress(o = {}) {
    const node = h(`<div><div class="alf-prog"><b></b></div>${o.label ? `<div class="alf-meta" style="margin-top:${u(8)}">${esc(o.label)}</div>` : ''}</div>`), b = node.querySelector('b'), at = o.at || [0, 1.5];
    return { node, update(t) { b.style.width = (Eio(cl((t - at[0]) / (at[1] - at[0]))) * 100).toFixed(1) + '%'; } };
  },
  html(html, o = {}) { return { node: h(html), text: o.text || '', read: !!o.read, update: o.update, kind: o.kind || 'html' }; },

  // ── small pills
  chip(text, o = {}) {
    const ic = o.icon === false ? '' : `<span class="ic" style="${o.iconBg ? `background:${o.iconBg}` : ''}">${ICON[o.icon || 'check']}</span>`;
    return { node: h(`<div class="alf-chip ${o.tone || ''}" style="${o.size ? `font-size:${u(o.size)}` : ''}">${ic}<span data-read>${rich(text)}</span></div>`), kind: 'chip', text: plain(text), read: o.read ?? true, enter: 'pop', enterCue: 'chime' };
  },
  tag(text, o = {}) { return { node: h(`<div class="alf-tag"><i style="${o.color ? `background:${o.color}` : ''}"></i><span data-read>${rich(text)}</span>${o.small ? `<small>${esc(o.small)}</small>` : ''}</div>`), kind: 'tag', text: plain(text), read: !!o.read, enter: 'pop', enterGain: 0.25 }; },
  link(text, o = {}) { const w = o.w ?? 300; return { node: h(`<div class="alf-link" style="width:${u(w)}"><span class="dl"></span>${K.tag(text, o).node.outerHTML}<span class="dl"></span></div>`), kind: 'link', text: plain(text), read: !!o.read, enter: 'fade' }; },

  // ── an output piece: a vertical (or any) panel with a colour field, a drawn picture, a headline — an ad, a plan, a page
  poster(o = {}) {
    const w = o.w ?? 300, ht = o.h ?? Math.round(w * 16 / 9), bg = o.bg || ['#333', '#111'];
    const node = h(`<div class="alf-posterwrap"><div class="alf-poster" style="width:${u(w)};height:${u(ht)};background:${Array.isArray(bg) ? `linear-gradient(160deg, ${bg[0]}, ${bg[1]})` : bg};color:${o.ink || '#fff'}">${o.art ? `<div class="art">${o.art}</div>` : ''}${o.title ? `<div class="pt" style="font-size:${u(o.size ?? w * 0.115)}">${rich(o.title)}</div>` : ''}${o.sub ? `<div class="ps" style="top:${o.subTop || '30%'}">${rich(o.sub)}</div>` : ''}${o.badge ? `<div class="badge">${esc(o.badge)}</div>` : ''}</div>${o.label ? K.tag(o.label, { color: o.labelColor, small: o.labelSmall }).node.outerHTML : ''}</div>`);
    return { node, kind: 'poster', text: o.read ? plain(o.title || '') : '', read: !!o.read };
  },
  phone(o = {}) {
    const w = o.w ?? 340, ht = o.h ?? Math.round(w * 2.05);
    const node = h(`<div class="alf-phone" style="width:${u(w)}"><div class="scr" style="height:${u(ht - 24)}"><div class="island"></div></div></div>`);
    const scr = node.querySelector('.scr'), inner = o.screen;
    if (inner) scr.appendChild(inner.node);
    return { node, kind: 'phone', text: inner?.text || '', read: !!inner?.read, cues: inner?.cues, layout: () => inner?.layout?.(), update: (t, lt) => inner?.update?.(t, lt) };
  },
  persona(o = {}) {
    const c = o.colors || ['#3B6CF6', '#7C4DFF'];
    const node = h(`<div class="alf-persona" style="width:${u(o.w ?? 300)};background:radial-gradient(120% 90% at 30% 10%, ${c[0]}, ${c[1]})"><div class="nm" data-read>${esc(o.name)}</div><div class="rl">${esc(o.role || '')}</div><div class="face">${esc(o.initials || o.name[0])}</div><div class="st">${(o.stats || []).map(([k, v]) => `<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</div></div>`);
    if (o.halo !== false) node.appendChild(halo(c[0], 0.55));
    return { node, kind: 'persona', text: o.name, read: o.read ?? true };
  },

  // ── the mascot: an object from the topic's world (drawn in the film's `mascot` design) whose dot-matrix screen is its face
  //   say: [[t, 'TEXT', { blink, speed }], …]   nod: [t, …]   sparks: true
  mascot(o = {}) {
    const M = F.mascot; if (!M) throw new Error('K.mascot needs new Film({ mascot }) — see references/MASCOT.md');
    const size = o.size ?? 320, [vw, vh] = M.viewBox || [400, 400], sc = M.screen;
    const node = h(`<div class="alf-mascot" style="width:${u(size)};height:${u((size * vh) / vw)}">${M.svg('m' + (++MID))}</div>`);
    const cv = document.createElement('canvas'); node.appendChild(cv);
    Object.assign(cv.style, { left: `${(sc.x / vw) * 100}%`, top: `${(sc.y / vh) * 100}%`, width: `${(sc.w / vw) * 100}%`, height: `${(sc.h / vh) * 100}%`, borderRadius: sc.r ? `${(sc.r / sc.w) * 100}% / ${(sc.r / sc.h) * 100}%` : '' });
    const scr = dotScreen(cv, { cols: sc.cols ?? 22, rows: sc.rows ?? 9, led: M.led || F.brand.accent, off: M.ledOff, cond: M.condense });
    const say = o.say || [[0, M.name || 'HELLO']], nods = o.nod || [];
    // sparks under it (or steam from a vent, dust, bubbles…): M.sparks = { x, y, rise, spread, color, size: [a, b], n, soft }
    const sp = { x: 0.5, y: 0.96, rise: 0.3, spread: 1, size: [2, 5], n: 26, ...(typeof M.sparks === 'object' ? M.sparks : {}) };
    const sparks = [];
    if (o.sparks ?? M.sparks ?? true) {
      for (let i = 0; i < sp.n; i++) { const s = document.createElement('i'); s.className = 'alf-spark'; s.style.background = sp.color || F.brand.accent; if (sp.soft) s.style.filter = `blur(${sp.soft}px)`; node.appendChild(s); sparks.push({ s, a: (i * 2.399) % 6.283, r: 0.18 + ((i * 37) % 23) / 60, v: 0.35 + ((i * 13) % 7) / 14, z: (i * 0.137) % 1, sz: sp.size[0] + ((i * 7) % 5) / 4 * (sp.size[1] - sp.size[0]) }); }
    }
    return {
      node, kind: 'mascot', enterCue: 'chime', says: say,
      cues: [...say.slice(1).map(([t]) => [t, 'blip', 0.5]), ...nods.map((t) => [t, 'nod', 0.3])],
      pose(t) {
        let y = 0, rx = 0, rz = 0;
        for (const n of nods) { const q = t - n; if (q > -0.25 && q < 0.9) { const a = q < 0 ? -Math.sin((-q / 0.25) * Math.PI) * 0.25 : Math.exp(-q * 5) * Math.sin(q * 11); y += a * 14; rx -= a * 7; } }
        rz += Math.sin(t * 0.9) * 1.2;
        return { y, rx, rz };
      },
      update(t) {
        let cur = say[0], k = 0; for (let i = 0; i < say.length; i++) if (t >= say[i][0]) { cur = say[i]; k = i; }
        const prev = k > 0 ? say[k - 1] : null, since = t - cur[0], op = cur[2] || {};
        scr.draw(cur[1], { t: since, speed: op.speed ?? 14, blink: op.blink, prev: prev && since < 0.3 ? prev[1] : null, wipe: cl(since / 0.3), dim: op.dim });
        for (const q of sparks) {
          const life = (t * q.v * 0.35 + q.z) % 1, x = sp.x * 100 + Math.cos(q.a) * q.r * 120 * sp.spread * (0.6 + life * 0.6), y = sp.y * 100 - life * sp.rise * 100 + Math.sin(q.a) * 4 * sp.spread, k = sp.grow ? 1 + life * sp.grow : 1;
          Object.assign(q.s.style, { left: x.toFixed(2) + '%', top: y.toFixed(2) + '%', width: (q.sz * k * F.U).toFixed(2) + 'px', height: (q.sz * k * F.U).toFixed(2) + 'px', opacity: (Math.sin(life * Math.PI) * (sp.alpha ?? 0.75)).toFixed(3) });
        }
      },
    };
  },
  // the mascot small, for chat avatars (a still: its screen shows avatarSay)
  avatarSvg() {
    const M = F.mascot; if (!M) return '';
    if (M._ava) return M._ava;
    const [vw, vh] = M.viewBox || [400, 400], sc = M.screen, cv = document.createElement('canvas');
    const scr = dotScreen(cv, { cols: sc.cols ?? 22, rows: sc.rows ?? 9, led: M.led || F.brand.accent, off: M.ledOff, cond: M.condense });
    scr.draw(M.avatarSay || M.name || '', { t: 0, still: true });
    const url = cv.toDataURL();
    const [ax, ay, aw, ah] = M.avatarBox || [0, 0, vw, vh], k = Math.max(aw, ah);
    const box = [ax - (k - aw) / 2, ay - (k - ah) / 2, k, k];
    const svg = M.svg('av').replace(/viewBox="[^"]*"/, `viewBox="${box.join(' ')}"`);
    return (M._ava = `<div class="alf-mascot" style="width:100%;height:100%;overflow:visible">${svg}<img src="${url}" style="position:absolute;left:${((sc.x - box[0]) / k) * 100}%;top:${((sc.y - box[1]) / k) * 100}%;width:${(sc.w / k) * 100}%;height:${(sc.h / k) * 100}%"></div>`);
  },

  // SVG helpers for drawing a mascot: soft plastic / brushed metal / glass gradients and a gloss highlight
  svg: {
    plastic: (id, c, o = {}) => `<radialGradient id="${id}" cx="${o.cx ?? 0.35}" cy="${o.cy ?? 0.28}" r="${o.r ?? 0.85}"><stop offset="0" stop-color="${mix(c, '#ffffff', 0.55)}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${mix(c, '#000000', 0.38)}"/></radialGradient>`,
    metal: (id, o = {}) => `<linearGradient id="${id}" x1="0" y1="0" x2="${o.x2 ?? 1}" y2="${o.y2 ?? 1}"><stop offset="0" stop-color="#fbfbfb"/><stop offset=".28" stop-color="#c9cacd"/><stop offset=".5" stop-color="#f4f4f5"/><stop offset=".72" stop-color="#9c9ea3"/><stop offset="1" stop-color="#dcdde0"/></linearGradient>`,
    glass: (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2b30"/><stop offset="1" stop-color="#0c0c0e"/></linearGradient>`,
    shade: (id, o = {}) => `<linearGradient id="${id}" x1="0" y1="0" x2="${o.x2 ?? 0}" y2="${o.y2 ?? 1}"><stop offset="0" stop-color="#fff" stop-opacity="${o.top ?? 0.55}"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${o.bottom ?? 0.18}"/></linearGradient>`,
  },
  mix: (a, b, p) => mix(a, b, p),
};

function halo(c, a = 0.5) { const d = document.createElement('div'); d.className = 'alf-halo'; const [r, g, b] = rgb(c); d.style.background = `radial-gradient(closest-side, rgba(${r},${g},${b},${a}), rgba(${r},${g},${b},${a * 0.35}) 50%, rgba(${r},${g},${b},0))`; return d; }
function rgb(c) { c = String(c).replace('#', ''); if (c.length === 3) c = [...c].map((x) => x + x).join(''); const n = parseInt(c, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function lum(c) { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
function mix(a, b, p) { const x = rgb(a), y = rgb(b); return '#' + x.map((v, i) => Math.round(lerp(v, y[i], p)).toString(16).padStart(2, '0')).join(''); }

// ── the dot-matrix screen: text is rasterised at 4× the row count, averaged down to dots, and lit; wide text scrolls
const RASTER = new Map();
function raster(text, rows, cols, cond = 0.82) {
  const key = rows + '|' + cols + '|' + cond + '|' + text; if (RASTER.has(key)) return RASTER.get(key);
  const S = 4, c = document.createElement('canvas'), g = c.getContext('2d', { willReadFrequently: true });
  const font = `800 ${Math.round(rows * S * 0.98)}px "ALF Sans", sans-serif`;
  g.font = font; const nat = g.measureText(text).width / S;
  // LED signs squeeze letters before they scroll: condense to fit, down to 62 %, then scroll
  const sx = Math.max(Math.min(cond, (cols - 1) / Math.max(1, nat)), 0.62), w = Math.ceil(nat * sx) + 2;
  c.width = Math.max(1, w * S); c.height = rows * S;
  g.font = font; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
  const m = g.measureText(text), asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
  g.setTransform(sx, 0, 0, 1, 0, 0);
  g.fillText(text, S / sx, (rows * S + asc - desc) / 2);
  const d = g.getImageData(0, 0, c.width, c.height).data, bits = [];
  for (let x = 0; x < w; x++) { const col = []; for (let y = 0; y < rows; y++) { let s = 0; for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) s += d[((y * S + yy) * c.width + x * S + xx) * 4 + 3]; col.push(s / (S * S * 255) > 0.36 ? 1 : 0); } bits.push(col); }
  while (bits.length && !bits[0].some(Boolean)) bits.shift();
  while (bits.length && !bits[bits.length - 1].some(Boolean)) bits.pop();
  RASTER.set(key, bits); return bits;
}
function dotScreen(cv, { cols, rows, led, off, cond = 0.82 }) {
  const P = 12, W = cols * P, H = rows * P; cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), [r, gg, b] = rgb(led), offC = off || `rgba(${r},${gg},${b},0.13)`;
  let lastKey = '';
  const grid = (text, shift) => { const bits = raster(text, rows, cols, cond), w = bits.length, x0 = w <= cols ? Math.floor((cols - w) / 2) : -shift; return (x, y) => { const i = x - x0; return i >= 0 && i < w ? bits[i][y] : 0; }; };
  return {
    draw(text, o = {}) {
      text = String(text);
      const bits = raster(text, rows, cols, cond), w = bits.length;
      let shift = 0;
      if (w > cols && !o.still) { const loop = w + cols * 0.6; shift = Math.floor(((o.t * (o.speed ?? 14)) % loop) - cols * 0.25); }
      const on = o.blink ? Math.floor(o.t / 0.32) % 2 === 0 : true;
      const wipeCol = o.prev ? Math.floor((o.wipe ?? 1) * (cols + 1)) : cols + 1;
      const key = `${text}|${shift}|${on}|${wipeCol}|${o.prev}`; if (key === lastKey) return; lastKey = key;
      const A = grid(text, shift), B = o.prev ? grid(o.prev, 0) : null;
      g.clearRect(0, 0, W, H);
      for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
        const lit = x < wipeCol ? (x === wipeCol - 1 && B ? 1 : A(x, y) && on) : B(x, y);
        const cx = x * P + P / 2, cy = y * P + P / 2;
        if (lit) { g.fillStyle = `rgba(${r},${gg},${b},0.35)`; g.beginPath(); g.arc(cx, cy, P * 0.62, 0, 6.283); g.fill(); g.fillStyle = mix(led, '#ffffff', 0.35); g.beginPath(); g.arc(cx, cy, P * 0.36, 0, 6.283); g.fill(); }
        else { g.fillStyle = offC; g.beginPath(); g.arc(cx, cy, P * 0.3, 0, 6.283); g.fill(); }
      }
    },
  };
}
