import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Clock3, Home, Pause, Play, RefreshCw, Star } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import CleanQuizView from '../components/CleanQuizView'
import { useAppContext } from '../context/AppContext'
import { getQuizScoreBreakdown, parseQuizText } from '../boundaries/quizSchema'
import { explainQuizQuestion, gradeSubjectiveAttempt } from '../services/ai/reviewService'
import {
  clearProgressRecord,
  listLibraryEntries,
  loadFavoriteEntries,
  loadPreference,
  loadProgressRecord,
  savePreference,
  saveAttemptRecord,
  saveProgressRecord,
  toggleFavoriteEntry,
  updateAttemptRecord,
} from '../boundaries/storageFacade'
import { getSubjectMetaByRouteParam } from '../config/subjects'

const AUTO_ADVANCE_KEY = 'quiz:pref:autoAdvance'
const SPOILER_PREF_KEY = 'quiz:pref:showSpoilerTags'
const EXAM_DURATION_SECONDS = 90 * 60
const DEFAULT_PRACTICE_WRONG_BOOK = true

function createPendingAiReview(subjectivePendingScore) {
  return {
    status: 'pending',
    provider: 'deepseek',
    reviewedAt: null,
    totalSubjectiveScore: 0,
    totalScore: null,
    subjectivePendingTotal: subjectivePendingScore,
    overallComment: '',
    weaknessSummary: [],
    questionReviews: {},
    error: '',
  }
}

function getExplainEntryKey(itemId, subQuestionId = '') {
  return subQuestionId ? `${itemId}:${subQuestionId}` : itemId
}

function isNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeChoiceArray(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))].sort()
}

