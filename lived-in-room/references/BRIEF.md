# BRIEF — from a topic to a room on paper

The brief is written before any code, as `BRIEF.md` in the project (`new_room.py` puts the form there). It is where
the room is decided; the code only builds what it says. Its order is the order of the work: setting → spec →
inventory → placement → film.

## 1. Setting: decide the building and the person, and the requirements follow

A topic is usually one line ("a potter's studio", "my desk", "a night-shift nurse's room"). Turn it into:

- **A building**, specifically: type, decade, structure, storey, country. "A room" has no wall thickness; "the top
  floor of a 1970s concrete walk-up" does. The building type decides the shell, the window, the door, the ceiling,
  the services — everything in `skeleton.py`. Record which way plan-north (the +Y wall) really faces: it decides
  where the sun can come from.
- **A person**: who is here, what they do in this room, at what hours, what they would never allow in it. The
  person decides the inventory and where each thing goes.
- **Their history, as things.** If the user has a file about themselves (the source calls his `MYLIFE.md`), read it
  and pick the things that stand for its stories — a grandmother's cup, the first instrument, the team scarf — without
  being told one by one. If there is no file, ask (below). If the person is invented, say so in the brief.
- **Two hours.** The same room is filmed twice: pick two hours that light it differently (lamps at night / low sun
  through mist; noon glare / a storm). Give each a clock time, a date, the weather, and what is switched on — and say
  **who is holding the phone** at each, and so what is with them and not in the room (their shoes, their bag). Say
  which way the window really faces: with the date and the hour it decides where sunlight can fall, and whether it
  can fall at all.
- **The rule of the room**: one sentence about how this person arranges things, strong enough to decide placement.
  ("She keeps heat, damp and sun away from the tapes." "He works standing; nothing he uses daily is below the waist.")
  A reviewer will test every thing against it.
- **A reference picture is optional** and is used for mood and composition only. Never take sizes, counts or
  shapes from it. A generated reference stays out of the repository.

### Questions to ask the user (ask when they are there; otherwise decide, and write "assumed:")
1. Whose room is it — yours, someone you know, someone invented? Is there a file or page about them I can read?
2. Which building: country, type, about how old, which floor? What does the window look at?
3. What do you (they) actually do in this room, and at what hours?
4. Which machines and tools are used every day — make and model if you care about them? Any I should photograph-read?
5. What is on the desk right now that you would not tidy away for a photograph?
6. Which thing here did someone give you or make for you?
7. What did you play with or carry around at twelve? (things of your generation)
8. What do you never allow in this room, or always keep apart? (the rule of the room)
9. What should be on the screens?
10. Which of your own work can stand on the shelf or hang on the wall?
11. Which two hours: what is the room like late at night, and early?
12. Is there anything that must be in it for it to be yours?

Their answers go into §1 with the questions; photographs of real things are read for size and for the detail that
makes the thing itself (a scale, a worn corner), then stay out of the repository.

## 2. Spec: the building in numbers, each with a source

List the parts of the shell and look each one up before modelling it: inside size and ceiling height, wall build
and thickness, the window (type, nominal size, sill height, frame depth, face widths, lock), the door (size, swing,
hinge side, lever height), skirting and cornice (or their absence), floor and wall finish, and the services a room
of this type always has (switch and socket heights, the ceiling light, heating and cooling and where their pipes
go, what the rules require — a sprinkler, a vent, a guard rail).

Every row names an id in `RESEARCH.md`. How to research, and what counts as a source, is in `METHOD.md` §2.

## 3. Inventory: every kind of thing, before any is built

`inventory.py` lists each kind with: how many, its real size, how it is made, how it is held, what it is used for,
and the source of its numbers. Write it first; `sheet.py --inventory` prints it back as a table with what was
actually built beside it. Add by hand, for the things the camera gets close to, **what makes it read as real** —
the two or three details a person who owns one would look for (the scale on a ruler, the wear on a key, the step
at the head end of a cassette). Model those; skip the rest.

Count honestly. A room reads as lived-in at a few hundred things; most of them are many of a few kinds (books,
tapes, jars) and the rest are one each.

## 4. Placement by use

For each zone of the room: what happens there, which things serve it, and which of them are left off-square, ajar
or half-used. A thing's place is decided by **when and for what it is used** — the microphone in front of the mouth
of whoever sits there, the cup where the right hand finds it, the heater aimed at the seat and away from what heat
would harm. `layout.py` carries the same sentence as `why=` on every thing.

## 5. Film

- **The outside** is one picture on a plate beyond the window (`FILM.md`): say what it shows, how far and how wide
  it is, where the far lights are and which rule sets how they flash.
- **Moves**: name every small motion per version and what drives it (a clock, a screen, mains ripple, moving air).
- **Light**: what is on in each version, where the eye should go, and the median you are aiming for.
- **The walk**: where the visitor goes and looks, second by second, per version; where the focus hunts; when the
  torch comes on. The two versions take different paths.

## 6–8. Review rounds, the score, the retro

`REVIEW.md` has the reviewer's brief and the log format. The stills are scored with this rubric; anything under 4
goes back to the step that owns it.

| | 5 means | 1 means |
|---|---|---|
| **building** | the shell reads as that building type; window, door and services are where that type has them | a box with a hole |
| **scale** | door, desk, switch, book sit at sizes that agree with each other | something is the wrong size next to its neighbour |
| **held** | the audit passes and nothing looks as if it floats, sinks or would fall | a thing hovers or is cut by another |
| **use** | every thing is where its user would put it; nothing contradicts how they move | things are arranged for the picture |
| **lived-in** | off-square, ajar, half-used — and still a room someone keeps | showroom, or a tip |
| **person** | from the stills alone you could say who lives here | anyone's room |
| **light** | a dark room with a few places picked out; warm lamps still warm; outside reads as outside | evenly lit, or lamps burnt white |
| **motion** | at any moment something small in frame is moving, none of it in step | a still photograph with a moving camera |
| **walk** | held by a person: it bobs only while walking, turns slowly, hunts once on a close-up | a dolly, or a whip pan |
| **two hours** | plainly the same room at another hour | a different room, or the same picture graded twice |
