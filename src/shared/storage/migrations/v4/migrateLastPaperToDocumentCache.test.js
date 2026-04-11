import { beforeEach, describe, expect, it, vi } from 'vitest'

const listMetaRecordsByPrefixMock = vi.fn(async () => [])
const saveLastOpenedPaperMock = vi.fn(async () => null)

vi.mock('../../indexedDb/metaStore', () => ({
  listMetaRecordsByPrefix: (...args) => listMetaRecordsByPrefixMock(...args),
}))

vi.mock('../../indexedDb/documentCacheStore', () => ({
  saveLastOpenedPaper: (...args) => saveLastOpenedPaperMock(...args),
}))

import { migrateLastPaperToDocumentCache } from './migrateLastPaperToDocumentCache'

describe('migrateLastPaperToDocumentCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listMetaRecordsByPrefixMock.mockResolvedValue([])
    saveLastOpenedPaperMock.mockResolvedValue(null)
  })

  it('moves last-paper records into document cache store', async () => {
    listMetaRecordsByPrefixMock.mockResolvedValue([
      {
        key: 'last-paper:profile-1:english',
        rawText: 'draft text',
      },
      {
        key: 'last-paper:profile-2:database',
        rawText: 'db draft',
      },
    ])

    const result = await migrateLastPaperToDocumentCache()

    expect(saveLastOpenedPaperMock).toHaveBeenCalledTimes(2)
    expect(saveLastOpenedPaperMock).toHaveBeenNthCalledWith(1, 'profile-1', 'english', 'draft text')
    expect(saveLastOpenedPaperMock).toHaveBeenNthCalledWith(2, 'profile-2', 'database', 'db draft')
    expect(result.recordCount).toBe(2)
    expect(result.migratedCount).toBe(2)
  })
})
