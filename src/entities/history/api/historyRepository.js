import { indexedDbAdapter } from '../../../shared/storage/adapters'

export function listHistoryEntries(profileId, subject) {
  return indexedDbAdapter.listAttempts(profileId, subject)
}

export function createHistoryEntry(record) {
  return indexedDbAdapter.saveAttemptRecord(record)
}

export function updateHistoryEntry(historyId, patch) {
  return indexedDbAdapter.updateAttemptRecord(historyId, patch)
}

export function removeHistoryEntry(historyId) {
  return indexedDbAdapter.deleteAttemptRecord(historyId)
}

export const listAttempts = listHistoryEntries
export const saveAttemptRecord = createHistoryEntry
export const updateAttemptRecord = updateHistoryEntry
export const deleteAttemptRecord = removeHistoryEntry
