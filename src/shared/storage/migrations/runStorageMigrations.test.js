import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMigrationRecordMock = vi.fn(async () => null)
const markMigrationStartedMock = vi.fn(async () => undefined)
const markMigrationCompletedMock = vi.fn(async () => undefined)
const markMigrationFailedMock = vi.fn(async () => undefined)
const migrationRunMock = vi.fn(async () => ({ ok: true }))

vi.mock('../indexedDb/migrationsStore', () => ({
  getMigrationRecord: (...args) => getMigrationRecordMock(...args),
  markMigrationStarted: (...args) => markMigrationStartedMock(...args),
  markMigrationCompleted: (...args) => markMigrationCompletedMock(...args),
  markMigrationFailed: (...args) => markMigrationFailedMock(...args),
}))

vi.mock('./migrationRegistry', () => ({
  migrationRegistry: [
    {
      id: 'v3-meta-to-dedicated-stores',
      run: (...args) => migrationRunMock(...args),
    },
  ],
}))

describe('runStorageMigrations', () => {
  beforeEach(() => {
    getMigrationRecordMock.mockReset()
    markMigrationStartedMock.mockReset()
    markMigrationCompletedMock.mockReset()
    markMigrationFailedMock.mockReset()
    migrationRunMock.mockReset()
    migrationRunMock.mockResolvedValue({ ok: true })
  })

  it('runs incomplete migrations and records completion', async () => {
    const { runStorageMigrations } = await import('./runStorageMigrations')

    await runStorageMigrations()

    expect(markMigrationStartedMock).toHaveBeenCalledWith('v3-meta-to-dedicated-stores')
    expect(migrationRunMock).toHaveBeenCalledTimes(1)
    expect(markMigrationCompletedMock).toHaveBeenCalledWith('v3-meta-to-dedicated-stores', { ok: true })
  })
})
