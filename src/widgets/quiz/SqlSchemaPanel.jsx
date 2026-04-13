import React from 'react'
import { Database, Files } from 'lucide-react'

import { renderFormattedMaterial } from './quizViewUtils.jsx'
import { parseSqlSchemaContext } from './sqlEditorUtils.js'

function SqlInlineToken({ text, disabled, onClick, kind = 'default' }) {
  return (
    <button
      type="button"
      className={`sql-schema-token ${kind}`}
      disabled={disabled}
      onClick={onClick}
    >
      {text}
    </button>
  )
}

function SqlSchemaLine({ table, disabled, onInsertToken }) {
  return (
    <div className="sql-schema-line">
      <SqlInlineToken text={table.name} kind="table" disabled={disabled} onClick={() => onInsertToken?.(table.name)} />
      <span className="sql-schema-punctuation">（</span>
      {table.columns.map((column, index) => (
        <React.Fragment key={`${table.name}:${column}`}>
          {index > 0 ? <span className="sql-schema-punctuation">、</span> : null}
          <SqlInlineToken
            text={column}
            kind="column"
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
    <section className="sql-schema-panel refined">
      <div className="sql-panel-head refined">
        <div className="sql-panel-title">
          <Database size={16} />
          <span>{title}</span>
        </div>
      </div>

      <div className="sql-schema-body refined">
        {tables.length > 0 ? (
          <div className="sql-schema-lines">
            {tables.map((table) => (
              <SqlSchemaLine key={table.name} table={table} disabled={disabled} onInsertToken={onInsertToken} />
            ))}
          </div>
        ) : null}

        {notes.length > 0 ? (
          <div className="sql-schema-notes subtle">
            <div className="sql-schema-notes-title">
              <Files size={14} />
              <span>题目背景</span>
            </div>
            {renderFormattedMaterial(notes.join('\n'), format || 'sql', 'sql-schema-content compact')}
          </div>
        ) : null}

        {!tables.length && !notes.length ? (
          <div className="sql-schema-empty">当前 SQL 题未提供表结构或题目背景。</div>
        ) : null}
      </div>
    </section>
  )
}
