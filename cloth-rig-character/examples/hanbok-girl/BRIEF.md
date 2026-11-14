# New Year hanbok girl (설빔 소녀) — brief

## One line
A girl in a New Year hanbok — rainbow-sleeved jeogori, a full deep-pink chima, a long braid with a red daenggi —
blinks, twirls so the chima blooms open, turns and walks off.

## Topic → design
- Topic / occasion: "이 방식으로 설날 한복 입은 아이" — a topic not in the source (proof that the skill designs a new hero)
- Silhouette in one shape: a tall bell — the chima is tied high at the chest and falls to the ankles; the twirl opens it
- Proportions: height 1.12 m, heads 4.0, build 0.95
- Palette: jeogori #f7e7a6, saekdong sleeve stripes (red, gold, cream, green, blue, violet, pink), goreum + daenggi
  #c8203a, chima #d6365a with a gold band #e9b949 at the hem, norigae bead #3fae8f, kkotsin #e65a7a
- Face: dark eyes, pink blush; hair pulled back flat (bob length 0) into one braid

## Parts, in layering order
1. hair_bob — #1d1613, length 0, bangs .12 (pulled-back cap)
2. hair_tail — braid from the nape, .36 long, red daenggi ribbon at the end (its own chain under the braid's last bone)
3. top — jeogori to the chest, `wide` sleeves with the saekdong stripe print, red cuffs, white collar (dongjeong)
4. skirt — chima from the chest, length .12, flare 2.9, 12 folds, gold hem band print
5. bow — the goreum, tied at the front of the chest, long tails (.36), narrow spread
6. norigae — **custom part in parts.py**: cord, knot, jade bead and tassel on one chain, hung outside the chima
7. boots — height 0 with `upturn` (kkotsin toes)

## Cloth that moves
| part | chains × segments | stiff | why |
|---|---|---|---|
| chima | 12 × 4 | .06 | the twirl: rows flare outward (fold ≤ 8°, twist ≤ 16° so rows never cross) |
| goreum loops / tails | 2 / 2 × 4 | .1 / .05 | lag on the turn, swing on the walk |
| braid | 1 × 5 | .12 | flies out on the twirl |
| daenggi | 1 × 3 | .1 | a second, lighter lag at the end of the braid |
| norigae | 1 × 4 | .06 | swings on the walk |

## Clips
1. idle 2.0 s — blink at 0.9 s
2. spin 1.7 s, labelled "twirl" — 360°, arms lift a little
3. turn 1.2 s — to 62°
4. walk 2.8 s — stride .40, cycle .80 s (small steps under a long skirt)

## Review scene
Default backdrop and floor; back view from the turnaround in the corner (the braid and daenggi are the check).

## Review log
- f85 the chima wrapped round the legs at the end of the twirl (rows lagged sideways until they crossed) → skirt rows
  limited to 16° sideways twist and 8° inward fold, free to flare out → the chima blooms and settles
- f1 norigae pushed out by the chima (8.5 cm "sag" in check) → its points placed outside `ctx.outer_r()` → 1.7 cm
- f1 chima sagged under gravity before anything moved → gravity compensation in spring.py (rest = designed shape)
- flare 3.2 pushed the arms out to 40° → flare 2.9
