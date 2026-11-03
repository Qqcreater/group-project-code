/* 临时脚本：生成悬浮头像 xiaoyi.png 的闭眼贴片（500×500） */
const Jimp = require('jimp')

const SRC = 'public/assets/xiaoyi.png'
const OUT = 'public/assets/xiaoyi_eyes_blink_small.png'
const PREVIEW = 'scripts/_tmp-blink-preview-small.png'

const EYES = [
  { minx: 219, maxx: 235, miny: 167, maxy: 180 }, // 左眼
  { minx: 264, maxx: 282, miny: 159, maxy: 174 }  // 右眼
]
const PAD = 4
const FEATHER = 2

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

async function main() {
  const img = await Jimp.read(SRC)
  const w = img.bitmap.width
  const h = img.bitmap.height
  const src = img.bitmap.data
  const px = (x, y) => {
    const i = (clamp(y, 0, h - 1) * w + clamp(x, 0, w - 1)) * 4
    return [src[i], src[i + 1], src[i + 2], src[i + 3]]
  }
  const avg = (x, y, n = 1) => {
    let r = 0, g = 0, b = 0, c = 0
    for (let dy = -n; dy <= n; dy++) {
      const p = px(x, y + dy)
      if (p[3] < 200) continue
      r += p[0]; g += p[1]; b += p[2]; c++
    }
    return c ? [Math.round(r / c), Math.round(g / c), Math.round(b / c)] : px(x, y)
  }

  const X0 = Math.min(...EYES.map((e) => e.minx)) - PAD
  const X1 = Math.max(...EYES.map((e) => e.maxx)) + PAD
  const Y0 = Math.min(...EYES.map((e) => e.miny)) - PAD
  const Y1 = Math.max(...EYES.map((e) => e.maxy)) + PAD
  const tw = X1 - X0 + 1
  const th = Y1 - Y0 + 1

  const patch = new Jimp(tw, th, 0x00000000)
  const pd = patch.bitmap.data
  const setPatch = (x, y, r, g, b, a) => {
    const i = (y * tw + x) * 4
    pd[i] = r; pd[i + 1] = g; pd[i + 2] = b; pd[i + 3] = a
  }

  EYES.forEach((eye) => {
    const { minx, maxx, miny, maxy } = eye
    const cx = (minx + maxx) / 2
    const cy = (miny + maxy) / 2
    for (let x = minx - PAD; x <= maxx + PAD; x++) {
      const top = avg(x, miny - 6, 1)
      const bot = avg(x, maxy + 7, 1)
      for (let y = miny - PAD; y <= maxy + PAD; y++) {
        const dx = Math.max(minx - x, 0, x - maxx)
        const dy = Math.max(miny - y, 0, y - maxy)
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist >= FEATHER) continue
        const alpha = dist <= 0 ? 255 : Math.round(255 * (1 - dist / FEATHER))
        if (alpha <= 2) continue
        const t = clamp((y - (miny - 3)) / (maxy + 3 - (miny - 3)), 0, 1)
        setPatch(
          x - X0, y - Y0,
          Math.round(top[0] + (bot[0] - top[0]) * t),
          Math.round(top[1] + (bot[1] - top[1]) * t),
          Math.round(top[2] + (bot[2] - top[2]) * t),
          alpha
        )
      }
    }
    // 闭眼弧线（小图：细线）
    const halfW = (maxx - minx) / 2 - 3
    const baseY = cy + 0.5
    for (let i = -halfW; i <= halfW; i++) {
      const t = i / halfW
      const yy = baseY - 1.5 + 3 * (1 - t * t)
      const thick = 1.0 - 0.35 * Math.abs(t)
      const fade = 0.95 - 0.25 * Math.abs(t)
      for (let oy = -1; oy <= 1; oy++) {
        const a = Math.max(0, 1 - Math.abs(oy) / (thick + 0.5)) * fade
        if (a <= 0.02) continue
        const px0 = Math.round(cx + i) - X0
        const py0 = Math.round(yy + oy) - Y0
        if (px0 < 0 || py0 < 0 || px0 >= tw || py0 >= th) continue
        setPatch(px0, py0, 74, 46, 36, Math.round(255 * a))
      }
    }
  })

  await patch.writeAsync(OUT)
  const preview = await Jimp.read(SRC)
  preview.composite(patch, X0, Y0)
  await preview.writeAsync(PREVIEW)

  console.log('patch:', tw, 'x', th, 'at', X0, Y0)
  console.log('pct:', {
    left: (X0 / w * 100).toFixed(2),
    top: (Y0 / h * 100).toFixed(2),
    width: (tw / w * 100).toFixed(2),
    height: (th / h * 100).toFixed(2)
  })
}
main().catch((e) => { console.error(e); process.exit(1) })
