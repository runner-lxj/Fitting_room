// pages/outfit-detail/outfit-detail.js
const { getThemeClass } = require('../../utils/theme')
const api = require('../../utils/api')
const db = wx.cloud.database()
const app = getApp()

Page({
  data: { themeClass: '', outfit: {}, displayItems: [], outfitId: '', loading: true },
  onLoad(opts) {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ themeClass: getThemeClass(), outfitId: opts.id, statusBarHeight: sysInfo.statusBarHeight || 0 })
    this.loadOutfit(opts.id)
  },
  async loadOutfit(id) {
    wx.showLoading({ title: '加载中...' })
    console.log('[detail] loading outfit:', id)
    const res = await db.collection('outfits').doc(id).get()
    console.log('[detail] outfit loaded:', res.data.name, 'items:', JSON.stringify(res.data.items).substring(0, 200))
    const outfit = res.data
    const items = []
    if (outfit.items) {
      for (const item of outfit.items) {
        if (!item || !item.id) continue
        try {
          const c = await db.collection('clothes').doc(item.id).get()
          const image = c.data.cutout_url || c.data.original_url || ''
          items.push({ id: item.id, name: c.data.name, image, categoryLabel: c.data.subcategory, role: item.role })
        } catch (e) { console.warn('[detail] load clothes failed:', item.id, e) }
      }
    }
    outfit.clothImages = items.filter(i => i.image).map(i => i.image)
    outfit.scoreText = outfit.score ? (outfit.score * 100).toFixed(0) + '%' : ''
    this.setData({ outfit, displayItems: items, loading: false })
    wx.hideLoading()
  },
  previewImage() { wx.previewImage({ urls: [this.data.outfit.composition_url] }) },
  async acceptOutfit() {
    try {
      await api.acceptOutfit(this.data.outfitId)
      app.globalData.outfitDirty = true
      wx.showToast({ title: '已采纳', icon: 'success' })
      this.setData({ 'outfit.status': 'accepted' })
    } catch (e) { wx.showToast({ title: '操作失败', icon: 'none' }) }
  },
  async rejectOutfit() {
    try {
      await api.rejectOutfit(this.data.outfitId)
      app.globalData.outfitDirty = true
      wx.showToast({ title: '已舍弃', icon: 'success' })
      setTimeout(() => { wx.navigateBack() }, 500)
    } catch (e) { wx.showToast({ title: '操作失败', icon: 'none' }) }
  },
  goBack() { wx.navigateBack() },
  onShareAppMessage() {
    return { title: this.data.outfit.name || 'AI穿搭推荐', path: '/pages/outfit-detail/outfit-detail?id=' + this.data.outfitId }
  }
})