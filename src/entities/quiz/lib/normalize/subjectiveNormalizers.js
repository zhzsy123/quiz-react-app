import { ensureQuestionBase, getDefaultScoreByType } from './helpers'

function normalizeScoringPoints(answer = {}) {
  if (Array.isArray(answer.scoring_points)) return answer.scoring_points
  if (Array.isArray(answer.points)) return answer.points
  return []
}

function resolveReferenceAnswer(question) {
  return (
    question?.answer?.reference_answer ||
    question?.answer?.correct ||
    question?.reference_answer ||
    question?.sample_answer ||
    ''
  )
}

function appendSubjectiveMeta(question, normalizedQuestion) {
  return {
    ...normalizedQuestion,
    context_title:
      normalizedQuestion.context_title ||
      question.context_title ||
      question.case_title ||
      question.material_title ||
      '',
    context:
      normalizedQuestion.context ??
      (question.context ||
        question.case_material ||
        question.material ||
        question.background ||
        question.body ||
        ''),
    context_format:
      question.context_format ||
      question.material_format ||
      question.presentation ||
      'plain',
    presentation:
      question.presentation ||
      question.context_format ||
      question.material_format ||
      'plain',
    deliverable_type: question.deliverable_type || '',
    response_format: question.response_format || '',
  }
}

export function normalizeTranslationQuestion(question) {
  const sourceText =
    question.source_text ||
    question.sourceText ||
    question.context ||
    question.text ||
    question.content ||
    question.body ||
    question.prompt

  if (!sourceText) return null

  const prompt = question.translation_prompt || question.instruction || question.prompt || '请完成翻译。'

  return appendSubjectiveMeta(question, {
    ...ensureQuestionBase(question, 'translation', getDefaultScoreByType('translation')),
    prompt,
    direction: question.direction || 'en_to_zh',
    source_text: sourceText,
    answer: {
      type: 'subjective',
      reference_answer: resolveReferenceAnswer(question),
      alternate_answers: question?.answer?.alternate_answers || [],
      scoring_points: normalizeScoringPoints(question?.answer || {}),
      ai_scoring: question?.answer?.ai_scoring || { enabled: false },
    },
  })
}

export function normalizeEssayQuestion(question) {
  return appendSubjectiveMeta(question, {
    ...ensureQuestionBase(question, 'essay', getDefaultScoreByType('essay')),
    essay_type: question.essay_type || 'writing',
    requirements: question.requirements || {},
    answer: {
      type: 'subjective',
      reference_answer: resolveReferenceAnswer(question),
      outline: question?.answer?.outline || [],
      scoring_points: normalizeScoringPoints(question?.answer || {}),
      scoring_rubric: question?.answer?.scoring_rubric || null,
      common_errors: question?.answer?.common_errors || [],
      ai_scoring: question?.answer?.ai_scoring || { enabled: false },
    },
  })
}

export function normalizeGenericSubjectiveQuestion(question, fallbackType) {
  const prompt = question.prompt || question.title || '请完成作答。'
  if (!prompt) return null

  return appendSubjectiveMeta(question, {
    ...ensureQuestionBase(question, fallbackType, getDefaultScoreByType(fallbackType)),
    prompt,
    context_title: question.context_title || question.case_title || question.material_title || '',
    context:
      question.context ||
      question.case_material ||
      question.material ||
      question.background ||
      question.body ||
      '',
    requirements: question.requirements || {},
    answer: {
      type: 'subjective',
      reference_answer: resolveReferenceAnswer(question),
      outline: question?.answer?.outline || [],
      scoring_points: normalizeScoringPoints(question?.answer || {}),
      scoring_rubric: question?.answer?.scoring_rubric || null,
      common_errors: question?.answer?.common_errors || [],
      ai_scoring: question?.answer?.ai_scoring || { enabled: false },
    },
  })
}

function normalizeRelationalAlgebraSchema(schema = {}) {
  if (!schema || typeof schema !== 'object') return null

  const attributes = Array.isArray(schema.attributes)
    ? schema.attributes
    : Array.isArray(schema.fields)
      ? schema.fields
      : []

  const normalizedAttributes = [...new Set(attributes.map((attribute) => String(attribute || '').trim()).filter(Boolean))]
  const name = String(schema.name || schema.table || schema.relation || '').trim()

  if (!name || normalizedAttributes.length === 0) return null

  return {
    name,
    attributes: normalizedAttributes,
  }
}

function normalizeRelationalAlgebraSubquestion(subquestion = {}, index = 0) {
  if (!subquestion || typeof subquestion !== 'object') return null

  const prompt = String(subquestion.prompt || subquestion.stem || subquestion.title || '').trim()
  const referenceAnswer = String(
    subquestion.reference_answer ||
      subquestion.referenceAnswer ||
      subquestion.answer?.reference_answer ||
      subquestion.answer?.referenceAnswer ||
      subquestion.standard_answer ||
      ''
  ).trim()

  if (!prompt || !referenceAnswer) return null

  return {
    id: String(subquestion.id ?? index + 1),
    label: String(subquestion.label || `（${index + 1}）`).trim(),
    prompt,
    score: Number(subquestion.score) > 0 ? Number(subquestion.score) : 5,
    reference_answer: referenceAnswer,
  }
}

export function normalizeRelationalAlgebraQuestion(question) {
  const prompt = String(question.prompt || question.title || '').trim()
  const schemas = (question.schemas || question.relations || question.schema_definitions || [])
    .map((schema) => normalizeRelationalAlgebraSchema(schema))
    .filter(Boolean)
  const sourceSubquestions = question.subquestions || question.questions || question.items || []
  const subquestions = sourceSubquestions
    .map((subquestion, index) => normalizeRelationalAlgebraSubquestion(subquestion, index))
    .filter(Boolean)

  if (!prompt || schemas.length === 0 || subquestions.length === 0) return null

  return appendSubjectiveMeta(question, {
    ...ensureQuestionBase(question, 'relational_algebra', getDefaultScoreByType('relational_algebra')),
    prompt,
    schemas,
    subquestions,
    questions: subquestions,
    tooling: {
      symbols: Array.isArray(question.tooling?.symbols)
        ? question.tooling.symbols
        : ['Π', 'σ', '⋈', '∪', '∩', '-', '÷', 'ρ', 'AND', 'OR', '=', '!=', '>', '<', '>=', '<='],
      wrap_symbols: Array.isArray(question.tooling?.wrap_symbols)
        ? question.tooling.wrap_symbols
        : ['Π', 'σ', '⋈', '∪', '∩', '-', '÷', 'ρ'],
      default_join_symbol: question.tooling?.default_join_symbol || '⋈',
    },
    answer_mode: question.answer_mode || question.answerMode || 'per_subquestion_expression',
    answer: {
      type: 'subjective',
      reference_answer: '',
      scoring_points: [],
      ai_scoring: { enabled: true, mode: 'relational_algebra_equivalence' },
    },
  })
}
