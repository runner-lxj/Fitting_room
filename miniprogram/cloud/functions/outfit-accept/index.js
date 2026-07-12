const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { outfitId, action } = event

  if (action === 'reject') {
    // 舍弃搭配
    await db.collection('outfits').doc(outfitId).update({ data: { status: 'rejected' } })
    return { success: true, action: 'rejected' }
  }

  // 采纳搭配
  await db.collection('outfits').doc(outfitId).update({ data: { status: 'accepted' } })

  // 获取搭配方案
  const outfit = await db.collection('outfits').doc(outfitId).get()
  const items = outfit.data.items || []

  // 更新衣服的 match_count 和 match_tag
  for (const item of items) {
    if (item.id) {
      const cloth = await db.collection('clothes').doc(item.id).get().catch(() => null)
      if (cloth && cloth.data) {
        const newCount = (cloth.data.match_count || 0) + 1
        const tag = newCount >= 2 ? '搭' + newCount + '套啦~' : '搭' + newCount + '套啦~'
        await db.collection('clothes').doc(item.id).update({
          data: { match_count: newCount, match_tag: tag }
        })
      }
    }
  }

  // 生成衣橱照（复用 composition_url）
  await db.collection('wardrobe_photos').add({
    data: {
      user_id: OPENID,
      outfit_id: outfitId,
      wardrobe_url: outfit.data.composition_url || '',
      name: outfit.data.name,
      date: new Date().toISOString().slice(0, 10),
      created_at: db.serverDate()
    }
  })

  return { success: true, action: 'accepted' }
}
