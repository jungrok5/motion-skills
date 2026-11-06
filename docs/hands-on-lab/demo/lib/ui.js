// hands-on-lab · UI helpers: language, number formatting, the schematic builder, the mini chart, maths blocks.
// All of these return HTML/SVG strings; lab.js puts them in place only when the string changes.

// ---------- language ----------
// Every text a course shows is either a plain string (same in every language: units, symbols) or { en: '…', ko: '…' }.
export const CHROME = {
  en: {
    overview: 'Overview', parts: 'Parts', maths: 'Maths', lesson: 'Lesson', lessons: 'Lessons', power: 'Power', on: 'On', off: 'Off',
    powerOn: 'Power on', powerOff: 'Power off', buildIt: 'Build it', clickHint: 'Click a highlighted part to change it.',
    tryIt: 'Try it', done: 'done', prev: 'Previous lesson', next: 'Next lesson', reset: 'Reset', expand: 'Bigger diagram',
    close: 'Close', language: 'Language', camHint: 'Drag to turn · scroll or pinch to zoom', rotL: 'Turn left', rotR: 'Turn right',
    zoomIn: 'Zoom in', zoomOut: 'Zoom out', home: 'Reset view', hold: 'Hold', chart: 'Chart', partsHint: 'Click a part to find it on the bench.',
    mathsHint: 'The numbers update as you change the bench.', complete: 'complete', settings: 'Settings',
  },
  ko: {
    overview: '개요', parts: '부품', maths: '수식', lesson: '레슨', lessons: '레슨', power: '전원', on: '켜짐', off: '꺼짐',
    powerOn: '전원 켜기', powerOff: '전원 끄기', buildIt: '만드는 방법', clickHint: '강조된 부품을 눌러 바꿔 보세요.',
    tryIt: '해 보기', done: '완료', prev: '이전 레슨', next: '다음 레슨', reset: '처음으로', expand: '크게 보기',
    close: '닫기', language: '언어', camHint: '끌어서 돌리기 · 스크롤이나 두 손가락으로 확대', rotL: '왼쪽으로 돌리기', rotR: '오른쪽으로 돌리기',
    zoomIn: '확대', zoomOut: '축소', home: '시점 처음으로', hold: '누르고 있기', chart: '그래프', partsHint: '부품을 누르면 실험대에서 찾아 줍니다.',
    mathsHint: '실험대를 바꾸면 숫자도 바로 바뀝니다.', complete: '완료', settings: '설정',
  },
};
export const LANG_NAMES = { en: 'English', ko: '한국어', ja: '日本語', es: 'Español', fr: 'Français', de: 'Deutsch', pt: 'Português', zh: '中文' };

export function makeT(getLang) {
  const T = (x) => {
    if (x == null) return '';
    if (typeof x === 'string' || typeof x === 'number') return String(x);
    if (typeof x === 'function') return T(x());
    const l = getLang();
    return x[l] ?? x.en ?? Object.values(x)[0] ?? '';
  };
  return T;
}

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- numbers ----------
const PREFIX = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
/** si(0.0042, 'A') → '4.2 mA'; si(4700, 'Ω') → '4.7 kΩ'. digits = significant figures (default 3, trailing zeros trimmed) */
export function si(v, unit = '', digits = 3) {
  if (!Number.isFinite(v)) return '–';
  if (v === 0) return `0 ${unit}`.trim();
  const a = Math.abs(v);
  let [f, p] = PREFIX.find(([f]) => a >= f * 0.9995) || PREFIX[PREFIX.length - 1];
  if (unit === '' || unit === '%' || unit === '°' || unit === 'rpm' || unit === '×') { f = 1; p = ''; }
  const n = v / f;
  const d = Math.max(0, digits - 1 - Math.floor(Math.log10(Math.abs(n) || 1)));
  let s = n.toFixed(Math.min(d, 4));
  if (s.includes('.')) s = s.replace(/\.?0+$/, '');
  return `${s} ${p}${unit}`.trim();
}
/** fix(2.345, 2) → '2.35' (fixed decimals, minus sign as U+2212) */
export const fix = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('-', '−') : '–');

