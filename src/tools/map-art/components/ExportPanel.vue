<script setup lang="ts">
import { computed, ref } from 'vue'
import { McButton, McInput, McNote, McSegmented, McSwitch, McWindow, type SegOption } from '@/design/components'
import { copyText } from '@/shared/clipboard'
import { downloadBlob } from '@/shared/download'
import { useMapArt } from '../store'
import {
  asBlob,
  buildDatBytes,
  buildLitematicBytes,
  buildPngBlob,
  buildSchemBytes,
  buildStructureZipBytes,
  buildZipBytes,
  giveCommand,
  mapFileName,
  mapFilePath,
  type BuildExportInput,
} from '../export'
import {
  DIMENSIONS,
  GAME_VERSIONS,
  clampCenter,
  clampMapId,
  type DimensionId,
  type GameVersionId,
} from '../model'

/** 导出面板：参数、命令、地图数据与施工文件。所有下载都经 shared/download。 */
const { result, heightMap, build, isBuild, mapOptions, message } = useMapArt()
const copied = ref(false)
const working = ref(false)

const versionOptions: SegOption[] = GAME_VERSIONS.map((v) => ({ value: v.id, label: v.id }))
const dimensionOptions: SegOption[] = DIMENSIONS.map((d) => ({ value: d.id, label: d.label }))

function setVersion(v: string): void {
  mapOptions.version = v as GameVersionId
}
function setDimension(v: string): void {
  mapOptions.dimension = v as DimensionId
}

/** McInput 是 string 模型，数字字段用一层计算属性转换，非法输入直接收敛成 0 */
const idText = computed({
  get: () => String(mapOptions.id),
  set: (v: string) => {
    mapOptions.id = clampMapId(Number(v))
  },
})
const xText = computed({
  get: () => String(mapOptions.xCenter),
  set: (v: string) => {
    mapOptions.xCenter = clampCenter(Number(v))
  },
})
const zText = computed({
  get: () => String(mapOptions.zCenter),
  set: (v: string) => {
    mapOptions.zCenter = clampCenter(Number(v))
  },
})

const command = computed(() => giveCommand(mapOptions))
const filePath = computed(() => mapFilePath(mapOptions))
const zipName = computed(() => `mcArt-map-${mapOptions.id}.zip`)

async function copyCommand(): Promise<void> {
  copied.value = await copyText(command.value)
  message.value = copied.value ? 'give 指令已复制' : '复制失败，请手动选中上面的命令'
}

async function run(label: string, make: () => Promise<{ blob: Blob; name: string }>): Promise<void> {
  if (!result.value) {
    message.value = '先放一张图进来'
    return
  }
  if (working.value) return
  working.value = true
  try {
    const { blob, name } = await make()
    downloadBlob(blob, name)
    message.value = `${label}已导出：${name}`
  } catch {
    message.value = `${label}导出失败，刷新页面再试一次`
  } finally {
    working.value = false
  }
}

function saveDat(): Promise<void> {
  return run('地图文件', async () => ({
    blob: asBlob(await buildDatBytes(result.value!.colors, mapOptions), 'application/gzip'),
    name: mapFileName(mapOptions),
  }))
}

function saveZip(): Promise<void> {
  return run('说明包', async () => ({
    blob: asBlob(await buildZipBytes(result.value!.colors, mapOptions), 'application/zip'),
    name: zipName.value,
  }))
}

function savePng(): Promise<void> {
  return run('预览图', async () => ({
    blob: await buildPngBlob(result.value!.colors),
    name: `mcArt-map-${mapOptions.id}.png`,
  }))
}

/** 三种施工导出共用同一份输入，避免投影、图纸与结构分块对不上 */
function buildExportInput(): BuildExportInput {
  return {
    colors: result.value!.colors,
    heightMap: heightMap.value!,
    build,
    options: mapOptions,
    name: `mcArt-map-${mapOptions.id}`,
  }
}

function saveBuild(label: string, make: () => Promise<Uint8Array>, fileName: string): Promise<void> {
  if (!heightMap.value) {
    message.value = '高度图还没算好，稍等一下'
    return Promise.resolve()
  }
  return run(label, async () => ({ blob: asBlob(await make()), name: fileName }))
}

function saveLitematic(): Promise<void> {
  return saveBuild(
    '投影文件',
    () => buildLitematicBytes(buildExportInput()),
    `mcArt-map-${mapOptions.id}.litematic`,
  )
}

function saveSchem(): Promise<void> {
  return saveBuild(
    'WorldEdit 图纸',
    () => buildSchemBytes(buildExportInput()),
    `mcArt-map-${mapOptions.id}.schem`,
  )
}

