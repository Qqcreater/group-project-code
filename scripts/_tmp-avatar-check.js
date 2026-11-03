/* 临时脚本：打开页面，截图小颐悬浮头像，并检查眼睛层的实际盒子与裁剪区域 */
const puppeteer = require('puppeteer-core')
const Jimp = require('jimp')

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const URL = 'http://localhost:8082/zhongyi/'

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1400,900']
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 900 })
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('zy_current_user', 'test')
    const users = JSON.parse(localStorage.getItem('zy_users') || '[]')
    if (!users.find(u => u.username === 'test')) {
      users.push({ username: 'test', password: 'x', apiKey: '', createdAt: Date.now() })
      localStorage.setItem('zy_users', JSON.stringify(users))
    }
  })
  await page.goto(URL, { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1500))

  const info = await page.evaluate(() => {
    const pic = document.querySelector('.floating-avatar .xy-pic')
    if (!pic) return { error: 'no .xy-pic', body: document.body.innerText.slice(0, 200) }
    const imgs = [...pic.querySelectorAll('img')].map((im, i) => {
      const r = im.getBoundingClientRect()
      return {
        i,
        cls: im.className,
        src: im.getAttribute('src'),
        box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        natural: { w: im.naturalWidth, h: im.naturalHeight },
        clip: getComputedStyle(im).clipPath,
        transform: getComputedStyle(im).transform,
        opacity: getComputedStyle(im).opacity
      }
    })
    return { picBox: pic.getBoundingClientRect().toJSON(), imgs }
  })
  console.log(JSON.stringify(info, null, 2))

  const el = await page.$('.floating-avatar .xy-pic')
  if (el) {
    const box = await el.boundingBox()
    await page.screenshot({ path: 'scripts/_tmp-avatar-rest.png', clip: box })
    // 鼠标移到头像正上方，触发眼球位移
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.1)
    await new Promise(r => setTimeout(r, 400))
    await page.screenshot({ path: 'scripts/_tmp-avatar-look.png', clip: box })
    console.log('screenshots saved', box)
  }
  await browser.close()

  // 统计两张截图里“眼珠”数量
  for (const f of ['scripts/_tmp-avatar-rest.png', 'scripts/_tmp-avatar-look.png']) {
    const img = await Jimp.read(f)
    const w = img.bitmap.width, h = img.bitmap.height
    const d = img.bitmap.data
    const mask = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      if (lum < 80) mask[y * w + x] = 1
    }
    const seen = new Uint8Array(w * h)
    const blobs = []
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x
      if (!mask[p] || seen[p]) continue
      const st = [p]; seen[p] = 1
      let n = 0, minx = x, maxx = x, miny = y, maxy = y
      while (st.length) {
        const q = st.pop(); const qx = q % w, qy = (q - qx) / w
        n++
        if (qx < minx) minx = qx; if (qx > maxx) maxx = qx
        if (qy < miny) miny = qy; if (qy > maxy) maxy = qy
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = qx + dx, ny = qy + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const np = ny * w + nx
          if (!mask[np] || seen[np]) continue
          seen[np] = 1; st.push(np)
        }
      }
      const bw = maxx - minx + 1, bh = maxy - miny + 1
      if (n >= 25 && bw >= 5 && bw <= w * 0.25 && bh >= 4 && bh <= h * 0.2) {
        blobs.push({ n, box: `${minx},${miny} ${bw}x${bh}`, pct: `${(100 * (minx + maxx) / 2 / w).toFixed(1)}%,${(100 * (miny + maxy) / 2 / h).toFixed(1)}%` })
      }
    }
    blobs.sort((a, b) => b.n - a.n)
    console.log('==', f, `${w}x${h}`, 'blobs:', blobs.length)
    blobs.slice(0, 10).forEach(b => console.log('   ', JSON.stringify(b)))
  }
}
main().catch(e => { console.error(e); process.exit(1) })
