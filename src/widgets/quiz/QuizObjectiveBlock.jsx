import React from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { normalizeChoiceArray, renderOptionLabel } from '../../entities/quiz/lib/objectiveAnswers'

function InvalidObjectiveFallback({ message }) {
  return (
    <div className="analysis-box">
      <div>{message}</div>
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
  const options = Array.isArray(item.options) ? item.options : []
  const selectedValues = item.type === 'multiple_choice' ? normalizeChoiceArray(userResponse) : []

  if (!options.length) {
    return <InvalidObjectiveFallback message="当前客观题缺少可作答的选项，无法继续作答。" />
  }

  return (
    <div className="options">
      {options.map((opt, optIndex) => {
        const option = typeof opt === 'string' ? { key: opt.charAt(0), text: opt } : opt
        const selected = item.type === 'multiple_choice' ? selectedValues.includes(option.key) : userResponse === option.key
        const isCorrect =
          item.type === 'multiple_choice'
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
            type="button"
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
  const blanks = Array.isArray(item.blanks) ? item.blanks : []

  if (!blanks.length) {
    return <InvalidObjectiveFallback message="当前填空题缺少可作答的空位配置，无法继续作答。" />
  }

  return (
    <div className="subjective-block">
      <div className="answer-review-grid">
        {blanks.map((blank, index) => {
          const value = response[blank.blank_id] || ''
          const acceptedAnswers = Array.isArray(blank.accepted_answers) ? blank.accepted_answers : []
          const normalized = String(value).trim().toLowerCase()
          const isCorrect = acceptedAnswers.some((candidate) => String(candidate).trim().toLowerCase() === normalized)
          const showFeedback = objectiveReveal

          return (
            <article
              key={blank.blank_id}
              className={`answer-review-card ${showFeedback ? (isCorrect ? 'correct' : 'wrong') : ''}`}
            >
              <div className="answer-review-prompt">空 {index + 1}</div>
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
                    <strong>参考答案</strong>
                    {acceptedAnswers.join(' / ')}
                  </div>
                  <div className="answer-review-line">
                    <strong>解析</strong>
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

export default function QuizObjectiveBlock({
  item,
  userResponse,
  objectiveReveal,
  submitted,
  disabled,
  mode,
  onSelectOption,
  onRevealCurrentObjective,
  onFillBlankChange,
}) {
  const canRevealMultiChoice =
    mode === 'practice' &&
    item.type === 'multiple_choice' &&
    !submitted &&
    !objectiveReveal &&
    normalizeChoiceArray(userResponse).length > 0

  return (
    <>
      {item.type === 'fill_blank' ? (
        <FillBlankBlock
          item={item}
          userResponse={userResponse}
          objectiveReveal={objectiveReveal}
          submitted={submitted}
          disabled={disabled}
          mode={mode}
          onFillBlankChange={onFillBlankChange}
        />
      ) : (
        <ObjectiveOptionsBlock
          item={item}
          userResponse={userResponse}
          objectiveReveal={objectiveReveal}
          submitted={submitted}
          disabled={disabled}
          mode={mode}
          onSelectOption={onSelectOption}
        />
      )}

      {canRevealMultiChoice && (
        <div className="question-inline-actions">
          <button type="button" className="secondary-btn small-btn" onClick={onRevealCurrentObjective}>
            检查答案
          </button>
        </div>
      )}

      {objectiveReveal && item.type !== 'fill_blank' && (
        <div className="analysis-box">
          <div>
            正确答案：
            <strong>{Array.isArray(item.answer?.correct) ? item.answer.correct.join(' / ') : item.answer?.correct}</strong>
          </div>
          <div>解析：{item.answer?.rationale || '暂无解析'}</div>
        </div>
      )}
    </>
  )
}
