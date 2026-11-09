import { parseStructure, type ParsedStructure } from '@/core/nbt-read'

/**
 * 读取 .nbt 文件。
 *
 * 结构文件有两种常见形态：gzip 压缩过的（游戏导出、本工具导出的都是这种）和未压缩的裸 NBT。
 * 先看魔数再决定要不要解开，两者都接受。
 */

export interface LoadedStructure {
  name: string
  /** 原始文件字节数；示例结构没有文件，为 0 */
  fileSize: number
  structure: ParsedStructure
  /** 由内置示例生成，不是用户拖进来的文件 */
  demo?: boolean
}

async function maybeGunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const isGzip = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
  if (!isGzip) return bytes

  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前浏览器不支持解压 .nbt，换 Chrome / Edge / Firefox 试试')
  }

  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function readStructureFile(file: File): Promise<LoadedStructure> {
  const raw = new Uint8Array(await file.arrayBuffer())
  const bytes = await maybeGunzip(raw)
  const structure = parseStructure(bytes)
  return { name: file.name, fileSize: raw.length, structure }
}
