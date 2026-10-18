/* story.js — the part every word-log film shares, whatever its style: on-screen words and the end card.
   A film's own words and beats live in scenes/script.js as `window.SCRIPT = { DUR, beat, lines, endCard, accent }`:
     lines:   [[from, to, '한 줄\n두 줄', '출처 (개역개정)'?], …]   (≤ 2 lines, ≥ ~2 s each; scripture verbatim)
     endCard: { title, passage, by, cta }
   Portrait 1080×1920 safe zones: no words in the bottom 380 px or right 140 px; nothing important in the top 160 px.
   Style kits call Story.captions / Story.endCard with their own fonts and colours (o = { font, srcFont, color, srcColor,
   ctaColor, size, y, shadow, shadowBlur, titleShadow }). Every string goes through Pilot.text → translatable. */
(function () {
  const S = {};
  S.captions = function (ctx, t, lines, o = {}) {
    const { text, win } = Pilot, W = Pilot.W;
    for (const [a, b, s, src] of lines) {
      const al = win(t, a, b, o.fadeIn ?? .35, o.fadeOut ?? .45); if (al <= 0) continue;
      const two = s.includes('\n'), size = o.size || (two ? 54 : 62), y = o.y || 430;
      text(ctx, s, W / 2, y, { size, weight: o.weight || 600, font: o.font, color: o.color || '#f3ece0', alpha: al,
        shadow: o.shadow || 'rgba(0,0,0,.75)', shadowBlur: o.shadowBlur ?? 24, maxW: 900 });
      if (src) text(ctx, src, W / 2, y + (two ? size * 1.55 : 0) + 76, { size: 28, font: o.srcFont || "'Noto Sans KR',sans-serif",
        color: o.srcColor || '#d9cfbf', alpha: al * .9, ls: 1, shadow: o.shadow || 'rgba(0,0,0,.75)' });
    }
  };
  S.endCard = function (ctx, t, card, at, o = {}) {
    const { text, ss } = Pilot, W = Pilot.W, H = Pilot.H, a = ss(at, at + .9, t);
    if (a <= 0) return;
    const y = o.y || H * .40, sh = o.titleShadow ?? 'rgba(0,0,0,.6)', sf = o.srcFont || "'Noto Sans KR',sans-serif";
    text(ctx, card.title, W / 2, y, { size: 72, weight: 700, font: o.font, color: o.color || '#f3ece0', alpha: a, shadow: sh || undefined });
    text(ctx, card.passage, W / 2, y + 250, { size: 34, font: sf, weight: 500, color: o.srcColor || '#d9cfbf', alpha: a * ss(at + .4, at + 1.3, t) });
    text(ctx, card.by, W / 2, y + 310, { size: 30, font: sf, color: o.srcColor || '#d9cfbf', alpha: a * ss(at + .6, at + 1.5, t) * .9 });
    text(ctx, card.cta, W / 2, y + 420, { size: 30, font: sf, weight: 600, color: o.ctaColor || (o.color || '#f3ece0'), alpha: a * ss(at + 1.2, at + 2.1, t), ls: 2 });
  };
  // fade in from black over the first `fi` s and out over the last `fo` s (so films and cuts join cleanly)
  S.fadeBlack = function (ctx, t, dur, fi = 1, fo = .6) {
    const k = 1 - Pilot.ss(0, fi, t) * (1 - Pilot.ss(dur - fo, dur, t)); if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = `rgba(0,0,0,${k})`; ctx.fillRect(0, 0, Pilot.W, Pilot.H); ctx.restore();
  };
  window.Story = S;
})();
