import { beforeEach, describe, expect, it, vi } from 'vitest'

const records = new Map()

vi.mock('./db', () => ({
  generateId: vi.fn(() => 'ai_usage_fixed'),
  openDb: vi.fn(async () => ({
    transaction: () => ({
      objectStore: () => ({
        put(entry) {
          records.set(entry.id, entry)
        },
        getAll() {
          return { result: Array.from(records.values()) }
        },
        delete(id) {
          records.delete(id)
        },
      }),
    }),
  })),
  requestToPromise: vi.fn(async (request) => request.result),
  waitForTransaction: vi.fn(async () => undefined),
}))

import { clearAiUsageRecords, listAiUsageRecords, saveAiUsageRecord } from './aiUsageStore'

describe('aiUsageStore', () => {
  beforeEach(() => {
    records.clear()
  })

  it('saves and lists ai usage records by profile', async () => {
    await saveAiUsageRecord({
      profileId: 'profile-1',
      feature: 'question_generation',
      usage: { totalTokens: 123 },
      pricing: { totalCny: 0.12 },
    })

    await saveAiUsageRecord({
      id: 'ai_usage_2',
      profileId: 'profile-2',
      feature: 'question_explanation',
      usage: { totalTokens: 456 },
      pricing: { totalCny: 0.34 },
    })

    const result = await listAiUsageRecords('profile-1')

    expect(result).toHaveLength(1)
    expect(result[0].feature).toBe('question_generation')
    expect(result[0].usage.totalTokens).toBe(123)
  })

  it('clears records for one profile only', async () => {
    await saveAiUsageRecord({ profileId: 'profile-1' })
    await saveAiUsageRecord({ id: 'ai_usage_2', profileId: 'profile-2' })

    const removed = await clearAiUsageRecords('profile-1')

    expect(removed).toBe(1)
    const remaining = await listAiUsageRecords('profile-2')
    expect(remaining).toHaveLength(1)
  })
})
