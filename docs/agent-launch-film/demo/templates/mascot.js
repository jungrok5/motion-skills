// The mascot of 「Tally」 (the template): a desk calculator — an object from the topic's world (bookkeeping) whose
// display is its face. Design your own per topic (references/MASCOT.md): an object, a dark screen, one LED colour.
import { K } from 'alf/kit.js';

export const MASCOT = {
  name: 'TALLY',            // what the screen says first
  avatarSay: 'T',           // the still screen on the small chat avatar
  led: '#7CF2C8',           // the dot colour
  viewBox: [400, 440],
  screen: { x: 98, y: 80, w: 204, h: 74, r: 10, cols: 30, rows: 11 },
  avatarBox: [60, 36, 280, 200],   // the part of the drawing the 68 px chat avatar shows
  svg: (id) => {
    const keys = [];
    const glyph = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '%', '='];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const i = r * 4 + c, x = 92 + c * 56, y = 192 + r * 50, acc = i === 15;
      keys.push(`<g><rect x="${x}" y="${y + 4}" width="48" height="40" rx="13" fill="#000" opacity=".10"/><rect x="${x}" y="${y}" width="48" height="40" rx="13" fill="url(#${id}${acc ? 'a' : 'k'})"/><rect x="${x + 3}" y="${y + 2}" width="42" height="14" rx="8" fill="#fff" opacity="${acc ? 0.28 : 0.6}"/><text x="${x + 24}" y="${y + 27.5}" text-anchor="middle" font-family="ALF Sans" font-weight="650" font-size="19" fill="${acc ? '#fff' : '#55524c'}">${glyph[i]}</text></g>`);
    }
    return `<svg viewBox="0 0 400 440" xmlns="http://www.w3.org/2000/svg"><defs>
      ${K.svg.plastic(id + 'b', '#F1ECE3', { cx: 0.3, cy: 0.18, r: 1.05 })}
      ${K.svg.shade(id + 's', { top: 0.6, bottom: 0.16 })}
      ${K.svg.glass(id + 'g')}
      <linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e3ded4"/></linearGradient>
      <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6E8BF0"/><stop offset="1" stop-color="#3E63DD"/></linearGradient>
      <radialGradient id="${id}sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#3a2a18" stop-opacity=".28"/><stop offset="1" stop-color="#3a2a18" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9d2c6"/><stop offset="1" stop-color="#b7ae9f"/></linearGradient>
    </defs>
    <ellipse cx="200" cy="420" rx="170" ry="22" fill="url(#${id}sh)"/>
    <rect x="60" y="46" width="280" height="372" rx="48" fill="url(#${id}e)"/>
    <rect x="60" y="36" width="280" height="372" rx="48" fill="url(#${id}b)"/>
    <rect x="60" y="36" width="280" height="372" rx="48" fill="url(#${id}s)"/>
    <rect x="84" y="64" width="232" height="106" rx="24" fill="#cfc8bb"/>
    <rect x="86" y="66" width="228" height="102" rx="22" fill="url(#${id}g)"/>
    <rect x="96" y="70" width="140" height="10" rx="5" fill="#fff" opacity=".07"/>
    ${keys.join('')}
    <path d="M86 52 Q200 40 314 52" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7" fill="none"/>
    </svg>`;
  },
};
