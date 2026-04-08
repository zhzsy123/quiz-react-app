import React, { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { buildPreviewText } from './quizViewUtils.jsx'

export function AiExplainPanel({ entry }) {
  const [expanded, setExpanded] = useState(false)

  if (!entry) return null

  if (entry.status === 'pending') {
    return (
      <div className="analysis-box ai-panel">
        <div className="ai-panel-status ai-loading-row">
          <LoaderCircle size={16} className="spin" />
          AI 解析中...
        </div>
      </div>
    )
  }

  if (entry.status === 'failed') {
    return (
      <div className="analysis-box ai-panel">
        <div className="ai-panel-status">AI 解析失败：{entry.error || '请稍后再试'}</div>
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
        <strong>{entry.title || 'AI 解析'}</strong>
        {(entry.explanation || hasDetails) && (
          <button type="button" className="ai-panel-toggle" onClick={() => setExpanded((value) => !value)}>
            {expanded ? '收起' : '展开'}
          </button>
        )}
      </div>

      {(entry.auditVerdict || typeof entry.confidenceScore === 'number') && (
        <div className="ai-panel-row">
          <strong>审核结论</strong>
          <span>
            {entry.auditVerdict || '--'}
            {typeof entry.confidenceScore === 'number' ? ` / 置信度 ${entry.confidenceScore}` : ''}
          </span>
        </div>
      )}

      {preview && <div className="ai-panel-preview">{preview}</div>}
      {expanded && entry.explanation && <div className="ai-panel-body">{entry.explanation}</div>}
      {expanded && Array.isArray(entry.keyPoints) && entry.keyPoints.length > 0 && (
        <div className="ai-panel-row"><strong>要点</strong><span>{entry.keyPoints.join(' / ')}</span></div>
      )}
      {expanded && Array.isArray(entry.commonMistakes) && entry.commonMistakes.length > 0 && (
        <div className="ai-panel-row"><strong>常见问题</strong><span>{entry.commonMistakes.join(' / ')}</span></div>
      )}
      {expanded && Array.isArray(entry.answerStrategy) && entry.answerStrategy.length > 0 && (
        <div className="ai-panel-row"><strong>作答策略</strong><span>{entry.answerStrategy.join(' / ')}</span></div>
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
        {review.score} / {review.maxScore}
      </div>

      {preview && <div className="ai-panel-preview">{preview}</div>}
      {expanded && review.feedback && <div className="ai-panel-body">{review.feedback}</div>}
      {expanded && Array.isArray(review.strengths) && review.strengths.length > 0 && (
        <div className="ai-panel-row"><strong>优点</strong><span>{review.strengths.join(' / ')}</span></div>
      )}
      {expanded && Array.isArray(review.weaknesses) && review.weaknesses.length > 0 && (
        <div className="ai-panel-row"><strong>不足</strong><span>{review.weaknesses.join(' / ')}</span></div>
      )}
      {expanded && Array.isArray(review.suggestions) && review.suggestions.length > 0 && (
        <div className="ai-panel-row"><strong>建议</strong><span>{review.suggestions.join(' / ')}</span></div>
      )}
    </div>
  )
}
