const CHAT_FEATURES = new Set([
  'question_generation',
  'question_generation_blueprint',
  'similar_question_generation',
  'document_import',
  'document_import_section',
  'question_audit',
  'question_explanation',
  'question_scoring',
])

const REASONER_FEATURES = new Set([
  'document_import_repair',
  'document_import_section_repair',
  'subjective_grading',
  'relational_algebra_grading',
])

export function resolveAiModel({ feature = 'general', preferredModel = '', explicitModel = '' } = {}) {
  const requestedModel = String(explicitModel || '').trim()
  if (requestedModel) return requestedModel

  const configuredModel = String(preferredModel || '').trim()
  if (configuredModel && configuredModel !== 'auto') {
    return configuredModel
  }

  if (CHAT_FEATURES.has(feature)) return 'deepseek-chat'
  if (REASONER_FEATURES.has(feature)) return 'deepseek-reasoner'
  return 'deepseek-reasoner'
}

export function getAiModelRoutingSummary() {
  return {
    chatFeatures: Array.from(CHAT_FEATURES),
    reasonerFeatures: Array.from(REASONER_FEATURES),
  }
}
