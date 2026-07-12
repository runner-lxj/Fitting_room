const app = getApp()
const { getThemeClass } = require('../../utils/theme')
const api = require('../../utils/api')

Page({
  data: {
    themeClass: '',
    greeting: '',
    userName: '',
    outfitSuggestion: '',
    weather: { temp: '--', condition: '加载中...', wind: '', humidity: 0, icon: '', tip: '' },
    outfits: [],
    loading: true,
    clothesCount: 0,
    outfitCount: 0,
    locationName: '北京',
    locationId: '101010100'
  },

  onLoad() {
    if (!app.checkPrivacy()) {
      wx.reLaunch({ url: '/pages/privacy/privacy' })
      return
    }
    this.setData({ themeClass: getThemeClass() })
    wx.cloud.getTempFileURL({ fileList: ['cloud://cloud1-d8gne3bjzb37229e4.636c-cloud1-d8gne3bjzb37229e4-1451824826/clothes/ZCOOLKuaiLe-Regular.ttf'] }).then(res => { if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) { wx.loadFontFace({ family: 'ZCOOLKuaiLe', source: 'url(' + res.fileList[0].tempFileURL + ')', success: () => {}, fail: (e) => { console.log('[font] err:', e) } }) } }).catch(e => { console.log('[font] getTempFileURL err:', e) })
    this.setGreeting()
    this.initLocation()
  },

  onShow() {
    this.setData({ themeClass: getThemeClass() })
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.nickName) {
      this.setData({ userName: userInfo.nickName })
    }
  },

  onThemeChange() {
    this.setData({ themeClass: getThemeClass() })
  },

  setGreeting() {
    const h = new Date().getHours()
    let g = '', suggestion = ''
    if (h < 6) { g = '夜深了'; suggestion = '早点休息，明天穿得美美的~' }
    else if (h < 9) { g = '早上好'; suggestion = '新的一天，从穿搭开始~' }
    else if (h < 12) { g = '上午好'; suggestion = '今天也是美美哒~' }
    else if (h < 14) { g = '中午好'; suggestion = '午间时光，小憩一会~' }
    else if (h < 18) { g = '下午好'; suggestion = '今天穿的格外地搭呢~' }
    else if (h < 21) { g = '晚上好'; suggestion = '下班啦，今天也是被自己美晕的一天~' }
    else { g = '晚上好'; suggestion = '夜晚的穿搭，也可以很出彩~' }
    const userInfo = wx.getStorageSync('userInfo')
    const userName = userInfo?.nickName || ''
    this.setData({ greeting: g, outfitSuggestion: suggestion, userName })
  },

  initLocation() {
    const saved = wx.getStorageSync('userLocation')
    if (saved) {
      this.setData({ locationId: saved.id, locationName: saved.name })
      this.loadData()
    } else {
      this.getLocation()
    }
  },

  refreshLocation() {
    wx.removeStorageSync('userLocation')
    this.setData({ locationId: '101010100', locationName: '定位中...' })
    this.getLocation()
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => { this.reverseGeocode(res.latitude, res.longitude) },
      fail: () => {
        // 定位失败或用户拒绝，引导去设置开启
        wx.showModal({
          title: '位置权限',
          content: '需要位置权限来获取当地天气，是否前往设置开启？',
          confirmText: '去设置',
          cancelText: '暂不',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting({
                success: (r) => {
                  if (r.authSetting['scope.userLocation']) {
                    this.getLocation()
                  } else {
                    this.setData({ locationId: '101010100', locationName: '北京' })
                    this.loadData()
                  }
                }
              })
            } else {
              this.setData({ locationId: '101010100', locationName: '北京' })
              this.loadData()
            }
          }
        })
      }
    })
  },

  reverseGeocode(lat, lng) {
    const cities = [
      { id: '101010100', name: '北京', lat: 39.9, lng: 116.4 },
      { id: '101020100', name: '上海', lat: 31.2, lng: 121.5 },
      { id: '101280101', name: '广州', lat: 23.1, lng: 113.3 },
      { id: '101280601', name: '深圳', lat: 22.5, lng: 114.1 },
      { id: '101210101', name: '杭州', lat: 30.3, lng: 120.2 },
      { id: '101270101', name: '成都', lat: 30.6, lng: 104.1 }
    ]
    let best = cities[0], minDist = Infinity
    for (const c of cities) {
      const d = Math.sqrt(Math.pow(lat - c.lat, 2) + Math.pow(lng - c.lng, 2))
      if (d < minDist) { minDist = d; best = c }
    }
    const locData = { id: best.id, name: best.name }
    wx.setStorageSync('userLocation', locData)
    this.setData({ locationId: locData.id, locationName: locData.name })
    this.loadData()
  },

  async loadData() {
    console.log('[index] loadData START')
    const fallbackWeather = { temp: '--', condition: '请配置云环境', wind: '', humidity: 0, icon: '', tip: '云函数未部署，天气数据暂不可用' }
    try {
      const db = wx.cloud.database()
      const clothesCount = await db.collection('clothes').where({ user_id: '{openid}' }).count()
      const outfitCount = await db.collection('outfits').where({ _openid: '{openid}', status: 'accepted' }).count()
      this.setData({ clothesCount: clothesCount.total, outfitCount: outfitCount.total })
      const weatherRes = await api.getWeather(this.data.locationId).catch(() => null)
      if (weatherRes && weatherRes.temp !== '--') { this.setData({ weather: weatherRes }) }
      else { this.setData({ weather: fallbackWeather }) }
      const dailyRes = await api.getDailyRecommend().catch(() => null)
      console.log('[index] dailyRes:', JSON.stringify(dailyRes).substring(0, 200))
      if (dailyRes && dailyRes.outfit) {
        const outfit = dailyRes.outfit
        outfit.scoreText = (outfit.score * 100).toFixed(0) + '%'
        const items = outfit.items || []
        const ids = items.map(i => i.id).filter(Boolean)
        if (ids.length > 0) {
          const clothRes = await db.collection('clothes').where({ _id: db.command.in(ids) }).get()
          const clothMap = {}
          clothRes.data.forEach(c => { clothMap[c._id] = c })
          outfit.clothImages = []
          items.forEach(i => { if (clothMap[i.id] && clothMap[i.id].original_url) outfit.clothImages.push(clothMap[i.id].original_url) })
        }
        this.setData({ outfits: [outfit] })
      } else {
        this.setData({ outfits: [] })
      }
    } catch (e) {
      console.error('[index] loadData FAILED:', e.message)
      this.setData({ weather: fallbackWeather, outfits: [] })
    } finally {
      this.setData({ loading: false })
    }
  },

  refreshOutfits() {
    this.setData({ loading: true, outfits: [] })
    wx.showLoading({ title: '换一批中...' })
    this.loadData().then(() => { wx.hideLoading() }).catch(() => { wx.hideLoading() })
  },

  goDetail(e) { wx.navigateTo({ url: '/pages/outfit-detail/outfit-detail?id=' + e.currentTarget.dataset.id }) },
  goWardrobe() { wx.switchTab({ url: '/pages/wardrobe/wardrobe' }) },
  goOutfits() { wx.switchTab({ url: '/pages/my-outfits/my-outfits' }) },
  goAddClothes() { wx.switchTab({ url: '/pages/wardrobe/wardrobe' }) },
  goMyOutfits() { wx.switchTab({ url: '/pages/my-outfits/my-outfits' }) },
  onShareAppMessage() {
    return { title: '智能穿搭助手 - AI天气穿搭推荐', path: '/pages/index/index' }
  }
})
