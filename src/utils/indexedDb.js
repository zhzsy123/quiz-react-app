const DB_NAME = 'vorin-local-exam-db'
const DB_VERSION = 1
const ACTIVE_PROFILE_KEY = 'vorin:activeProfileId'

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles', { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains('libraries')) {
        db.createObjectStore('libraries', { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains('attempts')) {
        db.createObjectStore('attempts', { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains('progress')) {
        db.createObjectStore('progress', { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
      }
    }

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

function generateId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function getActiveProfileId() {
  try {
    return localStorage.getItem(ACTIVE_PROFILE_KEY)
  } catch {
    return null
  }
}

export function setActiveProfileId(profileId) {
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId)
  } catch {
    // ignore storage errors
  }
}

export async function listProfiles() {
  const db = await openDb()
  const tx = db.transaction('profiles', 'readonly')
  const store = tx.objectStore('profiles')
  const records = (await requestToPromise(store.getAll())) || []
  return records.sort((a, b) => a.createdAt - b.createdAt)
}

export async function createProfile(name) {
  const now = Date.now()
  const trimmed = (name || '').trim()
  const profile = {
    id: generateId('profile'),
    name: trimmed || `用户 ${new Date(now).toLocaleDateString()}`,
    createdAt: now,
    updatedAt: now,
  }

  const db = await openDb()
  const tx = db.transaction('profiles', 'readwrite')
  tx.objectStore('profiles').put(profile)
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Create profile failed'))
  })
  return profile
}

export async function renameProfile(profileId, name) {
  const db = await openDb()
  const tx = db.transaction('profiles', 'readwrite')
  const store = tx.objectStore('profiles')
  const existing = await requestToPromise(store.get(profileId))
  if (!existing) return null

  const next = {
    ...existing,
    name: (name || existing.name).trim() || existing.name,
    updatedAt: Date.now(),
  }

  store.put(next)
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Rename profile failed'))
  })
  return next
}

export async function ensureDefaultProfile() {
  const profiles = await listProfiles()
  if (profiles.length > 0) return profiles[0]
  return createProfile('默认用户')
}

function libraryId(profileId, subject, paperId) {
  return `library:${profileId}:${subject}:${paperId}`
}

function progressId(profileId, subject, paperId) {
  return `progress:${profileId}:${subject}:${paperId}`
}

function lastPaperKey(profileId, subject) {
  return `last-paper:${profileId}:${subject}`
}

export async function upsertLibraryEntry({
  profileId,
  subject,
  paperId,
  title,
  rawText,
  tags = [],
  schemaVersion = 'unknown',
  questionCount = 0,
}) {
  const now = Date.now()
  const id = libraryId(profileId, subject, paperId)
  const db = await openDb()
  const tx = db.transaction('libraries', 'readwrite')
  const store = tx.objectStore('libraries')
  const existing = await requestToPromise(store.get(id))

  const next = {
    id,
    profileId,
    subject,
    paperId,
    title: (title || '未命名题库').trim() || '未命名题库',
    rawText,
    tags,
    schemaVersion,
    questionCount,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }

  store.put(next)
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Save library entry failed'))
  })
  return next
}

export async function listLibraryEntries(profileId, subject) {
  const db = await openDb()
  const tx = db.transaction('libraries', 'readonly')
  const store = tx.objectStore('libraries')
  const records = (await requestToPromise(store.getAll())) || []
  return records
    .filter((item) => item.profileId === profileId && item.subject === subject)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function updateLibraryEntry(entryId, patch) {
  const db = await openDb()
  const tx = db.transaction('libraries', 'readwrite')
  const store = tx.objectStore('libraries')
  const existing = await requestToPromise(store.get(entryId))
  if (!existing) return null

  const next = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  }

  if (typeof next.title === 'string') {
    next.title = next.title.trim() || existing.title
  }

  if (!Array.isArray(next.tags)) {
    next.tags = existing.tags || []
  }

  store.put(next)
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Update library entry failed'))
  })
  return next
}

export async function deleteLibraryEntry(entryId) {
  const db = await openDb()
  const tx = db.transaction('libraries', 'readwrite')
  tx.objectStore('libraries').delete(entryId)
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Delete library entry failed'))
  })
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

export async function saveLastOpenedPaper(profileId, subject, rawText) {
  const db = await openDb()
  const tx = db.transaction('meta', 'readwrite')
  tx.objectStore('meta').put({
    key: lastPaperKey(profileId, subject),
    rawText,
    updatedAt: Date.now(),
  })
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Save last paper failed'))
  })
}

export async function loadLastOpenedPaper(profileId, subject) {
  const db = await openDb()
  const tx = db.transaction('meta', 'readonly')
  const result = await requestToPromise(tx.objectStore('meta').get(lastPaperKey(profileId, subject)))
  return result?.rawText || null
}

export async function saveAttemptRecord(record) {
  const now = record.submittedAt || Date.now()
  const entry = {
    id: generateId('attempt'),
    ...record,
    submittedAt: now,
    createdAt: now,
  }

  const db = await openDb()
  const tx = db.transaction('attempts', 'readwrite')
  tx.objectStore('attempts').put(entry)
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Save attempt failed'))
  })
  return entry
}

export async function listAttempts(profileId, subject) {
  const db = await openDb()
  const tx = db.transaction('attempts', 'readonly')
  const records = (await requestToPromise(tx.objectStore('attempts').getAll())) || []
  return records
    .filter((item) => item.profileId === profileId && (!subject || item.subject === subject))
    .sort((a, b) => b.submittedAt - a.submittedAt)
}
