import { indexedDbAdapter } from '../../../shared/storage/adapters'

export function listLibraryEntriesBySubject(profileId, subject) {
  return indexedDbAdapter.listLibraryEntries(profileId, subject)
}

export function saveLibraryEntry(entry) {
  return indexedDbAdapter.upsertLibraryEntry(entry)
}

export function updateLibraryEntry(entryId, patch) {
  return indexedDbAdapter.updateLibraryEntry(entryId, patch)
}

export function removeLibraryEntry(entryId) {
  return indexedDbAdapter.deleteLibraryEntry(entryId)
}

export const listLibraryEntries = listLibraryEntriesBySubject
export const upsertLibraryEntry = saveLibraryEntry
export const deleteLibraryEntry = removeLibraryEntry
