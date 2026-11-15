"""STARTER — the smallest film: one hero object in a dark studio, then the title. 3.5 s, 2.39:1, 24 fps.
Copy this folder, read BRIEF.md, and replace everything in it with your topic's design."""

FILM = dict(
    title='STARTER',
    fps=24,
    size=(1920, 804),            # the picture: 2.39:1
    bars=(1920, 1080),           # delivered inside 16:9 with black bars (None = no bars)
    seed=1,                      # every random choice in the film hangs off this
    look=dict(                   # the film stock of the whole piece; see pf/film.py DEFAULT_LOOK for every knob
        shadows='#0a1826', highlights='#ffd6a0', split=0.22, contrast=1.12, grain=0.055,
    ),
    shots=[
        dict(id='s01_dial', frames=48, fade_in=('black', 8)),
        dict(id='s02_title', frames=36, fade_out=('black', 10)),
    ],
)
