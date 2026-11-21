# BRIEF — fill this before writing any code

Copy to the project as `BRIEF.md` (`scripts/new-book.mjs` does). A pop-up quest is designed from its topic. Fill every
line, then build `book.js` from it. If a line can't be filled, the topic isn't understood yet.

## 1. The topic and the journey
- **Topic** (what the reader should understand at the end):
- **Reader** (who, how much they already know):
- **The errand** (one concrete thing the hero carries or fetches from the first page to the last; it makes the
  chapters a journey, not a list): e.g. *a request travels from a click to a window*, *a seed goes from frost to fruit*.
- **Chapters** (3–6). One idea each, in the order the errand meets them:

| # | place (landmark) | idea it teaches | sky | prop the reader pokes | task type | what the prop does when solved |
|---|---|---|---|---|---|---|
| 1 | | | morning | | choice / order / count | |

Rules for the table: every place is a **thing you could fold out of card** (a tower, a ferry, a loom), not an
abstract label. The prop is the **one object** in the set the idea lives in, and solving the task makes it move
(a banner unrolls, a raft crosses, panes light). The sky darkens along the journey (morning → day → dusk → night)
unless the story says otherwise.

## 2. Cast (designed for this topic — never reuse another book's cast because it is there)
| who | species | role | mass (light / medium / heavy) | coat / colours | carries | idle (how they breathe, fidget) |
|---|---|---|---|---|---|---|
| hero | | travels every page | | | | |
| guide 1 | | keeper of place 1 | | | | |

- Mass sets timing: a light hero steps fast and hops high; a heavy guide gathers longer before the cheer and lands harder.
- Each guide **belongs** to their place (the owl keeps the address book, the frog poles the ferry).
- Stance and gaze per chapter: where the guide looks while pointing at the prop, which way the hero walks in.

## 3. Words
- **Title** (≤ 22 characters) and **subtitle** (caps, ≤ 34 characters).
- Per chapter: title in **two short lines** (`['The Address', 'Tower']`), region name, the journey **line** (≤ 110
  characters, shown under the book), the **story** (2–3 sentences for "Read this page"), the **lesson** (the idea in
  plain words), the task **prompt**, options (one right, the wrong ones tempting, not silly), the **hint** after a
  wrong pick, and the **solved** line (what the reader sees happen).
- Words say what the picture can't. Don't narrate what the set already shows.

## 4. Look
- Cover colour, tablecloth colour, accent (the tag over the prop, buttons, stamps).
- Ground per chapter: land colour, water / sand / plaza shapes, the dotted route the hero walks.
- Palette: flat card colours, a few per chapter; the paper's own cream holds it together.

## 5. Tour (the film)
- Segment length (default 8.6 s per chapter): walk in → aim at the prop → task → solved → turn. Longer tasks (an
  order of 4) may need `tour.segment: 9.5`.

---

# Still review — score every chapter frame before calling it done

Render stills (`scripts/render.mjs … --stills`) or run `scripts/check.mjs … --shots dir` and look at each frame.
A "no" is a fix, not a note.

1. **Reads at a glance** — could someone name the place and guess the idea from the picture alone, with the words hidden?
2. **One prop** — is the prop obvious (the tag bobs over it, it's in front, unhidden, not lost among props)?
3. **Pop-up, not diorama** — does everything stand on the page as folded card (flat colours, card edges, sticks for
   skies), with nothing floating and nothing hanging off the paper?
4. **Gutter** — does every piece stay on its own page (the gutter runs clean down the middle)?
5. **Heading clear** — is the top left (chapter heading) free of anything important?
6. **Bodies** — on the cast sheet: does each puppet face one way as one body (head, coat, boots), near arm and
   boot on the back side, far eye narrower? Does the back view show plain card? Would anyone ask "is the neck or the
   body turned?" — then it fails.
7. **Motion** — floating, sliding, or standing dead still anywhere? Does the cheer gather before it hops and settle
   after it lands? Does the heavy guide move slower than the light hero?
8. **The turn** — scrub a page halfway: do the leaving pieces fold flat onto the leaf and the arriving ones rise,
   with nothing poking through the paper?
9. **Words fit** — heading two lines, journey line ≤ 3 lines at 390 px, task card on screen.
10. **One style** — do the new pieces you built for this topic look like they came out of the same box of card as the
    kit's trees and houses?
