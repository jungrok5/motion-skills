// The cast of 「Windy Walk」 (the starter). One character, two sizes: a close-up head and the full figure for wide shots
// are the same design, so the close-up and the walk are one person. Designed from the brief (BRIEF.md), not reused.
import { Actor } from '../lib/body.js';
import * as W from '../lib/wear.js';

const head = {
  seed: 12,
  head: { skin: '#f3cdb6', shadow: '#d9a08a', jaw: .18 },
  face: { eyeR: .155, pupil: .4, gaze: [.4, -.3], freckles: 18, nose: { type: 'button', color: '#ec8a7c' }, mouth: { curve: .35, w: .13 }, brows: { thick: .9, tilt: .15 } },
  ears: { color: '#ec9480', earring: { type: 'none' } },
  hair: { style: 'short', bangs: 'full', length: .38, volume: .14, base: '#2a1c14', colors: [['#20150f', 5], ['#3a271c', 2], ['#cf7a32', 1.8], ['#eaa250', .6]], strays: 12 },
  extras: [W.beanie({ color: '#d9473a', band: '#c13a30', pom: '#f2c94c', stripe: '#f2c94c' })],
};
const body = {
  coat: { color: '#2f8f7a', pattern: { type: 'quilt' }, length: 2.7, width: 1.65, buttons: '#f2c94c', collar: '#f2c94c' },
  legs: { color: '#3e4f9a' }, shoes: { color: '#7a3b2a' }, arms: { mitten: '#f2c94c' },
  scarf: { colors: ['#f2c94c', '#d9473a'], tail: 1 },
};
export const ROWAN = new Actor({ name: 'Rowan', seed: 12, head, body: { ...body, a: 74 } });
export const ROWAN_CLOSE = new Actor({ name: 'Rowan (close)', seed: 12, head, body: { ...body, a: 230 } }, { res: 1.2 });
export const ACTORS = [ROWAN];
