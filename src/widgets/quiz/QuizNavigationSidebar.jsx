import React, { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Clock3, LoaderCircle, Pause, Play, XCircle } from 'lucide-react'
import { isObjectiveWrong } from '../../entities/quiz/lib/objectiveAnswers'
import {
  formatRemainingSeconds,
  getNavGroupMeta,
  getReadingQuestionDisplayLabel,
  isAnswered,
} from './quizViewUtils.jsx'

export default function QuizNavigationSidebar({
  quizItems,
  currentItem,
  currentIndex,
  answers,
  subQuestionFocusMap = {},
  mode = 'exam',
  submitted = false,
  isPaused = false,
  remainingSeconds = 0,
  autoAdvance = false,
  practiceWritesWrongBook = true,
  examWritesWrongBook = true,
  onTogglePause,
  onToggleAutoAdvance,
  onTogglePracticeWrongBook,
  onToggleExamWrongBook,
  onJump,
  onFocusSubQuestion,
}) {
  const [openGroups, setOpenGroups] = useState({})

  const groupedNavSections = useMemo(() => {
    const order = [
      'single_choice',
      'multiple_choice',
      'true_false',
      'fill_blank',
      'cloze',
      'reading',
      'composite',
      'short_answer',
      'case_analysis',
      'calculation',
      'operation',
      'translation',
      'essay',
    ]
    const map = new Map()

    quizItems.forEach((item, index) => {
      const meta = getNavGroupMeta(item)
      if (!map.has(meta.key)) map.set(meta.key, { ...meta, items: [] })
      map.get(meta.key).items.push({ item, index })
    })

    return Array.from(map.values()).sort((a, b) => {
      const aIndex = order.indexOf(a.key)
      const bIndex = order.indexOf(b.key)
      if (aIndex === -1 && bIndex === -1) return a.label.localeCompare(b.label)
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
  }, [quizItems])

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = {}
      groupedNavSections.forEach((section) => {
        next[section.key] = prev[section.key] ?? true
      })
      return next
    })
  }, [groupedNavSections])

  useEffect(() => {
    if (!currentItem) return

    const currentGroupKey = getNavGroupMeta(currentItem).key
    setOpenGroups((prev) => (prev[currentGroupKey] === false ? { ...prev, [currentGroupKey]: true } : prev))
  }, [currentItem?.id])

  const disabled = isPaused && mode === 'exam'

  return (
    <aside className="sidebar-card nav-sidebar">
      <div className="sidebar-head-row">
        <h3>答题导航</h3>
      </div>

      {mode === 'exam' && (
        <div className="sidebar-tools">
          <div className="sidebar-tool-card timer-tool-card">
            <div className={`sidebar-timer-value ${remainingSeconds <= 300 ? 'danger' : ''}`}>
              <Clock3 size={16} />
              <strong>{formatRemainingSeconds(remainingSeconds)}</strong>
            </div>
            <button
              type="button"
              className="secondary-btn small-btn full-width-btn"
              onClick={onTogglePause}
              disabled={submitted}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
              {isPaused ? '继续' : '暂停'}
            </button>
          </div>
        </div>
      )}

      <div className="sidebar-tools compact-sidebar-tools">
        <div className="sidebar-tool-card compact-toggle-card">
          <div className="sidebar-tool-copy">
            <span className="sidebar-tool-title">自动切题</span>
            <span className="sidebar-tool-desc">答对后自动切换到下一题。</span>
          </div>
          <button
            type="button"
            className={`toggle-switch ${autoAdvance ? 'on' : ''}`}
            onClick={onToggleAutoAdvance}
            aria-pressed={autoAdvance}
            disabled={disabled}
          >
            <span className="toggle-knob" />
          </button>
        </div>
      </div>

      {mode === 'practice' && (
        <div className="sidebar-tools compact-sidebar-tools">
          <div className="sidebar-tool-card compact-toggle-card">
            <div className="sidebar-tool-copy">
              <span className="sidebar-tool-title">练习写入错题本</span>
              <span className="sidebar-tool-desc">开启后，练习模式下的错题会写入错题本。</span>
            </div>
            <button
              type="button"
              className={`toggle-switch ${practiceWritesWrongBook ? 'on' : ''}`}
              onClick={onTogglePracticeWrongBook}
              aria-pressed={practiceWritesWrongBook}
            >
              <span className="toggle-knob" />
            </button>
          </div>
        </div>
      )}

      {mode === 'exam' && (
        <div className="sidebar-tools compact-sidebar-tools">
          <div className="sidebar-tool-card compact-toggle-card">
            <div className="sidebar-tool-copy">
              <span className="sidebar-tool-title">考试写入错题本</span>
              <span className="sidebar-tool-desc">开启后，考试模式下的错题会写入错题本。</span>
            </div>
            <button
              type="button"
              className={`toggle-switch ${examWritesWrongBook ? 'on' : ''}`}
              onClick={onToggleExamWrongBook}
              aria-pressed={examWritesWrongBook}
              disabled={disabled || submitted}
            >
              <span className="toggle-knob" />
            </button>
          </div>
        </div>
      )}

      <div className="nav-accordion">
        {groupedNavSections.map((section) => {
          const isOpen = openGroups[section.key] ?? true
          const safeDisplayCount = section.key === 'reading'
            ? section.items.reduce((sum, { item }) => {
                if (item.type === 'generation_placeholder') return sum + 1
                return sum + (item.questions?.length || 0)
              }, 0)
            : section.items.length

          return (
            <div key={section.key} className="nav-group">
              <button
                type="button"
                className={`nav-group-header ${isOpen ? 'open' : ''}`}
                onClick={() => setOpenGroups((prev) => ({ ...prev, [section.key]: !isOpen }))}
              >
                <div className="nav-group-title-wrap">
                  <span className="nav-group-title">{section.label}</span>
                  <span className="nav-group-count">{safeDisplayCount}</span>
                </div>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isOpen && (
                <div className={`nav-group-grid ${section.key === 'reading' ? 'reading-nav-grid' : ''}`}>
                  {section.items.map(({ item, index }) => {
                    if (section.key === 'reading') {
                      const readingQuestions = Array.isArray(item.questions) ? item.questions : []
                      const readingResponse = answers[item.id] || {}
                      if (item.type === 'generation_placeholder' || readingQuestions.length === 0) {
                        const active = index === currentIndex
                        const status = item.generation_placeholder?.status || 'queued'
                        return (
                          <button
                            key={item.id}
                            className={`nav-item nav-sub-item ${active ? 'active' : ''} generation ${status}`}
                            onClick={() => onJump(index)}
                            disabled={disabled}
                          >
                            {status === 'failed' ? (
                              <XCircle size={14} />
                            ) : (
                              <LoaderCircle size={14} className="nav-spinner" />
                            )}
                          </button>
                        )
                      }

                      return readingQuestions.map((question, subIndex) => {
                        const answered = typeof readingResponse[question.id] === 'string' && readingResponse[question.id].length > 0
                        const wrong = submitted && answered && readingResponse[question.id] !== question.answer?.correct
                        const active =
                          index === currentIndex &&
                          String(subQuestionFocusMap?.[item.id] || '') === String(question.id)

                        return (
                          <button
                            key={question.id}
                            className={`nav-item nav-sub-item ${active ? 'active' : ''} ${answered ? 'answered' : ''} ${wrong ? 'wrong' : ''}`}
                            onClick={() => {
                              if (disabled) return
                              onFocusSubQuestion?.(item.id, question.id)
                              onJump(index)
                            }}
                            disabled={disabled}
                          >
                            {getReadingQuestionDisplayLabel(item, subIndex, index)}
                          </button>
                        )
                      })
                    }

                    const answered = isAnswered(item, answers[item.id])
                    const active = index === currentIndex
                    const wrong = submitted && isObjectiveWrong(item, answers[item.id])
                    const generationStatus = item.generation_placeholder?.status || ''

                    if (item.type === 'generation_placeholder') {
                      return (
                        <button
                          key={item.id}
                          className={`nav-item generation ${active ? 'active' : ''} ${generationStatus}`}
                          onClick={() => onJump(index)}
                          disabled={disabled}
                          title={item.generation_placeholder?.summary || 'AI 正在生成本题'}
                        >
                          {generationStatus === 'failed' ? (
                            <XCircle size={14} />
                          ) : (
                            <LoaderCircle size={14} className="nav-spinner" />
                          )}
                        </button>
                      )
                    }

                    return (
                      <button
                        key={item.id}
                        className={`nav-item ${active ? 'active' : ''} ${answered ? 'answered' : ''} ${wrong ? 'wrong' : ''}`}
                        onClick={() => onJump(index)}
                        disabled={disabled}
                      >
                        {index + 1}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
