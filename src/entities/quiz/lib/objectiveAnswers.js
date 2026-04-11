export function normalizeChoiceArray(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))].sort()
}

function normalizeObjectiveText(value) {
  return String(value ?? '').trim().toLowerCase()
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

function buildBlankAcceptedAnswers(blank) {
  return Array.isArray(blank?.accepted_answers) ? blank.accepted_answers : []
}

function getFillBlankAllAcceptedAnswers(blanks = []) {
  const unique = new Map()
  blanks.forEach((blank) => {
    buildBlankAcceptedAnswers(blank).forEach((candidate) => {
      const normalized = normalizeObjectiveText(candidate)
      if (normalized && !unique.has(normalized)) {
        unique.set(normalized, String(candidate).trim())
      }
    })
  })
  return Array.from(unique.values())
}

export function isFillBlankOrderSensitive(item) {
  if (!isFillBlankLike(item)) return true
  if (item?.type === 'function_fill_blank') return true

  const explicit =
    item?.answer_order_matters ??
    item?.answer?.order_matters ??
    item?.evaluation?.order_matters ??
    item?.metadata?.answer_order_matters

  if (typeof explicit === 'boolean') return explicit
  return false
}

export function evaluateFillBlankResponse(item, response) {
  const blanks = Array.isArray(item?.blanks) ? item.blanks : []
  const orderSensitive = isFillBlankOrderSensitive(item)
  const allAcceptedAnswers = getFillBlankAllAcceptedAnswers(blanks)

  const blankResults = blanks.map((blank, index) => {
    const acceptedAnswers = buildBlankAcceptedAnswers(blank)
    const rawValue =
      response && typeof response === 'object' ? String(response[blank.blank_id] ?? '').trim() : ''
    return {
      blankId: blank.blank_id,
      blankIndex: index,
      value: rawValue,
      normalizedValue: normalizeObjectiveText(rawValue),
      acceptedAnswers,
      rationale: blank?.rationale || '',
      isCorrect: false,
      matchedBlankId: null,
      matchedAcceptedAnswers: acceptedAnswers,
      matchedRationale: blank?.rationale || '',
      orderSensitive,
    }
  })

  if (!blanks.length) {
    return {
      orderSensitive,
      blankResults,
      correctCount: 0,
      wrongCount: 0,
      isCorrect: false,
      allAcceptedAnswers,
    }
  }

  if (orderSensitive) {
    const results = blankResults.map((result) => {
      const isCorrect = result.acceptedAnswers.some(
        (candidate) => normalizeObjectiveText(candidate) === result.normalizedValue
      )
      return {
        ...result,
        isCorrect,
        matchedBlankId: isCorrect ? result.blankId : null,
      }
    })
    const correctCount = results.filter((result) => result.isCorrect).length
    return {
      orderSensitive,
      blankResults: results,
      correctCount,
      wrongCount: results.length - correctCount,
      isCorrect: results.length > 0 && correctCount === results.length,
      allAcceptedAnswers,
    }
  }

  const adjacency = blankResults.map((result) =>
    blanks
      .map((blank, blankIndex) => ({
        blankIndex,
        acceptedAnswers: buildBlankAcceptedAnswers(blank),
      }))
      .filter(
        ({ acceptedAnswers }) =>
          result.normalizedValue &&
          acceptedAnswers.some((candidate) => normalizeObjectiveText(candidate) === result.normalizedValue)
      )
      .map(({ blankIndex }) => blankIndex)
  )

  const blankMatchedUserIndex = Array(blanks.length).fill(-1)
  const userMatchOrder = adjacency
    .map((targetIndexes, userIndex) => ({ userIndex, targetIndexes }))
    .sort((left, right) => left.targetIndexes.length - right.targetIndexes.length)
    .map((entry) => entry.userIndex)

  function assignBlank(userIndex, visited = new Set()) {
    for (const blankIndex of adjacency[userIndex]) {
      if (visited.has(blankIndex)) continue
      visited.add(blankIndex)

      const currentUserIndex = blankMatchedUserIndex[blankIndex]
      if (currentUserIndex === -1 || assignBlank(currentUserIndex, visited)) {
        blankMatchedUserIndex[blankIndex] = userIndex
        return true
      }
    }
    return false
  }

  userMatchOrder.forEach((userIndex) => {
    if (!blankResults[userIndex].normalizedValue) return
    assignBlank(userIndex)
  })

  const userMatchedBlankIndex = Array(blankResults.length).fill(-1)
  blankMatchedUserIndex.forEach((userIndex, blankIndex) => {
    if (userIndex >= 0) userMatchedBlankIndex[userIndex] = blankIndex
  })

  const results = blankResults.map((result, userIndex) => {
    const matchedBlankIndex = userMatchedBlankIndex[userIndex]
    if (matchedBlankIndex === -1) {
      return {
        ...result,
        matchedAcceptedAnswers: allAcceptedAnswers,
        matchedRationale: '',
      }
    }

    const matchedBlank = blanks[matchedBlankIndex]
    return {
      ...result,
      isCorrect: true,
      matchedBlankId: matchedBlank?.blank_id ?? null,
      matchedAcceptedAnswers: buildBlankAcceptedAnswers(matchedBlank),
      matchedRationale: matchedBlank?.rationale || '',
    }
  })

  const correctCount = results.filter((result) => result.isCorrect).length
  return {
    orderSensitive,
    blankResults: results,
    correctCount,
    wrongCount: results.length - correctCount,
    isCorrect: results.length > 0 && correctCount === results.length,
    allAcceptedAnswers,
  }
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
    const evaluation = evaluateFillBlankResponse(item, {})
    if (evaluation.orderSensitive) {
      return item.blanks.map((blank) => buildBlankAcceptedAnswers(blank).join(' / ')).join(' | ')
    }
    return evaluation.allAcceptedAnswers.join(' / ')
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
    return evaluateFillBlankResponse(item, response).isCorrect
  }

  return (response || '') === item.answer?.correct
}

export function isObjectiveResponseCorrect(item, response) {
  return isObjectiveCorrect(item, response)
}

export function isObjectiveWrong(item, response) {
  return isObjectiveAnswered(item, response) && isObjectiveGradable(item) && !isObjectiveCorrect(item, response)
}
