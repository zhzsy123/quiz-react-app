import { beforeEach, describe, expect, it } from 'vitest'
import FDBFactory from 'fake-indexeddb/lib/FDBFactory'

import { openDb, requestToPromise, waitForTransaction } from '../indexedDb/db'
import { exportLocalBackup, importLocalBackup, LOCAL_BACKUP_STORE_NAMES } from './localBackup'

async function seedStore(storeName, entries) {
  const db = await openDb()
  const tx = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)
  entries.forEach((entry) => store.put(entry))
  await waitForTransaction(tx)
}

async function listStore(storeName) {
  const db = await openDb()
  const tx = db.transaction(storeName, 'readonly')
  return (await requestToPromise(tx.objectStore(storeName).getAll())) || []
}

describe('localBackup', () => {
  beforeEach(() => {
    globalThis.indexedDB = new FDBFactory()
  })

  it('exports all core stores into one backup payload', async () => {
    await seedStore('profiles', [{ id: 'profile-1', name: 'Vorin', createdAt: 1, updatedAt: 1 }])
    await seedStore('settings', [{ key: 'active_profile', value: 'profile-1', schemaVersion: 1, createdAt: 1, updatedAt: 1 }])
    await seedStore('attempts', [{ id: 'attempt-1', profileId: 'profile-1', subject: 'english', submittedAt: 1 }])
    await seedStore('wrongbook_entries', [{ id: 'profile-1:english:q1', profileId: 'profile-1', subject: 'english', questionKey: 'q1', lastWrongAt: 1 }])

    const backup = await exportLocalBackup()

    expect(backup.schemaVersion).toBe(1)
    expect(Object.keys(backup.stores)).toEqual(LOCAL_BACKUP_STORE_NAMES)
    expect(backup.stores.profiles).toHaveLength(1)
    expect(backup.stores.attempts).toHaveLength(1)
    expect(backup.stores.wrongbook_entries).toHaveLength(1)
  })

  it('imports backup payload by replacing provided stores', async () => {
    await seedStore('profiles', [{ id: 'old-profile', name: 'Old', createdAt: 1, updatedAt: 1 }])
    await seedStore('attempts', [{ id: 'old-attempt', profileId: 'old-profile', subject: 'english', submittedAt: 1 }])

    const payload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      dbName: 'vorin-local-exam-db',
      dbVersion: 4,
      stores: {
        profiles: [{ id: 'profile-1', name: 'Vorin', createdAt: 2, updatedAt: 2 }],
        attempts: [{ id: 'attempt-1', profileId: 'profile-1', subject: 'database', submittedAt: 2 }],
        wrongbook_entries: [
          { id: 'profile-1:database:q1', profileId: 'profile-1', subject: 'database', questionKey: 'q1', lastWrongAt: 2 },
        ],
      },
    }

    const summary = await importLocalBackup(payload)

    expect(summary.importedStoreCount).toBe(3)
    expect(summary.importedRecordCount).toBe(3)
    await expect(listStore('profiles')).resolves.toEqual(payload.stores.profiles)
    await expect(listStore('attempts')).resolves.toEqual(payload.stores.attempts)
    await expect(listStore('wrongbook_entries')).resolves.toEqual(payload.stores.wrongbook_entries)
  })
})
