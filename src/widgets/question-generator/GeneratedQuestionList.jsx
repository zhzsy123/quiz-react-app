import React from 'react'

function getStatusLabel(status) {
  switch (status) {
    case 'valid':
      return '已通过'
    case 'warning':
      return '有警告'
    case 'invalid':
      return '无效'
    default:
      return status || '待处理'
  }
}

export default function GeneratedQuestionList({ draftQuestions = [], onRemoveQuestion }) {
  if (!draftQuestions.length) {
    return <div className="generator-empty-state">生成后的题目会逐题显示在这里。</div>
  }

  return (
    <div className="generator-list">
      {draftQuestions.map((entry, index) => {
        const preview = entry.preview || {}
        const warnings = entry.validation?.warnings || []
        const errors = entry.validation?.errors || (entry.error ? [entry.error] : [])

        return (
          <article key={`${preview.questionId || 'draft'}-${index}`} className={`generator-item ${entry.status}`}>
            <div className="generator-item-head">
              <div className="generator-item-main">
                <strong>
                  第 {preview.index || index + 1} 题
                  {preview.typeLabel ? ` · ${preview.typeLabel}` : ''}
                </strong>
                <span className={`generator-status ${entry.status}`}>{getStatusLabel(entry.status)}</span>
              </div>
              <div className="generator-item-side">
                <span>{preview.score || entry.scoreBreakdown?.paperTotal || 0} 分</span>
                <button type="button" className="secondary-btn small-btn" onClick={() => onRemoveQuestion?.(index)}>
                  移除
                </button>
              </div>
            </div>

            <div className="generator-item-prompt">{preview.previewText || preview.title || '暂无题目摘要'}</div>

            {warnings.length > 0 && (
              <div className="generator-item-notes warning">
                <strong>警告：</strong>
                {warnings.join(' / ')}
              </div>
            )}

            {errors.length > 0 && (
              <div className="generator-item-notes error">
                <strong>错误：</strong>
                {errors.join(' / ')}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
