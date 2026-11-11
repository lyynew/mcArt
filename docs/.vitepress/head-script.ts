/* ============================================================
   首屏内联脚本
   ------------------------------------------------------------
   这段字符串会被塞进 <head>，在页面绘制之前同步执行，只做三件事：
     1. 按「本地偏好 → 系统偏好」定深浅色，避免刷新时闪一下白；
     2. 记录动效开关（data-motion），CSS 与动画引擎都读它；
     3. 首页且动效开启时，先给 <html> 挂 mc-armed 把待施工的块
        藏起来，等引擎接管。3.2 秒内引擎没就绪就自动撤掉，宁可
        不做动画，也不能让内容一直藏着。
   ============================================================ */

export function initialStateScript(base: string): string {
  return `(function(){try{
var root=document.documentElement,KEY='mcart:prefs',saved={};
try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){}
var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var dark=typeof saved.appearance==='string'?saved.appearance==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;
var motion=typeof saved.motion==='boolean'?saved.motion:!reduce;
if(dark)root.classList.add('dark');
root.style.colorScheme=dark?'dark':'light';
root.dataset.motion=motion?'on':'off';
root.dataset.speed=['calm','normal','fast'].indexOf(saved.speed)>=0?saved.speed:'normal';
function trimSlash(s){return s.charAt(s.length-1)==='/'?s.slice(0,-1):s}
var path=location.pathname;
if(path.slice(-10)==='index.html')path=path.slice(0,-10);
var home=trimSlash(path)===trimSlash(${JSON.stringify(base)});
if(home&&motion){
  root.classList.add('mc-armed');
  setTimeout(function(){if(!window.__mcBuilderReady)root.classList.remove('mc-armed')},3200);
}
}catch(e){}})()`
}
