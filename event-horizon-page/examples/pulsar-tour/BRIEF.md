# BRIEF — a band's tour page with a pulsar

## Page
- What page, for whom: the tour page of Halcyon Static (a fictional synth band) for "Pulsar Season", six nights in March
  2027. Fans come to see dates, hold tickets, and join the list.
- Headline (editable): "Pulsar Season" — two short words that bend well; the opening takes "Season".
- Lede: "Six nights, one star turning at the centre of the room. Every line of this page is live text: drag the star across
  it, or send it a request and hear it spin up." (the band's voice; tells you what to do without saying "demo")
- Body: six dates (date + weekday, city + fictional venue, a Tickets / Waitlist button that toggles "Held ✓"), a "0 held"
  counter, a "Join the list" button in the top bar.
- Feed field: "Request a song" / "Send it". Requests stay listed under "Heard:".
- Checklist: none — the page's own controls (tickets, list) are the things to try.
- Palette: night-navy paper #0b0e1c, ink #eef1ff, body #b6bcda, muted #7c83a8, cyan #5ef0ff (beams, buttons), pink #ff5fd2
  (kicker, requests). Dark because it is a concert at night and the beams must glow. Condensed heavy uppercase display
  (system condensed stacks), system sans body.

## Object
- Kind: `neutron` — a pulsar is a lighthouse with a beat: it suits a band and a tour of nights.
- Size [3.2, 10.5], mass .4 — beside the title without covering the dates at 1280 × 800.
- Ramp: #2a0a3f → #9b1fd6 → #ff5fd2 → #a8f6ff → #ffffff (violet ring heating to ice).
- Disk: a faint accretion ring, inner 8, outer 19, tilt 76°, roll 10°, spin −1, gain .6, beaming 2.5.
- Star: radius 5 M, colour #8fa6ff, hot #ffffff, caps 1.2. Beams: cyan #5ef0ff, spin tilt 22°, magnetic angle 58°,
  period 2.2 s, length 34 M, width .08, gain 1.1. Glow 1.3, warm .35 (little tint on a dark page).
- Rest: after "PULSAR" (the title's first line); opening word "Season".

## Feeding
- Each request is listed (`leave: true`) and a copy of it falls in; the star spins 22 % faster per request, down to a
  0.7 s turn. Restore lets it relax to 2.2 s.
- Hungry eats the lede, the form and the dates (atoms: the ticket buttons, the field); the "Heard:" label and the list button
  are kept.

## Sound
- Root 98 Hz (G2), minor pentatonic [0, 3, 5, 7, 10], triangle bed .55, `pulse: true` — a tick each time a beam faces you,
  so a spun-up star ticks faster.

## Stills reviewed
- rest #still=1.3 (beams across the title, dates bent at their left edge) · the star over the dates · a request mid-fall ·
  Hungry eating dates · phone 390 × 844 (one column, three dates, star beside "PULSAR").
