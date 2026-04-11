import { browserStorageAdapter, indexedDbAdapter } from '../../../shared/storage/adapters'

const ACTIVE_PROFILE_KEY = 'vorin:activeProfileId'

export function getActiveProfileId() {
  return browserStorageAdapter.getItem(ACTIVE_PROFILE_KEY, null)
}

export function setActiveProfileId(profileId) {
  browserStorageAdapter.setItem(ACTIVE_PROFILE_KEY, profileId)
  void indexedDbAdapter.saveSettingValue('active_profile', profileId)
  return true
}

export async function loadActiveProfileId() {
  const storedActiveProfileId = await indexedDbAdapter.loadActiveProfileId()
  if (storedActiveProfileId) {
    browserStorageAdapter.setItem(ACTIVE_PROFILE_KEY, storedActiveProfileId)
    return storedActiveProfileId
  }
  return browserStorageAdapter.getItem(ACTIVE_PROFILE_KEY, null)
}

export function listProfiles() {
  return indexedDbAdapter.listProfiles()
}

export function createProfile(name) {
  return indexedDbAdapter.createProfile(name)
}

export function renameProfile(profileId, name) {
  return indexedDbAdapter.renameProfile(profileId, name)
}

export function ensureDefaultProfile() {
  return indexedDbAdapter.ensureDefaultProfile()
}
