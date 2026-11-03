/* 临时脚本：生成小颐闭眼贴片 xiaoyi_eyes_blink.png
 * 思路：定位左右眼深色区域 → 用上下方原图肤色垂直插值填充 → 画闭合眼睑弧线 → 边缘羽化透明
 * 同时输出预览图（贴片叠在原图上）用于人工确认效果 */
const Jimp = require('jimp')

const SRC = 'public/assets/xiaoyi_front.png'
const OUT = 'public/assets/xiaoyi_eyes_blink.png'
const PREVIEW = 'scripts/_tmp-blink-preview.png'

// 眼睛深色连通域 bbox（来自 _tmp-eye-scan.js）
const EYES = [
  { minx: 263, maxx: 304, miny: 312, maxy: 343 },
  { minx: 366, maxx: 407, miny: 310, maxy: 341 }
]
const PAD = 5        // 贴片在 bbox 外扩展的像素（含羽化）
const FEATHER = 3    // 边缘羽化宽度

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }

async function main() {
  const img = await Jimp.read(SRC)
  const w = img.bitmap.width
  const h = img.bitmap.height
  const src = img.bitmap.data
  const px = (x, y) => {
    const i = (clamp(y, 0, h - 1) * w + clamp(x, 0, w - 1)) * 4
    return [src[i], src[i + 1], src[i + 2], src[i + 3]]
  }
  // 取多个像素平均，避免单点噪声
  const avg = (x, y, n = 2) => {
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
    // 上下肤色采样（避开眼睛本体：上方取额头/眼睑，下方取脸颊）
    for (let x = minx - PAD; x <= maxx + PAD; x++) {
      const top = avg(x, miny - 9, 2)
      const bot = avg(x, maxy + 11, 2)
      for (let y = miny - PAD; y <= maxy + PAD; y++) {
        // 到 bbox 的有符号距离（0=内部），用于羽化
        const dx = Math.max(minx - x, 0, x - maxx)
        const dy = Math.max(miny - y, 0, y - maxy)
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist >= FEATHER) continue
        const alpha = dist <= 0 ? 255 : Math.round(255 * (1 - dist / FEATHER))
        if (alpha <= 2) continue
        const t = clamp((y - (miny - 4)) / (maxy + 4 - (miny - 4)), 0, 1)
        const r = Math.round(top[0] + (bot[0] - top[0]) * t)
        const g = Math.round(top[1] + (bot[1] - top[1]) * t)
        const b = Math.round(top[2] + (bot[2] - top[2]) * t)
        setPatch(x - X0, y - Y0, r, g, b, alpha)
      }
    }

    // 闭眼弧线：中间略向下、两端上扬，两端渐细渐淡
    const halfW = (maxx - minx) / 2 - 5
    const baseY = cy + 1.5
    for (let i = -halfW; i <= halfW; i++) {
      const t = i / halfW
      const yy = baseY - 3 + 6 * (1 - t * t)
      const thick = 1.9 - 0.7 * Math.abs(t)     // 中间粗、两端细
      const fade = 0.95 - 0.25 * Math.abs(t)
      for (let oy = -2; oy <= 2; oy++) {
        const a = Math.max(0, 1 - Math.abs(oy) / (thick + 0.8)) * fade
        if (a <= 0.02) continue
        const x = Math.round(cx + i)
        const y = Math.round(yy + oy)
        const px0 = x - X0
        const py0 = y - Y0
        if (px0 < 0 || py0 < 0 || px0 >= tw || py0 >= th) continue
        setPatch(px0, py0, 74, 46, 36, Math.round(255 * a))
      }
    }
  })

  await patch.writeAsync(OUT)

  // 预览：原图 + 贴片
  const preview = await Jimp.read(SRC)
  preview.composite(patch, X0, Y0)
  await preview.writeAsync(PREVIEW)

  console.log('eyes patch:', tw, 'x', th, 'at', X0, Y0)
  console.log('pct:', {
    left: (X0 / w * 100).toFixed(2),
    top: (Y0 / h * 100).toFixed(2),
    width: (tw / w * 100).toFixed(2),
    height: (th / h * 100).toFixed(2)
  })
}

main().catch((e) => { console.error(e); process.exit(1) })
