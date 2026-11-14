/**
 * 离线批量渲染「方块物品栏图标」——不引入任何第三方素材。
 *
 *   node scripts/build-block-icons.mjs                    # 全量
 *   node scripts/build-block-icons.mjs --jar <路径>        # 指定客户端 jar
 *   node scripts/build-block-icons.mjs --sample a,b,c      # 只渲几个，输出到 .build/
 *
 * 为什么要有这个脚本：原版客户端里**没有**现成的 3D 方块图标 PNG，游戏是在运行时
 * 按 assets/minecraft/models/block/*.json + blockstates/*.json 实时渲染物品栏图标的。
 * 浏览器里拿三张面贴图硬拼成实心立方体，只对完整立方体成立；台阶、楼梯、玻璃、
 * 酿造台、花草这些全是别的形状。这里在**离线**把官方模型展开成 elements，
 * 用 2:1 等轴正交投影逐面光栅化成 32×32 透明 PNG，运行时只贴图、不再拼接。
 *
 * 输入全部是项目自己已有的官方客户端资源（jar 里的模型/blockstates + 原版材质/ 贴图），
 * 不下载、不打包任何第三方图片，授权链与现有 1303 张贴图完全一致。
 * 产出 原版材质-icons/<block id>.png，再由 sync-textures.mjs 同步进静态目录。
 *
 * 视角与明暗对齐 Minecraft Wiki 的标准化渲染规范（Help:Isometric_renders）：
 * 45° / 60° dimetric、顶 98% / 左 80% / 右 60.8%、无抗锯齿、透明背景。
 *
 * 零外部依赖：PNG 解码/编码、仿射光栅化全部手写，只用 Node 内置 zlib。
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync, inflateSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const argOf = (n) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : undefined
}
const VERSION = argOf('--version') ?? '26.3'
const SAMPLE = argOf('--sample')

const OUT_DIR = SAMPLE
  ? join(root, '.build', 'icon-research', 'proto')
  : join(root, '原版材质-icons')
const TMP = join(root, '.build', `mc-models-${VERSION.replace(/\./g, '')}`)

function findJar() {
  const explicit = argOf('--jar') ?? process.env.MC_JAR
  if (explicit) {
    if (!existsSync(explicit)) throw new Error(`指定的 jar 不存在：${explicit}`)
    return explicit
  }
  const appdata = process.env.APPDATA ?? ''
  const candidates = [
    join(appdata, '.minecraft', 'versions', VERSION, `${VERSION}.jar`),
    join(tmpdir(), `mc${VERSION.replace(/\./g, '')}-client.jar`),
    join(appdata, '.minecraft', 'versions', VERSION, 'client.jar'),
  ]
  for (const p of candidates) if (existsSync(p)) return p
  throw new Error(`没找到 ${VERSION} 客户端 jar，请用 --jar 指定`)
}

/* ---------------------------------------------------------------- PNG 编解码 */

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

