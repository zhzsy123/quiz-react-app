import { ACTIVE_PROFILE_KEY, generateId, openDb, requestToPromise, waitForTransaction } from './db'
import { loadSettingValue, saveSettingValue } from './settingsStore'

const ACTIVE_PROFILE_SETTING_KEY = 'active_profile'

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

  void saveSettingValue(ACTIVE_PROFILE_SETTING_KEY, profileId)
}

export async function loadActiveProfileId() {
  const storedValue = await loadSettingValue(ACTIVE_PROFILE_SETTING_KEY, null)
  const fallbackValue = getActiveProfileId()
  const nextValue = storedValue || fallbackValue || null

  if (nextValue && nextValue !== fallbackValue) {
    setActiveProfileId(nextValue)
  }

  return nextValue
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
  await waitForTransaction(tx, 'Create profile failed')
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
  await waitForTransaction(tx, 'Rename profile failed')
  return next
}

export async function ensureDefaultProfile() {
  const profiles = await listProfiles()
  if (profiles.length > 0) return profiles[0]
  return createProfile('默认用户')
}
