# 智能穿搭助手 — 项目进展汇总

> 更新日期: 2026-07-13 | 版本: V1.0 | 状态: 一期功能完成，准备提交审核

---

## 1. 项目概述

微信小程序，基于天气和用户个人衣橱，通过 AI 智能推荐每日穿搭方案。

核心功能：
1. 拍照上传衣服，AI 识别分类存入衣柜
2. 结合天气 + 衣柜，一键 AI 生成搭配方案
3. 采纳/舍弃方案，批量操作高效筛选
4. 待采纳/已采纳双 Tab 管理，方案去重
5. 个人主页展示穿搭档案与衣柜统计

---

## 2. 产出文档

| 文档 | 路径 | 版本 |
|------|------|------|
| 产品需求文档 | docs/01-PRD-产品需求文档.md | V1.0 |
| 技术可行性分析 | docs/02-技术可行性分析.md | V1.0 |
| 技术设计文档 | docs/03-技术设计文档.md | V1.0 |
| 视觉设计方案 | docs/04-视觉设计方案.md | v0.2 |
| 市场调研与推广策略 | docs/05-市场调研与推广策略.md | v0.2 |
| UI 交互设计规范 | docs/06-UI交互设计规范.md | V1.0 |
| UI 设计文档 | docs/07-UI设计文档-一期收官.md | V1.0 |
| UI 交互流程图 | docs/08-UI交互流程图.md | V1.0 |

---

## 3. 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端 | 微信小程序原生（WXML + WXSS + JS） |
| 业务后端 | 微信云开发（云函数 + 云数据库 + 云存储） |
| AI 推理 | MiMo-v2.5 API（OpenAI 兼容格式） |
| 天气数据 | 和风天气 API v7（Ed25519 JWT 认证） |
| 出装图拼接 | Pillow |

---

## 4. 一期已完成功能

### 4.1 页面（8个）

| 页面 | 功能 | 状态 |
|------|------|------|
| 首页 | 天气 + 今日推荐 + 定位授权 + 快捷入口计数 | ✅ |
| 衣柜 | 分类Tab + 二级筛选 + 双列网格 + FAB添加 | ✅ |
| 穿搭 | 一键搭配 + 待采纳/已采纳Tab + 批量采纳 + 浮窗进度 | ✅ |
| 搭配详情 | 图片网格 + AI理由 + 单品列表 + 采纳/舍弃 | ✅ |
| 添加衣服 | 批量上传 + AI识别 + 编辑结果 + 删除 | ✅ |
| 个人中心 | 头像(灵悦) + 昵称(限5字) + 穿搭计数 | ✅ |
| 管理员 | MiMo模型配置 | ✅ |
| 隐私协议 | 首次进入隐私弹窗 | ✅ |

### 4.2 云函数（8个）

| 云函数 | 功能 | 状态 |
|--------|------|------|
| user-login | 微信登录 + 随机昵称(单字) | ✅ |
| clothes-add | MiMo-v2.5 衣物识别 | ✅ |
| outfit-recommend | 搭配生成 + 天气筛选 | ✅ |
| outfit-accept | 采纳/舍弃 + match_count更新 | ✅ |
| admin-config | 管理员配置读写 | ✅ |
| notification-list | 通知列表 | ✅ |
| body-analyze | 人身照分析（桩） | ⚠️ |
| outfit-compose | 出装图合成（桩） | ⚠️ |

### 4.3 核心机制

| 机制 | 说明 |
|------|------|
| 页面缓存 | 脏标记(outfitDirty/wardrobeDirty)，onShow按需刷新 |
| 方案去重 | 按衣物ID集合排序拼接去重，tab计数同步 |
| 批量采纳 | 圆图标进入批量模式 → 多选 → 全选 → 确认采纳 |
| CSS图标系统 | 7个纯CSS图标类(chevron/close/add/hanger/empty-box/user/menu-dot) |
| 主题系统 | 3套主题(奶油白/雾霾蓝/薰衣草)，CSS变量驱动 |
| 默认头像 | 灵悦大头像(avatar-default.png)，数字人(avatar-character.png)首页专用 |

---

## 5. 一期遗留问题

| 序号 | 问题 | 优先级 | 说明 |
|------|------|--------|------|
| 1 | 首页svg-placeholder残留2处 | 低 | 空状态占位，已替换为CSS图标 |
| 2 | body-analyze云函数未接入 | 中 | 人身照分析仍为桩代码 |
| 3 | outfit-compose云函数未接入 | 中 | 出装图合成仍为桩代码 |
| 4 | 衣服详情页未实现 | 低 | wardrobe.js中goDetail为TODO |
| 5 | 首页推荐只展示单套 | 低 | 今日推荐只取最高分1套 |
| 6 | GPS逆地理编码可能失败 | 中 | 和风geoAPI认证方式待验证 |
| 7 | 头像变体文件未清理 | 低 | static/images下有多个未使用头像 |

---

## 6. 后续待办

### V1.1（体验优化）

| 序号 | 任务 | 预估工时 |
|------|------|----------|
| 1 | 接入outfit-compose出装图合成 | 1天 |
| 2 | 接入body-analyze人身照分析 | 半天 |
| 3 | 衣服详情编辑页（颜色/材质/风格修改） | 2小时 |
| 4 | 首页推荐支持多套轮播 | 2小时 |
| 5 | 衣柜页面增加拖拽排序 | 半天 |
| 6 | 穿搭详情页增加分享海报生成 | 半天 |

### V1.2（功能扩展）

