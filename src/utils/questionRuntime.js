export function normalizeChoiceArray(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))].sort()
  }

  if (typeof value === 'string') {
    return [...new Set(value.split(/[\s,，、]+/).map((item) => item.trim()).filter(Boolean))].sort()
  }

  return []
}

export function isNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function normalizeForCompare(value, options = {}) {
  const {
    caseSensitive = false,
    ignorePunctuation = false,
  } = options

  let normalized = normalizeWhitespace(value)
  if (ignorePunctuation) {
    normalized = normalized.replace(/[.,/#!$%^&*;:{}=\-_`~()<>?[\]\\|'"，。！？、；：（）【】《》“”‘’]/g, '')
  }

  return caseSensitive ? normalized : normalized.toLowerCase()
}

export function tokenizeSequenceValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeWhitespace(item)).filter(Boolean)
  }

  const normalized = normalizeWhitespace(value)
  if (!normalized) return []

  return normalized
    .split(/(?:\s*->\s*|\s*=>\s*|\s*[>,，、|;；]+\s*|\s+)/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function sameOrderedTokens(actual, expected, options = {}) {
  if (actual.length !== expected.length) return false

  return actual.every((token, index) => (
    normalizeForCompare(token, options) === normalizeForCompare(expected[index], options)
  ))
}

function sameUnorderedTokens(actual, expected, options = {}) {
  if (actual.length !== expected.length) return false

  const normalizedActual = actual.map((item) => normalizeForCompare(item, options)).sort()
  const normalizedExpected = expected.map((item) => normalizeForCompare(item, options)).sort()
  return normalizedActual.every((token, index) => token === normalizedExpected[index])
}

function normalizeAcceptedAnswers(acceptedAnswers = []) {
  return [...new Set(
    acceptedAnswers
      .map((item) => normalizeWhitespace(item))
      .filter(Boolean)
  )]
}

function stringifyStructuredValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeWhitespace(item))
      .filter(Boolean)
      .join('\n')
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value ?? '').trim()
}

export function formatStructuredResponse(response, fields = []) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    return typeof response === 'string' ? response : ''
  }

  const fieldMap = new Map(fields.map((field) => [field.key, field]))
  const entries = Object.entries(response)
    .map(([key, value]) => [key, stringifyStructuredValue(value)])
    .filter(([, value]) => value)

  if (!entries.length) return ''

  return entries
    .map(([key, value]) => {
      const label = fieldMap.get(key)?.label || key
      return `${label}: ${value}`
    })
    .join('\n')
}

function getBlankComparisonMode(blank) {
  return blank.comparison_mode || 'text'
}

function getBlankCompareOptions(blank) {
  return {
    caseSensitive: Boolean(blank.case_sensitive),
    ignorePunctuation: Boolean(blank.ignore_punctuation),
  }
}

export function getBlankExpectedDisplay(blank) {
  if (blank.display_answer) return blank.display_answer

  if (Array.isArray(blank.accepted_sequences) && blank.accepted_sequences.length > 0) {
    return blank.accepted_sequences[0].join(' ')
  }

  if (Array.isArray(blank.accepted_answers) && blank.accepted_answers.length > 0) {
    return blank.accepted_answers.join(' / ')
  }

  return '--'
}

