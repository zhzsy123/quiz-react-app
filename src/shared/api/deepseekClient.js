import { createAiUsageRecord } from '../lib/ai/aiUsageRepository'
import { calculateDeepSeekCost } from '../lib/ai/deepseekPricing'
import { getPreference, setPreference } from '../lib/preferences/preferenceRepository'
import { requestPromptDialog } from '../ui/dialogs/dialogService'
import { postJson, postStream } from './httpClient'
import { createNdjsonStreamParser } from './streamParser'

const API_KEY_PREF = 'ai:deepseekApiKey'
const BASE_URL_PREF = 'ai:deepseekBaseUrl'
const MODEL_PREF = 'ai:deepseekModel'
const ACTIVE_PROFILE_KEY = 'vorin:activeProfileId'

const DEFAULT_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-reasoner'

function cleanBaseUrl(baseUrl) {
  return String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

function parseJsonContent(content) {
  const text = String(content || '').trim()
  if (!text) throw new Error('AI 返回为空。')

  try {
    return JSON.parse(text)
  } catch {
    const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i)
    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1].trim())
    }

    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1))
    }

    throw new Error('AI 返回内容不是合法 JSON。')
  }
}

function getActiveProfileId() {
  return getPreference(ACTIVE_PROFILE_KEY, 'default') || 'default'
}

function buildUsageMetadata(payload = {}) {
  const usage = payload?.usage || {}
  const promptTokens = Number(usage.prompt_tokens) || 0
  const completionTokens = Number(usage.completion_tokens) || 0
  const promptCacheHitTokens = Number(usage.prompt_cache_hit_tokens) || 0
  const promptCacheMissTokens =
    Number(usage.prompt_cache_miss_tokens) || Math.max(0, promptTokens - promptCacheHitTokens)
  const reasoningTokens = Number(usage?.completion_tokens_details?.reasoning_tokens) || 0

  return {
    promptTokens,
    completionTokens,
    totalTokens: Number(usage.total_tokens) || promptTokens + completionTokens,
    promptCacheHitTokens,
    promptCacheMissTokens,
    reasoningTokens,
    rawUsage: usage,
  }
}

async function recordAiUsage({
  status = 'completed',
  provider = 'deepseek',
  model = DEFAULT_MODEL,
  feature = 'general',
  subject = '',
  title = '',
  mode = 'json',
  requestMeta = {},
  usageMeta = null,
  startedAt = Date.now(),
  endedAt = Date.now(),
  errorMessage = '',
} = {}) {
  try {
    if (typeof indexedDB === 'undefined') {
      return
    }

    const pricing = usageMeta
      ? calculateDeepSeekCost({
          model,
          promptTokens: usageMeta.promptTokens,
          completionTokens: usageMeta.completionTokens,
          promptCacheHitTokens: usageMeta.promptCacheHitTokens,
          promptCacheMissTokens: usageMeta.promptCacheMissTokens,
        })
      : calculateDeepSeekCost({ model })

    await createAiUsageRecord({
      profileId: getActiveProfileId(),
      provider,
      feature,
      status,
      model,
      subject,
      mode,
      title,
      startedAt,
      endedAt,
      errorMessage,
      request: {
        temperature: requestMeta.temperature,
        responseFormat: requestMeta.responseFormat,
        stream: requestMeta.stream,
        promptChars: requestMeta.promptChars,
        userPromptChars: requestMeta.userPromptChars,
        systemPromptChars: requestMeta.systemPromptChars,
      },
      usage: usageMeta
        ? {
            promptTokens: usageMeta.promptTokens,
            completionTokens: usageMeta.completionTokens,
            totalTokens: usageMeta.totalTokens,
            promptCacheHitTokens: usageMeta.promptCacheHitTokens,
            promptCacheMissTokens: usageMeta.promptCacheMissTokens,
            reasoningTokens: usageMeta.reasoningTokens,
          }
        : undefined,
      pricing,
      rawUsage: usageMeta?.rawUsage || null,
    })
  } catch (error) {
    console.error('AI usage logging failed', error)
  }
}

export function getDeepSeekConfig() {
  return {
    apiKey: getPreference(API_KEY_PREF, ''),
    baseUrl: getPreference(BASE_URL_PREF, import.meta.env.VITE_DEEPSEEK_BASE_URL || DEFAULT_BASE_URL),
    model: getPreference(MODEL_PREF, import.meta.env.VITE_DEEPSEEK_MODEL || DEFAULT_MODEL),
  }
}

export function getDeepSeekModelPreference() {
  return getPreference(MODEL_PREF, import.meta.env.VITE_DEEPSEEK_MODEL || '')
}

export function updateDeepSeekConfig(patch = {}) {
  if (typeof patch.apiKey === 'string') {
    setPreference(API_KEY_PREF, patch.apiKey.trim())
  }
  if (typeof patch.baseUrl === 'string' && patch.baseUrl.trim()) {
    setPreference(BASE_URL_PREF, patch.baseUrl.trim())
  }
  if (typeof patch.model === 'string' && patch.model.trim()) {
    setPreference(MODEL_PREF, patch.model.trim())
  }
  return getDeepSeekConfig()
}

export function maskApiKey(apiKey = '') {
  const text = String(apiKey || '').trim()
  if (!text) return '未配置'
  if (text.length <= 10) return `${text.slice(0, 2)}***${text.slice(-2)}`
  return `${text.slice(0, 4)}***${text.slice(-4)}`
}

