import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  FileText,
  Languages,
  LoaderCircle,
  Pause,
  Play,
  Star,
  XCircle,
} from 'lucide-react'
import RichContentBlocks from './RichContentBlocks'
import {
  evaluateFillBlankBlank,
  formatStructuredResponse,
  getObjectiveCorrectLabel,
  getQuestionGroupMeta,
  isObjectiveCorrect,
  isResponseAnswered,
  normalizeChoiceArray,
} from '../utils/questionRuntime'

function difficultyClass(difficulty = '') {
  const numeric = Number(difficulty)
  if (Number.isFinite(numeric)) {
    if (numeric <= 2) return 'tag easy'
    if (numeric === 3) return 'tag medium'
    if (numeric >= 4) return 'tag hard'
  }

  switch (String(difficulty || '').toLowerCase()) {
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
  const normalized = String(text || '').trim()
  return normalized ? normalized.split(/\s+/).length : 0
}

function isObjectiveWrong(item, response) {
  if (!item || item.answer?.type !== 'objective' || !isResponseAnswered(item, response)) return false
  return !isObjectiveCorrect(item, response)
}

function getSpoilerTags(item) {
  const hiddenTags = new Set()
  if (item.type) hiddenTags.add(String(item.type).toLowerCase())
  if (item.source_type) hiddenTags.add(String(item.source_type).toLowerCase())
  if (item.direction) hiddenTags.add(String(item.direction).toLowerCase())
  if (item.essay_type) hiddenTags.add(String(item.essay_type).toLowerCase())
  return (item.tags || []).filter((tag) => !hiddenTags.has(String(tag).toLowerCase()))
}

function formatRemainingSeconds(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function buildPreviewText(text, maxLength = 120) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}

function AiExplainPanel({ entry }) {
  const [expanded, setExpanded] = useState(false)

  if (!entry) return null

  if (entry.status === 'pending') {
    return (
      <div className="analysis-box ai-panel">
        <div className="ai-panel-status ai-loading-row">
          <LoaderCircle size={16} className="spin" />
          AI 正在生成解释...
        </div>
      </div>
    )
  }

  if (entry.status === 'failed') {
    return (
      <div className="analysis-box ai-panel">
        <div className="ai-panel-status">AI 解释失败：{entry.error || '请稍后重试'}</div>
      </div>
    )
  }

  if (entry.status !== 'completed') return null

  const preview = buildPreviewText(entry.explanation)
  const hasDetails =
    (Array.isArray(entry.keyPoints) && entry.keyPoints.length > 0) ||
    (Array.isArray(entry.commonMistakes) && entry.commonMistakes.length > 0) ||
    (Array.isArray(entry.answerStrategy) && entry.answerStrategy.length > 0)

  return (
    <div className="analysis-box ai-panel">
      <div className="ai-panel-head">
        <strong>{entry.title || 'AI 解释'}</strong>
        {(entry.explanation || hasDetails) && (
          <button type="button" className="ai-panel-toggle" onClick={() => setExpanded((value) => !value)}>
            {expanded ? '收起' : '展开'}
          </button>
        )}
      </div>

      {preview && <div className="ai-panel-preview">{preview}</div>}
      {expanded && entry.explanation && <div className="ai-panel-body">{entry.explanation}</div>}
      {expanded && Array.isArray(entry.keyPoints) && entry.keyPoints.length > 0 && (
        <div className="ai-panel-row">
          <strong>关键点</strong>
          <span>{entry.keyPoints.join(' / ')}</span>
        </div>
      )}
      {expanded && Array.isArray(entry.commonMistakes) && entry.commonMistakes.length > 0 && (
        <div className="ai-panel-row">
          <strong>易错点</strong>
          <span>{entry.commonMistakes.join(' / ')}</span>
        </div>
      )}
      {expanded && Array.isArray(entry.answerStrategy) && entry.answerStrategy.length > 0 && (
        <div className="ai-panel-row">
          <strong>建议</strong>
          <span>{entry.answerStrategy.join(' / ')}</span>
        </div>
      )}
    </div>
  )
}

function AiQuestionReviewPanel({ review }) {
  const [expanded, setExpanded] = useState(false)

  if (!review) return null

  const preview = buildPreviewText(review.feedback)
  const hasDetails =
    (Array.isArray(review.strengths) && review.strengths.length > 0) ||
    (Array.isArray(review.weaknesses) && review.weaknesses.length > 0) ||
    (Array.isArray(review.suggestions) && review.suggestions.length > 0)

  return (
    <div className="analysis-box ai-panel ai-review-panel">
      <div className="ai-panel-head">
        <strong>AI 批改</strong>
        {(review.feedback || hasDetails) && (
          <button type="button" className="ai-panel-toggle" onClick={() => setExpanded((value) => !value)}>
            {expanded ? '收起' : '展开'}
          </button>
        )}
      </div>

      <div className="ai-review-score">
        <strong>得分：</strong>
        {review.score} / {review.maxScore}
      </div>

      {preview && <div className="ai-panel-preview">{preview}</div>}
      {expanded && review.feedback && <div className="ai-panel-body">{review.feedback}</div>}
      {expanded && Array.isArray(review.strengths) && review.strengths.length > 0 && (
        <div className="ai-panel-row">
          <strong>优点</strong>
          <span>{review.strengths.join(' / ')}</span>
        </div>
      )}
      {expanded && Array.isArray(review.weaknesses) && review.weaknesses.length > 0 && (
        <div className="ai-panel-row">
          <strong>扣分点</strong>
          <span>{review.weaknesses.join(' / ')}</span>
        </div>
      )}
      {expanded && Array.isArray(review.suggestions) && review.suggestions.length > 0 && (
        <div className="ai-panel-row">
          <strong>改进建议</strong>
          <span>{review.suggestions.join(' / ')}</span>
        </div>
      )}
    </div>
  )
}

function AiPracticeModal({ modal, onClose }) {
  if (!modal) return null

  return (
    <div className="ai-modal-backdrop" onClick={onClose}>
      <div className="ai-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="ai-modal-head">
          <strong>{modal.title || 'AI 同类题'}</strong>
          <button type="button" className="ai-panel-toggle" onClick={onClose}>
            关闭
          </button>
        </div>

        {modal.status === 'pending' && (
          <div className="ai-loading-row">
            <LoaderCircle size={18} className="spin" />
            AI 正在生成同类题...
          </div>
        )}

        {modal.status === 'failed' && (
          <div className="ai-panel-status">生成失败：{modal.error || '请稍后重试'}</div>
        )}

        {modal.status === 'completed' && (
          <div className="ai-similar-list">
            {(modal.questions || []).map((question, index) => (
              <article key={`${question.index || index}`} className="ai-similar-card">
                <div className="ai-similar-head">
                  <span className="tag blue">第 {index + 1} 题</span>
                  <span className="tag">{question.difficulty || 'progressive'}</span>
                </div>
                <div className="ai-similar-prompt">{question.prompt}</div>
                {Array.isArray(question.options) && question.options.length > 0 && (
                  <div className="ai-similar-options">
                    {question.options.map((option, optionIndex) => (
                      <div key={`${index}-${optionIndex}`}>{option}</div>
                    ))}
                  </div>
                )}
                <div className="ai-panel-row">
                  <strong>答案</strong>
                  <span>{question.answer || '--'}</span>
                </div>
                <div className="ai-panel-row">
                  <strong>解析</strong>
                  <span>{question.explanation || '--'}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ReadingBlock({
  item,
  response,
  submitted,
  disabled,
  mode,
  revealedMap,
  focusSubQuestionId,
  onFocusSubQuestion,
  onSelectReadingOption,
  aiExplainMap,
  onExplainQuestion,
}) {
  const readingResponse = response || {}
  const questionRefs = useRef({})

  useEffect(() => {
    if (!focusSubQuestionId) return
    const target = questionRefs.current[focusSubQuestionId]
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusSubQuestionId])

  return (
    <div className="reading-layout">
      <section className="reading-passage-card">
        <div className="reading-passage-head">
          <div className="reading-passage-title">
            <FileText size={16} />
            <span>{item.passage?.title || item.title || '阅读材料'}</span>
          </div>
        </div>
        <div className="reading-passage-body">{item.passage?.content}</div>
      </section>

      <section className="reading-questions-card">
        <div className="reading-question-list">
          {(item.questions || []).map((subQuestion, subIndex) => {
            const userAnswer = readingResponse[subQuestion.id]
            const revealKey = `${item.id}:${subQuestion.id}`
            const showFeedback = submitted || (mode === 'practice' && revealedMap[revealKey])
            const explainEntry = aiExplainMap?.[revealKey]
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
                  {(subQuestion.options || []).map((option, optionIndex) => {
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
                        disabled={submitted || disabled || (mode === 'practice' && showFeedback)}
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

                <button
                  type="button"
                  className="secondary-btn small-btn ai-inline-btn"
                  onClick={() => onExplainQuestion?.({ item, subQuestion })}
                  disabled={disabled || explainEntry?.status === 'pending'}
                >
                  {explainEntry?.status === 'pending' ? <LoaderCircle size={14} className="spin" /> : <Bot size={14} />}
                  {explainEntry?.status === 'pending' ? 'AI 解释中' : 'AI 解释'}
                </button>
                <AiExplainPanel entry={explainEntry} />
              </div>
            )
          })}
        </div>
      </section>
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
      {(item.options || []).map((opt, optIndex) => {
        const option = typeof opt === 'string' ? { key: opt.charAt(0), text: opt } : opt
        const selected = item.type === 'multiple_choice'
          ? selectedValues.includes(option.key)
          : userResponse === option.key
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

function FillBlankBlock({
  item,
  userResponse,
  objectiveReveal,
  submitted,
  disabled,
  mode,
  onFillBlankChange,
}) {
  const response = userResponse || {}

  return (
    <div className="subjective-block">
      <div className="answer-review-grid">
        {(item.blanks || []).map((blank, index) => {
          const value = response[blank.blank_id] || ''
          const evaluation = evaluateFillBlankBlank(blank, value)

          return (
            <article
              key={blank.blank_id}
              className={`answer-review-card ${objectiveReveal ? (evaluation.correct ? 'correct' : 'wrong') : ''}`}
            >
              <div className="answer-review-prompt">{blank.label || `第 ${index + 1} 空`}</div>
              {blank.separator_hint && <div className="answer-review-line subtle">{blank.separator_hint}</div>}
              <input
                className="subjective-textarea"
                value={value}
                onChange={(event) => onFillBlankChange(item.id, blank.blank_id, event.target.value)}
                disabled={submitted || disabled || (mode === 'practice' && objectiveReveal)}
                placeholder="请输入答案"
              />
              {objectiveReveal && (
                <>
                  <div className="answer-review-line">
                    <strong>参考答案：</strong>
                    {evaluation.correctDisplay}
                  </div>
                  <div className="answer-review-line">
                    <strong>解析：</strong>
                    {blank.rationale || item.answer?.rationale || '暂无解析'}
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
      />
      {submitted && item.answer?.reference_answer && (
        <div className="analysis-box">
          <div>{item.answer.reference_answer}</div>
        </div>
      )}
    </div>
  )
}

function GenericSubjectiveBlock({ item, userResponse, disabled, submitted, onTextChange }) {
  const text = getSubjectiveText(userResponse)

  return (
    <div className="subjective-block essay-card">
      <textarea
        className="subjective-textarea"
        value={text}
        onChange={(event) => onTextChange(item.id, event.target.value)}
        disabled={disabled}
        rows={8}
        placeholder={item.editor_placeholder || '请输入答案'}
      />
      {submitted && item.answer?.reference_answer && (
        <div className="analysis-box">
          <div>{item.answer.reference_answer}</div>
        </div>
      )}
    </div>
  )
}

function SqlBlock({ item, userResponse, disabled, submitted, onTextChange }) {
  const text = getSubjectiveText(userResponse)

  return (
    <div className="subjective-block sql-card">
      <textarea
        className="subjective-textarea sql-textarea"
        value={text}
        onChange={(event) => onTextChange(item.id, event.target.value)}
        disabled={disabled}
        rows={10}
        placeholder={item.editor_placeholder || '请输入 SQL 语句'}
      />
      {submitted && item.answer?.reference_answer && (
        <div className="analysis-box sql-reference-block">
          <pre>{item.answer.reference_answer}</pre>
        </div>
      )}
    </div>
  )
}

function StructuredFormBlock({ item, userResponse, disabled, submitted, onStructuredFieldChange }) {
  const response = userResponse || {}

  return (
    <div className="subjective-block structured-form-card">
      <div className="structured-form-grid">
        {(item.fields || []).map((field) => {
          const value = response[field.key] || ''
          const isLongText = field.fieldType === 'textarea' || field.fieldType === 'array_text'

          return (
            <article key={field.key} className="answer-review-card subjective">
              <div className="answer-review-prompt">{field.label}</div>
              {isLongText ? (
                <textarea
                  className="subjective-textarea"
                  value={value}
                  onChange={(event) => onStructuredFieldChange(item.id, field.key, event.target.value)}
                  disabled={disabled}
                  rows={field.fieldType === 'array_text' ? 6 : 4}
                />
              ) : (
                <input
                  className="subjective-textarea"
                  value={value}
                  onChange={(event) => onStructuredFieldChange(item.id, field.key, event.target.value)}
                  disabled={disabled}
                />
              )}
            </article>
          )
        })}
      </div>

      {submitted && item.answer?.reference_fields && (
        <div className="analysis-box">
          <pre>{formatStructuredResponse(item.answer.reference_fields, item.fields || [])}</pre>
        </div>
      )}
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
  practiceWritesWrongBook = true,
  remainingSeconds = 0,
  isPaused = false,
  spoilerExpanded = false,
  revealedMap = {},
  isFavorite = false,
  onToggleFavorite,
  onToggleSpoiler,
  onToggleAutoAdvance,
  onTogglePracticeWrongBook,
  onTogglePause,
  onJump,
  onPrev,
  onNext,
  onSelectOption,
  onSelectReadingOption,
  onFillBlankChange,
  onTextChange,
  onStructuredFieldChange,
  aiReview,
  aiQuestionReviewMap = {},
  aiExplainMap = {},
  aiExplainMode = 'standard',
  aiPracticeModal = null,
  onChangeAiExplainMode,
  onExplainQuestion,
  onExplainWhyWrong,
  onGenerateSimilarQuestions,
  onCloseAiPracticeModal,
  onSubmit,
}) {
  const items = quiz?.items || []
  const total = items.length
  const currentItem = items[currentIndex]
  const [openGroups, setOpenGroups] = useState({})
  const [focusedReadingQuestion, setFocusedReadingQuestion] = useState(null)

  const groupedNavSections = useMemo(() => {
    const order = ['single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'reading', 'translation', 'sql', 'structured_form', 'subjective', 'essay']
    const map = new Map()

    items.forEach((item, index) => {
      const meta = getQuestionGroupMeta(item)
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
  }, [items])

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
    const currentGroupKey = getQuestionGroupMeta(currentItem).key
    setOpenGroups((prev) => (
      prev[currentGroupKey] === false
        ? { ...prev, [currentGroupKey]: true }
        : prev
    ))

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
  }, [currentItem])

  if (!currentItem) return null

  const userResponse = answers[currentItem.id]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === total - 1
  const isSubjective = currentItem.answer?.type === 'subjective'
  const isReading = currentItem.type === 'reading'
  const isEssay = currentItem.type === 'essay'
  const isTranslation = currentItem.type === 'translation'
  const isFillBlank = currentItem.type === 'fill_blank'
  const isSql = currentItem.type === 'sql'
  const isStructuredForm = currentItem.type === 'structured_form'
  const currentGroupMeta = getQuestionGroupMeta(currentItem)
  const spoilerTags = getSpoilerTags(currentItem)
  const disabled = isPaused && mode === 'exam'
  const objectiveReveal = submitted || (mode === 'practice' && revealedMap[currentItem.id])
  const currentExplainEntry = aiExplainMap[currentItem.id]
  const currentQuestionReview = aiQuestionReviewMap[currentItem.id]
  const currentQuestionWrong = !isReading && !isSubjective && isObjectiveWrong(currentItem, userResponse)

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

        {mode === 'practice' && (
          <div className="sidebar-tools compact-sidebar-tools">
            <div className="sidebar-tool-card compact-toggle-card">
              <div className="sidebar-tool-copy">
                <span className="sidebar-tool-title">写入错题本</span>
                <span className="sidebar-tool-desc">关闭后，本次练习不会写入错题本。</span>
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
                        return (item.questions || []).map((question, subIndex) => {
                          const answered = typeof readingResponse[question.id] === 'string' && readingResponse[question.id].length > 0
                          const wrong = submitted && answered && readingResponse[question.id] !== question.answer?.correct
                          const active = index === currentIndex
                            && focusedReadingQuestion?.itemId === item.id
                            && focusedReadingQuestion?.subQuestionId === question.id

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

                      const answered = isResponseAnswered(item, answers[item.id])
                      const wrong = submitted && isObjectiveWrong(item, answers[item.id])

                      return (
                        <button
                          key={item.id}
                          className={`nav-item ${index === currentIndex ? 'active' : ''} ${answered ? 'answered' : ''} ${wrong ? 'wrong' : ''}`}
                          onClick={() => {
                            if (disabled) return
                            onJump(index)
                          }}
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
              <span className="tag purple">{currentGroupMeta.label}</span>
              {isTranslation && (
                <span className="tag purple">
                  {currentItem.direction === 'zh_to_en' ? '汉译英' : '英译汉'}
                </span>
              )}
              {spoilerTags.length > 0 && (
                <button type="button" className="spoiler-icon-toggle" onClick={onToggleSpoiler}>
                  {spoilerExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
              {spoilerExpanded && spoilerTags.map((tag) => (
                <span key={tag} className="tag spoiler-tag">{tag}</span>
              ))}
            </div>

            <div className="question-top-actions">
              {onToggleFavorite && (
                <button
                  type="button"
                  className={`favorite-toggle ${isFavorite ? 'active' : ''}`}
                  onClick={onToggleFavorite}
                >
                  <Star size={15} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              )}
              {currentItem.difficulty && (
                <span className={difficultyClass(currentItem.difficulty)}>{currentItem.difficulty}</span>
              )}
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
          <RichContentBlocks blocks={currentItem.content_blocks || []} />

          {!isReading && (
            <div className="ai-toolbar">
              <div className="ai-mode-switch">
                {[
                  { key: 'brief', label: '简要' },
                  { key: 'standard', label: '标准' },
                  { key: 'deep', label: '深入' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`ai-mode-chip ${aiExplainMode === item.key ? 'active' : ''}`}
                    onClick={() => onChangeAiExplainMode?.(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="ai-action-row">
                <button
                  type="button"
                  className="secondary-btn small-btn ai-inline-btn"
                  onClick={() => onExplainQuestion?.({ item: currentItem })}
                  disabled={disabled || currentExplainEntry?.status === 'pending'}
                >
                  {currentExplainEntry?.status === 'pending' ? <LoaderCircle size={14} className="spin" /> : <Bot size={14} />}
                  {currentExplainEntry?.status === 'pending' ? 'AI 解释中' : 'AI 解释'}
                </button>

                <button
                  type="button"
                  className="secondary-btn small-btn ai-inline-btn"
                  onClick={() => onExplainWhyWrong?.({ item: currentItem })}
                  disabled={disabled || !currentQuestionWrong || currentExplainEntry?.status === 'pending'}
                >
                  为什么我错了
                </button>

                <button
                  type="button"
                  className="secondary-btn small-btn ai-inline-btn"
                  onClick={() => onGenerateSimilarQuestions?.({ item: currentItem })}
                  disabled={disabled}
                >
                  给我同类题
                </button>
              </div>
            </div>
          )}

          {isReading ? (
            <ReadingBlock
              item={currentItem}
              response={userResponse}
              submitted={submitted}
              disabled={disabled}
              mode={mode}
              revealedMap={revealedMap}
              focusSubQuestionId={
                focusedReadingQuestion?.itemId === currentItem.id
                  ? focusedReadingQuestion?.subQuestionId
                  : null
              }
              onFocusSubQuestion={(subQuestionId) => setFocusedReadingQuestion({ itemId: currentItem.id, subQuestionId })}
              onSelectReadingOption={onSelectReadingOption}
              aiExplainMap={aiExplainMap}
              onExplainQuestion={onExplainQuestion}
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
          ) : isEssay ? (
            <EssayBlock
              item={currentItem}
              userResponse={userResponse}
              disabled={disabled || submitted}
              submitted={submitted}
              onTextChange={onTextChange}
            />
          ) : isSql ? (
            <SqlBlock
              item={currentItem}
              userResponse={userResponse}
              disabled={disabled || submitted}
              submitted={submitted}
              onTextChange={onTextChange}
            />
          ) : isStructuredForm ? (
            <StructuredFormBlock
              item={currentItem}
              userResponse={userResponse}
              disabled={disabled || submitted}
              submitted={submitted}
              onStructuredFieldChange={onStructuredFieldChange}
            />
          ) : (
            <GenericSubjectiveBlock
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
                正确答案：<strong>{getObjectiveCorrectLabel(currentItem)}</strong>
              </div>
              <div>解析：{currentItem.answer?.rationale || '暂无解析'}</div>
            </div>
          )}

          {isSubjective && submitted && <AiQuestionReviewPanel review={currentQuestionReview} />}
          {isSubjective && submitted && aiReview?.status === 'pending' && (
            <div className="analysis-box ai-panel">
              <div className="ai-panel-status ai-loading-row">
                <LoaderCircle size={16} className="spin" />
                AI 正在批改当前主观题...
              </div>
            </div>
          )}
          {!isReading && <AiExplainPanel entry={currentExplainEntry} />}

          <div className="question-actions">
            <button className="secondary-btn" onClick={onPrev} disabled={isFirst || disabled}>
              <ChevronLeft size={16} />
              上一题
            </button>

            {!submitted ? (
              isLast ? (
                <button className="submit-btn small-submit-btn" onClick={() => onSubmit()} disabled={disabled}>
                  {mode === 'practice' ? '结束练习' : '交卷并查看结果'}
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
              {mode === 'practice' ? '结束练习' : '交卷并查看结果'}
            </button>
          </div>
        )}
      </div>

      <AiPracticeModal modal={aiPracticeModal} onClose={onCloseAiPracticeModal} />
    </section>
  )
}
