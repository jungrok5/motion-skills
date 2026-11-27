// __TITLE__ — written by new-film.mjs. This skeleton is the contract, not a look: replace the picture, the layers,
// the cycles, the flows, the plants and every word with the ones your topic needs (BRIEF.md first).
import { film } from 'cycle/film.js';

film({
  title: '__TITLE__',
  size: [1920, 1080], art: [320, 180], fps: 30, seed: 1,
  wind: { strength: 1, speed: 70 },
  paint({ pal, layer, kit, W, H }) {
    const { clamp } = kit;
    // 1. ramps, dark → light; 2. the cycles that turn some of them
    const sky = pal.ramp('sky', ['#0b1022', '#151c38', '#22284c', '#343660']);
    const ground = pal.ramp('ground', ['#14121a', '#1e1a24', '#2a2430']);
    const band = pal.ramp('band', ['#1d3a5c', '#2d5a86', '#7fb2d6', '#2d5a86']);
    const leaf = pal.ramp('leaf', ['#13241a', '#1f3a26', '#2f5634', '#4c7a44', '#79a35a']);
    const bandC = pal.cycle(band, { rate: 5 });

    // 3. layers, back to front — each becomes one plane when the picture comes apart
    const back = layer('back', { label: 'Replace: background', color: '#b7a6f0' });
    kit.gradient(back, sky, 0, 120);
    kit.gradient(back, ground, 120, H);
    const water = layer('water', { label: 'Replace: what flows', color: '#8fc4e6' });
    kit.flow(water, { name: 'flow', cycle: bandC, band: 3, mask: (x, y) => y > 128 && y < 150,
      along: (x, y) => x, across: (x, y) => y });
    const plants = layer('plants', { label: 'Replace: what the wind moves', color: '#a6dc86' });
    kit.plant(plants, { name: 'tuft', x: 260, y: 176, ramp: leaf, kind: 'blade',
      fronds: [{ a: -20, len: 30 }, { a: 0, len: 38 }, { a: 18, len: 32 }] });
  },
  panels: [
    { kind: 'cycle', cycle: 'band', zoom: 3, kicker: 'Palette cycling', title: 'Replace: what the cycle does, in one line.',
      left: 'Fixed indices', right: 'Same pixels, rotating colors', caption: 'Replace: what the purple marks.' },
    { kind: 'rig', layer: 'plants', center: [260, 150], zoom: 6, kicker: 'Wind rig', title: 'Replace: what the wind does.',
      left: 'Cutout', right: 'Pivots', caption: 'Replace: the follow-through, in one line.' },
  ],
});