/** 8-bit 非隔行 PNG，支持灰度 / RGB / 索引色 / 灰度+alpha / RGBA */
function decodePng(buf) {
  if (buf.toString('hex', 0, 8) !== '89504e470d0a1a0a') throw new Error('不是 PNG')
  let off = 8
  let w = 0
  let h = 0
  let bitDepth = 0
  let colorType = -1
  let palette = null
  let trns = null
  const idat = []
  while (off + 12 <= buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') {
      w = data.readUInt32BE(0)
      h = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      if (data[12] !== 0) throw new Error('不支持隔行 PNG')
    } else if (type === 'PLTE') palette = data
    else if (type === 'tRNS') trns = data
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    off += 12 + len
  }
  if (colorType < 0) throw new Error(`不支持的色型 ${colorType}`)
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType]
  if (!channels) throw new Error(`不支持的色型 ${colorType}`)
  // 原版贴图里有 4-bit 索引色 PNG，行数据是逐像素打包的，先 unfilter 再 unpack
  if (bitDepth !== 8 && !(colorType === 3 && [1, 2, 4].includes(bitDepth))) {
    throw new Error(`不支持的 PNG 位深/色型 ${bitDepth}/${colorType}`)
  }
  const filterBpp = Math.max(1, Math.ceil((channels * bitDepth) / 8))
  const stride = Math.ceil((w * channels * bitDepth) / 8)
  const raw = inflateSync(Buffer.concat(idat))
  const lines = Buffer.alloc(h * stride)
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)]
    const src = y * (stride + 1) + 1
    const dst = y * stride
    const prev = (y - 1) * stride
    for (let x = 0; x < stride; x++) {
      const a = x >= filterBpp ? lines[dst + x - filterBpp] : 0
      const b = y > 0 ? lines[prev + x] : 0
      const c = x >= filterBpp && y > 0 ? lines[prev + x - filterBpp] : 0
      let v = raw[src + x]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) v += paeth(a, b, c)
      else if (filter !== 0) throw new Error(`未知 PNG filter ${filter}`)
      lines[dst + x] = v & 0xff
    }
  }
  let pixels = lines
  let pixBpp = channels
  if (bitDepth < 8) {
    const per = 8 / bitDepth
    const mask = (1 << bitDepth) - 1
    pixels = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const byte = lines[y * stride + ((x / per) | 0)]
        const shift = 8 - bitDepth - (x % per) * bitDepth
        pixels[y * w + x] = (byte >>> shift) & mask
      }
    }
    pixBpp = 1
  }
  const rgba = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    const p = i * pixBpp
    const o = i * 4
    if (colorType === 0 || colorType === 4) {
      const g = pixels[p]
      rgba[o] = rgba[o + 1] = rgba[o + 2] = g
      rgba[o + 3] = colorType === 4 ? pixels[p + 1] : trns && g === trns.readUInt16BE(0) ? 0 : 255
    } else if (colorType === 2) {
      rgba[o] = pixels[p]
      rgba[o + 1] = pixels[p + 1]
      rgba[o + 2] = pixels[p + 2]
      rgba[o + 3] = 255
    } else if (colorType === 3) {
      const idx = pixels[p]
      rgba[o] = palette[idx * 3] ?? 0
      rgba[o + 1] = palette[idx * 3 + 1] ?? 0
      rgba[o + 2] = palette[idx * 3 + 2] ?? 0
      rgba[o + 3] = trns && idx < trns.length ? trns[idx] : 255
    } else {
      rgba[o] = pixels[p]
      rgba[o + 1] = pixels[p + 1]
      rgba[o + 2] = pixels[p + 2]
      rgba[o + 3] = pixels[p + 3]
    }
  }
  return { w, h, rgba }
}

function encodePng(w, h, rgba) {
  const stride = w * 4
  const raw = Buffer.alloc(h * (stride + 1))
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ------------------------------------------------------- 贴图缓存（取第一帧） */

const texCache = new Map()

function loadTex(name) {
  if (texCache.has(name)) return texCache.get(name)
  let result = null
  const base = name.replace(/^minecraft:/, '').replace(/^block\//, '').replace(/^item\//, '')
  const candidates = [
    join(root, '原版材质', `${base}.png`),
    join(root, '原版材质-items', `${base}.png`),
  ]
  for (const p of candidates) {
    if (!existsSync(p)) continue
    const img = decodePng(readFileSync(p))
    // 动画长条贴图（16×N）只取左上角第一帧
    const side = Math.min(img.w, img.h)
    const frame = new Uint8Array(16 * 16 * 4)
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const s = (y * img.w + x) * 4
        const d = (y * 16 + x) * 4
        if (x < img.w && y < img.h) {
          frame[d] = img.rgba[s]
          frame[d + 1] = img.rgba[s + 1]
          frame[d + 2] = img.rgba[s + 2]
          frame[d + 3] = img.rgba[s + 3]
        }
      }
    }
    result = { w: 16, h: 16, rgba: frame }
    break
  }
  texCache.set(name, result)
  return result
}

/* --------------------------------------------------------------- 模型继承链 */

const modelCache = new Map()
const MODELS = join(TMP, 'assets', 'minecraft', 'models')
const STATES = join(TMP, 'assets', 'minecraft', 'blockstates')

