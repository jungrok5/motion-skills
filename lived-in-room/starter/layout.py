"""Every thing goes in here, zone by zone, each with HOW IT IS HELD and WHY IT IS THERE.
Order: furniture → what stands on it → walls → floor. A thing's place follows its use (BRIEF.md §4)."""
from mathutils import Vector

from lr import kit, mat
import props


def furnish(r):
    oak = mat.wood('#b08a5a', '#84603a', rough=0.45)

    r.zone('desk')
    desk = r.against(kit.desk(1.2, 0.6, 0.72, top_mat=oak, leg_mat=mat.paint('#e6e2d8')), 'N', u=1.35, gap=0.015, kind='desk',
                     why='under the window: daylight from the front, the room behind her')
    r.put(kit.stool(), 'floor', at=(1.5, 2.05), rz=20, kind='stool', why='pushed back and turned as she stood up')
    screen = kit.screen_pages('laptop screen', props.laptop_pages(), emission=1.6)
    r.h['screen'] = screen
    r.put(kit.laptop(screen=screen), desk, rel=(0.5, 0.42), rz=0, askew=4, kind='laptop', why='square to the seat, not to the desk')
    lamp = r.put(kit.desk_lamp(glow=mat.emit('#ffcf96', 0.0, name='lamp bulb')), desk, rel=(0.12, 0.72), rz=-35, kind='lamp',
                 why='left of a right-handed writer, so the hand casts no shadow')
    r.h['lamp'] = lamp.ob
    r.put(kit.mug(fill=0.3), desk, rel=(0.78, 0.38), rz=140, kind='mug', why='right hand, handle turned outward')
    r.put(kit.cup_of_pens(), desk, rel=(0.9, 0.8), kind='pen cup', why='far corner: reached for, not worked around')
    sheets = [kit.paper(name=r.name('paper')) for _ in range(3)]
    r.stack(sheets, desk, rel=(0.27, 0.36), rz=8, askew=9, drift=0.012, kind='paper', why='read and put down, not squared')
    r.put(kit.bin(0.11, 0.26), 'floor', at=(0.55, 2.6), kind='bin', why='beside the desk, where a hand drops things')

    r.zone('window')
    win = r.items['window']
    r.put(kit.plant(pot_r=0.042, pot_h=0.08, leaves=7, leaf=0.16, seed=2), win, at=(1.0, 3.2 + 0.022), under=0.9 + 0.3, kind='plant',
          why='on the sill for the light: a pot small enough for a 100 mm sill')

    r.drops(win, n=14, moving=3, seed=1)                              # the window sweats: three beads run, in both versions

    r.zone('shelf wall')
    unit = r.against(kit.shelf_unit(0.8, 1.8, 0.3, shelves=5, body=oak), 'W', u=1.45, kind='shelf', why='the long blank wall')
    rnd = r.rng('books')
    titles = ['밤의 문장', '도시의 소리', '빈 방', '여름 일기', '지도 없는 산책', '느린 편지']
    covers = ['#2f4a3a', '#7a2a1e', '#22364f', '#c9a23a', '#3a3a40', '#8a5a3a', '#d8d2c2', '#51627a']
    n = 0
    for level, count in ((3, 9), (2, 8), (1, 5)):
        row = []
        for i in range(count):
            hero = level == 3 and i < len(titles)                     # letter only the spines the camera gets close to
            row.append(kit.book(w=rnd.uniform(0.014, 0.034), d=rnd.choice((0.128, 0.148, 0.152)), h=rnd.choice((0.188, 0.21, 0.225)),
                                cover=rnd.choice(covers), title=titles[i] if hero else None, author='김' if hero else '', name=r.name('book')))
        items, _ = kit.shelve(r, unit.ob, level, row, start=0.02 + 0.1 * (level == 1), why='working books at hand height, the rest lower')
        n += len(items)
    r.put(kit.cushion(0.42, 0.42, 0.08, '#8d7b5a'), 'floor', at=(0.75, 0.75), rz=14, kind='cushion', why='where she sits to read from the low shelf')

    r.zone('walls')
    clock, hand, pivot = kit.clock(0.28, seconds=37, hm=(1, 40))
    c = r.hang(clock, 'E', u=1.0, z=1.75, kind='clock', why='seen from the desk by turning the head')
    r.fix(hand, clock, loc=tuple(clock.matrix_world @ Vector(pivot)), rz=r.wall_rz('E'), kind='second hand', why='it moves', embed=True)
    r.h['hand'] = hand
    r.hang(kit.frame(0.3, 0.4, props.print_art()), 'E', u=2.1, z=1.62, kind='frame', why='a print from the place she left', hook='nail')
    r.h['notes'] = []
    for i, (u, z, txt, col) in enumerate(((0.52, 1.36, ['금요일', '마감'], '#f6e36b'), (0.6, 1.25, ['우유'], '#f3a6b8'))):
        nt = r.stick(kit.note(props.note_text(txt, col, i), color=col, name=r.name('note')), wall='N', u=u, z=z, roll=r.nudge(f'note{i}', 5), kind='note',
                     why='beside the window, at eye level from the seat')
        r.h['notes'].append(nt.ob)

    r.zone('floor')
    out = r.items['outlet'].ob
    b = lamp.ob.matrix_world @ Vector((0, 0.06, 0.012))
    s = out.matrix_world @ Vector((-0.035, -0.02, 0.0))
    pts = [tuple(b), (b.x, b.y + 0.12, b.z + 0.004), (b.x + 0.1, 3.2 - 0.012, 0.69)] + kit.sag((b.x + 0.1, 3.2 - 0.012, 0.6), (s.x, 3.2 - 0.02, s.z), 0.06, 8) + [tuple(s)]
    r.fix(kit.cable(pts, 0.0028, name='lamp cable'), [lamp, 'outlet', desk], loc=(0, 0, 0), rz=0, embed=True, kind='cable', why='lamp to the socket behind the desk')
