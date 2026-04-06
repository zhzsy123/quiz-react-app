import { generateId, getActiveProfileId, openDb, requestToPromise, setActiveProfileId } from './db'

export { getActiveProfileId, setActiveProfileId }

export async function listProfiles() {
  const db = await openDb()
  const tx = db.transaction('profiles', 'readonly')
  const store = tx.objectStore('profiles')
  const records = (await requestToPromise(store.getAll())) || []
  return records.sort((a, b) => a.createdAt - b.createdAt)
}

export async function createProfile(name) {
  const now = Date.now()
  const trimmed = (name || '').trim()
  const profile = {
    id: generateId('profile'),
    name: trimmed || `用户 ${new Date(now).toLocaleDateString()}`,
    createdAt: now,
    updatedAt: now,
  }

  const db = await openDb()
  const tx = db.transaction('profiles', 'readwrite')
  tx.objectStore('profiles').put(profile)
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Create profile failed'))
  })
  return profile
}

export async function renameProfile(profileId, name) {
  const db = await openDb()
  const tx = db.transaction('profiles', 'readwrite')
  const store = tx.objectStore('profiles')
  const existing = await requestToPromise(store.get(profileId))
  if (!existing) return null

  const next = {
    ...existing,
    name: (name || existing.name).trim() || existing.name,
    updatedAt: Date.now(),
  }

  store.put(next)
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Rename profile failed'))
  })
  return next
}

export async function ensureDefaultProfile() {
  const profiles = await listProfiles()
  if (profiles.length > 0) return profiles[0]
  return createProfile('默认用户')
}
