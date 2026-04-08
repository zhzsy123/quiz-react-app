import { beforeEach, describe, expect, it, vi } from 'vitest'

const progressEntries = new Map()

vi.mock('./db', () => ({
  openDb: vi.fn(async () => ({
    transaction: () => ({
      objectStore: () => ({
        put(entry) {
          progressEntries.set(entry.id, entry)
        },
        get(id) {
          return { result: progressEntries.get(id) || null }
        },
        delete(id) {
          progressEntries.delete(id)
        },
      }),
    }),
  })),
  requestToPromise: vi.fn(async (request) => request.result),
  waitForTransaction: vi.fn(async () => undefined),
}))

import { loadProgressRecord, saveProgressRecord } from './progressStore'

function createProgressPayload() {
  return {
    answers: {
      comp_1: {
        q1: 'A',
      },
    },
    revealedMap: {
      'comp_1:q1': true,
    },
    submitted: false,
    score: 0,
    attemptId: '',
    aiReview: null,
    aiExplainMap: {},
    currentIndex: 0,
    timerSecondsRemaining: 600,
    isPaused: false,
    practiceWritesWrongBook: true,
    examWritesWrongBook: true,
    mode: 'practice',
    title: 'Composite quiz',
    itemsSnapshot: [
      {
        id: 'comp_1',
        type: 'composite',
        prompt: 'Read the transaction schedule and answer the questions.',
        material_title: 'Transaction Schedule',
        material: 'T1: read(A); T2: write(A);',
        material_format: 'sql',
        presentation: 'code',
        deliverable_type: 'transaction_analysis',
        tags: ['transaction'],
        assets: [{ type: 'text', value: 'schedule' }],
        questions: [
          {
            id: 'q1',
            type: 'single_choice',
            prompt: 'Is the schedule conflict-serializable?',
            options: [{ key: 'A', text: 'Yes' }],
            answer: { type: 'objective', correct: 'A' },
          },
        ],
      },
    ],
  }
}

describe('progressStore composite persistence compatibility', () => {
  beforeEach(() => {
    progressEntries.clear()
  })

  it('persists progress with itemsSnapshot so composite parent context can be restored', async () => {
    await saveProgressRecord('profile-1', 'database', 'paper-1', createProgressPayload())

    const loaded = await loadProgressRecord('profile-1', 'database', 'paper-1')

    expect(loaded.itemsSnapshot[0].questions[0].questionKey).toBe('comp_1:q1')
    expect(loaded.itemsSnapshot[0].questions[0].composite_context).toEqual(
      expect.objectContaining({
        composite_id: 'comp_1',
        material_title: 'Transaction Schedule',
        material_format: 'sql',
      })
    )
    expect(loaded.answers.comp_1.q1).toBe('A')
    expect(loaded.revealedMap['comp_1:q1']).toBe(true)
  })
})
