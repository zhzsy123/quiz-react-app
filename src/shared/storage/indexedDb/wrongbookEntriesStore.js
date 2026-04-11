import { normalizeWrongbookEntry } from './compositePersistence'
import { openDb, requestToPromise, waitForTransaction } from './db'

function wrongbookEntryId(profileId, subject, questionKey) {
  return `${profileId}:${subject}:${questionKey}`
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeStoredWrongbookEntry(profileId, subject, entry = {}, existing = null) {
  const normalized = normalizeWrongbookEntry(cloneValue(entry))
  const questionKey = String(normalized.questionKey || normalized.questionId || '').trim()
  if (!questionKey) return null

  return {
    ...(existing || {}),
    ...normalized,
    id: wrongbookEntryId(profileId, subject, questionKey),
    profileId,
    subject: normalized.subject || subject,
    questionKey,
    schemaVersion: 1,
    wrongTimes: Number(normalized.wrongTimes) || existing?.wrongTimes || 0,
    addedAt: Number(normalized.addedAt) || existing?.addedAt || Date.now(),
    lastWrongAt: Number(normalized.lastWrongAt) || existing?.lastWrongAt || Date.now(),
  }
}

async function listWrongbookEntryRecords(profileId, subject) {
  const db = await openDb()
  const tx = db.transaction('wrongbook_entries', 'readonly')
  const store = tx.objectStore('wrongbook_entries')
  const index = store.index('by_profile_subject')
  const records = (await requestToPromise(index.getAll([profileId, subject]))) || []
  return records.sort((left, right) => Number(right.lastWrongAt || 0) - Number(left.lastWrongAt || 0))
}

export async function listWrongbookEntryRecordsForProfileStore(profileId) {
  const db = await openDb()
  const tx = db.transaction('wrongbook_entries', 'readonly')
  const store = tx.objectStore('wrongbook_entries')
  const records = (await requestToPromise(store.getAll())) || []
  return records
    .filter((record) => record?.profileId === profileId)
    .sort((left, right) => Number(right.lastWrongAt || 0) - Number(left.lastWrongAt || 0))
}

export async function loadWrongbookEntriesStore(profileId, subject) {
  return listWrongbookEntryRecords(profileId, subject)
}

export async function replaceWrongbookEntriesStore(profileId, subject, entries = []) {
  const db = await openDb()
  const existingEntries = await listWrongbookEntryRecords(profileId, subject)
  const existingMap = new Map(existingEntries.map((entry) => [entry.questionKey, entry]))
  const nextEntries = []

  ;(entries || []).forEach((entry) => {
    const next = normalizeStoredWrongbookEntry(profileId, subject, entry, existingMap.get(entry?.questionKey))
    if (next) {
      nextEntries.push(next)
    }
  })

  const tx = db.transaction('wrongbook_entries', 'readwrite')
  const store = tx.objectStore('wrongbook_entries')

  existingEntries.forEach((entry) => {
    store.delete(entry.id)
  })

  nextEntries.forEach((entry) => {
    store.put(entry)
  })

  await waitForTransaction(tx, 'Replace wrongbook entries failed')
  return nextEntries.sort((left, right) => Number(right.lastWrongAt || 0) - Number(left.lastWrongAt || 0))
}

export async function mergeWrongbookEntriesStore(profileId, subject, entries = []) {
  const existingEntries = await listWrongbookEntryRecords(profileId, subject)
  const existingMap = new Map(existingEntries.map((entry) => [entry.questionKey, entry]))
  const db = await openDb()
  const tx = db.transaction('wrongbook_entries', 'readwrite')
  const store = tx.objectStore('wrongbook_entries')

  ;(entries || []).forEach((entry) => {
    const normalized = normalizeStoredWrongbookEntry(profileId, subject, entry, existingMap.get(entry?.questionKey))
    if (!normalized) return

    const current = existingMap.get(normalized.questionKey)
    const wrongTimes = (current?.wrongTimes || 0) + (normalized.wrongTimes || 1)
    const next = {
      ...normalized,
      wrongTimes,
      addedAt: current?.addedAt || normalized.addedAt || Date.now(),
      lastWrongAt: normalized.lastWrongAt || Date.now(),
    }

    existingMap.set(normalized.questionKey, next)
    store.put(next)
  })

  await waitForTransaction(tx, 'Merge wrongbook entries failed')
  return Array.from(existingMap.values()).sort((left, right) => Number(right.lastWrongAt || 0) - Number(left.lastWrongAt || 0))
}

export async function removeWrongbookEntryStore(profileId, subject, questionKey) {
  const db = await openDb()
  const tx = db.transaction('wrongbook_entries', 'readwrite')
  tx.objectStore('wrongbook_entries').delete(wrongbookEntryId(profileId, subject, questionKey))
  await waitForTransaction(tx, 'Remove wrongbook entry failed')
  return loadWrongbookEntriesStore(profileId, subject)
}

export async function removeWrongbookEntriesStore(profileId, subject, questionKeys = []) {
  const db = await openDb()
  const tx = db.transaction('wrongbook_entries', 'readwrite')
  const store = tx.objectStore('wrongbook_entries')

  ;(questionKeys || []).forEach((questionKey) => {
    store.delete(wrongbookEntryId(profileId, subject, questionKey))
  })

  await waitForTransaction(tx, 'Remove wrongbook entries failed')
  return loadWrongbookEntriesStore(profileId, subject)
}
