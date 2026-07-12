const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const COLLECTIONS = {
  users: { indexes: ['is_admin'] },
  clothes: { indexes: ['user_id', 'category', 'status'] },
  outfits: { indexes: ['user_id', 'status', 'created_at'] },
  wardrobe_photos: { indexes: ['user_id', 'outfit_id'] },
  notifications: { indexes: ['user_id', 'created_at'] },
  admin_config: { indexes: [] }
}

// Seed data for admin_config
const SEED_DATA = {
  admin_config: [
    {
      _id: 'mimo_config',
      model: 'mimo-v2.5',
      temperature: 0.7,
      top_p: 0.95,
      outfit_count: 3,
      system_prompt: '',
      updated_at: new Date()
    },
    {
      _id: 'global',
      default_location: '101010100',
      app_name: '智能穿搭助手',
      updated_at: new Date()
    }
  ]
}

exports.main = async (event, context) => {
  const results = []

  // Step 1: Create collections
  for (const [name, config] of Object.entries(COLLECTIONS)) {
    try {
      await db.createCollection(name)
      results.push({ name, status: 'created' })
    } catch (e) {
      if (e.errCode === -502005) {
        results.push({ name, status: 'already_exists' })
      } else {
        results.push({ name, status: 'error', error: e.message })
      }
    }

    // Create indexes
    for (const field of config.indexes) {
      try {
        await db.collection(name).createIndex({ [field]: 1 })
        results.push({ name: name + '.' + field, status: 'index_created' })
      } catch (e) {}
    }
  }

  // Step 2: Seed data
  for (const [collName, docs] of Object.entries(SEED_DATA)) {
    for (const doc of docs) {
      try {
        await db.collection(collName).doc(doc._id).get()
        results.push({ name: collName + '/' + doc._id, status: 'exists' })
      } catch (e) {
        try {
          await db.collection(collName).add({ data: doc })
          results.push({ name: collName + '/' + doc._id, status: 'seeded' })
        } catch (e2) {
          results.push({ name: collName + '/' + doc._id, status: 'seed_error', error: e2.message })
        }
      }
    }
  }

  return { results }
}