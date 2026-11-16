"""Every KIND of thing in the room, listed before anything is built (BRIEF.md has the same table).

  id       the kind, as layout.py names it          n       how many (check.py compares with what was built)
  size     (a, b, c) in mm, any order, or None when the kind varies (books)
  method   model | generate | split | image | scan  — how it is made (see references/METHOD.md §3)
  support  place | hang | stick | suspend | lean | fix
  use      when and for what it is used: this decides where it goes
  ref      the id of the entry in RESEARCH.md its numbers come from ('-' = no number worth a source)
"""

INVENTORY = [
    # the building
    dict(id='floor', name='floor slab + sheet flooring', n=1, size=None, method='model', support='fix', use='the building', ref='finish'),
    dict(id='ceiling', name='ceiling', n=1, size=None, method='model', support='fix', use='the building', ref='shell'),
    dict(id='wall', name='walls', n=4, size=None, method='model', support='fix', use='the building', ref='shell'),
    dict(id='skirting', name='skirting board', n=1, size=None, method='model', support='fix', use='the building', ref='finish'),
    dict(id='window', name='PVC sliding window', n=1, size=None, method='model', support='fix', use='the building', ref='window'),
    dict(id='door', name='door frame', n=1, size=None, method='model', support='fix', use='the building', ref='door'),
    dict(id='door leaf', name='door leaf', n=1, size=None, method='model', support='fix', use='the building', ref='door'),
    dict(id='outlet', name='wall socket', n=1, size=None, method='model', support='fix', use='power for the desk', ref='power'),
    dict(id='switch', name='light switch', n=1, size=(70, 120, 38), method='model', support='fix', use='by the door, at hand height', ref='power'),
    dict(id='ceiling light', name='LED ceiling light', n=1, size=(500, 500, 47), method='model', support='fix', use='the room light, off in both versions', ref='ceiling-light'),
    # furniture
    dict(id='desk', name='desk', n=1, size=(1200, 600, 720), method='model', support='place', use='work, every evening', ref='desk'),
    dict(id='stool', name='stool', n=1, size=None, method='model', support='place', use='pushed back from the desk when she got up', ref='-'),
    dict(id='shelf', name='shelf unit', n=1, size=(800, 300, 1800), method='model', support='place', use='books and what does not fit on the desk', ref='-'),
    # on the desk
    dict(id='lamp', name='desk lamp', n=1, size=None, method='model', support='place', use='the only light she works by', ref='-'),
    dict(id='laptop', name='laptop', n=1, size=None, method='model', support='place', use='in front of the seat', ref='-'),
    dict(id='mug', name='mug, a third full', n=1, size=None, method='model', support='place', use='right hand, within reach', ref='-'),
    dict(id='pen cup', name='cup of pens', n=1, size=None, method='model', support='place', use='left edge, out of the way', ref='-'),
    dict(id='paper', name='A4 sheets', n=3, size=(210, 297, 0.4), method='model', support='place', use='what she was reading', ref='desk'),
    dict(id='note', name='sticky note', n=2, size=None, method='model', support='stick', use='reminders at eye level', ref='-'),
    # the rest
    dict(id='book', name='books', n=22, size=None, method='model', support='place', use='shelved by use: the working ones at hand height', ref='desk'),
    dict(id='plant', name='pot plant', n=1, size=None, method='model', support='place', use='on the sill for the light', ref='-'),
    dict(id='clock', name='wall clock', n=1, size=None, method='model', support='hang', use='seen from the desk', ref='-'),
    dict(id='second hand', name="the clock's second hand", n=1, size=None, method='model', support='fix', use='it moves', ref='-'),
    dict(id='frame', name='framed print', n=1, size=None, method='model', support='hang', use='a wall she looks at', ref='-'),
    dict(id='hook', name='nail', n=2, size=None, method='model', support='fix', use='holds what hangs', ref='-'),
    dict(id='bin', name='waste bin', n=1, size=None, method='model', support='place', use='under the desk, by the leg', ref='-'),
    dict(id='cushion', name='floor cushion', n=1, size=None, method='model', support='place', use='for sitting on the floor to read', ref='-'),
    dict(id='cable', name='lamp cable', n=1, size=None, method='model', support='fix', use='lamp to socket', ref='-'),
]
