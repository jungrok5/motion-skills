"""The building first: the shell, its openings and its fixed services, from the numbers in RESEARCH.md.
Nothing here is furniture. Built before a single thing is put in the room."""
from lr import kit, mat


def build(r):
    # shell: 2.7 × 3.2 m, ceiling 2.3 m (housing rule: ≥ 2.2), 190 mm outer walls [shell]
    r.shell((2.7, 3.2, 2.3), wall=0.19,
            floor=mat.planks('#c8a878', '#a8855a', plank=(0.9, 0.11), rough=0.3, coat=0.5),      # printed sheet flooring [finish]
            walls=mat.wall('#e9e3d3'), ceiling=mat.wall('#f1eee6', weave=0.4, dirt=0.12))
    # window: PVC single sliding, frame 120 deep, 1200 × 1100, sill 900, crescent lock 80 [window]
    r.window('N', u=0.75, sill=0.9, w=1.2, h=1.1, frame_d=0.12, face=0.055, stile=0.06, lock=0.08, stool=0.03, slide=0.0)
    # door: 900 × 2100 frame, opens outward, hinge on the left as seen from inside [door]
    r.door('S', u=0.3, w=0.9, h=2.1, open_deg=82, swing='out', hinge='left')
    r.walls()
    r.skirting(height=0.06, thick=0.009)                                                          # 60 × 9 PVC [finish]
    # services: switch at 1200 by the door's latch side, socket at 300 [power]; 500 mm LED panel [ceiling-light]
    r.fix(kit.switch(), 'wall S', wall='S', u=1.32, z=1.2 + 0.06, embed=True, kind='switch', why='where the hand goes on entering')
    r.fix(kit.outlet(2), 'wall N', wall='N', u=2.3, z=0.3 + 0.06, embed=True, kind='outlet', why='the desk plugs in here')
    r.fix(kit.ceiling_panel(0.5, 0.047), 'ceiling', loc=(1.35, 1.6, r.H), rz=0, kind='ceiling light', why='centre of the room')
