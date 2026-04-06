import React from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, FileText, Languages, XCircle } from 'lucide-react'

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
  if (!item) return false

  if (item.type === 'reading') {
    if (!response || typeof response !== 'object') return false
    return item.questions.every((question) => typeof response[question.id] === 'string' && response[question.id].length > 0)
  }

  if (item.answer?.type === 'subjective') {
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

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function ReadingBlock({ item, response, submitted, onSelectReadingOption }) {
  const readingResponse = response || {}

  return (
    <div className="reading-layout">
      <section className="reading-passage-card">
        <div className="reading-passage-head">
          <FileText size={16} />
          <span>{item.passage?.title || item.title || '阅读文章'}</span>
        </div>
        <div className="reading-passage-body">{item.passage?.content}</div>
      </section>

      <section className="reading-questions-card">
        <div className="reading-questions-head">问题区</div>
        <div className="reading-question-list">
          {item.questions.map((subQuestion, subIndex) => {
            const userAnswer = readingResponse[subQuestion.id]
            return (
              <div key={subQuestion.id} className="reading-question-item">
                <div className="reading-question-title">
                  <span className="tag">第 {subIndex + 1} 小题</span>
                  <span>{subQuestion.prompt}</span>
                </div>

                <div className="options compact-options">
                  {subQuestion.options.map((option, optionIndex) => {
                    const selected = userAnswer === option.key
                    let className = 'option compact-option'
                    let icon = null

                    if (!submitted) {
                      if (selected) className += ' selected'
                    } else if (option.key === subQuestion.answer?.correct) {
                      className += ' correct'
                      icon = <CheckCircle2 size={18} />
                    } else if (selected) {
                      className += ' wrong'
                      icon = <XCircle size={18} />
                    } else {
                      className += ' muted'
                    }

                    return (
                      <button
                        key={optionIndex}
                        className={className}
                        onClick={() => onSelectReadingOption(item.id, subQuestion.id, option.key)}
                      >
                        <span>{renderOptionLabel(option)}</span>
                        {icon}
                      </button>
                    )
                  })}
                </div>

                {submitted && (
                  <div className="analysis-box compact-analysis-box">
                    <div>
                      正确答案：<strong>{subQuestion.answer?.correct}</strong>
                    </div>
                    <div>解析：{subQuestion.answer?.rationale || '暂无解析'}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function TranslationBlock({ item, userResponse, submitted, onTextChange }) {
  return (
    <div className="subjective-block translation-card">
      <div className="translation-source-meta">
        <Languages size={16} />
        <span>{item.direction === 'zh_to_en' ? '请将下面内容翻译成英文' : '请将下面内容翻译成中文'}</span>
      </div>

      <div className="translation-source">{item.source_text}</div>

      <textarea
        className="subjective-textarea"
        value={getSubjectiveText(userResponse)}
        onChange={(e) => onTextChange(item.id, e.target.value)}
        disabled={submitted}
        placeholder="请在这里输入你的翻译答案"
        rows={6}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />

      {!submitted && (
        <div className="subjective-tip">
          当前版本会自动保存你的译文，并在交卷后展示参考答案与评分点。
        </div>
      )}
    </div>
  )
}

function EssayBlock({ item, userResponse, submitted, onTextChange }) {
  const text = getSubjectiveText(userResponse)
  const wordCount = countWords(text)
  const minWords = item.requirements?.min_words || 0
  const maxWords = item.requirements?.max_words || null

  return (
    <div className="subjective-block essay-card">
      <div className="essay-head">
        <div className="essay-type-chip">{item.essay_type || 'writing'}</div>
        <div className="essay-word-count">
          当前字数：{wordCount}
          {minWords ? ` / 最低 ${minWords}` : ''}
          {maxWords ? ` / 建议不超过 ${maxWords}` : ''}
        </div>
      </div>

      {item.requirements?.topic && (
        <div className="essay-topic">
          <div className="essay-topic-label">写作任务</div>
          <div>{item.requirements.topic}</div>
        </div>
      )}

      {Array.isArray(item.requirements?.must_include) && item.requirements.must_include.length > 0 && (
        <div className="essay-requirements">
          <div className="essay-topic-label">必须覆盖</div>
          <ul className="analysis-list">
            {item.requirements.must_include.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
        </div>
      )}

      <textarea
        className="subjective-textarea essay-textarea"
        value={text}
        onChange={(e) => onTextChange(item.id, e.target.value)}
        disabled={submitted}
        placeholder="请在这里输入作文内容"
        rows={12}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />

      {!submitted && (
        <div className="subjective-tip">
          作文输入框已关闭拼写检查，尽量还原真实考试体验。当前版本交卷后会展示参考答案、提纲和评分维度。
        </div>
      )}
    </div>
  )
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
  onSelectReadingOption,
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
  const isReading = currentItem.type === 'reading'
  const isEssay = currentItem.type === 'essay'
  const isTranslation = currentItem.type === 'translation'

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
                <span key={tag} className="tag blue">{tag}</span>
              ))}
              {isTranslation && <span className="tag purple">{currentItem.direction === 'zh_to_en' ? '汉译英' : '英译汉'}</span>}
              {isEssay && <span className="tag purple">作文</span>}
              {isReading && <span className="tag purple">阅读理解</span>}
            </div>
            {currentItem.difficulty && (
              <span className={difficultyClass(currentItem.difficulty)}>{currentItem.difficulty}</span>
            )}
          </div>

          <div className="progress-text">进度：{currentIndex + 1} / {total}</div>

          {!isReading && currentItem.context && (
            <div className="question-context">
              {currentItem.context_title && (
                <div className="question-context-title">{currentItem.context_title}</div>
              )}
              <div className="question-context-body">{currentItem.context}</div>
            </div>
          )}

          <h3>{currentItem.prompt}</h3>

          {isReading ? (
            <ReadingBlock
              item={currentItem}
              response={userResponse}
              submitted={submitted}
              onSelectReadingOption={onSelectReadingOption}
            />
          ) : !isSubjective ? (
            <div className="options">
              {currentItem.options.map((opt, optIndex) => {
                const option = typeof opt === 'string' ? { key: opt.charAt(0), text: opt } : opt
                const selected = userResponse === option.key

                let className = 'option'
                let icon = null

                if (!submitted) {
                  if (selected) className += ' selected'
                } else if (option.key === currentItem.answer?.correct) {
                  className += ' correct'
                  icon = <CheckCircle2 size={18} />
                } else if (selected) {
                  className += ' wrong'
                  icon = <XCircle size={18} />
                } else {
                  className += ' muted'
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
          ) : isTranslation ? (
            <TranslationBlock
              item={currentItem}
              userResponse={userResponse}
              submitted={submitted}
              onTextChange={onTextChange}
            />
          ) : (
            <EssayBlock
              item={currentItem}
              userResponse={userResponse}
              submitted={submitted}
              onTextChange={onTextChange}
            />
          )}

          {submitted && !isSubjective && !isReading && (
            <div className="analysis-box">
              <div>
                正确答案：<strong>{currentItem.answer?.correct}</strong>
              </div>
              <div>解析：{currentItem.answer?.rationale || '暂无解析'}</div>
            </div>
          )}

          {submitted && isTranslation && (
            <div className="analysis-box">
              <div className="analysis-subblock">
                <div className="analysis-section-title">参考答案</div>
                <div>{currentItem.answer?.reference_answer || '暂无参考答案'}</div>
              </div>

              {Array.isArray(currentItem.answer?.alternate_answers) && currentItem.answer.alternate_answers.length > 0 && (
                <div className="analysis-subblock">
                  <div className="analysis-section-title">可接受表达</div>
                  <ul className="analysis-list">
                    {currentItem.answer.alternate_answers.map((answerText, index) => (
                      <li key={index}>{answerText}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(currentItem.answer?.scoring_points) && currentItem.answer.scoring_points.length > 0 && (
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

          {submitted && isEssay && (
            <div className="analysis-box">
              {currentItem.answer?.reference_answer && (
                <div className="analysis-subblock">
                  <div className="analysis-section-title">参考范文</div>
                  <div>{currentItem.answer.reference_answer}</div>
                </div>
              )}

              {Array.isArray(currentItem.answer?.outline) && currentItem.answer.outline.length > 0 && (
                <div className="analysis-subblock">
                  <div className="analysis-section-title">写作提纲</div>
                  <ul className="analysis-list">
                    {currentItem.answer.outline.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {currentItem.answer?.scoring_rubric && (
                <div className="analysis-subblock">
                  <div className="analysis-section-title">评分维度</div>
                  <ul className="analysis-list">
                    {Object.entries(currentItem.answer.scoring_rubric).map(([key, value]) => (
                      <li key={key}>
                        <strong>{key}</strong>：{value} 分
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(currentItem.answer?.common_errors) && currentItem.answer.common_errors.length > 0 && (
                <div className="analysis-subblock">
                  <div className="analysis-section-title">常见失分点</div>
                  <ul className="analysis-list">
                    {currentItem.answer.common_errors.map((point, index) => (
                      <li key={index}>{point}</li>
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

        {!submitted && total > 0 && !isLast && (
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
