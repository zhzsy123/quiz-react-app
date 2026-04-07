import { normalizeQuizPayload } from './normalize/normalizeQuizPayload'
import { getQuizScoreBreakdown } from './scoring/getQuizScoreBreakdown'
import { parseQuizJsonText } from './text/parseQuizJsonText'
import { validateQuizPayload } from './validation/validateQuizPayload'

function buildError(message, details = []) {
  const error = new Error(message)
  error.details = details
  return error
}

export { parseQuizJsonText } from './text/parseQuizJsonText'
export { validateQuizPayload } from './validation/validateQuizPayload'

export function normalizeQuizDocument(payload) {
  const validation = validateQuizPayload(payload)
  if (!validation.isValid) {
    throw buildError(validation.errors[0], validation.errors)
  }

  const quiz = normalizeQuizPayload(payload)
  const scoreBreakdown = getQuizScoreBreakdown(quiz.items || [])

  return {
    rawPayload: payload,
    validation: {
      ...validation,
      supportedCount: quiz.compatibility?.supportedCount || quiz.items?.length || 0,
      skippedCount: quiz.compatibility?.skippedCount || 0,
      skippedTypes: quiz.compatibility?.skippedTypes || [],
    },
    quiz,
    scoreBreakdown,
  }
}

export function buildQuizDocumentFromText(text) {
  const { cleanedText, payload } = parseQuizJsonText(text)
  const normalized = normalizeQuizDocument(payload)

  return {
    cleanedText,
    ...normalized,
  }
}
