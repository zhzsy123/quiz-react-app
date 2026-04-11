import { openDb, requestToPromise, waitForTransaction } from './db'

function normalizeMigrationRecord(id, patch = {}, existing = null) {
  const now = Date.now()
  return {
    id,
    status: patch.status || existing?.status || 'pending',
    schemaVersion: 1,
    startedAt: patch.startedAt ?? existing?.startedAt ?? null,
    completedAt: patch.completedAt ?? existing?.completedAt ?? null,
    details: patch.details ?? existing?.details ?? null,
    errorMessage: patch.errorMessage ?? existing?.errorMessage ?? '',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }
}

export async function getMigrationRecord(id) {
  const db = await openDb()
  const tx = db.transaction('migrations', 'readonly')
  return requestToPromise(tx.objectStore('migrations').get(id))
}

export async function listMigrationRecords() {
  const db = await openDb()
  const tx = db.transaction('migrations', 'readonly')
  const records = (await requestToPromise(tx.objectStore('migrations').getAll())) || []
  return records.sort((left, right) => Number(left.updatedAt || 0) - Number(right.updatedAt || 0))
}

export async function saveMigrationRecord(id, patch = {}) {
  const db = await openDb()
  const tx = db.transaction('migrations', 'readwrite')
  const store = tx.objectStore('migrations')
  const existing = await requestToPromise(store.get(id))
  const next = normalizeMigrationRecord(id, patch, existing)
  store.put(next)
  await waitForTransaction(tx, 'Save migration record failed')
  return next
}

export async function markMigrationStarted(id, details = null) {
  return saveMigrationRecord(id, {
    status: 'running',
    startedAt: Date.now(),
    completedAt: null,
    details,
    errorMessage: '',
  })
}

export async function markMigrationCompleted(id, details = null) {
  return saveMigrationRecord(id, {
    status: 'completed',
    completedAt: Date.now(),
    details,
    errorMessage: '',
  })
}

export async function markMigrationFailed(id, errorMessage = '', details = null) {
  return saveMigrationRecord(id, {
    status: 'failed',
    completedAt: Date.now(),
    details,
    errorMessage: String(errorMessage || ''),
  })
}
