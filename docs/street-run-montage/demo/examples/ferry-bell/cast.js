// 「The Ferry Bell」 — the cast as data. Hana (14, light, quick: 44 kg) in a mint windbreaker and a navy cap, and Mochi,
// her corgi (short legs, big ears, a fluffy tail; 12 kg — heavy for its size, so it gathers longer before a leap).
export const CAST = {
  rider: {
    name: 'Hana', height: 1.55, mass: 44, stance: 'regular',
    skin: '#f5cfb2', hair: '#1f1d24', hairStyle: 'bob', eyes: '#2f6f8f',
    cap: { color: '#22305a', logo: 'UMI', logoColor: '#f4e9c8', brim: 1 },
    top: { color: '#7fd0b6', hood: '#f4f1e8', cuff: '#5fb39a', print: 'SEA', oversize: 1.18 },
    bottom: { color: '#2e3a5c', kind: 'shorts' }, socks: '#f7f5ef',
    shoes: { color: '#f6f2e8', accent: '#f2b52e', sole: '#e8e0cc' },
    board: { deck: '#e9c995', grip: '#26262a', wheels: '#9fe0cf', truck: '#c9ced3', graphic: ['#22305a', '#7fd0b6', '#f2b52e'] },
  },
  buddy: {
    kind: 'corgi', name: 'Mochi', coat: '#e0913f', belly: '#fbf3e4', muzzle: '#fbf3e4', socksF: '#fbf3e4', socksH: '#fbf3e4', tailTip: '#fbf3e4',
    eyes: '#2a1c14', nose: '#1e1612', earInner: '#f0b39a', collar: '#e8432e', ink: '#5a3218',
  },
};
