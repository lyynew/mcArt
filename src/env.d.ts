/// <reference types="vite/client" />

/**
 * 构建时由 docs/.vitepress/config.mts 的 vite.define 注入，值来自 package.json 的 version。
 * 只在 package.json 维护一处，界面与关于信息都读这里。
 */
declare const __APP_VERSION__: string
