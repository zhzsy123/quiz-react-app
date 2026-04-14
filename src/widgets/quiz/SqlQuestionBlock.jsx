import React, { useMemo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { Braces } from 'lucide-react'
import { sql, StandardSQL } from '@codemirror/lang-sql'
import { indentWithTab } from '@codemirror/commands'
import { keymap, EditorView } from '@codemirror/view'
import { oneDark } from '@codemirror/theme-one-dark'

import SqlSchemaPanel from './SqlSchemaPanel.jsx'
import { getSubjectiveText } from './quizViewUtils.jsx'
import {
  buildSqlAutocompleteSchema,
  insertTextIntoEditor,
  SQL_QUICK_INSERTS,
} from './sqlEditorUtils.js'

const SQL_EDITOR_THEME = EditorView.theme(
  {
    '&': {
      minHeight: '320px',
      backgroundColor: 'rgba(2, 6, 23, 0.92)',
      borderRadius: '16px',
      border: '1px solid rgba(96, 165, 250, 0.16)',
      overflow: 'hidden',
    },
    '&.cm-focused': {
      outline: 'none',
      borderColor: '#60a5fa',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.16)',
    },
    '.cm-content': {
      padding: '18px',
      fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", Consolas, monospace',
      fontSize: '0.95rem',
      lineHeight: '1.85',
      caretColor: '#f8fafc',
    },
    '.cm-scroller': {
      fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", Consolas, monospace',
    },
    '.cm-gutters': {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderRight: '1px solid rgba(96, 165, 250, 0.12)',
      color: '#64748b',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(30, 41, 59, 0.38)',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(96, 165, 250, 0.25) !important',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#f8fafc',
    },
    '.cm-tooltip': {
      border: '1px solid rgba(96, 165, 250, 0.2)',
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: 'rgba(59, 130, 246, 0.22)',
      color: '#eff6ff',
    },
  },
  { dark: true }
)

function SqlToolbar({ onInsertSnippet, disabled }) {
  return (
    <div className="sql-toolbar">
      {SQL_QUICK_INSERTS.map((action) => (
        <button
          key={action.key}
          type="button"
          className="sql-toolbar-btn"
          onClick={() => onInsertSnippet(action)}
          disabled={disabled}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}

export default function SqlQuestionBlock({
  item,
  userResponse,
  disabled,
  submitted,
  onTextChange,
  hideSchemaPanel = false,
  embedded = false,
  showWorkbenchTitle = true,
}) {
  const [editorView, setEditorView] = useState(null)
  const text = getSubjectiveText(userResponse)
  const readOnly = disabled || submitted
  const schema = buildSqlAutocompleteSchema(item.context)
  const extensions = useMemo(
    () => [sql({ dialect: StandardSQL, upperCaseKeywords: true, schema }), keymap.of([indentWithTab]), SQL_EDITOR_THEME],
    [schema]
  )

  const handleInsertSnippet = (action) => {
    if (readOnly) return
    insertTextIntoEditor(editorView, action.snippet, action.cursorOffset)
  }

  const handleInsertToken = (token) => {
    if (readOnly) return
    insertTextIntoEditor(editorView, token, token.length)
  }

  return (
    <div className="sql-question-block">
      <div className={`sql-workbench sql-workbench-editor refined ${hideSchemaPanel ? 'sql-workbench-embedded' : ''}`}>
        {!hideSchemaPanel ? (
        <SqlSchemaPanel
          title={item.context_title || '表结构与题目背景'}
          context={item.context}
          format={item.context_format || 'sql'}
          onInsertToken={handleInsertToken}
          disabled={readOnly}
        />
        ) : null}

        <section className={`sql-editor-card refined ${embedded ? 'embedded' : ''}`}>
          {showWorkbenchTitle ? <div className="sql-panel-head refined">
            <div className="sql-panel-title">
              <Braces size={16} />
              <span>SQL 工作区</span>
            </div>
          </div> : null}

          <SqlToolbar onInsertSnippet={handleInsertSnippet} disabled={readOnly} />

          <div className="sql-editor-shell">
            <CodeMirror
              value={text}
              height="320px"
              theme={oneDark}
              extensions={extensions}
              editable={!readOnly}
              readOnly={readOnly}
              basicSetup={{
                foldGutter: false,
                dropCursor: true,
                allowMultipleSelections: false,
                indentOnInput: true,
                closeBrackets: true,
                autocompletion: true,
                syntaxHighlighting: true,
                lineNumbers: true,
                highlightActiveLine: true,
                highlightActiveLineGutter: true,
              }}
              onCreateEditor={(view) => setEditorView(view)}
              onChange={(value) => onTextChange(item.id, value)}
            />
          </div>

          {submitted && item.answer?.reference_answer ? (
            <div className="analysis-box">
              <div className="analysis-section-title">参考 SQL</div>
              <pre className="sql-schema-content">
                <code>{item.answer.reference_answer}</code>
              </pre>
              {Array.isArray(item.answer?.scoring_points) && item.answer.scoring_points.length > 0 ? (
                <>
                  <div className="analysis-section-title">评分点</div>
                  <ul className="analysis-list">
                    {item.answer.scoring_points.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
