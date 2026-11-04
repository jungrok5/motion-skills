// aesthetics-film · chrome.js — everything drawn on top of the 3D, on one 2D canvas, in the source film's grammar:
//   top-left   the chapter badge: a seal-red square with the number, the chapter title, a small spaced-caps English name
//   top-right  the brand mark (series title + small caps)
//   bottom     the subtitle: the native line typed character by character (accent words in seal red on paper, gold on
//              darker frames), the English line in italic serif under it
//   callouts   a dot on a 3D point, a hairline leader, a small dark plate with two lines
//   card       the closing title card: paper, a dry-brush stroke, the title with a red seal, a quiet line under it
// All sizes are given for a 1080 px tall frame and scaled with the output height.
import { PAPER, INK, SEAL, CHROME, GOLD } from "./look.js";
import { rng } from "./tex.js";

export const FONT_NATIVE = `"Essay Serif", "Noto Serif CJK KR", "Noto Serif CJK SC", "Source Han Serif", "Songti SC", "Nanum Myeongjo", serif`;
export const FONT_LATIN = `"Essay Latin", "EB Garamond", Georgia, serif`;

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
/** characters that count as one typed unit each (CJK, kana, hangul) */
export const isWide = (ch) => /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/.test(ch);
export const readTime = (text = "", en = "") => {
  const wide = [...text].filter(isWide).length, latin = text.replace(/[^\sA-Za-z]/g, "").split(/\s+/).filter(Boolean).length;
  return Math.max(1.6, wide / 7.5 + latin / 3.2, en.split(/\s+/).filter(Boolean).length / 3.4);
};

export class Chrome {
  constructor(W, H) {
    this.W = W; this.H = H; this.s = H / 1080;
    this.canvas = document.createElement("canvas"); this.canvas.width = W; this.canvas.height = H;
    this.g = this.canvas.getContext("2d");
  }
  clear() { this.g.clearRect(0, 0, this.W, this.H); }
  font(px, fam = FONT_NATIVE, weight = 500, style = "normal") { this.g.font = `${style} ${weight} ${Math.round(px * this.s)}px ${fam}`; }
  /** spaced text (letter-spacing by hand, for small caps) */
  spaced(txt, x, y, sp, align = "left") {
    const g = this.g, w = [...txt].reduce((a, c) => a + g.measureText(c).width + sp * this.s, -sp * this.s);
    let cx = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
    for (const c of txt) { g.fillText(c, cx, y); cx += g.measureText(c).width + sp * this.s; }
    return w;
  }
  shadow(tone, on = true) { const g = this.g; if (on && CHROME[tone].shadow) { g.shadowColor = CHROME[tone].shadow; g.shadowBlur = 10 * this.s; g.shadowOffsetY = 1 * this.s; } else { g.shadowColor = "transparent"; g.shadowBlur = 0; g.shadowOffsetY = 0; } }

