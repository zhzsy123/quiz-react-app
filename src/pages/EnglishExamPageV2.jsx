import React, { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  FolderOpen,
  History,
  Pencil,
  RefreshCw,
  Tags,
  Trash2,
  UserCircle2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import QuizImporter from '../components/QuizImporter'
import QuizView from '../components/QuizView'
import { buildPaperId } from '../utils/storage'
import { normalizeQuizPayload } from '../utils/normalizeQuizSchema'
import { useAppContext } from '../context/AppContext'
import {
  clearProgressRecord,
  deleteLibraryEntry,
  listLibraryEntries,
  loadLastOpenedPaper,
  loadProgressRecord,
  saveAttemptRecord,
  saveLastOpenedPaper,
  saveProgressRecord,
  updateLibraryEntry,
  upsertLibraryEntry,
} from '../utils/indexedDb'

const SUBJECT_KEY = 'english'
const AUTO_ADVANCE_KEY = 'quiz:pref:autoAdvance'

function isNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeOptionLabel(option) {
  if (typeof option === 'string') return option
  if (!option || typeof option !== 'object') return String(option ?? '')
  if (option.key && typeof option.text === 'string') {
    return `${option.key}. ${option.text}`
  }
  return String(option.text ?? '')
}

function getOptionText(options = [], key = '') {
  if (!key) return '未作答'
  const match = options.find((option) => option?.key === key)
  if (!match) return key
  return normalizeOptionLabel(match)
}

function clipText(text = '', maxLength = 180) {
  if (typeof text !== 'string') return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

function isResponseAnswered(item, response) {
  if (!item) return false

  if (item.type === 'reading') {
    if (!response || typeof response !== 'object') return false
    return item.questions.every((question) => isNonEmptyText(response[question.id]))
  }

  if (item.answer?.type === 'subjective') {
    if (typeof response === 'string') return isNonEmptyText(response)
    return Boolean(response?.text?.trim())
  }

  return isNonEmptyText(response)
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
    return item.questions.reduce((sum, question) => {
      return sum + (response[question.id] === question.answer?.correct ? question.score || 1 : 0)
    }, 0)
  }

  if (item.answer?.type === 'objective' && response === item.answer?.correct) {
    return item.score || 1
  }

  return 0
}

function getObjectiveWrongCount(item, response) {
  if (!item) return 0

  if (item.type === 'reading') {
    if (!response || typeof response !== 'object') {
      return item.questions.length
    }
    return item.questions.reduce((sum, question) => {
      return sum + (response[question.id] === question.answer?.correct ? 0 : 1)
    }, 0)
  }

  if (item.answer?.type === 'objective') {
    return response === item.answer?.correct ? 0 : 1
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

export default function EnglishExamPageV2() {
  const { activeProfile } = useAppContext()
  const [quiz, setQuiz] = useState(null)
  const [paperId, setPaperId] = useState('')
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [libraryEntries, setLibraryEntries] = useState([])
  const [libraryLoading, setLibraryLoading] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTO_ADVANCE_KEY)
      if (stored !== null) {
        setAutoAdvance(stored === 'true')
      }
    } catch {
      // ignore browser storage errors
    }
  }, [])

  const totalQuestions = quiz?.items?.length || 0

  const objectiveTotalScore = useMemo(() => {
    return (quiz?.items || []).reduce((sum, item) => sum + getObjectiveItemTotal(item), 0)
  }, [quiz])

  const subjectiveCount = useMemo(() => {
    return (quiz?.items || []).filter((item) => item.answer?.type === 'subjective').length
  }, [quiz])

  const answeredCount = useMemo(() => {
    if (!quiz?.items?.length) return 0
    return quiz.items.filter((item) => isResponseAnswered(item, answers[item.id])).length
  }, [quiz, answers])

  const refreshLibrary = async () => {
    if (!activeProfile?.id) return
    setLibraryLoading(true)
    try {
      const nextEntries = await listLibraryEntries(activeProfile.id, SUBJECT_KEY)
      setLibraryEntries(nextEntries)
    } finally {
      setLibraryLoading(false)
    }
  }

  const applyQuizState = async (parsed, rawText) => {
    if (!activeProfile?.id) return
    const nextPaperId = buildPaperId(rawText)
    setQuiz(parsed)
    setPaperId(nextPaperId)
    await saveLastOpenedPaper(activeProfile.id, SUBJECT_KEY, rawText)

    const progress = await loadProgressRecord(activeProfile.id, SUBJECT_KEY, nextPaperId)
    if (progress) {
      setAnswers(progress.answers || {})
      setSubmitted(Boolean(progress.submitted))
      setScore(progress.score || 0)
      setCurrentIndex(Math.max(0, Math.min(progress.currentIndex || 0, parsed.items.length - 1)))
    } else {
      setAnswers({})
      setSubmitted(false)
      setScore(0)
      setCurrentIndex(0)
      await saveProgressRecord(activeProfile.id, SUBJECT_KEY, nextPaperId, {
        answers: {},
        submitted: false,
        score: 0,
        currentIndex: 0,
        updatedAt: Date.now(),
        title: parsed.title || '未命名试卷',
      })
    }
  }

  useEffect(() => {
    let cancelled = false

    async function initializeForProfile() {
      if (!activeProfile?.id) return
      await refreshLibrary()
      const lastRaw = await loadLastOpenedPaper(activeProfile.id, SUBJECT_KEY)
      if (!lastRaw || cancelled) {
        setQuiz(null)
        setPaperId('')
        setAnswers({})
        setSubmitted(false)
        setScore(0)
        setCurrentIndex(0)
        return
      }

      try {
        const parsed = normalizeQuizPayload(JSON.parse(lastRaw))
        if (!cancelled) {
          await applyQuizState(parsed, lastRaw)
        }
      } catch {
        if (!cancelled) {
          setQuiz(null)
          setPaperId('')
          setAnswers({})
          setSubmitted(false)
          setScore(0)
          setCurrentIndex(0)
        }
      }
    }

    initializeForProfile()

    return () => {
      cancelled = true
    }
  }, [activeProfile?.id])

  const persist = async (next) => {
    if (!paperId || !quiz || !activeProfile?.id) return
    await saveProgressRecord(activeProfile.id, SUBJECT_KEY, paperId, {
      answers: next.answers,
      submitted: next.submitted,
      score: next.score,
      currentIndex: next.currentIndex,
      updatedAt: Date.now(),
      title: quiz.title || '未命名试卷',
    })
  }

  const handleToggleAutoAdvance = () => {
    setAutoAdvance((prev) => {
      const next = !prev
      try {
        localStorage.setItem(AUTO_ADVANCE_KEY, String(next))
      } catch {
        // ignore browser storage errors
      }
      return next
    })
  }

  const handleQuizLoaded = async ({ parsed, rawText }) => {
    if (!activeProfile?.id) return
    const nextPaperId = buildPaperId(rawText)

    await upsertLibraryEntry({
      profileId: activeProfile.id,
      subject: SUBJECT_KEY,
      paperId: nextPaperId,
      title: parsed.title || '未命名题库',
      rawText,
      tags: parsed.compatibility?.skippedTypes?.length ? ['兼容导入'] : [],
      schemaVersion: parsed.compatibility?.sourceSchema || parsed.schema_version || 'unknown',
      questionCount: parsed.items?.length || 0,
    })

    await refreshLibrary()
    await applyQuizState(parsed, rawText)
  }

  const handleImportLocalEntry = async (entry) => {
    const parsed = normalizeQuizPayload(JSON.parse(entry.rawText))
    await applyQuizState(parsed, entry.rawText)
  }

  const handleRenameLibraryEntry = async (entry) => {
    const nextTitle = window.prompt('请输入新的题库名称：', entry.title)
    if (!nextTitle) return
    await updateLibraryEntry(entry.id, { title: nextTitle })
    await refreshLibrary()
  }

  const handleTagLibraryEntry = async (entry) => {
    const initialTags = Array.isArray(entry.tags) ? entry.tags.join(', ') : ''
    const rawTags = window.prompt('请输入标签，使用英文逗号分隔：', initialTags)
    if (rawTags === null) return
    const nextTags = rawTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    await updateLibraryEntry(entry.id, { tags: nextTags })
    await refreshLibrary()
  }

  const handleDeleteLibraryEntry = async (entry) => {
    const ok = window.confirm(`确定删除本地题库《${entry.title}》吗？`)
    if (!ok) return
    await deleteLibraryEntry(entry.id)
    await refreshLibrary()
  }

  const handleJump = (index) => {
    setCurrentIndex(index)
    void persist({
      answers,
      submitted,
      score,
      currentIndex: index,
    })
  }

  const handlePrev = () => {
    if (currentIndex <= 0) return
    const nextIndex = currentIndex - 1
    setCurrentIndex(nextIndex)
    void persist({
      answers,
      submitted,
      score,
      currentIndex: nextIndex,
    })
  }

  const handleNext = () => {
    if (!quiz?.items?.length || currentIndex >= quiz.items.length - 1) return
    const nextIndex = currentIndex + 1
    setCurrentIndex(nextIndex)
    void persist({
      answers,
      submitted,
      score,
      currentIndex: nextIndex,
    })
  }

  const handleSelectOption = (questionId, optionLetter) => {
    if (submitted || !quiz?.items?.length) return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type === 'reading' || currentItem?.answer?.type !== 'objective') return

    const nextAnswers = {
      ...answers,
      [questionId]: optionLetter,
    }
    const nextIndex = autoAdvance && currentIndex < quiz.items.length - 1 ? currentIndex + 1 : currentIndex

    setAnswers(nextAnswers)
    if (nextIndex !== currentIndex) {
      setCurrentIndex(nextIndex)
    }

    void persist({
      answers: nextAnswers,
      submitted,
      score,
      currentIndex: nextIndex,
    })
  }

  const handleSelectReadingOption = (questionId, subQuestionId, optionLetter) => {
    if (submitted || !quiz?.items?.length) return

    const currentItem = quiz.items[currentIndex]
    if (currentItem?.type !== 'reading' || currentItem.id !== questionId) return

    const previousItemResponse = answers[questionId] || {}
    const nextItemResponse = {
      ...previousItemResponse,
      [subQuestionId]: optionLetter,
    }

    const previousAnsweredCount = currentItem.questions.filter((question) => isNonEmptyText(previousItemResponse[question.id])).length
    const nextAnsweredCount = currentItem.questions.filter((question) => isNonEmptyText(nextItemResponse[question.id])).length

    const shouldAdvance =
      autoAdvance &&
      previousAnsweredCount < currentItem.questions.length &&
      nextAnsweredCount === currentItem.questions.length &&
      currentIndex < quiz.items.length - 1

    const nextIndex = shouldAdvance ? currentIndex + 1 : currentIndex

    const nextAnswers = {
      ...answers,
      [questionId]: nextItemResponse,
    }

    setAnswers(nextAnswers)
    if (shouldAdvance) {
      setCurrentIndex(nextIndex)
    }

    void persist({
      answers: nextAnswers,
      submitted,
      score,
      currentIndex: nextIndex,
    })
  }

  const handleTextResponse = (questionId, text) => {
    if (submitted) return

    const nextAnswers = {
      ...answers,
      [questionId]: { text },
    }

    setAnswers(nextAnswers)
    void persist({
      answers: nextAnswers,
      submitted,
      score,
      currentIndex,
    })
  }

  const handleSubmit = async () => {
    if (!quiz?.items?.length || !activeProfile?.id) return

    if (answeredCount < totalQuestions) {
      const ok = window.confirm('还有题目未作答，确定现在交卷吗？')
      if (!ok) return
    }

    const nextScore = quiz.items.reduce((sum, item) => sum + getObjectiveItemScore(item, answers[item.id]), 0)
    const wrongCount = quiz.items.reduce((sum, item) => sum + getObjectiveWrongCount(item, answers[item.id]), 0)
    const submittedAt = Date.now()
    const wrongItems = buildWrongItems(quiz.items, answers, {
      subject: SUBJECT_KEY,
      paperId,
      paperTitle: quiz.title || '未命名试卷',
    })

    setScore(nextScore)
    setSubmitted(true)

    await persist({
      answers,
      submitted: true,
      score: nextScore,
      currentIndex,
    })

    await saveAttemptRecord({
      profileId: activeProfile.id,
      subject: SUBJECT_KEY,
      paperId,
      title: quiz.title || '未命名试卷',
      objectiveScore: nextScore,
      objectiveTotal: objectiveTotalScore,
      questionCount: totalQuestions,
      answeredCount,
      wrongCount,
      submittedAt,
      answersSnapshot: answers,
      itemsSnapshot: quiz.items,
      wrongItems,
      subjectiveCount,
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleResetCurrentPaper = async () => {
    if (!paperId || !activeProfile?.id) return
    setAnswers({})
    setSubmitted(false)
    setScore(0)
    setCurrentIndex(0)
    await clearProgressRecord(activeProfile.id, SUBJECT_KEY, paperId)
    await saveProgressRecord(activeProfile.id, SUBJECT_KEY, paperId, {
      answers: {},
      submitted: false,
      score: 0,
      currentIndex: 0,
      updatedAt: Date.now(),
      title: quiz?.title || '未命名试卷',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!activeProfile) {
    return (
      <div className="app-shell">
        <div className="container">
          <section className="hero-card">
            <div className="hero-icon">
              <UserCircle2 size={30} />
            </div>
            <h1>英语在线模拟考试 V1.0</h1>
            <p>正在加载本地档案...</p>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="container">
        <section className="hero-card">
          <div className="hero-icon">
            <BookOpen size={30} />
          </div>
          <h1>英语在线模拟考试 V1.0</h1>
          <p>
            导入 JSON 试卷即可开始刷题。支持自动保存进度、刷新恢复、交卷后查看解析。
          </p>

          <div className="profile-inline-bar">
            <div className="profile-inline-badge">
              <UserCircle2 size={16} />
              当前本地档案：{activeProfile.name}
            </div>
            <Link to="/" className="secondary-btn small-btn">返回仪表盘</Link>
          </div>

          <QuizImporter onQuizLoaded={handleQuizLoaded} />
        </section>

        <section className="local-library-panel">
          <div className="section-header-row">
            <h2><FolderOpen size={18} /> 从本地历史文件导入</h2>
            <span className="section-header-tip">{libraryEntries.length} 份本地题库</span>
          </div>

          {libraryLoading ? (
            <div className="local-library-empty">正在加载本地题库...</div>
          ) : libraryEntries.length === 0 ? (
            <div className="local-library-empty">当前档案还没有本地题库。先导入一份 JSON/TXT 试卷，系统会自动写入本地文件库。</div>
          ) : (
            <div className="local-library-list">
              {libraryEntries.map((entry) => (
                <article key={entry.id} className="local-library-item">
                  <div className="local-library-main">
                    <div className="local-library-title">{entry.title}</div>
                    <div className="local-library-meta">
                      <span><History size={14} /> {new Date(entry.updatedAt).toLocaleString()}</span>
                      <span>题量：{entry.questionCount || '--'}</span>
                    </div>
                    {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                      <div className="local-library-tags">
                        {entry.tags.map((tag) => (
                          <span key={tag} className="tag blue">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="local-library-actions">
                    <button className="primary-btn small-btn" onClick={() => handleImportLocalEntry(entry)}>导入</button>
                    <button className="secondary-btn small-btn" onClick={() => handleRenameLibraryEntry(entry)}><Pencil size={14} /> 重命名</button>
                    <button className="secondary-btn small-btn" onClick={() => handleTagLibraryEntry(entry)}><Tags size={14} /> 标签</button>
                    <button className="danger-btn small-btn" onClick={() => handleDeleteLibraryEntry(entry)}><Trash2 size={14} /> 删除</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {quiz && submitted && (
          <section className="score-card">
            <h2>本次结果</h2>

            {objectiveTotalScore > 0 ? (
              <>
                <div className="score-line">
                  <strong>{score}</strong>
                  <span>/ {objectiveTotalScore}</span>
                </div>
                <p>
                  客观题得分率：
                  {objectiveTotalScore ? Math.round((score / objectiveTotalScore) * 100) : 0}%
                </p>
              </>
            ) : (
              <div className="score-line score-line-text-only">
                <strong>已提交</strong>
              </div>
            )}

            <p>已作答：{answeredCount} / {totalQuestions} 题</p>

            {subjectiveCount > 0 && (
              <p className="score-note">
                本卷包含 {subjectiveCount} 道主观题。当前自动评分只统计客观题；翻译题和作文题会在交卷后显示参考答案、评分点或写作要求。
              </p>
            )}

            <button className="secondary-btn" onClick={handleResetCurrentPaper}>
              <RefreshCw size={16} />
              重新挑战本卷
            </button>
          </section>
        )}

        {quiz && (
          <QuizView
            quiz={quiz}
            answers={answers}
            submitted={submitted}
            currentIndex={currentIndex}
            autoAdvance={autoAdvance}
            onToggleAutoAdvance={handleToggleAutoAdvance}
            onJump={handleJump}
            onPrev={handlePrev}
            onNext={handleNext}
            onSelectOption={handleSelectOption}
            onSelectReadingOption={handleSelectReadingOption}
            onTextChange={handleTextResponse}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}
