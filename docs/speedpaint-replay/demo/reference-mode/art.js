// 「벚꽃 노을」 — reference mode: the replay draws toward a given picture, in a painter's order. The reference is
// reference.jpg (generated with ElevenLabs, gpt-image-2.5-sunburst; prompt in BRIEF.md). plan.json is what the agent
// saw in it: the construction, the materials (rough lassos), the order of work. from-image.mjs measured the rest.
import { Sketch } from 'sp/sketch.js';
import { addReference } from 'sp/reference.js';
import { REF } from './ref.js';

export function art() {
  const s = new Sketch({ seed: 5, ink: REF.ink, meta: { title: '벚꽃 노을' } });
  addReference(s, REF);
  // body check: eye boxes and marks read off the reference (art units). She faces right, head tilted 13°.
  s.setPose({ facing: 'right', head: { yaw: 30, roll: 13, pitch: -4 }, torso: { yaw: 10, roll: -4 } });
  s.markEye('L', 424, 271, 132, 63).markEye('R', 646, 322, 97, 63);
  s.mark('nose', 597, 389).mark('mouth', 521, 458).mark('chin', 479, 569).mark('ear', 181, 333);
  s.mark('neck', 333, 653).mark('shoulderL', 83, 778).mark('shoulderR', 889, 722);
  return s;
}
