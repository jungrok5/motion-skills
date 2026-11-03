// The hero of 「The Last Tram」: an old two-tone tram, overgrown, painted in the side view (tram) and as a front-end
// close-up (tramFront). Local units: origin at rail level, body centre; the tram is 660 long. Paint it into a plate at
// any scale with the same seed and you get the same tram, so wide shots and close-ups match.
import * as P from 'pas/paint.js';
import * as K from 'pas/kit.js';

export const TRAM = {
  lower: '#5f8d86', lowerShade: '#41676a', upper: '#e7d6ac', upperShade: '#c2ab86', stripe: '#b5523b',
  roof: '#8e8a95', roofShade: '#615d6c', window: '#2b393c', glass: '#78989a', bogie: '#3b3936', wheel: '#29282a',
  brass: '#c9a35a', ink: '#33303a', rust: ['#9a7d58', '#b08a5c', '#7b8c86', '#866246', '#a39a86'],
};
const L = -330, Rr = 330, ROOF = -306, EAVE = -276, BELT = -168, BOT = -64;
export const LAMP = { x: Rr + 16, y: -118 };            // side view: where the headlamp sits
export const PANTO = { x: -10, y: ROOF - 116 };         // top of the pantograph (sparks)
export const ROOF_Y = ROOF;

const body = c => { c.moveTo(L + 34, BOT); c.lineTo(Rr - 36, BOT); c.quadraticCurveTo(Rr + 8, BOT - 8, Rr + 10, BELT); c.quadraticCurveTo(Rr + 8, EAVE + 6, Rr - 26, EAVE); c.lineTo(L + 26, EAVE); c.quadraticCurveTo(L - 8, EAVE + 6, L - 10, BELT); c.quadraticCurveTo(L - 8, BOT - 8, L + 34, BOT); c.closePath(); };
const roof = c => { c.moveTo(L + 10, EAVE + 2); c.quadraticCurveTo(L + 16, ROOF, L + 90, ROOF); c.lineTo(Rr - 90, ROOF); c.quadraticCurveTo(Rr - 16, ROOF, Rr - 10, EAVE + 2); c.closePath(); };
const rrect = (c, x, y, w, h, r) => { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };

