# holo-pass

An animated invitation sent as one link: the guest opens an envelope, a holographic ticket with a moving picture flies
out, tilts so its rainbow foil catches the light, and flips to a postcard back with their name and a message — then
RSVP buttons, add-to-calendar and music. Six templates, ko / en / ja, a maker page, a QR share image, and a 16:9 or 9:16
MP4 of the reveal. No server, no sign-up: the invitation lives in the link's `#fragment`.

```bash
# from this folder
node scripts/check.mjs examples/home-party/invite.json                      # prints ok … ok
node scripts/render.mjs examples/home-party/invite.json --stills 1.3,4.2,6.5,10
node scripts/render.mjs examples/home-party/invite.json                     # out/home-party.mp4 (1920×1080, music)
node scripts/render.mjs examples/home-party/invite.json --size 1080x1920    # out/home-party-9x16.mp4
cd pass && python3 -m http.server 8000   # http://localhost:8000/invite.html (guest) · /maker.html (make links)

# a new invitation
node scripts/new-pass.mjs ~/my-party --theme birthday
node scripts/link.mjs ~/my-party/invite.json --base https://you.github.io/party/pass/ --qr out/qr.svg
```

Requirements: Node + Playwright Chromium, ffmpeg (MP4 only). The pages need only a static host.

Built after KANA's post about "しあわせパス" on X (https://x.com/KanaWorks_AI/status/2117430343934599675) — the format
rebuilt as original code; samples: https://jungrok5.github.io/motion-skills/holo-pass/
