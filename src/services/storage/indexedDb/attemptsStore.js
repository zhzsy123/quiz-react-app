import { generateId, openDb, requestToPromise } from './db'

export async function saveAttemptRecord(record) {
  const now = record.submittedAt || Date.now()
  const entry = {
    id: generateId('attempt'),
    ...record,
    submittedAt: now,
    createdAt: now,
  }

  const db = await openDb()
  const tx = db.transaction('attempts', 'readwrite')
  tx.objectStore('attempts').put(entry)
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Save attempt failed'))
  })
  return entry
}

export async function listAttempts(profileId, subject) {
  const db = await openDb()
  const tx = db.transaction('attempts', 'readonly')
  const records = (await requestToPromise(tx.objectStore('attempts').getAll())) || []
  return records
    .filter((item) => item.profileId === profileId && (!subject || item.subject === subject))
    .sort((a, b) => b.submittedAt - a.submittedAt)
}

export async function updateAttemptRecord(attemptId, patch) {
  const db = await openDb()
  const tx = db.transaction('attempts', 'readwrite')
  const store = tx.objectStore('attempts')
  const existing = await requestToPromise(store.get(attemptId))
  if (!existing) return null

  const next = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  }

  if (typeof next.customTitle === 'string') {
    next.customTitle = next.customTitle.trim()
  }

  if (typeof next.notes === 'string') {
    next.notes = next.notes.trim()
  }

  if (!Array.isArray(next.tags)) {
    next.tags = existing.tags || []
  }

  store.put(next)
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Update attempt failed'))
  })
  return next
}

export async function deleteAttemptRecord(attemptId) {
  const db = await openDb()
  const tx = db.transaction('attempts', 'readwrite')
  tx.objectStore('attempts').delete(attemptId)
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Delete attempt failed'))
  })
}