// ---------- schematic builder ----------
// const s = schematic(300, 170); s.wire([[20,20],[280,20]], { flow: 'main' }); s.part('r1', 150, 20, SYM.resistor, { label: '4.7 kΩ' });
// A symbol is (s, opt) => svg string drawn around (0,0) pointing along +x; s.part rotates and positions it.
export function schematic(w, h, ctx = {}) {
  const out = [];
  const sel = ctx.selected, pick = ctx.pickable || new Set();
  const s = {
    w, h,
    raw(svg) { out.push(svg); return s; },
    wire(pts, o = {}) {
      const d = 'M' + pts.map((p) => p.join(',')).join(' L');
      out.push(`<path class="sc-wire${o.dim ? ' is-dim' : ''}" d="${d}"/>`);
      if (o.flow) out.push(`<path class="sc-flow" data-flow="${o.flow}"${o.reverse ? ' data-rev="1"' : ''} d="${d}"/>`);
      return s;
    },
    dot(x, y) { out.push(`<circle class="sc-dot" cx="${x}" cy="${y}" r="2.6"/>`); return s; },
    text(x, y, str, o = {}) {
      out.push(`<text class="sc-text ${o.cls || ''}" x="${x}" y="${y}" text-anchor="${o.anchor || 'middle'}">${esc(str)}</text>`);
      return s;
    },
    arrow(x1, y1, x2, y2, o = {}) {
      const a = Math.atan2(y2 - y1, x2 - x1), hl = o.head ?? 7;
      const p1 = [x2 - hl * Math.cos(a - 0.45), y2 - hl * Math.sin(a - 0.45)], p2 = [x2 - hl * Math.cos(a + 0.45), y2 - hl * Math.sin(a + 0.45)];
      out.push(`<g class="sc-arrow ${o.cls || ''}"><path d="M${x1},${y1} L${x2},${y2}"/><path class="head" d="M${x2},${y2} L${p1} L${p2} Z"/></g>`);
      return s;
    },
    /** a component: id links it to the 3D part and its controls; rot in degrees; label text drawn at labelAt (relative) */
    part(id, x, y, sym, o = {}) {
      const cls = ['sc-part', pick.has(id) ? 'is-pick' : '', sel === id ? 'is-sel' : '', o.on ? 'is-on' : ''].join(' ');
      const body = typeof sym === 'function' ? sym(s, o) : sym;
      out.push(`<g class="${cls}" data-act="select" data-part="${id}" transform="translate(${x},${y}) rotate(${o.rot || 0})">` +
        `<rect class="sc-hit" x="${-(o.hw ?? 22)}" y="${-(o.hh ?? 14)}" width="${(o.hw ?? 22) * 2}" height="${(o.hh ?? 14) * 2}" rx="5"/>${body}</g>`);
      if (o.label) {
        const [lx, ly] = o.labelAt || [0, -20];
        out.push(`<text class="sc-label" x="${x + lx}" y="${y + ly}" text-anchor="${o.anchor || 'middle'}">${esc(o.label)}</text>`);
      }
      return s;
    },
    svg() { return `<svg class="sc" viewBox="0 0 ${w} ${h}" role="img">${out.join('')}</svg>`; },
  };
  return s;
}

