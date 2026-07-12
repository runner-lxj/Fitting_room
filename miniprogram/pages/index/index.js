const app = getApp()
const { getThemeClass } = require('../../utils/theme')
const api = require('../../utils/api')

const CITY_MAP = {
  '101010100': '北京', '101020100': '上海', '101280101': '广州',
  '101280601': '深圳', '101270101': '成都', '101230201': '厦门',
  '101210101': '杭州', '101190401': '南京', '101180101': '郑州',
  '101030100': '天津', '101250101': '长沙', '101230101': '福州',
  '101120101': '济南', '101110101': '西安', '101070101': '沈阳',
  '101050101': '哈尔滨', '101200101': '武汉', '101290101': '昆明',
  '101330101': '大连', '101240101': '南昌'
}

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
    locationId: '101010100',
    locationAuthorized: false
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
      this.setData({ locationId: saved.id, locationName: saved.name, locationAuthorized: true })
    } else {
      this.setData({ locationId: '101010100', locationName: '北京', locationAuthorized: false })
    }
    this.loadData()
  },

  onLocationTap() {
    console.log('[index] onLocationTap called')
    const cities = Object.entries(CITY_MAP)
    const names = cities.map(([, name]) => name)
    console.log('[index] cities count:', names.length)
    wx.showActionSheet({
      itemList: names,
      success: (res) => {
        const [id, name] = cities[res.tapIndex]
        wx.setStorageSync('userLocation', { id, name })
        this.setData({ locationId: id, locationName: name, locationAuthorized: true })
        this.loadData()
      },
      fail: (err) => {
        console.warn('[index] showActionSheet fail:', err)
      }
    })
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
  async goAddClothes() {
    wx.switchTab({ url: '/pages/wardrobe/wardrobe' })
  },
  goMyOutfits() { wx.switchTab({ url: '/pages/my-outfits/my-outfits' }) },
  onShareAppMessage() {
    return { title: '智能穿搭助手 - AI天气穿搭推荐', path: '/pages/index/index' }
  }
})
