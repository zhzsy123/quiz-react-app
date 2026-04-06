import { openDb, requestToPromise } from './db'

function progressId(profileId, subject, paperId) {
  return `progress:${profileId}:${subject}:${paperId}`
}

export async function saveProgressRecord(profileId, subject, paperId, data) {
  const db = await openDb()
  const tx = db.transaction('progress', 'readwrite')
  tx.objectStore('progress').put({
    id: progressId(profileId, subject, paperId),
    profileId,
    subject,
    paperId,
    ...data,
  })
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Save progress failed'))
  })
}

export async function loadProgressRecord(profileId, subject, paperId) {
  const db = await openDb()
  const tx = db.transaction('progress', 'readonly')
  return requestToPromise(tx.objectStore('progress').get(progressId(profileId, subject, paperId)))
}

export async function clearProgressRecord(profileId, subject, paperId) {
  const db = await openDb()
  const tx = db.transaction('progress', 'readwrite')
  tx.objectStore('progress').delete(progressId(profileId, subject, paperId))
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Clear progress failed'))
  })
}
