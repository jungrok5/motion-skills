// 「다시 그리기」 — reference mode: the replay draws toward an image the user owns. The reference here is this repo's own
// 「비 오는 창가」 finished picture (reference.jpg), measured by scripts/from-image.mjs into ref.js. Only use images you
// made or may use; never someone else's art or a known character.
import { Sketch } from 'sp/sketch.js';
import { addReference } from 'sp/reference.js';
import { REF } from './ref.js';

export function art() {
  const s = new Sketch({ seed: 5, ink: '#241c26', meta: { title: '다시 그리기' } });
  addReference(s, REF);
  // body check: the eyes and marks are read off the reference image by hand (art units), so check.mjs can still prove
  // the face turns one way and the neck and shoulders are possible
  s.setPose({ facing: 'left', head: { yaw: -30, roll: -4, pitch: -6 }, torso: { yaw: -12, roll: 2 } });
  s.markEye('L', 370, 455, 123, 84).markEye('R', 565, 444, 174, 93);
  s.mark('nose', 396, 548).mark('mouth', 461, 629).mark('chin', 468, 707).mark('ear', 753, 445);
  s.mark('neck', 568, 851).mark('shoulderL', 125, 944).mark('shoulderR', 990, 926);
  // the author still owns the finish: a little grain and a gentle vignette over the measured picture
  s.grain(.08);
  s.fx((c, u) => { const g = c.createRadialGradient(520, 470, 420, 520, 470, 820); g.addColorStop(0, 'rgba(20,14,30,0)'); g.addColorStop(1, `rgba(20,14,30,${.22 * u})`); c.fillStyle = g; c.fillRect(0, 0, 1000, 1000); }, { over: true, name: 'vignette' });
  return s;
}
