import { getPreference, setPreference } from '../lib/preferences/preferenceRepository'
import { postJson, postStream } from './httpClient'
import { createNdjsonStreamParser } from './streamParser'

const API_KEY_PREF = 'ai:deepseekApiKey'
const BASE_URL_PREF = 'ai:deepseekBaseUrl'
const MODEL_PREF = 'ai:deepseekModel'

const DEFAULT_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-chat'

function cleanBaseUrl(baseUrl) {
  return String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

function parseJsonContent(content) {
  const text = String(content || '').trim()
  if (!text) throw new Error('AI return is empty')

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

    throw new Error('AI return is not valid JSON')
  }
}

async function readResponseError(response) {
  try {
    const text = await response.text()
    return text || response.statusText || 'Unknown error'
  } catch {
    return response.statusText || 'Unknown error'
  }
}

export function getDeepSeekConfig() {
  return {
    apiKey: getPreference(API_KEY_PREF, ''),
    baseUrl: getPreference(BASE_URL_PREF, import.meta.env.VITE_DEEPSEEK_BASE_URL || DEFAULT_BASE_URL),
    model: getPreference(MODEL_PREF, import.meta.env.VITE_DEEPSEEK_MODEL || DEFAULT_MODEL),
  }
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

export function ensureDeepSeekConfigInteractive() {
  const current = getDeepSeekConfig()
  if (current.apiKey) return current

  const apiKey = window.prompt('请输入 DeepSeek API Key。它只会保存在当前浏览器本地，用于个人使用。')
  if (!apiKey?.trim()) return null

  setPreference(API_KEY_PREF, apiKey.trim())
  return {
    ...current,
    apiKey: apiKey.trim(),
  }
}

export async function callDeepSeekJson({ systemPrompt, userPrompt, temperature = 0.2, signal } = {}) {
  const config = ensureDeepSeekConfigInteractive()
  if (!config?.apiKey) {
    throw new Error('未配置 DeepSeek API Key')
  }

  try {
    const payload = await postJson(`${cleanBaseUrl(config.baseUrl)}/chat/completions`, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: {
        model: config.model || DEFAULT_MODEL,
        temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
      signal,
    })

    const content = payload?.choices?.[0]?.message?.content
    return {
      content: parseJsonContent(content),
      model: payload?.model || config.model || DEFAULT_MODEL,
    }
  } catch (error) {
    throw new Error(`DeepSeek 请求失败: ${error.message}`)
  }
}

export async function callDeepSeekStream({
  systemPrompt,
  userPrompt,
  temperature = 0.7,
  onEvent,
  onError,
  signal,
} = {}) {
  const config = ensureDeepSeekConfigInteractive()
  if (!config?.apiKey) {
    throw new Error('未配置 DeepSeek API Key')
  }

  const response = await postStream(`${cleanBaseUrl(config.baseUrl)}/chat/completions`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: 'text/event-stream',
    },
    body: {
      model: config.model || DEFAULT_MODEL,
      temperature,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    },
    signal,
  })

  const events = []
  const parser = createNdjsonStreamParser({
    onEvent: (event) => {
      events.push(event)
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
    return {
      events,
      model: config.model || DEFAULT_MODEL,
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

  return {
    events,
    model: config.model || DEFAULT_MODEL,
  }
}
