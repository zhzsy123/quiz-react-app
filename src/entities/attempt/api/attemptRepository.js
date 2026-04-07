import { indexedDbAdapter } from '../../../shared/storage/adapters'

export function listAttemptsByProfile(profileId, subject) {
  return indexedDbAdapter.listAttempts(profileId, subject)
}

export function createAttempt(record) {
  return indexedDbAdapter.saveAttemptRecord(record)
}

export function updateAttempt(attemptId, patch) {
  return indexedDbAdapter.updateAttemptRecord(attemptId, patch)
}

export function removeAttempt(attemptId) {
  return indexedDbAdapter.deleteAttemptRecord(attemptId)
}

export const saveAttemptRecord = createAttempt
export const listAttempts = listAttemptsByProfile
export const updateAttemptRecord = updateAttempt
export const deleteAttemptRecord = removeAttempt
