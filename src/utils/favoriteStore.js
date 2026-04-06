const DB_NAME = 'vorin-local-exam-db'
const DB_VERSION = 1

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed'))
  })
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'))
  })
}

function favoritesKey(profileId, subject) {
  return `favorites:${profileId}:${subject}`
}

async function loadFavoriteMap(profileId, subject) {
  const db = await openDb()
  const tx = db.transaction('meta', 'readonly')
  const result = await requestToPromise(tx.objectStore('meta').get(favoritesKey(profileId, subject)))
  return result?.value || {}
}

async function saveFavoriteMap(profileId, subject, value) {
  const db = await openDb()
  const tx = db.transaction('meta', 'readwrite')
  tx.objectStore('meta').put({
    key: favoritesKey(profileId, subject),
    value,
    updatedAt: Date.now(),
  })
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Save favorites failed'))
  })
  return value
}

export async function loadFavoriteEntries(profileId, subject) {
  const map = await loadFavoriteMap(profileId, subject)
  return Object.values(map).sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0))
}

export async function toggleFavoriteEntry(profileId, subject, entry) {
  const map = await loadFavoriteMap(profileId, subject)
  const key = entry.questionKey
  const next = { ...map }
  let isFavorite = false
  if (next[key]) {
    delete next[key]
  } else {
    next[key] = {
      ...entry,
      favoritedAt: Date.now(),
    }
    isFavorite = true
  }
  const saved = await saveFavoriteMap(profileId, subject, next)
  return { entries: Object.values(saved).sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0)), map: saved, isFavorite }
}

export async function removeFavoriteEntry(profileId, subject, questionKey) {
  const map = await loadFavoriteMap(profileId, subject)
  const next = { ...map }
  delete next[questionKey]
  const saved = await saveFavoriteMap(profileId, subject, next)
  return Object.values(saved).sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0))
}
