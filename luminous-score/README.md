# luminous-score

A piece of music played as light on its own score: a printed orchestral or piano score lies in a dark, misty room, the
camera glides low along the system, and every note head lights up in its voice's colour as it sounds, throws a coloured
pool on the paper and fades into a glowing trail. The sound is synthesised from the same notes. Give it a piece
(public-domain repertoire, a MIDI file, or music written for the film); it designs the staves, a colour per voice, the
room and the shots on the musical events → a live page (sound on demand) + a WAV + a 1080p MP4.

```bash
cd luminous-score/examples/candle-prelude
node ../../scripts/check.mjs index.html                          # check OK
node ../../scripts/render.mjs index.html --sheet --scale .5      # out/piece-sheet.jpg: every shot as it starts and settled
node ../../scripts/render.mjs index.html --preview               # out/piece-preview.mp4 (960 × 540, with sound)
node ../../scripts/render.mjs index.html                         # out/piece.wav + out/piece.mp4 (1920 × 1080, 30 fps, 75.3 s)

node ../../scripts/new-piece.mjs ~/my-piece                      # a new piece from the template (First Snow)
node ../../scripts/midi2score.mjs piece.mid                      # a MIDI file → JSON for P.addMidi()
```

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys.

Source: made from https://x.com/ThoNg676733/status/2119610929654469035?a=CTncbvpeXqVgLMNZlp0&s=19 (a film of Vivaldi's
"Winter" in which a printed score lies in a dark room and its notes light up staff by staff — the style). Worked example:
`examples/candle-prelude` (Bach, Prelude in C, BWV 846, bars 1–19, by candlelight); starting piece: `templates/piece.html`
(「First Snow」, an original allegro for strings).
Samples: https://jungrok5.github.io/motion-skills/luminous-score/
