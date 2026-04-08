import { getQuestionTypeMeta } from '../../subject/model/subjects.js'

function clipText(text = '', maxLength = 120) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}

function resolveIndex(indexOrValidation) {
  if (typeof indexOrValidation === 'number' && Number.isFinite(indexOrValidation)) {
    return indexOrValidation
  }
  if (typeof indexOrValidation === 'string') {
    const parsed = Number(indexOrValidation)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function resolveMeta(indexOrValidation, meta) {
  if (meta && typeof meta === 'object') return meta
  if (indexOrValidation && typeof indexOrValidation === 'object' && !Array.isArray(indexOrValidation)) {
    return meta && typeof meta === 'object' ? meta : {}
  }
  return meta && typeof meta === 'object' ? meta : {}
}

export function buildQuestionPreview(question, indexOrValidation = 0, meta) {
  const displayTypeKey = question?.source_type || question?.type
  const typeMeta = getQuestionTypeMeta(displayTypeKey)
  const prompt = clipText(question?.prompt || question?.material_title || question?.title || '')
  const score = Number(question?.score) || 0
  const answerType = question?.answer?.type || (question?.type === 'composite' ? 'compound' : 'objective')
  const index = resolveIndex(indexOrValidation)
  const previewMeta = resolveMeta(indexOrValidation, meta)

  return {
    id: question?.id || `question_${index + 1}`,
    type: displayTypeKey || typeMeta.key,
    subject: previewMeta?.subject || '',
    questionId: question?.id || `question_${index + 1}`,
    index: index + 1,
    typeKey: typeMeta.key,
    typeLabel: typeMeta.label,
    shortLabel: typeMeta.shortLabel,
    family: typeMeta.family,
    score,
    answerType,
    previewText: prompt,
    hasOptions: Array.isArray(question?.options) && question.options.length > 0,
    hasChildren: Array.isArray(question?.questions) && question.questions.length > 0,
  }
}
