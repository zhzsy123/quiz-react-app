import React from 'react'
import { getQuestionTypeMeta } from '../../entities/subject/model/subjects'
import { normalizeChoiceArray } from '../../entities/quiz/lib/objectiveAnswers'
import { getItemScoreBreakdown } from '../../entities/quiz/lib/scoring/compoundScoring'

const QUESTION_DISPLAY_META = {
  single_choice: {
    label: '单项选择题',
    shortLabel: '单选',
    gradingLabel: '自动判分',
  },
  multiple_choice: {
    label: '多项选择题',
    shortLabel: '多选',
    gradingLabel: '自动判分',
  },
  true_false: {
    label: '判断题',
    shortLabel: '判断',
    gradingLabel: '自动判分',
  },
  fill_blank: {
    label: '填空题',
    shortLabel: '填空',
    gradingLabel: '自动判分',
  },
  function_fill_blank: {
    label: '函数填空题',
    shortLabel: '函数填空',
    gradingLabel: '自动判分',
  },
  cloze: {
    label: '完形填空',
    shortLabel: '完形',
    gradingLabel: '自动判分',
  },
  reading: {
    label: '阅读理解',
    shortLabel: '阅读',
    gradingLabel: '自动判分',
  },
  translation: {
    label: '翻译题',
    shortLabel: '翻译',
    gradingLabel: 'AI评分',
  },
  essay: {
    label: '作文题',
    shortLabel: '作文',
    gradingLabel: 'AI评分',
  },
  short_answer: {
    label: '简答题',
    shortLabel: '简答',
    gradingLabel: 'AI评分',
  },
  case_analysis: {
    label: '案例分析题',
    shortLabel: '案例',
    gradingLabel: 'AI评分',
  },
  calculation: {
    label: '计算题',
    shortLabel: '计算',
    gradingLabel: 'AI评分',
  },
  operation: {
    label: '操作题',
    shortLabel: '操作',
    gradingLabel: 'AI评分',
  },
  programming: {
    label: '程序设计题',
    shortLabel: '程序',
    gradingLabel: 'AI评分',
  },
  sql: {
    label: 'SQL 题',
    shortLabel: 'SQL',
    gradingLabel: 'AI评分',
  },
  er_diagram: {
    label: 'E-R 图题',
    shortLabel: 'E-R图',
    gradingLabel: 'AI核题',
  },
  relational_algebra: {
    label: '关系代数题',
    shortLabel: '关系代数',
    gradingLabel: 'AI判等',
  },
  composite: {
    label: '综合题',
    shortLabel: '综合',
    gradingLabel: '混合判分',
  },
  generation_placeholder: {
    label: '生成中',
    shortLabel: '生成中',
    gradingLabel: 'AI生成',
  },
}

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

  if (item.type === 'generation_placeholder') {
    return false
  }

  if (item.type === 'composite') {
    if (!response || typeof response !== 'object') return false
    return (item.questions || []).every((question) => isAnswered(question, response[question.id]))
  }

  if (item.type === 'reading') {
    if (!response || typeof response !== 'object') return false
    const readingQuestions = Array.isArray(item.questions) ? item.questions : []
    return readingQuestions.length > 0 &&
      readingQuestions.every((question) => typeof response[question.id] === 'string' && response[question.id].length > 0)
  }

  if (item.type === 'multiple_choice') {
    return normalizeChoiceArray(response).length > 0
  }

  if (item.type === 'cloze') {
    if (!response || typeof response !== 'object') return false
    return (item.blanks || []).every(
      (blank) => typeof response[blank.blank_id] === 'string' && response[blank.blank_id].trim().length > 0
    )
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

export function getQuestionDisplayMeta(itemOrType) {
  const rawType =
    typeof itemOrType === 'string'
      ? itemOrType
      : itemOrType?.type === 'generation_placeholder'
        ? itemOrType?.generation_type_key || itemOrType?.source_type || 'generation_placeholder'
        : itemOrType?.source_type === 'cloze'
          ? 'cloze'
          : itemOrType?.type

  const normalizedType = getQuestionTypeMeta(rawType).key
  const fallbackMeta = getQuestionTypeMeta(normalizedType)
  const displayMeta = QUESTION_DISPLAY_META[normalizedType] || {}

  return {
    key: normalizedType,
    label: displayMeta.label || fallbackMeta.label || normalizedType,
    shortLabel: displayMeta.shortLabel || fallbackMeta.shortLabel || normalizedType,
    gradingLabel: displayMeta.gradingLabel || '',
  }
}

export function getNavGroupMeta(item) {
  const meta = getQuestionDisplayMeta(item)
  return {
    key: meta.key,
    label: meta.label,
    shortLabel: meta.shortLabel,
    gradingLabel: meta.gradingLabel,
  }
}

function extractReadingSectionLabel(item, fallbackIndex = 0) {
  const rawCandidates = [
    item?.section_label,
    item?.sectionLabel,
    item?.passage?.title,
    item?.title,
    item?.id,
  ]
    .filter(Boolean)
    .map((value) => String(value))

  for (const candidate of rawCandidates) {
    const explicitMatch = candidate.match(/\b([A-D])\b/i)
    if (explicitMatch) return explicitMatch[1].toUpperCase()

    const suffixMatch = candidate.match(/(?:_|-)([A-D])$/i)
    if (suffixMatch) return suffixMatch[1].toUpperCase()

    const readingMatch = candidate.match(/reading[_-]?([A-D])/i)
    if (readingMatch) return readingMatch[1].toUpperCase()

    const passageMatch = candidate.match(/passage\s*([A-D])/i)
    if (passageMatch) return passageMatch[1].toUpperCase()
  }

  return String.fromCharCode(65 + Math.max(0, fallbackIndex))
}

export function getReadingQuestionDisplayLabel(item, subIndex, fallbackIndex = 0) {
  const sectionLabel = extractReadingSectionLabel(item, fallbackIndex)
  return `${sectionLabel}-${subIndex + 1}`
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

export function buildFillBlankSlotHints(item) {
  if (item?.type !== 'fill_blank') return []
  const blanks = Array.isArray(item.blanks) ? item.blanks : []
  return blanks.map((blank, index) => ({
    blankId: blank?.blank_id ?? index + 1,
    label: `第 ${index + 1} 空`,
  }))
}

export function normalizeDisplayScore(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  const safe = Math.max(0, numeric)
  return Math.floor((safe + Number.EPSILON) * 2) / 2
}

export function formatDisplayScore(value) {
  return normalizeDisplayScore(value).toFixed(1)
}

export function getItemDisplayScore(item) {
  return Number(getItemScoreBreakdown(item).paperTotal || 0)
}

export function getGroupDisplayScore(items = []) {
  return items.reduce((sum, item) => sum + getItemDisplayScore(item), 0)
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
