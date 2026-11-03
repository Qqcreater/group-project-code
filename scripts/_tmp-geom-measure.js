/* 临时脚本：分割人物轮廓 + 定位深色「眼睛」块，比较截图与素材的相对几何 */
const Jimp = require('jimp')

async function analyze(file, opts) {
  const img = await Jimp.read(file)
  const w = img.bitmap.width, h = img.bitmap.height
  const d = img.bitmap.data
  const isBg = (r, g, b) => {
    // 浅色背景（白/浅绿灰）
    return r > 228 && g > 232 && b > 226 && Math.abs(r - g) < 14 && Math.abs(g - b) < 14
  }
  // 人物包围盒
  let x0 = w, x1 = 0, y0 = h, y1 = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    if (!isBg(d[i], d[i + 1], d[i + 2])) {
      if (x < x0) x0 = x; if (x > x1) x1 = x
      if (y < y0) y0 = y; if (y > y1) y1 = y
    }
  }
  // 深色像素（头发/瞳孔）连通域，找块
  const dark = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    if (lum < 110) dark[y * w + x] = 1
  }
  const seen = new Uint8Array(w * h)
  const blobs = []
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!dark[y * w + x] || seen[y * w + x]) continue
    const stack = [y * w + x]; seen[y * w + x] = 1
    let n = 0, sx = 0, sy = 0, bx0 = w, bx1 = 0, by0 = h, by1 = 0
    while (stack.length) {
      const p = stack.pop(); const py = Math.floor(p / w), px = p % w
      n++; sx += px; sy += py
      if (px < bx0) bx0 = px; if (px > bx1) bx1 = px
      if (py < by0) by0 = py; if (py > by1) by1 = py
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const q = ny * w + nx
        if (dark[q] && !seen[q]) { seen[q] = 1; stack.push(q) }
      }
    }
    if (n >= opts.minBlob) blobs.push({ n, cx: sx / n, cy: sy / n, bw: bx1 - bx0 + 1, bh: by1 - by0 + 1 })
  }
  blobs.sort((a, b) => a.cy - b.cy)
  return { w, h, bbox: { x0, y0, x1, y1 }, figW: x1 - x0 + 1, figH: y1 - y0 + 1, blobs: blobs.slice(0, 12) }
}

async function main() {
  console.log('===== 素材 xiaoyi.png =====')
  const src = await analyze('public/assets/xiaoyi.png', { minBlob: 300 })
  console.log('尺寸', src.w, src.h, '人物框', JSON.stringify(src.bbox), '宽高', src.figW, src.figH)
  src.blobs.forEach(b => {
    const rx = ((b.cx - src.bbox.x0) / src.figW * 100).toFixed(1)
    const ry = ((b.cy - src.bbox.y0) / src.figH * 100).toFixed(1)
    const rxs = (b.bw / src.figW * 100).toFixed(1)
    console.log(`  块 n=${b.n} 中心(人物框内)=(${rx}%, ${ry}%) 宽=${rxs}%`)
  })
  console.log('\n===== 用户截图 =====')
  const usr = await analyze('C:/Users/LENOVO/AppData/Local/CodeBuddyExtension/Data/7b35fdad-5293-44a1-9413-11db94a76789/CodeBuddyIDE/7b35fdad-5293-44a1-9413-11db94a76789/history/6ad2fd5f583f6609860833f1a6b6d478/15d993ef69f848ffadd5aefc9cb8206b/assets/image.e2c83e9a15.png', { minBlob: 30 })
  console.log('尺寸', usr.w, usr.h, '人物框', JSON.stringify(usr.bbox), '宽高', usr.figW, usr.figH)
  usr.blobs.forEach(b => {
    const rx = ((b.cx - usr.bbox.x0) / usr.figW * 100).toFixed(1)
    const ry = ((b.cy - usr.bbox.y0) / usr.figH * 100).toFixed(1)
    const rxs = (b.bw / usr.figW * 100).toFixed(1)
    console.log(`  块 n=${b.n} 中心(人物框内)=(${rx}%, ${ry}%) 宽=${rxs}%`)
  })
}
main().catch(e => { console.error(e); process.exit(1) })
