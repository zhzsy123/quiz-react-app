import { openDb, requestToPromise, waitForTransaction } from './db'

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

export async function listMetaRecordsByPrefix(prefix) {
  const db = await openDb()
  const tx = db.transaction('meta', 'readonly')
  const store = tx.objectStore('meta')

  return new Promise((resolve, reject) => {
    const records = []
    const request = store.openCursor()

    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) {
        resolve(records)
        return
      }

      const record = cursor.value
      if (String(record?.key || '').startsWith(prefix)) {
        records.push(record)
      }
      cursor.continue()
    }

    request.onerror = () => reject(request.error || new Error('IndexedDB list meta failed'))
  })
}
