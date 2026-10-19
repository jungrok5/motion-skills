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
    if (card.cta) text(ctx, card.cta, W / 2, y + 420, { size: 30, font: sf, weight: 600, color: o.ctaColor || (o.color || '#f3ece0'), alpha: a * ss(at + 1.2, at + 2.1, t), ls: 2 });
  };
  // The end card from the film's source (scenes/source.js → window.SOURCE, written from source.json by new-film.py).
  // Short on screen (≤ 2.5 s): the title and two small lines; links, CTA and full credits go in the upload description.
  //   sermon:     설교 제목 / 본문 / 날짜 · 교회 · 설교자
  //   book:       제목(or 『책』) / 『책』 장·쪽 / 저자 · 출판사
  //   meditation, topic, verse: 제목 / 본문 / by(교회·채널 등, 선택)
  S.card = function (src = {}) {
    const d = src.date ? String(src.date).replace(/-/g, '.') : '', j = a => a.filter(Boolean).join(' · ');
    if (src.type === 'book') return { title: src.title || (src.book ? `『${src.book}』` : ''),
      passage: j([src.book && src.title ? `『${src.book}』` : '', src.where]), by: j([src.author, src.publisher]), cta: src.cta || '' };
    if (src.type === 'sermon' || (!src.type && src.preacher)) return { title: src.title || '', passage: src.passage || '',
      by: j([d, src.church, src.preacher]), cta: src.cta || '' };
    return { title: src.title || '', passage: src.passage || '', by: j([src.by, d]), cta: src.cta || '' };
  };
  // fade in from black over the first `fi` s and out over the last `fo` s (so films and cuts join cleanly)
  S.fadeBlack = function (ctx, t, dur, fi = 1, fo = .6) {
    const k = 1 - Pilot.ss(0, fi, t) * (1 - Pilot.ss(dur - fo, dur, t)); if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = `rgba(0,0,0,${k})`; ctx.fillRect(0, 0, Pilot.W, Pilot.H); ctx.restore();
  };
  window.Story = S;
})();
