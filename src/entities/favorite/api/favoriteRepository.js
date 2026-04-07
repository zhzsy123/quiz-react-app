import { indexedDbAdapter } from '../../../shared/storage/adapters'
import { SUBJECT_REGISTRY } from '../../subject/model/subjects'

export function listFavoriteEntriesBySubject(profileId, subject) {
  return indexedDbAdapter.loadFavoriteEntries(profileId, subject)
}

export async function listAllFavoriteEntries(profileId) {
  const groups = await Promise.all(
    SUBJECT_REGISTRY.map((subject) => indexedDbAdapter.loadFavoriteEntries(profileId, subject.key))
  )
  return groups.flat().sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0))
}

export function toggleFavoriteEntry(profileId, subject, entry) {
  return indexedDbAdapter.toggleFavoriteEntry(profileId, subject, entry)
}

export function removeFavoriteEntry(profileId, subject, questionKey) {
  return indexedDbAdapter.removeFavoriteEntry(profileId, subject, questionKey)
}

export const loadFavoriteEntries = listFavoriteEntriesBySubject
