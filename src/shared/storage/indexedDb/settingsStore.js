import { openDb, requestToPromise, waitForTransaction } from './db'

function normalizeSettingRecord(key, value, existing = null) {
  const now = Date.now()
  return {
    key,
    value,
    schemaVersion: 1,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }
}

export async function loadSettingValue(key, fallbackValue = null) {
  const db = await openDb()
  const tx = db.transaction('settings', 'readonly')
  const record = await requestToPromise(tx.objectStore('settings').get(key))
  if (!record || !Object.prototype.hasOwnProperty.call(record, 'value')) {
    return fallbackValue
  }
  return record.value
}

export async function saveSettingValue(key, value) {
  const db = await openDb()
  const tx = db.transaction('settings', 'readwrite')
  const store = tx.objectStore('settings')
  const existing = await requestToPromise(store.get(key))
  store.put(normalizeSettingRecord(key, value, existing))
  await waitForTransaction(tx, 'Save setting failed')
  return value
}

export async function removeSettingValue(key) {
  const db = await openDb()
  const tx = db.transaction('settings', 'readwrite')
  tx.objectStore('settings').delete(key)
  await waitForTransaction(tx, 'Remove setting failed')
}

export async function listSettings() {
  const db = await openDb()
  const tx = db.transaction('settings', 'readonly')
  const records = (await requestToPromise(tx.objectStore('settings').getAll())) || []
  return records.sort((left, right) => Number(left.updatedAt || 0) - Number(right.updatedAt || 0))
}
