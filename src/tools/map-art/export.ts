/**
 * 导出层：把纯算法的结果组装成用户能拿走的东西。
 *
 * 只做三件事：拼文件名 / 拼命令与说明 / 调 core/archive 压缩打包。
 * 不碰 DOM 之外的状态，也不直接触发下载——下载交给面板调用 shared/download。
 *
 * 版本差异集中在 model.ts 的 GAME_VERSIONS，这里按 layout / itemFormat 分流：
 *   ≤1.21.11  存档/data/map_<id>.dat          data/idcounts.dat
 *   ≥26.1     存档/data/minecraft/maps/<id>.dat  data/minecraft/maps/last_id.dat
 *   1.20.5 起 give 用物品组件，之前用 NBT 标签
 */
import { gzipBytes, zipStored } from '@/core/archive'
import { canvasToBlob } from '@/shared/download'
import { buildMapNbt } from './map-dat'
import { COLOR_BY_ID } from './map-colors'
import { createMapCanvas } from './render'
import { versionOf, type MapOptions } from './model'

export function mapFileName(options: MapOptions): string {
  const v = versionOf(options.version)
  return v.layout === 'namespaced' ? `${options.id}.dat` : `map_${options.id}.dat`
}

export function mapFilePath(options: MapOptions): string {
  const v = versionOf(options.version)
  return v.layout === 'namespaced'
    ? `存档/data/minecraft/maps/${options.id}.dat`
    : `存档/data/map_${options.id}.dat`
}

function countFilePath(options: MapOptions): string {
  const v = versionOf(options.version)
  return v.layout === 'namespaced'
    ? '存档/data/minecraft/maps/last_id.dat'
    : '存档/data/idcounts.dat'
}

export function giveCommand(options: MapOptions): string {
  const v = versionOf(options.version)
  return v.itemFormat === 'nbt'
    ? `/give @p minecraft:filled_map{map:${options.id}} 1`
    : `/give @p minecraft:filled_map[minecraft:map_id=${options.id}] 1`
}

export function instructions(options: MapOptions): string {
  const v = versionOf(options.version)
  return [
    'mcArt · 地图画导入说明',
    '========================',
    `游戏版本：${v.id}（DataVersion ${v.dataVersion}）`,
    `地图编号：${options.id}`,
    `画面尺寸：128 × 128 像素，1 像素 = 1 方块，scale = 0`,
    '',
    '1. 先退出存档（关闭游戏或停服），再动文件。',
    `2. 把 ${mapFileName(options)} 放到：`,
    `   ${mapFilePath(options)}`,
    '3. 进存档执行下面这条命令（聊天栏直接粘贴）：',
    `   ${giveCommand(options)}`,
    '',
    '关于编号，务必看这一条：',
    `存档用 ${countFilePath(options)} 记录「最新地图编号」。`,
    '如果编号与已有地图冲突，会直接覆盖那张图；如果编号比记录值还大，',
    '游戏下次发新地图时仍从小编号排，反过来可能把你放进去的文件覆盖掉。',
    '最稳的做法：先在游戏里用空地图画一张，看它拿到几号，再用那个编号重新导出替换。',
    '',
    '地图已写入 locked=1，游戏不会按地形重绘覆盖画面。',
    '透明像素写成色号 0，在地图上显示为未探索区域。',
    '',
    '本文件由 mcArt 生成，图片不上传，全部在浏览器本地计算。',
    '地图色表来自游戏公开数据；色差用 CIEDE2000，抖动为 Floyd–Steinberg / Bayer 有序抖动。',
  ].join('\n')
}

export async function buildDatBytes(colors: Uint8Array, options: MapOptions): Promise<Uint8Array> {
  const v = versionOf(options.version)
  return gzipBytes(
    buildMapNbt(colors, {
      dimension: options.dimension,
      xCenter: options.xCenter,
      zCenter: options.zCenter,
      locked: options.locked,
      trackingPosition: options.tracking,
      dataVersion: v.dataVersion,
    }),
  )
}

export async function buildZipBytes(colors: Uint8Array, options: MapOptions): Promise<Uint8Array> {
  const enc = new TextEncoder()
  return zipStored([
    { name: mapFileName(options), data: await buildDatBytes(colors, options) },
    { name: '使用说明.txt', data: enc.encode(instructions(options)) },
  ])
}

export function buildPngBlob(colors: Uint8Array): Promise<Blob> {
  return canvasToBlob(createMapCanvas(colors, COLOR_BY_ID))
}

export function asBlob(bytes: Uint8Array, type = 'application/octet-stream'): Blob {
  return new Blob([bytes as BlobPart], { type })
}
