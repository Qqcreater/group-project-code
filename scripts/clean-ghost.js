/* 清理 xiaoyi_front.png 主体外的 AI 生成杂线（弧形勾线/残影）
 * 原理：连通域分析。最大簇=主体(保留)；其余簇中绿色的是叶子(保留)；
 *       灰色/低饱和的细小簇=杂线(删除)。 */
const Jimp = require('jimp')

const SRC = 'public/assets/xiaoyi_front.png'
const OUT = 'public/assets/xiaoyi_front.png'

async function main() {
  const img = await Jimp.read(SRC)
  const w = img.bitmap.width
  const h = img.bitmap.height
  const data = img.bitmap.data
  console.log('size', w, 'x', h)

  const idx = (x, y) => (y * w + x) * 4
  // 有效像素：alpha > 12
  const vis = new Uint8Array(w * h)
  for (let p = 0; p < w * h; p++) {
    if (data[p * 4 + 3] > 12) vis[p] = 1
  }

  // 8 邻接连通域标记
  const label = new Int32Array(w * h).fill(-1)
  const clusters = [] // {id, pixels:[], minx,miny,maxx,maxy, r,g,b, count}
  const stack = []
  let cid = 0
  for (let p = 0; p < w * h; p++) {
    if (!vis[p] || label[p] >= 0) continue
    // BFS
    const pixels = []
    stack.push(p)
    label[p] = cid
    let minx = w, miny = h, maxx = 0, maxy = 0
    let sr = 0, sg = 0, sb = 0
    while (stack.length) {
      const q = stack.pop()
      const qx = q % w
      const qy = (q - qx) / w
      pixels.push(q)
      if (qx < minx) minx = qx
      if (qx > maxx) maxx = qx
      if (qy < miny) miny = qy
      if (qy > maxy) maxy = qy
      const o = q * 4
      sr += data[o]; sg += data[o + 1]; sb += data[o + 2]
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = qx + dx, ny = qy + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const n = ny * w + nx
          if (vis[n] && label[n] < 0) {
            label[n] = cid
            stack.push(n)
          }
        }
      }
    }
    const cnt = pixels.length
    clusters.push({ id: cid, pixels, minx, miny, maxx, maxy, r: sr / cnt, g: sg / cnt, b: sb / cnt, count: cnt })
    cid++
  }

  clusters.sort((a, b) => b.count - a.count)
  const mainCluster = clusters[0]
  console.log('clusters:', clusters.length, 'main:', mainCluster.count, 'px')

  let removed = 0
  for (let i = 1; i < clusters.length; i++) {
    const c = clusters[i]
    const bw = c.maxx - c.minx + 1
    const bh = c.maxy - c.miny + 1
    const fill = c.count / (bw * bh) // 填充率：细线很低
    const isGreen = c.g > c.r + 18 && c.g > c.b + 18 // 叶子
    const isBig = c.count > 3000 // 大块结构一律保留
    console.log(`cluster#${c.id} px=${c.count} bbox=(${c.minx},${c.miny},${bw}x${bh}) fill=${fill.toFixed(2)} rgb=(${c.r.toFixed(0)},${c.g.toFixed(0)},${c.b.toFixed(0)}) green=${isGreen}`)
    if (!isGreen && !isBig) {
      c.pixels.forEach((q) => {
        data[q * 4 + 3] = 0
        removed++
      })
    }
  }
  console.log('removed px:', removed)

  // 裁掉完全透明的边缘行列（保持图片紧凑）
  await img.writeAsync(OUT)
  console.log('saved', OUT)
}

main().catch((e) => { console.error(e); process.exit(1) })
