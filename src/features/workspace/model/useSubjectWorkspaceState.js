import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAppContext } from '../../../app/providers/AppContext'
import {
  isObjectiveAnswered,
  isObjectiveGradable,
  isObjectiveResponseCorrect,
  normalizeChoiceArray,
} from '../../../entities/quiz/lib/objectiveAnswers'
import {
  MANUAL_JUDGE_CORRECT,
  MANUAL_JUDGE_WRONG,
  getManualJudgeKey,
  normalizeManualJudgeMap,
  resolvePracticeJudge,
} from '../../../entities/quiz/lib/practiceJudging.js'
import { getQuizScoreBreakdown } from '../../../entities/quiz/lib/scoring/getQuizScoreBreakdown.js'
import {
  auditQuizQuestionCompliance,
  explainQuizQuestionWithMode,
  generateSimilarQuestions,
  gradeSubjectiveAttempt,
} from '../../ai/reviewService'
import { createHistoryEntry, updateHistoryEntry } from '../../../entities/history/api/historyRepository'
import { listFavoriteEntriesBySubject, toggleFavoriteEntry } from '../../../entities/favorite/api/favoriteRepository'
import { listLibraryEntries } from '../../../entities/library/api/libraryRepository'
import { getSubjectMetaByRouteParam } from '../../../entities/subject/model/subjects'
import {
  clearSessionProgress,
  loadSessionProgress,
  saveSessionProgress,
} from '../../../entities/session/api/sessionRepository'
import { upsertWrongbookEntries } from '../../../entities/wrongbook/api/wrongbookRepository'
import { loadPreference, savePreference } from '../../../shared/lib/preferences/preferenceRepository'
import { requestConfirmDialog } from '../../../shared/ui/dialogs/dialogService'
import {
  buildProgressPayload as buildWorkspaceProgressPayload,
  formatRemainingSeconds as formatWorkspaceRemainingSeconds,
  getExamDurationSeconds as getWorkspaceExamDurationSeconds,
  loadWorkspaceSnapshot as loadWorkspaceSnapshotModel,
} from './subjectWorkspaceSession.js'
import {
  buildFavoriteEntryFromItem as buildWorkspaceFavoriteEntryFromItem,
  buildWrongItems as buildWorkspaceWrongItems,
} from './subjectWorkspaceSideEffects.js'
import {
  buildPersistedItemsSnapshot as buildWorkspacePersistedItemsSnapshot,
  createPendingAiReview as createWorkspacePendingAiReview,
  getCompositeSubQuestionResponse,
  getExplainEntryKey as getWorkspaceExplainEntryKey,
  getObjectiveItemScore,
  getObjectiveWrongCount,
  isNonEmptyText,
  isResponseAnswered,
} from './subjectWorkspaceObjective.js'
import {
  runAuditQuestionAi as runWorkspaceAuditQuestionAi,
  runExplainQuestionAi as runWorkspaceExplainQuestionAi,
  runRelationalAlgebraSubquestionAi as runWorkspaceRelationalAlgebraSubquestionAi,
  runSimilarQuestionsAi as runWorkspaceSimilarQuestionsAi,
  runSingleSubjectiveQuestionAiReview as runWorkspaceSingleSubjectiveQuestionAiReview,
  runSubjectiveAiReview as runWorkspaceSubjectiveAiReview,
} from './subjectWorkspaceAi.js'
import {
  getQuestionGenerationSessionSnapshot,
  subscribeQuestionGenerationSession,
} from '../../question-generator/model/liveQuestionGenerationSession.js'
import {
  isRelationalAlgebraAnswered,
  normalizeRelationalAlgebraProgress,
  toggleRelationalAlgebraSubQuestionExpanded,
  updateRelationalAlgebraAnswer,
} from './subjectWorkspaceRelationalAlgebra.js'
import {
  getFirstNestedStepId,
  getNextNestedStepId,
  normalizeNestedFocusMap,
  setNestedFocusForItem,
} from './subjectWorkspaceNestedFlow.js'

const AUTO_ADVANCE_KEY = 'quiz:pref:autoAdvance'
const SPOILER_PREF_KEY = 'quiz:pref:showSpoilerTags'
const AI_EXPLAIN_MODE_KEY = 'quiz:pref:aiExplainMode'
const DEFAULT_PRACTICE_WRONG_BOOK = true
const DEFAULT_EXAM_WRONG_BOOK = true

