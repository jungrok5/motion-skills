// holo-pass · core.js — seeded random, easing, the invite data (defaults, link encoding), labels in ko/en/ja,
// calendar (.ics + Google link) and the RSVP reply. Classic script: everything hangs off window.HP so the pages
// also work from file:// and from any static host.
(function () {
  const HP = (window.HP = window.HP || {});

  // ---------- numbers ----------
  HP.hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  HP.rng = seed => {
    let a = typeof seed === 'number' ? seed >>> 0 : HP.hash(seed);
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  HP.clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  HP.lerp = (a, b, k) => a + (b - a) * k;
  HP.seg = (t, a, b) => HP.clamp((t - a) / (b - a));           // 0 → 1 over [a, b]
  HP.ease = {
    in: k => k * k * k,
    out: k => 1 - Math.pow(1 - k, 3),
    inOut: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    back: k => { const c = 1.7, d = c + 1; return 1 + d * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
    elastic: k => (k === 0 || k === 1 ? k : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * (2 * Math.PI / 3)) + 1),
  };
  HP.wave = (t, hz, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);

  // ---------- the invite ----------
  // Every field is optional; a theme fills in title/subtitle/music/message when they are left empty.
  HP.FIELDS = ['theme', 'title', 'subtitle', 'no', 'date', 'time', 'end', 'place', 'address', 'price', 'to', 'from',
    'message', 'music', 'rsvp', 'url', 'image', 'lang'];
  HP.normalize = (d = {}) => {
    const th = HP.THEMES[d.theme] || HP.THEMES[HP.THEME_ORDER[0]];
    const lang = ['ko', 'en', 'ja'].includes(d.lang) ? d.lang : 'ko';
    const pick = (v, f) => (v === undefined || v === null || v === '' ? f : String(v));
    const no = pick(d.no, String(100000 + (HP.hash(JSON.stringify(d)) % 900000)));
    return {
      theme: th.id, lang,
      title: pick(d.title, th.title), subtitle: pick(d.subtitle, th.subtitle[lang]),
      no, date: pick(d.date, ''), time: pick(d.time, ''), end: pick(d.end, ''),
      place: pick(d.place, ''), address: pick(d.address, ''), price: pick(d.price, ''),
      to: pick(d.to, ''), from: pick(d.from, ''), message: pick(d.message, th.message[lang]),
      music: pick(d.music, th.music), rsvp: pick(d.rsvp, ''), url: pick(d.url, ''), image: pick(d.image, ''),
    };
  };

  // link = <base>#p=<base64url(JSON)>. The fragment never reaches the server, so the invite lives only in the link.
  const b64u = bytes => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
  HP.encode = d => {
    const o = {}; for (const k of HP.FIELDS) if (d[k] !== undefined && d[k] !== '') o[k] = d[k];
    return b64u(new TextEncoder().encode(JSON.stringify(o)));
  };
  HP.decode = s => { try { return JSON.parse(new TextDecoder().decode(unb64u(s))); } catch (e) { return null; } };
  HP.fromLocation = (loc = location) => {
    const h = new URLSearchParams(loc.hash.replace(/^#/, '')), q = new URLSearchParams(loc.search);
    const p = h.get('p') || q.get('p');
    return p ? HP.decode(p) : null;
  };
  HP.link = (base, d) => base.replace(/#.*$/, '') + '#p=' + HP.encode(d);

  // ---------- labels ----------
  HP.L = {
    ko: { open: '봉투 열기', tapOpen: '탭해서 열기', flip: '뒤집기', replay: '다시 보기', music: '음악', on: '켜기', off: '끄기',
      when: '일시', where: '장소', price: '참가비', to: '받는 사람', from: '보내는 사람', web: '웹사이트', yes: '참석할게요', no: '이번엔 못 가요',
      cal: '캘린더에 추가', ics: '캘린더 파일(.ics)', gcal: 'Google 캘린더', sent: '답장을 보냈어요', copied: '답장 문구를 복사했어요. 초대를 받은 대화방에 붙여 넣어 주세요.',
      replyYes: '참석할게요!', replyNo: '아쉽지만 이번엔 못 가요.', invited: "YOU'RE INVITED", toYou: '님에게 초대장이 왔어요', anon: '당신에게 초대장이 왔어요',
      hint: '카드를 기울이거나 드래그해 보세요 · 탭하면 뒤집혀요', dow: ['일', '월', '화', '수', '목', '금', '토'], free: '무료' },
    en: { open: 'Open the envelope', tapOpen: 'Tap to open', flip: 'Flip', replay: 'Replay', music: 'Music', on: 'On', off: 'Off',
      when: 'When', where: 'Where', price: 'Entry', to: 'To', from: 'From', web: 'Website', yes: "I'll be there", no: "Can't make it",
      cal: 'Add to calendar', ics: 'Calendar file (.ics)', gcal: 'Google Calendar', sent: 'Reply sent', copied: 'Reply copied — paste it into the chat the invite came from.',
      replyYes: "I'll be there!", replyNo: "Sorry, I can't make it this time.", invited: "YOU'RE INVITED", toYou: ', you have an invitation', anon: 'You have an invitation',
      hint: 'Tilt or drag the card · tap to flip it', dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], free: 'Free' },
    ja: { open: '封筒を開ける', tapOpen: 'タップして開ける', flip: '裏返す', replay: 'もう一度', music: '音楽', on: 'オン', off: 'オフ',
      when: '日時', where: '場所', price: '料金', to: '宛名', from: '差出人', web: 'ウェブサイト', yes: '参加します', no: '今回は欠席します',
      cal: 'カレンダーに追加', ics: 'カレンダーファイル(.ics)', gcal: 'Google カレンダー', sent: '返事を送りました', copied: '返事の文面をコピーしました。招待が届いたトークに貼り付けてください。',
      replyYes: '参加します!', replyNo: '残念ですが、今回は欠席します。', invited: "YOU'RE INVITED", toYou: 'さんに招待状が届きました', anon: '招待状が届きました',
      hint: 'カードを傾けたりドラッグしてみてください · タップで裏返ります', dow: ['日', '月', '火', '水', '木', '金', '土'], free: '無料' },
  };
  HP.l = (d, k) => (HP.L[d.lang] || HP.L.ko)[k];

  // ---------- dates ----------
  HP.parseDate = s => { const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s || ''); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; };
  HP.dow = d => { const p = HP.parseDate(d.date); return p ? new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() : -1; };
  HP.when = d => {       // human line for the panel: 2026. 11. 14 (토) 18:00 – 22:00
    const p = HP.parseDate(d.date); if (!p) return [d.date, d.time].filter(Boolean).join(' ');
    const w = HP.l(d, 'dow')[HP.dow(d)];
    const day = d.lang === 'en' ? `${w}, ${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}` : d.lang === 'ja' ? `${p.y}年${p.m}月${p.d}日(${w})` : `${p.y}. ${p.m}. ${p.d} (${w})`;
    return [day, d.time && (d.time + (d.end ? ' – ' + d.end : ''))].filter(Boolean).join(' ');
  };
  HP.dots = d => { const p = HP.parseDate(d.date); return p ? `${p.y} · ${String(p.m).padStart(2, '0')} · ${String(p.d).padStart(2, '0')}` : ''; };

  // ---------- calendar ----------
  const stamp = (date, time) => { const p = HP.parseDate(date); if (!p) return null; const ymd = `${p.y}${String(p.m).padStart(2, '0')}${String(p.d).padStart(2, '0')}`; if (!time) return { ymd, all: true }; const [h, m] = time.split(':'); return { ymd, all: false, v: `${ymd}T${h.padStart(2, '0')}${(m || '00').padStart(2, '0')}00` }; };
  const plus = (v, hours) => { const y = +v.slice(0, 4), mo = +v.slice(4, 6) - 1, d = +v.slice(6, 8), h = +v.slice(9, 11), mi = +v.slice(11, 13); const t = new Date(Date.UTC(y, mo, d, h, mi) + hours * 3600e3); const z = n => String(n).padStart(2, '0'); return `${t.getUTCFullYear()}${z(t.getUTCMonth() + 1)}${z(t.getUTCDate())}T${z(t.getUTCHours())}${z(t.getUTCMinutes())}00`; };
  const nextDay = ymd => plus(ymd + 'T000000', 24).slice(0, 8);
  const range = d => { const a = stamp(d.date, d.time); if (!a) return null; if (a.all) return [a.ymd, nextDay(a.ymd), true]; const e = d.end ? stamp(d.date, d.end) : null; let b = e && !e.all ? e.v : plus(a.v, 2); if (b <= a.v) b = plus(b, 24); return [a.v, b, false]; };
  const where = d => [d.place, d.address].filter(Boolean).join(', ');
  const about = d => [d.message, d.url].filter(Boolean).join('\n\n');
  HP.ics = d => {
    const r = range(d); if (!r) return null;
    const esc = s => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
    const v = r[2] ? ';VALUE=DATE' : '';
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//holo-pass//invite//EN', 'BEGIN:VEVENT',
      `UID:${d.no}-${r[0]}@holo-pass`, `DTSTAMP:${r[0].length > 8 ? r[0] : r[0] + 'T000000'}`, `DTSTART${v}:${r[0]}`, `DTEND${v}:${r[1]}`,
      `SUMMARY:${esc(d.title.replace(/\n/g, ' '))}`, where(d) && `LOCATION:${esc(where(d))}`, about(d) && `DESCRIPTION:${esc(about(d))}`,
      'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
  };
  HP.gcal = d => {
    const r = range(d); if (!r) return null;
    const q = new URLSearchParams({ action: 'TEMPLATE', text: d.title.replace(/\n/g, ' '), dates: r[0] + '/' + r[1], details: about(d), location: where(d) });
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  };

  // ---------- RSVP ----------
  // rsvp = "" → share sheet / copy a reply line; "name@host" or "mailto:" → a prefilled mail; "https://…" → open it with ?answer=&no=
  HP.reply = (d, yes) => {
    const line = `${d.to ? d.to + ': ' : ''}${HP.l(d, yes ? 'replyYes' : 'replyNo')} (${d.title.replace(/\n/g, ' ')}${d.date ? ' · ' + d.date : ''})`;
    const r = d.rsvp.trim();
    if (/^mailto:|^[^\s@/]+@[^\s@/]+$/.test(r)) {
      const to = r.replace(/^mailto:/, '');
      return { kind: 'mail', href: `mailto:${to}?subject=${encodeURIComponent('[RSVP] ' + d.title.replace(/\n/g, ' ') + ' — ' + HP.l(d, yes ? 'yes' : 'no'))}&body=${encodeURIComponent(line)}`, text: line };
    }
    if (/^https?:\/\//.test(r)) {
      const u = new URL(r); u.searchParams.set('answer', yes ? 'yes' : 'no'); if (d.to) u.searchParams.set('name', d.to); u.searchParams.set('no', d.no);
      return { kind: 'url', href: u.toString(), text: line };
    }
    return { kind: 'share', text: line };
  };

  HP.store = { get(k) { try { return localStorage.getItem('holo-pass:' + k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem('holo-pass:' + k, v); } catch (e) {} } };
})();
