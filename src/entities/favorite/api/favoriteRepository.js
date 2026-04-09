import { SUBJECT_REGISTRY } from '../../subject/model/subjects'
import {
  loadFavoriteEntries as loadFavoriteEntriesFromStore,
  removeFavoriteEntry as removeFavoriteEntryFromStore,
  toggleFavoriteEntry as toggleFavoriteEntryInStore,
} from '../../../shared/storage/adapters/favoriteAdapter'

export function listFavoriteEntriesBySubject(profileId, subject) {
  return loadFavoriteEntriesFromStore(profileId, subject)
}

export async function listAllFavoriteEntries(profileId) {
  const groups = await Promise.all(
    SUBJECT_REGISTRY.map((subject) => loadFavoriteEntriesFromStore(profileId, subject.key))
  )
  return groups.flat().sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0))
}

export function toggleFavoriteEntry(profileId, subject, entry) {
  return toggleFavoriteEntryInStore(profileId, subject, entry)
}

export function removeFavoriteEntry(profileId, subject, questionKey) {
  return removeFavoriteEntryFromStore(profileId, subject, questionKey)
}

export const loadFavoriteEntries = listFavoriteEntriesBySubject
