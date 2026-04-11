import { listMetaRecordsByPrefix } from '../../indexedDb/metaStore'
import { saveLastOpenedPaper } from '../../indexedDb/documentCacheStore'

const LAST_PAPER_PREFIX = 'last-paper:'

function parseProfileSubjectKey(key) {
  const suffix = String(key || '').slice(LAST_PAPER_PREFIX.length)
  const separatorIndex = suffix.indexOf(':')
  if (separatorIndex <= 0) {
    return { profileId: '', subject: '' }
  }

  return {
    profileId: suffix.slice(0, separatorIndex),
    subject: suffix.slice(separatorIndex + 1),
  }
}

export async function migrateLastPaperToDocumentCache() {
  const records = await listMetaRecordsByPrefix(LAST_PAPER_PREFIX)
  let migratedCount = 0

  for (const record of records) {
    const { profileId, subject } = parseProfileSubjectKey(record?.key)
    const rawText = typeof record?.rawText === 'string' ? record.rawText : null
    if (!profileId || !subject || rawText == null) continue

    await saveLastOpenedPaper(profileId, subject, rawText)
    migratedCount += 1
  }

  return {
    recordCount: records.length,
    migratedCount,
    migratedAt: new Date().toISOString(),
  }
}
