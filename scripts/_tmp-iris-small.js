/* 临时脚本：生成小颐悬浮头像（xiaoyi.png 500×500）的可动眼球贴片 */
const Jimp = require('jimp')

const SRC = 'public/assets/xiaoyi.png'
const OUT = 'public/assets/xiaoyi_iris_small.png'

// 眼睛连通域（来自 _tmp-eye-scan2.js）：左眼 (219,167)-(235,180) 右眼 (264,159)-(282,174)
const EYES = [
  { cx: 227, cy: 173.5, rx: 14, ry: 12 },
  { cx: 273, cy: 166.5, rx: 14, ry: 12 }
]
const PAD = 3
const X0 = Math.floor(Math.min(...EYES.map((e) => e.cx - e.rx))) - PAD
const X1 = Math.ceil(Math.max(...EYES.map((e) => e.cx + e.rx))) + PAD
const Y0 = Math.floor(Math.min(...EYES.map((e) => e.cy - e.ry))) - PAD
const Y1 = Math.ceil(Math.max(...EYES.map((e) => e.cy + e.ry))) + PAD

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

  const rest = img.clone().composite(patch, X0, Y0)
  const moved = img.clone().composite(patch, X0 + 2, Y0)
  const preview = new Jimp(120 * 4, 55 * 4 * 2 + 6, 0xffffffff)
  preview.composite(rest.crop(195, 145, 120, 55).scale(4), 0, 0)
  preview.composite(moved.crop(195, 145, 120, 55).scale(4), 0, 55 * 4 + 6)
  await preview.writeAsync('scripts/_tmp-iris-small-cmp.png')

  console.log('patch:', tw, 'x', th, 'at', X0, Y0)
  console.log('pct:', {
    left: (X0 / w * 100).toFixed(2),
    top: (Y0 / h * 100).toFixed(2),
    width: (tw / w * 100).toFixed(2),
    height: (th / h * 100).toFixed(2)
  })
}
main().catch((e) => { console.error(e); process.exit(1) })