function normModel(name) {
  return name.replace(/^minecraft:/, '').replace(/^block\//, '').replace(/^models\//, '')
}

function readModel(name) {
  const key = normModel(name)
  if (modelCache.has(key)) return modelCache.get(key)
  const p = join(MODELS, 'block', `${key}.json`)
  if (!existsSync(p)) {
    modelCache.set(key, {})
    return {}
  }
  const d = JSON.parse(readFileSync(p, 'utf8'))
  const parent = d.parent ? readModel(d.parent) : {}
  const merged = {
    textures: { ...(parent.textures ?? {}), ...(d.textures ?? {}) },
    elements: d.elements ?? parent.elements ?? [],
  }
  modelCache.set(key, merged)
  return merged
}

/** #变量 → 实际贴图名，允许变量链（#particle → #all → block/stone） */
function texVar(textures, ref) {
  if (!ref) return null
  let v = ref
  for (let i = 0; i < 8 && typeof v === 'string' && v.startsWith('#'); i++) {
    v = textures[v.slice(1)]
  }
  // 26.3 起部分贴图写成 { sprite, force_translucent } 对象（玻璃、染色玻璃等 163 处）
  if (v && typeof v === 'object' && typeof v.sprite === 'string') v = v.sprite
  return typeof v === 'string' ? v : null
}

/**
 * 26.3 把草地顶面 / 草边 overlay 改成了灰度掩码，颜色在运行时按生物群系着色
 * （face.tintindex）。离线渲染取最常用的平原草色补上，和游戏内默认观感一致。
 * 只对近似灰度的像素生效，彩色贴图不会被误改。
 */
const GRASS_TINT = [0x79, 0xc0, 0x5a]
function isGray(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b) < 10
}

/** 从 blockstates 里挑一个「典型形态」作为图标模型 */
function defaultModel(id) {
  const p = join(STATES, `${id}.json`)
  if (!existsSync(p)) return null
  const d = JSON.parse(readFileSync(p, 'utf8'))
  if (d.variants) {
    const keys = Object.keys(d.variants)
    const pick =
      keys.find((k) => k === '') ??
      keys.find((k) => !/inner|outer|half=top|snowy=true|lit=true|open=true|powered=true/.test(k) && /shape=straight|facing=north|facing=east|^$/.test(k)) ??
      keys.find((k) => !/inner|outer|half=top|snowy=true|lit=true|open=true/.test(k)) ??
      keys[0]
    const v = d.variants[pick]
    const one = Array.isArray(v) ? v[0] : v
    return one?.model ? normModel(one.model) : null
  }
  if (d.multipart) {
    for (const part of d.multipart) {
      const a = part.apply
      const one = Array.isArray(a) ? a[0] : a
      if (one?.model) return normModel(one.model)
    }
  }
  return null
}

/* ------------------------------------------------------------------ 投影几何 */

const SIZE = 32
/** 相机方向 (1,1,1)；2:1 dimetric，16 单位方块正好铺满 32×32 */
const VIEW = [1, 1, 1]

function project(p) {
  return [p[0] - p[2] + 16, (p[0] + p[2]) * 0.5 + (16 - p[1])]
}

function rotatePoint(p, rot) {
  if (!rot) return p
  const [ox, oy, oz] = rot.origin ?? [8, 8, 8]
  const rad = ((rot.angle ?? 0) * Math.PI) / 180
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  const x = p[0] - ox
  const y = p[1] - oy
  const z = p[2] - oz
  if (rot.axis === 'x') return [ox + x, oy + y * c - z * s, oz + y * s + z * c]
  if (rot.axis === 'z') return [ox + x * c - y * s, oy + x * s + y * c, oz + z]
  return [ox + x * c + z * s, oy + y, oz - x * s + z * c]
}

