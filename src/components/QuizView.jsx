import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  FileText,
  Languages,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  XCircle,
} from 'lucide-react'

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

function formatRemainingSeconds(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getNavGroupMeta(item) {
  if (item.type === 'reading') return { key: 'reading', label: '阅读理解' }
  if (item.type === 'translation') return { key: 'translation', label: '翻译题' }
  if (item.type === 'essay') return { key: 'essay', label: '作文题' }
  if (item.source_type === 'cloze') return { key: 'cloze', label: '完形填空' }
  return { key: 'single_choice', label: '单项选择' }
}

function getSpoilerTags(item) {
  const hiddenTags = new Set()

  if (item.type) hiddenTags.add(String(item.type).toLowerCase())
  if (item.source_type) hiddenTags.add(String(item.source_type).toLowerCase())
  if (item.direction) hiddenTags.add(String(item.direction).toLowerCase())
  if (item.essay_type) hiddenTags.add(String(item.essay_type).toLowerCase())

  return (item.tags || []).filter((tag) => !hiddenTags.has(String(tag).toLowerCase()))
}

function isObjectiveWrong(item, response) {
  if (!item || item.answer?.type !== 'objective') return false
  return Boolean(response) && response !== item.answer?.correct
}

function ReadingBlock({
  item,
  response,
  submitted,
  isPaused,
  focusSubQuestionId,
  onFocusSubQuestion,
  onSelectReadingOption,
}) {
  const [immersiveReading, setImmersiveReading] = useState(false)
  const readingResponse = response || {}
  const questionRefs = useRef({})

  useEffect(() => {
    if (!focusSubQuestionId) return
    const target = questionRefs.current[focusSubQuestionId]
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [focusSubQuestionId])

  return (
    <div className={`reading-layout ${immersiveReading ? 'immersive' : ''}`}>
      <section className={`reading-passage-card ${immersiveReading ? 'immersive' : ''}`}>
        <div className="reading-passage-head">
          <div className="reading-passage-title">
            <FileText size={16} />
            <span>{item.passage?.title || item.title || '阅读文章'}</span>
          </div>

          <button
            type="button"
            className="reading-mode-btn"
            onClick={() => setImmersiveReading((value) => !value)}
            disabled={isPaused}
          >
            {immersiveReading ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {immersiveReading ? '退出沉浸' : '沉浸阅读'}
          </button>
        </div>

        <div className={`reading-passage-body ${immersiveReading ? 'immersive' : ''}`}>
          {item.passage?.content}
        </div>
      </section>

      <section className={`reading-questions-card ${immersiveReading ? 'immersive' : ''}`}>
        <div className="reading-questions-head">问题区</div>
        {immersiveReading && (
          <div className="reading-immersive-note">
            当前为沉浸阅读模式，文章区域已加宽。可直接继续作答，或点击“退出沉浸”恢复标准布局。
          </div>
        )}
        <div className="reading-question-list">
          {item.questions.map((subQuestion, subIndex) => {
            const userAnswer = readingResponse[subQuestion.id]
            const isFocused = focusSubQuestionId === subQuestion.id
            return (
              <div
                key={subQuestion.id}
                ref={(node) => {
                  questionRefs.current[subQuestion.id] = node
                }}
                className={`reading-question-item ${isFocused ? 'focused' : ''}`}
              >
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
                        disabled={submitted || isPaused}
                        onClick={() => {
                          onFocusSubQuestion(subQuestion.id)
                          onSelectReadingOption(item.id, subQuestion.id, option.key)
                        }}
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

function TranslationBlock({ item, userResponse, submitted, isPaused, onTextChange }) {
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
        disabled={submitted || isPaused}
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

function EssayBlock({ item, userResponse, submitted, isPaused, onTextChange }) {
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
        disabled={submitted || isPaused}
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
  autoAdvance,
  remainingSeconds,
  isPaused,
  onToggleAutoAdvance,
  onTogglePause,
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
  const [showSpoilerTags, setShowSpoilerTags] = useState(false)
  const [openGroups, setOpenGroups] = useState({})
  const [focusedReadingQuestion, setFocusedReadingQuestion] = useState(null)

  const groupedNavSections = useMemo(() => {
    const order = ['single_choice', 'cloze', 'reading', 'translation', 'essay']
    const map = new Map()

    quiz.items.forEach((item, index) => {
      const meta = getNavGroupMeta(item)
      if (!map.has(meta.key)) {
        map.set(meta.key, { ...meta, items: [] })
      }
      map.get(meta.key).items.push({ item, index })
    })

    return Array.from(map.values()).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
  }, [quiz])

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
    setShowSpoilerTags(false)
    if (!currentItem) return
    const currentGroupKey = getNavGroupMeta(currentItem).key
    setOpenGroups((prev) => {
      if (prev[currentGroupKey] === false) {
        return { ...prev, [currentGroupKey]: true }
      }
      return prev
    })

    if (currentItem.type === 'reading') {
      setFocusedReadingQuestion((prev) => {
        if (prev?.itemId === currentItem.id && prev?.subQuestionId) return prev
        return {
          itemId: currentItem.id,
          subQuestionId: currentItem.questions?.[0]?.id || null,
        }
      })
    } else {
      setFocusedReadingQuestion(null)
    }
  }, [currentItem?.id])

  if (!currentItem) return null

  const userResponse = answers[currentItem.id]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === total - 1
  const isSubjective = currentItem.answer?.type === 'subjective'
  const isReading = currentItem.type === 'reading'
  const isEssay = currentItem.type === 'essay'
  const isTranslation = currentItem.type === 'translation'
  const spoilerTags = getSpoilerTags(currentItem)

  return (
    <section className="quiz-layout">
      <aside className="sidebar-card nav-sidebar">
        <div className="sidebar-head-row">
          <h3>题目导航</h3>
        </div>

        <div className="sidebar-tools">
          <div className="sidebar-tool-card timer-tool-card">
            <div className="sidebar-tool-copy">
              <div className="sidebar-tool-title">模考计时器</div>
              <div className="sidebar-tool-desc">总时长 90 分钟，暂停后将冻结答题</div>
            </div>
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
              {isPaused ? '继续答题' : '暂停答题'}
            </button>
          </div>

          <div className="sidebar-tool-card">
            <div className="sidebar-tool-copy">
              <div className="sidebar-tool-title">自动切题</div>
              <div className="sidebar-tool-desc">选中选项后自动跳到下一题</div>
            </div>
            <button
              type="button"
              className={`toggle-switch ${autoAdvance ? 'on' : ''}`}
              onClick={onToggleAutoAdvance}
              aria-pressed={autoAdvance}
              disabled={isPaused}
            >
              <span className="toggle-knob" />
            </button>
          </div>
        </div>

        <div className="nav-accordion">
          {groupedNavSections.map((section) => {
            const isOpen = openGroups[section.key] ?? true
            const displayCount = section.key === 'reading'
              ? section.items.reduce((sum, { item }) => sum + (item.questions?.length || 0), 0)
              : section.items.length

            return (
              <div key={section.key} className="nav-group">
                <button
                  type="button"
                  className={`nav-group-header ${isOpen ? 'open' : ''}`}
                  onClick={() =>
                    setOpenGroups((prev) => ({
                      ...prev,
                      [section.key]: !isOpen,
                    }))
                  }
                >
                  <div className="nav-group-title-wrap">
                    <span className="nav-group-title">{section.label}</span>
                    <span className="nav-group-count">{displayCount}</span>
                  </div>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isOpen && (
                  <div className={`nav-group-grid ${section.key === 'reading' ? 'reading-nav-grid' : ''}`}>
                    {section.items.map(({ item, index }) => {
                      if (section.key === 'reading') {
                        const readingResponse = answers[item.id] || {}
                        return item.questions.map((question, subIndex) => {
                          const answered = typeof readingResponse[question.id] === 'string' && readingResponse[question.id].length > 0
                          const wrong = submitted && answered && readingResponse[question.id] !== question.answer?.correct
                          const active =
                            index === currentIndex &&
                            focusedReadingQuestion?.itemId === item.id &&
                            focusedReadingQuestion?.subQuestionId === question.id

                          return (
                            <button
                              key={question.id}
                              className={`nav-item nav-sub-item ${active ? 'active' : ''} ${answered ? 'answered' : ''} ${wrong ? 'wrong' : ''}`}
                              onClick={() => {
                                if (isPaused) return
                                setFocusedReadingQuestion({ itemId: item.id, subQuestionId: question.id })
                                onJump(index)
                              }}
                              disabled={isPaused}
                              title={question.prompt}
                            >
                              {index + 1}-{subIndex + 1}
                            </button>
                          )
                        })
                      }

                      const answered = isAnswered(item, answers[item.id])
                      const active = index === currentIndex
                      const wrong = submitted && isObjectiveWrong(item, answers[item.id])

                      return (
                        <button
                          key={item.id}
                          className={`nav-item ${active ? 'active' : ''} ${answered ? 'answered' : ''} ${wrong ? 'wrong' : ''}`}
                          onClick={() => onJump(index)}
                          disabled={isPaused}
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

      <div className="question-list">
        <article className="question-card current">
          {isPaused && !submitted && (
            <div className="paused-banner">
              答题已暂停，计时器已冻结。点击左侧“继续答题”后恢复操作。
            </div>
          )}

          <div className="question-top">
            <div className="question-meta">
              <span className="tag">第 {currentIndex + 1} 题</span>
              {isTranslation && <span className="tag purple">{currentItem.direction === 'zh_to_en' ? '汉译英' : '英译汉'}</span>}
              {isEssay && <span className="tag purple">作文</span>}
              {isReading && <span className="tag purple">阅读理解</span>}

              {spoilerTags.length > 0 && (
                <button
                  type="button"
                  className={`spoiler-toggle ${showSpoilerTags ? 'open' : ''}`}
                  onClick={() => setShowSpoilerTags((value) => !value)}
                >
                  <span>{showSpoilerTags ? '隐藏考点' : '考点'}</span>
                  {showSpoilerTags ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}

              {showSpoilerTags && spoilerTags.map((tag) => (
                <span key={tag} className="tag spoiler-tag">{tag}</span>
              ))}
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
              key={currentItem.id}
              item={currentItem}
              response={userResponse}
              submitted={submitted}
              isPaused={isPaused}
              focusSubQuestionId={focusedReadingQuestion?.itemId === currentItem.id ? focusedReadingQuestion?.subQuestionId : null}
              onFocusSubQuestion={(subQuestionId) => setFocusedReadingQuestion({ itemId: currentItem.id, subQuestionId })}
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
                    disabled={submitted || isPaused}
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
              isPaused={isPaused}
              onTextChange={onTextChange}
            />
          ) : (
            <EssayBlock
              item={currentItem}
              userResponse={userResponse}
              submitted={submitted}
              isPaused={isPaused}
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
            <button className="secondary-btn" onClick={onPrev} disabled={isFirst || isPaused}>
              <ChevronLeft size={16} />
              上一题
            </button>

            {!submitted ? (
              isLast ? (
                <button className="submit-btn small-submit-btn" onClick={() => onSubmit()} disabled={isPaused}>
                  交卷并查看解析
                </button>
              ) : (
                <button className="secondary-btn" onClick={onNext} disabled={isPaused}>
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
            <button className="submit-btn" onClick={() => onSubmit()} disabled={isPaused}>
              交卷并查看解析
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
