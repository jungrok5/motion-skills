# Source — what this skill was made from

X post by The Dr. Logos (@TheDoctorLogos), 16 Nov 2026, crediting the designer **graphicdesignpark**:
https://x.com/TheDoctorLogos/status/2122343959577886904?a=I0lPjyIB7nKGbjj92uo&s=19
— "Astounding work done. Congratulations 🔥👏❤️ by graphicdesignpark", a 41.5 s vertical video (1080×1920, 60 fps, with music).

## The video, beat by beat

| time | what happens |
|---|---|
| 0–1 s | A rough grey marker sketch of a moose sits on a white artboard, a handwritten signature under it. A black arrow cursor draws the first long slanted line. |
| 1–6 s | More slanted lines, all parallel (one lean), are added — several by dragging a copy across. Horizontal lines follow (antler tips, head, back, belly, ground). |
| 6–9 s | The camera zooms right in. Circles are dragged out from their centres on the eye and the snout notch, with a W / H size tooltip. Short angled lines set the face. |
| 9–15 s | Back out: the antler tines get their own parallel set; an **Align** panel distributes them evenly. More circles for the antler bays. |
| 15–20 s | Everything is selected (blue lines, anchor points), a tool strip appears, the **shape builder** is picked: a hovered region shows a grey dotted fill and a red outline, a click fills it black — region by region the moose appears. |
| 20–27 s | The guides are deleted. Close-ups on the anchor points: corners are rounded by dragging the corner widgets. |
| 27–31 s | The finished mark, small, centred, with the signature. |
| 31–41 s | Mockups: the mark printed on a blue fleece jacket, on an olive metal bottle on a backpack, on a backpack flap. Hard cuts, a slow push-in. |

## What this skill takes — the format

- The order of making: **rough sketch → construction grid (lines, then circles) → shape builder fills the cells → guides
  deleted → corners rounded → the mark alone → mockups.**
- The look of each step: grey marker sketch, thin black hairline guides at constant screen width, a single lean shared
  by the slanted guides, copies dragged across, circles dragged from the centre with a size tooltip, the Align panel
  cameo, blue selection with anchor squares, dotted-grey + red-outline hover, black fills, corner widgets, the
  handwritten signature, the vertical 9:16 frame, zooms into details and back.
- The rule underneath it all: **every edge of the mark lies on a guide, every corner is a crossing of two guides**
  (and every curve is a construction circle). `check.mjs` proves it.

## What it does not take

- The moose, its proportions or its grid. Every piece designs its own subject and grid (the starter is a fox, the
  worked example a lighthouse).
- The designer's signature or handle, the poster's name, or the music. The signature is the brief's own.
- The mockup photographs (they are generated or stock photos). Here the closing shots are drawn in code
  (`lib/mockups.js`): fleece, bottle, business cards, a blade sign, a tote.
- Any real editor's interface. The tool strip, Align panel and cursors are generic vector-editor furniture drawn in
  code, with no product's name, logo or icons.
