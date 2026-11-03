/* 临时脚本：扫描指定图片尺寸与脸部暗色眼区（用于给小颐悬浮头像加眨眼）
 * 用法：node scripts/_tmp-eye-scan2.js public/assets/xiaoyi.png */
const Jimp = require('jimp')

const SRC = process.argv[2] || 'public/assets/xiaoyi.png'

async function main() {
  const img = await Jimp.read(SRC)
  const w = img.bitmap.width
  const h = img.bitmap.height
  const d = img.bitmap.data
  console.log('size', w, 'x', h)

  const x0 = Math.floor(w * 0.2), x1 = Math.floor(w * 0.8)
  const y0 = Math.floor(h * 0.1), y1 = Math.floor(h * 0.5)
  const isDark = (x, y) => {
    const i = (y * w + x) * 4
    if (d[i + 3] < 200) return false
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    return lum < 95
  }
  const W = x1 - x0, H = y1 - y0
  const seen = new Uint8Array(W * H)
  const clusters = []
  const stack = []
  for (let yy = 0; yy < H; yy++) {
    for (let xx = 0; xx < W; xx++) {
      const p = yy * W + xx
      if (seen[p]) continue
      const gx = x0 + xx, gy = y0 + yy
      if (!isDark(gx, gy)) { seen[p] = 1; continue }
      stack.push(p); seen[p] = 1
      let minx = gx, maxx = gx, miny = gy, maxy = gy, n = 0
      while (stack.length) {
        const q = stack.pop()
        const qx = q % W, qy = (q - qx) / W
        const ax = x0 + qx, ay = y0 + qy
        n++
        if (ax < minx) minx = ax
        if (ax > maxx) maxx = ax
        if (ay < miny) miny = ay
        if (ay > maxy) maxy = ay
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = qx + dx, ny = qy + dy
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
            const np = ny * W + nx
            if (seen[np]) continue
            seen[np] = 1
            if (isDark(x0 + nx, y0 + ny)) stack.push(np)
          }
        }
      }
      clusters.push({ n, minx, maxx, miny, maxy, bw: maxx - minx + 1, bh: maxy - miny + 1 })
    }
  }
  clusters.sort((a, b) => b.n - a.n)
  clusters.slice(0, 12).forEach((c, i) => {
    console.log(`#${i} n=${c.n} box=(${c.minx},${c.miny})-(${c.maxx},${c.maxy}) w=${c.bw} h=${c.bh} ` +
      `pct=(${(((c.minx + c.maxx) / 2) / w * 100).toFixed(2)}%,${(((c.miny + c.maxy) / 2) / h * 100).toFixed(2)}%)`)
  })
}
main().catch((e) => { console.error(e); process.exit(1) })
