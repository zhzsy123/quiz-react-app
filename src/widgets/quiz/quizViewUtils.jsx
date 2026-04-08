import React from 'react'
import { getQuestionTypeMeta } from '../../entities/subject/model/subjects'
import { normalizeChoiceArray } from '../../entities/quiz/lib/objectiveAnswers'

export function difficultyClass(difficulty = '') {
  switch ((difficulty || '').toLowerCase()) {
    case 'easy':
      return 'tag easy'
    case 'medium':
      return 'tag medium'
    case 'hard':
      return 'tag hard'
    default:
      return 'tag'
  }
}

export function getSubjectiveText(response) {
  if (typeof response === 'string') return response
  return response?.text || ''
}

export function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

export function isAnswered(item, response) {
  if (!item) return false

  if (item.type === 'composite') {
    if (!response || typeof response !== 'object') return false
    return (item.questions || []).every((question) => isAnswered(question, response[question.id]))
  }

  if (item.type === 'reading') {
    if (!response || typeof response !== 'object') return false
    return item.questions.every((question) => typeof response[question.id] === 'string' && response[question.id].length > 0)
  }

  if (item.type === 'multiple_choice') {
    return normalizeChoiceArray(response).length > 0
  }

  if (item.type === 'fill_blank') {
    if (!response || typeof response !== 'object') return false
    return item.blanks.every((blank) => typeof response[blank.blank_id] === 'string' && response[blank.blank_id].trim().length > 0)
  }

  if (item.answer?.type === 'subjective') {
    if (typeof response === 'string') return response.trim().length > 0
    return Boolean(response?.text?.trim())
  }

  return typeof response === 'string' && response.length > 0
}

export function getSpoilerTags(item) {
  const hiddenTags = new Set()
  if (item.type) hiddenTags.add(String(item.type).toLowerCase())
  if (item.source_type) hiddenTags.add(String(item.source_type).toLowerCase())
  if (item.direction) hiddenTags.add(String(item.direction).toLowerCase())
  if (item.essay_type) hiddenTags.add(String(item.essay_type).toLowerCase())
  return (item.tags || []).filter((tag) => !hiddenTags.has(String(tag).toLowerCase()))
}

export function getNavGroupMeta(item) {
  const normalizedType = item.type === 'fill_blank' && item.source_type === 'cloze' ? 'cloze' : item.type
  const meta = getQuestionTypeMeta(normalizedType)
  return {
    key: meta.key,
    label: meta.label,
  }
}

export function formatRemainingSeconds(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function buildPreviewText(text, maxLength = 120) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}

export function renderFormattedMaterial(content, format, className = 'question-context-body') {
  if (!content) return null
  if (['code', 'sql'].includes(format)) {
    return (
      <pre className={className}>
        <code>{content}</code>
      </pre>
    )
  }
  return <div className={className}>{content}</div>
}
