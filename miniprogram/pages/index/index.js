// pages/index/index.js
const app = getApp()
const { getThemeClass } = require('../../utils/theme')
const api = require('../../utils/api')

Page({
  data: {
    themeClass: '',
    greeting: '',
    userName: '小可爱',
    weather: { temp: '--', condition: '加载中...', wind: '', humidity: 0, icon: '', tip: '' },
    outfits: [],
    loading: true,
    clothesCount: 0,
    outfitCount: 0
  },

  onLoad() {
    this.setData({ themeClass: getThemeClass() })
    this.setGreeting()
    this.loadData()
  },

  onShow() {
    this.setData({ themeClass: getThemeClass() })
  },

  onThemeChange() {
    this.setData({ themeClass: getThemeClass() })
  },

  setGreeting() {
    const h = new Date().getHours()
    let g = '晚上好'
    if (h < 6) g = '凌晨好'
    else if (h < 12) g = '上午好'
    else if (h < 14) g = '中午好'
    else if (h < 18) g = '下午好'
    this.setData({ greeting: g })
  },

  async loadData() {
    try {
      const [weatherRes, outfitsRes] = await Promise.all([
        api.getWeather().catch(() => null),
        api.getOutfitRecommend().catch(() => null)
      ])
      
      if (weatherRes) this.setData({ weather: weatherRes })
      if (outfitsRes) {
        const outfits = (outfitsRes.outfits || []).map(o => ({
          ...o,
          scoreText: (o.score * 100).toFixed(0) + '分'
        }))
        this.setData({ outfits, clothesCount: outfitsRes.clothesCount || 0, outfitCount: outfits.length })
      }
    } catch (e) {
      console.error('加载失败', e)
    } finally {
      this.setData({ loading: false })
    }
  },

  refreshOutfits() {
    this.setData({ loading: true, outfits: [] })
    this.loadData()
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/outfit-detail/outfit-detail?id=' + id })
  },

  goWardrobe() {
    wx.switchTab({ url: '/pages/wardrobe/wardrobe' })
  },

  goAddClothes() {
    wx.navigateTo({ url: '/pages/clothes-add/clothes-add' })
  },

  goMyOutfits() {
    wx.switchTab({ url: '/pages/my-outfits/my-outfits' })
  }
})