"""Scene reset and the fixed render settings: Cycles path tracing, physical motion blur, linear EXR out."""
import bpy

# One table decides the cost of a frame. `scale` multiplies the film size; `thr` is the adaptive-sampling noise threshold.
QUALITY = {
    'draft':   dict(spp=10,  scale=0.25, thr=0.2),    # ~1-3 s : is the composition right?
    'preview': dict(spp=24,  scale=0.5,  thr=0.08),   # ~5 s   : light, focus, materials
    'final':   dict(spp=40,  scale=1.0,  thr=0.03),   # the film
    'hero':    dict(spp=256, scale=1.0,  thr=0.008),  # single stills for posters and plates
}


def reset():
    """Empty file, linear keyframes (every animated value is baked per frame, see Shot.animate)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'
    return bpy.context.scene


def setup(scene, size=(1920, 804), fps=24, quality='final', spp=None, scale=None, shutter=0.5,
          motion_blur=True, threads=0):
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
    r.motion_blur_shutter = shutter            # 0.5 = the 180° shutter of a film camera
    r.motion_blur_position = 'CENTER'
    r.film_transparent = False
    r.use_persistent_data = False
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
    c.adaptive_min_samples = max(4, q['spp'] // 4)
    c.use_denoising = True
    c.denoiser = 'OPENIMAGEDENOISE'
    c.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
    c.denoising_prefilter = 'ACCURATE' if quality in ('final', 'hero') else 'FAST'
    c.use_light_tree = True
    c.max_bounces = 12
    c.diffuse_bounces = 3
    c.glossy_bounces = 6
    c.transmission_bounces = 12                 # a lens is six glasses deep: 12 surfaces
    c.volume_bounces = 0
    c.transparent_max_bounces = 8
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.blur_glossy = 0.6
    c.sample_clamp_direct = 0.0                 # keep real highlights: bloom and halation need them
    c.sample_clamp_indirect = 6.0               # but not fireflies
    c.filter_width = 1.5
    c.use_animated_seed = False                 # the seed is set from the frame number at render time
    c.volume_step_rate = 2.0

    im = r.image_settings
    if hasattr(im, 'media_type'):
        im.media_type = 'IMAGE'
    im.file_format = 'OPEN_EXR'
    im.color_mode = 'RGB'
    im.color_depth = '16'
    im.exr_codec = 'ZIP'
    scene.view_settings.view_transform = 'Standard'   # ignored by the linear EXR; the look is made in pf.finish
    if scene.world is None:
        scene.world = bpy.data.worlds.new('world')
    black_world(scene)
    return q


def black_world(scene):
    """A black world: nothing lights the scene that the shot did not put there."""
    nt = scene.world.node_tree
    if nt is None:
        scene.world.use_nodes = True
        nt = scene.world.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg = nt.nodes.new('ShaderNodeBackground')
    bg.inputs['Color'].default_value = (0, 0, 0, 1)
    bg.inputs['Strength'].default_value = 0.0
    nt.links.new(bg.outputs[0], out.inputs['Surface'])
    return nt


def render(scene, frame, path, seed=0):
    """Render one frame to a linear EXR. Written to a temp name first so a killed render never leaves half a file."""
    import os
    scene.frame_set(frame)
    scene.cycles.seed = (seed * 7919 + frame * 104729) % 2147483647
    tmp = path[:-4] + '.part.exr'
    scene.render.filepath = tmp
    bpy.ops.render.render(write_still=True)
    os.replace(tmp, path)
    return path
