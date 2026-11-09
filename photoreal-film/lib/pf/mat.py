"""Procedural materials: node graphs written in Python, no image files (images you draw in Python are fine).

What makes a material read as real is never the base colour. It is the *variation*: roughness that changes across
the surface (smudges, wear), a micro bump that breaks the highlight (brushing, casting, orange peel), an edge that is
a little worn. Every recipe here has those built in and exposes them as numbers.
"""
import math

import bpy

from .util import rgba


class G:
    """A material graph. g.n(type, props…, Input=value|socket) adds a node; sockets are linked, values are set."""

    def __init__(self, name, world=False):
        self.m = bpy.data.materials.new(name)
        if self.m.node_tree is None:
            self.m.use_nodes = True
        self.nt = self.m.node_tree
        for n in list(self.nt.nodes):
            self.nt.nodes.remove(n)
        self.out = self.nt.nodes.new('ShaderNodeOutputMaterial')
        self._x = 0

    def n(self, kind, _props=None, **ins):
        if not kind.startswith('ShaderNode'):
            kind = 'ShaderNode' + kind
        node = self.nt.nodes.new(kind)
        self._x -= 180
        node.location = (self._x, 0)
        for k, v in (_props or {}).items():
            setattr(node, k, v)
        for k, v in ins.items():
            self.set(node, k.replace('_', ' '), v)
        return node

    def set(self, node, key, v):
        sock = node.inputs[key]
        if isinstance(v, bpy.types.NodeSocket):
            self.nt.links.new(v, sock)
        elif isinstance(v, bpy.types.Node):
            self.nt.links.new(v.outputs[0], sock)
        else:
            if hasattr(sock.default_value, '__len__') and isinstance(v, (tuple, list)) and len(sock.default_value) == 4 and len(v) == 3:
                v = tuple(v) + (1.0,)
            sock.default_value = v

    def link(self, a, b):
        self.nt.links.new(a if isinstance(a, bpy.types.NodeSocket) else a.outputs[0], b)

    # -- little vocabulary -------------------------------------------------------------------------
    def coords(self, kind='Object', scale=(1, 1, 1), rot=(0, 0, 0), loc=(0, 0, 0)):
        tc = self.n('TexCoord')
        mp = self.n('Mapping')
        self.link(tc.outputs[kind], mp.inputs['Vector'])
        mp.inputs['Scale'].default_value = scale
        mp.inputs['Rotation'].default_value = rot
        mp.inputs['Location'].default_value = loc
        return mp.outputs[0]

    def polar(self, around=1.0, along=1.0):
        """Object coordinates unrolled round Z: (angle, radius, z). Stretch `around` to get lathe-turned streaks."""
        tc = self.n('TexCoord')
        sep = self.n('SeparateXYZ')
        self.link(tc.outputs['Object'], sep.inputs[0])
        ang = self.n('Math', {'operation': 'ARCTAN2'})
        self.link(sep.outputs['Y'], ang.inputs[0])
        self.link(sep.outputs['X'], ang.inputs[1])
        rad = self.n('VectorMath', {'operation': 'LENGTH'})
        xy = self.n('CombineXYZ')
        self.link(sep.outputs['X'], xy.inputs[0])
        self.link(sep.outputs['Y'], xy.inputs[1])
        self.link(xy.outputs[0], rad.inputs[0])
        out = self.n('CombineXYZ')
        a = self.math('MULTIPLY', ang.outputs[0], around)
        r = self.math('MULTIPLY', rad.outputs['Value'], along)
        z = self.math('MULTIPLY', sep.outputs['Z'], along)
        self.link(a, out.inputs[0])
        self.link(r, out.inputs[1])
        self.link(z, out.inputs[2])
        return out.outputs[0]

    def math(self, op, a, b=None, clamp=False):
        n = self.n('Math', {'operation': op, 'use_clamp': clamp})
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, bpy.types.NodeSocket):
                self.link(v, n.inputs[i])
            else:
                n.inputs[i].default_value = v
        return n.outputs[0]

    def noise(self, vec=None, scale=5.0, detail=4.0, rough=0.5, distortion=0.0, dims='3D'):
        n = self.n('TexNoise', {'noise_dimensions': dims})
        if vec is not None:
            self.link(vec, n.inputs['Vector'])
        n.inputs['Scale'].default_value = scale
        n.inputs['Detail'].default_value = detail
        n.inputs['Roughness'].default_value = rough
        n.inputs['Distortion'].default_value = distortion
        return n.outputs['Fac']

    def ramp(self, fac, stops):
        """stops: [(pos, value|colour), …]. Returns the colour socket (use as a float too)."""
        n = self.n('ValToRGB')
        self.link(fac, n.inputs['Fac'])
        el = n.color_ramp.elements
        while len(el) < len(stops):
            el.new(0.5)
        for e, (p, c) in zip(el, stops):
            e.position = p
            e.color = (c, c, c, 1) if isinstance(c, (int, float)) else rgba(c)
        return n.outputs['Color']

    def range(self, v, a, b, c, d, clamp=True):
        n = self.n('MapRange', {'clamp': clamp})
        self.link(v, n.inputs[0])
        for i, x in enumerate((a, b, c, d), 1):
            n.inputs[i].default_value = x
        return n.outputs[0]

    def mix(self, fac, a, b, blend='MIX'):
        """Colour mix. fac / a / b may be sockets or values."""
        n = self.n('Mix', {'data_type': 'RGBA', 'blend_type': blend})
        for idx, v in ((0, fac), (6, a), (7, b)):
            if isinstance(v, bpy.types.NodeSocket):
                self.link(v, n.inputs[idx])
            else:
                n.inputs[idx].default_value = rgba(v) if idx else v
        return n.outputs[2]

    def mixf(self, fac, a, b):
        n = self.n('Mix', {'data_type': 'FLOAT'})
        for idx, v in ((0, fac), (2, a), (3, b)):
            if isinstance(v, bpy.types.NodeSocket):
                self.link(v, n.inputs[idx])
            else:
                n.inputs[idx].default_value = v
        return n.outputs[0]

    def bump(self, height, strength=0.3, distance=0.001, normal=None):
        n = self.n('Bump')
        self.link(height, n.inputs['Height'])
        n.inputs['Strength'].default_value = strength
        n.inputs['Distance'].default_value = distance
        if normal is not None:
            self.link(normal, n.inputs['Normal'])
        return n.outputs[0]

    def principled(self, **ins):
        p = self.n('BsdfPrincipled', **ins)
        self.link(p.outputs[0], self.out.inputs['Surface'])
        return p

    def smudge(self, scale=3.0, seed=0.0):
        """0..1 blotchy mask (handling marks, dust, uneven wear) in object space."""
        v = self.coords('Object', loc=(seed, seed * 1.7, seed * 0.3))
        big = self.noise(v, scale, 6, 0.65, 0.6)
        return self.ramp(big, [(0.3, 0.0), (0.75, 1.0)])


