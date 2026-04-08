import { buildDraftPaper as buildModelDraftPaper } from '../model/questionGeneratorDraftPaper.js'
import { buildGenerationPrompt } from '../../../entities/quiz-generation/lib/buildGenerationPrompt.js'
import { normalizeQuizDocument } from '../../../entities/quiz/lib/quizPipeline.js'
import { requestAiStream } from '../../../shared/api/aiGateway.js'

const OBJECTIVE_TYPES = new Set([
  'single_choice',
  'multiple_choice',
  'true_false',
  'fill_blank',
  'cloze',
  'reading',
])

function createRequestId(subjectKey = 'paper') {
  return `gen_${subjectKey}_${Date.now()}`
}

function sumScore(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function accumulateScoreBreakdown(question, current = { objectiveScore: 0, subjectiveScore: 0, totalScore: 0 }) {
  if (!question || typeof question !== 'object') {
    return current
  }

  if (question.type === 'composite' && Array.isArray(question.questions)) {
    return question.questions.reduce((next, child) => accumulateScoreBreakdown(child, next), current)
  }

  const score = sumScore(question.score)
  current.totalScore += score
  if (OBJECTIVE_TYPES.has(question.type)) {
    current.objectiveScore += score
  } else {
    current.subjectiveScore += score
  }
  return current
}

function buildScoreBreakdownFromQuestions(questions = [], meta = {}) {
  const totals = questions.reduce((current, question) => accumulateScoreBreakdown(question, current), {
    objectiveScore: 0,
    subjectiveScore: 0,
    totalScore: 0,
  })

  const paperTotal = Number(meta.targetPaperTotal || totals.totalScore || 0) || 0
  return {
    objectiveScore: totals.objectiveScore,
    subjectiveScore: totals.subjectiveScore,
    totalScore: totals.totalScore,
    paperTotal,
    questionCount: questions.length,
  }
}

function normalizeGeneratedQuestion(question, context) {
  const payload = {
    schema_version: 'generated-v1',
    paper_id: context.requestId,
    title: context.paperTitle,
    subject: context.subjectKey,
    duration_minutes: Number(context.durationMinutes) || 0,
    questions: [question],
  }

  try {
    const normalized = normalizeQuizDocument(payload)
    const [normalizedQuestion] = normalized.quiz.items || []
    const warnings = [...(normalized.validation?.warnings || [])]
    return {
      tempId: question?.id || `temp_${context.streamIndex}`,
      streamIndex: context.streamIndex,
      status: warnings.length ? 'warning' : 'valid',
      rawQuestion: question,
      normalizedQuestion: normalizedQuestion || question,
      warnings,
      errors: [],
      previewText: question?.prompt || question?.title || '',
    }
  } catch (error) {
    return {
      tempId: question?.id || `temp_${context.streamIndex}`,
      streamIndex: context.streamIndex,
      status: 'invalid',
      rawQuestion: question,
      normalizedQuestion: null,
      warnings: [],
      errors: [error.message || 'Question normalization failed'],
      previewText: question?.prompt || question?.title || '',
    }
  }
}

export function buildDraftPaper({
  config = {},
  meta = {},
  draftQuestions = [],
  saveResult = null,
  requestId = '',
} = {}) {
  const normalizedQuestions = draftQuestions
    .map((entry) => entry?.normalizedQuestion || entry?.rawQuestion)
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
    scoreBreakdown: buildScoreBreakdownFromQuestions(normalizedQuestions, {
      targetPaperTotal: config.targetPaperTotal || meta.targetPaperTotal || 0,
    }),
  }
}

function buildGenerationMeta(subjectMeta, normalized, requestId) {
  return {
    requestId,
    subject: subjectMeta.key,
    paperTitle: normalized.paperTitle || subjectMeta.label,
    mode: normalized.mode,
    difficulty: normalized.difficulty,
    targetCount: normalized.count,
    durationMinutes: normalized.durationMinutes,
    targetPaperTotal: normalized.targetPaperTotal,
  }
}

export async function startQuestionGeneration({
  config = {},
  meta = {},
  onQuestion,
  onComplete,
  onError,
  signal,
} = {}) {
  const subjectKey = config.subject || meta.subject || ''
  const requestId = meta.requestId || createRequestId(subjectKey || 'paper')
  const { subjectMeta, normalized, systemPrompt, userPrompt } = buildGenerationPrompt({
    subjectKey,
    params: config,
    requestId,
  })

  const streamMeta = buildGenerationMeta(subjectMeta, normalized, requestId)
  const draftQuestions = []
  const warnings = []
  let receivedCount = 0

  try {
    await requestAiStream({
      provider: 'deepseek',
      systemPrompt,
      userPrompt,
      signal,
      onError: (error) => {
        onError?.(error)
      },
      onEvent: (event) => {
        if (!event || typeof event !== 'object') return

        if (event.type === 'meta') {
          Object.assign(streamMeta, {
            paperTitle: event.paper_title || streamMeta.paperTitle,
            mode: event.mode || streamMeta.mode,
            difficulty: event.difficulty || streamMeta.difficulty,
            targetCount: Number(event.target_count) || streamMeta.targetCount,
          })
          return
        }

        if (event.type === 'warning') {
          warnings.push(event)
          return
        }

        if (event.type === 'error') {
          throw new Error(event.message || 'AI generation error')
        }

        if (event.type !== 'question' || !event.question) return

        receivedCount += 1
        const normalizedQuestion = normalizeGeneratedQuestion(event.question, {
          requestId,
          subjectKey: subjectMeta.key,
          paperTitle: streamMeta.paperTitle,
          durationMinutes: streamMeta.durationMinutes,
          streamIndex: Number(event.index) || receivedCount,
        })

        draftQuestions.push(normalizedQuestion)
        onQuestion?.(event.question, {
          requestId,
          streamIndex: normalizedQuestion.streamIndex,
          meta: streamMeta,
          event,
        })
      },
    })

    const draftPaper = buildDraftPaper({
      config: {
        ...normalized,
        subject: subjectMeta.key,
        title: streamMeta.paperTitle,
      },
      meta: streamMeta,
      draftQuestions,
      requestId,
    })

    const result = {
      status: 'completed',
      requestId,
      receivedCount,
      meta: streamMeta,
      warnings,
      draftQuestions,
      draftPaper,
    }

    onComplete?.(result)
    return result
  } catch (error) {
    const draftPaper = buildDraftPaper({
      config: {
        ...normalized,
        subject: subjectMeta.key,
        title: streamMeta.paperTitle,
      },
      meta: streamMeta,
      draftQuestions,
      requestId,
    })

    const result = {
      status: 'failed',
      requestId,
      receivedCount,
      meta: streamMeta,
      warnings,
      draftQuestions,
      draftPaper,
      error,
    }

    onError?.(error)
    return result
  }
}
