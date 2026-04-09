import { buildImportPreview } from '../../../entities/document-import/lib/buildImportPreview'
import { buildPersistedImportPayload } from '../../../entities/document-import/lib/buildPersistedImportPayload'
import { getQuizScoreBreakdown } from '../../../entities/quiz/lib/scoring/getQuizScoreBreakdown'

function withPreviewGuards(invalidReasons = [], questionCount = 0) {
  const nextInvalidReasons = (invalidReasons || []).filter(
    (reason) => reason !== '当前预览中没有可保存题目，请至少保留一道题。'
  )

  if (questionCount <= 0) {
    nextInvalidReasons.push('当前预览中没有可保存题目，请至少保留一道题。')
  }

  return nextInvalidReasons
}

export function rebuildDocumentImportResult({
  importResult,
  subjectKey,
  warnings,
  errors,
  invalidReasons,
} = {}) {
  if (!importResult?.normalizedDocument?.quiz) {
    return importResult
  }

  const quiz = importResult.normalizedDocument.quiz
  const items = quiz.items || []
  const nextInvalidReasons = withPreviewGuards(invalidReasons || importResult.invalidReasons || [], items.length)
  const scoreBreakdown = getQuizScoreBreakdown(items)
  const persistedPayload = buildPersistedImportPayload({
    ...quiz,
    items,
  })

  const normalizedDocument = {
    ...importResult.normalizedDocument,
    rawPayload: persistedPayload,
    quiz: {
      ...quiz,
      items,
    },
    scoreBreakdown,
  }

  return {
    ...importResult,
    normalizedDocument,
    persistedPayload,
    scoreBreakdown,
    diagnostics: importResult.diagnostics || null,
    warnings: warnings || importResult.warnings || [],
    errors: errors || importResult.errors || [],
    invalidReasons: nextInvalidReasons,
    preview: buildImportPreview({
      normalizedDocument,
      subjectKey,
      warnings: warnings || importResult.warnings || [],
      invalidReasons: nextInvalidReasons,
      diagnostics: importResult.diagnostics || null,
    }),
  }
}
