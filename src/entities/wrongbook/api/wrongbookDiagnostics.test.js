import { beforeEach, describe, expect, it, vi } from 'vitest'

const listMetaRecordsByPrefixMock = vi.fn(async () => [])

vi.mock('../../../shared/storage/indexedDb/metaStore', () => ({
  listMetaRecordsByPrefix: (...args) => listMetaRecordsByPrefixMock(...args),
}))

import { exportWrongbookDiagnostics, inspectWrongbookEntry } from './wrongbookDiagnostics'

describe('wrongbookDiagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listMetaRecordsByPrefixMock.mockResolvedValue([])
  })

  it('flags render-risk object fields inside wrongbook entries', () => {
    const result = inspectWrongbookEntry(
      {
        questionKey: 'q1',
        prompt: { text: '对象题干' },
        paperTitle: { text: '对象试卷' },
      },
      { subject: 'english' }
    )

    expect(result.riskLevel).toBe('medium')
    expect(result.reasons).toContain('prompt 不是可直接渲染的文本')
    expect(result.reasons).toContain('paperTitle 不是文本')
  })

  it('exports real wrongbook meta diagnostics grouped by profile prefix', async () => {
    listMetaRecordsByPrefixMock
      .mockResolvedValueOnce([
        {
          key: 'wrongbook-entries:profile-1:english',
          updatedAt: 1,
          value: {
            q1: {
              questionKey: 'q1',
              prompt: { text: '对象题干' },
              wrongTimes: 'oops',
            },
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          key: 'wrongbook-mastered:profile-1:english',
          updatedAt: 2,
          value: { q1: 123 },
        },
      ])

    const result = await exportWrongbookDiagnostics('profile-1')

    expect(result.summary.entryRecordCount).toBe(1)
    expect(result.summary.masteredRecordCount).toBe(1)
    expect(result.summary.entryCount).toBe(1)
    expect(result.summary.suspectCount).toBe(1)
    expect(result.suspectEntries[0].questionKey).toBe('q1')
    expect(result.suspectEntries[0].reasons).toContain('prompt 不是可直接渲染的文本')
    expect(result.suspectEntries[0].reasons).toContain('wrongTimes 不是有效数字')
  })
})
