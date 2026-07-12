const { getThemeClass } = require('../../utils/theme')
const api = require('../../utils/api')
const db = wx.cloud.database()

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
    // 浮窗状态
    floatState: '',       // '' | 'generating' | 'done'
    floatTitle: '',
    floatStatus: '',
    floatPercent: 0,
    generatedCount: 0
  },

  onLoad() { this.setData({ themeClass: getThemeClass() }) },
  onShow() {
    this.setData({ themeClass: getThemeClass() })
    this.loadOutfits()
  },

  switchTab(e) {
    this.setData({ currentTab: e.currentTarget.dataset.key })
    this.loadOutfits()
  },

  async loadOutfits() {
    this.setData({ loading: true })
    try {
      const tab = this.data.currentTab
      const status = tab === 'pending' ? 'pending' : 'accepted'
      const res = await db.collection('outfits').where({ user_id: '{openid}' }).where({ status: status }).limit(20).get()

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

      // Update tab counts
      const pendingRes = await db.collection('outfits').where({ user_id: '{openid}' }).where({ status: 'pending' }).count()
      const acceptedRes = await db.collection('outfits').where({ user_id: '{openid}' }).where({ status: 'accepted' }).count()

      this.setData({
        outfits,
        totalCount: pendingRes.total + acceptedRes.total,
        pendingCount: pendingRes.total,
        loading: false,
        'tabs[0].count': pendingRes.total,
        'tabs[1].count': acceptedRes.total
      })
    } catch (e) {
      console.error('[my-outfits] load error:', e)
      this.setData({ loading: false })
    }
  },

  async generateOutfits() {
    if (this.data.generating) return
    this.setData({
      generating: true,
      floatState: 'generating',
      floatTitle: '搭配生成中',
      floatStatus: '分析衣柜风格...',
      floatPercent: 10
    })

    // 模拟进度
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
      // 点击浮窗：关闭浮窗，切到待采纳tab
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