| 序号 | 任务 |
|------|------|
| 7 | 微信订阅消息通知（每日穿搭提醒） |
| 8 | 定时预生成任务（后台自动搭配） |
| 9 | 穿搭评分反馈（用户点赞/踩） |
| 10 | 用户偏好学习（基于历史采纳） |
| 11 | 衣物删除/编辑功能完善 |
| 12 | 搭配日历（按日期记录穿搭） |

### V2.0（长期规划）

| 序号 | 任务 |
|------|------|
| 13 | 数字人虚拟试穿（SD+ControlNet） |
| 14 | 社交分享（穿搭社区） |
| 15 | 电商导购（搭配单品购买链接） |

---

## 7. 提交审核前检查清单

- [x] 所有页面文件完整（8页×4文件）
- [x] 所有云函数文件完整（8个）
- [x] tabBar图标完整（8个）
- [x] WXML标签闭合正确
- [x] 客户端无密钥泄露
- [x] 隐私政策页存在
- [x] sitemap.json存在
- [x] 版本号V1.0
- [ ] 云函数outfit-recommend已部署
- [ ] 云函数user-login已部署
- [ ] 微信开发者工具上传版本

---

## 8. 成本

| 项目 | 费用 |
|------|------|
| 微信小程序注册 | 300元/年 |
| 微信云开发 | 0元（免费额度） |
| MiMo-v2.5 API | 0元（已有额度） |
| 和风天气 API | 0元（免费版） |
| 首年总计 | 300元 |
---

## 附录：出装图合成方案（outfit-compose）详细设计

### 背景

V1.0 搭配详情页直接展示各单品原始照片（2×2网格），未做图片合成。后续版本计划用 Pillow 将多件衣服的抠图拼接成一张搭配效果图，提升视觉呈现。

### 前置条件

1. **衣服抠图**：上传衣服时需生成透明背景 PNG（cutout_url），目前未实现
2. **Python 运行环境**：云函数需支持 Python 或在 Node.js 中调用 Pillow
3. **模板设计**：需设计2-4种布局模板适配不同件数

### 技术方案

#### 1. 模板布局

| 模板 | 适用件数 | 布局 | 说明 |
|------|----------|------|------|
| 模板A | 2件 | 上下排列 | 上衣+下装 |
| 模板B | 3件 | 品字形 | 上衣+下装+鞋子 |
| 模板C | 4件 | 2×2网格 | 上衣+下装+鞋子+配饰 |
| 模板D | 5件 | T型 | 内搭+外搭+下装+鞋子+配饰 |

#### 2. 合成流程

```
outfit-recommend 云函数生成搭配
        ↓
获取搭配中每件衣服的 cutout_url
        ↓
从云存储下载抠图 PNG
        ↓
Pillow 按模板布局合成（白底/渐变底）
        ↓
上传合成图到云存储（outfit/composition_{id}.png）
        ↓
更新 outfits 集合的 composition_url 字段
```

#### 3. Pillow 合成代码示意

```python
from PIL import Image, ImageDraw
import requests
from io import BytesIO

def compose_outfit(cutout_urls, template='B'):
    """合成出装图"""
    canvas_size = (800, 800)
    bg_color = (250, 248, 245)  # 奶油白背景
    canvas = Image.new('RGB', canvas_size, bg_color)
    
    # 下载抠图
    images = []
    for url in cutout_urls:
        resp = requests.get(url)
        img = Image.open(BytesIO(resp.content)).convert('RGBA')
        images.append(img)
    
    # 按模板布局放置
    if template == 'B':  # 品字形，3件
        positions = [(100, 50), (100, 350), (450, 350)]
        sizes = [(300, 300), (300, 300), (250, 250)]
    
    for img, pos, size in zip(images, positions, sizes):
        img = img.resize(size, Image.LANCZOS)
        canvas.paste(img, pos, img)  # 用alpha通道做透明合成
    
    return canvas
```

#### 4. 云函数改造

在 `outfit-recommend/index.js` 的 `generateOutfits` 函数中，生成搭配后增加合成步骤：

```javascript
// 生成搭配后
for (const o of savedOutfits) {
  const clothIds = o.items.map(i => i.id).filter(Boolean)
  // 查询抠图URL
  const clothRes = await db.collection('clothes')
    .where({ _id: db.command.in(clothIds) }).get()
  const cutoutUrls = clothRes.data
    .map(c => c.cutout_url)
    .filter(Boolean)
  
  if (cutoutUrls.length >= 2) {
    // 调用合成云函数
    const compRes = await cloud.callFunction({
      name: 'outfit-compose',
      data: { cutoutUrls, outfitId: o._id }
    })
    // 更新composition_url
    await db.collection('outfits').doc(o._id).update({
      data: { composition_url: compRes.result.fileID }
    })
  }
}
```

### 实施步骤

| 步骤 | 任务 | 工时 |
|------|------|------|
| 1 | 衣服上传时增加抠图环节（rembg/remove.bg） | 1天 |
| 2 | 设计4种布局模板（确定坐标和尺寸） | 2小时 |
| 3 | 创建 outfit-compose Python 云函数 | 半天 |
| 4 | outfit-recommend 中调用合成 | 2小时 |
| 5 | 详情页 Hero 区适配合成图展示 | 1小时 |
| 6 | 测试不同件数的合成效果 | 2小时 |
| **合计** | | **约2.5天** |

### 风险与注意事项

1. **抠图质量**：rembg 对复杂背景效果一般，可能需要 fallback 到 remove.bg API（有免费额度）
2. **云函数内存**：Pillow 处理800×800图片约需 50-100MB 内存，微信云函数默认 256MB 足够
3. **执行时间**：下载+合成+上传约 3-5 秒，需在客户端设置合理超时
4. **成本**：合成在云函数中执行，免费额度内无额外费用