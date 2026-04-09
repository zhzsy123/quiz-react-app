import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAppContext } from '../../../app/providers/AppContext'
import { isObjectiveAnswered, isObjectiveResponseCorrect, normalizeChoiceArray } from '../../../entities/quiz/lib/objectiveAnswers'
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
  runExplainQuestionAi as runWorkspaceExplainQuestionAi,
  runSimilarQuestionsAi as runWorkspaceSimilarQuestionsAi,
  runSubjectiveAiReview as runWorkspaceSubjectiveAiReview,
} from './subjectWorkspaceAi.js'

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
  const sessionPaperId = source === 'favorites' ? `favorites:${mode}` : `${paperId}:${mode}`

  const [entry, setEntry] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const answersRef = useRef({})
  const [revealedMap, setRevealedMap] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [attemptId, setAttemptId] = useState('')
  const [aiReview, setAiReview] = useState(null)
  const [aiExplainMap, setAiExplainMap] = useState({})
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

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

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

        const { entry: nextEntry, quiz: nextQuiz, progress, resolvedDurationSeconds: nextDurationSeconds } = snapshot

        resolvedEntry = nextEntry
        resolvedQuiz = nextQuiz
        if (cancelled) return

        setEntry(resolvedEntry)
        setQuiz(resolvedQuiz)
        setAnswers(progress?.answers || {})
        setRevealedMap(progress?.revealedMap || {})
        setSubmitted(Boolean(progress?.submitted))
        setScore(progress?.score || 0)
        setAttemptId(progress?.attemptId || '')
        setAiReview(progress?.aiReview || null)
        setAiExplainMap(progress?.aiExplainMap || {})
        setCurrentIndex(Math.max(0, Math.min(progress?.currentIndex || 0, (resolvedQuiz.items?.length || 1) - 1)))
        setRemainingSeconds(
          typeof progress?.timerSecondsRemaining === 'number'
            ? progress.timerSecondsRemaining
            : nextDurationSeconds
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
  }, [activeProfile?.id, paperId, source, sessionPaperId, subjectKey, subjectMeta.shortLabel])

  const buildProgressPayload = (overrides = {}) =>
    buildWorkspaceProgressPayload({
      answers,
      revealedMap,
      submitted,
      score,
      attemptId,
      aiReview,
      aiExplainMap,
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
    await persistNow({ aiReview: nextReview, attemptId: nextAttemptId })
    await persistAttemptPatch(nextAttemptId, { aiReview: nextReview })
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

  const scoreSummary = useMemo(() => {
    return getQuizScoreBreakdown(quiz?.items || [])
  }, [quiz])

  const examDurationSeconds = useMemo(() => getWorkspaceExamDurationSeconds(quiz, subjectMeta), [quiz, subjectMeta])
  const objectiveTotalScore = scoreSummary.objectiveTotal
  const paperTotalScore = scoreSummary.paperTotal
  const subjectivePendingScore = scoreSummary.subjectiveTotal

  const practiceAccuracy = useMemo(() => {
    if (!quiz || mode !== 'practice') return { correct: 0, answered: 0, rate: 0 }

    let correct = 0
    let answered = 0

    quiz.items.forEach((item) => {
      if (item.type === 'composite') {
        const compositeResponses = answers[item.id] || {}
        item.questions.forEach((question) => {
          if (question.answer?.type !== 'objective') return
          if (isObjectiveAnswered(question, compositeResponses[question.id])) {
            answered += 1
            if (isObjectiveResponseCorrect(question, compositeResponses[question.id])) correct += 1
          }
        })
        return
      }

      if (item.type === 'reading') {
        const response = answers[item.id] || {}
        const readingQuestions = Array.isArray(item.questions) ? item.questions : []
        readingQuestions.forEach((question) => {
          if (isNonEmptyText(response[question.id])) {
            answered += 1
            if (response[question.id] === question.answer?.correct) correct += 1
          }
        })
        return
      }

      if (item.answer?.type === 'objective' && isObjectiveAnswered(item, answers[item.id])) {
        answered += 1
        if (isObjectiveResponseCorrect(item, answers[item.id])) correct += 1
      }
    })

    return { correct, answered, rate: answered ? Math.round((correct / answered) * 100) : 0 }
  }, [quiz, mode, answers])

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
        subjectivePendingTotal: subjectiveTotal,
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
        mode,
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
      const ok = window.confirm('还有未作答题目，确定现在交卷吗？')
      if (!ok) return
    }

    const nextScore = quiz.items.reduce((sum, item) => sum + getObjectiveItemScore(item, answers[item.id]), 0)
    const wrongCount = quiz.items.reduce((sum, item) => sum + getObjectiveWrongCount(item, answers[item.id]), 0)
    const initialAiReview = subjectivePendingScore > 0 ? createWorkspacePendingAiReview(subjectivePendingScore) : null
    const itemsSnapshot = buildWorkspacePersistedItemsSnapshot(quiz.items)
    const wrongItems = buildWorkspaceWrongItems(quiz.items, answers, {
      subject: subjectKey,
      paperId,
      paperTitle: entry?.title || quiz.title || '未命名试卷',
    })
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
        aiReview: initialAiReview,
        aiExplainMap,
      })
    }

    if (shouldWriteWrongBook && wrongItems.length > 0) {
      await upsertWrongbookEntries(activeProfile.id, subjectKey, wrongItems)
    }

    const nextAttemptId = savedAttempt?.id || ''
    if (nextAttemptId) {
      setAttemptId(nextAttemptId)
      await persistNow({ attemptId: nextAttemptId, aiReview: initialAiReview })
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
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers

    if (mode === 'practice') {
      const shouldRevealNow = currentItem.type !== 'multiple_choice'
      const nextRevealed = shouldRevealNow ? { ...revealedMap, [questionId]: true } : revealedMap
      if (shouldRevealNow) {
        setRevealedMap(nextRevealed)
      }
      let nextIndex = currentIndex
      const isCorrectNow = currentItem.type !== 'multiple_choice' && isObjectiveResponseCorrect(currentItem, nextValue)
      if (autoAdvance && isCorrectNow && currentIndex < quiz.items.length - 1) {
        nextIndex = currentIndex + 1
        setCurrentIndex(nextIndex)
      }
      void persistNow({ answers: nextAnswers, revealedMap: nextRevealed, currentIndex: nextIndex })
      return
    }

    let nextIndex = currentIndex
    if (autoAdvance && currentItem.type !== 'multiple_choice' && currentIndex < quiz.items.length - 1) {
      nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
    }

    void persistNow({ answers: nextAnswers, currentIndex: nextIndex })
  }

  const handleSelectClozeOption = (questionId, blankId, optionLetter) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'cloze' || currentItem.id !== questionId) return

    const nextItemResponse = { ...(answersRef.current[questionId] || {}), [blankId]: optionLetter }
    const nextAnswers = { ...answersRef.current, [questionId]: nextItemResponse }
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers

    if (mode === 'practice') {
      void persistNow({ answers: nextAnswers })
      return
    }

    const allAnswered = currentItem.blanks.every((blank) => isNonEmptyText(nextItemResponse[blank.blank_id]))
    let nextIndex = currentIndex
    if (autoAdvance && allAnswered && currentIndex < quiz.items.length - 1) {
      nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
    }

    void persistNow({ answers: nextAnswers, currentIndex: nextIndex })
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
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers

    if (mode === 'practice') {
      const revealKey = `${parentQuestionId}:${subQuestionId}`
      const shouldRevealNow = subQuestion.type !== 'multiple_choice'
      const nextRevealed = shouldRevealNow ? { ...revealedMap, [revealKey]: true } : revealedMap
      if (shouldRevealNow) {
        setRevealedMap(nextRevealed)
      }
      void persistNow({ answers: nextAnswers, revealedMap: nextRevealed })
      return
    }

    void persistNow({ answers: nextAnswers })
  }

  const handleSelectReadingOption = (questionId, subQuestionId, optionLetter) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'reading' || currentItem.id !== questionId) return
    const readingQuestions = Array.isArray(currentItem.questions) ? currentItem.questions : []
    if (!readingQuestions.length) return

    const nextItemResponse = { ...(answersRef.current[questionId] || {}), [subQuestionId]: optionLetter }
    const nextAnswers = { ...answersRef.current, [questionId]: nextItemResponse }
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers

    if (mode === 'practice') {
      const nextRevealed = { ...revealedMap, [`${questionId}:${subQuestionId}`]: true }
      setRevealedMap(nextRevealed)
      const answeredCount = readingQuestions.filter((question) => isNonEmptyText(nextItemResponse[question.id])).length
      const allCorrect =
        answeredCount === readingQuestions.length &&
        readingQuestions.every((question) => nextItemResponse[question.id] === question.answer?.correct)
      let nextIndex = currentIndex
      if (autoAdvance && allCorrect && currentIndex < quiz.items.length - 1) {
        nextIndex = currentIndex + 1
        setCurrentIndex(nextIndex)
      }
      void persistNow({ answers: nextAnswers, revealedMap: nextRevealed, currentIndex: nextIndex })
      return
    }

    const answeredCount = readingQuestions.filter((question) => isNonEmptyText(nextItemResponse[question.id])).length
    let nextIndex = currentIndex
    if (autoAdvance && answeredCount === readingQuestions.length && currentIndex < quiz.items.length - 1) {
      nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
    }

    void persistNow({ answers: nextAnswers, currentIndex: nextIndex })
  }

  const handleFillBlankChange = (questionId, blankId, text) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'fill_blank' || currentItem.id !== questionId) return

    const nextItemResponse = { ...(answersRef.current[questionId] || {}), [blankId]: text }
    const nextAnswers = { ...answersRef.current, [questionId]: nextItemResponse }
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers

    if (mode === 'practice') {
      const allFilled = currentItem.blanks.every((blank) => isNonEmptyText(nextItemResponse[blank.blank_id]))
      const nextRevealed = allFilled ? { ...revealedMap, [questionId]: true } : revealedMap
      if (allFilled) setRevealedMap(nextRevealed)
      const allCorrect =
        allFilled &&
        currentItem.blanks.every((blank) => {
          const userValue = String(nextItemResponse[blank.blank_id] || '').trim().toLowerCase()
          return blank.accepted_answers.some((candidate) => String(candidate).trim().toLowerCase() === userValue)
        })
      let nextIndex = currentIndex
      if (autoAdvance && allCorrect && currentIndex < quiz.items.length - 1) {
        nextIndex = currentIndex + 1
        setCurrentIndex(nextIndex)
      }
      void persistNow({ answers: nextAnswers, revealedMap: nextRevealed, currentIndex: nextIndex })
      return
    }

    void persistNow({ answers: nextAnswers })
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
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers

    if (mode === 'practice') {
      const allFilled = subQuestion.blanks.every((blank) => isNonEmptyText(nextSubResponse[blank.blank_id]))
      const revealKey = `${parentQuestionId}:${subQuestionId}`
      const nextRevealed = allFilled ? { ...revealedMap, [revealKey]: true } : revealedMap
      if (allFilled) setRevealedMap(nextRevealed)
      void persistNow({ answers: nextAnswers, revealedMap: nextRevealed })
      return
    }

    void persistNow({ answers: nextAnswers })
  }

  const handleRevealCurrentObjective = () => {
    if (!quiz || submitted || mode !== 'practice') return
    const currentItem = quiz.items[currentIndex]
    if (!currentItem || currentItem.answer?.type !== 'objective') return
    if (currentItem.type === 'cloze') {
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
    if (!subQuestion || subQuestion.answer?.type !== 'objective' || subQuestion.type !== 'multiple_choice') return

    const currentResponse = getCompositeSubQuestionResponse(currentItem, answers, subQuestionId)
    if (!isObjectiveAnswered(subQuestion, currentResponse)) return

    const revealKey = `${parentQuestionId}:${subQuestionId}`
    const nextRevealed = { ...revealedMap, [revealKey]: true }
    setRevealedMap(nextRevealed)
    void persistNow({ revealedMap: nextRevealed })
  }

  const handleTextChange = (questionId, text) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return
    const nextAnswers = { ...answersRef.current, [questionId]: { text } }
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers
    void persistNow({ answers: nextAnswers })
  }

  const handleCompositeTextChange = (parentQuestionId, subQuestionId, text) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'composite' || currentItem.id !== parentQuestionId) return

    const nextCompositeAnswers = {
      ...(answersRef.current[parentQuestionId] || {}),
      [subQuestionId]: { text },
    }
    const nextAnswers = { ...answersRef.current, [parentQuestionId]: nextCompositeAnswers }
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers
    void persistNow({ answers: nextAnswers })
  }

  const handleReset = async () => {
    if (!activeProfile?.id || !sessionPaperId) return
    const ok = window.confirm('Reset current progress?')
    if (!ok) return

    await clearSessionProgress(activeProfile.id, subjectKey, sessionPaperId)
    setAnswers({})
    setRevealedMap({})
    setSubmitted(false)
    setScore(0)
    setAttemptId('')
    setAiReview(null)
    setAiExplainMap({})
    setCurrentIndex(0)
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

  const aiQuestionReviewMap = aiReview?.questionReviews || {}

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
    aiExplainMode,
    aiPracticeModal,
    currentIndex,
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
    handleTextChange,
    handleCompositeTextChange,
    handleReset,
    handleChangeAiExplainMode,
    handleExplainQuestionWithMode,
    handleExplainWhyWrong,
    handleGenerateSimilarQuestions,
    handleCloseAiPracticeModal,
    handleFinish,
  }
}








