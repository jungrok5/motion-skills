// __TITLE__ — an embroidery reel. Design every item for this topic from BRIEF.md: its patch (shapes in sewing order),
// its embroidered title, its tag. These two placeholder items only show the contract — replace them; they are not a look.
// Shapes (references/KIT.md): rect / circle / ellipse / poly / path (SVG d, no arcs) / text — filled with stitches;
// line — a satin column along points; run — a running stitch. Each takes fill (thread colour), angle (stitch direction),
// outline + outlineWidth (satin edge). Design units are your own: patch { w, h } maps w to one patch width.
import { reel } from 'reel/reel.js';

reel({
  title: '__TITLE__',
  size: [1080, 1350], fps: 30, seed: 1,        // 4:5 vertical; [1920, 1080] works too (the grid and framing follow)
  cloth: '#cfbe9c', thread: '#202748',          // linen and the title thread (contrast ≥ 3)
  // paper: '#f5eedd', ink: '#2a2622', accent: '#b5332b', cord: '#e2bd45',
  // beat: 2.2, stitch: 1.2, travel: .7,         // seconds per item, of which stitching, of which the move
  // camera: { fov: 30, elev: 52, swing: 11 }, look: { exposure: .92, warmth: .5, bokeh: 1, leaves: 1, leafScale: 5 },
  items: [
    { title: 'First item', lines: ['what it is, in a few words', 'a handle · a number'],
      patch: { w: 100, h: 80, shapes: [
        { rect: [3, 3, 94, 74], r: 12, fill: '#2d3a5c', outline: '#f2e8d2', outlineWidth: 3.2 },   // the base goes first
        { circle: [50, 40, 18], fill: '#f5c242' },                                               // then the picture
      ] } },
    { title: 'Second item', lines: ['the tag can sit above', 'tagAt: above'], tagAt: 'above',
      patch: { w: 100, h: 80, shapes: [
        { rect: [3, 3, 94, 74], r: 36, fill: '#f3ecdc', outline: '#1f2747', outlineWidth: 3.2 },
        { poly: [[30, 60], [50, 18], [70, 60]], fill: '#d64535' },
      ] } },
  ],
  outro: { title: '__TITLE__.', sub: 'Stitch by stitch.', footer: '' },   // or outro: null for no end card
});
