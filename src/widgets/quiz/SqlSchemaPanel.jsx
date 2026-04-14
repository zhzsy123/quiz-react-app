import React from 'react'
import { Database, Files } from 'lucide-react'

import { renderFormattedMaterial } from './quizViewUtils.jsx'
import { formatSqlSchemaLine, parseSqlSchemaContext } from './sqlEditorUtils.js'

function SqlSchemaInlineToken({ text, disabled, onClick, kind = 'default' }) {
  return (
    <span
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? -1 : 0}
      className={`sql-schema-inline-token ${kind} ${disabled ? 'disabled' : ''}`}
      onClick={(event) => {
        event.stopPropagation()
        if (!disabled) onClick?.()
      }}
      onKeyDown={(event) => {
        if (disabled) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
    >
      {text}
    </span>
  )
}

function SqlSchemaLine({ table, disabled, onInsertToken }) {
  const displayText = formatSqlSchemaLine(table)
  const insertText = `${table.name}(${table.columns.join(', ')})`

  return (
    <div
      className={`sql-schema-line refined ${disabled ? 'disabled' : ''}`}
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? -1 : 0}
      title={disabled ? undefined : '点击整行、表名或字段，可插入到 SQL 编辑器。'}
      onClick={() => {
        if (!disabled) onInsertToken?.(insertText)
      }}
      onKeyDown={(event) => {
        if (disabled) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onInsertToken?.(insertText)
        }
      }}
    >
      <span className="sql-schema-line-text" aria-label={displayText}>
        <SqlSchemaInlineToken
          text={table.name}
          kind="table"
          disabled={disabled}
          onClick={() => onInsertToken?.(table.name)}
        />
        <span className="sql-schema-punctuation">（</span>
        {table.columns.map((column, index) => (
          <React.Fragment key={`${table.name}:${column}`}>
            {index > 0 ? <span className="sql-schema-punctuation">、</span> : null}
            <SqlSchemaInlineToken
              text={column}
              kind="column"
              disabled={disabled}
              onClick={() => onInsertToken?.(column)}
            />
          </React.Fragment>
        ))}
        <span className="sql-schema-punctuation">）</span>
      </span>
    </div>
  )
}

function SqlSchemaNote({ text, disabled, onInsertToken }) {
  return (
    <div
      className={`sql-schema-note-line refined ${disabled ? 'disabled' : ''}`}
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? -1 : 0}
      title={disabled ? undefined : '点击可将这段题目背景插入到 SQL 编辑器。'}
      onClick={() => {
        if (!disabled) onInsertToken?.(text)
      }}
      onKeyDown={(event) => {
        if (disabled) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onInsertToken?.(text)
        }
      }}
    >
      {text}
    </div>
  )
}

export default function SqlSchemaPanel({
  title = '表结构与题目背景',
  context = '',
  format = '',
  onInsertToken,
  disabled = false,
  hideHeader = false,
  compact = false,
}) {
  const { tables, notes } = parseSqlSchemaContext(context)

  return (
    <section className={`sql-schema-panel refined ${compact ? 'compact' : ''}`}>
      {!hideHeader ? (
        <div className="sql-panel-head refined">
          <div className="sql-panel-title">
            <Database size={16} />
            <span>{title}</span>
          </div>
        </div>
      ) : null}

      <div className={`sql-schema-body refined ${compact ? 'compact' : ''}`}>
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
            <div className="sql-schema-note-list">
              {notes.map((note, index) => (
                <SqlSchemaNote
                  key={`${note}-${index}`}
                  text={note}
                  disabled={disabled}
                  onInsertToken={onInsertToken}
                />
              ))}
            </div>
            {renderFormattedMaterial(notes.join('\n'), format || 'text', 'sql-schema-content compact visually-hidden')}
          </div>
        ) : null}

        {!tables.length && !notes.length ? (
          <div className="sql-schema-empty">当前 SQL 题未提供表结构或题目背景。</div>
        ) : null}
      </div>
    </section>
  )
}
