/* 临时脚本：深入探测 8080/8081 服务内容 */
const http = require('http')

function get(port, path) {
  return new Promise(resolve => {
    const req = http.get({ host: '127.0.0.1', port, path, timeout: 4000 }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }))
    })
    req.on('error', e => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
  })
}

function pickScripts(html) {
  const out = []
  const re = /(?:src|href)=["']([^"']+\.(?:js|css))["']/g
  let m
  while ((m = re.exec(html))) out.push(m[1])
  return out
}

async function main() {
  for (const port of [8080, 8081]) {
    for (const p of ['/', '/zhongyi/', '/index.html']) {
      const r = await get(port, p)
      if (!r) { console.log(`${port}${p}: 无响应`); continue }
      console.log(`\n===== 端口 ${port} 路径 ${p} => ${r.status} ${r.body.length}B =====`)
      if (r.status === 200 && r.body.length > 100) {
        console.log('头部片段:', r.body.slice(0, 200).replace(/\n/g, ' '))
        for (const s of pickScripts(r.body).slice(0, 6)) {
          const path = s.startsWith('http') ? new URL(s).pathname : (s.startsWith('/') ? s : '/' + s.replace(/^\.\//, ''))
          const jr = await get(port, path)
          if (!jr || jr.status !== 200) { console.log(`  资源 ${path}: ${jr ? jr.status : '失败'}`); continue }
          const b = jr.body
          const tag = b.includes('xiaoyi_iris') ? '【旧贴片版】' : (b.includes('1190.476') || b.includes('41.4%')) ? '【纯百分比新版】' : (b.includes('syncEyeGeom')) ? '【测量版】' : (b.includes('clip-path:ellipse') || b.includes('clip-path: ellipse')) ? '【clip裁剪版】' : '【无眼睛特征】'
          console.log(`  资源 ${path} ${b.length}B => ${tag}`)
        }
        break
      }
    }
  }
}
main().catch(e => { console.error(e); process.exit(1) })
