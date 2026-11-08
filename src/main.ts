import { createApp } from 'vue'
import App from './App.vue'
import router from './app/router'

// 令牌必须先于基础层引入，基础层要用变量
import './design/tokens.css'
import './design/base.css'

createApp(App).use(router).mount('#app')
