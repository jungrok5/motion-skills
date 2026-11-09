"""Light: the film is lit like a set. Every light is placed, sized and coloured on purpose; the world is black
unless a shot asks for a sky."""
import math

import bpy
from mathutils import Vector

from . import geo, mat
from .util import kelvin, rgba


def _col(color):
    if isinstance(color, (int, float)):
        return kelvin(color)                       # a number is a colour temperature
    return rgba(color)[:3]


def _aim(ob, target):
    d = Vector(target) - Vector(ob.location)
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = d.to_track_quat('-Z', 'Y')
    return ob


def area(name, loc, aim=(0, 0, 0), size=(1, 1), watts=100.0, color=5600, spread=180.0, visible=False, shape=None):
    """A softbox. Bigger = softer; `spread` < 180 turns it into a gridded box that does not spill."""
    l = bpy.data.lights.new(name, 'AREA')
    w, h = (size, size) if isinstance(size, (int, float)) else size
    l.shape = shape or ('RECTANGLE' if w != h else 'SQUARE')
    l.size, l.size_y = w, h
    l.energy = watts
    l.color = _col(color)
    l.spread = math.radians(spread)
    ob = geo.link(bpy.data.objects.new(name, l), loc=loc)
    ob.visible_camera = visible
    return _aim(ob, aim)


def spot(name, loc, aim=(0, 0, 0), watts=500.0, color=3200, angle=40.0, blend=0.3, radius=0.02):
    """A hard, aimed light: rim light, a beam through haze, a desk lamp. radius sets how soft its shadow edge is."""
    l = bpy.data.lights.new(name, 'SPOT')
    l.energy = watts
    l.color = _col(color)
    l.spot_size = math.radians(angle)
    l.spot_blend = blend
    l.shadow_soft_size = radius
    return _aim(geo.link(bpy.data.objects.new(name, l), loc=loc), aim)


def point(name, loc, watts=50.0, color=2700, radius=0.01):
    l = bpy.data.lights.new(name, 'POINT')
    l.energy = watts
    l.color = _col(color)
    l.shadow_soft_size = radius
    return geo.link(bpy.data.objects.new(name, l), loc=loc)


def sun(name='sun', elev=20.0, azim=0.0, strength=4.0, color=5200, angle=0.6):
    """A distant sun. elev/azim in degrees: azim 0 shines from +Y toward -Y, 90 from +X."""
    l = bpy.data.lights.new(name, 'SUN')
    l.energy = strength
    l.color = _col(color)
    l.angle = math.radians(angle)
    ob = geo.link(bpy.data.objects.new(name, l))
    e, a = math.radians(elev), math.radians(azim)
    d = Vector((math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), math.sin(e)))   # toward the sun
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = (-d).to_track_quat('-Z', 'Y')
    return ob


def panel(name, loc, aim=(0, 0, 0), size=(0.2, 2.0), strength=20.0, color=3200, falloff=0.0):
    """A glowing panel that is *in the picture*: the light strips of a studio, a window, a screen, a neon bar.
    It lights the scene and shows up in every reflection, which is what makes a dark set read as a place."""
    w, h = (size, size) if isinstance(size, (int, float)) else size
    ob = geo.plane(name, w, h, loc=loc, mat=mat.emit(name, _col(color), strength, falloff))
    return _aim(ob, aim)


def sky(scene, elev=8.0, azim=0.0, strength=0.25, sun_strength=1.0, air=1.0, dust=1.5, ozone=1.0, altitude=0.0,
        sun_size=0.545, sun_disc=True):
    """A physical sky (Nishita, multiple scattering) as the world: the low sun, the gradient, the colour of the hour.
    elev = sun height in degrees (2-10 = golden hour, below 0 = blue hour); azim as in sun()."""
    nt = scene.world.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg = nt.nodes.new('ShaderNodeBackground')
    sk = nt.nodes.new('ShaderNodeTexSky')
    sk.sky_type = 'MULTIPLE_SCATTERING'
    sk.sun_elevation = math.radians(elev)
    sk.sun_rotation = math.radians(azim)
    sk.sun_disc = sun_disc
    sk.sun_size = math.radians(sun_size)
    sk.sun_intensity = sun_strength
    sk.air_density = air
    sk.aerosol_density = dust
    sk.ozone_density = ozone
    sk.altitude = altitude
    bg.inputs['Strength'].default_value = strength
    nt.links.new(sk.outputs[0], bg.inputs['Color'])
    nt.links.new(bg.outputs[0], out.inputs['Surface'])
    return sk


def ambient(scene, color='#0a0e14', strength=1.0, top=None):
    """A flat (or bottom→top gradient) world colour: the fill that keeps shadows from going dead black."""
    nt = scene.world.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg = nt.nodes.new('ShaderNodeBackground')
    bg.inputs['Strength'].default_value = strength
    if top is None:
        bg.inputs['Color'].default_value = rgba(color)
    else:
        tc = nt.nodes.new('ShaderNodeTexCoord')
        sep = nt.nodes.new('ShaderNodeSeparateXYZ')
        ramp = nt.nodes.new('ShaderNodeValToRGB')
        mr = nt.nodes.new('ShaderNodeMapRange')
        nt.links.new(tc.outputs['Generated'], sep.inputs[0])
        nt.links.new(sep.outputs['Z'], mr.inputs[0])
        mr.inputs[1].default_value, mr.inputs[2].default_value = -0.2, 0.6
        nt.links.new(mr.outputs[0], ramp.inputs['Fac'])
        ramp.color_ramp.elements[0].color = rgba(color)
        ramp.color_ramp.elements[1].color = rgba(top)
        nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
    nt.links.new(bg.outputs[0], out.inputs['Surface'])
    return bg


def haze(name='haze', bounds=((-10, -10, 0), (10, 10, 6)), density=0.02, color=(1, 1, 1), aniso=0.4):
    """A box of thin, even haze. Lights shining through it get beams and a glow; distance gets depth.
    Keep density small (0.005-0.05 per metre) and the box no bigger than the set."""
    (x0, y0, z0), (x1, y1, z1) = bounds
    ob = geo.box(name, (x1 - x0, y1 - y0, z1 - z0), loc=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2),
                 mat=mat.volume(name, density, color, aniso))
    ob.visible_shadow = False
    return ob
