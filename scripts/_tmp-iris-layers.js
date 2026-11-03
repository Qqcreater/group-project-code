/* 临时脚本：生成小颐可动眼球贴片（大立绘 672×1000）
 * 做法：以「整只眼睛（睫毛 + 眼白 + 虹膜 + 高光）」为整体裁切，
 *       椭圆边界落在平滑的皮肤上（不切睫毛/眼线），移动时整眼一起位移。
 *       静止时贴片与原图像素完全重合，看不出任何差异。 */
const Jimp = require('jimp')

const SRC = 'public/assets/xiaoyi_front.png'
const OUT = 'public/assets/xiaoyi_iris.png'

const EYES = [
  { cx: 282, cy: 327, rx: 26, ry: 20 },
  { cx: 386.5, cy: 325, rx: 24, ry: 19 }
]
const X0 = 256, X1 = 411, Y0 = 306, Y1 = 348

async function main() {
  const img = await Jimp.read(SRC)
  const w = img.bitmap.width
  const h = img.bitmap.height
  const src = img.bitmap.data

  const tw = X1 - X0 + 1
  const th = Y1 - Y0 + 1
  const patch = new Jimp(tw, th, 0x00000000)

  for (let y = Y0; y <= Y1; y++) {
    for (let x = X0; x <= X1; x++) {
      let t = 9
      EYES.forEach((e) => {
        const dx = (x - e.cx) / e.rx
        const dy = (y - e.cy) / e.ry
        t = Math.min(t, dx * dx + dy * dy)
      })
      // 只在外缘 1px 左右羽化，避免半透明区域遮住原图睫毛
      // RGB 始终保留原图颜色（透明区也填色），缩放插值时才不会出现深色光晕
      let a = t > 1 ? 0 : t <= 0.95 ? 255 : Math.round(255 * (1 - (t - 0.95) / 0.05))
      if (a <= 2) a = 0
      const p = (y * w + x) * 4
      const q = ((y - Y0) * tw + (x - X0)) * 4
      patch.bitmap.data[q] = src[p]
      patch.bitmap.data[q + 1] = src[p + 1]
      patch.bitmap.data[q + 2] = src[p + 2]
      patch.bitmap.data[q + 3] = a
    }
  }
  await patch.writeAsync(OUT)

  // 预览：静止 vs 右移 3px / 下移 2px
  const rest = img.clone().composite(patch, X0, Y0)
  const moved = img.clone().composite(patch, X0 + 3, Y0 + 2)
  const out = new Jimp(190 * 5, 75 * 5 * 2 + 6, 0xffffffff)
  out.composite(rest.crop(240, 285, 190, 75).scale(5), 0, 0)
  out.composite(moved.crop(240, 285, 190, 75).scale(5), 0, 75 * 5 + 6)
  await out.writeAsync('scripts/_tmp-eye-cmp.png')

  console.log('patch:', tw, 'x', th, 'at', X0, Y0)
  console.log('pct:', {
    left: (X0 / w * 100).toFixed(2),
    top: (Y0 / h * 100).toFixed(2),
    width: (tw / w * 100).toFixed(2),
    height: (th / h * 100).toFixed(2)
  })
}
main().catch((e) => { console.error(e); process.exit(1) })
