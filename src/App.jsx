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
        setCurrentIndex(progress.currentIndex || 0)
      }
    } catch {
      // ignore broken cache
    }
  }, [])

  const total = quiz?.items?.length || 0
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers])

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
      setCurrentIndex(progress.currentIndex || 0)
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

    const nextAnswers = {
      ...answers,
      [questionId]: optionLetter,
    }
    const nextIndex =
      currentIndex < quiz.items.length - 1 ? currentIndex + 1 : currentIndex

    setAnswers(nextAnswers)
    setCurrentIndex(nextIndex)

    persist({
      answers: nextAnswers,
      submitted,
      score,
      currentIndex: nextIndex,
    })
  }

  const handleSubmit = () => {
    if (!quiz?.items?.length) return

    if (answeredCount < total) {
      const ok = window.confirm('还有题目未作答，确定现在交卷吗？')
      if (!ok) return
    }

    let nextScore = 0
    quiz.items.forEach((item) => {
      if (answers[item.id] === item.correct_answer) {
        nextScore += 1
      }
    })

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
          <h1>英语冲刺模拟刷题</h1>
          <p>
            导入 JSON 试卷即可开始刷题。支持自动保存进度、刷新恢复、交卷后查看解析。
          </p>
          <QuizImporter onQuizLoaded={handleQuizLoaded} />
        </section>

        {quiz && submitted && (
          <section className="score-card">
            <h2>本次得分</h2>
            <div className="score-line">
              <strong>{score}</strong>
              <span>/ {total}</span>
            </div>
            <p>答对率：{total ? Math.round((score / total) * 100) : 0}%</p>
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
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}

export default App
