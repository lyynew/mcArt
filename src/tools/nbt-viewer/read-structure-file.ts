import {
  FORMAT_LABEL,
  parseStructureBytes,
  type ParsedStructureFile,
} from '@/core/structure/read'

/**
 * 读取结构文件（.nbt / .litematic / .schem）。
 *
 * 压缩处理放在这里（浏览器的 DecompressionStream），格式解析在
 * core/structure/read.ts：三种容器归一成同一份方块表，
 * 投影与材料统计不感知格式。gzip 与未压缩都接受，先看魔数再决定要不要解开。
 */

export interface LoadedStructure {
  name: string
  /** 原始文件字节数；示例结构没有文件，为 0 */
  fileSize: number
  structure: ParsedStructureFile
  /** 由内置示例生成，不是用户拖进来的文件 */
  demo?: boolean
}

export { FORMAT_LABEL }
export type { ParsedStructureFile }

async function maybeGunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const isGzip = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
  if (!isGzip) return bytes

  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前浏览器不支持解压，换 Chrome / Edge / Firefox 试试')
  }

  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function readStructureFile(file: File): Promise<LoadedStructure> {
  const raw = new Uint8Array(await file.arrayBuffer())
  const bytes = await maybeGunzip(raw)
  const structure = parseStructureBytes(bytes)
  return { name: file.name, fileSize: raw.length, structure }
}
