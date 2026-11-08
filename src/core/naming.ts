/**
 * 文件名处理。
 *
 * 用户填的名字直接进下载文件名，必须收敛成安全字符：
 * 结构方块对文件名有要求（小写字母、数字、下划线），中文名进去会加载失败。
 */

/** 只保留小写字母、数字、下划线、连字符；空结果回落到 pixelart */
export function safeName(input: string | null | undefined): string {
  const cleaned = (input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
  return cleaned || 'pixelart'
}
