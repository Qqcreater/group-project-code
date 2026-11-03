/* 临时脚本：把眼球层强行放大位移（夸张到 6px），验证画面里绝不会出现第二双眼睛 */
const puppeteer = require('puppeteer-core')
const Jimp = require('jimp')

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function diffBox(f1, f2) {
  const A = await Jimp.read(f1), B = await Jimp.read(f2)
  const w = A.bitmap.width, h = A.bitmap.height
  let cnt = 0
  const rowBand = {}
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    const d = Math.abs(A.bitmap.data[i] - B.bitmap.data[i]) + Math.abs(A.bitmap.data[i + 1] - B.bitmap.data[i + 1]) + Math.abs(A.bitmap.data[i + 2] - B.bitmap.data[i + 2])
    if (d > 40) { cnt++; const k = Math.floor(100 * y / h / 2) * 2; rowBand[k] = (rowBand[k] || 0) + 1 }
  }
  return { cnt, bands: Object.entries(rowBand).sort((a, b) => b[1] - a[1]).slice(0, 6) }
}

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
  await page.addStyleTag({ content: '.dh-stage .xy-fig,.xy-anim{animation:none !important}' })
  await (await page.$('.floating-avatar')).click()
  await new Promise(r => setTimeout(r, 900))
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await new Promise(r => setTimeout(r, 300))

  const fig = await page.$('.dh-stage .xy-fig')
  const b = await fig.boundingBox()
  await page.evaluate(() => document.querySelectorAll('.dh-stage .xy-eye').forEach(e => { e.style.visibility = 'hidden' }))
  await new Promise(r => setTimeout(r, 150))
  await page.screenshot({ path: 'scripts/_tmp-b-clean.png', clip: b })
  await page.evaluate(() => document.querySelectorAll('.dh-stage .xy-eye').forEach(e => { e.style.visibility = '' }))
  // 夸张位移：垂直 6px（实际代码上限约 1px）
  await page.addStyleTag({ content: '.dh-stage .xy-eye-img{transform: translate(0,-6px) !important; transition:none !important}' })
  await new Promise(r => setTimeout(r, 200))
  await page.screenshot({ path: 'scripts/_tmp-b-shift.png', clip: b })
  console.log('夸张 6px 位移后的差异（应只落在两只眼睛的水平条带内）:', JSON.stringify(await diffBox('scripts/_tmp-b-clean.png', 'scripts/_tmp-b-shift.png')))
  await browser.close()
}
main().catch(e => { console.error(e); process.exit(1) })