export function tram(c, seed = 7, o = {}) {
  const T = { ...TRAM, ...(o.pal || {}) }, R = P.rng(seed);
  c.lineJoin = 'round'; c.lineCap = 'round';
  // bogies and wheels (behind the skirt)
  for (const bx of [-205, 205]) {
    c.fillStyle = T.bogie; c.beginPath(); rrect(c, bx - 96, -86, 192, 52, 10); c.fill();
    for (const wx of [-52, 52]) {
      c.fillStyle = T.wheel; c.beginPath(); c.arc(bx + wx, -30, 29, 0, P.TAU); c.fill();
      c.strokeStyle = '#55524d'; c.lineWidth = 3; c.beginPath(); c.arc(bx + wx, -30, 20, 0, P.TAU); c.stroke();
      c.fillStyle = '#6c6860'; c.beginPath(); c.arc(bx + wx, -30, 6, 0, P.TAU); c.fill();
    }
    P.weather(c, cc => rrect(cc, bx - 96, -86, 192, 52, 10), R, { base: T.bogie, box: [bx - 96, -86, 192, 52], scale: 14, amount: .5, rust: ['#6b4a32', '#8a5a3a', '#4a4a44'] });
  }
  // lower body: teal, weathered, cel shadow along the bottom third
  c.save(); c.beginPath(); body(c); c.clip();
  P.weather(c, cc => cc.rect(L - 20, BELT, Rr - L + 40, BOT - BELT + 4), R, {
    base: T.lower, box: [L - 20, BELT, Rr - L + 40, BOT - BELT], scale: 20, amount: .32, rust: T.rust,
    shadow: T.lowerShade, shadowPath: cc => { cc.moveTo(L - 20, BOT - 26); cc.bezierCurveTo(-100, BOT - 34, 100, BOT - 22, Rr + 20, BOT - 30); cc.lineTo(Rr + 20, BOT + 4); cc.lineTo(L - 20, BOT + 4); cc.closePath(); },
  });
  // upper body: cream, weathered, shadow under the eave
  P.weather(c, cc => cc.rect(L - 20, EAVE - 4, Rr - L + 40, BELT - EAVE + 4), R, {
    base: T.upper, box: [L - 20, EAVE, Rr - L + 40, BELT - EAVE], scale: 18, amount: .25, rust: ['#c4a77e', '#a8916c', '#a3ad9e', '#bfa27c'],
    shadow: T.upperShade, shadowPath: cc => { cc.rect(L - 20, EAVE - 4, Rr - L + 40, 20); },
  });
  // belt stripe
  c.fillStyle = T.stripe; c.fillRect(L - 20, BELT - 10, Rr - L + 40, 12); c.fillStyle = P.rgba('#f1e4c4', .9); c.fillRect(L - 20, BELT + 3, Rr - L + 40, 3);
  for (let i = 0; i < 18; i++) P.dab(c, L + R() * (Rr - L), BELT - 4, 4 + R() * 8, P.vary('#8c5b3b', R), R, { jag: .5, sx: 1.8, a: .7 });
  c.restore();
  // windows (one broken, with green inside), a door near the front, a small cab window
  const wins = [];
  for (let i = 0; i < 6; i++) wins.push([L + 46 + i * 84, EAVE + 30, 62, 64]);
  wins.forEach(([x, y, w, h], i) => {
    c.fillStyle = T.window; c.beginPath(); rrect(c, x, y, w, h, 8); c.fill();
    c.save(); c.beginPath(); rrect(c, x, y, w, h, 8); c.clip();
    c.fillStyle = '#3e4f4f'; c.fillRect(x, y + h * .55, w, h);                       // seat backs
    if (i === 2) P.clump(c, x + w * .5, y + h * .7, w * .55, R, { dark: '#2d4a34', mid: '#4f7a45', light: '#86a955', hi: '#c3d07c' }, { spray: 8 });
    else { c.fillStyle = P.rgba('#cfe0dc', .28); c.beginPath(); c.moveTo(x + w * .15, y + h); c.lineTo(x + w * .6, y); c.lineTo(x + w * .85, y); c.lineTo(x + w * .4, y + h); c.fill(); }
    c.restore();
    P.ink(c, cc => rrect(cc, x, y, w, h, 8), 2.4, T.ink);
  });
  const dx = Rr - 104;
  c.fillStyle = P.shade(T.lower, -.1); c.beginPath(); rrect(c, dx, EAVE + 24, 52, BOT - EAVE - 30, 6); c.fill();
  c.fillStyle = T.window; c.beginPath(); rrect(c, dx + 7, EAVE + 32, 17, 60, 4); c.fill(); c.beginPath(); rrect(c, dx + 28, EAVE + 32, 17, 60, 4); c.fill();
  P.ink(c, cc => rrect(cc, dx, EAVE + 24, 52, BOT - EAVE - 30, 6), 2, T.ink);
  c.fillStyle = T.window; c.beginPath(); c.moveTo(Rr - 40, EAVE + 30); c.lineTo(Rr - 6, EAVE + 30); c.quadraticCurveTo(Rr + 4, EAVE + 60, Rr + 4, EAVE + 94); c.lineTo(Rr - 40, EAVE + 94); c.closePath(); c.fill();
  // headlamp (brass housing, glass; the glow is drawn per frame)
  c.fillStyle = T.brass; c.beginPath(); c.ellipse(LAMP.x - 6, LAMP.y, 12, 19, 0, -Math.PI / 2, Math.PI / 2); c.fill();
  c.fillStyle = '#d9cfae'; c.beginPath(); c.ellipse(LAMP.x + 2, LAMP.y, 5, 14, 0, -Math.PI / 2, Math.PI / 2); c.fill();
  P.ink(c, cc => cc.ellipse(LAMP.x - 6, LAMP.y, 12, 19, 0, -Math.PI / 2, Math.PI / 2), 2, T.ink);
  // roof, destination box, pantograph
  P.weather(c, roof, R, { base: T.roof, box: [L, ROOF, Rr - L, EAVE - ROOF], scale: 16, amount: .45, rust: T.rust, shadow: T.roofShade, shadowPath: cc => cc.rect(L, EAVE - 9, Rr - L, 12) });
  P.ink(c, roof, 2.6, T.ink);
  c.fillStyle = '#4b4850'; c.beginPath(); rrect(c, Rr - 122, ROOF - 30, 74, 32, 5); c.fill(); c.fillStyle = '#d8c79a'; c.fillRect(Rr - 114, ROOF - 24, 58, 18);
  c.fillStyle = '#5b4a3a'; c.font = 'bold 15px serif'; c.textAlign = 'center'; c.fillText('7', Rr - 85, ROOF - 9);
  P.ink(c, cc => rrect(cc, Rr - 122, ROOF - 30, 74, 32, 5), 2, T.ink);
  // pantograph: a diamond on a base frame, a collector bar with curled ends on top
  const px = PANTO.x, py = ROOF;
  c.fillStyle = '#4b4850'; c.fillRect(px - 64, py - 10, 128, 10);
  c.strokeStyle = '#3c3a40'; c.lineWidth = 4.5;
  c.beginPath(); c.moveTo(px - 50, py - 8); c.lineTo(px, py - 14); c.lineTo(px + 50, py - 8);
  c.moveTo(px, py - 14); c.lineTo(px - 38, py - 62); c.lineTo(px, PANTO.y + 6); c.lineTo(px + 38, py - 62); c.closePath(); c.stroke();
  c.lineWidth = 3; c.beginPath(); c.moveTo(px - 38, py - 62); c.lineTo(px + 38, py - 62); c.stroke();
  c.lineWidth = 6; c.beginPath(); c.moveTo(px - 40, PANTO.y); c.lineTo(px + 40, PANTO.y); c.stroke();
  c.lineWidth = 4; c.beginPath(); c.arc(px - 40, PANTO.y + 8, 8, -Math.PI / 2, -Math.PI * 1.4, true); c.arc(px + 40, PANTO.y + 8, 8, -Math.PI / 2, Math.PI * .4); c.stroke();
  // the green: moss along the roof, sills and skirt, a sapling, ivy up the back, hanging vines
  K.mossCap(c, [[L + 30, ROOF + 18], [L + 90, ROOF - 2], [Rr - 140, ROOF - 2]], R, { size: 22, flowers: .3, tufts: .45 });
  K.mossCap(c, [[-48, PANTO.y + 1], [-10, PANTO.y]], R, { size: 8, flowers: .25, tufts: .3 });
  wins.forEach(([x, y, w, h], i) => { if (i % 2 === 0) K.mossCap(c, [[x - 4, y + h + 4], [x + w + 4, y + h + 4]], R, { size: 9, flowers: .25, tufts: .4, cover: .7 }); });
  K.mossCap(c, [[L + 20, BELT - 6], [L + 140, BELT - 6]], R, { size: 10, flowers: .2, tufts: .3 });
  for (const bx of [-205, 205]) K.mossCap(c, [[bx - 90, -86], [bx + 60, -86]], R, { size: 10, flowers: .15, tufts: .2, cover: .6 });
  for (let i = 0; i < 14; i++) P.clump(c, L + 10 + R() * 120, BOT - 10 - R() * 150, 14 + R() * 12, R, { dark: '#24402f', mid: '#3f6a3f', light: '#6f9a4c', hi: '#a9c46e' }, { spray: 6 });
  K.sapling(c, -190, ROOF + 4, 200, R, { lean: -.12, clumps: 8 });
  for (let i = 0; i < 9; i++) {
    const vx = L + 40 + R() * (Rr - L - 120), len = 30 + R() * 110;
    c.fillStyle = P.vary('#3f6a3c', R, .06); P.ribbon(c, P.curve(vx, EAVE - 4, vx + (R() - .5) * 14, EAVE + len * .5, vx + (R() - .5) * 18, EAVE + len, 8), k => 3 * (1 - k * .6));
    for (let j = 0; j < len / 9; j++) P.spray(c, vx + (R() - .5) * 8, EAVE + j * 9, 2, P.vary('#4f7d44', R, .1), R, { n: 2, size: 4.4 });
  }
  P.ink(c, body, 2.8, T.ink);
}

