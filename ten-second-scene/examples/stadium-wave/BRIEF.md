# BRIEF — 「파도 응원」 (The Wave)

## The scene (one line)
A night match, floodlights on: a Mexican wave comes down the long stand towards us — about 2,600 people, each one
standing up in their own time (a lean, a push, arms up, a drop back into the seat) — and passes a steward at the
pitch edge who turns his head to watch it go by.

## Why this topic, this image
- The moment: second half, a night game in late autumn; the stand is full, breath and floodlight haze in the air.
- The beat: the wave starts far down the stand (t≈1.2) → rolls towards the camera at ~11 m/s → reaches the near
  seats at ~7 s, where people are big enough to see who is keen and who is not → passes; the far end is already
  sitting, chatting, waving phones.
- What someone who has been in a wave checks first: it is ragged — some stand early, some late, some only half rise,
  a few do not stand at all; kids pop up fast, big people come up slow; people sit down harder than they stood up;
  it looks like a ripple from far away and like individuals up close.

## Frame
- 1080×1920 · 30 fps · 10.0 s.
- Camera: at the pitch edge near the corner, 1.65 m up, looking diagonally up along the stand (fov 46°). One move: a
  slow pan of 4° and a drift of 0.8 m to follow the wave, ease in-out.
- Composition: the stand runs diagonally from lower-left (near, big) to upper-right (far, small); the roof edge with
  floodlights crosses the top; LED boards and the steward in the lower third. The eye follows the wave from far to near.

## Tool
`three` — a real 3D stand (26 rows, steps, seats, aisles, a roof edge, railings), ~2,600 people built from the same
`body.js` rig as the Canvas pieces (instanced capsules per body part, per-person colours), floodlight glare sprites.

## Timeline (seconds)
| t | what happens | what the eye does |
|---|---|---|
| 0.0 | a full stand at idle: breathing, heads turning, a few phone lights, a few claps | takes in the size |
| 1.2 | the wave starts at the far end | finds the ripple |
| 1.2–7.5 | it rolls down the stand; each person: lean forward + hands push (anticipation 0.2–0.35 s) → rise 0.3–0.45 s → arms up, overshoot → drop back 0.45 s → bounce in the seat | rides it towards us |
| 6.0–8.0 | the near rows: individuals readable; the steward turns his head, then takes two small steps to keep watching | |
| 8.0–10 | after the wave: cheers, claps, a few stay standing a beat too long | settles |

## The five criteria, for this scene
| criterion | what passing means HERE | the likely failure to watch for |
|---|---|---|
| density | every seat has a person or a visible empty seat; clothes vary (team colour, coats, hats, scarves); steps, aisle stairs, railings, the roof edge, LED boards, the far stand as dots | a grid of identical dolls, empty dark concrete, a blank background |
| light | floodlights from above the pitch: cool white key on faces turned to the pitch, the roof underside warm, haze around the lamps, phone lights | flat even lighting, no falloff into the upper rows, no glare |
| people / proportion | 7–7.5 heads; kids ~5–6; seated people fit their seats; the steward at full scale near the camera; size shrinks correctly up the stand | dolls, people bigger than their seats, floating above seats, legs through steps |
| weight of motion | each person's rise has anticipation and their sit-down a bounce; heavy people slower; timing ragged (reaction spread); idle people breathe; the steward's turn is stepped | everyone standing on one sine, perfect synchrony, frozen idles, sliding feet |
| colour | night navy, floodlight white, team teal and white in patches, warm roof light; LED boards as one saturated accent strip | rainbow crowd, pure primaries, grey sludge |

## Cast — references/BODY.md
| who | height · mass | clothes / colours | idle | stance and gaze per beat | big move |
|---|---|---|---|---|---|
| fans (~2,600) | adults 1.55–1.92 m, 50–110 kg; kids 1.15–1.4 m | 55 % team teal (shirts, scarves), the rest coats in navy / grey / black / camel / red; hats on 20 % | breath, head turns, 6 % clap, 4 % hold a phone up | seated facing the pitch, heads following play | the wave: lean + push (antic) → rise → arms up (overshoot) → drop → bounce; 7 % do not stand, 12 % half-rise |
| steward | 1.80 m · 82 kg | hi-vis vest over a navy jacket | breath, weight shift, hands behind his back | faces the crowd; head follows the wave | 6.6–7.8 a stepped turn to keep the wave in view |

## Palette
night `#0b1022` · roof underside warm `#e9b980` · floodlight `#eef3ff` · seat red `#9c2f2b` · team teal `#1f7f86` ·
white `#e9edf2` · pitch green `#2e6b3a` · hi-vis `#d6f046` · LED accent `#ff5a3c`.
Not in it: pure rainbow crowd, black void background.

## Not in this scene
A real club's colours, crest or kit; a real stadium's shape or name; readable sponsor text on the LED boards (abstract
patterns only); everyone moving on one curve.
