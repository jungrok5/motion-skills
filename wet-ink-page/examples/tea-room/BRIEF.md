# BRIEF — Low Tide Tea Room, today's pours

**Topic.** A small tea room's daily menu board, printed in wet ink. The guest stirs it the way you stir a bowl: a whisk
drags fine parallel lines, a press drops a bullseye of milk, and the menu still works — you can pour a cup into your tray
and write today's special while the ink moves.

## The page (real HTML)
- **Headline**: today's special, mirrored from the field "Today's special" (default *Slow pour.*). Big, dark, serif.
- **Body**: five teas as a menu — name, a short tasting note, price, and a **Pour** button that adds a cup to the tray.
- **Masses of colour**: two tea bowls (a matcha disc and a hibiscus disc, overlapping, multiply) and a hojicha band under
  the headline: big solid shapes give the whisk something to drag into ribbons.
- **Controls**: the pigments (as tea swatches), a "Steep" gauge (light ↔ strong = thin ↔ thick ink), Settle, Sound,
  the tray counter in the top bar.

## Palette
| role | colour | why |
|---|---|---|
| paper | `#e9ebdc` pale celadon | the inside of a celadon cup |
| press ink | `#1f2b23` green-black | menu text and rules |
| Matcha | `#5f7f25` | the house tea |
| Hojicha | `#7b4a22` | roasted brown |
| Hibiscus | `#a5243c` | the red bowl |
| Butterfly pea | `#2f4fa3` | the blue that turns purple |
| Milk | `#f7f3e7`, cover .96 | opaque: the one pigment lighter than the paper print, as latte art is |

## Material
- **Viscosity**: "Steep" 0–100 at 45. Light steep = thin (damp .45/s, flows long), strong = thick (damp 4.4/s).
- **Comb**: a *whisk* — 5 tines, spacing .018 h, ribbon .009 h per tine, threads .8: fine combed lines, not a brush.
- **Drop**: radius .085 h, 3 rings (a milk bullseye), full spread: it pushes the print aside as it blooms.
- **Look**: sheen .5 (tea is glossy while it moves), rim .25, vein .35.

## Idle demo (shows THIS layout)
1. a milk bullseye dropped on the matcha bowl, then a second inside it;
2. a single straight pull through it with the whisk — the latte "heart";
3. "Hibiscus day" typed into the special;
4. Hibiscus picked, a slow wave through the menu;
5. settle.

## Acts for stills
`latte` (bullseye + pull), `whisk` (a zigzag of the whisk across the headline in matcha), `menu` (butterfly pea spiral
over the menu, the tray filled).

## Still review (answers)
- Text readable at rest; headline the strongest mass; bowls do not cover the menu. ✔ (1280 and 390)
- Stirred: ribbons crisp, fine whisk lines visible, print drawn into threads, controls still visible at the edges. ✔
- Milk reads as milk on both the bowls and the paper (opaque pigment). ✔
