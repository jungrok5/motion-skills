# Brief

Three things: what the style comes from, the brief to fill in for a new topic, and the rubric the stills are scored
against. Write the brief into the project as `BRIEF.md` before any code.

## 1. The source

A post by 歸藏 (@op7418) on X, 10 Nov 2026 — https://x.com/op7418/status/2120085300185833878?a=9LfZwP5J_d739gBaN8Y&s=19 —
with a 66 s screen recording of a page titled 「墨生 · 字即世界 · 落笔成灵」 running on localhost. The post, in short:

> I asked the model for a project that shows what it can do, without telling it what to make, and it gave me this.
> Type a character and its ink form appears. The ink is a real-time fluid simulation — you feel every drag of the mouse —
> with matching sound effects and music. Where your mouse is, is where the thing you typed is made, so you can paint an
> ink picture with words. And the things and the weather are alive and affect each other.

(The quoted earlier post shows the request: an extremely ambitious project nobody has seen — style, interaction and
picture — that can be made in one shot.)

What the recording shows, in order:
- Blank rice-paper sheet. The title glyph 墨 is written in the middle and melts into two counter-rotating swirls of ink.
- The user types pinyin (key caps `S H A N space` appear near the bottom) and 山 is written at the pointer as a heavy
  black glyph, dissolves, and washed mountain ridges fade in there. Then 月 (a pale disc in a dark halo), 竹 (bamboo grows
  up from the bottom edge, stroke by stroke), 梅 (written in red; a branch with red blossoms grows in from the right).
- 鱼 and 鸟: small fish swim along the bottom, a flock of birds wheels; a vertical line of verse appears at the right
  (月出惊山鸟 — the moon startles the birds). 风 smears the wet ink sideways. 龙: a long green-and-red dragon follows the
  pointer, coiling.
- 夜: the sheet floods to near-black and every ink mark turns pale; the dragon is now white and teal, the moon glows.
  火: a flame with a warm glow. 雷. Fireflies. Another verse line.
- Chrome: a red seal top-left (墨生) with a vertical subtitle; three pills top-right (自在 self-play · 有声 sound · 留影
  keep a picture); a row of round chips at the bottom with all seventeen words (山 月 竹 梅 鱼 鸟 蝶 龙 风 雨 雪 火 水 雷 夜
  昼 空) and one hint line: type to bring words alive · drag to stir · hold Shift to pour water · 1 ink 2 vermilion 3 blue.

What this skill takes from it is the form and the grammar (the two lists at the top of `SKILL.md`), not the lexicon, the
drawings or the title. A new topic gets its own.

## 2. The brief (copy, fill in)

```markdown
# <title> — brief

**Topic:** <what the user asked for, in their words>
**The world in one sentence:** <where we are, what kind of place the sheet becomes>
**Title on the seal:** <1–2 glyphs> · **subtitle:** <one short phrase> · **language / script:** <…> · **brush font:** <…>

## The sheet
- View: <side view with a waterline at 56% | from above | a slope | …> — where things may live (ground, water, sky).
- The world's own clockwork (env / tick): <a tide the moon raises | a season | a current | none>
- Palette: paper <…>, night paper <…>; pigments 1 <black> 2 <red> 3 <blue-green>, each used for <…>

## Lexicon (12–18 words; every role covered)
| word | keys | role | becomes | moves / lives | to the fluid | pigment |
|---|---|---|---|---|---|---|
| … | romanised, english | landform · fixture · light · drifter · creature · flock · weather · time · clear | what is drawn | where, how, what it follows or flees | carried? wake, splash, wash? | 1 · 2 · 3 |

Roles needed: ≥ 1 landform or fixture · ≥ 1 thing that drifts on the fluid · ≥ 2 kinds of creature (one single body,
one flock) · ≥ 2 weathers · night and its return · the clearing word. Words must be short (1–3 glyphs), concrete nouns
or natural forces, and no word may be the start of another unless that is intended (해 / 해파리 works; the short one waits
0.7 s or for a space).

## Creatures (each goes on the cast sheet)
| creature | view | body | limits | element | what must be right |
|---|---|---|---|---|---|
| … | side · above | spine of n × len / single agent | bend per joint, turn rate, speed | under the waterline / sky / anywhere | "back up both ways, pale belly below, fins: dorsal on the back" |

## Rules (who meets whom) — at least one per word
| when | what happens | the line (≤ 14 glyphs) |
|---|---|---|

## Sound
Scale by day / by night, tempo, the pluck's character; the world's own voices (a sea bed, a call, a splash).

## Performance (40–100 s)
The order of the words and why — what meets what, where the stirs go, where night falls, how it ends (the clearing word).
```

## 3. Review rubric

Render `--cast`, `--sheet 12` and the key moments; score each row pass / fail. One fail = fix and render again.

| | pass when |
|---|---|
| **Ink** | Written glyphs dissolve into filaments and swirls, not blobs; dried stains stay where the ink stopped; brush drags leave ink that moves on. The sheet looks like paper (tooth, uneven tone), not a flat fill. |
| **Legible sheet** | After the whole performance the paper is still mostly paper: things are readable against it, no grey fog over everything, no pigment drowning another. |
| **Each thing reads** | Covering its word, a stranger could name each thing at 1280 px. Size, silhouette and the one identifying detail (a beak, flukes, a sail) are there. |
| **One hand** | Every thing is strokes, washes, leaves and dots in the three pigments. Nothing looks pasted, outlined or computer-smooth; discs are round, strokes taper. |
| **Bodies** | Cast sheet: head at the arrow in all eight poses, back up facing left and right, fins and limbs on their own sides, no joint past its limit. In scenes no stills raise "is that upside down?" or "which way is it going?". |
| **Alive together** | In the sheet you can see things reacting: flock around the boat, school parting, tide over the island's foot. At least half the rules happen in the performance and their lines are readable. |
| **Night** | A night still is composed on its own: lights glow where they should, pale ink reads, nothing is lost in black or blown out. |
| **Chrome** | Seal, buttons, chips, key caps and the verse line sit clear of the things; on a 390 px phone nothing overflows and the chips take less than a third of the height. |
| **Topic** | Shown only stills, someone could say what the topic is — and it is not the example's. |
