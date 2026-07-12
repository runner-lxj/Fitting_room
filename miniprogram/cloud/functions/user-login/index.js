const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const PREFIXES = ['清风','明月','流光','初雪','微雨','暖阳','晨露','星河','云间','花语','墨染','烟霞','霜降','轻吟','浅笑','素心','半夏','青柠','拾光','浮生']
const SUFFIXES = ['知否','如故','未央','长安','南风','北辰','东篱','西楼','听雨','望月','拾柒','拾贰','初见','倾城','倾心','素年','锦时','时光','流年','若水']

function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const OPENID = wxContext.OPENID

  if (!OPENID) {
    return { userInfo: { _id: 'anonymous', nickName: '云间知否', avatarUrl: '', is_admin: false } }
  }

  try {
    let user = await db.collection('users').doc(OPENID).get().catch(() => null)

    if (!user || !user.data) {
      const nickName = randomPick(PREFIXES.concat(SUFFIXES))
      await db.collection('users').add({
        data: {
          _id: OPENID,
          nickName: nickName,
          avatarUrl: '',
          is_admin: false,
          theme: 'default',
          created_at: db.serverDate()
        }
      })
      user = await db.collection('users').doc(OPENID).get()
    }

    return { userInfo: user.data }
  } catch (e) {
    console.error('user-login error:', e)
    return { userInfo: { _id: OPENID, nickName: randomPick(PREFIXES.concat(SUFFIXES)), avatarUrl: '', is_admin: false } }
  }
}
