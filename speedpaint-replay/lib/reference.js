// speedpaint-replay · reference.js — REFERENCE MODE: turn what scripts/from-image.mjs measured (ref.js) into the six
// stages of a painter's process, so the replay draws toward that picture the way a person would paint it:
//   rough      construction (head circle, centre line, eye line … from the plan) and loose silhouettes
//   line       every ink stroke with its measured width, in the ink colour, in the order of the plan's focus
//              (eyes → face → body → the rest), each stroke entered from its nearer end
//   flat       ONE colour per material (skin, hair, cloth, background …), brushed in material by material
//   shadow     the darker tone shapes of each material        highlight   the lighter tone shapes
//   finish     airbrush blending inside each material → detail strokes → colour trace of the line art
//
//   import { REF } from './ref.js';
//   const s = new Sketch({ ink: REF.ink }); const R = addReference(s, REF); /* + your own finish */ return s;
// Options: stages (which to add) · lineScale (width multiplier, 1) · ink (the line colour while drawing)
//          details (fraction of detail strokes kept, 1) · trace (false = leave the lines in the ink colour)
const pairs = a => { const o = []; for (let i = 0; i + 1 < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; };
// straight runs resampled every ~3 units, with the measured width carried along
function dense(p, w) {
  const pts = [p[0]], ws = [w[0]];
  for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3)); for (let j = 1; j <= n; j++) { const u = j / n; pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); ws.push(w[i - 1] + (w[i] - w[i - 1]) * u); } }
  return { pts, ws };
}

export function addReference(s, REF, o = {}) {
  if (REF.v !== 2) throw new Error('ref.js is from an older from-image.mjs: run it again');
  const want = new Set(o.stages ?? ['rough', 'line', 'flat', 'shadow', 'highlight', 'finish']);
  const ink = o.ink ?? REF.ink, lw = o.lineScale ?? 1, out = { flats: {} };
  if (want.has('rough')) {
    for (const c of REF.rough.construct) {
      if (c[0] === 'ellipse') s.ellipse(c[1], c[2], c[3], c[4], { rot: (c[5] || 0) * Math.PI / 180 });
      else if (c[0] === 'line') s.rough(pairs(c.slice(1)), { alpha: .75 });
    }
    for (const p of REF.rough.sil) s.rough(pairs(p), { alpha: .5, loose: 3, w: 1.5 });
  }
  if (want.has('line')) for (const l of REF.lines) {
    const d = dense(pairs(l.p), l.w);
    s.ink(d.pts, { raw: true, ws: d.ws.map(w => w * lw), w: 2, color: ink, color2: l.c });
  }
  for (const m of REF.materials) {
    if (want.has('flat')) out.flats[m.name] = s.region('flat', m.loops.map(pairs), { fill: m.base, name: m.name, edge: 1.8, area: m.area });
    for (const t of m.tones) {
      const stage = t.st === 's' ? 'shadow' : 'highlight';
      // a tone whose edge is soft in the picture is laid with a soft brush, kept inside its material (a clipping layer)
      if (want.has(stage)) s.region(stage, t.loops.map(pairs), { fill: t.c, area: t.area, angle: t.st === 's' ? .5 : -.9, blur: t.blur || 0, clip: t.blur && want.has('flat') ? m.name : null, name: `${m.name} ${t.st === 's' ? 'shadow' : 'light'}` });
    }
  }
  if (want.has('finish')) {
    for (const m of REF.materials) if (m.air.length) s.airbrush(m.air, { clip: out.flats[m.name], name: `${m.name} blend` });
    const keep = Math.round(REF.details.length * (o.details ?? 1));
    for (const d of REF.details.slice(0, keep)) s.paint(pairs(d.p), { raw: true, w: d.w, color: d.c, alpha: .92, weight: .3, taper: [.3, .4], floor: .3, wobble: .05 });
    if (o.trace !== false && want.has('line')) s.inkTrace({ weight: 2 });
  }
  return out;
}
