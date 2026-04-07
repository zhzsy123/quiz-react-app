import { openDb, requestToPromise, waitForTransaction } from './db'

function lastPaperKey(profileId, subject) {
  return `last-paper:${profileId}:${subject}`
}

function wrongBookMasteredKey(profileId, subject) {
  return `wrongbook-mastered:${profileId}:${subject}`
}

function favoritesKey(profileId, subject) {
  return `favorites:${profileId}:${subject}`
}

function wrongBookEntriesKey(profileId, subject) {
  return `wrongbook-entries:${profileId}:${subject}`
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

async function getMetaRecord(key) {
  const db = await openDb()
  const tx = db.transaction('meta', 'readonly')
  return requestToPromise(tx.objectStore('meta').get(key))
}

async function putMetaRecord(key, payload) {
  const db = await openDb()
  const tx = db.transaction('meta', 'readwrite')
  tx.objectStore('meta').put({
    key,
    updatedAt: Date.now(),
    ...payload,
  })
  await waitForTransaction(tx, 'Save meta failed')
}

export async function saveLastOpenedPaper(profileId, subject, rawText) {
  await putMetaRecord(lastPaperKey(profileId, subject), { rawText })
}

export async function loadLastOpenedPaper(profileId, subject) {
  const result = await getMetaRecord(lastPaperKey(profileId, subject))
  return result?.rawText || null
}

export async function loadMasteredWrongMap(profileId, subject) {
  const result = await getMetaRecord(wrongBookMasteredKey(profileId, subject))
  return result?.value || {}
}

export async function markWrongQuestionMastered(profileId, subject, questionKey, masteredAt = Date.now()) {
  const current = await loadMasteredWrongMap(profileId, subject)
  const next = {
    ...current,
    [questionKey]: masteredAt,
  }
  await putMetaRecord(wrongBookMasteredKey(profileId, subject), { value: next })
  return next
}

async function loadFavoriteMap(profileId, subject) {
  const result = await getMetaRecord(favoritesKey(profileId, subject))
  return result?.value || {}
}

async function saveFavoriteMap(profileId, subject, value) {
  await putMetaRecord(favoritesKey(profileId, subject), { value })
  return value
}

async function loadWrongBookEntryMap(profileId, subject) {
  const result = await getMetaRecord(wrongBookEntriesKey(profileId, subject))
  return result?.value || {}
}

async function saveWrongBookEntryMap(profileId, subject, value) {
  await putMetaRecord(wrongBookEntriesKey(profileId, subject), { value })
  return value
}

export async function loadFavoriteEntries(profileId, subject) {
  const map = await loadFavoriteMap(profileId, subject)
  return Object.values(map).sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0))
}

export async function loadWrongBookEntries(profileId, subject) {
  const map = await loadWrongBookEntryMap(profileId, subject)
  return Object.values(map).sort((a, b) => (b.lastWrongAt || 0) - (a.lastWrongAt || 0))
}

export async function upsertWrongBookEntries(profileId, subject, entries) {
  const current = await loadWrongBookEntryMap(profileId, subject)
  const next = { ...current }

  ;(entries || []).forEach((entry) => {
    if (!entry?.questionKey) return

    const cloned = cloneValue(entry)
    const existing = next[cloned.questionKey]
    const wrongTimes = (existing?.wrongTimes || 0) + (cloned.wrongTimes || 1)
    const addedAt = existing?.addedAt || cloned.addedAt || Date.now()
    const lastWrongAt = cloned.lastWrongAt || Date.now()

    next[cloned.questionKey] = {
      ...(existing || {}),
      ...cloned,
      subject: cloned.subject || subject,
      wrongTimes,
      addedAt,
      lastWrongAt,
    }
  })

  const saved = await saveWrongBookEntryMap(profileId, subject, next)
  return Object.values(saved).sort((a, b) => (b.lastWrongAt || 0) - (a.lastWrongAt || 0))
}

export async function removeWrongBookEntry(profileId, subject, questionKey) {
  const current = await loadWrongBookEntryMap(profileId, subject)
  const next = { ...current }
  delete next[questionKey]
  const saved = await saveWrongBookEntryMap(profileId, subject, next)
  return Object.values(saved).sort((a, b) => (b.lastWrongAt || 0) - (a.lastWrongAt || 0))
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
