const SUPPORTED_TOP_LEVEL_TYPES = new Set([
  'single_choice',
  'multiple_choice',
  'true_false',
  'fill_blank',
  'function_fill_blank',
  'cloze',
  'reading',
  'translation',
  'essay',
  'short_answer',
  'programming',
  'sql',
  'er_diagram',
  'case_analysis',
  'calculation',
  'operation',
  'composite',
])

const SUPPORTED_COMPOSITE_CHILD_TYPES = new Set([
  'single_choice',
  'multiple_choice',
  'true_false',
  'fill_blank',
  'function_fill_blank',
  'translation',
  'essay',
  'short_answer',
  'programming',
  'sql',
  'er_diagram',
  'case_analysis',
  'calculation',
  'operation',
])

function parseScoreValue(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function sumCompositeChildScores(questions = []) {
  return questions.reduce((sum, question) => sum + parseScoreValue(question?.score), 0)
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

  if (usesQuestions) {
    payload.questions.forEach((question, index) => {
      const questionLabel = question?.id || `questions[${index}]`
      const questionType = question?.type || 'unknown'

      if (!SUPPORTED_TOP_LEVEL_TYPES.has(questionType)) {
        warnings.push(`${questionLabel} 使用了当前未支持的题型 ${questionType}，标准化阶段可能会跳过。`)
        return
      }

      if (questionType !== 'composite') return

      if (!Array.isArray(question.questions) || question.questions.length === 0) {
        errors.push(`${questionLabel} 是 composite，但缺少非空 questions 子题数组。`)
        return
      }

      const supportedChildren = question.questions.filter((childQuestion) =>
        SUPPORTED_COMPOSITE_CHILD_TYPES.has(childQuestion?.type)
      )

      if (!supportedChildren.length) {
        errors.push(`${questionLabel} 的 composite 子题中没有可用的受支持题型。`)
      }

      question.questions.forEach((childQuestion, childIndex) => {
        const childLabel = childQuestion?.id || `${questionLabel}.questions[${childIndex}]`
        const childType = childQuestion?.type || 'unknown'

        if (childType === 'composite') {
          errors.push(`${childLabel} 不支持嵌套 composite。`)
          return
        }

        if (!SUPPORTED_COMPOSITE_CHILD_TYPES.has(childType)) {
          warnings.push(`${childLabel} 使用了 composite 当前未支持的子题类型 ${childType}，标准化阶段可能会跳过。`)
        }
      })

      if (question.score != null) {
        const declaredScore = parseScoreValue(question.score)
        const computedScore = sumCompositeChildScores(question.questions)
        if (declaredScore !== computedScore) {
          warnings.push(`${questionLabel} 的 score 与子题分值总和不一致，标准化阶段将以子题总分为准。`)
        }
      }
    })
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
