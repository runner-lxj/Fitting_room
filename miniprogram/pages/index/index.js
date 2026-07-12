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
  '101330101': '大连', '101240101': '南昌', '101180101': '重庆'
}

const WEATHER_ICON_MAP = {
  100: 'sunny', 103: 'sunny',
  101: 'cloudy', 104: 'cloudy',
  102: 'overcast',
  300: 'rain-light', 305: 'rain-light', 313: 'rain-light',
  302: 'rain-heavy', 310: 'rain-heavy', 314: 'rain-heavy',
  304: 'thunder', 312: 'thunder',
  306: 'sleet', 315: 'sleet',
  400: 'snow-light', 401: 'snow-light', 407: 'snow-light',
  403: 'snow-heavy', 408: 'snow-heavy', 499: 'snow-heavy',
  500: 'windy', 501: 'windy',
  509: 'fog', 510: 'fog', 514: 'fog', 515: 'fog'
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
      { id: '101270101', name: '成都', lat: 30.6, lng: 104.1 },
      { id: '101180101', name: '重庆', lat: 29.6, lng: 106.5 },
      { id: '101030100', name: '天津', lat: 39.1, lng: 117.2 },
      { id: '101250101', name: '长沙', lat: 28.2, lng: 113.0 },
      { id: '101190401', name: '南京', lat: 32.1, lng: 118.8 },
      { id: '101110101', name: '西安', lat: 34.3, lng: 108.9 },
      { id: '101070101', name: '沈阳', lat: 41.8, lng: 123.4 },
      { id: '101050101', name: '哈尔滨', lat: 45.8, lng: 126.5 },
      { id: '101200101', name: '武汉', lat: 30.6, lng: 114.3 },
      { id: '101290101', name: '昆明', lat: 25.0, lng: 102.7 },
      { id: '101120101', name: '济南', lat: 36.7, lng: 117.0 },
      { id: '101230201', name: '厦门', lat: 24.5, lng: 118.1 },
      { id: '101230101', name: '福州', lat: 26.1, lng: 119.3 },
      { id: '101240101', name: '南昌', lat: 28.7, lng: 115.9 },
      { id: '101180101', name: '郑州', lat: 34.7, lng: 113.7 },
      { id: '101330101', name: '大连', lat: 38.9, lng: 121.6 },
      { id: '101280601', name: '东莞', lat: 23.0, lng: 113.7 },
      { id: '101280101', name: '佛山', lat: 23.0, lng: 113.1 },
      { id: '101210101', name: '宁波', lat: 29.9, lng: 121.5 },
      { id: '101210101', name: '温州', lat: 28.0, lng: 120.7 },
      { id: '101270101', name: '绵阳', lat: 31.5, lng: 104.7 },
      { id: '101250101', name: '株洲', lat: 27.8, lng: 113.1 },
      { id: '101200101', name: '宜昌', lat: 30.7, lng: 111.3 },
      { id: '101110101', name: '咸阳', lat: 34.3, lng: 108.7 },
      { id: '101010100', name: '石家庄', lat: 38.0, lng: 114.5 },
      { id: '101120101', name: '青岛', lat: 36.1, lng: 120.4 },
      { id: '101120101', name: '烟台', lat: 37.5, lng: 121.4 },
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
      if (weatherRes && weatherRes.temp !== '--') { weatherRes.iconFile = WEATHER_ICON_MAP[parseInt(weatherRes.icon)] || 'cloudy'; this.setData({ weather: weatherRes }) }
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
