# holo-pass

An animated invitation sent as one link, for any occasion: give it a topic and it designs a theme in one consistent
style — a moving character in the ticket's stamp window, a palette, a stage background, an original music track, the
words in ko / en / ja. The guest opens an envelope, the holographic ticket flies out, tilts so its rainbow foil catches
the light, and flips to a postcard back with their name and a message — then RSVP buttons, add-to-calendar and music.
A maker page, a QR share image, and a 16:9 or 9:16 MP4 of the reveal. No server, no sign-up: the invitation lives in
the link's `#fragment`. Six built-in themes are style examples; `examples/graduation` is a theme designed from a brief.

```bash
# from this folder
node scripts/check.mjs examples/graduation/invite.json                      # prints ok … ok (loads its themes.js)
node scripts/render.mjs examples/graduation/invite.json --stills 1.3,3.3,6.5,10
node scripts/render.mjs examples/graduation/invite.json                     # out/graduation.mp4 (1920×1080, music)
node scripts/render.mjs examples/home-party/invite.json --size 1080x1920    # out/home-party-9x16.mp4
cd pass && python3 -m http.server 8000   # http://localhost:8000/invite.html (guest) · /maker.html (make links)

# a new invitation for a topic: brief → theme → invite
node scripts/new-pass.mjs ~/my-party                   # pass/ + BRIEF.md + invite.json
cd ~/my-party && node <skill>/scripts/new-theme.mjs housewarming   # → pass/themes/custom.js, draw it from BRIEF.md
node <skill>/scripts/check.mjs invite.json
node <skill>/scripts/link.mjs invite.json --base https://you.github.io/party/pass/ --qr out/qr.svg
```

Requirements: Node + Playwright Chromium, ffmpeg (MP4 only). The pages need only a static host.

Built after KANA's post about "しあわせパス" on X (https://x.com/KanaWorks_AI/status/2117430343934599675) — the format
rebuilt as original code; samples: https://jungrok5.github.io/motion-skills/holo-pass/
