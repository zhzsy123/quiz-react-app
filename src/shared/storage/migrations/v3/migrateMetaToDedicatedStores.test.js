import { beforeEach, describe, expect, it, vi } from 'vitest'

const listMetaRecordsByPrefixMock = vi.fn(async () => [])
const loadMetaValueMock = vi.fn(async (_key, fallbackValue = null) => fallbackValue)
const saveSettingValueMock = vi.fn(async () => undefined)
const replaceWrongbookEntriesStoreMock = vi.fn(async () => [])
const replaceWrongbookMasteredMapMock = vi.fn(async () => ({}))
const replaceFavoriteEntriesStoreMock = vi.fn(async () => [])
const saveGenerationSignatureIndexStoreMock = vi.fn(async () => ({ exact: [], near: [] }))

vi.mock('../../indexedDb/metaStore', () => ({
  listMetaRecordsByPrefix: (...args) => listMetaRecordsByPrefixMock(...args),
  loadMetaValue: (...args) => loadMetaValueMock(...args),
}))

vi.mock('../../indexedDb/settingsStore', () => ({
  saveSettingValue: (...args) => saveSettingValueMock(...args),
}))

vi.mock('../../indexedDb/wrongbookEntriesStore', () => ({
  replaceWrongbookEntriesStore: (...args) => replaceWrongbookEntriesStoreMock(...args),
}))

vi.mock('../../indexedDb/wrongbookMasteredStore', () => ({
  replaceWrongbookMasteredMap: (...args) => replaceWrongbookMasteredMapMock(...args),
}))

vi.mock('../../indexedDb/favoritesStore', () => ({
  replaceFavoriteEntriesStore: (...args) => replaceFavoriteEntriesStoreMock(...args),
}))

vi.mock('../../indexedDb/generationSignaturesStore', () => ({
  saveGenerationSignatureIndexStore: (...args) => saveGenerationSignatureIndexStoreMock(...args),
}))

import { migrateMetaToDedicatedStores } from './migrateMetaToDedicatedStores'

describe('migrateMetaToDedicatedStores', () => {
  beforeEach(() => {
    listMetaRecordsByPrefixMock.mockReset()
    loadMetaValueMock.mockReset()
    saveSettingValueMock.mockReset()
    replaceWrongbookEntriesStoreMock.mockReset()
    replaceWrongbookMasteredMapMock.mockReset()
    replaceFavoriteEntriesStoreMock.mockReset()
    saveGenerationSignatureIndexStoreMock.mockReset()

    listMetaRecordsByPrefixMock.mockImplementation(async (prefix) => {
      if (prefix === 'wrongbook-entries:') {
        return [
          {
            key: 'wrongbook-entries:profile-1:database',
            value: {
              q1: { questionKey: 'q1', prompt: 'Q1' },
            },
          },
        ]
      }

      if (prefix === 'wrongbook-mastered:') {
        return [
          {
            key: 'wrongbook-mastered:profile-1:database',
            value: { q1: 123456 },
          },
        ]
      }

      if (prefix === 'favorites:') {
        return [
          {
            key: 'favorites:profile-1:database',
            value: {
              q1: { questionKey: 'q1', prompt: 'Q1', favoritedAt: 99 },
            },
          },
        ]
      }

      if (prefix === 'generation-signatures:') {
        return [
          {
            key: 'generation-signatures:database:single_choice',
            value: { exact: ['sig_1'], near: [['db', 'ddl']] },
          },
        ]
      }

      return []
    })

    loadMetaValueMock.mockImplementation(async (key, fallbackValue = null) => {
      if (key === 'generation-signatures:database:single_choice') {
        return { exact: ['sig_1'], near: [['db', 'ddl']] }
      }
      return fallbackValue
    })

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key) => (key === 'vorin:activeProfileId' ? 'profile-1' : null)),
      },
    })
  })

  it('moves legacy meta payloads into dedicated stores', async () => {
    const details = await migrateMetaToDedicatedStores()

    expect(saveSettingValueMock).toHaveBeenCalledWith('active_profile', 'profile-1')
    expect(replaceWrongbookEntriesStoreMock).toHaveBeenCalledWith('profile-1', 'database', [
      { questionKey: 'q1', prompt: 'Q1' },
    ])
    expect(replaceWrongbookMasteredMapMock).toHaveBeenCalledWith('profile-1', 'database', { q1: 123456 })
    expect(replaceFavoriteEntriesStoreMock).toHaveBeenCalledWith('profile-1', 'database', [
      { questionKey: 'q1', prompt: 'Q1', favoritedAt: 99 },
    ])
    expect(saveGenerationSignatureIndexStoreMock).toHaveBeenCalledWith('database', 'single_choice', {
      exact: ['sig_1'],
      near: [['db', 'ddl']],
    })
    expect(details.wrongbookEntries.entryCount).toBe(1)
    expect(details.favorites.entryCount).toBe(1)
  })
})
