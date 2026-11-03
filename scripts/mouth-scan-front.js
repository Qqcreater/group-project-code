/* 扫描 xiaoyi_front.png 的嘴部（微笑线）坐标
 * 在脸部下半区域找深色像素簇（嘴线），输出 bbox 与中心百分比 */
const Jimp = require('jimp')

async function main() {
  const img = await Jimp.read('public/assets/xiaoyi_front.png')
  const w = img.bitmap.width
  const h = img.bitmap.height
  const d = img.bitmap.data

  // 粗扫：脸部区域（x 25%~75%，y 30%~48%）找"深色"像素（嘴线比肤色深很多）
  const hits = []
  for (let y = Math.floor(h * 0.28); y < h * 0.50; y++) {
    for (let x = Math.floor(w * 0.25); x < w * 0.75; x++) {
      const o = (y * w + x) * 4
      const r = d[o], g = d[o + 1], b = d[o + 2], a = d[o + 3]
      if (a < 200) continue
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      // 深色但排除眼睛/眉毛：眼睛位置更靠上，这里记录所有暗点后再按行分析
      if (lum < 120) hits.push({ x, y, lum })
    }
  }

  // 按行直方图看暗点分布，找出嘴线所在行带
  const rowMap = {}
  hits.forEach((p) => { rowMap[p.y] = (rowMap[p.y] || 0) + 1 })
  const rows = Object.keys(rowMap).map(Number).sort((a, b) => a - b)
  console.log('y范围暗点行分布（行:y => 数量）:')
  rows.forEach((y) => {
    if (rowMap[y] > 3) console.log(`  y=${y} (${(y / h * 100).toFixed(1)}%) => ${rowMap[y]}`)
  })

  // 输出整体
  console.log('总暗点:', hits.length)
}

main().catch((e) => { console.error(e); process.exit(1) })
