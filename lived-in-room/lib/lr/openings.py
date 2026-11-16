"""Windows and doors: the part of a room where guessing shows first. Every number here is an argument — frame depth,
face widths, sill height, lock size — because they differ by country, by decade and by building type. Look them up
(a manufacturer's catalogue, the housing rules) and pass them; the defaults are only there so a first draft builds.

Local frame of an opening: x along the wall with 0 at the middle of the opening, z up from its bottom edge, y = 0 on
the room face of the wall and +y INTO the wall (toward outside).
"""
import math

from mathutils import Vector

from . import geo, mat
from .geo import Part


class OpeningsMixin:
    def window(self, wall, u, sill, w, h, frame_d=0.12, face=0.055, stile=0.06, setback=None, slide=0.0, glass_t=0.022,
               lock=0.08, handle=0.28, stool=0.0, stool_t=0.022, casing=0.0, frame_mat=None, glass_mat=None,
               name=None, kind='window'):
        """A two-sash horizontal sliding window in wall `wall`: opening left edge at u, bottom at `sill`, w × h.
          frame_d   depth of the frame (single ≈ 0.12, double ≈ 0.23)       face   visible width of the frame members
          stile     visible width of the sash members                        setback  room face of the wall → room face of
                    the frame (default: the frame sits flush with the OUTSIDE of the wall, leaving a reveal inside)
          slide     how far the inner sash stands open, metres               lock   length of the crescent lock (0 = none)
          stool     depth of an inner sill board projecting into the room (0 = none); it also covers the reveal
          casing    width of a trim round the opening on the room side (0 = the wall finish returns into the reveal)
        Returns the Item. Its object carries lr_glass (local y of the room face of the inner pane), lr_clear (w, h of
        the glazed opening) and lr_stool (local z of the top of the stool) for putting things on the sill and drops on
        the glass."""
        t = self.wall_t[wall]
        if frame_d > t + 1e-6:
            self.problems.append(f'window on wall {wall}: frame {frame_d * 1000:.0f} mm is deeper than the wall ({t * 1000:.0f} mm)')
        setback = max(0.0, t - frame_d) if setback is None else setback
        self.opening(wall, u, sill, w, h)
        fm = frame_mat or mat.plastic('#f1f0ec', rough=0.35, dirt=0.25)
        gm = glass_mat or mat.glass(window=True)
        steel = mat.metal('#b9b9b6', rough=0.35)
        p = Part(name or self.name('window'))
        yc = setback + frame_d / 2
        for sx in (-1, 1):                                                    # frame
            p.box((face, frame_d, h), at=(sx * (w / 2 - face / 2), yc, 0), mat=fm, bevel=0.002)
        p.box((w - 2 * face, frame_d, face), at=(0, yc, h - face), mat=fm, bevel=0.002)
        p.box((w - 2 * face, frame_d, face), at=(0, yc, 0), mat=fm, bevel=0.002)
        cw, ch = w - 2 * face, h - 2 * face
        sd = min(0.05, frame_d * 0.36)
        sw = cw / 2 + stile / 2
        y_in, y_out = setback + frame_d * 0.28, setback + frame_d * 0.72
        for y in (y_in, y_out):                                               # the two rails the sashes run on
            p.box((cw, 0.006, 0.012), at=(0, y, face), mat=fm, bevel=0)
        slide = max(0.0, min(slide, sw - stile))
        sashes = ((-cw / 2, y_out), (cw / 2 - sw - slide, y_in))              # left sash outside, right sash inside
        z0 = face + 0.012
        sh = ch - 0.012
        for x0, y in sashes:
            for sx in (0, 1):
                p.box((stile, sd, sh), at=(x0 + stile / 2 + sx * (sw - stile), y, z0), mat=fm, bevel=0.002)
            for z in (z0, z0 + sh - stile):
                p.box((sw - 2 * stile, sd, stile), at=(x0 + sw / 2, y, z), mat=fm, bevel=0.002)
            p.box((sw - 2 * stile + 0.012, glass_t, sh - 2 * stile + 0.012), at=(x0 + sw / 2, y, z0 + stile - 0.006), mat=gm, bevel=0)
        xi = sashes[1][0]
        if lock:                                                              # crescent lock on the meeting stile
            lz = z0 + sh / 2
            p.box((0.02, 0.005, lock), at=(xi + stile / 2, y_in - sd / 2 - 0.0025, lz - lock / 2), mat=steel, bevel=0.001)
            p.cyl(lock * 0.3, 0.007, at=(xi + stile / 2, y_in - sd / 2 - 0.005, lz), rot=(90, 0, 0), mat=steel, seg=16)
            p.box((0.012, 0.012, lock * 0.5), at=(xi + stile / 2 + lock * 0.22, y_in - sd / 2 - 0.016, lz - lock * 0.05), rot=(0, 18, 0), mat=steel, bevel=0.003)
        if handle:
            p.box((0.014, 0.012, handle), at=(xi + sw - stile / 2, y_in - sd / 2 - 0.006, z0 + sh / 2 - handle / 2), mat=fm, bevel=0.004)
        stool_z = 0.0
        if stool > 0 or (setback > 0 and stool_t > 0 and stool >= 0):
            depth = setback + stool
            if depth > 0.005:
                p.box((w + (0.04 if stool > 0 else 0.0), depth, stool_t), at=(0, setback - depth / 2, 0), mat=fm, bevel=0.003)
                stool_z = stool_t
        if casing > 0:
            cm = fm
            for sx in (-1, 1):
                p.box((casing, 0.012, h + casing), at=(sx * (w / 2 + casing / 2), -0.006, 0), mat=cm, bevel=0.002)
            p.box((w + 2 * casing, 0.012, casing), at=(0, -0.006, h), mat=cm, bevel=0.002)
        ob = p.build()
        geo.place(ob, tuple(self.wall_pt(wall, u + w / 2, sill)), rz=self.wall_rz(wall))
        ob['lr_glass'] = y_in - glass_t / 2
        ob['lr_clear'] = (cw, ch)
        ob['lr_stool'] = stool_z
        ob['lr_inner_sash'] = (xi, xi + sw, z0, z0 + sh)
        return self.add(ob, kind, 'fix', ['wall ' + wall], cls='skeleton', zone='skeleton')

    def door(self, wall, u, w=0.9, h=2.1, leaf_t=0.045, face=0.04, open_deg=85.0, swing='out', hinge='left', frame_mat=None,
             leaf_mat=None, lever_z=1.0, name=None, kind='door', step=0.0):
        """A hinged door: opening left edge at u, w × h, standing open by open_deg. swing='out' opens away from the
        room (an entry door), 'in' into it. hinge = the side the hinges are on as you face the door from inside.
        Returns (frame item, leaf item). The walk-through begins in this doorway."""
        t = self.wall_t[wall]
        self.opening(wall, u, 0.0, w, h)
        fm = frame_mat or mat.paint('#5b5f66', rough=0.45)
        lm = leaf_mat or mat.paint('#6a6e75', rough=0.45)
        steel = mat.metal('#c2c2bf', rough=0.3)
        p = Part(name or self.name('door frame'))
        for sx in (-1, 1):
            p.box((face, t + 0.012, h), at=(sx * (w / 2 - face / 2), t / 2, 0), mat=fm, bevel=0.002)
        p.box((w - 2 * face, t + 0.012, face), at=(0, t / 2, h - face), mat=fm, bevel=0.002)
        if step > 0:
            p.box((w - 2 * face, t, step), at=(0, t / 2, 0), mat=fm, bevel=0.002)
        fob = p.build()
        geo.place(fob, tuple(self.wall_pt(wall, u + w / 2, 0.0)), rz=self.wall_rz(wall))
        frame = self.add(fob, kind, 'fix', ['wall ' + wall], cls='skeleton', zone='skeleton')
        lw, lh = w - 2 * face - 0.006, h - face - 0.008 - step
        s = 1 if hinge == 'left' else -1
        q = Part((name or 'door') + ' leaf')
        q.box((lw, leaf_t, lh), at=(s * lw / 2, 0, 0), mat=lm, bevel=0.002)
        for y in (-leaf_t / 2 - 0.03, leaf_t / 2 + 0.03):                      # a lever handle on each side
            q.cyl(0.011, 0.03, at=(s * (lw - 0.06), y + (0.015 if y < 0 else -0.015), lever_z - step), rot=(90 if y < 0 else -90, 0, 0), mat=steel, seg=12)
            q.box((0.12, 0.016, 0.018), at=(s * (lw - 0.11), y, lever_z - step - 0.009), mat=steel, bevel=0.005)
        lob = q.build()
        y_leaf = t - leaf_t / 2 if swing == 'out' else leaf_t / 2
        hinge_pt = self.wall_pt(wall, u + (face + 0.003 if hinge == 'left' else w - face - 0.003), step + 0.004, -y_leaf)
        turn = open_deg * s * (1 if swing == 'out' else -1)
        geo.place(lob, tuple(hinge_pt), rz=self.wall_rz(wall) + turn)
        leaf = self.add(lob, kind + ' leaf', 'fix', [fob.name], cls='skeleton', zone='skeleton')
        self.doorway = dict(wall=wall, u=u + w / 2, w=w, h=h, center=self.wall_pt(wall, u + w / 2, 0.0, 0.0))
        return frame, leaf

    def drops(self, win, n=40, moving=5, size=(0.002, 0.005), seed=0, speed=(0.004, 0.02), mat_=None, kind='drop', pane='inner'):
        """Water on the room side of a window's inner pane: n still beads and `moving` that creep down the glass and
        start again at the top (rain that got in the gap, or the condensation of a cold night). Each is a thing
        stuck to the glass; the moving ones are motions."""
        ob = win.ob
        x0, x1, z0, z1 = ob['lr_inner_sash']
        gy = ob['lr_glass']
        rnd = self.rng(f'drops/{ob.name}/{seed}')
        m = mat_ or mat.glass('#ffffff', rough=0.0, ior=1.33)
        made = []
        stile = 0.07
        for i in range(n + moving):
            r = rnd.uniform(*size)
            x = rnd.uniform(x0 + stile + 0.01, x1 - stile - 0.01)
            z = rnd.uniform(z0 + stile + 0.02, z1 - stile - 0.02)
            p = Part(self.name('drop'))
            p.sphere(r, at=(0, 0, 0), mat=m, seg=8, rings=4, squash=(1.0, 0.45, 1.25 if i >= n else 1.0))
            lo, hi = p.bounds()
            p.shift((0, -hi[1] + 0.0003, -(lo[2] + hi[2]) / 2))                   # its back just into the glass, centred on z
            d = p.build()
            wp = ob.matrix_world @ Vector((x, gy, z))
            it = self.stick(d, on=win, point=tuple(wp), normal=tuple(self.wall_normal(win.on[0][5:])), kind=kind,
                            why='water on the cold pane')
            self.allow(d, win.ob)
            made.append(it)
            if i >= n:
                v = rnd.uniform(*speed)
                span = (z1 - stile - 0.02) - (z0 + stile + 0.02)
                off = rnd.uniform(0, span)
                wob = rnd.uniform(0, 6.28)
                top = z1 - stile - 0.02

                def fn(t, x=x, v=v, off=off, wob=wob, top=top, span=span):
                    # runs, stalls, runs: a drop on glass does not fall at a steady speed
                    s = (off + v * (t + 0.7 * math.sin(0.9 * t + wob))) % span
                    q = ob.matrix_world @ Vector((x + 0.0015 * math.sin(40 * s + wob), gy, top - s))
                    return q
                self.travel(d, fn, name=d.name, kind='drop', note=f'{v * 1000:.0f} mm/s')
        return made
