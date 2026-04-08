import {
  ensureQuestionBase,
  getDefaultScoreByType,
  normalizeMultiCorrect,
  normalizeOption,
  normalizeTrueFalseCorrect,
  parseScore,
} from './helpers'

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

  return appendObjectiveMeta(question, {
    ...ensureQuestionBase(question, normalizedType, blanks.reduce((sum, blank) => sum + (blank.score || 0), 0)),
    blanks,
    answer: {
      type: 'objective',
      correct: blanks.map((blank) => blank.accepted_answers),
      rationale: question?.answer?.rationale || '',
    },
    score: blanks.reduce((sum, blank) => sum + (blank.score || 0), 0),
    source_type: question?.type || normalizedType,
    deliverable_type: question?.deliverable_type || (question?.type === 'function_fill_blank' ? 'function_fill_blank' : ''),
    response_format: question?.response_format || (question?.type === 'function_fill_blank' ? 'code' : ''),
  })
}

export function normalizeReadingQuestion(question) {
  const passage =
    typeof question?.passage === 'string'
      ? { title: question?.title, content: question.passage }
      : {
          title: question?.passage?.title || question?.title,
          content: question?.passage?.content || question?.article || question?.content || '',
        }
  const subQuestions = question?.questions || question?.sub_questions || question?.subQuestions || []
  if (!passage.content || !Array.isArray(subQuestions) || !subQuestions.length) return null

  const normalizedQuestions = subQuestions
    .map((subQuestion) =>
      normalizeSingleChoiceQuestion(subQuestion, { defaultScore: getDefaultScoreByType('reading') })
    )
    .filter(Boolean)

  if (!normalizedQuestions.length) return null

  return appendObjectiveMeta(question, {
    ...ensureQuestionBase(
      question,
      'reading',
      normalizedQuestions.reduce((sum, subQuestion) => sum + (subQuestion.score || 0), 0)
    ),
    title: question?.title,
    passage,
    questions: normalizedQuestions,
    answer: {
      type: 'objective',
    },
    score: normalizedQuestions.reduce((sum, subQuestion) => sum + (subQuestion.score || 0), 0),
  })
}

export function normalizeClozeQuestion(question) {
  if (!question?.article || !Array.isArray(question?.blanks)) return []

  return question.blanks
    .map((blank) => {
      const optionList = getOptionList(blank)
      const correct = getObjectiveCorrectValue(blank)
      if (!optionList.length || !correct) return null

      return {
        id: `${question.id}_blank_${blank.blank_id}`,
        type: 'single_choice',
        prompt: `${question.prompt}（第 ${blank.blank_id} 空）`,
        context_title: question.title || '完形填空',
        context: question.article.replace(`[[${blank.blank_id}]]`, `____(${blank.blank_id})____`),
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
        response_format: question.response_format || '',
        deliverable_type: question.deliverable_type || '',
        difficulty: question.difficulty,
        tags: question.tags || [],
        score: parseScore(blank.score, getDefaultScoreByType('cloze')),
        source_type: 'cloze',
        assets: Array.isArray(question.assets) ? question.assets : [],
        options: optionList.map(normalizeOption),
        answer: {
          type: 'objective',
          correct,
          rationale: blank.rationale || '暂无解析',
        },
      }
    })
    .filter(Boolean)
}
