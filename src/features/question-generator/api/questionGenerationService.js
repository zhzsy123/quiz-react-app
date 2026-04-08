import { buildDraftPaper as buildModelDraftPaper } from '../model/questionGeneratorDraftPaper.js'
import {
  buildGenerationPrompt,
  normalizeGenerationParams,
} from '../../../entities/quiz-generation/lib/buildGenerationPrompt.js'
import { buildQuestionPreview } from '../../../entities/quiz-generation/lib/questionPreview.js'
import { normalizeQuizDocument } from '../../../entities/quiz/lib/quizPipeline.js'
import { getQuizScoreBreakdown } from '../../../entities/quiz/lib/scoring/getQuizScoreBreakdown.js'
import { normalizeQuestionTypeKey } from '../../../entities/subject/model/subjects.js'
import { requestAiJson } from '../../../shared/api/aiGateway.js'

const OBJECTIVE_TYPES = new Set([
  'single_choice',
  'multiple_choice',
  'true_false',
  'fill_blank',
  'function_fill_blank',
  'cloze',
  'reading',
])

function createRequestId(subjectKey = 'paper') {
  return `gen_${subjectKey}_${Date.now()}`
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function compactText(value) {
  return String(value ?? '').trim()
}

function normalizeOptionList(options) {
  if (Array.isArray(options)) {
    return options.map((option, index) => {
      if (typeof option === 'string') {
        const match = option.match(/^([A-Z])[\.\s、:：-]?\s*(.*)$/)
        if (match) {
          return { key: match[1], text: match[2] || match[1] }
        }
        return { key: String.fromCharCode(65 + index), text: option }
      }
      return {
        key: option?.key || String.fromCharCode(65 + index),
        text: option?.text || option?.label || option?.value || '',
      }
    })
  }

  if (!options || typeof options !== 'object') return []

  return Object.entries(options)
    .map(([key, value]) => ({
      key,
      text: typeof value === 'string' ? value : value?.text || value?.label || value?.value || '',
    }))
    .sort((a, b) => String(a.key).localeCompare(String(b.key)))
}

function normalizeCorrectValue(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))].sort()
  }
  if (typeof value === 'string') {
    const normalized = value.trim()
    if (!normalized) return normalized
    if (/[,/、，\s]+/.test(normalized)) {
      return [...new Set(normalized.split(/[,/、，\s]+/).map((item) => item.trim()).filter(Boolean))].sort()
    }
    return normalized
  }
  return value
}

function normalizeSubjectiveReference(question = {}) {
  return (
    question?.reference_answer ||
    question?.referenceAnswer ||
    question?.sample_answer ||
    question?.sampleAnswer ||
    question?.standard_answer ||
    question?.standardAnswer ||
    ''
  )
}

function normalizeAnswerShape(question, typeKey) {
  const topLevelCorrect =
    question?.correct_answer ??
    question?.correctAnswer ??
    question?.correct_option ??
    question?.correctOption ??
    question?.correct
  const topLevelReference = normalizeSubjectiveReference(question)

  if (question?.answer && typeof question.answer === 'object' && !Array.isArray(question.answer)) {
    const correctValue = normalizeCorrectValue(question.answer.correct ?? question.answer.answer ?? topLevelCorrect)
    return {
      ...question.answer,
      type: question.answer.type || (OBJECTIVE_TYPES.has(typeKey) ? 'objective' : 'subjective'),
      correct: correctValue,
      reference_answer:
        question.answer.reference_answer ?? question.answer.referenceAnswer ?? topLevelReference,
      rationale: question.answer.rationale ?? question.rationale ?? '',
      scoring_points: question.answer.scoring_points ?? question.scoring_points ?? [],
      scoring_rubric: question.answer.scoring_rubric ?? question.scoring_rubric ?? null,
    }
  }

  if (typeof question?.answer === 'string' || Array.isArray(question?.answer)) {
    if (OBJECTIVE_TYPES.has(typeKey)) {
      return {
        type: 'objective',
        correct: normalizeCorrectValue(question.answer),
        rationale: question.rationale || '',
      }
    }

    return {
      type: 'subjective',
      reference_answer: Array.isArray(question.answer) ? question.answer.join(' / ') : question.answer,
      scoring_points: question.scoring_points || [],
      rationale: question.rationale || '',
    }
  }

  if (OBJECTIVE_TYPES.has(typeKey)) {
    return {
      type: 'objective',
      correct: normalizeCorrectValue(topLevelCorrect),
      rationale: question?.rationale || '',
    }
  }

  return {
    type: 'subjective',
    reference_answer: topLevelReference || '',
    scoring_points: question?.scoring_points || [],
    scoring_rubric: question?.scoring_rubric || null,
    rationale: question?.rationale || '',
  }
}

