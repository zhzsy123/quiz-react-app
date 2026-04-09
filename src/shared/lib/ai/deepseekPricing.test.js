import { describe, expect, it } from 'vitest'
import { calculateDeepSeekCost } from './deepseekPricing'

describe('deepseekPricing', () => {
  it('calculates cost with cache hit and miss tokens', () => {
    const result = calculateDeepSeekCost({
      model: 'deepseek-reasoner',
      promptTokens: 1000,
      completionTokens: 500,
      promptCacheHitTokens: 400,
      promptCacheMissTokens: 600,
      usdCnyRate: 7.2,
    })

    expect(result.totalUsd).toBeGreaterThan(0)
    expect(result.totalCny).toBeCloseTo(result.totalUsd * 7.2, 8)
    expect(result.inputCacheHitUsd).toBeCloseTo((400 / 1_000_000) * 0.028, 12)
    expect(result.inputCacheMissUsd).toBeCloseTo((600 / 1_000_000) * 0.28, 12)
    expect(result.outputUsd).toBeCloseTo((500 / 1_000_000) * 0.42, 12)
  })
})
