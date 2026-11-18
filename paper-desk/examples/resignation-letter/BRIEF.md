# BRIEF — "I Quit", a resignation letter

## The document
- A typed internal memo: a resignation letter from Sam Okafor (Desk 14) to R. Pruitt, Head of Operations.
- The reader should feel the small, guilty pleasure of it: write the letter, fold it for the envelope, or crumple it,
  spill coffee on it and set it on fire, and still be able to fix a typo while it burns.
- Sheet: A4, 560 × 792 CSS px, white copy paper.
- Layout: letterhead rule ("Internal memo · Room 4B"), a To / From / Leaving block of real inputs and a select, the headline
  "I quit." (contenteditable, `data-hic-edit`), a Tone slider, the body (contenteditable), a "Before I go" checklist and a
  signature line with an "Add a P.S." button (`data-hic-click`). A red FINAL stamp, slightly rotated.
- Type: a typewriter stack (Courier Prime → Courier New → monospace) for the letter, a sans stack for the labels; the
  signature in a script stack.
- Live behaviour: the Tone slider (Polite · Honest · Blunt) rewrites the first paragraph; the Leaving select rewrites the
  second; the From field signs the letter; the P.S. button shows a postscript.

## Paper and ink
- Stock `copy` (80 g/m², cool white, little fibre, a touch of sheen). Not offered as a choice: an office has one paper.
- Ink: toner black (#16191d). The stamp is red.

## The desk
- Grey laminate, slightly glossy, under a cool office lamp ([0.92, 0.96, 1.0]) from the upper left.
- Props: a pale blue mug of coffee (right, top), a yellow pencil (right), a desk stapler made in the page with boxes (left,
  top — the "return the stapler" joke), two paper clips (left, bottom).

## The acts
| act | on? | why | dock |
|---|---|---|---|
| curl | yes (corners only, from Type) | the paper must feel like paper | — |
| fold | yes, max 3 | thirds for the envelope | Fold |
| crumple | yes | second thoughts | Crumple |
| stain | yes, coffee #5a3416, size .28 | the mug is right there | Spill coffee |
| burn | yes, max 6, size .4 | burning bridges | Burn it |

## Sound
On, started by the first click: rustle, crease snaps, crumple crackle, a coffee plip, fire.

## Still review
Stills: idle, fold, stain + wrinkled, half crumpled, burn + stain (examples/… → docs samples). Reviewed:
- The letter reads at 1280 px: the headline, the To/From block and the body are sharp. Pass.
- Stains first read as grey; fixed by treating the stain colour as a normalised tint (LESSONS).
- The fold first sprang open like a box lid (0.55 rad); 0.24 rad now reads as a fresh crease.
- Props frame the sheet and never cover it; the stapler reads as a stapler at a glance. Pass.
