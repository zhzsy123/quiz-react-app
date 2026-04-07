import { callDeepSeekJson } from './deepseekClient'

export const AVAILABLE_AI_PROVIDERS = ['deepseek']

export async function requestAiJson({
  provider = 'deepseek',
  systemPrompt,
  userPrompt,
  temperature = 0.2,
}) {
  switch (provider) {
    case 'deepseek':
      return callDeepSeekJson({
        systemPrompt,
        userPrompt,
        temperature,
      })
    default:
      throw new Error(`不支持的 AI provider: ${provider}`)
  }
}
