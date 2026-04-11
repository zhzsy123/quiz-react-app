import React from 'react'
import { Bot, CheckCircle2, LoaderCircle } from 'lucide-react'

export default function QuizAiToolbar({
  currentItem,
  currentExplainEntry,
  currentAuditEntry,
  onExplainQuestion,
  onAuditQuestion,
  disabled,
}) {
  if (!currentItem) return null

  const explainPending = currentExplainEntry?.status === 'pending'
  const auditPending = currentAuditEntry?.status === 'pending'

  return (
    <div className="ai-toolbar">
      <div className="ai-action-row">
        <button
          type="button"
          className="secondary-btn small-btn ai-inline-btn"
          onClick={onExplainQuestion}
          disabled={disabled || explainPending}
        >
          {explainPending ? <LoaderCircle size={14} className="spin" /> : <Bot size={14} />}
          {explainPending ? 'AI解释中' : 'AI解释'}
        </button>
        <button
          type="button"
          className="secondary-btn small-btn ai-inline-btn"
          onClick={onAuditQuestion}
          disabled={disabled || auditPending}
        >
          {auditPending ? <LoaderCircle size={14} className="spin" /> : <CheckCircle2 size={14} />}
          {auditPending ? 'AI核题中' : 'AI核题'}
        </button>
      </div>
    </div>
  )
}
