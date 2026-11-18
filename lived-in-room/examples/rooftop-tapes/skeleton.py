"""The building first. A rooftop room (옥탑방) added on top of a 1990s four-storey brick-faced walk-up: block walls,
a low ceiling, sheet flooring over floor heating, one PVC sliding window (plan-north; it really faces
west-north-west), a steel door straight onto the roof.
Every number is from RESEARCH.md (ids in brackets). Nothing here is furniture."""
from lr import kit, mat
import props


def build(r):
    # 3.3 × 4.3 m inside (14.2 m²), ceiling 2.25 m (rule: ≥ 2.2 m [shell]); 150 mm block + plaster both faces = 190 mm
    r.shell((3.3, 4.3, 2.25), wall=0.19,
            floor=mat.planks('#c6a56e', '#b8965f', plank=(1.2, 0.15), rough=0.4, coat=0.25, gap=0.0015, dirt=0.3),   # wood-print sheet flooring [finish]
            walls=mat.wall('#e6dfcc', dirt=0.16, weave=0.6), ceiling=mat.wall('#eeeadf', weave=0.4, dirt=0.12))
    # PVC single sliding window, frame 120 deep [window] in a 190 wall: flush outside, a plain 70 mm reveal inside over a
    # flush board, the paper returning into it; 1500 × 1200 with the sill at 900 (it opens onto the roof terrace, so no
    # guard rail is called for). For the winter the lower 42 % of each pane is covered with insulating film.
    r.window('N', u=0.9, sill=0.9, w=1.5, h=1.2, frame_d=0.12, face=0.055, stile=0.06, lock=0.08, handle=0.28, stool=0.0, wrap=0.42)
    # steel entry door 900 × 2100 [door], opening outward onto the roof over a 100 mm kerb (a door onto a roof slab
    # has one: rain); hinges on the east jamb; a lock case above the lever, a closer at the head
    r.door('S', u=0.25, w=0.9, h=2.1, leaf_t=0.045, open_deg=88, swing='out', hinge='left', step=0.1, lock=True, closer=True,
           frame_mat=mat.paint('#4f5660', rough=0.45), leaf_mat=mat.paint('#56606c', rough=0.42))
    r.walls()
    r.skirting(0.06, 0.009, material=mat.plastic('#d9d2c0', rough=0.45))                               # 60 × 9 PVC [finish]
    r.cornice(0.04, 0.012, material=mat.plastic('#e9e4d6', rough=0.45))                                # PVC ceiling moulding [finish]

    # services
    r.fix(kit.switch(2), 'wall S', wall='S', u=1.25, z=1.26, embed=True, kind='switch', why='on the latch side of the door, 1,200 to its middle [power]')
    r.fix(props.wall_box(0.12, 0.12, 0.022, props.panel(240, 240, 'thermostat'), 'thermostat', glow=0.25), 'wall S', wall='S', u=1.43, z=1.41,
          kind='thermostat', why='the boiler controller sits beside the light switch [boiler]')
    r.fix(props.wall_box(0.33, 0.27, 0.012, props.panel(330, 270, 'breaker'), 'breaker panel'), 'wall E', wall='E', u=3.9, z=1.72,
          kind='breaker', why='by the entry, its top under 1,800 [power]')
    for wall, u, z, why in (('N', 2.78, 0.36, 'under the desk end: desk and heater'), ('W', 0.62, 0.36, 'fridge, rice cooker, circulator'),
                            ('E', 1.18, 0.36, 'bedside: phone and night lamp')):
        r.fix(kit.outlet(2, name=r.name('outlet')), 'wall ' + wall, wall=wall, u=u, z=z, embed=True, kind='outlet', why=why + ' — 300 to its middle [power]')
    r.fix(kit.outlet(1, name='ac outlet'), 'wall E', wall='E', u=0.42, z=2.06, embed=True, kind='outlet', why='the air conditioner has its own socket, high [power]')
    r.fix(kit.ceiling_panel(0.5, 0.047), 'ceiling', loc=(1.65, 2.15, r.H), rz=0, kind='ceiling light', why='the one room light, 500 mm LED panel [ceiling-light]')
    # wall-mounted split unit: 150 below the ceiling, its 65 mm sleeve sloping down through the wall [ac]
    ac = r.fix(props.ac_unit(), 'wall E', wall='E', u=1.0, z=r.H - 0.15 - 0.154, kind='air conditioner', why='over the bed head, away from the tapes')
    r.fix(props.pipe_sleeve(), ['wall E', ac], wall='E', u=1.3, z=r.H - 0.15 - 0.27, embed=True, kind='pipe sleeve',
          why='lines and drain leave through one 65 mm hole behind the unit, sloping down to the roof [ac]')
