"""Scene reset and the fixed render settings: Cycles path tracing, motion blur from the camera's own movement,
linear EXR out (the look is made afterwards in lr.finish, so exposure and grade can change without re-rendering)."""
import os

import bpy

from . import mat

# One table decides what a frame costs. `scale` multiplies the film size; `thr` is the adaptive-sampling noise
# threshold. A night interior lit by a few small lamps is the hard case for a path tracer: judge the previews by
# what the denoiser leaves, not by sample counts.
QUALITY = {
    'draft':   dict(spp=10,  scale=0.25, thr=0.2),     # seconds: is the layout right, is anything in the way?
    'preview': dict(spp=24,  scale=0.5,  thr=0.08),    # light, exposure, where the eye goes
    'final':   dict(spp=48,  scale=1.0,  thr=0.04),    # the film (with a GPU)
    'hero':    dict(spp=192, scale=1.0,  thr=0.012),   # single stills
}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'
    mat.reset()
    return bpy.context.scene


def setup(scene, size=(1920, 1080), fps=24, quality='final', spp=None, scale=None, shutter=0.5, motion_blur=True,
          threads=0, volume=False):
    q = dict(QUALITY[quality])
    if spp:
        q['spp'] = spp
    if scale:
        q['scale'] = scale
    r = scene.render
    r.engine = 'CYCLES'
    r.resolution_x, r.resolution_y = size
    r.resolution_percentage = max(1, round(q['scale'] * 100))
    r.fps = fps
    r.use_motion_blur = motion_blur
    r.motion_blur_shutter = shutter
    r.motion_blur_position = 'CENTER'
    r.film_transparent = False
    r.use_persistent_data = True                # the room does not change between frames: keep its BVH
    if threads:
        r.threads_mode = 'FIXED'
        r.threads = threads
    c = scene.cycles
    c.device = 'CPU'
    try:                                        # a GPU, when Blender can see one
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for kind in ('OPTIX', 'CUDA', 'METAL', 'HIP', 'ONEAPI'):
            try:
                prefs.compute_device_type = kind
                prefs.get_devices()
                gpus = [d for d in prefs.devices if d.type == kind]
                if gpus:
                    for d in prefs.devices:
                        d.use = d.type == kind
                    c.device = 'GPU'
                    break
            except Exception:
                continue
    except Exception:
        pass
    c.samples = q['spp']
    c.use_adaptive_sampling = True
    c.adaptive_threshold = q['thr']
    c.adaptive_min_samples = max(4, q['spp'] // 3)
    c.use_denoising = True
    c.denoiser = 'OPENIMAGEDENOISE'
    c.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
    c.denoising_prefilter = 'ACCURATE' if quality in ('final', 'hero') else 'FAST'
    c.use_light_tree = True
    c.max_bounces = 8
    c.diffuse_bounces = 3                       # a small room is lit mostly by its own walls
    c.glossy_bounces = 4
    c.transmission_bounces = 8
    c.volume_bounces = 0
    c.transparent_max_bounces = 8
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.blur_glossy = 0.8
    c.sample_clamp_direct = 0.0
    c.sample_clamp_indirect = 4.0               # fireflies from small lamps would sparkle from frame to frame
    c.filter_width = 1.5
    c.use_animated_seed = False                 # the seed is set from the frame number at render time
    c.volume_step_rate = 4.0 if volume else 1.0
    im = r.image_settings
    if hasattr(im, 'media_type'):
        im.media_type = 'IMAGE'
    im.file_format = 'OPEN_EXR'
    im.color_mode = 'RGB'
    im.color_depth = '16'
    im.exr_codec = 'ZIP'
    scene.view_settings.view_transform = 'Standard'
    if scene.world is None:
        scene.world = bpy.data.worlds.new('world')
    world(scene, '#000000', 0.0)
    return q


def world(scene, color='#000000', strength=0.0):
    """The world behind everything. Black by default: a room is lit by what is in it and what is outside its
    window, never by an invisible dome."""
    from .util import rgba
    nt = scene.world.node_tree
    if nt is None:
        scene.world.use_nodes = True
        nt = scene.world.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg = nt.nodes.new('ShaderNodeBackground')
    bg.inputs['Color'].default_value = rgba(color)
    bg.inputs['Strength'].default_value = strength
    nt.links.new(bg.outputs[0], out.inputs['Surface'])
    return bg


def render(scene, frame, path, seed=0):
    """Render one frame to a linear EXR. Written to a temp name first so a killed render never leaves half a file."""
    scene.frame_set(frame)
    scene.cycles.seed = (seed * 7919 + frame * 104729) % 2147483647
    tmp = path[:-4] + '.part.exr'
    scene.render.filepath = tmp
    bpy.ops.render.render(write_still=True)
    os.replace(tmp, path)
    return path
