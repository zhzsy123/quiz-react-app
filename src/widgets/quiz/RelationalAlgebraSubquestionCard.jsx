import React from 'react'
import { CheckCircle2, ChevronDown, ChevronRight, LoaderCircle, TriangleAlert, XCircle } from 'lucide-react'
import { buildPreviewText } from './quizViewUtils.jsx'
import RelationalAlgebraToolbar from './RelationalAlgebraToolbar.jsx'

function getVerdictMeta(review) {
  if (!review) return null
  if (review.status === 'pending') {
    return {
      className: 'pending',
      label: 'AI 判题中',
      icon: <LoaderCircle size={14} className="spin" />,
    }
  }
  if (review.status === 'failed') {
    return {
      className: 'failed',
      label: '判题失败',
      icon: <TriangleAlert size={14} />,
    }
  }
  if (review.verdict === 'correct') {
    return {
      className: 'correct',
      label: '判定正确',
      icon: <CheckCircle2 size={14} />,
    }
  }
  if (review.verdict === 'partial') {
    return {
      className: 'partial',
      label: '部分正确',
      icon: <TriangleAlert size={14} />,
    }
  }
  return {
    className: 'incorrect',
    label: '判定错误',
    icon: <XCircle size={14} />,
  }
}

export default function RelationalAlgebraSubquestionCard({
  itemId,
  subquestion,
  index,
  expanded,
  disabled,
  value,
  review,
  onToggle,
  onFocus,
  onChange,
  onInsert,
  onRegisterTextarea,
  onGrade,
}) {
  const preview = buildPreviewText(value || '')
  const answerLabel = value?.trim() ? '已作答' : '未作答'
  const scoreLabel = Number(subquestion?.score) || 0
  const referenceAnswer = subquestion?.reference_answer || subquestion?.answer?.reference_answer || ''
  const verdictMeta = getVerdictMeta(review)
  const missingList = Array.isArray(review?.missing_points)
    ? review.missing_points
    : Array.isArray(review?.weaknesses)
      ? review.weaknesses
      : []
  const errorList = Array.isArray(review?.error_points)
    ? review.error_points
    : Array.isArray(review?.suggestions)
      ? review.suggestions
      : []

  return (
    <article className={`rel-algebra-subquestion-card ${expanded ? 'expanded' : ''}`}>
      <button type="button" className="rel-algebra-subquestion-head" onClick={() => onToggle?.(subquestion.id)}>
        <div className="rel-algebra-subquestion-title-wrap">
          <span className="rel-algebra-subquestion-index">{subquestion?.label || `(${index + 1})`}</span>
          <span className="rel-algebra-subquestion-title">{subquestion?.prompt || '关系代数子题'}</span>
        </div>

        <div className="rel-algebra-subquestion-meta">
          <span className={`rel-algebra-answer-state ${value?.trim() ? 'filled' : 'empty'}`}>{answerLabel}</span>
          <span className="rel-algebra-score">{scoreLabel} 分</span>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>

      {preview && !expanded && <div className="rel-algebra-subquestion-preview">{preview}</div>}

      {expanded && (
        <div className="rel-algebra-subquestion-body">
          <div className="rel-algebra-editor-shell">
            <div className="rel-algebra-editor-head">
              <div className="rel-algebra-editor-title">关系代数表达式</div>
              <div className="rel-algebra-editor-caption">左侧关系模式和下方符号栏都支持点击插入。</div>
            </div>

            <textarea
              ref={(node) => onRegisterTextarea?.(subquestion.id, node)}
              className="rel-algebra-editor"
              value={value}
              onChange={(event) => onChange?.(subquestion.id, event.target.value)}
              onFocus={() => onFocus?.(subquestion.id)}
              disabled={disabled}
              rows={6}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              placeholder="在这里输入关系代数表达式"
            />

            <div className="rel-algebra-editor-actions">
              <RelationalAlgebraToolbar
                compact
                disabled={disabled}
                onInsert={(token, options) => onInsert?.(subquestion.id, token, options)}
              />

              <button
                type="button"
                className="secondary-btn small-btn rel-algebra-grade-btn"
                disabled={disabled || !value?.trim() || review?.status === 'pending'}
                onClick={() => onGrade?.(itemId, subquestion.id)}
              >
                {review?.status === 'pending' ? <LoaderCircle size={14} className="spin" /> : null}
                AI 判题
              </button>
            </div>
          </div>

          {verdictMeta && (
            <div className={`rel-algebra-review-card ${verdictMeta.className}`}>
              <div className="rel-algebra-review-head">
                <div className={`rel-algebra-review-badge ${verdictMeta.className}`}>
                  {verdictMeta.icon}
                  {verdictMeta.label}
                </div>
                {typeof review?.score === 'number' && typeof review?.maxScore === 'number' ? (
                  <div className="rel-algebra-review-score">
                    {review.score} / {review.maxScore} 分
                  </div>
                ) : null}
              </div>

              {typeof review?.confidence === 'number' && review.confidence > 0 ? (
                <div className="rel-algebra-review-line">置信度：{Math.round(review.confidence)}%</div>
              ) : null}

              {review?.feedback ? <div className="rel-algebra-review-line">{review.feedback}</div> : null}

              {missingList.length > 0 && (
                <div className="rel-algebra-review-list">
                  <div className="rel-algebra-review-list-title">缺失点</div>
                  <ul>
                    {missingList.map((item, itemIndex) => (
                      <li key={`${review?.questionId || subquestion.id}-missing-${itemIndex}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {errorList.length > 0 && (
                <div className="rel-algebra-review-list">
                  <div className="rel-algebra-review-list-title">问题定位</div>
                  <ul>
                    {errorList.map((item, itemIndex) => (
                      <li key={`${review?.questionId || subquestion.id}-error-${itemIndex}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {review?.normalizedUserAnswer ? (
                <div className="rel-algebra-review-reference">
                  <div className="rel-algebra-review-list-title">标准化后的作答</div>
                  <code>{review.normalizedUserAnswer}</code>
                </div>
              ) : null}

              {review?.normalizedReference || referenceAnswer ? (
                <div className="rel-algebra-review-reference">
                  <div className="rel-algebra-review-list-title">参考表达式</div>
                  <code>{review?.normalizedReference || referenceAnswer}</code>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
