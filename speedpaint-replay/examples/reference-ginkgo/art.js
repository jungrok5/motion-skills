// 「은행잎 저녁」 — reference mode, second sample: a 2048 px picture (generated with ElevenLabs, gpt-image-2.5-sunburst;
// prompt in BRIEF.md) painted in a painter's order. plan.json is what the agent saw in it; from-image.mjs measured the rest.
import { Sketch } from 'sp/sketch.js';
import { addReference } from 'sp/reference.js';
import { REF } from './ref.js';

export function art() {
  const s = new Sketch({ seed: 9, ink: REF.ink, meta: { title: '은행잎 저녁' } });
  addReference(s, REF);
  // body check: eye boxes and marks read off the reference (art units). He faces left; the far (left) eye is narrower.
  s.setPose({ facing: 'left', head: { yaw: -30, roll: -1, pitch: 0 }, torso: { yaw: -20, roll: -8 } });
  s.markEye('L', 328, 290, 55, 30).markEye('R', 470, 288, 80, 36);
  s.mark('nose', 340, 378).mark('mouth', 380, 416).mark('chin', 372, 505).mark('ear', 640, 345);
  s.mark('neck', 500, 540).mark('shoulderL', 140, 820).mark('shoulderR', 900, 625);
  return s;
}