def _rough(g, base, wear, seed=0.0, scale=3.0):
    """Roughness that wanders ±wear around `base`: the difference between CG metal and a photographed part."""
    if wear <= 0:
        return base
    s = g.smudge(scale, seed)
    return g.range(s, 0, 1, max(0.02, base * (1 - 0.6 * wear)), min(1.0, base * (1 + wear)))


# ---- recipes ------------------------------------------------------------------------------------
def metal(name, color, rough=0.3, brushed=None, grain=0.4, wear=0.35, aniso=0.0, seed=0.0, scale=1.0, coat=0.0,
          tarnish=None):
    """Brass, steel, aluminium, gold, blued or anodised metal.
    scale: size of the surface detail. 1 suits a part seen whole at 0.3-1 m; a macro of a 2 cm part wants 30-60.
    brushed: None | 'linear' (along X) | 'radial' (turned on a lathe round Z) | 'cast' (fine pitting)
    grain: strength of the brushing bump; wear: how much the roughness wanders; aniso: stretches highlights;
    tarnish: a second colour that creeps in with the smudge mask (aged brass, heat-blued steel)."""
    g = G(name)
    col = rgba(color)
    r = _rough(g, rough, wear, seed, 3.0 * scale)
    normal = None
    if brushed in ('linear', 'radial'):
        vec = g.coords('Object', scale=(2.0 * scale, 400.0 * scale, 400.0 * scale)) if brushed == 'linear' \
            else g.polar(around=1.2 * scale, along=900.0 * scale)
        streak = g.noise(vec, 6.0, 3.0, 0.7)
        normal = g.bump(streak, 0.15 * grain, 0.0002 / scale)
        r = g.math('ADD', r, g.range(streak, 0.3, 0.7, -0.08 * grain, 0.10 * grain), clamp=True)
    elif brushed == 'cast':
        pit = g.noise(g.coords('Object', scale=(600 * scale,) * 3), 5.0, 3.0, 0.6)
        normal = g.bump(pit, 0.25 * grain, 0.0003 / scale)
    base = col
    if tarnish is not None:
        base = g.mix(g.smudge(2.0 * scale, seed + 5.0), col, rgba(tarnish))
    ins = dict(Base_Color=base, Metallic=1.0, Roughness=r, Anisotropic=aniso)
    if coat:
        ins.update(Coat_Weight=coat, Coat_Roughness=0.06)
    p = g.principled(**ins)
    if aniso and brushed == 'radial':
        t = g.n('Tangent', {'direction_type': 'RADIAL', 'axis': 'Z'})
        g.link(t.outputs[0], p.inputs['Tangent'])
    if normal is not None:
        g.link(normal, p.inputs['Normal'])
    return g.m


