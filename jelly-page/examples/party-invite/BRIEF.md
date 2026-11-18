# BRIEF — a kids' party invitation, set in a party jelly

## Topic and job
- What the page is for: Mia's sixth birthday party invitation, sent as a link to the class.
- What a reader does on it: types their name, says yes or no, presses Send RSVP (the button answers: "See you, Sam!").
  A yes makes the jelly jump (a drop).

## The page (reading order, 5 rows)
- Kicker + party colours: "YOU'RE INVITED", four flavour dots on the right.
- Big editable line: "Mia is 6!" (≤ 14 letters, shrinks to fit), so a parent can reuse it for another child.
- Plain line: "Saturday 14 June · 2 to 5 pm · 12 Plum Lane" (selectable).
- RSVP row: name field (`#guest`), yes / no pills, `Send RSVP` (`data-hic-click`).
- Jelly row: firm … melted range ("how warm the party is"), `Plop!` (the drop button, `#drop`).

## Ink
- Dark ink `#2b1f2a` (a plum black) · candy `#fff8ee` (icing white) · paper `#fff3f6` (pink paper when melted).

## Flavours (party colours)
| name | jelly | glow | bits | cloth |
|---|---|---|---|---|
| raspberry | #ff2a62 | #ff5a8a | (sprinkles) | #ffd23f yellow dots |
| blue (blue raspberry) | #1f6dff | #4fa0ff | (sprinkles) | #ff7aa8 pink dots |
| orange | #ff7a10 | #ffa040 | (sprinkles) | #5bc8e8 sky dots |
| apple (green apple) | #4cc52a | #8ef05a | (sprinkles) | #ff8fb8 pink dots |

## Mould and material
- shape oval · flutes 7 a quarter (28 round) · fluteDepth .09 · tiers 2 (a stepped party mould) · height .64 · margin .52
  · shoulder .42 · dome .01.
- A big party jelly rings slower: firmHz 2.6 / softHz 1.2 · damping .1 → .14 (a heavy jelly loses its ring sooner; it must settle in 3 s). Starts a little warm (temperature .3).

## Setting
- cloth: `dots` on `#fffaf2`, scale .3, angle .3 — a paper party tablecloth; the dot colour follows the flavour.
- plate: `china`, round, a purple band `#7a5cff`.
- room: warm afternoon — window `#fff6ec`, 2 × 2 panes, lamp `#ffe0b0`, wall `#a49aa0`. View tipped 44°.

## Bits
- `mixed`: sprinkle balls and air bubbles, 20, radius .05–.085, colours white, lemon, sky, pink, lime (fixed, not by flavour).

## Sound
- pitch 1.15 (a bright, bouncy voice), wet 1.25 (sloppy).

## Outside the canvas
- hint: "Pull the jelly. Type your name and RSVP." · sound button: Sound off / on.

## Still review
| still | reads | jelly | grounded | setting | state | phone | no mud | fix |
|---|---|---|---|---|---|---|---|---|
| rest `--at 1` | ok after fix | ok | ok | ok | ok | – | ok | first render: kicker and dots were cut by the oval shoulder → the oval now passes through the page corners plus the margin (engine fix) |
| pull `--act pull --at .5` | ok | ok | ok | ok | dent + lean, the RSVP row bends in it | – | ok | – |
| drop `--act drop --at .3,.85` | ok | ok | shadow detaches, soft | ok | lift, then fat squash | – | ok | – |
| melt `--act melt --at 2.5` | plain page | – | – | – | flat, top-down | – | ok | – |
| other flavour `--act flavour:blue --at 1.5` | ok | ok | ok | pink dots with blue | ok | – | ok | – |
| phone `--phone` | big line ok; small text is small | ok | ok | ok | ok | portrait layout, no sideways scroll | ok | the plate now fills the width on phones; small text stays small (LESSONS) |
