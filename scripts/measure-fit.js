/* 测量视频与 PNG 的身体几何参数，计算全身合成对齐方案 */
const Jimp = require('jimp')

function dist(r, g, b, r2, g2, b2) {
  return Math.sqrt((r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2)
}

/* 找一行的主体 span（与背景色距 > thr 的像素范围） */
function rowSpan(img, y, bg, thr) {
  const W = img.bitmap.width
  const d = img.bitmap.data
  let minX = -1, maxX = -1
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4
    const a = d[i + 3]
    const r = d[i], g = d[i + 1], b = d[i + 2]
    const isBody = a > 128 && dist(r, g, b, bg[0], bg[1], bg[2]) > thr
    if (isBody) { if (minX < 0) minX = x; maxX = x }
  }
  return [minX, maxX]
}

/* 找头部顶端：从上往下第一行有主体的 y */
function headTop(img, bg, thr) {
  const H = img.bitmap.height, W = img.bitmap.width
  const d = img.bitmap.data
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      if (d[i + 3] > 128 && dist(d[i], d[i + 1], d[i + 2], bg[0], bg[1], bg[2]) > thr) return y
    }
  }
  return -1
}

async function main() {
  /* ---- 视频帧 ---- */
  const fr = await Jimp.read('scripts/meas_frame.png')
  const FW = fr.bitmap.width, FH = fr.bitmap.height
  const fd = fr.bitmap.data
  // 背景色：左上 10x10 平均
  let bg = [0, 0, 0]
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
    const i = (y * FW + x) * 4
    bg[0] += fd[i]; bg[1] += fd[i + 1]; bg[2] += fd[i + 2]
  }
  bg = bg.map(v => Math.round(v / 100))
  console.log('video frame:', FW, 'x', FH, 'bg rgb:', bg.join(','))

  // 视频底部测量行（避开底部水印区）：y = FH - 60
  const vSeam = FH - 60
  const [vx0, vx1] = rowSpan(fr, vSeam, bg, 55)
  const vHead = headTop(fr, bg, 55)
  console.log(`video seam y=${vSeam} (${(vSeam / FH * 100).toFixed(1)}%): span ${vx0}-${vx1}, width ${(vx1 - vx0) / FW * 100}% of frame, center ${((vx0 + vx1) / 2 / FW * 100).toFixed(1)}%`)
  console.log(`video head top: y=${vHead} (${(vHead / FH * 100).toFixed(1)}%)`)

  // 视频脸中心估计：扫描上半部最大肤色区… 简化：眼睛行已知约 0.31 → 跳过

  /* ---- PNG ---- */
  const png = await Jimp.read('public/assets/xiaoyi_front.png')
  const PW = png.bitmap.width, PH = png.bitmap.height
  console.log('png:', PW, 'x', PH)
  const pHead = headTop(png, bg, 55)  // PNG 已透明，背景色不重要，a>128 即主体
  console.log(`png head top: y=${pHead} (${(pHead / PH * 100).toFixed(1)}%)`)
  // 候选缝合行 0.65-0.80 的宽度剖面
  for (const f of [0.62, 0.66, 0.70, 0.72, 0.74, 0.76, 0.78]) {
    const y = Math.floor(PH * f)
    const [x0, x1] = rowSpan(png, y, bg, 55)
    console.log(`png y=${f}: span ${x0}-${x1} width ${((x1 - x0) / PW * 100).toFixed(1)}% center ${(((x0 + x1) / 2) / PW * 100).toFixed(1)}%`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
