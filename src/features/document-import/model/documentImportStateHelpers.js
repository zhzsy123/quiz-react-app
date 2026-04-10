import { DOCUMENT_IMPORT_PREVIEW_POLICY } from '../../../entities/document-import/lib/documentImportContracts'

export const DOCUMENT_IMPORT_BUSY_STATUSES = new Set([
  'reading_file',
  'extracting_text',
  'calling_ai',
  'validating',
  'saving',
  'launching',
])

export const DOCUMENT_IMPORT_STAGE_ACTIVITY_META = {
  reading_file: { id: 'reading_file', title: '读取文件' },
  extracting_text: { id: 'extracting_text', title: '提取文本' },
  calling_ai: { id: 'calling_ai', title: 'AI 解析试卷' },
  validating: { id: 'validating', title: '校验与标准化' },
  saving: { id: 'saving', title: '保存到题库' },
  launching: { id: 'launching', title: '进入练习' },
}

export function buildDocumentImportFileMeta(file) {
  if (!file) return null
  return {
    name: file.name || '',
    size: Number(file.size) || 0,
    mimeType: file.type || '',
  }
}

export function appendDocumentImportLog(currentLogs = [], message) {
  if (!message) return currentLogs
  return [...currentLogs, message]
}

function normalizeActivityPatch(patch = {}, entries = []) {
  const id = patch.id || `activity-${entries.length + 1}`
  const details = Array.isArray(patch.details)
    ? patch.details
    : patch.detail
      ? [patch.detail]
      : []

  return {
    id,
    title: patch.title || '处理中',
    status: patch.status || 'running',
    summary: patch.summary || '',
    details,
    meta: patch.meta || '',
  }
}

export function upsertDocumentImportActivity(entries = [], patch = {}) {
  const nextEntry = normalizeActivityPatch(patch, entries)
  const index = entries.findIndex((entry) => entry.id === nextEntry.id)

  if (index < 0) {
    return [...entries, nextEntry]
  }

  const current = entries[index]
  const mergedDetails = [...(current.details || [])]
  nextEntry.details.forEach((detail) => {
    if (detail && !mergedDetails.includes(detail)) {
      mergedDetails.push(detail)
    }
  })

  const mergedEntry = {
    ...current,
    ...nextEntry,
    details: mergedDetails,
  }

  return [...entries.slice(0, index), mergedEntry, ...entries.slice(index + 1)]
}

function markOtherStagesCompleted(entries = [], activeStage) {
  return entries.map((entry) => {
    if (!DOCUMENT_IMPORT_STAGE_ACTIVITY_META[entry.id] || entry.id === activeStage) return entry
    if (entry.status === 'running') {
      return { ...entry, status: 'completed' }
    }
    return entry
  })
}

export function applyDocumentImportStageActivity(entries = [], stage, message) {
  const meta = DOCUMENT_IMPORT_STAGE_ACTIVITY_META[stage]
  if (!meta) return entries

  const completedEntries = markOtherStagesCompleted(entries, meta.id)
  return upsertDocumentImportActivity(completedEntries, {
    id: meta.id,
    title: meta.title,
    status: 'running',
    summary: message || '',
    detail: message || '',
  })
}

export function markDocumentImportActivityCompleted(entries = [], id, message = '') {
  return upsertDocumentImportActivity(entries, {
    id,
    status: 'completed',
    summary: message || undefined,
    detail: message || undefined,
  })
}

export function markDocumentImportActivityFailed(entries = [], id, title, message) {
  return upsertDocumentImportActivity(entries, {
    id,
    title,
    status: 'failed',
    summary: message,
    detail: message,
  })
}

export function deriveDocumentImportState(state) {
  const hasBlockingErrors = Array.isArray(state.errors) && state.errors.length > 0
  const hasBlockingInvalidReasons =
    !DOCUMENT_IMPORT_PREVIEW_POLICY.canSaveWithInvalidQuestions &&
    Array.isArray(state.invalidReasons) &&
    state.invalidReasons.length > 0

  const canSave =
    (state.status === 'preview_ready' || state.status === 'completed') &&
    !!state.importResult &&
    !hasBlockingErrors &&
    !hasBlockingInvalidReasons

  const canStartPractice =
    !!state.saveResult ||
    (DOCUMENT_IMPORT_PREVIEW_POLICY.reuseSavedPaperForPractice && canSave)

  return {
    ...state,
    canSave,
    canStartPractice,
    isBusy: DOCUMENT_IMPORT_BUSY_STATUSES.has(state.status),
  }
}
