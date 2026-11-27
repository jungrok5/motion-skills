// 「등대 포구의 밤」 — the worked example (a topic the source does not have): a night cove under a lighthouse.
// Colour cycling turns the lighthouse beam (24 slots, 18 of them clear), rolls the waves to the shore along a flow,
// runs the surf and the moon's glint, and twinkles the stars; the dune reeds are wind-rigged. Brief: BRIEF.md.
import { film } from 'cycle/film.js';

film({
  title: '등대 포구의 밤',
  size: [1920, 1080], art: [320, 180], fps: 30, seed: 12,
  wind: { strength: 1.15, speed: 80 },
  timing: { panel: 3.9 },
  theme: { accent: '#9fd3f0', arrow: '#9fd3f0' },
  paint({ pal, layer, kit, W, H }) {
    const { noise, fbm, hash, clamp, bayer } = kit;
    const HZ = 97, LX = 262, LY = 25;                       // horizon row; the lamp
    const sky = pal.ramp('sky', ['#050a1d', '#09122d', '#0e1a3c', '#14244b', '#1e2f58', '#2e3864', '#43416f', '#5c4a74']);
    const star = pal.ramp('stars', ['#1b2652', '#33447a', '#8a9cc6', '#eef3ff', '#8a9cc6', '#33447a', '#1b2652', '#1b2652', '#1b2652']);
    const moon = pal.ramp('moon', ['#a9a58f', '#cdc8ad', '#e9e4c8', '#fffbe9']);
    const head = pal.ramp('headland', ['#0b1128', '#111a36', '#182242']);
    const rock = pal.ramp('rock', ['#0d0f1f', '#161a2e', '#21253d', '#2e3150', '#403f62', '#575273']);
    const turf = pal.ramp('turf', ['#14241f', '#1e3428', '#2b4733']);
    const tower = pal.ramp('tower', ['#6f6a78', '#a8a3ad', '#e4e0e2']);
    const red = pal.ramp('red', ['#4f1820', '#7d2630', '#a83a3e']);
    const iron = pal.ramp('iron', ['#0e1018', '#1b1e2a', '#2b2e3c']);
    const lamp = pal.ramp('lamp', ['#ffd56a', '#fff1b0', '#fffbe6', '#fff1b0']);
    const sand = pal.ramp('sand', ['#1f1b2b', '#2c2638', '#3d3446', '#524555', '#6b5a66', '#86717a']);
    const deep = pal.ramp('deep', ['#0b1a34', '#0f2240', '#14294b']);
    const sea = pal.ramp('sea', ['#0a1a36', '#0e2244', '#132c53', '#193663', '#22457a', '#3b6895', '#8fb8d3', '#2c5684']);
    const surf = pal.ramp('surf', ['#173460', '#3f6c9a', '#c2deec', '#f1faff', '#93bcd6', '#24497c', '#173460']);
    const glint = pal.ramp('glint', ['#183461', '#4f7eab', '#cfe5f1', '#fffbe9', '#93bcd6', '#24497c', '#132c53']);
    const beam = pal.ramp('beam', ['#fff1b499', '#ffeaa070', '#ffe39048', '#ffdc8028', ...Array(8).fill('transparent'), '#fff1b499', '#ffeaa070', '#ffe39048', '#ffdc8028', ...Array(8).fill('transparent')]);
    const reed = pal.ramp('reed', ['#16241f', '#22352b', '#30493a', '#456345', '#628256', '#8aa36f']);
    const oat = pal.ramp('oat', ['#a99b74', '#d3c597']);
    pal.cycle(star, { rate: 2.5 });
    pal.cycle(lamp, { rate: 4 });
    const seaC = pal.cycle(sea, { rate: 4.5 });
    const surfC = pal.cycle(surf, { rate: 7 });
    const glintC = pal.cycle(glint, { rate: 8 });
    const beamC = pal.cycle(beam, { rate: 7 });

    // shapes shared by the layers
    const cliffX = y => y < 62 ? 999 : 196 + Math.max(0, (118 - y)) * .55 + (noise(y * .12, 0, 4) - .5) * 8 + Math.max(0, 80 - y) * 1.2;   // left edge of the cliff
    const cliffTop = x => 62 + (noise(x * .06, 1, 5) - .5) * 3 + Math.max(0, 236 - x) * .5;
    const inCliff = (x, y) => x >= cliffX(y) && y >= cliffTop(x);
    const duneY = x => x > 136 ? 999 : 151 + Math.pow(x / 136, 2.2) * 32 + (noise(x * .08, 2, 6) - .5) * 3;
    const inDune = (x, y) => y >= duneY(x);

    // ── back: sky, stars, moon, headland, cliff, lighthouse, dune ──
    const back = layer('back', { label: '하늘 · 절벽 · 등대', color: '#aab6f2' });
    back.fill((x, y) => { const m = Math.hypot(x - 64, y - 30); return sky.pick(clamp(y / HZ + (noise(x * .04, y * .2, 3) - .5) * .1 - (m < 30 ? (1 - m / 30) * .2 : 0)), x, y); }, [0, 0, W, HZ]);
    kit.stars(back, star, { count: 110, y1: 84, seed: 31, only: (x, y) => Math.hypot(x - 64, y - 30) > 17 && !inCliff(x, y) && Math.abs(x - LX) > 8 });
    kit.orb(back, 64, 30, 10, moon);
    back.fill((x, y) => { const h = HZ - 1 - Math.max(0, 9 * (1 - x / 150)) * fbm(x * .03, 0, 8) * 1.4; return y >= h ? head.pick(clamp((y - h) / 6 + .2), x, y) : null; }, [0, HZ - 14, 150, HZ]);
    back.fill((x, y) => {
      if (!inCliff(x, y)) return null;
      const top = cliffTop(x), edge = x - cliffX(y);
      if (y - top < 2.5 + noise(x * .3, 0, 2) * 2) return turf.pick(clamp(1 - (y - top) / 4), x, y);
      const strata = (Math.floor(y / 6 + noise(x * .05, y * .02, 9) * 2) % 2) * .12;
      return rock.pick(clamp(.62 - (y - top) / 160 + Math.exp(-edge / 9) * .3 - strata + (fbm(x * .2, y * .2, 7, 3) - .5) * .4), x, y);
    }, [180, 50, W, H]);
    // the lighthouse: a striped tower, gallery, lantern, roof; a keeper's hut
    back.fill((x, y) => {
      const u = (y - 30) / 34, hw = 5 + u * 2.5; if (Math.abs(x + .5 - LX) > hw) return null;
      const lit = clamp(.75 - (x + .5 - LX) / hw * .45);
      return Math.floor((y - 30) / 7) % 2 ? red.pick(lit, x, y) : tower.pick(lit, x, y);
    }, [LX - 9, 30, LX + 9, 66]);
    back.rect(LX - 7, 28, 15, 2, iron.i(2)); back.rect(LX - 6, 30, 13, 1, iron.i(0));
    back.rect(LX - 4, 20, 9, 8, iron.i(1)); back.rect(LX - 3, 21, 7, 6, lamp.i(1)); back.rect(LX - 1, 22, 3, 4, lamp.i(2));
    back.poly([[LX - 5, 20], [LX + 6, 20], [LX + .5, 13]], (x, y) => red.pick(clamp(.8 - (x - LX) / 8), x, y)); back.set(LX, 12, iron.i(2));
    back.rect(279, 52, 20, 12, tower.i(1)); back.rect(279, 52, 6, 12, tower.i(2)); back.poly([[277, 53], [301, 53], [295, 46], [283, 46]], red.i(1)); back.rect(290, 57, 3, 4, lamp.i(0));
    back.fill((x, y) => y >= HZ && !inCliff(x, y) ? deep.pick(clamp((y - HZ) / 80), x, y) : null, [0, HZ, W, H]);   // still water under the sea layer
    back.fill((x, y) => inDune(x, y) ? sand.pick(clamp(.75 - (y - duneY(x)) / 30 + (fbm(x * .12, y * .3, 4) - .5) * .5 + (noise(x * .02 + y * .09, 0, 1) - .5) * .3), x, y) : null, [0, 140, 140, H]);
    for (const [x, y, rx, ry, s] of [[28, 168, 7, 4, 1], [96, 177, 6, 4, 2], [206, 152, 9, 6, 3], [192, 166, 7, 5, 4], [222, 170, 11, 7, 5], [182, 176, 6, 4, 6]]) kit.rock(back, x, y, rx, ry, rock, s);

    // ── sea: three flows. Waves roll to the viewer (bands thin toward the horizon), surf runs up the dune, the moon's
    //    glint shimmers down its column ──
    const seaL = layer('sea', { label: '바다', color: '#8fc4e6' });
    const inSea = (x, y) => y >= HZ && !inCliff(x, y) && !inDune(x, y);
    const nearShore = (x, y) => y >= duneY(x) - 4.5 - noise(x * .1, 0, 3) * 2;
    const inGlint = (x, y) => y < 156 && Math.abs(x + .5 - 64 - (noise(y * .3, 0, 2) - .5) * 3) < 2 + (y - HZ) * .13 && hash(x, y, 4) < .8;
    kit.flow(seaL, { name: 'surf', cycle: surfC, band: 1.4, streak: .6, mask: (x, y) => inSea(x, y) && nearShore(x, y),
      along: (x, y) => y - duneY(x) + 3 * x / 136, across: x => x / 5 + 50 });
    kit.flow(seaL, { name: 'glint', cycle: glintC, band: 1.5, streak: 1, mask: (x, y) => inSea(x, y) && !nearShore(x, y) && inGlint(x, y),
      along: (x, y) => y, across: x => x * 1.3 });
    // the waves' along grows toward the viewer and toward the dune (−x): that is the way the arrows point
    kit.flow(seaL, { name: 'sea', cycle: seaC, band: 3, streak: 1, wobble: 1.2, mask: (x, y) => inSea(x, y) && !nearShore(x, y) && !inGlint(x, y),
      along: (x, y) => 34 * Math.log(y - HZ + 3) - x * .1 + noise(x * .05, y * .08, 5) * 3, across: (x, y) => x / (1.6 + (y - HZ) * .22) + 100 });

    // ── light: the beam as indices around the lamp; cycling turns it. 24 slots, two beams of four, the rest clear ──
    const light = layer('light', { label: '등대 불빛', color: '#ffe39a' });
    light.fill((x, y) => {
      const dx = x + .5 - LX, dy = (y + .5 - LY) / .3, d = Math.hypot(dx, dy * .3);
      if (d < 6 || d > 170 || y > LY + 5 + Math.abs(dx) * .22) return null;
      if (bayer(x, y) > clamp(1.08 - d / 150) * .95) return null;     // the beam thins into dither as it goes
      const a = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1;
      return beamC.start + Math.floor(a * beamC.len) % beamC.len;
    });
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; light.set(LX + Math.cos(a) * 4, LY + Math.sin(a) * 2, beamC.start + (k % 2 ? 2 : 1)); }

    // ── reeds: sea oats on the dune and turf on the cliff top, all on one gust ──
    const g = layer('reeds', { label: '바람에 흔들리는 갈대', color: '#b5d68e' });
    const clump = (name, x, n, h, seed, o = {}) => kit.plant(g, {
      name, x, y: (o.y ?? duneY(x)) + 2, ramp: reed, amp: o.amp ?? 12,
      fronds: Array.from({ length: n }, (_, i) => ({ a: (i / Math.max(1, n - 1) - .5) * (o.spread ?? 70) + (hash(i, 1, seed) - .5) * 12 - 8, len: h * (.55 + hash(i, 2, seed) * .55), segs: 5, width: 3,
        kind: i % 3 === 1 ? 'reed' : 'blade', tip: i % 3 === 1 ? oat.i(hash(i, 3, seed) < .5 ? 0 : 1) : undefined })),
    });
    clump('dune-1', 12, 9, 46, 1); clump('dune-2', 40, 7, 36, 2); clump('dune-3', 70, 8, 40, 3); clump('dune-4', 104, 6, 26, 4);
    clump('cliff-1', 232, 5, 13, 5, { y: cliffTop(232), amp: 7, spread: 60 }); clump('cliff-2', 306, 6, 15, 6, { y: cliffTop(306), amp: 7, spread: 60 });
  },
  panels: [
    { kind: 'cycle', cycle: 'beam', center: [236, 52], zoom: 3, kicker: '팔레트 순환',
      title: '불빛은 그려 둔 부채꼴, 도는 건 색뿐.', left: '고정된 인덱스', right: '같은 픽셀, 도는 색',
      caption: '보라색이 순환 슬롯 24칸, 빛은 그중 8칸입니다.' },
    { kind: 'flow', flows: ['sea', 'surf', 'glint'], center: [110, 120], zoom: 3, kicker: '흐름장',
      title: '파도에 방향을 주면 색이 해안으로 밀려온다.', left: '흐름 벡터', right: '흐름장 + 팔레트 순환',
      caption: '화살표는 인덱스가 커지는 방향을 잰 값입니다.' },
    { kind: 'rig', layer: 'reeds', center: [62, 146], zoom: 6, kicker: '바람 리그',
      title: '한 번의 돌풍, 줄기 끝마다 다르게 휜다.', left: '갈대 컷아웃', right: '줄기마다 관절',
      caption: '같은 돌풍을 끝으로 갈수록 늦게 받아 줄기가 따라 휩니다.' },
  ],
});
