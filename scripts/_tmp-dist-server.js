/* 临时脚本：静态伺服 dist 构建产物（挂在 /zhongyi/ 路径下），用于对比旧版本渲染 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', 'dist')
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.webm': 'video/webm', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' }

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0])
  if (p.startsWith('/zhongyi/')) p = p.slice('/zhongyi/'.length)
  else p = p.replace(/^\//, '')
  if (p === '' || p.endsWith('/')) p += 'index.html'
  const file = path.join(ROOT, p)
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404; res.end('not found: ' + p); return
  }
  res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream')
  fs.createReadStream(file).pipe(res)
}).listen(8083, () => console.log('dist served at http://localhost:8083/zhongyi/'))
