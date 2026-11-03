/* 临时脚本：验证重做后的眼球窗口——几何是否贴合、静止时是否无缝、移动时是否只影响窗口内 */
const puppeteer = require('puppeteer-core')
const Jimp = require('jimp')

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const URL = 'http://localhost:8082/zhongyi/'

async function shot(page, sel, path) {
  const el = await page.$(sel)
  const b = await el.boundingBox()
  await page.screenshot({ path, clip: b })
  return b
}

function diffBox(f1, f2) {
  return (async () => {
    const A = await Jimp.read(f1), B = await Jimp.read(f2)
    const w = A.bitmap.width, h = A.bitmap.height
    let cnt = 0, max = 0, minx = 1e9, maxx = -1, miny = 1e9, maxy = -1
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const d = Math.abs(A.bitmap.data[i] - B.bitmap.data[i]) + Math.abs(A.bitmap.data[i + 1] - B.bitmap.data[i + 1]) + Math.abs(A.bitmap.data[i + 2] - B.bitmap.data[i + 2])
      if (d > 20) { cnt++; if (d > max) max = d; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y }
    }
    return { cnt, max, box: cnt ? `${(100 * minx / w).toFixed(1)}-${(100 * maxx / w).toFixed(1)}% x, ${(100 * miny / h).toFixed(1)}-${(100 * maxy / h).toFixed(1)}% y` : '-' , w, h }
  })()
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
  await page.goto(URL, { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1500))
  await page.addStyleTag({ content: '.dh-stage .xy-fig,.xy-anim,.floating-avatar .xy-pic{animation:none !important}.xy-eye-img{transition:none !important}' })

  // ---- 悬浮头像 ----
  const floatInfo = await page.evaluate(() => {
    const box = document.querySelector('.floating-avatar .xy-pic')
    const base = box.querySelector('img')
    const cs = getComputedStyle(box)
    const eyes = [...box.querySelectorAll('.xy-eye')].map(e => {
      const r = e.getBoundingClientRect(), b = box.getBoundingClientRect()
      const im = e.querySelector('img').getBoundingClientRect()
      return {
        cls: e.className,
        win: { l: +(100 * (r.left - b.left) / b.width).toFixed(2), t: +(100 * (r.top - b.top) / b.height).toFixed(2), w: +(100 * r.width / b.width).toFixed(2), h: +(100 * r.height / b.height).toFixed(2) },
        img: { l: +(im.left - r.left).toFixed(1), t: +(im.top - r.top).toFixed(1), w: +im.width.toFixed(1), h: +im.height.toFixed(1) }
      }
    })
    return { vars: { w: cs.getPropertyValue('--fig-w'), h: cs.getPropertyValue('--fig-h') }, base: { w: base.offsetWidth, h: base.offsetHeight }, eyes }
  })
  console.log('悬浮头像:', JSON.stringify(floatInfo, null, 1))

  await page.mouse.move(10, 10)
  await page.evaluate(() => document.querySelectorAll('.floating-avatar .xy-eye').forEach(e => { e.style.visibility = 'hidden' }))
  await new Promise(r => setTimeout(r, 200))
  await shot(page, '.floating-avatar .xy-pic', 'scripts/_tmp-f-clean.png')
  await page.evaluate(() => document.querySelectorAll('.floating-avatar .xy-eye').forEach(e => { e.style.visibility = '' }))
  await new Promise(r => setTimeout(r, 200))
  await shot(page, '.floating-avatar .xy-pic', 'scripts/_tmp-f-eyes.png')
  console.log('悬浮头像 静止差异:', JSON.stringify(await diffBox('scripts/_tmp-f-clean.png', 'scripts/_tmp-f-eyes.png')))

  // ---- 工作台立绘 ----
  const fa = await page.$('.floating-avatar')
  await fa.click()
  await new Promise(r => setTimeout(r, 900))
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await new Promise(r => setTimeout(r, 300))

  const stageInfo = await page.evaluate(() => {
    const box = document.querySelector('.dh-stage .xy-fig')
    const base = box.querySelector('img')
    const cs = getComputedStyle(box)
    const eyes = [...box.querySelectorAll('.xy-eye')].map(e => {
      const r = e.getBoundingClientRect(), b = box.getBoundingClientRect()
      const im = e.querySelector('img').getBoundingClientRect()
      return {
        cls: e.className,
        win: { l: +(100 * (r.left - b.left) / b.width).toFixed(2), t: +(100 * (r.top - b.top) / b.height).toFixed(2), w: +(100 * r.width / b.width).toFixed(2), h: +(100 * r.height / b.height).toFixed(2) },
        img: { l: +(im.left - r.left).toFixed(1), t: +(im.top - r.top).toFixed(1), w: +im.width.toFixed(1), h: +im.height.toFixed(1) }
      }
    })
    return { vars: { w: cs.getPropertyValue('--fig-w'), h: cs.getPropertyValue('--fig-h') }, base: { w: base.offsetWidth, h: base.offsetHeight }, eyes }
  })
  console.log('工作台立绘:', JSON.stringify(stageInfo, null, 1))

  await page.evaluate(() => document.querySelectorAll('.dh-stage .xy-eye').forEach(e => { e.style.visibility = 'hidden' }))
  await new Promise(r => setTimeout(r, 200))
  await shot(page, '.dh-stage .xy-fig', 'scripts/_tmp-s-clean.png')
  await page.evaluate(() => document.querySelectorAll('.dh-stage .xy-eye').forEach(e => { e.style.visibility = '' }))
  await new Promise(r => setTimeout(r, 200))
  await shot(page, '.dh-stage .xy-fig', 'scripts/_tmp-s-eyes.png')
  console.log('立绘 静止差异:', JSON.stringify(await diffBox('scripts/_tmp-s-clean.png', 'scripts/_tmp-s-eyes.png')))

  // 鼠标移远 → 眼球有明显位移，再对比
  const b = await (await page.$('.dh-stage .xy-fig')).boundingBox()
  await page.mouse.move(b.x + b.width * 0.98, b.y + b.height * 0.98)
  await new Promise(r => setTimeout(r, 400))
  const tr = await page.evaluate(() => [...document.querySelectorAll('.dh-stage .xy-eye-img')].map(e => getComputedStyle(e).transform))
  await shot(page, '.dh-stage .xy-fig', 'scripts/_tmp-s-moved.png')
  console.log('眼球位移 transform:', tr)
  console.log('立绘 移动后差异:', JSON.stringify(await diffBox('scripts/_tmp-s-clean.png', 'scripts/_tmp-s-moved.png')))

  await browser.close()
}
main().catch(e => { console.error(e); process.exit(1) })
