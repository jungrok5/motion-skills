"""Materials: one Principled BSDF per colour, optional print texture drawn with numpy (so it exports to glTF
and looks the same in Cycles and in the three.js review player).

Patterns (spec "pattern": {...}): floral, dots, stripes, check, band. All tile seamlessly in u.
"""
import math
import bpy
import numpy as np
from . import paint as PT

_cache = {}


def hex_rgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def srgb_to_linear(c):
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def _image_from_array(name, arr):
    h, w, ch = arr.shape
    img = bpy.data.images.new(name, w, h, alpha=(ch == 4))
    rgba = np.ones((h, w, 4), np.float32)
    rgba[..., :ch] = arr
    img.pixels.foreach_set(rgba.ravel())
    img.pack()
    return img


def _blend(canvas, mask, col):
    m = np.clip(mask, 0, 1)[..., None]
    canvas[:] = canvas * (1 - m) + np.array(col, np.float32) * m


def draw_pattern(p, size=512):
    """Return an (H, W, 3) sRGB float array for a pattern spec."""
    kind = p.get('kind', 'dots')
    base = hex_rgb(p.get('base', '#222222'))
    ink = hex_rgb(p.get('ink', '#ffffff'))
    ink2 = hex_rgb(p.get('ink2', p.get('ink', '#ffffff')))
    scale = float(p.get('scale', 1.0))
    rng = np.random.default_rng(int(p.get('seed', 7)))
    H = W = size
    canvas = np.empty((H, W, 3), np.float32)
    canvas[:] = base
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

    def wrap_d(a, c, n):
        d = a - c
        return (d + n / 2) % n - n / 2

    if kind in ('floral', 'dots'):
        n = int(round(float(p.get('count', 9)) / scale))
        n = max(2, n)
        cells = []
        for gy in range(n):
            for gx in range(n):
                if (gx + gy) % 2 and kind == 'floral':
                    continue
                cells.append(((gx + 0.5 + rng.uniform(-.3, .3)) * W / n, (gy + 0.5 + rng.uniform(-.3, .3)) * H / n))
        for (cx, cy) in cells:
            dx, dy = wrap_d(xx, cx, W), wrap_d(yy, cy, H)
            if kind == 'dots':
                r = W / n * 0.18
                _blend(canvas, (r - np.hypot(dx, dy)) * 1.5, ink)
                continue
            R = W / n * float(p.get('flower', 0.55)) * rng.uniform(0.8, 1.15)
            rot = rng.uniform(0, math.tau)
            ang = np.arctan2(dy, dx) - rot
            rr = np.hypot(dx, dy)
            petals = int(p.get('petals', 5))
            # petal edge: r(theta) = R * (0.55 + 0.45 |cos(k theta / 2)|) with a notch
            edge = R * (0.42 + 0.58 * np.abs(np.cos(petals * ang / 2)) ** 0.7)
            _blend(canvas, (edge - rr) * 1.2, ink)
            _blend(canvas, (R * 0.17 - rr) * 1.5, ink2)
            # a few leaves / buds between flowers
            for _ in range(2):
                a2 = rng.uniform(0, math.tau)
                lx, ly = cx + math.cos(a2) * R * 1.35, cy + math.sin(a2) * R * 1.35
                ddx, ddy = wrap_d(xx, lx, W), wrap_d(yy, ly, H)
                _blend(canvas, (R * 0.12 - np.hypot(ddx, ddy)) * 1.5, ink)
    elif kind == 'stripes':
        cols = [hex_rgb(c) for c in p.get('colors', [p.get('base', '#222'), p.get('ink', '#fff')])]
        n = int(p.get('repeat', 8))
        axis = p.get('axis', 'v')     # 'v' = bands across v (horizontal rings on a lathe), 'u' = vertical
        t = (yy if axis == 'v' else xx) / H * n * len(cols)
        idx = np.floor(t).astype(int) % len(cols)
        for i, c in enumerate(cols):
            canvas[idx == i] = c
    elif kind == 'check':
        n = int(p.get('repeat', 8))
        a = ((np.floor(xx / W * n) + np.floor(yy / H * n)) % 2)
        _blend(canvas, a * 0.6, ink)
        line = (np.abs(((xx / W * n * 2) % 1) - 0.5) < 0.06) | (np.abs(((yy / H * n * 2) % 1) - 0.5) < 0.06)
        _blend(canvas, line.astype(np.float32) * 0.5, ink2)
    elif kind == 'band':
        # plain body, one band near the bottom of v (a hem band); 'at' and 'width' in 0..1 of v
        at, wd = float(p.get('at', 0.9)), float(p.get('width', 0.06))
        v = yy / H
        _blend(canvas, ((wd / 2 - np.abs(v - at)) * H * 0.8), ink)
        if 'ink2' in p:
            _blend(canvas, ((wd / 6 - np.abs(v - at)) * H * 0.8), ink2)
    return canvas


