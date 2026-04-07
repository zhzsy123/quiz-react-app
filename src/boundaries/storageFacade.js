import {
  createProfile,
  ensureDefaultProfile,
  listProfiles,
  renameProfile,
  upsertLibraryEntry,
  listLibraryEntries,
  updateLibraryEntry,
  deleteLibraryEntry,
  saveProgressRecord,
  loadProgressRecord,
  clearProgressRecord,
  saveLastOpenedPaper,
  loadLastOpenedPaper,
  saveAttemptRecord,
  listAttempts,
  updateAttemptRecord,
  deleteAttemptRecord,
  loadMasteredWrongMap,
  markWrongQuestionMastered,
  loadWrongBookEntries,
  upsertWrongBookEntries,
  removeWrongBookEntry,
  loadFavoriteEntries,
  toggleFavoriteEntry,
  removeFavoriteEntry,
} from '../services/storage/indexedDb'

const ACTIVE_PROFILE_KEY = 'vorin:activeProfileId'

function readStorage(key, fallback = null) {
  try {
    const value = localStorage.getItem(key)
    return value === null ? fallback : value
  } catch {
    return fallback
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function getActiveProfileId() {
  return readStorage(ACTIVE_PROFILE_KEY, null)
}

export function setActiveProfileId(profileId) {
  return writeStorage(ACTIVE_PROFILE_KEY, profileId)
}

export function loadPreference(key, fallback = null) {
  return readStorage(key, fallback)
}

export function savePreference(key, value) {
  return writeStorage(key, String(value))
}

export {
  listProfiles,
  createProfile,
  renameProfile,
  ensureDefaultProfile,
  upsertLibraryEntry,
  listLibraryEntries,
  updateLibraryEntry,
  deleteLibraryEntry,
  saveProgressRecord,
  loadProgressRecord,
  clearProgressRecord,
  saveLastOpenedPaper,
  loadLastOpenedPaper,
  saveAttemptRecord,
  listAttempts,
  updateAttemptRecord,
  deleteAttemptRecord,
  loadMasteredWrongMap,
  markWrongQuestionMastered,
  loadWrongBookEntries,
  upsertWrongBookEntries,
  removeWrongBookEntry,
  loadFavoriteEntries,
  toggleFavoriteEntry,
  removeFavoriteEntry,
}
