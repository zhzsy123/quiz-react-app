import React from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

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
  onSelectOption,
  onSubmit,
}) {
  const total = quiz.items.length

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
        {quiz.items.map((item, index) => {
          const userAnswer = answers[item.id]
          return (
            <article
              key={item.id}
              className={`question-card ${index === currentIndex ? 'current' : ''}`}
            >
              <div className="question-top">
                <div className="question-meta">
                  <span className="tag">第 {index + 1} 题</span>
                  {item.tags?.map((tag) => (
                    <span key={tag} className="tag blue">{tag}</span>
                  ))}
                </div>
                {item.difficulty && (
                  <span className={difficultyClass(item.difficulty)}>{item.difficulty}</span>
                )}
              </div>

              <h3>{item.question}</h3>

              <div className="options">
                {item.options.map((opt, optIndex) => {
                  const letter = opt.charAt(0)
                  const selected = userAnswer === letter

                  let className = 'option'
                  let icon = null

                  if (!submitted) {
                    if (selected) className += ' selected'
                  } else {
                    if (letter === item.correct_answer) {
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
                      onClick={() => onSelectOption(item.id, letter)}
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
                    正确答案：<strong>{item.correct_answer}</strong>
                  </div>
                  <div>解析：{item.rationale}</div>
                </div>
              )}
            </article>
          )
        })}

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