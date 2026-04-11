import {
  loadWrongbookEntriesStore,
  loadWrongbookMasteredMap,
  markWrongbookQuestionMastered,
  mergeWrongbookEntriesStore,
  removeWrongbookEntriesStore,
  removeWrongbookEntryStore,
} from '../indexedDb'

export async function loadMasteredWrongMap(profileId, subject) {
  return loadWrongbookMasteredMap(profileId, subject)
}

export async function markWrongQuestionMastered(profileId, subject, questionKey, masteredAt = Date.now()) {
  return markWrongbookQuestionMastered(profileId, subject, questionKey, masteredAt)
}

export async function loadWrongBookEntries(profileId, subject) {
  return loadWrongbookEntriesStore(profileId, subject)
}

export async function upsertWrongBookEntries(profileId, subject, entries) {
  return mergeWrongbookEntriesStore(profileId, subject, entries)
}

export async function removeWrongBookEntry(profileId, subject, questionKey) {
  return removeWrongbookEntryStore(profileId, subject, questionKey)
}

export async function removeWrongBookEntries(profileId, subject, questionKeys = []) {
  return removeWrongbookEntriesStore(profileId, subject, questionKeys)
}
