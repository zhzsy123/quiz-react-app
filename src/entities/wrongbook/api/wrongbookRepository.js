import { SUBJECT_REGISTRY } from '../../subject/model/subjects'
import {
  loadMasteredWrongMap as loadMasteredWrongMapFromStore,
  loadWrongBookEntries as loadWrongBookEntriesFromStore,
  markWrongQuestionMastered as markWrongQuestionMasteredInStore,
  removeWrongBookEntries as removeWrongBookEntriesFromStore,
  removeWrongBookEntry as removeWrongBookEntryFromStore,
  upsertWrongBookEntries as upsertWrongBookEntriesInStore,
} from './wrongbookStore'

export function listWrongbookEntriesBySubject(profileId, subject) {
  return loadWrongBookEntriesFromStore(profileId, subject)
}

export async function listAllWrongbookEntries(profileId) {
  const groups = await Promise.all(
    SUBJECT_REGISTRY.map((subject) => loadWrongBookEntriesFromStore(profileId, subject.key))
  )
  return groups.flat().sort((a, b) => (b.lastWrongAt || 0) - (a.lastWrongAt || 0))
}

export function upsertWrongbookEntries(profileId, subject, entries) {
  return upsertWrongBookEntriesInStore(profileId, subject, entries)
}

export function removeWrongbookEntry(profileId, subject, questionKey) {
  return removeWrongBookEntryFromStore(profileId, subject, questionKey)
}

export function removeWrongbookEntries(profileId, subject, questionKeys = []) {
  return removeWrongBookEntriesFromStore(profileId, subject, questionKeys)
}

export function loadMasteredWrongMap(profileId, subject) {
  return loadMasteredWrongMapFromStore(profileId, subject)
}

export function markWrongQuestionMastered(profileId, subject, questionKey, masteredAt) {
  return markWrongQuestionMasteredInStore(profileId, subject, questionKey, masteredAt)
}

export const loadWrongBookEntries = listWrongbookEntriesBySubject
export const listAllWrongBookEntries = listAllWrongbookEntries
export const upsertWrongBookEntries = upsertWrongbookEntries
export const removeWrongBookEntry = removeWrongbookEntry
export const removeWrongBookEntries = removeWrongbookEntries