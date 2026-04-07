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
  Star,
  XCircle,
} from 'lucide-react'

function difficultyClass(difficulty = '') {
  switch ((difficulty || '').toLowerCase()) {
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

function renderOptionLabel(option) {
  if (typeof option === 'string') return option
  return `${option.key}. ${option.text}`
}

function getSubjectiveText(response) {
  if (typeof response === 'string') return response
  return response?.text || ''
}

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function normalizeChoiceArray(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))].sort()
}

function isAnswered(item, response) {
  if (!item) return false
  if (item.type === 'reading') {
    if (!response || typeof response !== 'object') return false
    return item.questions.every((question) => typeof response[question.id] === 'string' && response[question.id].length > 0)
  }
  if (item.type === 'multiple_choice') {
    return normalizeChoiceArray(response).length > 0
  }
  if (item.type === 'fill_blank') {
    if (!response || typeof response !== 'object') return false
    return item.blanks.every((blank) => typeof response[blank.blank_id] === 'string' && response[blank.blank_id].trim().length > 0)
  }
  if (item.answer?.type === 'subjective') {
    if (typeof response === 'string') return response.trim().length > 0
    return Boolean(response?.text?.trim())
  }
  return typeof response === 'string' && response.length > 0
}

function isObjectiveWrong(item, response) {
  if (!item || item.answer?.type !== 'objective' || !isAnswered(item, response)) return false
  if (item.type === 'multiple_choice') {
    const actual = normalizeChoiceArray(response)
    const expected = normalizeChoiceArray(item.answer?.correct)
    return actual.length !== expected.length || actual.some((value, index) => value !== expected[index])
  }
  if (item.type === 'fill_blank') {
    return item.blanks.some((blank) => {
      const userValue = String(response?.[blank.blank_id] || '').trim().toLowerCase()
      return !blank.accepted_answers.some((candidate) => String(candidate).trim().toLowerCase() === userValue)
    })
  }
  return response !== item.answer?.correct
}

function getSpoilerTags(item) {
  const hiddenTags = new Set()
  if (item.type) hiddenTags.add(String(item.type).toLowerCase())
  if (item.source_type) hiddenTags.add(String(item.source_type).toLowerCase())
  if (item.direction) hiddenTags.add(String(item.direction).toLowerCase())
  if (item.essay_type) hiddenTags.add(String(item.essay_type).toLowerCase())
  return (item.tags || []).filter((tag) => !hiddenTags.has(String(tag).toLowerCase()))
}

function getNavGroupMeta(item) {
  if (item.type === 'reading') return { key: 'reading', label: '阅读理解' }
  if (item.type === 'translation') return { key: 'translation', label: '翻译题' }
  if (item.type === 'essay') return { key: 'essay', label: '作文题' }
  if (item.type === 'multiple_choice') return { key: 'multiple_choice', label: '多项选择' }
  if (item.type === 'true_false') return { key: 'true_false', label: '判断题' }
  if (item.type === 'fill_blank' || item.source_type === 'cloze') return { key: 'fill_blank', label: '填空题' }
  return { key: 'single_choice', label: '单项选择' }
}

