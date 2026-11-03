/* 生成视频 alphamerge 用的轮廓遮罩：把 PNG 的 alpha 按「全身合成」对齐参数映射到视频帧坐标
   对齐参数（Option D，seam@PNG 0.71）：
     video displayed width = 1.048 × PNG width, left = -0.0313 × PNG width
     video displayed top   = 0.0656 × PNG height, height = 0.6710 × PNG height
*/
const Jimp = require('jimp')

const FW = 636, FH = 606          // 裁掉底部水印后视频尺寸
const KW = 1.048, OFF_X = -0.0313 // 相对 PNG 宽度
const TOP = 0.0656, KH = 0.6710   // 相对 PNG 高度
const PW = 672, PH = 1000         // PNG 尺寸

async function main() {
  const png = await Jimp.read('public/assets/xiaoyi_front.png')
  const pd = png.bitmap.data

  const matte = new Jimp(FW, FH, 0x000000ff)
  const md = matte.bitmap.data

  // 1. 按 mapping 采样 PNG alpha
  for (let y = 0; y < FH; y++) {
    const py = Math.round((TOP + (y / FH) * KH) * PH)
    if (py < 0 || py >= PH) continue
    for (let x = 0; x < FW; x++) {
      const px = Math.round(((x / FW) * KW + OFF_X) * PW)
      if (px < 0 || px >= PW) continue
      const a = pd[(py * PW + px) * 4 + 3]
      if (a > 100) {
        const i = (y * FW + x) * 4
        md[i] = 255; md[i + 1] = 255; md[i + 2] = 255
      }
    }
  }

  // 2. 填充封闭孔洞（手臂与身体间的背景缝隙，PNG 是洞但视频里是身体）
  const vis = new Uint8Array(FW * FH)
  const stack = []
  for (let x = 0; x < FW; x++) { stack.push(x, (FH - 1) * FW + x) }
  for (let y = 0; y < FH; y++) { stack.push(y * FW, y * FW + FW - 1) }
  const isBody = p => md[p * 4] > 127
  for (const p of stack) if (!isBody(p)) vis[p] = 1
  while (stack.length) {
    const p = stack.pop()
    const x = p % FW, y = (p / FW) | 0
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= FW || ny >= FH) continue
      const np = ny * FW + nx
      if (!vis[np] && !isBody(np)) { vis[np] = 1; stack.push(np) }
    }
  }
  let filled = 0
  for (let p = 0; p < FW * FH; p++) {
    if (!isBody(p) && !vis[p]) { md[p * 4] = 255; md[p * 4 + 1] = 255; md[p * 4 + 2] = 255; filled++ }
  }
  console.log('filled holes px:', filled)

  // 3. 轻微膨胀(2px) + 模糊，柔化边缘
  for (let round = 0; round < 2; round++) {
    const copy = Buffer.from(md)
    for (let y = 1; y < FH - 1; y++) {
      for (let x = 1; x < FW - 1; x++) {
        const p = y * FW + x
        if (copy[p * 4] > 200) {
          for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1], [x - 1, y - 1], [x + 1, y + 1], [x - 1, y + 1], [x + 1, y - 1]]) {
            const np = ny * FW + nx
            if (copy[np * 4] < 200) { md[np * 4] = 255; md[np * 4 + 1] = 255; md[np * 4 + 2] = 255 }
          }
        }
      }
    }
  }
  matte.blur(2)

  await matte.writeAsync('scripts/talk_matte.png')
  console.log('saved scripts/talk_matte.png')
}

main().catch(e => { console.error(e); process.exit(1) })
