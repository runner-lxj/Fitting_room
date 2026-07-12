const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const https = require('https')

const MIMO_API_KEY = 'tp-ca9e48gij1w75rdis1f0qaf3fnjflrmo2r0sjc1opysobkny'
const MIMO_API_HOST = 'token-plan-cn.xiaomimimo.com'

function callMimo(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'mimo-v2.5',
      messages: messages,
      temperature: 0.3,
      max_completion_tokens: 1024,
      response_format: { type: 'json_object' }
    })
    const options = {
      hostname: MIMO_API_HOST,
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + MIMO_API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    }
    const req = https.request(options, res => {
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("MiMo API timeout")) })
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.choices && json.choices[0]) {
            const content = json.choices[0].message.content
            resolve(JSON.parse(content))
          } else {
            reject(new Error('No response from MiMo'))
          }
        } catch (e) { console.error('[callMimo] error:', e.message, e.stack); reject(e) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  if (event.action === 'recognize') {
    const { imageFileID, clothId } = event
    if (!imageFileID) return { error: 'missing image' }

    try {
      const fileRes = await cloud.downloadFile({ fileID: imageFileID })
      // 内容安全审核
      try {
        const checkRes = await cloud.openapi.security.imgSecCheck({ media: { contentType: imageFileID.endsWith('.png') ? 'image/png' : 'image/jpeg', value: fileRes.fileContent } })
        if (checkRes.errCode !== 0) {
          console.warn('[clothes-add] imgSecCheck blocked:', checkRes.errMsg)
          return { error: '图片内容违规，无法上传' }
        }
      } catch (secErr) {
        console.warn('[clothes-add] imgSecCheck error:', secErr.message)
      }
      const base64 = fileRes.fileContent.toString('base64')
      console.log('[recognize] image size:', base64.length, 'bytes, mimeType:', mimeType)
      const mimeType = imageFileID.endsWith('.png') ? 'image/png' : 'image/jpeg'

      const prompt = '分析衣物图片，返回JSON。category只能是top/bottom/dress/outerwear/shoes/accessory。\nsubcategory用中文，从以下列表中选最精确的一个：\n- top: 半袖/T恤、长袖T恤、POLO衫、长袖衬衫、短袖衬衫、雪纺衫、针织衫、卫衣、毛衣、背心/吊带\n- bottom: 长裤、牛仔裤、阔腿裤、西裤、短裤、半裙（短裙）、中长裙、长裙、打底裤\n- dress: 连衣裙（短款）、连衣裙（中长款）、连衣裙（长款）、背带裙\n- outerwear: 薄外套、开衫/针织外套、牛仔外套、西装、厚外套、风衣、棉服/羽绒服\n- shoes: 运动鞋、帆布鞋、皮鞋、乐福鞋、高跟鞋、平底鞋/单鞋、短靴、长靴、凉鞋、拖鞋\n- accessory: 包、帽、围巾/丝巾、腰带、首饰\ncolor和material用中文。style_tags用中文数组。直接返回JSON。'

      const result = await callMimo([{
      console.log('[recognize] result:', JSON.stringify(result).substring(0, 200))
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + base64 } }
        ]
      }])

      if (clothId) {

      // 分类校验：根据 subcategory 纠正 category
      const bottomSubs = ['long-pants', 'shorts', 'skirt', '长裤', '牛仔裤', '阔腿裤', '西裤', '短裤', '半裙', '半裙（短裙）', '中长裙', '长裙', '打底裤']
      const topSubs = ['half-sleeve', 'long-sleeve-shirt', 'hoodie', 'sweater', 'vest', '半袖/T恤', '长袖T恤', 'POLO衫', '长袖衬衫', '短袖衬衫', '雪纺衫', '针织衫', '卫衣', '毛衣', '背心/吊带']
      if (bottomSubs.includes(result.subcategory) && result.category !== 'bottom') {
        result.category = 'bottom'
      } else if (topSubs.includes(result.subcategory) && result.category !== 'top') {
        result.category = 'top'
      }

        await db.collection('clothes').doc(clothId).update({
          data: {
            name: (result.color || '') + (result.subcategory || ''),
            category: result.category || 'top',
            subcategory: result.subcategory || '',
            color: result.color || '',
            material: result.material || '',
            style_tags: result.style_tags || [],
            status: 'recognized'
          }
        })
      }

      return result
    } catch (e) {
      console.error('recognize failed:', e)
      if (clothId) {
        await db.collection('clothes').doc(clothId).update({ data: { status: 'failed' } })
      }
      return { error: e.message }
    }
  }

  return { error: 'unknown action' }
}