function rotateNormal(n, rot) {
  if (!rot) return n
  const a = rotatePoint([n[0], n[1], n[2]], rot)
  const b = rotatePoint([0, 0, 0], rot)
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

/** 8 个角点，索引按 bit: x/y/z */
function corners(el) {
  const [x0, y0, z0] = el.from
  const [x1, y1, z1] = el.to
  const c = []
  for (let i = 0; i < 8; i++) {
    c.push(rotatePoint([i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0], el.rotation))
  }
  return c
}

/** uv(0,0) / uv(1,0) / uv(0,1) 三个 3D 角点 + 面法线 */
const FACES = {
  up: { n: [0, 1, 0], p: [2, 3, 6], shade: 0.98 },
  down: { n: [0, -1, 0], p: [0, 1, 4], shade: 0.98 },
  south: { n: [0, 0, 1], p: [6, 7, 4], shade: 0.8 },
  north: { n: [0, 0, -1], p: [3, 2, 1], shade: 0.8 },
  east: { n: [1, 0, 0], p: [3, 7, 1], shade: 0.608 },
  west: { n: [-1, 0, 0], p: [6, 2, 4], shade: 0.608 },
}

function defaultUv(key, el) {
  const [x0, y0, z0] = el.from
  const [x1, y1, z1] = el.to
  const vv = [16 - y1, 16 - y0]
  if (key === 'up' || key === 'down') return [x0, z0, x1, z1]
  if (key === 'south') return [x0, vv[0], x1, vv[1]]
  if (key === 'north') return [16 - x1, vv[0], 16 - x0, vv[1]]
  if (key === 'east') return [z0, vv[0], z1, vv[1]]
  return [16 - z1, vv[0], 16 - z0, vv[1]]
}

/** 把贴图子矩形按仿射铺到 32×32 画布（逆变换采样，最近邻、无抗锯齿） */
function paintFace(canvas, tex, uv, q00, q10, q01, shade, rotation, tint) {
  const [u0, v0, u1, v1] = uv.map((n) => Math.max(0, Math.min(16, n)))
  const uw = Math.max(1, Math.round(u1 - u0))
  const vh = Math.max(1, Math.round(v1 - v0))
  // 源子图（含贴图面内旋转）
  const sub = new Uint8Array(uw * vh * 4)
  for (let y = 0; y < vh; y++) {
    for (let x = 0; x < uw; x++) {
      let sx = x
      let sy = y
      if (rotation === 90) [sx, sy] = [uw - 1 - y, x]
      else if (rotation === 180) [sx, sy] = [uw - 1 - x, vh - 1 - y]
      else if (rotation === 270) [sx, sy] = [y, vh - 1 - x]
      const ty = Math.min(15, Math.round(v0) + sy)
      const tx = Math.min(15, Math.round(u0) + sx)
      const s = (ty * 16 + tx) * 4
      const d = (y * uw + x) * 4
      sub[d] = tex.rgba[s]
      sub[d + 1] = tex.rgba[s + 1]
      sub[d + 2] = tex.rgba[s + 2]
      sub[d + 3] = tex.rgba[s + 3]
      if (tint && isGray(sub[d], sub[d + 1], sub[d + 2])) {
        for (let k = 0; k < 3; k++) sub[d + k] = Math.round((sub[d + k] * GRASS_TINT[k]) / 255)
      }
    }
  }
  // out - q00 = A · (u, v)，求 A 的逆，逐输出像素反查源坐标
  const ax = (q10[0] - q00[0]) / uw
  const bx = (q01[0] - q00[0]) / vh
  const ay = (q10[1] - q00[1]) / uw
  const by = (q01[1] - q00[1]) / vh
  const det = ax * by - bx * ay
  if (Math.abs(det) < 1e-9) return
  const ia = by / det
  const ib = -bx / det
  const ic = -ay / det
  const id = ax / det
  // 平行四边形包围盒，避免全画布扫描
  const xs = [q00[0], q10[0], q01[0], q10[0] + q01[0] - q00[0]]
  const ys = [q00[1], q10[1], q01[1], q10[1] + q01[1] - q00[1]]
  const xMin = Math.max(0, Math.floor(Math.min(...xs)) - 1)
  const xMax = Math.min(SIZE - 1, Math.ceil(Math.max(...xs)) + 1)
  const yMin = Math.max(0, Math.floor(Math.min(...ys)) - 1)
  const yMax = Math.min(SIZE - 1, Math.ceil(Math.max(...ys)) + 1)
  for (let oy = yMin; oy <= yMax; oy++) {
    for (let ox = xMin; ox <= xMax; ox++) {
      const dx = ox + 0.5 - q00[0]
      const dy = oy + 0.5 - q00[1]
      const u = ia * dx + ib * dy
      const v = ic * dx + id * dy
      if (u < 0 || v < 0 || u >= uw || v >= vh) continue
      const s = ((v | 0) * uw + (u | 0)) * 4
      const a = sub[s + 3] / 255
      if (a === 0) continue
      const d = (oy * SIZE + ox) * 4
      const na = a + (canvas[d + 3] / 255) * (1 - a)
      if (na === 0) continue
      const w = a / na
      const old = (canvas[d + 3] / 255) * (1 - a) / na
      for (let k = 0; k < 3; k++) {
        canvas[d + k] = Math.round(sub[s + k] * shade * w + canvas[d + k] * old)
      }
      canvas[d + 3] = Math.round(na * 255)
    }
  }
}

function renderBlock(modelName) {
  const model = readModel(modelName)
  const canvas = new Uint8Array(SIZE * SIZE * 4)
  if (!model.elements?.length) return null
  const drawn = []
  for (const el of model.elements) {
    const c = corners(el)
    const cx = (el.from[0] + el.to[0] + el.from[1] + el.to[1] + el.from[2] + el.to[2]) / 2
    for (const [key, face] of Object.entries(el.faces ?? {})) {
      const def = FACES[key]
      if (!def) continue
      const n = rotateNormal(def.n, el.rotation)
      const visible = n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2]
      // 薄片（cross / 火把）双面可见；实体只画朝向相机的三面
      const thin = el.to.some((v, i) => v - el.from[i] < 0.5)
      if (visible <= 0.001 && !thin) continue
      const texName = texVar(model.textures, face.texture)
      const tex = texName ? loadTex(texName) : null
      if (!tex) continue
      const uv = face.uv ?? defaultUv(key, el)
      const [i0, i1, i2] = def.p
      drawn.push({
        depth: cx + (visible > 0 ? 0 : 0.01),
        q00: project(c[i0]),
        q10: project(c[i1]),
        q01: project(c[i2]),
        tex,
        uv,
        shade: thin ? 0.85 : def.shade,
        rotation: face.rotation ?? 0,
        tint: face.tintindex !== undefined,
      })
    }
  }
  if (!drawn.length) return null
  drawn.sort((a, b) => a.depth - b.depth)
  for (const f of drawn) {
    paintFace(canvas, f.tex, f.uv, f.q00, f.q10, f.q01, f.shade, f.rotation, f.tint)
  }
  // 至少要有可见像素
  let any = false
  for (let i = 3; i < canvas.length; i += 4) if (canvas[i] > 0) { any = true; break }
  return any ? canvas : null
}

