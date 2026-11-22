# 시계탑 심부름 (The Clock-Tower Errand) — BRIEF

ONE LINE: A clockmaker's apprentice runs the master's brass key through the market street to the clock tower, and
waves a passing balloon by from the belfry.

## World
- where / when: a 19th-century market town, a spring afternoon — façades, a clock tower and chimney roofs are what
  engraving was made for.
- sets:
  - `street`: a market street — town-houses down both sides at collage angles (kit `facade`, 8 cards, mixed roofs and
    windows), shop awnings, gas lamps (`lamp` ×5), passers-by (`figure` ×5), the clock tower at the end of the street,
    a far skyline, the sky ring, drifting clouds. New subject: the clockmaker's pocket-watch sign (`watchSign`, a round
    case shaded from the upper left, white dial, ticks, hands). Two blocks `rise` out of the paving as the camera nears.
    Floor: light flagstones. Haze 18–90 m.
  - `square`: the square under the clock tower (`tower`, 34 m) with houses turned in toward it, a plane tree, a lamp,
    two passers-by, the skyline, the sky ring, clouds.
  - `roofs`: the belfry ledge — a paved ledge with a stone parapet (new subject: `parapet`, balusters shaded round,
    white coping), the town's roofs below (façades sunk 15 m so only roofs and chimneys show), the skyline, a balloon
    drifting by, clouds.

## Cast (the only colour)
- Oto: 11, quick and light; 1.38 m; 5.2 heads; mass light.
  - silhouette: a flat cap with a forward brim, a jacket to the hip, a scarf tail flying behind.
  - colours: teal jacket, mustard scarf, brown knee trousers, grey-blue cap (not the source's red / orange).
  - idle: small breath in the chest, weight shifting foot to foot; the scarf tail trails with speed and a little breeze.
  - props: the brass key (held in the near hand, `hold: 'key'`).
- cast sheet reviewed: walk contact / passing / push-off read; wave moved to the far arm (the near one covered the face).

## Beats and shots
| # | set | dur | camera | acts |
|---|---|---|---|---|
| 1 | street | 6.2 | low truck down the street, drifting right | Oto runs across the street toward the tower holding the key (side view, smiling) |
| 2 | square | 5.4 | crane from his height up the tower to the clock | walks in (3/4), stops, looks up (lookUp: wind-up nod down, then up), surprised |
| 3 | roofs | 5.6 | orbit round him over the roofs | walks to the parapet, stepped turn to the front, waves (far arm) at the balloon |

- walks / runs go across the camera; facing follows the screen direction.
- motion reference: none generated — the built-in key tables (walk / run foot path, lookUp, turnStep, wave).

## Sound
- D, 96 bpm, busy (4/4): plucks, celesta, a pad; paper flips on cuts, card flaps on the rises, running taps.

## Review log
- stills: cobbles became moiré → flagstones; the sky was empty → engraved sky ring; the ledge floated → parapet.
- check: run drift 44 px (the run went toward the camera) → re-blocked across the street; idle and jump settle fixed.
- after review ("the character teleports"): the shot-2 walk (4.1 m) ran past the look-up and the shot-3 walk past the turn →
  shot 2 starts 1.9 m from its mark, the shot-3 turn and wave moved later; check.mjs now fails teleports and overlaps.
