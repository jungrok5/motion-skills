"""Materials for a lived-in room: node graphs written in Python. No texture files — pictures (book spines, screens,
posters, the view outside) are drawn with Pillow in `lr.draw` and handed over in memory.

Two things make a surface read as used rather than rendered:
  * roughness that wanders (handling marks) — built into every recipe as `wear`
  * dirt — ONE node group (`lr_dirt`) shared by every recipe, so the whole room is grimy in the same way and one
    number (`dirt=`) turns it up or down per material. Change the group and every object changes with it.
"""
import math

import bpy
import numpy as np

from .util import rgba

DIRT = dict(color='#2a2118', scale=2.2)          # the room's one dirt: colour and blotch size (per metre)
_cache = {}


def reset():
    """Forget cached materials (called when the scene is emptied)."""
    _cache.clear()


def cached(fn):
    """Same arguments → the same material datablock: 400 objects share a few dozen materials."""
    def wrap(*a, **k):
        key = (fn.__name__, a, tuple(sorted((kk, str(v)) for kk, v in k.items())))
        m = _cache.get(key)
        if m is None or m.name not in bpy.data.materials:
            m = _cache[key] = fn(*a, **k)
        return m
    wrap.__name__ = fn.__name__
    wrap.__doc__ = fn.__doc__
    return wrap


class G:
    """A material graph. g.n(type, {props}, Input=value|socket) adds a node; sockets are linked, values are set."""

    def __init__(self, name):
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

    def coords(self, kind='Object', scale=(1, 1, 1), rot=(0, 0, 0), loc=(0, 0, 0)):
        tc = self.n('TexCoord')
        mp = self.n('Mapping')
        self.link(tc.outputs[kind], mp.inputs['Vector'])
        mp.inputs['Scale'].default_value = scale
        mp.inputs['Rotation'].default_value = rot
        mp.inputs['Location'].default_value = loc
        return mp.outputs[0]

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

    def noise(self, vec=None, scale=5.0, detail=4.0, rough=0.5, distortion=0.0):
        n = self.n('TexNoise')
        if vec is not None:
            self.link(vec, n.inputs['Vector'])
        n.inputs['Scale'].default_value = scale
        n.inputs['Detail'].default_value = detail
        n.inputs['Roughness'].default_value = rough
        n.inputs['Distortion'].default_value = distortion
        return n.outputs['Fac']

    def ramp(self, fac, stops):
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
        n = self.n('Mix', {'data_type': 'RGBA', 'blend_type': blend})
        for idx, v in ((0, fac), (6, a), (7, b)):
            if isinstance(v, bpy.types.NodeSocket):
                self.link(v, n.inputs[idx])
            else:
                n.inputs[idx].default_value = rgba(v) if idx else v
        return n.outputs[2]

    def bump(self, height, strength=0.3, distance=0.001):
        n = self.n('Bump')
        self.link(height, n.inputs['Height'])
        n.inputs['Strength'].default_value = strength
        n.inputs['Distance'].default_value = distance
        return n.outputs[0]

    def principled(self, **ins):
        p = self.n('BsdfPrincipled', **ins)
        self.link(p.outputs[0], self.out.inputs['Surface'])
        return p

    # -- the two things every recipe shares -----------------------------------------------------------
    def dirt(self, amount):
        """Mask 0..1 from the room's one dirt group."""
        n = self.nt.nodes.new('ShaderNodeGroup')
        n.node_tree = _dirt_group()
        n.inputs['Amount'].default_value = amount
        return n.outputs['Mask']

    def finish(self, color, rough, wear=0.25, dirt=0.3, seed=0.0, scale=1.0, **ins):
        """Principled BSDF with wandering roughness and the shared dirt laid over the colour."""
        col = color if isinstance(color, bpy.types.NodeSocket) else rgba(color)
        r = rough
        if wear > 0 and not isinstance(rough, bpy.types.NodeSocket):
            v = self.coords('Object', scale=(3.0 * scale,) * 3, loc=(seed, seed * 1.7, seed * 0.3))
            s = self.ramp(self.noise(v, 1.0, 5.0, 0.65, 0.5), [(0.3, 0.0), (0.75, 1.0)])
            r = self.range(s, 0, 1, max(0.02, rough * (1 - 0.5 * wear)), min(1.0, rough * (1 + wear)))
        if dirt > 0:
            d = self.dirt(dirt)
            col = self.mix(d, col, DIRT['color'])
            r = self.math('ADD', r, self.math('MULTIPLY', d, 0.25), clamp=True)
        return self.principled(Base_Color=col, Roughness=r, **ins)