function saveStructureZip(): Promise<void> {
  return saveBuild(
    '结构分块',
    () => buildStructureZipBytes(buildExportInput()),
    `mcArt-map-${mapOptions.id}-structures.zip`,
  )
}
</script>

<template>
  <McWindow title="地图参数">
    <span class="export__label">游戏版本</span>
    <McSegmented
      :options="versionOptions"
      :columns="3"
      dense
      :model-value="mapOptions.version"
      @update:model-value="setVersion"
    />
    <McNote>决定 DataVersion、存档里的文件路径与 give 指令写法。</McNote>

    <span class="export__label">维度</span>
    <McSegmented
      :options="dimensionOptions"
      :columns="3"
      dense
      :model-value="mapOptions.dimension"
      @update:model-value="setDimension"
    />

    <span class="export__label">地图编号</span>
    <McInput v-model="idText" inputmode="numeric" placeholder="0" aria-label="地图编号" />

    <div class="export__coords">
      <label>
        <span>xCenter</span>
        <McInput v-model="xText" inputmode="numeric" aria-label="地图中心 X" />
      </label>
      <label>
        <span>zCenter</span>
        <McInput v-model="zText" inputmode="numeric" aria-label="地图中心 Z" />
      </label>
    </div>

    <McSwitch v-model="mapOptions.locked" label="锁定地图" hint="防止游戏按地形重绘覆盖掉画" />
    <McSwitch v-model="mapOptions.tracking" label="显示玩家指针" />
  </McWindow>

  <McWindow title="获取这张地图">
    <code class="export__cmd">{{ command }}</code>
    <McButton size="sm" variant="primary" @click="copyCommand">
      {{ copied ? '已复制 ✓' : '复制 give 指令' }}
    </McButton>
    <McNote v-if="isBuild">
      施工完成后游戏会自己绘制地图；这份 .dat 可先当作画面预览，省得跑一遍图。
    </McNote>
  </McWindow>

  <McWindow title="导出文件">
    <div class="export__buttons">
      <McButton :disabled="!result || working" @click="saveDat">
        下载 {{ mapFileName(mapOptions) }}
      </McButton>
      <McButton :disabled="!result || working" @click="saveZip">下载 ZIP 说明包</McButton>
      <McButton :disabled="!result || working" @click="savePng">下载 PNG 预览</McButton>
    </div>
    <McNote v-if="message">{{ message }}</McNote>
    <McNote v-else>单文件适合替换已有地图；ZIP 里附了分版本路径与编号说明。</McNote>
  </McWindow>

  <McWindow v-if="isBuild" title="施工文件">
    <div class="export__buttons">
      <McButton :disabled="!result || !heightMap || working" @click="saveLitematic">
        下载 .litematic 投影
      </McButton>
      <McButton :disabled="!result || !heightMap || working" @click="saveSchem">
        下载 .schem 图纸
      </McButton>
      <McButton :disabled="!result || !heightMap || working" @click="saveStructureZip">
        下载分块 .nbt（ZIP）
      </McButton>
    </div>
    <McNote>
      投影文件用 Litematica 载入、.schem 用 WorldEdit 的 //paste 粘贴；结构分块按 48³ 切开，
      包内附每张的相对位置。三者都含顶层方块、支撑方块与 noobline。
    </McNote>
  </McWindow>

  <McWindow title="放进存档">
    <code class="export__path">{{ filePath }}</code>
    <ol class="export__steps">
      <li>退出存档（关游戏或停服），再替换文件。</li>
      <li>进存档执行上面的 give 指令，编号与文件名一致。</li>
      <li>
        编号别乱填：比存档记录的「最新地图编号」还大时，游戏下次发新地图可能反过来覆盖它。
        最稳的是先在游戏里画一张空地图，看它拿到几号再回来导出。
      </li>
    </ol>
  </McWindow>
</template>

<style scoped>
.export__label {
  display: block;
  margin: var(--sp-3) 0 5px;
  font-size: var(--fs-sm);
  color: var(--mc-ink-soft);
}

.export__label:first-child {
  margin-top: 0;
}

.export__coords {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-2);
  margin-top: var(--sp-3);
  font-size: var(--fs-note);
  color: var(--mc-ink-soft);
}

.export__coords label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.export__cmd,
.export__path {
  display: block;
  padding: var(--sp-2);
  background: var(--mc-plate);
  border: var(--mc-bd) solid #000;
  font-size: var(--fs-note);
  line-height: 1.6;
  color: var(--mc-ink-strong);
  overflow-wrap: anywhere;
}

.export__cmd + button {
  margin-top: var(--sp-3);
}

.export__buttons {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.export__steps {
  margin: var(--sp-2) 0 0;
  padding-left: 18px;
  font-size: var(--fs-note);
  line-height: 1.8;
  color: var(--mc-ink-soft);
}
</style>