function formatRemainingSeconds(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function ReadingBlock({
  item,
  response,
  submitted,
  isPaused,
  mode,
  revealedMap,
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
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
          </button>
        </div>
        <div className={`reading-passage-body ${immersiveReading ? 'immersive' : ''}`}>
          {item.passage?.content}
        </div>
      </section>

      <section className={`reading-questions-card ${immersiveReading ? 'immersive' : ''}`}>
        <div className="reading-question-list">
          {item.questions.map((subQuestion, subIndex) => {
            const userAnswer = readingResponse[subQuestion.id]
            const revealKey = `${item.id}:${subQuestion.id}`
            const showFeedback = submitted || (mode === 'practice' && revealedMap[revealKey])
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
                  <span className="tag">{subIndex + 1}</span>
                  <span>{subQuestion.prompt}</span>
                </div>

                <div className="options compact-options">
                  {subQuestion.options.map((option, optionIndex) => {
                    const selected = userAnswer === option.key
                    let className = 'option compact-option'
                    let icon = null

                    if (!showFeedback) {
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
                        disabled={submitted || isPaused || (mode === 'practice' && showFeedback)}
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

                {showFeedback && (
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

function TranslationBlock({ item, userResponse, disabled, submitted, onTextChange }) {
  return (
    <div className="subjective-block translation-card">
      <div className="translation-source-meta">
        <Languages size={16} />
        <span>{item.direction === 'zh_to_en' ? '汉译英' : '英译汉'}</span>
      </div>
      <div className="translation-source">{item.source_text}</div>
      <textarea
        className="subjective-textarea"
        value={getSubjectiveText(userResponse)}
        onChange={(event) => onTextChange(item.id, event.target.value)}
        disabled={disabled}
        rows={6}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />
      {submitted && item.answer?.reference_answer && (
        <div className="analysis-box">
          <div>{item.answer.reference_answer}</div>
        </div>
      )}
    </div>
  )
}

function EssayBlock({ item, userResponse, disabled, submitted, onTextChange }) {
  const text = getSubjectiveText(userResponse)
  const wordCount = countWords(text)

  return (
    <div className="subjective-block essay-card">
      <div className="essay-head">
        <div className="essay-type-chip">{item.essay_type || 'writing'}</div>
        <div className="essay-word-count">{wordCount}</div>
      </div>
      {item.requirements?.topic && <div className="essay-topic">{item.requirements.topic}</div>}
      <textarea
        className="subjective-textarea essay-textarea"
        value={text}
        onChange={(event) => onTextChange(item.id, event.target.value)}
        disabled={disabled}
        rows={12}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />
      {submitted && item.answer?.reference_answer && (
        <div className="analysis-box">
          <div>{item.answer.reference_answer}</div>
        </div>
      )}
    </div>
  )
}

function ObjectiveOptionsBlock({
  item,
  userResponse,
  objectiveReveal,
  submitted,
  disabled,
  mode,
  onSelectOption,
}) {
  const selectedValues = item.type === 'multiple_choice' ? normalizeChoiceArray(userResponse) : []

  return (
    <div className="options">
      {item.options.map((opt, optIndex) => {
        const option = typeof opt === 'string' ? { key: opt.charAt(0), text: opt } : opt
        const selected = item.type === 'multiple_choice' ? selectedValues.includes(option.key) : userResponse === option.key
        const isCorrect = item.type === 'multiple_choice'
          ? normalizeChoiceArray(item.answer?.correct).includes(option.key)
          : option.key === item.answer?.correct

        let className = 'option'
        let icon = null

        if (!objectiveReveal) {
          if (selected) className += ' selected'
        } else if (isCorrect) {
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
            disabled={submitted || disabled || (mode === 'practice' && objectiveReveal)}
            onClick={() => onSelectOption(item.id, option.key)}
          >
            <span>{renderOptionLabel(option)}</span>
            {icon}
          </button>
        )
      })}
    </div>
  )
}

function FillBlankBlock({ item, userResponse, objectiveReveal, submitted, disabled, mode, onFillBlankChange }) {
  const response = userResponse || {}

  return (
    <div className="subjective-block">
      <div className="answer-review-grid">
        {item.blanks.map((blank, index) => {
          const value = response[blank.blank_id] || ''
          const normalized = String(value).trim().toLowerCase()
          const isCorrect = blank.accepted_answers.some((candidate) => String(candidate).trim().toLowerCase() === normalized)
          const showFeedback = objectiveReveal

          return (
            <article
              key={blank.blank_id}
              className={`answer-review-card ${showFeedback ? (isCorrect ? 'correct' : 'wrong') : ''}`}
            >
              <div className="answer-review-prompt">第 {index + 1} 空</div>
              <input
                className="subjective-textarea"
                value={value}
                onChange={(event) => onFillBlankChange(item.id, blank.blank_id, event.target.value)}
                disabled={submitted || disabled || (mode === 'practice' && objectiveReveal)}
                placeholder="请输入答案"
              />
              {showFeedback && (
                <>
                  <div className="answer-review-line">
                    <strong>参考答案：</strong>
                    {blank.accepted_answers.join(' / ')}
                  </div>
                  <div className="answer-review-line">
                    <strong>解析：</strong>
                    {blank.rationale || '暂无解析'}
                  </div>
                </>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default function CleanQuizView({
  quiz,
  answers,
  submitted,
  currentIndex,
  mode = 'exam',
  autoAdvance = false,
  remainingSeconds = 0,
  isPaused = false,
  spoilerExpanded = false,
  revealedMap = {},
  isFavorite = false,
  onToggleFavorite,
  onToggleSpoiler,
  onToggleAutoAdvance,
  onTogglePause,
  onJump,
  onPrev,
  onNext,
  onSelectOption,
  onSelectReadingOption,
  onFillBlankChange,
  onTextChange,
  onSubmit,
}) {
  const total = quiz.items.length
  const currentItem = quiz.items[currentIndex]
  const [openGroups, setOpenGroups] = useState({})
  const [focusedReadingQuestion, setFocusedReadingQuestion] = useState(null)

  const groupedNavSections = useMemo(() => {
    const order = ['single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'reading', 'translation', 'essay']
    const map = new Map()

    quiz.items.forEach((item, index) => {
      const meta = getNavGroupMeta(item)
      if (!map.has(meta.key)) map.set(meta.key, { ...meta, items: [] })
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
    if (!currentItem) return
    const currentGroupKey = getNavGroupMeta(currentItem).key
    setOpenGroups((prev) => (prev[currentGroupKey] === false ? { ...prev, [currentGroupKey]: true } : prev))

    if (currentItem.type === 'reading') {
      setFocusedReadingQuestion((prev) => {
        if (prev?.itemId === currentItem.id && prev?.subQuestionId) return prev
        return { itemId: currentItem.id, subQuestionId: currentItem.questions?.[0]?.id || null }
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
  const isFillBlank = currentItem.type === 'fill_blank'
  const spoilerTags = getSpoilerTags(currentItem)
  const disabled = isPaused && mode === 'exam'
  const objectiveReveal = submitted || (mode === 'practice' && revealedMap[currentItem.id])

  return (
    <section className="quiz-layout clean-workspace-layout">
      <aside className="sidebar-card nav-sidebar">
        <div className="sidebar-head-row">
          <h3>题目导航</h3>
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

        {mode === 'exam' && (
          <div className="sidebar-tools compact-sidebar-tools">
            <div className="sidebar-tool-card compact-toggle-card">
              <span className="sidebar-tool-title">自动切题</span>
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
        )}

        <div className="nav-accordion">
          {groupedNavSections.map((section) => {
            const isOpen = openGroups[section.key] ?? true
            const displayCount =
              section.key === 'reading'
                ? section.items.reduce((sum, { item }) => sum + (item.questions?.length || 0), 0)
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
                                if (disabled) return
                                setFocusedReadingQuestion({ itemId: item.id, subQuestionId: question.id })
                                onJump(index)
                              }}
                              disabled={disabled}
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

      <div className="question-list">
        <article className="question-card current">
          {disabled && !submitted && <div className="paused-banner">答题已暂停。</div>}

          <div className="question-top">
            <div className="question-meta">
              <span className="tag">第 {currentIndex + 1} 题</span>
              {isTranslation && <span className="tag purple">{currentItem.direction === 'zh_to_en' ? '汉译英' : '英译汉'}</span>}
              {isEssay && <span className="tag purple">作文</span>}
              {isReading && <span className="tag purple">阅读理解</span>}
              {currentItem.type === 'multiple_choice' && <span className="tag purple">多选</span>}
              {currentItem.type === 'true_false' && <span className="tag purple">判断</span>}
              {isFillBlank && <span className="tag purple">填空</span>}
              {spoilerTags.length > 0 && (
                <button type="button" className="spoiler-icon-toggle" onClick={onToggleSpoiler}>
                  {spoilerExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
              {spoilerExpanded && spoilerTags.map((tag) => <span key={tag} className="tag spoiler-tag">{tag}</span>)}
            </div>

            <div className="question-top-actions">
              {onToggleFavorite && (
                <button type="button" className={`favorite-toggle ${isFavorite ? 'active' : ''}`} onClick={onToggleFavorite}>
                  <Star size={15} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              )}
              {currentItem.difficulty && <span className={difficultyClass(currentItem.difficulty)}>{currentItem.difficulty}</span>}
            </div>
          </div>

          <div className="progress-text">进度：{currentIndex + 1} / {total}</div>

          {!isReading && currentItem.context && (
            <div className="question-context">
              {currentItem.context_title && <div className="question-context-title">{currentItem.context_title}</div>}
              <div className="question-context-body">{currentItem.context}</div>
            </div>
          )}

          <h3>{currentItem.prompt}</h3>

          {isReading ? (
            <ReadingBlock
              item={currentItem}
              response={userResponse}
              submitted={submitted}
              isPaused={disabled}
              mode={mode}
              revealedMap={revealedMap}
              focusSubQuestionId={focusedReadingQuestion?.itemId === currentItem.id ? focusedReadingQuestion?.subQuestionId : null}
              onFocusSubQuestion={(subQuestionId) => setFocusedReadingQuestion({ itemId: currentItem.id, subQuestionId })}
              onSelectReadingOption={onSelectReadingOption}
            />
          ) : isFillBlank ? (
            <FillBlankBlock
              item={currentItem}
              userResponse={userResponse}
              objectiveReveal={objectiveReveal}
              submitted={submitted}
              disabled={disabled}
              mode={mode}
              onFillBlankChange={onFillBlankChange}
            />
          ) : !isSubjective ? (
            <ObjectiveOptionsBlock
              item={currentItem}
              userResponse={userResponse}
              objectiveReveal={objectiveReveal}
              submitted={submitted}
              disabled={disabled}
              mode={mode}
              onSelectOption={onSelectOption}
            />
          ) : isTranslation ? (
            <TranslationBlock
              item={currentItem}
              userResponse={userResponse}
              disabled={disabled || submitted}
              submitted={submitted}
              onTextChange={onTextChange}
            />
          ) : (
            <EssayBlock
              item={currentItem}
              userResponse={userResponse}
              disabled={disabled || submitted}
              submitted={submitted}
              onTextChange={onTextChange}
            />
          )}

          {objectiveReveal && !isSubjective && !isReading && !isFillBlank && (
            <div className="analysis-box">
              <div>
                正确答案：
                <strong>
                  {Array.isArray(currentItem.answer?.correct)
                    ? currentItem.answer.correct.join(' / ')
                    : currentItem.answer?.correct}
                </strong>
              </div>
              <div>解析：{currentItem.answer?.rationale || '暂无解析'}</div>
            </div>
          )}

          <div className="question-actions">
            <button className="secondary-btn" onClick={onPrev} disabled={isFirst || disabled}>
              <ChevronLeft size={16} />
              上一题
            </button>

            {!submitted ? (
              isLast ? (
                <button className="submit-btn small-submit-btn" onClick={() => onSubmit()} disabled={disabled}>
                  {mode === 'practice' ? '结束练习' : '交卷并查看解析'}
                </button>
              ) : (
                <button className="secondary-btn" onClick={onNext} disabled={disabled}>
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
            <button className="submit-btn" onClick={() => onSubmit()} disabled={disabled}>
              {mode === 'practice' ? '结束练习' : '交卷并查看解析'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
