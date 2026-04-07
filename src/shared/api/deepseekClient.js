import { loadPreference, savePreference } from '../lib/storage/storageFacade'

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
  if (!text) throw new Error('AI 返回为空')

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
    throw new Error('AI 返回不是有效 JSON')
  }
}

export function getDeepSeekConfig() {
  return {
    apiKey: loadPreference(API_KEY_PREF, ''),
    baseUrl: loadPreference(BASE_URL_PREF, import.meta.env.VITE_DEEPSEEK_BASE_URL || DEFAULT_BASE_URL),
    model: loadPreference(MODEL_PREF, import.meta.env.VITE_DEEPSEEK_MODEL || DEFAULT_MODEL),
  }
}

export function updateDeepSeekConfig(patch = {}) {
  if (typeof patch.apiKey === 'string') {
    savePreference(API_KEY_PREF, patch.apiKey.trim())
  }
  if (typeof patch.baseUrl === 'string' && patch.baseUrl.trim()) {
    savePreference(BASE_URL_PREF, patch.baseUrl.trim())
  }
  if (typeof patch.model === 'string' && patch.model.trim()) {
    savePreference(MODEL_PREF, patch.model.trim())
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

  savePreference(API_KEY_PREF, apiKey.trim())
  return {
    ...current,
    apiKey: apiKey.trim(),
  }
}

export async function callDeepSeekJson({ systemPrompt, userPrompt, temperature = 0.2 }) {
  const config = ensureDeepSeekConfigInteractive()
  if (!config?.apiKey) {
    throw new Error('未配置 DeepSeek API Key')
  }

  const response = await fetch(`${cleanBaseUrl(config.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || DEFAULT_MODEL,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepSeek 请求失败：${response.status} ${errorText}`)
  }

  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  return {
    content: parseJsonContent(content),
    model: payload?.model || config.model || DEFAULT_MODEL,
  }
}
