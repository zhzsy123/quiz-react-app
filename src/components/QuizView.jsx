import React from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, XCircle } from 'lucide-react'

function difficultyClass(difficulty = '') {
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return 'tag easy'
    case 'medium':
      return 'tag medium'
    case 'hard':
      return 'tag hard'
    default:
      return 'tag'
  }
}

export default function QuizView({
  quiz,
  answers,
  submitted,
  currentIndex,
  onJump,
  onPrev,
  onNext,
  onSelectOption,
  onSubmit,
}) {
  const total = quiz.items.length
  const currentItem = quiz.items[currentIndex]
  const userAnswer = answers[currentItem.id]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === total - 1

  return (
    <section className="quiz-layout">
      <aside className="sidebar-card">
        <h3>题号导航</h3>
        <div className="nav-grid">
          {quiz.items.map((item, index) => {
            const answered = Boolean(answers[item.id])
            const active = index === currentIndex
            return (
              <button
                key={item.id}
                className={`nav-item ${active ? 'active' : ''} ${answered ? 'answered' : ''}`}
                onClick={() => onJump(index)}
              >
                {index + 1}
              </button>
            )
          })}
        </div>
      </aside>

      <div className="question-list">
        <article className="question-card current">
          <div className="question-top">
            <div className="question-meta">
              <span className="tag">第 {currentIndex + 1} 题</span>
              {currentItem.tags?.map((tag) => (
                <span key={tag} className="tag blue">
                  {tag}
                </span>
              ))}
            </div>
            {currentItem.difficulty && (
              <span className={difficultyClass(currentItem.difficulty)}>
                {currentItem.difficulty}
              </span>
            )}
          </div>

          <div className="progress-text">
            进度：{currentIndex + 1} / {total}
          </div>

          <h3>{currentItem.question}</h3>

          <div className="options">
            {currentItem.options.map((opt, optIndex) => {
              const letter = opt.charAt(0)
              const selected = userAnswer === letter

              let className = 'option'
              let icon = null

              if (!submitted) {
                if (selected) className += ' selected'
              } else {
                if (letter === currentItem.correct_answer) {
                  className += ' correct'
                  icon = <CheckCircle2 size={18} />
                } else if (selected) {
                  className += ' wrong'
                  icon = <XCircle size={18} />
                } else {
                  className += ' muted'
                }
              }

              return (
                <button
                  key={optIndex}
                  className={className}
                  onClick={() => onSelectOption(currentItem.id, letter)}
                >
                  <span>{opt}</span>
                  {icon}
                </button>
              )
            })}
          </div>

          {submitted && (
            <div className="analysis-box">
              <div>
                正确答案：<strong>{currentItem.correct_answer}</strong>
              </div>
              <div>解析：{currentItem.rationale}</div>
            </div>
          )}

          <div className="question-actions">
            <button className="secondary-btn" onClick={onPrev} disabled={isFirst}>
              <ChevronLeft size={16} />
              上一题
            </button>

            {!submitted ? (
              isLast ? (
                <button className="submit-btn small-submit-btn" onClick={onSubmit}>
                  交卷并查看解析
                </button>
              ) : (
                <button className="secondary-btn" onClick={onNext}>
                  下一题
                  <ChevronRight size={16} />
                </button>
              )
            ) : (
              <button className="secondary-btn" onClick={onNext} disabled={isLast}>
                下一题
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </article>

        {!submitted && total > 0 && (
          <div className="submit-wrap">
            <button className="submit-btn" onClick={onSubmit}>
              交卷并查看解析
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
