# BRIEF — from a topic to a theme of its own

Every invitation starts here, before any code. Copy the template into the project as `BRIEF.md` and fill it from the
user's words. The built-in themes are **examples of the style**, not a menu: use one as is only when it already fits the
topic exactly (a Christmas party → `christmas`); otherwise design a theme for the topic (a graduation dinner, a cat's
first birthday, a housewarming, a book club, a wedding after-party …). `examples/graduation/BRIEF.md` is a filled one.

## What stays the same for every topic (the style)
- the ticket: stamp window + vertical title + perforated stub (date · time · place · entry · QR · to · from), notches,
  pastel iridescent paper, moving foil / shine / glitter / glare, a postcard back with a stamp and a postmark;
- the reveal: envelope → seal → flap → the pass rises and flies → sway → flip → back → flip;
- the picture's language: flat shapes, one dark outline, a face that blinks, a 2–4 s loop, a full background;
- the guest page: RSVP, calendar, music on the tap, ko / en / ja.

## What is designed per topic
```markdown
# BRIEF — <topic>

**Topic (as the user said it):** "…"
Built-in theme that fits as is: <id> | none → designing "<new-id>"

## Occasion
- Event · guests · tone (3 words):
- Language(s) of the guests · where replies go (chat / email / form URL):

## The picture (stamp window, 480 × 380)
- **Subject:** one thing that says the topic at 150 px, turned into a character (what it is, what it wears/holds,
  where its face goes — on a light surface so dark eyes read)
- **Its loop (2–4 s):** the one motion that is the topic's moment (a toss, a clink, a pour, a bloom, a jump …)
- **Constant:** small things that never stop (confetti, steam, stars, petals, bubbles …)
- **Background:** rays / sky / pattern + a ground, and why it suits the topic

## Palette
5 picture colours (`pal.a`), outline (`pal.line`), picture background (`pal.sky` ×2), paper, ink, accent (envelope and
buttons — must hold white text), stage background (`pal.bg` ×2), glow.

## Stage background
a built-in one (night · rays · warm · dusk · confetti) and why — or a new one (what it shows, what moves).

## Music
a built-in track (bells · koto · cafe · party) and why — or a new one: tempo, key / scale, instruments, the feel, a
melody sketch. Original — never an existing song or anthem.

## Words
title (1–3 short lines, capitals) · subtitle (≤ ~18 chars) · message (≤ 4 lines) · date · time–end · place (+ address)
· entry · to · from · No. — in each language the guests read.

## Must / must not
- must read as <topic> at phone size because …
- must not use logos, crests, real people, named characters or text inside the picture.
```

## Review rubric (score stills at 1.3, 3.3, 6.5, 10 s — fix anything below "yes")
| | question |
|---|---|
| topic | Covering the words, does the picture alone say the topic? Would it be wrong for another built-in theme? |
| read | At 150 px wide (a phone), are the subject, its face and its motion clear? Subject ≥ 40 % of the window height? |
| motion | Does the loop show the brief's moment within 4 s? Is something always moving? |
| style | One outline colour and weight, flat fills, a blinking face, a full background — same family as the built-ins? |
| colour | Accent holds white text; the picture is not lost against the paper; the stage background is not the same hue as the card? |
| words | Every word on front and back read in the stills; nothing cut with "…"; `check.mjs` has no warnings? |
| reveal | Envelope stamp (t = 1.3 frame of the picture) still reads; the back's stamp reads? |
| sound | The track fits the tone in the brief; nothing clips (`check.mjs` peak ≤ 1)? |
