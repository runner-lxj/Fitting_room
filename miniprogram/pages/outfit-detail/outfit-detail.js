// pages/outfit-detail/outfit-detail.js
const { getThemeClass } = require('../../utils/theme')
const api = require('../../utils/api')
const db = wx.cloud.database()

Page({
  data: { themeClass: '', outfit: {}, displayItems: [], outfitId: '', loading: true },
  onLoad(opts) {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ themeClass: getThemeClass(), outfitId: opts.id, statusBarHeight: sysInfo.statusBarHeight || 0 })
    this.loadOutfit(opts.id)
  },
  async loadOutfit(id) {
    wx.showLoading({ title: '加载中...' })
    const res = await db.collection('outfits').doc(id).get()
    const outfit = res.data
    const items = []
    const addItem = (obj, label) => { if (obj) items.push({ ...obj, categoryLabel: label }) }
    // 从 clothes 集合获取单品信息
    if (outfit.items) {
      for (const [role, clothesId] of Object.entries(outfit.items)) {
        if (!clothesId) continue
        try {
          const c = await db.collection('clothes').doc(clothesId).get()
          items.push({ id: clothesId, name: c.data.name, image: c.data.cutout_url || c.data.original_url, categoryLabel: c.data.subcategory })
        } catch (e) {}
      }
    }
    outfit.scoreText = outfit.score ? (outfit.score * 100).toFixed(0) + '%' : ''
    this.setData({ outfit, displayItems: items, loading: false })
    wx.hideLoading()
  },
  previewImage() { wx.previewImage({ urls: [this.data.outfit.composition_url] }) },
  async acceptOutfit() {
    try {
      await api.acceptOutfit(this.data.outfitId)
      wx.showToast({ title: '已采纳', icon: 'success' })
      this.setData({ 'outfit.status': 'accepted' })
    } catch (e) { wx.showToast({ title: '操作失败', icon: 'none' }) }
  },
  rejectOutfit() { wx.navigateBack() },
  goBack() { wx.navigateBack() },
  onShareAppMessage() {
    return { title: this.data.outfit.name || 'AI穿搭推荐', path: '/pages/outfit-detail/outfit-detail?id=' + this.data.outfitId }
  }
})




