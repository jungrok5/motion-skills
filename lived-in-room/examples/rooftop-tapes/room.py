"""「옥탑 녹음실」 — a rooftop room in Seoul, at 02:14 on a November night and again at 16:40, in the last low sun.
Its tenant has recorded the neighbourhood on cassette for seven years. BRIEF.md is the design; RESEARCH.md is
where every number comes from."""

ROOM = dict(
    title='옥탑 녹음실',
    fps=24,
    size=(1920, 1080),
    seed=7,
    versions=dict(
        night=dict(seconds=16.0, look=dict(exposure=1.45, grain=0.055, bloom=0.10, halation=0.14, saturation=0.96)),
        afternoon=dict(seconds=12.0, look=dict(exposure=0.9, grain=0.035, shadows='#18202c', highlights='#ffdcae', split=0.22, saturation=1.1)),
    ),
    look=dict(),
    beacon_range=(20, 60),          # 중광도 B 표시등: 분당 20–60회 섬광 [beacon]
    views=dict(
        desk=dict(pos=(1.75, 2.35, 1.55), look=(1.6, 4.2, 0.8), lens=22),
        tapes=dict(pos=(1.75, 2.5, 1.35), look=(0.0, 2.75, 1.25), lens=24),
        bed=dict(pos=(1.2, 1.2, 1.6), look=(3.0, 2.3, 0.4), lens=20),
        door=dict(pos=(1.3, 2.9, 1.5), look=(2.3, 0.0, 0.9), lens=20),
        laundry=dict(pos=(2.2, 2.2, 1.5), look=(0.5, 0.9, 0.6), lens=22),
        entry=dict(pos=(2.6, 0.35, 1.45), look=(1.4, 4.2, 1.0), lens=20),
        sill=dict(pos=(1.72, 3.55, 1.32), look=(1.62, 4.4, 1.12), lens=32),
        pillow=dict(pos=(1.75, 2.2, 1.25), look=(3.0, 2.9, 0.35), lens=24),
    ),
)
