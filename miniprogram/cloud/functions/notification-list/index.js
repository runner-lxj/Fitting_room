const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('notifications').where({ user_id: OPENID }).orderBy('created_at', 'desc').limit(20).get()
  return { notifications: res.data }
}