export function evaluateFillBlankBlank(blank, rawValue) {
  const comparisonMode = getBlankComparisonMode(blank)
  const compareOptions = getBlankCompareOptions(blank)
  const rawText = normalizeWhitespace(rawValue)
  const answered = rawText.length > 0

  if (!answered) {
    return {
      answered: false,
      correct: false,
      userDisplay: '',
      correctDisplay: getBlankExpectedDisplay(blank),
    }
  }

  if (comparisonMode === 'ordered_sequence') {
    const actualTokens = tokenizeSequenceValue(rawValue)
    const expectedSequences = Array.isArray(blank.accepted_sequences) ? blank.accepted_sequences : []
    const correct = expectedSequences.some((expected) => sameOrderedTokens(actualTokens, expected, compareOptions))

    return {
      answered: true,
      correct,
      userDisplay: actualTokens.join(' '),
      correctDisplay: getBlankExpectedDisplay(blank),
    }
  }

  if (comparisonMode === 'unordered_set') {
    const actualTokens = tokenizeSequenceValue(rawValue)
    const expectedSets = Array.isArray(blank.accepted_sequences) ? blank.accepted_sequences : []
    const correct = expectedSets.some((expected) => sameUnorderedTokens(actualTokens, expected, compareOptions))

    return {
      answered: true,
      correct,
      userDisplay: actualTokens.join(' '),
      correctDisplay: getBlankExpectedDisplay(blank),
    }
  }

  const actualText = normalizeForCompare(rawValue, compareOptions)
  const acceptedAnswers = normalizeAcceptedAnswers(blank.accepted_answers)
  const correct = acceptedAnswers.some((answer) => normalizeForCompare(answer, compareOptions) === actualText)

  return {
    answered: true,
    correct,
    userDisplay: rawText,
    correctDisplay: getBlankExpectedDisplay(blank),
  }
}

export function getOptionText(options = [], key = '') {
  if (!key) return '未作答'

  const match = options.find((option) => option?.key === key)
  if (!match) return String(key)
  return `${match.key}. ${match.text}`
}

export function getObjectiveAnswerLabel(item, response) {
  if (!item) return '未作答'

  if (item.type === 'multiple_choice') {
    const values = normalizeChoiceArray(response)
    return values.length
      ? values.map((value) => getOptionText(item.options || [], value)).join(' / ')
      : '未作答'
  }

  if (item.type === 'fill_blank') {
    if (!response || typeof response !== 'object') return '未作答'

    const values = (item.blanks || [])
      .map((blank) => evaluateFillBlankBlank(blank, response[blank.blank_id]).userDisplay)
      .filter(Boolean)

    return values.length ? values.join(' / ') : '未作答'
  }

  return getOptionText(item.options || [], response || '')
}

export function getObjectiveCorrectLabel(item) {
  if (!item) return '--'

  if (item.type === 'multiple_choice') {
    return normalizeChoiceArray(item.answer?.correct)
      .map((value) => getOptionText(item.options || [], value))
      .join(' / ')
  }

  if (item.type === 'fill_blank') {
    return (item.blanks || [])
      .map((blank) => getBlankExpectedDisplay(blank))
      .join(' | ')
  }

  return getOptionText(item.options || [], item.answer?.correct || '')
}

export function isObjectiveAnswered(item, response) {
  if (!item || item.answer?.type !== 'objective') return false

  if (item.type === 'multiple_choice') {
    return normalizeChoiceArray(response).length > 0
  }

  if (item.type === 'fill_blank') {
    if (!response || typeof response !== 'object') return false
    return (item.blanks || []).every((blank) => evaluateFillBlankBlank(blank, response[blank.blank_id]).answered)
  }

  return isNonEmptyText(response)
}

export function isObjectiveCorrect(item, response) {
  if (!item || item.answer?.type !== 'objective') return false

  if (item.type === 'multiple_choice') {
    const actual = normalizeChoiceArray(response)
    const expected = normalizeChoiceArray(item.answer?.correct)
    return actual.length > 0 && actual.length === expected.length && actual.every((value, index) => value === expected[index])
  }

  if (item.type === 'fill_blank') {
    if (!response || typeof response !== 'object') return false
    return (item.blanks || []).every((blank) => evaluateFillBlankBlank(blank, response[blank.blank_id]).correct)
  }

  return response === item.answer?.correct
}

export function isResponseAnswered(item, response) {
  if (!item) return false

  if (item.type === 'reading') {
    if (!response || typeof response !== 'object') return false
    return (item.questions || []).every((question) => isNonEmptyText(response[question.id]))
  }

  if (item.answer?.type === 'subjective') {
    if (item.type === 'structured_form') {
      return Boolean(formatStructuredResponse(response, item.fields || []))
    }

    if (item.type === 'sql') {
      return isNonEmptyText(response?.text || response)
    }

    if (typeof response === 'string') return isNonEmptyText(response)
    return isNonEmptyText(response?.text)
  }

  return isObjectiveAnswered(item, response)
}

