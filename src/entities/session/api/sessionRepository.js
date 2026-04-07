import { indexedDbAdapter } from '../../../shared/storage/adapters'

export function saveSessionProgress(profileId, subject, paperId, data) {
  return indexedDbAdapter.saveProgressRecord(profileId, subject, paperId, data)
}

export function loadSessionProgress(profileId, subject, paperId) {
  return indexedDbAdapter.loadProgressRecord(profileId, subject, paperId)
}

export function clearSessionProgress(profileId, subject, paperId) {
  return indexedDbAdapter.clearProgressRecord(profileId, subject, paperId)
}

export function saveLastOpenedPaper(profileId, subject, rawText) {
  return indexedDbAdapter.saveLastOpenedPaper(profileId, subject, rawText)
}

export function loadLastOpenedPaper(profileId, subject) {
  return indexedDbAdapter.loadLastOpenedPaper(profileId, subject)
}

export const saveProgressRecord = saveSessionProgress
export const loadProgressRecord = loadSessionProgress
export const clearProgressRecord = clearSessionProgress
