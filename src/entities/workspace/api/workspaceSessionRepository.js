import { indexedDbAdapter } from '../../../shared/storage/adapters'

export function saveProgressRecord(profileId, subject, paperId, data) {
  return indexedDbAdapter.saveProgressRecord(profileId, subject, paperId, data)
}

export function loadProgressRecord(profileId, subject, paperId) {
  return indexedDbAdapter.loadProgressRecord(profileId, subject, paperId)
}

export function clearProgressRecord(profileId, subject, paperId) {
  return indexedDbAdapter.clearProgressRecord(profileId, subject, paperId)
}

export function saveLastOpenedPaper(profileId, subject, rawText) {
  return indexedDbAdapter.saveLastOpenedPaper(profileId, subject, rawText)
}

export function loadLastOpenedPaper(profileId, subject) {
  return indexedDbAdapter.loadLastOpenedPaper(profileId, subject)
}
