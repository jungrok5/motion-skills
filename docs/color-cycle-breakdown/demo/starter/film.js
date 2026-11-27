// 「Campfire」 — the starter: a night clearing with a campfire. Flames, embers' glow and stars live by colour cycling;
// sparks are drawn per frame; the grass is wind-rigged. Two panels. Runs as it is; a new topic designs its own scene.
import { film } from 'cycle/film.js';

film({
  title: 'Campfire',
  size: [1920, 1080], art: [320, 180], fps: 30, seed: 4,
  wind: { strength: 1, speed: 60 },
  timing: { panel: 3.8 },
  paint({ pal, layer, kit, W, H }) {
    const { noise, fbm, hash, clamp } = kit;
    // ramps (dark → light) and the cycles that move them
    const sky = pal.ramp('sky', ['#0a0920', '#121034', '#1b1748', '#271e5c', '#38276a', '#4f3072', '#6a3a73']);
    const star = pal.ramp('stars', ['#24215a', '#3e3b80', '#7c79b8', '#e6e4ff', '#7c79b8', '#3e3b80', '#24215a', '#24215a']);
    const far = pal.ramp('far', ['#1a1742', '#221e51', '#2b2660', '#383070']);
    const near = pal.ramp('near', ['#0e0d22', '#15132e', '#1c1a3b', '#252248']);
    const pine = pal.ramp('pine', ['#09091a', '#100f26', '#181632']);
    const ground = pal.ramp('ground', ['#120e17', '#1a1420', '#241b27', '#30232d', '#402d30']);
    const glow = pal.ramp('glow', ['#3a2427', '#47292a', '#58322c', '#6a3c2f', '#58322c', '#47292a']);
    const stone = pal.ramp('stone', ['#231e2b', '#383040', '#544957', '#7b6a72']);
    const wood = pal.ramp('wood', ['#25140d', '#42231a', '#673822', '#8c522f']);
    const flame = pal.ramp('flame', ['#7a1c10', '#b6301a', 'transparent', '#e5601c', '#f59a2b', 'transparent', '#ffc54a', '#f59a2b', '#d2481a']);
    const core = pal.ramp('core', ['#ffcf55', '#ffe998', '#fffbe2', '#ffe998', '#ffd768', '#fff3bf']);
    const spark = pal.ramp('spark', ['#ff9a36', '#ffd56e', '#fff4cf']);
    const grass = pal.ramp('grass', ['#0d2014', '#16321d', '#224b28', '#356a32', '#53893c', '#80ab4c']);
    const bloom = pal.ramp('bloom', ['#e5685a', '#f2c46a']);
    pal.cycle(star, { rate: 3 });
    pal.cycle(glow, { rate: 5 });
    const fc = pal.cycle(flame, { rate: 13 });
    const cc = pal.cycle(core, { rate: 15 });

    // ── back: sky, stars, hills, pines, the ground, stones and logs ──
    const back = layer('back', { label: 'Sky & clearing', color: '#b7a6f0' });
    kit.gradient(back, sky, 0, 118, { wobble: .12 });
    kit.stars(back, star, { count: 90, y1: 92, seed: 21 });
    kit.ridge(back, far, { y: 104, amp: 30, freq: .013, seed: 5, to: 132 });
    const hill = kit.ridge(back, near, { y: 122, amp: 16, freq: .02, seed: 9, to: 140, contrast: .5 });
    for (let x = 4; x < W; x += 9 + Math.floor(hash(x, 1, 3) * 10)) if (Math.abs(x - 160) > 34) kit.pine(back, x, hill(x) + 3, 14 + hash(x, 2, 3) * 18, pine);
    back.fill((x, y) => {
      const d = Math.hypot((x - 160) / 2.1, (y - 147) * 1.2);
      if (d < 36 && kit.bayer(x, y) < clamp((36 - d) / 7)) return glow.start + Math.floor(d / 6 + kit.bayer(x, y) * .8) % glow.len;   // rings that pulse outward
      return ground.pick(clamp((y - 132) / 48 * .55 + (fbm(x * .08, y * .2, 2) - .5) * .6 + .2), x, y);
    }, [0, 132, W, H]);
    for (const [x, y, r] of [[136, 148, 6], [148, 152, 7], [172, 152, 7], [184, 148, 6], [160, 154, 6]]) kit.rock(back, x, y, r, r * .7, stone, x);
    back.poly([[140, 146], [180, 140], [182, 144], [142, 150]], (x, y) => wood.pick(.3 + (y % 3 === 0 ? .4 : 0), x, y));
    back.poly([[142, 140], [178, 147], [176, 151], [140, 144]], (x, y) => wood.pick(.5 + (y % 3 === 1 ? .35 : 0), x, y));

    // ── fire: two flows of indices laid upward; cycling sends the bands up, the transparent slots make tongues ──
    const fire = layer('fire', { label: 'Flames', color: '#f6b257' });
    const halfW = (y, k) => { const u = (146 - y) / 44; return u < 0 || u > 1 ? 0 : k * 13 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.25 + .05)), .55) * (1 - u * .55); };
    const sway = y => (noise(y * .08, 0, 3) - .5) * 6 * (146 - y) / 44;
    kit.flow(fire, { name: 'flame', cycle: fc, band: 2.2, streak: .7, wobble: 2,
      mask: (x, y) => Math.abs(x + .5 - 160 - sway(y)) < halfW(y, 1) + (noise(x * .3, y * .15, 4) - .5) * 3,
      along: (x, y) => (146 - y) + noise(x * .25, y * .1, 6) * 3, across: (x, y) => (x - 160 - sway(y)) * .6 + 40 });
    kit.flow(fire, { name: 'core', cycle: cc, band: 2, streak: .5,
      mask: (x, y) => y > 118 && Math.abs(x + .5 - 160 - sway(y)) < halfW(y, .45),
      along: (x, y) => (146 - y), across: (x, y) => (x - 160) + 20 });

    // ── sparks: drawn per frame (a function of t), rising and swaying ──
    const sparks = layer('sparks', { label: 'Sparks', color: '#ffd56e' });
    sparks.draw((L, t) => {
      for (let k = 0; k < 18; k++) {
        const per = 1.6 + hash(k, 1, 9) * 1.4, u = ((t + hash(k, 2, 9) * per) % per) / per;
        const x = 160 + (hash(k, 3, 9) - .5) * 16 + Math.sin(u * 7 + k) * 5 * u, y = 128 - u * 92;
        if (u < .92) L.set(x, y, spark.i(u < .3 ? 2 : u < .65 ? 1 : 0));
      }
    });

    // ── grass: clumps of blades on the shared gust ──
    const g = layer('grass', { label: 'Wind-rigged grass', color: '#a6dc86' });
    const clump = (name, x, y, n, h, seed) => kit.plant(g, {
      name, x, y, ramp: grass, kind: 'blade', amp: 11,
      fronds: Array.from({ length: n }, (_, i) => ({ a: (i / (n - 1) - .5) * 64 + (hash(i, 1, seed) - .5) * 10, len: h * (.6 + hash(i, 2, seed) * .5), segs: 4, width: 3, kind: i % 4 === 3 ? 'reed' : 'blade', tip: i % 4 === 3 ? bloom.i(1) : undefined })),
      flowers: seed % 2 ? [[-3, -6, bloom.i(0)], [4, -9, bloom.i(0)]] : [],
    });
    clump('left', 26, 178, 9, 46, 1); clump('left-small', 64, 179, 6, 28, 2);
    clump('right', 290, 179, 10, 50, 3); clump('right-small', 250, 180, 6, 26, 4);
    clump('mid', 112, 179, 5, 16, 5);
  },
  panels: [
    { kind: 'cycle', cycle: 'flame', center: [160, 128], zoom: 4, kicker: 'Palette cycling',
      title: 'Nine colors climb. The pixels never move.', left: 'Fixed indices', right: 'Same pixels, rotating colors',
      caption: 'Purple marks the nine flame slots; two are clear.' },
    { kind: 'rig', layer: 'grass', center: [282, 150], zoom: 6, kicker: 'Wind rig',
      title: 'One gust, a different bend at every tip.', left: 'Grass cutout', right: 'Blade pivots',
      caption: 'The tips lag the roots, so every blade follows through.' },
  ],
});