def _dirt_group():
    """The one dirt of the room: big soft blotches times fine speckle, in OBJECT space so it does not swim."""
    name = 'lr_dirt'
    if name in bpy.data.node_groups:
        return bpy.data.node_groups[name]
    nt = bpy.data.node_groups.new(name, 'ShaderNodeTree')
    nt.interface.new_socket('Amount', in_out='INPUT', socket_type='NodeSocketFloat')
    nt.interface.new_socket('Mask', in_out='OUTPUT', socket_type='NodeSocketFloat')
    gi, go = nt.nodes.new('NodeGroupInput'), nt.nodes.new('NodeGroupOutput')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    big = nt.nodes.new('ShaderNodeTexNoise')
    big.inputs['Scale'].default_value = DIRT['scale']
    big.inputs['Detail'].default_value = 5.0
    big.inputs['Roughness'].default_value = 0.6
    big.inputs['Distortion'].default_value = 0.6
    fine = nt.nodes.new('ShaderNodeTexNoise')
    fine.inputs['Scale'].default_value = DIRT['scale'] * 60
    fine.inputs['Detail'].default_value = 2.0
    nt.links.new(tc.outputs['Object'], big.inputs['Vector'])
    nt.links.new(tc.outputs['Object'], fine.inputs['Vector'])
    r1 = nt.nodes.new('ShaderNodeMapRange')
    r1.inputs[1].default_value, r1.inputs[2].default_value = 0.42, 0.78
    nt.links.new(big.outputs['Fac'], r1.inputs[0])
    r2 = nt.nodes.new('ShaderNodeMapRange')
    r2.inputs[1].default_value, r2.inputs[2].default_value, r2.inputs[3].default_value = 0.3, 0.8, 0.55
    nt.links.new(fine.outputs['Fac'], r2.inputs[0])
    m1 = nt.nodes.new('ShaderNodeMath')
    m1.operation = 'MULTIPLY'
    nt.links.new(r1.outputs[0], m1.inputs[0])
    nt.links.new(r2.outputs[0], m1.inputs[1])
    m2 = nt.nodes.new('ShaderNodeMath')
    m2.operation = 'MULTIPLY'
    m2.use_clamp = True
    nt.links.new(m1.outputs[0], m2.inputs[0])
    nt.links.new(gi.outputs['Amount'], m2.inputs[1])
    nt.links.new(m2.outputs[0], go.inputs['Mask'])
    return nt


# ---- recipes --------------------------------------------------------------------------------------
@cached
def paint(color, rough=0.5, dirt=0.3, wear=0.25, coat=0.0, seed=0.0):
    """Painted wood / metal / plaster, melamine board, a lacquered tin."""
    g = G(f'paint {color}')
    g.finish(color, rough, wear, dirt, seed, Coat_Weight=coat, Coat_Roughness=0.1)
    return g.m


@cached
def wall(color, rough=0.9, weave=1.0, dirt=0.35, seed=0.0):
    """Wallpaper or matt emulsion: a fine woven bump so the wall is not a flat fill, dirt where hands and dust go."""
    g = G(f'wall {color}')
    p = g.finish(color, rough, 0.1, dirt, seed, Specular_IOR_Level=0.25)
    if weave:
        a = g.noise(g.coords('Object', scale=(900, 900, 140)), 1.0, 2.0, 0.6)
        g.link(g.bump(a, 0.12 * weave, 0.0004), p.inputs['Normal'])
    return g.m


@cached
def wood(light='#a47848', dark='#6b4526', rough=0.45, axis='X', scale=1.0, coat=0.2, dirt=0.25, seed=0.0):
    """Planed, varnished or laminated wood with the grain along `axis`."""
    g = G(f'wood {light}')
    s = {'X': (1.5, 22, 22), 'Y': (22, 1.5, 22), 'Z': (22, 22, 1.5)}[axis]
    v = g.coords('Object', scale=tuple(k * scale for k in s), loc=(seed, seed, seed))
    n1 = g.noise(v, 3.0, 6.0, 0.6, 2.0)
    n2 = g.noise(g.coords('Object', scale=tuple(k * scale * 9 for k in s)), 2.0, 3.0, 0.5)
    f = g.math('ADD', g.math('MULTIPLY', n1, 0.75), g.math('MULTIPLY', n2, 0.25))
    col = g.ramp(f, [(0.3, dark), (0.7, light)])
    p = g.finish(col, rough, 0.2, dirt, seed, Coat_Weight=coat, Coat_Roughness=0.15)
    g.link(g.bump(f, 0.12, 0.0004), p.inputs['Normal'])
    return g.m


