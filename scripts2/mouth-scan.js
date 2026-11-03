/* 逐帧测量嘴部开合度：嘴部 ROI 内的深色像素（口腔）数量 */
const Jimp = require('jimp')
const fs = require('fs')

async function main() {
  const files = fs.readdirSync('scripts/mscan').filter(f => f.endsWith('.png')).sort()
  const W = 212, H = 202
  // 嘴部 ROI（缩放后坐标）
  const X0 = 84, X1 = 128, Y0 = 76, Y1 = 98
  const out = []
  for (const f of files) {
    const img = await Jimp.read('scripts/mscan/' + f)
    const d = img.bitmap.data
    let dark = 0, red = 0
    for (let y = Y0; y < Y1; y++) {
      for (let x = X0; x < X1; x++) {
        const i = (y * W + x) * 4
        const r = d[i], g = d[i + 1], b = d[i + 2]
        // 口腔深暗部（张嘴时可见）
        if (r < 130 && g < 95 && b < 80) dark++
        // 唇红
        if (r > 130 && r - g > 35 && r - b > 45) red++
      }
    }
    out.push({ f, dark, red })
  }
  // 输出简易柱状图
  for (const o of out) {
    const n = Number(o.f.match(/\d+/)[0])
    console.log(`${String(n).padStart(3)} dark=${String(o.dark).padStart(4)} ${'#'.repeat(Math.min(50, o.dark / 6))}`)
  }
  const darr = out.map(o => o.dark)
  console.log('dark max:', Math.max(...darr), 'mean:', (darr.reduce((a, b) => a + b, 0) / darr.length).toFixed(0))
}

main().catch(e => { console.error(e); process.exit(1) })
