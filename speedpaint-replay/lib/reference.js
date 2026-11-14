// speedpaint-replay · reference.js — REFERENCE MODE: add the stages measured from an image (scripts/from-image.mjs →
// ref.js) to a Sketch, so the replay draws toward that picture. Only for an image the user owns or may use.
//
//   import { REF } from './ref.js';
//   const s = new Sketch({ … }); addReference(s, REF, { lines: 1, dabs: 1 }); /* + your own finish */ return s;
//
// Options: stages: which of 'rough','line','flat','shadow','highlight','finish' to add (default all);
// ink: colour the lines are pulled toward (keeps the line art reading as ink; mix 0 = the measured colours);
// lineScale: width multiplier; dabs: fraction of the detail dabs to keep (0…1).
import { mix } from './core.js';

const pairs = a => { const o = []; for (let i = 0; i + 1 < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; };

export function addReference(s, REF, o = {}) {
  const want = new Set(o.stages ?? ['rough', 'line', 'flat', 'shadow', 'highlight', 'finish']);
  const ink = o.ink ?? s.inkColor, inkMix = o.inkMix ?? .65, lw = o.lineScale ?? 1.25;
  if (want.has('rough')) for (const p of REF.rough) s.rough(pairs(p), { raw: true, alpha: .7, loose: 2 });
  if (want.has('line')) for (const l of REF.line) s.ink(pairs(l.p), { raw: true, w: l.w * lw, color: mix(l.c, ink, inkMix), alpha: l.a, taper: [.2, .35], weight: .5 });
  if (want.has('flat')) REF.flats.forEach((f, i) => s.flat(`ref${i}`, pairs(f.p), { raw: true, fill: f.c, z: f.z, order: f.o, weight: .4 }));
  if (want.has('shadow')) for (const r of REF.shadow) s.shadow(pairs(r.p), { raw: true, fill: r.c, blur: .8, weight: .35 });
  if (want.has('highlight')) for (const r of REF.light) s.light(pairs(r.p), { raw: true, fill: r.c, blur: .8, weight: .35 });
  if (want.has('finish') && REF.dab.length) {
    const keep = Math.round(REF.dab.length * (o.dabs ?? 1)), D = REF.dab.slice(0, keep);
    // one finish item: the detail brush — small oriented dabs in the picture's own colours, coarse first, then fine
    s.fx((c, u) => {
      const n = Math.floor(D.length * u);
      for (let i = 0; i < n; i++) { const [x, y, rx, ry, a, col] = D[i]; c.fillStyle = col; c.globalAlpha = .85; c.beginPath(); c.ellipse(x, y, rx, ry, a, 0, 6.2832); c.fill(); }
      c.globalAlpha = 1;
    }, { name: 'detail brush', box: { x: 40, y: 40, w: 920, h: 920 }, weight: 2.5 });
  }
  return s;
}
