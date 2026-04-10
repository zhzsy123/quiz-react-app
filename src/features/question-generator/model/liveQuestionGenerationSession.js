import { buildPaperId } from '../../../entities/quiz/lib/paperId.js'
import { getQuestionTypeMeta } from '../../../entities/subject/model/subjects.js'
import { upsertLibraryEntry } from '../../../entities/library/api/libraryRepository.js'
import { normalizeGenerationParams } from '../../../entities/quiz-generation/lib/buildGenerationPrompt.js'
import { buildDraftPaper as buildModelDraftPaper } from './questionGeneratorDraftPaper.js'
import { startQuestionGeneration } from '../api/questionGenerationService.js'
import { buildQuestionGenerationDraftPaper } from '../api/questionGenerationRuntime.js'

const sessions = new Map()

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function summarizeDraftQuestions(draftQuestions = []) {
  return draftQuestions.filter(Boolean).reduce(
    (summary, entry) => {
      summary.total += 1
      summary[entry.status] = (summary[entry.status] || 0) + 1
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

function isAcceptedEntry(entry) {
  return entry?.status === 'valid' || entry?.status === 'warning'
}

function getEntryQuestion(entry) {
  if (Array.isArray(entry?.normalizedItems) && entry.normalizedItems.length > 0) {
    return entry.normalizedItems[0]
  }

  return entry?.normalizedQuestion || entry?.rawQuestion || null
}

function getSessionTag(sessionId) {
  return `generation-session:${sessionId}`
}

function buildPendingLibraryRawText({ paperId, title, subjectKey, requestId, config = {} }) {
  return JSON.stringify(
    {
      schema_version: 'quiz-generation-pending-v1',
      paper_id: paperId,
      title,
      subject: subjectKey,
      mode: config.mode || 'practice',
      difficulty: config.difficulty || 'medium',
      duration_minutes: Number(config.durationMinutes || config.duration_minutes || 0) || 0,
      description: 'AI 正在后台生成题目。',
      generation: {
        requestId,
        status: 'pending',
      },
      questions: [],
    },
    null,
    2
  )
}

function buildQueuedActivityEntries(generationPlan = []) {
  return generationPlan.map((planItem, index) => ({
    id: `question-${index + 1}`,
    index: index + 1,
    planIndex: index + 1,
    title: `第 ${index + 1} 题 · ${planItem.label}`,
    status: 'queued',
    summary: '等待生成',
    details: [],
    meta: `${planItem.score} 分`,
    previewText: '',
    questionId: '',
    score: planItem.score || 0,
  }))
}

function upsertActivityEntry(entries = [], patch = {}) {
  const id = patch.id || `question-${entries.length + 1}`
  const details = Array.isArray(patch.details)
    ? patch.details
    : patch.detail
      ? [patch.detail]
      : []
  const index = entries.findIndex((entry) => entry.id === id)

  if (index < 0) {
    return [
      ...entries,
      {
        id,
        title: patch.title || '正在生成题目',
        status: patch.status || 'running',
        summary: patch.summary || '',
        details,
        meta: patch.meta || '',
        previewText: patch.previewText || '',
        score: patch.score || 0,
        questionId: patch.questionId || '',
        planIndex: patch.index || entries.length + 1,
      },
    ]
  }

  const current = entries[index]
  const mergedDetails = [...(current.details || [])]
  details.forEach((detail) => {
    if (detail && !mergedDetails.includes(detail)) {
      mergedDetails.push(detail)
    }
  })

  return [
    ...entries.slice(0, index),
    {
      ...current,
      ...patch,
      id,
      details: mergedDetails,
      planIndex: patch.index || current.planIndex,
    },
    ...entries.slice(index + 1),
  ]
}

function buildSessionDraftPaper(session) {
  return buildQuestionGenerationDraftPaper({
    buildModelDraftPaper,
    config: {
      ...session.config,
      subject: session.subjectKey,
      title: session.title,
    },
    meta: {
      ...session.meta,
      subject: session.subjectKey,
      title: session.title,
      requestId: session.paperId,
    },
    draftQuestions: session.draftQuestions.filter(Boolean),
    saveResult: session.saveResult,
    requestId: session.paperId,
  })
}

function buildPlaceholderItem(session, planItem, index, activityEntry) {
  const typeMeta = getQuestionTypeMeta(planItem.typeKey)
  return {
    id: `generation-placeholder-${session.paperId}-${index + 1}`,
    type: 'generation_placeholder',
    source_type: planItem.typeKey,
    generation_type_key: planItem.typeKey,
    prompt: `AI 正在生成第 ${index + 1} 题：${planItem.label}`,
    score: 0,
    answer: {
      type: 'subjective',
      reference_answer: '',
      scoring_points: [],
    },
    generation_placeholder: {
      index: index + 1,
      label: planItem.label,
      shortLabel: typeMeta.shortLabel || typeMeta.label || planItem.label,
      status: activityEntry?.status || 'queued',
      summary: activityEntry?.summary || '等待生成',
      details: activityEntry?.details || [],
      score: planItem.score || 0,
    },
  }
}

function buildSessionQuiz(session) {
  return {
    title: session.title,
    subject: session.subjectKey,
    duration_minutes: Number(session.config.durationMinutes || session.config.duration_minutes || 0) || 0,
    items: session.generationPlan.map((planItem, index) => {
      const entry = session.draftQuestions[index]
      if (entry && isAcceptedEntry(entry)) {
        return getEntryQuestion(entry)
      }

      return buildPlaceholderItem(session, planItem, index, session.activityEntries[index])
    }),
    generation: {
      sessionId: session.sessionId,
      requestId: session.requestId,
      status: session.status,
      summary: session.error || '',
    },
  }
}

function buildSessionEntry(session) {
  const draftPaper = buildSessionDraftPaper(session)
  const questionCount = Array.isArray(draftPaper?.questions) ? draftPaper.questions.length : 0

  return {
    id: session.entryId || `library:${session.profileId}:${session.subjectKey}:${session.paperId}`,
    profileId: session.profileId,
    subject: session.subjectKey,
    paperId: session.paperId,
    title: session.title,
    tags: session.tags,
    schemaVersion: questionCount > 0 ? 'quiz-generation-draft-v1' : 'quiz-generation-pending-v1',
    questionCount,
  }
}

function createSnapshot(session) {
  return {
    sessionId: session.sessionId,
    profileId: session.profileId,
    subjectKey: session.subjectKey,
    paperId: session.paperId,
    requestId: session.requestId,
    title: session.title,
    status: session.status,
    routeSlug: session.routeSlug,
    config: clone(session.config),
    meta: clone(session.meta),
    generationPlan: clone(session.generationPlan),
    activityEntries: clone(session.activityEntries),
    draftQuestions: clone(session.draftQuestions.filter(Boolean)),
    summary: summarizeDraftQuestions(session.draftQuestions),
    error: session.error || '',
    saveResult: session.saveResult ? clone(session.saveResult) : null,
    entry: buildSessionEntry(session),
    quiz: buildSessionQuiz(session),
  }
}

function emitSession(session) {
  const snapshot = createSnapshot(session)
  session.listeners.forEach((listener) => listener(snapshot))
}

function getSession(sessionId) {
  return sessions.get(sessionId) || null
}

async function persistSessionPaper(session, finalize = false) {
  const draftPaper = buildSessionDraftPaper(session)
  const questionCount = Array.isArray(draftPaper?.questions) ? draftPaper.questions.length : 0
  const nextTags = ['AI生成']

  if (!finalize && session.status === 'generating') {
    nextTags.push('生成中', getSessionTag(session.sessionId))
  } else if (session.status === 'failed') {
    nextTags.push('生成失败')
  }

  const rawText =
    questionCount > 0
      ? JSON.stringify(draftPaper, null, 2)
      : buildPendingLibraryRawText({
          paperId: session.paperId,
          title: session.title,
          subjectKey: session.subjectKey,
          requestId: session.requestId,
          config: session.config,
        })

  const entry = await upsertLibraryEntry({
    id: session.entryId,
    profileId: session.profileId,
    subject: session.subjectKey,
    paperId: session.paperId,
    title: session.title,
    rawText,
    tags: nextTags,
    schemaVersion: questionCount > 0 ? draftPaper.schema_version || 'quiz-generation-draft-v1' : 'quiz-generation-pending-v1',
    questionCount,
  })

  session.entryId = entry.id
  session.tags = entry.tags || nextTags
  if (questionCount > 0) {
    session.saveResult = {
      paperId: entry.paperId,
      title: entry.title,
      subject: entry.subject,
    }
  }

  return entry
}

function queuePersist(sessionId, finalize = false) {
  const session = getSession(sessionId)
  if (!session) return Promise.resolve(null)

  session.persistPromise = session.persistPromise
    .then(async () => {
      const current = getSession(sessionId)
      if (!current) return null
      return persistSessionPaper(current, finalize)
    })
    .catch((error) => {
      console.error('Failed to persist generated paper session.', error)
      return null
    })

  return session.persistPromise
}

export function getQuestionGenerationSessionSnapshot(sessionId) {
  const session = getSession(sessionId)
  return session ? createSnapshot(session) : null
}

export function subscribeQuestionGenerationSession(sessionId, listener) {
  const session = getSession(sessionId)
  if (!session || typeof listener !== 'function') {
    return () => {}
  }

  session.listeners.add(listener)
  emitSession(session)

  return () => {
    const current = getSession(sessionId)
    current?.listeners.delete(listener)
  }
}

export function extractQuestionGenerationSessionId(tags = []) {
  const sessionTag = (tags || []).find(
    (tag) => typeof tag === 'string' && tag.startsWith('generation-session:')
  )
  return sessionTag ? sessionTag.slice('generation-session:'.length) : ''
}

export async function startLiveQuestionGenerationSession({
  profileId,
  subjectMeta,
  config = {},
  meta = {},
} = {}) {
  const subjectKey = config.subject || meta.subject || subjectMeta?.key || ''
  if (!profileId || !subjectKey || !subjectMeta?.routeSlug) {
    throw new Error('缺少启动 AI 生成所需的上下文。')
  }

  const { normalized, generationPlan } = normalizeGenerationParams(subjectKey, config)
  const requestId = `live_${subjectKey}_${Date.now()}`
  const paperId = buildPaperId(`${subjectKey}:${requestId}`)
  const sessionId = requestId
  const title = meta.title || config.title || `${subjectMeta.shortLabel} AI 生成题目`

  const session = {
    sessionId,
    profileId,
    subjectKey,
    routeSlug: subjectMeta.routeSlug,
    paperId,
    requestId,
    title,
    config: {
      ...config,
      ...normalized,
      subject: subjectKey,
      title,
    },
    meta: {
      ...meta,
      ...normalized,
      subject: subjectKey,
      title,
      requestId,
    },
    generationPlan,
    activityEntries: buildQueuedActivityEntries(generationPlan),
    draftQuestions: new Array(generationPlan.length),
    status: 'generating',
    error: '',
    entryId: '',
    tags: ['AI生成', '生成中', getSessionTag(sessionId)],
    saveResult: null,
    listeners: new Set(),
    persistPromise: Promise.resolve(),
  }

  sessions.set(sessionId, session)

  const pendingEntry = await upsertLibraryEntry({
    profileId,
    subject: subjectKey,
    paperId,
    title,
    rawText: buildPendingLibraryRawText({
      paperId,
      title,
      subjectKey,
      requestId,
      config: session.config,
    }),
    tags: session.tags,
    schemaVersion: 'quiz-generation-pending-v1',
    questionCount: 0,
  })
  session.entryId = pendingEntry.id

  emitSession(session)

  void startQuestionGeneration({
    config: session.config,
    meta: session.meta,
    onQuestion: (_question, context = {}) => {
      if (typeof context.streamIndex !== 'number' || !context.entry) return
      session.draftQuestions[context.streamIndex - 1] = context.entry
      emitSession(session)
      if (isAcceptedEntry(context.entry)) {
        void queuePersist(sessionId, false)
      }
    },
    onProgress: (activity = {}) => {
      session.activityEntries = upsertActivityEntry(session.activityEntries, activity)
      emitSession(session)
    },
    onComplete: async () => {
      session.status = 'completed'
      session.error = ''
      session.tags = ['AI生成']
      await queuePersist(sessionId, true)
      emitSession(session)
    },
    onError: async (error) => {
      session.status = 'failed'
      session.error = error?.message || 'AI 生成失败'
      session.tags = ['AI生成', '生成失败']
      await queuePersist(sessionId, true)
      emitSession(session)
    },
  }).catch(async (error) => {
    session.status = 'failed'
    session.error = error?.message || 'AI 生成失败'
    session.tags = ['AI生成', '生成失败']
    await queuePersist(sessionId, true)
    emitSession(session)
  })

  return {
    sessionId,
    paperId,
    subject: subjectKey,
    title,
    routeSlug: subjectMeta.routeSlug,
  }
}
