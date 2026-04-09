function getRelationalAlgebraSubquestions(item = {}) {
  if (Array.isArray(item.subquestions) && item.subquestions.length > 0) {
    return item.subquestions
  }

  if (Array.isArray(item.questions) && item.questions.length > 0) {
    return item.questions
  }

  return []
}

export function isRelationalAlgebraQuestion(item) {
  return item?.type === 'relational_algebra'
}

export function createRelationalAlgebraAnswerState(item = {}, existingState = {}) {
  const subquestions = getRelationalAlgebraSubquestions(item)
  const existingResponses =
    existingState && typeof existingState === 'object' && existingState.responses && typeof existingState.responses === 'object'
      ? existingState.responses
      : {}

  const responses = {}
  subquestions.forEach((subQuestion) => {
    const subQuestionId = subQuestion?.id
    if (!subQuestionId) return
    responses[subQuestionId] = typeof existingResponses[subQuestionId] === 'string' ? existingResponses[subQuestionId] : ''
  })

  return {
    type: 'relational_algebra',
    responses,
    text: buildRelationalAlgebraSubmissionText(item, responses),
  }
}

export function buildRelationalAlgebraSubmissionText(item = {}, responses = {}) {
  const subquestions = getRelationalAlgebraSubquestions(item)
  if (!subquestions.length) return ''

  const allAnswered = subquestions.every((subQuestion) => {
    const subQuestionId = subQuestion?.id
    if (!subQuestionId) return false
    return typeof responses[subQuestionId] === 'string' && responses[subQuestionId].trim().length > 0
  })

  if (!allAnswered) return ''

  return subquestions
    .map((subQuestion, index) => {
      const subQuestionId = subQuestion?.id
      const label = subQuestion?.label || `(${index + 1})`
      const value = String(responses[subQuestionId] || '').trim()
      return `${label} ${value}`.trim()
    })
    .join('\n')
}

export function updateRelationalAlgebraAnswer(item = {}, existingState = {}, subQuestionId, text) {
  const nextState = createRelationalAlgebraAnswerState(item, existingState)
  if (!subQuestionId) return nextState

  return {
    ...nextState,
    responses: {
      ...nextState.responses,
      [subQuestionId]: text,
    },
    text: buildRelationalAlgebraSubmissionText(item, {
      ...nextState.responses,
      [subQuestionId]: text,
    }),
  }
}

export function createRelationalAlgebraExpandedMap(item = {}, existingMap = {}) {
  const subquestions = getRelationalAlgebraSubquestions(item)
  return subquestions.reduce((map, subQuestion) => {
    const subQuestionId = subQuestion?.id
    if (!subQuestionId) return map
    map[subQuestionId] = Boolean(existingMap?.[subQuestionId])
    return map
  }, {})
}

export function toggleRelationalAlgebraSubQuestionExpanded(item = {}, existingMap = {}, subQuestionId, nextExpanded) {
  const nextMap = createRelationalAlgebraExpandedMap(item, existingMap)
  if (!subQuestionId) return nextMap

  nextMap[subQuestionId] =
    typeof nextExpanded === 'boolean' ? nextExpanded : !Boolean(nextMap[subQuestionId])
  return nextMap
}

export function isRelationalAlgebraAnswered(item = {}, response) {
  const subquestions = getRelationalAlgebraSubquestions(item)
  if (!subquestions.length) return false
  if (!response || typeof response !== 'object') return false

  return subquestions.every((subQuestion) => {
    const subQuestionId = subQuestion?.id
    if (!subQuestionId) return false
    return typeof response.responses?.[subQuestionId] === 'string' && response.responses[subQuestionId].trim().length > 0
  })
}

export function normalizeRelationalAlgebraProgress(item = {}, rawState = {}) {
  const normalized = createRelationalAlgebraAnswerState(item, rawState)
  const expandedMap = createRelationalAlgebraExpandedMap(item, rawState?.expandedMap || {})
  return {
    ...normalized,
    expandedMap,
  }
}

