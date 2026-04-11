import {
  loadFavoriteEntriesStore,
  removeFavoriteEntryStore,
  toggleFavoriteEntryStore,
} from '../indexedDb'

export async function loadFavoriteEntries(profileId, subject) {
  return loadFavoriteEntriesStore(profileId, subject)
}

export async function toggleFavoriteEntry(profileId, subject, entry) {
  return toggleFavoriteEntryStore(profileId, subject, entry)
}

export async function removeFavoriteEntry(profileId, subject, questionKey) {
  return removeFavoriteEntryStore(profileId, subject, questionKey)
}
