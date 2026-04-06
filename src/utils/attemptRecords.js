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
