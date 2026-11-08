/**
 * 浏览器下载。集中一处，避免每个导出按钮各写一遍 a[download]。
 */

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // 立刻 revoke 会让部分浏览器取消下载，留一点余量
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** canvas → PNG Blob；toBlob 在极老的浏览器上没有，回落到 toDataURL */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('画布导出失败'))
      }, 'image/png')
      return
    }
    try {
      const base64 = canvas.toDataURL('image/png').split(',')[1] ?? ''
      const bin = atob(base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      resolve(new Blob([bytes], { type: 'image/png' }))
    } catch (err) {
      reject(err instanceof Error ? err : new Error('画布导出失败'))
    }
  })
}
