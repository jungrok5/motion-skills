"""「창가 책상」 — the starter: a small rented room with a desk under the window, at 01:40 and again at 06:50.
Change everything here for your own topic; the brief (BRIEF.md) comes first."""

ROOM = dict(
    title='창가 책상',
    fps=24,
    size=(1920, 1080),
    seed=11,
    # the same room, lit and walked twice: only light, motion and the walk differ between versions (film.py)
    versions=dict(
        night=dict(seconds=6.0, look=dict(exposure=1.3, grain=0.055)),
        dawn=dict(seconds=5.0, look=dict(exposure=-0.4, grain=0.035, shadows='#1a2230', highlights='#ffe9cf')),
    ),
    look=dict(),
    # what the research allows (RESEARCH.md): flashes a minute for a flashing beacon; how fast the view may turn
    beacon_range=(20, 60),
    # fixed viewpoints for the work-light review pictures:  render.py --view plan,desk,shelf
    views=dict(
        desk=dict(pos=(1.75, 1.35, 1.5), look=(1.3, 3.0, 0.8), lens=22),
        shelf=dict(pos=(2.2, 1.9, 1.3), look=(0.1, 1.45, 0.95), lens=24),
    ),
)
