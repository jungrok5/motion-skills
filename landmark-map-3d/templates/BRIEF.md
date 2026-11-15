# BRIEF — <place>

Write this before any code (references/BRIEF.md says how). Keep it short; every line is a decision.

## The place
- **Name / where:** <name in the film's language> · <local name> · <city, country> · <lat, lon>
- **What it is, in one line:** <why people know it>
- **The one thing the film must show:** <the signature view or moment — e.g. the tower sparkling at 21:00, the crossing filling on green>
- **Data:** `fetch-place.mjs --q "…" --size …` · what OSM holds here (place-map.mjs): <heights mapped? trees? water? the landmark's own ways (ids to clear)>

## The story (12–24 s, 1080×1920)
One line: <e.g. "an afternoon over the park turns to night; the tower lights up and sparkles">
| t | camera (target, yaw, pitch, dist) | light | what we see / read |
|---|---|---|---|
| 0 | | day | title |
| … | | | |
| end | | | end card |

## The landmark (built by hand — references/LANDMARKS.md)
- **Real dimensions:** <footprint, heights of each stage, top> (source: <where you read them>)
- **Parts, bottom to top:** <…>
- **Signature details (2–4):** <the things that make it recognisable at 300 px tall>
- **Material / colour:** <…> · **at night:** <how it is lit — floodlit, outline bulbs, screens, beacon, nothing>
- **Orientation:** <from the OSM footprint: rot = …°>

## The city around it
- **Palette:** walls <…> · roofs <…> · ground <…> · water <…> · trees <…> — <why: the city's real materials, made cute>
- **Roofs / heights:** <roofs weights, default storeys>
- **Life:** cars <density> · people <n, crowds where> · boats <n> · <driving side>

## Light and weather
<time-of-day keys and why · rain? · clock chip times>

## Words (the film's language: <ko/en/ja/local>)
- Title: kicker <…> · name <…> · sub <…> · coords <…>
- Pins (6–12, with times): <…>
- Area / water names: <…>
- Street names painted on the ground (2–4): <…>
- End card: <…>
- Credit: "© OpenStreetMap contributors" (automatic)

## Sound
<bpm, key, drums on/off, any cue (sparkle, chime) and when>

## Still review (score each 0–2; ship at ≥ 14/16, nothing at 0)
1. The landmark is recognisable in one glance at phone size, from every camera angle used.
2. It is in proportion with the city (real heights) and sits on its real spot and axis.
3. The city reads as *this* city (palette, roofs, street pattern from the data) and as cute (soft, saturated, toy-like).
4. Every frame has depth: tilt-shift band on the subject, haze at the far edge, nothing cut off by the map's end.
5. Pins: few, legible, never overlapping, never on the title or the bottom 8 %, each names something real.
6. Light changes are motivated and smooth; night has warm lights against purple, not black.
7. The camera moves like a hand on a map: always moving, never faster than the eye can follow, no jumps.
8. Life: something moves in every shot (cars, people, boats, light).
