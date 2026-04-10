import { getQuestionTypeMeta, getSubjectMeta } from '../../subject/model/subjects'
import { createEmptyImportPreview } from './documentImportContracts'

function normalizeExcerpt(value, fallback = '题干预览不可用') {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return fallback
  return text.length > 120 ? `${text.slice(0, 120)}…` : text
}

function buildQuestionExcerpt(item = {}) {
  if (item.type === 'reading') {
    return normalizeExcerpt(item.passage?.content || item.passage?.body || item.passage?.text || item.prompt, '阅读材料预览不可用')
  }

  if (item.type === 'cloze') {
    return normalizeExcerpt(item.article || item.prompt, '完形文章预览不可用')
  }

  if (item.type === 'composite') {
    return normalizeExcerpt(item.prompt || item.context || item.material, '综合题预览不可用')
  }

  return normalizeExcerpt(item.prompt || item.context || item.material)
}

function buildQuestionContent(item = {}) {
  if (item.type === 'reading') {
    return item.passage?.content || item.passage?.body || item.passage?.text || ''
  }

  if (item.type === 'cloze') {
    return item.article || ''
  }

  if (item.type === 'composite') {
    return item.material || item.context || ''
  }

  return item.context || ''
}

function getSubQuestionCount(item = {}) {
  if (item.type === 'reading') return Array.isArray(item.questions) ? item.questions.length : 0
  if (item.type === 'cloze') return Array.isArray(item.blanks) ? item.blanks.length : 0
  if (item.type === 'composite') return Array.isArray(item.questions) ? item.questions.length : 0
  return 0
}

function buildQuestionPreviews(items = []) {
  return items.map((item, index) => {
    const typeKey = item.source_type || item.type || 'unknown'
    const typeMeta = getQuestionTypeMeta(typeKey)
    const subQuestionCount = getSubQuestionCount(item)

    return {
      id: item.id || `${typeKey}-${index + 1}`,
      index: index + 1,
      type: typeKey,
      label: typeMeta.shortLabel || typeMeta.label || typeKey,
      score: Number(item.score) || 0,
      excerpt: buildQuestionExcerpt(item),
      content: buildQuestionContent(item),
      subQuestionCount,
      prompt:
        item.title ||
        item.prompt ||
        item.context_title ||
        typeMeta.label ||
        '未命名题目',
    }
  })
}

export function buildImportPreview({
  normalizedDocument,
  subjectKey,
  warnings = [],
  invalidReasons = [],
  diagnostics = null,
} = {}) {
  const preview = createEmptyImportPreview()
  if (!normalizedDocument?.quiz) {
    return preview
  }

  const subjectMeta = getSubjectMeta(subjectKey || normalizedDocument.quiz.subject)
  const items = normalizedDocument.quiz.items || []
  const scoreBreakdown = normalizedDocument.scoreBreakdown || { paperTotal: 0 }
  const typeCounter = new Map()

  items.forEach((item) => {
    const key = item.source_type || item.type || 'unknown'
    typeCounter.set(key, (typeCounter.get(key) || 0) + 1)
  })

  return {
    title: normalizedDocument.quiz.title || '未命名试卷',
    subject: subjectMeta.shortLabel || subjectMeta.label || subjectMeta.key,
    questionCount: items.length,
    totalScore: Number(scoreBreakdown.paperTotal) || 0,
    validCount: items.length,
    warningCount: warnings.length,
    invalidCount: invalidReasons.length,
    questionPreviews: buildQuestionPreviews(items),
    typeStats: Array.from(typeCounter.entries()).map(([type, count]) => {
      const typeMeta = getQuestionTypeMeta(type)
      return {
        type,
        label: typeMeta.shortLabel || typeMeta.label || type,
        count,
      }
    }),
    diagnostics,
  }
}
