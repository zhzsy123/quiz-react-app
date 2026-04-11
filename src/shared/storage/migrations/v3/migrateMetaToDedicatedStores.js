import { ACTIVE_PROFILE_KEY } from '../../indexedDb/db'
import {
  listMetaRecordsByPrefix,
  loadMetaValue,
} from '../../indexedDb/metaStore'
import { replaceFavoriteEntriesStore } from '../../indexedDb/favoritesStore'
import { saveGenerationSignatureIndexStore } from '../../indexedDb/generationSignaturesStore'
import { saveSettingValue } from '../../indexedDb/settingsStore'
import { replaceWrongbookEntriesStore } from '../../indexedDb/wrongbookEntriesStore'
import { replaceWrongbookMasteredMap } from '../../indexedDb/wrongbookMasteredStore'

function parseProfileSubjectKey(prefix, key) {
  const suffix = String(key || '').slice(prefix.length)
  const separatorIndex = suffix.indexOf(':')
  if (separatorIndex <= 0) {
    return { profileId: '', subject: '' }
  }

  return {
    profileId: suffix.slice(0, separatorIndex),
    subject: suffix.slice(separatorIndex + 1),
  }
}

function parseGenerationSignatureKey(key) {
  const suffix = String(key || '').slice('generation-signatures:'.length)
  const separatorIndex = suffix.indexOf(':')
  if (separatorIndex <= 0) {
    return { subject: '', typeKey: '' }
  }

  return {
    subject: suffix.slice(0, separatorIndex),
    typeKey: suffix.slice(separatorIndex + 1),
  }
}

function normalizeObjectMap(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

async function migrateActiveProfileSetting() {
  try {
    const activeProfileId = localStorage.getItem(ACTIVE_PROFILE_KEY)
    if (activeProfileId) {
      await saveSettingValue('active_profile', activeProfileId)
      return { migrated: true, activeProfileId }
    }
  } catch {
    // ignore localStorage errors during migration
  }

  return { migrated: false, activeProfileId: null }
}

async function migrateWrongbookEntries() {
  const prefix = 'wrongbook-entries:'
  const records = await listMetaRecordsByPrefix(prefix)
  let migratedCount = 0

  for (const record of records) {
    const { profileId, subject } = parseProfileSubjectKey(prefix, record?.key)
    if (!profileId || !subject) continue

    const entries = Object.values(normalizeObjectMap(record?.value)).filter((entry) => entry && typeof entry === 'object')
    if (!entries.length) continue

    await replaceWrongbookEntriesStore(profileId, subject, entries)
    migratedCount += entries.length
  }

  return { recordCount: records.length, entryCount: migratedCount }
}

async function migrateWrongbookMastered() {
  const prefix = 'wrongbook-mastered:'
  const records = await listMetaRecordsByPrefix(prefix)
  let migratedCount = 0

  for (const record of records) {
    const { profileId, subject } = parseProfileSubjectKey(prefix, record?.key)
    if (!profileId || !subject) continue

    const masteredMap = normalizeObjectMap(record?.value)
    const keys = Object.keys(masteredMap)
    if (!keys.length) continue

    await replaceWrongbookMasteredMap(profileId, subject, masteredMap)
    migratedCount += keys.length
  }

  return { recordCount: records.length, entryCount: migratedCount }
}

async function migrateFavorites() {
  const prefix = 'favorites:'
  const records = await listMetaRecordsByPrefix(prefix)
  let migratedCount = 0

  for (const record of records) {
    const { profileId, subject } = parseProfileSubjectKey(prefix, record?.key)
    if (!profileId || !subject) continue

    const entries = Object.values(normalizeObjectMap(record?.value)).filter((entry) => entry && typeof entry === 'object')
    if (!entries.length) continue

    await replaceFavoriteEntriesStore(profileId, subject, entries)
    migratedCount += entries.length
  }

  return { recordCount: records.length, entryCount: migratedCount }
}

async function migrateGenerationSignatures() {
  const prefix = 'generation-signatures:'
  const records = await listMetaRecordsByPrefix(prefix)
  let migratedCount = 0

  for (const record of records) {
    const { subject, typeKey } = parseGenerationSignatureKey(record?.key)
    if (!subject || !typeKey) continue

    const value = await loadMetaValue(record.key, { exact: [], near: [] })
    await saveGenerationSignatureIndexStore(subject, typeKey, value)
    migratedCount += 1
  }

  return { recordCount: records.length, entryCount: migratedCount }
}

export async function migrateMetaToDedicatedStores() {
  const [
    activeProfile,
    wrongbookEntries,
    wrongbookMastered,
    favorites,
    generationSignatures,
  ] = await Promise.all([
    migrateActiveProfileSetting(),
    migrateWrongbookEntries(),
    migrateWrongbookMastered(),
    migrateFavorites(),
    migrateGenerationSignatures(),
  ])

  return {
    activeProfile,
    wrongbookEntries,
    wrongbookMastered,
    favorites,
    generationSignatures,
    migratedAt: new Date().toISOString(),
  }
}
