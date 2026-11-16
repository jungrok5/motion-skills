"""lr — lived-in-room: a real-scale room built from numbers in Blender (bpy), every thing in it registered with how
it is held up, measured for floating and intersection, filmed as a hand-held walk at two hours of the day.

    from lr import geo, mat, draw, kit        # in props.py / skeleton.py / layout.py / film.py
"""
from . import util  # noqa: F401

__all__ = ['geo', 'mat', 'draw', 'kit', 'phys', 'audit', 'room', 'shoot', 'scene', 'finish', 'exr', 'project', 'util']
