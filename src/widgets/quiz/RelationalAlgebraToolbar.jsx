import React from 'react'

const TOOLBAR_ITEMS = [
  { key: 'projection', label: 'π[]', value: 'π', wrap: true, wrapStyle: 'brackets' },
  { key: 'selection', label: 'σ()', value: 'σ', wrap: true, wrapStyle: 'parens' },
  { key: 'join', label: '⋈', value: '⋈', wrap: false },
  { key: 'divide', label: '÷', value: '÷', wrap: false },
  { key: 'and', label: '^', value: '^', wrap: false },
  { key: 'eq', label: '=', value: '=', wrap: false },
  { key: 'gte', label: '≥', value: '≥', wrap: false },
  { key: 'lte', label: '≤', value: '≤', wrap: false },
  { key: 'neq', label: '≠', value: '≠', wrap: false },
  { key: 'quotes', label: "''", value: "'", wrap: true, wrapStyle: 'quotes' },
  { key: 'not', label: '¬', value: '¬', wrap: false },
  { key: 'union', label: '∪', value: '∪', wrap: false },
  { key: 'intersect', label: '∩', value: '∩', wrap: false },
  { key: 'or', label: '∨', value: '∨', wrap: false },
]

export default function RelationalAlgebraToolbar({ disabled = false, onInsert, compact = false }) {
  return (
    <section className={`rel-algebra-toolbar ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="rel-algebra-panel-header">
          <div>
            <div className="rel-algebra-panel-title">关系代数符号</div>
            <div className="rel-algebra-panel-caption">点击即可插入，括号类符号会自动补全。</div>
          </div>
        </div>
      )}

      <div className="rel-algebra-toolbar-row" role="toolbar" aria-label="关系代数符号工具栏">
        {TOOLBAR_ITEMS.map((symbol) => (
          <button
            key={symbol.key}
            type="button"
            className={`rel-algebra-toolbar-btn ${symbol.wrap ? 'wrap' : ''}`}
            disabled={disabled}
            onClick={() =>
              onInsert?.(symbol.value, {
                wrap: symbol.wrap,
                wrapStyle: symbol.wrapStyle,
              })
            }
            title={`插入 ${symbol.label}`}
          >
            {symbol.label}
          </button>
        ))}
      </div>
    </section>
  )
}
