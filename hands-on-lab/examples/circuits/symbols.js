// Circuits course · schematic symbols. Each is drawn round (0,0) along +x from -20 to +20; s.part() rotates and places it.
export const SYM = {
  battery: (s, o = {}) => `<path d="M-20,0 H-3 M3,0 H20"/><line x1="-3" y1="-12" x2="-3" y2="12"/><line x1="3" y1="-6" x2="3" y2="6" style="stroke-width:3.2"/><text x="-10" y="-8" style="font-size:9px" transform="rotate(${-(o.rot || 0)} -10 -11)">+</text>`,
  cells: (s, o = {}) => `<path d="M-20,0 H-9 M9,0 H20"/><line x1="-9" y1="-11" x2="-9" y2="11"/><line x1="-4" y1="-5" x2="-4" y2="5" style="stroke-width:3"/><line x1="4" y1="-11" x2="4" y2="11"/><line x1="9" y1="-5" x2="9" y2="5" style="stroke-width:3"/><text x="-16" y="-8" style="font-size:9px" transform="rotate(${-(o.rot || 0)} -16 -11)">+</text>`,
  supply: (s, o = {}) => `<path d="M-20,0 H-3 M3,0 H20"/><line x1="-3" y1="-12" x2="-3" y2="12"/><line x1="3" y1="-6" x2="3" y2="6" style="stroke-width:3.2"/><path d="M-11,11 L11,-11 M11,-11 l-6,1 M11,-11 l-1,6"/><text x="-12" y="-8" style="font-size:9px" transform="rotate(${-(o.rot || 0)} -12 -11)">+</text>`,
  resistor: () => `<path d="M-20,0 H-14 L-11.5,-6 L-7,6 L-2.5,-6 L2,6 L6.5,-6 L11,6 L14,0 H20"/>`,
  lamp: (s, o = {}) => `<path d="M-20,0 H-9 M9,0 H20"/><circle class="${o.lit ? 'lit' : 'soft'}" r="9"/><path d="M-6.4,-6.4 L6.4,6.4 M6.4,-6.4 L-6.4,6.4"/>`,
  led: (s, o = {}) => `<path d="M-20,0 H-7 M7,0 H20"/><polygon class="${o.lit ? 'lit' : 'soft'}" points="-7,-8 -7,8 7,0"/><line x1="7" y1="-8" x2="7" y2="8"/><path d="M1,-11 l6,-7 M4,-18 l3,0 l0,3 M7,-9 l6,-7 M10,-16 l3,0 l0,3"/>`,
  switch: (s, o = {}) => `<path d="M-20,0 H-9 M11,0 H20"/><circle class="fill" cx="-9" r="2.2"/><circle class="soft" cx="11" r="2.2"/>${o.closed ? '<path d="M-9,0 L11,-0.5"/>' : '<path d="M-9,0 L9,-11"/>'}`,
  switch3: (s, o = {}) => `<path d="M-20,0 H-9"/><circle class="fill" cx="-9" r="2.2"/><circle class="soft" cx="10" cy="-10" r="2.2"/><circle class="soft" cx="10" cy="10" r="2.2"/>${o.pos === 'charge' ? '<path d="M-9,0 L9,-9.5"/>' : o.pos === 'discharge' ? '<path d="M-9,0 L9,9.5"/>' : '<path d="M-9,0 L11,0"/>'}`,
  cap: (s, o = {}) => `<path d="M-20,0 H-3 M3,0 H20"/><line x1="-3" y1="-11" x2="-3" y2="11"/><path d="M5,-11 Q2,0 5,11"/><text x="-12" y="-7" style="font-size:8px" transform="rotate(${-(o.rot || 0)} -12 -10)">+</text>`,
  meter: (s, o = {}) => `<path d="M-20,0 H-10 M10,0 H20"/><circle class="soft" r="10"/><text x="0" y="3.4" text-anchor="middle" style="font-size:10px" transform="rotate(${-(o.rot || 0)})">${o.letter || 'V'}</text>`,
};

