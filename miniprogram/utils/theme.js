// utils/theme.js - 主题工具
const THEMES = {
  default: { name: '樱花粉', primary: '#FF7E8D', icon: '🌸' },
  mint: { name: '薄荷绿', primary: '#7ECFB3', icon: '🍃' },
  purple: { name: '暗夜紫', primary: '#6C5CE7', icon: '🌙' }
}

const getThemeClass = () => {
  const theme = wx.getStorageSync('theme') || 'default'
  return theme === 'default' ? '' : 'theme-' + theme
}

const getThemeName = () => {
  const theme = wx.getStorageSync('theme') || 'default'
  return THEMES[theme]?.name || '樱花粉'
}

const getAllThemes = () => {
  return Object.entries(THEMES).map(([key, val]) => ({
    key,
    ...val,
    active: (wx.getStorageSync('theme') || 'default') === key
  }))
}

module.exports = { THEMES, getThemeClass, getThemeName, getAllThemes }