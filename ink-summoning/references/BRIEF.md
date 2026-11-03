# The brief: reference prompt, brief template, review rubric

## The reference (verbatim)

Posted by Ayesha (@AyeshaEvie) on X, 3 Nov 2026 — https://x.com/AyeshaEvie/status/2117456171053596757 — a 16 s, 1280×720
clip, "Created with Seedance 2.5":

> Unleashing the beasts with a single stroke of ink 🐉🖌️
>
> Prompt:
>
> Cinematic 3D animation, action scene. A warrior wearing a traditional Japanese Hannya demon mask and white long hair,
> dressed in black flowing robes, wields a giant calligraphy brush like a staff inside a minimalist white minimalist
> studio. The warrior performs fluid, acrobatic martial arts movements, painting sweeping, dynamic splashes of black ink in
> the air that instantly materialize into living, roaring creatures: first a fierce black ink tiger, followed by majestic
> Chinese dragons swirling around the space. High-contrast monochrome aesthetic, sumi-e brushstroke effects blending with
> realistic fluid physics, dramatic cinematic lighting, 4k resolution, masterpiece.

What the clip does (from stills every 0.5 s and its audio):

| t (s) | shot | note |
|---|---|---|
| 0–1 | wide, frontal, symmetric studio | a stroke curls up beside the warrior; an ink cloud billows behind |
| 1–2.5 | the tiger forms in the cloud, charges, roars into the lens | ink-smoke edges, a close-up of the open mouth |
| 2.5–4 | low angle, dutch; floor sweep; high angle S-curves | ink lies on the floor and reflects |
| 4–5 | frontal wide: two vertical rings behind him, a ring on the floor | **the hero frame** |
| 5–6 | dutch diagonal strokes, medium | |
| 7–9 | the tiger forms from a splash, stalks to camera | |
| 9–11 | from behind: a ring, a spiral on the floor, a ghost tiger in the ring | |
| 11–12.5 | close on the mask, whip pans, heavy motion blur | the brush passes the lens |
| 12.5–14 | a dragon peels out of a brush stroke; two dragons appear | the music drops to a breath of flute |
| 14–16 | tableau: tiger left, warrior centre, two dragons above | held |

Sound: trailer taiko — a low hit ~every 0.9 s with rim clicks, a sustained low roar under the tiger (~8 s), a quiet
flute-like breath at ~13 s, a final hit.

How it was made: a text-to-video model; nothing transferable but the prompt, the look and the cut grammar. This skill
keeps those and builds the images itself (references/LOOK.md).

## Brief template (fill from the topic; save as BRIEF.md)

```
TITLE: <two to four words>
TOPIC: <the user's topic in one line>
SUMMONER: <mask (oni · fox · noh · crow or a new one), hair, robe; keep black robes + long white hair unless asked>
TOOL: <a giant calligraphy brush on a staff (default) — or what the topic needs, still laying ink>
CREATURES: 1 <ground beast: charges the lens, prowls, roars>  2 <sky beast: peels out of a rising stroke, coils>
           3 <optional: a small flock or a second of the sky beast>
PLACE: a minimalist white studio, glossy pale floor, light slots in the walls, a bright doorway (keep)
BEATS: first stroke → <beast 1> bursts from the ink → floor sweep → rings → the circle → <beast 1> prowls →
       close-up + whip → the rising stroke becomes <beast 2> → it coils → tableau
TABLEAU: <who stands where in the last 3–4 s>
LENGTH: 15–25 s, 16:9, 1920×1080, 30 fps
SOUND: drone + taiko under the action, a brush on each swing, splash + boom on each landing, roars, flute when the
       sky beast rises, riser → boom + gong into the tableau

QUALITY STANDARD (keep):
- every stroke is brushwork: a dense core, dry bristle edges, a ragged split tail, fine splatter off the outside
- strokes hang in 3D: rings wrap in front of and behind the figure; ink on the floor reflects in it
- creatures are ink: black brushwork bodies, white eyes, white fangs, white negative-space markings; born from smoke
- the frame is high-key white with deep blacks; the floor reflects; contact shadows; motion blur on the action
- the camera always moves; cuts land on the beat; the tableau holds

MUST NOT LOOK LIKE (keep):
- vector shapes: clean-edged ribbons, flat-filled animals, round "goggle" eyes
- edge-on strokes that read as thin lines; a black ball of smoke; a grey, low-contrast frame
- colour, on-screen text, a named character or brand
```

## Review rubric (score each of ~10 random full-size stills; fix anything under 4/5)

1. Ink: bristle texture, dry edges and a split tail visible; splatter fine and round, not confetti.
2. Depth: strokes cross in front of and behind bodies correctly; reflections in the floor; nothing floats.
3. Silhouette: the summoner reads at a glance (mask, white hair, sleeves, hakama, brush); the beast reads as its animal
   in silhouette alone.
4. Faces: the beast's eyes are slanted, pale, with a dark slit; fangs white; the mask is bold.
5. Light: high-key studio, light slots and doorway glowing, deep blacks, a gentle vignette and grain.
6. Composition: the subject fills the frame on close shots; the wides are symmetric; strokes are seen broad.
7. Motion (on the MP4): blur on swings and charges, no popping, smoke grows smoothly, cuts on the beat.
