import { indexedDbAdapter } from '../../storage/adapters'

export function createAiUsageRecord(record) {
  return indexedDbAdapter.saveAiUsageRecord(record)
}

export function listAiUsageHistory(profileId, options) {
  return indexedDbAdapter.listAiUsageRecords(profileId, options)
}

export function clearAiUsageHistory(profileId) {
  return indexedDbAdapter.clearAiUsageRecords(profileId)
}
