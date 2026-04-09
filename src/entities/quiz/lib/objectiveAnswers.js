export function normalizeChoiceArray(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))].sort()
}

export function renderOptionLabel(option) {
  if (typeof option === 'string') return option
  if (!option?.key) return ''
  return `${option.key}. ${option.text}`
}

export function getOptionText(options = [], key = '', unansweredLabel = '未作答') {
  if (!key) return unansweredLabel
  const match = options.find((option) => option?.key === key)
  if (!match) return key
  return renderOptionLabel(match)
}

export function formatOptionLabel(options = [], key = '', unansweredLabel = '未作答') {
  return getOptionText(options, key, unansweredLabel)
}

function isFillBlankLike(item) {
  return item?.type === 'fill_blank' || item?.type === 'function_fill_blank'
}

function isClozeLike(item) {
  return item?.type === 'cloze'
}

export function isObjectiveGradable(item) {
  if (!item) return false

  if (item.type === 'multiple_choice') {
    return normalizeChoiceArray(item.answer?.correct).length > 0
  }

  if (isClozeLike(item)) {
    const blanks = Array.isArray(item.blanks) ? item.blanks : []
    return (
      blanks.length > 0 &&
      blanks.every(
        (blank) =>
          String(blank.correct || '').trim().length > 0 && Array.isArray(blank.options) && blank.options.length > 0
      )
    )
  }

  if (isFillBlankLike(item)) {
    const blanks = Array.isArray(item.blanks) ? item.blanks : []
    return (
      blanks.length > 0 &&
      blanks.every((blank) => Array.isArray(blank.accepted_answers) && blank.accepted_answers.length > 0)
    )
  }

  return typeof item.answer?.correct === 'string' && item.answer.correct.trim().length > 0
}

export function formatObjectiveAnswerLabel(item, response, unansweredLabel = '未作答') {
  if (!item) return unansweredLabel

  if (item.type === 'multiple_choice') {
    const values = normalizeChoiceArray(response)
    return values.length
      ? values.map((value) => getOptionText(item.options || [], value, unansweredLabel)).join(' / ')
      : unansweredLabel
  }

  if (isClozeLike(item)) {
    if (!response || typeof response !== 'object') return unansweredLabel
    return (
      (item.blanks || [])
        .map(
          (blank, index) =>
            `${index + 1}. ${getOptionText(blank.options || [], response[blank.blank_id] || '', unansweredLabel)}`
        )
        .join(' | ') || unansweredLabel
    )
  }

  if (isFillBlankLike(item)) {
    if (!response || typeof response !== 'object') return unansweredLabel
    return (
      item.blanks
        .map((blank) => String(response[blank.blank_id] || '').trim())
        .filter(Boolean)
        .join(' / ') || unansweredLabel
    )
  }

  return getOptionText(item.options || [], response || '', unansweredLabel)
}

export function getObjectiveAnswerLabel(item, response, unansweredLabel = '未作答') {
  return formatObjectiveAnswerLabel(item, response, unansweredLabel)
}

export function formatObjectiveCorrectAnswerLabel(item, unansweredLabel = '未作答') {
  if (!item) return unansweredLabel
  if (!isObjectiveGradable(item)) return '暂无标准答案'

  if (isClozeLike(item)) {
    return (item.blanks || [])
      .map((blank, index) => `${index + 1}. ${getOptionText(blank.options || [], blank.correct || '', unansweredLabel)}`)
      .join(' | ')
  }

  if (isFillBlankLike(item)) {
    return item.blanks.map((blank) => blank.accepted_answers.join(' / ')).join(' | ')
  }

  return formatObjectiveAnswerLabel(item, item.answer?.correct, unansweredLabel)
}

export function getObjectiveCorrectAnswerLabel(item, unansweredLabel = '未作答') {
  return formatObjectiveCorrectAnswerLabel(item, unansweredLabel)
}

export function isObjectiveAnswered(item, response) {
  if (!item) return false

  if (item.type === 'multiple_choice') {
    return normalizeChoiceArray(response).length > 0
  }

  if (isClozeLike(item)) {
    if (!response || typeof response !== 'object') return false
    return (item.blanks || []).every(
      (blank) => typeof response[blank.blank_id] === 'string' && response[blank.blank_id].trim().length > 0
    )
  }

  if (isFillBlankLike(item)) {
    if (!response || typeof response !== 'object') return false
    return item.blanks.every(
      (blank) => typeof response[blank.blank_id] === 'string' && response[blank.blank_id].trim().length > 0
    )
  }

  return typeof response === 'string' && response.trim().length > 0
}

export function isObjectiveCorrect(item, response) {
  if (!item || !isObjectiveGradable(item)) return false

  if (item.type === 'multiple_choice') {
    const actual = normalizeChoiceArray(response)
    const expected = normalizeChoiceArray(item.answer?.correct)
    return (
      actual.length > 0 &&
      actual.length === expected.length &&
      actual.every((value, index) => value === expected[index])
    )
  }

  if (isClozeLike(item)) {
    if (!response || typeof response !== 'object') return false
    return (item.blanks || []).every(
      (blank) => String(response[blank.blank_id] || '').trim() === String(blank.correct || '').trim()
    )
  }

  if (isFillBlankLike(item)) {
    if (!response || typeof response !== 'object') return false
    return item.blanks.every((blank) => {
      const userValue = String(response[blank.blank_id] || '').trim().toLowerCase()
      return blank.accepted_answers.some((candidate) => String(candidate).trim().toLowerCase() === userValue)
    })
  }

  return (response || '') === item.answer?.correct
}

export function isObjectiveResponseCorrect(item, response) {
  return isObjectiveCorrect(item, response)
}

export function isObjectiveWrong(item, response) {
  return isObjectiveAnswered(item, response) && isObjectiveGradable(item) && !isObjectiveCorrect(item, response)
}
