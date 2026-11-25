#!/usr/bin/env python3
"""Start a project for a new topic: BRIEF.md (to fill in first), plan.json (the numbers), build.py (a working skeleton:
a timber pavilion on a plinth with a gable roof of boards and a tree in front), film.json (stages, beats, wave,
camera). It runs end to end straight away, so every later change can be checked; then the brief replaces it part by
part.

    python3 <skill>/scripts/new-project.py <folder> --title "숲속 다실" [--size 6x4] [--bpm 92]
    python3 <skill>/scripts/draw-sheet.py <folder>
    blender -b --factory-startup -P <folder>/build.py -- hero --res 960x540 --samples 32
    blender -b --factory-startup -P <skill>/kit/film.py -- --project <folder> --plan
"""
import argparse
import json
import os
import shutil

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("folder")
    ap.add_argument("--title", required=True)
    ap.add_argument("--subtitle", default="")
    ap.add_argument("--size", default="6x4", help="the building's footprint in metres, W x D")
    ap.add_argument("--bpm", type=float, default=92.0)
    a = ap.parse_args()
    if os.path.exists(os.path.join(a.folder, "build.py")):
        raise SystemExit(f"{a.folder}/build.py exists: not overwriting")
    os.makedirs(a.folder, exist_ok=True)
    name = os.path.basename(os.path.abspath(a.folder))
    W, D = map(float, a.size.lower().split("x"))
    x0, y0 = 4.0, 5.0
    plan = dict(
        title=a.title, subtitle=a.subtitle or name.upper().replace("-", " "), scale="1:100", units="m",
        note="Read the input into these numbers before any geometry. Origin = the lot's south-west corner, +y north.",
        lot=dict(x0=0, x1=round(W + 8, 2), y0=0, y1=round(D + 9, 2)),
        contours=dict(origin=[-14, round(D + 22, 1)], step=2.4, count=7),
        buildings=[dict(id="main", label="본채", en="MAIN", x0=x0, x1=x0 + W, y0=y0, y1=y0 + D, front="S", plinth=0.35,
                        wall=0.08, wall_top=2.4, eave=2.5, ridge=3.6, overhang=0.6, bays=[round(W / 3, 3)] * 3, roof="gable",
                        rooms=[dict(id="room", label="방", en="ROOM", bays=[0, 2], floor="boards")], openings=[])],
        tree=dict(id="tree", label="나무", at=[x0 - 2.2, y0 - 1.6], crown=1.6, height=3.4),
        materials=[dict(label="돌", en="STONE · plinth", color=[130, 124, 116]), dict(label="나무", en="TIMBER · frame, boards", color=[160, 112, 70])],
    )
    film = dict(
        title=a.title, subtitle=a.subtitle, credit="{parts} PARTS · FROM ONE SHEET", fps=24, duration=16.3, bpm=a.bpm,
        downbeat=0.0, grid=4, look="golden", props=dict(cup=[plan["lot"]["x1"] + 9, plan["lot"]["y1"] + 4, 2.2]),
        hud=dict(heading="부재 목록", sub="PARTS", **{"in": 0.9}),
        stages=[
            dict(id="foundation", label="기단", color=[0.55, 0.64, 0.82], beats=[1.0, 3.0], fly="rise", sound="stone_heavy"),
            dict(id="frame", label="기둥 · 보", color=[1.0, 0.56, 0.14], beats=[3.0, 6.0], fly="drop", sound="wood"),
            dict(id="floor", label="마루", color=[1.0, 0.82, 0.2], beats=[6.0, 8.0], fly="drop", sound="wood_light"),
            dict(id="walls", label="벽널", color=[0.36, 0.86, 0.52], beats=[8.0, 10.5], fly="slide", sound="wood_light"),
            dict(id="roof", label="서까래 · 지붕널", color=[0.30, 0.56, 1.0], beats=[10.5, 13.5], fly="drop", sound="wood"),
            dict(id="interior", label="살림", color=[0.68, 0.46, 1.0], beats=[13.0, 14.5], fly="drop", sound="soft"),
            dict(id="garden", label="나무", color=[0.40, 0.88, 0.40], beats=[14.0, 15.5], fly="drop", sound="straw", pop=["tree_"]),
        ],
        site_stages=["site"],
        wave=dict(beat=16, origin="focus", keys=[[0.0, -2.0], [0.6, 4.0], [1.6, 16.0], [2.6, 60.0], [4.2, 1000.0]]),
        lights_beat=17,
        camera=dict(
            open=dict(hold=0.8, end=3.4, lens=200, az=-90),
            keys=[
                dict(t=3.4, loc=[x0 + W / 2 + 22, y0 + D / 2 - 24, 20], target=[x0 + W / 2, y0 + D / 2, 0.6], lens=45),
                dict(t=10.4, shot="hero"),
                dict(t=12.2, loc=[x0 + W / 2 + 2.6, y0 - 4.0, 1.6], target=[x0 + W / 2, y0 + D / 2 + 0.5, 1.2], lens=28),
                dict(t=13.4, loc=[x0 + W / 2 + 1.4, y0 + 0.8, 1.35], target=[x0 + W / 2 - 1.6, y0 + D, 1.0], lens=24),
                dict(t=14.8, shot="inside"),
            ],
            ev=[[0.0, -0.4], [10.3, -0.4], [11.8, 0.3], [13.6, 0.8]],
        ),
        title_in=13.6,
    )
    json.dump(plan, open(os.path.join(a.folder, "plan.json"), "w"), ensure_ascii=False, indent=1)
    json.dump(film, open(os.path.join(a.folder, "film.json"), "w"), ensure_ascii=False, indent=1)
    kit_rel = os.path.relpath(os.path.join(SKILL, "kit"), os.path.abspath(a.folder))
    src = open(os.path.join(SKILL, "templates", "build.py"), encoding="utf-8").read()
    src = src.replace("__TITLE__", a.title).replace("__NAME__", name).replace("__KIT_REL__", kit_rel).replace("__PROJECT__", a.folder)
    open(os.path.join(a.folder, "build.py"), "w", encoding="utf-8").write(src)
    shutil.copy(os.path.join(SKILL, "templates", "BRIEF.md"), os.path.join(a.folder, "BRIEF.md"))
    print(f"{a.folder}: BRIEF.md plan.json build.py film.json  (fill BRIEF.md first; the skeleton runs as is)")


if __name__ == "__main__":
    main()
