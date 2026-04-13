import React from 'react'

const TOOLBAR_ITEMS = [
  { key: 'projection', label: 'π[]()', value: 'π' },
  { key: 'selection', label: 'σ[]()', value: 'σ' },
  { key: 'join', label: '⋈', value: '⋈' },
  { key: 'divide', label: '÷', value: '÷' },
  { key: 'and', label: '^', value: '^' },
  { key: 'eq', label: '=', value: '=' },
  { key: 'gt', label: '>', value: '>' },
  { key: 'lt', label: '<', value: '<' },
  { key: 'neq', label: '≠', value: '≠' },
  { key: 'quotes', label: "''", value: "'" },
  { key: 'not', label: '¬', value: '¬' },
  { key: 'union', label: '∪', value: '∪' },
  { key: 'intersect', label: '∩', value: '∩' },
  { key: 'or', label: '∨', value: '∨' },
  { key: 'minus', label: '-', value: '-' },
]

export default function RelationalAlgebraToolbar({ disabled = false, onInsert, compact = false }) {
  return (
    <section className={`rel-algebra-toolbar ${compact ? 'compact' : ''}`}>
      {!compact ? (
        <div className="rel-algebra-panel-header">
          <div>
            <div className="rel-algebra-panel-title">关系代数符号</div>
            <div className="rel-algebra-panel-caption">点击即可插入，投影和选择会自动补全中括号与圆括号。</div>
          </div>
        </div>
      ) : null}

      <div className="rel-algebra-toolbar-row" role="toolbar" aria-label="关系代数符号工具栏">
        {TOOLBAR_ITEMS.map((symbol) => (
          <button
            key={symbol.key}
            type="button"
            className="rel-algebra-toolbar-btn"
            disabled={disabled}
            onClick={() => onInsert?.(symbol.value, { kind: 'symbol' })}
            title={`插入 ${symbol.label}`}
          >
            {symbol.label}
          </button>
        ))}
      </div>
    </section>
  )
}