def material(spec, name=None):
    """spec: '#hex' or {"color": '#hex', "rough": .5, "sheen": .3, "pattern": {...}, "emit": 0}"""
    if isinstance(spec, str):
        spec = {'color': spec}
    key = repr(sorted(((k, repr(v)) for k, v in spec.items()), key=lambda kv: kv[0]))
    if key in _cache:
        return _cache[key]
    name = name or ('mat_' + spec.get('color', 'x').lstrip('#'))
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    col = hex_rgb(spec.get('color', '#cccccc'))
    bsdf.inputs['Base Color'].default_value = (*srgb_to_linear(col), 1)
    bsdf.inputs['Roughness'].default_value = float(spec.get('rough', 0.6))
    if 'Sheen Weight' in bsdf.inputs and spec.get('sheen'):
        bsdf.inputs['Sheen Weight'].default_value = float(spec['sheen'])
    if spec.get('coat'):
        bsdf.inputs['Coat Weight'].default_value = float(spec['coat'])
    if spec.get('sss'):
        bsdf.inputs['Subsurface Weight'].default_value = float(spec['sss'])
        bsdf.inputs['Subsurface Radius'].default_value = (0.4, 0.2, 0.15)
        bsdf.inputs['Subsurface Scale'].default_value = 0.01
    if spec.get('emit'):
        bsdf.inputs['Emission Color'].default_value = (*srgb_to_linear(col), 1)
        bsdf.inputs['Emission Strength'].default_value = float(spec['emit'])
    pnt = spec.get('paint')
    if pnt and spec.get('_uvs'):
        bsdf.inputs['Roughness'].default_value = float(spec.get('rough', 0.92))
        if 'Sheen Weight' in bsdf.inputs:
            bsdf.inputs['Sheen Weight'].default_value = 0.0
        arr = PT.draw(pnt, spec.get('color', '#cccccc'), spec['_uvs'])
        img = _image_from_array(name + '_paint', arr)
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = img
        tex.interpolation = 'Linear'
        tc = nt.nodes.new('ShaderNodeTexCoord')
        nt.links.new(tc.outputs['UV'], tex.inputs['Vector'])
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        if isinstance(pnt, dict) and pnt.get('fringe'):
            rnd = nt.nodes.new('ShaderNodeMath')
            rnd.operation = 'ROUND'                      # alpha clip at 0.5 (glTF: alphaMode MASK)
            nt.links.new(tex.outputs['Alpha'], rnd.inputs[0])
            nt.links.new(rnd.outputs[0], bsdf.inputs['Alpha'])
            try:
                m.surface_render_method = 'DITHERED'
            except AttributeError:
                m.blend_method = 'CLIP'
        pat = None
    else:
        pat = spec.get('pattern')
    if pat:
        pat = dict(pat)
        pat.setdefault('base', spec.get('color', '#222'))
        arr = draw_pattern(pat, int(pat.get('size', 512)))
        img = _image_from_array(name + '_print', arr)
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = img
        tex.interpolation = 'Linear'
        rep = pat.get('repeat_uv', [3, 2])
        mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (rep[0], rep[1], 1)
        tc = nt.nodes.new('ShaderNodeTexCoord')
        nt.links.new(tc.outputs['UV'], mp.inputs['Vector'])
        nt.links.new(mp.outputs['Vector'], tex.inputs['Vector'])
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    m.diffuse_color = (*srgb_to_linear(col), 1)
    _cache[key] = m
    return m


def assign(ob, spec, name=None):
    m = material(spec, name)
    ob.data.materials.clear()
    ob.data.materials.append(m)
    return m


def reset():
    _cache.clear()
