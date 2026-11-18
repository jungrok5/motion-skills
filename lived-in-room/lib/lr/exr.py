"""Minimal OpenEXR reader (scanline, NONE / ZIPS / ZIP compression, half / float channels) in numpy.
Enough for what Blender writes with exr_codec='ZIP'; keeps the finish step free of bpy and of any extra package."""
import struct
import zlib

import numpy as np


def read(path):
    """→ (dict name → float32 array (H, W), (W, H)). Channel names as in the file: 'R', 'G', 'B', 'A' …"""
    with open(path, 'rb') as fh:
        buf = fh.read()
    if buf[:4] != b'\x76\x2f\x31\x01':
        raise ValueError(f'{path}: not an OpenEXR file')
    version = struct.unpack_from('<I', buf, 4)[0]
    if version & 0x1A00:
        raise ValueError(f'{path}: tiled / multipart / deep EXR is not supported (render with exr_codec ZIP, single layer)')
    pos = 8
    attrs = {}
    while buf[pos] != 0:
        e = buf.index(b'\0', pos)
        name = buf[pos:e].decode()
        pos = e + 1
        e = buf.index(b'\0', pos)
        typ = buf[pos:e].decode()
        pos = e + 1
        size = struct.unpack_from('<i', buf, pos)[0]
        pos += 4
        attrs[name] = (typ, buf[pos:pos + size])
        pos += size
    pos += 1
    chans = []
    cb = attrs['channels'][1]
    p = 0
    while cb[p] != 0:
        e = cb.index(b'\0', p)
        nm = cb[p:e].decode()
        ptype, _lin, xs, ys = struct.unpack_from('<iB3xii', cb, e + 1)
        chans.append((nm, ptype))
        p = e + 1 + 16
    comp = attrs['compression'][1][0]
    x0, y0, x1, y1 = struct.unpack('<4i', attrs['dataWindow'][1])
    W, H = x1 - x0 + 1, y1 - y0 + 1
    if comp not in (0, 2, 3):
        raise ValueError(f'{path}: EXR compression {comp} is not supported (use ZIP)')
    per_block = {0: 1, 2: 1, 3: 16}[comp]
    nblocks = (H + per_block - 1) // per_block
    offsets = struct.unpack_from(f'<{nblocks}Q', buf, pos)
    bps = {0: 4, 1: 2, 2: 4}
    dt = {0: '<u4', 1: '<f2', 2: '<f4'}
    line_bytes = sum(bps[t] for _, t in chans) * W
    out = {nm: np.empty((H, W), np.float32) for nm, _ in chans}
    for off in offsets:
        y, size = struct.unpack_from('<ii', buf, off)
        data = buf[off + 8:off + 8 + size]
        lines = min(per_block, y1 - y + 1)
        want = line_bytes * lines
        if comp and size < want:
            raw = np.frombuffer(zlib.decompress(data), np.uint8)
            t = (np.cumsum(raw.astype(np.int64)) - 128 * np.arange(len(raw))) & 255     # undo the delta predictor
            t = t.astype(np.uint8)
            half = (len(t) + 1) // 2
            d = np.empty(len(t), np.uint8)
            d[0::2] = t[:half]                                                           # undo the byte interleave
            d[1::2] = t[half:]
            data = d.tobytes()
        p = 0
        for ln in range(lines):
            row = y - y0 + ln
            for nm, t in chans:
                n = W * bps[t]
                out[nm][row] = np.frombuffer(data, dt[t], W, p)
                p += n
    return out, (W, H)


def read_rgb(path):
    """→ float32 (H, W, 3), linear Rec.709, top row first."""
    ch, _ = read(path)
    keys = {k.split('.')[-1]: k for k in ch}
    return np.stack([ch[keys['R']], ch[keys['G']], ch[keys['B']]], -1)
