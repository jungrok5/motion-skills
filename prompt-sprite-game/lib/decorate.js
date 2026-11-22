// decorate.js — which pixels of a sprite to free when it gets a hat, glasses, a scarf … (used with tessera-link `repaint`).
//
// A region is measured from the sprite's own opaque bounds (top row y0, bottom row y1), so the same accessory lands on
// a cat, a frog or a robot. keepMask returns 1 for pixels that stay exactly as they are and 0 for pixels to repaint.
// Accessories that sit on the body (hat, glasses, scarf, crown) work well; props beside the body need empty space
// around it (references/TESSERA.md, "Same character, new look").

const bounds = (tok) => {
  let y0 = 16, y1 = -1, x0 = 16, x1 = -1;
  for (let i = 0; i < 256; i++) if (tok[i] > 0) { const r = i >> 4, c = i & 15; y0 = Math.min(y0, r); y1 = Math.max(y1, r); x0 = Math.min(x0, c); x1 = Math.max(x1, c); }
  return y1 < 0 ? { y0: 0, y1: 15, x0: 0, x1: 15, h: 16 } : { y0, y1, x0, x1, h: y1 - y0 + 1 };
};

/** region name → (row, col, opaque, bounds) → true when the pixel is freed */
export const REGIONS = {
  hat: (r, c, o, b) => !o || r < b.y0 + Math.max(3, Math.round(b.h * 0.28)),        // the top of the head and the air above
  crown: (r, c, o, b) => !o || r < b.y0 + Math.max(2, Math.round(b.h * 0.2)),
  eyes: (r, c, o, b) => o && r >= b.y0 + Math.round(b.h * 0.2) && r <= b.y0 + Math.round(b.h * 0.4),
  neck: (r, c, o, b) => o && r >= b.y0 + Math.round(b.h * 0.4) && r <= b.y0 + Math.round(b.h * 0.58),
  feet: (r, c, o, b) => !o || r > b.y1 - 2,                                           // under the feet and around
  background: (r, c, o) => !o,
  side: (r, c, o, b) => !o && (c > b.x1 || c < b.x0),                                // the empty columns beside the body
  above: (r, c, o, b) => !o && r < b.y0,                                              // the empty rows above the body
  all: () => true,
};

/** keep-mask (1 = keep) for `tokens` (256 palette ids, 0 = transparent) and a region name */
export function keepMask(tokens, region) {
  const fn = REGIONS[region]; if (!fn) throw new Error(`unknown region "${region}" (${Object.keys(REGIONS).join(', ')})`);
  const b = bounds(tokens);
  return Uint8Array.from({ length: 256 }, (_, i) => (fn(i >> 4, i & 15, tokens[i] > 0, b) ? 0 : 1));
}

/** the accessories the game offers, each with the words that go after the hero's own prompt and the region it frees */
export const ACCESSORIES = [
  { key: 'hat', label: '마법사 모자', words: 'wearing a wizard hat', region: 'hat' },
  { key: 'crown', label: '왕관', words: 'wearing a golden crown', region: 'crown' },
  { key: 'glasses', label: '선글라스', words: 'wearing sunglasses', region: 'eyes' },
  { key: 'scarf', label: '빨간 목도리', words: 'with a red scarf', region: 'neck' },
];

/** RGBA (16×16×4) → nearest palette ids (0 = transparent), so a hand-drawn or painter sprite can be repainted by Tessera */
export function toTokens(rgba, palette /* Uint8ClampedArray K×4, index 0 transparent */) {
  const K = palette.length / 4, out = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    if (rgba[i * 4 + 3] < 128) continue;
    let best = 1, bd = Infinity;
    for (let k = 1; k < K; k++) {
      const dr = palette[k * 4] - rgba[i * 4], dg = palette[k * 4 + 1] - rgba[i * 4 + 1], db = palette[k * 4 + 2] - rgba[i * 4 + 2];
      const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db; if (d < bd) { bd = d; best = k; }
    }
    out[i] = best;
  }
  return out;
}

/**
 * Make room for props: scale a sprite's tokens down to `size` px (nearest neighbour on its opaque bounds) and place it
 * on the ground (or `lift` rows above it, room for a board), at the left, centre or right. Returns new tokens (0 = transparent) — repaint the background (and,
 * if you like, a one-pixel ring round the body to tidy the scaled outline) to add things beside it.
 */
export function shrink(tokens, size = 12, anchor = 'left', lift = 0) {
  let y0 = 16, y1 = -1, x0 = 16, x1 = -1;
  for (let i = 0; i < 256; i++) if (tokens[i] > 0) { const r = i >> 4, c = i & 15; y0 = Math.min(y0, r); y1 = Math.max(y1, r); x0 = Math.min(x0, c); x1 = Math.max(x1, c); }
  if (y1 < 0) return Int32Array.from(tokens);
  const h = y1 - y0 + 1, w = x1 - x0 + 1, k = Math.min(1, size / Math.max(h, w));
  const nh = Math.max(1, Math.round(h * k)), nw = Math.max(1, Math.round(w * k));
  const ox = anchor === 'right' ? 16 - nw : anchor === 'center' ? Math.floor((16 - nw) / 2) : 0, oy = Math.max(0, 16 - nh - lift);
  const out = new Int32Array(256);
  for (let r = 0; r < nh; r++) for (let c = 0; c < nw; c++) out[(oy + r) * 16 + ox + c] = tokens[(y0 + Math.min(h - 1, Math.floor((r + 0.5) / k))) * 16 + x0 + Math.min(w - 1, Math.floor((c + 0.5) / k))];
  return out;
}
