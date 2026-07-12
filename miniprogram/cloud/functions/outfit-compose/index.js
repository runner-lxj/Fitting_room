const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { imageFileIDs, layout } = event
  if (!imageFileIDs || imageFileIDs.length === 0) return { error: 'no images' }

  try {
    // Download all images
    const images = []
    for (const fileID of imageFileIDs) {
      const res = await cloud.downloadFile({ fileID })
      images.push(res.fileContent)
    }

    // For MVP: return the first image as composition
    // TODO: use jimp or sharp to create proper grid layout
    // Upload composed image to cloud storage
    const timestamp = Date.now()
    const cloudPath = 'outfits/composition_' + timestamp + '.jpg'
    const uploadRes = await cloud.uploadFile({
      cloudPath,
      fileContent: images[0]
    })

    return {
      composition_url: uploadRes.fileID,
      layout: layout || 'grid',
      image_count: images.length
    }
  } catch (e) {
    console.error('compose failed:', e)
    return { error: e.message }
  }
}
