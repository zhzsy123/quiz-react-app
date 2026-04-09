import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { buildPreviewText } from './quizViewUtils.jsx'

export default function RelationalAlgebraSubquestionCard({
  subquestion,
  index,
  expanded,
  submitted,
  disabled,
  value,
  onToggle,
  onFocus,
  onChange,
  onInsert,
  onRegisterTextarea,
  onReveal,
}) {
  const preview = buildPreviewText(value || '')
  const answerLabel = value?.trim() ? '已填写' : '未填写'
  const scoreLabel = Number(subquestion?.score) || 0
  const referenceAnswer = subquestion?.reference_answer || subquestion?.answer?.reference_answer || ''

  return (
    <article className={`rel-algebra-subquestion-card ${expanded ? 'expanded' : ''}`}>
      <button type="button" className="rel-algebra-subquestion-head" onClick={() => onToggle?.(subquestion.id)}>
        <div className="rel-algebra-subquestion-title-wrap">
          <span className="rel-algebra-subquestion-index">({index + 1})</span>
          <span className="rel-algebra-subquestion-title">{subquestion?.prompt || '关系代数小题'}</span>
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
          <div className="rel-algebra-subquestion-statement">
            <span className="rel-algebra-subquestion-label">题目</span>
            <div>{subquestion?.prompt || '请使用关系代数表达式作答。'}</div>
          </div>

          {submitted && referenceAnswer && (
            <div className="analysis-box rel-algebra-answer-box">
              <div className="analysis-section-title">参考答案</div>
              <div className="rel-algebra-reference">{referenceAnswer}</div>
            </div>
          )}

          <div className="rel-algebra-editor-shell">
            <textarea
              ref={(node) => onRegisterTextarea?.(subquestion.id, node)}
              className="rel-algebra-editor"
              value={value}
              onChange={(event) => onChange?.(subquestion.id, event.target.value)}
              onFocus={() => onFocus?.(subquestion.id)}
              disabled={disabled}
              rows={4}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              placeholder="在这里输入关系代数表达式"
            />

            <div className="rel-algebra-editor-actions">
              <button
                type="button"
                className="secondary-btn small-btn"
                disabled={disabled}
                onClick={() => onInsert?.(subquestion.id, 'Π', { wrap: true })}
              >
                Π()
              </button>
              <button
                type="button"
                className="secondary-btn small-btn"
                disabled={disabled}
                onClick={() => onInsert?.(subquestion.id, 'σ', { wrap: true })}
              >
                σ()
              </button>
              <button
                type="button"
                className="secondary-btn small-btn"
                disabled={disabled}
                onClick={() => onInsert?.(subquestion.id, '⋈', { wrap: true })}
              >
                ⋈()
              </button>
              <button
                type="button"
                className="secondary-btn small-btn"
                disabled={disabled}
                onClick={() => onInsert?.(subquestion.id, 'AND', { wrap: false })}
              >
                AND
              </button>
              <button
                type="button"
                className="secondary-btn small-btn"
                disabled={disabled || !value?.trim()}
                onClick={() => onReveal?.(subquestion.id)}
              >
                检查本题
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