// ---------- chart ----------
// spec: { title, sub, x: { label, min, max, fmt }, y: { label, min, max, fmt }, series: [[x,y],…] | [{ pts, cls }], marker: [x,y] }
export function chartSVG(spec, T) {
  const W = 220, H = 118, L = 30, R = 10, Tp = 10, B = 22;
  const xs = spec.x, ys = spec.y;
  const X = (v) => L + ((v - xs.min) / (xs.max - xs.min)) * (W - L - R);
  const Y = (v) => H - B - ((Math.max(ys.min, Math.min(ys.max, v)) - ys.min) / (ys.max - ys.min)) * (H - B - Tp);
  const ticks = (a, b) => [a, (a + b) / 2, b];
  const fx = xs.fmt || ((v) => +v.toFixed(2)), fy = ys.fmt || ((v) => +v.toFixed(2));
  let g = '';
  for (const t of ticks(ys.min, ys.max)) g += `<line class="ch-grid" x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}"/><text class="ch-tick" x="${L - 4}" y="${Y(t) + 3}" text-anchor="end">${esc(fy(t))}</text>`;
  for (const t of ticks(xs.min, xs.max)) g += `<text class="ch-tick" x="${X(t)}" y="${H - B + 12}" text-anchor="middle">${esc(fx(t))}</text>`;
  g += `<line class="ch-axis" x1="${L}" x2="${L}" y1="${Tp}" y2="${H - B}"/><line class="ch-axis" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>`;
  const list = Array.isArray(spec.series?.[0]) ? [{ pts: spec.series }] : spec.series || [];
  for (const s of list) {
    if (!s.pts.length) continue;
    const d = 'M' + s.pts.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' L');
    g += `<path class="ch-line ${s.cls || ''}" d="${d}"/>`;
  }
  if (spec.marker && Number.isFinite(spec.marker[1])) g += `<circle class="ch-mark" cx="${X(spec.marker[0]).toFixed(1)}" cy="${Y(spec.marker[1]).toFixed(1)}" r="3.4"/>`;
  g += `<text class="ch-ax" x="${L + 3}" y="${Tp + 2}">${esc(T(ys.label))}</text><text class="ch-ax" x="${W - R}" y="${H - B - 4}" text-anchor="end">${esc(T(xs.label))}</text>`;
  return `<svg class="ch" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}

// ---------- maths blocks ----------
// [{ h }, { p }, { eq }, { calc }, { res }, { note }] → html. Strings or { en, ko }.
export function mathsHTML(blocks, T) {
  return blocks.map((b) => {
    if (b.h) return `<h4>${esc(T(b.h))}</h4>`;
    if (b.p) return `<p>${esc(T(b.p))}</p>`;
    if (b.eq) return `<div class="m-eq">${esc(T(b.eq))}</div>`;
    if (b.calc) return `<div class="m-calc">${esc(T(b.calc))}</div>`;
    if (b.res) return `<div class="m-res">${esc(T(b.res))}</div>`;
    if (b.note) return `<p class="m-note">${esc(T(b.note))}</p>`;
    return '';
  }).join('');
}

// ---------- small icons (inline SVG, stroke = currentColor) ----------
const ic = (d, vb = 24) => `<svg viewBox="0 0 ${vb} ${vb}" aria-hidden="true"><path d="${d}"/></svg>`;
export const ICON = {
  book: ic('M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1zM12 6v14'),
  globe: ic('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18'),
  rotL: ic('M4 12a8 8 0 1 0 3-6.2M4 4v4h4'),
  rotR: ic('M20 12a8 8 0 1 1-3-6.2M20 4v4h-4'),
  minus: ic('M5 12h14'), plus: ic('M5 12h14M12 5v14'),
  home: ic('M4 11l8-7 8 7v9h-5v-6H9v6H4z'),
  expand: ic('M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'),
  reset: ic('M5 12a7 7 0 1 0 2-5M5 4v4h4'),
  chevL: ic('M15 5l-7 7 7 7'), chevR: ic('M9 5l7 7-7 7'), chevD: ic('M6 9l6 6 6-6'),
  check: ic('M5 12l4 4 10-10'), close: ic('M6 6l12 12M18 6L6 18'),
  chart: ic('M4 20V4M4 20h16M7 16l4-5 3 3 5-7'),
  bolt: ic('M13 2L4 14h7l-1 8 9-12h-7z'),
  info: ic('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.5'),
};
