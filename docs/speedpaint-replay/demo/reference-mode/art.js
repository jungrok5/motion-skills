// 「벚꽃 노을」 — reference mode: the replay draws toward a given picture. The reference is reference.jpg, an image
// generated with ElevenLabs (gpt-image-2.5-sunburst; prompt in BRIEF.md), measured by scripts/from-image.mjs into ref.js.
import { Sketch } from 'sp/sketch.js';
import { addReference } from 'sp/reference.js';
import { REF } from './ref.js';

export function art() {
  const s = new Sketch({ seed: 5, ink: '#2a1d1c', meta: { title: '벚꽃 노을' } });
  addReference(s, REF);
  // body check: eye boxes and marks read off the reference by hand (art units). She faces right, head tilted 13°.
  s.setPose({ facing: 'right', head: { yaw: 30, roll: 13, pitch: -4 }, torso: { yaw: 10, roll: -4 } });
  s.markEye('L', 424, 271, 132, 63).markEye('R', 646, 322, 97, 63);
  s.mark('nose', 597, 389).mark('mouth', 521, 458).mark('chin', 479, 569).mark('ear', 181, 333);
  s.mark('neck', 333, 653).mark('shoulderL', 83, 778).mark('shoulderR', 889, 722);
  // the author's own finish over the measured picture: warm sunset glow from the right, a little grain, a soft vignette
  s.glow([[0, 0], [1000, 0], [1000, 1000], [0, 1000]], { fill: { linear: [1000, 250, 400, 600], stops: [[0, 'rgba(255,196,120,.14)'], [1, 'rgba(255,196,120,0)']] }, raw: true });
  s.grain(.08);
  s.fx((c, u) => { const g = c.createRadialGradient(500, 420, 420, 500, 420, 820); g.addColorStop(0, 'rgba(40,20,20,0)'); g.addColorStop(1, `rgba(40,20,20,${.2 * u})`); c.fillStyle = g; c.fillRect(0, 0, 1000, 1000); }, { over: true, name: 'vignette' });
  return s;
}
