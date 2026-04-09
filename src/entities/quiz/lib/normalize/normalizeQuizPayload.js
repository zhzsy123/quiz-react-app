import { normalizeLegacyPayload } from './legacyNormalizer'
import { normalizeCompositeQuestion } from './compoundNormalizers'
import {
  normalizeClozeQuestion,
  normalizeFillBlankQuestion,
  normalizeMultipleChoiceQuestion,
  normalizeReadingQuestion,
  normalizeSingleChoiceQuestion,
  normalizeTrueFalseQuestion,
} from './objectiveNormalizers'
import {
  normalizeEssayQuestion,
  normalizeGenericSubjectiveQuestion,
  normalizeRelationalAlgebraQuestion,
  normalizeTranslationQuestion,
} from './subjectiveNormalizers'

const QUESTION_NORMALIZERS = {
  single_choice: (question) => {
    const converted = normalizeSingleChoiceQuestion(question, { allowMissingCorrect: true })
    return converted ? [converted] : []
  },
  multiple_choice: (question) => {
    const converted = normalizeMultipleChoiceQuestion(question, { allowMissingCorrect: true })
    return converted ? [converted] : []
  },
  true_false: (question) => {
    const converted = normalizeTrueFalseQuestion(question, { allowMissingCorrect: true })
    return converted ? [converted] : []
  },
  fill_blank: (question) => {
    const converted = normalizeFillBlankQuestion(question)
    return converted ? [converted] : []
  },
  function_fill_blank: (question) => {
    const converted = normalizeFillBlankQuestion(
      { ...question, type: 'function_fill_blank' },
      { normalizedType: 'function_fill_blank', baseType: 'function_fill_blank' }
    )
    return converted ? [converted] : []
  },
  reading: (question) => {
    const converted = normalizeReadingQuestion(question)
    return converted ? [converted] : []
  },
  cloze: (question) => {
    const converted = normalizeClozeQuestion(question)
    return converted ? [converted] : []
  },
  translation: (question) => {
    const converted = normalizeTranslationQuestion(question)
    return converted ? [converted] : []
  },
  essay: (question) => {
    const converted = normalizeEssayQuestion(question)
    return converted ? [converted] : []
  },
  short_answer: (question) => {
    const converted = normalizeGenericSubjectiveQuestion(question, 'short_answer')
    return converted ? [converted] : []
  },
  case_analysis: (question) => {
    const converted = normalizeGenericSubjectiveQuestion(question, 'case_analysis')
    return converted ? [converted] : []
  },
  calculation: (question) => {
    const converted = normalizeGenericSubjectiveQuestion(question, 'calculation')
    return converted ? [converted] : []
  },
  operation: (question) => {
    const converted = normalizeGenericSubjectiveQuestion(question, 'operation')
    return converted ? [converted] : []
  },
  programming: (question) => {
    const converted = normalizeGenericSubjectiveQuestion(
      { ...question, response_format: question.response_format || 'code' },
      'programming'
    )
    return converted ? [converted] : []
  },
  sql: (question) => {
    const converted = normalizeGenericSubjectiveQuestion(
      { ...question, response_format: question.response_format || 'sql' },
      'sql'
    )
    return converted ? [converted] : []
  },
  er_diagram: (question) => {
    const converted = normalizeGenericSubjectiveQuestion(question, 'er_diagram')
    return converted ? [converted] : []
  },
  relational_algebra: (question) => {
    const converted = normalizeRelationalAlgebraQuestion(question)
    return converted ? [converted] : []
  },
  composite: (question) => {
    const converted = normalizeCompositeQuestion(question)
    return converted ? [converted] : []
  },
}

export function normalizeQuizPayload(data) {
  if (!Array.isArray(data?.questions) && Array.isArray(data?.items)) {
    return normalizeLegacyPayload(data)
  }

  if (!Array.isArray(data?.questions)) {
    throw new Error('题库必须包含 questions 或 items 数组。')
  }

  const items = []
  let skippedCount = 0
  const skippedTypes = []
  const failedSupportedTypes = []

  data.questions.forEach((question) => {
    const normalizeQuestion = QUESTION_NORMALIZERS[question?.type]
    if (!normalizeQuestion) {
      skippedCount += 1
      skippedTypes.push(question?.type || 'unknown')
      return
    }

    const converted = normalizeQuestion(question)
    if (converted.length) {
      items.push(...converted)
      return
    }

    skippedCount += 1
    skippedTypes.push(question?.type || 'unknown')
    failedSupportedTypes.push(question?.type || 'unknown')
  })

  if (!items.length) {
    if (failedSupportedTypes.includes('cloze')) {
      throw new Error(
        '完形填空结构不完整，必须提供带文内空位的 article 文本和 blanks 数组，且每个 blank 都要有 options、correct 与 rationale。'
      )
    }

      throw new Error(
        '当前 JSON 规范仅支持 single_choice、multiple_choice、true_false、fill_blank、function_fill_blank、reading、cloze、translation、essay、short_answer、case_analysis、calculation、operation、programming、sql、er_diagram、relational_algebra、composite。'
      )
    }

  return {
    title: data.title || '未命名试卷',
    paper_id: data.paper_id,
    subject: data.subject || '',
    description: data.description || '',
    duration_minutes: Number(data.duration_minutes) || 0,
    items,
    compatibility: {
      sourceSchema: data.schema_version || 'json-schema',
      supportedCount: items.length,
      skippedCount,
      skippedTypes: [...new Set(skippedTypes)],
    },
  }
}
