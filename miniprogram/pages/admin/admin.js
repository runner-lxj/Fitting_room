const app = getApp()
const { getThemeClass } = require('../../utils/theme')
const db = wx.cloud.database()
Page({
  data: {
    themeClass: '', saving: false,
    config: { model: 'mimo-v2.5', temperature: 0.7, top_p: 0.95, outfit_count: 3, system_prompt: '' },
    modelOptions: ['mimo-v2.5', 'mimo-v2.5-pro'],
    modelIdx: 0, primaryColor: '#FF7E8D'
  },
  onLoad() {
    this.setData({ themeClass: getThemeClass() })
    if (!app.checkAdmin()) { wx.showToast({ title: '无权限', icon: 'none' }); setTimeout(() => wx.navigateBack(), 1500); return }
    this.loadConfig()
  },
  async loadConfig() {
    try {
      const res = await db.collection('admin_config').doc('mimo_config').get()
      this.setData({ config: res.data, modelIdx: this.data.modelOptions.indexOf(res.data.model) })
    } catch (e) { console.log('使用默认配置') }
  },
  onModelChange(e) { this.setData({ modelIdx: e.detail.value, 'config.model': this.data.modelOptions[e.detail.value] }) },
  onTempChange(e) { this.setData({ 'config.temperature': e.detail.value / 10 }) },
  onTopPChange(e) { this.setData({ 'config.top_p': e.detail.value / 100 }) },
  onCountChange(e) { this.setData({ 'config.outfit_count': parseInt(e.detail.value) + 1 }) },
  onPromptInput(e) { this.setData({ 'config.system_prompt': e.detail.value }) },
  async saveConfig() {
    this.setData({ saving: true })
    try {
      const c = this.data.config
      await db.collection('admin_config').doc('mimo_config').set({
        data: { ...c, updated_at: db.serverDate(), updated_by: 'ADMIN_PHONE' }
      })
      wx.showToast({ title: '保存成功', icon: 'success' })
    } catch (e) {
      await db.collection('admin_config').add({ data: { _id: 'mimo_config', ...this.data.config, updated_at: db.serverDate(), updated_by: 'ADMIN_PHONE' } })
      wx.showToast({ title: '保存成功', icon: 'success' })
    }
    this.setData({ saving: false })
  }
})