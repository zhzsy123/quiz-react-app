import { DB_NAME, DB_VERSION, openDb, requestToPromise, waitForTransaction } from '../indexedDb/db'

export const LOCAL_BACKUP_SCHEMA_VERSION = 1

export const LOCAL_BACKUP_STORE_NAMES = [
  'profiles',
  'settings',
  'libraries',
  'attempts',
  'progress',
  'ai_usage',
  'document_cache',
  'wrongbook_entries',
  'wrongbook_mastered',
  'favorites',
  'generation_signatures',
]

function normalizeStorePayloadArray(value) {
  return Array.isArray(value) ? value : []
}

function buildBackupMetadata() {
  return {
    schemaVersion: LOCAL_BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    dbName: DB_NAME,
    dbVersion: DB_VERSION,
    stores: {},
  }
}

export async function exportLocalBackup() {
  const backup = buildBackupMetadata()
  const db = await openDb()
  const tx = db.transaction(LOCAL_BACKUP_STORE_NAMES, 'readonly')

  const requests = Object.fromEntries(
    LOCAL_BACKUP_STORE_NAMES.map((storeName) => [storeName, requestToPromise(tx.objectStore(storeName).getAll())])
  )

  for (const storeName of LOCAL_BACKUP_STORE_NAMES) {
    backup.stores[storeName] = normalizeStorePayloadArray(await requests[storeName])
  }

  return backup
}

function validateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('备份文件格式无效。')
  }

  if (Number(payload.schemaVersion) !== LOCAL_BACKUP_SCHEMA_VERSION) {
    throw new Error('备份文件版本不受支持。')
  }

  if (!payload.stores || typeof payload.stores !== 'object') {
    throw new Error('备份文件缺少 stores。')
  }
}

export async function importLocalBackup(payload) {
  validateBackupPayload(payload)

  const providedStoreNames = LOCAL_BACKUP_STORE_NAMES.filter((storeName) =>
    Object.prototype.hasOwnProperty.call(payload.stores || {}, storeName)
  )

  if (!providedStoreNames.length) {
    throw new Error('备份文件中没有可导入的数据。')
  }

  const db = await openDb()
  const tx = db.transaction(providedStoreNames, 'readwrite')

  const summary = {
    importedStoreCount: providedStoreNames.length,
    importedRecordCount: 0,
    stores: {},
  }

  for (const storeName of providedStoreNames) {
    const store = tx.objectStore(storeName)
    const entries = normalizeStorePayloadArray(payload.stores?.[storeName])
    store.clear()
    entries.forEach((entry) => {
      store.put(entry)
    })
    summary.stores[storeName] = entries.length
    summary.importedRecordCount += entries.length
  }

  await waitForTransaction(tx, '导入本地记录失败')
  return summary
}
