import React from 'react'
import { Database, Files } from 'lucide-react'

import { renderFormattedMaterial } from './quizViewUtils.jsx'
import { parseSqlSchemaContext } from './sqlEditorUtils.js'

function InlineToken({ text, onClick, disabled, tone = 'default' }) {
  return (
    <button
      type="button"
      className={`sql-inline-token ${tone}`}
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  )
}

function SqlSchemaLine({ table, onInsertToken, disabled }) {
  return (
    <div className="sql-schema-line">
      <InlineToken
        text={table.name}
        tone="table"
        disabled={disabled}
        onClick={() => onInsertToken?.(table.name)}
      />
      <span className="sql-schema-punctuation">（</span>
      {table.columns.map((column, index) => (
        <React.Fragment key={`${table.name}:${column}`}>
          {index > 0 ? <span className="sql-schema-punctuation">、</span> : null}
          <InlineToken
            text={column}
            tone="column"
            disabled={disabled}
            onClick={() => onInsertToken?.(column)}
          />
        </React.Fragment>
      ))}
      <span className="sql-schema-punctuation">）</span>
    </div>
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
      <div className="sql-panel-head compact">
        <div className="sql-panel-title">
          <Database size={16} />
          <span>{title}</span>
        </div>
      </div>

      <div className="sql-schema-body">
        {tables.length > 0 ? (
          <div className="sql-schema-lines">
            {tables.map((table) => (
              <SqlSchemaLine
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
          <div className="sql-schema-empty">当前 SQL 题未提供表结构或题目背景。</div>
        ) : null}
      </div>
    </section>
  )
}
