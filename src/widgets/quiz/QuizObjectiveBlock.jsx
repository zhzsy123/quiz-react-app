import React from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import {
  formatObjectiveCorrectAnswerLabel,
  isObjectiveAnswered,
  isObjectiveGradable,
  normalizeChoiceArray,
  renderOptionLabel,
} from '../../entities/quiz/lib/objectiveAnswers'

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
  const isGradable = isObjectiveGradable(item)

  if (!options.length) {
    return <InvalidObjectiveFallback message="当前客观题缺少可作答的选项，无法继续作答。" />
  }

  return (
    <div className="options">
      {options.map((opt, optIndex) => {
        const option = typeof opt === 'string' ? { key: opt.charAt(0), text: opt } : opt
        const selected =
          item.type === 'multiple_choice' ? selectedValues.includes(option.key) : userResponse === option.key
        const isCorrect =
          item.type === 'multiple_choice'
            ? normalizeChoiceArray(item.answer?.correct).includes(option.key)
            : option.key === item.answer?.correct

        let className = 'option'
        let icon = null

        if (!objectiveReveal || !isGradable) {
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
  const blanks = Array.isArray(item.blanks) ? item.blanks : []

  if (!blanks.length) {
    return <InvalidObjectiveFallback message="当前填空题缺少可作答的空位配置，无法继续作答。" />
  }

  return (
    <div className="fill-blank-block">
      <div className="fill-blank-grid">
        {blanks.map((blank, index) => {
          const value = response[blank.blank_id] || ''
          const acceptedAnswers = Array.isArray(blank.accepted_answers) ? blank.accepted_answers : []
          const normalized = String(value).trim().toLowerCase()
          const isCorrect = acceptedAnswers.some((candidate) => String(candidate).trim().toLowerCase() === normalized)
          const showFeedback = objectiveReveal

          return (
            <article
              key={blank.blank_id}
              className={`fill-blank-card ${showFeedback ? (isCorrect ? 'correct' : 'wrong') : ''}`}
            >
              <div className="fill-blank-card-head">
                <div className="fill-blank-card-label">第 {index + 1} 空</div>
                <div className={`fill-blank-card-state ${value ? 'filled' : ''}`}>{value ? '已填写' : '待填写'}</div>
              </div>
              <textarea
                className="fill-blank-input"
                value={value}
                onChange={(event) => onFillBlankChange(item.id, blank.blank_id, event.target.value)}
                disabled={submitted || disabled || (mode === 'practice' && objectiveReveal)}
                placeholder="请输入本空答案"
                rows={2}
                spellCheck={false}
              />
              {showFeedback && (
                <div className="fill-blank-feedback">
                  <div className="answer-review-line">
                    <strong>参考答案</strong>
                    {acceptedAnswers.join(' / ') || '暂无'}
                  </div>
                  <div className="answer-review-line">
                    <strong>解析</strong>
                    {blank.rationale || '暂无解析'}
                  </div>
                </div>
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
  const canRevealObjective =
    mode === 'practice' &&
    !submitted &&
    !objectiveReveal &&
    isObjectiveAnswered(item, userResponse) &&
    ['multiple_choice', 'fill_blank'].includes(item.type)

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

      {canRevealObjective && (
        <div className="question-inline-actions">
          <button type="button" className="secondary-btn small-btn" onClick={onRevealCurrentObjective}>
            检查答案
          </button>
        </div>
      )}

      {objectiveReveal && item.type !== 'fill_blank' && (
        <div className="analysis-box">
          {isObjectiveGradable(item) ? (
            <>
              <div>
                正确答案：<strong>{formatObjectiveCorrectAnswerLabel(item)}</strong>
              </div>
              <div>解析：{item.answer?.rationale || '暂无解析'}</div>
            </>
          ) : (
            <div>当前题缺少标准答案，已保留题目内容，但暂时无法自动判分。</div>
          )}
        </div>
      )}
    </>
  )
}
