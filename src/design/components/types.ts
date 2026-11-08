/** 组件公共类型，避免在 <script setup> 里写 export（SFC 不允许模块导出） */

export interface SegOption {
  value: string
  label: string
  /** 悬停解释 */
  title?: string
  /** 独占整行，用于「自定义」这类跨列项 */
  span?: boolean
}
