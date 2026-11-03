/* 临时脚本：复现「侧边纸片人」——把悬浮头像拖到屏幕左右两侧 + 展开面板窄屏，截图对比 */
const puppeteer = require('puppeteer-core')
const Jimp = require('jimp')

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

async function newPage(b, vw, vh, floatPos) {
  const p = await b.newPage()
  await p.setViewport({ width: vw, height: vh })
  await p.evaluateOnNewDocument((fp) => {
    localStorage.setItem('zy_current_user', 'test')
    const us = JSON.parse(localStorage.getItem('zy_users') || '[]')
    if (!us.find(x => x.username === 'test')) {
      us.push({ username: 'test', password: 'x', apiKey: '', createdAt: Date.now() })
      localStorage.setItem('zy_users', JSON.stringify(us))
    }
    if (fp) localStorage.setItem('zy_float_pos', JSON.stringify(fp))
  }, floatPos)
  await p.goto('http://localhost:8082/zhongyi/', { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1600))
  await p.addStyleTag({ content: '.floating-avatar,.xy-anim,.dh-stage .xy-fig{animation:none !important}' })
  return p
}

async function shot(p, sel, file) {
  const el = await p.$(sel)
  if (!el) { console.log('缺少', sel); return }
  const b = await el.boundingBox()
  await p.screenshot({ path: file, clip: { x: Math.max(0, b.x - 6), y: Math.max(0, b.y - 6), width: Math.min(b.width + 12, 1280), height: b.height + 12 } })
  const img = await Jimp.read(file)
  await img.scale(3, Jimp.RESIZE_NEAREST_NEIGHBOR).writeAsync(file)
  console.log(sel, '盒:', b.width, 'x', b.height)
}

async function main() {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
  // 1) 拖到右侧边缘（left 接近视口右缘，left+right 同时生效的挤压场景）
  let p = await newPage(b, 1280, 800, { left: 1180, top: 400 })
  await shot(p, '.floating-avatar', 'scripts/_tmp-side-right.png')
  await p.close()
  // 2) 拖到左侧边缘
  p = await newPage(b, 1280, 800, { left: 8, top: 400 })
  await shot(p, '.floating-avatar', 'scripts/_tmp-side-left.png')
  await p.close()
  // 3) 展开面板（窄窗口，侧栏受压）
  p = await newPage(b, 1100, 700)
  await p.click('.floating-avatar')
  await new Promise(r => setTimeout(r, 1200))
  await shot(p, '.dh-stage .xy-fig', 'scripts/_tmp-stage-narrow.png')
  await p.close()
  // 4) 展开面板（更窄 900）
  p = await newPage(b, 900, 700)
  await p.click('.floating-avatar')
  await new Promise(r => setTimeout(r, 1200))
  await shot(p, '.dh-stage .xy-fig', 'scripts/_tmp-stage-900.png')
  await p.close()
  await b.close()
}
main().catch(e => { console.error(e); process.exit(1) })
