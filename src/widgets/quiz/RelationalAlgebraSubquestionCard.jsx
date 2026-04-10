import React from 'react'
import { CheckCircle2, ChevronDown, ChevronRight, LoaderCircle, TriangleAlert, XCircle } from 'lucide-react'
import { buildPreviewText } from './quizViewUtils.jsx'
import RelationalAlgebraToolbar from './RelationalAlgebraToolbar.jsx'

function getStatusMeta(review, hasAnswer) {
  if (review?.status === 'pending') {
    return {
      tone: 'pending',
      label: 'AI 判题中',
      icon: <LoaderCircle size={14} className="spin" />,
    }
  }

  if (review?.status === 'failed') {
    return {
      tone: 'incorrect',
      label: '错误',
      icon: <XCircle size={14} />,
    }
  }

  if (review?.verdict === 'correct') {
    return {
      tone: 'correct',
      label: '正确！',
      icon: <CheckCircle2 size={14} />,
    }
  }

  if (review?.verdict === 'partial') {
    return {
      tone: 'partial',
      label: '部分正确',
      icon: <TriangleAlert size={14} />,
    }
  }

  if (review?.verdict === 'incorrect') {
    return {
      tone: 'incorrect',
      label: '错误',
      icon: <XCircle size={14} />,
    }
  }

  if (hasAnswer) {
    return {
      tone: 'waiting',
      label: '待AI核验',
      icon: null,
    }
  }

  return {
    tone: 'empty',
    label: '未填写',
    icon: null,
  }
}

function getReviewLists(review) {
  return {
    points: Array.isArray(review?.strengths)
      ? review.strengths
      : Array.isArray(review?.earned_points)
        ? review.earned_points
        : [],
    missing: Array.isArray(review?.missing_points)
      ? review.missing_points
      : Array.isArray(review?.weaknesses)
        ? review.weaknesses
        : [],
    issues: Array.isArray(review?.error_points)
      ? review.error_points
      : Array.isArray(review?.suggestions)
        ? review.suggestions
        : [],
  }
}

export default function RelationalAlgebraSubquestionCard({
  itemId,
  subquestion,
  index,
  expanded,
  focused = false,
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
  const hasAnswer = Boolean(value?.trim())
  const preview = buildPreviewText(value || '')
  const scoreLabel = Number(subquestion?.score) || 0
  const referenceAnswer = subquestion?.reference_answer || subquestion?.answer?.reference_answer || ''
  const statusMeta = getStatusMeta(review, hasAnswer)
  const { points, missing, issues } = getReviewLists(review)
  const completion =
    typeof review?.completion === 'number'
      ? Math.round(review.completion)
      : typeof review?.score === 'number' && typeof review?.maxScore === 'number' && review.maxScore > 0
        ? Math.round((review.score / review.maxScore) * 100)
        : 0

  return (
    <article className={`rel-algebra-subquestion-card ${expanded ? 'expanded' : ''} ${focused ? 'focused' : ''}`}>
      <button type="button" className="rel-algebra-subquestion-head" onClick={() => onToggle?.(subquestion.id)}>
        <div className="rel-algebra-subquestion-title-wrap">
          <span className="rel-algebra-subquestion-index">{subquestion?.label || `(${index + 1})`}</span>
          <span className="rel-algebra-subquestion-title">{subquestion?.prompt || '关系代数小题'}</span>
        </div>

        <div className="rel-algebra-subquestion-meta">
          <span className={`rel-algebra-answer-state ${statusMeta.tone}`}>
            {statusMeta.icon}
            {statusMeta.label}
          </span>
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
              placeholder="在这里编写关系代数表达式"
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
                disabled={disabled || !hasAnswer || review?.status === 'pending'}
                onClick={() => onGrade?.(itemId, subquestion.id)}
              >
                {review?.status === 'pending' ? <LoaderCircle size={14} className="spin" /> : null}
                AI 判题
              </button>
            </div>
          </div>

          {review && (
            <div className={`rel-algebra-review-card ${statusMeta.tone}`}>
              <div className="rel-algebra-review-head">
                <div className={`rel-algebra-review-badge ${statusMeta.tone}`}>
                  {statusMeta.icon}
                  {statusMeta.label}
                </div>
                {typeof review?.score === 'number' && typeof review?.maxScore === 'number' ? (
                  <div className="rel-algebra-review-score">
                    {review.score} / {review.maxScore} 分
                  </div>
                ) : null}
              </div>

              {review?.status !== 'pending' && review?.status !== 'failed' ? (
                <div className="rel-algebra-review-line">完成度：{completion}%</div>
              ) : null}

              {review?.feedback ? <div className="rel-algebra-review-line">{review.feedback}</div> : null}

              {points.length > 0 && (
                <div className="rel-algebra-review-list">
                  <div className="rel-algebra-review-list-title">得分点</div>
                  <ul>
                    {points.map((point, pointIndex) => (
                      <li key={`${review?.questionId || subquestion.id}-point-${pointIndex}`}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {missing.length > 0 && (
                <div className="rel-algebra-review-list">
                  <div className="rel-algebra-review-list-title">缺失点</div>
                  <ul>
                    {missing.map((point, pointIndex) => (
                      <li key={`${review?.questionId || subquestion.id}-missing-${pointIndex}`}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {issues.length > 0 && (
                <div className="rel-algebra-review-list">
                  <div className="rel-algebra-review-list-title">问题定位</div>
                  <ul>
                    {issues.map((point, pointIndex) => (
                      <li key={`${review?.questionId || subquestion.id}-issue-${pointIndex}`}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

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
