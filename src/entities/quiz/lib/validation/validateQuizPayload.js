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
