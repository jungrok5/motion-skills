"""The review scene (from the source workflow): grey floor, fixed camera, soft key + fill + rim light, flat grey-violet
backdrop. Plus the cameras for the turnaround / cast sheet. Cycles on the CPU, denoised, Standard view transform so
colours match the spec.
"""
import math
import bpy
from mathutils import Vector, Euler
from .materials import hex_rgb, srgb_to_linear


def setup_render(res=(1280, 720), samples=24):
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    s.cycles.device = 'CPU'
    s.cycles.samples = samples
    s.cycles.use_denoising = True
    try:
        s.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    s.cycles.max_bounces = 4
    s.cycles.diffuse_bounces = 2
    s.cycles.glossy_bounces = 2
    s.cycles.transmission_bounces = 2
    s.cycles.use_adaptive_sampling = True
    s.render.resolution_x, s.render.resolution_y = res
    s.render.resolution_percentage = 100
    s.render.film_transparent = False
    s.render.image_settings.file_format = 'PNG'
    s.view_settings.view_transform = 'Standard'
    s.view_settings.look = 'None'
    s.render.threads_mode = 'AUTO'


def world(color='#8c8ea0', strength=1.0):
    w = bpy.data.worlds.new('review') if not bpy.context.scene.world else bpy.context.scene.world
    bpy.context.scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value = (*srgb_to_linear(hex_rgb(color)), 1)
    bg.inputs['Strength'].default_value = strength


def floor(color='#77798a', grid='#6c6e80', size=120, step=0.25):
    """Grey floor with a faint grid (the review floor) that fades into the backdrop."""
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, 0))
    fl = bpy.context.active_object
    fl.name = 'floor'
    m = bpy.data.materials.new('floor')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.85
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs['Vector'])
    # grid lines every 0.25 m
    def line(axis):
        mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 1.0 / step
        nt.links.new(sep.outputs[axis], mul.inputs[0])
        fr = nt.nodes.new('ShaderNodeMath'); fr.operation = 'PINGPONG'; fr.inputs[1].default_value = 0.5
        nt.links.new(mul.outputs[0], fr.inputs[0])
        st = nt.nodes.new('ShaderNodeMath'); st.operation = 'LESS_THAN'; st.inputs[1].default_value = 0.02
        nt.links.new(fr.outputs[0], st.inputs[0])
        return st
    gx, gy = line('X'), line('Y')
    mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'
    nt.links.new(gx.outputs[0], mx.inputs[0]); nt.links.new(gy.outputs[0], mx.inputs[1])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    mix.inputs['A'].default_value = (*srgb_to_linear(hex_rgb(color)), 1)
    mix.inputs['B'].default_value = (*srgb_to_linear(hex_rgb(grid)), 1)
    nt.links.new(mx.outputs[0], mix.inputs['Factor'])
    nt.links.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
    fl.data.materials.append(m)
    return fl


def lights(target=(0, 0, 0.6), scale=1.0, H=1.1):
    """Fixed light (source step 7): a warm sun from the front left casting a long soft shadow back right, a cool
    fill and a rim. The camera orbits; these never move."""
    t = Vector(target)
    out = []
    k = (H / 1.1) ** 2
    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy = 3.2 * scale
    sun.angle = math.radians(6)
    sun.color = (1.0, 0.95, 0.86)
    so = bpy.data.objects.new('sun', sun)
    bpy.context.scene.collection.objects.link(so)
    so.rotation_euler = Euler((math.radians(55), 0, math.radians(-47)), 'XYZ')   # from the front left; shadow falls back right
    out.append(so)
    for name, loc, energy, size, col in (
        ('fill', (2.8, -2.2, 1.8), 60, 3.0, (0.86, 0.9, 1.0)),
        ('rim', (1.2, 3.0, 2.6), 120, 1.5, (1.0, 1.0, 1.0)),
    ):
        L = bpy.data.lights.new(name, 'AREA')
        loc = tuple(x * (H / 1.1) for x in loc)
        L.energy = energy * scale * k
        L.size = size
        L.color = col
        ob = bpy.data.objects.new(name, L)
        bpy.context.scene.collection.objects.link(ob)
        ob.location = loc
        d = (t - Vector(loc))
        ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        out.append(ob)
    return out


def camera(name, loc, target, lens=50):
    cam = bpy.data.cameras.new(name)
    cam.lens = lens
    cam.clip_start = 0.05
    ob = bpy.data.objects.new(name, cam)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return ob


def orbit_camera(name, target, yaw_deg, dist, height, lens=50):
    """A camera on a circle around target. yaw 0 = in front of a character facing -Y."""
    a = math.radians(yaw_deg)
    t = Vector(target)
    loc = t + Vector((math.sin(a) * dist, -math.cos(a) * dist, height))
    return camera(name, loc, t, lens)


def frame_dist(height_m, lens=50, fill=0.8, sensor=36, aspect=16 / 9):
    """Distance at which a subject height_m fills `fill` of the frame height."""
    # Blender fits the 36 mm sensor to the longer side: the height for a portrait frame
    vfov = 2 * math.atan(sensor / max(aspect, 1.0) / 2 / lens)
    return height_m / fill / 2 / math.tan(vfov / 2)
