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
    question.text ||
    question.content ||
    question.body ||
    question.prompt

  if (!sourceText) return null

  const prompt =
    question.translation_prompt ||
    question.instruction ||
    (question.source_text || question.sourceText || question.text || question.content || question.body
      ? question.prompt || '请完成翻译'
      : '请完成翻译')

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
      scoring_rubric: question?.answer?.scoring_rubric || null,
      common_errors: question?.answer?.common_errors || [],
      ai_scoring: question?.answer?.ai_scoring || { enabled: false },
    },
  })
}

export function normalizeGenericSubjectiveQuestion(question, fallbackType) {
  const prompt = question.prompt || question.title || '请完成作答'
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
