const { defineConfig } = require('@vue/cli-service')

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
    }
  }
})
