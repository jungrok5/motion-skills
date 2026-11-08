# Topic → brief, and the reviews

The film is designed from the topic, every time. The template (a child and a kite) and the example (a fox lamplighter) show
the style; they are not menus. Write `BRIEF.md` (templates/BRIEF.md) before any code.

## From a topic to a brief

1. **Find the errand.** Cut-out films of this kind are small journeys with a job to do: deliver letters, light lamps, collect
   eggs, water a street of window boxes, ferry passengers. The job gives the hero a reason to travel along the set and a repeated
   beat (stop → act → a little reward) that the camera can follow in one long truck.
2. **Design the hero as paper.** A silhouette you could cut with scissors in a minute: a big readable head in profile, a simple
   body block (coat, dress, shell), short limbs, one prop. 2–3 papers that separate from each other and from the set (a navy coat
   on a warm street, a red coat on a green hill) and one small accent (brass, a scarf). Give it a name.
3. **Build one set, deep.** One place seen side-on, built as 4–7 layers: the backdrop sheet, things on strings (sun, moon, clouds,
   stars, birds), far land, the middle (houses, sea strips, trees), the ground plane the hero walks on, the out-of-focus
   foreground. Paint it wider than the frame by the camera's travel × each layer's depth.
4. **Plan the light.** Paper sets come alive when light changes: windows lighting up, a lamp, the sun lowered on its thread and
   the moon pushed up on its stick, dusk sheet cross-fading to night. Decide what carries the warm accent.
5. **One gag or turn** that uses the stagecraft openly — hands reaching from doors, a lantern hauled on a thread, a bird folded
   from paper that lands on the moon, a cloud that is clearly hung and swings when bumped.
6. **Beats.** 3–6, each 2–5 s. Most films are one long take or 2–4 shots: a wide truck, a closer look at the turn, a wide ending
   with the title label pinned on.
7. **Parts.** Decide per piece: cut in code (precise, must line up, needs lit / unlit versions) or from an image model (painterly
   detail; references/PARTS.md). Write the part list for each sheet into the brief.

If the user gives a reference video: `ffmpeg -i ref.mp4 -vf fps=1,scale=480:-1,tile=3x4 sheet.jpg` and read it for set layers,
what hangs on strings, the palette, the camera, the label — then design your own cast and errand.

## Cast review (on cast.html, before shots)

Render `cast.html --stills 0 --scale .5`, then full size. Fail and fix if any answer is no:

- Readable at 30 % size: the head's profile, what they carry, which way they face.
- Two papers of the puppet never merge (coat vs sleeve vs trousers); the far limbs are a darker paper than the near ones.
- **Facing both ways:** the snout / nose, chest, coat front, buttons and toes point to the side the face looks at; ears, tail,
  the back of the head are behind. Far ear / far limbs behind the body, near ones in front. Flipped, nothing asymmetric reads
  wrong (a satchel on the wrong shoulder, a badge, text).
- **Joints:** knees fold back, elbows forward; nothing outside `Pup.LIM` (the check fails it anyway); the paper does not tear
  open at a pin (a limb's rounded end stays under its parent through the whole range).
- **Staging:** a raised near arm must not cross the face — use the far arm, a lower forward reach, or the prop (the example
  signals with her pole); a raised far arm must clear the head or it simply disappears behind it.
- Edge-on turn (facing ±.3) looks like a sheet of paper turning, not a glitch.
- "Did the neck turn or the body?" — if the question comes up, it fails.

## Still review (12 random moments + the contact sheet)

- It reads as **paper**: torn white rims, fibres, flat colour, every layer standing off the one behind with a soft shadow.
- The hero is the clearest thing in the frame (value and colour), never cut by the frame when it matters.
- Things in the sky hang on threads or stand on sticks; the threads go out of frame at the top.
- Feet on the ground line, never floating; a prop that touches a target touches it (write a check).
- Warm light only where something gives it; glows sit on the source.
- Foreground out of focus and not covering the action.
- Nothing in front of the hero's face at the key moment; the label never covers the action.
- Motion holds for 2 frames (12 a second) and jitters a hair between steps — not smooth, not frozen.
