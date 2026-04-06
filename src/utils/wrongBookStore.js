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

function wrongBookMasteredKey(profileId, subject) {
  return `wrongbook-mastered:${profileId}:${subject}`
}

export async function loadMasteredWrongMap(profileId, subject) {
  const db = await openDb()
  const tx = db.transaction('meta', 'readonly')
  const result = await requestToPromise(tx.objectStore('meta').get(wrongBookMasteredKey(profileId, subject)))
  return result?.value || {}
}

export async function markWrongQuestionMastered(profileId, subject, questionKey, masteredAt = Date.now()) {
  const current = await loadMasteredWrongMap(profileId, subject)
  const next = {
    ...current,
    [questionKey]: masteredAt,
  }

  const db = await openDb()
  const tx = db.transaction('meta', 'readwrite')
  tx.objectStore('meta').put({
    key: wrongBookMasteredKey(profileId, subject),
    value: next,
    updatedAt: Date.now(),
  })
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Save mastered wrong map failed'))
  })
  return next
}
