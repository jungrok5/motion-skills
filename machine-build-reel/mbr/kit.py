"""The kit a project's build(k) uses to make parts.

    m = k.mesh()                         # a geom.Mesh
    m.taper(...); m.cyl(...)             # build in the bone's local frame (Y along the bone, X = pin, Z = front)
    k.part('Hull', m, bone='body', mats=('shell', 'frame'), stage=3, frame='body')

Every part rides on exactly one bone (rigid), carries its material roles, an assembly `stage` (the order the parts
arrive in the assembly shot: 0 feet ... 8 lights) and a bevel (chamfer, metres). `frame` says which space the mesh
was built in: 'bone' (default, the bone's rest frame), 'body' (body space: X forward, Y left, Z up, origin at the
body point) or 'world', or a Matrix.

Identical meshes are shared (`share='key'`): the four legs' copies cost one mesh in memory and in the .glb.
"""
import math
import bpy
from mathutils import Matrix, Vector
from .geom import Mesh

STAGES = {'feet': 0, 'lower': 1, 'upper': 2, 'body': 3, 'hydraulics': 4, 'shells': 5, 'neck': 6, 'head': 7, 'lights': 8}


class Kit:
    def __init__(self, M, kin, W_rest, palette, coll):
        self.M = M
        self.kin = kin
        self.W = W_rest           # bone -> rest world matrix
        self.pal = palette
        self.coll = coll
        self.parts = []           # dicts: name, obj, bone, stage, mats
        self._shared = {}
        self.Bm = W_rest['body']

    def mesh(self):
        return Mesh()

    @staticmethod
    def st(name):
        return STAGES[name]

    def frame(self, which):
        if isinstance(which, Matrix):
            return which
        if which == 'world':
            return Matrix.Identity(4)
        if which == 'body':
            return self.W['body']
        return self.W[which]

    def part(self, name, mesh, bone, mats=('frame',), stage=2, frame='bone', bevel=0.0, share=None, M=None,
             smooth_deg=35.0, tags=()):
        """Add a rigid part on `bone`. mesh: a geom.Mesh (or a bpy Mesh to share). Returns the object."""
        if bone not in self.kin.parent:
            raise KeyError(f'part {name}: no bone {bone!r}')
        if name in self.kin.parent:
            raise ValueError(f'part {name}: a part may not share a name with a bone')
        if any(p['name'] == name for p in self.parts):
            raise ValueError(f'two parts named {name!r}')
        F = self.frame(bone if frame == 'bone' else frame)
        if share and share in self._shared:
            me = self._shared[share]
        elif isinstance(mesh, bpy.types.Mesh):
            me = mesh
        else:
            if not mesh.v:
                raise ValueError(f'part {name}: empty mesh')
            me = mesh.make('ME_' + (share or name), smooth_deg)
            for r in mats:
                me.materials.append(self.pal[r])
            if share:
                self._shared[share] = me
        ob = bpy.data.objects.new(name, me)
        self.coll.objects.link(ob)
        Wp = F @ (M or Matrix.Identity(4))
        ob['rest_world'] = [list(r) for r in Wp]
        ob['bone'] = bone
        ob['stage'] = stage
        ob['mats'] = list(mats)
        if bevel > 0:
            md = ob.modifiers.new('Bevel', 'BEVEL')
            md.width = bevel
            md.segments = 2
            md.limit_method = 'ANGLE'
            md.angle_limit = math.radians(40)
            md.harden_normals = False
            md.use_clamp_overlap = True
        self.parts.append(dict(name=name, obj=ob, bone=bone, stage=stage, mats=list(mats), tags=list(tags)))
        return ob

    # ---- helpers for placing things ------------------------------------------------------------------------------
    def local(self, bone, p_world):
        """A rest-pose world point in a bone's local frame."""
        return self.W[bone].inverted() @ Vector(p_world)

    def body_local(self, p_world):
        return self.W['body'].inverted() @ Vector(p_world)

    def bone_len(self, bone):
        return self.kin.length[bone]
