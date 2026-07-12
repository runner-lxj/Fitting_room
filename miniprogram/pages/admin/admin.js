const app = getApp()
const { getThemeClass } = require('../../utils/theme')
const db = wx.cloud.database()
Page({
  data: {
    themeClass: '', saving: false, statusBarHeight: 0,
    config: { model: 'mimo-v2.5', temperature: 0.7, top_p: 0.95, outfit_count: 3, system_prompt: '' },
    modelOptions: ['mimo-v2.5', 'mimo-v2.5-pro'],
    modelIdx: 0, primaryColor: '#FF7E8D'
  },
  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ themeClass: getThemeClass(), statusBarHeight: sysInfo.statusBarHeight || 0 })
    if (!app.checkAdmin()) { wx.showToast({ title: '无权限', icon: 'none' }); setTimeout(() => wx.navigateBack(), 1500); return }
    this.loadConfig()
  },
  async loadConfig() {
    try {
      const res = await wx.cloud.callFunction({ name: 'admin-config', data: { action: 'get' } })
      const config = res.result?.config || {}
      if (config && Object.keys(config).length > 0) {
        this.setData({ config, modelIdx: this.data.modelOptions.indexOf(config.model) })
      }
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
      await wx.cloud.callFunction({ name: 'admin-config', data: { action: 'update', config: this.data.config } })
      wx.showToast({ title: '保存成功', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
    this.setData({ saving: false })
  }
})
