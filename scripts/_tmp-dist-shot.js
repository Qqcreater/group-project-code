/* 临时脚本：对 dist 旧构建截图悬浮头像 */
const puppeteer = require('puppeteer-core')
const Jimp = require('jimp')

async function main() {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new', args: ['--no-sandbox'] })
  const p = await b.newPage()
  await p.setViewport({ width: 1280, height: 800 })
  await p.evaluateOnNewDocument(() => {
    localStorage.setItem('zy_current_user', 'test')
    const us = JSON.parse(localStorage.getItem('zy_users') || '[]')
    if (!us.find(x => x.username === 'test')) {
      us.push({ username: 'test', password: 'x', apiKey: '', createdAt: Date.now() })
      localStorage.setItem('zy_users', JSON.stringify(us))
    }
  })
  await p.goto('http://localhost:8083/zhongyi/', { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1500))
  const el = await p.$('.floating-avatar')
  if (!el) { console.log('no floating avatar'); await b.close(); return }
  const bb = await el.boundingBox()
  await p.screenshot({ path: 'scripts/_tmp-dist-avatar.png', clip: { x: bb.x - 4, y: Math.max(0, bb.y - 4), width: bb.width + 8, height: bb.height + 8 } })
  const img = await Jimp.read('scripts/_tmp-dist-avatar.png')
  await img.scale(3, Jimp.RESIZE_NEAREST_NEIGHBOR).writeAsync('scripts/_tmp-dist-avatar.png')
  console.log('shot ok')
  await b.close()
}
main().catch(e => { console.error(e.message); process.exit(1) })
