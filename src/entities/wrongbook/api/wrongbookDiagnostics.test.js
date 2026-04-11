import FDBFactory from 'fake-indexeddb/lib/FDBFactory'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  markWrongbookQuestionMastered,
  mergeWrongbookEntriesStore,
} from '../../../shared/storage/indexedDb'
import { exportWrongbookDiagnostics, inspectWrongbookEntry } from './wrongbookDiagnostics'

describe('wrongbookDiagnostics', () => {
  beforeEach(() => {
    globalThis.indexedDB = new FDBFactory()
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
    expect(result.reasons).toContain('prompt 不是文本')
    expect(result.reasons).toContain('paperTitle 不是文本')
  })

  it('exports wrongbook diagnostics from dedicated stores', async () => {
    await mergeWrongbookEntriesStore('profile-1', 'english', [
      {
        questionKey: 'q1',
        subject: 'english',
        prompt: { text: '对象题干' },
        wrongTimes: 'oops',
      },
    ])
    await markWrongbookQuestionMastered('profile-1', 'english', 'q1', 123)

    const result = await exportWrongbookDiagnostics('profile-1')

    expect(result.summary.entryRecordCount).toBe(1)
    expect(result.summary.masteredRecordCount).toBe(1)
    expect(result.summary.entryCount).toBe(1)
    expect(result.summary.suspectCount).toBe(1)
    expect(result.suspectEntries[0].questionKey).toBe('q1')
    expect(result.suspectEntries[0].reasons).toContain('prompt 不是文本')
  })
})
