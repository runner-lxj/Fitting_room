Page({
  data: { needPrivacy: false, privacyResolution: null },
  onLoad() {
    if (wx.getStorageSync('privacy_accepted')) {
      wx.switchTab({ url: '/pages/index/index' })
    }
    if (wx.onNeedPrivacyAuthorization) {
      wx.onNeedPrivacyAuthorization((resolve) => {
        this.setData({ needPrivacy: true, privacyResolution: resolve })
      })
    }
  },
  onAcceptPrivacy() {
    wx.setStorageSync('privacy_accepted', true)
    if (this.data.privacyResolution) {
      this.data.privacyResolution({ event: 'approve' })
    }
    wx.switchTab({ url: '/pages/index/index' })
  },
  onRejectPrivacy() {
    if (this.data.privacyResolution) {
      this.data.privacyResolution({ event: 'reject' })
    }
    wx.showToast({ title: '需要同意才能使用', icon: 'none' })
  },
  accept() {
    this.onAcceptPrivacy()
  },
  reject() {
    this.onRejectPrivacy()
  }
})
