function toId(value) {
  if (value === undefined || value === null) return ''
  return String(value)
}

export function getNestedStepIds(item = {}) {
  switch (item?.type) {
    case 'reading':
      return Array.isArray(item.questions) ? item.questions.map((question) => toId(question?.id)).filter(Boolean) : []
    case 'cloze':
      return Array.isArray(item.blanks) ? item.blanks.map((blank) => toId(blank?.blank_id)).filter(Boolean) : []
    case 'composite':
      return Array.isArray(item.questions) ? item.questions.map((question) => toId(question?.id)).filter(Boolean) : []
    case 'relational_algebra':
      return Array.isArray(item.subquestions)
        ? item.subquestions.map((subquestion) => toId(subquestion?.id)).filter(Boolean)
        : []
    default:
      return []
  }
}

export function getFirstNestedStepId(item = {}) {
  return getNestedStepIds(item)[0] || ''
}

export function getNextNestedStepId(item = {}, currentStepId) {
  const stepIds = getNestedStepIds(item)
  if (!stepIds.length) return ''

  const normalizedCurrent = toId(currentStepId)
  if (!normalizedCurrent) return stepIds[0] || ''

  const currentIndex = stepIds.indexOf(normalizedCurrent)
  if (currentIndex === -1) return stepIds[0] || ''
  return stepIds[currentIndex + 1] || ''
}

export function hasNestedSteps(item = {}) {
  return getNestedStepIds(item).length > 0
}

export function normalizeNestedFocusMap(quiz = {}, rawMap = {}) {
  const nextMap = {}
  const items = Array.isArray(quiz?.items) ? quiz.items : []

  items.forEach((item) => {
    const stepIds = getNestedStepIds(item)
    if (!stepIds.length || !item?.id) return

    const persistedFocus = toId(rawMap?.[item.id])
    nextMap[item.id] = stepIds.includes(persistedFocus) ? persistedFocus : stepIds[0]
  })

  return nextMap
}

export function setNestedFocusForItem(currentMap = {}, item = {}, nextStepId) {
  if (!item?.id) return currentMap

  const stepIds = getNestedStepIds(item)
  if (!stepIds.length) return currentMap

  const normalizedNextStepId = toId(nextStepId)
  const resolvedStepId = stepIds.includes(normalizedNextStepId) ? normalizedNextStepId : stepIds[0]

  return {
    ...currentMap,
    [item.id]: resolvedStepId,
  }
}
