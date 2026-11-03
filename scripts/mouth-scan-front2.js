/* 精细定位嘴部：只看脸部中心带（x 38%~62%），打印每行暗点的 x 范围 */
const Jimp = require('jimp')

async function main() {
  const img = await Jimp.read('public/assets/xiaoyi_front.png')
  const w = img.bitmap.width
  const h = img.bitmap.height
  const d = img.bitmap.data

  for (let y = Math.floor(h * 0.34); y < h * 0.44; y++) {
    const xs = []
    for (let x = Math.floor(w * 0.38); x < w * 0.62; x++) {
      const o = (y * w + x) * 4
      const r = d[o], g = d[o + 1], b = d[o + 2], a = d[o + 3]
      if (a < 200) continue
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      if (lum < 130) xs.push(x)
    }
    if (xs.length >= 4) {
      // 连续段分析
      const segs = []
      let s = xs[0], prev = xs[0]
      for (let i = 1; i < xs.length; i++) {
        if (xs[i] - prev > 3) { segs.push([s, prev]); s = xs[i] }
        prev = xs[i]
      }
      segs.push([s, prev])
      const segStr = segs.map(([a2, b2]) => `${a2}-${b2}`).join(' | ')
      console.log(`y=${y} (${(y / h * 100).toFixed(1)}%) n=${xs.length} segs: ${segStr}`)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
