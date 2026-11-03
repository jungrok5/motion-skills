# Lessons (problem → cause → fix)

From building `examples/kimchi`, the template and the prop kit against the reference clips.

- **The reference was easy to get.** → `cdn.syndication.twimg.com/tweet-result?id=<id>&token=a` (or
  `api.fxtwitter.com/<user>/status/<id>`) returned the text, the quoted tweet and the MP4 URLs; `ffmpeg … fps=1/2.5,tile=2x2`
  made study sheets; crops at full resolution showed the box shape (torn-ticket bottom, hatched shadow), the dot colours
  and the type sizes.
- **Fonts would not download from GitHub (403).** → The proxy blocks raw GitHub. → npm is open: `@expo-google-fonts/
  courier-prime` and `@expo-google-fonts/nanum-gothic-coding` carry the TTFs; `pyftsubset` (pip `fonttools brotli`) made
  woff2s, Hangul cut to the 2,350 KS X 1001 syllables (~420 KB a weight).
- **A prop option called `kind` broke the film.** → `{ ...o }` overwrote the element's own `kind: 'prop'`, so a cabbage
  became an element of kind "cabbage" with no box. → Prop variants are `type`; element fields are set after the spread.
- **Guards sat on top of their own arrow.** → Centred over the horizontal run of a split, the vertical leaving the parent
  went through the text. → Like the reference: above the run, on the outside of the vertical it leaves from
  (right-aligned for a branch going left).
- **The entry dot covered the tag.** → Long tags reach the box centre. → Boxes are at least twice (tag + padding) wide, and
  the dot is always at the top centre; merge arrows land beside it (`en: ±.45`) without a dot of their own.
- **Cabbages looked like lettuce in a vase.** → An upright cloud blob with a pentagon. → Napa cabbage lies on its side:
  a green oval with the pale rib end overlaid on the left, ribs as light strokes.
- **People were boxes.** → A parallelogram torso as wide as a limb; sleeves the shirt colour on the shirt. → A tapered
  torso strip (hips → waist → chest → rounded shoulders), rolled sleeves with bare forearms (gloves cover them), a bib
  apron that stops at the hips when crouching; squat = hips back, knees forward and up.
- **Hair covered the face.** → The hair polygon closed with a chord across the face. → Close it back along the hairline
  (a crescent).
- **Props hid arrow labels.** → A table placed beside a long vertical arrow. → `check.mjs` lists every overlap between
  states, labels, chapter text, notes and props (props may touch each other); move the prop. `overlap: true` only for a
  prop layered inside a region on purpose.
- **check.mjs never exited.** → The closing `browser.close(); process.exit()` was cut when the score section was removed.
  → Keep the ending; a hanging check looks like a slow page.
- **Rendering is cheap.** → State boxes are painted once into sprites (per state, active or not, per scale); paper and
  grain are plates. ~10–30 ms a frame; 1,367 frames in ~96 s with 4 workers.
- **The first version only re-skinned its example.** → Without a brief, a new topic tends to be poured into the kimchi
  layout. → Brief first (references/BRIEF.md): the topic's own chapters, choices, loops and pictures, scored with the
  rubric; the example itself was redone that way and gained a prop designed for it (`stuffed-cabbage`, in `index.html`).
- **The designed prop sat on the back edge.** → It was placed beside "stuffed heads", where the back edge leaves to the
  right. → `check.mjs` named the collision; props go below the row the edges leave from.
