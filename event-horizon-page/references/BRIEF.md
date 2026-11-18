# BRIEF — from a topic to an event-horizon page

Write the brief before any code, as `BRIEF.md` in the project (`templates/BRIEF.md` is the form). A brief is short: a page
of decisions, each one with its reason. The page must be a page someone would really publish for this topic, and the object
must feel like it belongs there.

## 1. The page
- **What page is this, for whom?** A lecture handout, a band's tour page, a newsletter issue, a CV, a product launch, a
  menu, a wedding invitation, an observatory's open night. One screen; no scrolling.
- **Content, in real sentences.** A headline (editable, `data-hic-edit`) of 2–5 words that can be bent — short words read
  better around a hole than one long one. A lede of 25–45 words that says what the page is and invites the reader to drag
  and feed (in the topic's voice, not "this is a demo"). Then the topic's own body: a list of dates, a problem set, a
  menu, a timeline — 4–6 rows, each a real item with real controls (`Tickets`, a checkbox, `Add`).
- **The feed field.** What do you feed it, in this topic? A question (lecture), a song request (tour), a word you want to
  forget (newsletter), a rejected tagline (launch), a wish (invitation). Name the field and the button in those words.
- **Type and palette.** System font stacks only. A paper colour (the page background is read as the paper colour; it
  drives the ink mask of eaten pieces), an ink, a body, a muted and one or two accents. Light pages make the shadow and the
  bloom read as warmth; dark pages make the disk and beams glow. Pick by topic, not by habit.
- **The checklist or the page's own buttons.** A checklist of 4–5 things to try ticks itself from engine events (`drag`,
  `type`, `select`, `feed`, `eat`); a page that already has controls (tickets, RSVP) may use those instead.

## 2. The object
- **Kind.** `blackhole` (shadow + disk + photon ring: endings, mystery, physics, "it eats everything"), `neutron` (a
  bright star with polar caps and sweeping beams, optional ring: rhythm, music, lighthouses, signals), `wormhole` (a
  throat that shows the page's far side, mirrored, in its own colours: travel, time, "the other side", B-sides). A new
  kind follows references/ENGINE.md.
- **Size and mass.** `size: [min, max]` CSS px per M at mass 0 and 1 (Einstein radius ≈ 14 × that). Default mass 0.4–0.5
  so the rest place does not swallow the headline at 1280 × 800.
- **Its light.** `ramp`: five colours from the coolest, faintest light to the hottest (the last near white). A disk's
  `inner` / `outer` (M, from 6 up), `tilt` (75–84° looks like a disk seen nearly edge on), `roll` (−20…20°), `spin` (±1:
  which side is brighter), `beaming` (2–3.5), `gain`. A pulsar's star colours, beam colour, period (s), length and width.
  A wormhole's throat background and ink. `glow` (bloom) and `warm` (how much the bloom tints the paper).
- **Rest and opening.** `rest`: an element (it rests after the end of that element's first line) or `[fx, fy]`. `intro`:
  one short word in the headline that the opening takes and gives back.

## 3. What feeding does
`feed.onFeed(text, el, state)` is where the topic changes something: a counter ("3 questions in orbit"), the object
(spin a pulsar up, grow the disk), the page's text. `feed.leave: true` keeps the fed word listed while a copy falls in
(requests heard); otherwise the word itself is eaten and comes back on Restore.

## 4. Sound
`root` (Hz) and `scale` (semitones) for the gulps and the bed, `timbre` (`sine`, `triangle`), `bed` level, `pulse: true` for a
tick each time a pulsar beam faces you. Off until the Sound toggle.

## Still review (each still must pass every line)
1. **Readable at rest**: at `#still=1`, 1280 × 800, every line of the page reads; the object sits beside the headline,
   clear of the lede, the controls and the dock; nothing is cut at the edges.
2. **The lens reads as gravity**: lines bend round the object into arcs, there is a ring of paper and a small mirrored image
   inside it, and the page further than three Einstein radii is untouched. No seams, no smeared bands, no hard circle edge.
3. **The object is lit**: the disk (or star and beams, or throat) is bright and has structure (streaks, a brighter side, the
   lensed far side over the top), and its bloom falls softly on the paper. On a light page it is not a grey smudge; on a dark
   page it does not blow out the text.
4. **Pieces are strands**: mid-feed or mid-Hungry, eaten words pull into thin, hot strands that curl in, not a blob or
   confetti; the place they came from is blank paper (or, with `leave`, the word still listed).
5. **Topic fit**: someone who sees only the still can say what page this is and why this object is on it.
6. **Phone** (`--size 390x844`): one column, nothing sideways, the object smaller and still beside the headline, the dock
   on one line.
Fix and re-render until every still passes; note what broke in `references/LESSONS.md` of the skill if it was the engine.
