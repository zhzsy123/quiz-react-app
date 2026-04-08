import { openDb, requestToPromise, waitForTransaction } from './db'

export function buildScopedMetaKey(scope, profileId, subject) {
  return `${scope}:${profileId}:${subject}`
}

export function cloneMetaValue(value) {
  return JSON.parse(JSON.stringify(value))
}

export async function getMetaRecord(key) {
  const db = await openDb()
  const tx = db.transaction('meta', 'readonly')
  return requestToPromise(tx.objectStore('meta').get(key))
}

export async function putMetaRecord(key, payload) {
  const db = await openDb()
  const tx = db.transaction('meta', 'readwrite')
  tx.objectStore('meta').put({
    key,
    updatedAt: Date.now(),
    ...payload,
  })
  await waitForTransaction(tx, 'Save meta failed')
}

export async function loadMetaValue(key, fallback = {}) {
  const result = await getMetaRecord(key)
  return result?.value || fallback
}

export async function saveMetaValue(key, value) {
  await putMetaRecord(key, { value })
  return value
}