def paint(name, color, rough=0.35, coat=1.0, peel=0.3, flake=0.0, wear=0.2, seed=0.0, scale=1.0):
    """Lacquer, enamel, car paint, powder coat. coat = clear coat; peel = orange-peel waviness of the coat;
    flake = metallic flake under the coat."""
    g = G(name)
    r = _rough(g, rough, wear, seed, 3.0 * scale)
    ins = dict(Base_Color=rgba(color), Roughness=r, Coat_Weight=coat, Coat_Roughness=0.04, Coat_IOR=1.5)
    if flake:
        fl = g.n('TexVoronoi', {'feature': 'F1'})
        g.link(g.coords('Object', scale=(4000 * scale,) * 3), fl.inputs['Vector'])
        ins['Metallic'] = flake
        nb = g.bump(fl.outputs['Color'], 0.2, 0.0001)
    p = g.principled(**ins)
    if flake:
        g.link(nb, p.inputs['Normal'])
    if peel:
        w = g.noise(g.coords('Object', scale=(180 * scale,) * 3), 2.0, 1.0, 0.5)
        g.link(g.bump(w, 0.04 * peel, 0.0005), p.inputs['Coat Normal'])
    return g.m


def glass(name, tint=(1, 1, 1), ior=1.52, rough=0.0, coating=None, coating_ior=1.38, absorb=0.0):
    """Clear or tinted glass. coating = thin-film thickness in nm (lens coatings: 90-140 magenta/amber, 180-260 green/blue)."""
    g = G(name)
    ins = dict(Base_Color=rgba(tint), Roughness=rough, IOR=ior, Transmission_Weight=1.0)
    if coating:
        ins.update(Thin_Film_Thickness=float(coating), Thin_Film_IOR=coating_ior)
    g.principled(**ins)
    return g.m


def plastic(name, color, rough=0.45, wear=0.25, grain=0.0, seed=0.0, scale=1.0, sheen=0.0):
    """Moulded plastic, bakelite, resin. grain adds the fine spark-eroded texture of a moulded part."""
    g = G(name)
    p = g.principled(Base_Color=rgba(color), Roughness=_rough(g, rough, wear, seed, 4.0 * scale), Sheen_Weight=sheen)
    if grain:
        n = g.noise(g.coords('Object', scale=(900 * scale,) * 3), 3.0, 2.0, 0.6)
        g.link(g.bump(n, 0.2 * grain, 0.0002), p.inputs['Normal'])
    return g.m


