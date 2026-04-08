import { getQuizScoreBreakdown } from '../../quiz/lib/scoring/getQuizScoreBreakdown.js'
import { buildQuestionPreview } from './questionPreview.js'

function cloneQuestion(value) {
  return JSON.parse(JSON.stringify(value))
}

function pickDraftQuestion(draft) {
  return draft?.normalizedQuestion || draft?.rawQuestion || draft?.question || null
}

function getDraftQuestionList(draft) {
  if (Array.isArray(draft?.normalizedItems) && draft.normalizedItems.length > 0) {
    return draft.normalizedItems
  }

  const singleQuestion = pickDraftQuestion(draft)
  return singleQuestion ? [singleQuestion] : []
}

function isDraftQuestionUsable(draft) {
  return draft?.status === 'valid' || draft?.status === 'warning'
}

export function buildDraftPaper({
  subject,
  title,
  description = '',
  paperId = '',
  durationMinutes = 0,
  requestId = '',
  mode = 'practice',
  difficulty = 'medium',
  questionDrafts = [],
  generationConfig = {},
} = {}) {
  const acceptedDrafts = questionDrafts.filter(isDraftQuestionUsable)
  const rejectedDrafts = questionDrafts.filter((draft) => draft?.status === 'invalid')
  const questions = acceptedDrafts
    .flatMap((draft, index) =>
      getDraftQuestionList(draft).map((question, questionIndex) => {
        const cloned = cloneQuestion(question)
        const previewSource = draft?.rawQuestion?.type === 'cloze' ? draft.rawQuestion : cloned
        cloned.generation_preview = buildQuestionPreview(previewSource, index)
        cloned.generation_status = draft.status || 'valid'
        cloned.generation_source = draft.streamIndex || index + 1
        cloned.generation_source_index = questionIndex + 1
        return cloned
      })
    )
    .filter(Boolean)

  const scoreBreakdown = getQuizScoreBreakdown(questions)
  const resolvedPaperId = paperId || requestId || `generated_${Date.now()}`
  const resolvedTitle = title || 'AI 生成草稿试卷'

  return {
    schema_version: 'quiz-generation-draft-v1',
    paper_id: resolvedPaperId,
    title: resolvedTitle,
    subject: subject || '',
    description,
    duration_minutes: Number(durationMinutes) || 0,
    mode,
    difficulty,
    questions,
    scoreBreakdown,
    generation: {
      requestId,
      mode,
      difficulty,
      totalReceived: questionDrafts.length,
      acceptedCount: questions.length,
      rejectedCount: rejectedDrafts.length,
      warnings: questionDrafts
        .filter((draft) => Array.isArray(draft?.warnings) && draft.warnings.length > 0)
        .flatMap((draft) => draft.warnings),
      generationConfig,
    },
    compatibility: {
      sourceSchema: 'quiz-generation-draft-v1',
      supportedCount: questions.length,
      skippedCount: rejectedDrafts.length,
      skippedTypes: rejectedDrafts.map((draft) => draft?.rawQuestion?.type || draft?.normalizedQuestion?.type || 'unknown'),
    },
  }
}
