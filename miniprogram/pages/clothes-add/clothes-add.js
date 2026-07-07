// pages/clothes-add/clothes-add.js
const { getThemeClass } = require('../../utils/theme')
const db = wx.cloud.database()

const CATEGORY_MAP = {
  top: { name: '上衣', subs: ['半袖', '长袖衬衫', '卫衣', '毛衣', '背心'] },
  bottom: { name: '下装', subs: ['长裤', '短裤', '半裙'] },
  dress: { name: '连衣裙', subs: ['连衣裙'] },
  outerwear: { name: '外套', subs: ['薄外套', '厚外套', '西装'] },
  shoes: { name: '鞋子', subs: ['运动鞋', '皮鞋靴子', '凉鞋拖鞋'] },
  accessory: { name: '配饰', subs: ['包', '帽', '围巾'] }
}

Page({
  data: {
    themeClass: '',
    // 已上传的图片列表（支持连续上传）
    uploadList: [],
    // 当前正在编辑的图片索引
    editIndex: -1,
    // 单张编辑数据
    result: null,
    categoryOptions: [],
    subcategoryOptions: [],
    categoryIdx: 0,
    subcategoryIdx: 0
  },

  onLoad() {
    this.setData({
      themeClass: getThemeClass(),
      categoryOptions: Object.values(CATEGORY_MAP).map(c => c.name)
    })
  },

  // ===== 选择/拍照 =====
  async chooseImage() {
    const res = await wx.chooseMedia({
      count: 9 - this.data.uploadList.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera']
    })
    const newItems = res.tempFiles.map(f => ({
      tempPath: f.tempFilePath,
      status: 'uploading',  // uploading -> pending -> recognizing -> recognized -> failed
      name: '',
      category: '',
      subcategory: '',
      color: '',
      material: '',
      style_tags: [],
      fileID: ''
    }))
    // 逐个上传（不阻塞，后台进行）
    const list = [...this.data.uploadList, ...newItems]
    this.setData({ uploadList: list })
    // 异步上传所有新图片
    newItems.forEach((item, i) => {
      this.uploadAndRecognize(list.length - newItems.length + i)
    })
  },

  // ===== 上传 + 异步识别 =====
  async uploadAndRecognize(index) {
    const item = this.data.uploadList[index]
    if (!item) return

    try {
      // 1. 立即上传到云存储，拿到 fileID
      this.setData({ ['uploadList[' + index + '].status']: 'uploading' })
      const ext = item.tempPath.split('.').pop() || 'jpg'
      const cloudPath = 'clothes/' + Date.now() + '_' + index + '.' + ext
      const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: item.tempPath })
      const fileID = uploadRes.fileID
      this.setData({ ['uploadList[' + index + '].fileID']: fileID })

      // 2. 保存到数据库（status=pending），用户立刻能看到
      const dbRes = await db.collection('clothes').add({
        data: {
          user_id: '{openid}',
          name: '识别中...',
          category: 'top',
          subcategory: '',
          color: '',
          material: '',
          style_tags: [],
          season: [],
          occasion: [],
          original_url: fileID,
          cutout_url: '',
          status: 'pending',
          added_at: db.serverDate()
        }
      })
      const clothId = dbRes._id
      this.setData({
        ['uploadList[' + index + '].status']: 'pending',
        ['uploadList[' + index + '].dbId']: clothId
      })

      // 3. 调用云函数异步识别
      this.setData({ ['uploadList[' + index + '].status']: 'recognizing' })
      wx.cloud.callFunction({
        name: 'clothes-add',
        data: { action: 'recognize', imageFileID: fileID, clothId }
      }).then(res => {
        // 识别成功，更新数据库
        const info = res.result
        const cat = CATEGORY_MAP[info.category] || CATEGORY_MAP.top
        db.collection('clothes').doc(clothId).update({
          data: {
            name: info.color + info.subcategory,
            category: info.category,
            subcategory: info.subcategory,
            color: info.color,
            material: info.material,
            style_tags: info.style_tags || [],
            status: 'recognized'
          }
        })
        this.setData({
          ['uploadList[' + index + '].status']: 'recognized',
          ['uploadList[' + index + '].name']: info.color + info.subcategory,
          ['uploadList[' + index + '].category']: info.category,
          ['uploadList[' + index + '].subcategory']: info.subcategory,
          ['uploadList[' + index + '].color']: info.color,
          ['uploadList[' + index + '].material']: info.material,
          ['uploadList[' + index + '].style_tags']: info.style_tags || []
        })
        wx.showToast({ title: '识别完成', icon: 'success' })
      }).catch(err => {
        console.error('识别失败', err)
        this.setData({ ['uploadList[' + index + '].status']: 'failed' })
        db.collection('clothes').doc(clothId).update({ data: { status: 'failed' } })
      })
    } catch (e) {
      console.error('上传失败', e)
      this.setData({ ['uploadList[' + index + '].status']: 'failed' })
    }
  },

  // ===== 点击编辑某张已识别的图片 =====
  editItem(e) {
    const idx = e.currentTarget.dataset.index
    const item = this.data.uploadList[idx]
    if (item.status !== 'recognized' && item.status !== 'failed') return
    
    const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.top
    this.setData({
      editIndex: idx,
      result: { ...item },
      categoryIdx: Object.keys(CATEGORY_MAP).indexOf(item.category),
      subcategoryOptions: cat.subs,
      subcategoryIdx: cat.subs.indexOf(item.subcategory)
    })
  },

  onCategoryChange(e) {
    const idx = e.detail.value
    const key = Object.keys(CATEGORY_MAP)[idx]
    const cat = CATEGORY_MAP[key]
    this.setData({
      categoryIdx: idx,
      subcategoryOptions: cat.subs,
      subcategoryIdx: 0,
      'result.category': key,
      'result.subcategory': cat.subs[0]
    })
  },

  onSubcategoryChange(e) {
    this.setData({
      subcategoryIdx: e.detail.value,
      'result.subcategory': this.data.subcategoryOptions[e.detail.value]
    })
  },

  // ===== 保存修改 =====
  async saveEdit() {
    const idx = this.data.editIndex
    const r = this.data.result
    await db.collection('clothes').doc(r.dbId).update({
      data: {
        name: r.color + r.subcategory,
        category: r.category,
        subcategory: r.subcategory,
        color: r.color,
        material: r.material,
        status: 'recognized'
      }
    })
    this.setData({
      ['uploadList[' + idx + '].category']: r.category,
      ['uploadList[' + idx + '].subcategory']: r.subcategory,
      ['uploadList[' + idx + '].color']: r.color,
      ['uploadList[' + idx + '].material']: r.material,
      ['uploadList[' + idx + '].name']: r.color + r.subcategory,
      ['uploadList[' + idx + '].status']: 'recognized',
      editIndex: -1
    })
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  // ===== 删除某张 =====
  async removeItem(e) {
    const idx = e.currentTarget.dataset.index
    const item = this.data.uploadList[idx]
    if (item.dbId) {
      await db.collection('clothes').doc(item.dbId).remove()
    }
    const list = [...this.data.uploadList]
    list.splice(idx, 1)
    this.setData({ uploadList: list })
  },

  // 返回衣柜
  goBack() { wx.navigateBack() }
})