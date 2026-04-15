import React, { useCallback, useEffect, useMemo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { Braces } from 'lucide-react'
import { sql, StandardSQL } from '@codemirror/lang-sql'
import { indentWithTab, selectAll } from '@codemirror/commands'
import { acceptCompletion, autocompletion, completionStatus } from '@codemirror/autocomplete'
import { Prec } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

import SqlSchemaPanel from './SqlSchemaPanel.jsx'
import { getSubjectiveText } from './quizViewUtils.jsx'
import { buildSqlAutocompleteSchema, insertTextIntoEditor, SQL_QUICK_INSERTS } from './sqlEditorUtils.js'

const SQL_HIGHLIGHT_STYLE = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.controlKeyword, t.definitionKeyword], color: '#93c5fd', fontWeight: '900' },
  { tag: [t.modifier, t.special(t.keyword)], color: '#67e8f9', fontWeight: '900' },
  { tag: [t.operator, t.punctuation, t.separator], color: '#fda4af', fontWeight: '800' },
  { tag: [t.string, t.special(t.string)], color: '#fde68a', fontWeight: '700' },
  { tag: [t.number, t.bool, t.atom], color: '#fdba74', fontWeight: '700' },
  { tag: [t.typeName, t.className], color: '#c4b5fd', fontWeight: '800' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#a5f3fc', fontWeight: '800' },
  { tag: [t.variableName, t.propertyName, t.name], color: '#d8e4f3', fontWeight: '600' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#94a3b8', fontStyle: 'italic' },
])

const SQL_EDITOR_THEME = EditorView.theme(
  {
    '&': {
      minHeight: '380px',
      backgroundColor: '#2b313c',
      borderRadius: '18px',
      border: '1px solid rgba(34, 211, 238, 0.22)',
      overflow: 'hidden',
    },
    '&.cm-focused': {
      outline: 'none',
      borderColor: '#22d3ee',
      boxShadow: '0 0 0 3px rgba(34, 211, 238, 0.2)',
    },
    '.cm-content': {
      padding: '18px',
      fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", Consolas, monospace',
      fontSize: '0.98rem',
      lineHeight: '1.9',
      caretColor: '#f8fafc',
      color: '#d8e4f3',
      backgroundColor: '#2b313c',
    },
    '.cm-scroller': {
      fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", Consolas, monospace',
      backgroundColor: '#2b313c',
    },
    '.cm-line': {
      backgroundColor: '#2b313c',
    },
    '.cm-lineWrapping': {
      backgroundColor: '#2b313c',
    },
    '.cm-gutters': {
      backgroundColor: '#202632',
      borderRight: '1px solid rgba(34, 211, 238, 0.16)',
      color: '#64748b',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(34, 211, 238, 0.08)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(15, 23, 42, 0.18)',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(34, 211, 238, 0.24) !important',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#f8fafc',
    },
    '.cm-tooltip': {
      border: '1px solid rgba(56, 189, 248, 0.24)',
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: 'rgba(34, 211, 238, 0.22)',
      color: '#f8fafc',
    },
  },
  { dark: true }
)

const SQL_EDITOR_KEYMAP = Prec.highest(
  keymap.of([
    {
      key: 'Tab',
      preventDefault: true,
      run(view) {
        if (completionStatus(view.state) === 'active') {
          return acceptCompletion(view)
        }
        return indentWithTab(view)
      },
    },
    {
      key: 'Mod-a',
      preventDefault: true,
      run(view) {
        return selectAll(view)
      },
    },
  ])
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
  onEditorInsertReady = null,
}) {
  const [editorView, setEditorView] = useState(null)
  const text = getSubjectiveText(userResponse)
  const readOnly = disabled || submitted
  const schema = buildSqlAutocompleteSchema(item.context)

  const handleInsertSnippet = useCallback(
    (action) => {
      if (readOnly) return
      insertTextIntoEditor(editorView, action.snippet, action.cursorOffset)
    },
    [editorView, readOnly]
  )

  const handleInsertToken = useCallback(
    (token) => {
      if (readOnly || !token) return
      insertTextIntoEditor(editorView, token, token.length)
    },
    [editorView, readOnly]
  )

  useEffect(() => {
    if (typeof onEditorInsertReady !== 'function') return undefined
    onEditorInsertReady(handleInsertToken)
    return () => onEditorInsertReady(null)
  }, [handleInsertToken, onEditorInsertReady])

  const extensions = useMemo(
    () => [
      sql({ dialect: StandardSQL, upperCaseKeywords: true, schema }),
      autocompletion({ activateOnTyping: true, defaultKeymap: false }),
      SQL_EDITOR_KEYMAP,
      syntaxHighlighting(SQL_HIGHLIGHT_STYLE, { fallback: true }),
      SQL_EDITOR_THEME,
    ],
    [schema]
  )

  return (
    <div className="sql-question-block">
      <div className={`sql-workbench sql-workbench-editor refined ${hideSchemaPanel ? 'sql-workbench-embedded' : ''}`}>
        {!hideSchemaPanel ? (
          <SqlSchemaPanel
            title={item.context_title || '表结构与题目背景'}
            context={item.context}
            format={item.context_format || 'sql'}
            disabled={readOnly}
            onInsertToken={handleInsertToken}
          />
        ) : null}

        <section className={`sql-editor-card refined ${embedded ? 'embedded' : ''}`}>
          {showWorkbenchTitle ? (
            <div className="sql-panel-head refined">
              <div className="sql-panel-title">
                <Braces size={16} />
                <span>SQL 工作区</span>
              </div>
            </div>
          ) : null}

          <SqlToolbar onInsertSnippet={handleInsertSnippet} disabled={readOnly} />

          <div className="sql-editor-shell">
            <CodeMirror
              value={text}
              height="380px"
              extensions={extensions}
              editable={!readOnly}
              readOnly={readOnly}
              basicSetup={{
                foldGutter: false,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
                closeBrackets: true,
                autocompletion: false,
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
