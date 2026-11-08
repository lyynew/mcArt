/**
 * 颜色计算：HEX → RGB → CIELAB，以及 CIEDE2000 色差。
 *
 * 全部是纯函数，不碰 DOM、不依赖全局状态，可以直接单测。
 * 数值公式与旧版单文件实现保持一致——换实现不能换结果，
 * 否则同一个色板匹配出来的方块会变，用户之前的图纸就对不上了。
 */

/** 0–255 的 sRGB 三元组 */
export type RGB = readonly [number, number, number]

/** CIELAB：L 0–100，a/b 约 ±128 */
export type Lab = readonly [number, number, number]

/** 参与匹配的最小信息集 */
export interface ColorPoint {
  readonly rgb: RGB
  readonly lab: Lab
}

export function hexToRgb(hex: string): RGB {
  const v = parseInt(hex.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

/**
 * sRGB → CIELAB（D65 白点）。
 * 先做 gamma 还原，再转 XYZ，最后用 CIE 的 f(t) 分段函数压到 Lab。
 */
export function rgbToLab(r: number, g: number, b: number): Lab {
  let R = r / 255
  let G = g / 255
  let B = b / 255

  R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92
  G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92
  B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92

  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047
  const Y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.0
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = f(X)
  const fy = f(Y)
  const fz = f(Z)

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

/** Lab 空间的直线距离，便宜，用作粗筛 */
export function labDist(a: Lab, b: Lab): number {
  const dl = a[0] - b[0]
  const da = a[1] - b[1]
  const db = a[2] - b[2]
  return Math.sqrt(dl * dl + da * da + db * db)
}

/**
 * CIEDE2000 色差。
 * 比 Lab 直线距离更贴近人眼判断，高饱和色尤其明显——这也是这套配色看起来
 * 「准」的主要原因，改动前请先跑 color.test.ts 的参考值用例。
 */
export function ciede2000(
  L1: number,
  a1: number,
  b1: number,
  L2: number,
  a2: number,
  b2: number,
): number {
  const RAD = Math.PI / 180

  const C1 = Math.sqrt(a1 * a1 + b1 * b1)
  const C2 = Math.sqrt(a2 * a2 + b2 * b2)
  const Cm = (C1 + C2) / 2
  const Cm7 = Math.pow(Cm, 7)
  const G = 0.5 * (1 - Math.sqrt(Cm7 / (Cm7 + 6103515625)))

  const ap1 = (1 + G) * a1
  const ap2 = (1 + G) * a2
  const Cp1 = Math.sqrt(ap1 * ap1 + b1 * b1)
  const Cp2 = Math.sqrt(ap2 * ap2 + b2 * b2)

  let hp1 = Cp1 === 0 ? 0 : Math.atan2(b1, ap1) / RAD
  if (hp1 < 0) hp1 += 360
  let hp2 = Cp2 === 0 ? 0 : Math.atan2(b2, ap2) / RAD
  if (hp2 < 0) hp2 += 360

  const dLp = L2 - L1
  const dCp = Cp2 - Cp1

  let dhp = 0
  if (Cp1 * Cp2 !== 0) {
    dhp = hp2 - hp1
    if (dhp > 180) dhp -= 360
    else if (dhp < -180) dhp += 360
  }
  const dHp = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dhp * RAD) / 2)

  const Lpm = (L1 + L2) / 2
  const Cpm = (Cp1 + Cp2) / 2

  let hpm = hp1 + hp2
  if (Cp1 * Cp2 !== 0) {
    hpm = Math.abs(hp1 - hp2) > 180 ? (hp1 + hp2 + 360) / 2 : (hp1 + hp2) / 2
  }

  const T =
    1 -
    0.17 * Math.cos((hpm - 30) * RAD) +
    0.24 * Math.cos(2 * hpm * RAD) +
    0.32 * Math.cos((3 * hpm + 6) * RAD) -
    0.2 * Math.cos((4 * hpm - 63) * RAD)

  const dTh = 30 * Math.exp(-Math.pow((hpm - 275) / 25, 2))
  const Cpm7 = Math.pow(Cpm, 7)
  const Rc = 2 * Math.sqrt(Cpm7 / (Cpm7 + 6103515625))

  const Sl = 1 + (0.015 * Math.pow(Lpm - 50, 2)) / Math.sqrt(20 + Math.pow(Lpm - 50, 2))
  const Sc = 1 + 0.045 * Cpm
  const Sh = 1 + 0.015 * Cpm * T
  const Rt = -Math.sin(2 * dTh * RAD) * Rc

  const t1 = dLp / Sl
  const t2 = dCp / Sc
  const t3 = dHp / Sh

  return Math.sqrt(t1 * t1 + t2 * t2 + t3 * t3 + Rt * t2 * t3)
}

/**
 * 复用缓冲区，避免每个像素都新建数组。
 * 只在同步调用内部使用，不会跨调用残留语义。
 */
let scratch = new Float64Array(256)

/**
 * 找色差最小的方块。
 *
 * 先用 Lab 直线距离粗筛，再只对「够近的候选」算 CIEDE2000：
 * 全量精算在 160×160 画幅下是 25,600 × 142 次，太慢；
 * 这个两段式在结果几乎不变的前提下快了好几倍。
 */
export function findNearest(lab: Lab, blocks: readonly ColorPoint[]): number {
  const n = blocks.length
  if (n === 0) return -1
  if (scratch.length < n) scratch = new Float64Array(n)

  let coarse = 0
  let cd = Infinity

  for (let i = 0; i < n; i++) {
    const c = blocks[i]!.lab
    const dl = lab[0] - c[0]
    const da = lab[1] - c[1]
    const db = lab[2] - c[2]
    const d = dl * dl + da * da + db * db
    scratch[i] = d
    if (d < cd) {
      cd = d
      coarse = i
    }
  }

  if (n < 3) return coarse

  // 放宽到 2 倍直径，保证真正的最优解基本不会被筛掉
  const limit = cd * 4 + 1
  let best = coarse
  let bd = Infinity

  for (let i = 0; i < n; i++) {
    if (scratch[i]! > limit) continue
    const c = blocks[i]!.lab
    const d = ciede2000(lab[0], lab[1], lab[2], c[0], c[1], c[2])
    if (d < bd) {
      bd = d
      best = i
    }
  }

  return best
}
