import { buildGenerationPrompt } from './buildGenerationPrompt.js'

export function buildBlueprintExpansionPrompt({
  subjectKey,
  params = {},
  requestId = '',
  blueprint,
  questionIndex = 1,
  totalQuestions = 1,
  avoidQuestionSignatures = [],
  previousErrorMessage = '',
} = {}) {
  const planItem = {
    typeKey: blueprint?.type_key,
    score: blueprint?.score,
    label: blueprint?.task_pattern || blueprint?.type_key || '',
  }

  const basePrompt = buildGenerationPrompt({
    subjectKey,
    params,
    requestId,
    planItem,
    questionIndex,
    totalQuestions,
    avoidQuestionSignatures,
    previousErrorMessage,
  })

  const payload = JSON.parse(basePrompt.userPrompt)
  payload.blueprint = blueprint
  payload.rules = [
    ...(Array.isArray(payload.rules) ? payload.rules : []),
    'Follow the blueprint exactly.',
    'Keep the same type_key, knowledge_point, task_pattern, and scenario.',
    'Do not ignore the dedupe_tags and constraints from the blueprint.',
  ]

  return {
    ...basePrompt,
    userPrompt: JSON.stringify(payload),
  }
}
