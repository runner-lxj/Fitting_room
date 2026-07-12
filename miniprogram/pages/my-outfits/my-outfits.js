const { getThemeClass } = require('../../utils/theme')
const api = require('../../utils/api')
const db = wx.cloud.database()
const app = getApp()

Page({
  data: {
    themeClass: '',
    tabs: [
      { key: 'pending', name: '待采纳', count: 0 },
      { key: 'accepted', name: '已采纳', count: 0 }
    ],
    currentTab: 'pending',
    outfits: [],
    totalCount: 0,
    pendingCount: 0,
    loading: true,
    generating: false,
    floatState: '',
    floatTitle: '',
    floatStatus: '',
    floatPercent: 0,
    generatedCount: 0,
    // 批量采纳
    batchMode: false,
    selectedIds: {},
    selectedCount: 0,
    allSelected: false
  },

  _firstShow: true,

  onLoad() { this.setData({ themeClass: getThemeClass() }) },
  onShow() {
    this.setData({ themeClass: getThemeClass() })
    if (this._firstShow || app.globalData.outfitDirty) {
      this._firstShow = false
      app.globalData.outfitDirty = false
      this.loadOutfits()
    }
  },

  switchTab(e) {
    this.exitBatchMode()
    this.setData({ currentTab: e.currentTarget.dataset.key })
    this.loadOutfits()
  },

  _dedup(outfits) {
    const seen = {}
    return outfits.filter(o => {
      const ids = (o.items || []).map(i => i.id || i).filter(Boolean).sort().join(',')
      if (!ids) return true
      if (seen[ids]) return false
      seen[ids] = true
      return true
    })
  },

  async loadOutfits() {
    this.setData({ loading: true })
    try {
      const tab = this.data.currentTab
      const status = tab === 'pending' ? 'pending' : 'accepted'
      const otherStatus = status === 'pending' ? 'accepted' : 'pending'

      const res = await db.collection('outfits').where({ _openid: '{openid}', status: status })
        .orderBy('created_at', 'desc').limit(20).get()
      const outfits = []
      for (const o of res.data) {
        const items = o.items || []
        const ids = items.map(i => i.id || i).filter(Boolean)
        let clothImages = []
        if (ids.length > 0) {
          const clothRes = await db.collection('clothes').where({ _id: db.command.in(ids) }).get()
          const clothMap = {}
          clothRes.data.forEach(c => { clothMap[c._id] = c })
          items.forEach(i => {
            const id = i.id || i
            if (clothMap[id] && clothMap[id].original_url) clothImages.push(clothMap[id].original_url)
          })
        }
        outfits.push({ ...o, clothImages })
      }
      const deduped = this._dedup(outfits)

      const otherRes = await db.collection('outfits').where({ _openid: '{openid}', status: otherStatus })
        .limit(20).get()
      const otherDeduped = this._dedup(otherRes.data)

      const curCount = deduped.length
      const otherCount = otherDeduped.length
      const pendingCount = status === 'pending' ? curCount : otherCount
      const acceptedCount = status === 'accepted' ? curCount : otherCount

      this.setData({
        outfits: deduped,
        totalCount: curCount + otherCount,
        pendingCount: pendingCount,
        loading: false,
        'tabs[0].count': pendingCount,
        'tabs[1].count': acceptedCount
      })
    } catch (e) {
      console.error('[my-outfits] load error:', e)
      this.setData({ loading: false })
    }
  },

  // ===== 批量采纳 =====
  enterBatchMode() {
    this.setData({ batchMode: true, selectedIds: {}, selectedCount: 0, allSelected: false })
  },

  exitBatchMode() {
    this.setData({ batchMode: false, selectedIds: {}, selectedCount: 0, allSelected: false })
  },

  toggleSelect(e) {
    const id = e.currentTarget.dataset.id
    const selected = { ...this.data.selectedIds }
    if (selected[id]) {
      delete selected[id]
    } else {
      selected[id] = true
    }
    const count = Object.keys(selected).length
    this.setData({
      selectedIds: selected,
      selectedCount: count,
      allSelected: count === this.data.outfits.length
    })
  },

  toggleSelectAll() {
    if (this.data.allSelected) {
      this.setData({ selectedIds: {}, selectedCount: 0, allSelected: false })
    } else {
      const selected = {}
      this.data.outfits.forEach(o => { selected[o._id] = true })
      this.setData({ selectedIds: selected, selectedCount: this.data.outfits.length, allSelected: true })
    }
  },

  async batchAccept() {
    const ids = Object.keys(this.data.selectedIds)
    if (ids.length === 0) return
    wx.showModal({
      title: '批量采纳',
      content: '确定采纳选中的 ' + ids.length + ' 套方案？',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '采纳中 0/' + ids.length })
        let done = 0
        for (const id of ids) {
          try {
            await api.acceptOutfit(id)
            done++
            wx.showLoading({ title: '采纳中 ' + done + '/' + ids.length })
          } catch (e) {
            console.error('[batch] accept failed:', id, e)
          }
        }
        wx.hideLoading()
        wx.showToast({ title: '已采纳 ' + done + ' 套', icon: 'success' })
        app.globalData.outfitDirty = true
        this.exitBatchMode()
        this.loadOutfits()
      }
    })
  },

  async batchReject() {
    const ids = Object.keys(this.data.selectedIds)
    if (ids.length === 0) return
    wx.showModal({
      title: '批量舍弃',
      content: '确定舍弃选中的 ' + ids.length + ' 套方案？',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '舍弃中 0/' + ids.length })
        let done = 0
        for (const id of ids) {
          try {
            await api.rejectOutfit(id)
            done++
            wx.showLoading({ title: '舍弃中 ' + done + '/' + ids.length })
          } catch (e) { console.error('[batch] reject failed:', id, e) }
        }
        wx.hideLoading()
        wx.showToast({ title: '已舍弃 ' + done + ' 套', icon: 'success' })
        app.globalData.outfitDirty = true
        this.exitBatchMode()
        this.loadOutfits()
      }
    })
  },

  // ===== 一键搭配 =====
  async generateOutfits() {
    if (this.data.generating) return
    this.setData({
      generating: true,
      floatState: 'generating',
      floatTitle: '搭配生成中',
      floatStatus: '分析衣柜风格...',
      floatPercent: 10
    })

    const progressTimer = setInterval(() => {
      const p = this.data.floatPercent
      if (p < 90) {
        const statusTexts = ['匹配穿搭风格...', '生成搭配方案...', '优化搭配细节...']
        const idx = Math.floor(p / 30)
        this.setData({
          floatPercent: p + Math.random() * 15,
          floatStatus: statusTexts[Math.min(idx, statusTexts.length - 1)]
        })
      }
    }, 800)

    try {
      const result = await api.generateOutfits()
      clearInterval(progressTimer)

      const outfits = result?.outfits || []
      if (outfits.length > 0) {
        this.setData({
          floatState: 'done',
          floatTitle: '搭配已生成',
          floatStatus: outfits.length + ' 套方案就绪',
          floatPercent: 100,
          generatedCount: outfits.length
        })
        this.loadOutfits()
      } else {
        const msg = result?.message || '暂无需要搭配的衣服'
        this.setData({
          floatState: 'done',
          floatTitle: '生成完成',
          floatStatus: msg,
          floatPercent: 100
        })
      }
    } catch (e) {
      clearInterval(progressTimer)
      console.error('[my-outfits] generate failed:', e)
      this.setData({
        floatState: 'done',
        floatTitle: '生成失败',
        floatStatus: e.message || '请稍后重试',
        floatPercent: 100
      })
    } finally {
      this.setData({ generating: false })
    }
  },

  onFloatTap() {
    if (this.data.floatState === 'done') {
      this.setData({ floatState: '', currentTab: 'pending' })
      this.loadOutfits()
    }
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/outfit-detail/outfit-detail?id=' + e.currentTarget.dataset.id })
  },

  onShareAppMessage() {
    return { title: '我的穿搭记录', path: '/pages/my-outfits/my-outfits' }
  }
})
