const { defineConfig } = require('@vue/cli-service')
const crypto = require('crypto')

/* ===== B站视频搜索代理（Wbi 签名）：GET /bili-search?kw=关键词 =====
 * 返回 [{ bvid, title, author, duration, desc }]，供 AI 定制课程绑定真实视频 */
const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52
]
const BILI_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
let wbiCache = { key: '', ts: 0 }

function buvid() {
  return crypto.randomUUID() + 'infoc'
}

/* 从 nav 接口获取 wbi key 并计算 mixin_key（缓存 30 分钟） */
async function getMixinKey() {
  if (wbiCache.key && Date.now() - wbiCache.ts < 30 * 60 * 1000) return wbiCache.key
  const res = await fetch('https://api.bilibili.com/x/web-interface/nav', {
    headers: { 'User-Agent': BILI_UA, Cookie: 'buvid3=' + buvid(), Referer: 'https://www.bilibili.com/' }
  })
  const j = await res.json()
  const wbi = j && j.data && j.data.wbi_img
  if (!wbi || !wbi.img_url || !wbi.sub_url) throw new Error('nav wbi_img missing')
  const img = (wbi.img_url.match(/([0-9a-f]+)\.png/) || [])[1] || ''
  const sub = (wbi.sub_url.match(/([0-9a-f]+)\.png/) || [])[1] || ''
  const raw = img + sub
  const key = MIXIN_KEY_ENC_TAB.map((i) => raw[i]).join('').slice(0, 32)
  if (!key) throw new Error('mixin key empty')
  wbiCache = { key, ts: Date.now() }
  return key
}

/* Wbi 参数签名：按 key 排序拼接后 md5(query + mixin_key) */
function encWbi(params, mixinKey) {
  const p = Object.assign({}, params, { wts: Math.floor(Date.now() / 1000) })
  const query = Object.keys(p).sort()
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(String(p[k]).replace(/[!'()*]/g, '')))
    .join('&')
  const wRid = crypto.createHash('md5').update(query + mixinKey).digest('hex')
  return query + '&w_rid=' + wRid
}

module.exports = defineConfig({
  publicPath: '/zhongyi/',
  transpileDependencies: true,
  chainWebpack: (config) => {
    // 当前工作目录路径包含括号（如 "my-vue-app (2)"），会让 vue-cli 默认用来忽略
    // public/index.html 的“绝对路径 glob”失效，导致 copy-webpack-plugin 把 index.html
    // 又复制了一遍，与 html-webpack-plugin 冲突：
    // "Conflict: Multiple assets emit different content to the same filename index.html"
    // 这里显式忽略 index.html，保证构建稳定。
    config.plugin('copy').tap((args) => {
      const opts = args[0]
      const patterns = opts && opts.patterns
      if (patterns && patterns[0]) {
        const globOptions = patterns[0].globOptions || {}
        const ignore = globOptions.ignore || []
        if (!ignore.includes('**/index.html')) ignore.push('**/index.html')
        globOptions.ignore = ignore
        patterns[0].globOptions = globOptions
      }
      return args
    })
  },
  devServer: {
    proxy: {
      '/ds-api': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        pathRewrite: { '^/ds-api': '' }
      },
      // 百度地点检索 API 不支持 JSONP 也不带 CORS 头，浏览器无法直连，
      // 开发模式下通过本地代理转发（生产部署时用 nginx 做同样的反向代理即可）
      '/bapi': {
        target: 'https://api.map.baidu.com',
        changeOrigin: true,
        pathRewrite: { '^/bapi': '' }
      }
    },
    setupMiddlewares(middlewares, devServer) {
      devServer.app.get('/bili-search', async (req, res) => {
        try {
          const kw = String(req.query.kw || '').slice(0, 60)
          if (!kw) { res.json({ code: 1, message: 'kw required', data: [] }); return }
          const mixinKey = await getMixinKey()
          const qs = encWbi({ search_type: 'video', keyword: kw, page: 1 }, mixinKey)
          const r = await fetch('https://api.bilibili.com/x/web-interface/search/type?' + qs, {
            headers: {
              'User-Agent': BILI_UA,
              Referer: 'https://search.bilibili.com/',
              Cookie: 'buvid3=' + buvid()
            }
          })
          const j = await r.json()
          if (!j || j.code !== 0 || !Array.isArray(j.data && j.data.result)) {
            res.json({ code: (j && j.code) || -1, message: (j && j.message) || 'search failed', data: [] })
            return
          }
          const list = j.data.result
            .filter((v) => v.bvid)
            .slice(0, 8)
            .map((v) => ({
              bvid: v.bvid,
              title: String(v.title || '').replace(/<[^>]+>/g, '').slice(0, 80),
              author: String(v.author || '').slice(0, 30),
              duration: String(v.duration || '10:00'),
              desc: String(v.description || '').slice(0, 80)
            }))
          res.json({ code: 0, data: list })
        } catch (e) {
          res.json({ code: -1, message: String((e && e.message) || e), data: [] })
        }
      })
      return middlewares
    }
  }
})
