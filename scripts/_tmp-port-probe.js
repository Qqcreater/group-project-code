/* 临时脚本：探测本机各端口正在服务的代码版本 */
const http = require('http')

function get(port, path) {
  return new Promise(resolve => {
    const req = http.get({ host: '127.0.0.1', port, path, timeout: 3000 }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    })
    req.on('error', e => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
  })
}

async function main() {
  for (const port of [8080, 8081, 8082]) {
    const base = await get(port, '/zhongyi/')
    const root = base === null ? null : base
    if (root === null) { console.log(`端口 ${port}: 无响应`); continue }
    const m = root.match(/src=([^>]+\.js[^>]*)/)
    const jsPath = m ? m[1].replace(/^["']|["']$/g, '') : null
    const css = (root.match(/href=([^>]+\.css[^>]*)/) || [])[1]
    let report = `端口 ${port}: 首页 ${root.length}B`
    if (jsPath) {
      const jsUrl = jsPath.startsWith('http') ? jsPath : '/zhongyi/' + jsPath.replace(/^\//, '').replace(/^(\/zhongyi\/)?/, '')
      const js = await get(port, jsPath.startsWith('http') ? new URL(jsPath).pathname : jsUrl)
      if (js) {
        const hasIris = js.includes('xiaoyi_iris')
        const hasSync = js.includes('_syncEyeGeom') || js.includes('syncEyeGeom')
        const hasPure = js.includes('1190.476') || js.includes('1190.5') || js.includes('41.4%')
        report += ` | JS ${jsPath} ${js.length}B => 旧贴片版:${hasIris} 测量版:${hasSync} 纯百分比版:${hasPure}`
      } else report += ` | JS ${jsPath} 获取失败`
    }
    console.log(report)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
