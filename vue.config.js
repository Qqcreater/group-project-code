const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  publicPath: '/zhongyi/',
  transpileDependencies: true,
  devServer: {
    proxy: {
      '/ds-api': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        pathRewrite: { '^/ds-api': '' }
      }
    }
  }
})