def rubber(name, color='#0a0a0b', rough=0.75, seed=0.0, scale=1.0):
    g = G(name)
    n = g.noise(g.coords('Object', scale=(300 * scale,) * 3), 4.0, 3.0, 0.6)
    p = g.principled(Base_Color=rgba(color), Roughness=_rough(g, rough, 0.2, seed), Specular_IOR_Level=0.35)
    g.link(g.bump(n, 0.25, 0.0004), p.inputs['Normal'])
    return g.m


def leather(name, color='#0c0c0d', rough=0.55, cell=900.0, depth=0.5, seed=0.0, spec=0.3):
    """Leatherette / vulcanite / pebbled grip: voronoi cells pressed into the surface."""
    g = G(name)
    v = g.coords('Object', scale=(cell,) * 3, loc=(seed,) * 3)
    vo = g.n('TexVoronoi', {'feature': 'DISTANCE_TO_EDGE'})
    g.link(v, vo.inputs['Vector'])
    h = g.ramp(vo.outputs['Distance'], [(0.0, 0.0), (0.12, 1.0)])
    fine = g.noise(g.coords('Object', scale=(cell * 6,) * 3), 2.0, 2.0, 0.5)
    hh = g.math('ADD', h, g.math('MULTIPLY', fine, 0.25))
    p = g.principled(Base_Color=rgba(color), Roughness=_rough(g, rough, 0.3, seed), Specular_IOR_Level=spec)
    g.link(g.bump(hh, 0.6 * depth, 0.0005), p.inputs['Normal'])
    return g.m


def matte(name, color, rough=0.9):
    g = G(name)
    g.principled(Base_Color=rgba(color), Roughness=rough, Specular_IOR_Level=0.2)
    return g.m


def emit(name, color, strength=10.0, falloff=0.0):
    """A surface that is a light: strips, screens, filaments, signs. falloff > 0 darkens it toward its edges."""
    g = G(name)
    e = g.n('Emission', Color=rgba(color), Strength=strength)
    if falloff:
        lw = g.n('LayerWeight', Blend=falloff)
        g.link(g.math('MULTIPLY', g.math('SUBTRACT', 1.0, lw.outputs['Facing']), strength), e.inputs['Strength'])
    g.link(e.outputs[0], g.out.inputs['Surface'])
    return g.m


def floor(name, color='#050506', rough=0.08, smudge=0.5, scale=0.4, seed=0.0, bump=0.3):
    """The polished studio floor: near-mirror, with mop marks in the roughness so reflections break up and stretch."""
    g = G(name)
    v = g.coords('Object', scale=(scale, scale * 0.35, scale), loc=(seed, seed, 0))
    a = g.noise(v, 3.0, 6.0, 0.65, 1.2)
    b = g.noise(g.coords('Object', scale=(scale * 14,) * 3), 2.0, 4.0, 0.6)
    m = g.math('ADD', g.math('MULTIPLY', a, 0.7), g.math('MULTIPLY', b, 0.3))
    r = g.range(m, 0.3, 0.75, max(0.01, rough * (1 - smudge)), rough * (1 + 2.5 * smudge))
    p = g.principled(Base_Color=rgba(color), Roughness=r, Specular_IOR_Level=0.6)
    if bump:
        g.link(g.bump(b, 0.02 * bump, 0.001), p.inputs['Normal'])
    return g.m


