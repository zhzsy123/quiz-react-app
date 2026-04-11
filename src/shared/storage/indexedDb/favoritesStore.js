import { openDb, requestToPromise, waitForTransaction } from './db'

function favoriteEntryId(profileId, subject, questionKey) {
  return `${profileId}:${subject}:${questionKey}`
}

async function listFavoriteRecords(profileId, subject) {
  const db = await openDb()
  const tx = db.transaction('favorites', 'readonly')
  const store = tx.objectStore('favorites')
  const index = store.index('by_profile_subject')
  const records = (await requestToPromise(index.getAll([profileId, subject]))) || []
  return records.sort((left, right) => Number(right.favoritedAt || 0) - Number(left.favoritedAt || 0))
}

export async function loadFavoriteEntriesStore(profileId, subject) {
  return listFavoriteRecords(profileId, subject)
}

export async function replaceFavoriteEntriesStore(profileId, subject, entries = []) {
  const existing = await listFavoriteRecords(profileId, subject)
  const db = await openDb()
  const tx = db.transaction('favorites', 'readwrite')
  const store = tx.objectStore('favorites')

  existing.forEach((record) => {
    store.delete(record.id)
  })

  const nextEntries = (entries || [])
    .filter((entry) => entry && entry.questionKey)
    .map((entry) => ({
      ...entry,
      id: favoriteEntryId(profileId, subject, entry.questionKey),
      profileId,
      subject: entry.subject || subject,
      schemaVersion: 1,
      favoritedAt: Number(entry.favoritedAt) || Date.now(),
      updatedAt: Date.now(),
    }))

  nextEntries.forEach((entry) => {
    store.put(entry)
  })

  await waitForTransaction(tx, 'Replace favorite entries failed')
  return nextEntries.sort((left, right) => Number(right.favoritedAt || 0) - Number(left.favoritedAt || 0))
}

export async function toggleFavoriteEntryStore(profileId, subject, entry) {
  const questionKey = String(entry?.questionKey || '').trim()
  if (!questionKey) {
    return {
      entries: await loadFavoriteEntriesStore(profileId, subject),
      map: {},
      isFavorite: false,
    }
  }

  const id = favoriteEntryId(profileId, subject, questionKey)
  const db = await openDb()
  const tx = db.transaction('favorites', 'readwrite')
  const store = tx.objectStore('favorites')
  const existing = await requestToPromise(store.get(id))
  let isFavorite = false

  if (existing) {
    store.delete(id)
  } else {
    isFavorite = true
    store.put({
      ...entry,
      id,
      profileId,
      subject: entry.subject || subject,
      questionKey,
      schemaVersion: 1,
      favoritedAt: Date.now(),
      updatedAt: Date.now(),
    })
  }

  await waitForTransaction(tx, 'Toggle favorite entry failed')
  const entries = await loadFavoriteEntriesStore(profileId, subject)
  const map = entries.reduce((result, item) => {
    result[item.questionKey] = item
    return result
  }, {})

  return { entries, map, isFavorite }
}

export async function removeFavoriteEntryStore(profileId, subject, questionKey) {
  const db = await openDb()
  const tx = db.transaction('favorites', 'readwrite')
  tx.objectStore('favorites').delete(favoriteEntryId(profileId, subject, questionKey))
  await waitForTransaction(tx, 'Remove favorite entry failed')
  return loadFavoriteEntriesStore(profileId, subject)
}
