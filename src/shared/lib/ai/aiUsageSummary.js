function sumBy(records = [], selector) {
  return records.reduce((total, record) => total + (Number(selector(record)) || 0), 0)
}

export function buildAiUsageSummary(records = []) {
  const totalCalls = records.length
  const successCalls = records.filter((record) => record.status === 'completed').length
  const failedCalls = totalCalls - successCalls

  return {
    totalCalls,
    successCalls,
    failedCalls,
    successRate: totalCalls ? Math.round((successCalls / totalCalls) * 100) : 0,
    promptTokens: sumBy(records, (record) => record.usage?.promptTokens),
    completionTokens: sumBy(records, (record) => record.usage?.completionTokens),
    totalTokens: sumBy(records, (record) => record.usage?.totalTokens),
    reasoningTokens: sumBy(records, (record) => record.usage?.reasoningTokens),
    promptCacheHitTokens: sumBy(records, (record) => record.usage?.promptCacheHitTokens),
    promptCacheMissTokens: sumBy(records, (record) => record.usage?.promptCacheMissTokens),
    totalUsd: sumBy(records, (record) => record.pricing?.totalUsd),
    totalCny: sumBy(records, (record) => record.pricing?.totalCny),
  }
}
