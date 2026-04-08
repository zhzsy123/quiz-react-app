import { beforeEach, describe, expect, it, vi } from 'vitest'

const attempts = new Map()

vi.mock('./db', () => ({
  generateId: vi.fn(() => 'attempt_fixed'),
  openDb: vi.fn(async () => ({
    transaction: () => {
      const tx = {
        objectStore: () => ({
          put(entry) {
            attempts.set(entry.id, entry)
          },
          get(id) {
            return { result: attempts.get(id) || null }
          },
        }),
      }
      return tx
    },
  })),
  requestToPromise: vi.fn(async (request) => request.result),
  waitForTransaction: vi.fn(async () => undefined),
}))

import { saveAttemptRecord, updateAttemptRecord } from './attemptsStore'

function createAttemptRecord() {
  return {
    profileId: 'profile-1',
    subject: 'database',
    paperId: 'paper-1',
    submittedAt: 123,
    answersSnapshot: {
      plain_q1: 'A',
      comp_1: {
        q1: 'A',
        q2: { text: 'No cycle in precedence graph.' },
      },
    },
    itemsSnapshot: [
      {
        id: 'plain_q1',
        type: 'single_choice',
        prompt: 'Legacy question',
        options: [{ key: 'A', text: 'One' }],
        answer: { type: 'objective', correct: 'A' },
      },
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

describe('attemptsStore composite persistence compatibility', () => {
  beforeEach(() => {
    attempts.clear()
  })

  it('saves attempts with decorated composite child snapshots while preserving plain items', async () => {
    const saved = await saveAttemptRecord(createAttemptRecord())

    expect(saved.id).toBe('attempt_fixed')
    expect(saved.itemsSnapshot[0].id).toBe('plain_q1')
    expect(saved.itemsSnapshot[1].questions[0].questionKey).toBe('comp_1:q1')
    expect(saved.itemsSnapshot[1].questions[0].composite_context).toEqual(
      expect.objectContaining({
        composite_id: 'comp_1',
        material_format: 'sql',
        presentation: 'code',
      })
    )
  })

  it('updates attempts using the same canonical composite child questionKey rule', async () => {
    await saveAttemptRecord(createAttemptRecord())

    const updated = await updateAttemptRecord('attempt_fixed', {
      itemsSnapshot: createAttemptRecord().itemsSnapshot,
      answersSnapshot: createAttemptRecord().answersSnapshot,
    })

    expect(updated.itemsSnapshot[1].questions[0].questionKey).toBe('comp_1:q1')
    expect(updated.itemsSnapshot[1].questions[0].composite_context).toEqual(
      expect.objectContaining({
        composite_id: 'comp_1',
        composite_prompt: 'Read the transaction schedule and answer the questions.',
      })
    )
  })
})
