"""pf — photoreal film kit. Procedural models, materials, light and lens for Blender Cycles, driven from Python.

    from pf import geo, mat, light, util          # in a shot:  def build(s): …

geo / mat / light / film / scene need Blender's Python module (pip install bpy, or run inside Blender);
util / finish / exr / sound run on plain Python with numpy (+ Pillow for finish).
"""
from . import util  # noqa: F401
from .util import (back_out, clamp, ease_in, ease_in_out, ease_out, expo_in, expo_out, fbm1, hexcol, kelvin, lerp,  # noqa: F401
                   noise1, pulse, remap, rng, seg, smooth, smoother, spring)

try:
    import bpy  # noqa: F401
    from . import film, geo, light, mat, scene  # noqa: F401
except ImportError:                                   # finish / sound / check do not need Blender
    pass

__version__ = '1.0'
