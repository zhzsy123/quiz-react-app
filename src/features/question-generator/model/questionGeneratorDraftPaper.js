import { buildDraftPaper as buildEntityDraftPaper } from '../../../entities/quiz-generation/lib/buildDraftPaper.js'

export function buildDraftPaper({
  config = {},
  meta = {},
  draftQuestions = [],
  saveResult = null,
  requestId = '',
} = {}) {
  return buildEntityDraftPaper({
    subject: config.subject || meta.subject || '',
    title: config.title || meta.title || saveResult?.title || 'AI 生成草稿试卷',
    description: config.description || meta.description || '',
    paperId: saveResult?.paperId || requestId || meta.requestId || config.requestId || '',
    durationMinutes:
      Number(config.durationMinutes || config.duration_minutes || meta.durationMinutes || meta.duration_minutes || 0) ||
      0,
    requestId: requestId || meta.requestId || config.requestId || '',
    mode: config.mode || meta.mode || 'practice',
    difficulty: config.difficulty || meta.difficulty || 'medium',
    questionDrafts: draftQuestions,
    generationConfig: {
      ...config,
      ...(meta || {}),
    },
  })
}
