const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  if (event.action === 'recognize') {
    // TODO: 调用 MiMo-v2.5 视觉识别衣物
    // 此处为桩数据
    return {
      category: 'top',
      subcategory: '半袖',
      color: '白色',
      material: '棉',
      style_tags: ['休闲', '简约']
    }
  }
  
  return { error: 'unknown action' }
}