export async function ensureDeepSeekConfigInteractive() {
  const current = getDeepSeekConfig()
  if (current.apiKey) return current

  const apiKey = await requestPromptDialog({
    title: '配置 DeepSeek API Key',
    message: '请输入 DeepSeek API Key。它只会保存在当前浏览器本地，用于个人使用。',
    confirmLabel: '保存',
    placeholder: 'sk-...',
  })
  if (!apiKey?.trim()) return null

  setPreference(API_KEY_PREF, apiKey.trim())
  return {
    ...current,
    apiKey: apiKey.trim(),
  }
}

export async function callDeepSeekJson({
  systemPrompt,
  userPrompt,
  temperature = 0.2,
  model,
  signal,
  feature = 'general',
  title = '',
  subject = '',
} = {}) {
  const config = await ensureDeepSeekConfigInteractive()
  if (!config?.apiKey) {
    throw new Error('未配置 DeepSeek API Key')
  }

  const startedAt = Date.now()
  const requestMeta = {
    temperature,
    responseFormat: 'json_object',
    stream: false,
    systemPromptChars: String(systemPrompt || '').length,
    userPromptChars: String(userPrompt || '').length,
    promptChars: String(systemPrompt || '').length + String(userPrompt || '').length,
  }

  try {
    const payload = await postJson(`${cleanBaseUrl(config.baseUrl)}/chat/completions`, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: {
        model: model || config.model || DEFAULT_MODEL,
        temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
      signal,
    })

    const usageMeta = buildUsageMetadata(payload)
    await recordAiUsage({
      status: 'completed',
      provider: 'deepseek',
      model: payload?.model || model || config.model || DEFAULT_MODEL,
      feature,
      subject,
      title,
      mode: 'json',
      requestMeta,
      usageMeta,
      startedAt,
      endedAt: Date.now(),
    })

    return {
      content: parseJsonContent(payload?.choices?.[0]?.message?.content),
      model: payload?.model || config.model || DEFAULT_MODEL,
      usage: usageMeta,
    }
  } catch (error) {
    await recordAiUsage({
      status: 'failed',
      provider: 'deepseek',
      model: model || config.model || DEFAULT_MODEL,
      feature,
      subject,
      title,
      mode: 'json',
      requestMeta,
      startedAt,
      endedAt: Date.now(),
      errorMessage: error.message,
    })
    throw new Error(`DeepSeek 请求失败: ${error.message}`)
  }
}

export async function callDeepSeekStream({
  systemPrompt,
  userPrompt,
  temperature = 0.7,
  model,
  onEvent,
  onError,
  signal,
  feature = 'general',
  title = '',
  subject = '',
} = {}) {
  const config = await ensureDeepSeekConfigInteractive()
  if (!config?.apiKey) {
    throw new Error('未配置 DeepSeek API Key')
  }

  const startedAt = Date.now()
  const requestMeta = {
    temperature,
    responseFormat: 'stream',
    stream: true,
    systemPromptChars: String(systemPrompt || '').length,
    userPromptChars: String(userPrompt || '').length,
    promptChars: String(systemPrompt || '').length + String(userPrompt || '').length,
  }

  try {
    const response = await postStream(`${cleanBaseUrl(config.baseUrl)}/chat/completions`, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'text/event-stream',
      },
      body: {
        model: model || config.model || DEFAULT_MODEL,
        temperature,
        stream: true,
        stream_options: { include_usage: true },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
      signal,
    })

    const events = []
    let usageMeta = null
    const parser = createNdjsonStreamParser({
      onEvent: (event) => {
        events.push(event)
        if (event?.usage) {
          usageMeta = buildUsageMetadata({ usage: event.usage })
        }
        onEvent?.(event)
      },
      onError: (error) => {
        onError?.(error)
      },
    })

    if (!response.body) {
      const fallbackText = await response.text()
      parser.pushTransportChunk(fallbackText)
      parser.flush()
      await recordAiUsage({
        status: 'completed',
        provider: 'deepseek',
        model: model || config.model || DEFAULT_MODEL,
        feature,
        subject,
        title,
        mode: 'stream',
        requestMeta,
        usageMeta,
        startedAt,
        endedAt: Date.now(),
      })
      return {
        events,
        model: model || config.model || DEFAULT_MODEL,
        usage: usageMeta,
      }
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        parser.pushTransportChunk(decoder.decode(value, { stream: true }))
      }
      parser.pushTransportChunk(decoder.decode())
      parser.flush()
    } finally {
      reader.releaseLock()
    }

    await recordAiUsage({
      status: 'completed',
      provider: 'deepseek',
      model: model || config.model || DEFAULT_MODEL,
      feature,
      subject,
      title,
      mode: 'stream',
      requestMeta,
      usageMeta,
      startedAt,
      endedAt: Date.now(),
    })

    return {
      events,
      model: model || config.model || DEFAULT_MODEL,
      usage: usageMeta,
    }
  } catch (error) {
    await recordAiUsage({
      status: 'failed',
      provider: 'deepseek',
      model: model || config.model || DEFAULT_MODEL,
      feature,
      subject,
      title,
      mode: 'stream',
      requestMeta,
      startedAt,
      endedAt: Date.now(),
      errorMessage: error.message,
    })
    throw error
  }
}
