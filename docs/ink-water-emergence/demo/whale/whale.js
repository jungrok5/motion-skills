// The cast of 「鯨の息 · Whale Breath」: a humpback, designed for this film (long pectoral fins, knobbed head, throat
// grooves, a pale belly under a dark back). Shared by index.html and cast.html.
import { swimmer } from 'inkwater/body.js';
export const WHALE = {
  body: swimmer({ name: 'humpback', len: 5.2, amp: 4.5, freq: .32, waveLen: 1.2,
    fins: { at: .28, len: .3, w: .11, sweep: 28 }, flukes: { span: .38, chord: .14 } }),
  seed: 11,
  look: { back: .78, body: .4, belly: .1, fin: .3, groove: .6, line: .5, lineW: .02,
    emit: { body: .8, fin: 1 }, sweep: { from: 'head', spread: .6 } },
};
