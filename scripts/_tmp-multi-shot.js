/* 临时脚本：多分辨率截图悬浮头像 + 工作台立绘，人工目视检查 */
const puppeteer = require('puppeteer-core')
const Jimp = require('jimp')

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('zy_current_user', 'test')
    const us = JSON.parse(localStorage.getItem('zy_users') || '[]')
    if (!us.find(x => x.username === 'test')) {
      us.push({ username: 'test', password: 'x', apiKey: '', createdAt: Date.now() })
      localStorage.setItem('zy_users', JSON.stringify(us))
    }
  })
  await page.goto('http://localhost:8082/zhongyi/', { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1200))
  await page.addStyleTag({ content: '.dh-stage .xy-fig,.xy-anim{animation:none !important}' })

  for (const [w, h] of [[1500, 950], [1280, 800], [1024, 720]]) {
    await page.setViewport({ width: w, height: h })
    await new Promise(r => setTimeout(r, 500))
    const el = await page.$('.floating-avatar')
    if (!el) { console.log(w, 'no avatar'); continue }
    const b = await el.boundingBox()
    // 放大 3 倍截图，便于目视
    const clip = { x: b.x, y: Math.max(0, b.y - 4), width: Math.min(b.width + 8, w - b.x), height: Math.min(b.height + 8, h - b.y) }
    await page.screenshot({ path: `scripts/_tmp-v${w}-avatar.png`, clip })
    const img = await Jimp.read(`scripts/_tmp-v${w}-avatar.png`)
    await img.scale(3, Jimp.RESIZE_NEAREST_NEIGHBOR).writeAsync(`scripts/_tmp-v${w}-avatar.png`)
    const info = await page.evaluate(() => {
      const box = document.querySelector('.floating-avatar .xy-pic')
      const img = box.querySelector('img')
      const cs = getComputedStyle(box)
      const eyes = [...box.querySelectorAll('.xy-eye')].map(e => {
        const r = e.getBoundingClientRect(), b = box.getBoundingClientRect()
        return `${e.className.replace('xy-eye ', '')}: left=${(100 * (r.left - b.left) / b.width).toFixed(1)}% top=${(100 * (r.top - b.top) / b.height).toFixed(1)}% w=${r.width.toFixed(1)}px h=${r.height.toFixed(1)}px`
      })
      return { box: `${box.offsetWidth}x${box.offsetHeight}`, img: `${img.offsetWidth}x${img.offsetHeight}`, vars: `w=${cs.getPropertyValue('--fig-w')} h=${cs.getPropertyValue('--fig-h')}`, eyes }
    })
    console.log(`viewport ${w}x${h}:`, JSON.stringify(info, null, 1))
  }
  await browser.close()
}
main().catch(e => { console.error(e); process.exit(1) })
