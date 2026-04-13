import React, { useEffect, useMemo, useRef, useState } from 'react'

import RelationalAlgebraSchemaPanel from './RelationalAlgebraSchemaPanel.jsx'
import RelationalAlgebraSubquestionCard from './RelationalAlgebraSubquestionCard.jsx'
import {
  buildRelationalAlgebraInsertion,
  insertTextAtCursor,
  normalizeRelationalAlgebraResponse,
} from './relationalAlgebraEditorUtils.js'

function getFirstQuestionId(subquestions = []) {
  const first = subquestions[0]
  return first ? String(first.id ?? '1') : ''
}

function buildExpandedMap(subquestions = [], existingMap = {}) {
  return subquestions.reduce((map, subquestion, index) => {
    const key = String(subquestion.id ?? index + 1)
    map[key] = Boolean(existingMap?.[key])
    return map
  }, {})
}

export default function RelationalAlgebraBlock({
  item,
  response,
  submitted,
  isPaused,
  expandedMap,
  reviewMap = {},
  focusSubQuestionId,
  onTextChange,
  onToggleSubQuestion,
  onRevealQuestion,
  onFocusSubQuestion,
}) {
  const subquestions = Array.isArray(item?.subquestions) ? item.subquestions : []
  const subquestionSignature = subquestions
    .map((subquestion, index) => `${String(subquestion.id ?? index + 1)}:${String(subquestion.prompt || '')}`)
    .join('|')
  const editorRefs = useRef({})
  const [draftMap, setDraftMap] = useState(() => normalizeRelationalAlgebraResponse(response, subquestions))
  const [toolsCollapsed, setToolsCollapsed] = useState(false)
  const activeSubquestionId = focusSubQuestionId || getFirstQuestionId(subquestions)

  const effectiveExpandedMap = buildExpandedMap(subquestions, expandedMap)
  const answeredCount = useMemo(
    () =>
      subquestions.filter((subquestion, index) => {
        const key = String(subquestion.id ?? index + 1)
        return Boolean(draftMap[key]?.trim())
      }).length,
    [draftMap, subquestions]
  )

  useEffect(() => {
    setDraftMap(normalizeRelationalAlgebraResponse(response, subquestions))
  }, [response, item?.id, subquestionSignature])

  function commitDraft(nextDraft, subquestionId) {
    setDraftMap(nextDraft)
    onTextChange?.(item.id, subquestionId, nextDraft[String(subquestionId)] || '')
  }

  function updateSubquestionValue(subquestionId, value) {
    const nextDraft = { ...draftMap, [String(subquestionId)]: value }
    commitDraft(nextDraft, String(subquestionId))
  }

  function insertIntoSubquestion(subquestionId, token, options = {}) {
    const textarea = editorRefs.current[String(subquestionId)]

    if (textarea) {
      const insertion = buildRelationalAlgebraInsertion(token, {
        ...options,
        textValue: textarea.value || '',
        selectionStart: textarea.selectionStart,
      })
      const result = insertTextAtCursor(textarea, insertion)
      if (result) {
        updateSubquestionValue(subquestionId, result.value)
        return
      }
    }

    const fallbackInsertion = buildRelationalAlgebraInsertion(token, options)
    const currentValue = draftMap[String(subquestionId)] || ''
    updateSubquestionValue(subquestionId, `${currentValue}${fallbackInsertion.text}`)
  }

  function insertIntoActive(token, options = {}) {
    const targetId = activeSubquestionId || getFirstQuestionId(subquestions)
    if (!targetId) return
    insertIntoSubquestion(targetId, token, options)
    onToggleSubQuestion?.(item.id, targetId, true)
    onFocusSubQuestion?.(targetId)
  }

  function handleToggle(subquestionId) {
    const nextExpanded = !Boolean(effectiveExpandedMap[String(subquestionId)])
    onToggleSubQuestion?.(item.id, String(subquestionId), nextExpanded)
    onFocusSubQuestion?.(String(subquestionId))
  }

  function handleRegisterTextarea(subquestionId, node) {
    if (!subquestionId) return
    if (node) {
      editorRefs.current[String(subquestionId)] = node
    } else {
      delete editorRefs.current[String(subquestionId)]
    }
  }

  return (
    <div className="subjective-block rel-algebra-block">
      <div className={`rel-algebra-workbench spacious ${toolsCollapsed ? 'tools-collapsed' : ''}`}>
        <aside className={`rel-algebra-sidebar wide ${toolsCollapsed ? 'collapsed' : ''}`}>
          <RelationalAlgebraSchemaPanel
            schemas={item?.schemas || []}
            activeToken=""
            disabled={isPaused}
            collapsed={toolsCollapsed}
            onToggleCollapse={() => setToolsCollapsed((current) => !current)}
            onHoverToken={() => {}}
            onLeaveToken={() => {}}
            onInsertToken={insertIntoActive}
          />
        </aside>

        <section className="rel-algebra-canvas wide">
          <div className="rel-algebra-canvas-head">
            <div>
              <div className="rel-algebra-canvas-title">答题工作区</div>
              <div className="rel-algebra-panel-caption">按子题依次作答，已作答 {answeredCount} / {subquestions.length}。</div>
            </div>
          </div>

          <div className="rel-algebra-subquestion-list">
            {subquestions.map((subquestion, index) => {
              const subquestionId = String(subquestion.id ?? index + 1)
              return (
                <RelationalAlgebraSubquestionCard
                  key={subquestionId}
                  itemId={item.id}
                  subquestion={subquestion}
                  index={index}
                  expanded={Boolean(effectiveExpandedMap[subquestionId])}
                  disabled={isPaused || submitted}
                  value={draftMap[subquestionId] || ''}
                  review={reviewMap?.[`${item.id}:${subquestionId}`] || null}
                  focused={String(activeSubquestionId || '') === subquestionId}
                  onToggle={handleToggle}
                  onFocus={onFocusSubQuestion}
                  onChange={updateSubquestionValue}
                  onInsert={insertIntoSubquestion}
                  onRegisterTextarea={handleRegisterTextarea}
                  onGrade={onRevealQuestion}
                />
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
