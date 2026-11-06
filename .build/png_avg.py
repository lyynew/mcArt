# -*- coding: utf-8 -*-
"""解码原版贴图，算平均色，供色板使用。支持 1/2/4/8 位深与调色板/灰度/真彩/带 alpha。"""
import os, zlib, struct

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(os.path.dirname(HERE), "原版材质")

def read_png(path):
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    p = 8
    w = h = bd = ct = 0
    idat = bytearray(); plte = None; trns = None
    while p < len(data):
        ln = struct.unpack_from(">I", data, p)[0]
        typ = data[p + 4:p + 8]
        chunk = data[p + 8:p + 8 + ln]
        p += 12 + ln
        if typ == b"IHDR":
            w, h, bd, ct, comp, filt, inter = struct.unpack(">IIBBBBB", chunk)
            if inter:
                raise ValueError("interlaced")
        elif typ == b"PLTE":
            plte = chunk
        elif typ == b"tRNS":
            trns = chunk
        elif typ == b"IDAT":
            idat += chunk
        elif typ == b"IEND":
            break
    nch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ct]
    bpp = max(1, (nch * bd) // 8)
    stride = (w * nch * bd + 7) // 8
    raw = zlib.decompress(bytes(idat))
    out = bytearray(h * stride)
    prev = bytearray(stride)
    pos = 0
    for y in range(h):
        ft = raw[pos]; pos += 1
        line = bytearray(raw[pos:pos + stride]); pos += stride
        if ft == 1:
            for i in range(bpp, stride):
                line[i] = (line[i] + line[i - bpp]) & 255
        elif ft == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 255
        elif ft == 3:
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif ft == 4:
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0
                b = prev[i]
                c = prev[i - bpp] if i >= bpp else 0
                pp = a + b - c
                pa, pb, pc = abs(pp - a), abs(pp - b), abs(pp - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out[y * stride:(y + 1) * stride] = line
        prev = line

    def px_rgba(x, y):
        row = y * stride
        if bd < 8:
            bit = x * bd
            byte = out[row + (bit >> 3)]
            shift = 8 - bd - (bit & 7)
            v = (byte >> shift) & ((1 << bd) - 1)
            if ct == 3:
                idx = v
                R, G, B = plte[idx * 3], plte[idx * 3 + 1], plte[idx * 3 + 2]
                A = trns[idx] if trns and idx < len(trns) else 255
                return R, G, B, A
            g = v * 255 // ((1 << bd) - 1)
            return g, g, g, 255
        if bd == 16:
            i = row + x * nch * 2
            def s16(o): return out[i + o * 2] << 8 | out[i + o * 2 + 1]
            if ct == 2:
                return s16(0) >> 8, s16(1) >> 8, s16(2) >> 8, 255
            if ct == 6:
                return s16(0) >> 8, s16(1) >> 8, s16(2) >> 8, s16(3) >> 8
            g = s16(0) >> 8
            return g, g, g, (s16(1) >> 8) if ct == 4 else 255
        i = row + x * nch
        if ct == 3:
            idx = out[i]
            R, G, B = plte[idx * 3], plte[idx * 3 + 1], plte[idx * 3 + 2]
            A = trns[idx] if trns and idx < len(trns) else 255
            return R, G, B, A
        if ct in (0, 4):
            g = out[i]
            return g, g, g, out[i + 1] if ct == 4 else 255
        if ct == 2:
            return out[i], out[i + 1], out[i + 2], 255
        return out[i], out[i + 1], out[i + 2], out[i + 3]

    return w, h, px_rgba

def avg_color(path, rows=None):
    w, h, get = read_png(path)
    rows = min(h, w) if rows is None else rows
    r = g = b = n = 0
    for y in range(rows):
        for x in range(w):
            R, G, B, A = get(x, y)
            if A < 128:
                continue
            r += R; g += G; b += B; n += 1
    if not n:
        return (255, 0, 255)
    return (round(r / n), round(g / n), round(b / n))

def find_tex(bid):
    for c in [bid, bid + "_side", bid + "_top"]:
        if os.path.exists(os.path.join(TEX, c + ".png")):
            return c
    return None

if __name__ == "__main__":
    for f in ["white_concrete", "quartz_block_side", "snow", "magma", "black_concrete", "gold_block", "honeycomb_block"]:
        p = os.path.join(TEX, f + ".png")
        if os.path.exists(p):
            print("%-22s #%02X%02X%02X  %s" % (f, *avg_color(p), read_png(p)[2](1, 1)))
