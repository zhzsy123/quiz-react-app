import { getQuizScoreBreakdown, normalizeQuizPayload, normalizeQuizText } from './quizSchema'

function buildError(message, details = []) {
  const error = new Error(message)
  error.details = details
  return error
}

export function parseQuizJsonText(text) {
  const cleanedText = normalizeQuizText(text)
  if (!cleanedText) {
    throw buildError('题库内容为空，请检查 JSON 文件。')
  }

  try {
    return {
      cleanedText,
      payload: JSON.parse(cleanedText),
    }
  } catch (error) {
    throw buildError(`JSON 解析失败：${error.message}`)
  }
}

export function validateQuizPayload(payload) {
  const errors = []
  const warnings = []

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    errors.push('题库顶层必须是 JSON 对象。')
    return {
      isValid: false,
      errors,
      warnings,
      usesLegacyItems: false,
      usesQuestions: false,
      sourceSchema: 'unknown',
    }
  }

  const usesLegacyItems = Array.isArray(payload.items)
  const usesQuestions = Array.isArray(payload.questions)

  if (!usesLegacyItems && !usesQuestions) {
    errors.push('题库必须包含 questions 或 items 数组。')
  }

  if (usesLegacyItems && payload.items.length === 0) {
    errors.push('旧版 items 题库不能为空。')
  }

  if (usesQuestions && payload.questions.length === 0) {
    errors.push('questions 数组不能为空。')
  }

  if (!payload.title) {
    warnings.push('缺少 title，将使用默认试卷标题。')
  }

  if (usesQuestions && !payload.schema_version) {
    warnings.push('缺少 schema_version，将按默认 JSON schema 处理。')
  }

  const sourceSchema = usesLegacyItems ? 'legacy_items' : payload.schema_version || 'json-schema'

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    usesLegacyItems,
    usesQuestions,
    sourceSchema,
  }
}

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
