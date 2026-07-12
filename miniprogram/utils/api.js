// api.js - 云函数调用封装（含超时保护）

function callCloud(name, data, timeout) {
  if (wx.cloud && !wx.cloud._inited) { wx.cloud.init({ env: 'cloud1-d8gne3bjzb37229e4', traceUser: true }) }
  timeout = timeout || 30000
  return new Promise((resolve, reject) => {
    let done = false
    const timer = setTimeout(() => {
      if (!done) { done = true; reject(new Error("cloud timeout: " + name)) }
    }, timeout)
    wx.cloud.callFunction({
      name, data,
      success: res => { if (!done) { done = true; clearTimeout(timer); resolve(res.result) } },
      fail: err => { if (!done) { done = true; clearTimeout(timer); reject(err) } }
    })
  })
}

const recognizeClothes = async (imageFileID) => {
  return callCloud("clothes-add", { action: "recognize", imageFileID })
}

// v0.4: 一键搭配 - 调用 MiMo 生成方案存 DB
const generateOutfits = async () => {
  return callCloud("outfit-recommend", { action: "generate" })
}

// v0.4: 今日推荐 - 从 accepted 方案中按天气筛选
const getDailyRecommend = async () => {
  return callCloud("outfit-recommend", { action: "daily" })
}

// 采纳搭配
const acceptOutfit = async (outfitId) => {
  return callCloud("outfit-accept", { outfitId })
}

// 舍弃搭配
const rejectOutfit = async (outfitId) => {
  return callCloud("outfit-accept", { outfitId, action: "reject" })
}

const getWeather = async (location) => {
  return callCloud("outfit-recommend", { action: "getWeather", location: location || "101010100" })
}

const getNotifications = async () => {
  return callCloud("notification-list", {})
}

const reverseGeocode = async (lat, lng) => {
  return callCloud("outfit-recommend", { action: "reverseGeocode", lat, lng })
}

module.exports = { recognizeClothes, generateOutfits, getDailyRecommend, acceptOutfit, rejectOutfit, getWeather, getNotifications, reverseGeocode }
