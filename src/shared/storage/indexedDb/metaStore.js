import { openDb, requestToPromise, waitForTransaction } from './db'

function lastPaperKey(profileId, subject) {
  return `last-paper:${profileId}:${subject}`
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

export async function loadMetaValue(key, fallbackValue = null) {
  const result = await getMetaRecord(key)
  if (!result || !Object.prototype.hasOwnProperty.call(result, 'value')) return fallbackValue
  return result.value
}

export async function saveMetaValue(key, value) {
  await putMetaRecord(key, { value })
  return value
}

export async function saveLastOpenedPaper(profileId, subject, rawText) {
  await putMetaRecord(lastPaperKey(profileId, subject), { rawText })
}

export async function loadLastOpenedPaper(profileId, subject) {
  const result = await getMetaRecord(lastPaperKey(profileId, subject))
  return result?.rawText || null
}