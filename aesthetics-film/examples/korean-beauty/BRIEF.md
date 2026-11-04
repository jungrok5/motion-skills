# BRIEF — 비움의 미학 · The Beauty of Emptiness (Korean aesthetics)

The worked example. The source film was about Chinese aesthetics; this one takes a different culture and builds every
set, object, colour and melody new from this brief. Written before any code.

## 1 · Topic → thesis
- **Topic (from the user):** "한국의 미" — Korean beauty.
- **Thesis in one line:** Korean beauty is the beauty of what is left unfilled — the unpainted paper, the eave that
  lifts instead of pressing down, the paper that lets light through, the jar that is round without being perfect.
- **Languages:** Korean lines, English line under each. Brand mark: 한국의 미 / Korean Aesthetics.
- **Length:** ~80 s, 4 chapters + the closing card.

## 2 · Facts (each line rests on one; checked)
| claim in the film | source / note |
|---|---|
| Korean ink landscapes leave large areas of paper empty for mist and water (여백) | standard description of 여백의 미 in Joseon painting, e.g. Jeong Seon's true-view landscapes |
| Hanok eaves curve inward in plan (안허리곡) and lift at the corners (앙곡), so the roof line rises at both ends | National Hanok Center glossary; any hanok architecture text (처마 곡선: 안허리곡 · 앙곡 · 후림) |
| Tti-sal doors (띠살문): close vertical bars with three bands of horizontals, covered with hanji (mulberry paper) | 문화재청 creation glossary: 띠살문 |
| Hanji diffuses daylight rather than blocking it | material property of mulberry-fibre paper; standard description of 창호지 |
| The moon jar (백자 달항아리) is thrown as two bowls and joined at the middle; the seam and a slight lopsidedness are typical | National Museum of Korea, 백자 달항아리 (Treasure 1437 / 1438) descriptions |

## 3 · Chapters, lines, what is on screen
| # | chapter (badge) | lines (ko / en) | on screen |
|---|---|---|---|
| 01 | 여백 · The empty space | 산을 다 그리지 않는다. / The mountain is never painted whole. · 비워 둔 자리에 안개가 앉는다. / Mist settles where the paper is left empty. | ink peaks on paper melting into a mist sea; a pine islet; the camera drifts in over the mist |
| 02 | 처마 · The eave line | 처마는 곧게 뻗지 않는다. / The eave never runs straight. · 양 끝을 살짝 들어 올려, / Lifted just slightly at both ends, · 무거운 지붕이 하늘로 오른다. / a heavy roof rises into the sky. | a hanok court: packed-earth yard, a hall on a stone base with natural wood columns, a tiled wall, onggi jars on a stone stand, pines; the camera rises along a roof corner — callout 안허리곡 · 앙곡 |
| 03 | 창호 · Paper windows | 한지는 빛을 막지 않고 거른다. / Hanji does not block the light — it filters it. · 방 안에는 그림자 대신 밝음이 번진다. / Inside, brightness spreads instead of shadow. | inside the hall: a row of tti-sal doors that brighten as the sun comes up; callout 띠살문 · 한지 |
| 04 | 달항아리 · The moon jar | 위와 아래를 따로 빚어 붙인 항아리. / A jar thrown in two halves, then joined. · 조금 기울어도, 둥글다. / A little lopsided — and still round. · 채우지 않아서 넉넉하다. / Ample, because it was never filled. | a white moon jar on the maru floor before the paper doors, a slow orbit — callout 이음 · 두 반쪽; it dissolves into a full moon rising over ink hills at night |
| card | 비움의 미학 · seal 美 | — | paper, a dry-brush stroke, the title, "여백 · 처마 · 창호 · 달항아리" |

## 4 · Designed for this topic (new, not from the source or the template)
- **Sets:** `ink` (paper: peaks, mist sea, pine islet), `court` (garden: hanok hall with `hip: .55` paljak roof and
  natural wood, tiled wall, jangdokdae of onggi jars, pines, distant green-grey hills), `room` (interior: maru floor,
  a row of tti-sal doors whose paper glow rises, plastered side walls, the moon jar), `moon` (night: hills, mist, a large
  moon).
- **Objects built here:** the jangdokdae (a stone stand + 7 `vessel({ shape: "jar", glaze: "onggi" })` of different
  sizes); the moon jar (`vessel({ shape: "moonjar", wobble: .025, seam: true, glaze: "white" })`); the door row
  (`lattice({ pattern: "tti" })` × 6 with a shared glow).
- **Colour:** paper and ink for 01; muted earth, wood and grey tile for 02–03 (no lacquer red — Joseon timber is left
  natural); the white of the jar against the warm paper glow; the blue night for the last line.
- **Sound:** pyeongjo pentatonic on E, a zither (gayageum-like plucks with slides) and a daegeum-like flute; a wooden
  clapper knock (`wood`) at each chapter; a bell when the moon rises.

## 5 · Stills rubric (score each sheet 0–2; ship at ≥ 12 / 14)
1. Each chapter's first frame says its idea without the subtitle (mist / eave / glowing paper / jar).
2. Ink stays ink: far things dissolve into the paper or the fog, never into black.
3. Subtitles: ≤ 20 characters a line, accent word in seal red (paper) or gold (dark), never over a busy bright area.
4. The camera is always moving, slowly; no shot holds a frozen frame.
5. Callouts point at the thing named, inside the frame, never over the subtitle.
6. Every object on screen belongs to this topic (no pavilion red, no guqin, no taihu rock from the source).
7. The card: stroke → title + seal → line, nothing overlapping.
