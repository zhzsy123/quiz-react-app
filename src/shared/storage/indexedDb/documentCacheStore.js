import { openDb, requestToPromise, waitForTransaction } from './db'

function lastOpenedPaperCacheId(profileId, subject) {
  return `${profileId}:${subject}:last_opened_paper`
}

export async function saveLastOpenedPaper(profileId, subject, rawText) {
  const db = await openDb()
  const tx = db.transaction('document_cache', 'readwrite')
  const store = tx.objectStore('document_cache')
  const id = lastOpenedPaperCacheId(profileId, subject)
  const existing = await requestToPromise(store.get(id))

  store.put({
    id,
    profileId,
    subject,
    type: 'last_opened_paper',
    rawText: typeof rawText === 'string' ? rawText : '',
    schemaVersion: 1,
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now(),
  })

  await waitForTransaction(tx, 'Save last opened paper cache failed')
  return rawText
}

export async function loadLastOpenedPaper(profileId, subject) {
  const db = await openDb()
  const tx = db.transaction('document_cache', 'readonly')
  const store = tx.objectStore('document_cache')
  const record = await requestToPromise(store.get(lastOpenedPaperCacheId(profileId, subject)))
  return typeof record?.rawText === 'string' ? record.rawText : null
}
