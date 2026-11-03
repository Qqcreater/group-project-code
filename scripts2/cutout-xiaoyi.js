/* 一次性脚本 v2：小颐正面图抠图（边缘泛洪法，保护内部浅色主体） */
const Jimp = require('jimp')

const SRC = 'C:/Users/LENOVO/Downloads/jimeng-2026-09-11-6436-基于参考图转成完全正视图，严格锁定原角色所有特征不漂移：软萌Q版小中医女孩，黑头....png'
const OUT = 'public/assets/xiaoyi_front.png'

const T_BG = 40    // 与背景色距 < T_BG 才可能是背景（60 会渗入浅黄裙摆 d≈56）
const T_STEP = 45  // 泛洪相邻步进的最大色距（保证沿渐变区蔓延）

function dist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

async function main() {
  const img = await Jimp.read(SRC)
  const W = img.bitmap.width, H = img.bitmap.height
  const data = img.bitmap.data
  console.log('loaded', W, 'x', H)

  // 1. 采样四角背景色
  let sr = 0, sg = 0, sb = 0, sn = 0
  for (const [cx, cy] of [[0, 0], [W - 12, 0], [0, H - 12], [W - 12, H - 12]]) {
    for (let y = cy; y < cy + 12; y++) {
      for (let x = cx; x < cx + 12; x++) {
        const i = (y * W + x) * 4
        sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; sn++
      }
    }
  }
  const bg = { r: sr / sn, g: sg / sn, b: sb / sn }
  console.log('bg color:', bg.r.toFixed(1), bg.g.toFixed(1), bg.b.toFixed(1))

  // 2. 水印区置为背景色（之后被泛洪自然吞掉）
  const fillRectBg = (x0, y0, x1, y1) => {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * W + x) * 4
        data[i] = bg.r; data[i + 1] = bg.g; data[i + 2] = bg.b; data[i + 3] = 255
      }
    }
  }
  fillRectBg(0, 0, Math.floor(W * 0.30), Math.floor(H * 0.13))          // 左上「AI生成」
  fillRectBg(Math.floor(W * 0.68), Math.floor(H * 0.86), W, H)          // 右下「即梦AI」

  // 3. 边缘泛洪：只清除与画布边缘连通的背景/烟雾/水印
  const isBg = new Uint8Array(W * H)
  const queue = new Int32Array(W * H)
  let head = 0, tail = 0
  const push = (x, y) => {
    const p = y * W + x
    if (isBg[p]) return
    const i = p * 4
    if (dist(data[i], data[i + 1], data[i + 2], bg.r, bg.g, bg.b) >= T_BG) return
    isBg[p] = 1
    queue[tail++] = p
  }
  // 种子：四条边
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1) }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y) }
  // BFS
  while (head < tail) {
    const p = queue[head++]
    const x = p % W, y = (p / W) | 0
    const i = p * 4
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
      const np = ny * W + nx
      if (isBg[np]) continue
      const ni = np * 4
      if (dist(data[ni], data[ni + 1], data[ni + 2], bg.r, bg.g, bg.b) >= T_BG) continue
      if (dist(data[ni], data[ni + 1], data[ni + 2], data[i], data[i + 1], data[i + 2]) >= T_STEP) continue
      isBg[np] = 1
      queue[tail++] = np
    }
  }
  console.log('bg pixels:', tail, Math.round(tail * 100 / (W * H)) + '%')

  // 4. 清理封闭孔洞：颜色接近背景的封闭小区域（泛洪够不到的背景碎块）
  const visited = new Uint8Array(W * H)
  const comp = new Int32Array(W * H)
  for (let start = 0; start < W * H; start++) {
    if (isBg[start] || visited[start]) continue
    const si = start * 4
    // 候选：接近背景白米色的像素（排除肤色手部、绿色叶片、深色描边）
    const r0 = data[si], g0 = data[si + 1], b0 = data[si + 2]
    if (dist(r0, g0, b0, bg.r, bg.g, bg.b) >= 32) continue
    // 只清理头部/药草区域的孔洞，避免误删衣服上的浅色部件
    const sy = (start / W) / H
    if (sy >= 0.4) continue
    // BFS 收集该连通域
    let head2 = 0, tail2 = 0, area = 0
    comp[tail2++] = start
    visited[start] = 1
    while (head2 < tail2) {
      const p = comp[head2++]
      area++
      const x = p % W, y = (p / W) | 0
      const i = p * 4
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        const np = ny * W + nx
        if (isBg[np] || visited[np]) continue
        const ni = np * 4
        const dr = Math.abs(data[ni] - r0), dg = Math.abs(data[ni + 1] - g0), db2 = Math.abs(data[ni + 2] - b0)
        if (dr + dg + db2 > 42) continue
        visited[np] = 1
        comp[tail2++] = np
      }
    }
    // 小面积白色封闭区 = 背景残块，清除
    if (area < 25000) {
      for (let k = 0; k < tail2; k++) data[comp[k] * 4 + 3] = 0
      console.log('removed hole:', area, 'px', 'at y≈', Math.round(((start / W) / H) * 100) + '%')
    }
  }

  // 4.5 清理头部区的烟雾残迹：与已清除背景相邻、颜色仍接近背景的封闭小岛
  // 跑 3 遍：第一遍清外圈晕圈后，内层白线即可与清区相邻而被清掉
  const adjVisited = new Uint8Array(W * H)
  for (let pass = 0; pass < 3; pass++) {
    adjVisited.fill(0)
    for (let start = 0; start < W * H; start++) {
    if (isBg[start] || adjVisited[start]) continue
    const sy = (start / W) / H
    if (sy >= 0.5) continue
    const si = start * 4
    if (dist(data[si], data[si + 1], data[si + 2], bg.r, bg.g, bg.b) >= 62) continue
    // 必须与已清除背景相邻
    const sx = (start % W) / W
    let touch = false
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx2 = (start % W) + dx, ny2 = ((start / W) | 0) + dy
      if (nx2 >= 0 && ny2 >= 0 && nx2 < W && ny2 < H && isBg[ny2 * W + nx2]) { touch = true; break }
    }
    if (!touch) continue
    // BFS 收集连通域（色差放宽至与种子差 60）
    let head3 = 0, tail3 = 0, area3 = 0
    const comp3 = new Int32Array(600000)
    comp3[tail3++] = start
    adjVisited[start] = 1
    while (head3 < tail3) {
      const p = comp3[head3++]
      area3++
      const x = p % W, y = (p / W) | 0
      const i = p * 4
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        const np = ny * W + nx
        if (isBg[np] || adjVisited[np]) continue
        const ni = np * 4
        if (Math.abs(data[ni] - data[si]) + Math.abs(data[ni + 1] - data[si + 1]) + Math.abs(data[ni + 2] - data[si + 2]) > 60) continue
        adjVisited[np] = 1
        if (tail3 < comp3.length) comp3[tail3++] = np
      }
    }
    if (area3 < 40000) {
      for (let k = 0; k < head3; k++) data[comp3[k] * 4 + 3] = 0
      console.log('removed smoke trail:', area3, 'px at y≈', Math.round(sy * 100) + '%')
    }
    }
  }

  // 5. 背景置透明 + 边缘 1px 半透明羽化
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x
      const i = p * 4
      if (isBg[p]) { data[i + 3] = 0; continue }
      // 邻居中有背景 → 边缘像素，降 alpha 平滑锯齿
      let edge = false
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && isBg[ny * W + nx]) { edge = true; break }
      }
      if (edge) data[i + 3] = 200
    }
  }

  // 5. bbox（alpha > 128）
  let minX = W, minY = H, maxX = 0, maxY = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 128) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  console.log('bbox:', minX, minY, maxX, maxY, '(', maxX - minX, 'x', maxY - minY, ')')

  // 6. 15% padding 裁剪
  const pad = 0.15
  const cx0 = Math.max(0, Math.floor(minX - (maxX - minX) * pad))
  const cy0 = Math.max(0, Math.floor(minY - (maxY - minY) * pad))
  const cx1 = Math.min(W, Math.ceil(maxX + (maxX - minX) * pad))
  const cy1 = Math.min(H, Math.ceil(maxY + (maxY - minY) * pad))
  img.crop(cx0, cy0, cx1 - cx0, cy1 - cy0)
  console.log('cropped to', img.bitmap.width, 'x', img.bitmap.height)

  // 7. 缩放长边 1000 + 输出
  const long = Math.max(img.bitmap.width, img.bitmap.height)
  if (long > 1000) img.scale(1000 / long)
  await img.writeAsync(OUT)
  console.log('saved:', OUT, Math.round(require('fs').statSync(OUT).size / 1024), 'KB')
}

main().catch(e => { console.error(e); process.exit(1) })
