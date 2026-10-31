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
    const { text, ss } = Pilot, W = Pilot.W, H = Pilot.H, a = ss(at, at + (card.compact ? .5 : .9), t);
    if (a <= 0) return;
    const y = o.y || H * .40, sh = o.titleShadow ?? 'rgba(0,0,0,.6)', sf = o.srcFont || "'Noto Sans KR',sans-serif";
    if (card.kicker) text(ctx, card.kicker, W / 2, y - 118, { size: 32, font: sf, weight: 600, color: o.srcColor || '#d9cfbf', alpha: a, ls: 2 });
    text(ctx, card.title, W / 2, y, { size: 72, weight: 700, font: o.font, color: o.color || '#f3ece0', alpha: a, shadow: sh || undefined });
    const q = card.compact ? .3 : 1;    // a compact card (~4 s, word-log) brings everything in within ~.5 s, then holds it to read
    text(ctx, card.passage, W / 2, y + 250, { size: 34, font: sf, weight: 500, color: o.srcColor || '#d9cfbf', alpha: a * ss(at + .4 * q, at + 1.3 * q, t) });
    text(ctx, card.by, W / 2, y + 310, { size: 30, font: sf, color: o.srcColor || '#d9cfbf', alpha: a * ss(at + .6 * q, at + 1.5 * q, t) * .9 });
    if (card.cta) text(ctx, card.cta, W / 2, y + 420, { size: 30, font: sf, weight: 600, color: o.ctaColor || (o.color || '#f3ece0'), alpha: a * ss(at + 1.2, at + 2.1, t), ls: 2 });
  };
  // The end card from the film's source (scenes/source.js → window.SOURCE, written from source.json by new-film.py).
  // ~4 s on screen (beat.end = DUR − 4): the title and two small lines, in together and held long enough to read; links, CTA and full credits go in the upload description.
  //   sermon:     (위 작은 줄) 날짜 주일 n부예배 / 설교 제목 / 본문 / 교회 · 설교자
  //   book:       제목(or 『책』) / 『책』 장·쪽 / 저자 · 출판사
  //   meditation, topic, verse: 제목 / 본문 / by(교회·채널 등, 선택)
  // a long one-line title is broken at the space nearest its middle (the end card is laid out for ≤ 2 title lines)
  const two = s => { s = String(s || ''); if (s.includes('\n') || s.length <= 12) return s; const m = s.length / 2; let b = -1;
    for (let i = 0; i < s.length; i++) if (s[i] === ' ' && (b < 0 || Math.abs(i - m) < Math.abs(b - m))) b = i;
    return b > 0 ? s.slice(0, b) + '\n' + s.slice(b + 1) : s; };
  S.card = function (src = {}) { const c = card(src); c.title = two(c.title); c.compact = true; return c; };
  const card = function (src = {}) {
    const d = src.date ? String(src.date).replace(/-/g, '.') : '', j = a => a.filter(Boolean).join(' · ');
    if (src.type === 'book') return { title: src.title || (src.book ? `『${src.book}』` : ''),
      passage: j([src.book && src.title ? `『${src.book}』` : '', src.where]), by: j([src.author, src.publisher]), cta: src.cta || '' };
    if (src.type === 'sermon' || (!src.type && src.preacher)) {
      const dt = src.date ? new Date(src.date + 'T12:00:00') : null, sun = dt && dt.getDay() === 0;
      return { kicker: [d, sun ? '주일' : '', src.service].filter(Boolean).join(' '), title: src.title || '', passage: src.passage || '',
        by: j([src.church, src.preacher]), cta: src.cta || '' }; }
    return { title: src.title || '', passage: src.passage || '', by: j([src.by, d]), cta: src.cta || '' };
  };
  // fade in from black over the first `fi` s and out over the last `fo` s (so films and cuts join cleanly)
  S.fadeBlack = function (ctx, t, dur, fi = 1, fo = .6) {
    const k = 1 - Pilot.ss(0, fi, t) * (1 - Pilot.ss(dur - fo, dur, t)); if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = `rgba(0,0,0,${k})`; ctx.fillRect(0, 0, Pilot.W, Pilot.H); ctx.restore();
  };
  window.Story = S;
})();
