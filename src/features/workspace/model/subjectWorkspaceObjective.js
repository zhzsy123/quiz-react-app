import {
  formatObjectiveAnswerLabel,
  formatOptionLabel,
  getObjectiveAnswerLabel,
  isObjectiveAnswered,
  isObjectiveGradable,
  isObjectiveResponseCorrect,
} from '../../../entities/quiz/lib/objectiveAnswers.js'
import { isRelationalAlgebraAnswered } from './subjectWorkspaceRelationalAlgebra.js'

export function isNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function createPendingAiReview(subjectivePendingScore) {
  return {
    status: 'pending',
    provider: 'deepseek',
    reviewedAt: null,
    totalSubjectiveScore: 0,
    totalScore: null,
    subjectivePendingTotal: subjectivePendingScore,
    overallComment: '',
    weaknessSummary: [],
    questionReviews: {},
    error: '',
  }
}

export function getExplainEntryKey(itemId, subQuestionId = '') {
  return subQuestionId ? `${itemId}:${subQuestionId}` : itemId
}

export function clipText(text = '', maxLength = 180) {
  if (typeof text !== 'string') return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

export function isResponseAnswered(item, response) {
  if (!item) return false
  if (item.type === 'composite') {
    if (!response || typeof response !== 'object') return false
    return (item.questions || []).every((question) => isResponseAnswered(question, response[question.id]))
  }
  if (item.type === 'reading') {
    if (!response || typeof response !== 'object') return false
    return item.questions.every((question) => isNonEmptyText(response[question.id]))
  }
  if (item.type === 'cloze') {
    if (!response || typeof response !== 'object') return false
    return (item.blanks || []).every((blank) => isNonEmptyText(response[blank.blank_id]))
  }
  if (item.type === 'relational_algebra') {
    return isRelationalAlgebraAnswered(item, response)
  }
  if (item.answer?.type === 'subjective') {
    return Boolean(response?.text?.trim())
  }
  return isObjectiveAnswered(item, response)
}

export function getObjectiveItemTotal(item) {
  if (!item) return 0
  if (item.type === 'composite') {
    return (item.questions || []).reduce((sum, question) => sum + getObjectiveItemTotal(question), 0)
  }
  if (item.type === 'reading') {
    return item.questions.reduce((sum, question) => sum + (question.score || 0), 0)
  }
  if (item.type === 'cloze') {
    return (item.blanks || []).reduce((sum, blank) => sum + (blank.score || 0), 0)
  }
  if (item.type === 'fill_blank') {
    return item.blanks.reduce((sum, blank) => sum + (blank.score || 0), 0)
  }
  return item.answer?.type === 'objective' ? item.score || 0 : 0
}

export function getObjectiveItemScore(item, response) {
  if (!item) return 0
  if (item.type === 'composite') {
    if (!response || typeof response !== 'object') return 0
    return (item.questions || []).reduce(
      (sum, question) => sum + getObjectiveItemScore(question, response[question.id]),
      0
    )
  }
  if (item.type === 'reading') {
    if (!response || typeof response !== 'object') return 0
    return item.questions.reduce((sum, question) => {
      if (!isObjectiveGradable(question)) return sum
      return sum + (response[question.id] === question.answer?.correct ? question.score || 0 : 0)
    }, 0)
  }
  if (item.type === 'cloze') {
    if (!response || typeof response !== 'object') return 0
    return (item.blanks || []).reduce((sum, blank) => {
      return sum + (String(response[blank.blank_id] || '').trim() === String(blank.correct || '').trim() ? blank.score || 0 : 0)
    }, 0)
  }
  if (item.type === 'fill_blank') {
    if (!response || typeof response !== 'object') return 0
    return item.blanks.reduce((sum, blank) => {
      const userValue = String(response[blank.blank_id] || '').trim().toLowerCase()
      const isCorrect = blank.accepted_answers.some((candidate) => String(candidate).trim().toLowerCase() === userValue)
      return sum + (isCorrect ? blank.score || 0 : 0)
    }, 0)
  }
  if (item.answer?.type === 'objective' && isObjectiveResponseCorrect(item, response)) {
    return item.score || 0
  }
  return 0
}

export function getObjectiveWrongCount(item, response) {
  if (!item) return 0
  if (item.type === 'composite') {
    if (!response || typeof response !== 'object') {
      return (item.questions || []).reduce((sum, question) => sum + getObjectiveWrongCount(question, undefined), 0)
    }
    return (item.questions || []).reduce(
      (sum, question) => sum + getObjectiveWrongCount(question, response[question.id]),
      0
    )
  }
  if (item.type === 'reading') {
    const readingQuestions = Array.isArray(item.questions) ? item.questions : []
    const gradableQuestions = readingQuestions.filter((question) => isObjectiveGradable(question))
    if (!response || typeof response !== 'object') return gradableQuestions.length
    return readingQuestions.reduce(
      (sum, question) =>
        sum + (!isObjectiveGradable(question) || response[question.id] === question.answer?.correct ? 0 : 1),
      0
    )
  }
  if (item.type === 'cloze') {
    const blanks = Array.isArray(item.blanks) ? item.blanks : []
    if (!response || typeof response !== 'object') return blanks.length
    return blanks.reduce((sum, blank) => {
      return sum + (String(response[blank.blank_id] || '').trim() === String(blank.correct || '').trim() ? 0 : 1)
    }, 0)
  }
  if (item.type === 'fill_blank') {
    if (!response || typeof response !== 'object') return item.blanks.length
    return item.blanks.reduce((sum, blank) => {
      const userValue = String(response[blank.blank_id] || '').trim().toLowerCase()
      const isCorrect = blank.accepted_answers.some((candidate) => String(candidate).trim().toLowerCase() === userValue)
      return sum + (isCorrect ? 0 : 1)
    }, 0)
  }
  if (item.answer?.type === 'objective' && isObjectiveGradable(item)) {
    return isObjectiveResponseCorrect(item, response) ? 0 : 1
  }
  return 0
}

export function buildCompositeContext(item) {
  return {
    composite_id: item.id,
    composite_prompt: item.prompt || '',
    material_title: item.material_title || item.context_title || '',
    material: item.material || item.context || '',
    material_format: item.material_format || item.context_format || '',
    presentation: item.presentation || '',
    deliverable_type: item.deliverable_type || '',
    tags: item.tags || [],
    assets: item.assets || [],
  }
}

export function buildPersistedItemsSnapshot(items = []) {
  return items.map((item) => {
    if (item?.type !== 'composite') return item

    const compositeContext = buildCompositeContext(item)
    return {
      ...item,
      questions: (item.questions || []).map((question) => ({
        ...question,
        questionKey: `${item.id}:${question.id}`,
        composite_context: compositeContext,
      })),
    }
  })
}

export function getCompositeSubQuestionResponse(item, answers, subQuestionId) {
  return answers[item.id]?.[subQuestionId]
}

export function formatObjectiveText(item, response) {
  return formatObjectiveAnswerLabel(item, response)
}

export function formatOptionText(options, value) {
  return formatOptionLabel(options, value)
}

export function formatObjectiveAnswer(item, value) {
  return getObjectiveAnswerLabel(item, value)
}

export { isObjectiveResponseCorrect }
