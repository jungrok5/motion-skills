# LESSONS — what broke while building it, and the fix

- **Envelope label filled the whole envelope.** `.hp-env > div { inset: 0 }` beat `.hp-env-label { left/bottom }`
  (higher specificity) → the label stretched to full height. Fix: scope the label and stamp as `.hp-env .hp-env-label`.
- **Dark text turned neon under the foil.** A color-dodge rainbow over the whole face brightened the ink to yellow-green
  at strong tilts. Fix: tint with a pastel rainbow in `multiply` (paper colours, ink stays dark) and put the sparkle in
  a separate `screen` band + `color-dodge` glitter only.
- **The vertical title ran into the subtitle.** With `rotate(90°)` the glyphs grow to the *right* of the baseline by
  ~0.72 × size, so a column placed by its baseline overlaps whatever is on its right. Fix: place the block from its right
  edge (`colR = 812 − 0.74 × size`) and size it from both the window height and the width left for all columns.
- **Fonts missing on the first paint.** Canvas text drew in a fallback face, then never repainted. Fix: wait for
  `document.fonts.load()` of each face with a sample containing Hangul and kana before painting the static layers.
- **No sound on phones.** Audio cannot start before a user gesture. The envelope tap is that gesture: it starts the
  music *and* (on iOS) asks for motion permission for the gyro — both must be called inside the same tap handler.
- **Long links.** Korean / Japanese text is 3 bytes per character before base64 (× 4/3), so a full invite is ~500
  characters and an 81-module QR code. Fine on a screen; `check.mjs` warns above 85 modules — shorten the message.
- **Share image failed with a photo.** An `image` from a host without CORS taints the canvas and `toBlob` throws. The
  card loads images with `crossOrigin = 'anonymous'` and falls back to the picture; the maker explains the error.
- **Link previews show the generic title.** The invite is in the fragment, which link-preview bots never see. That is
  the privacy point, so the page's `<title>`/`<meta>` stay generic; set them per deployment if the host wants a preview.
- **Render frames from the DOM, not a canvas.** The card is canvases + CSS 3D + blend modes, so the renderer
  screenshots the page after `seek(t)` (~0.15 s a 1080p frame) instead of reading one canvas.
- **Picture time jumped when the reveal handed over to live mode.** The timeline and the live clock disagreed. Fix:
  `seek(t, idle)` draws the picture and background from `idle` (the live clock) and only the choreography from `t`.
