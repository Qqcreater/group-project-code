/* 临时脚本：展开数字人工作台，检查大立绘与眼睛层的对齐情况 */
const puppeteer = require('puppeteer-core')

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

  // 点击悬浮头像展开
  const fa = await page.$('.floating-avatar')
  if (fa) { await fa.click(); await new Promise(r => setTimeout(r, 900)) }

  const info = await page.evaluate(() => {
    const fig = document.querySelector('.dh-stage .xy-fig')
    if (!fig) return { error: 'no .dh-stage .xy-fig', text: document.body.innerText.slice(0, 300) }
    const imgs = [...fig.querySelectorAll('img')].map((im, i) => {
      const r = im.getBoundingClientRect()
      return {
        i, cls: im.className, src: im.getAttribute('src'),
        box: { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
        natural: { w: im.naturalWidth, h: im.naturalHeight },
        clip: getComputedStyle(im).clipPath,
        transform: getComputedStyle(im).transform
      }
    })
    const fr = fig.getBoundingClientRect()
    return { figBox: { x: +fr.x.toFixed(1), y: +fr.y.toFixed(1), w: +fr.width.toFixed(1), h: +fr.height.toFixed(1) }, imgs }
  })
  console.log(JSON.stringify(info, null, 2))

  const fig = await page.$('.dh-stage .xy-fig')
  if (fig) {
    const b = await fig.boundingBox()
    await page.mouse.move(b.x + 20, b.y + 40)
    await new Promise(r => setTimeout(r, 500))
    await page.screenshot({ path: 'scripts/_tmp-stage-look.png', clip: b })
    await page.mouse.move(b.x + b.width - 20, b.y + 40)
    await new Promise(r => setTimeout(r, 500))
    await page.screenshot({ path: 'scripts/_tmp-stage-look2.png', clip: b })
    await page.mouse.move(10, 10)
    await new Promise(r => setTimeout(r, 600))
    await page.screenshot({ path: 'scripts/_tmp-stage-rest.png', clip: b })
    console.log('stage screenshots saved', b)
  }
  await browser.close()
}
main().catch(e => { console.error(e); process.exit(1) })
