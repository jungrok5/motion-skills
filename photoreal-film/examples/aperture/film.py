"""APERTURE — a lens, from the inside out. 18 s, 2.39:1, 24 fps. Worked example of the photoreal-film skill.
The brief is in BRIEF.md; the parts every shot shares are in props.py."""

PLATES = [('s06_coast', 57), ('s03_elements', 31), ('s04_body', 54)]   # frames of the film that lie on the desk as prints

FILM = dict(
    title='APERTURE',
    fps=24,
    size=(1920, 804),            # the picture: 2.39:1
    bars=(1920, 1080),           # delivered inside a 16:9 frame with black bars
    seed=7,
    look=dict(                   # the stock of the whole film; shots only nudge it
        shadows='#0a1826', highlights='#ffd6a0', split=0.24,
        contrast=1.14, grain=0.06, halation=0.3, bloom=0.12, vignette=0.4,
    ),
    shots=[
        dict(id='s01_iris', frames=54, fade_in=('black', 8)),
        dict(id='s02_ring', frames=44),
        dict(id='s03_elements', frames=60),
        dict(id='s04_body', frames=54),
        dict(id='s05_shutter', frames=20, fade_out=('white', 6)),
        dict(id='s06_coast', frames=60, fade_in=('white', 10), fade_out=('white', 3), look=dict(shadows='#0c1c2a', split=0.18, bloom=0.2, halation=0.45)),
        dict(id='s07_print', frames=54, plates=PLATES, fade_in=('white', 5)),
        dict(id='s08_dive', frames=36, plates=PLATES, fade_out=('black', 5)),
        dict(id='s09_title', frames=50, fade_in=('black', 6), fade_out=('black', 12)),
    ],
)
