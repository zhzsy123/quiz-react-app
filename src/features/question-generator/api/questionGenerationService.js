import { buildDraftPaper as buildModelDraftPaper } from '../model/questionGeneratorDraftPaper.js'
import { buildGenerationDraftEntry } from '../../../entities/quiz-generation/lib/buildGenerationDraftEntry.js'
import {
  buildGenerationPrompt,
  normalizeGenerationParams,
} from '../../../entities/quiz-generation/lib/buildGenerationPrompt.js'
import {
  buildQuestionSignature,
  getRecentSignatures,
  hasDuplicateSignature,
  rememberSignature,
} from '../../../entities/quiz-generation/lib/generationSignatures.js'
import {
  OBJECTIVE_GENERATION_TYPES,
  sanitizeGeneratedQuestion,
} from '../../../entities/quiz-generation/lib/generatedQuestionSanitizer.js'
import { requestAiJson } from '../../../shared/api/aiGateway.js'

function createRequestId(subjectKey = 'paper') {
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

function buildScoreBreakdownFromQuestions(questions = [], meta = {}) {
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

function getDraftQuestionList(entry) {
  if (Array.isArray(entry?.normalizedItems) && entry.normalizedItems.length > 0) {
    return entry.normalizedItems
  }

  const question = entry?.normalizedQuestion || entry?.rawQuestion
  return question ? [question] : []
}

export function buildDraftPaper({
  config = {},
  meta = {},
  draftQuestions = [],
  saveResult = null,
  requestId = '',
} = {}) {
  const acceptedDraftQuestions = draftQuestions.filter(
    (entry) => entry?.status === 'valid' || entry?.status === 'warning'
  )
  const normalizedQuestions = acceptedDraftQuestions.flatMap((entry) => getDraftQuestionList(entry)).filter(Boolean)

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

function createGenerationMeta(subjectMeta, normalized, requestId, generationPlan) {
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

async function runPool(items, worker, limit = 3) {
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
  const { subjectMeta, normalized, generationPlan } = normalizeGenerationParams(subjectKey, config)
  const generationMeta = createGenerationMeta(subjectMeta, normalized, requestId, generationPlan)
  const draftQuestions = new Array(generationPlan.length)
  const warnings = []
  const signatureMap = new Map()

  if (!generationPlan.length) {
    const emptyError = new Error('未配置可生成的题型计划。')
    const emptyResult = {
      status: 'failed',
      requestId,
      receivedCount: 0,
      meta: generationMeta,
      warnings,
      draftQuestions: [],
      draftPaper: buildDraftPaper({
        config: { ...normalized, subject: subjectMeta.key, title: generationMeta.paperTitle },
        meta: generationMeta,
        draftQuestions: [],
        requestId,
      }),
      error: emptyError,
    }
    onError?.(emptyError)
    return emptyResult
  }

  try {
    await runPool(
      generationPlan,
      async (planItem, planIndex) => {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }

        try {
          let finalizedEntry = null
          let duplicateError = null
          let previousErrorMessage = ''

          for (let attempt = 0; attempt < 2; attempt += 1) {
            const { systemPrompt, userPrompt } = buildGenerationPrompt({
              subjectKey,
              params: config,
              requestId,
              planItem,
              questionIndex: planIndex + 1,
              totalQuestions: generationPlan.length,
              avoidQuestionSignatures: getRecentSignatures(signatureMap, planItem.typeKey),
              previousErrorMessage,
            })

            const response = await requestAiJson({
              provider: 'deepseek',
              systemPrompt,
              userPrompt,
              temperature: attempt === 0 ? 0.2 : 0.1,
            })

            const candidate = sanitizeGeneratedQuestion(response.content, {
              ...planItem,
              index: planIndex + 1,
            })
            const signature = buildQuestionSignature(candidate)

            if (hasDuplicateSignature(signatureMap, planItem.typeKey, signature)) {
              duplicateError = new Error('生成题目与同批已生成内容重复度过高，请重试。')
              continue
            }

            const entry = buildGenerationDraftEntry(candidate, {
              requestId,
              subjectKey: subjectMeta.key,
              paperTitle: generationMeta.paperTitle,
              durationMinutes: generationMeta.durationMinutes,
              streamIndex: planIndex + 1,
            })

            if (entry.status === 'invalid') {
              previousErrorMessage = entry.errors?.[0] || entry.error || '题目结构无效，请修正后重新生成。'
              continue
            }

            rememberSignature(signatureMap, planItem.typeKey, signature)
            finalizedEntry = entry
            break
          }

          if (!finalizedEntry) {
            throw duplicateError || new Error(previousErrorMessage || 'AI 生成失败')
          }

          draftQuestions[planIndex] = finalizedEntry
          onQuestion?.(finalizedEntry.rawQuestion, {
            requestId,
            streamIndex: planIndex + 1,
            meta: generationMeta,
            planItem,
            entry: finalizedEntry,
          })
        } catch (error) {
          const message = String(error?.message || '').trim() || 'AI 生成失败'
          const entry = buildGenerationDraftEntry(
            {
              id: `gq_${planIndex + 1}`,
              type: planItem.typeKey,
              prompt: `${planItem.label}生成失败`,
              score: planItem.score,
              answer: { type: 'subjective', reference_answer: '', scoring_points: [] },
            },
            {
              requestId,
              subjectKey: subjectMeta.key,
              paperTitle: generationMeta.paperTitle,
              durationMinutes: generationMeta.durationMinutes,
              streamIndex: planIndex + 1,
              errorMessage: message,
            }
          )

          entry.status = 'invalid'
          entry.errors = [message]
          draftQuestions[planIndex] = entry
          warnings.push({
            index: planIndex + 1,
            typeKey: planItem.typeKey,
            message,
          })
          onQuestion?.(entry.rawQuestion, {
            requestId,
            streamIndex: planIndex + 1,
            meta: generationMeta,
            planItem,
            entry,
          })
        }
      },
      normalized.mode === 'practice' ? 6 : 3
    )

    const finalizedEntries = draftQuestions.filter(Boolean)
    const result = {
      status: 'completed',
      requestId,
      receivedCount: finalizedEntries.length,
      meta: generationMeta,
      warnings,
      draftQuestions: finalizedEntries,
      draftPaper: buildDraftPaper({
        config: { ...normalized, subject: subjectMeta.key, title: generationMeta.paperTitle },
        meta: generationMeta,
        draftQuestions: finalizedEntries,
        requestId,
      }),
    }

    onComplete?.(result)
    return result
  } catch (error) {
    const finalizedEntries = draftQuestions.filter(Boolean)
    const result = {
      status: 'failed',
      requestId,
      receivedCount: finalizedEntries.length,
      meta: generationMeta,
      warnings,
      draftQuestions: finalizedEntries,
      draftPaper: buildDraftPaper({
        config: { ...normalized, subject: subjectMeta.key, title: generationMeta.paperTitle },
        meta: generationMeta,
        draftQuestions: finalizedEntries,
        requestId,
      }),
      error,
    }

    onError?.(error)
    return result
  }
}
