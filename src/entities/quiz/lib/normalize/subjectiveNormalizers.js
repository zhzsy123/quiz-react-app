import { ensureQuestionBase, getDefaultScoreByType } from './helpers'

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

  return {
    ...ensureQuestionBase(question, 'translation', getDefaultScoreByType('translation')),
    prompt,
    direction: question.direction || 'en_to_zh',
    source_text: sourceText,
    answer: {
      type: 'subjective',
      reference_answer: question.answer?.reference_answer || question.answer?.correct || '',
      alternate_answers: question.answer?.alternate_answers || [],
      scoring_points: question.answer?.scoring_points || [],
      ai_scoring: question.answer?.ai_scoring || { enabled: false },
    },
  }
}

export function normalizeEssayQuestion(question) {
  return {
    ...ensureQuestionBase(question, 'essay', getDefaultScoreByType('essay')),
    essay_type: question.essay_type || 'writing',
    requirements: question.requirements || {},
    answer: {
      type: 'subjective',
      reference_answer: question.answer?.reference_answer || '',
      outline: question.answer?.outline || [],
      scoring_rubric: question.answer?.scoring_rubric || null,
      common_errors: question.answer?.common_errors || [],
      ai_scoring: question.answer?.ai_scoring || { enabled: false },
    },
  }
}

export function normalizeGenericSubjectiveQuestion(question, fallbackType) {
  const prompt = question.prompt || question.title || '请完成作答'
  if (!prompt) return null

  return {
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
      reference_answer: question.answer?.reference_answer || question.answer?.correct || '',
      outline: question.answer?.outline || [],
      scoring_points: question.answer?.scoring_points || [],
      scoring_rubric: question.answer?.scoring_rubric || null,
      common_errors: question.answer?.common_errors || [],
      ai_scoring: question.answer?.ai_scoring || { enabled: false },
    },
  }
}
