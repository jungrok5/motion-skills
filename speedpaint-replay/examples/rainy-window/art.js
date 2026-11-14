// 「비 오는 창가」 — worked example: a girl with a black bob by a rainy window at dusk. Cool window light from the left
// (the way she faces), a warm lamp rim from behind on the right. Designed from BRIEF.md in this folder.
import { Sketch } from 'sp/sketch.js';
import { arc } from 'sp/core.js';

export function art() {
  const s = new Sketch({ seed: 23, ink: '#231c24', meta: { title: '비 오는 창가' } });
  const C = {
    skin: '#f8e1d2', skinSh: '#efc4c4', skinSh2: '#e2aab3', blush: '#f4a9ab',
    hair: '#2c2d3d', hairSh: '#171823', hairHi: '#8fa6d8', rim: '#f0a868',
    knit: '#ece4d6', knitSh: '#aaa4bf', wall: '#463c4a', wall2: '#2f2935', glass: '#8ea6c4', glass2: '#4d5f82', frame: '#cfc6bb',
    iris: ['#3b3f6b', '#8e9fd6'],
  };
  // pose for the body check (references/BODY.md): she faces the picture's left, head turned ~30°, leaning a little
  s.setPose({ facing: 'left', head: { yaw: -30, roll: -4, pitch: -6 }, torso: { yaw: -12, roll: 2 } });
  // transforms: the whole picture is framed 1.5× about her face (a tight crop: the face fills the card); the head is
  // authored upright, then leaned 4°; the body sits 36 higher than first sketched (BRIEF.md review log).
  // Picture edges in pre-frame units: x 167…833, y 137…803 (lines must start and end inside them).
  const FRAME = { sx: 1.5, sy: 1.5, ox: 500, oy: 410 }, HEAD = { rot: -0.07, ox: 500, oy: 430 }, BODY = { dy: -36 };
  s.push(FRAME);

  // ── 1. rough ─────────────────────────────────────────────────────────────────────────────────────────────────────
  s.push(HEAD);
  s.ellipse(525, 355, 178, 182);                                         // cranium
  s.rough('372,330 362,420 386,505 426,575 462,606 520,598 600,545 648,470 655,380', { alpha: .75 });   // jaw
  s.rough('470,190 440,300 428,420 436,520 462,606', { alpha: .6 });     // centre line of the face (turned left)
  s.rough([[350, 428], [655, 438]], { alpha: .6 });                      // eye line
  s.rough([[380, 497], [560, 500]], { alpha: .45 });                     // nose line
  s.rough([[400, 553], [520, 556]], { alpha: .45 });                     // mouth line
  s.ellipse(414, 430, 40, 26, { alpha: .6 }); s.ellipse(540, 433, 55, 29, { alpha: .6 });
  s.ellipse(668, 445, 22, 42, { alpha: .6 });                            // ear (under the hair)
  s.rough('330,360 335,240 430,165 560,150 680,200 750,320 760,470 730,600 690,650', { alpha: .55, loose: 3 });  // hair silhouette
  s.rough('318,380 312,520 340,615', { alpha: .55, loose: 3 });
  s.pop();
  s.push(BODY);
  s.rough([[484, 600], [474, 740]], { alpha: .6 }); s.rough([[602, 560], [614, 728]], { alpha: .6 });          // neck
  s.rough('236,839 262,795 400,742 540,775 690,728 830,790 850,839', { alpha: .6, loose: 3 });   // shoulders
  s.pop();
  s.rough([[300, 140], [300, 800]], { alpha: .45 }); s.rough([[168, 540], [300, 540]], { alpha: .45 });         // window

  // ── 2. line art ──────────────────────────────────────────────────────────────────────────────────────────────────
  s.push(HEAD);
  // face
  s.ink('366,445 374,488 392,528 420,566 446,593 466,606', { w: 3.6, taper: [.3, .1] });      // far cheek → chin
  s.ink('466,606 500,603 548,584 596,548 630,505', { w: 3.6, taper: [.05, .5] });             // chin → near jaw
  // brows, eyes, nose, mouth
  s.ink('382,380 405,368 432,366 450,371', { w: 3.2, taper: [.3, .6] });                      // far brow
  s.ink('500,371 530,363 568,364 598,374', { w: 3.6, taper: [.25, .7] });                     // near brow
  s.eye({ side: 'L', x: 413, y: 434, w: 82, h: 56, tilt: .06, look: [.13, .02], iris: C.iris, lash: 6.6, id: 'eyeL', irisW: .34, irisH: .78, open: .86 });
  s.eye({ side: 'R', x: 543, y: 436, w: 116, h: 62, tilt: .04, look: [-.12, .02], iris: C.iris, lash: 7.6, id: 'eyeR', irisW: .33, irisH: .78, open: .86 });
  s.ink('440,470 433,488 426,497 436,502', { w: 2.2, taper: [.5, .3] });                      // nose
  s.ink('445,452 444,470', { w: 1.3, taper: [.5, .5], alpha: .45 });                         // bridge, faint
  s.ink('446,551 463,555 485,552', { w: 2.6, taper: [.3, .4] });                              // mouth
  s.ink('455,570 467,571', { w: 1.6, taper: [.5, .5], alpha: .6 });                           // lower lip
  s.mark('eyeL', 414, 432).mark('eyeR', 541, 434).mark('nose', 426, 497).mark('mouth', 465, 554).mark('chin', 466, 606).mark('ear', 668, 445);
  s.pop();
  // neck, collar, shoulders
  s.push(BODY);
  s.ink('484,642 480,690 474,740', { w: 3, taper: [.2, .4] });
  s.ink('603,592 607,660 614,726', { w: 3.2, taper: [.2, .4] });
  s.ink('596,640 584,672', { w: 1.6, taper: [.4, .6], alpha: .6 });                           // tendon
  s.ink('400,742 455,770 540,786 630,764 690,728', { w: 3.6, taper: [.1, .1] });              // collar, outer
  s.ink('436,738 482,756 545,764 615,748 662,724', { w: 2.6, taper: [.1, .1] });              // collar, inner
  s.ink('400,742 320,762 262,795 238,839', { w: 4, taper: [.05, .05] });                     // far shoulder
  s.ink('690,728 770,748 830,790 848,839', { w: 4.4, taper: [.05, .05] });                    // near shoulder
  for (let i = 0; i < 9; i++) { const x = 452 + i * 24, y0 = 760 + Math.sin(i / 8 * Math.PI) * 18; s.ink([[x - 4, y0 - 2], [x - 2, y0 + 15]], { w: 1.5, taper: [.3, .3], alpha: .55, weight: .3 }); }   // rib knit
  s.ink('640,800 690,790 740,812', { w: 2.2, taper: [.4, .4], alpha: .7 });                   // a fold at the near shoulder
  s.ink('300,800 350,790 392,800', { w: 2, taper: [.4, .4], alpha: .6 });
  s.mark('shoulderL', 250, 802).mark('shoulderR', 830, 790).mark('neck', 545, 740);
  s.pop();
  // hair: silhouette, then the locks over the face (each lock = two edge lines + strands, a flat, a shade strip)
  s.push(HEAD);
  s.ink('326,372 332,262 404,190 520,152 640,176 722,248 754,350 760,470', { w: 4, taper: [.15, .1], passes: 2 });
  s.ink('760,470 744,560 712,626 664,650', { w: 3.6, taper: [.05, .4] });
  s.ink('326,372 318,470 322,560 344,614', { w: 3.2, taper: [.1, .4] });
  s.flat('hair', '340,330 380,260 470,214 570,200 660,230 700,290 692,326 640,318 560,314 480,316 400,318 350,328', { fill: C.hair, z: 45, weight: .6, order: 1000 });
  const H = { fill: C.hair, z: 50, inkW: 2.8, strands: 5, fly: 1, passes: 2, flatOrder: 1001 }, locks = [];
  s.lock('402,256 360,330 340,430 332,530 344,612', { ...H, w: 52, shade: 'r' });            // far side lock
  locks.push(s.lock('560,196 482,240 414,312 372,404', { ...H, w: 82, shade: 'r' }));                    // bangs, left to right
  locks.push(s.lock('566,200 505,262 462,334 446,416', { ...H, w: 66, shade: 'r' }));
  locks.push(s.lock('574,204 540,284 514,356 503,426', { ...H, w: 58, shade: 'r', strands: 1 }));
  locks.push(s.lock('584,206 578,292 568,362 558,412', { ...H, w: 52, shade: 'l' }));
  locks.push(s.lock('594,208 622,288 632,358 618,406', { ...H, w: 58, shade: 'l' }));
  locks.push(s.lock('606,210 668,276 690,350 676,426', { ...H, w: 64, shade: 'l' }));
  s.lock('562,198 492,256 432,334 402,420', { ...H, w: 34, edges: 'l', strands: 0 });       // thin locks between
  s.lock('578,206 560,290 538,362 530,424', { ...H, w: 30, edges: 'r', strands: 0 });
  s.lock('600,210 646,284 662,356 652,418', { ...H, w: 32, edges: 'r', strands: 0 });
  s.lock('652,282 676,380 668,500 644,616', { ...H, w: 54, shade: 'l' });                    // near side locks
  locks.push(s.lock('688,300 714,420 708,540 684,640', { ...H, w: 58, shade: 'l', strands: 3 }));
  s.lock('536,190 470,214 400,262 352,330', { ...H, w: 50, edges: 'l', strands: 1 });         // a sweep over the top
  s.pop();
  // window frame (lines start at the picture's edge: pre-frame y 138 / x 168 land on 0 after the 1.5× framing)
  s.ink([[300, 138], [300, 722]], { w: 2.6, taper: [0, 0], alpha: .7, raw: true });   // stops at her shoulder
  s.ink([[270, 138], [270, 734]], { w: 2, taper: [0, 0], alpha: .5, raw: true });
  s.ink([[168, 530], [270, 530]], { w: 2, taper: [0, .1], alpha: .5, raw: true });
  s.ink([[168, 552], [270, 552]], { w: 2, taper: [0, .1], alpha: .5, raw: true });

  // ── 3. flats ─────────────────────────────────────────────────────────────────────────────────────────────────────
  s.flat('wall', [[300, -100], [1100, -100], [1100, 1100], [300, 1100]], { fill: { linear: [300, 0, 1000, 900], stops: [[0, C.wall], [1, C.wall2]] }, raw: true, z: 0, order: 2000, brush: 80 });
  s.flat('glass', [[-100, -100], [270, -100], [270, 530], [-100, 530]], { fill: { linear: [0, 0, 0, 530], stops: [[0, C.glass2], [1, C.glass]] }, raw: true, z: 0, order: 2000, brush: 60 });
  s.flat('glass', [[-100, 552], [270, 552], [270, 1100], [-100, 1100]], { fill: { linear: [0, 552, 0, 1000], stops: [[0, C.glass], [1, '#5c6b8c']] }, raw: true, z: 0, order: 2000, brush: 60 });
  s.flat('frame', [[270, -100], [300, -100], [300, 1100], [270, 1100]], { fill: C.frame, raw: true, z: 0, order: 2000, weight: .4 });
  s.flat('frame', [[-100, 530], [270, 530], [270, 552], [-100, 552]], { fill: C.frame, raw: true, z: 0, order: 2000, weight: .3 });
  s.push(HEAD);
  s.flat('hair', '330,370 334,256 410,184 525,150 645,174 726,246 758,350 762,470 746,562 712,630 660,654 600,640 610,560 640,500 520,610 420,615 340,612 318,520', { fill: C.hair, z: 10 });
  s.flat('skin', '372,330 362,392 366,445 374,488 392,528 420,566 446,593 466,606 500,603 548,584 596,548 630,505 650,445 652,380 640,320 560,268 450,280', { fill: C.skin, z: 30 });
  s.pop();
  s.push(BODY);
  s.flat('neck', '486,560 602,530 608,640 616,740 470,742 480,650', { fill: C.skin, z: 20 });
  s.flat('knit', '400,742 455,770 540,786 630,764 690,728 770,748 830,790 862,860 876,1000 880,1100 186,1100 192,1000 206,872 250,802 320,762', { fill: C.knit, z: 25 });
  s.flat('collar', '400,742 455,770 540,786 630,764 690,728 662,724 615,748 545,764 482,756 436,738', { fill: '#e2d8c8', z: 26, weight: .4 });
  s.pop();

  // ── 4. shadow ────────────────────────────────────────────────────────────────────────────────────────────────────
  s.push(HEAD);
  // the bangs cast a jagged shadow on the forehead and over the top of the eyes
  s.shadow('360,300 372,404 398,384 446,422 470,394 503,432 528,398 558,418 590,394 618,412 650,394 676,432 690,330 600,250 450,260', { fill: C.skinSh, clip: 'skin', blur: 1.5, raw: true });
  // the side away from the window: a crisp terminator that follows the cheekbone, then a darker core along the jaw
  s.shadow('590,330 700,330 690,520 620,566 556,594 512,606 532,584 566,552 588,512 598,470 600,428 592,380', { fill: C.skinSh, clip: 'skin', blur: 1 });
  s.edge('656,330 652,400 648,452 630,505 596,548 548,584 500,603', { w: 16, side: 'l', stage: 'shadow', fill: C.skinSh2, clip: 'skin', blur: 1.5, alpha: .6, taper: [.05, .5] });

  s.shadow('446,476 451,495 441,503 438,498', { fill: C.skinSh2, clip: 'skin', blur: 1.2, alpha: .75 });    // nose
  s.shadow('446,566 470,575 486,566 470,584', { fill: C.skinSh, clip: 'skin', blur: 3 });     // under the lip
  s.shadow(arc(398, 480, 26, 12, 0, 6.283, 20), { fill: C.blush, clip: 'skin', blur: 8, alpha: .55, raw: true });   // blush
  s.shadow(arc(560, 486, 40, 15, 0, 6.283, 20), { fill: C.blush, clip: 'skin', blur: 9, alpha: .5, raw: true });
  // hair: the side away from the window falls dark, then deep shadow inside the bob and under the locks
  s.shade('hair', { from: [420, 300], to: [760, 420], color: '#5b5a78', amount: .7 });
  s.shadow('600,560 640,500 700,420 740,470 730,600 690,650 610,650', { fill: C.hairSh, clip: 'hair', blur: 5 });
  s.shadow('318,420 330,520 344,612 380,612 360,520 362,420', { fill: C.hairSh, clip: 'hair', blur: 5, alpha: .8 });
  s.shadow('400,330 470,300 560,280 640,300 700,360 690,300 620,240 520,236 430,270', { fill: C.hairSh, clip: 'hair', blur: 8, alpha: .55 });
  s.pop();
  s.push(BODY);
  s.shadow('476,590 640,520 640,690 600,676 540,640 476,628', { fill: C.skinSh, clip: 'neck', blur: 1.5 });   // under the chin
  s.shade('neck', { from: [480, 650], to: [616, 650], color: '#d79aa6', amount: .6 });
  s.shade('knit', { from: [260, 760], to: [850, 820], color: '#9f97b8', amount: .55 });
  s.shadow('520,700 640,640 690,728 630,764 540,786', { fill: C.knitSh, clip: ['knit', 'collar'], blur: 8, alpha: .7 });
  s.shadow('640,780 770,748 830,790 862,860 876,1000 880,1100 690,1100 720,880', { fill: C.knitSh, clip: 'knit', blur: 10 });
  s.shadow('250,806 262,900 256,1100 186,1100 192,1000 206,872', { fill: C.knitSh, clip: 'knit', blur: 10, alpha: .45 });
  s.shadow('300,880 380,850 440,900 400,1100 300,1100', { fill: C.knitSh, clip: 'knit', blur: 14, alpha: .5 });
  s.pop();
  s.shadow('300,-100 540,-100 520,1100 300,1100', { fill: '#2a2231', clip: 'wall', blur: 30, alpha: .6 });   // her shadow on the wall

  // ── 5. highlight ─────────────────────────────────────────────────────────────────────────────────────────────────
  s.push(HEAD);
  // window light: cool on the far cheek, a glint on the nose and the lip
  s.light('366,440 380,500 410,548 430,520 400,470 390,436', { fill: '#cfe0ff', clip: 'skin', blur: 8, alpha: .5 });
  s.lens([432, 484], [430, 494], 4, { fill: '#ffffff', clip: 'skin', blur: 1, alpha: .8, weight: .2 });
  s.lens([458, 566], [476, 566], 3, { fill: '#ffffff', clip: 'skin', blur: 1.5, alpha: .45, weight: .2 });
  // window light on the hair: the lit side cools, a soft band across the crown, then sheen strands that run along each
  // lock (the way the hair falls), brighter on the window side
  s.shade('hair', { stage: 'highlight', from: [640, 300], to: [330, 320], color: '#4a5d8c', amount: .6 });
  s.edge('372,300 430,236 520,206 610,214 690,262', { w: 30, side: 'r', fill: C.hairHi, clip: 'hair', blur: 9, alpha: .3, weight: .4 });
  locks.forEach((lk, i) => {
    const n = lk.line.length, r = s.r, side = 1 - i / locks.length;
    for (let k = 0; k < 3; k++) {
      const u0 = r.range(.1, .22), u1 = u0 + r.range(.12, .24), f = r.range(-.25, .25);
      const pick = u => { const j = Math.floor(u * (n - 1)), p = lk.line[j], q = lk.L[j]; return [p[0] + (q[0] - p[0]) * f * 2, p[1] + (q[1] - p[1]) * f * 2]; };
      s.lens(pick(u0), pick(u1), r.range(3, 7), { abs: true, fill: C.hairHi, clip: 'hair', blur: .7, alpha: (.45 + .4 * side) * r.range(.7, 1), weight: .12 });
    }
  });
  // the lamp behind her: a warm rim along the outer edge of the hair and the near locks
  s.edge('722,248 754,350 760,470 744,560 712,626', { w: 12, side: 'r', fill: C.rim, clip: 'hair', blur: 1.2, alpha: .9 });
  s.edge('688,300 714,420 708,540 684,640', { w: 7, side: 'r', fill: C.rim, clip: 'hair', blur: 1, alpha: .6 });
  s.pop();
  s.push(BODY);
  s.edge('690,728 770,748 830,790 862,860 876,1000', { w: 16, side: 'r', fill: C.rim, clip: 'knit', blur: 3, alpha: .8, taper: [.15, .4] });
  s.edge('603,592 607,660 614,726', { w: 6, side: 'l', fill: C.rim, clip: 'neck', blur: 2, alpha: .7 });
  s.edge('400,742 320,762 250,802 206,872 192,1000', { w: 22, side: 'r', fill: '#e4ecff', clip: 'knit', blur: 6, alpha: .7, taper: [.2, .5] });
  s.pop();

  // ── 6. finish ────────────────────────────────────────────────────────────────────────────────────────────────────
  // city lights through the wet glass, rain on the glass, window light, lamp glow, lines warmed, vignette
  s.pop();   // FRAME: the finish works in picture space
  const glassR = 500 + (270 - 500) * 1.5;   // the glass ends here on screen
  const bokeh = Array.from({ length: 22 }, () => { const r = s.r; return [r.range(6, glassR - 8), r.range(30, 990), r.range(10, 32), r() < .6 ? '255,196,130' : '170,200,255', r.range(.25, .6)]; });
  s.fx((c, u) => { c.save(); c.beginPath(); c.rect(0, 0, glassR, 1000); c.clip(); for (const [x, y, r, col, a] of bokeh) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${a * u})`); g.addColorStop(.7, `rgba(${col},${a * u * .6})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } c.restore(); }, { box: { x: 0, y: 0, w: glassR, h: 1000 }, name: 'bokeh' });
  const drops = Array.from({ length: 30 }, () => { const r = s.r; return [r.range(6, glassR - 6), r.range(0, 960), r.range(18, 70), r.range(1.2, 2.6)]; });
  s.fx((c, u) => { c.strokeStyle = `rgba(230,240,255,${.5 * u})`; c.lineCap = 'round'; for (const [x, y, l, w] of drops) { c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 2, y + l * .6, x + 1, y + l * u); c.stroke(); c.fillStyle = `rgba(240,248,255,${.65 * u})`; c.beginPath(); c.arc(x + 1, y + l * u, w * 1.3, 0, 7); c.fill(); } }, { box: { x: 0, y: 0, w: glassR, h: 1000 }, name: 'rain', over: true });
  s.glow([[0, 0], [1000, 0], [1000, 1000], [0, 1000]], { fill: { linear: [0, 300, 640, 420], stops: [[0, 'rgba(160,190,240,.5)'], [.5, 'rgba(160,190,240,.16)'], [1, 'rgba(160,190,240,0)']] }, raw: true });
  s.fx((c, u) => {   // colour grade: shadows lean violet-blue, the lit side stays clean
    c.save(); c.globalCompositeOperation = 'soft-light'; c.globalAlpha = .5 * u;
    const g = c.createLinearGradient(0, 0, 1000, 600); g.addColorStop(0, '#c9d6ff'); g.addColorStop(1, '#3d2f5c'); c.fillStyle = g; c.fillRect(0, 0, 1000, 1000); c.restore();
  }, { name: 'grade', over: true });
  s.bloom(980, 220, 320, { color: 'rgba(255,170,100,.3)' });
  s.inkTint('#3a2c40', .5);
  s.grain(.16);
  s.fx((c, u) => { const g = c.createRadialGradient(520, 470, 380, 520, 470, 800); g.addColorStop(0, 'rgba(20,14,30,0)'); g.addColorStop(1, `rgba(20,14,30,${.38 * u})`); c.fillStyle = g; c.fillRect(0, 0, 1000, 1000); }, { over: true, name: 'vignette' });
  return s;
}
