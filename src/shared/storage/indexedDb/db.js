export const DB_NAME = 'vorin-local-exam-db'
export const DB_VERSION = 4
export const ACTIVE_PROFILE_KEY = 'vorin:activeProfileId'

function ensureStore(request, db, name, options) {
  if (db.objectStoreNames.contains(name)) {
    return request.transaction.objectStore(name)
  }
  return db.createObjectStore(name, options)
}

function ensureIndex(store, name, keyPath, options) {
  if (!store.indexNames.contains(name)) {
    store.createIndex(name, keyPath, options)
  }
}

export function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      const profilesStore = ensureStore(request, db, 'profiles', { keyPath: 'id' })
      const librariesStore = ensureStore(request, db, 'libraries', { keyPath: 'id' })
      const attemptsStore = ensureStore(request, db, 'attempts', { keyPath: 'id' })
      const progressStore = ensureStore(request, db, 'progress', { keyPath: 'id' })
      ensureStore(request, db, 'meta', { keyPath: 'key' })
      const aiUsageStore = ensureStore(request, db, 'ai_usage', { keyPath: 'id' })
      ensureStore(request, db, 'settings', { keyPath: 'key' })
      const documentCacheStore = ensureStore(request, db, 'document_cache', { keyPath: 'id' })
      const wrongbookEntriesStore = ensureStore(request, db, 'wrongbook_entries', { keyPath: 'id' })
      const wrongbookMasteredStore = ensureStore(request, db, 'wrongbook_mastered', { keyPath: 'id' })
      const favoritesStore = ensureStore(request, db, 'favorites', { keyPath: 'id' })
      const generationSignaturesStore = ensureStore(request, db, 'generation_signatures', { keyPath: 'id' })
      ensureStore(request, db, 'migrations', { keyPath: 'id' })

      ensureIndex(librariesStore, 'by_profile_subject', ['profileId', 'subject'])
      ensureIndex(librariesStore, 'by_profile_updatedAt', ['profileId', 'updatedAt'])

      ensureIndex(attemptsStore, 'by_profile_subject', ['profileId', 'subject'])
      ensureIndex(attemptsStore, 'by_profile_submittedAt', ['profileId', 'submittedAt'])

      ensureIndex(progressStore, 'by_profile_subject', ['profileId', 'subject'])

      ensureIndex(aiUsageStore, 'by_profile_startedAt', ['profileId', 'startedAt'])

      ensureIndex(documentCacheStore, 'by_profile_subject', ['profileId', 'subject'])

      ensureIndex(wrongbookEntriesStore, 'by_profile_subject', ['profileId', 'subject'])
      ensureIndex(wrongbookEntriesStore, 'by_profile_lastWrongAt', ['profileId', 'lastWrongAt'])

      ensureIndex(wrongbookMasteredStore, 'by_profile_subject', ['profileId', 'subject'])

      ensureIndex(favoritesStore, 'by_profile_subject', ['profileId', 'subject'])
      ensureIndex(favoritesStore, 'by_profile_favoritedAt', ['profileId', 'favoritedAt'])

      ensureIndex(generationSignaturesStore, 'by_subject_type', ['subject', 'typeKey'])

      ensureIndex(profilesStore, 'by_createdAt', 'createdAt')
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed'))
  })
}

export function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'))
  })
}

export function waitForTransaction(tx, fallbackMessage = 'IndexedDB transaction failed') {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error(fallbackMessage))
  })
}

export function generateId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}
