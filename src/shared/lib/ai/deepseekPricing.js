import { getPreference, setPreference } from '../preferences/preferenceRepository'

const USD_CNY_RATE_KEY = 'ai:usdCnyRate'
const DEFAULT_USD_CNY_RATE = 7.2

export const DEEPSEEK_PRICING_EFFECTIVE_DATE = '2026-04-09'

export const DEEPSEEK_MODEL_PRICING = {
  'deepseek-chat': {
    label: 'DeepSeek Chat',
    inputCacheHitUsdPer1M: 0.028,
    inputCacheMissUsdPer1M: 0.28,
    outputUsdPer1M: 0.42,
  },
  'deepseek-reasoner': {
    label: 'DeepSeek Reasoner',
    inputCacheHitUsdPer1M: 0.028,
    inputCacheMissUsdPer1M: 0.28,
    outputUsdPer1M: 0.42,
  },
}

export function getUsdCnyRate() {
  const configured = Number(getPreference(USD_CNY_RATE_KEY, DEFAULT_USD_CNY_RATE))
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_USD_CNY_RATE
}

export function updateUsdCnyRate(nextRate) {
  const numeric = Number(nextRate)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error('美元兑人民币汇率必须是大于 0 的数字。')
  }
  setPreference(USD_CNY_RATE_KEY, numeric)
  return numeric
}

export function getDeepSeekPricingProfile(model = 'deepseek-reasoner') {
  return DEEPSEEK_MODEL_PRICING[model] || DEEPSEEK_MODEL_PRICING['deepseek-reasoner']
}

export function calculateDeepSeekCost({
  model = 'deepseek-reasoner',
  promptTokens = 0,
  completionTokens = 0,
  promptCacheHitTokens = 0,
  promptCacheMissTokens = 0,
  usdCnyRate = getUsdCnyRate(),
} = {}) {
  const pricing = getDeepSeekPricingProfile(model)
  const safePromptTokens = Number(promptTokens) || 0
  const safeCompletionTokens = Number(completionTokens) || 0
  const cacheHitTokens = Number(promptCacheHitTokens) || 0
  const cacheMissTokens =
    Number(promptCacheMissTokens) ||
    Math.max(0, safePromptTokens - cacheHitTokens)

  const inputCacheHitUsd = (cacheHitTokens / 1_000_000) * pricing.inputCacheHitUsdPer1M
  const inputCacheMissUsd = (cacheMissTokens / 1_000_000) * pricing.inputCacheMissUsdPer1M
  const outputUsd = (safeCompletionTokens / 1_000_000) * pricing.outputUsdPer1M
  const totalUsd = inputCacheHitUsd + inputCacheMissUsd + outputUsd
  const totalCny = totalUsd * usdCnyRate

  return {
    usdCnyRate,
    inputCacheHitUsd,
    inputCacheMissUsd,
    outputUsd,
    totalUsd,
    totalCny,
  }
}

export function formatCurrencyCny(amount = 0) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(Number(amount) || 0)
}

export function formatCurrencyUsd(amount = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  }).format(Number(amount) || 0)
}
