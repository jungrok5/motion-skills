---
name: holo-pass
description: Make an animated holographic ticket invitation for any occasion, sent as one link — give it a topic (a graduation dinner, a cat's first birthday, a housewarming, a book club, a Christmas party …) and it designs a theme for it in one consistent style — a moving character picture in the ticket's stamp window, a palette, a stage background, an original synthesised music track and the words in ko / en / ja — then builds the invite: the guest opens an envelope (the seal pops, the flap opens, the music starts), the foil pass flies out, tilts so the rainbow foil and glitter catch the light, flips to a postcard back with their name and a message, and ends on RSVP buttons and add-to-calendar. Outputs a static site (guest page + maker page), the link, a QR share image and a 16:9 or 9:16 MP4 of the reveal. No server, no sign-up — the invite lives in the link. Six built-in themes are style examples. Use for "animated invitation", "e-invite / invite link", "holographic ticket invite", "party invitation with RSVP", "make an invitation like this for <occasion>", or Korean/Japanese asks ("움직이는 초대장", "모바일 초대장", "링크로 보내는 초대장", "티켓 모양 초대장", "이 스타일로 ○○ 초대장 만들어줘", "졸업 초대장", "집들이 초대장", "생일 초대장", "연하장", "招待状", "動く招待状").
---

# holo-pass

An invitation that arrives as a link and plays like a small film: an envelope addressed to the guest, a wax seal that
pops, a flap that opens, and a holographic ticket that rises out and flies to the centre. The ticket has a moving
picture in a postage-stamp window (a tree whose ornaments blink in turn, a sun that rises behind a mountain, two mugs
that clink and steam into a heart …), a vertical title, a stub with date / time / place / entry / QR / to / from, and a
rainbow foil, glitter and glare that follow the tilt (pointer, drag or the phone's gyro). Tap it and it flips to a
postcard back with a greeting, a handwritten-style message and a postmark. Under the card: the details, RSVP buttons,
a calendar file and a Google Calendar link, music on/off. The same timeline renders to MP4 for posting.

Built in this repo after KANA's post on X about "しあわせパス" (a free web tool for animated invitations,
https://x.com/KanaWorks_AI/status/2117430343934599675 — the post and its 90 s video are described in
references/SOURCE.md). That is someone else's product; this skill rebuilds the *format* (foil ticket, envelope reveal,
flip to a postcard back, music, RSVP + calendar, link / QR sharing) as its own code. The themes, characters, music,
layout details and names here are this repo's own — no artwork, mascot, brand or text from the original.

**Give it a topic, not a template.** What stays fixed is the style — the ticket, the foil, the reveal, the picture's
language (flat shapes, one outline, a blinking face, a 2–4 s loop), the guest page. What is designed for each topic is
the theme: the picture's character and its moment, the palette, the stage background, the music and the words
(references/BRIEF.md). The six built-in themes are examples of that style; `examples/graduation` shows the flow on a
topic none of them covers — a diploma in a mortarboard that hops while caps are tossed, a spotlit hall, an original
processional in D major — all in one `themes.js` written from its `BRIEF.md`.
Worked examples: `examples/graduation` (a theme designed from a brief), `examples/home-party` (Korean),
`examples/christmas` (English), `examples/birthday` (Japanese).

