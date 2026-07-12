const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const user = await db.collection('users').doc(OPENID).get().catch(() => null)
  if (!user?.data?.is_admin) return { error: '无管理员权限' }

  const { action } = event

  if (action === 'get') {
    const config = await db.collection('admin_config').doc('mimo_config').get().catch(() => null)
    return { config: config?.data || {} }
  }

  if (action === 'update') {
    const { config } = event
    await db.collection('admin_config').doc('mimo_config').update({
      data: { ...config, updated_at: db.serverDate() }
    }).catch(async () => {
      await db.collection('admin_config').add({
        data: { _id: 'mimo_config', ...config, created_at: db.serverDate() }
      })
    })
    return { success: true }
  }

  return { error: 'unknown action' }
}

