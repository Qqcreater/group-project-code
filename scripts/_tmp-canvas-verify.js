/* 临时脚本：canvas 版形象验证（静止画面 + 眼球跟随 + 展开工作台） */
const puppeteer = require('puppeteer-core')
const Jimp = require('jimp')

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

async function shot(page, sel, file, scale = 3) {
  const el = await page.$(sel)
  if (!el) { console.log('缺少元素', sel); return null }
  const b = await el.boundingBox()
  await page.screenshot({ path: file, clip: b })
  const img = await Jimp.read(file)
  await img.scale(scale, Jimp.RESIZE_NEAREST_NEIGHBOR).writeAsync(file)
  return b
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
  await new Promise(r => setTimeout(r, 1800))
  await page.addStyleTag({ content: '.floating-avatar,.xy-anim,.dh-stage .xy-fig{animation:none !important}' })

  // 1) 静止态（鼠标在左上角，无眼球位移）
  await page.mouse.move(5, 5)
  await new Promise(r => setTimeout(r, 300))
  const fb = await shot(page, '.floating-avatar .xy-pic', 'scripts/_tmp-c-float.png')
  console.log('悬浮头像盒:', fb && `${fb.width}x${fb.height}`)

  // 2) 鼠标贴近头像 -> 眼球微移
  await page.mouse.move(Math.round(fb.x + fb.width * 0.9), Math.round(fb.y + fb.height * 0.4))
  await new Promise(r => setTimeout(r, 400))
  await shot(page, '.floating-avatar .xy-pic', 'scripts/_tmp-c-float-look.png')

  // 3) 展开工作台
  await page.click('.floating-avatar')
  await new Promise(r => setTimeout(r, 1200))
  await page.mouse.move(400, 300)
  await new Promise(r => setTimeout(r, 500))
  const sb = await shot(page, '.dh-stage .xy-fig', 'scripts/_tmp-c-stage.png')
  console.log('工作台立绘盒:', sb && `${sb.width}x${sb.height}`)

  // 4) 画布内像素自检：canvas 是否存在、尺寸是否正确、是否已绘制内容
  const info = await page.evaluate(() => {
    const pick = sel => {
      const c = document.querySelector(sel)
      if (!c) return null
      const ctx = c.getContext('2d')
      const d = ctx.getImageData(0, 0, c.width, c.height).data
      let nonEmpty = 0
      for (let i = 3; i < d.length; i += 4 * 37) if (d[i] > 8) nonEmpty++
      return { attr: `${c.width}x${c.height}`, css: `${c.clientWidth}x${c.clientHeight}`, painted: nonEmpty }
    }
    return { float: pick('.floating-avatar canvas.xy-face'), stage: pick('.dh-stage canvas.xy-face'), eyeEls: document.querySelectorAll('.xy-eye').length }
  })
  console.log('canvas 状态:', JSON.stringify(info))
  await browser.close()
}
main().catch(e => { console.error(e); process.exit(1) })
