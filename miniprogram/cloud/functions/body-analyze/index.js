const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { imageFileID } = event

  if (!imageFileID) return { error: '缺少图片' }

  // TODO: 调用 MiMo-v2.5 API 分析体型
  // 返回桩数据
  const result = {
    body_type: '标准',
    style_preference: '休闲简约',
    color_preference: '浅色系',
    season_suggestion: '春夏'
  }

  // 保存到用户档案
  await db.collection('users').doc(OPENID).update({
    data: { body_profile: result, updated_at: db.serverDate() }
  }).catch(() => {})

  return result
}
