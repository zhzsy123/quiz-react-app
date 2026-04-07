import { indexedDbAdapter } from '../../../shared/storage/adapters'
import { SUBJECT_REGISTRY } from '../../subject/model/subjects'

export function listWrongBookEntriesBySubject(profileId, subject) {
  return indexedDbAdapter.loadWrongBookEntries(profileId, subject)
}

export async function listAllWrongBookEntries(profileId) {
  const groups = await Promise.all(
    SUBJECT_REGISTRY.map((subject) => indexedDbAdapter.loadWrongBookEntries(profileId, subject.key))
  )
  return groups.flat().sort((a, b) => (b.lastWrongAt || 0) - (a.lastWrongAt || 0))
}

export function upsertWrongBookEntries(profileId, subject, entries) {
  return indexedDbAdapter.upsertWrongBookEntries(profileId, subject, entries)
}

export function removeWrongBookEntry(profileId, subject, questionKey) {
  return indexedDbAdapter.removeWrongBookEntry(profileId, subject, questionKey)
}

export function removeWrongBookEntries(profileId, subject, questionKeys = []) {
  return indexedDbAdapter.removeWrongBookEntries(profileId, subject, questionKeys)
}

export function loadMasteredWrongMap(profileId, subject) {
  return indexedDbAdapter.loadMasteredWrongMap(profileId, subject)
}

export function markWrongQuestionMastered(profileId, subject, questionKey, masteredAt) {
  return indexedDbAdapter.markWrongQuestionMastered(profileId, subject, questionKey, masteredAt)
}

export const loadWrongBookEntries = listWrongBookEntriesBySubject