  /** chapter badge: { n, title, en }, k = 0..1 fade-in */
  badge(ch, tone, k) {
    if (!ch || k <= 0) return;
    const g = this.g, s = this.s, C = CHROME[tone], x = 42 * s, y = 34 * s, a = smooth(k);
    g.save(); g.globalAlpha = a; g.translate(-10 * s * (1 - a), 0);
    g.fillStyle = SEAL; g.fillRect(x, y, 26 * s, 26 * s);
    this.font(12.5, FONT_LATIN, 600); g.fillStyle = "#f6efe4"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(String(ch.n).padStart(2, "0"), x + 13 * s, y + 13.5 * s);
    g.textAlign = "left"; g.textBaseline = "alphabetic"; this.shadow(tone);
    this.font(20, FONT_NATIVE, 600); g.fillStyle = C.text; g.fillText(ch.title, x + 38 * s, y + 19 * s);
    if (ch.en) { this.font(8.5, FONT_LATIN, 500); g.fillStyle = C.sub; this.spaced(ch.en.toUpperCase(), x + 38 * s, y + 33 * s, 1.6); }
    this.shadow(tone, false);
    g.fillStyle = C.rule; g.fillRect(x, y + 44 * s, 120 * s * a, Math.max(1, s));
    g.restore();
  }
  /** brand mark top-right: { title, sub } */
  brand(b, tone, a = 1) {
    if (!b || a <= 0) return;
    const g = this.g, s = this.s, C = CHROME[tone], x = this.W - 42 * s;
    g.save(); g.globalAlpha = a * 0.92; this.shadow(tone); g.textAlign = "right";
    this.font(15, FONT_NATIVE, 700); g.fillStyle = C.text; g.fillText(b.title, x, 50 * s);
    if (b.sub) { this.font(7.5, FONT_LATIN, 500); g.fillStyle = C.sub; g.textAlign = "left"; this.spaced(b.sub.toUpperCase(), x, 63 * s, 1.4, "right"); }
    g.restore();
  }
  /** a subtitle line at local time lt (s since it began), lasting dur: typed characters, accents, the English line */
  line(L, lt, tone) {
    if (lt < 0 || lt > L.dur) return;
    const g = this.g, s = this.s, C = CHROME[tone], cx = this.W / 2, y1 = this.H - 96 * s, y2 = this.H - 62 * s;
    const out = 1 - smooth((lt - (L.dur - 0.45)) / 0.45);
    const chars = [...L.text], cps = L.cps;
    // accent spans: character indices that belong to an accent word
    const acc = new Uint8Array(chars.length);
    for (const w of L.accent ?? []) { const wc = [...w]; for (let i = 0; i + wc.length <= chars.length; i++) if (wc.every((c, j) => chars[i + j] === c)) for (let j = 0; j < wc.length; j++) acc[i + j] = 1; }
    this.font(L.size ?? 34, FONT_NATIVE, 600);
    const widths = chars.map((c) => g.measureText(c).width), total = widths.reduce((a, b) => a + b, 0);
    let x = cx - total / 2;
    g.save(); g.textBaseline = "alphabetic"; this.shadow(tone);
    for (let i = 0; i < chars.length; i++) {
      const t0 = L.typeAt[i], k = smooth((lt - t0) / 0.28);
      if (k > 0) { g.globalAlpha = k * out; g.fillStyle = acc[i] ? C.accent : C.text; g.fillText(chars[i], x, y1 + (1 - k) * 5 * s); }
      x += widths[i];
    }
    if (L.en) {
      const ke = smooth((lt - L.enAt) / 0.6) * out;
      if (ke > 0) { this.font(L.enSize ?? 19, FONT_LATIN, 400, "italic"); g.textAlign = "center"; g.globalAlpha = ke; g.fillStyle = C.sub; g.fillText(L.en, cx, y2); }
    }
    g.restore();
  }
  /** callout: p = projected [x, y] in px (or null when behind the camera), k = 0..1 reveal */
  callout(c, p, k, tone) {
    if (!p || k <= 0) return;
    const g = this.g, s = this.s, a = smooth(k), dx = (c.dx ?? 70) * s, dy = (c.dy ?? -80) * s;
    const ex = p[0] + dx * smooth(k * 1.6), ey = p[1] + dy * smooth(k * 1.6);
    g.save(); g.globalAlpha = a;
    g.strokeStyle = GOLD; g.lineWidth = Math.max(1, 1.1 * s); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(ex, ey); g.stroke();
    g.fillStyle = GOLD; g.beginPath(); g.arc(p[0], p[1], 3.2 * s, 0, Math.PI * 2); g.fill();
    const kp = smooth((k - 0.45) / 0.55);
    if (kp > 0) {
      g.globalAlpha = kp;
      this.font(15, FONT_NATIVE, 600); const w1 = g.measureText(c.text).width; this.font(8, FONT_LATIN, 500);
      const w2 = c.en ? [...c.en.toUpperCase()].reduce((acc, ch) => acc + g.measureText(ch).width + 1.2 * s, 0) : 0;
      const pw = Math.max(w1, w2) + 26 * s, ph = (c.en ? 44 : 30) * s, left = dx >= 0, px = left ? ex : ex - pw, py = ey - ph / 2;
      g.fillStyle = "rgba(26,24,22,0.80)"; g.strokeStyle = "rgba(201,167,106,0.65)"; g.lineWidth = Math.max(1, s);
      g.beginPath(); g.roundRect(px, py, pw, ph, 3 * s); g.fill(); g.stroke();
      g.fillStyle = "#f3ead8"; g.textAlign = "left"; this.font(15, FONT_NATIVE, 600); g.fillText(c.text, px + 13 * s, py + (c.en ? 20 : 20) * s);
      if (c.en) { this.font(8, FONT_LATIN, 500); g.fillStyle = "rgba(243,234,216,0.7)"; this.spaced(c.en.toUpperCase(), px + 13 * s, py + 35 * s, 1.2); }
    }
    g.restore();
  }
  /** a dry-brush stroke along a wave, drawn up to fraction k (deterministic) */
  brush(cx, cy, len, k, seed = 5, color = INK, amp = 0.06, alpha = 1) {
    if (alpha <= 0 || k <= 0) return;
    const g = this.g, s = this.s, r = rng(seed), N = 220, n = Math.floor(N * clamp01(k)), bristles = 26;
    const P = (u) => [cx - len / 2 + len * u, cy + Math.sin(u * Math.PI * 2.1 + 0.4) * len * amp * (1 - 0.4 * u) - Math.sin(u * Math.PI) * len * 0.015];
    const offs = Array.from({ length: bristles }, () => [r() * 2 - 1, 0.35 + r() * 0.65, r()]);
    g.save(); g.lineCap = "round";
    for (const [o, wgt, dry] of offs) {
      g.beginPath();
      for (let i = 0; i <= n; i++) {
        const u = i / N, [x, y] = P(u), width = len * 0.022 * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.05)) * (1 - 0.35 * u);
        const nx = x, ny = y + o * width;
        if (u > 0.55 + dry * 0.45 && dry > 0.45) { g.moveTo(nx, ny); continue; }  // dry brush: bristles run out of ink
        if (i === 0) g.moveTo(nx, ny); else g.lineTo(nx, ny);
      }
      g.strokeStyle = color; g.globalAlpha = (0.18 + 0.5 * wgt) * alpha; g.lineWidth = Math.max(1, 2.2 * s * wgt); g.stroke();
    }
    g.restore();
  }
  /** a seal stamp: square with 1–4 characters, red ground, slightly worn */
  seal(x, y, size, text, a = 1, seed = 3) {
    const g = this.g, chars = [...text], r = rng(seed);
    g.save(); g.globalAlpha = a; g.fillStyle = SEAL; g.fillRect(x, y, size, size);
    g.fillStyle = "#f4eadb"; g.textAlign = "center"; g.textBaseline = "middle";
    if (chars.length === 1) { g.font = `700 ${size * 0.68}px ${FONT_NATIVE}`; g.fillText(chars[0], x + size / 2, y + size * 0.53); }
    else { const n = Math.ceil(chars.length / 2); g.font = `700 ${size * 0.4}px ${FONT_NATIVE}`; chars.forEach((c, i) => { const col = Math.floor(i / n), row = i % n; g.fillText(c, x + size * (col ? 0.28 : 0.72), y + size * (0.29 + row * 0.44)); }); }
    g.globalCompositeOperation = "destination-out"; for (let i = 0; i < 40; i++) { g.globalAlpha = 0.25 * a; g.beginPath(); g.arc(x + r() * size, y + r() * size, r() * size * 0.03, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  /** the closing title card at local time lt: { title, sub, seal, footer, stroke, dur } */
  card(c, lt) {
    const g = this.g, s = this.s, W = this.W, H = this.H, a = smooth(lt / 0.8) * (1 - smooth((lt - c.dur + 0.6) / 0.6) * (c.fadeOut ? 1 : 0));
    g.save(); g.globalAlpha = a; g.fillStyle = c.bg ?? PAPER; g.fillRect(0, 0, W, H); g.restore();
    if (c.stroke !== false) this.brush(W * 0.5, H * 0.47, W * 0.32, (lt - 0.3) / 1.5, c.seed ?? 5, INK, 0.06, a * (1 - smooth((lt - 2.0) / 0.9)));
    const kt = smooth((lt - 2.7) / 1.0);
    if (kt > 0) {
      g.save(); g.globalAlpha = kt; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = INK;
      this.font(c.size ?? 62, FONT_NATIVE, 700); const tw = this.spaced(c.title, W / 2, H * 0.5, 10, "center");
      if (c.seal) this.seal(W / 2 + tw / 2 + 24 * s, H * 0.5 - 50 * s, 44 * s, c.seal, smooth((lt - 3.2) / 0.3));
      if (c.en) { this.font(13, FONT_LATIN, 500); g.fillStyle = "rgba(29,31,33,0.6)"; this.spaced(c.en.toUpperCase(), W / 2, H * 0.5 + 34 * s, 3, "center"); }
      const ks = smooth((lt - 3.6) / 0.9);
      if (c.sub && ks > 0) { g.globalAlpha = ks; this.font(17, FONT_NATIVE, 500); g.fillStyle = "rgba(29,31,33,0.72)"; this.spaced(c.sub, W / 2, H * 0.5 + 72 * s, 3, "center"); }
      const kf = smooth((lt - 4.2) / 0.9);
      if (c.footer && kf > 0) { g.globalAlpha = kf; this.font(11, FONT_LATIN, 400, "italic"); g.fillStyle = "rgba(29,31,33,0.5)"; g.fillText(c.footer, W / 2, H - 56 * s); }
      g.restore();
    }
  }
}
