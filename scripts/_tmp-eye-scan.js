/* 临时脚本：定位 xiaoyi_front.png 的眼睛位置（深色连通域 + 左右配对） */
const Jimp = require('jimp')

const SRC = 'public/assets/xiaoyi_front.png'

async function main() {
  const img = await Jimp.read(SRC)
  const w = img.bitmap.width
  const h = img.bitmap.height
  const d = img.bitmap.data
  console.log('size', w, 'x', h)

  // 只在脸部区域找：y 25%~45%，x 25%~75%
  const x0 = Math.floor(w * 0.25), x1 = Math.floor(w * 0.75)
  const y0 = Math.floor(h * 0.25), y1 = Math.floor(h * 0.45)
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
      const pixels = []
      stack.push(p)
      seen[p] = 1
      let minx = gx, maxx = gx, miny = gy, maxy = gy, sr = 0, sg = 0, sb = 0
      while (stack.length) {
        const q = stack.pop()
        const qx = q % W, qy = (q - qx) / W
        const ax = x0 + qx, ay = y0 + qy
        pixels.push([ax, ay])
        const i = (ay * w + ax) * 4
        sr += d[i]; sg += d[i + 1]; sb += d[i + 2]
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
      const n = pixels.length
      clusters.push({
        n, minx, maxx, miny, maxy,
        bw: maxx - minx + 1, bh: maxy - miny + 1,
        cx: (minx + maxx) / 2, cy: (miny + maxy) / 2,
        rgb: [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)]
      })
    }
  }

  clusters.sort((a, b) => b.n - a.n)
  console.log('候选暗色簇（前 20）：')
  clusters.slice(0, 20).forEach((c, i) => {
    console.log(
      `#${i} n=${c.n} box=(${c.minx},${c.miny})-(${c.maxx},${c.maxy}) ` +
      `w=${c.bw} h=${c.bh} c=(${c.cx.toFixed(1)},${c.cy.toFixed(1)}) ` +
      `pct=(${(c.cx / w * 100).toFixed(2)}%,${(c.cy / h * 100).toFixed(2)}%) rgb=${c.rgb}`
    )
  })
}

main().catch((e) => { console.error(e); process.exit(1) })
