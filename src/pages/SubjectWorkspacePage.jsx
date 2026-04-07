import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Clock3, Home, Pause, Play, RefreshCw, Star } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import CleanQuizView from '../components/CleanQuizView'
import { useAppContext } from '../context/AppContext'
import { normalizeQuizPayload } from '../utils/normalizeQuizSchema'
import {
  clearProgressRecord,
  listLibraryEntries,
  loadProgressRecord,
  saveAttemptRecord,
  saveProgressRecord,
} from '../utils/indexedDb'
import { loadFavoriteEntries, toggleFavoriteEntry } from '../utils/favoriteStore'
import { getSubjectMetaByRouteParam } from '../config/subjects'

const AUTO_ADVANCE_KEY = 'quiz:pref:autoAdvance'
const SPOILER_PREF_KEY = 'quiz:pref:showSpoilerTags'
const EXAM_DURATION_SECONDS = 90 * 60

function isNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function getObjectiveItemTotal(item) {
  if (!item) return 0
  if (item.type === 'reading') {
    return item.questions.reduce((sum, question) => sum + (question.score || 1), 0)
  }
  return item.answer?.type === 'objective' ? item.score || 1 : 0
}

function getObjectiveItemScore(item, response) {
  if (!item) return 0
  if (item.type === 'reading') {
    if (!response || typeof response !== 'object') return 0
    return item.questions.reduce((sum, question) => sum + (response[question.id] === question.answer?.correct ? question.score || 1 : 0), 0)
  }
  if (item.answer?.type === 'objective' && response === item.answer?.correct) {
    return item.score || 1
  }
  return 0
}

function getObjectiveWrongCount(item, response) {
  if (!item) return 0
  if (item.type === 'reading') {
    if (!response || typeof response !== 'object') return item.questions.length
    return item.questions.reduce((sum, question) => sum + (response[question.id] === question.answer?.correct ? 0 : 1), 0)
  }
  if (item.answer?.type === 'objective') {
    return response === item.answer?.correct ? 0 : 1
  }
  return 0
}

