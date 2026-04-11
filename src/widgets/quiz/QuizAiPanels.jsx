import React, { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { buildPreviewText, formatDisplayScore } from './quizViewUtils.jsx'

function PanelSection({ title, items }) {
  if (!Array.isArray(items) || items.length === 0) return null

  return (
    <section className="ai-panel-section">
      <div className="ai-panel-section-title">{title}</div>
      <ul className="ai-panel-list">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

function ExplainOptionList({ optionReviews = [] }) {
  if (!Array.isArray(optionReviews) || optionReviews.length === 0) return null

  return (
    <section className="ai-panel-section">
      <div className="ai-panel-section-title">选项解析</div>
      <div className="ai-option-review-list">
        {optionReviews.map((review, index) => (
          <article key={`${review?.key || 'option'}-${index}`} className="ai-option-review-card">
            <div className="ai-option-review-head">
              <strong>{review?.key ? `${review.key}. ${review.text || ''}` : review?.text || `选项 ${index + 1}`}</strong>
              <span className={`ai-option-review-badge ${review?.verdict === 'correct' ? 'correct' : 'muted'}`}>
                {review?.verdict === 'correct' ? '正确选项' : '干扰项'}
              </span>
            </div>
            <div className="ai-option-review-body">{review?.reason || '暂无说明'}</div>
          </article>
        ))}
      </div>
    </section>
  )
}

function AuditVerdictBadge({ verdict = '' }) {
  if (!verdict) return null

  const tone =
    verdict === '规范合理'
      ? 'success'
      : verdict === '基本合理'
        ? 'info'
        : verdict === '存在问题'
          ? 'warning'
          : 'danger'

  return <span className={`ai-panel-verdict ${tone}`}>{verdict}</span>
}

export function AiExplainPanel({ entry }) {
  const [expanded, setExpanded] = useState(false)

  if (!entry) return null

  if (entry.status === 'pending') {
    return (
      <div className="analysis-box ai-panel">
        <div className="ai-panel-status ai-loading-row">
          <LoaderCircle size={16} className="spin" />
          {entry.kind === 'audit' ? 'AI 正在核题…' : 'AI 正在解释…'}
        </div>
      </div>
    )
  }

  if (entry.status === 'failed') {
    return (
      <div className="analysis-box ai-panel">
        <div className="ai-panel-status">{entry.error || 'AI 结果生成失败，请稍后重试。'}</div>
      </div>
    )
  }

  if (entry.status !== 'completed') return null

  const isAudit = entry.kind === 'audit'
  const preview = buildPreviewText(entry.explanation)
  const hasDetails =
    Boolean(entry.correctReason) ||
    Boolean(entry.userMistake) ||
    (Array.isArray(entry.optionReviews) && entry.optionReviews.length > 0) ||
    (Array.isArray(entry.keyPoints) && entry.keyPoints.length > 0) ||
    (Array.isArray(entry.commonMistakes) && entry.commonMistakes.length > 0) ||
    (Array.isArray(entry.answerStrategy) && entry.answerStrategy.length > 0)

  return (
    <div className={`analysis-box ai-panel ${isAudit ? 'audit' : 'explain'}`}>
      <div className="ai-panel-head">
        <div className="ai-panel-title-group">
          <strong>{entry.title || (isAudit ? 'AI 核题' : 'AI 解释')}</strong>
          {isAudit ? <AuditVerdictBadge verdict={entry.auditVerdict} /> : null}
        </div>
        {(preview || hasDetails) && (
          <button type="button" className="ai-panel-toggle" onClick={() => setExpanded((value) => !value)}>
            {expanded ? '收起' : '展开'}
          </button>
        )}
      </div>

      {preview ? <div className="ai-panel-preview">{preview}</div> : null}

      {expanded && (
        <div className="ai-panel-body">
          {entry.explanation ? <div className="ai-panel-paragraph">{entry.explanation}</div> : null}

          {!isAudit && entry.correctReason ? (
            <section className="ai-panel-section">
              <div className="ai-panel-section-title">正确选项为什么对</div>
              <div className="ai-panel-paragraph">{entry.correctReason}</div>
            </section>
          ) : null}

          {!isAudit && entry.userMistake ? (
            <section className="ai-panel-section">
              <div className="ai-panel-section-title">你的失分点</div>
              <div className="ai-panel-paragraph">{entry.userMistake}</div>
            </section>
          ) : null}

          {!isAudit ? <ExplainOptionList optionReviews={entry.optionReviews} /> : null}

          <PanelSection title={isAudit ? '规范检查' : '核心要点'} items={entry.keyPoints} />
          <PanelSection title={isAudit ? '问题定位' : '常见误区'} items={entry.commonMistakes} />
          <PanelSection title={isAudit ? '修订建议' : '作答建议'} items={entry.answerStrategy} />
        </div>
      )}
    </div>
  )
}

export function AiQuestionReviewPanel({ review }) {
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
        <strong>AI 评审</strong>
        {(review.feedback || hasDetails) && (
          <button type="button" className="ai-panel-toggle" onClick={() => setExpanded((value) => !value)}>
            {expanded ? '收起' : '展开'}
          </button>
        )}
      </div>

      <div className="ai-review-score">
        <strong>AI 评分</strong>
        {formatDisplayScore(review.score)} / {formatDisplayScore(review.maxScore)}
      </div>

      {preview ? <div className="ai-panel-preview">{preview}</div> : null}

      {expanded && (
        <div className="ai-panel-body">
          {review.feedback ? <div className="ai-panel-paragraph">{review.feedback}</div> : null}
          <PanelSection title="优点" items={review.strengths} />
          <PanelSection title="不足" items={review.weaknesses} />
          <PanelSection title="建议" items={review.suggestions} />
        </div>
      )}
    </div>
  )
}
