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

function isAnswered(item, response) {
  if (item?.answer?.type === 'subjective') {
    if (typeof response === 'string') return response.trim().length > 0
    return Boolean(response?.text?.trim())
  }
  return typeof response === 'string' && response.length > 0
}

function getSubjectiveText(response) {
  if (typeof response === 'string') return response
  return response?.text || ''
}

function renderOptionLabel(option) {
  if (typeof option === 'string') return option
  return `${option.key}. ${option.text}`
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
  onTextChange,
  onSubmit,
}) {
  const total = quiz.items.length
  const currentItem = quiz.items[currentIndex]

  if (!currentItem) return null

  const userResponse = answers[currentItem.id]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === total - 1
  const isSubjective = currentItem.answer?.type === 'subjective'

  return (
    <section className="quiz-layout">
      <aside className="sidebar-card">
        <h3>题号导航</h3>
        <div className="nav-grid">
          {quiz.items.map((item, index) => {
            const answered = isAnswered(item, answers[item.id])
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
              {currentItem.type === 'translation' && (
                <span className="tag purple">
                  {currentItem.direction === 'zh_to_en' ? '汉译英' : '英译汉'}
                </span>
              )}
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

          {currentItem.context && (
            <div className="question-context">
              {currentItem.context_title && (
                <div className="question-context-title">{currentItem.context_title}</div>
              )}
              <div className="question-context-body">{currentItem.context}</div>
            </div>
          )}

          <h3>{currentItem.prompt}</h3>

          {!isSubjective ? (
            <div className="options">
              {currentItem.options.map((opt, optIndex) => {
                const option = typeof opt === 'string' ? { key: opt.charAt(0), text: opt } : opt
                const selected = userResponse === option.key

                let className = 'option'
                let icon = null

                if (!submitted) {
                  if (selected) className += ' selected'
                } else {
                  if (option.key === currentItem.answer?.correct) {
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
                    onClick={() => onSelectOption(currentItem.id, option.key)}
                  >
                    <span>{renderOptionLabel(option)}</span>
                    {icon}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="subjective-block">
              <div className="translation-source-meta">
                {currentItem.direction === 'zh_to_en'
                  ? '请将下面内容翻译成英文'
                  : '请将下面内容翻译成中文'}
              </div>

              <div className="translation-source">{currentItem.source_text}</div>

              <textarea
                className="subjective-textarea"
                value={getSubjectiveText(userResponse)}
                onChange={(e) => onTextChange(currentItem.id, e.target.value)}
                disabled={submitted}
                placeholder="请在这里输入你的翻译答案"
              />

              {!submitted && (
                <div className="subjective-tip">
                  当前版本会自动保存你的译文，并在交卷后展示参考答案与评分点。
                </div>
              )}
            </div>
          )}

          {submitted && !isSubjective && (
            <div className="analysis-box">
              <div>
                正确答案：<strong>{currentItem.answer?.correct}</strong>
              </div>
              <div>解析：{currentItem.answer?.rationale || '暂无解析'}</div>
            </div>
          )}

          {submitted && isSubjective && (
            <div className="analysis-box">
              <div className="analysis-subblock">
                <div className="analysis-section-title">参考答案</div>
                <div>{currentItem.answer?.reference_answer || '暂无参考答案'}</div>
              </div>

              {Array.isArray(currentItem.answer?.alternate_answers) &&
                currentItem.answer.alternate_answers.length > 0 && (
                  <div className="analysis-subblock">
                    <div className="analysis-section-title">可接受表达</div>
                    <ul className="analysis-list">
                      {currentItem.answer.alternate_answers.map((answerText, index) => (
                        <li key={index}>{answerText}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {Array.isArray(currentItem.answer?.scoring_points) &&
                currentItem.answer.scoring_points.length > 0 && (
                  <div className="analysis-subblock">
                    <div className="analysis-section-title">评分点</div>
                    <ul className="analysis-list">
                      {currentItem.answer.scoring_points.map((point, index) => (
                        <li key={index}>
                          <strong>{point.point}</strong>
                          {typeof point.score === 'number' ? `（${point.score} 分）` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
