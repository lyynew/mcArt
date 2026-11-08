/**
 * 防抖。
 *
 * 用在这类地方：滑杆拖动时每一帧都会触发重算，160×160 的匹配跑一次要几百毫秒，
 * 必须等手停下来再算，不然拖起来像卡死。
 */
export interface Debounced<A extends unknown[]> {
  (...args: A): void
  /** 取消还没执行的那次 */
  cancel(): void
  /** 立刻执行挂起的那次 */
  flush(): void
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait = 160): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: A | null = null

  const run = () => {
    timer = null
    if (!pending) return
    const args = pending
    pending = null
    fn(...args)
  }

  const debounced = ((...args: A) => {
    pending = args
    if (timer) clearTimeout(timer)
    timer = setTimeout(run, wait)
  }) as Debounced<A>

  debounced.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
    pending = null
  }

  debounced.flush = () => {
    if (!timer) return
    clearTimeout(timer)
    run()
  }

  return debounced
}
