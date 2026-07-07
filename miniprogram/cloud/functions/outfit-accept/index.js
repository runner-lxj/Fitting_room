const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { outfitId } = event
  
  // 更新搭配状态
  await db.collection('outfits').doc(outfitId).update({ data: { status: 'accepted' } })
  
  // 获取搭配方案
  const outfit = await db.collection('outfits').doc(outfitId).get()
  
  // 生成衣橱照（复用 composition_url 作为衣橱照）
  await db.collection('wardrobe_photos').add({
    data: {
      user_id: OPENID,
      outfit_id: outfitId,
      wardrobe_url: outfit.data.composition_url,
      name: outfit.data.name,
      date: new Date().toISOString().slice(0, 10),
      created_at: db.serverDate()
    }
  })
  
  return { success: true }
}