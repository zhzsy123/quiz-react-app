import React from 'react'

const DEFAULT_SYMBOLS = [
  { key: 'projection', label: 'Π()', value: 'Π', wrap: true },
  { key: 'selection', label: 'σ()', value: 'σ', wrap: true },
  { key: 'join', label: '⋈()', value: '⋈', wrap: true },
  { key: 'union', label: '∪()', value: '∪', wrap: true },
  { key: 'intersect', label: '∩()', value: '∩', wrap: true },
  { key: 'minus', label: '-()', value: '-', wrap: true },
  { key: 'divide', label: '÷()', value: '÷', wrap: true },
  { key: 'rename', label: 'ρ()', value: 'ρ', wrap: true },
  { key: 'and', label: 'AND', value: 'AND', wrap: false },
  { key: 'or', label: 'OR', value: 'OR', wrap: false },
  { key: 'eq', label: '=', value: '=', wrap: false },
  { key: 'neq', label: '!=', value: '!=', wrap: false },
  { key: 'gt', label: '>', value: '>', wrap: false },
  { key: 'lt', label: '<', value: '<', wrap: false },
  { key: 'gte', label: '>=', value: '>=', wrap: false },
  { key: 'lte', label: '<=', value: '<=', wrap: false },
]

export default function RelationalAlgebraToolbar({ disabled = false, onInsert }) {
  return (
    <div className="rel-algebra-toolbar" role="toolbar" aria-label="关系代数符号工具栏">
      {DEFAULT_SYMBOLS.map((symbol) => (
        <button
          key={symbol.key}
          type="button"
          className={`rel-algebra-toolbar-btn ${symbol.wrap ? 'wrap' : ''}`}
          disabled={disabled}
          onClick={() => onInsert?.(symbol.value, { wrap: symbol.wrap })}
          title={`插入 ${symbol.label}`}
        >
          {symbol.label}
        </button>
      ))}
    </div>
  )
}
