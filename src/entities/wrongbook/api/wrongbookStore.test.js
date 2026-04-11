import FDBFactory from 'fake-indexeddb/lib/FDBFactory'
import { beforeEach, describe, expect, it } from 'vitest'
import { loadWrongBookEntries, upsertWrongBookEntries } from './wrongbookStore'

describe('wrongbookStore composite compatibility', () => {
  beforeEach(() => {
    globalThis.indexedDB = new FDBFactory()
  })

  it('stores composite wrong items at child-question granularity with canonical composite_context', async () => {
    const saved = await upsertWrongBookEntries('profile-1', 'database', [
      {
        subject: 'database',
        questionId: 'comp_1',
        subQuestionId: 'q1',
        prompt: 'Is the schedule conflict-serializable?',
        wrongTimes: 1,
        composite_context: {
          composite_id: 'comp_1',
          composite_prompt: 'Read the transaction schedule and answer the questions.',
          material_title: 'Transaction Schedule',
          material: 'T1: read(A); T2: write(A);',
          material_format: 'sql',
          presentation: 'code',
          deliverable_type: 'transaction_analysis',
          tags: ['transaction', 'concurrency'],
          assets: [{ type: 'text', value: 'schedule' }],
        },
      },
    ])

    expect(saved[0].questionKey).toBe('comp_1:q1')
    expect(saved[0].composite_context).toEqual(
      expect.objectContaining({
        composite_id: 'comp_1',
        deliverable_type: 'transaction_analysis',
        tags: ['transaction', 'concurrency'],
      })
    )
  })

  it('keeps legacy plain-question entries compatible alongside composite child entries', async () => {
    await upsertWrongBookEntries('profile-1', 'database', [
      {
        subject: 'database',
        questionKey: 'plain_q1',
        prompt: 'Legacy wrong question',
        wrongTimes: 1,
      },
      {
        subject: 'database',
        questionId: 'comp_1',
        subQuestionId: 'q2',
        prompt: 'Explain why.',
        wrongTimes: 1,
        composite_context: {
          composite_id: 'comp_1',
          composite_prompt: 'Read the transaction schedule and answer the questions.',
          material_title: 'Transaction Schedule',
          material: 'T1: read(A); T2: write(A);',
          material_format: 'sql',
          presentation: 'code',
          deliverable_type: 'transaction_analysis',
          tags: ['transaction'],
          assets: [],
        },
      },
    ])

    const loaded = await loadWrongBookEntries('profile-1', 'database')
    const questionKeys = loaded.map((entry) => entry.questionKey)

    expect(questionKeys).toContain('plain_q1')
    expect(questionKeys).toContain('comp_1:q2')
  })
})
