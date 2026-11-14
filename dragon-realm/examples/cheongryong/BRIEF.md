# BRIEF — 청룡 · 여의주 (The Blue Dragon and the Pearl)

**The legend in one line:** an imugi — a great dark serpent that has waited a thousand years in a mountain lake — takes
the yeouiju when it falls through a storm, and rises as the Blue Dragon over the valley at sunrise.

The request: the reference film (赤龍 · Crimson Loong) is Chinese in every frame — karst spires, vermilion halls, a red
and a white loong in a duel. Make the same kind of film so that it is Korean. So this is not a recolour: the story is
the Korean dragon story (not a fight but a becoming: 이무기 → 용, by the 여의주; Korean dragons bring rain, not fire), the
picture is the 일월오봉도 (the screen behind the Joseon throne: sun, moon, five peaks, two waterfalls, water in front,
pines at both sides), and everything in it is looked up, not assumed.

## Culture sheet
| | what, specifically | how it differs from its neighbours |
|---|---|---|
| rock | pale granite massifs with vertical joints and exfoliated crowns, each a main peak ringed by lower spires (금강산 만물상, 북한산) | not karst towers: domed crowns, grey-white stone, pines in the joints |
| trees | 소나무 red pine (leaning S-trunks, red plated bark, flat cloud-pads of needles), 단풍 maple in crimson–gold, 신갈나무 oak, 억새 silver plume grass, reeds | the umbrella pine silhouette is the Korean ink-painting tree |
| buildings | a two-storey lake pavilion 누각 (팔작지붕 hip-and-gable, 겹처마 double eaves, 공포 brackets, 계자난간 railing, lattice doors with hanji), a hexagonal 육모정, a three-storey Silla stone pagoda, 석등 stone lanterns | eaves rise gently (앙곡) and bow outward (안허리곡) — never the sharp flying corners of the south-Chinese roof; unglazed grey 기와 |
| ornament | 단청: green-led (뇌록) beams and brackets, red-brown (석간주) columns, 머리초 bands at beam ends in five colours, rosettes on rafter ends | green and red-brown dominate, not vermilion and gold |
| small things | 청사초롱 red-and-blue silk lanterns, 풍경 wind chimes with fish clappers at the eave corners, 솟대 bird poles | |
| instruments | 대금 (theme), 해금 and 아쟁 (storm), 가야금 (ostinato), 장구 · 북 · 징 · 꽹과리, a wind-chime bell; a low choir and strings under them | |
| mode and rhythm | E♭ 계면조 (E♭ G♭ A♭ B♭ D♭) in the dark half, the same tune in 평조 (E♭ F A♭ B♭ C) from DAWN; 자진모리 in 12/8, 휘모리 in the storm | |

## Beat sheet  (80 bpm in 12/8; a bar = 3 s) — `src/00_beats.js`
| time | beat | what happens | look |
|---|---|---|---|
| 0 | OPEN | the five peaks at blue hour, the moon, mist on the lake, the pavilion's windows | blue |
| 12 | STIR | something long moves under the lake | blue |
| 21 | EYE | the imugi's head breaks the surface; its eye opens | blue |
| 27 · 30 | OMEN · THUNDER1 | the sky closes, wind; far thunder | → omen |
| 33 | PEARL | the clouds tear; the yeouiju comes down in a shaft of light | → storm |
| 39 | BURST | the imugi erupts from the lake (the biggest hit; a breath before it) | storm |
| 43.5 · 46.5 · 49.5 | BOLT1–3 | the climb past the crags and through the clouds; lightning | storm |
| 51 | SEIZE | it takes the pearl: silence, then white-gold | storm → gilt |
| 51–57 · 54 | (becoming) · ROAR | blue and gold run down the body, antlers and mane grow; the first roar | gilt |
| 57 | DAWN | the clouds open, the sun rises, the theme in full | → dawn |
| 63 · 66 · 69 | PASS · SKIM · RAINBOW | past the pavilion eaves; over the lake in spray; up through the last rain | dawn → bow |
| 72 · 78 · 81 | TABLEAU · GONG · OUT | sun and moon over the five peaks, the dragon's ring before them; one gong; into mist | tableau |

## Looks — `src/90_film.js`
blue (moon key from behind-left, amber windows) → omen → storm (no key but the tear; rain, wind 2.5) → gilt (the storm
lit warm from the pearl) → turn → dawn (sun low behind the peaks: shafts, backlit spray) → bow (rainbow opposite the sun)
→ tableau (a clear morning: a film light from the front-right, the red sun and the white moon above the peaks as on the screen).

## Land — `src/10_world.js`
The lens stands on the south bank looking north (−z). A lake 170 × 125 m; a spit of land on its west side for the
pavilion; a flat-topped rock on the east for the kiosk; three crags on the far shore with two falls between them; behind
them the five peaks (285, 222, 205, 165, 150 m), each with 4–6 lower spires; valley walls left and right; a far range.

## Creature — `src/40_dragon.js`
112 m long, 2.35 m radius. Imugi: near-black olive scales with an oily sheen, no antlers, no mane, no legs, amber eyes
that open at EYE. Blue Dragon: cobalt back, azure sides, gold rims, cream belly plates, branching antlers, a gold mane
and dorsal fins, four clawed legs, long whiskers; the yeouiju rides under its chin. Wet until it dries after dawn.
The route: under the lake (ripples, the eye) → straight up at BURST → a spiral past the far-shore crags into the clouds
→ the pearl at (8, 258, −164) → a slow S above the clouds while it changes → down the west wall, past the pavilion's
eaves at 14 m, a skim over the lake at the lens → up through the rain → a ring in front of the peaks, then up between
sun and moon.

## Stage — `src/60_stage.js`
The pavilion on the spit facing the water, two stone lanterns before it, the pagoda and a third lantern on the bank
behind, the kiosk on its rock, three bird poles on the near bank. Pines by hand at both sides of the home view, then
pines, maples and oaks scattered by slope and distance from the shore; pines on the ledges and out of the faces of every
massif; plume grass and turf on the banks, reeds in the shallows. Clear: the lane from the home lens to the lake, the
pavilion shot's view of the water, 10 m round every low stretch of the route.

## Shots (17) — `src/90_film.js`
open (crane down to the home view) · stir (from the kiosk rock, following the shape under the water) · pavilion ·
eye (water level, 10 m, then a tilt up to the closing sky) · omen · pearl (tilt from the pearl down to the lake) ·
burst · climb · chase (riding beside the neck) · seize (ahead of the pearl, looking back) · becoming (beside the body,
keeping pace with the front) · roar (three-quarter front, low) · dawn · pass (lens still at the water's edge as it
comes head-on past the eaves) · skim (lens on the shore, the dragon grows to fill it and goes over) · rainbow (from
over the lake looking south) · tableau (the home view, rising).

## Score — `src/80_score.js`
The theme: eight bars of 6/8 for the 대금 (written out at the top of the file). Hinted slow and low in the opening,
taken by the 해금 in minor through the storm over 휘모리, cut off before SEIZE, sung in full at DAWN in 평조 over
자진모리, lifted with bells at RAINBOW, its last two bars at half speed in TABLEAU; one 징 at GONG. Beds: the far
waterfall, the air before dawn, wind, rain 30 → 62 s. Cues: thunder on the three bolts (the music ducks), the water
explosion and a growl at BURST, the roar at 54, a whoosh and chimes at PASS, spray at SKIM.
