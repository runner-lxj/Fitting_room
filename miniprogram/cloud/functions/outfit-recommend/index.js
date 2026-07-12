const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const https = require('https')
const zlib = require('zlib')
const crypto = require('crypto')

const TOKEN_ID = 'TG5A72HFGD'
const PROJECT_ID = '2C2ER8M72X'
const PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIMf6uG6LyGHbFzCaHQz+oJIyiaj+XiIFxQz4no+jr/Yv\n-----END PRIVATE KEY-----'
const DEFAULT_LOCATION = '101010100'
const MIMO_API_KEY = 'tp-ca9e48gij1w75rdis1f0qaf3fnjflrmo2r0sjc1opysobkny'
const MIMO_API_HOST = 'token-plan-cn.xiaomimimo.com'

function generateJwt() {
  const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: TOKEN_ID })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({ sub: PROJECT_ID, iat: now, exp: now + 1800 })).toString('base64url')
  const data = header + '.' + payload
  const sign = crypto.sign(null, Buffer.from(data), crypto.createPrivateKey(PRIVATE_KEY))
  return data + '.' + sign.toString('base64url')
}

function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    const parsed = new (require('url').URL)(url)
    const options = { hostname: parsed.hostname, port: 443, path: parsed.pathname + parsed.search, method: 'GET', headers: headers || {} }
    const req = https.get(options, res => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => {
        const buf = Buffer.concat(chunks)
        const enc = (res.headers['content-encoding'] || '').toLowerCase()
        if (enc === 'gzip') { zlib.gunzip(buf, (err, d) => err ? reject(err) : resolve(d.toString('utf8'))) }
        else if (enc === 'deflate') { zlib.inflate(buf, (err, d) => err ? reject(err) : resolve(d.toString('utf8'))) }
        else { resolve(buf.toString('utf8')) }
      })
    })
    req.setTimeout(30000, () => reject(new Error('HTTP timeout')))
    req.on('error', reject)
  })
}

async function fetchWeather(location) {
  try {
    const jwt = generateJwt()
    const data = await httpGet('https://nj6fr9cwdr.re.qweatherapi.com/v7/weather/now?location=' + location, { 'Authorization': 'Bearer ' + jwt })
    const json = JSON.parse(data)
    if (json.code === '200' && json.now) {
      const n = json.now; const temp = parseInt(n.temp)
      let tip = ''
      if (temp >= 30) tip = '天气炎热，建议穿短袖短裤'
      else if (temp >= 25) tip = '温暖舒适，短袖+薄裤即可'
      else if (temp >= 18) tip = '气温适中，可搭配薄外套'
      else if (temp >= 10) tip = '偏凉，建议穿卫衣或薄外套'
      else tip = '天气较冷，注意添衣保暖'
      return { temp, condition: n.text, wind: n.windDir, humidity: parseInt(n.humidity), icon: '', tip }
    }
    return null
  } catch (e) { console.error('[weather] error:', e.message); return null }
}

function callMimo(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: 'mimo-v2.5', messages, temperature: 0.7, max_completion_tokens: 4096, response_format: { type: 'json_object' } })
    const options = { hostname: MIMO_API_HOST, port: 443, path: '/v1/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + MIMO_API_KEY, 'Content-Length': Buffer.byteLength(body) } }
    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { const json = JSON.parse(data); if (json.choices && json.choices[0]) resolve(JSON.parse(json.choices[0].message.content)); else reject(new Error('No response')) }
        catch (e) { reject(e) }
      })
    })
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('MiMo timeout')) })
    req.on('error', reject)
    req.write(body); req.end()
  })
}

const SYSTEM_PROMPT = '你是专业的穿搭推荐助手。根据用户衣柜，推荐 3-5 套搭配。\n\n## 衣橱数据结构\n- tops: 上衣（半袖/T恤/衬衫等）\n- bottoms: 下装（长裤/短裤/半裙等）\n- dresses: 连衣裙\n- outers: 外搭/叠穿层\n- shoes: 鞋子\n- accessories: 配饰\n\n## 穿搭规则\n1. 每套搭配 2~5 件单品，灵活组合。\n2. 善用叠穿：半袖可以单穿做 top，也可以穿在外套里面做 inner。\n3. 有鞋子就搭配鞋子，没有就省略。\n4. 分析每件衣服的材质、厚度、款式，判断适合什么天气穿。\n5. 搭配要有发散思维，考虑色彩对比、材质混搭。\n6. 只能使用衣橱中已有的 id，绝对不要编造 id。\n7. 不同方案覆盖不同天气场景。\n\n## 输出格式（严格 JSON）\n{"outfits":[{"name":"搭配名称","occasion":"场合","weather_desc":"适合什么天气穿","temperature_range":{"min":25,"max":32},"weather_tags":["晴天","炎热"],"season":"春夏","score":0.85,"style_summary":"风格关键词","ai_reason":"搭配理由（带emoji，2-4句话）","items":[{"id":"衣服id","role":"top"},{"id":"衣服id","role":"bottom"}]}]}\n\n## role取值\ntop:单穿上衣 inner:内搭 outer:外搭 bottom:下装 shoes:鞋子 accessory:配饰\n\n只输出JSON，不要其他文字。'

