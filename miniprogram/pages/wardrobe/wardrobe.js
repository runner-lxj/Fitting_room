// pages/wardrobe/wardrobe.js
const { getThemeClass } = require('../../utils/theme')
const db = wx.cloud.database()
const app = getApp()

Page({
  data: {
    themeClass: '',
    tabs: [
      { key: 'all', name: '全部', count: 0 },
      { key: 'top', name: '上衣', count: 0 },
      { key: 'bottom', name: '下装', count: 0 },
      { key: 'dress', name: '连衣裙', count: 0 },
      { key: 'outerwear', name: '外套', count: 0 },
      { key: 'shoes', name: '鞋子', count: 0 },
      { key: 'accessory', name: '配饰', count: 0 }
    ],
    currentTab: 'all',
    currentSub: '',
    subTabs: [],
    clothes: [],
    filteredClothes: [],
    totalCount: 0,
    loading: true
  },

  _firstShow: true,

  onLoad() { this.setData({ themeClass: getThemeClass() }) },
  onShow() {
    this.setData({ themeClass: getThemeClass() })
    if (this._firstShow || app.globalData.wardrobeDirty) {
      this._firstShow = false
      app.globalData.wardrobeDirty = false
      this.loadClothes()
    }
  },

  async loadClothes() {
    try {
      const res = await db.collection('clothes').where({ user_id: '{openid}' }).orderBy('added_at', 'desc').get()
      const clothes = res.data
      const tabs = this.data.tabs.map(t => ({
        ...t,
        count: t.key === 'all' ? clothes.length : clothes.filter(c => c.category === t.key).length
      }))
      const colorMap = {
        '白': '#F5F5F0', '黑': '#2C2C2C', '灰': '#B0B0B0', '红': '#E85D6A',
        '蓝': '#4A6FA5', '深蓝': '#2C4A7C', '浅蓝': '#87CEEB', '牛仔蓝': '#6B8DB2',
        '绿': '#7ECFB3', '粉': '#F5A0B0', '杏': '#D4956A', '棕': '#8B6B4A',
        '米': '#F5F0E0', '卡其': '#C8B080', '藏青': '#1C3A5A', '酒红': '#8B2252',
        '紫': '#A08DB0', '黄': '#F0D060', '橙': '#E89040'
      }
      const enriched = clothes.map(c => ({
        ...c,
        colorHex: colorMap[c.color] || c.color || '#f0f0f0'
      }))
      this.setData({ clothes: enriched, tabs, totalCount: enriched.length, loading: false })
      this.filterClothes()
    } catch (e) { console.error(e); this.setData({ loading: false }) }
  },

  switchTab(e) {
    const key = e.currentTarget.dataset.key
    const subMap = {
      top: ['半袖', '长袖衬衫', '卫衣', '毛衣', '背心'],
      bottom: ['长裤', '短裤', '半裙'],
      shoes: ['运动鞋', '皮鞋靴子', '凉鞋拖鞋'],
      outerwear: ['薄外套', '厚外套', '西装'],
      accessory: ['包', '帽', '围巾']
    }
    this.setData({ currentTab: key, currentSub: '', subTabs: subMap[key] || [] })
    this.filterClothes()
  },

  switchSub(e) {
    this.setData({ currentSub: e.currentTarget.dataset.sub })
    this.filterClothes()
  },

  filterClothes() {
    let list = this.data.clothes
    if (this.data.currentTab !== 'all') list = list.filter(c => c.category === this.data.currentTab)
    if (this.data.currentSub) list = list.filter(c => c.subcategory === this.data.currentSub)
    this.setData({ filteredClothes: list })
  },

  async goAdd() {
    const res = await wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera']
    })
    const files = res.tempFiles
    if (files.length === 0) return
    let uploaded = 0
    wx.showLoading({ title: '上传中 0/' + files.length })
    for (let i = 0; i < files.length; i++) {
      wx.showLoading({ title: '上传中 ' + (i + 1) + '/' + files.length })
      try {
        const compRes = await wx.compressImage({ src: files[i].tempFilePath, quality: 40 })
        const filePath = compRes.tempFilePath
        const ext = filePath.split('.').pop() || 'jpg'
        const cloudPath = 'clothes/' + Date.now() + '_' + i + '.' + ext
        const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath })
        const fileID = uploadRes.fileID
        const dbRes = await db.collection('clothes').add({
          data: {
            user_id: '{openid}', name: '识别中...', category: 'top', subcategory: '',
            color: '', material: '', style_tags: [], season: [], occasion: [],
            original_url: fileID, cutout_url: '', status: 'recognizing', added_at: db.serverDate()
          }
        })
        uploaded++
        app.globalData.wardrobeDirty = true
        this.loadClothes()
        wx.cloud.callFunction({
          name: 'clothes-add',
          data: { action: 'recognize', imageFileID: fileID, clothId: dbRes._id }
        }).then(r => {
          const info = r.result
          if (info && !info.error) {
            db.collection('clothes').doc(dbRes._id).update({
              data: {
                name: (info.color || '') + (info.subcategory || ''),
                category: info.category || 'top', subcategory: info.subcategory || '',
                color: info.color || '', material: info.material || '',
                style_tags: info.style_tags || [], status: 'recognized'
              }
            }).then(() => { this.loadClothes() })
          } else {
            db.collection('clothes').doc(dbRes._id).update({ data: { status: 'failed' } })
            this.loadClothes()
          }
        }).catch(() => {
          db.collection('clothes').doc(dbRes._id).update({ data: { status: 'failed' } })
          this.loadClothes()
        })
      } catch (e) {
        console.error('上传失败', e)
      }
    }
    wx.hideLoading()
    wx.showToast({ title: uploaded + '张上传成功', icon: 'success' })
  },
  goDetail(e) { /* TODO: 衣服详情 */ },
  onLongPress(e) {
    const { id, index } = e.currentTarget.dataset
    const item = this.data.filteredClothes[index]
    wx.showActionSheet({
      itemList: ['删除这件衣服'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '确认删除',
            content: '确定要删除「' + (item.name || '这件衣服') + '」吗？',
            success: async (modalRes) => {
              if (modalRes.confirm) {
                try {
                  const filesToDelete = []
                  if (item.original_url) filesToDelete.push(item.original_url)
                  if (item.cutout_url) filesToDelete.push(item.cutout_url)
                  if (filesToDelete.length > 0) {
                    await wx.cloud.deleteFile({ fileList: filesToDelete })
                  }
                  await db.collection('clothes').doc(id).remove()
                  app.globalData.wardrobeDirty = true
                  wx.showToast({ title: '已删除', icon: 'success' })
                  this.loadClothes()
                } catch (err) {
                  console.error('删除失败', err)
                  wx.showToast({ title: '删除失败', icon: 'none' })
                }
              }
            }
          })
        }
      }
    })
  },
  onShareAppMessage() { return { title: '我的智能衣柜', path: '/pages/wardrobe/wardrobe' } }
})