def wood(name, light='#7a4a26', dark='#3a2010', rough=0.4, scale=1.0, coat=0.3, seed=0.0, axis='X'):
    """Planed wood with grain running along `axis`."""
    g = G(name)
    s = {'X': (1.5, 22, 22), 'Y': (22, 1.5, 22), 'Z': (22, 22, 1.5)}[axis]
    v = g.coords('Object', scale=tuple(k * scale for k in s), loc=(seed, seed, seed))
    n1 = g.noise(v, 3.0, 6.0, 0.6, 2.0)
    n2 = g.noise(g.coords('Object', scale=tuple(k * scale * 9 for k in s)), 2.0, 3.0, 0.5)
    f = g.math('ADD', g.math('MULTIPLY', n1, 0.75), g.math('MULTIPLY', n2, 0.25))
    col = g.ramp(f, [(0.3, dark), (0.7, light)])
    p = g.principled(Base_Color=col, Roughness=g.range(f, 0.3, 0.7, rough * 1.3, rough * 0.8),
                     Coat_Weight=coat, Coat_Roughness=0.15)
    g.link(g.bump(f, 0.15, 0.0005), p.inputs['Normal'])
    return g.m


def rock(name, light='#6b5a4c', dark='#2a2420', rough=0.85, scale=1.0, seed=0.0, disp=0.0):
    """Stone, cliff, concrete. disp > 0 adds true displacement (needs a dense mesh)."""
    g = G(name)
    v = g.coords('Object', scale=(scale,) * 3, loc=(seed,) * 3)
    a = g.noise(v, 2.0, 9.0, 0.62, 0.6)
    b = g.noise(g.coords('Object', scale=(scale * 14,) * 3), 3.0, 6.0, 0.6)
    f = g.math('ADD', g.math('MULTIPLY', a, 0.7), g.math('MULTIPLY', b, 0.3))
    p = g.principled(Base_Color=g.ramp(f, [(0.3, dark), (0.72, light)]), Roughness=rough)
    g.link(g.bump(f, 0.8, 0.05 / scale), p.inputs['Normal'])
    if disp:
        d = g.n('Displacement', Height=a, Scale=disp, Midlevel=0.5)
        g.link(d.outputs[0], g.out.inputs['Displacement'])
        g.m.displacement_method = 'BOTH'
    return g.m


def water(name, color='#04121a', rough=0.02, ior=1.33, depth_tint=0.9):
    """Open water seen from above the surface: a dark dielectric. The sky and the sun do the rest."""
    g = G(name)
    g.principled(Base_Color=rgba(color), Roughness=rough, IOR=ior, Transmission_Weight=depth_tint,
                 Specular_IOR_Level=0.5)
    return g.m


def picture(name, image, rough=0.35, emission=0.0, coat=0.0, bump=0.0, uv='UV', gamma_srgb=True):
    """An image on a surface: a print, a page, a label, a screen (emission > 0). `image` is a path or a bpy image —
    draw it with PIL or use a finished frame of another shot (Shot.plate)."""
    g = G(name)
    img = image if isinstance(image, bpy.types.Image) else bpy.data.images.load(str(image), check_existing=True)
    if not gamma_srgb:
        img.colorspace_settings.name = 'Non-Color'
    t = g.n('TexImage', {'image': img, 'extension': 'EXTEND'})
    g.link(g.coords(uv), t.inputs['Vector'])
    ins = dict(Base_Color=t.outputs['Color'], Roughness=rough, Coat_Weight=coat, Coat_Roughness=0.08)
    if emission:
        ins.update(Emission_Color=t.outputs['Color'], Emission_Strength=emission)
    p = g.principled(**ins)
    if bump:
        n = g.noise(g.coords('Object', scale=(500,) * 3), 3.0, 3.0, 0.6)
        g.link(g.bump(n, bump, 0.0002), p.inputs['Normal'])
    return g.m


