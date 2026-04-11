import {
  getMigrationRecord,
  markMigrationCompleted,
  markMigrationFailed,
  markMigrationStarted,
} from '../indexedDb/migrationsStore'
import { migrationRegistry } from './migrationRegistry'

let migrationPromise = null

async function executeStorageMigrations() {
  for (const migration of migrationRegistry) {
    const existingRecord = await getMigrationRecord(migration.id)
    if (existingRecord?.status === 'completed') {
      continue
    }

    await markMigrationStarted(migration.id)

    try {
      const details = await migration.run()
      await markMigrationCompleted(migration.id, details)
    } catch (error) {
      await markMigrationFailed(migration.id, error?.message || 'Storage migration failed')
      throw error
    }
  }
}

export async function runStorageMigrations() {
  if (!migrationPromise) {
    migrationPromise = executeStorageMigrations().catch((error) => {
      migrationPromise = null
      throw error
    })
  }

  return migrationPromise
}
