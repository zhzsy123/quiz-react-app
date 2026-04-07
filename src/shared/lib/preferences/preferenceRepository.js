import { browserStorageAdapter } from '../../storage/adapters'

export function getPreference(key, fallback = null) {
  return browserStorageAdapter.getItem(key, fallback)
}

export function setPreference(key, value) {
  return browserStorageAdapter.setItem(key, value)
}

export function removePreference(key) {
  return browserStorageAdapter.removeItem(key)
}

export const loadPreference = getPreference
export const savePreference = setPreference
