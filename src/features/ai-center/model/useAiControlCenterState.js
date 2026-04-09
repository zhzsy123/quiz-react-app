import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../../app/providers/AppContext'
import { clearAiUsageHistory, listAiUsageHistory } from '../../../shared/lib/ai/aiUsageRepository'
import {
  DEEPSEEK_MODEL_PRICING,
  DEEPSEEK_PRICING_EFFECTIVE_DATE,
  formatCurrencyCny,
  formatCurrencyUsd,
  getDeepSeekPricingProfile,
  getUsdCnyRate,
  updateUsdCnyRate,
} from '../../../shared/lib/ai/deepseekPricing'
import { countDeepSeekTokens } from '../../../shared/lib/ai/deepseekTokenizer'
import { buildAiUsageSummary } from '../../../shared/lib/ai/aiUsageSummary'
import {
  getDeepSeekConfig,
  maskApiKey,
  updateDeepSeekConfig,
} from '../../../shared/api/deepseekClient'

const FEATURE_LABELS = {
  question_generation: 'AI 出题',
  question_explanation: 'AI 解释',
  question_audit: 'AI 核题',
  subjective_grading: '主观题批改',
  similar_question_generation: '同类题生成',
  general: '通用调用',
}

function formatDateTime(timestamp) {
  if (!timestamp) return '--'
  return new Date(timestamp).toLocaleString()
}

export function useAiControlCenterState() {
  const { activeProfile, activeProfileId } = useAppContext()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)
  const [config, setConfig] = useState(() => {
    const current = getDeepSeekConfig()
    return {
      apiKey: current.apiKey,
      baseUrl: current.baseUrl,
      model: current.model,
      usdCnyRate: String(getUsdCnyRate()),
    }
  })
  const [tokenizerText, setTokenizerText] = useState('')
  const [tokenizerState, setTokenizerState] = useState({
    loading: false,
    error: '',
    tokenCount: 0,
  })

  const refreshRecords = useCallback(async () => {
    if (!activeProfileId) {
      setRecords([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const nextRecords = await listAiUsageHistory(activeProfileId, { limit: 200 })
      setRecords(nextRecords)
    } catch (nextError) {
      setError(nextError.message || '加载 AI 记录失败。')
    } finally {
      setLoading(false)
    }
  }, [activeProfileId])

  useEffect(() => {
    void refreshRecords()
  }, [refreshRecords])

  const summary = useMemo(() => buildAiUsageSummary(records), [records])

  const pricingProfile = useMemo(
    () => getDeepSeekPricingProfile(config.model || 'deepseek-reasoner'),
    [config.model]
  )

  const usageRows = useMemo(() => {
    return records.map((record) => ({
      ...record,
      featureLabel: FEATURE_LABELS[record.feature] || record.feature || '通用调用',
      startedAtLabel: formatDateTime(record.startedAt),
      totalCnyLabel: formatCurrencyCny(record.pricing?.totalCny),
      totalUsdLabel: formatCurrencyUsd(record.pricing?.totalUsd),
    }))
  }, [records])

  const pricingCards = [
    {
      label: '缓存命中输入价',
      value: formatCurrencyUsd(pricingProfile.inputCacheHitUsdPer1M),
      help: '按每 100 万 tokens 估算',
    },
    {
      label: '缓存未命中输入价',
      value: formatCurrencyUsd(pricingProfile.inputCacheMissUsdPer1M),
      help: '按每 100 万 tokens 估算',
    },
    {
      label: '输出价',
      value: formatCurrencyUsd(pricingProfile.outputUsdPer1M),
      help: '按每 100 万 tokens 估算',
    },
  ]

  const summaryCards = [
    { label: 'AI 调用次数', value: `${summary.totalCalls}` },
    { label: '成功率', value: `${summary.successRate}%` },
    { label: '总 Tokens', value: `${summary.totalTokens}` },
    { label: '累计成本', value: formatCurrencyCny(summary.totalCny) },
  ]

  async function handleSaveConfig() {
    setSavingConfig(true)
    setError('')
    try {
      updateDeepSeekConfig({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
      })
      updateUsdCnyRate(config.usdCnyRate)
      const current = getDeepSeekConfig()
      setConfig({
        apiKey: current.apiKey,
        baseUrl: current.baseUrl,
        model: current.model,
        usdCnyRate: String(getUsdCnyRate()),
      })
    } catch (nextError) {
      setError(nextError.message || '保存 AI 配置失败。')
    } finally {
      setSavingConfig(false)
    }
  }

  async function handleClearRecords() {
    if (!activeProfileId) return
    const confirmed = window.confirm('确定清空当前档案下的 AI 调用记录吗？此操作不会删除题库或历史记录。')
    if (!confirmed) return
    await clearAiUsageHistory(activeProfileId)
    await refreshRecords()
  }

  async function handleCountTokens() {
    setTokenizerState({ loading: true, error: '', tokenCount: 0 })
    try {
      const tokenCount = await countDeepSeekTokens(tokenizerText)
      setTokenizerState({ loading: false, error: '', tokenCount })
    } catch (nextError) {
      setTokenizerState({
        loading: false,
        error: nextError.message || '加载 DeepSeek tokenizer 失败。',
        tokenCount: 0,
      })
    }
  }

  return {
    activeProfile,
    loading,
    error,
    config,
    setConfig,
    savingConfig,
    summary,
    summaryCards,
    pricingCards,
    pricingEffectiveDate: DEEPSEEK_PRICING_EFFECTIVE_DATE,
    availableModels: Object.keys(DEEPSEEK_MODEL_PRICING),
    maskedApiKey: maskApiKey(config.apiKey),
    usageRows,
    tokenizerText,
    setTokenizerText,
    tokenizerState,
    handleSaveConfig,
    handleClearRecords,
    handleCountTokens,
    refreshRecords,
  }
}
