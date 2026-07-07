// pages/wardrobe/wardrobe.js
const { getThemeClass } = require('../../utils/theme')
const db = wx.cloud.database()

Page({
  data: {
    themeClass: '',
    tabs: [
      { key: 'all', name: '全部', count: 0 },
      { key: 'top', name: '上衣', count: 0 },
      { key: 'bottom', name: '下装', count: 0 },
      { key: 'dress', name: '连衣裙', count: 0 },
      { key: 'outerwear', name: '外套', count: 0 },
      { key: 'shoes', name: '鞋子', count: 0 },
      { key: 'accessory', name: '配饰', count: 0 }
    ],
    currentTab: 'all',
    currentSub: '',
    subTabs: [],
    clothes: [],
    filteredClothes: [],
    totalCount: 0,
    loading: true
  },

  onLoad() { this.setData({ themeClass: getThemeClass() }) },
  onShow() {
    this.setData({ themeClass: getThemeClass() })
    this.loadClothes()
  },

  async loadClothes() {
    try {
      const res = await db.collection('clothes').where({ user_id: '{openid}' }).orderBy('added_at', 'desc').get()
      const clothes = res.data
      const tabs = this.data.tabs.map(t => ({
        ...t,
        count: t.key === 'all' ? clothes.length : clothes.filter(c => c.category === t.key).length
      }))
      this.setData({ clothes, tabs, totalCount: clothes.length, loading: false })
      this.filterClothes()
    } catch (e) { console.error(e); this.setData({ loading: false }) }
  },

  switchTab(e) {
    const key = e.currentTarget.dataset.key
    const subMap = {
      top: ['半袖', '长袖衬衫', '卫衣', '毛衣', '背心'],
      bottom: ['长裤', '短裤', '半裙'],
      shoes: ['运动鞋', '皮鞋靴子', '凉鞋拖鞋'],
      outerwear: ['薄外套', '厚外套', '西装'],
      accessory: ['包', '帽', '围巾']
    }
    this.setData({ currentTab: key, currentSub: '', subTabs: subMap[key] || [] })
    this.filterClothes()
  },

  switchSub(e) {
    this.setData({ currentSub: e.currentTarget.dataset.sub })
    this.filterClothes()
  },

  filterClothes() {
    let list = this.data.clothes
    if (this.data.currentTab !== 'all') list = list.filter(c => c.category === this.data.currentTab)
    if (this.data.currentSub) list = list.filter(c => c.subcategory === this.data.currentSub)
    this.setData({ filteredClothes: list })
  },

  goAdd() { wx.navigateTo({ url: '/pages/clothes-add/clothes-add' }) },
  goDetail(e) { /* TODO: 衣服详情 */ }
})