// pages/outfit-detail/outfit-detail.js
const { getThemeClass } = require('../../utils/theme')
const api = require('../../utils/api')
const db = wx.cloud.database()

Page({
  data: { themeClass: '', outfit: {}, displayItems: [], outfitId: '' },
  onLoad(opts) {
    this.setData({ themeClass: getThemeClass(), outfitId: opts.id })
    this.loadOutfit(opts.id)
  },
  async loadOutfit(id) {
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
    this.setData({ outfit, displayItems: items })
  },
  previewImage() { wx.previewImage({ urls: [this.data.outfit.composition_url] }) },
  async acceptOutfit() {
    try {
      await api.acceptOutfit(this.data.outfitId)
      wx.showToast({ title: '已采纳', icon: 'success' })
      this.setData({ 'outfit.status': 'accepted' })
    } catch (e) { wx.showToast({ title: '操作失败', icon: 'none' }) }
  },
  rejectOutfit() { wx.navigateBack() }
})