// the front end, face on, for the headlamp close-up. Local units: centre of the lamp at (0, 0); face ~560 wide.
export const FRONT_LAMP = { x: 0, y: 0, r: 64 };
export function tramFront(c, seed = 8) {
  const T = TRAM, R = P.rng(seed), x0 = -290, x1 = 290, top = -560, belt = -150, bot = 230;
  const face = cc => { cc.moveTo(x0 + 30, bot); cc.lineTo(x1 - 30, bot); cc.quadraticCurveTo(x1 + 6, bot - 20, x1, belt); cc.lineTo(x1 - 10, top + 40); cc.quadraticCurveTo(0, top - 20, x0 + 10, top + 40); cc.lineTo(x0, belt); cc.quadraticCurveTo(x0 - 6, bot - 20, x0 + 30, bot); cc.closePath(); };
  c.save(); c.beginPath(); face(c); c.clip();
  P.weather(c, cc => cc.rect(x0 - 20, belt, x1 - x0 + 40, bot - belt + 10), R, { base: T.lower, box: [x0, belt, x1 - x0, bot - belt], scale: 18, amount: .2, rust: T.rust, shadow: T.lowerShade, shadowPath: cc => { cc.rect(x0 - 20, bot - 70, x1 - x0 + 40, 90); cc.rect(x1 - 70, belt, 90, bot - belt); } });
  P.weather(c, cc => cc.rect(x0 - 20, top - 30, x1 - x0 + 40, belt - top + 30), R, { base: T.upper, box: [x0, top, x1 - x0, belt - top], scale: 16, amount: .16, rust: ['#c4a77e', '#a8916c', '#a3ad9e'], shadow: T.upperShade, shadowPath: cc => cc.rect(x1 - 60, top - 30, 80, belt - top + 30) });
  c.fillStyle = T.stripe; c.fillRect(x0 - 20, belt - 14, x1 - x0 + 40, 16); c.fillStyle = '#f1e4c4'; c.fillRect(x0 - 20, belt + 4, x1 - x0 + 40, 4);
  // two front windows with a pillar
  for (const [wx, ww] of [[x0 + 34, 238], [12, 238]]) {
    c.fillStyle = T.window; c.beginPath(); rrect(c, wx, top + 70, ww, 250, 16); c.fill();
    c.save(); c.beginPath(); rrect(c, wx, top + 70, ww, 250, 16); c.clip();
    c.fillStyle = P.rgba('#cfe0dc', .22); c.beginPath(); c.moveTo(wx + 30, top + 320); c.lineTo(wx + 150, top + 70); c.lineTo(wx + 210, top + 70); c.lineTo(wx + 90, top + 320); c.fill();
    c.restore(); P.ink(c, cc => rrect(cc, wx, top + 70, ww, 250, 16), 3.5, T.ink);
  }
  c.restore();
  P.ink(c, face, 4, T.ink);
  // bumper
  c.fillStyle = '#3f3c3c'; c.beginPath(); rrect(c, x0 - 10, bot - 40, x1 - x0 + 20, 46, 12); c.fill();
  P.weather(c, cc => rrect(cc, x0 - 10, bot - 40, x1 - x0 + 20, 46, 12), R, { base: '#3f3c3c', box: [x0 - 10, bot - 40, x1 - x0 + 20, 46], scale: 16, amount: .5, rust: ['#6b4a32', '#8a5a3a'] });
  // the lamp: brass ring, dark glass with old reflections (the light is drawn per frame)
  const { r } = FRONT_LAMP;
  c.fillStyle = '#8a6a3a'; c.beginPath(); c.arc(0, 0, r * 1.32, 0, P.TAU); c.fill();
  c.fillStyle = T.brass; c.beginPath(); c.arc(-4, -4, r * 1.24, 0, P.TAU); c.fill();
  c.fillStyle = '#e6c983'; c.beginPath(); c.arc(-r * .5, -r * .6, r * .5, Math.PI * .9, Math.PI * 1.6); c.lineWidth = 7; c.strokeStyle = '#ead7a2'; c.stroke();
  const g = c.createRadialGradient(-r * .3, -r * .3, 4, 0, 0, r); g.addColorStop(0, '#9fb3ac'); g.addColorStop(.6, '#4f625f'); g.addColorStop(1, '#2c3836');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, P.TAU); c.fill();
  c.strokeStyle = P.rgba('#dfe9e2', .35); c.lineWidth = 3; for (const k of [.45, .7]) { c.beginPath(); c.arc(0, 0, r * k, 0, P.TAU); c.stroke(); }
  c.fillStyle = P.rgba('#f4f6ee', .55); c.beginPath(); c.ellipse(-r * .38, -r * .42, r * .22, r * .1, -.7, 0, P.TAU); c.fill();
  P.ink(c, cc => cc.arc(0, 0, r * 1.32, 0, P.TAU), 4, T.ink); P.ink(c, cc => cc.arc(0, 0, r, 0, P.TAU), 3, T.ink);
  // moss on the roof edge and the bumper, a few vines over the windows
  K.mossCap(c, [[x0 + 10, top + 44], [-100, top + 6], [100, top + 6], [x1 - 10, top + 44]], R, { size: 34, flowers: .35, tufts: .5 });
  K.mossCap(c, [[x0, bot - 40], [-120, bot - 42]], R, { size: 18, flowers: .3, tufts: .4 });
  K.mossCap(c, [[150, bot - 42], [x1, bot - 40]], R, { size: 16, flowers: .2, tufts: .3 });
  K.mossCap(c, [[-80, -r * 1.32 - 2], [60, -r * 1.32 - 4]], R, { size: 12, flowers: .4, tufts: .5 });
  K.mossCap(c, [[x0 - 10, belt - 14], [-150, belt - 16]], R, { size: 14, flowers: .3, tufts: .4 });
  K.mossCap(c, [[120, belt - 16], [x1 + 10, belt - 14]], R, { size: 12, flowers: .25, tufts: .3, cover: .6 });
  for (let i = 0; i < 6; i++) {
    const vx = x0 + 40 + R() * (x1 - x0 - 80), len = 80 + R() * 200;
    c.fillStyle = P.vary('#3f6a3c', R, .06); P.ribbon(c, P.curve(vx, top + 30, vx + (R() - .5) * 30, top + 30 + len * .5, vx + (R() - .5) * 40, top + 30 + len, 10), k => 5 * (1 - k * .6));
    for (let j = 0; j < len / 12; j++) P.spray(c, vx + (R() - .5) * 14, top + 30 + j * 12, 3, P.vary('#4f7d44', R, .1), R, { n: 2, size: 7 });
  }
}
