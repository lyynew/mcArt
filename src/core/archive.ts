/**
 * 归档：CRC32、gzip、zip。
 *
 * 结构文件本身是 gzip 压缩的 NBT；画幅超过 48 格时要拆成多块，
 * 打包成 zip 一起下载。两件事都不引第三方库，保持「单文件工具」的轻量传统。
 */

let crcTable: Int32Array | null = null

/** 标准 CRC-32（多项式 0xEDB88320），返回无符号值 */
export function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Int32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[i] = c
    }
  }

  let c = -1
  for (let i = 0; i < bytes.length; i++) {
    c = crcTable[(c ^ bytes[i]!) & 255]! ^ (c >>> 8)
  }
  return (c ^ -1) >>> 0
}

/**
 * 不压缩的 gzip（deflate stored block）。
 *
 * 作为兜底实现：体积比真压缩大，但输出是确定性的、逐字节可复现，
 * 因此也是测试里比对字节的那条路径。
 */
export function gzipStored(data: Uint8Array): Uint8Array {
  const out: number[] = []

  // ID1 ID2 CM FLG MTIME(4) XFL OS —— MTIME 固定 0，保证输出可复现
  out.push(0x1f, 0x8b, 8, 0, 0, 0, 0, 0, 0, 0xff)

  if (data.length === 0) {
    out.push(1, 0, 0, 255, 255)
  }

  let i = 0
  while (i < data.length) {
    const len = Math.min(65535, data.length - i)
    const final = i + len >= data.length ? 1 : 0
    out.push(final, len & 255, (len >> 8) & 255, ~len & 255, (~len >> 8) & 255)
    for (let k = 0; k < len; k++) out.push(data[i + k]!)
    i += len
  }

  const crc = crc32(data)
  out.push(crc & 255, (crc >>> 8) & 255, (crc >>> 16) & 255, (crc >>> 24) & 255)

  const size = data.length >>> 0
  out.push(size & 255, (size >>> 8) & 255, (size >>> 16) & 255, (size >>> 24) & 255)

  return new Uint8Array(out)
}

/**
 * 优先用浏览器原生 gzip（体积小得多），不可用时回落到 gzipStored。
 * 两者都是合法 gzip，游戏端不区分。
 */
export async function gzipBytes(data: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream !== 'undefined') {
    try {
      const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'))
      return new Uint8Array(await new Response(stream).arrayBuffer())
    } catch {
      /* 环境不支持就回落到手写实现 */
    }
  }
  return gzipStored(data)
}

export interface ZipEntry {
  name: string
  data: Uint8Array
}

/**
 * 打包成不压缩的 zip。
 *
 * 里面的 .nbt 已经各自 gzip 过，再套一层 deflate 收益很小；
 * 不压缩也让产物确定、便于校验。文件名用 UTF-8（通用标志位 bit 11）。
 */
export function zipStored(entries: readonly ZipEntry[]): Uint8Array {
  const enc = new TextEncoder()
  const LE = true

  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const e of entries) {
    const name = enc.encode(e.name)
    const crc = crc32(e.data)
    const size = e.data.length

    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, LE) // 局部文件头签名
    lv.setUint16(4, 20, LE) // 解压所需版本
    lv.setUint16(6, 0x0800, LE) // 通用标志：文件名为 UTF-8
    lv.setUint16(8, 0, LE) // 压缩方法：stored
    lv.setUint16(10, 0, LE) // 修改时间
    lv.setUint16(12, 0, LE) // 修改日期
    lv.setUint32(14, crc, LE)
    lv.setUint32(18, size, LE) // 压缩后大小
    lv.setUint32(22, size, LE) // 原始大小
    lv.setUint16(26, name.length, LE)
    lv.setUint16(28, 0, LE) // 扩展字段长度
    local.set(name, 30)
    locals.push(local, e.data)

    const central = new Uint8Array(46 + name.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, LE) // 中央目录签名
    cv.setUint16(4, 20, LE) // 创建版本
    cv.setUint16(6, 20, LE) // 解压所需版本
    cv.setUint16(8, 0x0800, LE)
    cv.setUint16(10, 0, LE)
    cv.setUint16(12, 0, LE)
    cv.setUint16(14, 0, LE)
    cv.setUint32(16, crc, LE)
    cv.setUint32(20, size, LE)
    cv.setUint32(24, size, LE)
    cv.setUint16(28, name.length, LE)
    cv.setUint16(30, 0, LE) // 扩展字段
    cv.setUint16(32, 0, LE) // 注释
    cv.setUint16(34, 0, LE) // 起始磁盘号
    cv.setUint16(36, 0, LE) // 内部属性
    cv.setUint32(38, 0, LE) // 外部属性
    cv.setUint32(42, offset, LE) // 局部头偏移
    central.set(name, 46)
    centrals.push(central)

    offset += local.length + size
  }

  const centralSize = centrals.reduce((sum, c) => sum + c.length, 0)

  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, LE) // 中央目录结束签名
  ev.setUint16(4, 0, LE)
  ev.setUint16(6, 0, LE)
  ev.setUint16(8, entries.length, LE)
  ev.setUint16(10, entries.length, LE)
  ev.setUint32(12, centralSize, LE)
  ev.setUint32(16, offset, LE)
  ev.setUint16(20, 0, LE)

  const total = offset + centralSize + eocd.length
  const out = new Uint8Array(total)
  let p = 0
  for (const part of locals) {
    out.set(part, p)
    p += part.length
  }
  for (const c of centrals) {
    out.set(c, p)
    p += c.length
  }
  out.set(eocd, p)
  return out
}
