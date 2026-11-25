# plan-build-film

A film of a building building itself on its own drawing. Give it a topic, or a sketch / floor plan, and it reads
it into numbers, draws (or calibrates) the plan sheet, writes the building as one Blender script in which every
stone, post, board, lattice strip, rafter and rope is its own object, and films it: straight down on the sheet, a
spiral down while every part lands in white clay on the beat with a parts counter, a wave from the focal point that
turns paper into land and clay into real materials, a dive inside. Every sound is synthesized on the film's clock and
mastered to -14 LUFS.

```bash
SKILL=plan-build-film
python3 $SKILL/scripts/draw-sheet.py $SKILL/examples/jeju-stone-house                       # the sheet from plan.json
blender -b --factory-startup -P $SKILL/examples/jeju-stone-house/build.py -- hero yard hall --res 960x540 --samples 32
blender -b --factory-startup -P $SKILL/kit/film.py -- --project $SKILL/examples/jeju-stone-house --plan
blender -b --factory-startup -P $SKILL/kit/film.py -- --project $SKILL/examples/jeju-stone-house --res 640x360 --samples 14
python3 $SKILL/scripts/score.py pbf-out/jeju-stone-house                                    # sound, -14 LUFS
python3 $SKILL/scripts/hud.py pbf-out/jeju-stone-house                                      # counter + title -> final.mp4
python3 $SKILL/scripts/check.py pbf-out/jeju-stone-house                                    # build / order / beat / camera / frames / sound

python3 $SKILL/scripts/new-project.py my-house --title "숲속 다실"                          # a new topic: brief + working skeleton
```

Requirements: Blender 4.2+ (tested 5.2.5, CPU or GPU), Python 3 with numpy and Pillow, ffmpeg.

Source: made from [@hx831126's post](https://x.com/hx831126/status/2125460963541577784?a=vuKgapXTAHdMxNOQYkM&s=19)
(a ridge-top cafe built from 2,829 parts on its plan sheet with a parts counter, beat-locked landings and -14 LUFS),
which builds on Nyxera0x's article (https://x.com/Nyxera0x/status/2125210356238762233) and its skill
[blueprint](https://github.com/Nyxera0x/blueprint) (MIT). Worked example: `examples/jeju-stone-house` (제주 돌집
스테이, 2,029 parts, 22.9 s); samples page: https://jungrok5.github.io/motion-skills/plan-build-film/
