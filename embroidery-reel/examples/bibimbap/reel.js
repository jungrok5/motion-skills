// 비빔밥 한 그릇 — the worked example: a topic the source does not have, designed from the brief (BRIEF.md).
// Six ingredients in the order they go into the bowl; each patch drawn for its ingredient from shapes (references/KIT.md).
import { reel } from 'reel/reel.js';

const ring = (cx, cy, r, n = 48) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * Math.PI * 2) * r, cy + Math.sin(i / n * Math.PI * 2) * r]);
const wave = (x, y0, y1, a, k, ph = 0, n = 24) => Array.from({ length: n + 1 }, (_, i) => [x + Math.sin(i / n * Math.PI * k + ph) * a, y0 + (y1 - y0) * i / n]);
// a leaf: base at (x, y), pointing at angle a (deg), length l, half-width w
const leaf = (x, y, a, l, w, n = 16) => { const r = a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), P = [];
  for (let i = 0; i <= n; i++) { const t = i / n, h = Math.sin(Math.PI * t) * w * (1 - t * .25); P.push([t * l, -h]); }
  for (let i = n - 1; i > 0; i--) { const t = i / n, h = Math.sin(Math.PI * t) * w * (1 - t * .25); P.push([t * l, h]); }
  return P.map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]); };
const vein = (x, y, a, l) => { const r = a * Math.PI / 180; return [[x, y], [x + Math.cos(r) * l * .9, y + Math.sin(r) * l * .9]]; };

const CREAM = '#f4ecdc', INDIGO = '#26335c';

