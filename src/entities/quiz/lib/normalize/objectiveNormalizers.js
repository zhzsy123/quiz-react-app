import {
  ensureQuestionBase,
  getDefaultScoreByType,
  normalizeMultiCorrect,
  normalizeOption,
  normalizeTrueFalseCorrect,
  parseScore,
} from './helpers'

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
  if (!Array.isArray(question.options) || !question.answer?.correct) return null

  return appendObjectiveMeta(question, {
    ...ensureQuestionBase(question, 'single_choice', options.defaultScore || getDefaultScoreByType('single_choice')),
    options: question.options.map(normalizeOption),
    answer: {
      type: 'objective',
      correct: question.answer.correct,
      rationale: question.answer.rationale || '暂无解析',
    },
  })
}

export function normalizeMultipleChoiceQuestion(question) {
  if (!Array.isArray(question.options)) return null
  const correct = normalizeMultiCorrect(question.answer?.correct)
  if (!correct.length) return null

  return appendObjectiveMeta(question, {
    ...ensureQuestionBase(question, 'multiple_choice', getDefaultScoreByType('multiple_choice')),
    options: question.options.map(normalizeOption),
    answer: {
      type: 'objective',
      correct,
      rationale: question.answer?.rationale || '暂无解析',
    },
  })
}

export function normalizeTrueFalseQuestion(question) {
  const correct = normalizeTrueFalseCorrect(question.answer?.correct)
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
      rationale: question.answer?.rationale || '暂无解析',
    },
  })
}

export function normalizeFillBlankQuestion(question) {
  if (!Array.isArray(question.blanks) || !question.blanks.length) return null

  const blanks = question.blanks
    .map((blank, index) => {
      const acceptedAnswers = [
        ...new Set(
          (blank.accepted_answers || [])
            .map((value) => String(value || '').trim())
            .filter(Boolean)
        ),
      ]

      if (!acceptedAnswers.length) return null

      return {
        blank_id: blank.blank_id ?? index + 1,
        accepted_answers: acceptedAnswers,
        rationale: blank.rationale || '暂无解析',
        score: parseScore(blank.score, getDefaultScoreByType('fill_blank')),
      }
    })
    .filter(Boolean)

  if (!blanks.length) return null

  return appendObjectiveMeta(question, {
    ...ensureQuestionBase(
      question,
      'fill_blank',
      blanks.reduce((sum, blank) => sum + (blank.score || 0), 0)
    ),
    blanks,
    answer: {
      type: 'objective',
      correct: blanks.map((blank) => blank.accepted_answers),
      rationale: question.answer?.rationale || '',
    },
    score: blanks.reduce((sum, blank) => sum + (blank.score || 0), 0),
  })
}

export function normalizeReadingQuestion(question) {
  if (!question.passage?.content || !Array.isArray(question.questions)) return null

  const normalizedQuestions = question.questions
    .map((subQuestion) => normalizeSingleChoiceQuestion(subQuestion, { defaultScore: getDefaultScoreByType('reading') }))
    .filter(Boolean)

  if (!normalizedQuestions.length) return null

  return appendObjectiveMeta(question, {
    ...ensureQuestionBase(
      question,
      'reading',
      normalizedQuestions.reduce((sum, subQuestion) => sum + (subQuestion.score || 0), 0)
    ),
    title: question.title,
    passage: {
      title: question.passage?.title || question.title,
      content: question.passage.content,
    },
    questions: normalizedQuestions,
    answer: {
      type: 'objective',
    },
    score: normalizedQuestions.reduce((sum, subQuestion) => sum + (subQuestion.score || 0), 0),
  })
}

export function normalizeClozeQuestion(question) {
  if (!question.article || !Array.isArray(question.blanks)) return []

  return question.blanks
    .map((blank) => {
      if (!Array.isArray(blank.options) || !blank.correct) return null

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
        options: blank.options.map(normalizeOption),
        answer: {
          type: 'objective',
          correct: blank.correct,
          rationale: blank.rationale || '暂无解析',
        },
      }
    })
    .filter(Boolean)
}
