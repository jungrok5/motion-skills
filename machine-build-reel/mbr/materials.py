"""Materials: Principled BSDF presets for Cycles, all procedural (no image files), so glTF gets the base values.

A machine's palette maps *roles* to presets. Parts ask for roles ('shell', 'frame', 'metal', 'steel', 'rubber',
'joint', 'cable', 'glass', 'light', 'accent', 'paint'), never for colours, so a new topic re-colours the whole
machine from one `palette` dict:

    palette = {'shell': ('ceramic', '#e9e7e2'), 'frame': ('carbon', '#141516'), 'light': ('emit', '#2a6dff', 6.0)}

Preset kinds: ceramic, paint, carbon, graphite, steel, galvanized, rubber, glass, emit, plastic.
"""
import bpy

DEFAULT_PALETTE = {
    'shell': ('ceramic', '#e8e6e1'),
    'frame': ('carbon', '#141517'),
    'metal': ('graphite', '#2b2d31'),
    'steel': ('steel', '#c9ccd1'),
    'joint': ('graphite', '#3a3c40'),
    'rubber': ('rubber', '#121212'),
    'cable': ('rubber', '#1a1a1b'),
    'accent': ('paint', '#b8b4ab'),
    'glass': ('glass', '#0b0e14'),
    'light': ('emit', '#2f6bff', 8.0),
}


def hex2rgb(h):
    h = h.lstrip('#')
    s = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in s]


def _principled(name, rgb, rough, metal=0.0, coat=0.0, spec=0.5, noise=0.0, scale=3.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if 'Coat Weight' in b.inputs:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = 0.12
    if 'Specular IOR Level' in b.inputs:
        b.inputs['Specular IOR Level'].default_value = spec
    if noise > 0:
        # subtle roughness breakup in object space: surfaces read as made, not CG-perfect
        tc = nt.nodes.new('ShaderNodeTexCoord')
        nz = nt.nodes.new('ShaderNodeTexNoise')
        nz.inputs['Scale'].default_value = scale
        nz.inputs['Detail'].default_value = 6.0
        mr = nt.nodes.new('ShaderNodeMapRange')
        mr.inputs['To Min'].default_value = max(0.02, rough - noise)
        mr.inputs['To Max'].default_value = min(1.0, rough + noise)
        nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
        nt.links.new(nz.outputs['Fac'], mr.inputs['Value'])
        nt.links.new(mr.outputs['Result'], b.inputs['Roughness'])
    return m


def make(role, spec, tag=''):
    kind, col = spec[0], spec[1]
    rgb = hex2rgb(col)
    name = f'M_{tag}{role}'
    if kind == 'ceramic':
        m = _principled(name, rgb, 0.32, coat=0.35, noise=0.08, scale=1.6)
    elif kind == 'paint':
        m = _principled(name, rgb, 0.42, noise=0.12, scale=2.5)
    elif kind == 'plastic':
        m = _principled(name, rgb, 0.5, noise=0.06)
    elif kind == 'carbon':
        m = _principled(name, rgb, 0.5, metal=0.0, coat=0.15, noise=0.1, scale=6)
    elif kind == 'graphite':
        m = _principled(name, rgb, 0.38, metal=0.85, noise=0.1, scale=5)
    elif kind == 'steel':
        m = _principled(name, rgb, 0.16, metal=1.0, noise=0.05, scale=8)
    elif kind == 'galvanized':
        m = _principled(name, rgb, 0.45, metal=0.9, noise=0.2, scale=1.2)
    elif kind == 'rubber':
        m = _principled(name, rgb, 0.78, noise=0.05)
    elif kind == 'glass':
        m = _principled(name, rgb, 0.05, coat=1.0, spec=0.8)
    elif kind == 'emit':
        strength = spec[2] if len(spec) > 2 else 6.0
        m = _principled(name, [c * 0.2 for c in rgb], 0.3)
        b = m.node_tree.nodes.get('Principled BSDF')
        b.inputs['Emission Color'].default_value = (*rgb, 1)
        b.inputs['Emission Strength'].default_value = strength
        m['emit_full'] = strength
    else:
        raise ValueError(f'unknown material kind {kind!r} for role {role!r}')
    m['role'] = role
    m['kind'] = kind
    return m


class Palette:
    """role -> bpy material, created on first use."""

    def __init__(self, palette=None, tag=''):
        self.spec = dict(DEFAULT_PALETTE)
        self.spec.update(palette or {})
        self.tag = tag
        self.mats = {}

    def __getitem__(self, role):
        if role not in self.mats:
            if role not in self.spec:
                raise KeyError(f'palette has no role {role!r} (roles: {sorted(self.spec)})')
            self.mats[role] = make(role, self.spec[role], self.tag)
        return self.mats[role]

    def set_light(self, level):
        """0 = off, 1 = full. Every 'emit' material follows (sensor lights, beacons)."""
        for m in self.mats.values():
            if m.get('kind') == 'emit':
                b = m.node_tree.nodes.get('Principled BSDF')
                b.inputs['Emission Strength'].default_value = m['emit_full'] * max(0.0, level)
