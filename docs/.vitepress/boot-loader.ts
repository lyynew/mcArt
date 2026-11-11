/**
 * 开发服务器的首屏占位。
 *
 * dev 下 VitePress 只吐一个空的 #app，Vue 挂载前整页是白的。
 * 这段把加载圈直接塞进 #app：Vue 挂载时会清空容器，占位自动消失，
 * 不需要额外的移除脚本，也不会残留到生产产物（插件 apply: 'serve'）。
 * 样式全部内联——首屏这时连主题 CSS 都还没下载。
 *
 * 顺带把首屏状态脚本也插进 <head>：dev 不跑 SSR，config.head 里的内联
 * 脚本不会出现在初始 HTML 里，深浅色与 mc-armed 就会和生产不一致。
 */
import { initialStateScript } from './head-script'

const DOTS = [
  [50, 10], [30, 15], [15, 30], [10, 50],
  [15, 70], [30, 85], [50, 90], [70, 85],
  [85, 70], [90, 50], [85, 30], [70, 15],
]
  .map(([x, y], i) => `<i style="left:${x}%;top:${y}%;animation-delay:${-i * 80}ms"></i>`)
  .join('')

const BOOT = `<div id="mcart-boot" role="status" aria-live="polite">
<style>
#mcart-boot{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;
  background-color:#171811;
  background-image:linear-gradient(rgba(235,225,190,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(235,225,190,.05) 1px,transparent 1px);
  background-size:22px 22px;font-family:ui-monospace,Consolas,monospace;color:#b5ad95}
#mcart-boot .b{display:flex;flex-direction:column;align-items:center;gap:22px}
#mcart-boot .r{position:relative;width:72px;height:72px}
#mcart-boot .r i{position:absolute;width:10px;height:10px;margin:-5px 0 0 -5px;
  background:#9ad36a;box-shadow:2px 2px 0 rgba(0,0,0,.55);opacity:.26;
  animation:mcart-chase 960ms steps(1,end) infinite}
@keyframes mcart-chase{0%,8.33%{opacity:1}8.34%,16.66%{opacity:.72}
  16.67%,24.99%{opacity:.46}25%,100%{opacity:.26}}
#mcart-boot p{margin:0;font-size:13px;letter-spacing:.2em}
@media (prefers-reduced-motion:reduce){#mcart-boot .r i{animation:none;opacity:.4}
  #mcart-boot .r i:first-child{opacity:1}}
</style>
<div class="b"><div class="r">${DOTS}</div><p>加载中</p></div>
</div>`

// 不标注 vite 的 Plugin 类型：仓库里 root vite 与 VitePress 自带的 vite
// 是两个版本，标了反而会因为 ServerOptions 不一致报类型错。
// 只用得到这三个字段，结构类型足够。
export function bootLoader(base: string) {
  return {
    name: 'mcart-boot-loader',
    apply: 'serve' as const,
    transformIndexHtml(html: string) {
      const script = `<script>${initialStateScript(base)}</script>`
      const withState = html.includes('</head>') ? html.replace('</head>', `${script}</head>`) : html
      // 只在空壳上动手，生产构建的 SSR 内容不受影响
      return withState.replace('<div id="app"></div>', `<div id="app">${BOOT}</div>`)
    },
  }
}
