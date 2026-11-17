"""Every thing in the room, zone by zone, each with how it is held and why it is where it is.

The rule of this room (BRIEF.md §1): she keeps heat, damp and sun away from the tapes. So the tape wall is the west
wall — the one wall the sun never reaches through a west-north-west window; the heater stands east of the seat with
its axis passing north of the rack; the washing dries on the south wall by the door, the circulator between it and
the tapes blowing toward the door; the bed takes the east wall, where the late sun lands.

This is the layout after the first review (REVIEW.md, round 1). Positions follow use; nothing is squared up unless a
person would square it."""
import math

from mathutils import Vector

from lr import kit, mat
import props

DESK = (0.95, 3.685)          # world position of the desk's front-left corner


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
    scr = kit.screen_pages('monitor screen', props.monitor_pages(8), emission=2.2)
    r.h['screen'] = scr
    r.put(kit.monitor(0.54, 0.32, screen=scr), desk, rel=on(0.80, 0.44), rz=0, askew=3, kind='monitor', why='straight ahead of the seat [desk]')
    pc = r.put(props.mini_pc(), desk, rel=on(0.99, 0.50), rz=4, kind='mini pc', why='the computer: behind the screen, out of the way of the hands')
    r.put(kit.keyboard(0.363, 0.14, 0.033, keys=mat.picture('keys', props.keys_picture(), rough=0.55)), desk, rel=on(0.86, 0.17), rz=4.5, kind='keyboard',
          why='where the hands fall, a little turned: nobody squares a keyboard to the desk edge [desk]')
    r.put(kit.mouse(), desk, rel=on(1.13, 0.15), rz=-14, kind='mouse', why='right hand')
    r.h['meters'] = mat.emit('#ffb45a', 0.0, name='recorder meters', off='#d9d2bc')
    rec = r.put(props.recorder(glow=r.h['meters']), desk, rel=on(0.30, 0.15), rz=10, kind='field recorder',
                why='left of the keyboard, turned to the left hand: by night it plays into the computer, by day it goes out in the bag')
    r.h['recorder'] = rec
    r.h['leds'] = [mat.emit(c, 0.0, name=f'mixer led {i}', off='#2a2c2a') for i, c in enumerate(['#40e060'] * 4 + ['#ffc02a', '#ff3a20'])]
    mix = r.put(props.mixer(leds=r.h['leds']), desk, rel=on(0.36, 0.45), rz=-6, kind='mixer', why='behind the recorder, within reach of the left hand')
    mic = r.put(props.microphone(), desk, rel=on(0.63, 0.36), rz=6, kind='microphone', why='in front of the mouth of whoever sits here, for the spoken slate on each tape')
    lamp = r.put(kit.desk_lamp(0.42, 0.26, glow=mat.emit('#ffcf96', 0.0, name='desk bulb', off='#e9e4d8')), desk, rel=on(0.09, 0.50), rz=50, kind='desk lamp',
                 why='left corner, its head swung in over the recorder and the pile of tapes: light for labels, none on the screen')
    r.h['lamp'] = lamp.ob
    r.put(kit.mug(0.041, 0.092, body=mat.ceramic('#b9b5a2', rough=0.3, speckle=0.7), fill=0.35), desk, rel=on(1.22, 0.36), rz=150, kind='mug',
          why='her mother threw it; right hand, handle outward, a third of cold barley tea left')
    r.put(kit.bottle(0.032, 0.215, fill=0.4, liquid='#7a5a20'), desk, rel=on(1.31, 0.5), kind='tea bottle', why='half drunk, pushed back out of the way')
    r.put(kit.cup_of_pens(seed=3), desk, rel=on(1.17, 0.52), kind='pen cup', why='labels are written by hand')
    flat = [props.tape_flat(props.jcard(t, s, bg, seed=i), name=r.name('tape flat')) for i, (t, s, bg) in enumerate((
        ('옥상 빗소리', '2026. 7. 장마 첫날', '#efe7d2'), ('두부 트럭', '2026. 10. 아침 6시 10분', '#dfe6d5'), ('보일러 점화', '2026. 11. 첫 추위', '#f0d9c8')))]
    r.stack(flat, desk, rel=on(0.075, 0.17), rz=-12, askew=14, drift=0.01, kind='tape flat', why="this week's three, waiting to be transferred")
    r.put(props.cassette(props.shell_label('인쇄 골목 B', 2)), desk, rel=on(0.50, 0.10), rz=24, kind='cassette', why='just out of the recorder')
    roll = kit.Part('masking tape')
    roll.pipe(0.03, 0.019, 0.018, mat=mat.paper('#e8d9a8', rough=0.8))
    r.put(roll.build(), desk, rel=on(0.60, 0.20), kind='masking tape', why='every label is masking tape and a pen')

    r.zone('under the desk')
    r.put(kit.drawers(0.4, 0.5, 0.58, n=3, ajar=(0.0, 0.03, 0.0), body=white), 'floor', at=(1.65 - 0.449, 3.955), kind='drawers',
          why='at the west end, away from the heater; labels, pens and batteries, the middle drawer never quite shut')
    strip = r.put(kit.power_strip(4), 'floor', at=(1.95, 4.14), rz=4, kind='power strip', why='behind the feet, against the wall')
    r.h['strips'] = [next(m for m in strip.ob.data.materials if m.get('lr_emit'))]
    rug = r.put(_slab(0.82, 0.9, 0.008, mat.fabric('#7d5a48', weave=1.6, stripe='#6a4a3c', stripe_w=0.06), 'rug'), 'floor', at=(1.86, 3.45), rz=2, kind='rug',
                why='under the knee-hole: a warm patch for feet on a floor that is cold at its edges')
    seat = r.put(kit.stool(0.17, 0.46, seat_mat=pine), rug, at=(1.82, 3.3), rz=22, kind='stool', why='pushed back and turned as she stood up')
    r.put(kit.cushion(0.33, 0.33, 0.045, '#8a7a56', name='seat pad'), seat, at=(1.82, 3.3), rz=31, kind='seat pad', why='a wooden stool for four hours needs one', soft=0.004)
    r.put(kit.bin(0.11, 0.27), 'floor', at=(0.76, 3.93), kind='bin', why='left of the desk, under the hand that peels labels')
    r.h['bars'] = mat.emit('#ff5a14', 0.0, name='heater bars', off='#b9b3a8')
    heat = r.put(props.heater(bars=r.h['bars']), 'floor', at=(2.42, 3.32), rz=-105.5, kind='heater',
                 why='east of the seat, clear of the table and the bedding, aimed at her shins: its axis meets the west wall north of the rack')
    r.h['heater'] = heat.ob

    # ---------------------------------------------------------------- the window
    r.zone('window')
    win = r.items['window']
    r.put(kit.plant(0.036, 0.07, leaves=6, leaf=0.13, seed=4, pot_mat=mat.ceramic('#a85f3c', rough=0.5)), win, at=(1.12, 4.3 + 0.03), kind='plant',
          why='on the sill for the late sun: a pot that fits 70 mm', under=0.9 + 0.3)
    r.h['drops'] = r.drops(win, n=34, moving=5, seed=2)
    steel = mat.metal('#8d8d8b', rough=0.4)
    cr = kit.Part('curtain rail')
    cr.tube([(-1.1, -0.07, 0), (1.1, -0.07, 0)], 0.011, mat=steel, seg=8)
    for x in (-0.95, 0.95):
        cr.tube([(x, 0.0, 0.0), (x, -0.07, 0.0)], 0.007, mat=steel, seg=6)
        cr.cyl(0.02, 0.004, at=(x, -0.004, 0), rot=(90, 0, 0), mat=steel, seg=12)
    rail = r.fix(cr.build(), 'wall N', wall='N', u=1.8, z=2.16, kind='curtain rail', why='over the only window')
    cur = kit.curtain(0.36, 1.41, pleats=5, color='#5c4f5e')
    p = rail.ob.matrix_world @ Vector((0.82, -0.07, -0.011))
    r.h['curtain'] = r.hang(cur, frm=rail, at=tuple(p), kind='curtain', why='drawn back to the right while she is up — she likes the lights of the hill — and across when she sleeps').ob

    # ---------------------------------------------------------------- the tape wall (west)
    r.zone('tape wall')
    rack = r.fix(props.tape_rack(0.84, rows=5), 'wall W', wall='W', u=2.75, z=0.96, kind='tape rack',
                 why='the one wall the sun never reaches; off the wall on battens so no damp gathers behind it')
    depth = 0.1                                                          # 82 mm of shelf in front of 18 mm of batten
    r.h['tapes'] = []
    count = 0
    for level in range(5):
        n = 46
        spm, rc = props.tape_atlas(n, level, first=count)
        fill = (1.0, 0.94, 1.0, 0.8, 0.52)[level]                       # the newest row is still filling
        x = 0.012 + 0.004
        i = 0
        while i < n and x + props.CASE[0] < 0.84 - 0.016 and i < int(n * fill):
            if rnd.random() < 0.045 and level < 4:                       # a gap where one is out
                x += props.CASE[0] + 0.001
                i += 1
                continue
            t = props.tape(spm, rc[i], name=r.name('tape'))
            v = (0.002 + rnd.uniform(0, 0.005) + props.CASE[1] / 2) / depth   # 78 mm of shelf for a 69.6 mm case: pushed in unevenly
            r.put(t, rack, rel=((x + props.CASE[0] / 2) / 0.84, v), level=level, kind='tape', why='in the order they were recorded, oldest at the bottom left')
            r.h['tapes'].append(t)
            x += props.CASE[0] + 0.0005
            i += 1
            count += 1
        if level == 4:                                                   # last month's two lie flat at the end of the newest row
            flats = [props.tape_flat(props.jcard(t, d_, seed=30 + k), name=r.name('tape flat')) for k, (t, d_) in enumerate((('지하철 환풍구', '2026. 9.'), ('세탁소 스팀', '2026. 8.')))]
            _stack_level(r, flats, rack, level, ((x + 0.09) / 0.84, 0.42), 'tape flat', "last month's, lying at the end of the row: not yet filed")
            r.put(props.hygrometer(), rack, rel=(0.9, 0.5), level=level, rz=-8, kind='hygrometer', why='in the empty end of the top row, where she reads it every time she files a tape')
    side = r.against(kit.shelf_unit(1.0, 0.75, 0.36, shelves=2, body=pine, name='sideboard'), 'W', u=2.75, gap=0.012, kind='sideboard',
                     why='under the rack: the deck at standing height for filing as she listens')
    top = lambda x, y: (x / 1.0, y / 0.36)
    r.h['deck'] = mat.emit('#ffb45a', 0.0, name='deck meters', off='#141210')
    deck = r.put(props.deck(glow=r.h['deck']), side, rel=top(0.27, 0.165), rz=0, kind='cassette deck', why='the playback machine, left where the rack starts [cassette]')
    r.put(props.radio(), side, rel=top(0.775, 0.275), rz=-7, kind='radio', why="her grandfather's; it sits where his sat, on the right, turned to the room")
    sp, rects = props.tape_atlas(3, 99, first=186)
    for i in range(3):
        r.put(props.tape(sp, rects[i], name=r.name('tape')), side, rel=top(0.53 + i * 0.0178 + (0.007 if i == 2 else 0), 0.3), rz=(0, 0, 8)[i], kind='tape',
              why='the next three to transfer, stood by the deck — not on the wet sill')
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
    r.put(kit.carton(0.42, 0.3, 0.24, name='carton of blanks'), side, rel=top(0.27, 0.18), level=0, rz=2, kind='carton', why='blank tapes bought by the box, kept low and far from the heater')
    r.put(kit.carton(0.34, 0.28, 0.2, name='carton of cables'), side, rel=top(0.74, 0.18), level=0, rz=-4, kind='carton', why='cables and adapters, the box never unpacked')
    for i, (x, y, rz) in enumerate(((0.1, 3.37, 6), (0.1, 2.12, -12))):
        r.put(props.absorber(name=r.name('moisture absorber')), 'floor', at=(x, y), rz=90 + rz, kind='moisture absorber', why='one at each end of the tapes, against the outside wall')
    r.hang(kit.headphones(), 'W', u=3.52, z=1.42, hook='peg', kind='headphones', why='on a peg between rack and desk: reached from the seat and from the deck')
    r.hang(props.sound_board(), 'W', u=3.93, z=1.9, hook='nail', kind='sound map',
           why='the map of where each tape was made, on cork beside the desk where she can add a pin')

    # ---------------------------------------------------------------- the north wall beside the window
    r.zone('north wall')
    clock, hand, pivot, hh, mh = kit.clock(0.26, hands=True)
    r.hang(clock, 'N', u=0.44, z=1.92, kind='clock', why='left of the window, seen by lifting the eyes from the recorder: the time goes on every label')
    piv = tuple(clock.matrix_world @ Vector(pivot))
    for ob_, k_ in ((hh, 'clock hand'), (mh, 'clock hand'), (hand, 'second hand')):
        r.fix(ob_, clock, loc=piv, rz=r.wall_rz('N'), embed=True, kind=k_, why='it tells the hour of each version')
        r.allow(ob_, hh)
        r.allow(ob_, mh)
        r.allow(ob_, hand)
    r.h['hands'] = (hh, mh, hand)
    r.h['notes'] = []
    notes = ((0.20, 1.44, ['아침 6:10', '두부 트럭!'], '#f6e36b'), (0.34, 1.33, ['건전지', 'AA 8개'], '#f6e36b'), (0.5, 1.4, ['목 3시', '철물점'], '#9fd3c7'),
             (0.27, 1.19, ['헤드 청소'], '#f3a6b8'), (0.62, 1.26, ['내보내기', '확인'], '#f6e36b'))
    for i, (u, z, s, col) in enumerate(notes):
        n = r.stick(kit.note(_note(s, col, 10 + i), color=col, name=r.name('note')), wall='N', u=u, z=z, roll=r.nudge(f'nn{i}', 6), kind='note',
                    why='left of the window at eye level from the seat — not on the screen')
        r.h['notes'].append(n.ob)

    # ---------------------------------------------------------------- the bed (east wall)
    r.zone('bed')
    bed = r.put(kit.mattress(1.0, 2.0, 0.07, '#d9d3c4'), 'floor', at=(2.78, 1.85), kind='mattress', why='along the east wall, head to the north: the wall the late sun reaches, so not the tapes')
    duvet = r.put(kit.blanket(0.96, 1.15, 0.085, '#5f7391', stripe='#e6dfcf', folds=1.7, seed=2, name='duvet'), bed, at=(2.76, 1.5), rz=3, kind='duvet', soft=0.03,
                  why='a winter duvet, thrown back from the pillow when she got up')
    r.put(kit.blanket(0.94, 0.42, 0.1, '#e6dfcf', folds=1.9, seed=5, name='duvet fold'), duvet, at=(2.75, 1.93), rz=-4, kind='duvet', soft=0.04,
          why='the top third folded back on itself, underside up')
    r.put(kit.cushion(0.5, 0.34, 0.1, '#e9e4d6', name='pillow', dent=0.025), bed, at=(2.82, 2.6), rz=-8, kind='pillow', soft=0.012, why='head end, dented')
    r.put(props.mat_controller(), 'floor', at=(2.2, 2.62), rz=20, kind='mat controller', why='the electric mat under the bedding: its dial on the floor beside the pillow')
    low = r.put(kit.low_table(0.6, 0.4, 0.28), 'floor', at=(3.07, 3.25), rz=90 - 3, kind='low table', why='at the head of the bed along the wall: supper and the night lamp')
    lt = lambda x, y: (x / 0.6, y / 0.4)
    r.put(kit.pot(0.09, 0.085, body=mat.metal('#d3a83a', rough=0.32)), low, rel=lt(0.135, 0.24), rz=90, kind='ramen pot', why='supper eaten from the pan, not washed yet')
    r.h['night'] = mat.emit('#ffc98a', 0.0, name='night lamp glow', off='#e9e2d0')
    nl = kit.Part('night lamp')
    nl.cyl(0.04, 0.05, mat=mat.wood('#b98a55', '#8a5f35'), seg=20, bevel=0.004)
    nl.sphere(0.055, at=(0, 0, 0.045), mat=r.h['night'], seg=16, rings=8, squash=(1, 1, 0.8))
    night = r.put(nl.build(), low, rel=lt(0.48, 0.3), kind='night lamp', why='the light she reads by in bed')
    r.h['night lamp'] = night.ob
    r.put(kit.book(0.018, 0.128, 0.188, '#6f2f4a', title='밤의 소리들', lying=True, name=r.name('book')), low, rel=lt(0.44, 0.105), rz=-82, kind='book', why='the one she is reading, face up where it was put down')
    r.put(props.tissue_roll(), low, rel=lt(0.31, 0.3), kind='tissue roll', why='every floor table in the country has one')
    books = [kit.book(w=rnd.uniform(0.016, 0.03), d=0.15, h=0.215, cover=rnd.choice(covers), lying=True, name=r.name('book')) for _ in range(5)]
    r.stack(books, 'floor', at=(2.12, 2.3), rz=80, askew=9, drift=0.01, kind='book', why='the pile every bed on the floor grows, on the side she gets out')
    r.put(props.burner(), 'floor', at=(3.09, 4.05), rz=94, kind='burner', why='the only stove: pushed into the corner by the socket after supper')

    r.zone('east wall')
    r.stick(kit.poster(0.42, 0.594, props.gig_poster('골목 음악회', '2025. 10. 18 — 옥상에서', '#1f2a44', '#e9c98f', 1), name='poster a'), wall='E', u=2.05, z=1.53, roll=1.6,
            kind='poster', why='a concert she recorded; above the bed, seen from the desk')
    r.stick(kit.poster(0.42, 0.594, props.gig_poster('TAPE FAIR', 'SEOUL 2024', '#c8412f', '#f1ead8', 2), name='poster b'), wall='E', u=2.6, z=1.47, roll=-2.4,
            kind='poster', why='hung by eye, a little lower than its neighbour')
    cal = r.hang(props.calendar(props.calendar_page()), 'E', u=3.25, z=1.78, kind='calendar', why='by the door: the day is checked on the way out')
    r.h['calendar'] = cal.ob
    r.hang(kit.mirror(0.3, 1.1), 'E', u=3.56, z=1.72, kind='mirror', why='the last thing before the door')

    # ---------------------------------------------------------------- clothes (west wall, south)
    r.zone('clothes')
    cr_ = r.against(kit.clothes_rail(0.9, 1.55, 0.42), 'W', u=1.3, gap=0.1, kind='clothes rail', why='what a rooftop room has instead of a wardrobe; clothes are dry, so they may stand by the tapes')
    ry, rz_ = cr_.ob['lr_rail']
    clothes = ((-0.3, dict(width=0.5, length=0.95, thick=0.1, color='#3f4a3a')), (-0.13, dict(width=0.44, length=0.72, thick=0.03, color='#d9d6cf')),
               (-0.02, dict(width=0.44, length=0.7, thick=0.03, color='#7f8fa3')), (0.1, dict(width=0.46, length=0.74, thick=0.04, color='#2c3440')),
               (0.27, dict(width=0.45, length=0.66, thick=0.05, color='#8a5a3a')))
    for i, (x, kw) in enumerate(clothes):
        g = kit.garment(name=r.name('garment'), **kw)
        p = cr_.ob.matrix_world @ Vector((x, ry, rz_ + 0.011))
        r.hang(g, frm=cr_, at=tuple(p), rz=rnd.uniform(-5, 5), kind='garment', why='the padded coat nearest the door, work clothes behind it')

    # ---------------------------------------------------------------- the washing, by the door (south wall)
    r.zone('washing')
    rack_ = r.put(props.drying_rack(), 'floor', at=(1.40, 0.37), rz=0, kind='drying rack',
                  why='a rooftop room in November dries its washing indoors: on the door wall, the far end of the room from the tapes')
    rods = list(rack_.ob['lr_rods'])
    r.h['wash'] = []
    wash = ((0, 'towel', dict(width=0.36, front=0.36, back=0.3, color='#d9cdb8', stripe='#b5563f'), -0.3),
            (2, 'towel', dict(width=0.34, front=0.38, back=0.36, color='#8fa7b3'), 0.22),
            (4, 'tshirt', dict(width=0.46, front=0.42, back=0.28, color='#2c3440'), -0.18),
            (6, 'towel', dict(width=0.3, front=0.3, back=0.26, color='#e4dfd2'), 0.3))
    for k, (ri, what, kw, along) in enumerate(wash):
        c = kit.towel(rail_r=0.005, seed=k, name=r.name(what), **kw)
        p = rack_.ob.matrix_world @ Vector((along, rods[ri * 2], rods[ri * 2 + 1]))
        it = r.hang(c, frm=rack_, at=tuple(p), rz=0, kind='washing', why='over a rod, weighed straight by its own wet')
        r.h['wash'].append(it.ob)
    for k, (ri, along) in enumerate(((1, 0.36), (1, 0.25), (3, 0.34), (5, -0.36))):
        s = props.sock(('#d9d6cf', '#d9d6cf', '#5a6472', '#b5563f')[k], name=r.name('sock'))
        p = rack_.ob.matrix_world @ Vector((along, rods[ri * 2], rods[ri * 2 + 1]))
        it = r.hang(s, frm=rack_, at=tuple(p), rz=0, kind='washing', why='socks go where the towels leave room')
        r.h['wash'].append(it.ob)
    body, rotor, pivot, tilt = kit.fan(0.26, 0.56, base_r=0.15)                # a 9-inch circulator [heat-air]
    fan = r.put(body, 'floor', at=(1.33, 1.38), rz=6, kind='circulator',
                why='between the washing and the tapes, blowing at the washing and the door: the damp air goes out, not along the tape wall')
    r.fix(rotor, fan, loc=tuple(body.matrix_world @ Vector(pivot)), rot=(-tilt, 0, 6), embed=True, kind='circulator rotor', why='it turns')
    r.h['rotor'] = rotor
    for i in range(6):
        r.put(kit.bottle(0.045, 0.31, fill=1.0 if i else 0.3, liquid='#eaf5f8', label=props.water_label(), name=r.name('water bottle')), 'floor',
              at=(1.5 + (i % 3) * 0.095, 0.21 + (i // 3) * 0.095), kind='water bottle', why='carried up five floors six at a time, set down just inside the door, under the rack')

    # ---------------------------------------------------------------- the south wall and the door
    r.zone('door')
    fr = r.against(props.fridge(), 'S', u=2.82, gap=0.03, kind='fridge', why='the corner by the socket; with the washing moved, its door opens into clear floor')
    r.h['cooker'] = mat.emit('#ff9a2a', 0.0, name='cooker lamp', off='#3a2a1c')
    cook = r.put(props.rice_cooker(lamp=r.h['cooker']), fr, at=(0.385, 0.33), rz=172, kind='rice cooker', why='on the fridge: the only counter there is; kept warm overnight')
    r.put(props.kettle(), fr, at=(0.6, 0.17), rz=-70, kind='kettle', why='beside the cooker, unplugged')
    strip2 = r.put(kit.power_strip(4, name='fridge strip'), 'floor', at=(0.115, 0.3), rz=90, kind='power strip', why='between fridge and wall: one two-gang socket feeds this whole corner')
    r.h['strips'].append(next(m for m in strip2.ob.data.materials if m.get('lr_emit')))
    rail = r.fix(props.coat_rail(0.5, 3), 'wall S', wall='S', u=1.86, z=1.66, kind='coat rail', why='beside the door, at shoulder height')
    pegs = list(rail.ob['lr_pegs'])
    p = rail.ob.matrix_world @ Vector(pegs[0:3])
    r.h['tote'] = r.hang(props.tote(image=_tote_print()), frm=rail, at=tuple(p), kind='tote bag', why='the bag the recorder goes out in, on the peg nearest the door')
    r.lean(props.umbrella(), 'S', u=0.12, foot=0.14, turn=-6, kind='umbrella', why='in the corner behind the door, still there from the last rain')
    mat_ = r.put(_slab(0.75, 0.45, 0.006, mat.rubber('#3a3d42', rough=0.9), 'door mat'), 'floor', at=(2.6, 0.34), kind='door mat', why='shoes come off here')
    r.h['sneakers'] = [r.put(props.shoe(name=r.name('shoe')), mat_, at=(x, y), rz=rz, kind='shoe', why='toes to the door, kicked off rather than placed')
                       for x, y, rz in ((2.36, 0.3, 172), (2.47, 0.33, 180))]
    r.h['outdoor'] = [r.put(props.slipper('#2a3a5a', name=r.name('outdoor slipper')), mat_, at=(x, y), rz=rz, kind='outdoor slipper',
                            why='plastic slippers for the terrace: the tap, the washing line, the roof at night')
                      for x, y, rz in ((2.74, 0.29, 176), (2.86, 0.32, 188))]
    for i, (x, y, rz) in enumerate(((2.02, 0.84, 8), (2.15, 0.79, -16))):
        r.put(props.slipper(name=r.name('slipper')), 'floor', at=(x, y), rz=rz, kind='slipper', why='stepped out of at the mat edge, pointing into the room')
    r.put(props.basket(), 'floor', at=(3.12, 0.6), rz=30, kind='toiletries basket', why='the tap and the toilet are across the terrace: her wash things live by the door')

    # ---------------------------------------------------------------- leads: everything that runs reaches a socket
    r.zone('leads')
    def run(name, pts, to, rad=0.0028, color='#18181a'):
        return r.fix(kit.cable([tuple(q) for q in pts], rad, color=color, name=name), list(to), loc=(0, 0, 0), rz=0, embed=True, kind='cable',
                     why='everything that runs reaches a socket')
    W = lambda x, y, z=0.7232: (DESK[0] + x, DESK[1] + y, z)                # a point on the desk top (cable radius above it)
    north = r.items['outlet'].ob
    so = north.matrix_world @ Vector((-0.035, -0.012, 0))
    sx = strip.ob.matrix_world @ Vector((0.14, 0.0, 0.015))
    run('strip lead', [(sx.x, sx.y, 0.016), (2.3, 4.2, 0.004), (2.72, 4.268, 0.004)] + kit.sag((2.72, 4.268, 0.004), (so.x, so.y, so.z), 0.0, 6)[1:], [strip, north, 'floor'])
    socks = [strip.ob.matrix_world @ Vector(tuple(strip.ob['lr_sockets'])[i * 3:i * 3 + 3]) for i in range(4)]
    lb = lamp.ob.matrix_world @ Vector((0, 0.074, 0.009))                 # out of the back of the lamp's base
    run('lamp lead', [tuple(lb), (lb.x + 0.01, 4.293, 0.735), (lb.x + 0.02, 4.293, 0.6), (1.5, 4.27, 0.18)] + kit.sag((1.5, 4.27, 0.18), (socks[0].x, socks[0].y, socks[0].z + 0.002), 0.05, 6)[1:],
        [lamp, strip, desk])
    run('monitor lead', [W(0.80, 0.50, 0.728), W(0.80, 0.608, 0.728), W(0.80, 0.608, 0.5), (1.78, 4.27, 0.12)] + kit.sag((1.78, 4.27, 0.12), (socks[1].x, socks[1].y, socks[1].z + 0.002), 0.03, 5)[1:],
        [r.items['monitor'], strip, desk])
    run('pc lead', [W(1.02, 0.56, 0.74), W(1.02, 0.608, 0.74), W(1.02, 0.608, 0.5), (1.98, 4.275, 0.12)] + kit.sag((1.98, 4.275, 0.12), (socks[2].x, socks[2].y, socks[2].z + 0.002), 0.03, 5)[1:],
        [pc, strip, desk])
    run('recorder lead', [W(0.385, 0.222), W(0.40, 0.29), W(0.41, 0.352)], [rec, mix, desk], rad=0.0022, color='#3a3a3c')
    run('microphone lead', [W(0.578, 0.372), W(0.545, 0.40), W(0.506, 0.42)], [mic, mix, desk], rad=0.0022, color='#3a3a3c')
    run('pc audio lead', [W(0.50, 0.53), W(0.56, 0.572), W(0.80, 0.575), W(0.928, 0.535)], [mix, pc, desk], rad=0.0022, color='#3a3a3c')
    hb = heat.ob.matrix_world @ Vector((0.0, 0.07, 0.03))
    so2 = north.matrix_world @ Vector((0.035, -0.012, 0))
    run('heater lead', [tuple(hb), (2.6, 3.7, 0.006), (2.74, 4.2, 0.006)] + kit.sag((2.74, 4.2, 0.006), (so2.x, so2.y, so2.z), 0.03, 6)[1:], [heat, north], rad=0.0035, color='#2a2a2c')
    east = r.items['outlet.003'].ob
    eo = east.matrix_world @ Vector((0.035, -0.012, 0))
    nb = night.ob.matrix_world @ Vector((0.03, 0.0, 0.01))
    run('night lamp lead', [tuple(nb), (nb.x + 0.12, nb.y, 0.286), (3.262, nb.y, 0.2)] + kit.sag((3.262, nb.y, 0.2), (eo.x, eo.y, eo.z), 0.02, 5)[1:], [night, east, low], rad=0.002, color='#e9e7e0')
    eo2 = east.matrix_world @ Vector((-0.035, -0.012, 0))
    T = lambda x, y: tuple(low.ob.matrix_world @ Vector((x, y, 0.2828)))      # a point on the low table's top, in its own frame
    edge = T(0.03, -0.205)
    run('charger lead', [T(-0.03, -0.05), T(0.0, -0.12), T(0.025, -0.18), edge, (3.262, edge[1], 0.22)] + kit.sag((3.262, edge[1], 0.22), (eo2.x, eo2.y, eo2.z), 0.02, 5)[1:],
        [east, low], rad=0.0018, color='#e9e7e0')
    west = r.items['outlet.002'].ob
    wo = west.matrix_world @ Vector((0.035, -0.012, 0))
    s2 = [strip2.ob.matrix_world @ Vector(tuple(strip2.ob['lr_sockets'])[i * 3:i * 3 + 3]) for i in range(4)]
    e2 = strip2.ob.matrix_world @ Vector((0.14, 0.0, 0.015))
    run('fridge strip lead', [(e2.x, e2.y, 0.016), (0.03, 0.56, 0.004)] + kit.sag((0.03, 0.56, 0.004), (wo.x, wo.y, wo.z), 0.0, 5)[1:], [strip2, west, 'floor'])
    run('fridge lead', [(0.3, 0.07, 0.06), (0.2, 0.06, 0.006), (0.115, 0.12, 0.006), (s2[0].x, s2[0].y, s2[0].z + 0.002)], [fr, strip2], color='#e9e7e0')
    cb = cook.ob.matrix_world @ Vector((0.0, 0.115, 0.03))
    run('cooker lead', [tuple(cb), (0.2, cb.y + 0.02, 0.86), (0.2, 0.3, 0.82)] + kit.sag((0.2, 0.3, 0.82), (s2[1].x + 0.02, s2[1].y, s2[1].z + 0.01), 0.02, 6)[1:] + [(s2[1].x, s2[1].y, s2[1].z + 0.002)],
        [cook, strip2, fr], color='#e9e7e0')
    fb = fan.ob.matrix_world @ Vector((0.0, 0.14, 0.012))
    run('circulator lead', [tuple(fb), (1.0, 1.25, 0.004), (0.62, 0.72, 0.004), (0.22, 0.6, 0.004), (s2[2].x + 0.03, s2[2].y, 0.02), (s2[2].x, s2[2].y, s2[2].z + 0.002)],
        [fan, strip2, 'floor'], color='#e9e7e0')
    db = deck.ob.matrix_world @ Vector((0.0, 0.14, 0.05))
    run('deck lead', [tuple(db), (0.0065, db.y, 0.79), (0.0065, db.y, 0.3), (0.016, 2.2, 0.004), (0.016, 0.7, 0.004), (0.06, 0.52, 0.004), (s2[3].x, s2[3].y - 0.03, 0.02), (s2[3].x, s2[3].y, s2[3].z + 0.002)],
        [deck, strip2, side, 'floor'])
    ac = r.items['air conditioner'].ob
    ao = r.items['ac outlet'].ob.matrix_world @ Vector((0.0, -0.012, 0))
    ab = ac.matrix_world @ Vector((-0.377, -0.03, 0.0))
    run('air conditioner lead', [tuple(ab)] + kit.sag(tuple(ab), (ao.x, ao.y, ao.z), 0.03, 6)[1:], [ac, r.items['ac outlet']], color='#e9e7e0')


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
