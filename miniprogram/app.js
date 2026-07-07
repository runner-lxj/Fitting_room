// app.js - 全局逻辑 + 主题管理
App({
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({ traceUser: true })
    }

    // 加载主题设置
    const theme = wx.getStorageSync('theme') || 'default'
    this.globalData.theme = theme

    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
    }
  },

  // 切换主题
  setTheme(themeName) {
    this.globalData.theme = themeName
    wx.setStorageSync('theme', themeName)
    // 通知所有页面刷新
    const pages = getCurrentPages()
    pages.forEach(p => {
      if (p.onThemeChange) p.onThemeChange(themeName)
    })
  },

  // 检查是否管理员
  checkAdmin() {
    const phone = this.globalData.userInfo?.phone
    return phone === 'ADMIN_PHONE'
  },

  globalData: {
    theme: 'default',
    userInfo: null,
    themeMap: {
      'default': '樱花粉',
      'mint': '薄荷绿',
      'purple': '暗夜紫'
    }
  }
})