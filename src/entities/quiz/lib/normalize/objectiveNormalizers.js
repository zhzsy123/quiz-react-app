import {
  ensureQuestionBase,
  getDefaultScoreByType,
  normalizeMultiCorrect,
  normalizeOption,
  normalizeTrueFalseCorrect,
  parseScore,
} from './helpers'
import {
  buildFallbackClozeArticle,
  getClozeBlankId,
  getClozeRawBlanks,
  hasClozePlaceholders,
} from '../clozeHelpers.js'

function getOptionList(question) {
  if (Array.isArray(question?.options)) return question.options
  if (Array.isArray(question?.choices)) return question.choices
  if (Array.isArray(question?.selections)) return question.selections
  return []
}

function getObjectiveCorrectValue(question) {
  return (
    question?.answer?.correct ??
    question?.answer?.answer ??
    question?.correct_answer ??
    question?.correctAnswer ??
    question?.correct_option ??
    question?.correctOption ??
    question?.correct ??
    ''
  )
}

function getBlankAcceptedAnswers(blank) {
  if (Array.isArray(blank?.accepted_answers)) return blank.accepted_answers
  if (Array.isArray(blank?.answers)) return blank.answers
  if (Array.isArray(blank?.correct)) return blank.correct
  if (typeof blank?.correct === 'string') return [blank.correct]
  return []
}

function appendObjectiveMeta(question, normalizedQuestion) {
  return {
    ...normalizedQuestion,
    context_title: question.context_title || question.case_title || question.material_title || '',
    context:
      question.context ||
      question.material ||
      question.case_material ||
      question.background ||
      question.body ||
      '',
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

export function normalizeSingleChoiceQuestion(question, options = {}) {
  const optionList = getOptionList(question)
  const correct = getObjectiveCorrectValue(question)
  if (!optionList.length || !correct) return null

  return appendObjectiveMeta(question, {
    ...ensureQuestionBase(question, 'single_choice', options.defaultScore || getDefaultScoreByType('single_choice')),
    options: optionList.map(normalizeOption),
    answer: {
      type: 'objective',
      correct,
      rationale: question?.answer?.rationale || '暂无解析',
    },
  })
}

export function normalizeMultipleChoiceQuestion(question) {
  const optionList = getOptionList(question)
  const correct = normalizeMultiCorrect(getObjectiveCorrectValue(question))
  if (!optionList.length || !correct.length) return null

  return appendObjectiveMeta(question, {
    ...ensureQuestionBase(question, 'multiple_choice', getDefaultScoreByType('multiple_choice')),
    options: optionList.map(normalizeOption),
    answer: {
      type: 'objective',
      correct,
      rationale: question?.answer?.rationale || '暂无解析',
    },
  })
}

export function normalizeTrueFalseQuestion(question) {
  const correct = normalizeTrueFalseCorrect(getObjectiveCorrectValue(question))
  if (!correct) return null

  return appendObjectiveMeta(question, {
    ...ensureQuestionBase(question, 'true_false', getDefaultScoreByType('true_false')),
    options: [
      { key: 'T', text: '正确' },
      { key: 'F', text: '错误' },
    ],
    answer: {
      type: 'objective',
      correct,
      rationale: question?.answer?.rationale || '暂无解析',
    },
  })
}

export function normalizeFillBlankQuestion(question, options = {}) {
  const rawBlanks = Array.isArray(question?.blanks)
    ? question.blanks
    : Array.isArray(question?.answers)
      ? question.answers
      : []

  if (!rawBlanks.length) return null

  const blanks = rawBlanks
    .map((blank, index) => {
      const acceptedAnswers = [
        ...new Set(
          getBlankAcceptedAnswers(blank)
            .map((value) => String(value || '').trim())
            .filter(Boolean)
        ),
      ]

      if (!acceptedAnswers.length) return null

      return {
        blank_id: blank.blank_id ?? blank.id ?? index + 1,
        accepted_answers: acceptedAnswers,
        rationale: blank.rationale || '暂无解析',
        score: parseScore(blank.score, getDefaultScoreByType(options.baseType || 'fill_blank')),
      }
    })
    .filter(Boolean)

  if (!blanks.length) return null

  const baseType = options.baseType || 'fill_blank'
  const normalizedType = options.normalizedType || baseType
  const totalScore = blanks.reduce((sum, blank) => sum + (blank.score || 0), 0)

  return appendObjectiveMeta(question, {
    ...ensureQuestionBase(question, normalizedType, totalScore),
    blanks,
    answer: {
      type: 'objective',
      correct: blanks.map((blank) => blank.accepted_answers),
      rationale: question?.answer?.rationale || '',
    },
    score: totalScore,
    source_type: question?.type || normalizedType,
    deliverable_type:
      question?.deliverable_type || (question?.type === 'function_fill_blank' ? 'function_fill_blank' : ''),
    response_format: question?.response_format || (question?.type === 'function_fill_blank' ? 'code' : ''),
  })
}

export function normalizeReadingQuestion(question) {
  const passage =
    typeof question?.passage === 'string'
      ? { title: question?.title, content: question.passage }
      : {
          title: question?.passage?.title || question?.title,
          content:
            question?.passage?.content ||
            question?.passage?.body ||
            question?.passage?.text ||
            question?.article ||
            question?.content ||
            '',
        }
  const subQuestions = question?.questions || question?.sub_questions || question?.subQuestions || []
  if (!passage.content || !Array.isArray(subQuestions) || !subQuestions.length) return null

  const normalizedQuestions = subQuestions
    .map((subQuestion) =>
      normalizeSingleChoiceQuestion(subQuestion, { defaultScore: getDefaultScoreByType('reading') })
    )
    .filter(Boolean)

  if (!normalizedQuestions.length) return null

  const totalScore = normalizedQuestions.reduce((sum, subQuestion) => sum + (subQuestion.score || 0), 0)

  return appendObjectiveMeta(question, {
    ...ensureQuestionBase(question, 'reading', totalScore),
    title: question?.title,
    passage,
    questions: normalizedQuestions,
    answer: {
      type: 'objective',
    },
    score: totalScore,
  })
}

export function normalizeClozeQuestion(question) {
  const rawBlanks = getClozeRawBlanks(question)
  const article = buildFallbackClozeArticle(question, rawBlanks)

  if (!article || !rawBlanks.length || !hasClozePlaceholders(article)) return null

  const blanks = rawBlanks
    .map((blank, index) => {
      const optionList = getOptionList(blank)
      const correct = getObjectiveCorrectValue(blank)
      if (!optionList.length || !correct) return null

      return {
        blank_id: getClozeBlankId(blank, index),
        score: parseScore(blank.score, getDefaultScoreByType('cloze')),
        options: optionList.map(normalizeOption),
        correct,
        rationale: blank.rationale || blank?.answer?.rationale || '暂无解析',
        prompt: blank.prompt || blank.title || blank.stem || blank.sentence || '',
      }
    })
    .filter(Boolean)

  if (!blanks.length) return null

  const totalScore = blanks.reduce((sum, blank) => sum + (blank.score || 0), 0)

  return appendObjectiveMeta(question, {
    ...ensureQuestionBase(question, 'cloze', totalScore),
    title: question.title || '完形填空',
    article,
    blanks,
    answer: {
      type: 'objective',
      correct: blanks.map((blank) => blank.correct),
      rationale: question?.answer?.rationale || '',
    },
    score: totalScore,
  })
}
