// utils/theme.js - 主题工具（柔光杂志）
const THEMES = {
  default: { name: '奶油白', primary: '#D4956A', icon: '' },
  blue: { name: '雾霾蓝', primary: '#7B9EB8', icon: '' },
  lavender: { name: '薰衣草', primary: '#A08DB0', icon: '' }
}

const getThemeClass = () => {
  const theme = wx.getStorageSync('theme') || 'default'
  return theme === 'default' ? '' : 'theme-' + theme
}

const getThemeName = () => {
  const theme = wx.getStorageSync('theme') || 'default'
  return THEMES[theme]?.name || '奶油白'
}

const getAllThemes = () => {
  return Object.entries(THEMES).map(([key, val]) => ({
    key,
    ...val,
    active: (wx.getStorageSync('theme') || 'default') === key
  }))
}

module.exports = { THEMES, getThemeClass, getThemeName, getAllThemes }