export function getObjectiveItemTotal(item) {
  if (!item) return 0

  if (item.type === 'reading') {
    return (item.questions || []).reduce((sum, question) => sum + (question.score || 0), 0)
  }

  if (item.type === 'fill_blank') {
    return (item.blanks || []).reduce((sum, blank) => sum + (blank.score || 0), 0)
  }

  return item.answer?.type === 'objective' ? item.score || 0 : 0
}

export function getObjectiveItemScore(item, response) {
  if (!item) return 0

  if (item.type === 'reading') {
    if (!response || typeof response !== 'object') return 0
    return (item.questions || []).reduce((sum, question) => (
      sum + (response[question.id] === question.answer?.correct ? question.score || 0 : 0)
    ), 0)
  }

  if (item.type === 'fill_blank') {
    if (!response || typeof response !== 'object') return 0
    return (item.blanks || []).reduce((sum, blank) => (
      sum + (evaluateFillBlankBlank(blank, response[blank.blank_id]).correct ? blank.score || 0 : 0)
    ), 0)
  }

  if (item.answer?.type === 'objective' && isObjectiveCorrect(item, response)) {
    return item.score || 0
  }

  return 0
}

export function getObjectiveWrongCount(item, response) {
  if (!item) return 0

  if (item.type === 'reading') {
    if (!response || typeof response !== 'object') return (item.questions || []).length
    return (item.questions || []).reduce((sum, question) => (
      sum + (response[question.id] === question.answer?.correct ? 0 : 1)
    ), 0)
  }

  if (item.type === 'fill_blank') {
    if (!response || typeof response !== 'object') return (item.blanks || []).length
    return (item.blanks || []).reduce((sum, blank) => (
      sum + (evaluateFillBlankBlank(blank, response[blank.blank_id]).correct ? 0 : 1)
    ), 0)
  }

  if (item.answer?.type === 'objective') {
    return isObjectiveCorrect(item, response) ? 0 : 1
  }

  return 0
}

export function getQuestionGroupMeta(item = {}) {
  if (item.type === 'reading') return { key: 'reading', label: '阅读理解' }
  if (item.type === 'translation') return { key: 'translation', label: '翻译题' }
  if (item.type === 'essay') return { key: 'essay', label: '作文题' }
  if (item.type === 'sql') return { key: 'sql', label: 'SQL 题' }
  if (item.type === 'structured_form') return { key: 'structured_form', label: '结构化作答' }
  if (item.type === 'subjective') return { key: 'subjective', label: '主观题' }
  if (item.type === 'multiple_choice') return { key: 'multiple_choice', label: '多项选择' }
  if (item.type === 'true_false') return { key: 'true_false', label: '判断题' }
  if (item.type === 'fill_blank' || item.source_type === 'cloze') return { key: 'fill_blank', label: '填空题' }
  return { key: 'single_choice', label: '单项选择' }
}

export function getQuestionTypeLabel(item) {
  return getQuestionGroupMeta(item).label
}

export function getWrongItemCategory(item = {}) {
  if (item.parentType === 'reading' || item.sourceType === 'reading') return 'reading'

  if (
    item.sourceType === 'cloze' ||
    item.source_type === 'cloze' ||
    String(item.contextTitle || '').includes('完形') ||
    (item.tags || []).some((tag) => String(tag).toLowerCase() === 'cloze')
  ) {
    return 'cloze'
  }

  if (item.type === 'fill_blank') return 'fill_blank'
  if (item.type === 'multiple_choice') return 'multiple_choice'
  if (item.type === 'true_false') return 'true_false'
  return 'single_choice'
}

export function getWrongItemCategoryLabel(category) {
  switch (category) {
    case 'reading':
      return '阅读理解'
    case 'cloze':
      return '完形填空'
    case 'fill_blank':
      return '填空题'
    case 'multiple_choice':
      return '多项选择'
    case 'true_false':
      return '判断题'
    default:
      return '单项选择'
  }
}
