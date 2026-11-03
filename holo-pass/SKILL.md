---
name: holo-pass
description: Make an animated holographic ticket invitation that is sent as one link — the guest opens an envelope (the seal pops, the flap opens, music starts), a foil pass flies out with a moving picture in its stamp window, tilts so the rainbow foil and glitter catch the light, flips to a postcard back with their name and a message, and ends on a panel with RSVP buttons and add-to-calendar. Six templates (Christmas, New Year, home party, date night, birthday, event booth), four synthesised music loops, Korean / English / Japanese; a maker page to fill it in, a QR share image, and a 16:9 or 9:16 MP4 of the reveal. No server, no sign-up — the invite lives in the link. Use for "animated invitation", "e-invite / invite link", "holographic ticket / boarding pass invite", "party invitation with RSVP", "make an invitation like this", or Korean/Japanese asks ("움직이는 초대장", "모바일 초대장", "링크로 보내는 초대장", "티켓 모양 초대장", "홈파티 초대장", "생일 초대장", "크리스마스 초대장", "연하장", "招待状", "動く招待状").
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
flip to a postcard back, music, RSVP + calendar, link / QR sharing) as its own code. The templates, characters, music,
layout details and names here are this repo's own — no artwork, mascot, brand or text from the original.
Worked example: `examples/home-party` (Korean), plus `examples/christmas` (English) and `examples/birthday` (Japanese).

## What's in this folder
| path | what |
|---|---|
| `pass/` | **the deployable site** — copy it to any static host. `invite.html` (what guests open), `maker.html` (the form that writes links), `lib/`, `fonts/` |
| `pass/lib/core.js` | seeded `rng`, easing, the invite fields + `normalize`, link `encode`/`decode` (base64url JSON in `#p=`), labels in ko/en/ja, `ics`/`gcal`, `reply` (RSVP) |
| `pass/lib/themes.js` | the six templates: default words per language, picture, background, palette, music |
| `pass/lib/art.js` | `HP.ART[name](ctx, t, pal)` — the moving pictures (480 × 380, flat shapes, one outline colour, blinking faces) |
| `pass/lib/card.js` | `HP.card(host, data)` — front and back painted on canvases (1200 × 560), foil / shine / glitter / glare CSS layers, `pose()` |
| `pass/lib/stage.js` | `HP.stage(host, data, {W, H})` — backgrounds, envelope, `seek(t)` (the 14 s reveal) and `frame(clock, pose)` (after it) |
| `pass/lib/music.js` | four Web Audio loops (`bells`, `koto`, `cafe`, `party`), `play`/`stop` live, `render` offline → `wav` |
| `pass/lib/holo.css` | card, holo layers, envelope, stage, guest panel |
| `pass/lib/qrcode.js` | QR encoder (Kazuhiko Arase, MIT) |
| `pass/fonts/` | Pretendard, Barlow Condensed 700, JetBrains Mono, Caveat (all OFL; README lists them) |
| `examples/*/invite.json` | home-party (ko), christmas (en), birthday (ja) |
| `scripts/new-pass.mjs` | start a project: `pass/` + an `invite.json` |
| `scripts/check.mjs` | loads clean, every moment draws, deterministic, link round-trips and fits a QR, calendar builds, music renders, words fit |
| `scripts/render.mjs` | stills, a contact sheet, or the MP4 (16:9 or 9:16) with the music |
| `scripts/link.mjs` | `invite.json` → the link for a deployed `pass/` (+ a QR SVG) |
| `references/` | **SOURCE** (the post, what is taken and what is not) · **LOOK** (anatomy of the pass, the timeline) · **THEMES** (add a template, a picture, a track) · **KIT** (fields, page contract, API) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-party/
  invite.json   the invitation (empty fields take the theme's words)
  pass/         copy of the skill's pass/ — deploy this folder; edit lib/themes.js / art.js here for a custom look
  out/          stills, sheets, the MP4 and WAV (not committed)
```
Run the scripts from the project root: `node <skill>/scripts/render.mjs invite.json --stills 1.3,4.2,6.5,10`.
They use the project's `pass/` when there is one, else the skill's.

Requirements: Node + Playwright Chromium, ffmpeg (MP4 only). No network, no npm install. The pages themselves need
nothing but a static host (or `python3 -m http.server`); they also open from `file://`.

## Workflow
1. **Ask for the facts** (or take them from the user's message): occasion → theme, date, time (and end), place (and
   address), entry/price, who it is to and from, a one- or two-line message, the language of the guests, where replies
   should go (nothing = guests reply in the chat the link came from; an email; or a form / webhook URL).
2. **Start**: `node <skill>/scripts/new-pass.mjs my-party --theme birthday` (or `--from home-party`), fill `invite.json`.
   Title: 1–3 short lines in capitals (each line becomes a vertical column; Latin reads best). Subtitle ≤ ~18 characters.
   Message ≤ ~4 lines. Leave fields empty to take the theme's words in the invite's language.
3. **Check**: `node <skill>/scripts/check.mjs invite.json` prints only `ok` (warnings name what does not fit: shorten it).
4. **Look**: `render.mjs invite.json --stills 1.3,4.2,6.5,10` — the envelope, the pass leaving it, the front, the back.
   Read every word on the front and back stills; check the picture is the right one for the occasion.
5. **Deploy and link**: put `pass/` on a static host (GitHub Pages: commit it and enable Pages), then
   `link.mjs invite.json --base https://<host>/<path>/pass/ --qr out/qr.svg`. Open the link on a phone: tap the envelope,
   hear the music, tilt the phone, tap to flip, press RSVP and the calendar button. One deployed `pass/` serves every
   invitation — new invites are new links, made with `link.mjs` or in the browser with `maker.html`.
6. **Video (optional)**: `render.mjs invite.json` → `out/<name>.mp4` (1920 × 1080, 14 s, music muxed);
   `--size 1080x1920` for a 9:16 story with the title, date and place under the card. Look at a frame of the MP4 itself.
7. **Custom look (optional)**: a new theme or picture goes in the project's `pass/lib/themes.js` / `art.js`
   (references/THEMES.md); run `check.mjs --page pass/invite.html --all` afterwards.

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
- **Original look.** Templates, characters and music are this skill's own or designed per user. Do not copy a named
  product's mascot, brand, layout text or illustrations; the user's own logo or photo can go in `image`.
- **Honest RSVP.** With no `rsvp` address the answer is shared/copied for the guest to send — say so; do not imply the
  host is notified automatically.

## Contract (invite.html)
Live (default): `#p=<base64url JSON>`; tap / Enter opens the envelope; pointer, drag or gyro tilts; tap / Space flips.
`?render=1` turns it into a fixed stage for the renderer: `window.seek(t)`, `window.DURATION` (14), `window.FPS` (30),
`window.SIZE`, `window.renderWav(dur)` → base64 WAV, `window.invite`, `window.__ready`. `&size=1920x1080` (or
`1080x1920`) · `&t=6` one frozen frame · `&theme=birthday` previews a template with its default words · any field as a
query parameter overrides the link (`&to=Mina`).
