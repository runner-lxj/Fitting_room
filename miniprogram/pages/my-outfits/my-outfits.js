const { getThemeClass } = require('../../utils/theme')
const db = wx.cloud.database()
Page({
  data: { themeClass: '', records: [], loading: true },
  onLoad() { this.setData({ themeClass: getThemeClass() }) },
  onShow() { this.setData({ themeClass: getThemeClass() }); this.loadRecords() },
  async loadRecords() {
    const res = await db.collection('wardrobe_photos').where({ user_id: '{openid}' }).orderBy('created_at', 'desc').get()
    this.setData({ records: res.data, loading: false })
  },
  goDetail(e) { wx.navigateTo({ url: '/pages/outfit-detail/outfit-detail?id=' + e.currentTarget.dataset.id }) },
  goHome() { wx.switchTab({ url: '/pages/index/index' }) }
})