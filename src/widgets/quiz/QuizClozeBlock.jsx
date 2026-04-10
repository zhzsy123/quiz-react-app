import React from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

function renderClozeArticle(article = '') {
  if (!article) {
    return (
      <div className="analysis-box compact-analysis-box">
        当前完形填空缺少正文，无法定位空位，建议重新生成或重新导入。
      </div>
    )
  }

  const segments = []
  const pattern = /\[\[(.+?)\]\]/g
  let cursor = 0
  let match = pattern.exec(article)
  let matchedPlaceholder = false

  while (match) {
    matchedPlaceholder = true
    if (match.index > cursor) {
      segments.push(article.slice(cursor, match.index))
    }

    const blankId = match[1]
    segments.push(
      <span key={`blank_${blankId}`} className="cloze-inline-blank">
        ({blankId}) ______
      </span>
    )

    cursor = match.index + match[0].length
    match = pattern.exec(article)
  }

  if (cursor < article.length) {
    segments.push(article.slice(cursor))
  }

  if (!matchedPlaceholder) {
    return (
      <>
        <span>{article}</span>
        <div className="analysis-box compact-analysis-box">
          该完形缺少文内空位，无法准确定位每一空，建议重新生成或重新导入。
        </div>
      </>
    )
  }

  return segments
}

export default function QuizClozeBlock({
  item,
  response,
  submitted,
  isPaused,
  mode,
  revealedMap,
  focusBlankId,
  onFocusBlank,
  onSelectClozeOption,
  onRevealCurrentObjective,
}) {
  const clozeResponse = response || {}
  const blanks = Array.isArray(item.blanks) ? item.blanks : []
  const showFeedback = submitted || (mode === 'practice' && revealedMap[item.id])
  const canReveal =
    mode === 'practice' &&
    !submitted &&
    !showFeedback &&
    blanks.length > 0 &&
    blanks.every((blank) => {
      const value = clozeResponse[blank.blank_id]
      return typeof value === 'string' && value.trim().length > 0
    })

  return (
    <div className="subjective-block cloze-block">
      <section className="analysis-box cloze-passage-box">
        <div className="question-context-title">{item.title || item.prompt || '完形填空'}</div>
        <div className="question-context-body">{renderClozeArticle(item.article)}</div>
      </section>

      <div className="answer-review-grid cloze-grid">
        {blanks.map((blank, index) => {
          const selectedValue = clozeResponse[blank.blank_id] || ''
          const isFocused = String(focusBlankId || '') === String(blank.blank_id)

          return (
            <article key={blank.blank_id} className={`answer-review-card ${isFocused ? 'focused' : ''}`}>
              <div className="answer-review-prompt">
                第 {index + 1} 空
                <span className="essay-word-count">{blank.score || 0} 分</span>
              </div>

              {blank.prompt ? <div className="cloze-blank-context">{blank.prompt}</div> : null}

              <div className="options compact-options">
                {(blank.options || []).map((option, optionIndex) => {
                  const selected = selectedValue === option.key
                  const isCorrect = option.key === blank.correct

                  let className = 'option compact-option'
                  let icon = null

                  if (!showFeedback) {
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
                      key={optionIndex}
                      type="button"
                      className={className}
                      disabled={submitted || isPaused || (mode === 'practice' && showFeedback)}
                      onClick={() => {
                        onFocusBlank?.(blank.blank_id)
                        onSelectClozeOption(item.id, blank.blank_id, option.key)
                      }}
                    >
                      <span>
                        {option.key}. {option.text}
                      </span>
                      {icon}
                    </button>
                  )
                })}
              </div>

              {showFeedback && (
                <div className="analysis-box compact-analysis-box">
                  <div>
                    正确答案：<strong>{blank.correct}</strong>
                  </div>
                  <div>解析：{blank.rationale || '暂无解析'}</div>
                </div>
              )}
            </article>
          )
        })}
      </div>

      {canReveal && (
        <div className="question-inline-actions">
          <button type="button" className="secondary-btn small-btn" onClick={onRevealCurrentObjective}>
            检查整篇完形
          </button>
        </div>
      )}
    </div>
  )
}
