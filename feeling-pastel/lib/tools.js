// tools.js — dry media as numbers. Pick 3–5 per piece (BRIEF.md says which and why), or make your own with tool().
//
//   width     default mark width in virtual px (a stick's tip, a pencil's point)
//   tooth     how much the paper grain decides where pigment lands: 0 = ignores grain (paint), 1 = only the peaks at light pressure
//   gain      how sharply pressure turns into pigment once the grain is caught
//   opacity   most pigment one stroke can leave at a pixel
//   streak    parallel striations along the stroke from an uneven tip (0..1)
//   powder    random speckle: dust that did or did not stick (0..1)
//   level     how much earlier pigment fills the grain valleys (later strokes catch more evenly)
//   sat       how much earlier pigment refuses more (soft pastel and wax saturate; oil pastel does not)
//   fillRate  how fast a stroke fills the grain
//   edge      ragged stroke edge (0..1)
//   smear     how much a heavy stroke drags the colour already there into itself
//   taper     [in, out] — fraction of the stroke over which pressure builds and lifts
//   kind      'deposit' (default) · 'blend' (finger / tortillon: drags colour along) · 'lift' (kneaded eraser: back toward paper)
const BASE = { kind: 'deposit', width: 8, tooth: 0.8, gain: 3, opacity: 0.9, streak: 0.3, powder: 0.3, level: 0.4, sat: 0.3, fillRate: 0.5, edge: 0.35, smear: 0, taper: [0.1, 0.18] };

export const TOOLS = {
  // chalky stick, used on its tip for marks and on its side for broad passes; dusty, catches only the grain at light pressure
  softPastel: { width: 14, tooth: 0.92, gain: 3.2, opacity: 0.88, streak: 0.4, powder: 0.45, level: 0.3, sat: 0.55, fillRate: 0.45, edge: 0.5 },
  // waxy, buttery, opaque: covers what is under it, streaks along the stroke, light over dark works
  oilPastel: { width: 10, tooth: 0.62, gain: 4.2, opacity: 0.96, streak: 0.6, powder: 0.12, level: 0.65, sat: 0.04, fillRate: 0.8, edge: 0.35, smear: 0.12 },
  // pastel pencil: soft pastel in a pencil, for edges and small forms
  pastelPencil: { width: 3.2, tooth: 0.82, gain: 3, opacity: 0.85, streak: 0.18, powder: 0.3, level: 0.3, sat: 0.35, fillRate: 0.4, edge: 0.3, taper: [0.12, 0.25] },
  // wax-based coloured pencil: fine hatching, builds colour in layers, the grain shows through for a long time
  colouredPencil: { width: 2.2, tooth: 0.96, gain: 2.6, opacity: 0.62, streak: 0.1, powder: 0.25, level: 0.22, sat: 0.18, fillRate: 0.3, edge: 0.2, taper: [0.15, 0.3] },
  // Conté crayon: square stick, dense, dark lines and edges, a little grainy
  conte: { width: 6, tooth: 0.86, gain: 3.6, opacity: 0.92, streak: 0.42, powder: 0.32, level: 0.35, sat: 0.3, fillRate: 0.5, edge: 0.4 },
  // vine / compressed charcoal: very grainy, dusty, dark
  charcoal: { width: 8, tooth: 1, gain: 3, opacity: 0.9, streak: 0.5, powder: 0.6, level: 0.25, sat: 0.4, fillRate: 0.45, edge: 0.55 },
  // wax crayon: bright, waxy, resists layering (the wax seals the grain)
  waxCrayon: { width: 7, tooth: 0.9, gain: 5, opacity: 0.9, streak: 0.3, powder: 0.1, level: 0.2, sat: 0.72, fillRate: 0.9, edge: 0.3 },
  // finger / tortillon / paper stump: no pigment of its own, drags and softens what is there
  blender: { kind: 'blend', width: 22, opacity: 0.35, tooth: 0.3, edge: 0.4 },
  // kneaded eraser: lifts pigment back toward the paper (highlights, mist, light through)
  eraser: { kind: 'lift', width: 10, tooth: 0.5, gain: 3, opacity: 0.6, streak: 0.2, powder: 0.2, edge: 0.3, taper: [0.1, 0.2] },
};

// tool('oilPastel'), tool('softPastel', { width: 30 }), tool({ ... your own ... }), tool(existingTool, { … })
export function tool(base, over = {}) {
  const b = typeof base === 'string' ? TOOLS[base] : base;
  if (!b) throw new Error(`unknown tool: ${base} (have ${Object.keys(TOOLS).join(', ')})`);
  const name = over.name || (typeof base === 'string' ? base : b.name || 'custom');
  return { ...BASE, ...b, ...over, name };
}