reel({
  title: '비빔밥 한 그릇',
  size: [1080, 1350], fps: 30, seed: 21,
  cloth: '#d3c4a3', thread: '#26304f', accent: '#b83a2c', cord: '#e0b743',
  items: [
    { title: '밥', lines: ['갓 지은 흰쌀밥 한 공기', '쌀 2컵 · 30분'],
      patch: { w: 100, h: 80, shapes: [
        { rect: [3, 3, 94, 74], r: 14, fill: INDIGO, outline: CREAM, outlineWidth: 3.2, angle: 35 },
        { line: wave(42, 10, 26, 2.2, 3), width: 1.8, fill: '#bfcde6' },
        { line: wave(56, 8, 24, 2.2, 3, 1.4), width: 1.8, fill: '#bfcde6' },
        { path: 'M24 46 Q 26 32 37 33 Q 43 24 53 28 Q 63 24 67 33 Q 76 33 76 46 Z', fill: '#fbf8f1', angle: 20 },
        { path: 'M20 45 L 80 45 Q 78 70 50 71 Q 22 70 20 45 Z', fill: '#c99a3e', angle: 0 },
        { line: [[20, 46], [80, 46]], width: 2.4, fill: '#8e6a24' },
        { line: [[30, 58], [70, 58]], width: 1.4, fill: '#e6c47a' },
      ] } },
    { title: '시금치 나물', lines: ['데쳐서 참기름에 조물조물', '30초 · 소금 한 꼬집'], tagAt: 'above',
      patch: { w: 100, h: 80, shapes: [
        { rect: [3, 3, 94, 74], r: 10, fill: '#efe7d4', outline: '#2c5a36', outlineWidth: 3.2, angle: -25 },
        { poly: leaf(50, 68, -128, 46, 13), fill: '#2f6e3b', angle: 30 },
        { poly: leaf(50, 68, -52, 46, 13), fill: '#3f8a4a', angle: -30 },
        { poly: leaf(50, 70, -90, 52, 14), fill: '#57a457', angle: 60 },
        { line: vein(50, 68, -128, 46), width: 1, fill: '#cfe3b9' },
        { line: vein(50, 68, -52, 46), width: 1, fill: '#cfe3b9' },
        { line: vein(50, 70, -90, 52), width: 1.1, fill: '#e2efcf' },
        { line: [[50, 70], [50, 75]], width: 2.4, fill: '#c46a7a' },
      ] } },
    { title: '당근', lines: ['곱게 채 썰어 살짝 볶기', '중불 · 2분'],
      patch: { w: 100, h: 80, shapes: [
        { rect: [3, 3, 94, 74], r: 37, fill: '#1e2a47', outline: CREAM, outlineWidth: 3.2, angle: 50 },
        { poly: leaf(66, 30, -60, 16, 4), fill: '#4f9e48' },
        { poly: leaf(66, 30, -20, 18, 4.5), fill: '#66b357' },
        { poly: leaf(66, 30, -100, 14, 4), fill: '#3e8a3c' },
        { poly: [[22, 64], [61, 26], [73, 38]], fill: '#ef7f2c', angle: 135 },
        { line: [[50, 42], [56, 47]], width: 1.2, fill: '#c55f18' },
        { line: [[40, 51], [45, 56]], width: 1.2, fill: '#c55f18' },
        { line: [[58, 34], [63, 39]], width: 1.2, fill: '#c55f18' },
      ] } },
    { title: '달걀 프라이', lines: ['노른자는 반숙으로', '약불 · 뚜껑 덮고 3분'],
      patch: { w: 100, h: 80, shapes: [
        { rect: [3, 3, 94, 74], r: 16, fill: '#2a8c86', outline: CREAM, outlineWidth: 3.2, angle: -40 },
        { path: 'M24 40 C 22 22 46 14 58 21 C 73 16 84 30 77 44 C 83 59 64 67 52 62 C 37 69 20 58 24 40 Z', fill: '#fbf6ea', angle: 15 },
        { circle: [52, 42, 11.5], fill: '#f2a81e', angle: 70 },
        { ellipse: [48, 38, 3.6, 2.2], fill: '#ffd98a' },
        { run: ring(52, 42, 17, 40), closed: true, fill: '#e8dcc0' },
      ] } },
    { title: '고추장', lines: ['한 숟갈, 매운 건 취향껏', '찹쌀 고추장 · 매운맛 3'], tagAt: 'above',
      patch: { w: 100, h: 80, shapes: [
        { rect: [3, 3, 94, 74], r: 10, fill: '#f2eadb', outline: '#7a1f1f', outlineWidth: 3.2, angle: 30 },
        { path: 'M30 30 Q 25 52 34 70 L 66 70 Q 75 52 70 30 Z', fill: '#6b3a24', angle: -20 },
        { ellipse: [50, 29, 22, 5.2], fill: '#4a2616', angle: 0 },
        { rect: [35, 41, 30, 18], r: 3, fill: '#d33a2c', angle: 90 },
        { text: '고추장', at: [50, 54], size: 9, fill: '#fff1d6', angle: 0 },
        { line: [[78, 30], [82, 44], [79, 58]], width: 4.2, fill: '#c8232b' },
        { line: [[77, 30], [74, 24]], width: 1.8, fill: '#3f8a3c' },
      ] } },
    { title: '참기름', lines: ['마지막에 두 바퀴 둘러서', '볶은 참깨 · 한 스푼'],
      patch: { w: 100, h: 80, shapes: [
        { rect: [3, 3, 94, 74], r: 14, fill: '#22305a', outline: '#e0b743', outlineWidth: 3.2, angle: -35 },
        { path: 'M43 17 L 57 17 L 57 27 Q 69 33 69 45 L 69 71 L 31 71 L 31 45 Q 31 33 43 27 Z', fill: '#d49a2c', angle: 0 },
        { rect: [42, 10, 16, 8], r: 2, fill: '#b8322a', angle: 0 },
        { rect: [35, 47, 30, 15], r: 2, fill: CREAM, angle: 90 },
        { ellipse: [44, 54, 2.4, 1.5], fill: '#a57b3a', rot: 20 },
        { ellipse: [51, 52, 2.4, 1.5], fill: '#a57b3a', rot: -15 },
        { ellipse: [56, 56, 2.4, 1.5], fill: '#a57b3a', rot: 40 },
        { path: 'M80 34 Q 86 44 80 48 Q 74 44 80 34 Z', fill: '#f0c24a' },
      ] } },
  ],
  outro: { title: '비빔밥 한 그릇.', sub: '한 땀 한 땀.', footer: '여섯 가지를 한 그릇에 — 비비면 끝' },
});
