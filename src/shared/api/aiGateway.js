import { resolveAiModel } from './aiModelPolicy'
import { callDeepSeekJson, callDeepSeekStream, getDeepSeekModelPreference } from './deepseekClient'

export const AVAILABLE_AI_PROVIDERS = ['deepseek']

export async function requestAiJson({
  provider = 'deepseek',
  systemPrompt,
  userPrompt,
  temperature = 0.2,
  feature = 'general',
  title = '',
  subject = '',
  model = '',
}) {
  const preferredModel = provider === 'deepseek' ? getDeepSeekModelPreference() : ''
  const resolvedModel = resolveAiModel({
    feature,
    preferredModel,
    explicitModel: model,
  })

  switch (provider) {
    case 'deepseek':
      return callDeepSeekJson({
        systemPrompt,
        userPrompt,
        temperature,
        feature,
        title,
        subject,
        model: resolvedModel,
      })
    default:
      throw new Error(`Unsupported AI provider: ${provider}`)
  }
}

export async function requestAiStream({
  provider = 'deepseek',
  systemPrompt,
  userPrompt,
  onEvent,
  onError,
  signal,
  temperature = 0.7,
  feature = 'general',
  title = '',
  subject = '',
  model = '',
}) {
  const preferredModel = provider === 'deepseek' ? getDeepSeekModelPreference() : ''
  const resolvedModel = resolveAiModel({
    feature,
    preferredModel,
    explicitModel: model,
  })

  try {
    switch (provider) {
      case 'deepseek':
        return callDeepSeekStream({
          systemPrompt,
          userPrompt,
          onEvent,
          onError,
          signal,
          temperature,
          feature,
          title,
          subject,
          model: resolvedModel,
        })
      default:
        throw new Error(`Unsupported AI provider: ${provider}`)
    }
  } catch (error) {
    onError?.(error)
    throw error
  }
}