function clipText(text = '', maxLength = 180) {
  if (typeof text !== 'string') return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

function getOptionText(options = [], key = '') {
  if (!key) return '未作答'
  const match = options.find((option) => option?.key === key)
  if (!match) return key
  return `${match.key}. ${match.text}`
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
    const userAnswer = answers[item.id] || ''
    if (userAnswer === item.answer?.correct) return
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
      userAnswer,
      userAnswerLabel: getOptionText(item.options || [], userAnswer),
      correctAnswer: item.answer?.correct || '',
      correctAnswerLabel: getOptionText(item.options || [], item.answer?.correct || ''),
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
  const SUBJECT_KEY = subjectMeta.key

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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [spoilerExpanded, setSpoilerExpanded] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(EXAM_DURATION_SECONDS)
  const [isPaused, setIsPaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [readyToPersist, setReadyToPersist] = useState(false)
  const [favoriteEntries, setFavoriteEntries] = useState([])

  useEffect(() => {
    try {
      const storedAdvance = localStorage.getItem(AUTO_ADVANCE_KEY)
      if (storedAdvance !== null) setAutoAdvance(storedAdvance === 'true')
      const storedSpoiler = localStorage.getItem(SPOILER_PREF_KEY)
      if (storedSpoiler !== null) setSpoilerExpanded(storedSpoiler === 'true')
    } catch {
      // ignore storage errors
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadWorkspace() {
      if (!activeProfile?.id) {
        setLoading(false)
        return
      }

      const favoriteRows = await loadFavoriteEntries(activeProfile.id, SUBJECT_KEY)
      if (cancelled) return
      setFavoriteEntries(favoriteRows)

      let resolvedEntry = null
      let resolvedQuiz = null

      if (source === 'favorites') {
        const items = favoriteRows.map((favoriteEntry, index) => cloneFavoriteItem(favoriteEntry, index))
        resolvedEntry = { title: `${subjectMeta.shortLabel}的收藏`, paperId: 'favorites' }
        resolvedQuiz = { title: `${subjectMeta.shortLabel}的收藏`, items }
      } else {
        if (!paperId) {
          setLoading(false)
          return
        }
        const entries = await listLibraryEntries(activeProfile.id, SUBJECT_KEY)
        const matched = entries.find((item) => item.paperId === paperId)
        if (!matched || cancelled) {
          setLoading(false)
          return
        }
        resolvedEntry = matched
        resolvedQuiz = normalizeQuizPayload(JSON.parse(matched.rawText))
      }

      const progress = await loadProgressRecord(activeProfile.id, SUBJECT_KEY, sessionPaperId)
      if (cancelled) return

      setEntry(resolvedEntry)
      setQuiz(resolvedQuiz)
      setAnswers(progress?.answers || {})
      setRevealedMap(progress?.revealedMap || {})
      setSubmitted(Boolean(progress?.submitted))
      setScore(progress?.score || 0)
      setCurrentIndex(Math.max(0, Math.min(progress?.currentIndex || 0, (resolvedQuiz.items?.length || 1) - 1)))
      setRemainingSeconds(typeof progress?.timerSecondsRemaining === 'number' ? progress.timerSecondsRemaining : EXAM_DURATION_SECONDS)
      setIsPaused(Boolean(progress?.isPaused))
      setReadyToPersist(true)
      setLoading(false)
    }

    loadWorkspace()
    return () => {
      cancelled = true
    }
  }, [activeProfile?.id, paperId, source, sessionPaperId, SUBJECT_KEY, subjectMeta.shortLabel])

  const buildProgressPayload = (overrides = {}) => ({
    answers,
    revealedMap,
    submitted,
    score,
    currentIndex,
    timerSecondsRemaining: remainingSeconds,
    isPaused,
    mode,
    updatedAt: Date.now(),
    title: quiz?.title || entry?.title || '未命名试卷',
    ...overrides,
  })

  const persistNow = async (overrides = {}) => {
    if (!readyToPersist || !quiz || !activeProfile?.id || !sessionPaperId) return
    await saveProgressRecord(activeProfile.id, SUBJECT_KEY, sessionPaperId, buildProgressPayload(overrides))
  }

  const objectiveTotalScore = useMemo(() => {
    return (quiz?.items || []).reduce((sum, item) => sum + getObjectiveItemTotal(item), 0)
  }, [quiz])

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
      if (item.answer?.type === 'objective' && isNonEmptyText(answers[item.id])) {
        answered += 1
        if (answers[item.id] === item.answer?.correct) correct += 1
      }
    })
    return { correct, answered, rate: answered ? Math.round((correct / answered) * 100) : 0 }
  }, [quiz, mode, answers])

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
    const answeredCount = quiz.items.filter((item) => {
      if (item.type === 'reading') {
        const response = answers[item.id] || {}
        return item.questions.every((question) => isNonEmptyText(response[question.id]))
      }
      if (item.answer?.type === 'subjective') {
        return Boolean(answers[item.id]?.text?.trim())
      }
      return Boolean(answers[item.id])
    }).length

    if (mode === 'exam' && !forced && answeredCount < totalQuestions) {
      const ok = window.confirm('还有题目未作答，确定现在交卷吗？')
      if (!ok) return
    }

    const nextScore = quiz.items.reduce((sum, item) => sum + getObjectiveItemScore(item, answers[item.id]), 0)
    const wrongCount = quiz.items.reduce((sum, item) => sum + getObjectiveWrongCount(item, answers[item.id]), 0)
    setScore(nextScore)
    setSubmitted(true)
    setIsPaused(false)
    await persistNow({ submitted: true, score: nextScore, isPaused: false })

    if (mode === 'exam' && source !== 'favorites') {
      await saveAttemptRecord({
        profileId: activeProfile.id,
        subject: SUBJECT_KEY,
        paperId,
        title: entry?.title || quiz.title || '未命名试卷',
        objectiveScore: nextScore,
        objectiveTotal: objectiveTotalScore,
        questionCount: totalQuestions,
        answeredCount,
        wrongCount,
        submittedAt: Date.now(),
        answersSnapshot: answers,
        itemsSnapshot: quiz.items,
        wrongItems: buildWrongItems(quiz.items, answers, {
          subject: SUBJECT_KEY,
          paperId,
          paperTitle: entry?.title || quiz.title || '未命名试卷',
        }),
        mode,
        durationSeconds: EXAM_DURATION_SECONDS,
        timerSecondsRemaining: remainingSeconds,
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
      try {
        localStorage.setItem(SPOILER_PREF_KEY, String(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }

  const handleToggleAutoAdvance = () => {
    setAutoAdvance((prev) => {
      const next = !prev
      try {
        localStorage.setItem(AUTO_ADVANCE_KEY, String(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
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
    if (currentItem?.type === 'reading' || currentItem?.answer?.type !== 'objective') return
    const nextAnswers = { ...answers, [questionId]: optionLetter }
    setAnswers(nextAnswers)

    if (mode === 'practice') {
      const nextRevealed = { ...revealedMap, [questionId]: true }
      setRevealedMap(nextRevealed)
      void persistNow({ answers: nextAnswers, revealedMap: nextRevealed })
      return
    }

    let nextIndex = currentIndex
    if (autoAdvance && currentIndex < quiz.items.length - 1) {
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
    await clearProgressRecord(activeProfile.id, SUBJECT_KEY, sessionPaperId)
    setAnswers({})
    setRevealedMap({})
    setSubmitted(false)
    setScore(0)
    setCurrentIndex(0)
    setRemainingSeconds(EXAM_DURATION_SECONDS)
    setIsPaused(false)
    await saveProgressRecord(activeProfile.id, SUBJECT_KEY, sessionPaperId, {
      answers: {},
      revealedMap: {},
      submitted: false,
      score: 0,
      currentIndex: 0,
      timerSecondsRemaining: EXAM_DURATION_SECONDS,
      isPaused: false,
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
    return `${SUBJECT_KEY}:${paperId}:${item.id}`
  }, [quiz, currentIndex, source, favoriteEntries, paperId, SUBJECT_KEY])

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
    const entryToToggle = buildFavoriteEntryFromItem(item, {
      subject: SUBJECT_KEY,
      paperId,
      paperTitle: entry?.title || quiz.title || '未命名试卷',
    })
    const result = await toggleFavoriteEntry(activeProfile.id, SUBJECT_KEY, entryToToggle)
    setFavoriteEntries(result.entries)
  }

  if (loading) {
    return <div className="app-shell"><div className="container"><section className="hero-card"><h1>加载中</h1></section></div></div>
  }

  if (!entry || !quiz) {
    return (
      <div className="app-shell">
        <div className="container">
          <section className="hero-card workspace-empty-state">
            <h1>未找到可用内容</h1>
            <div className="workspace-header-actions">
              <Link className="secondary-btn small-btn" to="/"><Home size={14} /> 返回首页</Link>
              <Link className="secondary-btn small-btn" to={source === 'favorites' ? '/favorites' : `/exam/${subjectMeta.routeSlug}`}><ArrowLeft size={14} /> 返回</Link>
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
              {mode === 'practice' && <span className="accuracy-chip"><Star size={14} /> 正确率 {practiceAccuracy.rate}%</span>}
              {mode === 'exam' && <span className={`timer-chip ${remainingSeconds <= 300 ? 'danger' : ''}`}><Clock3 size={14} /> {formatRemainingSeconds(remainingSeconds)}</span>}
            </div>
          </div>
          <div className="workspace-header-actions">
            {mode === 'exam' && <button className="secondary-btn small-btn" onClick={() => { const next = !isPaused; setIsPaused(next); void persistNow({ isPaused: next }) }} disabled={submitted}>{isPaused ? <Play size={14} /> : <Pause size={14} />}{isPaused ? '继续' : '暂停'}</button>}
            <button className="secondary-btn small-btn" onClick={handleReset}><RefreshCw size={14} /> 重置</button>
            <Link className="secondary-btn small-btn" to={source === 'favorites' ? '/favorites' : `/exam/${subjectMeta.routeSlug}`}><ArrowLeft size={14} /> 返回</Link>
            <Link className="secondary-btn small-btn" to="/"><Home size={14} /> 返回首页</Link>
          </div>
        </section>
        {submitted && <section className="score-card compact-score-card"><div className="score-line"><strong>{score}</strong><span>/ {objectiveTotalScore}</span></div></section>}
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
          onTogglePause={() => { const next = !isPaused; setIsPaused(next); void persistNow({ isPaused: next }) }}
          onJump={handleJump}
          onPrev={handlePrev}
          onNext={handleNext}
          onSelectOption={handleSelectOption}
          onSelectReadingOption={handleSelectReadingOption}
          onTextChange={handleTextChange}
          onSubmit={handleFinish}
        />
      </div>
    </div>
  )
}