export function useSubjectWorkspaceState() {
  const { subjectParam = 'english' } = useParams()
  const subjectMeta = getSubjectMetaByRouteParam(subjectParam)
  const subjectKey = subjectMeta.key

  const { activeProfile } = useAppContext()
  const [searchParams] = useSearchParams()
  const paperId = searchParams.get('paper') || ''
  const source = searchParams.get('source') || 'library'
  const mode = searchParams.get('mode') === 'practice' ? 'practice' : 'exam'
  const generationSessionId = searchParams.get('generation') || ''
  const sessionPaperId = source === 'favorites' ? `favorites:${mode}` : `${paperId}:${mode}`

  const [entry, setEntry] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const answersRef = useRef({})
  const [relationalAlgebraExpandedMap, setRelationalAlgebraExpandedMap] = useState({})
  const [subQuestionFocusMap, setSubQuestionFocusMap] = useState({})
  const [revealedMap, setRevealedMap] = useState({})
  const [manualJudgeMap, setManualJudgeMap] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [attemptId, setAttemptId] = useState('')
  const [aiReview, setAiReview] = useState(null)
  const aiReviewRef = useRef(null)
  const [aiExplainMap, setAiExplainMap] = useState({})
  const [aiAuditMap, setAiAuditMap] = useState({})
  const [aiExplainMode, setAiExplainMode] = useState('standard')
  const [aiPracticeModal, setAiPracticeModal] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [practiceWritesWrongBook, setPracticeWritesWrongBook] = useState(DEFAULT_PRACTICE_WRONG_BOOK)
  const [examWritesWrongBook, setExamWritesWrongBook] = useState(DEFAULT_EXAM_WRONG_BOOK)
  const [spoilerExpanded, setSpoilerExpanded] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(() => (subjectMeta.defaultDurationMinutes || 90) * 60)
  const [isPaused, setIsPaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [readyToPersist, setReadyToPersist] = useState(false)
  const [favoriteEntries, setFavoriteEntries] = useState([])
  const relationalAlgebraReviewRequestRef = useRef({})
  const singleQuestionReviewRequestRef = useRef({})

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    aiReviewRef.current = aiReview
  }, [aiReview])

  useEffect(() => {
    const storedAdvance = loadPreference(AUTO_ADVANCE_KEY, null)
    if (storedAdvance !== null) setAutoAdvance(storedAdvance === 'true')
    const storedSpoiler = loadPreference(SPOILER_PREF_KEY, null)
    if (storedSpoiler !== null) setSpoilerExpanded(storedSpoiler === 'true')
    const storedExplainMode = loadPreference(AI_EXPLAIN_MODE_KEY, null)
    if (storedExplainMode && ['brief', 'standard', 'deep'].includes(storedExplainMode)) {
      setAiExplainMode(storedExplainMode)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadWorkspace() {
      if (!activeProfile?.id) {
        setLoading(false)
        return
      }
      setLoadError('')

      try {
        const favoriteRows = await listFavoriteEntriesBySubject(activeProfile.id, subjectKey)
        if (cancelled) return
        setFavoriteEntries(favoriteRows)

        let resolvedEntry = null
        let resolvedQuiz = null
        let progress = null
        let resolvedDurationSeconds = (subjectMeta.defaultDurationMinutes || 90) * 60
        const liveGenerationSnapshot =
          source !== 'favorites' && generationSessionId
            ? getQuestionGenerationSessionSnapshot(generationSessionId)
            : null

        if (
          liveGenerationSnapshot &&
          liveGenerationSnapshot.subjectKey === subjectKey &&
          liveGenerationSnapshot.paperId === paperId
        ) {
          resolvedEntry = liveGenerationSnapshot.entry
          resolvedQuiz = liveGenerationSnapshot.quiz
          progress = await loadSessionProgress(activeProfile.id, subjectKey, sessionPaperId)
        } else {
          const snapshot = await loadWorkspaceSnapshotModel({
            activeProfileId: activeProfile.id,
            subjectKey,
            subjectMeta,
            source,
            paperId,
            sessionPaperId,
            favoriteRows,
            listLibraryEntries,
            loadSessionProgress,
          })

          if (!snapshot || cancelled) {
            setLoading(false)
            return
          }

          ;({ entry: resolvedEntry, quiz: resolvedQuiz, progress } = snapshot)
          resolvedDurationSeconds = snapshot.resolvedDurationSeconds
        }

        if (cancelled) return

        setEntry(resolvedEntry)
        setQuiz(resolvedQuiz)
        const nextAnswers = { ...(progress?.answers || {}) }
        if (resolvedQuiz?.items?.length) {
          resolvedQuiz.items.forEach((item) => {
            if (item.type === 'relational_algebra') {
              nextAnswers[item.id] = normalizeRelationalAlgebraProgress(item, nextAnswers[item.id])
            }
          })
        }

        setAnswers(nextAnswers)
        setRevealedMap(progress?.revealedMap || {})
        setRelationalAlgebraExpandedMap(progress?.relationalAlgebraExpandedMap || {})
        setSubQuestionFocusMap(normalizeNestedFocusMap(resolvedQuiz, progress?.subQuestionFocusMap || {}))
        setManualJudgeMap(normalizeManualJudgeMap(progress?.manualJudgeMap || {}))
        setSubmitted(Boolean(progress?.submitted))
        setScore(progress?.score || 0)
        setAttemptId(progress?.attemptId || '')
        setAiReview(progress?.aiReview || null)
        setAiExplainMap(progress?.aiExplainMap || {})
        setAiAuditMap(progress?.aiAuditMap || {})
        setCurrentIndex(Math.max(0, Math.min(progress?.currentIndex || 0, (resolvedQuiz.items?.length || 1) - 1)))
        setRemainingSeconds(
          typeof progress?.timerSecondsRemaining === 'number'
            ? progress.timerSecondsRemaining
            : resolvedDurationSeconds
        )
        setIsPaused(Boolean(progress?.isPaused))
        setPracticeWritesWrongBook(
          typeof progress?.practiceWritesWrongBook === 'boolean'
            ? progress.practiceWritesWrongBook
            : DEFAULT_PRACTICE_WRONG_BOOK
        )
        setExamWritesWrongBook(
          typeof progress?.examWritesWrongBook === 'boolean'
            ? progress.examWritesWrongBook
            : DEFAULT_EXAM_WRONG_BOOK
        )
        setReadyToPersist(true)
      } catch (error) {
        console.error('Failed to load workspace.', error)
        if (!cancelled) {
          setLoadError(error?.message || '试卷加载失败')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadWorkspace()
    return () => {
      cancelled = true
    }
  }, [activeProfile?.id, generationSessionId, paperId, source, sessionPaperId, subjectKey, subjectMeta.shortLabel])

  useEffect(() => {
    if (!generationSessionId || source === 'favorites') return undefined

    const snapshot = getQuestionGenerationSessionSnapshot(generationSessionId)
    if (!snapshot || snapshot.subjectKey !== subjectKey || snapshot.paperId !== paperId) {
      return undefined
    }

    return subscribeQuestionGenerationSession(generationSessionId, (nextSnapshot) => {
      setEntry(nextSnapshot.entry)
      setQuiz(nextSnapshot.quiz)
      setLoadError('')
      setCurrentIndex((current) =>
        Math.max(0, Math.min(current, Math.max((nextSnapshot.quiz?.items?.length || 1) - 1, 0)))
      )
    })
  }, [generationSessionId, paperId, source, subjectKey])

  const buildProgressPayload = (overrides = {}) =>
    buildWorkspaceProgressPayload({
      answers,
      revealedMap,
      relationalAlgebraExpandedMap,
      subQuestionFocusMap,
      manualJudgeMap,
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
      overrides,
    })

  const persistNow = async (overrides = {}) => {
    if (!readyToPersist || !quiz || !activeProfile?.id || !sessionPaperId) return
    await saveSessionProgress(activeProfile.id, subjectKey, sessionPaperId, buildProgressPayload(overrides))
  }

  const persistAttemptPatch = async (targetAttemptId, patch) => {
    if (!targetAttemptId) return
    try {
      await updateHistoryEntry(targetAttemptId, patch)
    } catch (error) {
      console.error('Failed to persist attempt patch.', error)
    }
  }

  const syncAiReview = async (nextReview, nextAttemptId = attemptId) => {
    setAiReview(nextReview)
    aiReviewRef.current = nextReview
    await persistNow({ aiReview: nextReview, attemptId: nextAttemptId })
    await persistAttemptPatch(nextAttemptId, { aiReview: nextReview })
  }

  const upsertAiQuestionReview = async (reviewKey, reviewEntry, progressOverrides = {}) => {
    const baseReview = aiReviewRef.current || createWorkspacePendingAiReview(subjectivePendingScore || 0)
    const nextReview = {
      ...baseReview,
      questionReviews: {
        ...(baseReview.questionReviews || {}),
        [reviewKey]: {
          ...(baseReview.questionReviews?.[reviewKey] || {}),
          ...reviewEntry,
        },
      },
    }

    setAiReview(nextReview)
    aiReviewRef.current = nextReview
    await persistNow({ aiReview: nextReview, ...progressOverrides })
    await persistAttemptPatch(attemptId, { aiReview: nextReview })
    return nextReview
  }

  const buildStaleQuestionReview = (reviewKey, feedback) => {
    const currentReview = aiReviewRef.current
    const existingEntry = currentReview?.questionReviews?.[reviewKey]
    if (!currentReview || !existingEntry) return null

    return {
      ...currentReview,
      questionReviews: {
        ...(currentReview.questionReviews || {}),
        [reviewKey]: {
          ...existingEntry,
          status: 'stale',
          score: 0,
          feedback,
          strengths: [],
          weaknesses: [],
          suggestions: [],
        },
      },
    }
  }

  const syncAiExplainEntry = async (entryKey, nextEntry, nextAttemptId = attemptId) => {
    const nextMap = {
      ...aiExplainMap,
      [entryKey]: nextEntry,
    }
    setAiExplainMap(nextMap)
    await persistNow({ aiExplainMap: nextMap, attemptId: nextAttemptId })
    await persistAttemptPatch(nextAttemptId, { aiExplainMap: nextMap })
  }

  const syncAiAuditEntry = async (entryKey, nextEntry, nextAttemptId = attemptId) => {
    const nextMap = {
      ...aiAuditMap,
      [entryKey]: nextEntry,
    }
    setAiAuditMap(nextMap)
    await persistNow({ aiAuditMap: nextMap, attemptId: nextAttemptId })
    await persistAttemptPatch(nextAttemptId, { aiAuditMap: nextMap })
  }

  const scoreSummary = useMemo(() => {
    return getQuizScoreBreakdown(quiz?.items || [])
  }, [quiz])

  const examDurationSeconds = useMemo(() => getWorkspaceExamDurationSeconds(quiz, subjectMeta), [quiz, subjectMeta])
  const objectiveTotalScore = scoreSummary.objectiveTotal
  const paperTotalScore = scoreSummary.paperTotal
  const subjectivePendingScore = scoreSummary.subjectiveTotal
  const aiQuestionReviewMap = aiReview?.questionReviews || {}

  const buildNextSubQuestionFocusMap = (item, subQuestionId, baseMap = subQuestionFocusMap) => {
    if (!item?.id) return baseMap
    return setNestedFocusForItem(baseMap, item, subQuestionId)
  }

  const applySubQuestionFocus = (item, subQuestionId, baseMap = subQuestionFocusMap) => {
    const nextMap = buildNextSubQuestionFocusMap(item, subQuestionId, baseMap)
    setSubQuestionFocusMap(nextMap)
    return nextMap
  }

  const moveToNextNestedTarget = (item, currentSubQuestionId, baseMap = subQuestionFocusMap) => {
    const nextSubQuestionId = getNextNestedStepId(item, currentSubQuestionId)
    let nextFocusMap = baseMap

    if (nextSubQuestionId) {
      nextFocusMap = applySubQuestionFocus(item, nextSubQuestionId, baseMap)
    }

    return {
      nextFocusMap,
      nextSubQuestionId,
    }
  }

  const clearManualJudgeForTarget = (item, subQuestion = null, baseMap = manualJudgeMap) => {
    const judgeKey = getManualJudgeKey(item, subQuestion)
    if (!judgeKey || !baseMap[judgeKey]) return baseMap

    const nextMap = { ...baseMap }
    delete nextMap[judgeKey]
    setManualJudgeMap(nextMap)
    return nextMap
  }

  const handleSetManualJudge = (itemId, verdict, subQuestionId = '') => {
    if (!quiz || mode !== 'practice' || submitted) return

    const item = quiz.items.find((entry) => String(entry.id) === String(itemId))
    if (!item) return

    const nestedSource =
      item.type === 'reading' || item.type === 'composite'
        ? item.questions
        : item.type === 'relational_algebra'
          ? item.subquestions
          : []
    const subQuestion = subQuestionId
      ? (Array.isArray(nestedSource)
          ? nestedSource.find((entry) => String(entry.id) === String(subQuestionId))
          : null)
      : null
    const judgeKey = getManualJudgeKey(item, subQuestion)
    if (!judgeKey) return

    const normalizedVerdict =
      verdict === MANUAL_JUDGE_CORRECT || verdict === MANUAL_JUDGE_WRONG ? verdict : null
    const nextMap = { ...manualJudgeMap }
    if (normalizedVerdict) {
      nextMap[judgeKey] = normalizedVerdict
    } else {
      delete nextMap[judgeKey]
    }

    setManualJudgeMap(nextMap)
    void persistNow({ manualJudgeMap: nextMap })
  }

  const practiceAccuracy = useMemo(() => {
    if (!quiz || mode !== 'practice') return { correct: 0, answered: 0, rate: 0 }

    let correct = 0
    let answered = 0

    quiz.items.forEach((item) => {
      if (item.type === 'composite') {
        const compositeResponses = answers[item.id] || {}
        item.questions.forEach((question) => {
          const reviewKey = `${item.id}:${question.id}`
          const judgement = resolvePracticeJudge({
            manualJudgeMap,
            item,
            response: compositeResponses[question.id],
            subQuestion: question,
            questionReview: aiQuestionReviewMap[reviewKey],
          })
          if (!judgement.answered) return
          answered += 1
          if (judgement.isCorrect) correct += 1
        })
        return
      }

      if (item.type === 'reading') {
        const response = answers[item.id] || {}
        const readingQuestions = Array.isArray(item.questions) ? item.questions : []
        readingQuestions.forEach((question) => {
          const judgement = resolvePracticeJudge({
            manualJudgeMap,
            item,
            response: response[question.id],
            subQuestion: question,
          })
          if (!judgement.answered) return
          answered += 1
          if (judgement.isCorrect) correct += 1
        })
        return
      }

      if (item.type === 'relational_algebra') {
        const responses = answers[item.id]?.responses || {}
        const subquestions = Array.isArray(item.subquestions) ? item.subquestions : []
        subquestions.forEach((question) => {
          const reviewKey = `${item.id}:${question.id}`
          const judgement = resolvePracticeJudge({
            manualJudgeMap,
            item,
            response: responses[question.id],
            subQuestion: question,
            questionReview: aiQuestionReviewMap[reviewKey],
          })
          if (!judgement.answered) return
          answered += 1
          if (judgement.isCorrect) correct += 1
        })
        return
      }

      const questionReview = aiQuestionReviewMap[item.id]
      const judgement = resolvePracticeJudge({
        manualJudgeMap,
        item,
        response: answers[item.id],
        questionReview,
      })
      if (judgement.answered) {
        answered += 1
        if (judgement.isCorrect) correct += 1
      }
    })

    return { correct, answered, rate: answered ? Math.round((correct / answered) * 100) : 0 }
  }, [quiz, mode, answers, manualJudgeMap, aiQuestionReviewMap])

  const getManualAwareObjectiveScore = () => {
    if (!quiz) return 0

    return quiz.items.reduce((sum, item) => {
      if (item.type === 'reading') {
        const response = answers[item.id] || {}
        return sum + (Array.isArray(item.questions) ? item.questions : []).reduce((innerSum, question) => {
          const judgement = resolvePracticeJudge({
            manualJudgeMap,
            item,
            response: response[question.id],
            subQuestion: question,
          })
          if (!judgement.answered) return innerSum
          if (judgement.overridden) return innerSum + (judgement.isCorrect ? judgement.maxScore : 0)
          return innerSum + (response[question.id] === question.answer?.correct ? Number(question.score || 0) : 0)
        }, 0)
      }

      if (item.type === 'composite') {
        const response = answers[item.id] || {}
        return sum + (Array.isArray(item.questions) ? item.questions : []).reduce((innerSum, question) => {
          if (question.answer?.type !== 'objective') return innerSum
          const judgement = resolvePracticeJudge({
            manualJudgeMap,
            item,
            response: response[question.id],
            subQuestion: question,
            questionReview: aiQuestionReviewMap[`${item.id}:${question.id}`],
          })
          if (!judgement.answered) return innerSum
          if (judgement.overridden) return innerSum + (judgement.isCorrect ? judgement.maxScore : 0)
          return innerSum + getObjectiveItemScore(question, response[question.id])
        }, 0)
      }

      if (item.answer?.type !== 'objective') return sum

      const judgement = resolvePracticeJudge({
        manualJudgeMap,
        item,
        response: answers[item.id],
      })
      if (!judgement.answered) return sum
      if (judgement.overridden) return sum + (judgement.isCorrect ? judgement.maxScore : 0)
      return sum + getObjectiveItemScore(item, answers[item.id])
    }, 0)
  }

  const getManualAwareWrongCount = () => {
    if (!quiz) return 0

    return quiz.items.reduce((sum, item) => {
      if (item.type === 'reading') {
        const response = answers[item.id] || {}
        return sum + (Array.isArray(item.questions) ? item.questions : []).reduce((innerSum, question) => {
          const judgement = resolvePracticeJudge({
            manualJudgeMap,
            item,
            response: response[question.id],
            subQuestion: question,
          })
          return innerSum + (judgement.answered && judgement.isWrong ? 1 : 0)
        }, 0)
      }

      if (item.type === 'composite') {
        const response = answers[item.id] || {}
        return sum + (Array.isArray(item.questions) ? item.questions : []).reduce((innerSum, question) => {
          if (question.answer?.type !== 'objective') return innerSum
          const judgement = resolvePracticeJudge({
            manualJudgeMap,
            item,
            response: response[question.id],
            subQuestion: question,
            questionReview: aiQuestionReviewMap[`${item.id}:${question.id}`],
          })
          return innerSum + (judgement.answered && judgement.isWrong ? 1 : 0)
        }, 0)
      }

      if (item.answer?.type !== 'objective') return sum

      const judgement = resolvePracticeJudge({
        manualJudgeMap,
        item,
        response: answers[item.id],
      })
      return sum + (judgement.answered && judgement.isWrong ? 1 : 0)
    }, 0)
  }

  const handleRunAiReview = async ({
    targetAttemptId = attemptId,
    objectiveScore,
    objectiveTotal,
    paperTotal,
    subjectiveTotal,
  }) => {
    if (!quiz || subjectiveTotal <= 0) return

    const pendingReview = createWorkspacePendingAiReview(subjectiveTotal)
    await syncAiReview(pendingReview, targetAttemptId)

    try {
      const completedReview = await runWorkspaceSubjectiveAiReview({
        quiz,
        answers,
        objectiveScore,
        objectiveTotal,
        paperTotal,
        subjectiveTotal,
      })
      await syncAiReview(completedReview, targetAttemptId)
    } catch (error) {
      await syncAiReview(
        {
          ...pendingReview,
          status: 'failed',
          error: error?.message || 'AI 评审失败',
        },
        targetAttemptId
      )
    }
  }

  const handleExplainQuestionWithMode = async ({ item, subQuestion = null, focus = 'general' }) => {
    if (!quiz || !item) return

    const entryKey = getWorkspaceExplainEntryKey(item.id, subQuestion?.id)
    await syncAiExplainEntry(
      entryKey,
      {
        status: 'pending',
        title: '',
        explanation: '',
        keyPoints: [],
        commonMistakes: [],
        answerStrategy: [],
        error: '',
      }
    )

    try {
      const completedExplain = await runWorkspaceExplainQuestionAi({
        aiExplainMode,
        quiz,
        answers,
        item,
        subQuestion,
        focus,
      })
      await syncAiExplainEntry(entryKey, completedExplain)
    } catch (error) {
      await syncAiExplainEntry(entryKey, {
        status: 'failed',
        title: 'AI 解释失败',
        explanation: '',
        keyPoints: [],
        commonMistakes: [],
        answerStrategy: [],
        error: error?.message || 'AI 解释失败',
      })
    }
  }

  const handleAuditQuestion = async ({ item, subQuestion = null }) => {
    if (!quiz || !item) return

    const entryKey = getWorkspaceExplainEntryKey(item.id, subQuestion?.id)
    await syncAiAuditEntry(entryKey, {
      kind: 'audit',
      status: 'pending',
      title: 'AI 核题',
      explanation: '',
      keyPoints: [],
      commonMistakes: [],
      answerStrategy: [],
      auditVerdict: '',
      error: '',
    })

    try {
      const completedAudit = await runWorkspaceAuditQuestionAi({
        quiz,
        answers,
        item,
        subQuestion,
      })
      await syncAiAuditEntry(entryKey, completedAudit)
    } catch (error) {
      await syncAiAuditEntry(entryKey, {
        kind: 'audit',
        status: 'failed',
        title: 'AI 核题失败',
        explanation: '',
        keyPoints: [],
        commonMistakes: [],
        answerStrategy: [],
        auditVerdict: '',
        error: error?.message || 'AI 核题失败',
      })
    }
  }

  const handleGradeQuestion = async ({ item, subQuestion = null }) => {
    if (!quiz || !item) return

    const target = subQuestion || item
    if (!['short_answer', 'er_diagram'].includes(target?.type || '')) return

    const reviewKey = subQuestion ? `${item.id}:${subQuestion.id}` : item.id
    const requestId = (singleQuestionReviewRequestRef.current[reviewKey] || 0) + 1
    singleQuestionReviewRequestRef.current[reviewKey] = requestId

    await upsertAiQuestionReview(reviewKey, {
      status: 'pending',
      questionId: reviewKey,
      score: 0,
      maxScore: Number(target?.score || item?.score || 0),
      feedback: 'AI 正在评分，请稍候。',
      strengths: [],
      weaknesses: [],
      suggestions: [],
    })

    try {
      const completedReview = await runWorkspaceSingleSubjectiveQuestionAiReview({
        quiz,
        answers,
        item,
        subQuestion,
      })
      if (singleQuestionReviewRequestRef.current[reviewKey] !== requestId) return
      await upsertAiQuestionReview(reviewKey, {
        ...completedReview,
        status: 'completed',
      })
    } catch (error) {
      if (singleQuestionReviewRequestRef.current[reviewKey] !== requestId) return
      await upsertAiQuestionReview(reviewKey, {
        status: 'failed',
        questionId: reviewKey,
        score: 0,
        maxScore: Number(target?.score || item?.score || 0),
        feedback: error?.message || 'AI 评分失败，请稍后重试。',
        strengths: [],
        weaknesses: [],
        suggestions: [],
      })
    }
  }

  const handleGenerateSimilarQuestions = async ({ item }) => {
    if (!quiz || !item) return

    setAiPracticeModal({
      status: 'pending',
      title: 'AI 正在生成同类题',
      questions: [],
      error: '',
    })

    try {
      const generated = await runWorkspaceSimilarQuestionsAi({ quiz, answers, item })
      setAiPracticeModal(generated)
    } catch (error) {
      setAiPracticeModal({
        status: 'failed',
        title: 'AI 同类题生成失败',
        questions: [],
        error: error?.message || 'AI 同类题生成失败',
      })
    }
  }

  useEffect(() => {
    if (mode !== 'exam' || !quiz || submitted || isPaused || remainingSeconds <= 0) return
    const timer = window.setInterval(() => {
      setRemainingSeconds((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [mode, quiz, submitted, isPaused, remainingSeconds])

  useEffect(() => {
    if (!readyToPersist || !quiz || !activeProfile?.id || !sessionPaperId) return
    if (submitted || isPaused || remainingSeconds % 5 === 0) {
      void persistNow()
    }
  }, [remainingSeconds, isPaused, submitted])

  const handleFinish = async (forced = false) => {
    if (!quiz?.items?.length || !activeProfile?.id) return

    const totalQuestions = quiz.items.length
    const answeredCount = quiz.items.filter((item) => isResponseAnswered(item, answers[item.id])).length

    if (mode === 'exam' && !forced && answeredCount < totalQuestions) {
      const ok = await requestConfirmDialog({
        title: '确认交卷',
        message: '还有未作答题目，确定现在交卷吗？',
        confirmLabel: '立即交卷',
        cancelLabel: '继续作答',
        tone: 'danger',
      })
      if (!ok) return
    }

    const nextScore = getManualAwareObjectiveScore()
    const wrongCount = getManualAwareWrongCount()
    const initialAiReview = subjectivePendingScore > 0 ? createWorkspacePendingAiReview(subjectivePendingScore) : null
    const itemsSnapshot = buildWorkspacePersistedItemsSnapshot(quiz.items)
    const wrongItems = buildWorkspaceWrongItems(
      quiz.items,
      answers,
      {
        subject: subjectKey,
        paperId,
        paperTitle: entry?.title || quiz.title || '未命名试卷',
      },
      manualJudgeMap
    )
    const shouldPersistAttempt = source !== 'favorites'
    const shouldWriteWrongBook = source !== 'favorites' && (mode === 'exam' ? examWritesWrongBook : practiceWritesWrongBook)

    setScore(nextScore)
    setSubmitted(true)
    setIsPaused(false)
    setAiReview(initialAiReview)

    let savedAttempt = null
    if (shouldPersistAttempt) {
      savedAttempt = await createHistoryEntry({
        profileId: activeProfile.id,
        subject: subjectKey,
        paperId,
        title: entry?.title || quiz.title || 'Untitled paper',
        objectiveScore: nextScore,
        objectiveTotal: objectiveTotalScore,
        paperTotal: paperTotalScore,
        subjectivePendingTotal: subjectivePendingScore,
        questionCount: totalQuestions,
        answeredCount,
        wrongCount,
        submittedAt: Date.now(),
        answersSnapshot: answers,
        itemsSnapshot,
        wrongItems,
        mode,
        includeInHistory: mode === 'exam',
        practiceWritesWrongBook,
        examWritesWrongBook,
        durationSeconds: examDurationSeconds,
        timerSecondsRemaining: remainingSeconds,
        manualJudgeMap,
        aiReview: initialAiReview,
        aiExplainMap,
        aiAuditMap,
      })
    }

    if (shouldWriteWrongBook && wrongItems.length > 0) {
      await upsertWrongbookEntries(activeProfile.id, subjectKey, wrongItems)
    }

    const nextAttemptId = savedAttempt?.id || ''
    if (nextAttemptId) {
      setAttemptId(nextAttemptId)
      await persistNow({ attemptId: nextAttemptId, aiReview: initialAiReview, manualJudgeMap })
    }

    if (subjectivePendingScore > 0) {
      void handleRunAiReview({
        targetAttemptId: nextAttemptId,
        objectiveScore: nextScore,
        objectiveTotal: objectiveTotalScore,
        paperTotal: paperTotalScore,
        subjectiveTotal: subjectivePendingScore,
      })
    }
  }

  useEffect(() => {
    if (mode === 'exam' && quiz && !submitted && remainingSeconds === 0) {
      void handleFinish(true)
    }
  }, [mode, quiz, submitted, remainingSeconds])

  const handleToggleSpoiler = () => {
    setSpoilerExpanded((prev) => {
      const next = !prev
      savePreference(SPOILER_PREF_KEY, next)
      return next
    })
  }

  const handleToggleAutoAdvance = () => {
    setAutoAdvance((prev) => {
      const next = !prev
      savePreference(AUTO_ADVANCE_KEY, next)
      return next
    })
  }

  const handleChangeAiExplainMode = (nextMode) => {
    if (!['brief', 'standard', 'deep'].includes(nextMode)) return
    setAiExplainMode(nextMode)
    savePreference(AI_EXPLAIN_MODE_KEY, nextMode)
  }

  const handleTogglePracticeWrongBook = () => {
    const next = !practiceWritesWrongBook
    setPracticeWritesWrongBook(next)
    void persistNow({ practiceWritesWrongBook: next })
  }

  const handleToggleExamWrongBook = () => {
    const next = !examWritesWrongBook
    setExamWritesWrongBook(next)
    void persistNow({ examWritesWrongBook: next })
  }

  const handleJump = (nextIndex) => {
    setCurrentIndex(nextIndex)
    void persistNow({ currentIndex: nextIndex })
  }

  const handleFocusSubQuestion = (questionId, subQuestionId) => {
    if (!quiz) return
    const currentItem = quiz.items.find((item) => item.id === questionId)
    if (!currentItem || !subQuestionId) return
    const nextMap = applySubQuestionFocus(currentItem, subQuestionId)
    void persistNow({ subQuestionFocusMap: nextMap })
  }

  const handlePrev = () => {
    const nextIndex = Math.max(currentIndex - 1, 0)
    setCurrentIndex(nextIndex)
    void persistNow({ currentIndex: nextIndex })
  }

  const handleNext = () => {
    const nextIndex = Math.min(currentIndex + 1, (quiz?.items?.length || 1) - 1)
    setCurrentIndex(nextIndex)
    void persistNow({ currentIndex: nextIndex })
  }

  const handleSelectOption = (questionId, optionLetter) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return

    const currentItem = quiz.items[currentIndex]
    if (
      currentItem?.type === 'reading' ||
      currentItem?.type === 'cloze' ||
      currentItem?.answer?.type !== 'objective' ||
      currentItem?.type === 'fill_blank'
    ) {
      return
    }

    let nextValue = optionLetter
    if (currentItem.type === 'multiple_choice') {
      const currentValues = normalizeChoiceArray(answersRef.current[questionId])
      nextValue = currentValues.includes(optionLetter)
        ? currentValues.filter((value) => value !== optionLetter)
        : [...currentValues, optionLetter].sort()
    }

    const nextAnswers = { ...answersRef.current, [questionId]: nextValue }
    const nextManualJudgeMap = clearManualJudgeForTarget(currentItem)
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers

    if (mode === 'practice') {
      const shouldRevealNow = currentItem.type !== 'multiple_choice'
      const nextRevealed = shouldRevealNow ? { ...revealedMap, [questionId]: true } : revealedMap
      if (shouldRevealNow) {
        setRevealedMap(nextRevealed)
      }
      let nextIndex = currentIndex
      const isCorrectNow =
        currentItem.type !== 'multiple_choice' &&
        isObjectiveGradable(currentItem) &&
        isObjectiveResponseCorrect(currentItem, nextValue)
      if (autoAdvance && isCorrectNow && currentIndex < quiz.items.length - 1) {
        nextIndex = currentIndex + 1
        setCurrentIndex(nextIndex)
      }
      void persistNow({
        answers: nextAnswers,
        revealedMap: nextRevealed,
        currentIndex: nextIndex,
        manualJudgeMap: nextManualJudgeMap,
      })
      return
    }

    let nextIndex = currentIndex
    if (autoAdvance && currentItem.type !== 'multiple_choice' && currentIndex < quiz.items.length - 1) {
      nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
    }

    void persistNow({ answers: nextAnswers, currentIndex: nextIndex, manualJudgeMap: nextManualJudgeMap })
  }

  const handleSelectClozeOption = (questionId, blankId, optionLetter) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'cloze' || currentItem.id !== questionId) return

    let nextFocusMap = applySubQuestionFocus(currentItem, blankId)
    const nextItemResponse = { ...(answersRef.current[questionId] || {}), [blankId]: optionLetter }
    const nextAnswers = { ...answersRef.current, [questionId]: nextItemResponse }
    const nextManualJudgeMap = clearManualJudgeForTarget(currentItem)
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers

    if (mode === 'practice') {
      if (autoAdvance) {
        const nextBlankId = getNextNestedStepId(currentItem, blankId)
        if (nextBlankId) {
          nextFocusMap = applySubQuestionFocus(currentItem, nextBlankId, nextFocusMap)
        }
      }
      void persistNow({
        answers: nextAnswers,
        subQuestionFocusMap: nextFocusMap,
        manualJudgeMap: nextManualJudgeMap,
      })
      return
    }

    const allAnswered = currentItem.blanks.every((blank) => isNonEmptyText(nextItemResponse[blank.blank_id]))
    let nextIndex = currentIndex
    if (autoAdvance) {
      const nextBlankId = getNextNestedStepId(currentItem, blankId)
      if (nextBlankId) {
        nextFocusMap = applySubQuestionFocus(currentItem, nextBlankId, nextFocusMap)
      } else if (allAnswered && currentIndex < quiz.items.length - 1) {
        nextIndex = currentIndex + 1
        setCurrentIndex(nextIndex)
      }
    }

    void persistNow({
      answers: nextAnswers,
      currentIndex: nextIndex,
      subQuestionFocusMap: nextFocusMap,
      manualJudgeMap: nextManualJudgeMap,
    })
  }

  const handleSelectCompositeOption = (parentQuestionId, subQuestionId, optionLetter) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'composite' || currentItem.id !== parentQuestionId) return

    const subQuestion = currentItem.questions?.find((question) => question.id === subQuestionId)
    if (!subQuestion || subQuestion.answer?.type !== 'objective' || subQuestion.type === 'fill_blank') return

    const compositeAnswers = { ...(answersRef.current[parentQuestionId] || {}) }
    const currentResponse = compositeAnswers[subQuestionId]

    let nextValue = optionLetter
    if (subQuestion.type === 'multiple_choice') {
      const currentValues = normalizeChoiceArray(currentResponse)
      nextValue = currentValues.includes(optionLetter)
        ? currentValues.filter((value) => value !== optionLetter)
        : [...currentValues, optionLetter].sort()
    }

    const nextCompositeAnswers = { ...compositeAnswers, [subQuestionId]: nextValue }
    const nextAnswers = { ...answersRef.current, [parentQuestionId]: nextCompositeAnswers }
    let nextFocusMap = applySubQuestionFocus(currentItem, subQuestionId)
    const nextManualJudgeMap = clearManualJudgeForTarget(currentItem, subQuestion)
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers

    if (mode === 'practice') {
      const revealKey = `${parentQuestionId}:${subQuestionId}`
      const shouldRevealNow = subQuestion.type !== 'multiple_choice'
      const nextRevealed = shouldRevealNow ? { ...revealedMap, [revealKey]: true } : revealedMap
      if (shouldRevealNow) {
        setRevealedMap(nextRevealed)
      }

      let nextIndex = currentIndex
      const shouldAdvanceWithinComposite =
        autoAdvance &&
        shouldRevealNow &&
        isObjectiveGradable(subQuestion) &&
        isObjectiveResponseCorrect(subQuestion, nextValue)

      if (shouldAdvanceWithinComposite) {
        const nestedAdvance = moveToNextNestedTarget(currentItem, subQuestionId, nextFocusMap)
        nextFocusMap = nestedAdvance.nextFocusMap
        if (!nestedAdvance.nextSubQuestionId && currentIndex < quiz.items.length - 1) {
          nextIndex = currentIndex + 1
          setCurrentIndex(nextIndex)
        }
      }

      void persistNow({
        answers: nextAnswers,
        revealedMap: nextRevealed,
        currentIndex: nextIndex,
        subQuestionFocusMap: nextFocusMap,
        manualJudgeMap: nextManualJudgeMap,
      })
      return
    }

    let nextIndex = currentIndex
    if (autoAdvance && subQuestion.type !== 'multiple_choice') {
      const nestedAdvance = moveToNextNestedTarget(currentItem, subQuestionId, nextFocusMap)
      nextFocusMap = nestedAdvance.nextFocusMap
      if (!nestedAdvance.nextSubQuestionId && currentIndex < quiz.items.length - 1) {
        nextIndex = currentIndex + 1
        setCurrentIndex(nextIndex)
      }
    }

    void persistNow({
      answers: nextAnswers,
      currentIndex: nextIndex,
      subQuestionFocusMap: nextFocusMap,
      manualJudgeMap: nextManualJudgeMap,
    })
  }

  const handleSelectReadingOption = (questionId, subQuestionId, optionLetter) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'reading' || currentItem.id !== questionId) return
    const readingQuestions = Array.isArray(currentItem.questions) ? currentItem.questions : []
    if (!readingQuestions.length) return
    const currentSubQuestion = readingQuestions.find((question) => String(question.id) === String(subQuestionId))
    if (!currentSubQuestion) return

    let nextFocusMap = applySubQuestionFocus(currentItem, subQuestionId)
    const nextItemResponse = { ...(answersRef.current[questionId] || {}), [subQuestionId]: optionLetter }
    const nextAnswers = { ...answersRef.current, [questionId]: nextItemResponse }
    const nextManualJudgeMap = clearManualJudgeForTarget(currentItem, currentSubQuestion)
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers

    if (mode === 'practice') {
      const nextRevealed = { ...revealedMap, [`${questionId}:${subQuestionId}`]: true }
      setRevealedMap(nextRevealed)
      const answeredCount = readingQuestions.filter((question) => isNonEmptyText(nextItemResponse[question.id])).length
      const gradableReadingQuestions = readingQuestions.filter((question) => isObjectiveGradable(question))
      const currentIsCorrect =
        currentSubQuestion && isObjectiveGradable(currentSubQuestion)
          ? nextItemResponse[subQuestionId] === currentSubQuestion.answer?.correct
          : false
      const allCorrect =
        answeredCount === readingQuestions.length &&
        gradableReadingQuestions.length > 0 &&
        gradableReadingQuestions.every((question) => nextItemResponse[question.id] === question.answer?.correct)
      let nextIndex = currentIndex
      if (autoAdvance && currentIsCorrect) {
        const nestedAdvance = moveToNextNestedTarget(currentItem, subQuestionId, nextFocusMap)
        nextFocusMap = nestedAdvance.nextFocusMap
        if (!nestedAdvance.nextSubQuestionId && allCorrect && currentIndex < quiz.items.length - 1) {
          nextIndex = currentIndex + 1
          setCurrentIndex(nextIndex)
        }
      }
      void persistNow({
        answers: nextAnswers,
        revealedMap: nextRevealed,
        currentIndex: nextIndex,
        subQuestionFocusMap: nextFocusMap,
        manualJudgeMap: nextManualJudgeMap,
      })
      return
    }

    const answeredCount = readingQuestions.filter((question) => isNonEmptyText(nextItemResponse[question.id])).length
    let nextIndex = currentIndex
    if (autoAdvance) {
      const nestedAdvance = moveToNextNestedTarget(currentItem, subQuestionId, nextFocusMap)
      nextFocusMap = nestedAdvance.nextFocusMap
      if (!nestedAdvance.nextSubQuestionId && answeredCount === readingQuestions.length && currentIndex < quiz.items.length - 1) {
        nextIndex = currentIndex + 1
        setCurrentIndex(nextIndex)
      }
    }

    void persistNow({
      answers: nextAnswers,
      currentIndex: nextIndex,
      subQuestionFocusMap: nextFocusMap,
      manualJudgeMap: nextManualJudgeMap,
    })
  }

  const handleFillBlankChange = (questionId, blankId, text) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'fill_blank' || currentItem.id !== questionId) return

    const nextItemResponse = { ...(answersRef.current[questionId] || {}), [blankId]: text }
    const nextAnswers = { ...answersRef.current, [questionId]: nextItemResponse }
    const nextManualJudgeMap = clearManualJudgeForTarget(currentItem)
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers

    if (mode === 'practice') {
      void persistNow({ answers: nextAnswers, manualJudgeMap: nextManualJudgeMap })
      return
    }

    void persistNow({ answers: nextAnswers, manualJudgeMap: nextManualJudgeMap })
  }

  const handleCompositeFillBlankChange = (parentQuestionId, subQuestionId, blankId, text) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'composite' || currentItem.id !== parentQuestionId) return

    const subQuestion = currentItem.questions?.find((question) => question.id === subQuestionId)
    if (subQuestion?.type !== 'fill_blank') return

    const compositeAnswers = { ...(answersRef.current[parentQuestionId] || {}) }
    const currentSubResponse = { ...(compositeAnswers[subQuestionId] || {}) }
    const nextSubResponse = { ...currentSubResponse, [blankId]: text }
    const nextCompositeAnswers = { ...compositeAnswers, [subQuestionId]: nextSubResponse }
    const nextAnswers = { ...answersRef.current, [parentQuestionId]: nextCompositeAnswers }
    let nextFocusMap = applySubQuestionFocus(currentItem, subQuestionId)
    const nextManualJudgeMap = clearManualJudgeForTarget(currentItem, subQuestion)
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers

    if (mode === 'practice') {
      void persistNow({
        answers: nextAnswers,
        subQuestionFocusMap: nextFocusMap,
        manualJudgeMap: nextManualJudgeMap,
      })
      return
    }

    const isComplete = isObjectiveAnswered(subQuestion, nextSubResponse)
    let nextIndex = currentIndex
    if (autoAdvance && isComplete) {
      const nestedAdvance = moveToNextNestedTarget(currentItem, subQuestionId, nextFocusMap)
      nextFocusMap = nestedAdvance.nextFocusMap
      if (!nestedAdvance.nextSubQuestionId && currentIndex < quiz.items.length - 1) {
        nextIndex = currentIndex + 1
        setCurrentIndex(nextIndex)
      }
    }

    void persistNow({
      answers: nextAnswers,
      currentIndex: nextIndex,
      subQuestionFocusMap: nextFocusMap,
      manualJudgeMap: nextManualJudgeMap,
    })
  }

  const handleRevealCurrentObjective = () => {
    if (!quiz || submitted || mode !== 'practice') return
    const currentItem = quiz.items[currentIndex]
    if (!currentItem || currentItem.answer?.type !== 'objective') return
    if (currentItem.type === 'cloze' || currentItem.type === 'fill_blank') {
      const currentResponse = answers[currentItem.id]
      if (!isObjectiveAnswered(currentItem, currentResponse)) return

      const nextRevealed = { ...revealedMap, [currentItem.id]: true }
      setRevealedMap(nextRevealed)

      let nextIndex = currentIndex
      if (autoAdvance && isObjectiveResponseCorrect(currentItem, currentResponse) && currentIndex < quiz.items.length - 1) {
        nextIndex = currentIndex + 1
        setCurrentIndex(nextIndex)
      }

      void persistNow({ revealedMap: nextRevealed, currentIndex: nextIndex })
      return
    }

    if (currentItem.type !== 'multiple_choice') return

    const currentResponse = answers[currentItem.id]
    if (!isObjectiveAnswered(currentItem, currentResponse)) return

    const nextRevealed = { ...revealedMap, [currentItem.id]: true }
    setRevealedMap(nextRevealed)

    let nextIndex = currentIndex
    if (autoAdvance && isObjectiveResponseCorrect(currentItem, currentResponse) && currentIndex < quiz.items.length - 1) {
      nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
    }

    void persistNow({ revealedMap: nextRevealed, currentIndex: nextIndex })
  }

  const handleRevealCompositeQuestion = (parentQuestionId, subQuestionId) => {
    if (!quiz || submitted || mode !== 'practice') return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'composite' || currentItem.id !== parentQuestionId) return

    const subQuestion = currentItem.questions?.find((question) => question.id === subQuestionId)
    if (
      !subQuestion ||
      subQuestion.answer?.type !== 'objective' ||
      !['multiple_choice', 'fill_blank'].includes(subQuestion.type)
    ) {
      return
    }

    const currentResponse = getCompositeSubQuestionResponse(currentItem, answers, subQuestionId)
    if (!isObjectiveAnswered(subQuestion, currentResponse)) return

    const revealKey = `${parentQuestionId}:${subQuestionId}`
    const nextRevealed = { ...revealedMap, [revealKey]: true }
    setRevealedMap(nextRevealed)
    let nextFocusMap = applySubQuestionFocus(currentItem, subQuestionId)
    let nextIndex = currentIndex

    if (autoAdvance && isObjectiveResponseCorrect(subQuestion, currentResponse)) {
      const nestedAdvance = moveToNextNestedTarget(currentItem, subQuestionId, nextFocusMap)
      nextFocusMap = nestedAdvance.nextFocusMap
      if (!nestedAdvance.nextSubQuestionId && currentIndex < quiz.items.length - 1) {
        nextIndex = currentIndex + 1
        setCurrentIndex(nextIndex)
      }
    }

    void persistNow({ revealedMap: nextRevealed, currentIndex: nextIndex, subQuestionFocusMap: nextFocusMap })
  }

  const handleTextChange = (questionId, text) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return
    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type === 'relational_algebra') return
    const nextAnswers = { ...answersRef.current, [questionId]: { text } }
    const nextManualJudgeMap = clearManualJudgeForTarget(currentItem)
    const nextReview = buildStaleQuestionReview(questionId, '答案已更新，请重新点击 AI评分。')
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers
    if (nextReview) {
      setAiReview(nextReview)
      aiReviewRef.current = nextReview
      void persistNow({ answers: nextAnswers, manualJudgeMap: nextManualJudgeMap, aiReview: nextReview })
      void persistAttemptPatch(attemptId, { aiReview: nextReview })
      return
    }
    void persistNow({ answers: nextAnswers, manualJudgeMap: nextManualJudgeMap })
  }

  const handleCompositeTextChange = (parentQuestionId, subQuestionId, text) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'composite' || currentItem.id !== parentQuestionId) return
    const subQuestion = currentItem.questions?.find((question) => question.id === subQuestionId)
    if (!subQuestion) return

    const nextCompositeAnswers = {
      ...(answersRef.current[parentQuestionId] || {}),
      [subQuestionId]: { text },
    }
    const nextAnswers = { ...answersRef.current, [parentQuestionId]: nextCompositeAnswers }
    const nextManualJudgeMap = clearManualJudgeForTarget(currentItem, subQuestion)
    const reviewKey = `${parentQuestionId}:${subQuestionId}`
    const nextReview = buildStaleQuestionReview(reviewKey, '答案已更新，请重新点击 AI评分。')
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers
    if (nextReview) {
      setAiReview(nextReview)
      aiReviewRef.current = nextReview
      void persistNow({ answers: nextAnswers, manualJudgeMap: nextManualJudgeMap, aiReview: nextReview })
      void persistAttemptPatch(attemptId, { aiReview: nextReview })
      return
    }
    void persistNow({ answers: nextAnswers, manualJudgeMap: nextManualJudgeMap })
  }

  const handleErDiagramChange = (questionId, nextResponse) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'er_diagram' || currentItem.id !== questionId) return

    const nextAnswers = { ...answersRef.current, [questionId]: nextResponse }
    const nextManualJudgeMap = clearManualJudgeForTarget(currentItem)
    const nextReview = buildStaleQuestionReview(questionId, '图形答案已更新，请重新点击 AI评分。')
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers

    if (nextReview) {
      setAiReview(nextReview)
      aiReviewRef.current = nextReview
      void persistNow({ answers: nextAnswers, manualJudgeMap: nextManualJudgeMap, aiReview: nextReview })
      void persistAttemptPatch(attemptId, { aiReview: nextReview })
      return
    }

    void persistNow({ answers: nextAnswers, manualJudgeMap: nextManualJudgeMap })
  }

  const handleRelationalAlgebraTextChange = (questionId, subQuestionId, text) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'relational_algebra' || currentItem.id !== questionId) return
    const subQuestion = Array.isArray(currentItem.subquestions)
      ? currentItem.subquestions.find((question) => String(question.id) === String(subQuestionId))
      : null
    if (!subQuestion) return

    const nextFocusMap = applySubQuestionFocus(currentItem, subQuestionId)
    const nextQuestionState = updateRelationalAlgebraAnswer(currentItem, answersRef.current[questionId], subQuestionId, text)
    const nextAnswers = { ...answersRef.current, [questionId]: nextQuestionState }
    const nextManualJudgeMap = clearManualJudgeForTarget(currentItem, subQuestion)
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers
    const reviewKey = `${questionId}:${subQuestionId}`
    relationalAlgebraReviewRequestRef.current[reviewKey] =
      (relationalAlgebraReviewRequestRef.current[reviewKey] || 0) + 1

    const currentReview = aiReviewRef.current
    const hasReview = Boolean(currentReview?.questionReviews?.[reviewKey])
    if (!hasReview) {
      void persistNow({
        answers: nextAnswers,
        subQuestionFocusMap: nextFocusMap,
        manualJudgeMap: nextManualJudgeMap,
      })
      return
    }

    const nextReview = {
      ...currentReview,
      questionReviews: {
        ...(currentReview.questionReviews || {}),
        [reviewKey]: {
          ...(currentReview.questionReviews?.[reviewKey] || {}),
          status: 'stale',
          verdict: 'unverified',
          score: 0,
          completion: 0,
          feedback: '答案已更新，请再次点击 AI 判题。',
          strengths: [],
          earned_points: [],
          missing_points: [],
          error_points: [],
          normalizedUserAnswer: '',
          answerText: String(text || '').trim(),
        },
      },
    }

    setAiReview(nextReview)
    aiReviewRef.current = nextReview
    void persistNow({
      answers: nextAnswers,
      aiReview: nextReview,
      subQuestionFocusMap: nextFocusMap,
      manualJudgeMap: nextManualJudgeMap,
    })
  }

  const handleToggleRelationalAlgebraSubQuestion = (questionId, subQuestionId, nextExpanded) => {
    if (!quiz) return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'relational_algebra' || currentItem.id !== questionId) return

    const nextExpandedMap = toggleRelationalAlgebraSubQuestionExpanded(
      currentItem,
      relationalAlgebraExpandedMap[questionId] || {},
      subQuestionId,
      nextExpanded
    )
    const nextMap = {
      ...relationalAlgebraExpandedMap,
      [questionId]: nextExpandedMap,
    }
    const nextFocusMap = applySubQuestionFocus(currentItem, subQuestionId)
    setRelationalAlgebraExpandedMap(nextMap)
    void persistNow({ relationalAlgebraExpandedMap: nextMap, subQuestionFocusMap: nextFocusMap })
  }

  const handleRevealRelationalAlgebraQuestion = (questionId, subQuestionId) => {
    if (!quiz || submitted || mode !== 'practice') return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'relational_algebra' || currentItem.id !== questionId || !subQuestionId) return

    const subQuestion = Array.isArray(currentItem.subquestions)
      ? currentItem.subquestions.find((question) => String(question.id) === String(subQuestionId))
      : null
    const userAnswer = answers?.[questionId]?.responses?.[subQuestionId]

    if (!subQuestion || !String(userAnswer || '').trim()) return

    const reviewKey = `${questionId}:${subQuestionId}`

    const requestId = (relationalAlgebraReviewRequestRef.current[reviewKey] || 0) + 1
    relationalAlgebraReviewRequestRef.current[reviewKey] = requestId

    void (async () => {
      await upsertAiQuestionReview(reviewKey, {
        status: 'pending',
        questionId: reviewKey,
        subquestionId: String(subQuestionId),
        verdict: 'pending',
        equivalent: false,
        score: 0,
        maxScore: Number(subQuestion.score) || 0,
        completion: 0,
        confidence: 0,
        feedback: 'AI 正在判题，请稍候。',
        strengths: [],
        weaknesses: [],
        suggestions: [],
        earned_points: [],
        answerText: String(userAnswer || '').trim(),
        normalizedReference: '',
        normalizedUserAnswer: '',
      })

      try {
        const completedReview = await runWorkspaceRelationalAlgebraSubquestionAi({
          quiz,
          item: currentItem,
          answers: answersRef.current,
          subQuestion,
          objectiveScore: score,
          objectiveTotal: objectiveTotalScore,
          paperTotal: paperTotalScore,
        })

        if (relationalAlgebraReviewRequestRef.current[reviewKey] !== requestId) return

        let nextFocusMap = applySubQuestionFocus(currentItem, subQuestionId)
        let nextExpandedMap = relationalAlgebraExpandedMap
        let nextIndex = currentIndex

        if (autoAdvance && completedReview.verdict === 'correct') {
          const nestedAdvance = moveToNextNestedTarget(currentItem, subQuestionId, nextFocusMap)
          nextFocusMap = nestedAdvance.nextFocusMap

          if (nestedAdvance.nextSubQuestionId) {
            const expandedForItem = toggleRelationalAlgebraSubQuestionExpanded(
              currentItem,
              relationalAlgebraExpandedMap[questionId] || {},
              nestedAdvance.nextSubQuestionId,
              true
            )
            nextExpandedMap = {
              ...relationalAlgebraExpandedMap,
              [questionId]: expandedForItem,
            }
            setRelationalAlgebraExpandedMap(nextExpandedMap)
          } else if (currentIndex < quiz.items.length - 1) {
            nextIndex = currentIndex + 1
            setCurrentIndex(nextIndex)
          }
        }

        await upsertAiQuestionReview(reviewKey, {
          ...completedReview,
          status: 'completed',
        }, {
          currentIndex: nextIndex,
          subQuestionFocusMap: nextFocusMap,
          relationalAlgebraExpandedMap: nextExpandedMap,
        })
      } catch (error) {
        if (relationalAlgebraReviewRequestRef.current[reviewKey] !== requestId) return

        await upsertAiQuestionReview(reviewKey, {
          status: 'failed',
          questionId: reviewKey,
          subquestionId: String(subQuestionId),
          verdict: 'incorrect',
          equivalent: false,
          score: 0,
          maxScore: Number(subQuestion.score) || 0,
          completion: 0,
          confidence: 0,
          feedback: error?.message || 'AI 判题失败，请稍后重试。',
          strengths: [],
          weaknesses: [],
          suggestions: [],
          earned_points: [],
          answerText: String(userAnswer || '').trim(),
          normalizedReference: '',
          normalizedUserAnswer: String(userAnswer || '').trim(),
        })
      }
    })()
  }

  const handleReset = async () => {
    if (!activeProfile?.id || !sessionPaperId) return
    const ok = await requestConfirmDialog({
      title: '重置当前进度',
      message: '确定重置当前试卷进度吗？这会清空当前作答内容。',
      confirmLabel: '重置',
      cancelLabel: '取消',
      tone: 'danger',
    })
    if (!ok) return

    await clearSessionProgress(activeProfile.id, subjectKey, sessionPaperId)
    setAnswers({})
    setRevealedMap({})
    setRelationalAlgebraExpandedMap({})
    setManualJudgeMap({})
    setSubmitted(false)
    setScore(0)
    setAttemptId('')
    setAiReview(null)
    setAiExplainMap({})
    setAiAuditMap({})
    setCurrentIndex(0)
    setSubQuestionFocusMap(normalizeNestedFocusMap(quiz, {}))
    setRemainingSeconds(examDurationSeconds)
    setIsPaused(false)

    await saveSessionProgress(activeProfile.id, subjectKey, sessionPaperId, {
      answers: {},
      revealedMap: {},
      submitted: false,
      score: 0,
      attemptId: '',
      aiReview: null,
      aiExplainMap: {},
      aiAuditMap: {},
      relationalAlgebraExpandedMap: {},
      subQuestionFocusMap: normalizeNestedFocusMap(quiz, {}),
      manualJudgeMap: {},
      currentIndex: 0,
      timerSecondsRemaining: examDurationSeconds,
      isPaused: false,
      practiceWritesWrongBook,
      examWritesWrongBook,
      mode,
      updatedAt: Date.now(),
      title: quiz?.title || entry?.title || 'Untitled paper',
    })
  }

  const favoriteQuestionKey = useMemo(() => {
    if (!quiz?.items?.[currentIndex]) return ''
    const item = quiz.items[currentIndex]
    if (source === 'favorites') {
      const favoriteEntry = favoriteEntries[currentIndex]
      return favoriteEntry?.questionKey || ''
    }
    return `${subjectKey}:${paperId}:${item.id}`
  }, [quiz, currentIndex, source, favoriteEntries, paperId, subjectKey])

  const favoriteMap = useMemo(() => {
    const map = {}
    favoriteEntries.forEach((favoriteEntry) => {
      map[favoriteEntry.questionKey] = favoriteEntry
    })
    return map
  }, [favoriteEntries])

  const handleToggleFavorite = async () => {
    if (!activeProfile?.id || !quiz?.items?.[currentIndex] || source === 'favorites') return
    const item = quiz.items[currentIndex]
    const entryToToggle = buildWorkspaceFavoriteEntryFromItem(item, {
      subject: subjectKey,
      paperId,
      paperTitle: entry?.title || quiz.title || 'Untitled paper',
    })
    const result = await toggleFavoriteEntry(activeProfile.id, subjectKey, entryToToggle)
    setFavoriteEntries(result.entries)
  }

  const backLink = source === 'favorites' ? '/favorites' : `/exam/${subjectMeta.routeSlug}`
  const remainingTimeLabel = formatWorkspaceRemainingSeconds(remainingSeconds)
  const isCurrentFavorite = Boolean(favoriteMap[favoriteQuestionKey])

  const handleTogglePause = () => {
    const next = !isPaused
    setIsPaused(next)
    void persistNow({ isPaused: next })
  }

  const handleExplainWhyWrong = ({ item, subQuestion = null }) =>
    handleExplainQuestionWithMode({ item, subQuestion, focus: 'wrong_reason' })

  const handleCloseAiPracticeModal = () => setAiPracticeModal(null)

  return {
    loading,
    loadError,
    entry,
    quiz,
    source,
    mode,
    subjectMeta,
    answers,
    revealedMap,
    submitted,
    score,
    aiReview,
    aiQuestionReviewMap,
    aiExplainMap,
    aiAuditMap,
    aiExplainMode,
    aiPracticeModal,
    currentIndex,
    relationalAlgebraExpandedMap,
    subQuestionFocusMap,
    manualJudgeMap,
    autoAdvance,
    practiceWritesWrongBook,
    examWritesWrongBook,
    spoilerExpanded,
    remainingSeconds,
    remainingTimeLabel,
    isPaused,
    practiceAccuracy,
    objectiveTotalScore,
    paperTotalScore,
    subjectivePendingScore,
    isCurrentFavorite,
    backLink,
    handleToggleFavorite,
    handleToggleSpoiler,
    handleToggleAutoAdvance,
    handleFocusSubQuestion,
    handleSetManualJudge,
    handleTogglePracticeWrongBook,
    handleToggleExamWrongBook,
    handleTogglePause,
    handleJump,
    handlePrev,
    handleNext,
    handleSelectOption,
    handleSelectCompositeOption,
    handleRevealCurrentObjective,
    handleRevealCompositeQuestion,
    handleSelectReadingOption,
    handleSelectClozeOption,
    handleFillBlankChange,
    handleCompositeFillBlankChange,
    handleRelationalAlgebraTextChange,
    handleToggleRelationalAlgebraSubQuestion,
    handleRevealRelationalAlgebraQuestion,
    handleTextChange,
    handleCompositeTextChange,
    handleErDiagramChange,
    handleReset,
    handleChangeAiExplainMode,
    handleExplainQuestionWithMode,
    handleAuditQuestion,
    handleGradeQuestion,
    handleExplainWhyWrong,
    handleGenerateSimilarQuestions,
    handleCloseAiPracticeModal,
    handleFinish,
  }
}