function sanitizeObjectiveChild(rawQuestion = {}, fallbackType = 'single_choice') {
  const type = normalizeQuestionTypeKey(rawQuestion.type || fallbackType)
  return {
    ...rawQuestion,
    id: rawQuestion.id || `sub_${Date.now()}`,
    type,
    prompt: rawQuestion.prompt || rawQuestion.title || '',
    score: Number(rawQuestion.score) > 0 ? Number(rawQuestion.score) : 2,
    options: normalizeOptionList(rawQuestion.options || rawQuestion.choices || rawQuestion.selections),
    answer: normalizeAnswerShape(rawQuestion, type),
  }
}

function sanitizeGeneratedQuestion(rawQuestion, planItem) {
  if (!rawQuestion || typeof rawQuestion !== 'object') return null

  const targetType = normalizeQuestionTypeKey(planItem?.typeKey)
  const questionType = normalizeQuestionTypeKey(rawQuestion.type || targetType)
  const normalizedType = questionType || targetType

  const question = {
    ...rawQuestion,
    id: rawQuestion.id || `gq_${planItem?.index || Date.now()}`,
    type: normalizedType,
    prompt: rawQuestion.prompt || rawQuestion.title || '',
    score: Number(rawQuestion.score) > 0 ? Number(rawQuestion.score) : planItem?.score,
    options: normalizeOptionList(rawQuestion.options || rawQuestion.choices || rawQuestion.selections),
  }

  if (normalizedType === 'reading') {
    question.passage =
      typeof rawQuestion.passage === 'string'
        ? { title: rawQuestion.title || rawQuestion.prompt || '阅读材料', content: rawQuestion.passage }
        : rawQuestion.passage || {
            title: rawQuestion.title || rawQuestion.prompt || '阅读材料',
            content: rawQuestion.article || rawQuestion.content || rawQuestion.body || '',
          }
    question.questions = (rawQuestion.questions || rawQuestion.sub_questions || rawQuestion.subQuestions || []).map((subQuestion, subIndex) =>
      sanitizeObjectiveChild(
        {
          ...subQuestion,
          id: subQuestion?.id || `${question.id}_${subIndex + 1}`,
          score: Number(subQuestion?.score) > 0 ? Number(subQuestion.score) : 2.5,
        },
        'single_choice'
      )
    )
  }

  if (normalizedType === 'translation') {
    question.source_text =
      rawQuestion.source_text ||
      rawQuestion.sourceText ||
      rawQuestion.text ||
      rawQuestion.content ||
      rawQuestion.body ||
      rawQuestion.prompt
  }

  if (normalizedType === 'fill_blank' || normalizedType === 'function_fill_blank') {
    question.blanks = (rawQuestion.blanks || rawQuestion.answers || rawQuestion.items || []).map((blank, index) => ({
      blank_id: blank?.blank_id || blank?.id || index + 1,
      accepted_answers:
        Array.isArray(blank?.accepted_answers)
          ? blank.accepted_answers
          : Array.isArray(blank?.answers)
            ? blank.answers
            : [blank?.answer || blank?.correct || ''],
      score: Number(blank?.score) > 0 ? Number(blank.score) : question.score || planItem?.score || 1,
      rationale: blank?.rationale || '',
    }))
  }

  if (normalizedType === 'composite') {
    question.material = rawQuestion.material || rawQuestion.context || rawQuestion.passage || ''
    question.material_format = rawQuestion.material_format || rawQuestion.materialFormat || rawQuestion.response_format || 'plain'
    question.questions = (rawQuestion.questions || rawQuestion.sub_questions || []).map((childQuestion, index) =>
      sanitizeGeneratedQuestion(
        {
          ...childQuestion,
          id: childQuestion?.id || `${question.id}_${index + 1}`,
        },
        {
          typeKey: normalizeQuestionTypeKey(childQuestion?.type || 'short_answer'),
          score: Number(childQuestion?.score) > 0 ? Number(childQuestion.score) : 5,
          index: index + 1,
        }
      )
    )
  }

  question.answer = normalizeAnswerShape(rawQuestion, normalizedType)
  return question
}

