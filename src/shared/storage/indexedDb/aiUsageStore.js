import { generateId, openDb, requestToPromise, waitForTransaction } from './db'

function normalizeUsageRecord(record = {}) {
  return {
    id: record.id || generateId('ai_usage'),
    profileId: record.profileId || 'default',
    provider: record.provider || 'deepseek',
    feature: record.feature || 'general',
    status: record.status || 'completed',
    model: record.model || '',
    subject: record.subject || '',
    mode: record.mode || 'json',
    title: record.title || '',
    startedAt: Number(record.startedAt) || Date.now(),
    endedAt: Number(record.endedAt) || Date.now(),
    errorMessage: record.errorMessage || '',
    request: {
      temperature: Number(record.request?.temperature) || 0,
      responseFormat: record.request?.responseFormat || '',
      stream: Boolean(record.request?.stream),
      promptChars: Number(record.request?.promptChars) || 0,
      userPromptChars: Number(record.request?.userPromptChars) || 0,
      systemPromptChars: Number(record.request?.systemPromptChars) || 0,
    },
    usage: {
      promptTokens: Number(record.usage?.promptTokens) || 0,
      completionTokens: Number(record.usage?.completionTokens) || 0,
      totalTokens: Number(record.usage?.totalTokens) || 0,
      promptCacheHitTokens: Number(record.usage?.promptCacheHitTokens) || 0,
      promptCacheMissTokens: Number(record.usage?.promptCacheMissTokens) || 0,
      reasoningTokens: Number(record.usage?.reasoningTokens) || 0,
    },
    pricing: {
      usdCnyRate: Number(record.pricing?.usdCnyRate) || 0,
      inputCacheHitUsd: Number(record.pricing?.inputCacheHitUsd) || 0,
      inputCacheMissUsd: Number(record.pricing?.inputCacheMissUsd) || 0,
      outputUsd: Number(record.pricing?.outputUsd) || 0,
      totalUsd: Number(record.pricing?.totalUsd) || 0,
      totalCny: Number(record.pricing?.totalCny) || 0,
    },
    rawUsage: record.rawUsage || null,
  }
}

export async function saveAiUsageRecord(record) {
  const normalized = normalizeUsageRecord(record)
  const db = await openDb()
  const tx = db.transaction('ai_usage', 'readwrite')
  tx.objectStore('ai_usage').put(normalized)
  await waitForTransaction(tx, 'Save AI usage failed')
  return normalized
}

export async function listAiUsageRecords(profileId, { limit = 200 } = {}) {
  const db = await openDb()
  const tx = db.transaction('ai_usage', 'readonly')
  const result = await requestToPromise(tx.objectStore('ai_usage').getAll())
  return (Array.isArray(result) ? result : [])
    .filter((item) => !profileId || item.profileId === profileId)
    .sort((left, right) => Number(right.startedAt || 0) - Number(left.startedAt || 0))
    .slice(0, limit)
}

export async function clearAiUsageRecords(profileId) {
  const records = await listAiUsageRecords(profileId, { limit: Number.MAX_SAFE_INTEGER })
  if (!records.length) return 0

  const db = await openDb()
  const tx = db.transaction('ai_usage', 'readwrite')
  const store = tx.objectStore('ai_usage')
  records.forEach((record) => {
    store.delete(record.id)
  })
  await waitForTransaction(tx, 'Clear AI usage failed')
  return records.length
}
