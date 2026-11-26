// A small morning — the starter: three items, one outro. Every patch is designed here from shapes (references/KIT.md).
import { reel } from 'reel/reel.js';

const ring = (cx, cy, r, n = 48) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * Math.PI * 2) * r, cy + Math.sin(i / n * Math.PI * 2) * r]);
const wave = (x0, x1, y, a, k, n = 30) => Array.from({ length: n + 1 }, (_, i) => { const x = x0 + (x1 - x0) * i / n; return [x, y + Math.sin(i / n * Math.PI * k) * a]; });

reel({
  title: 'A small morning',
  size: [1080, 1350], fps: 30, seed: 5,
  items: [
    { title: 'Coffee', lines: ['first cup, slowly', 'kettle · 92°C'],
      patch: { w: 100, h: 80, shapes: [
        { rect: [3, 3, 94, 74], r: 12, fill: '#2d3a5c', outline: '#f2e8d2', outlineWidth: 3.2 },
        { line: ring(68, 47, 7.5), closed: true, width: 3.4, fill: '#f2e8d2' },
        { rect: [30, 33, 34, 32], r: 7, fill: '#f2e8d2', angle: 90 },
        { ellipse: [47, 35, 15, 3.6], fill: '#6f4326' },
        { line: wave(40, 40.1, 22, 2, 3).map(([x, y], i) => [x + Math.sin(i / 3) * 2.2, 8 + i * .45]), width: 1.8, fill: '#c9d7ee' },
        { line: wave(52, 52.1, 22, 2, 3).map(([x, y], i) => [x + Math.sin(i / 3 + 1.5) * 2.2, 10 + i * .4]), width: 1.8, fill: '#c9d7ee' },
      ] } },
    { title: 'Sunrise', lines: ['the window, 6:40', 'east · clear sky'], tagAt: 'above',
      patch: { w: 100, h: 80, shapes: [
        { rect: [3, 3, 94, 74], r: 10, fill: '#93cfe9', outline: '#1f2747', outlineWidth: 3.2, angle: -30 },
        { circle: [50, 50, 17], fill: '#f5c242', angle: 20 },
        { path: 'M6 56 Q 28 40 50 54 T 94 50 L 94 74 L 6 74 Z', fill: '#3f9a5c', angle: 10 },
        { path: 'M6 64 Q 30 54 56 64 T 94 62 L 94 74 L 6 74 Z', fill: '#2e7a48', angle: -14 },
        { run: wave(18, 40, 20, 1.2, 2), fill: '#ffffff' },
        { run: wave(58, 84, 26, 1.2, 2), fill: '#ffffff' },
      ] } },
    { title: 'Bicycle', lines: ['the long way to work', '7.2 km · river path'],
      patch: { w: 100, h: 80, shapes: [
        { rect: [3, 3, 94, 74], r: 36, fill: '#f3ecdc', outline: '#1f2747', outlineWidth: 3.2 },
        { line: ring(30, 50, 13), closed: true, width: 2.6, fill: '#1f2747' },
        { line: ring(70, 50, 13), closed: true, width: 2.6, fill: '#1f2747' },
        { line: [[30, 50], [44, 30], [62, 30], [70, 50]], width: 2.4, fill: '#d64535' },
        { line: [[44, 30], [52, 50], [62, 30]], width: 2.4, fill: '#d64535' },
        { line: [[40, 24], [48, 24]], width: 2.4, fill: '#1f2747' },
        { line: [[60, 30], [58, 22], [66, 21]], width: 2.2, fill: '#1f2747' },
      ] } },
  ],
  outro: { title: 'A small morning.', sub: 'Stitch by stitch.', footer: 'three things, sewn before nine' },
});
