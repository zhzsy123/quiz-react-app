import { normalizeQuizPayload } from '../../../entities/quiz/lib/normalize/normalizeQuizPayload'
import { validateQuizPayload } from '../../../entities/quiz/lib/validation/validateQuizPayload'
import { getQuizScoreBreakdown } from '../../../entities/quiz/lib/scoring/getQuizScoreBreakdown'
import { buildQuestionPreview } from './questionGeneratorPreview'

export function createInitialGeneratorState(initialOpen = false) {
  return {
    open: initialOpen,
    status: 'idle',
    config: {},
    meta: {},
    draftQuestions: [],
    error: '',
    saveResult: null,
  }
}

export function createQuestionPayload(question, config = {}, meta = {}) {
  return {
    schema_version: config.schema_version || meta.schema_version || 'draft',
    title: config.title || meta.title || '未命名草稿试卷',
    subject: config.subject || meta.subject || '',
    description: config.description || meta.description || '',
    duration_minutes: Number(config.duration_minutes || meta.duration_minutes || 0) || 0,
    questions: [question],
  }
}

export function normalizeGeneratedQuestion(question, config = {}, meta = {}) {
  const previewMeta = {
    ...meta,
    ...config,
  }
  const payload = createQuestionPayload(question, config, meta)
  const validation = validateQuizPayload(payload)

  if (!validation.isValid) {
    return {
      status: 'invalid',
      rawQuestion: question,
      normalizedQuestion: null,
      validation,
      preview: buildQuestionPreview(question, validation, previewMeta),
      scoreBreakdown: null,
      error: validation.errors[0] || '生成题目无效',
      receivedAt: Date.now(),
    }
  }

  try {
    const normalized = normalizeQuizPayload(payload)
    const normalizedItems = normalized.items || []
    const normalizedQuestion = normalizedItems.length === 1 ? normalizedItems[0] : question
    const previewSource = normalizedItems.length === 1 ? normalizedItems[0] : question
    const scoreBreakdown = getQuizScoreBreakdown(normalizedItems)
    const draftStatus =
      validation.warnings.length > 0 || (normalized.compatibility?.skippedCount || 0) > 0 ? 'warning' : 'valid'

    return {
      status: draftStatus,
      rawQuestion: question,
      normalizedQuestion,
      normalizedItems,
      validation,
      preview: buildQuestionPreview(previewSource, validation, previewMeta),
      scoreBreakdown,
      error: '',
      receivedAt: Date.now(),
      normalizedPaper: normalized,
    }
  } catch (error) {
    return {
      status: 'invalid',
      rawQuestion: question,
      normalizedQuestion: null,
      normalizedItems: [],
      validation,
      preview: buildQuestionPreview(question, validation, previewMeta),
      scoreBreakdown: null,
      error: error?.message || '生成题目标准化失败',
      receivedAt: Date.now(),
    }
  }
}

export function mergeGeneratorMeta(baseMeta = {}, patch = {}) {
  return {
    ...baseMeta,
    ...patch,
  }
}

export function summarizeDraftQuestions(draftQuestions = []) {
  return draftQuestions.reduce(
    (summary, entry) => {
      summary.total += 1
      summary[entry.status] += 1
      return summary
    },
    {
      total: 0,
      valid: 0,
      warning: 0,
      invalid: 0,
    }
  )
}