function clipText(text = '', maxLength = 180) {
  if (typeof text !== 'string') return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

function getOptionText(options = [], key = '') {
  if (!key) return '未作答'
  const match = options.find((option) => option?.key === key)
  if (!match) return key
  return `${match.key}. ${match.text}`
}

function getObjectiveAnswerLabel(item, response) {
  if (item.type === 'multiple_choice') {
    const values = normalizeChoiceArray(response)
    return values.length ? values.map((value) => getOptionText(item.options || [], value)).join(' / ') : '未作答'
  }
  if (item.type === 'fill_blank') {
    if (!response || typeof response !== 'object') return '未作答'
    return (
      item.blanks
        .map((blank) => String(response[blank.blank_id] || '').trim())
        .filter(Boolean)
        .join(' / ') || '未作答'
    )
  }
  return getOptionText(item.options || [], response || '')
}

function isObjectiveAnswered(item, response) {
  if (!item || item.answer?.type !== 'objective') return false
  if (item.type === 'multiple_choice') {
    return normalizeChoiceArray(response).length > 0
  }
  if (item.type === 'fill_blank') {
    if (!response || typeof response !== 'object') return false
    return item.blanks.every((blank) => isNonEmptyText(response[blank.blank_id]))
  }
  return isNonEmptyText(response)
}

function isObjectiveCorrect(item, response) {
  if (!item || item.answer?.type !== 'objective') return false
  if (item.type === 'multiple_choice') {
    const actual = normalizeChoiceArray(response)
    const expected = normalizeChoiceArray(item.answer?.correct)
    return actual.length > 0 && actual.length === expected.length && actual.every((value, index) => value === expected[index])
  }
  if (item.type === 'fill_blank') {
    if (!response || typeof response !== 'object') return false
    return item.blanks.every((blank) => {
      const userValue = String(response[blank.blank_id] || '').trim().toLowerCase()
      return blank.accepted_answers.some((candidate) => String(candidate).trim().toLowerCase() === userValue)
    })
  }
  return response === item.answer?.correct
}

function isResponseAnswered(item, response) {
  if (!item) return false
  if (item.type === 'reading') {
    if (!response || typeof response !== 'object') return false
    return item.questions.every((question) => isNonEmptyText(response[question.id]))
  }
  if (item.answer?.type === 'subjective') {
    return Boolean(response?.text?.trim())
  }
  return isObjectiveAnswered(item, response)
}

function getObjectiveItemTotal(item) {
  if (!item) return 0
  if (item.type === 'reading') {
    return item.questions.reduce((sum, question) => sum + (question.score || 0), 0)
  }
  if (item.type === 'fill_blank') {
    return item.blanks.reduce((sum, blank) => sum + (blank.score || 0), 0)
  }
  return item.answer?.type === 'objective' ? item.score || 0 : 0
}

function getObjectiveItemScore(item, response) {
  if (!item) return 0
  if (item.type === 'reading') {
    if (!response || typeof response !== 'object') return 0
    return item.questions.reduce((sum, question) => {
      return sum + (response[question.id] === question.answer?.correct ? question.score || 0 : 0)
    }, 0)
  }
  if (item.type === 'fill_blank') {
    if (!response || typeof response !== 'object') return 0
    return item.blanks.reduce((sum, blank) => {
      const userValue = String(response[blank.blank_id] || '').trim().toLowerCase()
      const isCorrect = blank.accepted_answers.some((candidate) => String(candidate).trim().toLowerCase() === userValue)
      return sum + (isCorrect ? blank.score || 0 : 0)
    }, 0)
  }
  if (item.answer?.type === 'objective' && isObjectiveCorrect(item, response)) {
    return item.score || 0
  }
  return 0
}

function getObjectiveWrongCount(item, response) {
  if (!item) return 0
  if (item.type === 'reading') {
    if (!response || typeof response !== 'object') return item.questions.length
    return item.questions.reduce((sum, question) => sum + (response[question.id] === question.answer?.correct ? 0 : 1), 0)
  }
  if (item.type === 'fill_blank') {
    if (!response || typeof response !== 'object') return item.blanks.length
    return item.blanks.reduce((sum, blank) => {
      const userValue = String(response[blank.blank_id] || '').trim().toLowerCase()
      const isCorrect = blank.accepted_answers.some((candidate) => String(candidate).trim().toLowerCase() === userValue)
      return sum + (isCorrect ? 0 : 1)
    }, 0)
  }
  if (item.answer?.type === 'objective') {
    return isObjectiveCorrect(item, response) ? 0 : 1
  }
  return 0
}

function buildWrongItems(items, answers, meta) {
  const wrongItems = []

  items.forEach((item) => {
    if (item.type === 'reading') {
      const readingAnswers = answers[item.id] || {}
      item.questions.forEach((question) => {
        const userAnswer = readingAnswers[question.id] || ''
        if (userAnswer === question.answer?.correct) return
        wrongItems.push({
          questionKey: `${meta.subject}:${meta.paperId}:${item.id}:${question.id}`,
          subject: meta.subject,
          paperId: meta.paperId,
          paperTitle: meta.paperTitle,
          parentType: 'reading',
          sourceType: 'reading',
          type: question.type || 'single_choice',
          questionId: item.id,
          subQuestionId: question.id,
          prompt: question.prompt,
          contextTitle: item.passage?.title || item.title || '阅读理解',
          contextSnippet: clipText(item.passage?.content || ''),
          options: question.options || [],
          userAnswer,
          userAnswerLabel: getOptionText(question.options || [], userAnswer),
          correctAnswer: question.answer?.correct || '',
          correctAnswerLabel: getOptionText(question.options || [], question.answer?.correct || ''),
          rationale: question.answer?.rationale || '暂无解析',
          tags: [...(item.tags || []), ...(question.tags || [])],
          difficulty: question.difficulty || item.difficulty,
        })
      })
      return
    }

    if (item.answer?.type !== 'objective') return
    const userAnswer = answers[item.id]
    if (isObjectiveCorrect(item, userAnswer)) return

    wrongItems.push({
      questionKey: `${meta.subject}:${meta.paperId}:${item.id}`,
      subject: meta.subject,
      paperId: meta.paperId,
      paperTitle: meta.paperTitle,
      sourceType: item.source_type || item.type,
      type: item.type,
      questionId: item.id,
      prompt: item.prompt,
      contextTitle: item.context_title || '',
      contextSnippet: clipText(item.context || ''),
      options: item.options || [],
      blanks: item.blanks || [],
      userAnswer,
      userAnswerLabel: getObjectiveAnswerLabel(item, userAnswer),
      correctAnswer: item.answer?.correct || '',
      correctAnswerLabel:
        item.type === 'fill_blank'
          ? item.blanks.map((blank) => blank.accepted_answers.join(' / ')).join(' | ')
          : getObjectiveAnswerLabel(item, item.answer?.correct),
      rationale: item.answer?.rationale || '暂无解析',
      tags: item.tags || [],
      difficulty: item.difficulty,
    })
  })

  return wrongItems
}

function formatRemainingSeconds(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function cloneFavoriteItem(entry, index) {
  const cloned = JSON.parse(JSON.stringify(entry.itemSnapshot || {}))
  const prefix = `fav_${index}_`
  cloned.id = `${prefix}${cloned.id || index}`
  if (cloned.type === 'reading' && Array.isArray(cloned.questions)) {
    cloned.questions = cloned.questions.map((question, qIndex) => ({
      ...question,
      id: `${prefix}${question.id || qIndex}`,
    }))
  }
  return cloned
}

function buildFavoriteEntryFromItem(item, meta) {
  return {
    questionKey: `${meta.subject}:${meta.paperId}:${item.id}`,
    subject: meta.subject,
    paperId: meta.paperId,
    paperTitle: meta.paperTitle,
    prompt: item.prompt || item.passage?.title || '未命名题目',
    itemType: item.type,
    sourceType: item.source_type || item.type,
    tags: item.tags || [],
    contextTitle: item.type === 'reading' ? item.passage?.title || '' : item.context_title || '',
    contextSnippet: clipText(item.type === 'reading' ? item.passage?.content || '' : item.context || ''),
    itemSnapshot: item,
  }
}

export default function SubjectWorkspacePage() {
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
  const [revealedMap, setRevealedMap] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [attemptId, setAttemptId] = useState('')
  const [aiReview, setAiReview] = useState(null)
  const [aiExplainMap, setAiExplainMap] = useState({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [practiceWritesWrongBook, setPracticeWritesWrongBook] = useState(DEFAULT_PRACTICE_WRONG_BOOK)
  const [spoilerExpanded, setSpoilerExpanded] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(EXAM_DURATION_SECONDS)
  const [isPaused, setIsPaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [readyToPersist, setReadyToPersist] = useState(false)
  const [favoriteEntries, setFavoriteEntries] = useState([])

  useEffect(() => {
    const storedAdvance = loadPreference(AUTO_ADVANCE_KEY, null)
    if (storedAdvance !== null) setAutoAdvance(storedAdvance === 'true')
    const storedSpoiler = loadPreference(SPOILER_PREF_KEY, null)
    if (storedSpoiler !== null) setSpoilerExpanded(storedSpoiler === 'true')
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadWorkspace() {
      if (!activeProfile?.id) {
        setLoading(false)
        return
      }

      const favoriteRows = await loadFavoriteEntries(activeProfile.id, subjectKey)
      if (cancelled) return
      setFavoriteEntries(favoriteRows)

      let resolvedEntry = null
      let resolvedQuiz = null

      if (source === 'favorites') {
        const items = favoriteRows.map((favoriteEntry, index) => cloneFavoriteItem(favoriteEntry, index))
        resolvedEntry = { title: `${subjectMeta.shortLabel}的收藏题`, paperId: 'favorites' }
        resolvedQuiz = { title: `${subjectMeta.shortLabel}的收藏题`, items }
      } else {
        if (!paperId) {
          setLoading(false)
          return
        }

        const entries = await listLibraryEntries(activeProfile.id, subjectKey)
        const matched = entries.find((item) => item.paperId === paperId)
        if (!matched || cancelled) {
          setLoading(false)
          return
        }

        resolvedEntry = matched
        resolvedQuiz = parseQuizText(matched.rawText).parsed
      }

      const progress = await loadProgressRecord(activeProfile.id, subjectKey, sessionPaperId)
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
      setRemainingSeconds(typeof progress?.timerSecondsRemaining === 'number' ? progress.timerSecondsRemaining : EXAM_DURATION_SECONDS)
      setIsPaused(Boolean(progress?.isPaused))
      setPracticeWritesWrongBook(
        typeof progress?.practiceWritesWrongBook === 'boolean'
          ? progress.practiceWritesWrongBook
          : DEFAULT_PRACTICE_WRONG_BOOK
      )
      setReadyToPersist(true)
      setLoading(false)
    }

    loadWorkspace()
    return () => {
      cancelled = true
    }
  }, [activeProfile?.id, paperId, source, sessionPaperId, subjectKey, subjectMeta.shortLabel])

  const buildProgressPayload = (overrides = {}) => ({
    answers,
    revealedMap,
    submitted,
    score,
    attemptId,
    aiReview,
    aiExplainMap,
    currentIndex,
    timerSecondsRemaining: remainingSeconds,
    isPaused,
    practiceWritesWrongBook,
    mode,
    updatedAt: Date.now(),
    title: quiz?.title || entry?.title || '未命名试卷',
    ...overrides,
  })

  const persistNow = async (overrides = {}) => {
    if (!readyToPersist || !quiz || !activeProfile?.id || !sessionPaperId) return
    await saveProgressRecord(activeProfile.id, subjectKey, sessionPaperId, buildProgressPayload(overrides))
  }

  const persistAttemptPatch = async (targetAttemptId, patch) => {
    if (!targetAttemptId) return
    try {
      await updateAttemptRecord(targetAttemptId, patch)
    } catch (error) {
      console.error('AI 评阅记录更新失败', error)
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

  const objectiveTotalScore = scoreSummary.objectiveTotal
  const paperTotalScore = scoreSummary.paperTotal
  const subjectivePendingScore = scoreSummary.subjectiveTotal

  const practiceAccuracy = useMemo(() => {
    if (!quiz || mode !== 'practice') return { correct: 0, answered: 0, rate: 0 }

    let correct = 0
    let answered = 0

    quiz.items.forEach((item) => {
      if (item.type === 'reading') {
        const response = answers[item.id] || {}
        item.questions.forEach((question) => {
          if (isNonEmptyText(response[question.id])) {
            answered += 1
            if (response[question.id] === question.answer?.correct) correct += 1
          }
        })
        return
      }

      if (item.answer?.type === 'objective' && isObjectiveAnswered(item, answers[item.id])) {
        answered += 1
        if (isObjectiveCorrect(item, answers[item.id])) correct += 1
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

    const pendingReview = createPendingAiReview(subjectiveTotal)
    await syncAiReview(pendingReview, targetAttemptId)

    try {
      const completedReview = await gradeSubjectiveAttempt({
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
          error: error?.message || 'AI 批改失败',
        },
        targetAttemptId
      )
    }
  }

  const handleExplainQuestion = async ({ item, subQuestion = null }) => {
    if (!quiz || !item) return

    const entryKey = getExplainEntryKey(item.id, subQuestion?.id)
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
      const completedExplain = await explainQuizQuestion({
        paperTitle: quiz.title,
        item,
        response: answers[item.id],
        subQuestion,
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
      const ok = window.confirm('还有题目未作答，确定现在交卷吗？')
      if (!ok) return
    }

    const nextScore = quiz.items.reduce((sum, item) => sum + getObjectiveItemScore(item, answers[item.id]), 0)
    const wrongCount = quiz.items.reduce((sum, item) => sum + getObjectiveWrongCount(item, answers[item.id]), 0)
    const initialAiReview = subjectivePendingScore > 0 ? createPendingAiReview(subjectivePendingScore) : null

    setScore(nextScore)
    setSubmitted(true)
    setIsPaused(false)
    setAiReview(initialAiReview)

    await persistNow({ submitted: true, score: nextScore, isPaused: false, aiReview: initialAiReview })

    let savedAttempt = null
    if (source !== 'favorites' && (mode === 'exam' || practiceWritesWrongBook)) {
      savedAttempt = await saveAttemptRecord({
        profileId: activeProfile.id,
        subject: subjectKey,
        paperId,
        title: entry?.title || quiz.title || '未命名试卷',
        objectiveScore: nextScore,
        objectiveTotal: objectiveTotalScore,
        paperTotal: paperTotalScore,
        subjectivePendingTotal: subjectivePendingScore,
        questionCount: totalQuestions,
        answeredCount,
        wrongCount,
        submittedAt: Date.now(),
        answersSnapshot: answers,
        itemsSnapshot: quiz.items,
        wrongItems: buildWrongItems(quiz.items, answers, {
          subject: subjectKey,
          paperId,
          paperTitle: entry?.title || quiz.title || '未命名试卷',
        }),
        mode,
        includeInHistory: mode === 'exam',
        practiceWritesWrongBook,
        durationSeconds: EXAM_DURATION_SECONDS,
        timerSecondsRemaining: remainingSeconds,
        aiReview: initialAiReview,
        aiExplainMap,
      })
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

  const handleTogglePracticeWrongBook = () => {
    const next = !practiceWritesWrongBook
    setPracticeWritesWrongBook(next)
    void persistNow({ practiceWritesWrongBook: next })
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
    if (currentItem?.type === 'reading' || currentItem?.answer?.type !== 'objective' || currentItem?.type === 'fill_blank') return

    let nextValue = optionLetter
    if (currentItem.type === 'multiple_choice') {
      const currentValues = normalizeChoiceArray(answers[questionId])
      nextValue = currentValues.includes(optionLetter)
        ? currentValues.filter((value) => value !== optionLetter)
        : [...currentValues, optionLetter].sort()
    }

    const nextAnswers = { ...answers, [questionId]: nextValue }
    setAnswers(nextAnswers)

    if (mode === 'practice') {
      const nextRevealed = { ...revealedMap, [questionId]: true }
      setRevealedMap(nextRevealed)
      void persistNow({ answers: nextAnswers, revealedMap: nextRevealed })
      return
    }

    let nextIndex = currentIndex
    if (autoAdvance && currentItem.type !== 'multiple_choice' && currentIndex < quiz.items.length - 1) {
      nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
    }

    void persistNow({ answers: nextAnswers, currentIndex: nextIndex })
  }

  const handleSelectReadingOption = (questionId, subQuestionId, optionLetter) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'reading' || currentItem.id !== questionId) return

    const nextItemResponse = { ...(answers[questionId] || {}), [subQuestionId]: optionLetter }
    const nextAnswers = { ...answers, [questionId]: nextItemResponse }
    setAnswers(nextAnswers)

    if (mode === 'practice') {
      const nextRevealed = { ...revealedMap, [`${questionId}:${subQuestionId}`]: true }
      setRevealedMap(nextRevealed)
      void persistNow({ answers: nextAnswers, revealedMap: nextRevealed })
      return
    }

    const answeredCount = currentItem.questions.filter((question) => isNonEmptyText(nextItemResponse[question.id])).length
    let nextIndex = currentIndex
    if (autoAdvance && answeredCount === currentItem.questions.length && currentIndex < quiz.items.length - 1) {
      nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
    }

    void persistNow({ answers: nextAnswers, currentIndex: nextIndex })
  }

  const handleFillBlankChange = (questionId, blankId, text) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'fill_blank' || currentItem.id !== questionId) return

    const nextItemResponse = { ...(answers[questionId] || {}), [blankId]: text }
    const nextAnswers = { ...answers, [questionId]: nextItemResponse }
    setAnswers(nextAnswers)

    if (mode === 'practice') {
      const allFilled = currentItem.blanks.every((blank) => isNonEmptyText(nextItemResponse[blank.blank_id]))
      const nextRevealed = allFilled ? { ...revealedMap, [questionId]: true } : revealedMap
      if (allFilled) setRevealedMap(nextRevealed)
      void persistNow({ answers: nextAnswers, revealedMap: nextRevealed })
      return
    }

    void persistNow({ answers: nextAnswers })
  }

  const handleTextChange = (questionId, text) => {
    if (!quiz || submitted || (mode === 'exam' && isPaused)) return
    const nextAnswers = { ...answers, [questionId]: { text } }
    setAnswers(nextAnswers)
    void persistNow({ answers: nextAnswers })
  }

  const handleReset = async () => {
    if (!activeProfile?.id || !sessionPaperId) return
    const ok = window.confirm('确定重置当前进度吗？')
    if (!ok) return

    await clearProgressRecord(activeProfile.id, subjectKey, sessionPaperId)
    setAnswers({})
    setRevealedMap({})
    setSubmitted(false)
    setScore(0)
    setAttemptId('')
    setAiReview(null)
    setAiExplainMap({})
    setCurrentIndex(0)
    setRemainingSeconds(EXAM_DURATION_SECONDS)
    setIsPaused(false)

    await saveProgressRecord(activeProfile.id, subjectKey, sessionPaperId, {
      answers: {},
      revealedMap: {},
      submitted: false,
      score: 0,
      attemptId: '',
      aiReview: null,
      aiExplainMap: {},
      currentIndex: 0,
      timerSecondsRemaining: EXAM_DURATION_SECONDS,
      isPaused: false,
      practiceWritesWrongBook,
      mode,
      updatedAt: Date.now(),
      title: quiz?.title || entry?.title || '未命名试卷',
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
    const entryToToggle = buildFavoriteEntryFromItem(item, {
      subject: subjectKey,
      paperId,
      paperTitle: entry?.title || quiz.title || '未命名试卷',
    })
    const result = await toggleFavoriteEntry(activeProfile.id, subjectKey, entryToToggle)
    setFavoriteEntries(result.entries)
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="container">
          <section className="hero-card">
            <h1>加载中...</h1>
          </section>
        </div>
      </div>
    )
  }

  if (!entry || !quiz) {
    return (
      <div className="app-shell">
        <div className="container">
          <section className="hero-card workspace-empty-state">
            <h1>未找到可用内容</h1>
            <div className="workspace-header-actions">
              <Link className="secondary-btn small-btn" to="/">
                <Home size={14} />
                返回首页
              </Link>
              <Link
                className="secondary-btn small-btn"
                to={source === 'favorites' ? '/favorites' : `/exam/${subjectMeta.routeSlug}`}
              >
                <ArrowLeft size={14} />
                返回
              </Link>
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="container clean-workspace-page">
        <section className="clean-workspace-header">
          <div className="workspace-header-main">
            <div className="workspace-title">{entry.title}</div>
            <div className="workspace-mode-row">
              <span className="tag blue">{subjectMeta.shortLabel}</span>
              <span className="tag blue">{mode === 'practice' ? '刷题模式' : '考试模式'}</span>
              {mode === 'practice' && (
                <span className="accuracy-chip">
                  <Star size={14} />
                  正确率 {practiceAccuracy.rate}%
                </span>
              )}
              {mode === 'exam' && (
                <span className={`timer-chip ${remainingSeconds <= 300 ? 'danger' : ''}`}>
                  <Clock3 size={14} />
                  {formatRemainingSeconds(remainingSeconds)}
                </span>
              )}
            </div>
          </div>

          <div className="workspace-header-actions">
            {mode === 'exam' && (
              <button
                className="secondary-btn small-btn"
                onClick={() => {
                  const next = !isPaused
                  setIsPaused(next)
                  void persistNow({ isPaused: next })
                }}
                disabled={submitted}
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
                {isPaused ? '继续' : '暂停'}
              </button>
            )}
            <button className="secondary-btn small-btn" onClick={handleReset}>
              <RefreshCw size={14} />
              重置
            </button>
            <Link className="secondary-btn small-btn" to={source === 'favorites' ? '/favorites' : `/exam/${subjectMeta.routeSlug}`}>
              <ArrowLeft size={14} />
              返回
            </Link>
            <Link className="secondary-btn small-btn" to="/">
              <Home size={14} />
              返回首页
            </Link>
          </div>
        </section>

        {submitted && (
          <section className="score-card compact-score-card">
            <div className="score-line">
              <strong>客观题得分</strong>
              <span>{score} / {objectiveTotalScore}</span>
            </div>
            <div className="score-line">
              <strong>试卷总分</strong>
              <span>{paperTotalScore}</span>
            </div>
            <div className="score-line">
              <strong>主观题待评分分值</strong>
              <span>{subjectivePendingScore}</span>
            </div>
            {subjectivePendingScore > 0 && (
              <div className="analysis-box">
                <div>
                  <strong>AI 批改状态：</strong>
                  {aiReview?.status === 'pending' ? '批改中' : aiReview?.status === 'completed' ? '已完成' : aiReview?.status === 'failed' ? '失败' : '未开始'}
                </div>
                {aiReview?.status === 'completed' && (
                  <>
                    <div>
                      <strong>AI 主观题估分：</strong>
                      {aiReview.totalSubjectiveScore} / {subjectivePendingScore}
                    </div>
                    <div>
                      <strong>AI 估算总分：</strong>
                      {aiReview.totalScore} / {paperTotalScore}
                    </div>
                    {aiReview.overallComment && (
                      <div>
                        <strong>总体点评：</strong>
                        {aiReview.overallComment}
                      </div>
                    )}
                    {Array.isArray(aiReview.weaknessSummary) && aiReview.weaknessSummary.length > 0 && (
                      <div>
                        <strong>薄弱项：</strong>
                        {aiReview.weaknessSummary.join(' / ')}
                      </div>
                    )}
                  </>
                )}
                {aiReview?.status === 'failed' && (
                  <div>
                    <strong>失败原因：</strong>
                    {aiReview.error || 'AI 批改失败'}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <CleanQuizView
          quiz={quiz}
          answers={answers}
          submitted={submitted}
          currentIndex={currentIndex}
          mode={mode}
          autoAdvance={autoAdvance}
          remainingSeconds={remainingSeconds}
          isPaused={isPaused}
          spoilerExpanded={spoilerExpanded}
          revealedMap={revealedMap}
          isFavorite={Boolean(favoriteMap[favoriteQuestionKey])}
          onToggleFavorite={handleToggleFavorite}
          onToggleSpoiler={handleToggleSpoiler}
          onToggleAutoAdvance={handleToggleAutoAdvance}
          onTogglePracticeWrongBook={handleTogglePracticeWrongBook}
          onTogglePause={() => {
            const next = !isPaused
            setIsPaused(next)
            void persistNow({ isPaused: next })
          }}
          practiceWritesWrongBook={practiceWritesWrongBook}
          onJump={handleJump}
          onPrev={handlePrev}
          onNext={handleNext}
          onSelectOption={handleSelectOption}
          onSelectReadingOption={handleSelectReadingOption}
          onFillBlankChange={handleFillBlankChange}
          onTextChange={handleTextChange}
          aiReview={aiReview}
          aiQuestionReviewMap={aiQuestionReviewMap}
          aiExplainMap={aiExplainMap}
          onExplainQuestion={handleExplainQuestion}
          onSubmit={handleFinish}
        />
      </div>
    </div>
  )
}
