import {
  buildScopedMetaKey,
  getMetaRecord,
  saveMetaValue,
} from '../../../shared/storage/indexedDb/metaRecordStore'

function favoritesKey(profileId, subject) {
  return buildScopedMetaKey('favorites', profileId, subject)
}

async function loadFavoriteMap(profileId, subject) {
  const result = await getMetaRecord(favoritesKey(profileId, subject))
  return result?.value || {}
}

async function saveFavoriteMap(profileId, subject, value) {
  await saveMetaValue(favoritesKey(profileId, subject), value)
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
  return {
    entries: Object.values(saved).sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0)),
    map: saved,
    isFavorite,
  }
}

export async function removeFavoriteEntry(profileId, subject, questionKey) {
  const map = await loadFavoriteMap(profileId, subject)
  const next = { ...map }
  delete next[questionKey]
  const saved = await saveFavoriteMap(profileId, subject, next)
  return Object.values(saved).sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0))
}