@cached
def planks(light='#c9a36a', dark='#a37c48', plank=(0.9, 0.11), rough=0.32, coat=0.5, gap=0.004, dirt=0.3, seed=0.0, along='Y'):
    """A floor of boards or printed sheet flooring: plank pattern in WORLD metres, a glossy wear layer on top."""
    g = G(f'planks {light}')
    rot = (0, 0, math.pi / 2) if along == 'Y' else (0, 0, 0)
    v = g.coords('Object', rot=rot)
    br = g.n('TexBrick', {'offset': 0.37, 'squash': 1.0})
    g.link(v, br.inputs['Vector'])
    br.inputs['Color1'].default_value = rgba(light)
    br.inputs['Color2'].default_value = rgba(dark)
    br.inputs['Mortar'].default_value = (0.05, 0.035, 0.02, 1)
    br.inputs['Scale'].default_value = 1.0
    br.inputs['Mortar Size'].default_value = gap / 2
    br.inputs['Mortar Smooth'].default_value = 0.4
    br.inputs['Bias'].default_value = 0.0
    br.inputs['Brick Width'].default_value = plank[0]
    br.inputs['Row Height'].default_value = plank[1]
    gr = g.noise(g.coords('Object', scale=(2.0, 34, 34) if along != 'Y' else (34, 2.0, 34), loc=(seed,) * 3), 3.0, 5.0, 0.6, 1.6)
    col = g.mix(g.range(gr, 0.3, 0.7, 0.0, 0.45), br.outputs['Color'], dark, 'MULTIPLY')
    p = g.finish(col, rough, 0.35, dirt, seed, 0.6, Coat_Weight=coat, Coat_Roughness=0.12)
    g.link(g.bump(br.outputs['Fac'], -0.25, 0.0006), p.inputs['Normal'])
    return g.m


@cached
def metal(color='#b8b8b8', rough=0.35, brushed=False, wear=0.3, dirt=0.15, seed=0.0):
    g = G(f'metal {color}')
    p = g.finish(color, rough, wear, dirt, seed, Metallic=1.0)
    if brushed:
        s = g.noise(g.coords('Object', scale=(2.0, 420, 420)), 6.0, 3.0, 0.7)
        g.link(g.bump(s, 0.08, 0.0002), p.inputs['Normal'])
    return g.m


@cached
def plastic(color, rough=0.42, dirt=0.2, wear=0.3, seed=0.0, sheen=0.0):
    """Moulded plastic: appliance shells, cassette cases, switch plates, toys."""
    g = G(f'plastic {color}')
    g.finish(color, rough, wear, dirt, seed, Sheen_Weight=sheen)
    return g.m


@cached
def rubber(color='#101012', rough=0.8):
    g = G(f'rubber {color}')
    g.finish(color, rough, 0.2, 0.25, Specular_IOR_Level=0.3)
    return g.m


@cached
def ceramic(color='#e9e4d8', rough=0.12, speckle=0.0, dirt=0.1, seed=0.0):
    """Glazed pottery and porcelain: a clear glaze over a body colour; speckle > 0 adds iron spots."""
    g = G(f'ceramic {color}')
    col = rgba(color)
    if speckle:
        sp = g.noise(g.coords('Object', scale=(260,) * 3, loc=(seed,) * 3), 1.0, 2.0, 0.5)
        col = g.mix(g.range(sp, 0.68, 0.74, 0.0, speckle), color, '#3a2a1c')
    g.finish(col, 0.55, 0.15, dirt, seed, Coat_Weight=1.0, Coat_Roughness=rough)
    return g.m


@cached
def fabric(color, rough=0.95, weave=1.0, sheen=0.4, dirt=0.2, seed=0.0, stripe=None, stripe_w=0.04):
    """Cotton, wool, towelling, a blanket. stripe = second colour for bands across object X."""
    g = G(f'fabric {color}')
    col = rgba(color)
    if stripe:
        w = g.n('TexWave', {'wave_type': 'BANDS', 'bands_direction': 'X'})
        g.link(g.coords('Object', scale=(1 / stripe_w / 6.283,) * 3), w.inputs['Vector'])
        w.inputs['Scale'].default_value = 6.283
        col = g.mix(g.range(w.outputs['Fac'], 0.45, 0.55, 0.0, 1.0), color, stripe)
    p = g.finish(col, rough, 0.1, dirt, seed, Sheen_Weight=sheen, Sheen_Roughness=0.5, Specular_IOR_Level=0.2)
    if weave:
        a = g.noise(g.coords('Object', scale=(1400, 1400, 1400)), 1.0, 2.0, 0.6)
        b = g.noise(g.coords('Object', scale=(40, 40, 40), loc=(seed,) * 3), 1.0, 3.0, 0.6)
        g.link(g.bump(g.math('ADD', g.math('MULTIPLY', a, 0.5), b), 0.35 * weave, 0.0012), p.inputs['Normal'])
    return g.m


