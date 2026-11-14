// starter · 10_poster — ① the poster is the film's protagonist: design it for the topic.
// Topic of this starter: a sea-swimming club that meets at dawn. Everything below is designed for that topic —
// replace it all for yours (words, hierarchy, grid, the picture, palette, fonts). Units: 1000 × 1500, y down.
const POSTER = () => SP.poster({
  paper: '#F4F2EC', ink: '#111111', accent: '#FFD23F',            // ② one accent — that restraint is the look
  fonts: { display: { family: 'Archivo Black', weight: 400 }, text: { family: 'Archivo', weight: 400 } },
  draw(P) {
    const M = 50, IW = P.W - 2 * M;
    const nameLine = (y) => {
      P.text('Harbour Swim Club', { x: M, y, size: 30, role: 'text' });
      P.text('Daily · 06:00', { x: P.W - M, y, size: 30, role: 'text', align: 'right' });
      P.rule(M, y + 14, P.W - M, y + 14, 2.5);
    };
    nameLine(72);
    // ③ the hero line: on the accent band, cut into the hero ribbon, bitten by the shredder, lunged at in the hook
    P.band(0, 112, P.W, 226);
    P.fit('SWIM', { x: M, y: 318, w: IW, cap: 196 });
    P.mark('hero', { y0: 112, y1: 338 });
    P.fit('at first light', { x: M, y: 470, w: IW, cap: 104 });
    // giant cropped figures: only their tops show — pure texture
    P.crop('06', { x: -40, y: 1010, size: 640, clip: [0, 520, P.W, 130] });
    P.rule(M, 668, P.W - M, 668, 6);
    // ④ the picture, drawn in code for the topic (or pass an <img>): sun over swell, as a halftone
    P.halftone((c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e8e8e8'); g.addColorStop(0.55, '#9a9a9a'); g.addColorStop(1, '#5a5a5a');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fafafa'; c.beginPath(); c.arc(w * 0.62, h * 0.5, h * 0.2, 0, Math.PI * 2); c.fill();
      for (let k = 0; k < 9; k++) { const y0 = h * (0.56 + k * 0.055); c.fillStyle = `rgba(30,30,30,${0.18 + k * 0.05})`; c.beginPath(); c.moveTo(0, h);
        for (let x = 0; x <= w; x += 4) c.lineTo(x, y0 + Math.sin(x / (30 + k * 6) + k) * (6 + k * 2)); c.lineTo(w, h); c.fill(); }
    }, { x: M, y: 690, w: 430, h: 330, cell: 9, mode: 'photo' });
    const body = 'We meet on the slipway before the ferries wake. Cold water, a short swim to the red buoy and back, then tea on the wall. ' +
      'No times, no lanes, no wetsuit rules. Bring a bright cap and a friend who can count heads. The sea sets the distance; the light sets the hour.';
    P.columns(body, { x: 510, y: 680, w: IW - 460, h: 340, cols: 2, size: 17, lead: 22, seed: 1 });
    P.columns(body, { x: M, y: 1036, w: IW, h: 80, cols: 4, size: 17, lead: 22, seed: 5 });
    nameLine(1170);
    P.fit('SWIM', { x: M, y: 1440, w: IW, cap: 210 });
  },
});
