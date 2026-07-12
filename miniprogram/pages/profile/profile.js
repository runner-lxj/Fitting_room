const app = getApp()
const { getThemeClass, getThemeName, THEMES } = require('../../utils/theme')
const db = wx.cloud.database()

Page({
  data: {
    themeClass: '',
    themeName: '',
    userInfo: {},
    isAdmin: false,
    clothesCount: 0,
    outfitCount: 0
  },

  onLoad() {
    this.setData({ themeClass: getThemeClass(), themeName: getThemeName() })
  },

  onShow() {
    this.setData({
      themeClass: getThemeClass(),
      themeName: getThemeName(),
      isAdmin: app.checkAdmin(),
      userInfo: app.globalData.userInfo || {}
    })
    this.loadData()
  },

  async loadData() {
    try {
      const clothes = await db.collection('clothes').where({ user_id: '{openid}' }).count()
      const outfits = await db.collection('wardrobe_photos').where({ user_id: '{openid}' }).count()
      this.setData({ clothesCount: clothes.total, outfitCount: outfits.total })
    } catch (e) {
      console.error(e)
    }
  },

  editNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      success: async (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const nickName = res.content.trim()
          // Update local storage
          const userInfo = { ...this.data.userInfo, nickName }
          wx.setStorageSync('userInfo', userInfo)
          app.globalData.userInfo = userInfo
          this.setData({ userInfo })

          // Update cloud DB
          try {
            await db.collection('users').doc(userInfo._id || '{openid}').update({
              data: { nickName }
            })
          } catch (e) {
            console.log('cloud update failed, saved locally')
          }

          wx.showToast({ title: '已修改', icon: 'success' })
        }
      }
    })
  },

  editAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        wx.showLoading({ title: '上传中...' })
        try {
          const ext = tempPath.split('.').pop() || 'jpg'
          const cloudPath = 'avatars/' + Date.now() + '.' + ext
          const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempPath })
          const avatarUrl = uploadRes.fileID

          const userInfo = { ...this.data.userInfo, avatarUrl }
          wx.setStorageSync('userInfo', userInfo)
          app.globalData.userInfo = userInfo
          this.setData({ userInfo })

          try {
            await db.collection('users').doc(userInfo._id || '{openid}').update({ data: { avatarUrl } })
          } catch (e) {}

          wx.hideLoading()
          wx.showToast({ title: '已更新', icon: 'success' })
        } catch (e) {
          wx.hideLoading()
          wx.showToast({ title: '上传失败', icon: 'none' })
        }
      }
    })
  },

  changeTheme() {
    const themes = Object.entries(THEMES).map(([k, v]) => ({ name: v.name, key: k }))
    wx.showActionSheet({
      itemList: themes.map(t => t.icon + ' ' + t.name),
      success: res => {
        const key = themes[res.tapIndex].key
        app.setTheme(key)
        this.setData({ themeClass: getThemeClass(), themeName: getThemeName() })
      }
    })
  },

  reuploadPhoto() { /* TODO */ },
  goAdmin() { wx.navigateTo({ url: '/pages/admin/admin' }) }
})
