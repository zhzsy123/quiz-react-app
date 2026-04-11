import { openDb, requestToPromise, waitForTransaction } from './db'

function generationSignatureId(subject = '', typeKey = '') {
  return `${subject}:${typeKey}`
}

function normalizeSignatureList(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item || '').trim()).filter(Boolean)
}

function normalizeNearSignatureList(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeSignatureList(item))
    .filter((item) => item.length > 0)
}

function normalizeSignatureIndex(value) {
  if (Array.isArray(value)) {
    return {
      exact: normalizeSignatureList(value),
      near: [],
    }
  }

  if (!value || typeof value !== 'object') {
    return { exact: [], near: [] }
  }

  return {
    exact: normalizeSignatureList(value.exact),
    near: normalizeNearSignatureList(value.near),
  }
}

export async function loadGenerationSignatureIndexStore(subject = '', typeKey = '') {
  const db = await openDb()
  const tx = db.transaction('generation_signatures', 'readonly')
  const record = await requestToPromise(tx.objectStore('generation_signatures').get(generationSignatureId(subject, typeKey)))
  return normalizeSignatureIndex(record?.value)
}

export async function saveGenerationSignatureIndexStore(subject = '', typeKey = '', value = {}) {
  const normalized = normalizeSignatureIndex(value)
  const db = await openDb()
  const tx = db.transaction('generation_signatures', 'readwrite')
  const store = tx.objectStore('generation_signatures')
  const existing = await requestToPromise(store.get(generationSignatureId(subject, typeKey)))
  store.put({
    id: generationSignatureId(subject, typeKey),
    subject,
    typeKey,
    schemaVersion: 1,
    value: normalized,
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now(),
  })
  await waitForTransaction(tx, 'Save generation signatures failed')
  return normalized
}
