// The mascot of 「보리」: a rice cooker — the object at the centre of a Korean kitchen — with an amber LED panel as its
// face. Steam (not sparks) rises from its vent. Designed for this topic from references/MASCOT.md.
import { K } from 'alf/kit.js';

export const MASCOT = {
  name: '보리',
  avatarSay: '보리',
  led: '#FFB23E',
  viewBox: [400, 420],
  screen: { x: 117, y: 211, w: 166, h: 58, r: 12, cols: 34, rows: 12 },
  avatarBox: [58, 46, 284, 290],
  sparks: { x: 0.655, y: 0.2, rise: 0.36, spread: 0.1, color: '#ffffff', size: [12, 24], n: 12, soft: 4, grow: 1.6, alpha: 0.95 },
  svg: (id) => `<svg viewBox="0 0 400 420" xmlns="http://www.w3.org/2000/svg"><defs>
    ${K.svg.plastic(id + 'b', '#F6F4EF', { cx: 0.3, cy: 0.15, r: 1.05 })}
    ${K.svg.shade(id + 's', { top: 0.5, bottom: 0.2 })}
    ${K.svg.metal(id + 'l', { x2: 1, y2: 0.35 })}
    ${K.svg.glass(id + 'g')}
    <linearGradient id="${id}gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5FD08F"/><stop offset="1" stop-color="#1E9E5A"/></linearGradient>
    <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55555c"/><stop offset="1" stop-color="#2a2a2f"/></linearGradient>
    <radialGradient id="${id}sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#3a2a18" stop-opacity=".3"/><stop offset="1" stop-color="#3a2a18" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="200" cy="394" rx="172" ry="22" fill="url(#${id}sh)"/>
  <rect x="96" y="356" width="44" height="26" rx="9" fill="#bdb7ad"/><rect x="260" y="356" width="44" height="26" rx="9" fill="#bdb7ad"/>
  <path d="M58 172 Q58 150 82 148 L318 148 Q342 150 342 172 L336 328 Q332 374 288 376 L112 376 Q68 374 64 328 Z" fill="url(#${id}b)"/>
  <path d="M58 172 Q58 150 82 148 L318 148 Q342 150 342 172 L336 328 Q332 374 288 376 L112 376 Q68 374 64 328 Z" fill="url(#${id}s)"/>
  <rect x="60" y="136" width="280" height="24" rx="12" fill="#e2ded6"/>
  <rect x="60" y="136" width="280" height="8" rx="4" fill="#fff" opacity=".7"/>
  <path d="M68 142 Q74 66 200 60 Q326 66 332 142 Z" fill="url(#${id}l)"/>
  <path d="M68 142 Q74 66 200 60 Q326 66 332 142 Z" fill="url(#${id}s)" opacity=".7"/>
  <path d="M96 118 Q130 80 200 76" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none" opacity=".8"/>
  <rect x="150" y="44" width="100" height="28" rx="14" fill="url(#${id}h)"/>
  <rect x="160" y="48" width="70" height="7" rx="3.5" fill="#fff" opacity=".25"/>
  <circle cx="262" cy="96" r="12" fill="#c3c3c8"/><circle cx="262" cy="96" r="6.5" fill="#5f5f66"/>
  <rect x="102" y="198" width="196" height="118" rx="28" fill="#dcd7cf"/>
  <rect x="106" y="202" width="188" height="76" rx="22" fill="url(#${id}g)"/>
  <rect x="116" y="206" width="110" height="6" rx="3" fill="#fff" opacity=".08"/>
  <rect x="128" y="288" width="62" height="18" rx="9" fill="url(#${id}gb)"/>
  <rect x="134" y="290" width="44" height="5" rx="2.5" fill="#fff" opacity=".35"/>
  <rect x="210" y="288" width="62" height="18" rx="9" fill="#c8c3ba"/>
  </svg>`,
};