/* ----------------------------------------------------------------------- 主流程 */

/** 项目里的方块 id 列表（两个总表，顺序去重） */
function blockEntries() {
  const out = []
  const seen = new Set()
  for (const f of ['src/core/blocks.ts', 'src/core/block-extras.ts']) {
    const s = readFileSync(join(root, f), 'utf8')
    for (const m of s.matchAll(/\{[^\n]*?id: '([a-z0-9_]+)'[^\n]*?tex: '([^']*)'[^\n]*?\}/g)) {
      if (seen.has(m[1])) continue
      seen.add(m[1])
      out.push({ id: m[1], tex: m[2] })
    }
  }
  return out
}

/** 生成 tex 键 → block id 的查表模块，供工具把选中的贴图反查到立体图标 */
function writeIndex(succeeded) {
  const entries = blockEntries()
  // 多个方块共用一张贴图（木板、楼梯、栅栏都用 *_planks），必须挑最典型的那个：
  // id 与贴图同名 > 与 stem 同名 > 基础方块 > 楼梯/台阶/门等衍生方块
  const score = (id, tex, stem) => {
    if (id === tex) return 0
    if (id === stem) return 1
    if (/(stairs|slab|wall|fence|button|pressure_plate|door|trapdoor|sign|gate|boat|carpet|bed)_?/.test(id)) return 3
    return 2
  }
  const best = new Map()
  const offer = (key, id, s) => {
    const cur = best.get(key)
    if (!cur || s < cur.s || (s === cur.s && id.length < cur.id.length)) best.set(key, { id, s })
  }
  for (const { id, tex } of entries) {
    if (!succeeded.has(id) || !tex || tex.includes('/')) continue
    const stem = tex.replace(/_(top|side|bottom|front|back|end|inner|outer|stage\d+|\d+)$/, '')
    const s = score(id, tex, stem)
    offer(tex, id, s)
    if (stem !== tex) offer(stem, id, s + 0.5)
    offer(id, id, 0)
  }
  const lines = [...best.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  '${k}': '${v.id}',`)
  const body = `/**
 * 立体方块图标索引 —— 由 scripts/build-block-icons.mjs 生成，勿手改。
 *
 * 键是内置素材的 tex（含 _top / _side 变体），值是官方 block id，
 * 对应静态文件 textures/block-icons/<id>.png（32×32 透明 PNG）。
 * 只有官方模型能离线展开出可见面的方块才在表里；旗帜、潜影盒、箱子、
 * 头颅这类实体模型没有静态图标，工具会回退到平面贴图。
 *
 * 图标由本项目依据官方客户端的 models/block + blockstates + 原版贴图离线渲染，
 * 不引入任何第三方图片，授权链与项目现有贴图一致。
 */
export const BLOCK_ICON_BY_TEX: Readonly<Record<string, string>> = {
${lines.join('\n')}
}

/** 有立体图标的 block id，去重后的数量 */
export const BLOCK_ICON_IDS: readonly string[] = [...new Set(Object.values(BLOCK_ICON_BY_TEX))].sort()

/** 从素材 tex 反查立体图标；找不到返回 null，调用方应回退到平面贴图 */
export function blockIconId(tex: string): string | null {
  const key = tex.replace(/^items\\//, '')
  const direct = BLOCK_ICON_BY_TEX[key]
  if (direct) return direct
  const stem = key.replace(/_(top|side|bottom|front|back|end|inner|outer|stage\\d+|\\d+)$/, '')
  return BLOCK_ICON_BY_TEX[stem] ?? null
}
`
  writeFileSync(join(root, 'src', 'core', 'block-icons.ts'), body)
  return { byTex: best.size, ids: new Set([...best.values()].map((v) => v.id)).size }
}

const jar = findJar()
mkdirSync(TMP, { recursive: true })
if (!existsSync(join(MODELS, 'block', 'stone.json')) || !existsSync(join(STATES, 'stone.json'))) {
  console.log(`展开 ${VERSION} 客户端模型与 blockstates…`)
  // unzip 的通配符不跨目录，模型与 blockstates 要分开给；缺一不可
  execFileSync('unzip', [
    '-oq', jar,
    'assets/minecraft/models/block/*.json',
    'assets/minecraft/blockstates/*.json',
    '-d', TMP,
  ], { stdio: 'pipe', maxBuffer: 64 * 1024 * 1024 })
}
mkdirSync(OUT_DIR, { recursive: true })

const ids = SAMPLE ? SAMPLE.split(',').map((s) => s.trim()) : blockEntries().map((e) => e.id)
const succeeded = new Set()
let ok = 0
let fail = []
for (const id of ids) {
  const model = defaultModel(id)
  const buf = model ? renderBlock(model) : null
  if (!buf) {
    fail.push({ id, reason: model ? '模型无可渲染面 / 贴图缺失' : '无 blockstates' })
    continue
  }
  writeFileSync(join(OUT_DIR, `${id}.png`), encodePng(SIZE, SIZE, buf))
  succeeded.add(id)
  ok++
}
console.log(`方块图标：成功 ${ok} / ${ids.length}，失败 ${fail.length}`)
if (fail.length) {
  console.log('失败示例：', fail.slice(0, 12).map((f) => `${f.id}(${f.reason})`).join('、'))
  if (!SAMPLE) {
    writeFileSync(join(root, '.build', 'block-icons-missing.json'), JSON.stringify(fail, null, 2))
  }
}
if (!SAMPLE) {
  const idx = writeIndex(succeeded)
  console.log(`索引：${idx.byTex} 个 tex 键 → ${idx.ids} 个方块，写入 src/core/block-icons.ts`)
}
console.log(`输出目录：${OUT_DIR}`)