def engraved(name, base, mask, wrap, fill=None, depth=0.5, fill_rough=0.5, metallic=1.0, rough=0.3,
             brushed='radial', grain=0.4, wear=0.3, scale=1.0, flip=False, tarnish=None):
    """A turned part with engraved, paint-filled markings (scales, numerals, a name ring). `mask` is an image drawn
    in Python (pf.draw): black = bare metal, anything else = marking, painted in the image's own colour (or `fill`).
    wrap places the strip on the part, in the part's own coordinates:
      ('cyl', z0, z1)   round the Z axis, the strip's height spanning z0..z1 (reads left→right seen from outside)
      ('disc', r0, r1)  on a flat face round the axis, the strip's height spanning r0..r1, tops of letters outward
    flip mirrors the reading direction (a part that is seen from the other side)."""
    g = G(name)
    img = mask if isinstance(mask, bpy.types.Image) else bpy.data.images.load(str(mask), check_existing=True)
    tc = g.n('TexCoord')
    sep = g.n('SeparateXYZ')
    g.link(tc.outputs['Object'], sep.inputs[0])
    ang = g.n('Math', {'operation': 'ARCTAN2'})
    g.link(sep.outputs['Y'], ang.inputs[0])
    g.link(sep.outputs['X'], ang.inputs[1])
    turn = g.math('DIVIDE', ang.outputs[0], math.tau)
    disc = wrap[0] == 'disc'
    u = g.math('SUBTRACT', 0.5, turn) if (disc != flip) else g.math('ADD', turn, 0.5)
    if disc:
        xy = g.n('CombineXYZ')
        g.link(sep.outputs['X'], xy.inputs[0])
        g.link(sep.outputs['Y'], xy.inputs[1])
        ln = g.n('VectorMath', {'operation': 'LENGTH'})
        g.link(xy.outputs[0], ln.inputs[0])
        along = ln.outputs['Value']
    else:
        along = sep.outputs['Z']
    v = g.range(along, wrap[1], wrap[2], 0.0, 1.0, clamp=False)
    uv = g.n('CombineXYZ')
    g.link(u, uv.inputs[0])
    g.link(v, uv.inputs[1])
    t = g.n('TexImage', {'image': img, 'extension': 'CLIP'})
    g.link(uv.outputs[0], t.inputs['Vector'])
    sc = g.n('SeparateColor')
    g.link(t.outputs['Color'], sc.inputs[0])
    mx = g.math('MAXIMUM', g.math('MAXIMUM', sc.outputs[0], sc.outputs[1]), sc.outputs[2])
    m = g.range(mx, 0.02, 0.25, 0.0, 1.0)
    r = _rough(g, rough, wear, 0.0, 3.0 * scale)
    normal = None
    if brushed in ('radial', 'linear'):
        vec = g.polar(around=1.2 * scale, along=900.0 * scale) if brushed == 'radial' \
            else g.coords('Object', scale=(2.0 * scale, 400.0 * scale, 400.0 * scale))
        streak = g.noise(vec, 6.0, 3.0, 0.7)
        normal = g.bump(streak, 0.15 * grain, 0.0002 / scale)
        r = g.math('ADD', r, g.range(streak, 0.3, 0.7, -0.08 * grain, 0.10 * grain), clamp=True)
    base_c = rgba(base)
    if tarnish is not None:
        base_c = g.mix(g.smudge(2.0 * scale, 5.0), rgba(base), rgba(tarnish))
    inv = g.math('SUBTRACT', 1.0, m)
    paint_c = rgba(fill) if fill is not None else t.outputs['Color']
    p = g.principled(Base_Color=g.mix(m, base_c, paint_c), Metallic=g.math('MULTIPLY', inv, metallic),
                     Roughness=g.mixf(m, r, fill_rough))
    g.link(g.bump(inv, depth, 0.0003 / scale, normal), p.inputs['Normal'])
    return g.m


def volume(name, density=0.02, color=(1, 1, 1), aniso=0.3, absorb=0.0):
    """Homogeneous haze for a box: the air that shows light as beams and glow."""
    g = G(name)
    s = g.n('VolumeScatter', Color=rgba(color), Density=density, Anisotropy=aniso)
    if absorb:
        a = g.n('VolumeAbsorption', Color=rgba(color), Density=absorb)
        add = g.n('AddShader')
        g.link(s.outputs[0], add.inputs[0])
        g.link(a.outputs[0], add.inputs[1])
        g.link(add.outputs[0], g.out.inputs['Volume'])
    else:
        g.link(s.outputs[0], g.out.inputs['Volume'])
    return g.m
