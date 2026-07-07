// utils/api.js - MiMo API 封装
const callMimo = async (messages, config = {}) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'outfit-recommend',
      data: {
        action: 'callMimo',
        messages,
        config: {
          model: config.model || 'mimo-v2.5',
          temperature: config.temperature || 0.7,
          top_p: config.top_p || 0.95,
          max_completion_tokens: config.max_completion_tokens || 4096
        }
      },
      success: res => resolve(res.result),
      fail: err => reject(err)
    })
  })
}

// 衣物识别
const recognizeClothes = async (imageFileID) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'clothes-add',
      data: { action: 'recognize', imageFileID },
      success: res => resolve(res.result),
      fail: err => reject(err)
    })
  })
}

// 获取搭配推荐
const getOutfitRecommend = async () => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'outfit-recommend',
      data: { action: 'recommend' },
      success: res => resolve(res.result),
      fail: err => reject(err)
    })
  })
}

// 采纳搭配
const acceptOutfit = async (outfitId) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'outfit-accept',
      data: { outfitId },
      success: res => resolve(res.result),
      fail: err => reject(err)
    })
  })
}

// 获取天气
const getWeather = async () => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'outfit-recommend',
      data: { action: 'getWeather' },
      success: res => resolve(res.result),
      fail: err => reject(err)
    })
  })
}

// 获取通知列表
const getNotifications = async () => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'notification-list',
      data: {},
      success: res => resolve(res.result),
      fail: err => reject(err)
    })
  })
}

module.exports = { callMimo, recognizeClothes, getOutfitRecommend, acceptOutfit, getWeather, getNotifications }