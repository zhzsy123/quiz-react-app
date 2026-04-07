import { browserStorageAdapter, indexedDbAdapter } from '../../../shared/storage/adapters'

const ACTIVE_PROFILE_KEY = 'vorin:activeProfileId'

export function getActiveProfileId() {
  return browserStorageAdapter.getItem(ACTIVE_PROFILE_KEY, null)
}

export function setActiveProfileId(profileId) {
  return browserStorageAdapter.setItem(ACTIVE_PROFILE_KEY, profileId)
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
