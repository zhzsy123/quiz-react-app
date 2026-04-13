import React from 'react'
import { Database, Files } from 'lucide-react'

import { renderFormattedMaterial } from './quizViewUtils.jsx'
import { parseSqlSchemaContext } from './sqlEditorUtils.js'

function SqlSchemaCard({ table, onInsertToken, disabled }) {
  return (
    <article className="sql-schema-card">
      <div className="sql-schema-card-head">
        <button
          type="button"
          className="sql-schema-token sql-schema-token-table"
          onClick={() => onInsertToken?.(table.name)}
          disabled={disabled}
        >
          {table.name}
        </button>
        <span className="sql-schema-card-meta">{table.columns.length} 列</span>
      </div>

      <div className="sql-schema-token-list">
        {table.columns.map((column) => (
          <button
            key={`${table.name}:${column}`}
            type="button"
            className="sql-schema-token sql-schema-token-column"
            onClick={() => onInsertToken?.(column)}
            disabled={disabled}
          >
            {column}
          </button>
        ))}
      </div>
    </article>
  )
}

export default function SqlSchemaPanel({
  title = '表结构与题目背景',
  context = '',
  format = '',
  onInsertToken,
  disabled = false,
}) {
  const { tables, notes } = parseSqlSchemaContext(context)

  return (
    <section className="sql-schema-panel">
      <div className="sql-panel-head">
        <div className="sql-panel-title">
          <Database size={16} />
          <span>{title}</span>
        </div>
        <span className="sql-panel-caption">
          点击表名或字段可直接插入到编辑器。编辑器支持 Tab 缩进、自动补全和 SQL 关键字高亮。
        </span>
      </div>

      <div className="sql-schema-body">
        {tables.length > 0 ? (
          <div className="sql-schema-cards">
            {tables.map((table) => (
              <SqlSchemaCard
                key={table.name}
                table={table}
                onInsertToken={onInsertToken}
                disabled={disabled}
              />
            ))}
          </div>
        ) : null}

        {notes.length > 0 ? (
          <div className="sql-schema-notes">
            <div className="sql-schema-notes-title">
              <Files size={15} />
              <span>补充说明</span>
            </div>
            {renderFormattedMaterial(notes.join('\n'), format || 'sql', 'sql-schema-content')}
          </div>
        ) : null}

        {!tables.length && !notes.length ? (
          <div className="sql-schema-empty">当前 SQL 题未提供表结构或业务背景。</div>
        ) : null}
      </div>
    </section>
  )
}
