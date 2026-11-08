/**
 * 异步小工具。
 */

/**
 * 给 Promise 加一个时间上限，超时返回 null。
 *
 * 用途：首屏不能等一个可能很慢的异步操作（比如首次打开 IndexedDB）。
 * 注意它只是「不再等」，原 Promise 仍会跑完——所以调用方要保证
 * 原操作本身没有副作用，否则会出现迟到的写入。
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      resolve(null)
    }, ms)

    promise.then(
      (value) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(null)
      },
    )
  })
}
