import { OBJECTIVE_GENERATION_TYPES } from '../../../entities/quiz-generation/lib/generatedQuestionSanitizer.js'

export function createQuestionGenerationRequestId(subjectKey = 'paper') {
  return `gen_${subjectKey}_${Date.now()}`
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function accumulateScoreBreakdown(question, current = { objectiveScore: 0, subjectiveScore: 0, totalScore: 0 }) {
  if (!question || typeof question !== 'object') return current

  if (question.type === 'composite' && Array.isArray(question.questions)) {
    return question.questions.reduce((next, child) => accumulateScoreBreakdown(child, next), current)
  }

  const score = toNumber(question.score)
  current.totalScore += score
  if (OBJECTIVE_GENERATION_TYPES.has(question.type)) {
    current.objectiveScore += score
  } else {
    current.subjectiveScore += score
  }

  return current
}

export function buildQuestionGenerationScoreBreakdown(questions = [], meta = {}) {
  const totals = questions.reduce(
    (current, question) => accumulateScoreBreakdown(question, current),
    { objectiveScore: 0, subjectiveScore: 0, totalScore: 0 }
  )

  const paperTotal = Number(meta.targetPaperTotal || totals.totalScore || 0) || 0
  return {
    objectiveScore: totals.objectiveScore,
    subjectiveScore: totals.subjectiveScore,
    totalScore: totals.totalScore,
    paperTotal,
    questionCount: questions.length,
  }
}

export function getQuestionGenerationDraftQuestionList(entry) {
  if (Array.isArray(entry?.normalizedItems) && entry.normalizedItems.length > 0) {
    return entry.normalizedItems
  }

  const question = entry?.normalizedQuestion || entry?.rawQuestion
  return question ? [question] : []
}

export function buildQuestionGenerationDraftPaper({
  buildModelDraftPaper,
  config = {},
  meta = {},
  draftQuestions = [],
  saveResult = null,
  requestId = '',
} = {}) {
  const acceptedDraftQuestions = draftQuestions.filter(
    (entry) => entry?.status === 'valid' || entry?.status === 'warning'
  )
  const normalizedQuestions = acceptedDraftQuestions
    .flatMap((entry) => getQuestionGenerationDraftQuestionList(entry))
    .filter(Boolean)

  const draftPaper = buildModelDraftPaper({
    config,
    meta,
    draftQuestions,
    saveResult,
  })

  return {
    ...draftPaper,
    paper_id: requestId || meta.requestId || config.requestId || draftPaper.paper_id,
    questions: normalizedQuestions,
    scoreBreakdown: buildQuestionGenerationScoreBreakdown(normalizedQuestions, {
      targetPaperTotal: config.targetPaperTotal || meta.targetPaperTotal || 0,
    }),
  }
}

export function createQuestionGenerationMeta(subjectMeta, normalized, requestId, generationPlan) {
  return {
    requestId,
    subject: subjectMeta.key,
    paperTitle: normalized.paperTitle || subjectMeta.label,
    mode: normalized.mode,
    difficulty: normalized.difficulty,
    targetCount: generationPlan.length,
    durationMinutes: normalized.durationMinutes,
    targetPaperTotal: normalized.targetPaperTotal,
    questionPlan: generationPlan,
  }
}

export async function runQuestionGenerationPool(items, worker, limit = 3) {
  const results = new Array(items.length)
  let cursor = 0

  async function runNext() {
    const index = cursor
    cursor += 1
    if (index >= items.length) return
    results[index] = await worker(items[index], index)
    await runNext()
  }

  const concurrency = Math.min(limit, items.length)
  await Promise.all(Array.from({ length: concurrency }, () => runNext()))
  return results
}

export function emitQuestionGenerationProgress(onProgress, planItem, planIndex, patch = {}) {
  onProgress?.({
    id: `question-${planIndex + 1}`,
    index: planIndex + 1,
    title: `第 ${planIndex + 1} 题 · ${planItem.label}`,
    meta: `${planItem.score} 分`,
    score: planItem.score,
    ...patch,
  })
}

export function buildQuestionGenerationResult({
  buildModelDraftPaper,
  normalized,
  subjectMeta,
  generationMeta,
  draftQuestions = [],
  requestId = '',
  warnings = [],
} = {}) {
  const finalizedEntries = draftQuestions.filter(Boolean)
  const acceptedEntries = finalizedEntries.filter(
    (entry) => entry?.status === 'valid' || entry?.status === 'warning'
  )
  const status = acceptedEntries.length > 0 ? 'completed' : 'failed'

  return {
    status,
    requestId,
    receivedCount: finalizedEntries.length,
    meta: generationMeta,
    warnings,
    draftQuestions: finalizedEntries,
    draftPaper: buildQuestionGenerationDraftPaper({
      buildModelDraftPaper,
      config: { ...normalized, subject: subjectMeta.key, title: generationMeta.paperTitle },
      meta: generationMeta,
      draftQuestions: finalizedEntries,
      requestId,
    }),
  }
}
