const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  if (event.action === 'getWeather') {
    // TODO: 调用和风天气 API
    return {
      temp: 22, condition: '多云', wind: '微风', humidity: 45,
      icon: '/static/icons/weather-cloudy.png',
      tip: '22度微风，适合穿半袖+长裤，也可搭配薄外套'
    }
  }

  if (event.action === 'recommend') {
    // 获取用户衣柜
    const clothes = await db.collection('clothes').where({ user_id: OPENID }).get()
    const clothesCount = clothes.data.length
    
    if (clothesCount === 0) return { outfits: [], clothesCount: 0 }

    // TODO: 调用 MiMo-v2.5 API 进行推荐
    // 此处为桩数据，实际开发时替换为真实 API 调用
    return {
      outfits: [],
      clothesCount
    }
  }
  
  return { error: 'unknown action' }
}