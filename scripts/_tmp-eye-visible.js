/* 临时脚本：固定鼠标位置，比较“眼睛层显示/隐藏”的渲染差异，判断叠加层是否产生可见重影 */
const puppeteer = require('puppeteer-core')
const Jimp = require('jimp')

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1500, height: 950 })
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
  const fa = await page.$('.floating-avatar')
  if (fa) { await fa.click(); await new Promise(r => setTimeout(r, 800)) }

  await page.addStyleTag({ content: '.dh-stage .xy-fig,.xy-anim{animation:none !important}.xy-eye{transition:none !important}' })
  const fig = await page.$('.dh-stage .xy-fig')
  const b = await fig.boundingBox()

  await page.mouse.move(b.x + b.width * 0.92, b.y + b.height * 0.95)
  await new Promise(r => setTimeout(r, 500))
  await page.screenshot({ path: 'scripts/_tmpA-eyes-on.png', clip: b })
  const t = await page.evaluate(() => [...document.querySelectorAll('.dh-stage .xy-eye')].map(e => getComputedStyle(e).transform))

  await page.evaluate(() => document.querySelectorAll('.dh-stage .xy-eye').forEach(e => { e.style.display = 'none' }))
  await new Promise(r => setTimeout(r, 300))
  await page.screenshot({ path: 'scripts/_tmpB-eyes-off.png', clip: b })
  await browser.close()

  const A = await Jimp.read('scripts/_tmpA-eyes-on.png')
  const B = await Jimp.read('scripts/_tmpB-eyes-off.png')
  const w = A.bitmap.width, h = A.bitmap.height
  let cnt = 0, max = 0, minx = 1e9, maxx = -1, miny = 1e9, maxy = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    const dd = Math.abs(A.bitmap.data[i] - B.bitmap.data[i]) + Math.abs(A.bitmap.data[i + 1] - B.bitmap.data[i + 1]) + Math.abs(A.bitmap.data[i + 2] - B.bitmap.data[i + 2])
    if (dd > 24) { cnt++; if (dd > max) max = dd; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y }
  }
  console.log('transforms:', t)
  console.log('eye-layer visible diff pixels:', cnt, 'maxDiff', max)
  console.log('diff bbox pct: x', (100 * minx / w).toFixed(1) + '-' + (100 * maxx / w).toFixed(1) + '%  y', (100 * miny / h).toFixed(1) + '-' + (100 * maxy / h).toFixed(1) + '%')
}
main().catch(e => { console.error(e); process.exit(1) })
