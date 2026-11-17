"""Every thing in the room, zone by zone, each with how it is held and why it is where it is.

The rule of this room (BRIEF.md §4): she keeps heat, damp and sun away from the tapes — so the tape wall is the
west wall, the heater is at the far end of the desk, the washing dries by the door, and the bed takes the east wall.
Positions follow use; nothing is squared up unless a person would square it."""
import math

from mathutils import Vector

from lr import kit, mat
import props


def furnish(r):
    rnd = r.rng('layout')
    pine = mat.wood('#c9a66e', '#a37e48', rough=0.5, coat=0.1)
    walnut = mat.wood('#7a5433', '#4d3220', rough=0.42, coat=0.25)
    white = mat.paint('#e4e0d6', rough=0.45)

    # ---------------------------------------------------------------- the desk, under the window
    r.zone('desk')
    desk = r.against(kit.desk(1.4, 0.6, 0.72, top_mat=walnut, leg_mat=white), 'N', u=1.65, gap=0.015, kind='desk',
                     why='under the window: the meters are read by daylight, the street is heard through the glass')
    on = lambda x, y: (x / 1.4, y / 0.6)                                   # metres from the desk's front-left corner
    pages = props.monitor_pages()
    scr = kit.screen_pages('monitor screen', pages, emission=2.2)
    r.h['screen'] = scr
    mon = r.put(kit.monitor(0.54, 0.32, screen=scr), desk, rel=on(0.80, 0.44), rz=0, askew=3, kind='monitor', why='straight ahead of the seat [desk]')
    r.put(kit.keyboard(0.363, 0.14, 0.033, keys=mat.picture('keys', props.keys_picture(), rough=0.55)), desk, rel=on(0.86, 0.17), rz=4.5, kind='keyboard',
          why='where the hands fall, a little turned: nobody squares a keyboard to the desk edge [desk]')
    r.put(kit.mouse(), desk, rel=on(1.13, 0.15), rz=-14, kind='mouse', why='right hand')
    r.h['meters'] = mat.emit('#ffb45a', 0.0, name='recorder meters')
    r.put(props.recorder(glow=r.h['meters']), desk, rel=on(0.30, 0.15), rz=10, kind='field recorder',
          why='left of the keyboard, turned to the left hand: it is being played into the computer tonight')
    r.h['leds'] = [mat.emit(c, 0.0, name=f'mixer led {i}') for i, c in enumerate(['#40e060'] * 4 + ['#ffc02a', '#ff3a20'])]
    r.put(props.mixer(leds=r.h['leds']), desk, rel=on(0.36, 0.45), rz=-6, kind='mixer', why='behind the recorder, within reach of the left hand')
    r.put(props.microphone(), desk, rel=on(0.63, 0.36), rz=6, kind='microphone', why='in front of the mouth of whoever sits here, for the spoken slate on each tape')
    lamp = r.put(kit.desk_lamp(0.42, 0.26, glow=mat.emit('#ffcf96', 0.0, name='desk bulb')), desk, rel=on(0.09, 0.50), rz=-38, kind='desk lamp',
                 why='left corner, swung over the recorder: light for labels, none on the screen')
    r.h['lamp'] = lamp.ob
    r.put(kit.mug(0.041, 0.092, body=mat.ceramic('#b9b5a2', rough=0.3, speckle=0.7), fill=0.35), desk, rel=on(1.22, 0.36), rz=150, kind='mug',
          why='her mother threw it; right hand, handle outward, a third of cold barley tea left')
    r.put(kit.bottle(0.032, 0.215, fill=0.4, liquid='#7a5a20'), desk, rel=on(1.31, 0.5), kind='tea bottle', why='half drunk, pushed back out of the way')
    r.put(kit.cup_of_pens(seed=3), desk, rel=on(1.11, 0.53), kind='pen cup', why='labels are written by hand')
    flat = [props.tape_flat(props.jcard(t, s, bg, seed=i), name=r.name('tape flat')) for i, (t, s, bg) in enumerate((
        ('옥상 빗소리', '2026. 7. 장마 첫날', '#efe7d2'), ('두부 트럭', '2026. 10. 아침 6시 10분', '#dfe6d5'), ('보일러 점화', '2026. 11. 첫 추위', '#f0d9c8')))]
    r.stack(flat, desk, rel=on(0.075, 0.17), rz=-12, askew=14, drift=0.01, kind='tape flat', why='tonight\'s three, waiting to be transferred')
    r.put(props.cassette(props.shell_label('인쇄 골목 B', 2)), desk, rel=on(0.50, 0.10), rz=24, kind='cassette', why='just out of the recorder')
    tape_roll = kit.Part('masking tape')
    tape_roll.pipe(0.03, 0.019, 0.018, mat=mat.paper('#e8d9a8', rough=0.8))
    r.put(tape_roll.build(), desk, rel=on(0.56, 0.52), kind='masking tape', why='labels are masking tape and a pen')
    for i, (s, col) in enumerate(((['아침 6:10', '두부 트럭!'], '#f6e36b'), (['자는 동안', '내보내기'], '#f3a6b8'))):
        p = mon.ob.matrix_world @ Vector(((-0.2, 0.19)[i], -0.0076, 0.1 + 0.318))
        n = r.stick(kit.note(_note(s, col, i), color=col, name=r.name('note')), on=mon, point=tuple(p), normal=(0, -1, 0), roll=r.nudge(f'mn{i}', 4),
                    kind='note', why='on the monitor edge: seen every time she looks up')
        r.h.setdefault('notes', []).append(n.ob)

    r.zone('under the desk')
    r.put(kit.drawers(0.4, 0.5, 0.58, n=3, ajar=(0.0, 0.03, 0.0), body=white), 'floor', at=(1.65 + 0.449, 3.955), kind='drawers',
          why='right of the knees; the middle drawer never quite shut (blank tapes)')
    strip = r.put(kit.power_strip(4), 'floor', at=(1.32, 4.14), rz=4, kind='power strip', why='behind the feet, against the wall')
    r.h['strip'] = next(m for m in strip.ob.data.materials if m.get('lr_emit'))
    rug = r.put(_slab(1.05, 0.75, 0.008, mat.fabric('#7d5a48', weave=1.6, stripe='#6a4a3c', stripe_w=0.06), 'rug'), 'floor', at=(1.62, 3.22), rz=3, kind='rug',
                why='a warm patch under the feet on a floor that is cold at the edges')
    seat = r.put(kit.stool(0.17, 0.46, seat_mat=pine), rug, at=(1.74, 3.22), rz=22, kind='stool', why='pushed back and turned as she stood up')
    r.put(kit.cushion(0.33, 0.33, 0.045, '#8a7a56', name='seat pad'), seat, at=(1.74, 3.22), rz=31, kind='seat pad', why='a wooden stool for four hours needs one', soft=0.004)
    r.put(kit.bin(0.11, 0.27), 'floor', at=(0.76, 3.93), kind='bin', why='left of the desk, under the hand that peels labels')
    r.h['bars'] = mat.emit('#ff5a14', 0.0, name='heater bars', off='#b9b3a8')
    heat = r.put(props.heater(bars=r.h['bars']), 'floor', at=(2.66, 3.86), rz=-52, kind='heater',
                 why='at the far end of the desk, aimed at the seat: as far from the tapes as the room allows')
    r.h['heater'] = heat.ob

    # ---------------------------------------------------------------- the window
    r.zone('window')
    win = r.items['window']
    sill = dict(under=0.9 + 0.3)
    r.put(kit.plant(0.036, 0.07, leaves=6, leaf=0.13, seed=4, pot_mat=mat.ceramic('#a85f3c', rough=0.5)), win, at=(1.12, 4.3 + 0.03), kind='plant',
          why='on the sill for the morning sun: a pot that fits 90 mm', **sill)
    sp, rects = props.tape_atlas(4, 99)
    for i in range(3):
        r.put(props.tape(sp, rects[i], name=r.name('tape')), win, at=(2.02 + i * 0.0178 + (0.008 if i == 2 else 0), 4.3 + 0.012), rz=(0, 0, 9)[i], kind='tape',
              why='three she takes out on the roof; the sill is by the door of her head', **sill)
    r.h['drops'] = r.drops(win, n=34, moving=5, seed=2)

    # ---------------------------------------------------------------- the tape wall (west)
    r.zone('tape wall')
    rack = r.fix(props.tape_rack(0.84, rows=5), 'wall W', wall='W', u=2.75, z=0.96, kind='tape rack',
                 why='the west wall never gets the sun, and is the wall furthest from heater and washing')
    r.h['tapes'] = []
    for level in range(5):
        n = 46
        spm, rc = props.tape_atlas(n, level)
        fill = (1.0, 0.94, 1.0, 0.8, 0.52)[level]                       # the newest row is still filling
        x = 0.012 + 0.004
        i = 0
        while i < n and x + props.CASE[0] < 0.84 - 0.016 and i < int(n * fill):
            if rnd.random() < 0.045 and level < 4:                       # a gap where one is out
                x += props.CASE[0] + 0.001
                i += 1
                continue
            t = props.tape(spm, rc[i], name=r.name('tape'))
            v = (0.002 + rnd.uniform(0, 0.005) + props.CASE[1] / 2) / 0.082        # 78 mm of shelf for a 69.6 mm case: pushed in unevenly
            r.put(t, rack, rel=((x + props.CASE[0] / 2) / 0.84, v), level=level, kind='tape', why='in the order they were recorded, oldest at the bottom left')
            r.h['tapes'].append(t)
            x += props.CASE[0] + 0.0005
            i += 1
        if level == 4:                                                   # last month's two lie flat at the end of the newest row
            flats = [props.tape_flat(props.jcard(t, d_, seed=30 + k), name=r.name('tape flat')) for k, (t, d_) in enumerate((('지하철 환풍구', '2026. 9.'), ('세탁소 스팀', '2026. 8.')))]
            _stack_level(r, flats, rack, level, ((x + 0.09) / 0.84, 0.47), 'tape flat', "last month's, lying at the end of the row: not yet filed")
    side = r.against(kit.shelf_unit(1.0, 0.75, 0.36, shelves=2, body=pine, name='sideboard'), 'W', u=2.75, gap=0.012, kind='sideboard',
                     why='under the rack: the deck at standing height for filing as she listens')
    top = lambda x, y: (x / 1.0, y / 0.36)
    r.h['deck'] = mat.emit('#ffb45a', 0.0, name='deck meters')
    r.put(props.deck(glow=r.h['deck']), side, rel=top(0.27, 0.165), rz=0, kind='cassette deck', why='the playback machine, left where the rack starts [cassette]')
    r.put(props.radio(), side, rel=top(0.775, 0.275), rz=-7, kind='radio', why="her grandfather's; it sits where his sat, on the right, turned to the room")
    r.put(props.mini_car(), side, rel=top(0.585, 0.105), rz=28, kind='mini car', why='kept from 1999, parked at the edge like a trophy')
    r.put(props.spinning_top(), side, rel=top(0.71, 0.07), rz=40, kind='spinning top', why='next to the car: the two that survived the moves')
    r.put(props.virtual_pet(), side, rel=top(0.80, 0.075), rz=-20, kind='virtual pet', why='its battery died in 2003; it stays')
    r.put(props.prism_player(), side, rel=top(0.905, 0.07), rz=18, kind='mp3 player', why='the first thing she recorded on')
    r.put(props.flip_phone(), side, rel=top(0.955, 0.19), rz=8, kind='flip phone', why='old voice memos are still on it')
    covers = ['#2f4a3a', '#7a2a1e', '#22364f', '#c9a23a', '#3a3a40', '#8a5a3a', '#d8d2c2', '#51627a', '#6f2f4a', '#e8e2d2']
    titles = [('소리의 풍경', '머레이 셰이퍼'), ('테이프 음악의 역사', ''), ('도시는 무엇으로 사는가', ''), ('골목 인문학', ''), ('듣기의 기술', ''), ('서울의 산동네', ''),
              ('필드 레코딩 안내서', ''), ('옥상의 정치', ''), ('아날로그의 반격', ''), ('고요의 숲', '')]
    row = [kit.book(w=rnd.uniform(0.014, 0.032), d=rnd.choice((0.128, 0.148, 0.152)), h=rnd.choice((0.188, 0.21, 0.225)), cover=rnd.choice(covers),
                    title=titles[i][0] if i < len(titles) else None, author=titles[i][1] if i < len(titles) else '', name=r.name('book')) for i in range(16)]
    kit.shelve(r, side.ob, 1, row, start=0.02, why='the few books she owns are about listening; at hand under the deck', stop=0.62)
    mags = [kit.book(w=rnd.uniform(0.022, 0.034), d=0.182, h=0.257, cover=rnd.choice(['#e8d24a', '#d9482f', '#2f7fb8', '#e9e2d0']), lying=True, name=r.name('magazine')) for _ in range(5)]
    _stack_level(r, mags, side, 1, top(0.82, 0.18), 'magazine', 'monthly comics kept since school, flat because they slump upright')
    r.put(kit.carton(0.42, 0.3, 0.24, name='carton of blanks'), side, rel=top(0.27, 0.18), level=0, rz=2, kind='carton', why='blank tapes bought by the box')
    r.put(kit.carton(0.34, 0.28, 0.2, name='carton of cables'), side, rel=top(0.74, 0.18), level=0, rz=-4, kind='carton', why='cables and adapters, the box never unpacked')
    r.hang(kit.headphones(), 'W', u=3.52, z=1.42, hook='peg', kind='headphones', why='on a hook between rack and desk: reached from the seat and from the deck')
    r.stick(kit.poster(0.42, 0.594, props.sound_map(), name='sound map'), wall='W', u=3.9, z=1.52, roll=-1.2, kind='sound map',
            why='the map of where each tape was made, beside the desk where she can add a pin')

    # ---------------------------------------------------------------- the north wall beside the window
    r.zone('north wall')
    clock, hand, pivot = kit.clock(0.26, seconds=22, hm=(2, 14))
    r.hang(clock, 'N', u=2.86, z=1.86, kind='clock', why='right of the window: the time goes on every label')
    r.fix(hand, clock, loc=tuple(clock.matrix_world @ Vector(pivot)), rz=r.wall_rz('N'), embed=True, kind='second hand', why='it moves')
    r.h['hand'] = hand
    for i, (u, z, s, col) in enumerate(((0.33, 1.42, ['건전지', 'AA 8개'], '#f6e36b'), (0.46, 1.33, ['목 3시', '철물점'], '#9fd3c7'), (0.3, 1.27, ['헤드 청소'], '#f6e36b'))):
        n = r.stick(kit.note(_note(s, col, 10 + i), color=col, name=r.name('note')), wall='N', u=u, z=z, roll=r.nudge(f'nn{i}', 6), kind='note',
                    why='left of the window at eye level from the seat')
        r.h['notes'].append(n.ob)

    # ---------------------------------------------------------------- the bed (east wall)
    r.zone('bed')
    bed = r.put(kit.mattress(1.0, 2.0, 0.07, '#d9d3c4'), 'floor', at=(2.78, 1.95), kind='mattress', why='along the east wall, head to the north: feet toward the door, as people sleep')
    r.put(kit.blanket(0.96, 1.3, 0.03, '#5f7391', stripe='#e6dfcf', folds=1.3, seed=2), bed, at=(2.76, 1.7), rz=3, kind='blanket', soft=0.02,
          why='thrown back from the head when she got up, not made')
    r.put(kit.cushion(0.5, 0.34, 0.1, '#e9e4d6', name='pillow', dent=0.025), bed, at=(2.82, 2.72), rz=-8, kind='pillow', soft=0.012, why='head end, dented')
    low = r.put(kit.low_table(0.6, 0.4, 0.28), 'floor', at=(2.86, 3.3), rz=-3, kind='low table', why='beside the pillow: supper and the phone')
    lt = lambda x, y: (x / 0.6, y / 0.4)
    r.put(kit.pot(0.09, 0.085, body=mat.metal('#d3a83a', rough=0.32)), low, rel=lt(0.135, 0.24), rz=90, kind='ramen pot', why='supper eaten from the pan, not washed yet')
    r.h['night'] = mat.emit('#ffc98a', 0.0, name='night lamp glow')
    nl = kit.Part('night lamp')
    nl.cyl(0.04, 0.05, mat=mat.wood('#b98a55', '#8a5f35'), seg=20, bevel=0.004)
    nl.sphere(0.055, at=(0, 0, 0.045), mat=r.h['night'], seg=16, rings=8, squash=(1, 1, 0.8))
    night = r.put(nl.build(), low, rel=lt(0.48, 0.3), kind='night lamp', why='the light she reads by in bed')
    r.h['night lamp'] = night.ob
    r.put(kit.book(0.018, 0.128, 0.188, '#6f2f4a', title='밤의 소리들', lying=True, name=r.name('book')), low, rel=lt(0.44, 0.105), rz=-82, kind='book', why='the one she is reading, face up where it was put down')
    ph = kit.Part('phone')
    ph.box((0.0716, 0.1476, 0.0078), mat=mat.plastic('#17181a', rough=0.2), bevel=0.003)
    phone = r.put(ph.build(), low, rel=lt(0.325, 0.31), rz=76, kind='phone', why='charging by the pillow')
    books = [kit.book(w=rnd.uniform(0.016, 0.03), d=0.15, h=0.215, cover=rnd.choice(covers), lying=True, name=r.name('book')) for _ in range(5)]
    r.stack(books, 'floor', at=(2.12, 2.5), rz=80, askew=9, drift=0.01, kind='book', why='the pile every bed on the floor grows, on the side she gets out')

    r.zone('east wall')
    r.stick(kit.poster(0.42, 0.594, props.gig_poster('골목 음악회', '2025. 10. 18 — 옥상에서', '#1f2a44', '#e9c98f', 1), name='poster a'), wall='E', u=2.05, z=1.53, roll=1.6,
            kind='poster', why='a concert she recorded; above the bed, seen from the desk')
    r.stick(kit.poster(0.42, 0.594, props.gig_poster('TAPE FAIR', 'SEOUL 2024', '#c8412f', '#f1ead8', 2), name='poster b'), wall='E', u=2.6, z=1.47, roll=-2.4,
            kind='poster', why='hung by eye, a little lower than its neighbour')
    cal = r.hang(props.calendar(props.calendar_page()), 'E', u=3.25, z=1.78, kind='calendar', why='by the door: the day is checked on the way out')
    r.h['calendar'] = cal.ob

    # ---------------------------------------------------------------- the washing, by the door (south-west)
    r.zone('washing')
    rack_ = r.put(props.drying_rack(), 'floor', at=(0.47, 1.42), rz=90, kind='drying rack',
                  why='a rooftop room in November dries its washing indoors; by the door, the wall furthest from the tapes')
    rods = list(rack_.ob['lr_rods'])
    r.h['wash'] = []
    wash = ((0, 'towel', dict(width=0.36, front=0.46, back=0.3, color='#d9cdb8', stripe='#b5563f'), -0.3),
            (2, 'towel', dict(width=0.34, front=0.38, back=0.36, color='#8fa7b3'), 0.22),
            (4, 'tshirt', dict(width=0.46, front=0.5, back=0.28, color='#2c3440'), -0.18),
            (6, 'towel', dict(width=0.3, front=0.3, back=0.26, color='#e4dfd2'), 0.3))
    for k, (ri, what, kw, along) in enumerate(wash):
        c = kit.towel(rail_r=0.005, seed=k, name=r.name(what), **kw)
        p = rack_.ob.matrix_world @ Vector((along, rods[ri * 2], rods[ri * 2 + 1]))
        it = r.hang(c, frm=rack_, at=tuple(p), rz=90, kind='washing', why='over a rod, weighed straight by its own wet')
        r.h['wash'].append(it.ob)
    for k, (ri, along) in enumerate(((1, 0.36), (1, 0.25), (3, 0.34), (5, -0.36))):
        s = props.sock(('#d9d6cf', '#d9d6cf', '#5a6472', '#b5563f')[k], name=r.name('sock'))
        p = rack_.ob.matrix_world @ Vector((along, rods[ri * 2], rods[ri * 2 + 1]))
        it = r.hang(s, frm=rack_, at=tuple(p), rz=90, kind='washing', why='socks go where the towels leave room')
        r.h['wash'].append(it.ob)
    body, rotor, pivot, tilt = kit.fan(0.26, 0.56, base_r=0.15)                # a 9-inch circulator, 330 across its base class [heat-air]
    fan = r.put(body, 'floor', at=(1.12, 0.72), rz=-128, kind='circulator', why='on the floor, blowing along the rack: this is what dries the washing overnight [heat-air]')
    r.fix(rotor, fan, loc=tuple(body.matrix_world @ Vector(pivot)), rot=(-tilt, 0, -128), embed=True, kind='circulator rotor', why='it turns')
    r.h['rotor'] = rotor

    # ---------------------------------------------------------------- the south wall and the door
    r.zone('door')
    fr = r.against(props.fridge(), 'S', u=2.82, gap=0.03, kind='fridge', why='the corner by the socket; its door opens toward the room')
    r.h['cooker'] = mat.emit('#ff9a2a', 0.0, name='cooker lamp')
    r.put(props.rice_cooker(lamp=r.h['cooker']), fr, at=(0.385, 0.33), rz=172, kind='rice cooker', why='on the fridge: the only counter there is; kept warm overnight')
    r.put(props.kettle(), fr, at=(0.6, 0.17), rz=-70, kind='kettle', why='beside the cooker, handle to the right hand')
    for i in range(6):
        r.put(kit.bottle(0.045, 0.31, fill=1.0 if i else 0.3, liquid='#dfeef2', name=r.name('water bottle')), 'floor', at=(0.94 + (i % 3) * 0.095, 0.18 + (i // 3) * 0.095),
              kind='water bottle', why='carried up five floors six at a time, set down where the carrying stopped')
    rail = r.fix(props.coat_rail(0.5, 3), 'wall S', wall='S', u=1.86, z=1.66, kind='coat rail', why='beside the door, at shoulder height')
    pegs = list(rail.ob['lr_pegs'])
    p = rail.ob.matrix_world @ Vector(pegs[0:3])
    r.hang(props.tote(image=_tote_print()), frm=rail, at=tuple(p), kind='tote bag', why='the bag the recorder goes out in, on the peg nearest the door')
    r.lean(props.umbrella(), 'S', u=2.08, foot=0.14, turn=6, kind='umbrella', why='in the angle by the door, still there from the last rain')
    mat_ = r.put(_slab(0.75, 0.45, 0.006, mat.rubber('#3a3d42', rough=0.9), 'door mat'), 'floor', at=(2.6, 0.34), kind='door mat', why='shoes come off here')
    for i, (x, y, rz) in enumerate(((2.33, 0.3, 172), (2.44, 0.33, 180))):
        r.put(props.shoe(name=r.name('shoe')), mat_, at=(x, y), rz=rz, kind='shoe', why='toes to the door, kicked off rather than placed')
    for i, (x, y, rz) in enumerate(((2.93, 0.74, 8), (3.07, 0.69, -16))):
        r.put(props.slipper(name=r.name('slipper')), 'floor', at=(x, y), rz=rz, kind='slipper', why='stepped out of at the mat edge, pointing into the room')

    # ---------------------------------------------------------------- cables: every powered thing reaches a socket
    r.zone('cables')
    def run(name, a, b, via=(), drop=0.05, to=(), rad=0.0028, color='#18181a'):
        pts = [tuple(a)] + [tuple(v) for v in via] + kit.sag(via[-1] if via else a, b, drop, 8)[1:]
        return r.fix(kit.cable(pts, rad, color=color, name=name), list(to), loc=(0, 0, 0), rz=0, embed=True, kind='cable', why='every powered thing reaches a socket')
    so = r.items['outlet'].ob.matrix_world @ Vector((-0.035, -0.012, 0))
    sx = strip.ob.matrix_world @ Vector((0.14, 0.0, 0.015))
    run('strip cable', (sx.x, sx.y, 0.016), (so.x, so.y, so.z), via=((1.55, 4.262, 0.004), (2.72, 4.268, 0.004)), drop=0.0, to=[strip, 'outlet', 'floor'])
    lb = lamp.ob.matrix_world @ Vector((0, 0.074, 0.009))             # out of the back of the lamp's base
    s1 = strip.ob.matrix_world @ Vector(tuple(strip.ob['lr_sockets'])[0:3])
    run('lamp cable', (lb.x, lb.y, lb.z), (s1.x, s1.y, s1.z + 0.002), via=((lb.x + 0.02, 4.292, 0.735), (lb.x + 0.03, 4.292, 0.62)), drop=0.12, to=[lamp, strip, desk])
    hb = heat.ob.matrix_world @ Vector((0.0, 0.07, 0.03))
    so2 = r.items['outlet'].ob.matrix_world @ Vector((0.035, -0.012, 0))
    run('heater cable', (hb.x, hb.y, hb.z), (so2.x, so2.y, so2.z), via=((hb.x + 0.05, hb.y + 0.14, 0.006),), drop=0.03, to=[heat, 'outlet'], rad=0.0035, color='#2a2a2c')
    pp = phone.ob.matrix_world @ Vector((0, 0.0738, 0.004))         # the end of the phone that faces the wall
    eo = r.items['outlet.003'].ob.matrix_world @ Vector((0.035, -0.012, 0))
    run('phone cable', (pp.x, pp.y, pp.z), (eo.x, eo.y, eo.z), via=((pp.x + 0.08, pp.y + 0.14, 0.292), (3.2, 3.5, 0.29), (3.262, 3.3, 0.2)), drop=0.03,
        to=[phone, 'outlet.003', low], rad=0.0018, color='#e9e7e0')


def _note(lines, color, seed):
    from lr import draw
    im, d = draw.new(160, 160, color)
    for i, s in enumerate(lines):
        draw.scrawl((im, d), (10, 14 + i * 44), s, size=27, fill='#27304a', seed=seed * 10 + i)
    return im


def _tote_print():
    from lr import draw
    im, d = draw.new(340, 380, '#c9b99a')
    d.ellipse([90, 90, 250, 250], outline='#27304a', width=10)
    d.ellipse([145, 145, 195, 195], fill='#27304a')
    draw.text(d, (170, 300), 'TAPE FAIR', size=30, fill='#27304a', anchor='mm', weight=800)
    return im


def _slab(w, d, t, m, name):
    p = kit.Part(name)
    p.box((w, d, t), mat=m, bevel=0.002)
    return p.build()


def _stack_level(r, obs, sup, level, rel, kind, why, turn=0.0):
    """A pile on a shelf inside a unit: the first on the board, the rest on each other."""
    rnd = r.rng('pile/' + obs[0].name)
    first = r.put(obs[0], sup, rel=rel, level=level, rz=turn + rnd.uniform(-6, 6), kind=kind, why=why)
    below = first
    for ob in obs[1:]:
        below = r.put(ob, below, at=(first.ob.location.x + rnd.uniform(-0.006, 0.006), first.ob.location.y + rnd.uniform(-0.006, 0.006)),
                      rz=math.degrees(sup.ob.rotation_euler.z) + turn + rnd.uniform(-9, 9), kind=kind, why=why)
