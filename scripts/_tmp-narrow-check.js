/* 临时脚本：窄屏(≤768px)下悬浮头像渲染检查 */
const puppeteer = require('puppeteer-core')
const Jimp = require('jimp')

async function main() {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 700, height: 900 })
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('zy_current_user', 'test')
    const us = JSON.parse(localStorage.getItem('zy_users') || '[]')
    if (!us.find(x => x.username === 'test')) {
      us.push({ username: 'test', password: 'x', apiKey: '', createdAt: Date.now() })
      localStorage.setItem('zy_users', JSON.stringify(us))
    }
  })
  await page.goto('http://localhost:8082/zhongyi/', { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1500))
  await page.addStyleTag({ content: '.floating-avatar,.xy-anim,.dh-stage .xy-fig{animation:none !important}.xy-eye-img{transition:none !important}' })
  const el = await page.$('.floating-avatar .xy-pic')
  const bb = await el.boundingBox()
  console.log('窄屏头像盒:', bb.width, 'x', bb.height, '(媒体查询应缩到 184)')
  await page.evaluate(() => document.querySelectorAll('.floating-avatar .xy-eye').forEach(e => { e.style.visibility = 'hidden' }))
  await new Promise(r => setTimeout(r, 120))
  await page.screenshot({ path: 'scripts/_tmp-n-clean.png', clip: bb })
  await page.evaluate(() => document.querySelectorAll('.floating-avatar .xy-eye').forEach(e => { e.style.visibility = '' }))
  await new Promise(r => setTimeout(r, 120))
  await page.screenshot({ path: 'scripts/_tmp-n-eyes.png', clip: bb })
  const A = await Jimp.read('scripts/_tmp-n-clean.png'), B = await Jimp.read('scripts/_tmp-n-eyes.png')
  const w = A.bitmap.width, h = A.bitmap.height
  function diff(x0, x1, y0, y1) {
    let c = 0, t = 0
    for (let y = Math.floor(h * y0); y < h * y1; y++) for (let x = Math.floor(w * x0); x < w * x1; x++) {
      const i = (y * w + x) * 4
      const d = Math.abs(A.bitmap.data[i] - B.bitmap.data[i]) + Math.abs(A.bitmap.data[i + 1] - B.bitmap.data[i + 1]) + Math.abs(A.bitmap.data[i + 2] - B.bitmap.data[i + 2])
      if (d > 40) c++; t++
    }
    return c + '/' + t
  }
  console.log('左眼窗口内差异:', diff(0.415, 0.497, 0.315, 0.373))
  console.log('右眼窗口内差异:', diff(0.504, 0.586, 0.301, 0.359))
  console.log('发髻区差异(应≈0):', diff(0.2, 0.8, 0.15, 0.28))
  const img = await Jimp.read('scripts/_tmp-n-eyes.png')
  await img.scale(3, Jimp.RESIZE_NEAREST_NEIGHBOR).writeAsync('scripts/_tmp-n-avatar.png')
  await browser.close()
}
main().catch(e => { console.error(e); process.exit(1) })
