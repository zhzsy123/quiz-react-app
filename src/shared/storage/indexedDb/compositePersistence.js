function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeCompositeContext(item = {}) {
  return {
    composite_id: item.id || '',
    composite_prompt: item.prompt || '',
    material_title: item.material_title || '',
    material: item.material || '',
    material_format: item.material_format || '',
    presentation: item.presentation || '',
    deliverable_type: item.deliverable_type || '',
    tags: Array.isArray(item.tags) ? [...item.tags] : [],
    assets: Array.isArray(item.assets) ? clone(item.assets) : [],
  }
}

export function buildQuestionKey(question = {}) {
  const compositeId = question.composite_context?.composite_id
  if (compositeId && question.id) {
    return `${compositeId}:${question.id}`
  }
  return question.id || question.questionKey || ''
}

export function decorateCompositeItems(items = []) {
  return (items || []).map((item) => {
    if (!item || item.type !== 'composite' || !Array.isArray(item.questions)) {
      return clone(item)
    }

    const compositeContext = normalizeCompositeContext(item)
    return {
      ...clone(item),
      composite_context: compositeContext,
      questions: item.questions.map((question) => {
        const nextQuestion = {
          ...clone(question),
          composite_context: {
            ...compositeContext,
            ...(question?.composite_context || {}),
            tags: Array.isArray(question?.composite_context?.tags)
              ? [...question.composite_context.tags]
              : compositeContext.tags,
            assets: Array.isArray(question?.composite_context?.assets)
              ? clone(question.composite_context.assets)
              : compositeContext.assets,
          },
        }
        nextQuestion.questionKey = buildQuestionKey(nextQuestion)
        return nextQuestion
      }),
    }
  })
}

export function buildCompositeQuestionSnapshotMap(items = []) {
  const snapshotMap = {}

  ;(items || []).forEach((item) => {
    if (!item || item.type !== 'composite' || !Array.isArray(item.questions)) return

    item.questions.forEach((question) => {
      const questionKey = buildQuestionKey(question)
      if (!questionKey) return
      snapshotMap[questionKey] = clone(question)
    })
  })

  return snapshotMap
}

export function buildCompositeAnswerSnapshotMap(items = [], answersSnapshot = {}) {
  const answerMap = {}

  ;(items || []).forEach((item) => {
    if (!item || item.type !== 'composite' || !Array.isArray(item.questions)) return

    const compositeAnswers = answersSnapshot?.[item.id]
    if (!compositeAnswers || typeof compositeAnswers !== 'object') return

    item.questions.forEach((question) => {
      const questionKey = buildQuestionKey(question)
      if (!questionKey) return
      if (!(question.id in compositeAnswers)) return
      answerMap[questionKey] = clone(compositeAnswers[question.id])
    })
  })

  return answerMap
}

export function normalizeWrongbookEntry(entry = {}) {
  const nextEntry = clone(entry)
  const compositeContext = entry?.composite_context

  if (compositeContext?.composite_id) {
    nextEntry.composite_context = {
      composite_id: compositeContext.composite_id || '',
      composite_prompt: compositeContext.composite_prompt || '',
      material_title: compositeContext.material_title || '',
      material: compositeContext.material || '',
      material_format: compositeContext.material_format || '',
      presentation: compositeContext.presentation || '',
      deliverable_type: compositeContext.deliverable_type || '',
      tags: Array.isArray(compositeContext.tags) ? [...compositeContext.tags] : [],
      assets: Array.isArray(compositeContext.assets) ? clone(compositeContext.assets) : [],
    }
  }

  if (!nextEntry.questionKey) {
    if (nextEntry.composite_context?.composite_id && nextEntry.subQuestionId) {
      nextEntry.questionKey = `${nextEntry.composite_context.composite_id}:${nextEntry.subQuestionId}`
    } else if (nextEntry.questionId) {
      nextEntry.questionKey = nextEntry.questionId
    }
  }

  return nextEntry
}