@cached
def paper(color='#efe9da', rough=0.85, dirt=0.25, seed=0.0):
    g = G(f'paper {color}')
    g.finish(color, rough, 0.1, dirt, seed, Specular_IOR_Level=0.2)
    return g.m


@cached
def glass(tint='#ffffff', rough=0.0, ior=1.5, window=False, frost=0.0):
    """Clear glass. window=True lets light and shadow rays straight through (a pane does not need caustics, and a
    room lit through real refraction at 24 samples is noise). frost = roughness of a ground or steamed surface."""
    g = G(f'glass {tint}{"w" if window else ""}{frost}')
    p = g.n('BsdfPrincipled', Base_Color=rgba(tint), Roughness=max(rough, frost), IOR=ior, Transmission_Weight=1.0)
    if window:
        lp = g.n('LightPath')
        tr = g.n('BsdfTransparent', Color=rgba(tint))
        mx = g.n('MixShader')
        pick = g.math('MAXIMUM', lp.outputs['Is Shadow Ray'], lp.outputs['Is Diffuse Ray'])
        g.link(pick, mx.inputs[0])
        g.link(p.outputs[0], mx.inputs[1])
        g.link(tr.outputs[0], mx.inputs[2])
        g.link(mx.outputs[0], g.out.inputs['Surface'])
    else:
        g.link(p.outputs[0], g.out.inputs['Surface'])
    return g.m


@cached
def liquid(color='#7a5a20', ior=1.33):
    """Tea, water, oil seen through a bottle."""
    g = G(f'liquid {color}')
    g.principled(Base_Color=rgba(color), Roughness=0.0, IOR=ior, Transmission_Weight=0.92)
    return g.m


def emit(color, strength=5.0, name=None, off=None):
    """A surface that is a light: a bulb, an LED, a heater bar, a diffuser, a standby dot. `strength` 0 = switched
    off — and then it is still a thing: frosted glass, a grey quartz tube, a dark lens (`off` = its colour when off;
    default a pale version of its light). Not cached: its strength is animated or differs per version."""
    g = G(name or f'emit {color}')
    c = rgba(color)
    base = rgba(off) if off is not None else tuple(0.55 * x + 0.3 for x in c[:3]) + (1.0,)
    g.principled(Base_Color=base, Roughness=0.35, Emission_Color=c, Emission_Strength=strength)
    g.m['lr_emit'] = True
    return g.m


def emit_socket(m):
    """The strength socket of an emit() / picture(emission>0) material, for r.glow(), r.flicker(), r.blink()."""
    for n in m.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            return n.inputs['Emission Strength']
        if n.type == 'EMISSION':
            return n.inputs['Strength']
    raise ValueError(f'{m.name}: no emission in this material')


def to_image(name, pil):
    """A Pillow image → a Blender image held in memory (packed into the .blend when the room is saved)."""
    pil = pil.convert('RGBA')
    w, h = pil.size
    img = bpy.data.images.new(name, w, h, alpha=True)
    a = np.asarray(pil, np.float32)[::-1] / 255.0
    img.pixels.foreach_set(a.ravel())
    img.pack()
    return img


def picture(name, image, rough=0.5, emission=0.0, coat=0.0, dirt=0.0, repeat=False):
    """An image on a surface: a spine, a label, a poster, a page, a screen (emission > 0), the view outside.
    `image` is a Pillow image or a Blender image. The face it goes on needs UVs: Part.box(faces=…), sheet(image=…),
    lathe(label=…), slab(image=…)."""
    g = G(name)
    img = image if isinstance(image, bpy.types.Image) else to_image(name, image)
    t = g.n('TexImage', {'image': img, 'extension': 'REPEAT' if repeat else 'EXTEND'})
    g.link(g.coords('UV'), t.inputs['Vector'])
    col = t.outputs['Color']
    ins = dict(Coat_Weight=coat, Coat_Roughness=0.08)
    if emission:
        ins.update(Emission_Color=t.outputs['Color'], Emission_Strength=emission)
    g.finish(col, rough, 0.0, dirt, **ins)
    return g.m


def swap_image(m, image, name=None):
    """A second material like `m` showing another image (the next page of a screen)."""
    c = m.copy()
    c.name = name or m.name + '+'
    for n in c.node_tree.nodes:
        if n.type == 'TEX_IMAGE':
            n.image = image if isinstance(image, bpy.types.Image) else to_image(c.name, image)
    return c


def volume(name, density=0.02, color=(1, 1, 1), aniso=0.35):
    """Homogeneous haze for a box: the air that turns a window's light into a soft beam."""
    g = G(name)
    s = g.n('VolumeScatter', Color=rgba(color), Density=density, Anisotropy=aniso)
    g.link(s.outputs[0], g.out.inputs['Volume'])
    return g.m
