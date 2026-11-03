/* 临时脚本：对比“隐藏眼睛层”与“显示眼睛层并移动”的渲染差异 */
const puppeteer = require('puppeteer-core')
const Jimp = require('jimp')

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const URL = 'http://localhost:8082/zhongyi/'

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1500, height: 950 })
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('zy_current_user', 'test')
    const users = JSON.parse(localStorage.getItem('zy_users') || '[]')
    if (!users.find(u => u.username === 'test')) {
      users.push({ username: 'test', password: 'x', apiKey: '', createdAt: Date.now() })
      localStorage.setItem('zy_users', JSON.stringify(users))
    }
  })
  await page.goto(URL, { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1200))
  const fa = await page.$('.floating-avatar')
  if (fa) { await fa.click(); await new Promise(r => setTimeout(r, 800)) }

  // 冻结所有动画，避免比较时抖动
  await page.addStyleTag({ content: `
    .dh-stage .xy-fig, .xy-anim, .floating-avatar .xy-pic { animation: none !important; }
    .xy-eye { transition: none !important; }
  ` })

  const fig = await page.$('.dh-stage .xy-fig')
  const b = await fig.boundingBox()

  // 1) 隐藏眼睛层，作为基准
  await page.evaluate(() => document.querySelectorAll('.dh-stage .xy-eye').forEach(e => { e.style.display = 'none' }))
  await new Promise(r => setTimeout(r, 300))
  await page.screenshot({ path: 'scripts/_tmp0-clean.png', clip: b })

  // 2) 显示眼睛层，并让眼球偏移
  await page.evaluate(() => document.querySelectorAll('.dh-stage .xy-eye').forEach(e => { e.style.display = '' }))
  await page.mouse.move(b.x + b.width * 0.9, b.y + b.height * 0.9)
  await new Promise(r => setTimeout(r, 400))
  const st = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.dh-stage .xy-eye')]
    return els.map(e => getComputedStyle(e).transform)
  })
  console.log('eye transforms with mouse bottom-right:', st)
  await page.screenshot({ path: 'scripts/_tmp1-eyes.png', clip: b })

  await browser.close()

  const a = await Jimp.read('scripts/_tmp0-clean.png')
  const c = await Jimp.read('scripts/_tmp1-eyes.png')
  const w = a.bitmap.width, h = a.bitmap.height
  console.log('size', w, h)
  let diffPixels = 0, maxDiff = 0
  const rows = {}
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    const d = Math.abs(a.bitmap.data[i] - c.bitmap.data[i]) + Math.abs(a.bitmap.data[i + 1] - c.bitmap.data[i + 1]) + Math.abs(a.bitmap.data[i + 2] - c.bitmap.data[i + 2])
    if (d > 24) {
      diffPixels++
      const key = `${Math.floor(100 * y / h / 5) * 5}%`
      rows[key] = (rows[key] || 0) + 1
    }
    if (d > maxDiff) maxDiff = d
  }
  console.log('diff pixels(>24):', diffPixels, 'of', w * h, 'maxDiff', maxDiff)
  const sorted = Object.entries(rows).sort((a, b) => b[1] - a[1]).slice(0, 8)
  console.log('diff分布（按y带）:', JSON.stringify(sorted))
}
main().catch(e => { console.error(e); process.exit(1) })