function buildDraftEntry(rawQuestion, { requestId, subjectKey, paperTitle, durationMinutes, streamIndex, errorMessage = '' }) {
  const payload = {
    schema_version: 'generated-v1',
    paper_id: requestId,
    title: paperTitle,
    subject: subjectKey,
    duration_minutes: Number(durationMinutes) || 0,
    questions: rawQuestion ? [rawQuestion] : [],
  }

  if (!rawQuestion) {
    return {
      tempId: `temp_${streamIndex}`,
      streamIndex,
      status: 'invalid',
      rawQuestion: null,
      normalizedQuestion: null,
      validation: { errors: [errorMessage || '生成题目为空'], warnings: [] },
      warnings: [],
      errors: [errorMessage || '生成题目为空'],
      error: errorMessage || '生成题目为空',
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
    const [normalizedQuestion] = normalizedDocument.quiz.items || []
    const warnings = normalizedDocument.validation?.skippedCount
      ? [`兼容层跳过了 ${normalizedDocument.validation.skippedCount} 个片段`]
      : []
    const validation = {
      warnings: [...(normalizedDocument.validation?.warnings || []), ...warnings],
      errors: normalizedDocument.validation?.errors || [],
    }
    const scoreBreakdown = getQuizScoreBreakdown(normalizedDocument.quiz.items || [])

    return {
      tempId: normalizedQuestion?.id || rawQuestion.id || `temp_${streamIndex}`,
      streamIndex,
      status: warnings.length ? 'warning' : 'valid',
      rawQuestion,
      normalizedQuestion: normalizedQuestion || rawQuestion,
      validation,
      warnings,
      errors: [],
      error: '',
      previewText: rawQuestion.prompt || rawQuestion.title || '',
      preview: buildQuestionPreview(normalizedQuestion || rawQuestion, streamIndex - 1, { subject: subjectKey }),
      scoreBreakdown,
    }
  } catch (error) {
    return {
      tempId: rawQuestion.id || `temp_${streamIndex}`,
      streamIndex,
      status: 'invalid',
      rawQuestion,
      normalizedQuestion: null,
      validation: { warnings: [], errors: [error?.message || errorMessage || '题目标准化失败'] },
      warnings: [],
      errors: [error?.message || errorMessage || '题目标准化失败'],
      error: error?.message || errorMessage || '题目标准化失败',
      previewText: rawQuestion.prompt || rawQuestion.title || '',
      preview: buildQuestionPreview(rawQuestion, streamIndex - 1, { subject: subjectKey }),
      scoreBreakdown: null,
    }
  }
}

function accumulateScoreBreakdown(question, current = { objectiveScore: 0, subjectiveScore: 0, totalScore: 0 }) {
  if (!question || typeof question !== 'object') return current

  if (question.type === 'composite' && Array.isArray(question.questions)) {
    return question.questions.reduce((next, child) => accumulateScoreBreakdown(child, next), current)
  }

  const score = toNumber(question.score)
  current.totalScore += score
  if (OBJECTIVE_TYPES.has(question.type)) {
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
          const { systemPrompt, userPrompt } = buildGenerationPrompt({
            subjectKey,
            params: config,
            requestId,
            planItem,
            questionIndex: planIndex + 1,
            totalQuestions: generationPlan.length,
          })

          const response = await requestAiJson({
            provider: 'deepseek',
            systemPrompt,
            userPrompt,
            temperature: 0.2,
          })

          const sanitizedQuestion = sanitizeGeneratedQuestion(response.content, {
            ...planItem,
            index: planIndex + 1,
          })

          const entry = buildDraftEntry(sanitizedQuestion, {
            requestId,
            subjectKey: subjectMeta.key,
            paperTitle: generationMeta.paperTitle,
            durationMinutes: generationMeta.durationMinutes,
            streamIndex: planIndex + 1,
          })

          draftQuestions[planIndex] = entry
          onQuestion?.(entry.rawQuestion, {
            requestId,
            streamIndex: planIndex + 1,
            meta: generationMeta,
            planItem,
            entry,
          })
        } catch (error) {
          const message = compactText(error?.message) || 'AI 生成失败'
          const entry = buildDraftEntry(
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
