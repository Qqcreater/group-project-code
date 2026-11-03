/* 临时脚本：内联几何版眼球层验证——目视截图 + 静止无缝 + 夸张位移边界 */
const puppeteer = require('puppeteer-core')
const Jimp = require('jimp')

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

async function diff(f1, f2, th = 40) {
  const A = await Jimp.read(f1), B = await Jimp.read(f2)
  const w = A.bitmap.width, h = A.bitmap.height
  let cnt = 0
  const bands = {}
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    const d = Math.abs(A.bitmap.data[i] - B.bitmap.data[i]) + Math.abs(A.bitmap.data[i + 1] - B.bitmap.data[i + 1]) + Math.abs(A.bitmap.data[i + 2] - B.bitmap.data[i + 2])
    if (d > th) { cnt++; const k = Math.floor(100 * y / h / 2) * 2; bands[k] = (bands[k] || 0) + 1 }
  }
  return { cnt, bands: Object.entries(bands).sort((a, b) => b[1] - a[1]).slice(0, 4) }
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800 })
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('zy_current_user', 'test')
    const us = JSON.parse(localStorage.getItem('zy_users') || '[]')
    if (!us.find(x => x.username === 'test')) {
      us.push({ username: 'test', password: 'x', apiKey: '', createdAt: Date.now() })
      localStorage.setItem('zy_users', JSON.stringify(us))
    }
  })
  await page.goto('http://localhost:8082/zhongyi/', { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1300))
  await page.addStyleTag({ content: '.dh-stage .xy-fig,.xy-anim,.floating-avatar{animation:none !important}.xy-eye-img{transition:none !important}' })

  // --- 悬浮头像 ---
  const el = await page.$('.floating-avatar .xy-pic')
  const bb = await el.boundingBox()
  await page.evaluate(() => document.querySelectorAll('.floating-avatar .xy-eye').forEach(e => { e.style.visibility = 'hidden' }))
  await new Promise(r => setTimeout(r, 150))
  await page.screenshot({ path: 'scripts/_tmp-i-clean.png', clip: bb })
  await page.evaluate(() => document.querySelectorAll('.floating-avatar .xy-eye').forEach(e => { e.style.visibility = '' }))
  await new Promise(r => setTimeout(r, 150))
  await page.screenshot({ path: 'scripts/_tmp-i-eyes.png', clip: bb })
  console.log('悬浮头像 静止差异:', JSON.stringify(await diff('scripts/_tmp-i-clean.png', 'scripts/_tmp-i-eyes.png')))
  const img = await Jimp.read('scripts/_tmp-i-eyes.png')
  await img.scale(3, Jimp.RESIZE_NEAREST_NEIGHBOR).writeAsync('scripts/_tmp-i-avatar.png')

  // --- 工作台立绘 ---
  await (await page.$('.floating-avatar')).click()
  await new Promise(r => setTimeout(r, 900))
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await new Promise(r => setTimeout(r, 400))
  const fig = await page.$('.dh-stage .xy-fig')
  const fb = await fig.boundingBox()
  await page.evaluate(() => document.querySelectorAll('.dh-stage .xy-eye').forEach(e => { e.style.visibility = 'hidden' }))
  await new Promise(r => setTimeout(r, 150))
  await page.screenshot({ path: 'scripts/_tmp-s-clean.png', clip: fb })
  await page.evaluate(() => document.querySelectorAll('.dh-stage .xy-eye').forEach(e => { e.style.visibility = '' }))
  await new Promise(r => setTimeout(r, 150))
  await page.screenshot({ path: 'scripts/_tmp-s-eyes.png', clip: fb })
  console.log('立绘 静止差异:', JSON.stringify(await diff('scripts/_tmp-s-clean.png', 'scripts/_tmp-s-eyes.png')))
  // 夸张位移 6px：必须仍只落在眼睛条带
  await page.addStyleTag({ content: '.dh-stage .xy-eye-img{transform:translate(0,-6px) !important}' })
  await new Promise(r => setTimeout(r, 200))
  await page.screenshot({ path: 'scripts/_tmp-s-shift.png', clip: fb })
  console.log('立绘 夸张6px位移差异:', JSON.stringify(await diff('scripts/_tmp-s-clean.png', 'scripts/_tmp-s-shift.png')))
  // 缩放窗口后再检查几何是否自动跟上
  await page.setViewport({ width: 1024, height: 720 })
  await new Promise(r => setTimeout(r, 500))
  const info = await page.evaluate(() => {
    const box = document.querySelector('.dh-stage .xy-fig')
    const img = box.querySelector('img')
    const win = box.querySelector('.xy-eye-l')
    const wr = win.getBoundingClientRect(), br = box.getBoundingClientRect(), ir = img.getBoundingClientRect()
    return {
      img: +(100 * ir.width / br.width).toFixed(1) + '%',
      winL: +(100 * (wr.left - br.left) / br.width).toFixed(1) + '%',
      winT: +(100 * (wr.top - br.top) / br.height).toFixed(1) + '%'
    }
  })
  console.log('缩放后窗口几何(应仍为 l≈37.9% t≈30.0%):', JSON.stringify(info))
  await browser.close()
}
main().catch(e => { console.error(e); process.exit(1) })