const groupMap = { top: 'tops', bottom: 'bottoms', dress: 'dresses', outerwear: 'outers', shoes: 'shoes', accessory: 'accessories' }

async function generateOutfits(OPENID) {
  console.log('[generate] START, OPENID:', OPENID)
  const allClothes = await db.collection('clothes').where({ user_id: '{openid}', status: 'recognized' }).get()
  console.log('[generate] recognized:', allClothes.data.length)
  const acceptedOutfits = await db.collection('outfits').where({ user_id: '{openid}', status: 'accepted' }).get()
  console.log('[generate] accepted:', acceptedOutfits.data.length)
  const clothMatchCount = {}
  for (const o of acceptedOutfits.data) {
    for (const item of (o.items || [])) {
      const id = item.id || item
      if (id) clothMatchCount[id] = (clothMatchCount[id] || 0) + 1
    }
  }
  const needMatch = allClothes.data.filter(c => {
    if (c.category === 'shoes' || c.category === 'accessory') return false
    return (clothMatchCount[c._id] || 0) < 2
  })
  console.log('[generate] need match:', needMatch.length)
  if (needMatch.length === 0) return { outfits: [], message: '所有衣服都已搭配2套以上' }
  const wardrobe = {}
  for (const c of allClothes.data) {
    const group = groupMap[c.category] || 'tops'
    if (!wardrobe[group]) wardrobe[group] = []
    wardrobe[group].push({ id: c._id, name: c.name, color: c.color, material: c.material, style_tags: c.style_tags || [] })
  }
  console.log('[generate] calling MiMo...')
  const result = await callMimo([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: '衣柜数据：' + JSON.stringify(wardrobe) }
  ])
  console.log('[generate] MiMo returned', (result.outfits || []).length, 'outfits')
  const savedOutfits = []
  for (const o of (result.outfits || [])) {
    const items = (o.items || []).map(item => ({ id: item.id, role: item.role || 'top' }))
    const doc = {
      user_id: OPENID, _openid: OPENID, name: o.name || '穿搭方案', occasion: o.occasion || '日常',
      weather_desc: o.weather_desc || '', temperature_range: o.temperature_range || { min: 15, max: 30 },
      weather_tags: o.weather_tags || [], season: o.season || '四季通用',
      score: o.score || 0.8, style_summary: o.style_summary || '',
      ai_reason: (o.ai_reason || '').replace(/\\n/g, ' ').replace(/\\r/g, ''),
      items: items, composition_url: '', status: 'pending', created_at: db.serverDate()
    }
    const res = await db.collection('outfits').add({ data: doc })
    doc._id = res._id
    savedOutfits.push(doc)
  }
  console.log('[generate] saved', savedOutfits.length)
  return { outfits: savedOutfits }
}



async function getDailyRecommend(OPENID) {
  console.log('[daily] START, OPENID:', OPENID)
  const weather = await fetchWeather(DEFAULT_LOCATION)
  const temp = weather ? weather.temp : 22
  const condition = weather ? weather.condition : '多云'
  console.log('[daily] weather:', temp + 'C', condition)
  const outfits = await db.collection('outfits').where({ _openid: OPENID, status: 'accepted' }).get()
  console.log('[daily] accepted:', outfits.data.length)
  if (outfits.data.length === 0) return { outfit: null, weather, message: '暂无已采纳的搭配方案' }
  // 按温度匹配优先，无匹配则返回最高分
  const scored = outfits.data.map(o => {
    const tr = o.temperature_range || { min: 15, max: 30 }
    const tempMatch = temp >= tr.min && temp <= tr.max ? 1 : 0
    return { ...o, tempMatch }
  })
  scored.sort((a, b) => (b.tempMatch - a.tempMatch) || ((b.score || 0) - (a.score || 0)))
  return { outfit: scored[0], weather }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event
  if (action === 'getWeather') {
    const weather = await fetchWeather(event.location || DEFAULT_LOCATION)
    return weather || { temp: '--', condition: 'unknown', wind: '', humidity: 0, icon: '', tip: 'no data' }
  }
  if (action === 'generate') return await generateOutfits(OPENID)
  if (action === 'daily') return await getDailyRecommend(OPENID)
  if (action === 'reverseGeocode') {
    const { lat, lng } = event
    if (!lat || !lng) return { error: 'missing coordinates' }
    try {
      const jwt = generateJwt()
      const data = await httpGet('https://geoapi.qweather.com/v2/city/lookup?location=' + lng + ',' + lat + '&number=1', { 'Authorization': 'Bearer ' + jwt })
      const json = JSON.parse(data)
      if (json.code === '200' && json.location && json.location[0]) return { id: json.location[0].id, name: json.location[0].name }
      return { id: DEFAULT_LOCATION, name: '北京' }
    } catch (e) { return { id: DEFAULT_LOCATION, name: '北京' } }
  }
  return { error: 'unknown action' }
}



