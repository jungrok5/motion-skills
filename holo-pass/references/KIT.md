# KIT — fields, pages, API

## invite.json (and the link)
| field | what | default |
|---|---|---|
| `theme` | a theme designed for the topic (`pass/themes/custom.js`), or a built-in: `christmas` · `new-year` · `home-party` · `date-night` · `birthday` · `event` | `christmas` |
| `title` | big vertical title; `\n` starts a new column (1–3 lines) | theme's |
| `subtitle` | the thin column beside it (≤ ~18 chars) | theme's, in `lang` |
| `no` | ticket number (6 digits read best) | hash of the invite |
| `date` · `time` · `end` | `YYYY-MM-DD` · `HH:MM` · `HH:MM` (an end before the start = next day) | — |
| `place` · `address` | shown on the card · used for the map link and the calendar | — |
| `price` | "무료", "₩15,000", "Bring a dish" … | — |
| `to` · `from` | names on the envelope, stub, back | — |
| `message` | the back (≤ 5 lines on the card; the panel shows it whole) | theme's, in `lang` |
| `music` | `bells` · `koto` · `cafe` · `party` · `none` | theme's |
| `rsvp` | empty → share sheet / copy; `name@host` or `mailto:` → mail; `https://…` → opened with `?answer=yes\|no&name=&no=` | — |
| `url` | event website (panel link + calendar description) | — |
| `image` | an https image (CORS-enabled) shown instead of the picture | — |
| `lang` | `ko` · `en` · `ja` — labels, greeting, date format, theme words | `ko` |

Link: `<host>/pass/invite.html#p=` + base64url(UTF-8 JSON of the non-empty fields). ~250 chars for Latin text,
~500 for Korean/Japanese (each character is 3 bytes). Both QR codes (stub, share image) encode it.

## invite.html
Live: envelope → tap (or Enter) opens, music starts, the reveal plays to 4.6 s, then the card follows the pointer /
drag / gyro (iOS asks for motion permission on the same tap) and a tap (or Space) flips it. Idle for 2 s → a slow sway.
The panel: title, when / where (Google Maps link) / entry / from / website, message, RSVP (remembered per ticket number
in localStorage), `.ics` file and Google Calendar link, music on/off (remembered), flip, replay.
Render: see SKILL.md › Contract. For a local render (`file://` only) `&themes=<file URL of a .js>` loads a theme file
before the page starts — render.mjs and check.mjs pass the `themes.js` that sits next to an invite.json this way.

## maker.html
Form → `data` → link (`HP.link(invite.html, data)`), saved as a draft in localStorage; opening `maker.html#p=…` edits
that invite. Buttons: copy the link, copy it with a message, a 1080 × 1350 PNG (card + words + QR), open as a guest.
`?ui=en` for an English form.

## API (window.HP)
- `HP.normalize(d)` → every field filled · `HP.encode(d)` / `HP.decode(s)` / `HP.link(base, d)` / `HP.fromLocation()`
- `HP.when(d)` human date line · `HP.ics(d)` · `HP.gcal(d)` · `HP.reply(d, yes)` → `{ kind: share|mail|url, href, text }`
- `HP.card(host, d, { dpr, link })` → `{ el, ready, setData, draw(t), pose({rx, ry, flip, z, light}), frontCanvas, backCanvas }`
- `HP.stage(host, d, { W, H, q, dpr, link, caption })` → `{ ready, seek(t, idle), frame(clock, pose), card, cardFinal, DURATION }`
- `HP.music.play(id)` / `stop()` / `render(id, dur, sr)` → AudioBuffer / `wav(buffer)` → Uint8Array
- `HP.addTheme(def, art)` · `HP.KIT` (picture helpers) · `HP.BGKIT` (background helpers) · `HP.addTrack(id, def)` — references/THEMES.md
- `HP.THEMES`, `HP.THEME_ORDER`, `HP.ART`, `HP.BG`, `HP.TRACKS`, `HP.TIMELINE`, `HP.CARD`, `HP.warnings` (what did not fit, after `setData`)
