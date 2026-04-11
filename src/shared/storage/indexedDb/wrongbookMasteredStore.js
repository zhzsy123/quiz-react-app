import { openDb, requestToPromise, waitForTransaction } from './db'

function wrongbookMasteredId(profileId, subject, questionKey) {
  return `${profileId}:${subject}:${questionKey}`
}

async function listWrongbookMasteredRecords(profileId, subject) {
  const db = await openDb()
  const tx = db.transaction('wrongbook_mastered', 'readonly')
  const store = tx.objectStore('wrongbook_mastered')
  const index = store.index('by_profile_subject')
  return (await requestToPromise(index.getAll([profileId, subject]))) || []
}

export async function listWrongbookMasteredRecordsForProfileStore(profileId) {
  const db = await openDb()
  const tx = db.transaction('wrongbook_mastered', 'readonly')
  const store = tx.objectStore('wrongbook_mastered')
  const records = (await requestToPromise(store.getAll())) || []
  return records.filter((record) => record?.profileId === profileId)
}

export async function loadWrongbookMasteredMap(profileId, subject) {
  const records = await listWrongbookMasteredRecords(profileId, subject)
  return records.reduce((map, record) => {
    map[record.questionKey] = record.masteredAt
    return map
  }, {})
}

export async function replaceWrongbookMasteredMap(profileId, subject, value = {}) {
  const records = await listWrongbookMasteredRecords(profileId, subject)
  const db = await openDb()
  const tx = db.transaction('wrongbook_mastered', 'readwrite')
  const store = tx.objectStore('wrongbook_mastered')

  records.forEach((record) => {
    store.delete(record.id)
  })

  Object.entries(value || {}).forEach(([questionKey, masteredAt]) => {
    if (!questionKey) return
    store.put({
      id: wrongbookMasteredId(profileId, subject, questionKey),
      profileId,
      subject,
      questionKey,
      schemaVersion: 1,
      masteredAt: Number(masteredAt) || Date.now(),
      updatedAt: Date.now(),
    })
  })

  await waitForTransaction(tx, 'Replace wrongbook mastered map failed')
  return loadWrongbookMasteredMap(profileId, subject)
}

export async function markWrongbookQuestionMastered(profileId, subject, questionKey, masteredAt = Date.now()) {
  const db = await openDb()
  const tx = db.transaction('wrongbook_mastered', 'readwrite')
  tx.objectStore('wrongbook_mastered').put({
    id: wrongbookMasteredId(profileId, subject, questionKey),
    profileId,
    subject,
    questionKey,
    schemaVersion: 1,
    masteredAt: Number(masteredAt) || Date.now(),
    updatedAt: Date.now(),
  })
  await waitForTransaction(tx, 'Mark wrongbook question mastered failed')
  return loadWrongbookMasteredMap(profileId, subject)
}
