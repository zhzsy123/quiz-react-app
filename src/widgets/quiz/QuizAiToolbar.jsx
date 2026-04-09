import React from 'react'
import { Bot, LoaderCircle } from 'lucide-react'

export default function QuizAiToolbar({
  currentItem,
  currentExplainEntry,
  mode,
  showPracticeAiToolbar,
  showExamAuditToolbar,
  onExplainQuestion,
  disabled,
}) {
  if (!currentItem || (!showPracticeAiToolbar && !showExamAuditToolbar)) return null

  const isPending = currentExplainEntry?.status === 'pending'
  const label = mode === 'exam' ? (isPending ? 'AI 核题中' : 'AI 核题') : isPending ? 'AI 解释中' : 'AI 解释'

  return (
    <div className="ai-toolbar">
      <div className="ai-action-row">
        <button
          type="button"
          className="secondary-btn small-btn ai-inline-btn ai-dynamic-label"
          data-ai-label={label}
          onClick={() => onExplainQuestion({ item: currentItem })}
          disabled={disabled || isPending}
        >
          {isPending ? <LoaderCircle size={14} className="spin" /> : <Bot size={14} />}
          {label}
        </button>
      </div>
    </div>
  )
}
