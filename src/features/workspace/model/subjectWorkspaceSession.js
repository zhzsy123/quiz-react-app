import { buildQuizDocumentFromText } from '../../../entities/quiz/lib/quizPipeline'
import { buildPersistedItemsSnapshot } from './subjectWorkspaceObjective.js'
import { cloneFavoriteItem } from './subjectWorkspaceSideEffects.js'

export function formatRemainingSeconds(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function getExamDurationSeconds(quiz, subjectMeta) {
  const minutes = Number(quiz?.duration_minutes) || Number(subjectMeta?.defaultDurationMinutes) || 90
  return Math.max(1, minutes) * 60
}

export function buildProgressPayload({
  answers,
  revealedMap,
  relationalAlgebraExpandedMap,
  subQuestionFocusMap,
  submitted,
  score,
  attemptId,
  aiReview,
  aiExplainMap,
  aiAuditMap,
  currentIndex,
  remainingSeconds,
  isPaused,
  practiceWritesWrongBook,
  examWritesWrongBook,
  mode,
  quiz,
  entry,
  overrides = {},
}) {
  return {
    answers,
    revealedMap,
    relationalAlgebraExpandedMap,
    subQuestionFocusMap,
    submitted,
    score,
    attemptId,
    aiReview,
    aiExplainMap,
    aiAuditMap,
    currentIndex,
    timerSecondsRemaining: remainingSeconds,
    isPaused,
    practiceWritesWrongBook,
    examWritesWrongBook,
    mode,
    updatedAt: Date.now(),
    title: quiz?.title || entry?.title || 'Untitled paper',
    itemsSnapshot: buildPersistedItemsSnapshot(quiz?.items || []),
    ...overrides,
  }
}

function ensureQuizHasItems(targetQuiz) {
  if (!Array.isArray(targetQuiz?.items) || targetQuiz.items.length === 0) {
    throw new Error('试卷中没有可用题目。')
  }
  return targetQuiz
}

export async function loadWorkspaceSnapshot({
  activeProfileId,
  subjectKey,
  subjectMeta,
  source,
  paperId,
  sessionPaperId,
  favoriteRows,
  listLibraryEntries,
  loadSessionProgress,
}) {
  let resolvedEntry = null
  let resolvedQuiz = null
  let resolvedDurationSeconds = (subjectMeta.defaultDurationMinutes || 90) * 60

  if (source === 'favorites') {
    const items = favoriteRows.map((favoriteEntry, index) => cloneFavoriteItem(favoriteEntry, index))
    resolvedEntry = {
      title: `${subjectMeta.shortLabel}收藏题`,
      paperId: 'favorites',
    }
    resolvedQuiz = ensureQuizHasItems({
      title: `${subjectMeta.shortLabel}收藏题`,
      subject: subjectKey,
      duration_minutes: subjectMeta.defaultDurationMinutes || 90,
      items,
    })
    resolvedDurationSeconds = getExamDurationSeconds(resolvedQuiz, subjectMeta)
  } else {
    const entries = await listLibraryEntries(activeProfileId, subjectKey)
    const matched = entries.find((item) => item.paperId === paperId)
    if (!matched) return null

    resolvedEntry = matched
    resolvedQuiz = ensureQuizHasItems(buildQuizDocumentFromText(matched.rawText).quiz)
    resolvedDurationSeconds = getExamDurationSeconds(resolvedQuiz, subjectMeta)
  }

  const progress = await loadSessionProgress(activeProfileId, subjectKey, sessionPaperId)

  return {
    entry: resolvedEntry,
    quiz: resolvedQuiz,
    progress,
    resolvedDurationSeconds,
  }
}
