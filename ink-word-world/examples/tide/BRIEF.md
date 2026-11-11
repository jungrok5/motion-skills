# 물때 — brief

**Topic:** "바다. 한글로." — a sea world for the ink-word-world form, in Hangul; nothing from the source piece's
mountain-bamboo-dragon lexicon.
**The world in one sentence:** a west-coast sea at the turn of the tide (물때): an island, a hemp-sailed boat and what
lives above and below one waterline, seen from the side.
**Title on the seal:** 물때 · **subtitle:** 글자 하나가 바다 하나 · **language / script:** Korean, Hangul ·
**brush font:** YeonSung (bundled)

## The sheet
- View: side view. One waterline at 56% of the height; sky above, sea below. Nothing is drawn for the water itself until
  파도 is written — a boat on blank paper is already afloat.
- Clockwork (`env` / `tick`): `tide` (0 → 46 units while 달 is on the sheet; the waterline rises and covers the island's
  foot), `swell` (waves: from 파도's level 1–3, the wind, and 9 s of storm after 번개), `fog`.
- Palette: hanji `[.918, .905, .86]`, night `[.022, .038, .06]`; pigments 1 먹 `#16130f` (land, bodies, weather),
  2 주 `#b8301f` (the sun, beaks, the lighthouse band, the pennant), 3 쪽 indigo `#27566e` (water, jellyfish); the sail
  alone is ochre (황포돛배).

## Lexicon (17)
| word | keys | role | becomes | moves / lives | to the fluid | pigment |
|---|---|---|---|---|---|---|
| 섬 | seom, island | landform | two-humped ridge with pines, a far ridge, its reflection | fixed; foot covered by the tide; surf when the swell is up | a faint permanent shadow | 1 |
| 등대 | deungdae, lighthouse | fixture · light | white tower, red band; a beam that swings round | on the island if one is near, else on a rock | — | 1 |
| 해 | hae, sun | light | red disc, red road on the water | fixed in the sky | red stain around it | 2 |
| 달 | dal, moon | light | paper-white disc in a grey halo, a light road on the water | fixed in the sky; raises the tide | — | 1 |
| 파도 | pado, wave | water | four dry-brush wave lines and a thin indigo body of water | along the waterline; written again = higher (to 3) | pushes the surface sideways | 3 |
| 고래 | gorae, whale | creature (single) | a 320-unit whale: flukes, long pectoral fin, pale throat, small dorsal fin | cruises below, follows the brush, rises to blow every 11–16 s, dives | tail beat sheds a wake; the blow throws ink up | 1 |
| 멸치 | myeolchi, anchovy | flock | thirty slim fish, dark backs | a school below the waterline; flees the whale and the brush stroke; gathers under a lantern at night | carried strongly by the flow | 1 |
| 갈매기 | galmaegi, gull | flock | seven gulls: pale body, grey wings with black tips, red beak | wheel in the sky; follow the boat; dive at the school; roost on the island at night; fly low in rain | a splash and a ring where one dives | 1 |
| 해파리 | haepari, jelly | drifter | five bells with trailing tentacles | pulse bell-first; mostly carried by the fluid; glow at night; rise under the moon | fully carried | 3 |
| 배 | bae, boat | drifter · light | a hemp-sailed boat with a bow lantern | on the waterline, bobbing with the swell; sails downwind; turns at the edges | a wake | 1 |
| 바람 | baram, wind | weather | dry wisps; 13 s blowing away from the side it was written on | sky band | drags wet ink across the sheet | 1 |
| 비 | bi, rain | weather | slanted strokes; rings on the sea; 15 s | falls to the waterline | washes dried ink where it lands | 1 |
| 안개 | angae, fog | weather | pale banks along the waterline | drifts; lifted by sun or wind | — (light layer) | 1 |
| 번개 | beongae, lightning | weather | one forked bolt, a flash, thunder 0.4 s later | strikes the sea near the word | a radial shock and a splash of ink | 1 |
| 밤 | bam, night | time | the sheet turns over from the word | — | — | 1 |
| 낮 | nat, day | time | and back | — | — | 1 |
| 비움 | bium, clear | clear | a band of water crosses the sheet; everything leaves | — | washes all | 1 |

해 is the start of 해파리 and 비 of 비움: the short ones wait 0.7 s or for a space.

## Creatures (cast sheet)
| creature | view | body | limits | element | what must be right |
|---|---|---|---|---|---|
| 고래 | side | spine 7 × 46 | 0.30 rad per joint, turn 0.85 rad/s, 74–150 u/s | below the waterline (+34; the surface only while rising to blow) | back up both ways; dorsal fin on the back, pectoral fin and pale throat on the belly; rolls over rather than flips |
| 멸치 | side | single agent, 27 long | turn 3.6 rad/s, 104 u/s | below the waterline, above the chips | dark back on top, forked tail behind |
| 갈매기 | side | single agent, 36 long | turn 2.3 rad/s, 122 u/s | the sky; the surface only in a dive | beak forward, wings above the body beating down; perched: legs under, wing folded |
| 해파리 | side | bell + 5 tendrils | turn 0.7 rad/s | below the waterline | bell toward travel, tentacles trailing |
| 배 | side | — | turns by narrowing, never backs | on the waterline | bow lantern leads; sail and pennant go where the wind goes |

## Rules
| when | what happens | the line |
|---|---|---|
| 달 | the tide comes in | 달이 차니 물이 든다 |
| 해 + 밤 | day returns from the sun | 해가 뜨니 밤이 물러난다 |
| 해 + 안개 | the fog lifts | 해가 나니 안개가 걷힌다 |
| 바람 + 안개 | the fog is blown off the sheet | 바람이 안개를 민다 |
| 바람 + 배 | the sail fills, the boat runs downwind | 바람을 받아 돛이 부푼다 |
| 바람 + 파도 | the swell rises | 바람 따라 물결이 선다 |
| 섬 + 파도 (swell up) | surf at the island's foot | 섬 발치에 물결이 부서진다 |
| 갈매기 + 멸치 | gulls dive at the school; it scatters | 갈매기가 멸치 떼로 내리꽂힌다 |
| 갈매기 + 배 | the flock follows the boat | 갈매기가 배를 따른다 |
| 고래 + 멸치 | the whale runs through the school | 고래가 지나면 떼가 갈라진다 |
| 고래 (first blow) | — | 고래가 숨을 뿜는다 |
| 달 + 해파리 | the jellyfish rise | 달빛 따라 해파리가 뜬다 |
| 밤 + 등대 | the beam is bright | 등대가 밤바다를 쓴다 |
| 안개 + 등대 | the beam shows in the fog | 안개 속에 등대만 보인다 |
| 밤 + 배 + 멸치 | the school gathers under the lantern | 불 밝힌 배 아래 멸치가 모인다 |
| 밤 + 갈매기 + 섬 | the gulls roost | 밤이면 갈매기는 섬에 든다 |
| 비 + 갈매기 | they fly low | 비가 오면 갈매기는 낮게 난다 |
| 번개 | everything startles, the whale dives, 9 s of storm swell | 번개에 온 바다가 놀란다 |
| 낮 | — | 물빛이 돌아온다 |

## Sound
D pentatonic 평조-like by day `[0, 2, 5, 7, 9]`, 계면조-like at night `[0, 3, 5, 7, 10]`, 54 bpm, a bright pluck. World
voices: `sea` (a low bed while 파도 is there), `whale` (two slow glides), `gull` (three falling cries), `spout`, `splash`.

## Performance (96 s)
섬 → 파도 → 배 → 갈매기 (they find the boat) → 멸치 (the first dives) → a stir through the school → 고래 (through the
school; its first blow) → 안개 → 등대 (only the beam shows) → 바람 from the left (fog off, sail full, swell up) → 밤
(lantern, roost, the beam) → 달 (tide in) → 해파리 → an indigo stroke among them → 비 → 번개 → 해 (dawn) → 비움.

## Scored (final stills)
Ink pass · legible pass (after lowering glyph ink and raising fade) · each thing reads pass (gull wings and whale head
redrawn after the cast sheet) · one hand pass · bodies pass (0 violations) · alive together pass (17 of 19 rules in the
performance) · night pass (after desaturating night ink) · chrome pass · topic pass.
