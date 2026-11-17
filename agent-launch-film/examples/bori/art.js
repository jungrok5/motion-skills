// 「보리」's drawings: ingredient thumbnails and dishes seen from above — designed in code for this topic. Each returns an
// SVG string; nothing here is random at render time (shapes are placed from a seed at build time).
const R = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

// ingredient thumbnails, 120 × 120: a soft tile and a simple object
const shapes = {
  두부: (c) => `<rect x="30" y="38" width="60" height="46" rx="8" fill="#fbfaf5"/><path d="M30 46 L42 34 L102 34 L90 46 Z" fill="#fff"/><path d="M90 46 L102 34 L102 76 L90 84 Z" fill="#e7e3d8"/>`,
  애호박: () => `<ellipse cx="60" cy="60" rx="38" ry="38" fill="#7cbf5a"/><ellipse cx="60" cy="60" rx="31" ry="31" fill="#e9f2c8"/><circle cx="60" cy="60" r="10" fill="#d8e6a8"/>${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${60 + 18 * Math.cos(i)}" cy="${60 + 18 * Math.sin(i)}" r="2" fill="#c2d48a"/>`).join('')}`,
  달걀: () => `<ellipse cx="52" cy="62" rx="24" ry="30" fill="#f7efe3"/><ellipse cx="74" cy="58" rx="22" ry="28" fill="#fff8ee"/><ellipse cx="68" cy="48" rx="6" ry="9" fill="#fff" opacity=".8"/>`,
  양파: () => `<path d="M60 26 Q88 44 86 70 Q84 94 60 96 Q36 94 34 70 Q32 44 60 26 Z" fill="#e3b77a"/><path d="M60 26 Q70 50 68 96 M60 26 Q50 50 52 96" stroke="#c9955a" stroke-width="2" fill="none"/>`,
  김치: () => `<path d="M28 74 Q30 40 60 34 Q92 40 94 72 Q80 92 60 90 Q38 92 28 74 Z" fill="#d84a2e"/><path d="M40 60 Q60 50 80 62 M44 74 Q60 64 78 76" stroke="#f08a5a" stroke-width="5" stroke-linecap="round" fill="none"/>`,
  돼지고기: () => `<path d="M26 66 Q28 38 62 36 Q96 38 96 64 Q94 88 60 88 Q28 88 26 66 Z" fill="#e98a8a"/><path d="M34 60 Q62 50 90 62" stroke="#fde3e0" stroke-width="7" stroke-linecap="round" fill="none"/>`,
  대파: () => `<rect x="20" y="52" width="80" height="16" rx="8" fill="#f2f5e6"/><rect x="66" y="52" width="34" height="16" rx="8" fill="#76b852"/><rect x="20" y="70" width="70" height="12" rx="6" fill="#eef2dc"/>`,
  버섯: () => `<path d="M30 60 Q32 32 60 30 Q88 32 90 60 Z" fill="#a8774f"/><rect x="50" y="58" width="20" height="30" rx="8" fill="#efe4d2"/>`,
  감자: () => `<ellipse cx="58" cy="62" rx="34" ry="26" fill="#d6b07a"/>${[[46, 54], [68, 66], [62, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#a98250"/>`).join('')}`,
  당근: () => `<path d="M30 38 L88 70 Q92 80 82 82 L28 46 Q24 40 30 38 Z" fill="#f08a2c"/><path d="M28 40 L18 30 M30 38 L24 24 M32 40 L34 26" stroke="#5aa845" stroke-width="5" stroke-linecap="round"/>`,
  시금치: () => `<path d="M60 92 Q36 70 40 40 Q60 30 64 60 Z" fill="#3f8f3a"/><path d="M60 92 Q84 70 82 42 Q64 36 58 64 Z" fill="#56a84b"/><path d="M60 92 L60 56" stroke="#9bd18a" stroke-width="3"/>`,
  청양고추: () => `<path d="M24 48 Q70 30 96 74 Q98 82 90 80 Q66 50 26 58 Z" fill="#2f8d3a"/><path d="M24 48 L16 42" stroke="#5a7a35" stroke-width="5" stroke-linecap="round"/>`,
  우유: () => `<path d="M42 30 L78 30 L78 40 L86 52 L86 96 L34 96 L34 52 L42 40 Z" fill="#fff"/><rect x="34" y="62" width="52" height="18" fill="#7fb6e8"/>`,
  된장: () => `<rect x="30" y="44" width="60" height="50" rx="10" fill="#b07a3c"/><rect x="26" y="36" width="68" height="14" rx="6" fill="#7a4f22"/>`,
};
export function thumb(name, bg = '#f3efe6') {
  const f = shapes[name] || shapes.두부;
  return `<svg viewBox="0 0 120 120" width="100%" height="100%"><rect width="120" height="120" rx="26" fill="${bg}"/>${f()}</svg>`;
}

// a dish from above: a bowl (earthenware ttukbaegi, white bowl or plate), the broth or base, and what is in it
const BITS = {
  tofu: (r, x, y) => `<rect x="${x - 9}" y="${y - 9}" width="18" height="18" rx="3" fill="#fbf8ef" transform="rotate(${r() * 60} ${x} ${y})"/>`,
  zuke: (r, x, y) => `<path d="M${x - 10} ${y} A10 10 0 0 1 ${x + 10} ${y} Z" fill="#dfeab8" stroke="#79b558" stroke-width="2.5" transform="rotate(${r() * 360} ${x} ${y})"/>`,
  pepper: (r, x, y) => `<circle cx="${x}" cy="${y}" r="4.5" fill="none" stroke="#3a9a45" stroke-width="2.6"/>`,
  red: (r, x, y) => `<circle cx="${x}" cy="${y}" r="4.5" fill="none" stroke="#d8432e" stroke-width="2.6"/>`,
  onion: (r, x, y) => `<rect x="${x - 3}" y="${y - 6}" width="6" height="12" rx="3" fill="#7cc35a" transform="rotate(${r() * 180} ${x} ${y})"/>`,
  egg: (r, x, y) => `<ellipse cx="${x}" cy="${y}" rx="14" ry="12" fill="#fff"/><circle cx="${x + 1}" cy="${y}" r="6" fill="#f6b52b"/>`,
  meat: (r, x, y) => `<path d="M${x - 11} ${y - 4} Q${x} ${y - 10} ${x + 11} ${y - 3} Q${x + 8} ${y + 7} ${x - 9} ${y + 6} Z" fill="#c76a5a"/>`,
  shroom: (r, x, y) => `<path d="M${x - 8} ${y} Q${x} ${y - 11} ${x + 8} ${y} Z" fill="#9a6a45"/><rect x="${x - 2.5}" y="${y}" width="5" height="7" fill="#e9dcc7"/>`,
  potato: (r, x, y) => `<rect x="${x - 8}" y="${y - 7}" width="16" height="14" rx="5" fill="#e8c88a" transform="rotate(${r() * 90} ${x} ${y})"/>`,
  carrot: (r, x, y) => `<circle cx="${x}" cy="${y}" r="6" fill="#f08a2c"/>`,
  sesame: (r, x, y) => `<ellipse cx="${x}" cy="${y}" rx="1.6" ry="1" fill="#f3e7c4" transform="rotate(${r() * 180} ${x} ${y})"/>`,
  spinach: (r, x, y) => `<path d="M${x} ${y} q8 -10 14 -2 q-6 8 -14 2z" fill="#3f8f3a" transform="rotate(${r() * 360} ${x} ${y})"/>`,
  rice: (r, x, y) => `<ellipse cx="${x}" cy="${y}" rx="3" ry="1.6" fill="#fffdf6" transform="rotate(${r() * 180} ${x} ${y})"/>`,
};
export function dish({ bowl = 'ttuk', base = '#c98a3e', bits = {}, seed = 1, cx = 150, cy = 230, rad = 92 }) {
  const r = R(seed); let inside = '';
  for (const [k, n] of Object.entries(bits)) for (let i = 0; i < n; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * rad * 0.78; inside += BITS[k](r, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.92); }
  const rim = bowl === 'ttuk' ? `<ellipse cx="${cx}" cy="${cy + 10}" rx="${rad + 26}" ry="${rad + 22}" fill="#000" opacity=".22"/><ellipse cx="${cx}" cy="${cy}" rx="${rad + 22}" ry="${rad + 20}" fill="#4a2f22"/><ellipse cx="${cx}" cy="${cy}" rx="${rad + 10}" ry="${rad + 8}" fill="#2e1c14"/>`
    : bowl === 'plate' ? `<ellipse cx="${cx}" cy="${cy + 10}" rx="${rad + 34}" ry="${rad + 28}" fill="#000" opacity=".18"/><ellipse cx="${cx}" cy="${cy}" rx="${rad + 30}" ry="${rad + 28}" fill="#fbfaf7"/><ellipse cx="${cx}" cy="${cy}" rx="${rad + 6}" ry="${rad + 4}" fill="#f1eee8"/>`
      : `<ellipse cx="${cx}" cy="${cy + 10}" rx="${rad + 24}" ry="${rad + 20}" fill="#000" opacity=".2"/><ellipse cx="${cx}" cy="${cy}" rx="${rad + 20}" ry="${rad + 18}" fill="#fdfcf9"/><ellipse cx="${cx}" cy="${cy}" rx="${rad + 8}" ry="${rad + 6}" fill="#e9e5dc"/>`;
  return `<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="dg${seed}" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>${rim}<ellipse cx="${cx}" cy="${cy}" rx="${rad}" ry="${rad * 0.94}" fill="${base}"/>${inside}<ellipse cx="${cx}" cy="${cy}" rx="${rad}" ry="${rad * 0.94}" fill="url(#dg${seed})"/></svg>`;
}

// the week: dish name, poster colours, bowl, base and what goes in
export const WEEK = [
  { day: '월', name: '된장찌개', bg: ['#F3D9B1', '#E2B27A'], d: { bowl: 'ttuk', base: '#c0803a', bits: { tofu: 7, zuke: 6, pepper: 5, onion: 6, shroom: 3 } } },
  { day: '화', name: '김치볶음밥', bg: ['#F6C7B4', '#E58D6E'], d: { bowl: 'plate', base: '#d9643c', bits: { meat: 4, onion: 8, egg: 1, sesame: 18 } } },
  { day: '수', name: '애호박전', bg: ['#E3EDC4', '#B9D58A'], d: { bowl: 'plate', base: '#f1eee8', bits: { zuke: 12, red: 4 } } },
  { day: '목', name: '버섯불고기', bg: ['#EBD5C3', '#C99C7C'], d: { bowl: 'plate', base: '#7a4a32', bits: { meat: 9, shroom: 7, onion: 6, sesame: 14 } } },
  { day: '금', name: '감자조림', bg: ['#F4E3B5', '#E2C077'], d: { bowl: 'white', base: '#b8742e', bits: { potato: 11, carrot: 4, sesame: 12 } } },
  { day: '토', name: '시금치비빔밥', bg: ['#D9EDD2', '#9FCE91'], d: { bowl: 'white', base: '#fbf6ea', bits: { rice: 40, spinach: 7, carrot: 5, egg: 1, meat: 3 } } },
  { day: '일', name: '달걀국', bg: ['#F7EBC4', '#EBCF80'], d: { bowl: 'white', base: '#f2d99a', bits: { egg: 2, onion: 9, tofu: 3 } } },
];
