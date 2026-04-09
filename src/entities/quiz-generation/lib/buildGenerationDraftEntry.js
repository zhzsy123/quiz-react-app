import { normalizeQuizDocument } from '../../quiz/lib/quizPipeline.js'
import { getQuizScoreBreakdown } from '../../quiz/lib/scoring/getQuizScoreBreakdown.js'
import { buildQuestionPreview } from './questionPreview.js'

export function buildGenerationDraftEntry(
  rawQuestion,
  { requestId, subjectKey, paperTitle, durationMinutes, streamIndex, errorMessage = '' }
) {
  const payload = {
    schema_version: 'generated-v1',
    paper_id: requestId,
    title: paperTitle,
    subject: subjectKey,
    duration_minutes: Number(durationMinutes) || 0,
    questions: rawQuestion ? [rawQuestion] : [],
  }

  if (!rawQuestion) {
    const message = errorMessage || '生成题目为空'
    return {
      tempId: `temp_${streamIndex}`,
      streamIndex,
      status: 'invalid',
      rawQuestion: null,
      normalizedQuestion: null,
      normalizedItems: [],
      validation: { errors: [message], warnings: [] },
      warnings: [],
      errors: [message],
      error: message,
      previewText: '',
      preview: {
        questionId: `temp_${streamIndex}`,
        index: streamIndex,
        previewText: '',
        title: '',
        typeLabel: '',
        score: 0,
      },
      scoreBreakdown: null,
    }
  }

  try {
    const normalizedDocument = normalizeQuizDocument(payload)
    const normalizedItems = normalizedDocument.quiz.items || []
    const normalizedQuestion = normalizedItems.length === 1 ? normalizedItems[0] : rawQuestion
    const previewSource = normalizedItems.length === 1 ? normalizedItems[0] : rawQuestion
    const skippedWarnings = normalizedDocument.validation?.skippedCount
      ? [`兼容层跳过了 ${normalizedDocument.validation.skippedCount} 个片段`]
      : []
    const draftWarnings = [...(normalizedDocument.validation?.warnings || []), ...skippedWarnings]
    const validation = {
      warnings: draftWarnings,
      errors: normalizedDocument.validation?.errors || [],
    }
    const scoreBreakdown = getQuizScoreBreakdown(normalizedItems)

    return {
      tempId: normalizedQuestion?.id || rawQuestion.id || `temp_${streamIndex}`,
      streamIndex,
      status: draftWarnings.length ? 'warning' : 'valid',
      rawQuestion,
      normalizedQuestion: normalizedQuestion || rawQuestion,
      normalizedItems,
      validation,
      warnings: draftWarnings,
      errors: [],
      error: '',
      previewText: rawQuestion.prompt || rawQuestion.title || '',
      preview: buildQuestionPreview(previewSource, streamIndex - 1, { subject: subjectKey }),
      scoreBreakdown,
    }
  } catch (error) {
    const message = error?.message || errorMessage || '题目标准化失败'
    return {
      tempId: rawQuestion.id || `temp_${streamIndex}`,
      streamIndex,
      status: 'invalid',
      rawQuestion,
      normalizedQuestion: null,
      normalizedItems: [],
      validation: { warnings: [], errors: [message] },
      warnings: [],
      errors: [message],
      error: message,
      previewText: rawQuestion.prompt || rawQuestion.title || '',
      preview: buildQuestionPreview(rawQuestion, streamIndex - 1, { subject: subjectKey }),
      scoreBreakdown: null,
    }
  }
}
