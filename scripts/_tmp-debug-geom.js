/* 临时脚本：调试悬浮头像眼睛窗口几何 */
const puppeteer = require('puppeteer-core')

async function main() {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new', args: ['--no-sandbox'] })
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
  await new Promise(r => setTimeout(r, 1500))
  const info = await page.evaluate(() => {
    const app = document.querySelector('#app').__vue__ // Vue 2 根实例?
    const box = document.querySelector('.floating-avatar .xy-pic')
    const img = box.querySelector('img:not(.xy-eye-img)')
    const wins = [...box.querySelectorAll('.xy-eye')].map(w => {
      const r = w.getBoundingClientRect(), b = box.getBoundingClientRect()
      const im = w.querySelector('img').getBoundingClientRect()
      return { win: { l: +(r.left - b.left).toFixed(1), t: +(r.top - b.top).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }, img: { l: +(im.left - r.left).toFixed(1), t: +(im.top - r.top).toFixed(1), w: +im.width.toFixed(1), h: +im.height.toFixed(1) } }
    })
    const br = box.getBoundingClientRect(), ir = img.getBoundingClientRect()
    // 读取组件实例（遍历找 DigitalHuman）
    let comp = null
    const walk = v => {
      if (!v || comp) return
      if (v.$options && v.$options.name === 'DigitalHuman' && v.eyeLayout) comp = v
      ;(v.$children || []).forEach(walk)
    }
    walk(app || window.__VUE_ROOT__)
    return {
      box: { w: box.offsetWidth, h: box.offsetHeight, rw: +br.width.toFixed(1), rh: +br.height.toFixed(1) },
      img: { w: img.offsetWidth, h: img.offsetHeight, rw: +ir.width.toFixed(1), rh: +ir.height.toFixed(1), nl: img.naturalWidth, nh: img.naturalHeight, complete: img.complete },
      wins,
      layout: comp ? comp.eyeLayout : 'component not found',
      animClass: document.querySelector('.floating-avatar').className
    }
  })
  console.log(JSON.stringify(info, null, 1))
  await browser.close()
}
main().catch(e => { console.error(e); process.exit(1) })
