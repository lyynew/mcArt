/**
 * 版本信息。
 *
 * 唯一数据源是 package.json 的 version，构建时由 vite define 注入。
 * 界面上的展示拆成两级：
 *   - APP_VERSION_LABEL —— 「v0.1.1 beta」，给人看，预发布只显示通道名
 *   - APP_VERSION       —— 「0.1.1-beta.1」，完整 semver，给 title / 关于用
 */
// 单测环境没有经过 vite define，兜底成 dev 版本，避免 import 到就炸
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0-dev'

const dash = APP_VERSION.indexOf('-')
const core = dash === -1 ? APP_VERSION : APP_VERSION.slice(0, dash)
/** 预发布标识，如 beta.1；正式版为空串 */
const pre = dash === -1 ? '' : APP_VERSION.slice(dash + 1)
/** 只取通道名（beta.1 → beta），避免界面上出现一串数字 */
const channel = pre.split('.')[0] ?? ''

export const APP_VERSION_CORE = core
export const APP_VERSION_CHANNEL = channel
export const IS_PRERELEASE = pre !== ''

/** 顶栏与页脚显示的短语 */
export const APP_VERSION_LABEL = channel ? `v${core} ${channel}` : `v${core}`
