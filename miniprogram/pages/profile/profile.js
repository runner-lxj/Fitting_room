const app = getApp()
const { getThemeClass, getThemeName, THEMES } = require('../../utils/theme')
const db = wx.cloud.database()
Page({
  data: { themeClass: '', themeName: '樱花粉', userInfo: {}, isAdmin: false, clothesCount: 0, outfitCount: 0 },
  onLoad() { this.setData({ themeClass: getThemeClass(), themeName: getThemeName() }) },
  onShow() {
    this.setData({ themeClass: getThemeClass(), themeName: getThemeName(), isAdmin: app.checkAdmin() })
    this.loadData()
  },
  async loadData() {
    const clothes = await db.collection('clothes').where({ user_id: '{openid}' }).count()
    const outfits = await db.collection('wardrobe_photos').where({ user_id: '{openid}' }).count()
    this.setData({ clothesCount: clothes.total, outfitCount: outfits.total })
  },
  changeTheme() {
    const themes = Object.entries(THEMES).map(([k, v]) => ({ name: v.name, key: k }))
    wx.showActionSheet({ itemList: themes.map(t => t.icon + ' ' + t.name), success: res => {
      const key = themes[res.tapIndex].key
      app.setTheme(key)
      this.setData({ themeClass: getThemeClass(), themeName: getThemeName() })
    }})
  },
  reuploadPhoto() { /* TODO */ },
  goAdmin() { wx.navigateTo({ url: '/pages/admin/admin' }) }
})