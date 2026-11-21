// The Long Way Down — the water cycle as a pop-up quest. Written from BRIEF.md in this folder.
// Drizzle, a raindrop in a yellow raincoat, rises off the sea, becomes a cloud, falls as snow and rides the river home.
// Two species are made here, inline (a raindrop and a heron), to show a cast designed for its topic.
const DROP = {   // a teardrop head; the point leans back, the face looks right
  head: [[-4, 99], [6, 86], [16, 74], [23, 62], [21, 51], [12, 44], [0, 42], [-12, 44], [-21, 52], [-23, 63], [-18, 76], [-10, 88]],
  ears: [], muzzle: [[6, 50], [18, 52], [16, 56], [6, 55]], nose: [[9, 52], [16, 52.5], [12.5, 50]], tail: 'none', eyes: [[0, 62, 3.2, 4.4], [13, 62.5, 2.3, 4.1]],
};
const HERON = {
  head: [[-14, 56], [-6, 48], [8, 48], [18, 56], [18, 68], [8, 76], [-6, 76], [-14, 68]], ears: [[[-10, 72], [-30, 84], [-26, 80], [-12, 70]]],
  muzzle: [[-8, 52], [12, 52], [12, 58], [-8, 58]], nose: [[14, 66], [46, 60], [14, 59]], tail: 'feather', eyes: [[2, 64, 2.8, 3.6], [12, 64.5, 2, 3.4]],
};
export default {
  title: 'The Long Way Down',
  subtitle: 'A RAINDROP’S ROUND TRIP',
  mark: 'feather',
  mapTitle: 'Sea, sky, snow and river',
  theme: { cover: '#6a3f63', cloth: '#3f5666', accent: '#f0b84a', paper: '#f0e5c9' },
  hero: 'drizzle',
  cast: {
    drizzle: { name: 'Drizzle', species: DROP, mass: 'light', height: 1.0, fur: '#8fcbe2', belly: '#d8f0f6', coat: '#f0c23e', coat2: '#d9a52c', collar: '#f6dd7a', boot: '#3e5a6a', nose: '#3a5a6a', paw: '#8fcbe2', sleeve: '#f0c23e' },
    reed:    { name: 'Reed', species: HERON, mass: 'medium', height: 1.15, fur: '#c9d3d8', belly: '#eef2f2', coat: '#4c6b7a', nose: '#e0a33a', boot: '#d9a24a', tail: 'feather' },
    tuft:    { name: 'Tuft', species: 'rabbit', mass: 'light', height: 1.0, fur: '#efe9df', belly: '#fbf7ef', coat: '#7a8fb0', inner: '#e8b9b0', collar: '#c4473a' },
    pebble:  { name: 'Pebble', species: 'penguin', mass: 'medium', height: 1.0, fur: '#2f3a48', belly: '#f3efe6', coat: '#c4473a', hat: { type: 'beanie', color: '#e0b04a' }, nose: '#e0a33a', boot: '#e0a33a' },
    moss:    { name: 'Moss', species: 'frog', mass: 'heavy', height: 1.05, fur: '#6f9a58', belly: '#dce8b4', coat: '#8a5a3a', collar: '#e0b04a' },
  },
  chapters: [
    {
      id: 'sea', title: ['The Sun', 'Pans'], region: 'Saltglass Bay', feature: 'Evaporation', stamp: 'Sun Riser', coords: 'S 04° · W 12°', sky: 'morning',
      line: 'Drizzle has been lying in the warm shallows all morning, getting lighter and lighter.',
      story: 'In the salt pans of Saltglass Bay the water is shallow and the sun is strong. Reed the heron tilts the great brass mirror. “Up you go,” says Reed. “The salt stays here. You don’t have to.”',
      lesson: 'The sun warms water at the surface until some of it turns into water vapour, an invisible gas, and rises into the air. Salt and dirt are left behind.',
      hint: 'Tilt Reed’s brass mirror toward the pans.', prop: { label: 'Tilt the mirror', hint: 'What does the warmth do to Drizzle?' },
      task: { type: 'choice', prompt: 'The mirror pours sunlight on the pans. What lifts Drizzle off the sea?', options: ['The wind scoops Drizzle up as a splash', 'Warmth turns Drizzle into vapour that rises', 'A fish blows Drizzle into the sky'], answer: 1,
        hint: 'Nothing pushes. Something changes.', solved: 'Wisps of vapour curl up from the pans. Drizzle rises with them, and the salt stays white on the ground.' },
      ground: { land: '#d8c690', water: [[[-.2, -2.2], [5.6, -2.4], [5.6, 3.2], [-.4, 3.2], [-1.0, 1.4]]], waterColor: '#7fbcc0', sand: [[[-5.4, .8], [-1.6, .5], [-1.2, 2.9], [-5.2, 3.0]]], sandColor: '#e7d6a6', path: [[-4.4, 2.4], [-2.6, 1.8], [-1.0, 1.2]] },
      set(S) {
        const { P, C } = S;
        S.ridge(-5.4, -.2, -2.9, [[-4.6, .8], [-3.2, 1.1], [-1.6, .7]], '#b3a46a');
        S.sun(2.8, -2.4, 3.0, .7); S.cloud(-3.4, -2.2, 2.6, 1.0);
        for (const [x, z] of [[-4.8, -1.4], [-4.0, -2.0], [-5.1, -.4]]) S.add(x, z, g => { P.beam(g, [0, 0, 0], [.1, 1.3, 0], .04, C.bark, 5); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; P.slab(g, [[0, 0], [.55, .1], [.5, .2]], .02, C.leaf, .1, 1.3, 0, a).rotation.z = -.4; } }, { name: 'palm' });
        // salt pans: shallow trays on the beach with white mounds
        for (const [x, z] of [[-3.6, -.6], [-2.4, -.9], [-3.0, .3]]) S.add(x, z, g => { P.box(g, 0, .04, 0, .9, .08, .6, '#9fc6c4'); P.box(g, 0, .09, 0, .82, .02, .52, '#bfe0dc'); P.cone(g, .25, .14, .1, .12, .14, C.snow, 6); }, { name: 'salt pan' });
        // vapour wisps rise from the bay when solved
        const wisps = S.add(2.2, .4, g => { for (let k = 0; k < 4; k++) { const w = P.group(g, (k - 1.5) * .45, 0, (k % 2) * .3); w.name = 'wisp' + k; const pts = []; for (let i = 0; i <= 10; i++) pts.push([Math.sin(i * .9) * .08 + .02, i * .16]); for (let i = 10; i >= 0; i--) pts.push([Math.sin(i * .9) * .08 - .02, i * .16]); P.slab(w, pts, .01, '#f4f8f6'); } }, { name: 'vapour' });
        const ws = [0, 1, 2, 3].map(k => wisps.content.getObjectByName('wisp' + k));
        S.on(c => ws.forEach((w, k) => { const u = Math.max(0, Math.min(1, (c.solved * 1.4) - k * .12)); w.visible = u > .01; w.scale.y = Math.max(.01, u); w.position.y = u * (.2 + Math.sin(c.t * 1.3 + k) * .05); }));
        S.boat(4.4, 1.6, .8, C.cream, C.teal); S.ripple(3.4, 2.4, .8, .3); S.ripple(1.2, 2.0, .7, .3);
        // the brass mirror — the prop
        const mirror = S.prop('mirror', -.7, .3, g => { P.box(g, 0, .45, 0, .08, .9, .08, C.wood); const m = P.group(g, 0, .95, 0); m.name = 'glass'; P.cyl(m, 0, 0, 0, .32, .32, .05, '#d9b45a', 18).rotation.x = Math.PI / 2; P.cyl(m, 0, 0, .03, .26, .26, .02, '#f6eccf', 18).rotation.x = Math.PI / 2; }, { label: 'Tilt the mirror' });
        const glass = mirror.item.content.getObjectByName('glass');
        mirror.on(c => { const p = c.poke != null ? Math.min(1, c.poke / .7) : 0; glass.rotation.y = .5 * p + .4 * c.solved; glass.rotation.x = -.2 * p; });
        S.sign(-2.0, 2.6, 'Saltglass', 1);
        for (const [x, z] of [[-4.6, 2.2], [-3.4, 2.8]]) S.grass(x, z, .28, '#8a9a4a');
        S.hero(-2.2, 1.5);
        S.guide('reed', 1.2, 1.0, { facing: -1 });
      },
    },
    {
      id: 'loft', title: ['The Cloud', 'Loft'], region: 'Coldair Heights', feature: 'Condensation', stamp: 'Cloud Weaver', coords: 'S 01° · W 06°', sky: 'day',
      line: 'High over the hills the air turns cold, and Drizzle feels the others crowding close.',
      story: 'Tuft keeps the cloud loft on Coldair Heights, where a great bellows breathes cold mountain air. Vapour that drifts in here never leaves as vapour.',
      lesson: 'As vapour rises, the air cools. Cool air can hold less vapour, so it condenses into tiny droplets around specks of dust — billions of them make a cloud.',
      hint: 'Pump Tuft’s cold-air bellows.', prop: { label: 'Pump the bellows', hint: 'Put the four steps in order.' },
      task: { type: 'order', prompt: 'Put the four steps in order, from warm vapour to cloud.', items: ['Vapour rises from the sea', 'The rising air cools', 'Vapour condenses into tiny droplets', 'The droplets crowd into a cloud'],
        hint: 'It has to rise before it can cool.', solved: 'The bellows sighs, and the paper clouds over the loft swell up, soft and white. Drizzle is one droplet among billions.' },
      ground: { land: '#9fbb86', path: [[-4.6, 2.3], [-2.8, 1.7], [-1.2, 1.3]] },
      set(S) {
        const { P, C } = S;
        S.mountains(-5.5, 5.5, -2.95, [[-4.4, 1.6], [-2.8, 2.1], [-1.0, 1.4], [.8, 2.3], [2.6, 1.7], [4.4, 2.0]], '#8d9cac');
        S.ridge(-5.4, 5.4, -2.4, [[-4.6, .7], [-3.0, 1.0], [-1.4, .65], [.4, .95], [2.2, .7], [4.0, 1.0]], '#86a676');
        S.sun(-1.8, -2.1, 3.4, .45);
        // clouds that swell when solved
        const puffs = [[1.0, -1.9, 2.7, 1.0], [2.6, -2.1, 3.1, 1.2], [4.2, -1.8, 2.6, .9]].map(([x, z, y, w], k) => { const it = S.add(x, z, g => { P.beam(g, [0, 0, 0], [0, y, -.02], .016, C.wood, 4); const cl = P.group(g, 0, y, 0); cl.name = 'cl'; P.cloud(cl, 0, 0, 0, w).children[0].visible = false; P.ball(cl, -w * .25, w * .12, .04, w * .2, C.cream); P.ball(cl, w * .1, w * .18, .04, w * .24, C.cream); }, { name: 'cloud' }); return it.content.getObjectByName('cl'); });
        S.on(c => puffs.forEach((p, k) => p.scale.setScalar(.6 + .4 * Math.min(1, Math.max(0, c.solved * 1.3 - k * .15)) + Math.sin(c.t * 1.1 + k) * .02)));
        for (const [x, z, h] of [[-5.0, -1.4, 1.2], [-4.3, -1.9, 1.0], [5.1, -1.0, 1.2], [-5.1, .6, 1.0]]) S.pine(x, z, h, '#4e7356');
        // the loft: a timber hut on stilts with a slatted roof
        S.add(2.0, -.9, g => { for (const x of [-.6, .6]) for (const z of [-.35, .35]) P.box(g, x, .45, z, .1, .9, .1, C.wood); P.box(g, 0, 1.25, 0, 1.6, .7, .9, '#e8d7b2'); P.roof(g, 0, 1.6, 0, 1.9, .6, 1.05, '#5f7a8a'); for (let k = 0; k < 4; k++) P.box(g, -.6 + k * .4, 1.25, .46, .2, .4, .02, '#c9e4ea'); P.flag(g, .7, 2.05, 0, .4, C.red); }, { name: 'loft' });
        S.house(-3.4, -.4, { w: .8, h: .6, d: .6, roofC: '#5f7f6a' });
        // the bellows — the prop
        const bel = S.prop('bellows', .7, .7, g => { P.box(g, 0, .08, 0, .5, .16, .4, C.wood); const top = P.group(g, 0, .18, -.2); top.name = 'top'; P.slab(top, [[-.25, 0], [.25, 0], [.18, .55], [-.18, .55]], .04, '#a8754a').rotation.x = -Math.PI / 2 + .35; P.slab(g, [[-.24, .1], [.24, .1], [.16, .4], [-.16, .4]], .38, '#d9b27a', 0, 0, 0); P.beam(g, [0, .3, .2], [0, .3, .5], .03, C.slate, 6); }, { label: 'Pump the bellows' });
        const top = bel.item.content.getObjectByName('top');
        bel.on(c => { const pump = c.poke != null && c.poke < 1.6 ? Math.abs(Math.sin(c.poke * 4)) : 0; top.rotation.x = -pump * .35 - (c.solvedAt != null ? Math.abs(Math.sin((c.t - c.solvedAt) * 3)) * .25 * Math.max(0, 1 - (c.t - c.solvedAt) / 2) : 0); });
        S.sign(-1.6, 2.6, 'Coldair', 1);
        for (const [x, z] of [[-3.4, 2.7], [-.6, 2.8], [1.8, 2.7], [3.6, 2.4], [4.8, 1.6]]) S.grass(x, z, .3, '#5f8a52');
        S.flower(-2.6, 2.9, '#f0c5b5'); S.rock(3.0, 1.9, .28);
        S.hero(-1.9, 1.3);
        S.guide('tuft', 2.7, 1.1, { facing: -1 });
      },
    },
    {
      id: 'ridge', title: ['The Snow', 'Ridge'], region: 'Whitecap Range', feature: 'Precipitation', stamp: 'Snow Faller', coords: 'N 03° · W 02°', sky: 'day',
      line: 'The cloud grows heavy over the ridge. Somebody has to fall, and Drizzle is first in line.',
      story: 'Pebble reads the thermometer at the Whitecap weather post every hour. Today the cloud has grown too heavy to stay up, and the air above the ridge is well below freezing.',
      lesson: 'When droplets in a cloud join and grow too heavy, they fall as precipitation. If the air is below freezing, they fall as snow; warmer air gives rain.',
      hint: 'Read Pebble’s thermometer board.', prop: { label: 'Read the thermometer', hint: 'Check the temperature on the board.' },
      task: { type: 'choice', prompt: 'The board reads −5 °C above the ridge. How does Drizzle come down?', options: ['As a warm summer rain', 'As a snowflake', 'Drizzle stays in the cloud forever'], answer: 1,
        hint: 'Below zero, water doesn’t stay liquid for long.', solved: 'Drizzle freezes into six neat points and drifts down onto the ridge with a thousand others.' },
      ground: { land: '#e8eef0', fills: [{ pts: [[-5.4, 1.2], [5.4, 1.0], [5.4, 3.1], [-5.4, 3.1]], color: '#d5e1e4' }], path: [[-4.6, 2.4], [-2.8, 1.8], [-1.2, 1.2]] },
      set(S) {
        const { P, C } = S;
        S.mountains(-5.5, 5.5, -2.95, [[-4.4, 2.0], [-2.6, 2.6], [-.8, 1.8], [1.0, 2.7], [2.8, 2.1], [4.6, 2.4]], '#7c8ea0');
        S.ridge(-5.4, 5.4, -2.3, [[-4.6, .9], [-3.0, 1.3], [-1.4, .8], [.4, 1.2], [2.2, .85], [4.0, 1.2]], '#f2f4f2');
        // the heavy cloud with snowflakes on threads that drop when solved
        const snow = S.add(2.6, -1.6, g => { P.beam(g, [0, 0, 0], [0, 3.0, -.02], .016, C.wood, 4); P.cloud(g, 0, 3.0, 0, 1.6).children[0].visible = false;
          for (let k = 0; k < 6; k++) { const f = P.group(g, -.6 + k * .24, 2.95, .05); f.name = 'flake' + k; P.beam(f, [0, 0, 0], [0, -.3, 0], .004, '#c9d6dc', 3); const st = P.star(f, 0, -.34, 0, .07, '#ffffff'); st.name = 'st'; } }, { name: 'snow cloud' });
        const flakes = [0, 1, 2, 3, 4, 5].map(k => snow.content.getObjectByName('flake' + k));
        S.on(c => flakes.forEach((f, k) => { const u = Math.max(0, Math.min(1, c.solved * 1.6 - k * .1)); f.scale.y = 1 + u * (3.5 + (k % 3) * .8); f.children[1].scale.set(1, 1 / f.scale.y, 1); f.rotation.z = Math.sin(c.t * 1.4 + k) * .06 * u; }));
        for (const [x, z, h] of [[-5.0, -1.3, 1.2], [-4.2, -1.9, 1.05], [5.0, -.9, 1.2], [-5.1, .7, 1.0], [4.6, .9, 1.0]]) S.add(x, z, g => { P.pine(g, 0, 0, h, '#3f6150'); P.cone(g, 0, h * .78, 0, h * .14, h * .2, C.snow, 6); }, { name: 'snowy pine' });
        S.add(1.4, -.9, g => { P.box(g, 0, .45, 0, 1.3, .9, .9, '#a8754a'); for (let k = 0; k < 4; k++) P.box(g, 0, .12 + k * .22, .46, 1.32, .03, .02, '#8a5a3a'); P.roof(g, 0, .9, 0, 1.6, .7, 1.1, '#f4f4f0'); P.box(g, -.3, .32, .46, .3, .55, .02, C.ink); P.box(g, .35, .55, .46, .3, .24, .02, '#f3d68e'); P.beam(g, [.55, .9, -.2], [.55, 1.9, -.2], .02, C.ink, 4); P.box(g, .55, 1.85, -.2, .3, .03, .03, C.ink); }, { name: 'weather post' });
        S.house(-3.4, -.6, { w: .8, h: .62, d: .6, roofC: '#f4f4f0', wall: '#d9c7a2' });
        // the thermometer board — the prop
        const th = S.prop('thermometer', .6, .6, g => { P.box(g, 0, .45, 0, .06, .9, .06, C.wood); P.box(g, 0, .85, .04, .36, .5, .04, '#f3e7c9'); P.cyl(g, 0, .85, .07, .025, .025, .4, '#e9e4dc', 6); const red = P.group(g, 0, .66, .07); red.name = 'mercury'; P.cyl(red, 0, .1, 0, .018, .018, .2, C.red, 6); P.ball(g, 0, .64, .07, .045, C.red); const l = P.label('−5°', { w: .2, h: .08, color: '#2b4b66' }); l.position.set(.12, .98, .065); g.add(l); }, { label: 'Read the thermometer' });
        const merc = th.item.content.getObjectByName('mercury');
        th.on(c => { merc.scale.y = 1 - .6 * (c.poke != null ? Math.min(1, c.poke / .8) : 0); });
        S.sign(-1.6, 2.6, 'Whitecap', 1);
        for (const [x, z] of [[-3.2, 2.4], [-.4, 2.7], [2.2, 2.6], [3.8, 2.2]]) S.rock(x, z, .22, '#c9d3d8');
        S.hero(-1.8, 1.3);
        S.guide('pebble', 2.6, 1.2, { facing: -1 });
      },
    },
    {
      id: 'river', title: ['The River', 'Mouth'], region: 'Long Water', feature: 'Collection', stamp: 'River Rider', coords: 'S 02° · E 05°', sky: 'dusk',
      line: 'Spring melts the snow, and Drizzle runs downhill with everything else that melted.',
      story: 'The streams from Whitecap meet at Moss’s water mill, where the Long Water widens and slows. Moss has watched every drop on the island go by this wheel, and every one of them was headed the same way.',
      lesson: 'Rain and meltwater collect in streams, rivers, lakes and underground, and most of it flows back to the ocean — where the sun can lift it again.',
      hint: 'Open Moss’s sluice wheel.', prop: { label: 'Open the sluice', hint: 'Follow the river to its end.' },
      task: { type: 'choice', prompt: 'The sluice opens and the river runs on. Where does most of the water end up before the trip starts again?', options: ['In the ocean', 'Back up on the mountain', 'Inside the mill wheel'], answer: 0,
        hint: 'Water runs downhill — all the way.', solved: 'The wheel turns, the river hurries on, and at the mouth Drizzle slides into the sea. Tomorrow the sun will be waiting.' },
      ground: { land: '#a5be86', water: [[[-5.6, -.4], [-3, -.6], [-.4, -.2], [1.6, .2], [3.0, .9], [5.6, 1.1], [5.6, 3.2], [2.4, 3.2], [1.4, 1.6], [-.6, .7], [-3, .4], [-5.6, .5]]], waterColor: '#6fa9b6', path: [[-4.6, 2.4], [-2.8, 1.9], [-1.4, 1.5]] },
      set(S) {
        const { P, C } = S;
        S.mountains(-5.5, 1.0, -2.95, [[-4.6, 1.8], [-3.0, 2.2], [-1.4, 1.6], [.2, 1.3]], '#8f8aa0');
        S.ridge(1.2, 5.4, -2.6, [[2.0, .8], [3.4, 1.0], [4.8, .7]], '#93a67a');
        S.sun(3.2, -2.5, 2.2, .6);
        S.cloud(-2.4, -2.3, 2.8, 1.1);
        for (const [x, z, h] of [[-5.0, -1.5, 1.2], [-4.2, -2.0, .95], [-5.1, 1.6, 1.0], [5.0, -1.4, 1.1]]) S.pine(x, z, h, '#46684e');
        // the mill: a stone house with a wheel turning in the river
        const mill = S.add(1.4, -1.1, g => { P.box(g, 0, .6, 0, 1.2, 1.2, .9, '#cdb995'); P.roof(g, 0, 1.2, 0, 1.45, .75, 1.05, '#8a4a3a'); P.box(g, -.2, .35, .46, .3, .55, .02, C.wood); P.box(g, .3, .8, .46, .26, .24, .02, '#f3d68e');
          const wh = P.group(g, .75, .55, .55); wh.name = 'wheel'; P.cyl(wh, 0, 0, 0, .5, .5, .08, '#8a6440', 14).rotation.x = Math.PI / 2; for (let k = 0; k < 8; k++) { const b = P.box(wh, 0, 0, .06, .14, 1.05, .04, '#b98552'); b.rotation.z = k * Math.PI / 8; } P.cyl(wh, 0, 0, .1, .08, .08, .06, C.ink, 8).rotation.x = Math.PI / 2; }, { name: 'mill' });
        const wheel = mill.content.getObjectByName('wheel');
        S.on(c => { wheel.rotation.z = -(c.t * .3 + (c.solvedAt != null ? Math.max(0, c.t - c.solvedAt) * 1.8 : 0)); });
        const boat = S.add(3.8, 2.0, g => { const b = P.group(g); b.name = 'boat'; P.boat(b, 0, 0, .8, C.cream, C.red); }, { name: 'boat' });
        const bb = boat.content.getObjectByName('boat');
        S.on(c => { const u = c.solvedAt == null ? 0 : Math.min(1, Math.max(0, (c.t - c.solvedAt - .8) / 3)); bb.position.x = u * 1.3; bb.rotation.z = Math.sin(c.t * 1.6) * .04; });
        for (const [x, z] of [[-3.8, 0], [-1.6, .2], [2.6, 1.6], [4.6, 2.6]]) S.ripple(x, z, .8, .35);
        // the sluice wheel — the prop
        const sl = S.prop('sluice', -.6, -.7, g => { for (const x of [-.3, .3]) P.box(g, x, .35, 0, .08, .7, .1, C.wood); P.box(g, 0, .7, 0, .7, .08, .1, C.wood); const gate = P.group(g, 0, 0, 0); gate.name = 'gate'; P.box(gate, 0, .22, 0, .5, .4, .05, '#8a6440'); const w = P.group(g, 0, .85, .08); w.name = 'w'; P.cyl(w, 0, 0, 0, .16, .16, .03, C.ochre, 12).rotation.x = Math.PI / 2; for (let k = 0; k < 3; k++) { const s = P.box(w, 0, 0, .02, .3, .03, .02, C.wood); s.rotation.z = k * Math.PI / 3; } }, { label: 'Open the sluice' });
        const gate = sl.item.content.getObjectByName('gate'), sw = sl.item.content.getObjectByName('w');
        sl.on(c => { gate.position.y = .3 * c.solved; sw.rotation.z = -(c.poke != null ? Math.min(1, c.poke) * 2 : 0) - c.solved * 4; });
        S.sign(-2.6, 2.6, 'Long Water', 1);
        for (const [x, z] of [[-4.2, 2.5], [-3.4, 2.9], [-.8, 2.4], [.4, 2.1]]) S.grass(x, z, .3, '#6f8f52');
        S.hero(-2.0, 1.55);
        S.guide('moss', 3.4, -.4, { facing: -1 });
      },
    },
  ],
};
