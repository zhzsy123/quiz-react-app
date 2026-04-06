import React, { useEffect, useMemo, useState } from 'react'
import { BookOpen, RefreshCw } from 'lucide-react'
import QuizImporter from './components/QuizImporter'
import QuizView from './components/QuizView'
import {
  buildPaperId,
  loadProgress,
  saveProgress,
  clearProgress,
  saveLastQuizRaw,
  loadLastQuizRaw,
} from './utils/storage'
import { normalizeQuizPayload } from './utils/normalizeQuizSchema'

function isNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0
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

function App() {
  const [quiz, setQuiz] = useState(null)
  const [paperId, setPaperId] = useState('')
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const last = loadLastQuizRaw()
    if (!last) return
    try {
      const normalized = normalizeQuizPayload(JSON.parse(last))
      const nextPaperId = buildPaperId(last)
      setQuiz(normalized)
      setPaperId(nextPaperId)
      const progress = loadProgress(nextPaperId)
      if (progress) {
        setAnswers(progress.answers || {})
        setSubmitted(Boolean(progress.submitted))
        setScore(progress.score || 0)
        setCurrentIndex(Math.max(0, Math.min(progress.currentIndex || 0, normalized.items.length - 1)))
      }
    } catch {
      // ignore broken cache
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

  const persist = (next) => {
    if (!paperId || !quiz) return
    saveProgress(paperId, {
      answers: next.answers,
      submitted: next.submitted,
      score: next.score,
      currentIndex: next.currentIndex,
      updatedAt: Date.now(),
      title: quiz.title || '未命名试卷',
    })
  }

  const handleQuizLoaded = ({ parsed, rawText }) => {
    const nextPaperId = buildPaperId(rawText)
    setQuiz(parsed)
    setPaperId(nextPaperId)
    saveLastQuizRaw(rawText)

    const progress = loadProgress(nextPaperId)
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
      saveProgress(nextPaperId, {
        answers: {},
        submitted: false,
        score: 0,
        currentIndex: 0,
        updatedAt: Date.now(),
        title: parsed.title || '未命名试卷',
      })
    }
  }

  const handleJump = (index) => {
    setCurrentIndex(index)
    persist({
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
    persist({
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
    persist({
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
    const nextIndex = currentIndex < quiz.items.length - 1 ? currentIndex + 1 : currentIndex

    setAnswers(nextAnswers)
    setCurrentIndex(nextIndex)

    persist({
      answers: nextAnswers,
      submitted,
      score,
      currentIndex: nextIndex,
    })
  }

  const handleSelectReadingOption = (questionId, subQuestionId, optionLetter) => {
    if (submitted) return

    const nextItemResponse = {
      ...(answers[questionId] || {}),
      [subQuestionId]: optionLetter,
    }

    const nextAnswers = {
      ...answers,
      [questionId]: nextItemResponse,
    }

    setAnswers(nextAnswers)
    persist({
      answers: nextAnswers,
      submitted,
      score,
      currentIndex,
    })
  }

  const handleTextResponse = (questionId, text) => {
    if (submitted) return

    const nextAnswers = {
      ...answers,
      [questionId]: { text },
    }

    setAnswers(nextAnswers)
    persist({
      answers: nextAnswers,
      submitted,
      score,
      currentIndex,
    })
  }

  const handleSubmit = () => {
    if (!quiz?.items?.length) return

    if (answeredCount < totalQuestions) {
      const ok = window.confirm('还有题目未作答，确定现在交卷吗？')
      if (!ok) return
    }

    const nextScore = quiz.items.reduce((sum, item) => {
      return sum + getObjectiveItemScore(item, answers[item.id])
    }, 0)

    setScore(nextScore)
    setSubmitted(true)
    persist({
      answers,
      submitted: true,
      score: nextScore,
      currentIndex,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleResetCurrentPaper = () => {
    if (!paperId) return
    setAnswers({})
    setSubmitted(false)
    setScore(0)
    setCurrentIndex(0)
    clearProgress(paperId)
    saveProgress(paperId, {
      answers: {},
      submitted: false,
      score: 0,
      currentIndex: 0,
      updatedAt: Date.now(),
      title: quiz?.title || '未命名试卷',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
          <QuizImporter onQuizLoaded={handleQuizLoaded} />
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

export default App
