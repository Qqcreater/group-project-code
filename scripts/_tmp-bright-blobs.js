/* 临时脚本：扫描头像/立绘头发区域内的“浅色圆斑”（疑似多余的眼睛） */
const Jimp = require('jimp')

async function scan(file) {
  const img = await Jimp.read(file)
  const w = img.bitmap.width, h = img.bitmap.height
  const d = img.bitmap.data
  const lum = (x, y) => {
    const i = (y * w + x) * 4
    return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
  }
  const y0 = Math.floor(h * 0.04), y1 = Math.floor(h * 0.30)
  const mask = new Uint8Array(w * h)
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    if (d[i + 3] < 100) continue
    if (lum(x, y) > 190) mask[y * w + x] = 1
  }
  const seen = new Uint8Array(w * h)
  const blobs = []
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x
    if (!mask[p] || seen[p]) continue
    const st = [p]; seen[p] = 1
    let n = 0, minx = x, maxx = x, miny = y, maxy = y
    while (st.length) {
      const q = st.pop(); const qx = q % w, qy = (q - qx) / w
      n++
      if (qx < minx) minx = qx; if (qx > maxx) maxx = qx
      if (qy < miny) miny = qy; if (qy > maxy) maxy = qy
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = qx + dx, ny = qy + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const np = ny * w + nx
        if (!mask[np] || seen[np]) continue
        seen[np] = 1; st.push(np)
      }
    }
    const bw = maxx - minx + 1, bh = maxy - miny + 1
    if (n >= 60 && bw >= 8 && bh >= 6 && bw <= w * 0.35 && bh <= h * 0.35) {
      blobs.push({
        px: n, box: `${minx},${miny} ${bw}x${bh}`,
        center: `${(100 * (minx + maxx) / 2 / w).toFixed(1)}%,${(100 * (miny + maxy) / 2 / h).toFixed(1)}%`,
        roundish: (bw / bh).toFixed(2)
      })
    }
  }
  blobs.sort((a, b) => b.px - a.px)
  console.log('==', file, `${w}x${h}`, 'bright blobs in hair band:', blobs.length)
  blobs.slice(0, 10).forEach(b => console.log('   ', JSON.stringify(b)))
}

;(async () => {
  await scan('public/assets/xiaoyi.png')
  await scan('public/assets/xiaoyi_front.png')
})()
