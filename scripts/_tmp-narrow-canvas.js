/* 临时脚本：窄屏 canvas 版悬浮头像截图 */
const puppeteer = require('puppeteer-core')
const Jimp = require('jimp')

async function main() {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new', args: ['--no-sandbox'] })
  const p = await b.newPage()
  await p.setViewport({ width: 700, height: 900 })
  await p.evaluateOnNewDocument(() => {
    localStorage.setItem('zy_current_user', 'test')
    const us = JSON.parse(localStorage.getItem('zy_users') || '[]')
    if (!us.find(x => x.username === 'test')) {
      us.push({ username: 'test', password: 'x', apiKey: '', createdAt: Date.now() })
      localStorage.setItem('zy_users', JSON.stringify(us))
    }
  })
  await p.goto('http://localhost:8082/zhongyi/', { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1800))
  await p.addStyleTag({ content: '.floating-avatar,.xy-anim{animation:none !important}' })
  const el = await p.$('.floating-avatar .xy-pic')
  const bb = await el.boundingBox()
  console.log('窄屏头像盒:', bb.width, 'x', bb.height)
  await p.screenshot({ path: 'scripts/_tmp-c-narrow.png', clip: bb })
  const img = await Jimp.read('scripts/_tmp-c-narrow.png')
  await img.scale(3, Jimp.RESIZE_NEAREST_NEIGHBOR).writeAsync('scripts/_tmp-c-narrow.png')
  await b.close()
}
main().catch(e => { console.error(e); process.exit(1) })
