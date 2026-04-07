import { openDb, requestToPromise, waitForTransaction } from './db'

function libraryId(profileId, subject, paperId) {
  return `library:${profileId}:${subject}:${paperId}`
}

export async function upsertLibraryEntry({
  profileId,
  subject,
  paperId,
  title,
  rawText,
  tags = [],
  schemaVersion = 'unknown',
  questionCount = 0,
}) {
  const now = Date.now()
  const id = libraryId(profileId, subject, paperId)
  const db = await openDb()
  const tx = db.transaction('libraries', 'readwrite')
  const store = tx.objectStore('libraries')
  const existing = await requestToPromise(store.get(id))

  const next = {
    id,
    profileId,
    subject,
    paperId,
    title: (title || '未命名题库').trim() || '未命名题库',
    rawText,
    tags,
    schemaVersion,
    questionCount,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }

  store.put(next)
  await waitForTransaction(tx, 'Save library entry failed')
  return next
}

export async function listLibraryEntries(profileId, subject) {
  const db = await openDb()
  const tx = db.transaction('libraries', 'readonly')
  const store = tx.objectStore('libraries')
  const records = (await requestToPromise(store.getAll())) || []
  return records
    .filter((item) => item.profileId === profileId && (!subject || item.subject === subject))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function updateLibraryEntry(entryId, patch) {
  const db = await openDb()
  const tx = db.transaction('libraries', 'readwrite')
  const store = tx.objectStore('libraries')
  const existing = await requestToPromise(store.get(entryId))
  if (!existing) return null

  const next = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  }

  if (typeof next.title === 'string') {
    next.title = next.title.trim() || existing.title
  }

  if (!Array.isArray(next.tags)) {
    next.tags = existing.tags || []
  }

  store.put(next)
  await waitForTransaction(tx, 'Update library entry failed')
  return next
}

export async function deleteLibraryEntry(entryId) {
  const db = await openDb()
  const tx = db.transaction('libraries', 'readwrite')
  tx.objectStore('libraries').delete(entryId)
  await waitForTransaction(tx, 'Delete library entry failed')
}
