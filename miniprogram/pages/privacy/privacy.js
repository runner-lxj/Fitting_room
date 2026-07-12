Page({
  data: {},
  onLoad() {
    if (wx.getStorageSync('privacy_accepted')) {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },
  onAcceptPrivacy() {
    wx.setStorageSync('privacy_accepted', true)
    wx.switchTab({ url: '/pages/index/index' })
  },
  onRejectPrivacy() {
    wx.showToast({ title: '需要同意才能使用', icon: 'none' })
  }
})