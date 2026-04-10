import React from 'react'

const TOOLBAR_GROUPS = [
  {
    key: 'core',
    title: '核心算子',
    items: [
      { key: 'projection', label: 'Π()', value: 'Π', wrap: true },
      { key: 'selection', label: 'σ()', value: 'σ', wrap: true },
      { key: 'join', label: '⋈()', value: '⋈', wrap: true },
      { key: 'rename', label: 'ρ()', value: 'ρ', wrap: true },
    ],
  },
  {
    key: 'set',
    title: '集合运算',
    items: [
      { key: 'union', label: '∪()', value: '∪', wrap: true },
      { key: 'intersect', label: '∩()', value: '∩', wrap: true },
      { key: 'minus', label: '-()', value: '-', wrap: true },
      { key: 'divide', label: '÷()', value: '÷', wrap: true },
    ],
  },
  {
    key: 'logic',
    title: '条件表达',
    items: [
      { key: 'and', label: 'AND', value: 'AND', wrap: false },
      { key: 'or', label: 'OR', value: 'OR', wrap: false },
      { key: 'eq', label: '=', value: '=', wrap: false },
      { key: 'neq', label: '!=', value: '!=', wrap: false },
      { key: 'gt', label: '>', value: '>', wrap: false },
      { key: 'lt', label: '<', value: '<', wrap: false },
      { key: 'gte', label: '>=', value: '>=', wrap: false },
      { key: 'lte', label: '<=', value: '<=', wrap: false },
    ],
  },
]

export default function RelationalAlgebraToolbar({ disabled = false, onInsert }) {
  return (
    <section className="rel-algebra-toolbar">
      <div className="rel-algebra-panel-header">
        <div>
          <div className="rel-algebra-panel-title">运算工具栏</div>
          <div className="rel-algebra-panel-caption">点击符号即可插入，算子会自动补齐括号。</div>
        </div>
      </div>

      <div className="rel-algebra-toolbar-groups">
        {TOOLBAR_GROUPS.map((group) => (
          <section key={group.key} className="rel-algebra-toolbar-group">
            <div className="rel-algebra-toolbar-group-title">{group.title}</div>
            <div className="rel-algebra-toolbar-row" role="toolbar" aria-label={group.title}>
              {group.items.map((symbol) => (
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
          </section>
        ))}
      </div>
    </section>
  )
}
