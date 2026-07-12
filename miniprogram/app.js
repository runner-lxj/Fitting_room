App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({ env: 'cloud1-d8gne3bjzb37229e4', traceUser: true })
    }

    const theme = wx.getStorageSync('theme') || 'default'
    this.globalData.theme = theme

    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
    } else {
      this.autoLogin()
    }
  },

  autoLogin() {
    if (!wx.cloud) {
      this.globalData.userInfo = { nickName: '穿搭用户', avatarUrl: '' }
      return
    }
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("login timeout")), 8000))
    Promise.race([
      wx.cloud.callFunction({ name: "user-login", data: {} }),
      timeout
    ]).then(res => {
      if (res.result && res.result.userInfo) {
        const info = res.result.userInfo
        wx.setStorageSync('userInfo', info)
        this.globalData.userInfo = info
      }
    }).catch(e => {
      console.error('auto login failed:', e)
      const info = { nickName: '穿搭用户', avatarUrl: '/static/images/avatar-default.png' }
      wx.setStorageSync('userInfo', info)
      this.globalData.userInfo = info
    })
  },

  checkPrivacy() {
    return !!wx.getStorageSync('privacy_accepted')
  },

  setTheme(themeName) {
    this.globalData.theme = themeName
    wx.setStorageSync('theme', themeName)
    const pages = getCurrentPages()
    pages.forEach(p => { if (p.onThemeChange) p.onThemeChange(themeName) })
  },

  checkAdmin() {
    return this.globalData.userInfo?.is_admin === true
  },

  globalData: {
    theme: 'default',
    userInfo: null,
    themeMap: { 'default': '奶油白', 'blue': '雾霾蓝', 'lavender': '薰衣草' },
    outfitDirty: true, wardrobeDirty: true
  }
})