## What's in this folder
| path | what |
|---|---|
| `pass/` | **the deployable site** — copy it to any static host. `invite.html` (what guests open), `maker.html` (the form that writes links), `lib/`, `fonts/` |
| `pass/lib/core.js` | seeded `rng`, easing, the invite fields + `normalize`, link `encode`/`decode` (base64url JSON in `#p=`), labels in ko/en/ja, `ics`/`gcal`, `reply` (RSVP) |
| `pass/lib/themes.js` | the six built-in themes (style examples) and `HP.addTheme(def, art)` |
| `pass/themes/custom.js` | themes designed for the project's topics — loaded by both pages after the built-ins |
| `pass/lib/art.js` | `HP.ART[name](ctx, t, pal)` — the moving pictures (480 × 380) and `HP.KIT`, the helpers a new picture is drawn with (`face`, `ol`, `rays`, `confetti`, `cloud` …) |
| `pass/lib/card.js` | `HP.card(host, data)` — front and back painted on canvases (1200 × 560), foil / shine / glitter / glare CSS layers, `pose()` |
| `pass/lib/stage.js` | `HP.stage(host, data, {W, H})` — backgrounds (`HP.BG`, `HP.BGKIT`), envelope, `seek(t)` (the 14 s reveal) and `frame(clock, pose)` (after it) |
| `pass/lib/music.js` | four Web Audio loops (`bells`, `koto`, `cafe`, `party`), `HP.addTrack` for new ones, `play`/`stop` live, `render` offline → `wav` |
| `pass/lib/holo.css` | card, holo layers, envelope, stage, guest panel |
| `pass/lib/qrcode.js` | QR encoder (Kazuhiko Arase, MIT) |
| `pass/fonts/` | Pretendard, Barlow Condensed 700, JetBrains Mono, Caveat (all OFL; README lists them) |
| `examples/graduation/` | `BRIEF.md` → `themes.js` (picture, `spot` background, `march` track) → `invite.json` — the topic flow end to end |
| `examples/*/invite.json` | home-party (ko), christmas (en), birthday (ja) on built-in themes |
| `scripts/new-pass.mjs` | start a project: `pass/` + an `invite.json` + a `BRIEF.md` to fill |
| `scripts/new-theme.mjs` | scaffold a theme for a topic in `pass/themes/custom.js` (picture, palette, words, slots for a background and a track) |
| `scripts/check.mjs` | loads clean, every moment draws, deterministic, the picture fills its window and moves, link round-trips and fits a QR, calendar builds, music renders, words fit |
| `scripts/render.mjs` | stills, a contact sheet, or the MP4 (16:9 or 9:16) with the music |
| `scripts/link.mjs` | `invite.json` → the link for a deployed `pass/` (+ a QR SVG) |
| `references/` | **BRIEF** (topic → theme: the template and the review rubric) · **SOURCE** (the post, what is taken and what is not) · **LOOK** (anatomy of the pass, the timeline) · **THEMES** (add a template, a picture, a track) · **KIT** (fields, page contract, API) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-party/
  BRIEF.md      the topic designed into a theme (references/BRIEF.md) — written first
  invite.json   the invitation (empty fields take the theme's words)
  pass/         copy of the skill's pass/ — deploy this folder; the topic's theme goes in pass/themes/custom.js
  out/          stills, sheets, the MP4 and WAV (not committed)
```
Run the scripts from the project root: `node <skill>/scripts/render.mjs invite.json --stills 1.3,4.2,6.5,10`.
They use the project's `pass/` when there is one, else the skill's.

Requirements: Node + Playwright Chromium, ffmpeg (MP4 only). No network, no npm install. The pages themselves need
nothing but a static host (or `python3 -m http.server`); they also open from `file://`.

## Workflow
1. **Topic → brief.** From the user's words (occasion, guests, date, time, place, entry, to / from, a line or two,
   the guests' language, where replies go — ask only for what is missing), fill references/BRIEF.md into `BRIEF.md`.
   Decide first whether a built-in theme fits the topic *exactly*; if not (the usual case), design one: the picture's
   subject as a character and its 2–4 s moment, the palette, the stage background, the music, the words.
2. **Start**: `node <skill>/scripts/new-pass.mjs my-party` (copies `pass/`, writes `invite.json` and `BRIEF.md`).
3. **Theme** (skip only if a built-in fits): `node <skill>/scripts/new-theme.mjs <id>` → a block in
   `pass/themes/custom.js`. Draw the picture with `HP.KIT` (references/THEMES.md): a full background, the subject big and
   centred with one outline and a face, its loop, something constant. Add a stage background (`HP.BG.<key>`) and a
   track (`HP.addTrack`) when the brief asks for new ones. `examples/graduation/themes.js` is a complete one.
4. **Invite**: fill `invite.json` (`"theme": "<id>"`). Title 1–3 short lines in capitals (each line is a column; Latin
   reads best), subtitle ≤ ~18 characters, message ≤ ~4 lines.
5. **Check**: `node <skill>/scripts/check.mjs invite.json` prints only `ok` (it also proves the new picture fills its
   window, moves and is deterministic, and that the new track does not clip). Warnings name words that do not fit.
6. **Look and score**: `render.mjs invite.json --stills 1.3,3.3,6.5,10` and score them with the rubric in
   references/BRIEF.md (does the picture alone say the topic? does it read at 150 px? …). Fix and repeat. Check the
   picture in the maker's thumbnail too — it is the size guests see on a phone.
7. **Deploy and link**: put `pass/` on a static host (GitHub Pages: commit it and enable Pages), then
   `link.mjs invite.json --base https://<host>/<path>/pass/ --qr out/qr.svg`. Open the link on a phone: tap the envelope,
   hear the music, tilt, tap to flip, press RSVP and the calendar button. One deployed `pass/` serves every invitation;
   the theme also appears in `maker.html`, so the host can make more links themselves.
8. **Video (optional)**: `render.mjs invite.json` → `out/<name>.mp4` (1920 × 1080, 14 s, music muxed);
   `--size 1080x1920` for a 9:16 story with the title, date and place under the card. Look at a frame of the MP4 itself.

## Rules
- **The invite lives in the link.** All fields go into the URL fragment (`#p=`), which browsers never send to the server.
  Nothing is stored; there is no database. Do not add analytics or a backend unless the user asks.
- **Deterministic.** Pictures, backgrounds and particles are functions of `t` with seeded randomness — no `Math.random`
  or `Date` in `art.js` / `stage.js` (`check.mjs` proves it). Live mode only feeds the clock and the pointer in.
- **Words fit or shrink, never overflow.** The card shrinks long titles and cuts long fields with "…" — and
  `check.mjs` warns. Fix the words rather than accepting a 40 px title or a cut place name.
- **Ink stays dark under the foil.** The foil multiplies a pastel rainbow over the paper and screens a moving shine;
  never blend modes that turn dark text bright (color-dodge on the whole face).
- **Music starts on the guest's tap** (browsers block audio before a gesture) and can be switched off; the choice is remembered.
- **Design per topic.** A new occasion gets a theme of its own from a brief — its own character, moment, palette and,
  when the tone differs, its own background and track. Reusing a built-in theme for a topic it was not made for (the
  birthday cake for a graduation) is the failure this skill exists to avoid.
- **One style.** New themes keep the family look: flat fills, one outline colour and weight, a blinking face, a full
  background, a 2–4 s loop, no text inside the picture. The ticket, foil, reveal and guest page do not change per topic.
- **Original look.** Characters and music are designed here, per topic. Do not copy a named product's mascot, brand,
  layout text or illustrations, a school crest or an existing song; the user's own logo or photo can go in `image`.
- **Honest RSVP.** With no `rsvp` address the answer is shared/copied for the guest to send — say so; do not imply the
  host is notified automatically.

## Contract (invite.html)
Live (default): `#p=<base64url JSON>`; tap / Enter opens the envelope; pointer, drag or gyro tilts; tap / Space flips.
`?render=1` turns it into a fixed stage for the renderer: `window.seek(t)`, `window.DURATION` (14), `window.FPS` (30),
`window.SIZE`, `window.renderWav(dur)` → base64 WAV, `window.invite`, `window.__ready`. `&size=1920x1080` (or
`1080x1920`) · `&t=6` one frozen frame · `&theme=birthday` previews a template with its default words · any field as a
query parameter overrides the link (`&to=Mina`).
